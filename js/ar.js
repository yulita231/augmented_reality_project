
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
   FIT-MODEL — samakan ukuran model GLB yang skala aslinya beda-beda.
   Sisi terpanjang model diskalakan jadi `size` (lebar marker = 1 unit)
   dan titik tengahnya dipindah ke tengah marker.
   ============================================================ */
if (window.AFRAME && !AFRAME.components['fit-model']) {
  AFRAME.registerComponent('fit-model', {
    schema: { size: { type: 'number', default: 0.8 } },

    init() {
      this.fit = this.fit.bind(this);
      this.el.addEventListener('model-loaded', this.fit);
      if (this.el.getObject3D('mesh')) this.fit();
    },

    remove() {
      this.el.removeEventListener('model-loaded', this.fit);
    },

    fit() {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;

      // Lepas sementara dari parent supaya bounding box dihitung di ruang lokal model
      // (bukan ikut transform marker MindAR)
      const parent = mesh.parent;
      if (parent) parent.remove(mesh);
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(mesh);
      if (parent) parent.add(mesh);
      if (box.isEmpty()) {
        console.warn(`[AR] ⚠️ fit-model #${this.el.id}: bounding box kosong, ukuran tidak disesuaikan`);
        return;
      }

      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = this.data.size / maxDim;

      mesh.scale.setScalar(scale);
      mesh.position.copy(center).multiplyScalar(-scale);

      const fmt = (n) => Number(n.toPrecision(3));
      // console.log(`[AR] fit-model #${this.el.id}: ukuran asli ${fmt(size.x)} × ${fmt(size.y)} × ${fmt(size.z)}, skala ×${fmt(scale)}`);
      if (!Number.isFinite(scale)) console.warn(`[AR] ⚠️ #${this.el.id}: skala tidak valid — model tidak akan terlihat`);
    },
  });
}

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
  const scene = document.getElementById('ar-scene');
  attachARDebugLogs(scene);
  return scene;
}

/* ============================================================
   DEBUG LOG — buka DevTools (F12) → Console, filter "[AR"
   Menampilkan status download tiap file .glb, model yang gagal
   di-parse, ukuran model, dan marker yang terdeteksi.
   ============================================================ */
function attachARDebugLogs(scene) {
  if (!scene || scene.dataset.debugReady) return;
  scene.dataset.debugReady = '1';

  const status = {}; // id model → baris tabel ringkasan
  const printSummary = () => {
    const rows = Object.values(status);
    // if (rows.every((r) => r.model !== '⏳')) {
    //   console.log('[AR] Ringkasan model 3D:');
    //   console.table(rows);
    // }
  };

  scene.querySelectorAll('a-asset-item').forEach((item) => {
    const src = item.getAttribute('src');
    status[item.id] = { id: item.id, file: decodeURIComponent(src), download: '⏳', model: '⏳', target: '-' };

    item.addEventListener('loaded', () => {
      const bytes = item.data && item.data.byteLength;
      status[item.id].download = `✅ ${bytes ? (bytes / 1048576).toFixed(1) + ' MB' : 'ok'}`;
      // console.log(`[AR] ✅ Download OK: ${src}`);
    });
    item.addEventListener('error', (e) => {
      const xhr = e.detail && e.detail.xhr;
      const code = xhr ? `HTTP ${xhr.status}` : 'error';
      status[item.id].download = `❌ ${code}`;
      status[item.id].model = '❌ tidak dimuat';
      console.error(`[AR] ❌ Download GAGAL (${code}): ${src} — cek nama file di assets/models/`, e.detail);
      printSummary();
    });
  });

  scene.querySelectorAll('a-gltf-model').forEach((model) => {
    const assetId = (model.getAttribute('src') || '').replace('#', '');
    // Baca dari atribut mentah ("targetIndex: 0") — komponennya mungkin belum ter-init
    const anchor = model.closest('[mindar-image-target]');
    const rawTarget = anchor ? anchor.attributes['mindar-image-target'].value : '';
    const targetIndex = (rawTarget.match(/targetIndex:\s*(\d+)/) || [])[1] ?? '?';
    if (status[assetId]) status[assetId].target = targetIndex;

    model.addEventListener('model-loaded', () => {
      const mesh = model.getObject3D('mesh');
      let meshCount = 0;
      if (mesh) mesh.traverse((o) => { if (o.isMesh) meshCount++; });
      if (status[assetId]) status[assetId].model = `✅ ${meshCount} mesh`;
      // console.log(`[AR] ✅ Model siap: #${model.id} (target ${targetIndex}), ${meshCount} mesh`);
      if (!meshCount) console.warn(`[AR] ⚠️ #${model.id} tidak punya mesh — model akan kosong/tidak terlihat`);
      printSummary();
    });
    model.addEventListener('model-error', (e) => {
      if (status[assetId]) status[assetId].model = '❌ gagal parse';
      console.error(`[AR] ❌ Model GAGAL di-parse: #${model.id} (target ${targetIndex})`, e.detail);
      printSummary();
    });
  });
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
  setRotateButtonActive(false);

  // Keluar dari mode foto beku
  AppState.arFrozen = false;
  AppState.arCapturing = false;
  setFrozenUI(false);

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

  const foundModel = event.target.querySelector('a-gltf-model');
  console.log(`[AR] 🎯 Marker ${targetIndex} (${info.label}) terdeteksi — ${AppState.arFrozen ? 'foto beku' : 'kamera live'}`
    + (foundModel && !foundModel.getObject3D('mesh') ? ' ⚠️ tapi model 3D-nya BELUM/GAGAL dimuat' : ''));

  // Kamera live: cukup beri petunjuk. Model 3D baru muncul di foto beku (captureAR)
  if (!AppState.arFrozen) {
    if (statusEl) {
      statusEl.innerHTML = `<span class="ar-status-dot found"></span><span class="text-xs text-white font-semibold">${info.emoji} ${info.label} — tekan 📷</span>`;
    }
    showToast(`🎯 ${info.label} terlihat! Tekan 📷 untuk memotret`, 2000);
    return;
  }

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
  if (!AppState.arFrozen) {
    const comp = event.target.components['mindar-image-target'];
    console.log(`[AR] Marker ${comp ? comp.data.targetIndex : '?'} hilang dari kamera`);
  }

  if (infoPanel) infoPanel.classList.add('hidden');
  if (statusEl) {
    statusEl.innerHTML = '<span class="ar-status-dot"></span><span class="text-xs text-white font-semibold">Mencari...</span>';
  }
}

// Dipanggil showScreen('screen-ar') setiap kali halaman AR dimuat
function initAR() {
  captureARSceneTemplate();
  attachARDebugLogs(document.getElementById('ar-scene'));
  setupARDragRotate();
}

/* ============================================================
   PUTAR — memutar model 3D yang sedang tampil
   (otomatis lewat tombol Putar, atau geser jari/mouse di foto)
   ============================================================ */
const AR_ROTATE_SPEED = Math.PI / 2; // radian per detik (~4 detik sekali putar)
const AR_DRAG_SPEED = 0.01;          // radian per piksel geser

function getARModels() {
  return document.querySelectorAll('#ar-scene a-gltf-model');
}

function rotateARModels(yaw, pitch) {
  getARModels().forEach((model) => {
    model.object3D.rotation.y += yaw;
    model.object3D.rotation.x += pitch;
  });
}

function setRotateButtonActive(active) {
  const btn = document.getElementById('btn-ar-rotate');
  if (btn) btn.classList.toggle('active', active);
}

function toggleARRotate() {
  if (!AppState.arRotating) {
    AppState.arRotating = true;
    let last = performance.now();
    AppState.arRotationInterval = setInterval(() => {
      const now = performance.now();
      rotateARModels(AR_ROTATE_SPEED * (now - last) / 1000, 0);
      last = now;
    }, 16);
    setRotateButtonActive(true);
    showToast('🔄 Rotasi otomatis aktif');
  } else {
    AppState.arRotating = false;
    clearInterval(AppState.arRotationInterval);
    AppState.arRotationInterval = null;
    setRotateButtonActive(false);
    showToast('⏹ Rotasi dihentikan');
  }
}

// Geser di area tengah layar untuk memutar model — hanya aktif saat foto beku
function setupARDragRotate() {
  const area = document.querySelector('#ar-overlay .ar-center-frame');
  if (!area || area.dataset.dragReady) return;
  area.dataset.dragReady = '1';

  let last = null;
  area.addEventListener('pointerdown', (e) => {
    if (!AppState.arFrozen) return;
    last = { x: e.clientX, y: e.clientY };
    area.setPointerCapture(e.pointerId);
  });
  area.addEventListener('pointermove', (e) => {
    if (!last) return;
    rotateARModels((e.clientX - last.x) * AR_DRAG_SPEED, (e.clientY - last.y) * AR_DRAG_SPEED);
    last = { x: e.clientX, y: e.clientY };
  });
  const end = () => { last = null; };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
}

/* ============================================================
   KAMERA — foto beku lalu di-scan
   1. Tekan 📷 → video kamera di-pause (layar membeku seperti foto)
   2. Frame beku itu di-scan MindAR untuk mencari marker
   3. Model 3D muncul di atas marker pada foto, bisa diputar
   4. Tekan 🔁 Foto Ulang → kembali ke kamera live
   ============================================================ */
function getARAnchors() {
  return Array.from(document.querySelectorAll('#ar-scene [mindar-image-target]'))
    .map((el) => el.components['mindar-image-target'])
    .filter(Boolean);
}

function setARStatus(text, found = false) {
  const statusEl = document.getElementById('ar-status');
  if (statusEl) {
    statusEl.innerHTML = `<span class="ar-status-dot${found ? ' found' : ''}"></span><span class="text-xs text-white font-semibold">${text}</span>`;
  }
}

function setFrozenUI(frozen) {
  const container = document.getElementById('ar-container');
  if (container) container.classList.toggle('ar-frozen', frozen);
  const icon = document.getElementById('ar-capture-icon');
  const label = document.getElementById('ar-capture-label');
  if (icon) icon.textContent = frozen ? '🔁' : '📷';
  if (label) label.textContent = frozen ? 'Foto Ulang' : 'Foto';
}

// Scan frame video yang sedang di-pause (pakai controller internal MindAR).
// Detektor MindAR hanya membaca kotak kecil (± setengah sisi pendek frame,
// mis. 256px pada video 640×480), jadi dicoba beberapa posisi:
// tengah dulu, lalu 9 posisi geser 3×3 (cropDetector.detectMoving berputar sendiri).
const AR_SCAN_ATTEMPTS = 10;

async function detectTargetInFrozenFrame(system) {
  const controller = system.controller;
  const count = controller.markerDimensions ? controller.markerDimensions.length : AR_TARGET_INFO.length;
  const indexes = Array.from({ length: count }, (_, i) => i);

  const inputT = controller.inputLoader.loadInput(system.video);
  try {
    for (let attempt = 0; attempt < AR_SCAN_ATTEMPTS; attempt++) {
      const { featurePoints } = attempt === 0
        ? controller.cropDetector.detect(inputT)
        : controller.cropDetector.detectMoving(inputT);
      if (!featurePoints || !featurePoints.length) continue;

      const { targetIndex, modelViewTransform } = await controller._workerMatch(featurePoints, indexes);
      if (targetIndex != null && targetIndex !== -1 && modelViewTransform) {
        console.log(`[AR] Scan foto: cocok di percobaan ${attempt + 1}/${AR_SCAN_ATTEMPTS} (${featurePoints.length} titik fitur)`);
        return { targetIndex, worldMatrix: controller.getWorldMatrix(modelViewTransform, targetIndex) };
      }
    }
    return null;
  } finally {
    inputT.dispose();
  }
}

// Marker yang sedang dilacak live. "showing" = sudah stabil beberapa frame;
// kalau belum, pakai yang baru mulai terlacak (isTracking) supaya tidak terlewat.
function getLiveTrackingResult(controller) {
  const states = controller.trackingStates || [];

  const showingIndex = states.findIndex((s) => s.showing && s.trackingMatrix);
  if (showingIndex !== -1) {
    return { targetIndex: showingIndex, worldMatrix: Array.from(states[showingIndex].trackingMatrix) };
  }

  const trackingIndex = states.findIndex((s) => s.isTracking && s.currentModelViewTransform);
  if (trackingIndex !== -1) {
    return {
      targetIndex: trackingIndex,
      worldMatrix: controller.getWorldMatrix(states[trackingIndex].currentModelViewTransform, trackingIndex),
    };
  }
  return null;
}

async function captureAR() {
  if (AppState.arCapturing) return;
  if (AppState.arFrozen) {
    resumeARLive();
    return;
  }

  const system = AppState.arSystem;
  const controller = system && system.controller;
  if (!AppState.arRunning || !controller || !system.video) {
    showToast('⚠️ Mulai Scan AR dulu sebelum memotret');
    return;
  }

  AppState.arCapturing = true;

  const flash = document.getElementById('capture-flash');
  if (flash) {
    flash.classList.remove('hidden');
    setTimeout(() => flash.classList.add('hidden'), 400);
  }

  // Cadangan: marker yang sedang terlacak live tepat saat tombol ditekan
  const liveResult = getLiveTrackingResult(controller);

  // Bekukan layar: video di-pause & tracking live dihentikan
  system.pause();
  AppState.arFrozen = true;
  setFrozenUI(true);
  setARStatus('Menganalisis foto...');

  try {
    // Beri waktu loop tracking yang sedang berjalan untuk selesai
    await new Promise((resolve) => setTimeout(resolve, 300));

    let result = null;
    try {
      result = await detectTargetInFrozenFrame(system);
    } catch (e) {
      console.warn('[AR] Scan foto gagal, pakai hasil tracking live:', e);
    }
    console.log('[AR] 📸 Hasil scan foto:', result ? `marker ${result.targetIndex} (${AR_TARGET_INFO[result.targetIndex]?.label})` : 'tidak ada',
      '| tracking live saat dipotret:', liveResult ? `marker ${liveResult.targetIndex} (${AR_TARGET_INFO[liveResult.targetIndex]?.label})` : 'tidak ada');
    result = result || liveResult;

    if (!AppState.arFrozen) return; // user sudah tekan Foto Ulang / keluar

    // Sembunyikan semua dulu, lalu tampilkan hanya yang terdeteksi
    getARAnchors().forEach((anchor) => anchor.updateWorldMatrix(null));

    if (!result) {
      setARStatus('Objek tidak dikenali');
      showToast('🤔 Objek tidak dikenali di foto. Tekan 🔁 Foto Ulang', 3000);
      return;
    }

    const anchor = getARAnchors().find((a) => a.data.targetIndex === result.targetIndex);
    if (anchor) anchor.updateWorldMatrix(result.worldMatrix); // memicu handleMarkerFound

    setARStatus('Geser untuk memutar 3D', true);
  } catch (e) {
    console.error('Capture AR error:', e);
    showToast('⚠️ Gagal memproses foto', 2500);
  } finally {
    AppState.arCapturing = false;
  }
}

// Kembali ke kamera live dari mode foto beku
function resumeARLive() {
  getARAnchors().forEach((anchor) => anchor.updateWorldMatrix(null));
  getARModels().forEach((model) => model.object3D.rotation.set(0, 0, 0));

  AppState.arFrozen = false;
  setFrozenUI(false);
  if (AppState.arSystem) AppState.arSystem.unpause();

  setARStatus('Mencari...');
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
  