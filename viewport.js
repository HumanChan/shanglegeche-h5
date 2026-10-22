export function computeViewport(width,height){
  const portraitWidth=width>height?Math.floor(height*640/1386):width;
  const gameWidth=Math.max(1,Math.min(640,portraitWidth));
  return {width:gameWidth,left:Math.floor((width-gameWidth)/2),height};
}
export function installViewport(w){
  const Browser=w.Laya.Browser,original=Object.getOwnPropertyDescriptor(Browser,'clientWidth').get;
  Object.defineProperty(Browser,'clientWidth',{configurable:true,get(){return computeViewport(original.call(this),w.innerHeight).width;}});
  const resize=w.Laya.Stage.prototype.setScreenSize;
  w.Laya.Stage.prototype.setScreenSize=function(...args){
    const canvas=w.document.getElementById('layaCanvas');
    if(canvas)canvas.style.left=computeViewport(w.innerWidth,w.innerHeight).left+'px';
    return resize.apply(this,args);
  };
}
