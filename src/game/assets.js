import { loadImage, loadImages } from './image-loader.js';
import { CHARACTERS } from './characters.js';
import { SCENES } from './scenes.js';
import { loadSpriteSheets } from './sprite-sheets.js';
import { loadBackgroundImages, allSceneImageSources, sceneImageSources } from './backgrounds.js';

const POWERUP_ASSET_SRC = '/power/power-up.png';
const ORIENTATION_ASSET_SRCS = [
  '/elements/phone-portrait.png',
  '/elements/phone-landscape.png',
  '/elements/arrow.png',
];

export const gameAssets = {
  backgroundImages: {},
  powerupImage: null,
  lobbySceneReveal: 0,
  sheetImages: {},
};

export function currentSceneArtReady(sceneIdx) {
  const scene = SCENES[sceneIdx];
  // #region debug-point A:scene-art-ready
  if (sceneIdx == null || !scene) fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"lobby-scene-art",runId:"post-fix",hypothesisId:"A",location:"src/game/assets.js:currentSceneArtReady",msg:"[DEBUG] currentSceneArtReady missing valid sceneIdx",data:{sceneIdx:sceneIdx,hasScene:!!scene},ts:Date.now()})}).catch(()=>{});
  // #endregion
  return !!(
    scene &&
    scene.backdrop &&
    scene.trackTexture &&
    gameAssets.backgroundImages[scene.backdrop] &&
    gameAssets.backgroundImages[scene.trackTexture]
  );
}

export function updateLobbySceneReveal(sceneIdx, realDt) {
  const revealTarget = currentSceneArtReady(sceneIdx) ? 1 : 0;
  // #region debug-point C:lobby-reveal
  if (typeof window !== 'undefined' && window.__dbgLobbyRevealTarget !== revealTarget) { window.__dbgLobbyRevealTarget = revealTarget; fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"lobby-scene-art",runId:"post-fix",hypothesisId:"C",location:"src/game/assets.js:updateLobbySceneReveal",msg:"[DEBUG] lobby reveal target changed",data:{sceneIdx:sceneIdx,revealTarget:revealTarget,reveal:gameAssets.lobbySceneReveal,realDt:realDt},ts:Date.now()})}).catch(()=>{}); }
  // #endregion
  // Keep the lobby hidden until the real art is ready, then show it fully.
  gameAssets.lobbySceneReveal = revealTarget ? 1 : 0;
  return gameAssets.lobbySceneReveal;
}

export function preloadGameAssets(sceneIdx) {
  const activeSceneSrcs = sceneImageSources(SCENES[sceneIdx]);
  const remainingSceneSrcs = allSceneImageSources(SCENES).filter(function(src){
    return activeSceneSrcs.indexOf(src) < 0;
  });

  // Paint the fallback lobby immediately, then stream in the active arena first.
  loadBackgroundImages(activeSceneSrcs).then(function(images){
    Object.assign(gameAssets.backgroundImages, images);
    // #region debug-point B:active-scene-loaded
    fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"lobby-scene-art",runId:"post-fix",hypothesisId:"B",location:"src/game/assets.js:preloadGameAssets",msg:"[DEBUG] active scene images loaded",data:{sceneIdx:sceneIdx,srcCount:activeSceneSrcs.length,keys:Object.keys(images)},ts:Date.now()})}).catch(()=>{});
    // #endregion
  }).catch(function(err){
    console.error(err);
  });

  return Promise.allSettled([
    loadSpriteSheets(CHARACTERS),
    loadBackgroundImages(remainingSceneSrcs),
    loadImage(POWERUP_ASSET_SRC),
    loadImages(ORIENTATION_ASSET_SRCS, 'ui image'),
  ]).then(function(results){
    if(results[0].status === 'fulfilled') gameAssets.sheetImages = results[0].value;
    else console.error(results[0].reason);

    if(results[1].status === 'fulfilled') Object.assign(gameAssets.backgroundImages, results[1].value);
    else console.error(results[1].reason);

    if(results[2].status === 'fulfilled') gameAssets.powerupImage = results[2].value;
    else console.error(results[2].reason);

    if(results[3].status !== 'fulfilled') console.error(results[3].reason);

    return gameAssets;
  });
}
