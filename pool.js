/** 对应已由原编译内核冻结参考验证的 ResourceAllocation.ts，不改变池容量与回收规则。 */
export function createResourceAllocator(ports){
  return {o(pool){
    const free=pool.pool_set,maker=pool.maker;
    if(pool.no_clone&&pool.list_set.size===0)pool.prefabCreateOne();
    let resource;const type=maker.type;
    if(type===ports.Material||type===ports.Texture2D){
      if(free.size===0)return undefined;
      resource=free.values().next().value;
    }else{
      const used=pool.u_set;
      if(free.size>0){resource=free.values().next().value;free.delete(resource);used.add(resource);}
      else{
        const list=pool.list_set,limit=pool.limit|0;
        if(limit===0||list.size<(limit>>>0)){
          resource=maker.create(limit===0,limit);if(resource===null)return null;
          list.add(resource);used.add(resource);
        }else{resource=pool.gOO();resource.removeSelf();}
      }
    }
    resource.mem_start_time=ports.timer.currTimer;return resource;
  }};
}

export function installPoolAllocator(w){
  // 原入口在Laya.init之前；类型与Timer必须在实际分配时读取。
  const allocator=createResourceAllocator({get Material(){return w.Laya.Material;},get Texture2D(){return w.Laya.Texture2D;},get timer(){return w.Laya.timer;}});
  // 实际池由原基类内部构造，公开SPList是空子类，必须安装在其基类上。
  Object.getPrototypeOf(w.W.SPList.prototype).gO=function(){return allocator.o(this);};
}
