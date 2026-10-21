const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const [width,height] of [[320,640],[390,844],[768,900],[1440,900],[2048,1382],[844,390]])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
  await page.route('https://**/*',route=>route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/scenes`);
  await page.waitForFunction(()=>typeof SceneStudy!=='undefined');
  await page.evaluate(async()=>{
   await cloudInitPromise;const now=new Date().toISOString();
   setSettings({...getSettings(),sceneLibrary:[{id:'modal-test',groupId:'modal-test',title:'Dialog test',quote:'A scene with long text.',createdAt:now,updatedAt:now}]});
   for(let i=0;i<45;i++)saveLookupResult({query:`word ${i}`,result:{meta:{query:`word ${i}`},headword:{title:`word ${i} ${'long title '.repeat(8)}`,coreMeaning:'核心义与长内容 '.repeat(12)},senses:[],collocations:[],register:{},confusions:[]}});
   SceneWorkspace.render();SceneWorkspace.select('modal-test');
  });
  async function check(label){
   const geometry=await page.locator('dialog[open]').evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,overflow:node.scrollWidth>node.clientWidth}});
   assert.ok(Math.abs(geometry.x+geometry.w/2-width/2)<2,`${label}: horizontal centering ${JSON.stringify(geometry)}`);
   assert.ok(Math.abs(geometry.y+geometry.h/2-height/2)<2,`${label}: vertical centering`);
   assert.ok(geometry.x>=10&&geometry.y>=10&&geometry.y+geometry.h<=height-10,`${label}: viewport bounds`);
   assert.equal(geometry.overflow,false,`${label}: horizontal overflow`);
  }
  await page.evaluate(()=>SceneStudy.openPicker('modal-test'));await check('association');
  const footer=page.locator('#scene-association-picker footer'),search=page.getByRole('searchbox',{name:'搜索已有词条'}),before=await footer.boundingBox();
  await page.locator('.scene-picker-list').evaluate(node=>node.scrollTop=node.scrollHeight);
  assert.deepEqual(await footer.boundingBox(),before,'List scroll must not move confirmation');
  assert.ok(await search.isVisible());await page.locator('.scene-picker-row input').last().check();
  const button=await page.locator('[data-associate-confirm]').boundingBox();assert.ok(button.y+button.height<height-10,'Confirm remains in viewport');
  if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`dialog-${width}-${height}-${theme}.png`)})}
  await page.locator('dialog header button').click();
  await page.evaluate(async()=>{const item=getHistory()[0];await SceneStudy.associate('modal-test',[item.id]);SceneStudy.openHighlights(item.id,'modal-test')});await check('highlight');await page.locator('dialog header button').click();
  if(width<=900)await page.locator('.scene-back').click();
  await page.locator('[data-scene-export]').click();await check('export');await page.locator('dialog header button').click();
  await page.evaluate(()=>AnkiBridge.manage());await check('Anki manager');await page.locator('dialog header button').click();
  await page.evaluate(()=>{const node=document.createElement('dialog');node.className='scene-query-dialog';node.textContent='Query confirmation';document.body.append(node);node.showModal()});await check('query');
  assert.deepEqual(errors,[]);console.log(`${width}x${height} ${theme}: association, scrolling footer, highlight, export, Anki and query centered and bounded`);await context.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(error=>{console.error(error);process.exitCode=1});
