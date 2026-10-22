import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { createApp } from '../server/app.js';
import { HttpError } from '../server/validation.js';
import { createDatabase,testAdapter,family,gift,mutate,ADMIN } from './helpers.js';
test('frontend executa login, QR, RSVP, reserva, troca, cancelamento e configuração com escape HTML',async () => {
const db=await createDatabase();const fixture=await family(db,'Família Teste','PENDING');await gift(db,'Cafeteira');await gift(db,'Panelas');
await mutate(db,'settings.update',{additional_information:'Orientacoes exclusivas do convite',welcome_message:'Uma mensagem especial para vocês',wedding_date:'2099-03-20',ceremony_time:'18:30',timezone:'America/Bahia',rsvp_deadline_at:'2099-03-10T23:00:00Z'});
const config={origin:'http://127.0.0.1:3000',production:false,bucket:'wedding-gifts'};
const server=createApp(config,{db:testAdapter(db),login:async(email,password)=>{if(email==='admin@example.test'&&password==='123456789')return{id:ADMIN};throw new HttpError(401,'Inválido');}}).listen(0,'127.0.0.1');
await once(server,'listening');config.origin=`http://127.0.0.1:${server.address().port}`;
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');const js=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const errors=[];const windows=[];
const wait=async predicate=> {for(let n=0;n<300;n++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Estado do frontend não alcançado.');};
async function page(path) {
 const dom=new JSDOM(html,{url:`${config.origin}${path}`,runScripts:'outside-only',pretendToBeVisual:true});windows.push(dom.window);
 const window=dom.window;let cookie='';const requests=[];
 window.scrollTo=()=>{};window.confirm=()=>true;
 window.addEventListener('error',event=>errors.push(event.message));
 window.fetch=async(input,options={})=>{
  requests.push(String(input));
  const headers=new Headers(options.headers);headers.set('Cookie',cookie);if(options.method&&options.method!=='GET')headers.set('Origin',config.origin);
  const response=await fetch(new URL(input,config.origin),{...options,headers,redirect:'manual'});
  const set=response.headers.getSetCookie();if(set.length)cookie=set.at(-1).split(';')[0];return response;
 };
 await window.eval(`(async()=>{${js}\n})()`);
 return{window,requests,doc:window.document,async click(selector){const el=window.document.querySelector(selector);assert.ok(el,`Elemento não encontrado: ${selector}`);el.click();},async submit(selector,values){const form=window.document.querySelector(selector);assert.ok(form);for(const[key,value]of Object.entries(values))form.elements.namedItem(key).value=value;form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}};
}
try{
 const admin=await page('/admin/login');await admin.submit('#login-form',{email:'admin@example.test',password:'123456789'});await wait(()=>admin.doc.querySelector('h1')?.textContent==='Seu casamento, organizado');
 await admin.click('a[href="/admin/convites"]');await wait(()=>admin.doc.querySelector('a[href="/admin/convites/1"]'));
 await admin.click('a[href="/admin/convites/1"]');await wait(()=>admin.doc.querySelector('button[data-action="issue-token"]'));
 await admin.click('button[data-action="issue-token"]');await wait(()=>admin.doc.querySelector('#invite-url'));
 const invite=admin.doc.querySelector('#invite-url').value;
 const openInvite=admin.doc.querySelector('[data-open-invite]');
 assert.equal(openInvite.href,invite);
 assert.equal(openInvite.target,'_blank');
 assert.equal(openInvite.rel,'noopener noreferrer');
 const guest=await page('/');const response=await guest.window.fetch(invite);assert.equal(response.status,303);
 guest.window.history.pushState(null,'','/convite');guest.window.dispatchEvent(new guest.window.PopStateEvent('popstate'));await wait(()=>guest.doc.querySelector('select[name="rsvp_status"]'));
 assert.equal(guest.doc.querySelector('#main h1').textContent,'Família Teste');
 assert.equal(guest.doc.querySelectorAll('#main h1').length,1);
 assert.match(guest.doc.querySelector('.guest-invitation').textContent,/Orientacoes exclusivas do convite/);
 assert.equal(guest.doc.querySelector('.guest-invitation>.eyebrow'),null);
 assert.equal(guest.doc.querySelector('.invitation-message').textContent,'Uma mensagem especial para vocês');
 assert.equal(guest.doc.querySelector('.guest-invitation>.wedding-date').textContent,'Dia da cerimônia: 20/03/2099 - 18:30');
 assert.equal(guest.doc.querySelector('.invitation-gifts'),null);
 assert.equal(guest.doc.querySelector('.rsvp-deadline').textContent,'Confirme sua presença até 10/03/2099');
 assert.equal(guest.doc.querySelector('#countdown-heading').textContent,'Quanto tempo falta até o grande dia');
 assert.equal(guest.doc.querySelectorAll('#wedding-countdown').length,1);
 assert.equal(guest.doc.querySelectorAll('#wedding-countdown strong').length,4);
 const blocks=[...guest.doc.querySelector('.guest-invitation').children];
 assert.ok(blocks.indexOf(guest.doc.querySelector('.invitation-rsvp'))<blocks.indexOf(guest.doc.querySelector('.invitation-countdown')));
 assert.equal(guest.doc.querySelector('.guest-invitation button[data-action="gift-choice"]'),null);
 await guest.submit('form[data-endpoint$="/rsvp"]',{rsvp_status:'ATTENDING'});await wait(()=>guest.doc.querySelector('#notice').textContent==='Confirmação salva.');
 await wait(()=>guest.doc.querySelector('.rsvp-result'));
 assert.match(guest.doc.querySelector('.rsvp-result').textContent,/Presença confirmada/);
 assert.equal(guest.doc.querySelector('.rsvp-edit').open,false);
 assert.ok(guest.doc.querySelector('.rsvp-edit form[data-endpoint$="/rsvp"]'));
 await guest.click('a[href="/convite"]');
 await wait(()=>guest.doc.querySelector('.rsvp-result'));
 assert.equal(guest.doc.querySelector('.rsvp-edit').open,false);
 guest.requests.length=0;
 await guest.click('a[href="/convite/presentes"]');await wait(()=>guest.doc.querySelector('button[data-action="gift-choice"]'));
 assert.deepEqual(guest.requests,['/api/guest/gifts?page=1&include=reservation']);
 await guest.click('button[data-action="gift-choice"]');await wait(()=>guest.doc.querySelector('h1')?.textContent==='Seu presente');assert.ok(guest.doc.querySelector('h2'));
 await guest.click('a[href="/convite/presentes"]');await wait(()=>guest.doc.querySelector('button[data-swap="true"]'));
 await guest.click('button[data-swap="true"]');await wait(()=>guest.doc.querySelector('h1')?.textContent==='Seu presente');
 await guest.click('button[data-method="DELETE"]');await wait(()=>guest.doc.querySelector('#main')?.textContent.includes('Você ainda não escolheu um presente.'));
 await admin.click('a[href="/admin/convites/1"]');await wait(()=>admin.doc.querySelector('h1')?.textContent==='Família Teste');
 await admin.click('a[href="/admin/configuracoes"]');await wait(()=>admin.doc.querySelector('input[name="couple_names"]'));
 for (const name of ['ceremony_time','timezone','maps_url','ceremony_location','started_message','photos_drive_url','photos_title','photos_button']) {
  assert.ok(admin.doc.querySelector(`input[name="${name}"]`), `Campo de configuração ausente: ${name}`);
 }
 for (const name of ['additional_information','photos_description']) assert.ok(admin.doc.querySelector(`textarea[name="${name}"]`));
 for (const name of ['partner_one_name','partner_two_name','hero_image_url','ceremony_address','reception_location','reception_address','wedding_story']) assert.equal(admin.doc.querySelector(`[name="${name}"]`),null);
 assert.ok(admin.doc.querySelector('select[name="photos_visible"]'));
 await admin.submit('form[data-endpoint="/admin/settings"]',{couple_names:'Rafael & Maria',wedding_date:'2027-03-20',rsvp_deadline_at:'2027-03-10T20:00',welcome_message:'Bem-vindos!'});await wait(()=>admin.doc.querySelector('#notice').textContent==='Configurações salvas.');
 await admin.click('a[href="/admin/presentes"]');await wait(()=>admin.doc.querySelector('form[data-endpoint="/admin/gifts"]'));
 assert.equal(admin.doc.querySelector('input[type="file"]'),null);
 await admin.submit('form[data-endpoint="/admin/gifts"]',{name:'<script>alert(1)</script>',category_id:1,sort_order:0});await wait(()=>admin.doc.querySelector('h2')?.textContent==='Novo presente'&&admin.doc.querySelector('article h2')?.textContent==='<script>alert(1)</script>');assert.equal(admin.doc.querySelectorAll('article script').length,0);
 await admin.click('a[href="/admin/convites"]');await wait(()=>admin.doc.querySelector('form[data-method="DELETE"][data-endpoint="/admin/invitations"]'));
 await admin.submit('form[data-method="DELETE"][data-endpoint="/admin/invitations"]',{confirmation:'EXCLUIR TODOS'});
 await wait(()=>admin.doc.querySelector('#notice').textContent==='Todos os convites foram excluídos.');
 await wait(()=>!admin.doc.querySelector('a[href="/admin/convites/1"]'));
 assert.equal((await db.query('select count(*)::int n from public.invitations')).rows[0].n,0);
 assert.deepEqual(errors,[]);
}finally{for(const window of windows)window.close();await new Promise(resolve=>server.close(resolve));await db.close();}

});
