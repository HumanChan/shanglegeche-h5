export function createStorage(native, prefix) {
  const keys=()=>Array.from({length:native.length},(_,i)=>native.key(i)).filter(k=>k?.startsWith(prefix));
  const api={getItem:k=>native.getItem(prefix+String(k)),setItem:(k,v)=>native.setItem(prefix+String(k),String(v)),
    removeItem:k=>native.removeItem(prefix+String(k)),clear:()=>keys().forEach(k=>native.removeItem(k)),
    key:i=>keys()[i]?.slice(prefix.length)??null,get length(){return keys().length}};
  return new Proxy(api,{get:(o,k)=>k in o?o[k]:typeof k==='string'?api.getItem(k):undefined,
    set:(o,k,v)=>{api.setItem(k,v);return true;},deleteProperty:(o,k)=>{api.removeItem(k);return true;}});
}
