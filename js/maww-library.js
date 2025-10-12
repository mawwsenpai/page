import { createAnimatedBackground } from './animasi.js'; 
const loadGoogleFont = (fontFamily) => {
  const fontId = `google-font-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(fontId)) return; // Jangan muat ulang jika sudah ada
  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,700;1,300&display=swap`;
  document.head.appendChild(link);
};

const getFontFallback = (fontName) => {
  const fontLower = fontName.toLowerCase();
  if (fontLower.includes('mono')) return 'monospace';
  if (fontLower.includes('serif') || fontLower.includes('lora') || fontLower.includes('merriweather')) return 'serif';
  return 'sans-serif'; // Default ke sans-serif
};

const applyFont = (font, fontList, storageKey) => {
  const root = document.documentElement;
  const fontName = fontList.find(f => f.toLowerCase().replace(/\s/g, '-') === font);

  if (fontName) {
    loadGoogleFont(fontName);
    const fallback = getFontFallback(fontName);
    // Mengubah variabel CSS --font-main di :root
    root.style.setProperty('--font-main', `'${fontName}', ${fallback}`);
    document.body.dataset.font = font;
    localStorage.setItem(storageKey, font);
  } else {
    console.warn(`Font "${font}" tidak ditemukan dalam daftar konfigurasi.`);
  }
};

const STORAGE_KEYS = {
  THEME: 'maww-theme',
  FONT: 'maww-font',
  ANIMATION: 'maww-animation'
};

const applyDisplaySettings = (theme, font, animation, createAnimatedBackground, config) => {
  // --- Logika Tema ---
  const validTheme = theme === 'default' || !theme ? 'default' : theme;
  if (validTheme === 'default') {
    document.body.removeAttribute('data-theme');
  } else {
    document.body.dataset.theme = validTheme;
  }
  localStorage.setItem(STORAGE_KEYS.THEME, validTheme);

  // --- Logika Animasi ---
  localStorage.setItem(STORAGE_KEYS.ANIMATION, animation);
  if (typeof createAnimatedBackground === 'function') {
    createAnimatedBackground(animation);
  } else {
    console.error("Fungsi createAnimatedBackground tidak valid atau tidak tersedia.");
  }

  // --- Logika Font ---
  applyFont(font, config.fonts, STORAGE_KEYS.FONT);
};

const loadDisplaySettings = (createAnimatedBackground, config) => {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'default';
  const savedFont = localStorage.getItem(STORAGE_KEYS.FONT) || 'poppins';
  const savedAnimation = localStorage.getItem(STORAGE_KEYS.ANIMATION) || 'none';
  const savedFontSize = localStorage.getItem('maww-font-size') || 1;

  document.documentElement.style.setProperty('--font-size-base', savedFontSize + 'rem');

  applyDisplaySettings(savedTheme, savedFont, savedAnimation, createAnimatedBackground, config);

  return {
    theme: savedTheme,
    font: savedFont,
    animation: savedAnimation,
    fontSize: savedFontSize
  };
};

const CONFIG = {
  themes: ['default', 'air', 'buku', 'gelap', 'coklat', 'google-pixel', 'matrix', 'senja', 'cyberpunk', 'laut-dalam', 'retro', 'neon-merah', 'neon-putih', 'neon-biru', 'neon-ungu', 'neon-google', 'buku-klasik', 'novel', 'karbon', 'malam-kota'],
  animations: ['none', 'subtle-gradient', 'bubbles', 'starry-rain', 'shooting-stars', 'blinking-stars', 'fire-particles', 'wave-pulse', 'zoom-fade'],
  fonts: [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Inter',
    'Work Sans', 'Raleway', 'Source Sans Pro', 'Oswald', 'Quicksand', 'Rubik',
    'PT Sans', 'Exo 2', 'Merriweather', 'Lora', 'Playfair Display', 'PT Serif',
    'Noto Serif', 'Crimson Text', 'EB Garamond', 'Domine', 'Bitter', 'Vollkorn',
    'JetBrains Mono', 'Source Code Pro', 'Inconsolata', 'Roboto Mono',
    'Space Mono', 'Fira Code', 'Cutive Mono', 'Lobster', 'Pacifico', 'Anton',
    'Bebas Neue', 'Righteous', 'Comfortaa', 'Abril Fatface', 'Alfa Slab One',
    'Patua One', 'Fredoka One', 'Caveat', 'Dancing Script', 'Indie Flower',
    'Shadows Into Light', 'Permanent Marker', 'Gochi Hand', 'Patrick Hand'
  ]
};

const MawwThemeAPI = {
  config: CONFIG,

  loadSettings: function() {
    return loadDisplaySettings(createAnimatedBackground, this.config);
  },

  applySettings: function(theme, font, animation) {
    const currentSettings = {
        theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'default',
        font: localStorage.getItem(STORAGE_KEYS.FONT) || 'poppins',
        animation: localStorage.getItem(STORAGE_KEYS.ANIMATION) || 'none'
    };
    
    // Gunakan nilai baru jika ada, jika tidak, pertahankan yang lama
    const newTheme = theme !== undefined ? theme : currentSettings.theme;
    const newFont = font !== undefined ? font : currentSettings.font;
    const newAnimation = animation !== undefined ? animation : currentSettings.animation;

    applyDisplaySettings(newTheme, newFont, newAnimation, createAnimatedBackground, this.config);
  }
};

window.MawwTheme = MawwThemeAPI;
console.log("MawwTheme Engine (Combined Mode) is ready! 🔥");

document.addEventListener('DOMContentLoaded', () => {
  MawwTheme.loadSettings();
});
