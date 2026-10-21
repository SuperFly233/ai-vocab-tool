const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(10000);
  await page.addInitScript(t=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',t)},theme);await page.route('https://**/*',r=>r.abort());await page.goto(`http://127.0.0.1:${server.address().port}/scenes`);await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');
  const violations=await page.evaluate(()=>{
   const bad=[];function inspect(rules){for(const rule of rules){if(rule.selectorText&&/:(hover|focus|focus-visible|focus-within)\b/.test(rule.selectorText)&&!/(::|:before|:after|\.brand-icon)/.test(rule.selectorText)){
    const t=rule.style.transform;if(t&&t!=='none'&&!(rule.selectorText.includes('clear-query-btn')&&t==='translateY(-50%)'))bad.push([rule.selectorText,t]);
    if(rule.style.scale&&rule.style.scale!=='none')bad.push([rule.selectorText,rule.style.scale]);
   }if(rule.cssRules)inspect(rule.cssRules)}}for(const sheet of document.styleSheets)inspect(sheet.cssRules);return bad;
  });assert.deepEqual(violations,[],'Hover/focus must not change outer control geometry; only anchored centering and documented internal brand motion are allowed');
  await page.evaluate(async()=>{await cloudInitPromise;const canvas=document.createElement('canvas');canvas.width=600;canvas.height=360;const ctx=canvas.getContext('2d'),refs=[];for(const [i,color] of ['#397f86','#8e4f68'].entries()){ctx.fillStyle=color;ctx.fillRect(0,0,600,360);ctx.fillStyle='#fff';ctx.font='28px sans-serif';ctx.fillText(`Scene media ${i+1}`,30,100);const blob=await new Promise(r=>canvas.toBlob(r));blob.name=`media-${i+1}.png`;refs.push(await SceneData.putFile(blob))}const now=new Date().toISOString();setSettings({...getSettings(),sceneLibrary:[{id:'motion',groupId:'motion',title:'稳定的素材切换',quote:'A stable control keeps its position.',media:refs,createdAt:now,updatedAt:now}]});SceneWorkspace.render();SceneWorkspace.select('motion')});
  async function stable(locator,label,focus=false){
   await page.mouse.move(width-2,898);await locator.evaluate(n=>n.blur());await page.waitForTimeout(220);const before=await locator.boundingBox();assert.ok(before,label+' visible');
   if(focus)await locator.focus();else await locator.hover();await page.waitForTimeout(240);const after=await locator.boundingBox();for(const key of ['x','y','width','height'])assert.ok(Math.abs(after[key]-before[key])<.6,`${label} ${key}: ${before[key]} -> ${after[key]}`);return after;
  }
  await stable(page.locator('[data-media-index="0"]'),'media choice 1');await stable(page.locator('[data-media-index="1"]'),'media choice 2');await page.locator('[data-media-index="1"]').click();assert.equal(await page.locator('[data-media-index="1"]').getAttribute('aria-pressed'),'true');await stable(page.locator('[data-media-index="1"]'),'selected media choice');
  if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`media-hover-${width}-${theme}.png`)})}
  await page.evaluate(()=>{
   const host=document.createElement('div');host.id='motion-probes';host.style.cssText='position:fixed;z-index:9999;left:12px;top:140px;width:270px;display:grid;gap:10px;background:var(--panel);padding:0;';
   host.innerHTML='<div style="overflow:auto;border:1px solid var(--line)"><button class="plain-btn" id="probe-plain">Plain</button><button class="danger-btn" id="probe-danger">Danger</button><button class="icon-btn" id="probe-icon" aria-label="Probe icon">'+icon('images')+'</button><button class="tab-btn" id="probe-tab">Tab</button><span class="seg"><button id="probe-seg">Segment</button></span><button class="roll-btn" id="probe-roll">Version</button><input class="cloud-input" id="probe-input" value="Focused field"></div>';
   document.body.append(host);
  });
  for(const id of ['plain','danger','icon','tab','seg','roll']){await stable(page.locator('#probe-'+id),id);await stable(page.locator('#probe-'+id),id+' keyboard focus',true)}await stable(page.locator('#probe-input'),'focused input',true);
  await page.locator('#probe-icon').evaluate(n=>{n.classList.add('dragging');n.style.transform='translateX(14px)'});await page.locator('#probe-icon').hover();assert.equal(await page.locator('#probe-icon').evaluate(n=>Math.round(new DOMMatrixReadOnly(getComputedStyle(n).transform).m41)),14,'Hover must not override intentional drag transforms');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);console.log(`${width}px ${theme}: CSSOM motion contract, media choices, clipped control families, focus and preserved drag transform passed`);await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
