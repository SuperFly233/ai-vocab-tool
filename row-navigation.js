(function(root){
  let press=null;
  document.addEventListener('pointerdown',event=>{press={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,selected:Boolean(String(getSelection()).trim())}},true);
  document.addEventListener('pointermove',event=>{if(press?.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>7)press.moved=true},true);
  document.addEventListener('pointercancel',()=>{if(press)press.moved=true},true);
  function open(event,action,sourceRow=event.currentTarget){
    if(event.defaultPrevented||event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const row=sourceRow,control=event.target.closest('button,a,input,select,textarea,label,[contenteditable="true"],[role="button"]');
    if(control&&control!==row&&!control.matches('[data-row-link]'))return;
    if(event.detail!==0&&(press?.moved||press?.selected))return;
    if(String(getSelection()).trim())return;
    event.preventDefault();action();
  }
  function bind(row,action){row.dataset.openRow='true';row.onclick=event=>open(event,action)}
  root.RowNavigation={open,bind};
  addEventListener('DOMContentLoaded',async()=>{
    await appReady;await cloudInitPromise;
    const id=new URL(location.href).searchParams.get('entry');
    if(location.pathname==='/history'&&id&&getHistory().some(item=>String(item.id)===id))openHistoryModal(Number(id));
  });
})(globalThis);
