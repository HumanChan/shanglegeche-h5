// 原注册表外的补充地图仅在独立体验中借现有RID进入原初始化流程。
// 该页面的存档和地图已隔离；不更换原主线配置或注册表。
export function installSandboxLevelContext(api,map){
 api.levelConfig.getDramaLevelResName=()=>map.resourceName;
 const runtimeConfig=api.levelConfig.getRuntimeDramaLevelConfig;
 api.levelConfig.getRuntimeDramaLevelConfig=function(){return runtimeConfig.call(this,1);};
 // 原getBoardLayoutLevel调用getActualLevel；若仍查主线第1行，会错误套用
 // 第1关放大/黑洞专用坐标。布局编号取真实地图名，非纯数字名用原普通关起点3。
 api.MainGame.prototype.getActualLevel=function(){return api.levelConfig.getLevelNumFromResName(map.resourceName)||3;};
}
export function installSandboxMapLoader(api,map,fetchImpl=fetch){
 if(!map?.available||!/^res\/map_[1-9][0-9]*\/[A-Za-z0-9_]+\.json$/.test(map.path))throw Error('独立地图路径无效');
 const rid=api.resourceKeys[map.resourceName]??api.resourceKeys.level1;
 if(!rid)throw Error('原地图加载入口缺失');
 api.resourceKeys[map.resourceName]=rid;
 const original=api.resourceLoader.loadLevelJson;
 api.resourceLoader.loadLevelJson=async function(id,si,timeout=10000){
  if(id!==rid)return original.call(this,id,si,timeout);
  const response=await fetchImpl(map.path,{signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error(`地图加载失败：${map.resourceName} HTTP ${response.status}`);
  const data=await response.json();
  // 发布时逐图验证；此处仍拒绝无效响应，交给原失败入口明确提示。
  const array=x=>typeof x==='string'?JSON.parse(x):x;
  const cubes=array(data.cubeData),cars=array(data.cannon_order),bullets=array(data.bullet_order);
  if(!Array.isArray(cubes)||!cubes.length||!Array.isArray(cars)||!cars.length||!Array.isArray(bullets)||bullets.length<cars.length||cars.some((row,i)=>!Array.isArray(row)||!row.length||!Array.isArray(bullets[i])||row.length!==bullets[i].length))throw Error('地图结构无效：'+map.resourceName);
  return data;
 };
}
