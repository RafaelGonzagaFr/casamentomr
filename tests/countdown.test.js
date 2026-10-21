import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('countdown ticks, switches to escaped final message and clears timer', async () => {
  const source = await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const dom = new JSDOM('<div id="wedding-countdown"></div>',{runScripts:'outside-only'});
  try {
    const w = dom.window;
    let tick, cleared = 0;
    w.setInterval = callback => { tick = callback; return 1; };
    w.clearInterval = () => { cleared++; };
    w.Date.now = () => Date.parse('2027-03-20T21:29:58Z');
    w.eval(`let countdownTimer; const publicInfo = {wedding_at:'2027-03-20T21:30:00Z',started_message:'<img src=x onerror=alert(1)>'}; ${source.slice(source.indexOf('function startCountdown()'),source.indexOf('function loginPage()'))} startCountdown();`);
    assert.match(w.document.querySelector('strong').textContent,/00/);
    assert.equal(w.document.querySelectorAll('strong')[3].textContent,'02');
    w.Date.now = () => Date.parse('2027-03-20T21:29:59Z'); tick();
    assert.equal(w.document.querySelectorAll('strong')[3].textContent,'01');
    w.Date.now = () => Date.parse('2027-03-20T21:30:00Z'); tick();
    assert.equal(w.document.querySelector('#wedding-countdown').textContent,'<img src=x onerror=alert(1)>');
    assert.equal(w.document.querySelector('img'),null);
    assert.ok(cleared >= 2);
  } finally { dom.window.close(); }
});
