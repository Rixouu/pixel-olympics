import {
  GW, GH, COLORS, LENGTHS, MAX_PLAYERS,
  POWERUP_TYPES, POWERUP_COLOR, POWERUP_GLYPH,
} from './config.js';
import { rnd } from './color.js';
import { CHARACTERS, CHAR_COUNT } from './characters.js';
import { currentSceneArtReady, gameAssets, preloadGameAssets, updateLobbySceneReveal } from './assets.js';
import { frameCountFor, idleFrameFor, spriteScreenSize, spriteSourceForFrame, spriteSourceRectForFrame } from './sprite-sheets.js';
import { SCENES } from './scenes.js';
import { defaultParallax } from './backgrounds.js';
import {
  applyDocumentTranslations,
  getFallbackName,
  getLanguage,
  getLengthCopy,
  getSceneCopy,
  onLanguageChange,
  setLanguage,
  t,
} from './i18n.js';


/* ---------- low-res pixel canvas ---------- */
let view, ctx;
let VW=0, VH=0, DPR=1;           // device pixel size
let PXS=4;                        // pixels-per-art-pixel (scale); set on resize
const POWERUP_IMAGE_BOUNDS={ srcX:246, srcY:243, srcW:604, srcH:543 };
const ORIENTATION_PROMPT_STORAGE_KEY='pixel-olympics-orientation-prompt-dismissed';
function readStoredFlag(key){
  if(typeof window==='undefined') return false;
  try{
    return window.localStorage.getItem(key)==='true';
  }catch(error){
    return false;
  }
}
function writeStoredFlag(key, value){
  if(typeof window==='undefined') return;
  try{
    if(value) window.localStorage.setItem(key, 'true');
    else window.localStorage.removeItem(key);
  }catch(error){
    // Ignore storage failures in restricted browsing contexts.
  }
}
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
  syncViewportClasses();
}

let tabHidden=false;
let orientationPromptDismissed=readStoredFlag(ORIENTATION_PROMPT_STORAGE_KEY);

const DEFAULT_SCENE_KEY='tropical-island';
const DEFAULT_SCENE_IDX=Math.max(0, SCENES.findIndex(function(scene){ return scene.key===DEFAULT_SCENE_KEY; }));
let lengthIdx=1, sceneIdx=DEFAULT_SCENE_IDX, powerUpsOn=true;
let START_X=LENGTHS[lengthIdx].start, FINISH_X=LENGTHS[lengthIdx].finish;

let trackMetricsCache=null, trackMetricsCacheN=-1, trackMetricsCacheScene=-1;
function invalidateTrackMetrics(){ trackMetricsCache=null; trackMetricsCacheN=-1; trackMetricsCacheScene=-1; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function effectiveViewportWidth(){
  const widths=[
    window.innerWidth||0,
    document.documentElement ? document.documentElement.clientWidth : 0,
    window.visualViewport ? Math.round(window.visualViewport.width) : 0,
  ].filter(Boolean);
  return widths.length ? Math.min.apply(null,widths) : VW;
}
function effectiveViewportHeight(){
  const heights=[
    window.innerHeight||0,
    document.documentElement ? document.documentElement.clientHeight : 0,
    window.visualViewport ? Math.round(window.visualViewport.height) : 0,
  ].filter(Boolean);
  return heights.length ? Math.min.apply(null,heights) : VH;
}
function syncViewportClasses(){
  if(typeof document==='undefined' || !document.body) return;
  const width=effectiveViewportWidth();
  const height=effectiveViewportHeight();
  document.body.classList.toggle('viewport-compact', width<=620);
  document.body.classList.toggle('viewport-portrait', height>width);
}
function isPortraitMobile(){
  const width=effectiveViewportWidth();
  const height=effectiveViewportHeight();
  return width<=700 && height>width;
}
function usesProportionalTrackTexture(S){
  return !!(S && S.trackTexture && S.trackTextureRenderMode === 'proportional');
}
function sceneTrackHeightScale(S){
  if(!S) return 1;
  return isPortraitMobile()
    ? (S.trackHeightScaleMobile!=null ? S.trackHeightScaleMobile : 1)
    : (S.trackHeightScale!=null ? S.trackHeightScale : 1);
}
function getTrackTextureSlices(S, img){
  const slices=S.trackTextureSlices||{};
  const laneSurfaceTop=Math.max(0, Math.floor(img.height*(slices.laneSurfaceTop||0)));
  const laneSurfaceBottom=Math.min(img.height, Math.ceil(img.height*(slices.laneSurfaceBottom||0.72)));
  const lowerApronTop=Math.max(laneSurfaceBottom, Math.floor(img.height*(slices.lowerApronTop||0.72)));
  return { laneSurfaceTop, laneSurfaceBottom, lowerApronTop };
}
function getTrackTextureVerticalRatios(S, img){
  if(!usesProportionalTrackTexture(S) || !img){
    return { upperRatio: 0, lowerRatio: 0 };
  }
  const slices=getTrackTextureSlices(S, img);
  const laneSurfaceHeight=Math.max(1, slices.laneSurfaceBottom-slices.laneSurfaceTop);
  return {
    upperRatio: slices.laneSurfaceTop/laneSurfaceHeight,
    lowerRatio: Math.max(0, img.height-slices.laneSurfaceBottom)/laneSurfaceHeight,
  };
}
function getTrackApronRenderMetrics(S, img){
  const sliceMetrics=getTrackTextureSlices(S, img);
  const baseScale=VW/img.width;
  const fullSrcH=Math.max(1, img.height-sliceMetrics.lowerApronTop);
  const fullDestH=Math.max(1, Math.round(fullSrcH*baseScale));
  if(!isPortraitMobile()){
    return {
      ...sliceMetrics,
      srcY: sliceMetrics.lowerApronTop,
      srcH: fullSrcH,
      destH: fullDestH,
    };
  }

  const cappedDestH=clamp(
    Math.round(Math.min(VW*0.26, VH*0.12)),
    88,
    Math.min(fullDestH, 124)
  );
  const croppedSrcH=Math.max(1, Math.round(cappedDestH/baseScale));
  return {
    ...sliceMetrics,
    srcY: Math.max(sliceMetrics.lowerApronTop, img.height-croppedSrcH),
    srcH: croppedSrcH,
    destH: cappedDestH,
  };
}
function getVisualTrackLaneCount(n){
  const S=SCENES[sceneIdx]||{};
  if(S.trackTexture){
    const targetLaneCount=isPortraitMobile()
      ? (S.mobileVisualLaneCount!=null ? S.mobileVisualLaneCount : (S.visualLaneCount||6))
      : (S.visualLaneCount||6);
    return Math.max(n, targetLaneCount);
  }
  return n;
}
function centeredLaneSlots(n, visualCount){
  const start=Math.max(0, Math.round((visualCount-n)/2));
  return Array.from({ length: n }, function(_, i){ return start+i; });
}
function laneFormationSlots(n){
  const S=SCENES[sceneIdx]||{};
  const visualCount=Math.max(1, getVisualTrackLaneCount(n));
  const configuredSlots=S.laneFormations && Array.isArray(S.laneFormations[n]) ? S.laneFormations[n] : null;
  const rawSlots=configuredSlots && configuredSlots.length
    ? configuredSlots.slice(0, n)
    : ((S.laneSlotMode||'center')==='top'
      ? Array.from({ length: n }, function(_, i){ return i; })
      : centeredLaneSlots(n, visualCount));
  return rawSlots.map(function(slot){
    return clamp(Math.round(slot), 0, visualCount-1);
  });
}
function sceneLaneCenterOffset(slot, laneH){
  const S=SCENES[sceneIdx]||{};
  const ratioOffsets=(isPortraitMobile() && Array.isArray(S.laneCenterOffsetRatiosMobile))
    ? S.laneCenterOffsetRatiosMobile
    : S.laneCenterOffsetRatios;
  if(Array.isArray(ratioOffsets)){
    return Number(ratioOffsets[slot]||0)*laneH;
  }
  const offsets=(isPortraitMobile() && Array.isArray(S.laneCenterOffsetsMobile))
    ? S.laneCenterOffsetsMobile
    : S.laneCenterOffsets;
  if(!Array.isArray(offsets)) return 0;
  return Number(offsets[slot]||0);
}
function laneGeometryForSlot(slot, n, centerYOverride){
  const m=trackMetrics(n);
  const clampedSlot=clamp(Math.round(slot), 0, Math.max(0, m.visualLaneCount-1));
  const defaultCenter=m.topPad+m.laneH*(clampedSlot+0.5)+sceneLaneCenterOffset(clampedSlot, m.laneH);
  const centerY=centerYOverride==null ? defaultCenter : centerYOverride;
  return {
    slot: clampedSlot,
    top: centerY-m.laneH*0.5,
    bottom: centerY+m.laneH*0.5,
    center: centerY,
    height: m.laneH,
  };
}
function laneGeometryForPlayer(i, n){
  const slots=laneFormationSlots(n);
  const slot=slots[Math.max(0, Math.min(slots.length-1, i))] ?? 0;
  return laneGeometryForSlot(slot, n);
}
function laneGeometries(n){
  const count=Math.max(1, getVisualTrackLaneCount(n));
  return Array.from({ length: count }, function(_, slot){
    return laneGeometryForSlot(slot, n);
  });
}
function sceneTrackApronHeight(){
  const S=SCENES[sceneIdx]||{};
  if(usesProportionalTrackTexture(S)) return 0;
  const img=S.trackTexture ? gameAssets.backgroundImages[S.trackTexture] : null;
  if(!img) return 0;
  return getTrackApronRenderMetrics(S, img).destH;
}
function sceneTrackLayout(){
  const S=SCENES[sceneIdx]||{};
  const mobilePortrait=isPortraitMobile();
  const mobileMinBottomPad=Math.max(
    S.minBottomPadMobile!=null ? S.minBottomPadMobile : Math.min(S.minBottomPad||0, 72),
    mobilePortrait ? sceneTrackApronHeight() : 0
  );
  return {
    skyRatio: mobilePortrait
      ? (S.skyRatioMobile!=null ? S.skyRatioMobile : (S.skyRatio!=null ? Math.max(0.26, S.skyRatio-0.08) : 0.34))
      : (S.skyRatio!=null ? S.skyRatio : 0.44),
    botRatio: mobilePortrait
      ? (S.botRatioMobile!=null ? S.botRatioMobile : (S.botRatio!=null ? Math.max(0.04, S.botRatio-0.08) : 0.05))
      : (S.botRatio!=null ? S.botRatio : 0.10),
    minBottomPad: mobilePortrait ? mobileMinBottomPad : (S.minBottomPad||0),
  };
}
/* On-screen track geometry — compact pixel-art lanes, generous sky for parallax */
function trackMetrics(n){
  n=Math.max(n,1);
  const S=SCENES[sceneIdx]||{};
  const trackImg=S.trackTexture ? gameAssets.backgroundImages[S.trackTexture] : null;
  const trackImgW=trackImg ? trackImg.width : 0;
  const trackImgH=trackImg ? trackImg.height : 0;
  if(trackMetricsCache && trackMetricsCacheN===n && trackMetricsCacheScene===sceneIdx && trackMetricsCache.trackImgW===trackImgW && trackMetricsCache.trackImgH===trackImgH) return trackMetricsCache;
  const textureRatios=getTrackTextureVerticalRatios(S, trackImg);
  const textureHeightRatio=1+textureRatios.upperRatio+textureRatios.lowerRatio;
  const trackHeightScale=usesProportionalTrackTexture(S) ? sceneTrackHeightScale(S) : 1;
  const visualLaneCount=getVisualTrackLaneCount(n);
  const layout=sceneTrackLayout();
  const skyRatio=layout.skyRatio;
  const botPadTarget=Math.max(Math.floor(VH*layout.botRatio), layout.minBottomPad);
  const idealLaneH=Math.max(Math.floor(PXS*8), Math.round(PXS*(GH+2)*trackHeightScale));
  const trackTop=Math.floor(VH*skyRatio);
  const maxBandH=Math.max(Math.floor(VH*0.18), Math.floor((VH-trackTop-botPadTarget)/textureHeightRatio));
  let laneH=idealLaneH;
  let bandH=laneH*visualLaneCount;
  if(bandH>maxBandH){
    laneH=Math.max(Math.floor(PXS*8),Math.floor(maxBandH/visualLaneCount));
    bandH=laneH*visualLaneCount;
  }
  const upperApronH=Math.round(bandH*textureRatios.upperRatio);
  const lowerApronH=Math.round(bandH*textureRatios.lowerRatio);
  const topPad=trackTop+upperApronH;
  const botPad=VH-topPad-bandH-lowerApronH;
  const horizonH=Math.max(Math.round(PXS*2),10);
  trackMetricsCache={
    topPad,
    trackTop,
    trackBottom: topPad+bandH+lowerApronH,
    upperApronH,
    lowerApronH,
    botPad,
    bandH,
    laneH,
    horizonH,
    skyBottom: trackTop+horizonH,
    visualLaneCount,
    trackImgW,
    trackImgH
  };
  trackMetricsCacheN=n;
  trackMetricsCacheScene=sceneIdx;
  return trackMetricsCache;
}
/* world-x -> screen-x via camera; lane index -> screen-y center */
let camX=0;                                       // world x at left edge (in world units)
let pxPerUnit=10;                                 // screen px per world unit (set per frame)
function worldToScreenX(wx){ return (wx - camX)*pxPerUnit; }
function laneCenterY(i,n){ return laneGeometryForPlayer(i,n).center; }
function laneBounds(i,n){
  const lane=laneGeometryForPlayer(i,n);
  return { top: lane.top, bottom: lane.bottom };
}

/* ============================================================
   SCENE BACKGROUND
   ============================================================ */
function syncCanvasVisibility(){
  if(!view) return;
  const shouldHideLobbyCanvas=state==='lobby' && !currentSceneArtReady(sceneIdx);
  // #region debug-point D:canvas-visibility
  if (typeof window !== 'undefined' && window.__dbgCanvasHidden !== shouldHideLobbyCanvas) { window.__dbgCanvasHidden = shouldHideLobbyCanvas; fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"lobby-scene-art",runId:"post-fix",hypothesisId:"D",location:"src/game/engine.js:syncCanvasVisibility",msg:"[DEBUG] canvas visibility changed",data:{state:state,shouldHideLobbyCanvas:shouldHideLobbyCanvas,sceneIdx:sceneIdx},ts:Date.now()})}).catch(()=>{}); }
  // #endregion
  view.style.opacity=shouldHideLobbyCanvas ? '0' : '1';
}

function sceneRacerYOffset(){
  const S=SCENES[sceneIdx];
  if(!S) return 0;
  if(isPortraitMobile() && S.racerYOffsetMobile!=null) return S.racerYOffsetMobile;
  return S.racerYOffset||0;
}

function powerupBoxRenderSize(laneH){
  const mobile=isPortraitMobile();
  return Math.max(
    mobile ? 30 : 32,
    Math.round(
      Math.min(
        Math.max(laneH*(mobile ? 0.5 : 0.54), PXS*(mobile ? 7.2 : 7.8)),
        PXS*(mobile ? 9.2 : 10.1)
      )
    )
  );
}

function racerLayout(ch, lane, popScale, bob){
  const laneH=Math.max(1, lane.height||Math.max(1, lane.bottom-lane.top));
  const padTop=Math.max(2, Math.round(laneH*0.04));
  const padBottom=Math.max(3, Math.round(laneH*0.06));
  const fittedScale=Math.min(PXS, Math.max(1, (laneH-padTop-padBottom)/GH));
  const scale=fittedScale*popScale;
  const sz=spriteScreenSize(ch,scale);
  const sceneOffset=sceneRacerYOffset();
  const centeredBaseline=lane.center+sz.h*0.5-bob;
  const minBaseline=lane.top+padTop+sz.h;
  const maxBaseline=lane.bottom-padBottom;
  const baseline=clamp(centeredBaseline+sceneOffset, minBaseline, maxBaseline);
  const shadowY=clamp(
    baseline-Math.max(4, Math.round(sz.h*0.08)),
    lane.top+padTop+2,
    lane.bottom-Math.max(2, Math.round(padBottom*0.35))
  );
  return {
    laneTop: lane.top,
    laneBottom: lane.bottom,
    scale: scale,
    size: sz,
    baseline: baseline,
    shadowY: shadowY,
  };
}

const laneAuditState={ counts:{} };
function resetLaneAudit(){
  laneAuditState.counts={};
}
function laneAuditBucket(n){
  if(!laneAuditState.counts[n]){
    laneAuditState.counts[n]={ playerCount:n, maxOverflowTop:0, maxOverflowBottom:0, samples:0 };
  }
  return laneAuditState.counts[n];
}
function auditLaneContainment(layout,n){
  const bucket=laneAuditBucket(n);
  const overflowTop=Math.max(0, layout.laneTop-(layout.baseline-layout.size.h));
  const overflowBottom=Math.max(0, layout.baseline-layout.laneBottom);
  bucket.maxOverflowTop=Math.max(bucket.maxOverflowTop, overflowTop);
  bucket.maxOverflowBottom=Math.max(bucket.maxOverflowBottom, overflowBottom);
  bucket.samples+=1;
}
function getLaneAuditSummary(){
  const counts=Object.keys(laneAuditState.counts).sort(function(a,b){ return Number(a)-Number(b); }).map(function(key){
    const bucket=laneAuditState.counts[key];
    return {
      playerCount: bucket.playerCount,
      maxOverflowTop: Number(bucket.maxOverflowTop.toFixed(3)),
      maxOverflowBottom: Number(bucket.maxOverflowBottom.toFixed(3)),
      samples: bucket.samples,
      ok: bucket.maxOverflowTop===0 && bucket.maxOverflowBottom===0,
    };
  });
  return {
    counts: counts,
    ok: counts.every(function(bucket){ return bucket.ok; }),
  };
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

function drawTexturedLaneBand(S, m, n){
  const img=gameAssets.backgroundImages[S.trackTexture];
  if(!img){
    drawPixelLaneBand(S,m,n);
    drawPixelGround(m.topPad+m.bandH+2,VH,S.groundDark,S.track,S.laneLine);
    return;
  }

  const apronMetrics=getTrackApronRenderMetrics(S, img);
  const laneSurfaceTop=apronMetrics.laneSurfaceTop;
  const laneSurfaceBottom=apronMetrics.laneSurfaceBottom;
  const laneSurfaceHeight=Math.max(1, laneSurfaceBottom-laneSurfaceTop);
  const bottomDestTop=Math.round(m.topPad+m.bandH);
  const renderLaneCount=m.visualLaneCount||getVisualTrackLaneCount(n);
  const sourceLaneH=Math.max(1, laneSurfaceHeight/renderLaneCount);

  if(usesProportionalTrackTexture(S)){
    const preserveAspect=isPortraitMobile();
    const proportionalDestH=m.upperApronH+m.bandH+m.lowerApronH;
    const proportionalScale=proportionalDestH/img.height;
    const destX=0;
    const destW=preserveAspect ? Math.max(VW, Math.round(img.width*proportionalScale)) : VW;
    if(m.upperApronH>0 && laneSurfaceTop>0){
      ctx.drawImage(img, 0, 0, img.width, laneSurfaceTop, destX, Math.round(m.trackTop), destW, m.upperApronH);
    }
    for(let i=0;i<renderLaneCount;i++){
      const y0=Math.round(m.topPad+m.laneH*i);
      const srcY=Math.round(laneSurfaceTop+sourceLaneH*i);
      const srcH=Math.max(1, Math.round(i===renderLaneCount-1 ? laneSurfaceBottom-srcY : sourceLaneH));
      ctx.drawImage(img, 0, srcY, img.width, srcH, destX, y0, destW, m.laneH);
    }
    const lowerSrcY=Math.min(img.height-1, laneSurfaceBottom);
    const lowerSrcH=Math.max(1, img.height-lowerSrcY);
    if(m.lowerApronH>0 && lowerSrcH>0){
      ctx.drawImage(img, 0, lowerSrcY, img.width, lowerSrcH, destX, bottomDestTop, destW, m.lowerApronH);
    }
    return;
  }

  for(let i=0;i<renderLaneCount;i++){
    const y0=Math.round(m.topPad+m.laneH*i);
    const srcY=Math.round(laneSurfaceTop+sourceLaneH*i);
    const srcH=Math.max(1, Math.round(i===renderLaneCount-1 ? laneSurfaceBottom-srcY : sourceLaneH));
    ctx.drawImage(img, 0, srcY, img.width, srcH, 0, y0, VW, m.laneH);
  }

  if(bottomDestTop<VH){
    const apronDestTop=Math.max(bottomDestTop, VH-apronMetrics.destH);
    const fillGapH=Math.max(0, apronDestTop-bottomDestTop);
    if(fillGapH>0){
      const baseScale=VW/img.width;
      const fillSrcH=Math.max(1, Math.round(fillGapH/baseScale));
      const fillSrcY=clamp(laneSurfaceBottom-fillSrcH, laneSurfaceTop, laneSurfaceBottom-1);
      ctx.drawImage(img, 0, fillSrcY, img.width, laneSurfaceBottom-fillSrcY, 0, bottomDestTop, VW, fillGapH);
    }
    ctx.drawImage(img, 0, apronMetrics.srcY, img.width, apronMetrics.srcH, 0, apronDestTop, VW, VH-apronDestTop);
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

function drawVerticalGradient(x0,y0,w,h,top,bot){
  const grd=ctx.createLinearGradient(0,y0,0,y0+h); grd.addColorStop(0,top); grd.addColorStop(1,bot);
  ctx.fillStyle=grd; ctx.fillRect(x0,y0,w,h);
}
function drawScene(n){
  const S=SCENES[sceneIdx];
  const m=trackMetrics(n);
  const sky=S.sky;
  const layers=S.layers||[];
  const backLayers=[], frontLayers=[];
  const artAlpha=(state==='lobby') ? gameAssets.lobbySceneReveal : 1;
  const groundTop=usesProportionalTrackTexture(S) ? Math.round(m.trackBottom+2) : Math.round(m.topPad+m.bandH+2);
  layers.forEach(function(layer){ (layer.front? frontLayers : backLayers).push(layer); });

  if(sky) drawVerticalGradient(0,0,VW,m.skyBottom,sky[0],sky[1]);
  if(S.backdrop && gameAssets.backgroundImages[S.backdrop] && artAlpha>0){
    ctx.save();
    ctx.globalAlpha=artAlpha;
    drawBackdropCover(gameAssets.backgroundImages[S.backdrop], m.skyBottom);
    ctx.restore();
  }

  if(artAlpha>0){
    ctx.save();
    ctx.globalAlpha=artAlpha;
    ctx.beginPath(); ctx.rect(0,0,VW,m.skyBottom); ctx.clip();
    backLayers.forEach(function(layer,i){
      const par=layer.parallax!=null? layer.parallax : defaultParallax(i,backLayers.length);
      drawParallaxLayer(gameAssets.backgroundImages[layer.src], par, m.skyBottom);
    });
    ctx.restore();
  }

  drawPixelLaneBand(S,m,n);
  drawPixelGround(groundTop,VH,S.groundDark,S.track,S.laneLine);
  if(S.trackTexture && gameAssets.backgroundImages[S.trackTexture] && artAlpha>0) {
    ctx.save();
    ctx.globalAlpha=artAlpha;
    drawTexturedLaneBand(S,m,n);
    ctx.restore();
  }

  const bgScale=backLayers.length && gameAssets.backgroundImages[backLayers[0].src]
    ? m.skyBottom/gameAssets.backgroundImages[backLayers[0].src].height : m.skyBottom/324;
  if(artAlpha>0){
    ctx.save();
    ctx.globalAlpha=artAlpha;
    frontLayers.forEach(function(layer,i){
      const par=layer.parallax!=null? layer.parallax : defaultParallax(backLayers.length+i,layers.length);
      drawFrontParallaxLayer(gameAssets.backgroundImages[layer.src], par, m.topPad, bgScale);
    });
    ctx.restore();
  }

  drawStartFinish(m);
}

function drawStartFinish(m){
  const S=SCENES[sceneIdx]||{};
  const top=m.topPad, h=m.bandH;
  const finishInsetTop=Math.max(0, Math.round(m.laneH*(S.finishLineInsetTopScale||0)));
  const finishInsetBottom=Math.max(0, Math.round(m.laneH*(S.finishLineInsetBottomScale||0)));
  const finishTop=top+finishInsetTop;
  const finishH=Math.max(8, h-finishInsetTop-finishInsetBottom);
  // start line (left)
  if(!S.hideRuntimeStartLine){
    var sx=worldToScreenX(START_X);
    ctx.fillStyle='rgba(255,255,255,.85)';
    ctx.fillRect(Math.round(sx)-1,top,3,h);
  }
  // finish: checkered + tape
  var fx=worldToScreenX(FINISH_X);
  if(fx>-30 && fx<VW+30){
    var cell=Math.max(6,Math.round(m.laneH/4));
    for(let yy=0; yy<finishH; yy+=cell){
      for(let k=0;k<2;k++){
        var on=((Math.floor(yy/cell)+k)%2)===0;
        ctx.fillStyle=on?'#fff':'#3d3018';
        ctx.fillRect(Math.round(fx)+k*cell, finishTop+yy, cell, Math.min(cell,finishH-yy));
      }
    }
    // finish pole + flag
    ctx.fillStyle='#d8d8d8'; ctx.fillRect(Math.round(fx)-3,finishTop-18,4,20);
    ctx.fillStyle='#ff4d4d'; ctx.fillRect(Math.round(fx)+1,finishTop-18,12,8);
  }
}

/* ============================================================
   SPRITE RASTERIZER + CACHE
   Pre-render each (char, color, frame) to an offscreen canvas once.
   ============================================================ */
const spriteCache={};

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
/* draw a cached sprite centered at screen (cx,cyBaseline), scaled to pixel size p */
function blitSprite(charIdx,color,frame,cx,cyBaseline,p,flash){
  const ch=CHARACTERS[charIdx];
  const size=spriteScreenSize(ch,p);
  const dx=Math.round(cx-size.w/2), dy=Math.round(cyBaseline-size.h);

  if(ch.sheet){
    const imgSrc=spriteSourceForFrame(ch, frame);
    const img=imgSrc ? gameAssets.sheetImages[imgSrc] : null;
    if(!img) return;
    const source=spriteSourceRectForFrame(ch, frame);
    ctx.drawImage(img,source.sx,source.sy,source.sw,source.sh,dx,dy,size.w,size.h);
    if(flash){
      ctx.globalAlpha=0.35; ctx.globalCompositeOperation='lighter';
      ctx.drawImage(img,source.sx,source.sy,source.sw,source.sh,dx,dy,size.w,size.h);
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
function characterIndexByKey(key, fallback){
  const idx=CHARACTERS.findIndex(function(char){ return char.key===key; });
  return idx>=0 ? idx : fallback;
}
let players=[
  {name:'',colorIdx:4,charIdx:characterIndexByKey('forest-ranger', 0)},
  {name:'',colorIdx:0,charIdx:characterIndexByKey('pirate', 1)},
  {name:'',colorIdx:3,charIdx:characterIndexByKey('anubis', 2)},
];
let racers=[], finishOrder=[];
let raceStartT=0, winnerCrossRealT=0, allDoneT=0, forceEndT=0;
let powerups=[], bananas=[], nextEventT=0, lastEventIdx=-1;
let countdownTimer=0, raceStartTimer=0, resultsTimer=0;

/* ---------- audio (same approach as before) ---------- */
let audioCtx=null, muted=false;
function ac(){ if(!audioCtx){ const A=window.AudioContext||window['webkitAudioContext']; if(A)audioCtx=new A(); } return audioCtx; }
function makePlayer(i){ return {name:'',colorIdx:i%COLORS.length,charIdx:i%CHAR_COUNT}; }
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
function displayName(p,i){return (p.name||'').trim()||getFallbackName(i);}
function newRacer(p,i){
  return {p:p,i:i,x:START_X,phase:rnd(0,6),pop:0,
    n1:rnd(0,6),n2:rnd(0,6),n3:rnd(0,6),
    nextBurst:rnd(1.5,4),burstEnd:-1,nextStumble:rnd(4,9),stumbleEnd:-1,
    boostEnd:-1,boostMult:1,starEnd:-1,zapEnd:-1,spinEnd:-1,
    shielded:false,dropBanana:false,lastPwT:-99,
    finished:false,place:0,ledOnce:false,finishT:0,settleX:0,neverLedFlag:false,
    laneSlot:i,laneCenterY:null,laneRepairCount:0};
}
function nextOpenLaneSlot(preferredSlots, occupied, visualLaneCount){
  for(let i=0;i<preferredSlots.length;i++){
    const slot=preferredSlots[i];
    if(!occupied.has(slot)) return slot;
  }
  for(let slot=0;slot<visualLaneCount;slot++){
    if(!occupied.has(slot)) return slot;
  }
  return Math.max(0, visualLaneCount-1);
}
function assignRacerLaneSlot(racer, slot, n, instant){
  const lane=laneGeometryForSlot(slot, n);
  racer.laneSlot=lane.slot;
  if(instant || !Number.isFinite(racer.laneCenterY)){
    racer.laneCenterY=lane.center;
  }
}
function alignRacersToFormation(options){
  const opts=options||{};
  const n=Math.max(racers.length,1);
  const desiredSlots=laneFormationSlots(n);
  const visualLaneCount=Math.max(1, getVisualTrackLaneCount(n));
  const occupied=new Set();
  racers.forEach(function(racer, idx){
    let slot=desiredSlots[idx];
    if(slot==null || occupied.has(slot)){
      slot=nextOpenLaneSlot(desiredSlots, occupied, visualLaneCount);
      racer.laneRepairCount=(racer.laneRepairCount||0)+1;
    }
    occupied.add(slot);
    assignRacerLaneSlot(racer, slot, n, !!opts.instant);
  });
}
function repairLaneAlignment(reason){
  if(!racers.length) return false;
  alignRacersToFormation({ instant: reason==='build' });
  if(typeof console!=='undefined' && console.warn && reason){
    console.warn('[lane-alignment] repaired racer lane assignments:', reason);
  }
  return true;
}
function validateLaneAssignments(n){
  const visualLaneCount=Math.max(1, getVisualTrackLaneCount(n));
  const occupied=new Set();
  for(let i=0;i<racers.length;i++){
    const racer=racers[i];
    if(!Number.isInteger(racer.laneSlot) || racer.laneSlot<0 || racer.laneSlot>=visualLaneCount) return false;
    if(occupied.has(racer.laneSlot)) return false;
    occupied.add(racer.laneSlot);
  }
  return true;
}
function updateLaneAlignment(dt){
  if(!racers.length) return;
  const n=Math.max(players.length,1);
  if(!validateLaneAssignments(n)){
    repairLaneAlignment('invalid-slot');
  }
  const ease=1-Math.exp(-Math.max(dt, 0)*14);
  racers.forEach(function(racer){
    const lane=laneGeometryForSlot(racer.laneSlot, n);
    if(!Number.isFinite(racer.laneCenterY)){
      racer.laneCenterY=lane.center;
      return;
    }
    racer.laneCenterY += (lane.center-racer.laneCenterY)*ease;
    if(Math.abs(lane.center-racer.laneCenterY)<0.1){
      racer.laneCenterY=lane.center;
    }
  });
  const minGap=Math.max(1, trackMetrics(n).laneH*0.72);
  const ordered=racers.slice().sort(function(a,b){ return a.laneCenterY-b.laneCenterY; });
  for(let i=1;i<ordered.length;i++){
    if((ordered[i].laneCenterY-ordered[i-1].laneCenterY)<minGap){
      repairLaneAlignment('overlap-detected');
      break;
    }
  }
}
function racerLaneGeometry(racer, n){
  const target=laneGeometryForSlot(racer.laneSlot, n);
  const centerY=Number.isFinite(racer.laneCenterY) ? racer.laneCenterY : target.center;
  return laneGeometryForSlot(racer.laneSlot, n, centerY);
}
function getLaneAlignmentReport(){
  const n=Math.max(players.length,1);
  return {
    playerCount: n,
    visualLaneCount: getVisualTrackLaneCount(n),
    formationSlots: laneFormationSlots(n).slice(),
    lanes: laneGeometries(n).map(function(lane){
      return {
        slot: lane.slot,
        top: Number(lane.top.toFixed(2)),
        center: Number(lane.center.toFixed(2)),
        bottom: Number(lane.bottom.toFixed(2)),
        height: Number(lane.height.toFixed(2)),
      };
    }),
    racers: racers.map(function(racer){
      const lane=racerLaneGeometry(racer, n);
      return {
        racerIndex: racer.i,
        laneSlot: racer.laneSlot,
        laneCenterY: Number(lane.center.toFixed(2)),
        laneTop: Number(lane.top.toFixed(2)),
        laneBottom: Number(lane.bottom.toFixed(2)),
        laneRepairCount: racer.laneRepairCount||0,
      };
    }),
  };
}
function buildRacers(){
  racers=players.map(function(p,i){return newRacer(p,i);});
  finishOrder=[];
  alignRacersToFormation({ instant:true });
}

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
    const ch=CHARACTERS[r.p.charIdx];
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
    const paceMul=(ch.sheet && ch.sheet.paceMul) ? ch.sheet.paceMul : 1;
    r.phase += Math.max(gait,0.2)*dt*3.4*paceMul;
    r.gait=gait;
  });
  // expire dead bananas + respawn boxes
  for(let i=bananas.length-1;i>=0;i--){ var b=bananas[i]; if(b.dead && realT-b.deadT>0.5) bananas.splice(i,1); }
  if(state==='racing'){ powerups.forEach(function(b){ if(!b.alive && realT>b.respawnAt) placeBox(b,false); }); }
}

/** Pixel-art mystery crate — golden box with ? glyph and soft pulse. */
function drawPowerupBox(cx, cy, laneH, bob, spin){
  if(gameAssets.powerupImage){
    const pulse=1+0.03*Math.sin(clockT*5+spin);
    const baseSize=powerupBoxRenderSize(laneH);
    const drawW=Math.round(baseSize*pulse);
    const drawH=Math.round(drawW*(POWERUP_IMAGE_BOUNDS.srcH/POWERUP_IMAGE_BOUNDS.srcW));
    const drawX=Math.round(cx-drawW/2);
    const drawY=Math.round(cy-drawH/2+bob*0.75);

    ctx.fillStyle='rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(cx, drawY+drawH*0.9, drawW*0.26, Math.max(4,drawH*0.1), 0,0,7);
    ctx.fill();

    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(
      gameAssets.powerupImage,
      POWERUP_IMAGE_BOUNDS.srcX,
      POWERUP_IMAGE_BOUNDS.srcY,
      POWERUP_IMAGE_BOUNDS.srcW,
      POWERUP_IMAGE_BOUNDS.srcH,
      drawX,
      drawY,
      drawW,
      drawH
    );
    return;
  }

  const cell=Math.max(3,Math.round(powerupBoxRenderSize(laneH)/12));
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
  const p=PXS;                                   // base sprite pixel size
  // power-up boxes
  if(powerUpsOn && (state==='racing'||state==='countdown')){
    powerups.forEach(function(b){ if(!b.alive)return; var sx=worldToScreenX(b.x); if(sx<-20||sx>VW+20)return;
      var cy=laneCenterY(b.lane,n); var bob=Math.sin(clockT*3+b.spin)*3;
      drawPowerupBox(sx,cy,m.laneH,bob,b.spin);
    });
  }
  // bananas
  bananas.forEach(function(b){ if(b.dead)return; var sx=worldToScreenX(b.x); if(sx<-20||sx>VW+20)return;
    var cy=laneCenterY(b.lane,n); var s=Math.max(7,p*3);
    ctx.fillStyle='#ffe14d'; ctx.fillRect(Math.round(sx-s/2),Math.round(cy-2),s,4); ctx.fillStyle='#caa12e'; ctx.fillRect(Math.round(sx-s/2),Math.round(cy+1),s,1);
  });

  // racers — draw far lane (top) first for correct overlap
  var order=racers.map(function(_,idx){return idx;}).sort(function(a,b){
    return racerLaneGeometry(racers[a], n).center-racerLaneGeometry(racers[b], n).center;
  });
  order.forEach(function(idx){
    var r=racers[idx]; var sx=worldToScreenX(r.x);
    var ch=CHARACTERS[r.p.charIdx];
    var frameCount=frameCountFor(ch);
    var idleFrame=idleFrameFor(ch);
    var frame=(r.gait>0.3)? (Math.floor(r.phase)%frameCount) : idleFrame;
    var popScale=r.pop<1? (0.4+0.6*r.pop):1;
    // vertical bob: peaks on the "pass" frames of the cycle
    var bobBase=Math.max(1.5, Math.min(p*1.1,m.laneH*0.08));
    var bobMul=(ch.sheet && ch.sheet.bobMul) ? ch.sheet.bobMul : 1;
    var bob=(r.gait>0.3)? Math.abs(Math.sin(r.phase*Math.PI*0.5))*bobBase*bobMul : 0;
    var layout=racerLayout(ch, racerLaneGeometry(r, n), popScale, bob);
    var scale=layout.scale;
    var sz=layout.size;
    var baseline=layout.baseline;
    // shadow
    ctx.fillStyle='rgba(0,0,0,.20)'; var shW=sz.w*0.55; ctx.beginPath();
    ctx.ellipse(sx, layout.shadowY, shW*0.5, Math.max(3,Math.min(p*1.4,m.laneH*0.16)), 0,0,7); ctx.fill();
    // shield effect
    if(r.shielded){ ctx.strokeStyle='rgba(159,232,255,.9)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(sx,baseline-sz.h*0.5,sz.w*0.45,0,7); ctx.stroke(); }
    var starred=r.starEnd>clockT;
    blitSprite(r.p.charIdx, COLORS[r.p.colorIdx], frame, sx, baseline, scale, starred);
    auditLaneContainment(layout,n);
    // floating fx glyph
    if(r.fxT && realT-r.fxT<0.9){ var age=realT-r.fxT; ctx.globalAlpha=Math.max(0,1-age*1.1);
      ctx.fillStyle=r.fxColor||'#fff'; ctx.font='bold '+Math.round(p*5)+'px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText(r.fxText||'', sx, baseline-sz.h - age*22); ctx.globalAlpha=1; ctx.textAlign='left'; }
  });
}

/* ============================================================
   CAMERA (horizontal scroll, follow the pack)
   ============================================================ */
function updateCamera(dt){
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
let lobbyEl, lobbyHomeEl, lobbyPanelsWrap, lobbyBackBtn, listEl, addBtn, startBtn, panelStartBtn, helpStartBtn, restartBtn, hudEl, hudRows, countWrap, countNum, resultsEl, eventToast, finishFlash, photoTag, orientationPromptEl, orientationPromptBtn;
let lobbyTabBtns=[], lobbyPanels=[];
let paintSceneSeg=function(){};
let paintLengthSeg=function(){};
let mobileRosterIdx=0;
let desktopRosterIdx=0;

function syncRestartButton(){
  if(!restartBtn) return;
  restartBtn.classList.toggle('hidden', state==='lobby');
}
function sceneDisplayName(scene){
  const copy=getSceneCopy(scene.key);
  return copy && copy.name ? copy.name : scene.name;
}
function scenePickerLabel(scene){
  const copy=getSceneCopy(scene.key);
  return copy && copy.pickerLabel ? copy.pickerLabel : (scene.pickerLabel || scene.name);
}
function updateSceneToggleLabel(activeIdx){
  const toggle=document.getElementById('scenePickerToggle');
  if(!toggle) return;
  const scene=SCENES[activeIdx];
  toggle.title=t('lobby.chooseScene');
  toggle.setAttribute('aria-label', t('lobby.chooseScene'));
  toggle.innerHTML=
    '<img class="scene-toggle-thumb" src="'+escapeHtml(scene.backdrop)+'" alt="">'
    +'<span class="scene-toggle-copy"><span class="scene-toggle-name">'+escapeHtml(sceneDisplayName(scene))+'</span><span class="scene-toggle-meta">'+escapeHtml(scenePickerLabel(scene))+'</span></span>'
    +'<span class="scene-toggle-right"><span class="meta">'+(activeIdx+1)+' / '+SCENES.length+'</span><span class="caret" aria-hidden="true"></span></span>';
}
function renderLengthSeg(){
  const seg=document.getElementById('lengthSeg');
  if(!seg) return;
  seg.innerHTML='';
  LENGTHS.forEach(function(_, idx){
    const lengthCopy=getLengthCopy(idx);
    const button=document.createElement('button');
    button.type='button';
    button.dataset.i=String(idx);
    button.innerHTML=escapeHtml(lengthCopy.label)+'<span class="sub">'+escapeHtml(lengthCopy.subLabel)+'</span>';
    seg.appendChild(button);
  });
  paintLengthSeg();
}
function updateLanguageSwitcher(){
  const switcher=document.getElementById('languageSwitch');
  if(!switcher) return;
  switcher.setAttribute('aria-label', t('controls.languageAria'));
  const activeLanguage=getLanguage();
  Array.prototype.forEach.call(switcher.querySelectorAll('[data-lang]'), function(button){
    const active=button.dataset.lang===activeLanguage;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}
function shouldShowOrientationPrompt(){
  return isPortraitMobile() && !orientationPromptDismissed;
}
function syncOrientationPrompt(){
  if(!orientationPromptEl) return;
  const show=shouldShowOrientationPrompt();
  orientationPromptEl.classList.toggle('hidden', !show);
  orientationPromptEl.setAttribute('aria-hidden', show ? 'false' : 'true');
}
function dismissOrientationPrompt(){
  orientationPromptDismissed=true;
  writeStoredFlag(ORIENTATION_PROMPT_STORAGE_KEY, true);
  syncOrientationPrompt();
}
function setLobbyHomeVisible(visible){
  if(lobbyHomeEl) lobbyHomeEl.classList.toggle('hidden', !visible);
  if(lobbyPanelsWrap) lobbyPanelsWrap.classList.toggle('hidden', visible);
}
function showLobbyHome(){
  setLobbyHomeVisible(true);
}
function openLobbyPanel(tab){
  showLobbyTab(tab);
  setLobbyHomeVisible(false);
}
function applyStaticTranslations(){
  applyDocumentTranslations();
  const muteBtn=document.getElementById('muteBtn');
  const lobbyTabs=document.querySelector('.lobby-tabs');
  const powerupLabels={
    boost:'pw-boost',
    star:'pw-star',
    banana:'pw-banana',
    lightning:'pw-lightning',
    shield:'pw-shield',
  };

  if(muteBtn){
    muteBtn.title=t('controls.soundTitle');
    muteBtn.setAttribute('aria-label', t('controls.soundAria'));
  }
  if(restartBtn){
    restartBtn.title=t('controls.restartTitle');
    restartBtn.setAttribute('aria-label', t('controls.restartAria'));
  }
  if(document.getElementById('lobbyEyebrow')) document.getElementById('lobbyEyebrow').textContent=t('lobby.eyebrow');
  if(document.getElementById('lobbyTagline')) document.getElementById('lobbyTagline').innerHTML=t('lobby.taglineHTML');
  if(document.getElementById('startBtnLabel')) document.getElementById('startBtnLabel').textContent=t('lobby.startGame');
  if(document.getElementById('menuRacersLabel')) document.getElementById('menuRacersLabel').textContent=t('lobby.tabs.roster');
  if(document.getElementById('menuSetupLabel')) document.getElementById('menuSetupLabel').textContent=t('lobby.tabs.setup');
  if(document.getElementById('menuHelpLabel')) document.getElementById('menuHelpLabel').textContent=t('lobby.help.title');
  if(document.getElementById('menuRulesLabel')) document.getElementById('menuRulesLabel').textContent=t('lobby.rules.title');
  if(lobbyBackBtn) lobbyBackBtn.textContent=t('controls.back');
  if(document.getElementById('setupTitle')) document.getElementById('setupTitle').textContent=t('lobby.tabs.setup');
  if(document.getElementById('setupHint')) document.getElementById('setupHint').textContent=t('lobby.setupHint');
  if(lobbyTabs) lobbyTabs.setAttribute('aria-label', t('lobby.sectionsAria'));
  if(document.getElementById('tab-roster')) document.getElementById('tab-roster').textContent=t('lobby.tabs.roster');
  if(document.getElementById('tab-setup')) document.getElementById('tab-setup').textContent=t('lobby.tabs.setup');
  if(document.getElementById('tab-rules')) document.getElementById('tab-rules').textContent=t('lobby.tabs.rules');
  if(document.getElementById('rosterLabel')) document.getElementById('rosterLabel').textContent=t('lobby.roster.title');
  if(document.getElementById('rosterHint')) document.getElementById('rosterHint').innerHTML=t('lobby.roster.hintHTML');
  if(document.getElementById('rosterMobileHint')) document.getElementById('rosterMobileHint').textContent=t('lobby.roster.mobileHint');
  if(document.getElementById('sceneLabel')) document.getElementById('sceneLabel').textContent=t('lobby.scene');
  if(document.getElementById('raceLengthLabel')) document.getElementById('raceLengthLabel').textContent=t('lobby.raceLength');
  if(document.getElementById('powerUpsTitle')) document.getElementById('powerUpsTitle').textContent=t('lobby.powerUpsTitle');
  if(document.getElementById('powerUpsDesc')) document.getElementById('powerUpsDesc').textContent=t('lobby.powerUpsDesc');
  if(document.getElementById('setupPowerupsLegend')) document.getElementById('setupPowerupsLegend').innerHTML=t('lobby.setupPowerupsHTML');
  if(document.getElementById('howToPlayLabel')) document.getElementById('howToPlayLabel').textContent=t('lobby.help.title');
  if(document.getElementById('howToPlayHint')) document.getElementById('howToPlayHint').textContent=t('lobby.help.hint');
  if(document.getElementById('howToPlayBody')) document.getElementById('howToPlayBody').innerHTML=t('lobby.help.bodyHTML');
  if(helpStartBtn) helpStartBtn.textContent=t('lobby.help.cta');
  if(document.getElementById('rulesLabel')) document.getElementById('rulesLabel').textContent=t('lobby.rules.title');
  if(document.getElementById('rulesHint')) document.getElementById('rulesHint').textContent=t('lobby.rules.hint');
  if(document.getElementById('rulesBody')) document.getElementById('rulesBody').innerHTML=t('lobby.rules.bodyHTML');
  if(panelStartBtn) panelStartBtn.textContent=t('lobby.startRace');
  Array.prototype.forEach.call(document.querySelectorAll('[data-powerup]'), function(node){
    const powerKey=node.getAttribute('data-powerup');
    const iconClass=powerupLabels[powerKey];
    if(!iconClass) return;
    node.innerHTML='<i class="'+iconClass+'"></i> '+escapeHtml(t('powerups.'+powerKey));
  });
  if(document.getElementById('lobbyFootnote')) document.getElementById('lobbyFootnote').textContent=t('lobby.footnote');
  if(document.getElementById('setupFootnote')) document.getElementById('setupFootnote').textContent=t('lobby.footnote');
  if(document.getElementById('helpFootnote')) document.getElementById('helpFootnote').textContent=t('lobby.footnote');
  if(document.getElementById('rulesFootnote')) document.getElementById('rulesFootnote').textContent=t('lobby.footnote');
  if(photoTag) photoTag.textContent=t('results.eyebrow').toUpperCase();
  if(document.getElementById('hudTitle')) document.getElementById('hudTitle').textContent=t('hud.title');
  if(document.getElementById('orientationPromptTitle')) document.getElementById('orientationPromptTitle').textContent=t('orientationPrompt.title');
  if(document.getElementById('orientationPromptBody')) document.getElementById('orientationPromptBody').innerHTML=t('orientationPrompt.bodyHTML');
  if(orientationPromptBtn) orientationPromptBtn.textContent=t('orientationPrompt.button');
  if(document.getElementById('orientationPromptFootnote')) document.getElementById('orientationPromptFootnote').textContent=t('orientationPrompt.footnote');
  if(document.getElementById('resultsEyebrow')) document.getElementById('resultsEyebrow').textContent=t('results.eyebrow');
  if(document.getElementById('resultsTitle')) document.getElementById('resultsTitle').textContent=t('results.title');
  if(document.getElementById('againBtn')) document.getElementById('againBtn').textContent=t('results.raceAgain');
  if(document.getElementById('editBtn')) document.getElementById('editBtn').textContent=t('results.editPlayers');
  if(document.getElementById('resultsFootnote')) document.getElementById('resultsFootnote').textContent=t('results.hydrate');
  updateSceneToggleLabel(sceneIdx);
  updateLanguageSwitcher();
}
function refreshLocalizedUi(){
  applyStaticTranslations();
  renderSceneSeg();
  renderLengthSeg();
  if(listEl) renderLobby();
  if(state==='finished' && finishOrder.length) renderResults();
  if(state==='racing' || state==='countdown') renderHUD();
}
function showLobbyTab(tab){
  lobbyTabBtns.forEach(function(btn){
    const active=btn.dataset.tab===tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  lobbyPanels.forEach(function(panel){
    const active=panel.dataset.panel===tab;
    panel.classList.toggle('hidden', !active);
    panel.classList.toggle('active', active);
  });
}
function clearRaceTimers(){
  clearTimeout(countdownTimer); countdownTimer=0;
  clearTimeout(raceStartTimer); raceStartTimer=0;
  clearTimeout(resultsTimer); resultsTimer=0;
}
function startRace(){ clearRaceTimers(); resetLaneAudit(); hideToast(); setSlowmo(false); buildRacers(); spawnPowerups();
  lobbyEl.classList.add('hidden'); resultsEl.classList.add('hidden'); countWrap.classList.add('hidden'); hudEl.classList.remove('hidden'); renderHUD();
  state='countdown'; syncRestartButton(); camX=START_X-4; winnerCrossRealT=0; allDoneT=0; forceEndT=0; nextEventT=0; runCountdown(); }
function runCountdown(){ countWrap.classList.remove('hidden'); const steps=['3','2','1',t('countdown.go')]; var i=0;
  (function step(){ countNum.textContent=steps[i]; countNum.style.animation='none'; void countNum.offsetWidth; countNum.style.animation='';
    if(i<3)sfxCount(); else sfxGo(); i++;
    if(i<steps.length){ countdownTimer=setTimeout(step,820); }
    else { raceStartTimer=setTimeout(function(){ countWrap.classList.add('hidden'); state='racing'; syncRestartButton(); raceStartT=clockT; forceEndT=0; nextEventT=realT+rnd(7,10); },600); } })(); }

function endRace(){ state='finished'; syncRestartButton(); hideToast(); showResults(); setTimeout(function(){ hudEl.classList.add('hidden'); },400); }

function sipInfo(place,total){ if(place===1)return {txt:t('results.sipGive',{ total: total }),cls:'give'}; if(place===total)return {txt:t('results.sipChug',{ total: total+1 }),cls:'chug'}; return {txt:t('results.sipCount',{ place: place }),cls:''}; }
function escapeHtml(s){return (''+s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function renderResults(){ const total=racers.length, w=finishOrder[0];
  if(!w) return;
  document.getElementById('resSub').textContent=t('results.wonIn',{ name: displayName(w.p,w.i), time: w.finishT.toFixed(1) });
  const rowsEl=document.getElementById('resRows'); rowsEl.innerHTML=''; const medals=['1','2','3'];
  finishOrder.forEach(function(r,i){ var place=i+1, info=sipInfo(place,total), slow=r.neverLedFlag;
    var row=document.createElement('div'); row.className='res-row'+(place===1?' first':'');
    row.innerHTML='<div class="res-medal">'+(medals[i]||(place+'.'))+'</div><div class="res-dot" style="background:'+COLORS[r.p.colorIdx]+'"></div><div class="res-name">'+escapeHtml(displayName(r.p,r.i))+'</div><div class="res-sips '+info.cls+'">'+info.txt+(slow?' +1':'')+'</div>';
    rowsEl.appendChild(row); });
  const slow=finishOrder.filter(function(r){return r.neverLedFlag;}), noteEl=document.getElementById('resNote');
  noteEl.innerHTML=slow.length?('<b>'+escapeHtml(t('results.slowpokeTitle'))+'</b> '+escapeHtml(t('results.slowpokeNote',{ names: slow.map(function(r){return displayName(r.p,r.i);}).join(', ') }))):escapeHtml(t('results.everyoneLed'));
}
function showResults(){
  renderResults();
  resultsTimer=setTimeout(function(){ resultsEl.classList.remove('hidden'); },800); }

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
  const tpl=[ function(){return leader?t('toasts.leader',{ name: displayName(leader.p,leader.i) }):''; },
    function(){return last?t('toasts.last',{ name: displayName(last.p,last.i) }):''; },
    function(){return t('toasts.cheers'); },
    function(){return t('toasts.lastToRaise'); },
    function(){return leader?t('toasts.leaderPicks',{ name: displayName(leader.p,leader.i) }):''; },
    function(){return t('toasts.powerupHolders'); } ];
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
    const previewFrame=idleFrameFor(ch);
    const imgSrc=spriteSourceForFrame(ch, previewFrame);
    const img=imgSrc ? gameAssets.sheetImages[imgSrc] : null;
    const source=spriteSourceRectForFrame(ch, previewFrame);
    const fw=source.sw, fh=source.sh;
    const maxW=GW*3, maxH=GH*3;
    const scale=Math.min(maxW/fw, maxH/fh);
    canvas.width=Math.ceil(fw*scale);
    canvas.height=Math.ceil(fh*scale);
    const cx=canvas.getContext('2d'); cx.imageSmoothingEnabled=false; cx.clearRect(0,0,canvas.width,canvas.height);
    if(img) cx.drawImage(img,source.sx,source.sy,source.sw,source.sh,0,0,canvas.width,canvas.height);
    return;
  }
  const cell=3; canvas.width=GW*cell; canvas.height=GH*cell;
  const cx=canvas.getContext('2d'); cx.imageSmoothingEnabled=false; cx.clearRect(0,0,canvas.width,canvas.height);
  function g(x,y,w,h,c){ cx.fillStyle=c; cx.fillRect(x*cell,y*cell,w*cell,h*cell); }
  ch.draw(g,0,color);
}
function renderSceneSeg(){
  const seg=document.getElementById('sceneSeg');
  seg.innerHTML='';
  SCENES.forEach(function(scene, idx){
    const button=document.createElement('button');
    button.type='button';
    button.dataset.i=String(idx);
    button.title=sceneDisplayName(scene);
    button.innerHTML='<img class="scene-card-thumb" src="'+escapeHtml(scene.backdrop)+'" alt=""><span class="scene-card-copy"><span class="scene-card-name">'+escapeHtml(scenePickerLabel(scene))+'</span><span class="scene-card-meta">'+(idx+1)+' / '+SCENES.length+'</span></span>';
    seg.appendChild(button);
  });
  updateSceneToggleLabel(sceneIdx);
  paintSceneSeg();
}
function freeColor(){ const used=players.map(function(p){return p.colorIdx;}); for(let i=0;i<COLORS.length;i++) if(used.indexOf(i)<0)return i; return Math.floor(Math.random()*COLORS.length); }
function nextFreeColor(from){ const used=players.map(function(p){return p.colorIdx;}); for(let k=1;k<=COLORS.length;k++){ const i=(from+k)%COLORS.length; if(used.indexOf(i)<0)return i; } return (from+1)%COLORS.length; }

function isCompactLobby(){ return effectiveViewportWidth()<=620; }
function setMobileRosterIdx(idx){
  if(!players.length){ mobileRosterIdx=0; return; }
  mobileRosterIdx=(idx+players.length)%players.length;
}
function setDesktopRosterIdx(idx){
  if(!players.length){ desktopRosterIdx=0; return; }
  desktopRosterIdx=(idx+players.length)%players.length;
}
function removePlayerAt(idx){
  players.splice(idx,1);
  mobileRosterIdx=Math.max(0,Math.min(mobileRosterIdx,players.length-1));
  desktopRosterIdx=Math.max(0,Math.min(desktopRosterIdx,players.length-1));
  buildRacers();
  invalidateTrackMetrics();
  renderLobby();
}
function makePlayerEditor(p,i,mode){
  const mobile=mode==='mobile';
  const desktop=mode==='desktop';
  const row=document.createElement('div'); row.className='player-row'+(mobile?' player-row-mobile':desktop?' player-row-desktop':'');
  const sw=document.createElement('div'); sw.className='swatch'; sw.style.background=COLORS[p.colorIdx]; sw.title=t('player.colorTitle');
  const pick=document.createElement('button'); pick.className='pick'; pick.title=t('player.changeRacerTitle');
  const pc=document.createElement('canvas'); pick.appendChild(pc); drawPickPreview(pc,p.charIdx,COLORS[p.colorIdx]);
  sw.addEventListener('click',function(){ p.colorIdx=nextFreeColor(p.colorIdx); sw.style.background=COLORS[p.colorIdx]; drawPickPreview(pc,p.charIdx,COLORS[p.colorIdx]); });
  pick.addEventListener('click',function(){ p.charIdx=(p.charIdx+1)%CHAR_COUNT; drawPickPreview(pc,p.charIdx,COLORS[p.colorIdx]); });
  const input=document.createElement('input'); input.maxLength=14; input.placeholder=getFallbackName(i); input.value=p.name;
  input.addEventListener('input',function(){ p.name=input.value; });
  if(mobile){
    const head=document.createElement('div'); head.className='player-mobile-head';
    const title=document.createElement('div'); title.className='player-mobile-title'; title.textContent=t('player.racerLabel',{ num: i+1 });
    head.appendChild(title);
    if(players.length>2){
      const rm=document.createElement('button'); rm.className='remove'; rm.textContent='X'; rm.title=t('player.removeTitle');
      rm.addEventListener('click',function(){ removePlayerAt(i); });
      head.appendChild(rm);
    }
    const controls=document.createElement('div'); controls.className='player-mobile-controls';
    const art=document.createElement('div'); art.className='player-mobile-art';
    art.appendChild(sw); art.appendChild(pick);
    controls.appendChild(art);
    controls.appendChild(input);
    row.appendChild(head); row.appendChild(controls);
    return row;
  }
  if(desktop){
    const head=document.createElement('div'); head.className='player-desktop-head';
    const title=document.createElement('div'); title.className='player-desktop-title'; title.textContent=t('player.racerLabel',{ num: i+1 });
    head.appendChild(title);
    if(players.length>2){
      const rm=document.createElement('button'); rm.className='remove'; rm.textContent='X'; rm.title=t('player.removeTitle');
      rm.addEventListener('click',function(){ removePlayerAt(i); });
      head.appendChild(rm);
    }
    const controls=document.createElement('div'); controls.className='player-desktop-controls';
    controls.appendChild(sw); controls.appendChild(pick); controls.appendChild(input);
    row.appendChild(head); row.appendChild(controls);
    return row;
  }
  row.appendChild(sw); row.appendChild(pick); row.appendChild(input);
  if(players.length>2){
    const rm=document.createElement('button'); rm.className='remove'; rm.textContent='X'; rm.title=t('player.removeTitle');
    rm.addEventListener('click',function(){ removePlayerAt(i); });
    row.appendChild(rm);
  }
  return row;
}
function renderLobby(){ listEl.innerHTML='';
  if(isCompactLobby()){
    setMobileRosterIdx(mobileRosterIdx);
    const counter=document.createElement('div');
    counter.className='player-mobile-count';
    counter.textContent=t('lobby.rosterSelected',{ count: players.length, max: MAX_PLAYERS });
    listEl.appendChild(counter);

    const cards=document.createElement('div');
    cards.className='player-mobile-card-list';
    for(let i=0;i<MAX_PLAYERS;i+=1){
      if(i<players.length){
        const p=players[i];
        const card=document.createElement('div');
        card.className='player-mobile-card'+(i===mobileRosterIdx?' active':'');
        card.style.setProperty('--racer-card', COLORS[p.colorIdx]);
        card.title=displayName(p,i);
        card.addEventListener('click',function(){ mobileRosterIdx=i; renderLobby(); });

        const artWrap=document.createElement('div');
        artWrap.className='player-mobile-card-art';

        const spriteBtn=document.createElement('button');
        spriteBtn.type='button';
        spriteBtn.className='player-mobile-card-sprite';
        spriteBtn.title=t('player.changeRacerTitle');
        spriteBtn.addEventListener('click',function(e){
          e.stopPropagation();
          mobileRosterIdx=i;
          p.charIdx=(p.charIdx+1)%CHAR_COUNT;
          renderLobby();
        });
        const spriteCanvas=document.createElement('canvas');
        spriteCanvas.width=44; spriteCanvas.height=44;
        spriteBtn.appendChild(spriteCanvas);
        drawPickPreview(spriteCanvas,p.charIdx,COLORS[p.colorIdx]);

        const swatchBtn=document.createElement('button');
        swatchBtn.type='button';
        swatchBtn.className='player-mobile-card-color';
        swatchBtn.style.background=COLORS[p.colorIdx];
        swatchBtn.title=t('player.colorTitle');
        swatchBtn.addEventListener('click',function(e){
          e.stopPropagation();
          mobileRosterIdx=i;
          p.colorIdx=nextFreeColor(p.colorIdx);
          renderLobby();
        });

        artWrap.appendChild(spriteBtn);
        artWrap.appendChild(swatchBtn);

        const copy=document.createElement('div');
        copy.className='player-mobile-card-copy';

        const label=document.createElement('div');
        label.className='player-mobile-card-label';
        label.textContent=t('player.racerSlot',{ num: i+1 });

        const input=document.createElement('input');
        input.className='player-mobile-card-input';
        input.maxLength=14;
        input.placeholder=getFallbackName(i);
        input.value=p.name;
        input.addEventListener('click',function(e){
          e.stopPropagation();
          mobileRosterIdx=i;
        });
        input.addEventListener('input',function(){
          p.name=input.value;
          updateCompactRosterCardNames();
        });

        copy.appendChild(label);
        copy.appendChild(input);

        const status=document.createElement('div');
        status.className='player-mobile-card-status';
        status.setAttribute('aria-hidden','true');
        status.textContent='✓';

        card.appendChild(artWrap);
        card.appendChild(copy);
        card.appendChild(status);
        cards.appendChild(card);
      } else {
        const slot=document.createElement('button');
        slot.type='button';
        slot.className='player-mobile-slot player-mobile-slot-empty';
        slot.innerHTML='<span class="player-mobile-slot-plus">+</span><span class="player-mobile-slot-label">'+escapeHtml(t('lobby.addRacer'))+'</span>';
        slot.title=t('lobby.addPlayer',{ count: players.length, max: MAX_PLAYERS });
        slot.disabled=players.length>=MAX_PLAYERS;
        slot.addEventListener('click',function(){
          if(players.length>=MAX_PLAYERS) return;
          players.push({name:'',colorIdx:freeColor(),charIdx:players.length%CHAR_COUNT});
          mobileRosterIdx=players.length-1;
          renderLobby();
        });
        cards.appendChild(slot);
      }
    }
    listEl.appendChild(cards);

  } else {
    setDesktopRosterIdx(desktopRosterIdx);
    const activePlayer=players[desktopRosterIdx];
    const tabs=document.createElement('div'); tabs.className='player-desktop-tabs';
    players.forEach(function(p,i){
      const slot=document.createElement('button');
      slot.type='button';
      slot.className='player-desktop-slot'+(i===desktopRosterIdx?' active':'');
      slot.innerHTML='<span class="player-desktop-slot-dot" style="background:'+COLORS[p.colorIdx]+'"></span><span class="player-desktop-slot-copy"><span class="player-desktop-slot-num">'+escapeHtml(t('player.racerSlot',{ num: i+1 }))+'</span><span class="player-desktop-slot-name">'+escapeHtml(displayName(p,i))+'</span></span>';
      slot.title=displayName(p,i);
      slot.addEventListener('click',function(){ desktopRosterIdx=i; renderLobby(); });
      tabs.appendChild(slot);
    });
    listEl.appendChild(tabs);
    listEl.appendChild(makePlayerEditor(activePlayer,desktopRosterIdx,'desktop'));
  }
  addBtn.textContent=players.length>=MAX_PLAYERS
    ? t('lobby.rosterFull',{ max: MAX_PLAYERS })
    : t('lobby.addPlayer',{ count: players.length, max: MAX_PLAYERS });
  addBtn.disabled=players.length>=MAX_PLAYERS; addBtn.style.opacity=addBtn.disabled?0.5:1;
}

function updateCompactRosterCardNames(){
  if(!isCompactLobby()) return;
  Array.prototype.forEach.call(document.querySelectorAll('.player-mobile-card-input'), function(input, idx){
    const p=players[idx];
    if(!p) return;
    input.value=p.name;
  });
}

function wireSeg(id,getIdx,setIdx,onPaint){ const seg=document.getElementById(id);
  function paint(){
    const activeIdx=getIdx();
    Array.prototype.forEach.call(seg.children,function(b){ b.classList.toggle('active',+b.dataset.i===activeIdx); });
    if(onPaint) onPaint(activeIdx);
  }
  seg.addEventListener('click',function(e){ const b=e.target.closest('button'); if(!b)return; setIdx(+b.dataset.i); paint(); }); paint(); return paint;
}

function bindUi(){
  view=document.getElementById('game');
  ctx=view.getContext('2d');
  view.style.transition='opacity 160ms ease-out';
  view.style.opacity='0';
  window.addEventListener('resize',function(){
    resize();
    syncOrientationPrompt();
    if(listEl&&state==='lobby') renderLobby();
  });
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
  panelStartBtn=document.getElementById('panelStartBtn');
  helpStartBtn=document.getElementById('helpStartBtn');
  restartBtn=document.getElementById('restartBtn');
  hudEl=document.getElementById('hud');
  hudRows=document.getElementById('hudRows');
  countWrap=document.getElementById('countWrap');
  countNum=document.getElementById('countNum');
  resultsEl=document.getElementById('results');
  eventToast=document.getElementById('eventToast');
  finishFlash=document.getElementById('finishFlash');
  photoTag=document.getElementById('photoTag');
  orientationPromptEl=document.getElementById('orientationPrompt');
  orientationPromptBtn=document.getElementById('orientationPromptBtn');
  lobbyHomeEl=document.getElementById('lobbyHome');
  lobbyPanelsWrap=document.getElementById('lobbyPanelsWrap');
  lobbyBackBtn=document.getElementById('lobbyBackBtn');
  lobbyTabBtns=Array.prototype.slice.call(document.querySelectorAll('.lobby-tab'));
  lobbyPanels=Array.prototype.slice.call(document.querySelectorAll('.lobby-panel'));
  Array.prototype.forEach.call(document.querySelectorAll('#languageSwitch [data-lang]'), function(button){
    button.addEventListener('click', function(){
      setLanguage(button.dataset.lang);
    });
  });

  document.getElementById('againBtn').addEventListener('click',function(){ resultsEl.classList.add('hidden'); startRace(); });
  document.getElementById('editBtn').addEventListener('click',function(){ clearRaceTimers(); resultsEl.classList.add('hidden'); countWrap.classList.add('hidden'); state='lobby'; syncRestartButton(); hudEl.classList.add('hidden'); buildRacers(); renderLobby(); showLobbyHome(); lobbyEl.classList.remove('hidden'); });
  restartBtn.addEventListener('click',function(){ if(state==='lobby')return; startRace(); });
  if(orientationPromptBtn){
    orientationPromptBtn.addEventListener('click', dismissOrientationPrompt);
  }
  if(lobbyBackBtn){
    lobbyBackBtn.addEventListener('click', showLobbyHome);
  }
  lobbyTabBtns.forEach(function(btn){
    btn.addEventListener('click',function(){ showLobbyTab(btn.dataset.tab); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-lobby-target]'), function(button){
    button.addEventListener('click', function(){
      openLobbyPanel(button.dataset.lobbyTarget);
    });
  });

  addBtn.addEventListener('click',function(){ if(players.length>=MAX_PLAYERS)return;
    players.push({name:'',colorIdx:freeColor(),charIdx:players.length%CHAR_COUNT});
    mobileRosterIdx=players.length-1;
    desktopRosterIdx=players.length-1;
    buildRacers();
    invalidateTrackMetrics();
    renderLobby();
    const inputs=listEl.querySelectorAll('input');
    if(inputs.length){
      const latest=inputs[inputs.length-1];
      latest.focus();
    }
  });

  renderSceneSeg();
  renderLengthSeg();
  const sceneSeg=document.getElementById('sceneSeg');
  const sceneToggle=document.getElementById('scenePickerToggle');
  paintSceneSeg=wireSeg('sceneSeg',function(){return sceneIdx;},function(i){sceneIdx=i; invalidateTrackMetrics();},function(activeIdx){
    if(sceneToggle){
      updateSceneToggleLabel(activeIdx);
      sceneSeg.classList.remove('open');
      sceneToggle.setAttribute('aria-expanded','false');
    }
  });
  if(sceneToggle){
    sceneToggle.addEventListener('click',function(){
      const open=!sceneSeg.classList.contains('open');
      sceneSeg.classList.toggle('open', open);
      sceneToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  paintLengthSeg=wireSeg('lengthSeg',function(){return lengthIdx;},function(i){lengthIdx=i; START_X=LENGTHS[i].start; FINISH_X=LENGTHS[i].finish;});
  document.getElementById('powerToggle').addEventListener('change',function(e){ powerUpsOn=e.target.checked; });
  function startRaceFromLobby(){
    if(state!=='lobby') return;
    ac();
    players.forEach(function(p,i){ p.name=displayName(p,i); });
    startRace();
  }
  startBtn.addEventListener('click',startRaceFromLobby);
  if(panelStartBtn) panelStartBtn.addEventListener('click',startRaceFromLobby);
  if(helpStartBtn) helpStartBtn.addEventListener('click',startRaceFromLobby);
  applyStaticTranslations();
  showLobbyTab('roster');
  showLobbyHome();
  syncRestartButton();
  syncOrientationPrompt();
}

function debugSetPlayerCount(count){
  count=clamp(Math.round(Number(count)||1),1,MAX_PLAYERS);
  players=Array.from({length:count},function(_,i){ return makePlayer(i); });
  buildRacers();
  invalidateTrackMetrics();
  renderLobby();
  return count;
}

function debugReturnToLobby(){
  clearRaceTimers();
  resultsEl.classList.add('hidden');
  countWrap.classList.add('hidden');
  state='lobby';
  syncRestartButton();
  hudEl.classList.add('hidden');
  buildRacers();
  renderLobby();
  showLobbyHome();
  lobbyEl.classList.remove('hidden');
}

function installDebugTools(){
  if(!import.meta.env.DEV) return;
  window.__pixelOlympicsDebug={
    setPlayerCount: debugSetPlayerCount,
    resetLaneAudit: resetLaneAudit,
    getLaneAudit: getLaneAuditSummary,
    getLaneAlignmentReport: getLaneAlignmentReport,
    getPlayerCount: function(){ return players.length; },
    startRace: function(){ if(state==='lobby') startRace(); },
    repairLaneAlignment: function(){ return repairLaneAlignment('debug-trigger'); },
    returnToLobby: debugReturnToLobby,
  };
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
  updateLobbySceneReveal(sceneIdx, realDt);
  syncCanvasVisibility();

  if(state==='racing'||state==='countdown') updateRacers(dt);
  updateLaneAlignment(realDt);
  updateCamera(realDt);

  // render
  const n=Math.max(players.length,1);
  ctx.clearRect(0,0,VW,VH);
  drawScene(n);
  drawRacersAndItems(n);

  // HUD + events
  if(state==='racing'||state==='countdown'){ hudTick+=realDt; if(hudTick>0.2){ hudTick=0; renderHUD(); }
    if(state==='racing'&&realT>nextEventT){ fireEvent(); nextEventT=realT+rnd(12,18); } }
}

export function bootGame() {
  onLanguageChange(refreshLocalizedUi);
  applyDocumentTranslations();
  bindUi();
  installDebugTools();
  renderLobby();
  buildRacers();
  requestAnimationFrame(frame);
  preloadGameAssets(sceneIdx).then(function(){
    if(state==='lobby') renderLobby();
  });
}
