const STORAGE_KEY = 'pixel-olympics-language';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'fr'];

const TRANSLATIONS = {
  en: {
    meta: {
      title: 'Pixel Olympics - the drinking game',
      description: 'Pixel-art browser drinking game for up to 6 players. Pick racers, race to the finish, and let the standings decide who sips.',
      twitterDescription: 'Pixel-art browser drinking game for up to 6 players. Pick racers, cheer them home, everyone else drinks.',
    },
    controls: {
      soundTitle: 'Sound on/off',
      soundAria: 'Toggle sound',
      restartTitle: 'Restart race',
      restartAria: 'Restart race',
      languageAria: 'Language',
      back: 'BACK',
    },
    lobby: {
      eyebrow: 'The drinking game',
      taglineHTML: 'Build your racers, then cheer them home.<br>First across wins - everyone else drinks.',
      startGame: 'START GAME',
      sectionsAria: 'Lobby sections',
      tabs: {
        roster: 'Racers',
        setup: 'Race Setup',
        help: 'How To Play',
        rules: 'Rules',
      },
      roster: {
        title: 'Racers',
        hintHTML: 'Pick your crew',
        mobileHint: 'Tap a slot below to recolour, swap the racer, or rename them.',
      },
      setupHint: 'Build your challenge',
      scene: 'Scene',
      chooseScene: 'Choose scene',
      raceLength: 'Race length',
      powerUpsTitle: 'Power-ups',
      powerUpsDesc: 'Boosts, bananas, shields & chaos',
      setupPowerupsHTML: '<div class="rules-powerups-title">Power-ups</div><div class="rules-power-grid"><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-speed.png" alt=""><div class="rules-power-name">Boost</div><div class="rules-power-desc">Burst<br>of speed</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-stars.png" alt=""><div class="rules-power-name">Star</div><div class="rules-power-desc">Speed +<br>immunity</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-banana.png" alt=""><div class="rules-power-name">Banana</div><div class="rules-power-desc">Drop a<br>trap</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-slow.png" alt=""><div class="rules-power-name">Lightning</div><div class="rules-power-desc">Slow<br>others</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-shield.png" alt=""><div class="rules-power-name">Shield</div><div class="rules-power-desc">Block one<br>hit</div></div></div>',
      help: {
        title: 'How To Play',
        hint: 'Learn in 30 seconds',
        cta: "LET'S RACE!",
        bodyHTML: '<div class="help-layout help-layout-illustrated"><div class="help-stage"><img class="help-stage-img" src="/elements/img-group-racers-standing.png" alt=""></div><div class="help-step-card"><div class="help-step-side"><span class="help-step-badge help-step-badge-square">1</span><div class="help-step-copy"><div class="help-step-title">Pick your racers</div><div class="help-step-desc">Choose up to 6 champions<br>and give them epic names!</div></div></div><div class="help-step-visual"><img class="help-step-asset help-step-asset-racers" src="/elements/img-racers-pick.png" alt=""></div></div><div class="help-step-card"><div class="help-step-side"><span class="help-step-badge help-step-badge-square">2</span><div class="help-step-copy"><div class="help-step-title">Set up the race</div><div class="help-step-desc">Choose a scene, race length<br>and power-ups to build<br>your challenge.</div></div></div><div class="help-step-visual help-step-visual-scene"><img class="help-step-asset help-step-asset-scene" src="/elements/img-scene.png" alt=""></div></div><div class="help-step-card"><div class="help-step-side"><span class="help-step-badge help-step-badge-square">3</span><div class="help-step-copy"><div class="help-step-title">Watch the race</div><div class="help-step-desc">Cheer your racer to victory<br>and enjoy the chaos!</div></div></div><div class="help-step-visual"><img class="help-step-asset help-step-asset-run" src="/elements/img-group-racers-run.png" alt=""></div></div></div>',
      },
      rules: {
        title: 'Rules',
        hint: 'Know the game',
        bodyHTML: '<div class="rules-layout"><div class="rules-banner"><img class="rules-banner-icon" src="/elements/icon-beer.png" alt=""><div class="rules-banner-copy">These are the drinking rules.<br>Play fair, have fun and<br>drink responsibly!</div></div><div class="rules-list"><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon rules-row-icon-trophy" src="/elements/icon-trophy.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">The goal</div><div class="rules-row-desc">Be the first racer to cross<br>the finish line.<br>Everyone else drinks.</div></div></div></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon" src="/elements/icon-medals-2nd-place.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Winner</div><div class="rules-row-desc">Winner = number of players<br>in drinks.<br>You decide who drinks!</div></div></div><img class="rules-row-visual rules-row-visual-podium" src="/elements/img-podium.png" alt=""></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon" src="/elements/icon-medals-3rd-place.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Everyone else</div><div class="rules-row-desc">Drink your finishing position.<br>2nd = 2 drinks<br>3rd = 3 drinks<br>... and so on.</div></div></div><img class="rules-row-visual rules-row-visual-places" src="/elements/img-racers.png" alt=""></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon rules-row-icon-snail" src="/elements/img-snail.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Slowpoke clause</div><div class="rules-row-desc">Never led the race<br>(not even for a second)?<br><span class="rules-accent">+1 drink of shame.</span></div></div></div><img class="rules-row-visual rules-row-visual-slowpoke" src="/elements/img-slow-poke.png" alt=""></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon rules-row-icon-flags" src="/elements/icon-flags.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Ties</div><div class="rules-row-desc">Racers tied at the finish?<br>Run it back!<br>Highest place after restart wins.</div></div></div><img class="rules-row-visual rules-row-visual-tie" src="/elements/img-tie.png" alt=""></div></div><div class="rules-powerups"><div class="rules-powerups-title">Power-ups</div><div class="rules-power-grid"><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-speed.png" alt=""><div class="rules-power-name">Boost</div><div class="rules-power-desc">Burst<br>of speed</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-stars.png" alt=""><div class="rules-power-name">Star</div><div class="rules-power-desc">Speed +<br>immunity</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-banana.png" alt=""><div class="rules-power-name">Banana</div><div class="rules-power-desc">Drop a<br>trap</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-slow.png" alt=""><div class="rules-power-name">Lightning</div><div class="rules-power-desc">Slow<br>others</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-shield.png" alt=""><div class="rules-power-name">Shield</div><div class="rules-power-desc">Block one<br>hit</div></div></div></div></div>',
      },
      startRace: 'START THE RACE',
      addPlayer: '+ ADD PLAYER  ·  {count}/{max}',
      addRacer: 'ADD RACER',
      rosterSelected: '{count} / {max} RACERS SELECTED',
      selectedRacers: 'SELECTED RACERS',
      rosterFull: 'ROSTER FULL ({max})',
      footnote: 'Drink responsibly - water is also a drink 18+',
    },
    countdown: {
      go: 'GO!',
    },
    hud: {
      title: 'Live standings',
    },
    orientationPrompt: {
      title: 'BETTER IN LANDSCAPE!',
      bodyHTML: 'Pixel Olympics is best<br>experienced in<br><span>landscape mode</span>.<br><br>You can play in portrait,<br>but landscape gives<br>you the full view!',
      button: 'GOT IT!',
      footnote: 'Both orientations are supported',
    },
    results: {
      eyebrow: 'Photo finish',
      title: 'RESULTS',
      wonIn: '{name} won in {time}s',
      raceAgain: 'RACE AGAIN',
      editPlayers: 'EDIT PLAYERS & SETTINGS',
      hydrate: 'Hydrate between races',
      sipGive: 'deals {total}',
      sipChug: '{total} · chug',
      sipCount: '{place} sips',
      slowpokeTitle: 'Slowpoke clause:',
      slowpokeNote: '{names} never led - +1 sip of shame.',
      everyoneLed: 'Everyone led at some point - a civilised race. No shame sips today.',
    },
    toasts: {
      leader: '🍺 {name} leads - everyone else sips!',
      last: '🐌 {name} is last... drink up!',
      cheers: 'Cheers! Everyone clink and sip together.',
      lastToRaise: 'Last to raise their drink takes two!',
      leaderPicks: "{name}'s player picks someone to drink.",
      powerupHolders: 'Power-up holders: sip when it wears off!',
    },
    player: {
      colorTitle: 'Colour',
      changeRacerTitle: 'Change racer',
      racerLabel: 'Racer {num}',
      racerSlot: 'RACER {num}',
      removeTitle: 'Remove',
    },
    powerups: {
      boost: 'Boost - burst of speed',
      star: 'Star - speed + immunity',
      banana: 'Banana - drop a trap',
      lightning: 'Lightning - slow those ahead',
      shield: 'Shield - block one hit',
    },
    scenes: {
      'sky-kingdom': { name: 'Sky Kingdom', pickerLabel: 'Sky' },
      mountain: { name: 'Mountain', pickerLabel: 'Mountain' },
      'ancient-greek': { name: 'Ancient Greek', pickerLabel: 'Greek' },
      'desert-grand-prix': { name: 'Desert Grand Prix', pickerLabel: 'Desert' },
      'neo-tokyo': { name: 'Neo Tokyo', pickerLabel: 'Tokyo' },
      'space-colony': { name: 'Space Colony', pickerLabel: 'Space' },
      'tropical-island': { name: 'Tropical Island', pickerLabel: 'Island' },
      'volcanic-racing': { name: 'Volcanic Racing', pickerLabel: 'Volcano' },
      'bangkok-city': { name: 'Bangkok City', pickerLabel: 'Bangkok' },
    },
    lengths: [
      { label: 'Sprint', subLabel: 'quick' },
      { label: 'Classic', subLabel: 'balanced' },
      { label: 'Marathon', subLabel: 'epic' },
    ],
    fallbackNames: ['Baccara', 'Billboard', 'Butterfly', 'Shark', 'Badabing', 'Suzie Wong', 'Spanky', 'Black Pagoda'],
  },
  fr: {
    meta: {
      title: 'Pixel Olympics - le jeu a boire',
      description: "Jeu a boire pixel-art dans le navigateur pour 6 joueurs max. Choisissez vos coureurs, lancez la course et laissez le classement decider qui boit.",
      twitterDescription: "Jeu a boire pixel-art dans le navigateur pour 6 joueurs max. Choisissez vos coureurs, encouragez-les jusqu'a l'arrivee et laissez le classement decider qui boit.",
    },
    controls: {
      soundTitle: 'Son on/off',
      soundAria: 'Activer ou couper le son',
      restartTitle: 'Relancer la course',
      restartAria: 'Relancer la course',
      languageAria: 'Langue',
      back: 'RETOUR',
    },
    lobby: {
      eyebrow: 'Le jeu a boire',
      taglineHTML: "Prenez vos coureurs, menez-les au bout<br>Le premier gagne - les autres boivent.",
      startGame: 'START GAME',
      sectionsAria: 'Sections du lobby',
      tabs: {
        roster: 'Coureurs',
        setup: 'Parametres',
        help: 'Comment jouer',
        rules: 'Regles',
      },
      roster: {
        title: 'Coureurs',
        hintHTML: 'Choisissez votre equipe',
        mobileHint: 'Touchez un slot pour changer la couleur, le coureur ou le nom.',
      },
      setupHint: 'Reglez la course',
      scene: 'Scene',
      chooseScene: 'Choisir la scene',
      raceLength: 'Longueur',
      powerUpsTitle: 'Power-ups',
      powerUpsDesc: 'Boosts, bananes, boucliers et chaos',
      setupPowerupsHTML: '<div class="rules-powerups-title">Power-ups</div><div class="rules-power-grid"><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-speed.png" alt=""><div class="rules-power-name">Boost</div><div class="rules-power-desc">Burst<br>de vitesse</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-stars.png" alt=""><div class="rules-power-name">Etoile</div><div class="rules-power-desc">Vitesse +<br>immunite</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-banana.png" alt=""><div class="rules-power-name">Banane</div><div class="rules-power-desc">Pose un<br>piege</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-slow.png" alt=""><div class="rules-power-name">Eclair</div><div class="rules-power-desc">Ralentit<br>les autres</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-shield.png" alt=""><div class="rules-power-name">Bouclier</div><div class="rules-power-desc">Bloque<br>un coup</div></div></div>',
      help: {
        title: 'Comment jouer',
        hint: 'En 30 secondes',
        cta: 'C EST PARTI !',
        bodyHTML: '<div class="help-layout help-layout-illustrated"><div class="help-stage"><img class="help-stage-img" src="/elements/img-group-racers-standing.png" alt=""></div><div class="help-step-card"><div class="help-step-side"><span class="help-step-badge help-step-badge-square">1</span><div class="help-step-copy"><div class="help-step-title">Choisissez vos coureurs</div><div class="help-step-desc">Prenez jusqua 6 champions<br>et donnez-leur des noms cultes !</div></div></div><div class="help-step-visual"><img class="help-step-asset help-step-asset-racers" src="/elements/img-racers-pick.png" alt=""></div></div><div class="help-step-card"><div class="help-step-side"><span class="help-step-badge help-step-badge-square">2</span><div class="help-step-copy"><div class="help-step-title">Reglez la course</div><div class="help-step-desc">Choisissez scene, longueur<br>et power-ups pour creer<br>votre defi.</div></div></div><div class="help-step-visual help-step-visual-scene"><img class="help-step-asset help-step-asset-scene" src="/elements/img-scene.png" alt=""></div></div><div class="help-step-card"><div class="help-step-side"><span class="help-step-badge help-step-badge-square">3</span><div class="help-step-copy"><div class="help-step-title">Regardez la course</div><div class="help-step-desc">Encouragez votre coureur<br>et profitez du chaos !</div></div></div><div class="help-step-visual"><img class="help-step-asset help-step-asset-run" src="/elements/img-group-racers-run.png" alt=""></div></div></div>',
      },
      rules: {
        title: 'Regles',
        hint: 'Connaitre le jeu',
        bodyHTML: '<div class="rules-layout"><div class="rules-banner"><img class="rules-banner-icon" src="/elements/icon-beer.png" alt=""><div class="rules-banner-copy">Voici les regles a boire.<br>Jouez fair-play, amusez-vous et<br>buvez avec moderation !</div></div><div class="rules-list"><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon rules-row-icon-trophy" src="/elements/icon-trophy.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Le but</div><div class="rules-row-desc">Passez la ligne en premier.<br>Tous les autres boivent.</div></div></div></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon" src="/elements/icon-medals-2nd-place.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Gagnant</div><div class="rules-row-desc">Le gagnant distribue autant<br>de gorgees qu il y a de joueurs.<br>Il choisit qui boit !</div></div></div><img class="rules-row-visual rules-row-visual-podium" src="/elements/img-podium.png" alt=""></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon" src="/elements/icon-medals-3rd-place.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Tous les autres</div><div class="rules-row-desc">Buvez votre place d arrivee.<br>2e = 2 gorgees<br>3e = 3 gorgees<br>... et ainsi de suite.</div></div></div><img class="rules-row-visual rules-row-visual-places" src="/elements/img-racers.png" alt=""></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon rules-row-icon-snail" src="/elements/img-snail.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Clause tortue</div><div class="rules-row-desc">Jamais en tete<br>(pas meme une seconde) ?<br><span class="rules-accent">+1 gorgee de honte.</span></div></div></div><img class="rules-row-visual rules-row-visual-slowpoke" src="/elements/img-slow-poke.png" alt=""></div><div class="rules-row"><div class="rules-row-side"><img class="rules-row-icon rules-row-icon-flags" src="/elements/icon-flags.png" alt=""><div class="rules-row-copy"><div class="rules-row-title">Egalites</div><div class="rules-row-desc">Egalite sur la ligne ?<br>Relancez la course !<br>Le mieux place apres restart gagne.</div></div></div><img class="rules-row-visual rules-row-visual-tie" src="/elements/img-tie.png" alt=""></div></div><div class="rules-powerups"><div class="rules-powerups-title">Power-ups</div><div class="rules-power-grid"><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-speed.png" alt=""><div class="rules-power-name">Boost</div><div class="rules-power-desc">Burst<br>de vitesse</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-stars.png" alt=""><div class="rules-power-name">Etoile</div><div class="rules-power-desc">Vitesse +<br>immunite</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-banana.png" alt=""><div class="rules-power-name">Banane</div><div class="rules-power-desc">Pose un<br>piege</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-slow.png" alt=""><div class="rules-power-name">Eclair</div><div class="rules-power-desc">Ralentit<br>les autres</div></div><div class="rules-power-card"><img class="rules-power-asset" src="/elements/power-up-shield.png" alt=""><div class="rules-power-name">Bouclier</div><div class="rules-power-desc">Bloque<br>un coup</div></div></div></div></div>',
      },
      startRace: 'LANCER LA COURSE',
      addPlayer: '+ AJOUTER UN JOUEUR  ·  {count}/{max}',
      addRacer: 'AJOUTER',
      rosterSelected: '{count} / {max} COUREURS',
      selectedRacers: 'COUREURS CHOISIS',
      rosterFull: 'EQUIPE COMPLETE ({max})',
      footnote: "Buvez avec moderation - l'eau compte aussi 18+",
    },
    countdown: {
      go: 'PARTEZ!',
    },
    hud: {
      title: 'Classement live',
    },
    orientationPrompt: {
      title: 'MIEUX EN PAYSAGE !',
      bodyHTML: 'Pixel Olympics est bien mieux<br>en<br><span>mode paysage</span>.<br><br>Vous pouvez jouer en portrait,<br>mais le paysage vous donne<br>la vue complete !',
      button: 'COMPRIS !',
      footnote: 'Les deux orientations sont prises en charge',
    },
    results: {
      eyebrow: "Photo d'arrivee",
      title: 'RESULTATS',
      wonIn: '{name} a gagne en {time}s',
      raceAgain: 'RECOURIR',
      editPlayers: 'MODIFIER JOUEURS & PARAMETRES',
      hydrate: 'Hydratez-vous entre les courses',
      sipGive: 'distribue {total}',
      sipChug: '{total} · sec',
      sipCount: '{place} gorgees',
      slowpokeTitle: 'Clause de la tortue :',
      slowpokeNote: "{names} n'ont jamais mene - +1 gorgee de honte.",
      everyoneLed: "Tout le monde a mene a un moment - une course presque elegante. Aucune gorgee de honte aujourd'hui.",
    },
    toasts: {
      leader: '🍺 {name} mene - tous les autres boivent !',
      last: '🐌 {name} est dernier... cul sec !',
      cheers: 'Sante ! Tout le monde trinque et boit ensemble.',
      lastToRaise: 'Le dernier a lever son verre en prend deux !',
      leaderPicks: "Le joueur de {name} choisit quelqu'un qui boit.",
      powerupHolders: "Les porteurs de power-up boivent quand l'effet disparait !",
    },
    player: {
      colorTitle: 'Couleur',
      changeRacerTitle: 'Changer de coureur',
      racerLabel: 'Coureur {num}',
      racerSlot: 'COUREUR {num}',
      removeTitle: 'Retirer',
    },
    powerups: {
      boost: 'Boost - acceleration eclair',
      star: 'Etoile - vitesse + immunite',
      banana: 'Banane - pose un piege',
      lightning: 'Eclair - ralentit ceux devant',
      shield: 'Bouclier - bloque un coup',
    },
    scenes: {
      'sky-kingdom': { name: 'Royaume celeste', pickerLabel: 'Ciel' },
      mountain: { name: 'Vallee montagneuse', pickerLabel: 'Montagne' },
      'ancient-greek': { name: 'Grece antique', pickerLabel: 'Grece' },
      'desert-grand-prix': { name: 'Grand Prix du desert', pickerLabel: 'Desert' },
      'neo-tokyo': { name: 'Neo Tokyo', pickerLabel: 'Tokyo' },
      'space-colony': { name: 'Colonie spatiale', pickerLabel: 'Espace' },
      'tropical-island': { name: 'Ile tropicale', pickerLabel: 'Ile' },
      'volcanic-racing': { name: 'Course volcanique', pickerLabel: 'Volcan' },
      'bangkok-city': { name: 'Bangkok', pickerLabel: 'Bangkok' },
    },
    lengths: [
      { label: 'Sprint', subLabel: 'rapide' },
      { label: 'Classique', subLabel: 'equilibree' },
      { label: 'Marathon', subLabel: 'epique' },
    ],
    fallbackNames: ['Baccara', 'Billboard', 'Papillon', 'Requin', 'Badabing', 'Suzie Wong', 'Spanky', 'Pagode Noire'],
  },
};

function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
}

function readStoredLanguage() {
  try {
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return DEFAULT_LANGUAGE;
  }
}

let currentLanguage = DEFAULT_LANGUAGE;
if (typeof window !== 'undefined') {
  currentLanguage = readStoredLanguage();
}

const listeners = new Set();

function resolveKey(source, key) {
  return key.split('.').reduce(function(value, part) {
    return value == null ? undefined : value[part];
  }, source);
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, function(_, token) {
    return params[token] == null ? '' : String(params[token]);
  });
}

export function getLanguage() {
  return currentLanguage;
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.slice();
}

export function setLanguage(language) {
  const nextLanguage = normalizeLanguage(language);
  if (nextLanguage === currentLanguage) return currentLanguage;
  currentLanguage = nextLanguage;
  try {
    window.localStorage.setItem(STORAGE_KEY, currentLanguage);
  } catch (error) {
    // Ignore storage failures in private browsing or restricted contexts.
  }
  listeners.forEach(function(listener) {
    listener(currentLanguage);
  });
  return currentLanguage;
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}

export function t(key, params) {
  const value = resolveKey(TRANSLATIONS[currentLanguage], key) ?? resolveKey(TRANSLATIONS[DEFAULT_LANGUAGE], key);
  if (typeof value === 'function') return value(params || {});
  if (typeof value === 'string') return interpolate(value, params);
  return value;
}

export function getLengthCopy(index) {
  return t('lengths')[index] || TRANSLATIONS[DEFAULT_LANGUAGE].lengths[index];
}

export function getSceneCopy(sceneKey) {
  const sceneCopy = resolveKey(TRANSLATIONS[currentLanguage], 'scenes.' + sceneKey);
  return sceneCopy || resolveKey(TRANSLATIONS[DEFAULT_LANGUAGE], 'scenes.' + sceneKey);
}

export function getFallbackName(index) {
  const names = t('fallbackNames') || TRANSLATIONS[DEFAULT_LANGUAGE].fallbackNames;
  return names[index % names.length];
}

export function applyDocumentTranslations() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = currentLanguage;
  document.title = t('meta.title');

  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDescription = document.querySelector('meta[name="twitter:description"]');

  if (metaDescription) metaDescription.setAttribute('content', t('meta.description'));
  if (ogTitle) ogTitle.setAttribute('content', t('meta.title'));
  if (ogDescription) ogDescription.setAttribute('content', t('meta.description'));
  if (twitterTitle) twitterTitle.setAttribute('content', t('meta.title'));
  if (twitterDescription) twitterDescription.setAttribute('content', t('meta.twitterDescription'));
}
