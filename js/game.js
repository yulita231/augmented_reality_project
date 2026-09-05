/**
 * EcoKids AR - game.js
 * Game Pilah Sampah — Lives System | 2 Items | Click + Drag & Drop
 * ============================================================
 */

'use strict';

/* ============================================================
   GAME STATE
   ============================================================ */
window.GameState = {
  running:       false,
  lives:         5,
  timer:         60,
  timerInterval: null,
  spawnInterval: null,
  correctCount:  0,
  wrongCount:    0,
  selectedItem:  null,
  currentItems:  [],
  itemIdCounter: 0,
};

/* ============================================================
   TRASH ITEMS DATA
   ============================================================ */
const TRASH_ITEMS = [
  { id: 'pisang',  emoji: '🍌', name: 'Kulit Pisang',   type: 'organik'   },
  { id: 'daun',    emoji: '🍂', name: 'Daun Kering',    type: 'organik'   },
  { id: 'apel',    emoji: '🍎', name: 'Sisa Apel',      type: 'organik'   },
  { id: 'wortel',  emoji: '🥕', name: 'Kulit Wortel',   type: 'organik'   },
  { id: 'nasi',    emoji: '🍚', name: 'Sisa Nasi',      type: 'organik'   },
  { id: 'telur',   emoji: '🥚', name: 'Cangkang Telur', type: 'organik'   },
  { id: 'sayur',   emoji: '🥬', name: 'Sisa Sayur',     type: 'organik'   },
  { id: 'jeruk',   emoji: '🍊', name: 'Kulit Jeruk',    type: 'organik'   },
  { id: 'botol',   emoji: '🧴', name: 'Botol Plastik',  type: 'anorganik' },
  { id: 'kaleng',  emoji: '🥫', name: 'Kaleng',         type: 'anorganik' },
  { id: 'kresek',  emoji: '🛍️', name: 'Kantong Plastik',type: 'anorganik' },
  { id: 'kertas',  emoji: '📰', name: 'Kertas Bekas',   type: 'anorganik' },
  { id: 'baterai', emoji: '🔋', name: 'Baterai',        type: 'anorganik' },
  { id: 'kaca',    emoji: '🪟', name: 'Pecahan Kaca',   type: 'anorganik' },
  { id: 'sedotan', emoji: '🥤', name: 'Gelas Plastik',  type: 'anorganik' },
  { id: 'logam',   emoji: '⚙️', name: 'Potongan Logam', type: 'anorganik' },
];

/* ============================================================
   AUDIO
   ============================================================ */
let gameAudioCtx = null;
function getGameAudio() {
  if (!gameAudioCtx || gameAudioCtx.state === 'closed') {
    gameAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (gameAudioCtx.state === 'suspended') gameAudioCtx.resume();
  return gameAudioCtx;
}

function playSelectSound() {
  try {
    const ctx = getGameAudio(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function playCorrectSound() {
  try {
    const ctx = getGameAudio();
    [[523,0],[659,0.10],[784,0.20],[1047,0.30]].forEach(([f,t]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime + t);
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.25);
    });
  } catch (e) {}
}

function playWrongSound() {
  try {
    const ctx = getGameAudio(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

function speakItemName(name) {
  if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
    responsiveVoice.cancel();
    responsiveVoice.speak(name + '!', 'Indonesian Female', { rate: 1.1, pitch: 1.15, volume: 1 });
  } else if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(name + '!');
    u.lang = 'id-ID'; u.rate = 1.05; u.pitch = 1.2; u.volume = 1;
    window.speechSynthesis.speak(u);
  }
}

/* ============================================================
   LIVES UI
   ============================================================ */
function updateLivesUI() {
  const row = document.getElementById('game-lives-row');
  if (!row) return;
  const stars = row.querySelectorAll('.game-life');
  stars.forEach((s, i) => {
    if (i < GameState.lives) {
      s.textContent = '⭐'; s.style.opacity = '1'; s.style.transform = 'scale(1)';
    } else {
      s.textContent = '🖤'; s.style.opacity = '0.35'; s.style.transform = 'scale(0.8)';
    }
  });
}

/* ============================================================
   GAME INIT
   ============================================================ */
function startGame() {
  GameState.running = true; GameState.lives = 5; GameState.timer = 60;
  GameState.correctCount = 0; GameState.wrongCount = 0;
  GameState.selectedItem = null; GameState.currentItems = []; GameState.itemIdCounter = 0;

  updateLivesUI(); updateTimerUI();

  const container   = document.getElementById('trash-item-container');
  const instruction = document.getElementById('game-instruction');
  const gameOver    = document.getElementById('game-over-screen');
  const instrText   = document.getElementById('game-instruction-text');

  if (instruction) instruction.style.display = 'none';
  if (gameOver)    gameOver.classList.add('hidden');
  if (instrText)   instrText.style.display = 'block';
  if (container) {
    Array.from(container.children).forEach(c => { if (c.id !== 'game-instruction') c.remove(); });
  }

  clearBinHighlights();
  GameState.timerInterval = setInterval(tickTimer, 1000);
  spawnItem();
  GameState.spawnInterval = setInterval(() => {
    if (GameState.currentItems.length < 2) spawnItem();
  }, 2000);

  showToast('🎮 Game dimulai! Pilah sampah yang benar!', 2000);
}

function stopGame() {
  GameState.running = false;
  clearInterval(GameState.timerInterval); clearInterval(GameState.spawnInterval);
  GameState.timerInterval = null; GameState.spawnInterval = null;
}

/* ============================================================
   TIMER
   ============================================================ */
function tickTimer() {
  if (!GameState.running) return;
  GameState.timer--; updateTimerUI();
  if (GameState.timer <= 0) endGame();
  const el = document.getElementById('game-timer');
  if (el && GameState.timer <= 10) { el.style.color = '#fca5a5'; el.style.animation = 'pulse-dot 1s infinite'; }
}

function updateTimerUI() {
  const el = document.getElementById('game-timer');
  if (el) el.textContent = GameState.timer;
}

/* ============================================================
   ITEM SPAWNING (max 2)
   ============================================================ */
function spawnItem() {
  if (!GameState.running || GameState.currentItems.length >= 2) return;
  const pool = TRASH_ITEMS.filter(t => !GameState.currentItems.some(i => i.templateId === t.id));
  if (!pool.length) return;

  const template = pool[Math.floor(Math.random() * pool.length)];
  const uid      = `item-${GameState.itemIdCounter++}`;
  GameState.currentItems.push({ ...template, uid, templateId: template.id });

  const container = document.getElementById('trash-item-container');
  if (!container) return;
  const prompt = document.getElementById('game-instruction');
  if (prompt) prompt.style.display = 'none';

  const el = document.createElement('div');
  el.id = uid; el.className = 'trash-item';
  el.draggable = true;
  el.setAttribute('data-type', template.type);
  el.setAttribute('data-uid', uid);
  el.innerHTML = `<span class="trash-item-emoji">${template.emoji}</span><span class="trash-item-name">${template.name}</span>`;

  el.addEventListener('click', () => { playSelectSound(); speakItemName(template.name); selectItem(uid); });
  el.addEventListener('touchstart', handleTouchStart, { passive: true });
  el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
  el.addEventListener('touchend',   handleTouchEnd,   { passive: true });
  el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', uid);
    el.style.opacity = '0.5'; GameState.selectedItem = uid;
    playSelectSound(); speakItemName(template.name); highlightBins(true);
  });
  el.addEventListener('dragend', () => { el.style.opacity = '1'; highlightBins(false); });

  container.appendChild(el);
}

/* ============================================================
   TOUCH DRAG
   ============================================================ */
let touchDragEl = null, touchClone = null, touchOffsetX = 0, touchOffsetY = 0;

function handleTouchStart(e) {
  const el = e.currentTarget, touch = e.touches[0], rect = el.getBoundingClientRect();
  touchDragEl = el; touchOffsetX = touch.clientX - rect.left; touchOffsetY = touch.clientY - rect.top;
  touchClone = el.cloneNode(true);
  touchClone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;opacity:.85;z-index:9999;pointer-events:none;transform:scale(1.15) rotate(4deg);box-shadow:0 16px 40px rgba(0,0,0,.25);`;
  document.body.appendChild(touchClone);
  el.style.opacity = '0.3'; GameState.selectedItem = el.getAttribute('data-uid');
  playSelectSound(); speakItemName(el.querySelector('.trash-item-name')?.textContent || ''); highlightBins(true);
}

function handleTouchMove(e) {
  e.preventDefault(); if (!touchClone) return;
  const t = e.touches[0];
  touchClone.style.left = `${t.clientX - touchOffsetX}px`; touchClone.style.top = `${t.clientY - touchOffsetY}px`;
  ['bin-organik','bin-anorganik'].forEach(id => {
    const b = document.getElementById(id); if (!b) return;
    const r = b.getBoundingClientRect();
    b.classList.toggle('drag-active', t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom);
  });
}

function handleTouchEnd(e) {
  if (!touchDragEl || !touchClone) return;
  const touch = e.changedTouches[0], uid = touchDragEl.getAttribute('data-uid');
  let dropped = false;
  for (const binId of ['bin-organik','bin-anorganik']) {
    const b = document.getElementById(binId); if (!b) continue;
    const r = b.getBoundingClientRect();
    if (touch.clientX>=r.left&&touch.clientX<=r.right&&touch.clientY>=r.top&&touch.clientY<=r.bottom) {
      processItemDrop(uid, binId.replace('bin-',''));  dropped = true; break;
    }
  }
  touchClone.remove(); touchClone = null;
  if (touchDragEl) { touchDragEl.style.opacity = '1'; touchDragEl = null; }
  highlightBins(false); clearBinHighlights();
  if (!dropped) GameState.selectedItem = null;
}

/* ============================================================
   ITEM SELECTION
   ============================================================ */
function selectItem(uid) {
  if (GameState.selectedItem && GameState.selectedItem !== uid) {
    const prev = document.getElementById(GameState.selectedItem);
    if (prev) prev.classList.remove('selected');
  }
  if (GameState.selectedItem === uid) {
    const el = document.getElementById(uid);
    if (el) el.classList.remove('selected');
    GameState.selectedItem = null; highlightBins(false);
  } else {
    GameState.selectedItem = uid;
    const el = document.getElementById(uid);
    if (el) el.classList.add('selected');
    highlightBins(true); showToast('👆 Ketuk tempat sampah yang tepat!', 1500);
  }
}

function clickBin(binType) {
  if (!GameState.running) return;
  if (!GameState.selectedItem) { showToast('⚠️ Pilih sampah dulu ya!', 1500); return; }
  processItemDrop(GameState.selectedItem, binType);
  GameState.selectedItem = null; highlightBins(false);
}

function dropItem(event, binType) {
  event.preventDefault();
  const uid = event.dataTransfer.getData('text/plain') || GameState.selectedItem;
  if (uid) processItemDrop(uid, binType); clearBinHighlights();
}

/* ============================================================
   PROCESS DROP — Lives System
   ============================================================ */
function processItemDrop(uid, targetBin) {
  const idx = GameState.currentItems.findIndex(i => i.uid === uid);
  if (idx === -1) return;
  const item = GameState.currentItems[idx], correct = item.type === targetBin;
  GameState.currentItems.splice(idx, 1);

  const el = document.getElementById(uid);
  if (el) {
    el.style.transition = 'transform .3s, opacity .3s';
    el.style.transform = correct ? 'scale(0) translateY(-30px)' : 'scale(0) rotate(20deg)';
    el.style.opacity = '0'; setTimeout(() => el.remove(), 300);
  }

  if (correct) {
    GameState.correctCount++; playCorrectSound();
    showFeedback(true, item.emoji);
    showToast(`✅ Hebat! Benar! 🎉`, 1400);
  } else {
    GameState.wrongCount++; GameState.lives--;
    playWrongSound(); updateLivesUI();
    showFeedback(false, item.emoji);
    showToast(`❌ ${item.name} itu ${item.type}! Nyawa -1 💔`, 2000);
    if (GameState.lives <= 0) { setTimeout(endGame, 600); return; }
  }

  setTimeout(() => { if (GameState.running && GameState.currentItems.length < 2) spawnItem(); }, 700);
}

/* ============================================================
   FEEDBACK
   ============================================================ */
function showFeedback(correct, emoji) {
  const overlay = document.getElementById('feedback-overlay'), content = document.getElementById('feedback-content');
  if (!overlay || !content) return;
  content.className = `feedback-content ${correct ? 'feedback-correct' : 'feedback-wrong'}`;
  content.innerHTML = correct
    ? `<span style="font-size:60px">${emoji}</span><p style="font-size:22px;font-weight:900;color:#2d6a4f;margin-top:8px">Hebat! ✅</p>`
    : `<span style="font-size:60px">${emoji}</span><p style="font-size:20px;font-weight:900;color:#ef4444;margin-top:8px">Salah Tempat! 💔</p>`;
  overlay.classList.remove('hidden'); overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('hidden'), 1000);
}

/* ============================================================
   BINS
   ============================================================ */
function highlightBins(active) {
  ['bin-organik','bin-anorganik'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.toggle('drag-active', active); });
}
function clearBinHighlights() {
  ['bin-organik','bin-anorganik'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('drag-active'); });
}

/* ============================================================
   END GAME
   ============================================================ */
function endGame() {
  stopGame();
  if (typeof AppState !== 'undefined') AppState.gamesPlayed++;

  const lives = GameState.lives, correct = GameState.correctCount;
  let trophy = '💔', title = 'Coba Lagi Ya!';
  if (lives >= 4 && correct >= 6)      { trophy = '🏆'; title = 'Luar Biasa!'; }
  else if (lives >= 2 && correct >= 3) { trophy = '🥈'; title = 'Bagus Sekali!'; }
  else if (lives >= 1)                 { trophy = '🥉'; title = 'Terus Berlatih!'; }

  const starsStr = '⭐'.repeat(lives) + '🖤'.repeat(5 - lives);
  document.getElementById('game-over-trophy').textContent = trophy;
  document.getElementById('game-over-title').textContent  = title;
  document.getElementById('game-over-score').textContent  = starsStr || '💔';
  document.getElementById('stat-benar').textContent = `${GameState.correctCount} Benar`;
  document.getElementById('stat-salah').textContent = `${GameState.wrongCount} Salah`;

  const go = document.getElementById('game-over-screen');
  if (go) go.classList.remove('hidden');
  const container = document.getElementById('trash-item-container');
  if (container) container.innerHTML = '';
}

function restartGame() {
  const go = document.getElementById('game-over-screen');
  if (go) go.classList.add('hidden');
  startGame();
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  ['bin-organik','bin-anorganik'].forEach(id => {
    const b = document.getElementById(id); if (!b) return;
    b.addEventListener('dragenter', () => { if (GameState.selectedItem) b.classList.add('drag-active'); });
    b.addEventListener('dragleave', () => b.classList.remove('drag-active'));
  });
  console.log('🎮 EcoKids Game (Lives Mode) — loaded!');
});