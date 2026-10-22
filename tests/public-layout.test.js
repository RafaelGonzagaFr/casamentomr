import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('public invitation keeps content order, one date/countdown and safe album access', async () => {
  const source = await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const html = await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const dom = new JSDOM(html,{runScripts:'outside-only'});
  try {
    dom.window.eval(`${source.slice(0,source.indexOf('function loginPage()'))}
      publicInfo = {couple_names:'Maria & Rafael',wedding_date:'2027-03-20',ceremony_time:'18:30',timezone:'America/Bahia',additional_information:'Orientacoes exclusivas do convite',welcome_message:'Olá',wedding_story:'Nossa história',photos:{url:'https://drive.google.com/drive/folders/abc',title:'Não mostrar',description:'Não mostrar',button:'Acessar álbum de fotografias'}};
      layout('/'); main.innerHTML = welcome();
      window.renderPhotos = photos => { publicInfo.photos = photos; main.innerHTML = welcome(); };`);
    const doc = dom.window.document;
    assert.equal(doc.querySelector('#header').hidden,true);
    assert.equal(doc.querySelector('#footer').hidden,true);
    assert.equal(doc.querySelector('#footer').textContent,'');
    assert.equal(doc.querySelectorAll('#wedding-countdown').length,1);
    assert.equal(doc.querySelectorAll('#main .card').length,0);
    const article = doc.querySelector('.wedding-invitation');
    const children = [...article.children];
    assert.ok(children.indexOf(article.querySelector('h1')) < children.indexOf(article.querySelector('#wedding-countdown')));
    assert.ok(children.indexOf(article.querySelector('#wedding-countdown')) < children.indexOf(article.querySelector('.wedding-date')));
    assert.ok(children.indexOf(article.querySelector('.wedding-date')) < children.indexOf(article.querySelector('.invitation-guidance')));
    assert.equal(article.querySelector('.album-access'),null);
    assert.equal((doc.body.textContent.match(/20\/03\/2027/g)||[]).length,1);
    assert.equal(article.querySelector('.wedding-date').textContent,'20/03/2027 - 18:30');
    assert.doesNotMatch(article.textContent,/America\/Bahia|Olá|Não mostrar|Serviço externo/);
    assert.doesNotMatch(article.textContent,/Nossa história|Orientacoes exclusivas do convite/);
    assert.equal(doc.querySelector('a[href="/admin/login"]'),null);
    for (const photos of [null,{url:'javascript:alert(1)'},{url:'https://drive.google.com.evil.test'}]) {
      dom.window.renderPhotos(photos);
      assert.equal(doc.querySelector('.album-access'),null);
    }
  } finally { dom.window.close(); }
});
