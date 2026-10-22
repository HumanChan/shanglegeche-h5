import {installAds,decorateRewardUI} from './ads.js';
import {createStorage} from './storage.js';
import {installAudioGate} from './audio.js';
import {installViewport} from './viewport.js';
import {installSandboxMapLoader,installSandboxLevelContext} from './map-loader.js';
import {installResourceRoutes} from './resource-routes.js';
import {createLevelEntries} from './level-picker.js';
import {installSpeedControl,SPEED_OPTIONS} from './speed.js';
import {installPoolAllocator} from './pool.js';
import {installTextureFactory} from './texture.js';

const w=window, $=id=>document.getElementById(id);
const state=w.__layah5={phase:'加载模块',errors:[],network:[],selection:null,uiChanges:0};
const params=new URL(location.href).searchParams;
const levels=await fetch('levels.json').then(r=>r.json());
const resourceRoutes=await fetch('resource-routes.json').then(r=>r.json());
const sandbox=levels.maps.find(m=>m.available&&!m.grades.length&&m.resourceName===params.get('map'));
const selectedGrade=Number(params.get('grade'));
const namespace='slgc-layah5:v1:'+(sandbox?'sandbox:'+sandbox.resourceName:'main')+':';
const nativeStorage=w.localStorage;
Object.defineProperty(w,'localStorage',{configurable:true,value:createStorage(nativeStorage,namespace)});
state.storageNamespace=namespace;
if(sandbox){$('sandbox-label').hidden=false;state.selection={kind:'本地地图体验',resourceName:sandbox.resourceName};}
let refs,selectionApplied=false,lastLoadedGrade=Number(localStorage.getItem('h5-last-playable-grade')||1),dialogPaused=null;
function pauseDialog(open) {
  if(!refs)return;
  if(open&&dialogPaused===null){dialogPaused=refs.gameData.pause;refs.gameData.pause=true;}
  if(!open&&dialogPaused!==null){refs.gameData.pause=dialogPaused;dialogPaused=null;}
}
function picker(){renderLevels();pauseDialog(true);if(!$('level-picker').open)$('level-picker').showModal();}
function select(map,grade){
  const url=new URL(location.href);url.search='';
  if(grade)url.searchParams.set('grade',String(grade));else url.searchParams.set('map',map.resourceName);
  location.assign(url);
}
function renderLevels(){
  const q=$('level-search').value.trim().toLowerCase();
  const host=$('level-list');host.replaceChildren();
  const available=levels.maps.filter(m=>m.available);
  $('level-summary').textContent=`已找到 ${available.length} 张地图，其中 ${available.filter(m=>m.grades.length).length} 张对应原主线。全部 ${levels.rows.length} 行主线配置已核查。`;
  for(const {map,grade} of createLevelEntries(available)){
    const label=grade?`原主线 第 ${grade} 关`:'独立地图体验';
    if(q&&!`${label} ${map.resourceName} ${map.embeddedId}`.toLowerCase().includes(q))continue;
    const button=document.createElement('button'),detail=document.createElement('small');button.textContent=label;detail.textContent=map.resourceName;button.append(detail);
    button.addEventListener('click',()=>select(map,grade));host.append(button);
  }
}
function missing(grade,error){
  state.phase='缺失关卡';state.missingGrade=grade;
  const row=levels.rows.find(r=>r.grade===grade);
  $('missing-message').textContent=`原主线第 ${grade} 关：${row?.resourceName??'未知资源'}。${error?.message??'当前解包快照没有包含对应的微信资源分包；这不代表原游戏没有该关。'} 可以重玩或选择其他已找到的地图。`;
  pauseDialog(true);if(!$('missing-level').open)$('missing-level').showModal();
  $('boot-status').hidden=true;
}
function applySelection(){
  if(selectionApplied||!w.W?.ICache?.setGrade)return;
  if(sandbox)W.ICache.setGrade(1);
  else if(Number.isInteger(selectedGrade)&&selectedGrade>0&&levels.rows.some(r=>r.grade===selectedGrade))W.ICache.setGrade(selectedGrade);
  selectionApplied=true;
  if(params.has('grade')){const clean=new URL(location.href);clean.searchParams.delete('grade');history.replaceState(null,'',clean);}
}
function currentGrade(){return Number(w.W?.ICache?.getGrade?.()||1);}
function guardCurrent(){
  applySelection();const grade=currentGrade(),count=levels.rows.length;
  const normalized=grade<=count?grade:3+(grade-count-1)%(count-2);
  if(!sandbox&&!levels.rows.find(r=>r.grade===normalized)?.available){missing(grade);return false;}
  return true;
}
function navigateToGrade(grade){const url=new URL(location.href);url.search='';url.searchParams.set('grade',String(grade));location.assign(url);}
$('open-levels').onclick=picker;$('level-search').oninput=renderLevels;
$('close-levels').onclick=()=>{$('level-picker').close();pauseDialog(false);};
$('level-picker').addEventListener('cancel',()=>pauseDialog(false));
$('restart-level').onclick=()=>{if(sandbox)location.reload();else navigateToGrade(lastLoadedGrade);};
$('open-home').onclick=()=>refs?.manager.goHome();
$('missing-select').onclick=()=>{$('missing-level').close();pauseDialog(false);picker();};
$('missing-retry').onclick=()=>navigateToGrade(lastLoadedGrade);
$('missing-home').onclick=()=>{$('missing-level').close();pauseDialog(false);refs?.manager.goHome();};

w.__installLayaH5=api=>{
  refs=api;state.refs=api;
  state.speed=installSpeedControl(api,localStorage);
  const speedSelect=$('game-speed');
  for(const value of SPEED_OPTIONS)speedSelect.add(new Option(value==='original'?'原版速度':value+' 倍速',value));
  speedSelect.value=state.speed.value;speedSelect.disabled=false;
  speedSelect.onchange=()=>state.speed.set(speedSelect.value);
  installResourceRoutes(w.W.LM,resourceRoutes);
  // 下列三组为原统计类，业务状态不由这些上报方法持有。
  for(const target of [api.analytics,api.tracker,api.videoTracker])
    for(const key of Object.getOwnPropertyNames(target??{}))
      if(typeof target[key]==='function'&&!['prototype','constructor'].includes(key))target[key]=()=>{};
  if(sandbox){
    installSandboxMapLoader(api,sandbox);
    installSandboxLevelContext(api,sandbox);
    api.WinUI.prototype.onBtnNext=()=>location.reload();
  }
  const init=api.MainGame.prototype.initEvent;
  api.MainGame.prototype.initEvent=function(...args){
    applySelection();if(sandbox)W.ICache.setGrade(1);
    if(!guardCurrent())return Promise.reject(Error('本地关卡资源缺失'));
    lastLoadedGrade=currentGrade();if(!sandbox)localStorage.setItem('h5-last-playable-grade',String(lastLoadedGrade));state.selection={kind:sandbox?'本地地图体验':'原主线',grade:lastLoadedGrade,resourceName:sandbox?.resourceName};state.phase='加载场景';
    return Promise.resolve(init.apply(this,args)).then(value=>{
      state.phase='场景就绪';state.loadedResource=sandbox?.resourceName??levels.rows.find(r=>r.grade===lastLoadedGrade)?.resourceName;
      W.ICache.saveData();return value;
    });
  };
  const onOpened=api.GameUI.prototype.onOpened;
  api.GameUI.prototype.onOpened=async function(...args){const result=await onOpened.apply(this,args);state.phase='游玩';$('boot-status').hidden=true;return result;};
  const restart=api.manager.restart;
  api.manager.restart=function(...args){if(!guardCurrent())return Promise.resolve();return restart.apply(this,args);};
  const startHome=api.HomeUI.prototype.onBtnStart;
  api.HomeUI.prototype.onBtnStart=function(...args){if(!guardCurrent())return Promise.resolve();return startHome.apply(this,args);};
  const failure=api.manager.returnHomeAfterLevelLoadFailure;
  api.manager.returnHomeAfterLevelLoadFailure=async function(error){
    state.errors.push({kind:'关卡加载',message:String(error)});
    try{await failure.call(this,error)}finally{missing(currentGrade(),error)}
  };
  const saveAfter=(object,method)=>{
    const original=object[method];if(typeof original!=='function')return;
    object[method]=function(...args){const out=original.apply(this,args);queueMicrotask(()=>w.W?.ICache?.saveData?.());return out;};
  };
  saveAfter(api.manager,'gameEnd');
};

function logError(kind,error){state.errors.push({kind,message:String(error?.message??error),stack:error?.stack});if(state.phase!=='游玩')$('boot-status').textContent='加载遇到问题，可使用右上角选关。';}
w.addEventListener('error',e=>logError('脚本',e.error??e.message));
w.addEventListener('unhandledrejection',e=>logError('异步',e.reason));
document.addEventListener('securitypolicyviolation',e=>state.network.push({blocked:e.blockedURI,directive:e.violatedDirective}));

// 原Laya持久化层继续使用其原协议，底层已替换为H5独立命名空间。
const factories=new Map(),cache=new Map();
w.define=(id,factory)=>factories.set(id,factory);
function requireModule(id,parent=''){
  if(id.startsWith('.'))id=new URL(id,'https://module.invalid/'+parent).pathname.slice(1);
  else if(!factories.has(id)&&parent.includes('/'))id=parent.slice(0,parent.lastIndexOf('/')+1)+id;
  if(cache.has(id))return cache.get(id).exports;
  if(!factories.has(id))throw Error('缺少原模块：'+id);
  const module={exports:{}};cache.set(id,module);
  factories.get(id).call(w,x=>requireModule(x,id),module,module.exports);return module.exports;
}
w.loadLib=requireModule;
w.screenOrientation='portrait';
const savedConsole=Object.fromEntries(['log','info','warn','error'].map(k=>[k,console[k]]));
try{
 await new Promise((ok,no)=>{const script=document.createElement('script');script.src='modules.js';script.onload=ok;script.onerror=no;document.head.append(script);});
 requireModule('laya.core.min.js');installViewport(w);state.audio=installAudioGate(w);
 for(const id of ['libs/min/laya.html.min.js','libs/min/laya.ui.min.js','libs/min/laya.d3.min.js','libs/min/fairygui.min.js','libs/min/px.wasm.min.js','libs/min/utils.min.js','libs/min/gravityengine.mg.layats.min.js','libs/min/W.min.js','libs/min/ad.min.js'])requireModule(id);
 installPoolAllocator(w);installTextureFactory(w);installAds(w);
 requireModule('libs/min/bundle.min.js');
}catch(error){state.phase='启动失败';logError('启动',error);console.error(error);}
finally{Object.assign(console,savedConsole);}

// 使用真实浏览器时间等待，避免改变原Timer、Tween及正常玩法时序。
w.advanceTime=ms=>new Promise(r=>setTimeout(r,ms));
w.render_game_to_text=()=>{
 const game=w.Game,m=game?.maingame,camera=game?.camera;
 const cars=(m?.lists??[]).flatMap((list,column)=>(list??[]).slice(0,1).map(car=>{
  if(!car?.sp3?.transform)return null;
  const point=new Laya.Vector4();camera?.worldToViewportPoint(car.sp3.transform.position,point);
  return {id:car.shooterId,color:car.color_rid,remaining:car.bulletTotalNum,column,x:point.x,y:point.y,chosen:car.isChosen};
 })).filter(Boolean);
 return JSON.stringify({phase:state.phase,coordinates:'原点为画布左上，x向右，y向下；车辆坐标为Laya视口像素',selection:state.selection,loadedResource:state.loadedResource,grade:currentGrade(),speed:state.speed?.value??'original',game:w.__gameAiTest?.getState?.(),paused:refs?.gameData.pause,cars,used:(m?.usedCannonList??[]).filter(Boolean).map(c=>({id:c.shooterId,color:c.color_rid,remaining:c.bulletTotalNum})),rewards:state.ads?.rewardCount,errors:state.errors.length});
};
setInterval(()=>{
  if(w.fgui?.GRoot?._inst)state.uiChanges+=decorateRewardUI(fgui.GRoot.inst);
},350);
document.addEventListener('pointerdown',()=>{
  try{state.audio?.unlock();}catch(error){logError('音频解锁',error);}
},{capture:true});
let hiddenPause;
document.addEventListener('visibilitychange',()=>{
  if(!refs)return;
  if(document.hidden){hiddenPause=refs.gameData.pause;refs.gameData.pause=true;w.W?.ICache?.saveData?.();}
  else if(hiddenPause!==undefined){refs.gameData.pause=hiddenPause;hiddenPause=undefined;}
});
w.addEventListener('pagehide',()=>w.W?.ICache?.saveData?.());
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!['INPUT','TEXTAREA'].includes(e.target.tagName))document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();});
