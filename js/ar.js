
/* ============================================================
   MAPPING TARGET AR -> KATEGORI SAMPAH
   Urutan HARUS sama persis dengan targetIndex di index.html
   dan urutan gambar saat generate targets.mind
   ============================================================ */
const AR_TARGET_INFO = [
  { category: 'anorganik', label: 'Baterai', emoji: '🔋' }, // targetIndex 0
  { category: 'anorganik', label: 'Botol Plastik', emoji: '🧴' }, // targetIndex 1
  { category: 'anorganik', label: 'Kaleng', emoji: '🥫' }, // targetIndex 2
  { category: 'anorganik', label: 'Plastik', emoji: '🛍️' }, // targetIndex 3
  { category: 'anorganik', label: 'Kemasan Snack', emoji: '🍬' }, // targetIndex 4
  { category: 'organik', label: 'Daun Kering', emoji: '🍂' }, // targetIndex 5
  { category: 'organik', label: 'Kulit Pisang', emoji: '🍌' }, // targetIndex 6
  { category: 'organik', label: 'Kulit Telur', emoji: '🥚' }, // targetIndex 7
  { category: 'organik', label: 'Sisa Makanan', emoji: '🍚' }, // targetIndex 8
  { category: 'organik', label: 'Tulang Ayam', emoji: '🍗' }, // targetIndex 9
];

/* ============================================================
   AR SCAN
   ============================================================
   CATATAN PERBAIKAN BUG "kamera macet setelah back & buka lagi":
   MindAR + A-Frame menyimpan state internal (video element, stream,
   processing loop) di dalam system 'mindar-image-system'. Memanggil
   .stop() lalu .start() lagi pada instance yang SAMA seringkali
   gagal membuka ulang kamera dengan baik (perlu refresh manual).
   Solusi: setiap kali AR dibuka & dimulai, elemen <a-scene> lama
   dibongkar total dan dibangun ulang dari template asli, sehingga
   MindAR selalu mendapat state yang benar-benar bersih.
   ============================================================ */

// Template asli <a-scene> disimpan sekali di awal (sebelum ada modifikasi apapun)
let AR_SCENE_TEMPLATE = null;

function captureARSceneTemplate() {
  const scene = document.getElementById('ar-scene');
  if (scene && !AR_SCENE_TEMPLATE) {
    AR_SCENE_TEMPLATE = scene.outerHTML;
  }
}

// Hentikan paksa semua video/track kamera yang tersisa di dalam ar-container
function hardStopCameraTracks() {
  const container = document.getElementById('ar-container');
  if (!container) return;
  container.querySelectorAll('video').forEach(v => {
    try {
      if (v.srcObject) {
        v.srcObject.getTracks().forEach(t => t.stop());
        v.srcObject = null;
      }
    } catch (e) { /* ignore */ }
  });
}

// Bongkar <a-scene> lama & pasang yang baru dari template asli
function rebuildARScene() {
  const container = document.getElementById('ar-container');
  if (!container || !AR_SCENE_TEMPLATE) return document.getElementById('ar-scene');

  hardStopCameraTracks();

  const oldScene = document.getElementById('ar-scene');
  if (oldScene) oldScene.remove();

  // Buang juga video/canvas sisa yang sempat disuntik MindAR langsung ke container
  container.querySelectorAll('video, canvas').forEach(el => el.remove());

  container.insertAdjacentHTML('afterbegin', AR_SCENE_TEMPLATE);
  return document.getElementById('ar-scene');
}

// Tunggu sampai a-scene benar-benar siap (systems ter-init) sebelum start()
function waitForSceneReady(scene) {
  return new Promise((resolve) => {
    if (!scene) return resolve();
    if (scene.hasLoaded) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    scene.addEventListener('loaded', finish, { once: true });
    // Jaga-jaga kalau event 'loaded' tidak terpicu (mis. asset lambat)
    setTimeout(finish, 2500);
  });
}

async function startAR() {
  if (AppState.arBusy) return; // cegah klik ganda / tumpang-tindih
  AppState.arBusy = true;

  const startOverlay = document.getElementById('ar-start-overlay');
  const startBtn = document.getElementById('btn-start-ar');

  if (startBtn) {
    startBtn.textContent = '⏳ Memulai kamera...';
    startBtn.disabled = true;
  }

  try {
    // Selalu bangun ulang scene supaya MindAR mulai dari state bersih
    const scene = rebuildARScene();
    if (!scene) throw new Error('A-Frame scene not found');

    scene.style.display = 'block';
    await waitForSceneReady(scene);

    // Listener target — aman karena scene baru, tidak ada listener lama menumpuk
    scene.addEventListener('targetFound', handleMarkerFound, { once: false });
    scene.addEventListener('targetLost', handleMarkerLost, { once: false });
    scene.addEventListener('arReady', () => console.log('[MindAR] READY'));
    scene.addEventListener('arError', (e) => console.error('[MindAR] ERROR:', e.detail));

    const mindarSystem = scene.systems && scene.systems['mindar-image-system'];
    if (mindarSystem) {
      AppState.arSystem = mindarSystem;
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
  } finally {
    AppState.arBusy = false;
  }
}

// Cleanup murni (tanpa pindah layar) — dipakai juga saat user pindah ke
// screen lain sementara AR masih jalan, supaya tidak "nyelonong" balik ke Beranda
async function stopARInternal() {
  if (AppState.arStopping) return;
  AppState.arStopping = true;

  const startOverlay = document.getElementById('ar-start-overlay');

  // Stop rotation
  if (AppState.arRotationInterval) {
    clearInterval(AppState.arRotationInterval);
    AppState.arRotationInterval = null;
    AppState.arRotating = false;
  }

  // Stop MindAR system dengan benar (async)
  try {
    if (AppState.arSystem) {
      await AppState.arSystem.stop();
    }
  } catch (e) {
    console.warn('AR stop error:', e);
  }

  // Pastikan tidak ada track kamera yang masih menyala (penyebab utama macet)
  hardStopCameraTracks();

  AppState.arSystem = null;
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

  AppState.arStopping = false;
}

// Dipanggil dari tombol "Kembali" di layar AR — cleanup + pulang ke Beranda
async function stopAR() {
  await stopARInternal();
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
  // Hentikan audio sebelumnya jika ada
  if (typeof stopMateriAudio === 'function') {
    stopMateriAudio();
  }

  const info = AppState.currentARTarget;
  let fileName = '';

  if (info) {
    // Sesuaikan dengan penamaan file audio Anda, misal mengambil dari label atau category
    fileName = info.label;
  } else {
    showToast('Arahkan kamera ke gambar marker terlebih dahulu.');
    return;
  }

  const arAudio = new Audio(`assets/sounds/${fileName}.mp3`);
  arAudio.volume = 1;

  arAudio.play().catch(e => {
    console.warn(`File audio AR tidak ditemukan: assets/sounds/${fileName}.mp3`, e);
  });

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
