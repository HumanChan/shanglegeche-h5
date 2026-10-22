/** 将可用地图展开为选关条目；主线与独立体验保留各自入口。 */
export function createLevelEntries(maps) {
  return maps.filter(map=>map.available)
    .flatMap(map=>(map.grades.length?map.grades:[null]).map(grade=>({map,grade})))
    .sort((a,b)=>(a.grade??Infinity)-(b.grade??Infinity)
      ||a.map.resourceName.localeCompare(b.map.resourceName,'zh-CN',{numeric:true}));
}
