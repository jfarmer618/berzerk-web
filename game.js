(()=>{
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
let game=start(DEFAULT),sound=game.settings.sound,keys=new Set(),touch={move:null,fireDir:null,firing:false};
const $=id=>document.getElementById(id);
// Touch controls can be hidden when using a Bluetooth gamepad.
// Store the preference so it survives closing and reopening the installed PWA.
const touchCapable=window.matchMedia('(any-pointer: coarse)').matches || (navigator.maxTouchPoints||0)>0;
document.body.classList.toggle('touch-device',touchCapable);
let showTouchControls=true;
try{showTouchControls=localStorage.getItem('berzerk-show-touch-controls')!=='false'}catch(_){}
function applyTouchMode(){
 const visible=touchCapable && showTouchControls;
 const toggle=$('touchToggle');
 if(toggle){toggle.hidden=!touchCapable;toggle.textContent=visible?'TOUCH: ON':'TOUCH: OFF';}
 document.body.classList.toggle('touch-visible',visible);
 document.body.classList.toggle('touch-hidden',!visible);
 if(!visible)resetPads();
 requestAnimationFrame(adaptRoom);
}

function adaptRoom(){
 const landscape=window.innerWidth>window.innerHeight;
 const next=setRoomOrientation(landscape,game);
 if(next!==game){game=next;touch={move:null,fireDir:null,firing:false};keys.clear();}
 canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;
 const layout=$('layout'),board=$('board'),move=$('move'),fire=$('fire');
 const rect=layout.getBoundingClientRect();
 // Layout already excludes header, nav, and footer; never oversize its board.
 const availableW=Math.max(1,rect.width-4);
 const padsVisible=touchCapable&&showTouchControls;
 const padHeight=padsVisible&&!landscape?Math.max(move.offsetHeight,fire.offsetHeight):0;
 const availableH=Math.max(1,rect.height-padHeight-(padHeight?18:4));
 const scale=Math.max(0.01,Math.min(availableW/W,availableH/H));
 const pixelW=Math.max(1,Math.floor(W*scale));
 const pixelH=Math.max(1,Math.floor(H*scale));
 board.style.setProperty('width',pixelW+'px','important');
 board.style.setProperty('height',pixelH+'px','important');
 document.documentElement.style.setProperty('--room-ratio',`${W} / ${H}`);
 const readout=$('dimensions');
 if(readout)readout.textContent=`Maze ${W}×${H} • Display ${pixelW}×${pixelH} px`;
}
function positionOptions(){
 const nav=$('settings').closest('nav');
 const app=$('app');
 const bottom=nav.getBoundingClientRect().bottom-app.getBoundingClientRect().top;
 app.style.setProperty('--options-top',Math.ceil(bottom+5)+'px');
}
$('touchToggle').addEventListener('click',()=>{showTouchControls=!showTouchControls;try{localStorage.setItem('berzerk-show-touch-controls',String(showTouchControls))}catch(_){}applyTouchMode()});
adaptRoom();positionOptions();window.addEventListener('resize',()=>{adaptRoom();positionOptions()});window.addEventListener('orientationchange',()=>requestAnimationFrame(()=>{adaptRoom();positionOptions()}));if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(adaptRoom));if(window.ResizeObserver)new ResizeObserver(()=>requestAnimationFrame(adaptRoom)).observe($('layout'));

const audio={};
for(const name of ['laser','robot_hit','player_hit','room','otto']){
  const a=new Audio('assets/sounds/'+name+'.wav');
  a.preload='auto'; audio[name]=a;
}
let audioUnlocked=false;
function unlockAudio(){
  if(audioUnlocked)return;
  const a=audio.laser;
  a.muted=true;
  const promise=a.play();
  if(promise)promise.then(()=>{a.pause();a.currentTime=0;a.muted=false;audioUnlocked=true;}).catch(()=>{a.muted=false;});
}
function play(name){
  if(!sound)return;
  const a=audio[name].cloneNode(true);
  a.volume=.65;
  a.play().catch(err=>console.warn('Audio playback blocked:',name,err));
}
window.addEventListener('pointerdown',unlockAudio,{capture:true});
window.addEventListener('keydown',unlockAudio,{capture:true});
function drawSprite(kind,x,y,dir,walking,step,frame){const hero=kind==='hero',side=dir===2||dir===6,diagonal=dir%2===1;let rows=hero?(side?HERO_SIDE:diagonal?HERO_DIAGONAL:dir===0?HERO_BACK:HERO_FRONT):(side||diagonal?ROBOT_SIDE:ROBOT_FRONT);rows=walkingLegs(rows,hero?(walking?Math.floor(step/3):0):Math.floor(frame/7));const mirror=dir>=5;const width=rows[0].length,height=rows.length;for(let i=0;i<height;i++)for(let j=0;j<width;j++){const c=rows[i][j];if(c==='.')continue;ctx.fillStyle=c==='G'?'#31ef49':'#f0444b';ctx.fillRect(Math.round(x-width+(mirror?(width-1-j):j)*2),Math.round(y-height+i*2),2,2);}}
function render(){ctx.fillStyle='#020202';ctx.fillRect(0,0,W,H);ctx.fillStyle=WALL_BLUE;for(const w of wallsFor(game.room))ctx.fillRect(w.x,w.y,w.w,w.h);for(const r of game.robots)drawSprite('bot',r.x,r.y,r.dir,false,0,game.tick);for(const b of game.shots){ctx.fillStyle=b.owner==='player'?'#f8e83c':'#f7f7f7';ctx.fillRect(b.x-3,b.y-3,6,6)}if(game.otto){const o=game.otto;ctx.fillStyle='#ff3a35';ctx.beginPath();ctx.arc(o.x,o.y+Math.sin(o.phase)*4,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.fillRect(o.x-6,o.y-4,3,3);ctx.fillRect(o.x+3,o.y-4,3,3);ctx.fillRect(o.x-5,o.y+5,10,2)}if(game.player.inv===0||game.tick%4<2)drawSprite('hero',game.player.x,game.player.y,game.player.dir,game.player.walking,game.player.step,game.tick);if(game.message){ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(game.message,W/2,24)}$('score').textContent='1UP '+String(game.score).padStart(6,'0');$('high').textContent='HI '+String(Math.max(game.high,game.score)).padStart(6,'0');$('status').textContent='ROOM '+game.room+' · LIVES '+game.lives;$('pause').textContent=game.mode==='paused'?'RESUME':'PAUSE';$('overlay').hidden=game.mode==='playing';$('overlayTitle').textContent=game.mode==='paused'?'PAUSED':'GAME OVER';$('resume').hidden=game.mode!=='paused';$('sound').textContent='SOUND '+(sound?'ON':'OFF');}
// Optional Bluetooth gamepad input. Standard Gamepad API mapping is used.
// Some older controllers may expose a different mapping; see README.
const gamepadState={l1Held:false,comboStart:null,comboTriggered:false,comboWasActive:false};
function gamepadInputs(){
 const empty={move:null,fireDir:null,firing:false};
 const clear=()=>{gamepadState.l1Held=false;gamepadState.comboStart=null;gamepadState.comboTriggered=false;gamepadState.comboWasActive=false;$('restartCountdown').hidden=true};
 if(typeof navigator.getGamepads!=='function'){clear();return empty}
 let pads;
 try{pads=navigator.getGamepads()}catch(_){clear();return empty}
 const pad=Array.from(pads||[]).find(p=>p&&p.connected);
 if(!pad){clear();return empty}
 const pressed=i=>Boolean(pad.buttons[i]?.pressed);
 const axis=i=>Number.isFinite(pad.axes[i])?pad.axes[i]:0;
 const stickDir=(x,y)=>Math.hypot(x,y)>=0.28?direction(x,y):null;
 let move=stickDir(axis(0),axis(1));
 const dx=Number(pressed(15))-Number(pressed(14));
 const dy=Number(pressed(13))-Number(pressed(12));
 if(dx||dy)move=direction(dx,dy);
 // Stratus XL: L1=B4 pause; L2=B6 + R2=B7 held 2s resets.
 const l1=pressed(4), combo=pressed(6)&&pressed(7);
 const now=performance.now();
 if(combo){
   if(gamepadState.comboStart===null && !gamepadState.comboTriggered)gamepadState.comboStart=now;
   if(!gamepadState.comboTriggered){
     const elapsed=now-gamepadState.comboStart;
     if(elapsed>=2000){
       game=reducer(game,{type:'RESET'});resetPads();
       gamepadState.comboTriggered=true;$('restartCountdown').hidden=true;
     }else{
       $('restartCountdown').textContent='NEW GAME IN '+Math.ceil((2000-elapsed)/1000)+'…';
       $('restartCountdown').hidden=false;
     }
   }
 }else{
   gamepadState.comboStart=null;
   $('restartCountdown').hidden=true;
   // Require both triggers released before another restart is armed.
   if(!pressed(6)&&!pressed(7))gamepadState.comboTriggered=false;
 }
 // L1 toggles only on a fresh press, independent of the restart triggers.
 if(l1&&!gamepadState.l1Held)game=reducer(game,{type:'PAUSE'});
 gamepadState.l1Held=l1;
 return {move,fireDir:move,firing:pressed(0)};
}
const moveKeys={'ArrowUp':0,'ArrowRight':2,'ArrowDown':4,'ArrowLeft':6,'w':0,'d':2,'s':4,'a':6};
const fireKeys={'i':0,'o':1,'l':2,'.':3,'k':4,',':5,'j':6,'u':7,'Numpad8':0,'Numpad9':1,'Numpad6':2,'Numpad3':3,'Numpad2':4,'Numpad1':5,'Numpad4':6,'Numpad7':7};
function dirFromKeys(mapping){const active=Object.entries(mapping).filter(([k])=>keys.has(k)).map(([,v])=>v);if(!active.length)return null;if(mapping===moveKeys){const x=active.reduce((v,d)=>v+vec(d)[0],0),y=active.reduce((v,d)=>v+vec(d)[1],0);return x||y?direction(x,y):null}return active.at(-1)}
window.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;if(e.code==='Space'||e.key in moveKeys||e.key in fireKeys||e.code in fireKeys)e.preventDefault();keys.add(e.key);keys.add(e.code);if((e.key.toLowerCase()==='p'||e.code==='Escape')&&!e.repeat)game=reducer(game,{type:'PAUSE'});});window.addEventListener('keyup',e=>{keys.delete(e.key);keys.delete(e.code)});window.addEventListener('blur',()=>{keys.clear();resetPads()});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();resetPads()}});window.addEventListener('pagehide',()=>{keys.clear();resetPads()});
// iPad: capture each finger at the pad level and clear on every termination path.
const padResets=[];
function resetPads(){for(const reset of padResets)reset();touch.move=null;touch.fireDir=null;touch.firing=false}
function makePad(id,kind){
 const pad=$(id),labels=['↖','↑','↗','←','●','→','↙','↓','↘'];
 const dirs=[7,0,1,6,null,2,5,4,3],held=new Map();
 const buttons=[];
 function sync(){
   const d=[...held.values()].at(-1)??null;
   if(kind==='move')touch.move=d;
   else{touch.fireDir=d;touch.firing=d!==null}
   buttons.forEach((btn,i)=>btn.classList.toggle('active',d!==null&&dirs[i]===d));
 }
 function directionAt(x,y){
   const el=document.elementFromPoint(x,y);
   const btn=el?.closest?.('button[data-dir]');
   if(!btn||!pad.contains(btn))return null;
   return Number(btn.dataset.dir);
 }
 function release(id){if(held.delete(id))sync()}
 dirs.forEach((d,i)=>{
   const btn=document.createElement('button');
   btn.textContent=labels[i];btn.type='button';
   btn.setAttribute('aria-label',kind+' '+labels[i]);
   if(d===null){btn.className='empty';btn.disabled=true}
   else btn.dataset.dir=String(d);
   pad.append(btn);buttons.push(btn);
 });
 pad.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   const d=directionAt(e.clientX,e.clientY);
   if(d===null)return;
   e.preventDefault();
   try{pad.setPointerCapture(e.pointerId)}catch(_){}
   held.set(e.pointerId,d);sync();
 },{passive:false});
 pad.addEventListener('pointermove',e=>{
   if(!held.has(e.pointerId))return;
   e.preventDefault();
   const d=directionAt(e.clientX,e.clientY);
   // Sliding off the control releases immediately, even if capture remains.
   if(d===null)release(e.pointerId);
   else{held.set(e.pointerId,d);sync()}
 },{passive:false});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
   pad.addEventListener(event,e=>release(e.pointerId));
 // Safari may terminate a touch without delivering a pointerup to the pad.
 document.addEventListener('pointerup',e=>release(e.pointerId),true);
 document.addEventListener('pointercancel',e=>release(e.pointerId),true);
 pad.addEventListener('contextmenu',e=>e.preventDefault());
 pad.addEventListener('selectstart',e=>e.preventDefault());
 pad.addEventListener('dragstart',e=>e.preventDefault());
 pad.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
 pad.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
 padResets.push(()=>{held.clear();sync()});
}
makePad('move','move');makePad('fire','fire');applyTouchMode();window.addEventListener('resize',applyTouchMode);
$('pause').onclick=()=>game=reducer(game,{type:'PAUSE'});$('boardPause').onclick=()=>game=reducer(game,{type:'PAUSE'});$('resume').onclick=()=>game=reducer(game,{type:'PAUSE'});$('restart').onclick=()=>{game=reducer(game,{type:'RESET'});resetPads()};$('settings').onclick=()=>{positionOptions();$('options').hidden=!$('options').hidden;$('settings').setAttribute('aria-expanded',String(!$('options').hidden));};$('sound').onclick=()=>{unlockAudio();sound=!sound;game=reducer(game,{type:'SETTINGS',patch:{sound}});if(sound)play('laser')};
for(const name of ['difficulty','speed','controls'])$(name).onchange=e=>game=reducer(game,{type:'SETTINGS',patch:{[name]:e.target.value}});
let prev=performance.now(),acc=0;function frame(now){acc=Math.min(acc+now-prev,200);prev=now;let steps=0;const pad=gamepadInputs();while(acc>=TICK&&steps++<5){const move=touch.move??dirFromKeys(moveKeys)??pad.move;const keyboardFire=dirFromKeys(fireKeys);const fd=touch.fireDir??keyboardFire??(pad.firing?pad.fireDir:null);const firing=touch.firing||keyboardFire!==null||keys.has('Space')||pad.firing;const before=game;game=reducer(game,{type:'TICK',inputs:{move,fireDir:fd,firing}});if(game.room!==before.room)play('room');else if(game.lives<before.lives)play('player_hit');else if(game.score>before.score)play('robot_hit');else if(!before.otto&&game.otto)play('otto');else if(firing&&game.tick%5===0)play('laser');acc-=TICK}render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
// Production PWA: register the offline cache after page load.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'})
      .then(reg => reg.update())
      .catch(err => console.warn('Offline installation unavailable:', err));
  });
}

})();
