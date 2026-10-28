(function(root){
  'use strict';
  let connection;
  function open(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{
      const request=indexedDB.open('lexi-learning',1);let expired=false;
      request.onupgradeneeded=()=>{request.result.createObjectStore('records',{keyPath:'key'})};
      request.onsuccess=()=>{const db=request.result;if(expired){db.close();return}db.onversionchange=()=>{db.close();connection=null};resolve(db)};
      request.onerror=()=>{connection=null;reject(request.error)};
      request.onblocked=()=>{expired=true;connection=null;reject(Error('另一页面正在升级学习数据库，请关闭旧页面后重试。'))};
    });return connection;
  }
  async function read(account,key){
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(account)||typeof key!=='string'||!key||key.length>800)throw Error('学习数据身份无效。');
    const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),request=tx.objectStore('records').get(account+':'+key);let row;request.onsuccess=()=>row=request.result;tx.oncomplete=()=>resolve(row?.value??null);tx.onabort=()=>reject(tx.error||Error('读取学习数据失败。'))});
  }
  async function write(account,key,value){
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(account)||typeof key!=='string'||!key||key.length>800)throw Error('学习数据身份无效。');
    const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put({key:account+':'+key,value:structuredClone(value)});tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('学习数据未保存，原内容保持不变。'));tx.onerror=()=>{}});
  }
  async function atomic(account,keys,mutate){
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(account)||!Array.isArray(keys)||!keys.length||keys.length>200||keys.some(key=>typeof key!=='string'||!key||key.length>800)||new Set(keys).size!==keys.length||typeof mutate!=='function')throw Error('学习事务身份或范围无效。');
    const db=await open();return new Promise((resolve,reject)=>{
      const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),values=new Map();let pending=keys.length,result,failure;
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure||tx.error||Error('学习事务未保存，原数据保持不变。'));tx.onerror=()=>{};
      for(const key of keys){const request=store.get(account+':'+key);request.onsuccess=()=>{
        values.set(key,request.result?.value??null);if(--pending)return;
        try{
          const change=mutate(values);
          if(!change||typeof change.then==='function'||!Array.isArray(change.writes)||change.writes.length>keys.length||new Set(change.writes.map(row=>row?.[0])).size!==change.writes.length)throw Error('学习事务更新无效。');
          result=structuredClone(change.result);
          for(const row of change.writes){if(!Array.isArray(row)||row.length!==2||!values.has(row[0]))throw Error('学习事务不能写入未声明的记录。');store.put({key:account+':'+row[0],value:structuredClone(row[1])})}
        }catch(error){failure=error;tx.abort()}
      }}
    });
  }
  async function scan(account,prefix){
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(account)||typeof prefix!=='string'||!prefix||prefix.length>500)throw Error('学习读取范围无效。');
    const db=await open(),start=account+':'+prefix;
    return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),request=tx.objectStore('records').openCursor(IDBKeyRange.bound(start,start+'\uffff'));const rows=[];let failure;
      request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(rows.length>=20000){failure=Error('学习记录过多，请先导出并缩小范围；未截断读取。');tx.abort();return}rows.push({key:cursor.key.slice(account.length+1),value:cursor.value.value});cursor.continue()};tx.oncomplete=()=>resolve(rows);tx.onabort=()=>reject(failure||tx.error||Error('读取学习范围失败。'));
    });
  }
  root.LearningStore=Object.freeze({read,write,atomic,scan});
})(globalThis);
