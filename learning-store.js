(function(root){
  'use strict';
  let connection;
  function open(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{
      const request=indexedDB.open('lexi-learning',1);
      request.onupgradeneeded=()=>{request.result.createObjectStore('records',{keyPath:'key'})};
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=null};resolve(db)};
      request.onerror=()=>{connection=null;reject(request.error)};
      request.onblocked=()=>{connection=null;reject(Error('另一页面正在升级学习数据库，请关闭旧页面后重试。'))};
    });return connection;
  }
  async function read(account,key){
    const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),request=tx.objectStore('records').get(account+':'+key);let row;request.onsuccess=()=>row=request.result;tx.oncomplete=()=>resolve(row?.value??null);tx.onabort=()=>reject(tx.error||Error('读取学习数据失败。'))});
  }
  async function write(account,key,value){
    if(typeof account!=='string'||!account||typeof key!=='string'||!key)throw Error('学习数据身份无效。');
    const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put({key:account+':'+key,value:structuredClone(value)});tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('学习数据未保存，原内容保持不变。'));tx.onerror=()=>{}});
  }
  root.LearningStore=Object.freeze({read,write});
})(globalThis);
