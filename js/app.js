/**
 * EcoKids AR - app.js
 * SPA Navigation | AR Control | Text-to-Speech | Detail Materi
 * ============================================================
 */

'use strict';
/* ============================================================
   PAGE CONFIG
============================================================ */

const PAGE_CONFIG = {
  'screen-home': 'pages/home.html',
  'screen-materi': 'pages/materi/materi.html',
  'screen-ar': 'pages/ar.html',
  'screen-game': 'pages/game.html',
  'screen-profil': 'pages/profil.html'
};


/* ============================================================
   PAGE CACHE
   Supaya file tidak di-fetch berulang kali
============================================================ */

const pageCache = {};


/* ============================================================
   LOAD PAGE
============================================================ */

async function loadPage(screenId) {

  const container = document.getElementById(screenId);

  if (!container) {
    console.error(`Screen tidak ditemukan: ${screenId}`);
    return;
  }

  // Kalau sudah pernah di-load
  if (pageCache[screenId]) {
    container.innerHTML = pageCache[screenId];
    return;
  }

  const pageUrl = PAGE_CONFIG[screenId];

  if (!pageUrl) {
    console.error(`Page belum terdaftar: ${screenId}`);
    return;
  }

  try {

    const response = await fetch(pageUrl);

    if (!response.ok) {
      throw new Error(
        `Gagal mengambil ${pageUrl}: ${response.status}`
      );
    }

    const html = await response.text();

    pageCache[screenId] = html;

    container.innerHTML = html;

  } catch (error) {

    console.error('Load page error:', error);

    container.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
                color:#c0392b;
            ">
                <h3>Oops!</h3>
                <p>Halaman gagal dimuat.</p>
            </div>
        `;
  }
}


/* ============================================================
   SHOW SCREEN
============================================================ */

/* ============================================================
   SHOW SCREEN
============================================================ */

async function showScreen(screenId, skipLoad = false) {

  /* ========================================================
     LOAD PAGE
  ======================================================== */

  if (!skipLoad) {
    await loadPage(screenId);
  }


  /* ========================================================
     SEMBUNYIKAN SEMUA SCREEN
  ======================================================== */

  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });


  /* ========================================================
     CARI SCREEN TUJUAN
  ======================================================== */

  const targetScreen = document.getElementById(screenId);

  if (!targetScreen) {

    console.error(
      `Target screen tidak ditemukan: ${screenId}`
    );

    return;
  }


  /* ========================================================
     TAMPILKAN SCREEN
  ======================================================== */

  targetScreen.classList.add('active');


  /* ========================================================
     SCREEN-SPECIFIC INITIALIZATION
  ======================================================== */

  if (screenId === 'screen-profil') {

    if (typeof initProfil === 'function') {
      initProfil();
    }

  }


  if (screenId === 'screen-game') {

    if (typeof initGame === 'function') {
      initGame();
    }

  }


  if (screenId === 'screen-ar') {

    if (typeof initAR === 'function') {
      initAR();
    }

  }


  if (screenId === 'screen-materi') {

    if (typeof initMateri === 'function') {
      initMateri();
    }

  }

}


/* ============================================================
   INITIAL APP
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  console.log('EcoKids App Starting...');

  await showScreen('screen-home');

});



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
  arBusy: false,
  arStopping: false,
};

const FUN_FACTS = [
  'Sampah plastik butuh 500 tahun untuk terurai di tanah! Yuk, kurangi pakai plastik! 🌱',
  'Indonesia adalah penghasil sampah plastik laut terbesar ke-2 di dunia. Ayo kita ubah! 🌊',
  'Mendaur ulang 1 ton kertas bisa menyelamatkan 17 pohon! 🌲',
  'Sampah makanan bisa jadi pupuk kompos yang menyuburkan tanaman 🥦',
  'Membawa tumbler sendiri bisa hemat ratusan botol plastik per tahun! 🍶',
];

/* ============================================================
   SPA NAVIGATION
   ============================================================ */
// function showScreen(screenId) {
//   stopMateriAudio(); // Stop any ongoing audio when switching screens
//   // Special case: going to AR
//   if (screenId === 'screen-ar') {
//     document.querySelectorAll('.screen.active').forEach(s => {
//       s.classList.remove('active');
//     });
//     const arScreen = document.getElementById('screen-ar');
//     arScreen.classList.add('active');
//     AppState.currentScreen = 'ar';
//     updateNav('ar');
//     return;
//   }

//   // Stop AR if leaving (cleanup saja, tanpa memaksa pindah ke Beranda —
//   // supaya tidak menimpa layar tujuan yang sedang dituju)
//   if (AppState.arRunning) stopARInternal();

//   // Hide all screens
//   document.querySelectorAll('.screen.active').forEach(s => {
//     s.classList.remove('active');
//   });

//   // Show target screen
//   const target = document.getElementById(screenId);
//   if (target) {
//     target.classList.add('active');
//     AppState.currentScreen = screenId.replace('screen-', '');
//     window.scrollTo(0, 0);
//   }

//   // Update nav
//   const navMap = {
//     'screen-home': 'home',
//     'screen-materi': 'materi',
//     'screen-ar': 'ar',
//     'screen-game': 'game',
//     'screen-profil': 'profil',
//     'screen-detail': null,
//   };
//   if (navMap[screenId]) updateNav(navMap[screenId]);

//   // Update profil stats
//   if (screenId === 'screen-profil') {
//     updateProfilStats();
//     loadAvatar();
//     loadUsername();
//   }
//   if (screenId === 'screen-home') updateHomeStats();
// }

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
      rate: 0.95,   // Slightly slower for listening comprehension
      pitch: 1.05,   // Natural warm teacher pitch
      volume: 1,
      onend: () => setIdle(),
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
  utterance.lang = 'id-ID';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  utterance.volume = 1;

  utterance.onstart = () => setPlaying();
  utterance.onend = utterance.onerror = () => setIdle();

  const voices = AppState.speechSynth.getVoices();
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

// function playChipSound(label, chipEl) {
//   // 1. Visual pulse effect on the chip
//   if (chipEl) {
//     chipEl.classList.remove('playing');
//     void chipEl.offsetWidth;
//     chipEl.classList.add('playing');
//     setTimeout(() => chipEl.classList.remove('playing'), 600);
//   }

//   // 2. Energetic 4-note pop melody (Web Audio API) — C5-E5-G5-C6
//   try {
//     const ctx = getAudioCtx();
//     const melody = [
//       { freq: 523.25, t: 0.00, dur: 0.10 },
//       { freq: 659.25, t: 0.08, dur: 0.10 },
//       { freq: 783.99, t: 0.16, dur: 0.10 },
//       { freq: 1046.5, t: 0.24, dur: 0.18 },
//     ];
//     melody.forEach(({ freq, t, dur }) => {
//       const osc  = ctx.createOscillator();
//       const gain = ctx.createGain();
//       osc.type = 'triangle';
//       osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
//       gain.gain.setValueAtTime(0, ctx.currentTime + t);
//       gain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + t + 0.01);
//       gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
//       osc.connect(gain);
//       gain.connect(ctx.destination);
//       osc.start(ctx.currentTime + t);
//       osc.stop(ctx.currentTime + t + dur + 0.01);
//     });
//   } catch (e) {
//     console.warn('Audio play failed:', e);
//   }

//   // 3. Speak using ResponsiveVoice (Indonesian Female — natural teacher voice)
//   // Fallback to browser SpeechSynthesis if offline / not loaded
//   const intros = ['Wah, ini ', 'Ini dia ', 'Yuk lihat, ', 'Kita punya '];
//   const intro   = intros[Math.floor(Math.random() * intros.length)];
//   const text    = intro + label + '!';

//   setTimeout(() => {
//     if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
//       // ✅ ResponsiveVoice — natural Indonesian Female (guru-like)
//       responsiveVoice.cancel();
//       responsiveVoice.speak(text, 'Indonesian Female', {
//         rate:   1.0,    // Clear, normal conversational pace
//         pitch:  1.1,    // Warm, friendly — not too high, not robotic
//         volume: 1,
//         onstart: () => console.log('🔊 RV speaking:', text),
//       });
//     } else {
//       // Fallback: browser TTS
//       if (!AppState.speechSynth) return;
//       AppState.speechSynth.cancel();
//       const utter   = new SpeechSynthesisUtterance(text);
//       utter.lang    = 'id-ID';
//       utter.rate    = 1.05;
//       utter.pitch   = 1.2;
//       utter.volume  = 1;
//       const voices  = AppState.speechSynth.getVoices();
//       const best    =
//         voices.find(v => v.lang.startsWith('id') && v.localService) ||
//         voices.find(v => v.lang.startsWith('id')) ||
//         voices.find(v => v.localService) ||
//         voices[0];
//       if (best) utter.voice = best;
//       AppState.speechSynth.speak(utter);
//     }
//   }, 250);
// }

function playChipSound(label, chipEl) {
  if (label === 'Rumput/Ranting') {
    label = 'RumputRanting';
  }
  if (chipEl) {
    chipEl.classList.remove('playing');
    void chipEl.offsetWidth;
    chipEl.classList.add('playing');

    setTimeout(() => chipEl.classList.remove('playing'), 600);
  }

  // Sound pop tetap menggunakan Web Audio API
  try {
    const ctx = getAudioCtx();

    const melody = [
      { freq: 523.25, t: 0.00, dur: 0.10 },
      { freq: 659.25, t: 0.08, dur: 0.10 },
      { freq: 783.99, t: 0.16, dur: 0.10 },
      { freq: 1046.5, t: 0.24, dur: 0.18 },
    ];

    melody.forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);

      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(
        0.38,
        ctx.currentTime + t + 0.01
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + t + dur
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.01);
    });
  } catch (e) {
    console.warn('Audio play failed:', e);
  }

  // Suara rekaman sendiri
  const audio = new Audio(`assets/sounds/${label}.mp3`);
  audio.volume = 1;

  setTimeout(() => {
    audio.play().catch(e => {
      console.warn('Voice play failed:', e);
    });
  }, 250);
}



// function playARInfo() {
//   if (!AppState.speechSynth) {
//     showToast('Browser tidak mendukung Text-to-Speech');
//     return;
//   }
//   AppState.speechSynth.cancel();

//   const info = AppState.currentARTarget;
//   let text;
//   if (info) {
//     const materi = MATERI_DATA[info.category];
//     text = `Ini adalah ${info.label}, termasuk sampah ${info.category}. ${materi.tts}`;
//   } else {
//     text = 'Arahkan kamera ke gambar marker untuk melihat penjelasannya.';
//   }

//   const utter = new SpeechSynthesisUtterance(text);
//   utter.lang = 'id-ID';
//   utter.rate = 0.85;
//   utter.pitch = 1.0;
//   AppState.speechSynth.speak(utter);
//   showToast('🔊 Memutar penjelasan AR...');
// }


/* ============================================================
   INITIALIZE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Show initial screen
  showScreen('screen-home');

  // Sinkronkan avatar mini di burger menu & nama pengguna sejak awal
  loadAvatar();
  loadUsername();

  // Simpan template asli scene AR agar bisa dibangun ulang saat AR di-restart
  captureARSceneTemplate();

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