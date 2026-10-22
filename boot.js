const status=document.getElementById('boot-status');
const params=new URL(location.href).searchParams;
const local=['localhost','127.0.0.1'].includes(location.hostname);
if('serviceWorker' in navigator&&'DecompressionStream' in window&&params.get('cache')!=='0'&&(!local||params.get('cache')==='1')){
  try{
    status.textContent='首次加载：下载合并资源包，完成后会自动缓存…';
    navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.kind==='startup-progress')status.textContent=event.data.text;});
    const registration=await navigator.serviceWorker.register(new URL('sw.js',import.meta.url),{scope:new URL('./',import.meta.url).pathname,updateViaCache:'none'});
    const installing=registration.installing||registration.waiting;
    const activated=installing&&installing.state!=='activated'?new Promise((resolve,reject)=>{
      installing.addEventListener('statechange',()=>{if(installing.state==='activated')resolve();else if(installing.state==='redundant')reject(Error('资源缓存安装失败'));});
    }):navigator.serviceWorker.ready;
    await Promise.race([activated,new Promise((_,reject)=>setTimeout(()=>reject(Error('资源包准备超时')),90000))]);
    if(!navigator.serviceWorker.controller)await new Promise(resolve=>{navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});setTimeout(resolve,3000);});
  }catch(error){status.textContent='合并资源暂不可用，正在使用普通加载…';console.warn('启动缓存未就绪：'+error.message);}
}
await import('./host.js');
