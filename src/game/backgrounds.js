/** Load parallax background layers referenced by SCENES[].layers */

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('Failed to load background: ' + src)); };
    img.src = src;
  });
}

export async function loadBackgroundLayers(scenes) {
  const srcs = [];
  scenes.forEach(function (scene) {
    [scene.backdrop, scene.trackTexture, scene.overlayFront].forEach(function (src) {
      if (src && srcs.indexOf(src) < 0) srcs.push(src);
    });
    if (!scene.layers) return;
    scene.layers.forEach(function (layer) {
      if (srcs.indexOf(layer.src) < 0) srcs.push(layer.src);
    });
  });
  const images = {};
  await Promise.all(srcs.map(function (src) {
    return loadImage(src).then(function (img) { images[src] = img; });
  }));
  return images;
}

/** Default parallax factor by layer index (0 = sky, slowest). */
export function defaultParallax(index, total) {
  if (total <= 1) return 0.05;
  return 0.06 + (index / Math.max(total - 1, 1)) * 0.42;
}
