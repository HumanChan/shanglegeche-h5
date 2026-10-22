export const SPEED_OPTIONS=Object.freeze(['original','1','2','3','4','5','10']);

/** 在原速度应用边界接入H5倍率，原版模式保持原参数。 */
export function installSpeedControl(api,storage) {
  const key='h5-speed-multiplier',saved=storage.getItem(key);
  let value=SPEED_OPTIONS.includes(saved)?saved:'original';
  const original=api.GameUI.prototype.applyGameSpeedScale;
  api.GameUI.prototype.applyGameSpeedScale=function(...args){
    if(value==='original')return original.apply(this,args);
    const rate=Number(value);
    return original.call(this,this.getBaseFastSpeedScale()*rate,rate);
  };
  return {
    get value(){return value;},
    set(next){
      if(!SPEED_OPTIONS.includes(next))throw new RangeError('不支持的游戏倍率：'+next);
      value=next;storage.setItem(key,value);
      api.GameUI.instance?.applyFastSpeedByCache();
    },
  };
}
