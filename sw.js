// 资源包版本：4c9e0dd465b34d11
const scope=self.registration.scope;
const prefix='slgc-pages:'+new URL(scope).pathname+':';
let current;
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function progress(text){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage({kind:'startup-progress',text});}
async function cacheName(){
 if(!current){const keys=(await caches.keys()).filter(k=>k.startsWith(prefix));for(const key of keys.reverse())if(await (await caches.open(key)).match(new URL('_cache_ready',scope))){current=key;break;}}
 return current;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const info=await (await fetch(new URL('startup.json',scope),{cache:'no-store'})).json();
 current=prefix+info.version;
 const cache=await caches.open(current);
 if(!(await cache.match(new URL('_cache_ready',scope)))){
  await progress('正在下载合并资源包（'+(info.compressedBytes/1048576).toFixed(1)+' MB）…');
  const response=await fetch(new URL('startup.pack',scope),{cache:'no-store'});if(!response.ok)throw Error('资源包HTTP '+response.status);
  const bytes=await response.arrayBuffer();if(await hash(bytes)!==info.sha256)throw Error('资源包哈希不符');
  await progress('下载完成，正在解压并缓存原资源…');
  const json=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  for(const file of json.files){
   if(file.path.startsWith('/')||file.path.includes('\\')||file.path.split('/').includes('..')||file.path.includes(':'))throw Error('资源路径非法');
   const data=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));if(await hash(data)!==file.sha256)throw Error('资源内容哈希不符');
   await cache.put(new URL(file.path,scope),new Response(data,{headers:{'Content-Type':file.type}}));
  }
  await cache.put(new URL('_cache_ready',scope),new Response(info.version));
 }
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const name=await cacheName();for(const key of await caches.keys())if(key.startsWith(prefix)&&key!==name)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==new URL(scope).origin||!url.href.startsWith(scope))return;
 if(['sw.js','boot.js','startup.json','startup.pack'].some(p=>url.pathname===new URL(p,scope).pathname))return;
 event.respondWith((async()=>{
  const name=await cacheName();if(!name)return fetch(event.request);
  const cache=await caches.open(name),canonical=new URL(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,url.origin);
  if(event.request.mode==='navigate'){
   try{return await fetch(event.request);}catch{return await cache.match(canonical)||Response.error();}
  }
  const saved=await cache.match(canonical);if(saved)return saved;
  const response=await fetch(event.request);
  if(response.ok)event.waitUntil(cache.put(canonical,response.clone()));return response;
 })());
});
