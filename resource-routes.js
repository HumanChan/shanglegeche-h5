// 已有原路径优先；仅为版本12新增连体车所需的连接材质补齐路径映射。
export function installResourceRoutes(loader,routes){
 for(const [id,path] of Object.entries(routes)){
  if(!/^72[0-9]{2}$|^7300$/.test(id)||Number(id)<7201||!/^res\/home\/mat\/(?:[A-Za-z0-9_]+\/)*[A-Za-z0-9_]+\.lmat$/.test(path))throw Error('补充资源编号或路径无效');
 }
 const original=loader.Res;
 loader.Res=function(id,...args){
  const value=original.call(this,id,...args);
  if(value!=null)return value;
  return Number.isInteger(id)&&Object.hasOwn(routes,id)?routes[id]:value;
 };
}
