/** 浏览器首次手势解锁；保留原声音资源和原播放实现。 */
export function installAudioGate(w) {
  const manager=w.Laya.SoundManager, music=manager.playMusic, sound=manager.playSound, stop=manager.stopMusic;
  const state={unlocked:false,pending:null,musicCalls:0,soundCalls:0,cancelledPlaybacks:0};
  const media=w.HTMLMediaElement?.prototype;
  if(media){const play=media.play;media.play=function(...args){
    const result=play.apply(this,args);
    return result?.catch?result.catch(error=>{
      if(error.name==='AbortError'&&/interrupted by a call to pause\(\)/.test(error.message)){state.cancelledPlaybacks++;return;}
      throw error;
    }):result;
  };}
  manager.playMusic=function(...args){if(!state.unlocked){state.pending=args;return null;}state.musicCalls++;return music.apply(this,args);};
  manager.playSound=function(...args){if(!state.unlocked)return null;state.soundCalls++;return sound.apply(this,args);};
  manager.stopMusic=function(...args){state.pending=null;return stop.apply(this,args);};
  state.unlock=()=>{
    if(state.unlocked)return;state.unlocked=true;
    w.Laya.WebAudioSound?.ctx?.resume?.();
    if(state.pending){const pending=state.pending;state.pending=null;manager.playMusic(...pending);}
  };
  return state;
}
