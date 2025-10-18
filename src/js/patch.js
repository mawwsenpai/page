    // 1. Blokir menu klik kanan di seluruh halaman
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault(); // Cuma mencegah menu muncul, tanpa alert
    });

    // 2. Blokir 'drag' gambar
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName.toUpperCase() === 'IMG') {
            e.preventDefault(); // Mencegah gambar di-drag
        }
    });

    // 3. (Opsional) Blokir tombol shortcut dev tools (F12, Ctrl+U, dll)
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' || // F12
            (e.ctrlKey && e.shiftKey && e.key === 'I') || // Ctrl+Shift+I
            (e.metaKey && e.altKey && e.key === 'I') || // Cmd+Opt+I (Mac)
            (e.ctrlKey && e.shiftKey && e.key === 'C') || // Ctrl+Shift+C
            (e.metaKey && e.altKey && e.key === 'C') || // Cmd+Opt+C (Mac)
            (e.ctrlKey && e.key === 'U') // Ctrl+U
        ) {
            e.preventDefault(); // Senyapkan aksinya
        }
    });