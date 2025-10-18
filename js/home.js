document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('app-sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  
  // Menginisialisasi sidebar toggle
  if (sidebar && sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.add('is-open');
    });
    sidebar.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      sidebar.classList.remove('is-open');
    });
  }
  
  // Fungsi untuk setup navigasi di sidebar
  function setupNavigation() {
    const lainyaLink = document.querySelector('a[href="dashboard/main.html"]');
    const searchLink = document.querySelector('a[href="search.html"]');
    const searchHeaderBtn = document.getElementById('search-toggle-btn');
    
    // Menambahkan event listener ke link "Lainnya" di sidebar
    if (lainyaLink) {
      lainyaLink.addEventListener('click', (e) => {
        // MENCEGAH DEFAULT (agar JavaScript mengambil kendali)
        e.preventDefault();
        // Arahkan browser secara eksplisit
        window.location.href = '/dashboard/main.html';
      });
    }
    
    // Menambahkan event listener ke link "Cari Novel" di sidebar
    if (searchLink) {
      searchLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'search.html';
      });
    }
    
    // Menambahkan event listener ke tombol search di header
    if (searchHeaderBtn) {
      searchHeaderBtn.addEventListener('click', () => {
        window.location.href = 'search.html';
      });
    }
  }
  
  // Panggil fungsi setup navigasi
  setupNavigation();
  
  // Inisialisasi pengaturan sidebar (tema, font, dll)
  if (typeof initializeSidebarSettings === 'function') {
    initializeSidebarSettings();
  }
});