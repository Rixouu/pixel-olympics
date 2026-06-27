import './styles/fonts.css';
import './styles/game.css';
import { bootGame } from './game/engine.js';

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (error) {
    console.error('Service worker registration failed', error);
  }
}

async function start() {
  await bootGame();
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
