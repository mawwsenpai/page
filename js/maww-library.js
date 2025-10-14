document.addEventListener('DOMContentLoaded', () => {
  if (window.MawwTheme) {
    initializeSidebarSettings();
  } else {
    console.warn("MawwTheme belum tersedia. Mencoba inisialisasi setelah 500ms.");
    setTimeout(() => {
      if (window.MawwTheme) {
        initializeSidebarSettings();
      } else {
        console.error("MawwTheme Library tidak ditemukan setelah penundaan!");
      }
    }, 500);
  }
});


function initializeSidebarSettings() {
  console.log("Menjalankan inisialisasi pengaturan sidebar...");
  if (!window.MawwTheme || !window.MawwTheme.config) {
    return console.error("MawwTheme Library atau konfigurasinya tidak ditemukan!");
  }
  
  const containers = {
    theme: document.getElementById('theme-options-container'),
    font: document.getElementById('font-options-container'),
    animation: document.getElementById('animation-options-container'),
  };
  
  function updateSettings() {
    const theme = document.querySelector('input[name="theme"]:checked')?.value;
    const font = document.querySelector('input[name="font"]:checked')?.value;
    const animation = document.querySelector('input[name="animation"]:checked')?.value;
    
    if (theme && font && animation) {
      window.MawwTheme.applySettings(theme, font, animation);
      console.log("Pengaturan diterapkan:", { theme, font, animation });
    }
  }
  
  function populateRadioOptions(container, items, name, selectedValue) {
    if (!container || !items) return;
    container.innerHTML = ''; // Kosongkan kontainer
    
    const listItems = Array.isArray(items) ? items : Object.keys(items);
    
    listItems.forEach(item => {
      const label = document.createElement('label');
      label.className = 'setting-option';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = item;
      if (item === selectedValue) {
        input.checked = true;
      }
      input.addEventListener('change', updateSettings);
      
      const span = document.createElement('span');
      span.textContent = item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  }
  
  function loadAndSync() {
    const settings = window.MawwTheme.loadSettings();
    const config = window.MawwTheme.config;
    populateRadioOptions(containers.theme, config.themes, 'theme', settings.theme);
    
    populateRadioOptions(containers.font, config.fonts, 'font', settings.font);
    populateRadioOptions(containers.animation, config.animations, 'animation', settings.animation);
    
    console.log("Pengaturan dimuat dan UI disinkronkan.", settings);
    
    updateSettings();
  }
  
  loadAndSync();
}