module.exports=async function dragTarget(page,selector,{touch=false,cancel=false,row='.scene-ai-target',id='data-target-id'}={}){
 for(const close of await page.locator('.toast-close').all())if(await close.isVisible())await close.click();
 const grips=page.locator(selector);await grips.first().evaluate(n=>n.scrollIntoView({block:'start'}));await page.waitForTimeout(100);
 const from=await grips.first().boundingBox(),ids=await grips.evaluateAll((nodes,{row,id})=>nodes.map(n=>n.closest(row).getAttribute(id)),{row,id});
 if(!from||ids.length<2)throw Error('Missing reorder handle');
 const x=from.x+from.width/2,y=from.y+from.height/2;
 const session=touch?await page.context().newCDPSession(page):null;
 if(touch){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(220)}
 else{await page.mouse.move(x,y);await page.mouse.down()}
 for(let step=0;step<24;step++){
  const target=await page.locator(`[${id}="${ids[1]}"]`).evaluate(n=>{
   const r=n.getBoundingClientRect(),s=n.closest('.scene-editor-body,.scene-dialog-body,.modal-body')?.getBoundingClientRect();
   return Math.min(innerHeight-80,(s?.bottom||innerHeight)-24,r.top+r.height/2+70);
  });
  if(touch)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:target}]});
  else await page.mouse.move(x,target,{steps:8});
  await page.waitForTimeout(70);
  if(await grips.first().evaluate((n,{row,id})=>n.closest(row).getAttribute(id),{row,id})!==ids[0])break;
 }
 if(touch){await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await session.detach()}
 else{if(cancel)await page.keyboard.press('Escape');await page.mouse.up()}
 await page.waitForTimeout(200);
};
