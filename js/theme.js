document.addEventListener('DOMContentLoaded', () => {
    const THEMES_LIST = [
        { id: 'dark', name: 'Mode Gelap' },
        { id: 'light', name: 'Mode Terang' },
        { id: 'reading', name: 'Mode Baca (Sepia)' },
    ];
    
    const ANIMATIONS_LIST = [
        { id: 'none', name: 'Nonaktif' },
        { id: 'bubbles', name: 'Gelembung' },
        { id: 'shooting-stars', name: 'Bintang Jatuh' },
    ];
    const FONTS_LIST = [
        { id: 'default', name: 'Default UI (Poppins)', class: 'font-default-ui' }, 
        { id: 'default-read', name: 'Default Baca (Lora)', class: 'font-default-read' }, 
        { id: 'roboto', name: 'Roboto', class: 'font-roboto' },
        { id: 'inter', name: 'Inter', class: 'font-inter' },
        { id: 'merriweather', name: 'Merriweather', class: 'font-merriweather' },
        { id: 'alegreya', name: 'Alegreya', class: 'font-alegreya' },
        { id: 'cormorant', name: 'Cormorant', class: 'font-cormorant' },
        { id: 'fira-sans', name: 'Fira Sans', class: 'font-fira-sans' },
        { id: 'crimson-text', name: 'Crimson Text', class: 'font-crimson-text' },
        { id: 'pt-serif', name: 'PT Serif', class: 'font-pt-serif' }
    ];
    
    // Default Fallback Values
    const DEFAULT_THEME = 'dark';
    const DEFAULT_FONT = 'default-read';
    const DEFAULT_FONT_SIZE = '1';
    const DEFAULT_ANIMATION = 'none';
        const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // Elemen kontrol (bisa null)
    const themeContainer = document.getElementById('theme-options-container');
    const fontContainer = document.getElementById('font-options-container');
    const animationContainer = document.getElementById('animation-options-container');
    const fontSizeSlider = document.getElementById('system-font-size-slider');
    const fontSizeValueSpan = document.querySelector('.font-size-value');
    const animatedBgContainer = document.getElementById('animated-bg-container');
    
    const PARTICLE_ANIMATIONS = ['bubbles', 'shooting-stars'];
    

    function applySettings(themeId, fontId, fontSize, animationId) {
        // A. Terapkan Tema (pada <body>)
        bodyElement.setAttribute('data-theme', themeId);
        
        // B. Terapkan Font (pada <html>)
        htmlElement.className = htmlElement.className.split(' ').filter(c => !c.startsWith('font-')).join(' ');
        const fontClass = FONTS_LIST.find(f => f.id === fontId)?.class;
        if (fontClass) {
            htmlElement.classList.add(fontClass);
        }
        
        // C. Terapkan Ukuran Font Sistem (pada <html> menggunakan variabel CSS)
        document.documentElement.style.setProperty('--system-font-scale', fontSize);
        if (fontSizeValueSpan) {
            fontSizeValueSpan.textContent = `${parseFloat(fontSize).toFixed(2)}x`;
        }
        
        // D. Terapkan Animasi Latar (pada <body>)
        bodyElement.setAttribute('data-animation', animationId);
        
        // E. Generate Partikel Animasi
        if (animatedBgContainer) {
            animatedBgContainer.innerHTML = '';
            
            if (animationId !== 'none' && PARTICLE_ANIMATIONS.includes(animationId)) {
                const animationLayer = document.createElement('div');
                animationLayer.classList.add('animation-layer');
                animationLayer.id = animationId.replace(/-/g, '_');
                
                const particleCount = 20; // Jumlah partikel yang lebih kecil
                
                for (let i = 0; i < particleCount; i++) {
                    const span = document.createElement('span');
                    
                    const size = Math.random() * 5 + 1;
                    const left = Math.random() * 100;
                    const top = Math.random() * 100;
                    
                    span.style.width = `${size}px`;
                    span.style.height = `${size}px`;
                    span.style.left = `${left}vw`;
                    span.style.top = `${top}vh`;
                    span.style.animationDelay = `${Math.random() * 10}s`;
                    
                    animationLayer.appendChild(span);
                }
                
                animatedBgContainer.appendChild(animationLayer);
            }
        }
    }
    
    function loadSettings() {
        const savedTheme = localStorage.getItem('app-theme') || DEFAULT_THEME;
        const savedFont = localStorage.getItem('app-font') || DEFAULT_FONT;
        const savedFontSize = localStorage.getItem('app-font-size') || DEFAULT_FONT_SIZE;
        const savedAnimation = localStorage.getItem('app-animation') || DEFAULT_ANIMATION;
        
        if (fontSizeSlider) {
            fontSizeSlider.value = savedFontSize;
        }
        applySettings(savedTheme, savedFont, savedFontSize, savedAnimation);
    }
    
    function createOptionControls(list, container, storageKey, attributeName, type) {
        if (!container) return;
        
        container.innerHTML = '';
        list.forEach(item => {
            const button = document.createElement('button');
            button.classList.add('option-btn', `${type}-option-btn`);
            button.setAttribute(`data-${attributeName}-id`, item.id);
            button.textContent = item.name;
            
            button.onclick = () => {
                localStorage.setItem(storageKey, item.id);
                loadSettings();
                updateActiveControls();
            };
            container.appendChild(button);
        });
    }
    
    function updateActiveControls() {
        if (!themeContainer && !fontContainer) return;
        
        const currentTheme = bodyElement.getAttribute('data-theme');
        const currentFontId = FONTS_LIST.find(f => htmlElement.classList.contains(f.class))?.id || localStorage.getItem('app-font');
        const currentAnimation = bodyElement.getAttribute('data-animation');
        
        document.querySelectorAll('.theme-option-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme-id') === currentTheme);
        });
        document.querySelectorAll('.font-option-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-font-id') === currentFontId);
        });
        document.querySelectorAll('.animation-option-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-animation-id') === currentAnimation);
        });
    }
    
    loadSettings();
    
    createOptionControls(THEMES_LIST, themeContainer, 'app-theme', 'theme', 'theme');
    createOptionControls(FONTS_LIST, fontContainer, 'app-font', 'font', 'font');
    createOptionControls(ANIMATIONS_LIST, animationContainer, 'app-animation', 'animation', 'animation');
    
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            const newSize = e.target.value;
            localStorage.setItem('app-font-size', newSize);
            
            applySettings(
                localStorage.getItem('app-theme'),
                localStorage.getItem('app-font'),
                newSize,
                localStorage.getItem('app-animation')
            );
        });
    }
    
    updateActiveControls();
});