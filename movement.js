const installed=new WeakSet();
/** 等待队列的受阻回弹与入场使用不同Tween目标，必须在原移动清理边界一并结束。 */
export function installMovementSafety(api) {
  const prototype=api.MainGame.prototype;
  if(installed.has(prototype))return;
  const original=prototype.clearCannonMoveTween;
  prototype.clearCannonMoveTween=function(car,...args){
    // 原方法只清sp3；shakeSp3的Tween实际挂在blockedNudgeTweenData上。
    // 使用原清理方法恢复回弹起点，再让原选车/补位/入场继续决定终点。
    car?.clearBlockedNudgeTween?.();
    return original.call(this,car,...args);
  };
  installed.add(prototype);
}
