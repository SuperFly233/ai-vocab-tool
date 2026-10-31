module.exports=async function waitBrowserState(page,predicate,{timeout=30000}={}){
 const deadline=Date.now()+timeout;
 do{if(await page.evaluate(predicate))return;await page.waitForTimeout(40)}while(Date.now()<deadline);
 throw Error('Timed out waiting for asynchronous browser state: '+predicate.toString());
};
