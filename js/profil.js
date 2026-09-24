
/* ============================================================
   BURGER MENU (pengganti item Profil di bottom nav)
   ============================================================ */
function toggleBurgerMenu(event) {
  if (event) event.stopPropagation();

  const dropdown = document.getElementById('burger-menu-dropdown');
  if (!dropdown) return;

  dropdown.classList.toggle('hidden');
}

function closeBurgerMenu() {
  const dropdown = document.getElementById('burger-menu-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

// Klik di luar menu akan menutup dropdown
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('burger-menu-dropdown');
  const btn = document.getElementById('btn-burger-menu');

  if (!wrap || wrap.classList.contains('hidden')) return;

  if (
    !wrap.contains(e.target) &&
    e.target !== btn &&
    !btn.contains(e.target)
  ) {
    closeBurgerMenu();
  }
});

function updateHomeStats() {
  const el = document.getElementById('home-score');
  const elDone = document.getElementById('home-done');

  if (el) el.textContent = `${AppState.totalScore} Poin`;
  if (elDone) {
    elDone.textContent = `${AppState.completedMateri.length} Selesai`;
  }
}

function updateProfilStats() {
  const ps = document.getElementById('profil-score');
  const pg = document.getElementById('profil-games');
  const pm = document.getElementById('profil-materi');

  // ============================================================
  // SCORE
  // ============================================================
  if (ps) {
    ps.textContent = AppState.totalScore;
  }

  // ============================================================
  // GAMES PLAYED — AMBIL DARI LOCAL STORAGE
  // ============================================================
  const savedGamesPlayed = parseInt(
    localStorage.getItem('ecokids-games-played') || '0',
    10
  );

  if (pg) {
    pg.textContent = savedGamesPlayed;
  }

  // ============================================================
  // MATERI
  // ============================================================
  if (pm) {
    pm.textContent = AppState.completedMateri.length;
  }
}


/* ============================================================
   PROFIL AVATAR — GANTI FOTO DARI GALERI + KOMPRESI
   ============================================================ */
function handleAvatarChange(event) {
  const file = event.target.files[0];

  if (!file) return;

  // ============================================================
  // VALIDASI FILE
  // ============================================================
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Pilih file gambar ya!');
    event.target.value = '';
    return;
  }

  // Maksimal ukuran hasil kompresi: 500 KB
  const MAX_SIZE = 500 * 1024;

  const reader = new FileReader();

  reader.onload = function (e) {
    const img = new Image();

    img.onload = function () {

      // ========================================================
      // RESIZE FOTO
      // ========================================================
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;

      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(
          MAX_WIDTH / width,
          MAX_HEIGHT / height
        );

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // ========================================================
      // CANVAS
      // ========================================================
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      // Background putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      // ========================================================
      // KOMPRESI BERTAHAP
      // ========================================================
      let quality = 0.9;
      let base64 = '';

      while (quality >= 0.3) {
        base64 = canvas.toDataURL(
          'image/jpeg',
          quality
        );

        // Hitung ukuran Base64 sebenarnya
        const base64Data = base64.split(',')[1];
        const sizeInBytes = Math.ceil(
          (base64Data.length * 3) / 4
        );

        if (sizeInBytes <= MAX_SIZE) {
          break;
        }

        quality -= 0.1;
      }

      // ========================================================
      // CEK UKURAN AKHIR
      // ========================================================
      const base64Data = base64.split(',')[1];

      const finalSize = Math.ceil(
        (base64Data.length * 3) / 4
      );

      if (finalSize > MAX_SIZE) {
        showToast(
          '⚠️ Foto masih terlalu besar, coba foto yang lebih kecil!'
        );

        event.target.value = '';
        return;
      }

      // ========================================================
      // SIMPAN KE LOCAL STORAGE
      // ========================================================
      try {
        localStorage.setItem(
          'ecokids-avatar',
          base64
        );
      } catch (err) {
        showToast(
          '⚠️ Penyimpanan penuh, coba foto yang lebih kecil!'
        );

        event.target.value = '';
        return;
      }

      // ========================================================
      // APPLY KE UI
      // ========================================================
      applyAvatarImage(base64);

      // Ukuran hasil
      const sizeKB = Math.round(
        finalSize / 1024
      );

      showToast(
        `🎉 Foto profil berhasil diganti! (${sizeKB} KB)`
      );
    };

    img.onerror = function () {
      showToast(
        '⚠️ Gagal memproses foto, coba foto lain!'
      );

      event.target.value = '';
    };

    img.src = e.target.result;
  };

  reader.onerror = function () {
    showToast(
      '⚠️ Gagal membaca foto, coba lagi!'
    );

    event.target.value = '';
  };

  reader.readAsDataURL(file);

  // Reset input agar file yang sama
  // bisa dipilih kembali
  event.target.value = '';
}


/* ============================================================
   LOAD AVATAR
   ============================================================ */
function loadAvatar() {
  const saved = localStorage.getItem('ecokids-avatar');

  if (saved) {
    applyAvatarImage(saved);
  } else {
    const img = document.getElementById('profil-avatar-img');
    const emoji = document.getElementById('profil-avatar-emoji');

    if (img) img.classList.add('hidden');
    if (emoji) emoji.style.display = 'block';

    // Reset avatar mini
    const miniImg = document.getElementById('profil-avatar-img-mini');
    const miniEmoji = document.getElementById('profil-avatar-emoji-mini');

    if (miniImg) miniImg.classList.add('hidden');
    if (miniEmoji) miniEmoji.style.display = 'block';
  }
}


/* ============================================================
   APPLY AVATAR IMAGE
   ============================================================ */
function applyAvatarImage(src) {
  const img = document.getElementById('profil-avatar-img');
  const emoji = document.getElementById('profil-avatar-emoji');

  if (img) {
    img.src = src;
    img.classList.remove('hidden');
  }

  if (emoji) {
    emoji.style.display = 'none';
  }

  // Sinkronkan ke avatar mini
  // di tombol burger menu
  const miniImg = document.getElementById(
    'profil-avatar-img-mini'
  );

  const miniEmoji = document.getElementById(
    'profil-avatar-emoji-mini'
  );

  if (miniImg) {
    miniImg.src = src;
    miniImg.classList.remove('hidden');
  }

  if (miniEmoji) {
    miniEmoji.style.display = 'none';
  }
}


/* ============================================================
   PROFIL — EDIT USERNAME
   ============================================================ */

/** * Ambil username dari localStorage */
function getUsername() {
  const saved = localStorage.getItem('ecokids-username');

  if (saved && saved.trim()) {
    return saved.trim();
  } return 'EcoKid #1';
}
function loadUsername() {
  const nameEl = document.getElementById('profil-name'); 
  
  if (!nameEl) { 
    console.warn('Element #profil-name belum tersedia'); 
    return; 
  } 
  
  const name = getUsername(); 
  nameEl.textContent = name; 
  
  return name; 
}

function startEditUsername() {
  const nameRow = document.getElementById(
    'profil-name-row'
  );

  const editRow = document.getElementById(
    'profil-name-edit-row'
  );

  const input = document.getElementById(
    'profil-name-input'
  );

  if (!nameRow || !editRow || !input) {
    console.warn('Element edit username belum tersedia');
    return;
  }

  // Ambil langsung dari localStorage
  const savedUsername = localStorage.getItem(
    'ecokids-username'
  );

  input.value = savedUsername
    ? savedUsername.trim()
    : '';

  nameRow.classList.add('hidden');
  editRow.classList.remove('hidden');

  input.focus();
  input.select();

  input.onkeydown = function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveUsername();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditUsername();
    }
  };
}

function saveUsername() {
  const input = document.getElementById(
    'profil-name-input'
  );

  const nameRow = document.getElementById(
    'profil-name-row'
  );

  const editRow = document.getElementById(
    'profil-name-edit-row'
  );

  if (!input) {
    console.warn('Input username tidak ditemukan');
    return;
  }

  const value = input.value.trim();

  // Validasi
  if (!value) {
    showToast('⚠️ Nama tidak boleh kosong!');
    input.focus();
    return;
  }

  try {
    // ========================================================
    // SIMPAN KE LOCAL STORAGE
    // ========================================================
    localStorage.setItem(
      'ecokids-username',
      value
    );

    // ========================================================
    // VERIFIKASI
    // ========================================================
    const saved = localStorage.getItem(
      'ecokids-username'
    );

    if (saved !== value) {
      throw new Error('Username gagal disimpan');
    }

  } catch (error) {
    console.error(
      'Gagal menyimpan username:',
      error
    );

    showToast(
      '⚠️ Gagal menyimpan nama, coba lagi!'
    );

    return;
  }

  // ========================================================
  // UPDATE UI LANGSUNG
  // ========================================================
  const nameEl = document.getElementById(
    'profil-name'
  );

  if (nameEl) {
    nameEl.textContent = value;
  }

  // Tampilkan kembali nama
  if (nameRow) {
    nameRow.classList.remove('hidden');
  }

  // Sembunyikan input
  if (editRow) {
    editRow.classList.add('hidden');
  }

  showToast('🎉 Nama berhasil diganti!');
}

function cancelEditUsername() {
  const nameRow = document.getElementById(
    'profil-name-row'
  );

  const editRow = document.getElementById(
    'profil-name-edit-row'
  );

  if (nameRow) {
    nameRow.classList.remove('hidden');
  }

  if (editRow) {
    editRow.classList.add('hidden');
  }

  // Reset input ke username yang tersimpan
  const input = document.getElementById(
    'profil-name-input'
  );

  if (input) {
    input.value = getUsername() === 'EcoKid #1'
      ? ''
      : getUsername();
  }
}


function loadAvatarMini() {
  const saved = localStorage.getItem('ecokids-avatar');
  const miniImg = document.getElementById('profil-avatar-img-mini');
  const miniEmoji = document.getElementById('profil-avatar-emoji-mini');
  
  if (!miniImg || !miniEmoji) return;

  if (saved) {
    miniImg.src = saved;
    miniImg.classList.remove('hidden');

    miniEmoji.style.display = 'none';
  } else {
    miniImg.classList.add('hidden');
    miniEmoji.style.display = 'block';
  }
}