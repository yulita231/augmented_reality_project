
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
  if (!wrap.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    closeBurgerMenu();
  }
});

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
  reader.onload = function (e) {
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

  // Sinkronkan ke avatar mini di tombol burger menu
  const miniImg = document.getElementById('profil-avatar-img-mini');
  const miniEmoji = document.getElementById('profil-avatar-emoji-mini');
  if (miniImg) {
    miniImg.src = src;
    miniImg.classList.remove('hidden');
  }
  if (miniEmoji) miniEmoji.style.display = 'none';
}

/* ============================================================
   PROFIL — EDIT USERNAME
   ============================================================ */
function loadUsername() {
  const saved = localStorage.getItem('ecokids-username');
  const name = saved && saved.trim() ? saved.trim() : 'EcoKid #1';
  const nameEl = document.getElementById('profil-name');
  if (nameEl) nameEl.textContent = name;
  return name;
}

function startEditUsername() {
  const nameRow = document.getElementById('profil-name-row');
  const editRow = document.getElementById('profil-name-edit-row');
  const input = document.getElementById('profil-name-input');
  const currentName = document.getElementById('profil-name');
  if (!nameRow || !editRow || !input) return;

  input.value = (currentName && currentName.textContent !== 'EcoKid #1')
    ? currentName.textContent
    : (localStorage.getItem('ecokids-username') || '');

  nameRow.classList.add('hidden');
  editRow.classList.remove('hidden');
  input.focus();
  input.select();

  input.onkeydown = (e) => {
    if (e.key === 'Enter') saveUsername();
    if (e.key === 'Escape') cancelEditUsername();
  };
}

function saveUsername() {
  const input = document.getElementById('profil-name-input');
  const nameRow = document.getElementById('profil-name-row');
  const editRow = document.getElementById('profil-name-edit-row');
  if (!input) return;

  const value = input.value.trim();
  if (!value) {
    showToast('⚠️ Nama tidak boleh kosong!');
    input.focus();
    return;
  }

  try {
    localStorage.setItem('ecokids-username', value);
  } catch (e) {
    showToast('⚠️ Gagal menyimpan nama, coba lagi!');
    return;
  }

  loadUsername();
  if (nameRow) nameRow.classList.remove('hidden');
  if (editRow) editRow.classList.add('hidden');
  showToast('🎉 Nama berhasil diganti!');
}

function cancelEditUsername() {
  const nameRow = document.getElementById('profil-name-row');
  const editRow = document.getElementById('profil-name-edit-row');
  if (nameRow) nameRow.classList.remove('hidden');
  if (editRow) editRow.classList.add('hidden');
}