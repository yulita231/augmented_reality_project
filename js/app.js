/**
 * EcoKids AR - app.js
 * SPA Navigation | AR Control | Text-to-Speech | Detail Materi
 * ============================================================
 */

'use strict';

/* ============================================================
   STATE MANAGEMENT
   ============================================================ */
const AppState = {
  currentScreen: 'home',
  totalScore: 0,
  completedMateri: [],
  gamesPlayed: 0,
  arRunning: false,
  arRotating: false,
  arSystem: null,
  arRotationInterval: null,
  speechSynth: window.speechSynthesis || null,
  funFactIndex: 0,
  currentARTarget: null,
};

/* ============================================================
   CONTENT DATA
   ============================================================ */
const MATERI_DATA = {
  organik: {
    emoji: '🥦',
    color: { from: '#15803d', to: '#4ade80', accent: '#86efac' },
    tag: 'Sampah Organik',
    title: 'Sampah Organik',
    subtitle: 'Sampah yang berasal dari makhluk hidup',
    desc: `Sampah organik adalah sampah alami dari sisa makanan dan tumbuhan! Sampah ini hebat karena bisa hancur sendiri di dalam tanah dan berubah jadi makanan penyubur tanaman! 🌱`,
    examples: [
      { emoji: '🍌', label: 'Kulit Pisang' },
      { emoji: '🍂', label: 'Daun Kering' },
      { emoji: '🍊', label: 'Kulit Buah' },
      { emoji: '🍚', label: 'Sisa Nasi' },
      { emoji: '🥚', label: 'Cangkang Telur' },
      { emoji: '🌿', label: 'Rumput/Ranting' },
    ],
    tts: 'Sampah organik adalah sampah alami dari sisa makanan dan tumbuhan! Sampah ini hebat karena bisa hancur sendiri di dalam tanah dan berubah jadi makanan penyubur tanaman!',
    nextScreen: null,
    binColor: '#22c55e',
  },
  anorganik: {
    emoji: '🧴',
    color: { from: '#a16207', to: '#facc15', accent: '#fde68a' },
    tag: 'Sampah Anorganik',
    title: 'Sampah Anorganik',
    subtitle: 'Sampah buatan manusia yang sulit terurai',
    desc: `Sampah buatan manusia yang susah sekali hancur di tanah. Supaya bumi tidak kotor dan tercemar, kita harus rajin mengumpulkannya untuk didaur ulang jadi barang baru yang berguna! ♻️`,
    examples: [
      { emoji: '🧴', label: 'Botol Plastik' },
      { emoji: '🥫', label: 'Kaleng Minuman' },
      { emoji: '📄', label: 'Kertas Bekas' },
      { emoji: '🪟', label: 'Pecahan Kaca' },
      { emoji: '🔋', label: 'Baterai' },
      { emoji: '👜', label: 'Kantong Plastik' },
    ],
    tts: 'Sampah buatan manusia yang susah sekali hancur di tanah. Supaya bumi tidak kotor dan tercemar, kita harus rajin mengumpulkannya untuk didaur ulang jadi barang baru yang berguna!',
    nextScreen: null,
    binColor: '#eab308',
  },
};

const FUN_FACTS = [
  'Sampah plastik butuh 500 tahun untuk terurai di tanah! Yuk, kurangi pakai plastik! 🌱',
  'Indonesia adalah penghasil sampah plastik laut terbesar ke-2 di dunia. Ayo kita ubah! 🌊',
  'Mendaur ulang 1 ton kertas bisa menyelamatkan 17 pohon! 🌲',
  'Sampah makanan bisa jadi pupuk kompos yang menyuburkan tanaman 🥦',
  'Membawa tumbler sendiri bisa hemat ratusan botol plastik per tahun! 🍶',
];

/* ============================================================
   MAPPING TARGET AR -> KATEGORI SAMPAH
   Urutan HARUS sama persis dengan targetIndex di index.html
   dan urutan gambar saat generate targets.mind
   ============================================================ */
const AR_TARGET_INFO = [
  { category: 'anorganik', label: 'Baterai',         emoji: '🔋' }, // targetIndex 0
  { category: 'anorganik', label: 'Botol Plastik',   emoji: '🧴' }, // targetIndex 1
  { category: 'anorganik', label: 'Kaleng',          emoji: '🥫' }, // targetIndex 2
  { category: 'anorganik', label: 'Plastik',         emoji: '🛍️' }, // targetIndex 3
  { category: 'anorganik', label: 'Kemasan Snack',   emoji: '🍬' }, // targetIndex 4
  { category: 'organik',   label: 'Daun Kering',     emoji: '🍂' }, // targetIndex 5
  { category: 'organik',   label: 'Kulit Pisang',    emoji: '🍌' }, // targetIndex 6
  { category: 'organik',   label: 'Kulit Telur',     emoji: '🥚' }, // targetIndex 7
  { category: 'organik',   label: 'Sisa Makanan',    emoji: '🍚' }, // targetIndex 8
  { category: 'organik',   label: 'Tulang Ayam',     emoji: '🍗' }, // targetIndex 9
];

/* ============================================================
   SPA NAVIGATION
   ============================================================ */
function showScreen(screenId) {
  // Special case: going to AR
  if (screenId === 'screen-ar') {
    document.querySelectorAll('.screen.active').forEach(s => {
      s.classList.remove('active');
    });
    const arScreen = document.getElementById('screen-ar');
    arScreen.classList.add('active');
    AppState.currentScreen = 'ar';
    updateNav('ar');
    return;
  }

  // Stop AR if leaving
  if (AppState.arRunning) stopAR();

  // Hide all screens
  document.querySelectorAll('.screen.active').forEach(s => {
    s.classList.remove('active');
  });

  // Show target screen
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    AppState.currentScreen = screenId.replace('screen-', '');
    window.scrollTo(0, 0);
  }

  // Update nav
  const navMap = {
    'screen-home': 'home',
    'screen-materi': 'materi',
    'screen-ar': 'ar',
    'screen-game': 'game',
    'screen-profil': 'profil',
    'screen-detail': null,
  };
  if (navMap[screenId]) updateNav(navMap[screenId]);

  // Update profil stats
  if (screenId === 'screen-profil') {
    updateProfilStats();
    loadAvatar();
  }
  if (screenId === 'screen-home') updateHomeStats();
}

function navTo(section) {
  const screenMap = {
    home: 'screen-home',
    materi: 'screen-materi',
    ar: 'screen-ar',
    game: 'screen-game',
    profil: 'screen-profil',
  };
  showScreen(screenMap[section]);
}

function updateNav(active) {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  const target = document.getElementById(`nav-${active}`);
  if (target) target.classList.add('active');
}

function updateHomeStats() {
  const el = document.getElementById('home-score');
  const elDone = document.getElementById('home-done');
  if (el) el.textContent = `${AppState.totalScore} Poin`;
  if (elDone) elDone.textContent = `${AppState.completedMateri.length} Selesai`;
}

function updateProfilStats() {
  const ps = document.getElementById('profil-score');
  const pg = document.getElementById('profil-games');
  const pm = document.getElementById('profil-materi');
  if (ps) ps.textContent = AppState.totalScore;
  if (pg) pg.textContent = AppState.gamesPlayed;
  if (pm) pm.textContent = AppState.completedMateri.length;
}

/* ============================================================
   PROFIL AVATAR — GANTI FOTO DARI GALERI
   ============================================================ */
function handleAvatarChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate it's an image
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Pilih file gambar ya!');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    // Save to localStorage
    try {
      localStorage.setItem('ecokids-avatar', base64);
    } catch (err) {
      // localStorage might be full if image is too large
      showToast('⚠️ Foto terlalu besar, coba foto yang lebih kecil!');
      return;
    }
    // Apply to UI
    applyAvatarImage(base64);
    showToast('🎉 Foto profil berhasil diganti!');
  };
  reader.onerror = () => showToast('⚠️ Gagal membaca foto, coba lagi!');
  reader.readAsDataURL(file);

  // Reset input so same file can be re-selected
  event.target.value = '';
}

function loadAvatar() {
  const saved = localStorage.getItem('ecokids-avatar');
  if (saved) {
    applyAvatarImage(saved);
  } else {
    // Show emoji, hide photo
    const img = document.getElementById('profil-avatar-img');
    const emoji = document.getElementById('profil-avatar-emoji');
    if (img) img.classList.add('hidden');
    if (emoji) emoji.style.display = 'block';
  }
}

function applyAvatarImage(src) {
  const img = document.getElementById('profil-avatar-img');
  const emoji = document.getElementById('profil-avatar-emoji');
  if (img) {
    img.src = src;
    img.classList.remove('hidden');
  }
  if (emoji) emoji.style.display = 'none';
}

/* ============================================================
   DETAIL MATERI
   ============================================================ */
function showDetail(type) {
  const data = MATERI_DATA[type];
  if (!data) return;

  // Build chips — big emoji card style with sound on tap
  const chips = data.examples.map(ex => {
    // Escape single quotes in label for inline onclick
    const safeLbl = ex.label.replace(/'/g, "\\'");
    return `<div class="detail-chip" onclick="playChipSound('${safeLbl}', this)">
      <span class="chip-sound-badge">🔊</span>
      <span class="chip-emoji">${ex.emoji}</span>
      <span class="chip-label">${ex.label}</span>
    </div>`;
  }).join('');

  // Build next button
  const nextBtn = data.nextScreen
    ? `<button class="btn-green-main" style="flex:1" onclick="showDetail('${data.nextScreen}')">Materi Berikutnya →</button>`
    : `<button class="btn-green-main" style="flex:1" onclick="showScreen('screen-materi')">✅ Selesai!</button>`;

  const colorGrad = `linear-gradient(160deg, ${data.color.from}, ${data.color.to}, ${data.color.accent})`;

  // Carousel dots (simulate with 3 dots, first active)
  const dots = `
    <div class="detail-dots">
      <div class="detail-dot active"></div>
      <div class="detail-dot"></div>
      <div class="detail-dot"></div>
    </div>`;

  const html = `
    <div class="detail-header" style="background: ${colorGrad};">
      <button class="detail-back" onclick="showScreen('screen-materi')" aria-label="Kembali">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <div class="detail-showcase">${data.emoji}</div>
      ${dots}
      <span class="detail-tag">${data.tag}</span>
      <h2 class="detail-title">${data.title}</h2>
    </div>
    <div class="detail-body">
      <div class="detail-q-box" style="border-left-color: ${data.binColor};">
        <p class="detail-q-title">Apa itu ${data.title}?</p>
        <p class="detail-q-text">${data.desc}</p>
      </div>
      <p class="detail-section-label">Contoh:</p>
      <div class="detail-chips">${chips}</div>
      <div class="detail-actions">
        <button class="btn-listen" onclick="speakText('${type}')" id="btn-tts-${type}">
          🔊 Dengarkan
        </button>
        ${nextBtn}
      </div>
    </div>
  `;

  document.getElementById('detail-content').innerHTML = html;

  // Mark as visited
  if (!AppState.completedMateri.includes(type)) {
    AppState.completedMateri.push(type);
    AppState.totalScore += 5;
    showToast(`📖 +5 Poin untuk membaca ${data.title}!`);
  }

  showScreen('screen-detail');
}

/* ============================================================
   TEXT-TO-SPEECH
   ============================================================ */
function speakText(type) {
  const data = MATERI_DATA[type];
  if (!data) return;

  const btn = document.getElementById(`btn-tts-${type}`);

  // ── Button: speaking state ──
  function setPlaying() {
    if (btn) {
      btn.textContent = '⏹ Berhenti';
      btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btn.onclick = () => stopSpeak(type);
    }
  }
  function setIdle() {
    if (btn) {
      btn.innerHTML = '🔊 Dengarkan';
      btn.style.background = '';
      btn.onclick = () => speakText(type);
    }
  }

  // ── ResponsiveVoice (primary — Indonesian Female, natural guru voice) ──
  if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
    responsiveVoice.cancel();
    setPlaying();
    responsiveVoice.speak(data.tts, 'Indonesian Female', {
      rate:    0.95,   // Slightly slower for listening comprehension
      pitch:   1.05,   // Natural warm teacher pitch
      volume:  1,
      onend:   () => setIdle(),
      onerror: () => setIdle(),
    });
    return;
  }

  // ── Fallback: browser SpeechSynthesis ──
  if (!AppState.speechSynth) {
    showToast('Browser kamu tidak mendukung Text-to-Speech 😅');
    return;
  }
  AppState.speechSynth.cancel();

  const utterance = new SpeechSynthesisUtterance(data.tts);
  utterance.lang  = 'id-ID';
  utterance.rate  = 0.9;
  utterance.pitch = 1.1;
  utterance.volume = 1;

  utterance.onstart = () => setPlaying();
  utterance.onend   = utterance.onerror = () => setIdle();

  const voices  = AppState.speechSynth.getVoices();
  const idVoice = voices.find(v => v.lang.startsWith('id')) ||
    voices.find(v => v.lang.startsWith('en'));
  if (idVoice) utterance.voice = idVoice;

  AppState.speechSynth.speak(utterance);
}

function stopSpeak(type) {
  if (typeof responsiveVoice !== 'undefined') responsiveVoice.cancel();
  if (AppState.speechSynth) AppState.speechSynth.cancel();
  const btn = document.getElementById(`btn-tts-${type}`);
  if (btn) {
    btn.innerHTML = '🔊 Dengarkan';
    btn.style.background = '';
    btn.onclick = () => speakText(type);
  }
}

/* ============================================================
   CHIP SOUND — FUN AUDIO FOR KIDS (Web Audio API)
   ============================================================ */
let chipAudioCtx = null;

function getAudioCtx() {
  if (!chipAudioCtx || chipAudioCtx.state === 'closed') {
    chipAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (chipAudioCtx.state === 'suspended') chipAudioCtx.resume();
  return chipAudioCtx;
}

function playChipSound(label, chipEl) {
  // 1. Visual pulse effect on the chip
  if (chipEl) {
    chipEl.classList.remove('playing');
    void chipEl.offsetWidth;
    chipEl.classList.add('playing');
    setTimeout(() => chipEl.classList.remove('playing'), 600);
  }

  // 2. Energetic 4-note pop melody (Web Audio API) — C5-E5-G5-C6
  try {
    const ctx = getAudioCtx();
    const melody = [
      { freq: 523.25, t: 0.00, dur: 0.10 },
      { freq: 659.25, t: 0.08, dur: 0.10 },
      { freq: 783.99, t: 0.16, dur: 0.10 },
      { freq: 1046.5, t: 0.24, dur: 0.18 },
    ];
    melody.forEach(({ freq, t, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.01);
    });
  } catch (e) {
    console.warn('Audio play failed:', e);
  }

  // 3. Speak using ResponsiveVoice (Indonesian Female — natural teacher voice)
  // Fallback to browser SpeechSynthesis if offline / not loaded
  const intros = ['Wah, ini ', 'Ini dia ', 'Yuk lihat, ', 'Kita punya '];
  const intro   = intros[Math.floor(Math.random() * intros.length)];
  const text    = intro + label + '!';

  setTimeout(() => {
    if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
      // ✅ ResponsiveVoice — natural Indonesian Female (guru-like)
      responsiveVoice.cancel();
      responsiveVoice.speak(text, 'Indonesian Female', {
        rate:   1.0,    // Clear, normal conversational pace
        pitch:  1.1,    // Warm, friendly — not too high, not robotic
        volume: 1,
        onstart: () => console.log('🔊 RV speaking:', text),
      });
    } else {
      // Fallback: browser TTS
      if (!AppState.speechSynth) return;
      AppState.speechSynth.cancel();
      const utter   = new SpeechSynthesisUtterance(text);
      utter.lang    = 'id-ID';
      utter.rate    = 1.05;
      utter.pitch   = 1.2;
      utter.volume  = 1;
      const voices  = AppState.speechSynth.getVoices();
      const best    =
        voices.find(v => v.lang.startsWith('id') && v.localService) ||
        voices.find(v => v.lang.startsWith('id')) ||
        voices.find(v => v.localService) ||
        voices[0];
      if (best) utter.voice = best;
      AppState.speechSynth.speak(utter);
    }
  }, 250);
}

/* ============================================================
   AR DETECT SOUND — chime pendek pas model 3D muncul
   ============================================================ */
function playARDetectSound() {
  try {
    const ctx = getAudioCtx();
    // Chime naik 2 nada — G5 -> C6, kesan "ting~" ringan & ceria
    const notes = [
      { freq: 783.99, t: 0.00, dur: 0.12 },
      { freq: 1046.5, t: 0.10, dur: 0.22 },
    ];
    notes.forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.01);
    });
  } catch (e) {
    console.warn('AR detect sound failed:', e);
  }
}

/* ============================================================
   AR SCAN
   ============================================================ */
async function startAR() {
  const startOverlay = document.getElementById('ar-start-overlay');
  const startBtn = document.getElementById('btn-start-ar');

  if (startBtn) {
    startBtn.textContent = '⏳ Memulai kamera...';
    startBtn.disabled = true;
  }

  try {
    const scene = document.getElementById('ar-scene');

    if (!scene) throw new Error('A-Frame scene not found');

    // Show scene, hide start overlay
    scene.style.display = 'block';

    // Initialize MindAR
    const mindarSystem = scene.systems && scene.systems['mindar-image-system'];

    // Listen for target events
    //scene.addEventListener('markerFound', handleMarkerFound, { once: false });
    //scene.addEventListener('markerLost', handleMarkerLost, { once: false });

    scene.addEventListener('targetFound', handleMarkerFound, { once: false });
    scene.addEventListener('targetLost', handleMarkerLost, { once: false });
    // taruh di startAR(), dekat listener markerFound/markerLost
    scene.addEventListener('arReady', () => console.log('[MindAR] READY'));
    scene.addEventListener('arError', (e) => console.error('[MindAR] ERROR:', e.detail));
    // Start MindAR via A-Frame play
    if (scene.systems && scene.systems['mindar-image-system']) {
      AppState.arSystem = scene.systems['mindar-image-system'];
      await AppState.arSystem.start();
    } else {
      // Fallback: play the scene
      scene.play && scene.play();
    }

    AppState.arRunning = true;
    if (startOverlay) startOverlay.style.display = 'none';

    showToast('📷 AR dimulai! Arahkan ke marker');

  } catch (err) {
    console.error('AR Error:', err);
    let msg = 'Gagal memulai AR.';

    if (err.name === 'NotAllowedError') {
      msg = '⚠️ Izin kamera ditolak. Mohon izinkan kamera di pengaturan browser.';
    } else if (err.message && err.message.includes('mind')) {
      msg = '⚠️ File targets.mind tidak ditemukan. Pastikan file marker tersedia.';
    } else {
      msg = `⚠️ Error: ${err.message || 'Tidak bisa akses kamera'}`;
    }

    showToast(msg, 4000);
    if (startBtn) {
      startBtn.textContent = '🔄 Coba Lagi';
      startBtn.disabled = false;
    }
  }
}

function stopAR() {
  const scene = document.getElementById('ar-scene');
  const startOverlay = document.getElementById('ar-start-overlay');

  // Stop rotation
  if (AppState.arRotationInterval) {
    clearInterval(AppState.arRotationInterval);
    AppState.arRotationInterval = null;
    AppState.arRotating = false;
  }

  // Stop MindAR
  try {
    if (AppState.arSystem) {
      AppState.arSystem.stop();
      AppState.arSystem = null;
    }
    if (scene) {
      scene.pause && scene.pause();
    }
  } catch (e) {
    console.warn('AR stop error:', e);
  }

  AppState.arRunning = false;

  // Show start overlay again
  if (startOverlay) startOverlay.style.display = 'flex';

  // Hide info panel
  const infoPanel = document.getElementById('ar-info-panel');
  if (infoPanel) infoPanel.classList.add('hidden');

  // Reset status
  const statusEl = document.getElementById('ar-status');
  if (statusEl) {
    statusEl.innerHTML = '<span class="ar-status-dot"></span><span class="text-xs text-white font-semibold">Mencari...</span>';
  }

  showScreen('screen-home');
}

function handleMarkerFound(event) {
  const infoPanel = document.getElementById('ar-info-panel');
  const statusEl = document.getElementById('ar-status');

  // Ambil targetIndex dari entity yang mengirim event ini
  const targetComponent = event.target.components['mindar-image-target'];
  const targetIndex = targetComponent ? targetComponent.data.targetIndex : 0;
  const info = AR_TARGET_INFO[targetIndex] || AR_TARGET_INFO[0];

  // Simpan supaya bisa dipakai di playARInfo() dan tombol "Pelajari"
  AppState.currentARTarget = info;
    const model = event.target.querySelector('a-gltf-model');
    if (model) {
      model.setAttribute('visible', true);
      playARDetectSound(); // 🔊 bunyi pas objek 3D muncul
    }

  if (infoPanel) {
    infoPanel.classList.remove('hidden');
    infoPanel.innerHTML = `
      <span class="text-lg">${info.emoji}</span>
      <div>
        <p class="text-xs font-black text-green-900">${info.label}</p>
        <p class="text-xs text-green-700">Sampah ${info.category === 'organik' ? 'Organik' : 'Anorganik'} — Terdeteksi!</p>
      </div>
      <button onclick="showDetail('${info.category}')" class="ar-pill-btn">Pelajari →</button>
    `;
  }

  if (statusEl) {
    statusEl.innerHTML = '<span class="ar-status-dot found"></span><span class="text-xs text-white font-semibold">Terdeteksi! ✓</span>';
  }

  showToast(`🎯 ${info.label} terdeteksi!`, 2000);
}

function handleMarkerLost(event) {
  const infoPanel = document.getElementById('ar-info-panel');
  const statusEl = document.getElementById('ar-status');

   const model = event.target.querySelector('a-gltf-model');
   if (model) model.setAttribute('visible', false);

  if (infoPanel) infoPanel.classList.add('hidden');
  if (statusEl) {
    statusEl.innerHTML = '<span class="ar-status-dot"></span><span class="text-xs text-white font-semibold">Mencari...</span>';
  }
}

function toggleARRotate() {
  const btn = document.getElementById('btn-ar-rotate');
  const group = document.getElementById('ar-trash-group');
  const group2 = document.getElementById('ar-trash-group-2');

  if (!AppState.arRotating) {
    AppState.arRotating = true;
    let rot = 0;
    AppState.arRotationInterval = setInterval(() => {
      rot += 2;
      if (group) group.setAttribute('rotation', `0 ${rot} 0`);
      if (group2) group2.setAttribute('rotation', `0 ${rot} 0`);
    }, 30);
    if (btn) {
      btn.style.background = 'rgba(34, 197, 94, 0.35)';
      btn.style.borderColor = '#22c55e';
    }
    showToast('🔄 Rotasi otomatis aktif');
  } else {
    AppState.arRotating = false;
    clearInterval(AppState.arRotationInterval);
    AppState.arRotationInterval = null;
    if (btn) {
      btn.style.background = '';
      btn.style.borderColor = '';
    }
    showToast('⏹ Rotasi dihentikan');
  }
}

function captureAR() {
  const flash = document.getElementById('capture-flash');
  if (flash) {
    flash.classList.remove('hidden');
    setTimeout(() => flash.classList.add('hidden'), 400);
  }
  showToast('📸 Foto diambil! (Demo mode)', 2000);
}

function playARInfo() {
  if (!AppState.speechSynth) {
    showToast('Browser tidak mendukung Text-to-Speech');
    return;
  }
  AppState.speechSynth.cancel();

  const info = AppState.currentARTarget;
  let text;
  if (info) {
    const materi = MATERI_DATA[info.category];
    text = `Ini adalah ${info.label}, termasuk sampah ${info.category}. ${materi.tts}`;
  } else {
    text = 'Arahkan kamera ke gambar marker untuk melihat penjelasannya.';
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'id-ID';
  utter.rate = 0.85;
  utter.pitch = 1.0;
  AppState.speechSynth.speak(utter);
  showToast('🔊 Memutar penjelasan AR...');
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
let toastTimeout = null;

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  if (toastTimeout) clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

/* ============================================================
   FUN FACTS ROTATION
   ============================================================ */
function rotateFunFact() {
  AppState.funFactIndex = (AppState.funFactIndex + 1) % FUN_FACTS.length;
  const el = document.getElementById('fun-fact-text');
  if (el) {
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = FUN_FACTS[AppState.funFactIndex];
      el.style.opacity = '1';
      el.style.transition = 'opacity 0.5s ease';
    }, 300);
  }
}

/* ============================================================
   GAME LEAVE CONFIRMATION
   ============================================================ */
function confirmLeaveGame() {
  // Check if game is running
  if (window.GameState && window.GameState.running) {
    if (confirm('⚠️ Game sedang berjalan! Yakin ingin keluar? Progres akan hilang.')) {
      if (typeof stopGame === 'function') stopGame();
      showScreen('screen-home');
    }
  } else {
    showScreen('screen-home');
  }
}

/* ============================================================
   INITIALIZE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Show initial screen
  showScreen('screen-home');

  // Rotate fun facts every 6 seconds
  setInterval(rotateFunFact, 6000);

  // Preload voices for TTS
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      window.speechSynthesis.getVoices();
    });
  }

  // Handle back button
  window.addEventListener('popstate', () => {
    showScreen('screen-home');
  });

  console.log('🌿 EcoKids AR — App initialized!');
});