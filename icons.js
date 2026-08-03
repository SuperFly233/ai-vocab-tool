(function attachIcons(root){
  let scheduled=false;

  function refreshIcons(){
    scheduled=false;
    if(!root.lucide?.createIcons)return;
    root.lucide.createIcons({
      attrs:{'aria-hidden':'true','stroke-width':'2'},
    });
  }

  function scheduleIcons(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(refreshIcons);
  }

  root.refreshIcons=scheduleIcons;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleIcons,{once:true});
  else scheduleIcons();

  new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('[data-lucide]')||node.querySelector?.('[data-lucide]')))))scheduleIcons();
  }).observe(document.documentElement,{childList:true,subtree:true});
})(window);
