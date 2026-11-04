// Run with an installed Playwright module and a generated board path.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

(async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'design-board-'));
  const target = path.join(folder,'board.html');
  const original = await fs.readFile(process.argv[2],'utf8');
  await fs.writeFile(target,original);
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.goto(pathToFileURL(target).href);
    await page.waitForSelector('.nav-item');
    const first = await page.locator('.nav-item[aria-current=true]').getAttribute('data-id');
    await page.keyboard.press('n');
    await page.keyboard.type('A thought before deciding: 1 j z');
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    await page.keyboard.press('Escape');
    await page.keyboard.press('1');
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#note').inputValue(),'A thought before deciding: 1 j z');
    await page.reload();
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#note').inputValue(),'A thought before deciding: 1 j z');
    await page.keyboard.press('j');
    const second = await page.locator('.nav-item[aria-current=true]').getAttribute('data-id');
    assert.notEqual(second,first);
    await page.keyboard.press('2');
    await page.keyboard.press('n');
    await page.keyboard.type('Still allowed after declining');
    await page.keyboard.press('Escape');
    await page.keyboard.press('z');
    assert.equal(await page.locator('button[data-choice=decline]').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#note').inputValue(),'Still allowed after declining');
    await page.locator('#filter').selectOption('notes');
    assert.equal(await page.locator('.nav-item').count(),2);
    await page.locator('#filter').selectOption('all');
    await page.locator(`[data-id="${first}"]`).click();
    await page.keyboard.down('Space');
    assert.equal(await page.locator('.capture[data-side=after] figcaption strong').textContent(),'Before');
    await page.keyboard.up('Space');
    assert.equal(await page.locator('.capture[data-side=after] figcaption strong').textContent(),'After');
    // Simulate new evidence from a rebuilt catalog, preserving board and change IDs.
    const dataMatch = original.match(/<script id="board-data" type="application\/json">(.*?)<\/script>/s);
    const data = JSON.parse(dataMatch[1]);
    data.changes.find(change => change.id === first).fingerprint = 'updated-evidence';
    await fs.writeFile(target,original.replace(dataMatch[0],'<script id="board-data" type="application/json">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script>'));
    await page.reload();
    assert.equal(await page.locator('#stale').isVisible(),true);
    assert.equal(await page.locator('#note').inputValue(),'A thought before deciding: 1 j z');
    await page.locator('#note').fill('Note does not reconfirm a changed comparison');
    assert.equal(await page.locator('#stale').isVisible(),true);
    await page.locator('#import-file').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,boardId:'another-board',decisions:{}}))});
    assert.match(await page.locator('#message').textContent(),/Import failed/);
    assert.equal(await page.locator('#note').inputValue(),'Note does not reconfirm a changed comparison');
    await page.evaluate(() => {
      window.fileWrites = [];
      window.showSaveFilePicker = async () => ({name:'decisions.json',getFile:async()=>new Blob(['']),
        createWritable:async()=>({write:async text=>window.fileWrites.push(text),close:async()=>{},abort:async()=>{}})});
    });
    await page.locator('#connect').click();
    await page.waitForFunction(() => document.getElementById('save-status').textContent === 'Saved to decisions.json');
    await page.locator('#note').fill('Durable independent thought');
    await page.waitForFunction(() => window.fileWrites.at(-1)?.includes('Durable independent thought'));
    const saved = await page.evaluate(() => JSON.parse(window.fileWrites.at(-1)));
    assert.equal(saved.decisions[first].note,'Durable independent thought');
    await page.locator('#export').click();
    // Check all real example changes in both screenshot modes and a narrow viewport.
    const ids = data.changes.map(change => change.id);
    for (const device of ['desktop','mobile']) {
      await page.locator('#'+device).click();
      for (const id of ids) {
        await page.locator(`[data-id="${id}"]`).click();
        assert.ok((await page.locator('#comparison figure, #comparison .unavailable').count()) > 0);
      }
    }
    await page.locator(`[data-id="${first}"]`).click();
    await page.locator('#desktop').click();
    await page.screenshot({path:path.join(path.dirname(process.argv[2]),'board-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:960});
    await page.locator('#mobile').click();
    await page.locator('#side-after').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:path.join(path.dirname(process.argv[2]),'board-mobile.png'),fullPage:true});
    const blocked = await context.newPage();
    await blocked.addInitScript(() => { Storage.prototype.setItem = () => {throw new DOMException('Blocked','SecurityError');}; });
    await blocked.goto(pathToFileURL(target).href);
    assert.match(await blocked.locator('#save-status').textContent(),/Session only/);
    await blocked.keyboard.press('1');
    assert.equal(await blocked.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',changes:ids.length,devices:2,checks:['keyboard','notes','undo','reload','changed evidence','import isolation','file autosave','storage failure','responsive layout']}));
    await context.close();
  } finally { await browser.close(); await fs.rm(folder,{recursive:true,force:true}); }
})().catch(error => {console.error(error);process.exitCode=1;});
