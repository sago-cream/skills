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
  const dataMatch = original.match(/<script id="board-data" type="application\/json">(.*?)<\/script>/s);
  const data = JSON.parse(dataMatch[1]);
  const availableDevices = ['desktop','mobile'].filter(device=>data.changes.some(item=>
    item.variants?.[device] || item.stages?.some(stage=>stage.variants?.[device])));
  await fs.writeFile(target,original);
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
    const page = await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(target).href);
    const pending = () => page.locator('#export').getAttribute('data-pending');
    assert.equal(await pending(),'false');
    await page.keyboard.press('a');
    assert.equal(await pending(),'false');
    await page.keyboard.press('a');
    await page.locator('#note').fill('Temporary thought');
    assert.equal(await pending(),'true');
    await page.locator('#note').fill('');
    assert.equal(await pending(),'false');
    await page.reload();
    assert.equal(await pending(),'false');
    const first = await page.locator('.nav-item[aria-current=true]').getAttribute('data-id');
    await page.keyboard.press('n');
    await page.keyboard.type('A thought before deciding: 1 j');
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    await page.keyboard.press('Escape');
    await page.keyboard.press('1');
    assert.equal(await pending(),'true');
    await page.reload();
    assert.equal(await pending(),'true');
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#note').inputValue(),'A thought before deciding: 1 j');
    const download = page.waitForEvent('download');
    await page.locator('#export').click();
    const saved = JSON.parse(await fs.readFile(await (await download).path(),'utf8'));
    assert.equal(saved.boardId,data.id);
    assert.equal(saved.decisions[first].note,'A thought before deciding: 1 j');
    assert.equal(await pending(),'false');
    await page.keyboard.press('1');
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#note').inputValue(),'A thought before deciding: 1 j');
    assert.equal(await pending(),'true');
    await page.keyboard.press('1');
    assert.equal(await pending(),'false');
    await page.keyboard.press('a');
    assert.equal(await pending(),'false');
    await page.keyboard.press('a');
    await page.locator('#note').fill('Thought added after export');
    assert.equal(await pending(),'true');
    await page.locator('#note').fill('A thought before deciding: 1 j');
    assert.equal(await pending(),'false');
    await page.keyboard.press('Escape');
    await page.keyboard.press('2');
    assert.equal(await pending(),'true');
    await page.keyboard.press('1');
    assert.equal(await pending(),'false');
    await page.locator('#note').fill('Thought added after export');
    await page.keyboard.press('Escape');
    await page.keyboard.press('2');
    assert.equal(await page.locator('button[data-choice=decline]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#note').inputValue(),'Thought added after export');
    await page.keyboard.press('k');
    assert.notEqual(await page.locator('.nav-item[aria-current=true]').getAttribute('data-id'),first);
    await page.keyboard.press('j');
    assert.equal(await page.locator('.nav-item[aria-current=true]').getAttribute('data-id'),first);
    await page.keyboard.down('Space');
    assert.equal(await page.locator('.capture[data-side=after] figcaption strong').textContent(),'Before');
    await page.keyboard.up('Space');
    assert.equal(await page.locator('.capture[data-side=after] figcaption strong').textContent(),'After');
    // Changed evidence reopens a decision without losing its independent note.
    data.changes.find(change=>change.id===first).fingerprint='updated-evidence';
    await fs.writeFile(target,original.replace(dataMatch[0],'<script id="board-data" type="application/json">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script>'));
    await page.reload();
    assert.equal(await pending(),'true');
    assert.equal(await page.locator('#stale').isVisible(),true);
    await page.locator('#note').fill('Note does not reconfirm changed evidence');
    assert.equal(await page.locator('#stale').isVisible(),true);
    await page.keyboard.press('Escape');
    await page.keyboard.press('2');
    assert.equal(await page.locator('#stale').isVisible(),false);
    assert.equal(await page.locator('button[data-choice=decline]').getAttribute('aria-pressed'),'true');
    await page.keyboard.press('2');
    assert.equal(await page.locator('button[data-choice=decline]').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#note').inputValue(),'Note does not reconfirm changed evidence');
    await page.locator('button[data-choice=accept]').click();
    await page.locator('button[data-choice=accept]').click();
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    const annotated=data.changes.find(change=>Object.values(change.variants||{}).some(pair=>pair.before.arrows?.length||pair.after.arrows?.length));
    if(annotated){
      await page.locator(`[data-id="${annotated.id}"]`).click();
      const images=await page.locator('#comparison image').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
      assert.ok(await page.locator('.annotation').count());
      await page.keyboard.press('a');
      assert.equal(await page.locator('.annotation').count(),0);
      assert.deepEqual(await page.locator('#comparison image').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),images);
      await page.keyboard.press('a');
    }
    const staged=data.changes.find(change=>change.stages?.length>1);
    if(staged){
      await page.locator(`[data-id="${staged.id}"]`).click();
      await page.locator('#note').fill('Thought across captured stages');
      await page.keyboard.press('Escape');await page.keyboard.press('s');
      assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#note').inputValue(),'Thought across captured stages');
    }
    for(const device of availableDevices){
      if(availableDevices.length>1) await page.locator('#'+device).click();
      for(const item of data.changes){
        await page.locator(`[data-id="${item.id}"]`).click();
        assert.ok(await page.locator('#comparison figure, #comparison .unavailable').count());
      }
    }
    await page.locator(`[data-id="${first}"]`).click();
    if(availableDevices.length>1) await page.locator('#desktop').click();
    const desktopLayout=await page.evaluate(()=>({note:document.getElementById('note').getBoundingClientRect().width,main:document.getElementById('main').getBoundingClientRect().width,bottom:document.querySelector('.review-app').getBoundingClientRect().bottom,noteBottom:document.getElementById('note').getBoundingClientRect().bottom}));
    assert.ok(desktopLayout.note<=480 && desktopLayout.note<desktopLayout.main*.6);
    assert.equal(desktopLayout.bottom,1000);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
    await page.screenshot({path:path.join(path.dirname(process.argv[2]),'board-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:960});
    if(availableDevices.length>1) await page.locator('#mobile').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(path.dirname(process.argv[2]),'board-mobile.png'),fullPage:true});
    // Completion uses a record prepared by the agent, without import controls.
    await page.evaluate(({id,changes})=>{
      localStorage.setItem('design-grind:'+id+':v1',JSON.stringify({filter:'pending',decisions:Object.fromEntries(changes.slice(0,-1).map(item=>[item.id,{choice:'accept',note:'',fingerprint:item.fingerprint}]))}));
    },data);
    await page.reload();await page.locator('[data-choice=accept]').click();
    assert.match(await page.locator('#next').textContent(),/^Finish/);await page.locator('#next').click();
    assert.equal(await page.locator('#empty').isVisible(),true);
    const completedDownload=page.waitForEvent('download');await page.locator('#export').click();await completedDownload;
    assert.equal(await pending(),'false');await page.reload();assert.equal(await pending(),'false');
    const blocked=await context.newPage();
    await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>null;Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
    await blocked.goto(pathToFileURL(target).href);await blocked.keyboard.press('1');
    assert.equal(await blocked.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await blocked.locator('#export').getAttribute('data-pending'),'true');

    async function scenario(id, changes, storedDevice) {
      const fixture = {...data,id,changes,initialFilter:'all',initialChange:changes[0].id};
      const file = path.join(folder,id+'.html');
      await fs.writeFile(file,original.replace(dataMatch[0],'<script id="board-data" type="application/json">'+JSON.stringify(fixture).replaceAll('<','\\u003c')+'</script>'));
      const testPage = await context.newPage();
      testPage.on('pageerror',error=>errors.push(error.message));
      if(storedDevice) await testPage.addInitScript(({id,device})=>{
        localStorage.setItem('design-grind:'+id+':v1',JSON.stringify({device}));
      },{id,device:storedDevice});
      await testPage.goto(pathToFileURL(file).href);
      return testPage;
    }

    const capture = data.changes.flatMap(item=>[item.variants,...(item.stages||[]).map(stage=>stage.variants)])
      .flatMap(variants=>Object.values(variants||{}))[0];
    assert.ok(capture,'Provide at least one screenshot pair in the test board');
    for(const device of ['mobile','desktop']) {
      const item = {...data.changes[0],variants:{[device]:capture},stages:[]};
      const single = await scenario('only-'+device,[item],device==='mobile'?'desktop':'mobile');
      assert.equal(await single.locator('#comparison').getAttribute('data-device'),device);
      assert.equal(await single.locator('#device-controls').isVisible(),false);
      assert.equal(await single.locator('#desktop').isDisabled(),true);
      assert.equal(await single.locator('#mobile').isDisabled(),true);
      assert.equal(await single.locator('.capture').count(),2);
      await single.keyboard.press('m');
      assert.equal(await single.locator('#comparison').getAttribute('data-device'),device);
      await single.reload();
      assert.equal(await single.locator('#comparison').getAttribute('data-device'),device);
      await single.close();
    }
    const stagedOnly = await scenario('staged-mobile', [{...data.changes[0],variants:{},stages:[{id:'start',label:'Start',variants:{mobile:capture}}]}]);
    assert.equal(await stagedOnly.locator('#comparison').getAttribute('data-device'),'mobile');
    assert.equal(await stagedOnly.locator('#device-controls').isVisible(),false);
    await stagedOnly.close();
    const mixed = await scenario('mixed-stages', [{...data.changes[0],variants:{},stages:[
      {id:'start',label:'Start',variants:{mobile:capture,desktop:capture}}
    ]}]);
    assert.equal(await mixed.locator('#device-controls').isVisible(),true);
    await mixed.keyboard.press('m');
    assert.equal(await mixed.locator('#comparison').getAttribute('data-device'),'mobile');
    await mixed.locator('#desktop').click();
    assert.equal(await mixed.locator('#comparison').getAttribute('data-device'),'desktop');
    await mixed.close();

    const ordered = ['a1','b1','a2','b2'].map(id=>({...data.changes[0],id,title:id,group:id[0],stages:[]}));
    const navigation = await scenario('interleaved-groups',ordered);
    const current = () => navigation.locator('#change-title').textContent();
    assert.deepEqual(await navigation.locator('.nav-item').evaluateAll(nodes=>nodes.map(node=>node.dataset.id)),['a1','a2','b1','b2']);
    assert.equal(await current(),'a1');
    await navigation.locator('#next').click();assert.equal(await current(),'a2');
    await navigation.keyboard.press('k');assert.equal(await current(),'b1');
    await navigation.keyboard.press('ArrowRight');assert.equal(await current(),'b2');
    assert.equal(await navigation.locator('#next').isDisabled(),true);
    await navigation.locator('#prev').click();assert.equal(await current(),'b1');
    await navigation.keyboard.press('j');assert.equal(await current(),'a2');
    await navigation.keyboard.press('ArrowLeft');assert.equal(await current(),'a1');
    assert.equal(await navigation.locator('#prev').isDisabled(),true);
    await navigation.keyboard.press('1');
    await navigation.locator('#filter').selectOption('pending');
    assert.equal(await current(),'a2');
    await navigation.keyboard.press('2');
    await navigation.locator('#next').click();assert.equal(await current(),'b1');
    await navigation.locator('#next').click();assert.equal(await current(),'b2');
    await navigation.locator('#prev').click();assert.equal(await current(),'b1');
    await navigation.close();
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',changes:data.changes.length,devices:availableDevices.length,checks:['keyboard and click toggles','independent notes','reload','changed evidence','export data','export change tracking and reverts','arrows','stages','completion','storage failure','layout','single-device boards','staged device detection','grouped item navigation and filters']}));
    await context.close();
  }finally{await browser.close();await fs.rm(folder,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
