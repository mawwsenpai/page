const config = {
  blogId: '1753829636995064210',
  clientId: '162356562012-ts06rfqmcajg8v88qop424kqq3cic4c3.apps.googleusercontent.com',
  apiKey: 'AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60', 
    firebase: {
      apiKey: "AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60",
      authDomain: "revisipro-6dd30.firebaseapp.com",
      databaseURL: "https://revisipro-6dd30-default-rtdb.asia-southeast1.firebasedatabase.app",
    },
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