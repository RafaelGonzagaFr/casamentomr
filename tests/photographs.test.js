import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createDatabase,mutate,testAdapter} from './helpers.js';
import {createApp} from '../server/app.js';
test('migration preserva dados, persiste fotografias e API respeita visibilidade',async () => {
 const db=await createDatabase(); let server;
 try {
 await mutate(db,'settings.update',{couple_names:'Casal preservado'});
 await db.exec(await readFile(new URL('../supabase/migrations/20261019_photographs.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261019_photographs.sql',import.meta.url),'utf8'));
 const settings={photos_drive_url:'https://drive.google.com/drive/folders/abc',photos_title:'Nossas fotos',photos_description:'Momentos',photos_button:'Abrir',photos_visible:'true'};
 await db.exec(await readFile(new URL('../supabase/migrations/20261021_wedding_configuration.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261021_wedding_configuration.sql',import.meta.url),'utf8'));
 await mutate(db,'settings.update',{wedding_date:'2027-03-20',ceremony_time:'18:30',timezone:'America/Bahia',ceremony_location:'Igreja',wedding_story:'Nossa historia'});
 await mutate(db,'settings.update',settings);
 await assert.rejects(mutate(db,'settings.update',{photos_visible:'false'},null,null));
 server=createApp({origin:'http://localhost:3000',bucket:'wedding-gifts'},{db:testAdapter(db)}).listen(0,'127.0.0.1');
 await once(server,'listening'); const url='http://127.0.0.1:'+server.address().port+'/api/public';
 let data=await (await fetch(url)).json();
 assert.equal(data.wedding_at,'2027-03-20T21:30:00.000Z');assert.equal(data.ceremony_location,'Igreja');assert.equal(data.wedding_story,undefined);
 assert.equal(data.couple_names,'Casal preservado');assert.equal(data.photos.title,settings.photos_title);assert.equal(data.photos.url,settings.photos_drive_url);assert.equal(data.guest_limit,undefined);
 await mutate(db,'settings.update',{photos_visible:'false'});data=await (await fetch(url)).json();assert.equal(data.photos,null);
 } finally {if(server)await new Promise(resolve=>server.close(resolve));await db.close();}
});
