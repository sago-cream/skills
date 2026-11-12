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
  const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined});
  try {
    const context = await browser.newContext({viewport:{width:1280,height:1000}});
    await context.addInitScript(() => {
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedResult=text;}}});
    });
    const page = await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(target).href);
    const first = await page.locator('.nav-item[aria-current=true]').getAttribute('data-id');
    await page.keyboard.press('n');
    await page.keyboard.type('A thought before deciding: 1 j');
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    await page.keyboard.press('Escape');
    await page.keyboard.press('1');
    await page.reload();
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#note').inputValue(),'A thought before deciding: 1 j');
    await page.locator('#copy-result').click();
    const saved = JSON.parse(await page.evaluate(()=>window.copiedResult));
    assert.equal(saved.boardId,data.id);
    assert.equal(saved.decisions[first].note,'A thought before deciding: 1 j');
    await page.keyboard.press('1');
    assert.equal(await page.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#note').inputValue(),'A thought before deciding: 1 j');
    await page.locator('#note').fill('Thought added after copying');
    await page.keyboard.press('Escape');
    await page.keyboard.press('2');
    assert.equal(await page.locator('button[data-choice=decline]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#note').inputValue(),'Thought added after copying');
    await page.keyboard.press('k');
    assert.notEqual(await page.locator('.nav-item[aria-current=true]').getAttribute('data-id'),first);
    await page.keyboard.press('j');
    assert.equal(await page.locator('.nav-item[aria-current=true]').getAttribute('data-id'),first);
    await page.keyboard.down('Space');
    assert.equal(await page.locator('.capture[data-side=after] figcaption strong').textContent(),'Before');
    await page.keyboard.up('Space');
    assert.equal(await page.locator('.capture[data-side=after] figcaption strong').textContent(),'After');
    // Changed evidence reopens a decision without losing its independent note.
    data.decisions = await page.evaluate(({id,version})=>
      JSON.parse(localStorage.getItem('before-after-review:'+id+':'+version)).decisions,data);
    data.version += '-revised';
    data.changes.find(change=>change.id===first).fingerprint='updated-evidence';
    await fs.writeFile(target,original.replace(dataMatch[0],'<script id="board-data" type="application/json">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script>'));
    await page.reload();
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
    await page.evaluate(({id,version,changes})=>{
      localStorage.setItem('before-after-review:'+id+':'+version,JSON.stringify({filter:'pending',decisions:Object.fromEntries(changes.slice(0,-1).map(item=>[item.id,{choice:'accept',note:'',fingerprint:item.fingerprint}]))}));
    },data);
    await page.reload();await page.locator('[data-choice=accept]').click();
    assert.match(await page.locator('#next').textContent(),/^Finish/);await page.locator('#next').click();
    assert.equal(await page.locator('#review-complete').isVisible(),true);
    await page.locator('#continue-review').click();
    assert.equal(await page.locator('#filter').inputValue(),'all');
    const blocked=await context.newPage();
    await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>null;Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
    await blocked.goto(pathToFileURL(target).href);await blocked.keyboard.press('1');
    assert.equal(await blocked.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');

    async function scenario(id, changes, {storedDevice, decisions, version = id} = {}) {
      const fixture = {...data,id,version,changes,decisions,initialFilter:'all',initialChange:changes[0].id};
      const file = path.join(folder,id+'.html');
      await fs.writeFile(file,original.replace(dataMatch[0],'<script id="board-data" type="application/json">'+JSON.stringify(fixture).replaceAll('<','\\u003c')+'</script>'));
      const testPage = await context.newPage();
      testPage.on('pageerror',error=>errors.push(error.message));
      if(storedDevice) await testPage.addInitScript(({id,version,device})=>{
        localStorage.setItem('before-after-review:'+id+':'+version,JSON.stringify({device}));
      },{id,version,device:storedDevice});
      await testPage.goto(pathToFileURL(file).href);
      return testPage;
    }

    const capture = data.changes.flatMap(item=>[item.variants,...(item.stages||[]).map(stage=>stage.variants)])
      .flatMap(variants=>Object.values(variants||{}))[0];
    assert.ok(capture,'Provide at least one screenshot pair in the test board');
    for(const device of ['mobile','desktop']) {
      const item = {...data.changes[0],variants:{[device]:capture},stages:[]};
      const single = await scenario('only-'+device,[item],{storedDevice:device==='mobile'?'desktop':'mobile'});
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

    const carried = {...data.changes[0],id:'carried',stages:[]};
    const revised = {...data.changes[0],id:'revised',stages:[],fingerprint:'new-evidence'};
    const seed = {
      carried:{choice:'accept',note:'Keep this unchanged.',fingerprint:carried.fingerprint,updatedAt:'2026-01-01T00:00:00Z'},
      revised:{choice:'decline',note:'Please revise the spacing.',fingerprint:'old-evidence',updatedAt:'2026-01-01T00:00:00Z'}
    };
    const seeded = await scenario('seeded-decisions',[carried,revised],{decisions:seed});
    assert.equal(await seeded.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await seeded.locator('#note').inputValue(),'Keep this unchanged.');
    assert.equal(await seeded.locator('#progress').textContent(),'1 / 2 reviewed');
    await seeded.locator('[data-id=revised]').click();
    assert.equal(await seeded.locator('#stale').isVisible(),true);
    assert.equal(await seeded.locator('#note').inputValue(),'Please revise the spacing.');
    assert.equal(await seeded.locator('button[data-choice=decline]').getAttribute('aria-pressed'),'false');
    await seeded.keyboard.press('2');
    assert.equal(await seeded.locator('#stale').isVisible(),false);
    assert.equal(await seeded.locator('#progress').textContent(),'2 / 2 reviewed');
    await seeded.reload();
    assert.equal(await seeded.locator('button[data-choice=decline]').getAttribute('aria-pressed'),'true');
    await seeded.locator('#copy-result').click();
    const seedExport = JSON.parse(await seeded.evaluate(()=>window.copiedResult));
    assert.equal(seedExport.decisions.carried.choice,'accept');
    assert.equal(seedExport.decisions.revised.choice,'decline');
    assert.equal(seedExport.decisions.revised.fingerprint,'new-evidence');
    await seeded.close();

    const noStorage = await context.newPage();
    noStorage.on('pageerror',error=>errors.push(error.message));
    await noStorage.addInitScript(()=>{
      Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError');};
      Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};
    });
    await noStorage.goto(pathToFileURL(path.join(folder,'seeded-decisions.html')).href);
    assert.equal(await noStorage.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await noStorage.locator('#note').inputValue(),'Keep this unchanged.');
    await noStorage.close();

    const oldBoard = await scenario('cache-isolation',[{...carried,fingerprint:'old-evidence'}],{version:'old'});
    const newBoard = await scenario('cache-isolation',[carried],{version:'new',decisions:{carried:seed.carried}});
    await oldBoard.locator('#note').fill('Late edit in the previous board');
    await oldBoard.keyboard.press('Escape');
    await oldBoard.keyboard.press('2');
    await newBoard.reload();
    assert.equal(await newBoard.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'true');
    assert.equal(await newBoard.locator('#note').inputValue(),'Keep this unchanged.');
    await newBoard.locator('#note').fill('An edit to this exact version');
    await newBoard.keyboard.press('Escape');
    await newBoard.keyboard.press('1');
    await newBoard.reload();
    assert.equal(await newBoard.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    assert.equal(await newBoard.locator('#note').inputValue(),'An edit to this exact version');
    await oldBoard.close();await newBoard.close();
    const commentItem = {...data.changes[0],id:'comment-only',stages:[]};
    const comments = await scenario('comment-only',[commentItem]);
    await comments.locator('#filter').selectOption('pending');
    await comments.locator('#note').fill('   ');
    assert.equal(await comments.locator('#progress').textContent(),'0 / 1 reviewed');
    await comments.locator('#note').fill('Please keep the original spacing.');
    assert.equal(await comments.locator('#progress').textContent(),'1 / 1 reviewed');
    assert.equal(await comments.locator('#review-complete').isVisible(),false,'Do not interrupt typing');
    assert.equal(await comments.locator('button[data-choice=accept]').getAttribute('aria-pressed'),'false');
    await comments.locator('#next').click();
    assert.equal(await comments.locator('#review-complete').isVisible(),true);
    assert.equal(await comments.locator('#review-complete .dialog-actions button').count(),2);
    await comments.locator('#complete-title').click();
    assert.equal(await comments.locator('#review-complete').isVisible(),true);
    await comments.locator('#dismiss-review').click();
    assert.equal(await comments.locator('#review-complete').isVisible(),false);
    assert.equal(await comments.locator('#note').inputValue(),'Please keep the original spacing.');
    await comments.locator('#next').click();
    await comments.mouse.click(8,8);
    assert.equal(await comments.locator('#review-complete').isVisible(),false);
    await comments.locator('#next').click();
    await comments.keyboard.press('Escape');
    assert.equal(await comments.locator('#review-complete').isVisible(),false);
    await comments.locator('#next').click();
    await comments.keyboard.press('1');
    await comments.locator('#complete-copy').click();
    const commentResult = JSON.parse(await comments.evaluate(()=>window.copiedResult));
    assert.equal(commentResult.decisions['comment-only'].choice,null);
    assert.equal(commentResult.decisions['comment-only'].note,'Please keep the original spacing.');
    assert.equal(commentResult.decisions['comment-only'].fingerprint,commentItem.fingerprint);
    assert.equal(await comments.locator('#review-complete').isVisible(),true);
    assert.equal(await comments.locator('#complete-copy').textContent(),'Copy result');
    assert.equal(await comments.locator('#copy-toast').textContent(),'Copied to clipboard');
    assert.equal(await comments.locator('#copy-toast').isVisible(),true);
    await comments.waitForFunction(()=>!document.getElementById('copy-toast').matches(':popover-open'));
    assert.equal(await comments.locator('#complete-copy').textContent(),'Copy result');
    await comments.reload();
    assert.equal(await comments.locator('#review-complete').isVisible(),true);
    await comments.locator('#continue-review').click();
    await comments.locator('#note').fill('');
    assert.equal(await comments.locator('#progress').textContent(),'0 / 1 reviewed');
    await comments.close();

    const fallback = await scenario('clipboard-blocked',[commentItem]);
    await fallback.evaluate(()=>{
      navigator.clipboard.writeText=async()=>{throw new DOMException('Denied','NotAllowedError');};
      document.execCommand=command=>{
        if(command!=='copy') return false;
        window.copiedResult=document.activeElement.value;
        return true;
      };
    });
    await fallback.locator('#filter').selectOption('pending');
    await fallback.locator('#note').fill('Copy directly even without the Clipboard API.');
    await fallback.locator('#next').click();
    await fallback.locator('#complete-copy').click();
    const copied = JSON.parse(await fallback.evaluate(()=>window.copiedResult));
    assert.equal(copied.decisions['comment-only'].note,'Copy directly even without the Clipboard API.');
    assert.equal(await fallback.locator('dialog[open]').count(),1);
    assert.equal(await fallback.locator('#complete-copy').textContent(),'Copy result');
    assert.equal(await fallback.locator('#copy-toast').textContent(),'Copied to clipboard');
    await fallback.evaluate(()=>{document.execCommand=()=>false;delete window.copiedResult;});
    await fallback.locator('#complete-copy').click();
    assert.match(await fallback.locator('#copy-toast').textContent(),/^Copy failed/);
    assert.equal(await fallback.locator('#complete-copy').textContent(),'Copy result');
    assert.equal(await fallback.locator('dialog[open]').count(),1);
    assert.equal(await fallback.evaluate(()=>window.copiedResult),undefined);
    await fallback.close();

    const staleComment = await scenario('stale-comment',[{...commentItem,fingerprint:'revised-comment-evidence'}],{decisions:{'comment-only':commentResult.decisions['comment-only']}});
    assert.equal(await staleComment.locator('#progress').textContent(),'0 / 1 reviewed');
    assert.equal(await staleComment.locator('#stale').isVisible(),true);
    await staleComment.locator('#note').fill('Reviewed the revised evidence.');
    assert.equal(await staleComment.locator('#progress').textContent(),'1 / 1 reviewed');
    assert.equal(await staleComment.locator('#stale').isVisible(),false);
    await staleComment.close();
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',changes:data.changes.length,devices:availableDevices.length,checks:['keyboard and click toggles','independent notes','reload','changed evidence','clipboard result','arrows','stages','completion dialog','close button, backdrop and Escape dismissal','comment-only review','whitespace exclusion','direct clipboard fallback','copy failure reporting','copy toast without button changes','stale comments','storage failure','layout','single-device boards','staged device detection','grouped item navigation and filters','portable prior decisions','cache version isolation']}));
    await context.close();
  }finally{await browser.close();await fs.rm(folder,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
