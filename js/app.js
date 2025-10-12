// ===================================================================
//  APP.JS (FINAL & LENGKAP)
//  Berisi konfigurasi & fungsi yang dipakai di semua halaman
// ===================================================================

const config = {
  blogId: '1753829636995064210',
  apiKey: 'AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60', // Ganti dengan API Key Anda
};

function initializeTheme() {
  let attempts = 0;
  const interval = setInterval(() => {
    if (typeof MawwTheme !== 'undefined' && MawwTheme.init) {
      clearInterval(interval);
      try {
        console.log("MawwTheme API ditemukan, menjalankan setup panel...");
        setupSettingsPanel();
      } catch (error) {
        console.error("Error saat menjalankan MawwTheme setup:", error);
        const settingsBtn = document.getElementById('settings-toggle-btn');
        if (settingsBtn) settingsBtn.style.display = 'none';
      }
    } else if (attempts++ > 60) {
      clearInterval(interval);
      console.error("MawwTheme API gagal dimuat.");
      const settingsBtn = document.getElementById('settings-toggle-btn');
      if (settingsBtn) settingsBtn.style.display = 'none';
    }
  }, 100);
}

function setupSettingsPanel() {
  // 1. Cari elemen utama yang dibutuhkan
  const container = document.getElementById('settings-panel-container');
  const toggleBtn = document.getElementById('settings-toggle-btn');
  
  // Jika elemen atau library MawwTheme tidak ada, hentikan fungsi
  if (!container || !toggleBtn || typeof MawwTheme === 'undefined') {
    return;
  }
  
  // 2. Buat elemen panel dan isi dengan HTML
  const panel = document.createElement('div');
  panel.className = 'settings-slide-panel';
  const savedSettings = MawwTheme.loadSettings();
  
  panel.innerHTML = `
        <div class="settings-panel-header">
            <h3>Pengaturan Tampilan</h3>
            <button id="close-settings-btn">&times;</button>
        </div>
        <div class="settings-panel-body">
            <div class="setting-group">
                <label for="theme-select">Tema</label>
                <select id="theme-select">
                    ${MawwTheme.config.themes.map(theme => `<option value="${theme}" ${savedSettings.theme === theme ? 'selected' : ''}>${theme.charAt(0).toUpperCase() + theme.slice(1)}</option>`).join('')}
                </select>
            </div>
            <div class="setting-group">
                <label for="font-select">Font</label>
                <select id="font-select">
                    ${MawwTheme.config.fonts.map(font => `<option value="${font.toLowerCase().replace(/\s/g, '-')}" ${savedSettings.font === font.toLowerCase().replace(/\s/g, '-') ? 'selected' : ''}>${font}</option>`).join('')}
                </select>
            </div>
            <div class="setting-group">
                <label for="animation-select">Animasi Latar</label>
                <select id="animation-select">
                    ${MawwTheme.config.animations.map(anim => `<option value="${anim}" ${savedSettings.animation === anim ? 'selected' : ''}>${anim.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`).join('')}
                </select>
            </div>
            <div class="setting-group">
                <label for="fontsize-slider">Ukuran Font: <span id="fontsize-value">${savedSettings.fontSize || 1}rem</span></label>
                <input type="range" id="fontsize-slider" min="0.8" max="1.3" step="0.05" value="${savedSettings.fontSize || 1}">
            </div>
        </div>
    `;
  
  // 3. Masukkan panel yang sudah jadi ke dalam kontainer di HTML
  container.appendChild(panel);
  
  // --- Logika Lengkap Event Listener ---
  
  // 4. Ambil semua elemen kontrol DARI DALAM panel yang baru dibuat
  const closeBtn = document.getElementById('close-settings-btn');
  const themeSelect = document.getElementById('theme-select');
  const fontSelect = document.getElementById('font-select');
  const animationSelect = document.getElementById('animation-select');
  const fontsizeSlider = document.getElementById('fontsize-slider');
  const fontsizeValue = document.getElementById('fontsize-value');
  
  // 5. Buat fungsi untuk membuka/menutup panel
  const togglePanel = () => {
    panel.classList.toggle('is-open');
  };
  
  // 6. Pasang fungsi toggle ke tombol buka (di header) dan tombol tutup (di panel)
  toggleBtn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);
  
  // 7. Pasang event listener untuk setiap kontrol
  
  // Saat pilihan tema berubah
  themeSelect.addEventListener('change', () => {
    MawwTheme.applySettings({ theme: themeSelect.value });
  });
  
  // Saat pilihan font berubah
  fontSelect.addEventListener('change', () => {
    MawwTheme.applySettings({ font: fontSelect.value });
  });
  
  // Saat pilihan animasi berubah
  animationSelect.addEventListener('change', () => {
    MawwTheme.applySettings({ animation: animationSelect.value });
  });
  
  // Saat slider ukuran font digeser (event 'input' agar real-time)
  fontsizeSlider.addEventListener('input', () => {
    const newSize = fontsizeSlider.value;
    
    // Perbarui variabel CSS untuk ukuran font secara langsung
    document.documentElement.style.setProperty('--font-size-base', `${newSize}rem`);
    
    // Simpan pengaturan ke localStorage agar tidak hilang saat reload
    localStorage.setItem('maww-font-size', newSize);
    
    // Perbarui teks label ukuran font
    fontsizeValue.textContent = `${newSize}rem`;
  });
}
// GANTI FUNGSI LAMA DENGAN VERSI BARU YANG INI DI js/app.js

function setupSidePanel() {
  console.log("⚙️ [app.js] Memulai setupSidePanel...");
  
  // Langkah 1: Mencari elemen-elemen penting di HTML
  const container = document.getElementById('tags-panel-container');
  const toggleBtn = document.getElementById('tags-toggle-btn');
  
  // Cek #1: Apakah kontainer untuk panel ada?
  if (!container) {
    console.error("❌ [app.js] KRITIS: Elemen <div id='tags-panel-container'> tidak ditemukan di HTML. Panel tidak akan pernah muncul.");
    // Kembalikan object palsu agar sisa script tidak crash
    return { update: () => {} };
  } else {
    console.log("✅ [app.js] Elemen #tags-panel-container ditemukan.");
  }
  
  // Cek #2: Apakah tombol untuk membuka panel ada?
  if (!toggleBtn) {
    console.error("❌ [app.js] KRITIS: Tombol <button id='tags-toggle-btn'> tidak ditemukan di HTML. Panel tidak akan bisa dibuka.");
    return { update: () => {} };
  } else {
    console.log("✅ [app.js] Elemen #tags-toggle-btn ditemukan.");
  }
  
  let panel; // Variabel untuk menyimpan elemen panel
  
  const updatePanel = (title, contentHtml) => {
    console.log(`[app.js] Fungsi sidePanel.update() dipanggil dengan judul: "${title}"`);
    // Jika panel belum ada, buat dulu
    if (!panel) {
      container.innerHTML = '';
      panel = document.createElement('div');
      panel.className = 'tags-slide-panel';
      container.appendChild(panel);
      console.log("[app.js] Elemen panel baru berhasil dibuat dan ditambahkan ke kontainer.");
    }
    // Isi panel dengan konten baru
    panel.innerHTML = `
            <div class="settings-panel-header">
                <h3>${title}</h3>
                <button id="close-tags-btn">&times;</button>
            </div>
            <div class="tags-panel-body">${contentHtml}</div>`;
    
    // Pasang listener ke tombol close yang baru dibuat
    const closeBtn = panel.querySelector('#close-tags-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', togglePanel);
    } else {
      console.error("❌ [app.js] Gagal menemukan #close-tags-btn di dalam panel. Periksa struktur HTML di updatePanel.");
    }
  };
  
  const togglePanel = () => {
    if (panel) {
      panel.classList.toggle('is-open');
      console.log(`[app.js] Panel di-${panel.classList.contains('is-open') ? 'BUKA' : 'TUTUP'}.`);
    } else {
      console.warn("[app.js] Mencoba membuka/menutup panel, tapi panelnya belum dibuat. Ini seharusnya terjadi saat tombol diklik pertama kali.");
    }
  };
  
  // Langkah 3: Menempelkan fungsi 'togglePanel' ke tombol utama
  toggleBtn.addEventListener('click', togglePanel);
  console.log("✅ [app.js] SUKSES: Event listener 'click' berhasil ditempelkan ke #tags-toggle-btn.");
  
  // Kembalikan object dengan fungsi 'update' agar bisa dipakai post.js
  return { update: updatePanel };
}

// Inisialisasi panel saat app.js dimuat
console.log("⚙️ [app.js] Menginisialisasi variabel global 'sidePanel'...");
const sidePanel = setupSidePanel();