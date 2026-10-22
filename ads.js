/**
 * 原包广告的浏览器适配。只改平台广告边界，奖励仍由原成功回调执行。
 * 来源：wxpkg/libs/game.js:22665（成功状态1）、29393-29403（统一入口）、
 * 29476（视频弹窗捕获旧入口）、29178/30363（先构造渠道后初始化）。
 */
const disabledAdMethods = [
  'createVideoAd','reCreateVideoAd','initVideoId','initBannerId','createBannerAd',
  'destroyBannerAd','showBannerAd','hideBannerAd','resetBannerAd','changeBanner',
  'createInterstitialAd','showInterstitialAd','showInterstitialAdToKs',
  'createNativeAd','showNativeAd','clickNativeAd','destroyNativeAd','showNativeAdFake',
  'createCustomAd','createCustomAds','createCustomAdWx','showCustomAd','showCustomAds',
  'showCustomAdWx','hideCustomAdsWx','hideCustomAdWx','desCustomAdsWx','hideCustomAd','hideCustomAds',
  'createBlockAd','showBlockAd','hideBlockAd','createAppBox','showAppBox',
  'createGamePortalAd','showGamePortalAd','createGameBannerAd','showGameBannerAd',
  'createGameDrawerAd','showGameDrawerAd','crateBoxPortalAd','createBoxPortalAd',
  'showBoxPortalAd','hideBoxPortalAd','createBoxBannerAd','showBoxBannerAd','hideBoxBannerAd',
  'createBoxSuspendAd','showBoxSuspendAd','hideBoxSuspendAd','createClickBanner',
  'revertClickBanner','hideClickBanner','showFullVideoAd','showFeedAdToKs',
  'showBannerAdToKs','showFullVideAdToKs','showShopWindow','showInfoFlow','createTaskAd',
  'showMoreGamesModal','loadRecommend','showRecommend','onBtnMore','showMistake',
  'navigateToMiniProgram','navigateToScene','createGameClubButton','showGameClubButton',
  'hideGameClubButton','destroyGameClubButton','jumpToGameClub',
];
const disabledReports = [
  'reportAnalytics','reportEvent','reportJdGameData','reportScene','reportMonitor',
  'sendStageLevelEvent','sendStageStartEvent','update_level_info','update_user_data',
  'append_share_info','explain_platform_data','feed_finish','feed_setting',
  'requestCustomData','getCustomData','requestFeedSubscribe','requestSubscribeMessage',
  'storeFeedData','setUserCloudStorage','setImRankData',
];
const automaticAdSwitches = ['auto_video_enable','touch_video','is_start_video','normal_screen','nativead_fake_show'];
const disabledSwitchPredicates = ['showGameVideo','showVideoTip','showStartTry','showQuickClick'];
// 原包FGUI图集中的摄像机徽标，已逐个裁图核查，不能用匿名nXX或sp名称泛匹配。
// Game_atlas0 [1573,94,22,16]；其余依次属于Prop、Result、Setting、TitleLevel。
const videoBadgeURLs = new Set([
  'ui://fqb4g7uzljd8lcy',
  'ui://3x2ufwft7nz32v','ui://3x2ufwft7nz34g',
  'ui://u0a4d7ts7nz3mv',
  'ui://ucy9u11koynivbc',
  'ui://jceapwrgi1aov',
  'ui://to23hu2qoynik', // BeginHelp 每日礼包原图集54×42摄像机图标。
]);

export function installAds(w) {
  if (!w?.Ad) throw new Error('安装H5广告适配前必须先加载原Ad模块');
  w.__layah5 ??= {};
  if (w.__layah5.ads) return w.__layah5.ads;
  const Ad = w.Ad;
  const state = w.__layah5.ads = {rewardCount:0,channelRewardCount:0,disabledCalls:0,events:[]};
  const patchedChannels = new WeakSet();
  function record(type, method) {
    state.events.push({type,method});
    if (state.events.length>100) state.events.shift();
  }
  function disable(target, names) {
    if (!target) return;
    for (const name of names) {
      if (typeof target[name] !== 'function') continue;
      target[name] = function() {state.disabledCalls++;record('disabled',name);};
    }
  }
  function resetVideoState() {
    if (!Ad.Var) return;
    Ad.Var.isVideo = false;
    if (Ad.Var._Global) Ad.Var._Global.pause_video = false;
  }
  function reward(success) {
    state.rewardCount++;
    record('reward','showVideoAd');
    resetVideoState();
    Ad.Var?.onVideoStop?.(1);
    if (typeof success === 'function') return success();
  }
  function disableChannel(channel) {
    if (!channel || (typeof channel!=='object' && typeof channel!=='function') || patchedChannels.has(channel)) return channel;
    patchedChannels.add(channel);
    disable(channel,[...disabledAdMethods,...disabledReports]);
    channel.showVideoAd = function(callback) {
      state.channelRewardCount++;
      record('reward','channel.showVideoAd');
      resetVideoState();
      // 原底层协议为整数1；统一入口的业务success自身不接收此状态参数。
      if (typeof callback === 'function') return callback(1);
    };
    return channel;
  }
  function disableAutomaticAds() {
    if(Ad.Var) {
      Ad.Var.show_dyzt=false;
      Ad.Var.show_dy_report=false;
      Ad.Var.is_sz_sdk=false;
    }
    const switches=Ad.Var?._SwitchM0;
    if (!switches) return;
    for(const name of automaticAdSwitches) if(name in switches) switches[name]=0;
    for(const name of disabledSwitchPredicates) if(typeof switches[name]==='function') switches[name]=()=>false;
  }
  disable(Ad,[...disabledAdMethods,...disabledReports]);
  Ad.showVideoAd = reward;
  if (Ad.VideoPop) Ad.VideoPop.showVideoAd = reward;
  for(const name of ['NativeAd','NativeAdHonor']) if(Ad[name]) disable(Ad[name],['showScreen']);
  if(Ad.Navigate) disable(Ad.Navigate,['showNavigate']);
  const manager=typeof Ad.switchManager==='function' ? Ad.switchManager() : null;
  disable(manager,['showNativeAdFake','showCustomIcon','showMistake','initCustomIcon']);
  if(manager && typeof manager.showScreen==='function') manager.showScreen=function(type,callback){state.disabledCalls++;if(typeof callback==='function') callback(false);};
  Ad.IsShowStartVideo = callback=>{if(typeof callback==='function') callback(0);};
  Ad.IsOpenQuickClick = callback=>{if(typeof callback==='function') callback();};
  Ad.IsOpenStartTry = (show,continueGame)=>{if(typeof continueGame==='function') continueGame();};
  const originalMainCH = Ad.mainCH;
  if(typeof originalMainCH==='function') {
    Ad.mainCH = function(...args){return disableChannel(originalMainCH.apply(this,args));};
    disableChannel(originalMainCH.call(Ad));
  }
  const originalInit = Ad.init;
  if(typeof originalInit==='function') Ad.init = function(Channel,options) {
    disableAutomaticAds();
    let BrowserChannel=Channel;
    if(typeof Channel==='function') BrowserChannel=class extends Channel {
      constructor(...args) {super(...args);disableChannel(this);}
    };
    const result=originalInit.call(this,BrowserChannel,{...options,touch_video:false});
    if(typeof originalMainCH==='function') disableChannel(originalMainCH.call(Ad));
    disableAutomaticAds();
    return result;
  };
  disableAutomaticAds();
  return state;
}

/** 保留控制器和按钮语义，只删除明确的视频徽标和视频广告文案。 */
export function decorateRewardUI(root) {
  let changes=0;
  const seen=new Set();
  function visit(node) {
    if(!node || typeof node!=='object' || seen.has(node)) return;
    seen.add(node);
    const item=node.packageItem;
    const itemURL=item?.owner?.id && item?.id ? `ui://${item.owner.id}${item.id}` : '';
    const isVideoBadge=videoBadgeURLs.has(node.resourceURL) || videoBadgeURLs.has(node.url) || videoBadgeURLs.has(itemURL);
    if((isVideoBadge || /^(?:img|icon|ico)_(?:video|ad)$/i.test(node.name || '')) && node.visible!==false) {node.visible=false;changes++;}
    if(typeof node.text==='string' && /(?:观看|看|播放)视频|视频(?:领取|解锁|复活|奖励)|看广告|观看广告/.test(node.text)) {
      const text=node.text.replace(/(?:观看|看|播放)视频|观看广告|看广告|视频(?=领取|解锁|复活|奖励)/g,'').replace(/^\s*[·：:]\s*/,'').trim() || '领取';
      if(text!==node.text) {node.text=text;changes++;}
    }
    const children=node._children || (typeof node.getChildren==='function'?node.getChildren():[]);
    for(const child of children) visit(child);
    // 原FGUI自动绑定字段名可能比编辑器中的nXX节点名更明确。
    for(const key of ['img_video','icon_video','ico_video','img_ad']) {
      const icon=node[key];
      if(icon && icon.visible!==false) {icon.visible=false;changes++;}
    }
  }
  visit(root);
  return changes;
}
