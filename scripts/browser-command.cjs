async function clickCommand(page,locator){
  if(await locator.isVisible())return locator.click();
  const label=await locator.evaluate(node=>node.getAttribute('aria-label')||node.dataset.tip||node.textContent.trim());
  const point=await locator.evaluate(node=>{for(let parent=node.parentElement;parent;parent=parent.parentElement){const trigger=parent.querySelector(':scope>[data-shared-more]');if(trigger){trigger.scrollIntoView({block:'nearest'});const r=trigger.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}}return null});
  if(!point)throw new Error(`No visible shared menu for ${label}`);
  await page.waitForTimeout(80);await page.mouse.click(point.x,point.y);const item=page.getByRole('menuitem',{name:label,exact:true});
  await item.click();
}
module.exports={clickCommand};
