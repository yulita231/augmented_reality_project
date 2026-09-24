
/* ============================================================
   CONTENT DATA
   ============================================================ */
const MATERI_DATA = {
  organik: {
    emoji: '🌱',
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
    emoji: '♻️',
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
/* ============================================================
   DETAIL MATERI
   ============================================================ */

async function showDetail(type) {

  const data = MATERI_DATA[type];

  if (!data) {
    console.error('Detail materi tidak ditemukan:', type);
    return;
  }

  const detailContent = document.getElementById('detail-content');

  if (!detailContent) {
    console.error('Element #detail-content tidak ditemukan');
    return;
  }

  let file = '';

  switch (type) {

    case 'organik':
      file = 'pages/materi/detail/organik.html';
      break;

    case 'anorganik':
      file = 'pages/materi/detail/anorganik.html';
      break;

    default:
      console.error('Detail materi tidak ditemukan:', type);
      return;
  }

  try {

    const response = await fetch(file);

    if (!response.ok) {
      throw new Error(
        `Gagal mengambil file: ${file} (${response.status})`
      );
    }

    const html = await response.text();

    // Masukkan HTML detail materi
    detailContent.innerHTML = html;


    /* ========================================================
       UPDATE DETAIL SHOWCASE
    ======================================================== */

    const showcase = detailContent.querySelector('.detail-showcase');

    if (showcase) {
      showcase.textContent = data.emoji;
    }


    /* ========================================================
       UPDATE DETAIL DOTS
    ======================================================== */

    const dots = detailContent.querySelectorAll('.detail-dot');

    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === 0);
    });


    /* ========================================================
       MARK MATERI SEBAGAI SUDAH DIBACA
    ======================================================== */

    if (!AppState.completedMateri.includes(type)) {

      AppState.completedMateri.push(type);

      AppState.totalScore += 5;

      showToast(
        `📖 +5 Poin untuk membaca ${data.title}!`
      );
    }


    /* ========================================================
       TAMPILKAN SCREEN DETAIL
    ======================================================== */

    await showScreen('screen-detail', true);

  } catch (error) {

    console.error(
      'Gagal memuat detail materi:',
      error
    );

    detailContent.innerHTML = `
      <div style="
        padding:30px;
        text-align:center;
      ">
        <h3>Oops! 😥</h3>

        <p>
          Materi tidak dapat dimuat.
        </p>

        <button
          class="btn-green-main"
          onclick="showScreen('screen-materi')">

          Kembali

        </button>
      </div>
    `;
  }
}


let currentMateriAudio = null;
let activeTtsButton = null;

function playMateriAudio(type) {
  const data = MATERI_DATA[type];
  if (!data) return;

  const btn = document.getElementById(`btn-tts-${type}`);
  const fileName = data.title;

  function setPlaying() {
    if (btn) {
      btn.innerHTML = '⏹ Berhenti';
      btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btn.onclick = () => stopMateriAudio();

      // Simpan tombol saat ini sebagai tombol aktif
      activeTtsButton = btn;
    }
  }

  function setIdle() {
    if (btn) {
      btn.innerHTML = '🔊 Dengarkan';
      btn.style.background = '';
      btn.onclick = () => playMateriAudio(type);

      if (activeTtsButton === btn) {
        activeTtsButton = null;
      }
    }
  }

  // Hentikan audio yang mungkin sedang berjalan sebelumnya & reset tombol lama
  stopMateriAudio();
  setPlaying();

  // ── 1. Memutar Melodi (Web Audio API) ──
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
      gain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.01);
    });
  } catch (e) {
    console.warn('Audio melody failed:', e);
  }

  // ── 2. Memutar Rekaman Suara Sendiri (MP3) ──
  currentMateriAudio = new Audio(`assets/sounds/${fileName}.mp3`);
  currentMateriAudio.volume = 1;

  currentMateriAudio.onended = () => setIdle();
  currentMateriAudio.onerror = () => {
    console.warn(`File audio tidak ditemukan: assets/sounds/${fileName}.mp3`);
    setIdle();
  };

  setTimeout(() => {
    if (currentMateriAudio) {
      currentMateriAudio.play().catch(e => {
        console.warn('Voice play failed:', e);
        setIdle();
      });
    }
  }, 250);
}

function stopMateriAudio() {
  // Hentikan objek Audio jika sedang berjalan
  if (currentMateriAudio) {
    currentMateriAudio.pause();
    currentMateriAudio.currentTime = 0;
    currentMateriAudio = null;
  }

  // Kembalikan tombol aktif sebelumnya ke keadaan semula (jika ada)
  if (activeTtsButton) {
    activeTtsButton.innerHTML = '🔊 Dengarkan';
    activeTtsButton.style.background = '';

    // Cari kembali 'type' berdasarkan ID tombol (misal: 'btn-tts-sampah' -> 'sampah')
    const type = activeTtsButton.id.replace('btn-tts-', '');
    activeTtsButton.onclick = () => playMateriAudio(type);

    activeTtsButton = null;
  }
}


/* ============================================================
   DETAIL SHOWCASE & DOTS
   ============================================================ */

function updateDetailShowcase(type) {
  const data = MATERI_DATA[type];

  if (!data) return;

  // Update emoji showcase
  const showcase = document.querySelector('.detail-showcase');

  if (showcase) {
    showcase.textContent = data.emoji;
  }

  // Update dots
  const dots = document.querySelectorAll('.detail-dot');

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === 0);
  });
}