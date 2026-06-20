import {
  GW, GH, COLORS, LENGTHS, MAX_PLAYERS, FUN_NAMES,
  POWERUP_TYPES, POWERUP_COLOR, POWERUP_GLYPH,
} from './config.js';
import { rnd } from './color.js';
import { CHARACTERS, CHAR_COUNT } from './characters.js';
import { loadSpriteSheets, frameCountFor, idleFrameFor, spriteScreenSize } from './sprite-sheets.js';
import { SCENES, THEMES } from './scenes.js';
import { loadBackgroundLayers, defaultParallax } from './backgrounds.js';

/* ---------- low-res pixel canvas ---------- */
let view, ctx;
let VW=0, VH=0, DPR=1;           // device pixel size
let PXS=4;                        // pixels-per-art-pixel (scale); set on resize
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  VW=window.innerWidth; VH=window.innerHeight;
  view.width=Math.floor(VW*DPR); view.height=Math.floor(VH*DPR);
  view.style.width=VW+'px'; view.style.height=VH+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.imageSmoothingEnabled=false;
  // art scale: keep racers a sensible on-screen size across devices
  PXS = Math.max(4, Math.round(Math.min(VW,VH)/115));
  invalidateTrackMetrics();
}

let tabHidden=false;

let lengthIdx=1, themeIdx=0, sceneIdx=0, powerUpsOn=true;
let START_X=LENGTHS[lengthIdx].start, FINISH_X=LENGTHS[lengthIdx].finish;

let trackMetricsCache=null, trackMetricsCacheN=-1, trackMetricsCacheScene=-1;
function invalidateTrackMetrics(){ trackMetricsCache=null; trackMetricsCacheN=-1; trackMetricsCacheScene=-1; }
function sceneTrackLayout(){
  const S=SCENES[sceneIdx]||{};
  return {
    skyRatio:S.skyRatio!=null ? S.skyRatio : 0.44,
    botRatio:S.botRatio!=null ? S.botRatio : 0.10,
    minBottomPad:S.minBottomPad||0,
  };
}
/* On-screen track geometry — compact pixel-art lanes, generous sky for parallax */
function trackMetrics(n){
  if(trackMetricsCache && trackMetricsCacheN===n && trackMetricsCacheScene===sceneIdx) return trackMetricsCache;
  n=Math.max(n,1);
  const layout=sceneTrackLayout();
  const skyRatio=layout.skyRatio;
  const botPadTarget=Math.max(Math.floor(VH*layout.botRatio), layout.minBottomPad);
  const idealLaneH=Math.round(PXS*(GH+2));
  const topPad=Math.floor(VH*skyRatio);
  const maxBandH=Math.max(Math.floor(VH*0.18), VH-topPad-botPadTarget);
  let laneH=idealLaneH;
  let bandH=laneH*n;
  if(bandH>maxBandH){
    laneH=Math.max(Math.floor(PXS*8),Math.floor(maxBandH/n));
    bandH=laneH*n;
  }
  const botPad=VH-topPad-bandH;
  const horizonH=Math.max(Math.round(PXS*2),10);
  trackMetricsCache={topPad,botPad,bandH,laneH,horizonH,skyBottom:topPad+horizonH};
  trackMetricsCacheN=n;
  trackMetricsCacheScene=sceneIdx;
  return trackMetricsCache;
}
/* world-x -> screen-x via camera; lane index -> screen-y center */
let camX=0;                                       // world x at left edge (in world units)
let pxPerUnit=10;                                 // screen px per world unit (set per frame)
function worldToScreenX(wx){ return (wx - camX)*pxPerUnit; }
function laneCenterY(i,n){ const m=trackMetrics(n); return m.topPad + m.laneH*(i+0.5); }

/* ============================================================
   SCENE BACKGROUND
   ============================================================ */
let starField=null;
let backgroundImages={};

function sceneRacerYOffset(){
  const S=SCENES[sceneIdx];
  return S && S.racerYOffset ? S.racerYOffset : 0;
}

function sceneRacerBaselineFactor(){
  const S=SCENES[sceneIdx];
  return S && S.racerBaselineFactor != null ? S.racerBaselineFactor : 0.32;
}

function sceneRacerShadowFactor(){
  const S=SCENES[sceneIdx];
  return S && S.racerShadowFactor != null ? S.racerShadowFactor : 0.34;
}

function drawParallaxLayer(img, parallax, anchorBottom){
  if(!img) return;
  const scale=anchorBottom/img.height;
  const tileW=img.width*scale;
  const drawH=anchorBottom;
  const scroll=((camX*pxPerUnit*parallax)%tileW+tileW)%tileW;
  ctx.imageSmoothingEnabled=false;
  for(let x=-scroll-tileW; x<VW+tileW; x+=tileW){
    ctx.drawImage(img, Math.round(x), 0, Math.round(tileW), Math.round(drawH));
  }
}

function drawFrontParallaxLayer(img, parallax, anchorBottom, scale){
  if(!img) return;
  const tileW=img.width*scale;
  const drawH=img.height*scale;
  const drawY=Math.round(anchorBottom-drawH);
  const scroll=((camX*pxPerUnit*parallax)%tileW+tileW)%tileW;
  ctx.imageSmoothingEnabled=false;
  for(let x=-scroll-tileW; x<VW+tileW; x+=tileW){
    ctx.drawImage(img, Math.round(x), drawY, Math.round(tileW), Math.round(drawH));
  }
}

function drawBackdropCover(img, anchorBottom){
  if(!img) return;
  const scale=Math.max(VW/img.width, anchorBottom/img.height);
  const drawW=img.width*scale;
  const drawH=img.height*scale;
  const drawX=Math.round((VW-drawW)/2);
  const drawY=Math.round(anchorBottom-drawH);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img, drawX, drawY, Math.round(drawW), Math.round(drawH));
}

function drawBottomOverlay(img, offsetY){
  if(!img) return;
  const scale=VW/img.width;
  const drawH=img.height*scale;
  const drawY=Math.round(VH-drawH+(offsetY||0));
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img, 0, drawY, VW, Math.round(drawH));
}

function drawTexturedLaneBand(S, m, n){
  const img=backgroundImages[S.trackTexture];
  if(!img){
    drawPixelLaneBand(S,m,n);
    drawPixelGround(m.topPad+m.bandH+2,VH,S.groundDark,S.track,S.laneLine);
    return;
  }

  const slices=S.trackTextureSlices||{};
  const laneSurfaceTop=Math.max(0, Math.floor(img.height*(slices.laneSurfaceTop||0)));
  const laneSurfaceBottom=Math.min(img.height, Math.ceil(img.height*(slices.laneSurfaceBottom||0.72)));
  const lowerApronTop=Math.max(laneSurfaceBottom, Math.floor(img.height*(slices.lowerApronTop||0.72)));
  const laneSurfaceHeight=Math.max(1, laneSurfaceBottom-laneSurfaceTop);
  const bottomDestTop=Math.round(m.topPad+m.bandH);
  const sourceLaneH=Math.max(1, laneSurfaceHeight/n);

  for(let i=0;i<n;i++){
    const y0=Math.round(m.topPad+m.laneH*i);
    const y1=y0+m.laneH;
    const srcY=Math.round(laneSurfaceTop+sourceLaneH*i);
    const srcH=Math.max(1, Math.round(i===n-1 ? laneSurfaceBottom-srcY : sourceLaneH));
    ctx.drawImage(img, 0, srcY, img.width, srcH, 0, y0, VW, m.laneH);

    if(i%2===0){
      ctx.fillStyle='rgba(0,0,0,0.035)';
      ctx.fillRect(0,y0,VW,m.laneH);
    }

    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.fillRect(0,y0,VW,Math.max(2,Math.round(m.laneH/18)));
    ctx.fillStyle=S.laneLine;
    ctx.fillRect(0,y0,VW,2);
    if(i===n-1) ctx.fillRect(0,y1-2,VW,2);
  }

  if(bottomDestTop<VH){
    ctx.drawImage(img, 0, lowerApronTop, img.width, img.height-lowerApronTop, 0, bottomDestTop, VW, VH-bottomDestTop);
  }
}

function drawPixelGround(y0,y1,base,dark,speck){
  const cell=Math.max(4,Math.round(PXS*0.75));
  ctx.fillStyle=base; ctx.fillRect(0,y0,VW,y1-y0);
  for(let py=y0; py<y1; py+=cell){
    for(let px=((py/cell|0)%2)*cell; px<VW; px+=cell*2){
      ctx.fillStyle=dark; ctx.globalAlpha=0.22;
      ctx.fillRect(px,py,cell,cell);
    }
  }
  ctx.globalAlpha=1;
  for(let px=0; px<VW; px+=cell*3){
    ctx.fillStyle=speck; ctx.globalAlpha=0.18;
    ctx.fillRect(px,y0+((px/cell|0)%2)*cell,cell,Math.max(2,cell/2));
  }
  ctx.globalAlpha=1;
}

function drawPixelLaneBand(S,m,n){
  const cell=Math.max(4,Math.round(PXS*0.75));
  for(let i=0;i<n;i++){
    const y0=Math.round(m.topPad+m.laneH*i);
    const y1=y0+m.laneH;
    const base=(i%2)? S.track : S.groundDark;
    const alt=(i%2)? S.groundDark : S.track;
    ctx.fillStyle=base; ctx.fillRect(0,y0,VW,m.laneH);
    for(let py=y0; py<y1; py+=cell){
      for(let px=((py/cell|0)+i)%2*cell; px<VW; px+=cell*2){
        ctx.fillStyle=alt; ctx.globalAlpha=0.18;
        ctx.fillRect(px,py,cell,cell);
      }
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=S.laneLine; ctx.globalAlpha=0.12;
    for(let px=(i*cell)%3; px<VW; px+=cell*4){
      ctx.fillRect(px,y0+cell,Math.max(2,cell/2),Math.max(2,cell/2));
    }
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,255,255,0.14)';
    ctx.fillRect(0,y0,VW,Math.max(2,Math.round(cell/3)));
    ctx.fillStyle=S.laneLine;
    ctx.fillRect(0,y0,VW,2);
    if(i===n-1) ctx.fillRect(0,y1-2,VW,2);
  }
  ctx.fillStyle=S.laneLine; ctx.fillRect(0,Math.round(m.topPad+m.bandH),VW,2);
}

function ensureStars(){
  if(starField) return;
  starField=[]; for(let i=0;i<70;i++) starField.push({x:Math.random(),y:Math.random()*0.5,t:Math.random()*6});
}
function drawVerticalGradient(x0,y0,w,h,top,bot){
  const grd=ctx.createLinearGradient(0,y0,0,y0+h); grd.addColorStop(0,top); grd.addColorStop(1,bot);
  ctx.fillStyle=grd; ctx.fillRect(x0,y0,w,h);
}
function drawScene(n,timeT){
  const S=SCENES[sceneIdx], T=THEMES[themeIdx];
  const m=trackMetrics(n);
  const sky=(T.sky||S.sky);
  const layers=S.layers||[];
  const backLayers=[], frontLayers=[];
  layers.forEach(function(layer){ (layer.front? frontLayers : backLayers).push(layer); });

  if(S.backdrop && backgroundImages[S.backdrop]) drawBackdropCover(backgroundImages[S.backdrop], m.skyBottom);
  else if(sky) drawVerticalGradient(0,0,VW,m.skyBottom,sky[0],sky[1]);

  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,VW,m.skyBottom); ctx.clip();
  backLayers.forEach(function(layer,i){
    const par=layer.parallax!=null? layer.parallax : defaultParallax(i,backLayers.length);
    drawParallaxLayer(backgroundImages[layer.src], par, m.skyBottom);
  });
  ctx.restore();

  if(T.star){ ensureStars(); ctx.fillStyle='#fff';
    starField.forEach(function(s){ var a=0.5+0.5*Math.sin(timeT*1.5+s.t); ctx.globalAlpha=a*0.9;
      ctx.fillRect(Math.floor(s.x*VW), Math.floor(s.y*m.skyBottom*0.82), 2,2); }); ctx.globalAlpha=1; }

  drawPixelGround(m.topPad-m.horizonH,m.topPad,S.ground,S.groundDark,S.laneLine);
  if(S.trackTexture) drawTexturedLaneBand(S,m,n);
  else {
    drawPixelLaneBand(S,m,n);
    drawPixelGround(m.topPad+m.bandH+2,VH,S.groundDark,S.track,S.laneLine);
  }

  const bgScale=backLayers.length && backgroundImages[backLayers[0].src]
    ? m.skyBottom/backgroundImages[backLayers[0].src].height : m.skyBottom/324;
  frontLayers.forEach(function(layer,i){
    const par=layer.parallax!=null? layer.parallax : defaultParallax(backLayers.length+i,layers.length);
    drawFrontParallaxLayer(backgroundImages[layer.src], par, m.topPad, bgScale);
  });

  if(T.overlay && T.overlay.indexOf(',0)')<0){ ctx.fillStyle=T.overlay; ctx.fillRect(0,0,VW,VH); }

  drawStartFinish(n,m);
}

function drawSceneOverlay(){
  const S=SCENES[sceneIdx];
  if(S.overlayFront && backgroundImages[S.overlayFront]) drawBottomOverlay(backgroundImages[S.overlayFront], S.overlayFrontOffsetY);
}

function drawStartFinish(n,m){
  const top=m.topPad, h=m.bandH;
  // start line (left)
  var sx=worldToScreenX(START_X);
  ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(Math.round(sx)-1,top,3,h);
  // finish: checkered + tape
  var fx=worldToScreenX(FINISH_X);
  if(fx>-30 && fx<VW+30){
    var cell=Math.max(6,Math.round(m.laneH/4));
    for(let yy=0; yy<h; yy+=cell){
      for(let k=0;k<2;k++){
        var on=((Math.floor(yy/cell)+k)%2)===0;
        ctx.fillStyle=on?'#fff':'#3d3018';
        ctx.fillRect(Math.round(fx)+k*cell, top+yy, cell, Math.min(cell,h-yy));
      }
    }
    // finish pole + flag
    ctx.fillStyle='#d8d8d8'; ctx.fillRect(Math.round(fx)-3,top-18,4,20);
    ctx.fillStyle='#ff4d4d'; ctx.fillRect(Math.round(fx)+1,top-18,12,8);
  }
}

/* ============================================================
   SPRITE RASTERIZER + CACHE
   Pre-render each (char, color, frame) to an offscreen canvas once.
   ============================================================ */
const spriteCache={};
let sheetImages={};

function getSprite(charIdx,color,frame){
  if(CHARACTERS[charIdx].sheet) return null;
  const key=charIdx+'|'+color+'|'+frame;
  if(spriteCache[key]) return spriteCache[key];
  const cell=4;                                    // internal art-pixel size in the cache bitmap
  const cv=document.createElement('canvas'); cv.width=GW*cell; cv.height=GH*cell;
  const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false;
  function g(x,y,w,h,c){ cx.fillStyle=c; cx.fillRect(x*cell,y*cell,w*cell,h*cell); }
  CHARACTERS[charIdx].draw(g,frame,color);
  spriteCache[key]=cv; return cv;
}
function clearSpriteCache(){ for(const k in spriteCache) delete spriteCache[k]; }

/* draw a cached sprite centered at screen (cx,cyBaseline), scaled to pixel size p */
function blitSprite(charIdx,color,frame,cx,cyBaseline,p,flash){
  const ch=CHARACTERS[charIdx];
  const size=spriteScreenSize(ch,p);
  const dx=Math.round(cx-size.w/2), dy=Math.round(cyBaseline-size.h);

  if(ch.sheet){
    const img=sheetImages[ch.sheet.src];
    if(!img) return;
    const fw=ch.sheet.frameW, fh=ch.sheet.frameH;
    const sx=frame*fw;
    ctx.drawImage(img,sx,0,fw,fh,dx,dy,size.w,size.h);
    if(flash){
      ctx.globalAlpha=0.35; ctx.globalCompositeOperation='lighter';
      ctx.drawImage(img,sx,0,fw,fh,dx,dy,size.w,size.h);
      ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
    }
    return;
  }

  const bmp=getSprite(charIdx,color,frame);
  const w=size.w, h=size.h;
  ctx.drawImage(bmp,dx,dy,w,h);
  if(flash){ ctx.globalAlpha=0.35; ctx.globalCompositeOperation='lighter'; ctx.drawImage(bmp,dx,dy,w,h); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1; }
}
/* ============================================================
   GAME STATE
   ============================================================ */
let state='lobby';
let players=[
  {name:'',colorIdx:4,charIdx:0},   // fighter
  {name:'',colorIdx:0,charIdx:1},   // samurai
  {name:'',colorIdx:3,charIdx:2},   // shinobi
];
let racers=[], finishOrder=[];
let raceStartT=0, winnerCrossRealT=0, allDoneT=0, forceEndT=0;
let resultsShown=false;
let powerups=[], bananas=[], nextEventT=0, lastEventIdx=-1;

/* ---------- audio (same approach as before) ---------- */
let audioCtx=null, muted=false;
function ac(){ if(!audioCtx){ const A=window.AudioContext||window.webkitAudioContext; if(A)audioCtx=new A(); } return audioCtx; }
function tone(freq,delay,dur,type,vol){ if(muted)return; const c=ac(); if(!c)return; const t0=c.currentTime+delay;
  const o=c.createOscillator(),g=c.createGain(); o.type=type||'square'; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(vol||0.12,t0+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0+dur+0.04); }
function sfxCount(){tone(440,0,0.16,'square',0.09);}
function sfxGo(){tone(660,0,0.1,'square',0.1);tone(990,0.08,0.4,'square',0.1);}
function sfxCross(i){tone(560+i*70,0,0.14,'square',0.1);}
function sfxPow(){tone(880,0,0.06,'square',0.08);tone(1240,0.05,0.1,'square',0.08);}
function sfxFanfare(){[523,659,784,1047].forEach(function(f,i){tone(f,i*0.12,0.26,'square',0.11);});}
let muteCanvas, mcx;
function drawMuteIcon(){
  const cell=2; mcx.imageSmoothingEnabled=false; mcx.clearRect(0,0,muteCanvas.width,muteCanvas.height);
  function r(x,y,w,h,c){ mcx.fillStyle=c; mcx.fillRect(x*cell,y*cell,w*cell,h*cell); }
  const ink='#3d3018';
  // speaker body (cone + box) — 11x11 grid
  r(1,4,2,3,ink);        // back box
  r(3,3,1,5,ink);        // mid
  r(4,2,1,7,ink);        // cone face top..bottom
  r(5,1,1,9,ink);        // front edge
  if(!muted){            // sound waves (ocean blue)
    const w='#2dadc8';
    r(7,3,1,5,w); r(8,2,1,1,w); r(8,8,1,1,w);
    r(9,1,1,2,w); r(9,8,1,2,w);
  } else {               // mute: coral X
    const x='#d94040';
    r(7,2,1,1,x); r(8,3,1,1,x); r(9,4,1,1,x); r(8,5,1,1,x); r(7,6,1,1,x);
    r(9,2,1,1,x); r(7,4,1,1,x); r(9,6,1,1,x);
  }
}

/* ---------- racer factory ---------- */
function displayName(p,i){return (p.name||'').trim()||FUN_NAMES[i%FUN_NAMES.length];}
function newRacer(p,i){
  return {p:p,i:i,x:START_X,phase:rnd(0,6),pop:0,
    n1:rnd(0,6),n2:rnd(0,6),n3:rnd(0,6),
    nextBurst:rnd(1.5,4),burstEnd:-1,nextStumble:rnd(4,9),stumbleEnd:-1,
    boostEnd:-1,boostMult:1,starEnd:-1,zapEnd:-1,spinEnd:-1,
    shielded:false,dropBanana:false,lastPwT:-99,
    finished:false,place:0,ledOnce:false,finishT:0,settleX:0,neverLedFlag:false};
}
function buildRacers(){ racers=players.map(function(p,i){return newRacer(p,i);}); finishOrder=[]; }

/* ---------- power-ups ---------- */
function spawnPowerups(){ powerups=[]; bananas=[]; if(!powerUpsOn)return;
  const n=players.length, count=Math.max(3,Math.min(n+1,6));
  for(let k=0;k<count;k++){ powerups.push({x:0,lane:0,alive:true,respawnAt:0,spin:rnd(0,6)}); placeBox(powerups[k],true); }
}
function placeBox(b,initial){ const n=players.length, minX=START_X+10, maxX=FINISH_X-6;
  b.x=initial?rnd(minX,(minX+maxX)/2):rnd(minX,maxX); b.lane=Math.floor(Math.random()*n); b.alive=true; }
function isInvincible(r){ return r.starEnd>clockT||r.shielded; }
function applyPowerup(r,type){ sfxPow();
  if(type==='boost'){ r.boostEnd=clockT+1.6; r.boostMult=1.9; }
  else if(type==='star'){ r.starEnd=clockT+3.2; }
  else if(type==='shield'){ r.shielded=true; }
  else if(type==='banana'){ r.dropBanana=true; }
  else if(type==='bolt'){ var hit=false; racers.forEach(function(o){ if(o!==r&&!o.finished&&o.x>r.x){ if(isInvincible(o)){ if(o.shielded)o.shielded=false; } else { o.zapEnd=clockT+1.4; hit=true; } } }); if(hit)tone(150,0,0.22,'sawtooth',0.08); }
  r.fxText=POWERUP_GLYPH[type]; r.fxColor=POWERUP_COLOR[type]; r.fxT=realT;
}
function dropBananaTrap(r){ bananas.push({x:r.x-2.2,lane:laneOf(r),owner:r,dead:false,deadT:0}); r.dropBanana=false; }
function laneOf(r){ return r.i; }

/* ---------- race progression (ported, tuned for 2D) ---------- */
function crossFinish(r){ if(r.finished)return; r.finished=true; finishOrder.push(r); r.place=finishOrder.length;
  r.finishT=clockT-raceStartT; r.settleX=FINISH_X+4+rnd(0.5,2.5); r.shielded=false; r.starEnd=-1; r.zapEnd=-1; r.spinEnd=-1;
  sfxCross(r.place);
  if(r.place===1){ winnerCrossRealT=realT; forceEndT=clockT+11; sfxFanfare(); }
  if(finishOrder.length===racers.length) allDoneT=clockT; }

function updateRacers(dt){
  const racing=state==='racing';
  var leaderX=-Infinity, leader=null, secondX=-Infinity;
  racers.forEach(function(r){ if(r.x>leaderX){secondX=leaderX;leaderX=r.x;leader=r;} else if(r.x>secondX)secondX=r.x; });
  if(racing&&leader&&!leader.finished) leader.ledOnce=true;
  if(racing&&forceEndT&&clockT>forceEndT){ racers.filter(function(r){return !r.finished;}).sort(function(a,b){return b.x-a.x;}).forEach(function(r){crossFinish(r);}); }
  if(racing&&racers.length&&finishOrder.length===racers.length&&clockT>allDoneT+1.0) endRace();

  racers.forEach(function(r){
    if(r.pop<1){ r.pop=Math.min(1,r.pop+dt*3); }
    var gait=1.0;
    if(racing&&!r.finished){
      var tt=clockT-raceStartT;
      var noise=Math.sin(tt*0.9+r.n1)*0.55+Math.sin(tt*1.63+r.n2)*0.4+Math.sin(tt*0.31+r.n3)*0.45;
      if(tt>r.nextBurst){ r.burstEnd=tt+rnd(0.9,1.4); r.nextBurst=tt+rnd(2.6,6); }
      var burst=(tt<r.burstEnd)?2.5:0;
      if(tt>r.nextStumble){ r.stumbleEnd=tt+rnd(0.7,1.1); r.nextStumble=tt+rnd(4.5,10); }
      var stumbling=tt<r.stumbleEnd;
      var deficit=leaderX-r.x, rubber=Math.min(deficit*0.05,1.35);
      var sp=3.55+noise*1.05+burst+rubber;
      if(r===leader&&(leaderX-secondX)>5) sp-=Math.min((leaderX-secondX-5)*0.13,1.0);
      if(stumbling) sp*=0.18;
      var mult=1;
      if(r.boostEnd>clockT) mult*=r.boostMult;
      if(r.starEnd>clockT) mult*=2.15;
      if(r.zapEnd>clockT) mult*=0.42;
      var spinning=r.spinEnd>clockT;
      if(spinning) mult*=0.12;
      sp=Math.max(sp*mult,0.35);
      r.x+=sp*dt; gait=sp;
      // pick up boxes
      if(powerUpsOn){ powerups.forEach(function(b){ if(b.alive&&b.lane===r.i&&Math.abs(b.x-r.x)<1.4&&clockT-r.lastPwT>0.25){ b.alive=false; b.respawnAt=realT+rnd(2.5,4.2); r.lastPwT=clockT; applyPowerup(r,POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)]); } }); }
      if(r.dropBanana) dropBananaTrap(r);
      // banana collisions
      bananas.forEach(function(b){ if(b.dead||b.owner===r)return; if(b.lane===r.i&&Math.abs(b.x-r.x)<1.3){ if(isInvincible(r)){ if(r.shielded)r.shielded=false; } else { r.spinEnd=clockT+1.0; r.fxText='*'; r.fxColor='#fff'; r.fxT=realT; tone(200,0,0.18,'sawtooth',0.07); } b.dead=true; b.deadT=realT; } });
      if(r.x>=FINISH_X) crossFinish(r);
      r.neverLedFlag=!r.ledOnce;
    } else if(r.finished){
      if(r.x<r.settleX){ r.x+=2.0*dt; gait=1.6; } else gait=0.0;
    } else { gait=0.0; }
    // animation phase
    r.phase += Math.max(gait,0.2)*dt*3.4;
    r.gait=gait;
  });
  // expire dead bananas + respawn boxes
  for(let i=bananas.length-1;i>=0;i--){ var b=bananas[i]; if(b.dead && realT-b.deadT>0.5) bananas.splice(i,1); }
  if(state==='racing'){ powerups.forEach(function(b){ if(!b.alive && realT>b.respawnAt) placeBox(b,false); }); }
}

/** Pixel-art mystery crate — golden box with ? glyph and soft pulse. */
function drawPowerupBox(cx, cy, bob, spin){
  const cell=Math.max(3,Math.round(PXS*0.72));
  const bx=Math.round(cx-cell*6.5);
  const by=Math.round(cy-cell*6.5+bob);
  function px(dx,dy,w,h,col){
    ctx.fillStyle=col;
    ctx.fillRect(bx+dx*cell,by+dy*cell,w*cell,h*cell);
  }

  const glow=0.14+0.1*Math.sin(clockT*5+spin);
  ctx.fillStyle='#fff6b8';
  ctx.globalAlpha=glow;
  ctx.fillRect(bx-cell,by-cell,cell*15,cell*15);
  ctx.globalAlpha=1;

  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(cx,by+cell*13.5,cell*5,cell*1.6,0,0,7);
  ctx.fill();

  px(0,0,13,13,'#1a1020');
  px(1,1,11,11,'#b88412');
  px(2,2,9,9,'#ffd928');
  px(2,2,9,3,'#ffe566');
  px(2,9,9,2,'#c99418');
  px(1,1,2,2,'#fff3b0');
  px(10,1,2,2,'#fff3b0');
  px(1,10,2,2,'#7a5608');
  px(10,10,2,2,'#7a5608');
  px(1,6,11,1,'#a87310');
  px(6,1,1,11,'#a87310');

  px(5,3,3,1,'#1a1020');
  px(4,4,1,2,'#1a1020');
  px(5,4,4,1,'#1a1020');
  px(8,5,1,2,'#1a1020');
  px(5,7,3,1,'#1a1020');
  px(6,8,1,2,'#1a1020');
  px(6,10,1,1,'#1a1020');
  px(5,3,3,1,'#fffef0');
  px(4,4,1,1,'#fffef0');
  px(5,4,3,1,'#fffef0');
  px(8,5,1,1,'#fffef0');
  px(5,7,3,1,'#fffef0');
  px(6,8,1,1,'#fffef0');
  px(6,10,1,1,'#fffef0');

  const spark=Math.sin(clockT*6+spin*2);
  if(spark>0.35){
    ctx.globalAlpha=Math.min(1,(spark-0.35)*1.4);
    px(spark>0.75?11:1,spark>0.75?2:11,1,1,'#fff');
    px(spark>0.75?2:10,spark>0.75?11:3,1,1,'#fff');
    ctx.globalAlpha=1;
  }
}
/* ============================================================
   RENDER RACERS + on-track items
   ============================================================ */
let clockT=0, realT=0, timeScale=1, hudTick=0;

function drawRacersAndItems(n){
  const m=trackMetrics(n);
  const p=PXS;                                   // sprite pixel size
  // power-up boxes
  if(powerUpsOn && (state==='racing'||state==='countdown')){
    powerups.forEach(function(b){ if(!b.alive)return; var sx=worldToScreenX(b.x); if(sx<-20||sx>VW+20)return;
      var cy=laneCenterY(b.lane,n); var bob=Math.sin(clockT*3+b.spin)*3;
      drawPowerupBox(sx,cy,bob,b.spin);
    });
  }
  // bananas
  bananas.forEach(function(b){ if(b.dead)return; var sx=worldToScreenX(b.x); if(sx<-20||sx>VW+20)return;
    var cy=laneCenterY(b.lane,n); var s=Math.max(7,p*3);
    ctx.fillStyle='#ffe14d'; ctx.fillRect(Math.round(sx-s/2),Math.round(cy-2),s,4); ctx.fillStyle='#caa12e'; ctx.fillRect(Math.round(sx-s/2),Math.round(cy+1),s,1);
  });

  // racers — draw far lane (top) first for correct overlap
  var order=racers.map(function(r,idx){return idx;}).sort(function(a,b){return racers[a].i-racers[b].i;});
  order.forEach(function(idx){
    var r=racers[idx]; var sx=worldToScreenX(r.x);
    var cy=laneCenterY(r.i,n)+sceneRacerYOffset();
    var ch=CHARACTERS[r.p.charIdx];
    var frameCount=frameCountFor(ch);
    var idleFrame=idleFrameFor(ch);
    var frame=(r.gait>0.3)? (Math.floor(r.phase)%frameCount) : idleFrame;
    var popScale=r.pop<1? (0.4+0.6*r.pop):1;
    var scale=p*popScale;
    var sz=spriteScreenSize(ch,scale);
    // vertical bob: peaks on the "pass" frames of the cycle
    var bob=(r.gait>0.3)? Math.abs(Math.sin(r.phase*Math.PI*0.5))*(p*1.1) : 0;
    var baseline=cy + m.laneH*sceneRacerBaselineFactor() - bob;
    // shadow
    ctx.fillStyle='rgba(0,0,0,.20)'; var shW=sz.w*0.55; ctx.beginPath();
    ctx.ellipse(sx, cy+m.laneH*sceneRacerShadowFactor(), shW*0.5, Math.max(3,p*1.4), 0,0,7); ctx.fill();
    // shield bubble
    if(r.shielded){ ctx.strokeStyle='rgba(159,232,255,.9)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(sx,baseline-sz.h*0.5,sz.w*0.45,0,7); ctx.stroke(); }
    var starred=r.starEnd>clockT;
    blitSprite(r.p.charIdx, COLORS[r.p.colorIdx], frame, sx, baseline, scale, starred);
    // floating fx glyph
    if(r.fxT && realT-r.fxT<0.9){ var age=realT-r.fxT; ctx.globalAlpha=Math.max(0,1-age*1.1);
      ctx.fillStyle=r.fxColor||'#fff'; ctx.font='bold '+Math.round(p*5)+'px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText(r.fxText||'', sx, baseline-sz.h - age*22); ctx.globalAlpha=1; ctx.textAlign='left'; }
    // name label (HTML-free, drawn on canvas) above racer
    drawNameLabel(displayName(r.p,r.i), COLORS[r.p.colorIdx], sx, baseline-sz.h-8, r.i, n);
  });
}

function drawNameLabel(name,color,cx,cy,laneI,n){
  ctx.font='600 '+Math.max(11,Math.round(PXS*3.4))+'px "Jersey 10",monospace'; ctx.textBaseline='middle';
  var tw=ctx.measureText(name).width;
  var padX=6, dot=Math.max(6,PXS*1.8), gap=4;
  var w=padX*2+dot+gap+tw, h=Math.max(16,PXS*4.6);
  // stagger label vertically a touch by lane parity to reduce overlap when bunched
  var yy=cy - h*0.3 - (laneI%2? 0: 1);
  var x=cx - w/2;
  // box
  ctx.fillStyle='rgba(44,37,28,.68)'; ctx.fillRect(Math.round(x),Math.round(yy-h/2),Math.round(w),Math.round(h));
  ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(Math.round(x),Math.round(yy-h/2),Math.round(w),1);
  // dot
  ctx.fillStyle=color; ctx.fillRect(Math.round(x+padX),Math.round(yy-dot/2),Math.round(dot),Math.round(dot));
  ctx.fillStyle='rgba(61,48,24,.22)'; ctx.fillRect(Math.round(x+padX),Math.round(yy-dot/2),Math.round(dot),1);
  // text
  ctx.fillStyle='rgba(245,230,196,.92)'; ctx.textAlign='left'; ctx.fillText(name, Math.round(x+padX+dot+gap), Math.round(yy)+1);
}

/* ============================================================
   CAMERA (horizontal scroll, follow the pack)
   ============================================================ */
function updateCamera(dt){
  const n=Math.max(players.length,1);
  // visible world width:
  pxPerUnit = VW / viewUnits();
  var targetCamX;
  if(state==='lobby'){
    targetCamX = START_X - 4;
  } else {
    var lead=-Infinity,trail=Infinity;
    racers.forEach(function(r){ if(r.x>lead)lead=r.x; if(r.x<trail)trail=r.x; });
    if(lead===-Infinity){lead=START_X;trail=START_X;}
    // keep leader ~68% across the screen
    var leaderScreenFrac=0.68;
    targetCamX = lead - viewUnits()*leaderScreenFrac;
    // but don't cut off the trailer badly; clamp so trailer stays visible
    var minCam = trail - viewUnits()*0.12;
    if(targetCamX>minCam) targetCamX=Math.max(minCam, lead - viewUnits()*0.92);
    // clamp to track bounds-ish
    targetCamX=Math.max(START_X-4, targetCamX);
  }
  camX += (targetCamX-camX)*Math.min(dt*3.0,1);
}
function viewUnits(){
  // how many world units fit across the screen; fewer = more zoomed in
  // scale with screen so phones see enough but sprites stay big
  return Math.max(16, Math.min(30, VW/42));
}

/* ============================================================
   COUNTDOWN / RACE FLOW
   ============================================================ */
let lobbyEl, listEl, addBtn, startBtn, hudEl, hudRows, countWrap, countNum, resultsEl, eventToast, finishFlash, photoTag;

function startRace(){ resultsShown=false; setSlowmo(false); buildRacers(); spawnPowerups();
  lobbyEl.classList.add('hidden'); resultsEl.classList.add('hidden'); hudEl.classList.remove('hidden'); renderHUD();
  state='countdown'; camX=START_X-4; runCountdown(); }
function runCountdown(){ countWrap.classList.remove('hidden'); const steps=['3','2','1','GO!']; var i=0;
  (function step(){ countNum.textContent=steps[i]; countNum.style.animation='none'; void countNum.offsetWidth; countNum.style.animation='';
    if(i<3)sfxCount(); else sfxGo(); i++;
    if(i<steps.length){ setTimeout(step,820); } else setTimeout(function(){ countWrap.classList.add('hidden'); state='racing'; raceStartT=clockT; forceEndT=0; nextEventT=realT+rnd(7,10); },600); })(); }

function endRace(){ state='finished'; hideToast(); showResults(); setTimeout(function(){ hudEl.classList.add('hidden'); },400); }

function sipInfo(place,total){ if(place===1)return {txt:'deals '+total,cls:'give'}; if(place===total)return {txt:(total+1)+' · chug',cls:'chug'}; return {txt:place+' sips',cls:''}; }
function escapeHtml(s){return (''+s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function showResults(){ const total=racers.length, w=finishOrder[0];
  document.getElementById('resSub').textContent=displayName(w.p,w.i)+' won in '+w.finishT.toFixed(1)+'s';
  const rowsEl=document.getElementById('resRows'); rowsEl.innerHTML=''; const medals=['1','2','3'];
  finishOrder.forEach(function(r,i){ var place=i+1, info=sipInfo(place,total), slow=r.neverLedFlag;
    var row=document.createElement('div'); row.className='res-row'+(place===1?' first':'');
    row.innerHTML='<div class="res-medal">'+(medals[i]||(place+'.'))+'</div><div class="res-dot" style="background:'+COLORS[r.p.colorIdx]+'"></div><div class="res-name">'+escapeHtml(displayName(r.p,r.i))+'</div><div class="res-sips '+info.cls+'">'+info.txt+(slow?' +1':'')+'</div>';
    rowsEl.appendChild(row); });
  const slow=finishOrder.filter(function(r){return r.neverLedFlag;}), noteEl=document.getElementById('resNote');
  noteEl.innerHTML=slow.length?('<b>Slowpoke clause:</b> '+slow.map(function(r){return escapeHtml(displayName(r.p,r.i));}).join(', ')+' never led — +1 sip of shame.'):'Everyone led at some point — a civilised race. No shame sips today.';
  setTimeout(function(){ resultsShown=true; resultsEl.classList.remove('hidden'); },800); }

/* ---------- HUD ---------- */
function renderHUD(){ const sorted=racers.slice().sort(function(a,b){ if(a.finished&&b.finished)return a.place-b.place; if(a.finished)return -1; if(b.finished)return 1; return b.x-a.x; });
  var html=''; sorted.forEach(function(r,i){ var pct=Math.max(0,Math.min(100,(r.x-START_X)/(FINISH_X-START_X)*100));
    html+='<div class="hud-row"><div class="hud-rank">'+(i+1)+'</div><div class="hud-dot" style="background:'+COLORS[r.p.colorIdx]+'"></div><div class="hud-name">'+escapeHtml(displayName(r.p,r.i))+'</div><div class="hud-bar"><i style="width:'+pct+'%"></i></div></div>';
  }); hudRows.innerHTML=html; }

/* ---------- toasts (drinking prompts) ---------- */
function showToast(txt){ eventToast.textContent=txt; eventToast.classList.add('show'); clearTimeout(showToast._t); showToast._t=setTimeout(hideToast,3400); }
function hideToast(){ eventToast.classList.remove('show'); }
function fireEvent(){ const sorted=racers.slice().filter(function(r){return !r.finished;}).sort(function(a,b){return b.x-a.x;}); if(!sorted.length)return;
  const leader=sorted[0], last=sorted[sorted.length-1];
  const tpl=[ function(){return leader?('🍺 '+displayName(leader.p,leader.i)+' leads — everyone else sips!'):''; },
    function(){return last?('🐌 '+displayName(last.p,last.i)+' is last… drink up!'):''; },
    function(){return 'Cheers! Everyone clink and sip together.'; },
    function(){return 'Last to raise their drink takes two!'; },
    function(){return leader?(displayName(leader.p,leader.i)+"'s player picks someone to drink."):''; },
    function(){return 'Power-up holders: sip when it wears off!'; } ];
  var idx; do{ idx=Math.floor(Math.random()*tpl.length); }while(idx===lastEventIdx&&tpl.length>1); lastEventIdx=idx; showToast(tpl[idx]()); }

/* ---------- slow-mo / photo finish ---------- */
let slowmoActive=false, slowmoCueT=0;
function setSlowmo(on){ if(on===slowmoActive)return; slowmoActive=on; finishFlash.classList.toggle('on',on);
  if(on){ photoTag.classList.add('on'); slowmoCueT=realT; tone(330,0,0.4,'sine',0.05); } else photoTag.classList.remove('on'); }

/* ============================================================
   LOBBY UI  (mini sprite preview in the "pick" button)
   ============================================================ */
function drawPickPreview(canvas,charIdx,color){
  const ch=CHARACTERS[charIdx];
  if(ch.sheet){
    const img=sheetImages[ch.sheet.src];
    const fw=ch.sheet.frameW, fh=ch.sheet.frameH;
    const maxW=GW*3, maxH=GH*3;
    const scale=Math.min(maxW/fw, maxH/fh);
    canvas.width=Math.ceil(fw*scale);
    canvas.height=Math.ceil(fh*scale);
    const cx=canvas.getContext('2d'); cx.imageSmoothingEnabled=false; cx.clearRect(0,0,canvas.width,canvas.height);
    if(img) cx.drawImage(img,0,0,fw,fh,0,0,canvas.width,canvas.height);
    return;
  }
  const cell=3, pad=1; canvas.width=GW*cell; canvas.height=GH*cell;
  const cx=canvas.getContext('2d'); cx.imageSmoothingEnabled=false; cx.clearRect(0,0,canvas.width,canvas.height);
  function g(x,y,w,h,c){ cx.fillStyle=c; cx.fillRect(x*cell,y*cell,w*cell,h*cell); }
  ch.draw(g,0,color);
}
function freeColor(){ const used=players.map(function(p){return p.colorIdx;}); for(let i=0;i<COLORS.length;i++) if(used.indexOf(i)<0)return i; return Math.floor(Math.random()*COLORS.length); }
function nextFreeColor(from){ const used=players.map(function(p){return p.colorIdx;}); for(let k=1;k<=COLORS.length;k++){ const i=(from+k)%COLORS.length; if(used.indexOf(i)<0)return i; } return (from+1)%COLORS.length; }

function renderLobby(){ listEl.innerHTML='';
  players.forEach(function(p,i){
    const row=document.createElement('div'); row.className='player-row';
    const sw=document.createElement('div'); sw.className='swatch'; sw.style.background=COLORS[p.colorIdx]; sw.title='Colour';
    sw.addEventListener('click',function(){ p.colorIdx=nextFreeColor(p.colorIdx); sw.style.background=COLORS[p.colorIdx]; drawPickPreview(pc,p.charIdx,COLORS[p.colorIdx]); });
    const pick=document.createElement('button'); pick.className='pick'; pick.title='Change racer';
    const pc=document.createElement('canvas'); pick.appendChild(pc); drawPickPreview(pc,p.charIdx,COLORS[p.colorIdx]);
    pick.addEventListener('click',function(){ p.charIdx=(p.charIdx+1)%CHAR_COUNT; drawPickPreview(pc,p.charIdx,COLORS[p.colorIdx]); });
    const input=document.createElement('input'); input.maxLength=14; input.placeholder=FUN_NAMES[i%FUN_NAMES.length]; input.value=p.name;
    input.addEventListener('input',function(){ p.name=input.value; });
    row.appendChild(sw); row.appendChild(pick); row.appendChild(input);
    if(players.length>2){ const rm=document.createElement('button'); rm.className='remove'; rm.textContent='X'; rm.title='Remove';
      rm.addEventListener('click',function(){ players.splice(i,1); renderLobby(); }); row.appendChild(rm); }
    listEl.appendChild(row);
  });
  addBtn.textContent=players.length>=MAX_PLAYERS?'ROSTER FULL (8)':('+ ADD PLAYER  ·  '+players.length+'/'+MAX_PLAYERS);
  addBtn.disabled=players.length>=MAX_PLAYERS; addBtn.style.opacity=addBtn.disabled?0.5:1;
}

function wireSeg(id,getIdx,setIdx){ const seg=document.getElementById(id);
  function paint(){ Array.prototype.forEach.call(seg.children,function(b){ b.classList.toggle('active',+b.dataset.i===getIdx()); }); }
  seg.addEventListener('click',function(e){ const b=e.target.closest('button'); if(!b)return; setIdx(+b.dataset.i); paint(); }); paint(); return paint;
}

function bindUi(){
  view=document.getElementById('game');
  ctx=view.getContext('2d');
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',function(){ tabHidden=document.hidden; });
  resize();

  muteCanvas=document.getElementById('muteCanvas');
  mcx=muteCanvas.getContext('2d');
  drawMuteIcon();
  document.getElementById('muteBtn').addEventListener('click',function(){
    muted=!muted;
    drawMuteIcon();
    document.getElementById('muteBtn').setAttribute('aria-pressed', muted ? 'true' : 'false');
  });

  lobbyEl=document.getElementById('lobby');
  listEl=document.getElementById('playerList');
  addBtn=document.getElementById('addBtn');
  startBtn=document.getElementById('startBtn');
  hudEl=document.getElementById('hud');
  hudRows=document.getElementById('hudRows');
  countWrap=document.getElementById('countWrap');
  countNum=document.getElementById('countNum');
  resultsEl=document.getElementById('results');
  eventToast=document.getElementById('eventToast');
  finishFlash=document.getElementById('finishFlash');
  photoTag=document.getElementById('photoTag');

  document.getElementById('againBtn').addEventListener('click',function(){ resultsEl.classList.add('hidden'); startRace(); });
  document.getElementById('editBtn').addEventListener('click',function(){ resultsEl.classList.add('hidden'); state='lobby'; hudEl.classList.add('hidden'); buildRacers(); renderLobby(); lobbyEl.classList.remove('hidden'); });

  addBtn.addEventListener('click',function(){ if(players.length>=MAX_PLAYERS)return;
    players.push({name:'',colorIdx:freeColor(),charIdx:players.length%CHAR_COUNT}); renderLobby();
    const inputs=listEl.querySelectorAll('input'); if(inputs.length)inputs[inputs.length-1].focus(); });

  wireSeg('sceneSeg',function(){return sceneIdx;},function(i){sceneIdx=i; starField=null;});
  wireSeg('themeSeg',function(){return themeIdx;},function(i){themeIdx=i; starField=null;});
  wireSeg('lengthSeg',function(){return lengthIdx;},function(i){lengthIdx=i; START_X=LENGTHS[i].start; FINISH_X=LENGTHS[i].finish;});
  document.getElementById('powerToggle').addEventListener('change',function(e){ powerUpsOn=e.target.checked; });
  startBtn.addEventListener('click',function(){ if(state!=='lobby')return; ac(); players.forEach(function(p,i){ p.name=displayName(p,i); }); startRace(); });
}

/* ============================================================
   MAIN LOOP
   ============================================================ */
let lastT=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  if(tabHidden){ lastT=now; return; }
  var realDt=Math.min((now-lastT)/1000,0.05); lastT=now; realT+=realDt;

  // slow-mo control
  var target=1, wantCue=false;
  if(state==='racing' && finishOrder.length===0){
    var lx=-1e9,sx=-1e9; racers.forEach(function(r){ if(r.finished)return; if(r.x>lx){sx=lx;lx=r.x;} else if(r.x>sx)sx=r.x; });
    if(lx>-1e8){ var gap=(sx>-1e8)?(lx-sx):99; if(lx>FINISH_X-7){ target=(gap<4)?0.34:0.6; wantCue=(gap<6); } }
  } else if(state==='racing' && finishOrder.length>0){
    target=(realT-winnerCrossRealT<0.7)?0.45:1;
  }
  if(state==='finished' && realT-winnerCrossRealT<1.0) target=Math.min(target,0.45);
  setSlowmo(wantCue);
  if(slowmoActive){ if(finishOrder.length>0 && realT-slowmoCueT>0.45) setSlowmo(false); if(state!=='racing' && realT-winnerCrossRealT>1.0) setSlowmo(false); }
  timeScale += (target-timeScale)*Math.min(realDt*4,1);
  var dt=realDt*timeScale; clockT+=dt;

  if(state==='racing'||state==='countdown') updateRacers(dt);
  updateCamera(realDt);

  // render
  const n=Math.max(players.length,1);
  ctx.clearRect(0,0,VW,VH);
  drawScene(n,clockT);
  drawRacersAndItems(n);
  drawSceneOverlay();

  // HUD + events
  if(state==='racing'||state==='countdown'){ hudTick+=realDt; if(hudTick>0.2){ hudTick=0; renderHUD(); }
    if(state==='racing'&&realT>nextEventT){ fireEvent(); nextEventT=realT+rnd(12,18); } }
}

export async function bootGame() {
  [sheetImages, backgroundImages]=await Promise.all([
    loadSpriteSheets(CHARACTERS),
    loadBackgroundLayers(SCENES),
  ]);
  bindUi();
  renderLobby();
  buildRacers();
  requestAnimationFrame(frame);
}
