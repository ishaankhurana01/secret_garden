/* ==========================================================================
   THE SECRET GARDEN — script.js
   All interaction logic lives here, organised by: ambient fx -> cursor ->
   scene manager -> each scene's puzzle logic -> final scene celebration.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

  const ambient = $('#ambient-layer');

  /* ---------------------------------------------------------------------
     Custom cursor glow (desktop only)
     --------------------------------------------------------------------- */
  const cursorGlow = $('#cursor-glow');
  if (!isTouch && cursorGlow) {
    window.addEventListener('mousemove', (e) => {
      cursorGlow.style.left = `${e.clientX}px`;
      cursorGlow.style.top = `${e.clientY}px`;
    });
    document.addEventListener('mousedown', () => cursorGlow.classList.add('grow'));
    document.addEventListener('mouseup', () => cursorGlow.classList.remove('grow'));
  }

  /* ---------------------------------------------------------------------
     Ambient floating petals — spawned continuously in the background layer
     --------------------------------------------------------------------- */
  const PETAL_EMOJIS = ['🌸', '🌺', '🌷', '🍃'];
  function spawnPetal() {
    const petal = document.createElement('span');
    petal.className = 'floating-petal';
    petal.textContent = PETAL_EMOJIS[Math.floor(rand(0, PETAL_EMOJIS.length))];
    const startX = rand(0, window.innerWidth);
    const duration = rand(9, 16);
    const drift = rand(-120, 120);
    petal.style.left = `${startX}px`;
    petal.style.top = '-5vh';
    petal.style.fontSize = `${rand(14, 26)}px`;
    petal.style.setProperty('--drift', `${drift}px`);
    petal.style.animationDuration = `${duration}s`;
    ambient.appendChild(petal);
    setTimeout(() => petal.remove(), duration * 1000 + 200);
  }
  setInterval(spawnPetal, 900);
  for (let i = 0; i < 6; i++) setTimeout(spawnPetal, i * 300); // seed a few immediately

  /* Fireflies — only meaningful once we reach the night scenes, but a few
     ambient ones add magic anywhere they're needed. */
  function spawnFirefly(container, x, y) {
    const fly = document.createElement('span');
    fly.className = 'firefly';
    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;
    fly.style.animationDelay = `${rand(0, 3)}s`;
    container.appendChild(fly);
    return fly;
  }

  function spawnSparkle(container, x, y, emoji = '✨') {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = emoji;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    container.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }

  /* ---------------------------------------------------------------------
     Background music — a soft, generative garden ambience built with the
     Web Audio API (no external files needed). A slow pad of overlapping
     sine chords plus an occasional music-box pluck, all gently filtered.
     --------------------------------------------------------------------- */
  const musicBtn = $('#music-btn');
  const musicIcon = $('#music-icon');
  let audioCtx = null;
  let masterGain = null;
  let musicPlaying = false;
  let padVoices = [];
  let arpTimer = null;

  // A dreamy, ambiguous pentatonic-ish chord for a cozy storybook feel.
  const PAD_FREQS = [130.81, 164.81, 196.00, 246.94]; // C3, E3, G3, B3
  const ARP_FREQS = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5 D5 E5 G5 A5

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    masterGain.connect(filter);
    filter.connect(audioCtx.destination);
    masterGain._outputNode = filter;

    // slow pad chord, each note a detuned pair of sines with its own
    // slow tremolo so the whole thing breathes rather than droning
    PAD_FREQS.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const voiceGain = audioCtx.createGain();
      voiceGain.gain.value = 0.06;

      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.08 + i * 0.02;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(voiceGain.gain);

      osc.connect(voiceGain);
      voiceGain.connect(masterGain);
      osc.start();
      lfo.start();
      padVoices.push({ osc, lfo, voiceGain });
    });
  }

  function pluckNote() {
    if (!audioCtx) return;
    const freq = ARP_FREQS[Math.floor(rand(0, ARP_FREQS.length))];
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 2.3);
  }

  function scheduleArpeggio() {
    pluckNote();
    arpTimer = setTimeout(scheduleArpeggio, rand(1800, 4200));
  }

  function startMusic() {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(1, now + 1.5);
    scheduleArpeggio();
    musicPlaying = true;
    musicBtn.classList.add('playing');
    musicIcon.textContent = '🎵';
    musicBtn.setAttribute('aria-pressed', 'true');
    musicBtn.setAttribute('aria-label', 'Pause background music');
  }

  function stopMusic() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1);
    clearTimeout(arpTimer);
    musicPlaying = false;
    musicBtn.classList.remove('playing');
    musicIcon.textContent = '🔇';
    musicBtn.setAttribute('aria-pressed', 'false');
    musicBtn.setAttribute('aria-label', 'Play background music');
  }

  musicBtn.addEventListener('click', () => {
    if (musicPlaying) stopMusic();
    else startMusic();
  });

  /* ---------------------------------------------------------------------
     Scene manager — a tiny state machine that fades between <section>s
     --------------------------------------------------------------------- */
  const scenes = $$('.scene');
  const dots = $$('.story-progress .dot');
  let currentScene = 0;

  function goToScene(index) {
    if (index === currentScene || index < 0 || index >= scenes.length) return;
    const outgoing = scenes[currentScene];
    const incoming = scenes[index];

    outgoing.classList.add('leaving');
    outgoing.classList.remove('active');
    setTimeout(() => outgoing.classList.remove('leaving'), 1200);

    incoming.classList.add('active');
    dots.forEach((d, i) => d.classList.toggle('active', i === index));

    currentScene = index;
    onSceneEnter(index);
  }

  function onSceneEnter(index) {
    // Lazily kick off each scene's setup exactly once it becomes visible.
    if (index === 1) setupButterflyPuzzle();
    if (index === 2) setupWateringScene();
    if (index === 3) setupPathPuzzle();
    if (index === 4) setupHiddenGarden();
    if (index === 5) setupFinalScene();
  }

  // Scene 0 always starts active (set in HTML/CSS by default first paint)
  scenes[0].classList.add('active');

  /* ---------------------------------------------------------------------
     SCENE 0 — Welcome: opening the gate
     --------------------------------------------------------------------- */
  const enterBtn = $('#enter-btn');
  const gate = $('#gate');
  let gateOpened = false;
  enterBtn.addEventListener('click', () => {
    if (gateOpened) return;
    gateOpened = true;
    gate.classList.add('open');
    enterBtn.disabled = true;
    enterBtn.style.opacity = '.6';
    setTimeout(() => goToScene(1), 1300);
  });

  /* ---------------------------------------------------------------------
     SCENE 1 — Butterfly puzzle
     --------------------------------------------------------------------- */
  let butterflySetupDone = false;
  function setupButterflyPuzzle() {
    if (butterflySetupDone) return;
    butterflySetupDone = true;

    const field = $('#butterfly-field');
    const butterfly = $('#hidden-butterfly');
    const bloom = $('#bloom-burst');

    function placeButterfly() {
      const w = field.clientWidth, h = field.clientHeight;
      const x = rand(0.1, 0.85) * w;
      const y = rand(0.25, 0.8) * h;
      butterfly.style.left = `${x}px`;
      butterfly.style.top = `${y}px`;
    }
    placeButterfly();

    butterfly.addEventListener('click', (e) => {
      if (butterfly.classList.contains('found')) return;
      butterfly.classList.add('found');

      const rect = field.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          spawnSparkle(field, x + rand(-30, 30), y + rand(-30, 30));
        }, i * 60);
      }

      setTimeout(() => {
        bloom.style.left = `${x}px`;
        bloom.style.top = `${y}px`;
        bloom.classList.add('show');
      }, 300);

      setTimeout(() => goToScene(2), 2000);
    });
  }

  /* ---------------------------------------------------------------------
     SCENE 2 — Water the flower
     --------------------------------------------------------------------- */
  let wateringSetupDone = false;
  function setupWateringScene() {
    if (wateringSetupDone) return;
    wateringSetupDone = true;

    const area = $('#planting-area');
    const plant = $('#plant-stage').firstElementChild;
    const can = $('#watering-can');
    const progressFill = $('#water-progress');
    const hint = $('#water-hint');

    const STAGES = [
      { threshold: 0,   emoji: '🌱', cls: 'seed' },
      { threshold: 20,  emoji: '🌿', cls: 'sprout' },
      { threshold: 45,  emoji: '🌾', cls: 'stem' },
      { threshold: 70,  emoji: '🥀', cls: 'bud' },
      { threshold: 95,  emoji: '🌹', cls: 'bloom' },
    ];

    let progress = 0;
    let watering = false;
    let bloomed = false;

    function updatePlant() {
      const stage = [...STAGES].reverse().find((s) => progress >= s.threshold);
      if (stage && plant.textContent !== stage.emoji) {
        plant.textContent = stage.emoji;
        plant.className = `plant ${stage.cls}`;
      }
    }

    function tick() {
      if (watering && progress < 100) {
        progress = Math.min(100, progress + 0.6);
        progressFill.style.width = `${progress}%`;
        updatePlant();

        if (Math.random() < 0.4) {
          const drop = document.createElement('div');
          drop.className = 'water-drop';
          const rect = area.getBoundingClientRect();
          drop.style.left = `${rect.left + rect.width / 2 + rand(-16, 16)}px`;
          drop.style.top = `${rect.top + rect.height * 0.35}px`;
          document.body.appendChild(drop);
          setTimeout(() => drop.remove(), 650);
        }

        if (progress >= 100 && !bloomed) {
          bloomed = true;
          hint.textContent = 'A beautiful rose has bloomed! 🌹';
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              const rect = area.getBoundingClientRect();
              spawnSparkle(document.body,
                rect.left + rect.width / 2 + rand(-60, 60),
                rect.top + rect.height * 0.3 + rand(-40, 20));
            }, i * 80);
          }
          setTimeout(() => goToScene(3), 2200);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    function moveCan(e) {
      const point = e.touches ? e.touches[0] : e;
      can.style.left = `${point.clientX}px`;
      can.style.top = `${point.clientY}px`;
    }
    function startWatering(e) {
      if (bloomed) return;
      watering = true;
      can.classList.add('active', 'pouring');
      moveCan(e);
    }
    function stopWatering() {
      watering = false;
      can.classList.remove('pouring');
    }

    area.addEventListener('mousedown', startWatering);
    area.addEventListener('mousemove', (e) => { if (can.classList.contains('active')) moveCan(e); });
    area.addEventListener('mouseenter', (e) => { can.classList.add('active'); moveCan(e); });
    area.addEventListener('mouseleave', () => { can.classList.remove('active'); stopWatering(); });
    window.addEventListener('mouseup', stopWatering);

    area.addEventListener('touchstart', (e) => { e.preventDefault(); startWatering(e); }, { passive: false });
    area.addEventListener('touchmove', (e) => { e.preventDefault(); moveCan(e); }, { passive: false });
    area.addEventListener('touchend', stopWatering);

    // keyboard accessibility: holding Enter/Space waters too
    area.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !watering) {
        e.preventDefault();
        const rect = area.getBoundingClientRect();
        startWatering({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
      }
    });
    area.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.key === ' ') stopWatering();
    });
  }

  /* ---------------------------------------------------------------------
     SCENE 3 — Secret path puzzle
     --------------------------------------------------------------------- */
  let pathSetupDone = false;
  function setupPathPuzzle() {
    if (pathSetupDone) return;
    pathSetupDone = true;

    const flowers = $$('.order-flower');
    const stonePath = $('#stone-path');
    // The "true" order is randomised once per visit for a touch of replayability.
    const correctOrder = [0, 1, 2].sort(() => Math.random() - 0.5);
    let progressIdx = 0;

    flowers.forEach((flower) => {
      flower.addEventListener('click', () => {
        const val = Number(flower.dataset.order);
        if (val === correctOrder[progressIdx]) {
          flower.classList.add('selected');
          progressIdx++;
          if (progressIdx === correctOrder.length) {
            stonePath.classList.add('reveal');
            setTimeout(() => goToScene(4), 2400);
          }
        } else {
          // gentle reset
          flowers.forEach((f) => f.classList.remove('selected'));
          flower.classList.add('wrong');
          setTimeout(() => flower.classList.remove('wrong'), 600);
          progressIdx = 0;
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     SCENE 4 — Hidden rose garden
     --------------------------------------------------------------------- */
  let hiddenGardenSetupDone = false;
  function setupHiddenGarden() {
    if (hiddenGardenSetupDone) return;
    hiddenGardenSetupDone = true;

    const field = $('#rose-field');
    const w = window.innerWidth, h = window.innerHeight;

    for (let i = 0; i < 60; i++) {
      const rose = document.createElement('span');
      rose.textContent = '🌹';
      rose.style.left = `${rand(0, w)}px`;
      rose.style.top = `${rand(h * 0.55, h)}px`;
      rose.style.animationDelay = `${rand(0, 4)}s`;
      field.appendChild(rose);
    }
    for (let i = 0; i < 18; i++) {
      spawnFirefly($('#scene-4'), rand(0, w), rand(0, h * 0.7));
    }

    $('#continue-btn').addEventListener('click', () => {
      $('#zoom-target').classList.add('zooming');
      setTimeout(() => goToScene(5), 1500);
    });
  }

  /* ---------------------------------------------------------------------
     FINAL SCENE — the rose and the question
     --------------------------------------------------------------------- */
  let finalSetupDone = false;
  function setupFinalScene() {
    if (finalSetupDone) return;
    finalSetupDone = true;

    const scene = $('#scene-5');
    const field = $('.rose-field-final');
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < 40; i++) {
      const rose = document.createElement('span');
      rose.textContent = '🌹';
      rose.style.left = `${rand(0, w)}px`;
      rose.style.top = `${rand(h * 0.6, h)}px`;
      rose.style.animationDelay = `${rand(0, 4)}s`;
      field.appendChild(rose);
    }
    for (let i = 0; i < 14; i++) {
      spawnFirefly(scene, rand(0, w), rand(0, h * 0.6));
    }

    const rose = $('#glowing-rose');
    const card = $('#rose-card');
    const yesBtn = $('#yes-btn');
    const maybeBtn = $('#maybe-btn');
    const message = $('#final-message');

    rose.addEventListener('click', () => {
      if (rose.classList.contains('opened')) return;
      rose.classList.add('opened');
      const rect = rose.getBoundingClientRect();
      for (let i = 0; i < 10; i++) {
        setTimeout(() => spawnSparkle(scene, rect.left + rect.width / 2 + rand(-40, 40), rect.top + rect.height / 2 + rand(-40, 40)), i * 70);
      }
      setTimeout(() => card.classList.add('show'), 500);
    });

    yesBtn.addEventListener('click', () => {
      card.classList.remove('show');
      celebrateBloom();
      message.textContent = "I can't wait 🌸";
      setTimeout(() => message.classList.add('show'), 400);
    });

    maybeBtn.addEventListener('click', () => {
      // Deliberately simple: no movement gimmicks, no penalising the choice.
      card.classList.remove('show');
      message.textContent = 'Thank you for visiting my Secret Garden. Wishing you a wonderful day. 🌼';
      setTimeout(() => message.classList.add('show'), 400);
    });
  }

  function celebrateBloom() {
    // A full-garden celebration: petal rain, extra butterflies, more fireflies.
    const layer = document.createElement('div');
    layer.className = 'celebration-bloom';
    document.body.appendChild(layer);

    for (let i = 0; i < 40; i++) {
      setTimeout(() => spawnPetal(), i * 60);
    }

    const emojis = ['🦋', '🦋', '🦋'];
    emojis.forEach((emoji, i) => {
      const b = document.createElement('span');
      b.textContent = emoji;
      b.style.position = 'fixed';
      b.style.left = '-10vw';
      b.style.top = `${rand(15, 70)}vh`;
      b.style.fontSize = '30px';
      b.style.zIndex = 41;
      b.style.animation = `drift ${rand(6, 9)}s linear ${i * 0.6}s forwards`;
      layer.appendChild(b);
      setTimeout(() => b.remove(), 10000);
    });

    for (let i = 0; i < 20; i++) {
      spawnFirefly(layer, rand(0, window.innerWidth), rand(0, window.innerHeight));
    }

    setTimeout(() => layer.remove(), 11000);
  }

})();
