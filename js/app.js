const config = {
  blogId: '1753829636995064210',
  apiKey: 'AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60', 
};

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
  
  if (typeof initializeSidebarSettings === 'function') {
    initializeSidebarSettings();
  }
});