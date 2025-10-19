    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName.toUpperCase() === 'IMG') {
            e.preventDefault(); 
        }
    });
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') || 
            (e.metaKey && e.altKey && e.key === 'I') || 
            (e.ctrlKey && e.shiftKey && e.key === 'C') || 
            (e.metaKey && e.altKey && e.key === 'C') || 
            (e.ctrlKey && e.key === 'U') 
        ) {
            e.preventDefault(); 
        }
    });