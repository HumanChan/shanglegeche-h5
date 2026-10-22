/** 使用原Laya的_create正文，避免小游戏编译桥改写裁图参数。 */
export function installTextureFactory(w){
 const Texture=w.Laya.Texture;
 const create=function(...args){return Texture._create(...args);};
 Object.defineProperty(Texture,'create',{configurable:true,get:()=>create,set(){}});
}
