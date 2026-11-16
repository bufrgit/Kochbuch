// node werkzeuge/render_buch.js <buch.html> <out.pdf> [png-ordner] [seiten,...]
const {chromium} = require('playwright');
(async () => {
  const [src, pdf, pngDir, sel] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 560, height: 794}, deviceScaleFactor: 1.5});
  p.on('console', m => { if (/^(ZU LANG|TOC)/.test(m.text())) console.log(m.text()); });
  await p.goto('file://' + src, {waitUntil: 'networkidle'});
  await p.waitForSelector('body[data-fertig]', {state: 'attached', timeout: 120000});
  await p.pdf({path: pdf, width: '148mm', height: '210mm', printBackground: true});
  if (pngDir) {
    const s = await p.$$('section.page');
    const want = sel ? sel.split(',').map(Number) : s.map((_, i) => i + 1);
    for (const n of want) await s[n - 1].screenshot({path: pngDir + '/seite-' + n + '.png'});
  }
  await b.close();
})();
