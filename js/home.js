document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('app-sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  
  if (sidebar && sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.add('is-open');
    });
    sidebar.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      sidebar.classList.remove('is-open');
    });
  }
  
  function setupNavigation() {
    const lainyaLink = document.querySelector('a[href="dashboard/main.html"]');
    const searchLink = document.querySelector('a[href="search.html"]');
    const searchHeaderBtn = document.getElementById('search-toggle-btn');
    
    if (lainyaLink) {
      lainyaLink.addEventListener('click', (e) => {
        e.preventDefault();
       
        window.location.href = '/dashboard/main.html';
      });
    }
    
    if (searchLink) {
      searchLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'search.html';
      });
    }
    
    if (searchHeaderBtn) {
      searchHeaderBtn.addEventListener('click', () => {
        window.location.href = 'search.html';
      });
    }
  }
  
  setupNavigation();
  
  if (typeof initializeSidebarSettings === 'function') {
    initializeSidebarSettings();
  }
});