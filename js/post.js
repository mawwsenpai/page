// ===================================================================
//  POST.JS (FINAL & LENGKAP)
//  Berisi semua logika khusus untuk halaman post.html
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('page-loader');
  const titleHeader = document.getElementById('blog-post-title-header');
  const contentContainer = document.getElementById('blog-post-content-container');
  const backButton = document.getElementById('back-button');
  const navContainer = document.getElementById('post-navigation-container');
  const panelContainer = document.getElementById('tags-panel-container');
  
  function setupBackButton() {
    if (!backButton) return;
    backButton.href = "#";
    backButton.addEventListener('click', (e) => {
      e.preventDefault();
      history.back();
    });
  }
  
  function setupTagPanelInteractions() {
    if (!panelContainer) return;
    panelContainer.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-label]');
      if (link) {
        e.preventDefault();
        const label = link.dataset.label;
        loadPostsForTag(label);
      }
    });
  }
  
  async function renderSinglePostPage() {
    if (loader) loader.classList.remove('hidden');
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
      // Handle error jika tidak ada ID
      if (loader) loader.classList.add('hidden');
      return;
    }
    
    const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts/${postId}?key=${config.apiKey}`;
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error`);
      const post = await response.json();
      
      document.title = `${post.title} - Revisi Pro`;
      titleHeader.textContent = post.title;
      contentContainer.innerHTML = `<div class="post-body">${post.content}</div>`;
      
      renderShareButtons(post.title, post.url);
      
      const tagsContent = createPostTagsContent(post.labels);
      if (sidePanel.update) sidePanel.update("Tag Postingan Ini", tagsContent);
      
      renderPostNavigation(post.id, post.labels);
      
    } catch (error) {
      console.error(error);
      titleHeader.textContent = "Gagal Memuat";
      contentContainer.innerHTML = `<p class="info-text">Tidak dapat mengambil data.</p>`;
    } finally {
      if (loader) setTimeout(() => loader.classList.add('hidden'), 300);
    }
  }
  
  function createPostTagsContent(labels) {
    if (!labels || labels.length === 0) return '<p class="info-text">Postingan ini tidak memiliki tag.</p>';
    let listHtml = '<ul class="tag-list-in-panel">';
    labels.forEach(label => {
      listHtml += `<li><a href="#" data-label="${encodeURIComponent(label)}"><i class="fas fa-tag fa-xs"></i><span>${label}</span></a></li>`;
    });
    return listHtml + '</ul>';
  }
  
  async function loadPostsForTag(label) {
    const decodedLabel = decodeURIComponent(label);
    if (sidePanel.update) sidePanel.update(decodedLabel, '<div class="spinner" style="margin: 2rem auto;"></div>');
    
    try {
      const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts?key=${config.apiKey}&labels=${label}&maxResults=500&fetchImages=true`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Gagal memuat');
      const data = await response.json();
      const posts = (data.items || []).reverse();
      
      let postsHtml = '<div class="panel-post-list-container">';
      posts.forEach(post => {
        const imageUrl = (post.images && post.images.length > 0) ? post.images[0].url.replace(/\/s\d+(-c)?\//, '/w100-h150-c/') : '';
        postsHtml += `<a href="post.html?id=${post.id}" class="panel-post-item"><img src="${imageUrl}" alt=""><span class="panel-post-item-title">${post.title}</span></a>`;
      });
      postsHtml += '</div>';
      if (sidePanel.update) sidePanel.update(decodedLabel, postsHtml);
    } catch (error) {
      if (sidePanel.update) sidePanel.update(decodedLabel, '<p class="info-text">Gagal memuat daftar bab.</p>');
    }
  }
  
  async function renderPostNavigation(currentPostId, labels) {
    if (!labels || labels.length === 0 || !navContainer) return;
    const primaryLabel = labels[0];
    
    try {
      const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts?key=${config.apiKey}&labels=${encodeURIComponent(primaryLabel)}&maxResults=500&fetchBodies=false`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      const posts = (data.items || []).reverse();
      
      const currentIndex = posts.findIndex(post => post.id === currentPostId);
      if (currentIndex === -1) return;
      
      let navHtml = '';
      if (currentIndex > 0) {
        const prevPost = posts[currentIndex - 1];
        navHtml += `<a href="post.html?id=${prevPost.id}" class="nav-button prev"><span>Sebelumnya</span><span class="nav-title">${prevPost.title}</span></a>`;
      } else {
        navHtml += `<a href="#" class="nav-button prev disabled"><span>Sebelumnya</span><span class="nav-title">Ini Bab Pertama</span></a>`;
      }
      
      if (currentIndex < posts.length - 1) {
        const nextPost = posts[currentIndex + 1];
        navHtml += `<a href="post.html?id=${nextPost.id}" class="nav-button next"><span>Selanjutnya</span><span class="nav-title">${nextPost.title}</span></a>`;
      } else {
        navHtml += `<a href="#" class="nav-button next disabled"><span>Selanjutnya</span><span class="nav-title">Ini Bab Terakhir</span></a>`;
      }
      navContainer.innerHTML = navHtml;
    } catch (error) {
      console.error("Gagal memuat navigasi:", error);
    }
  }
  
  function renderShareButtons(title, url) {
  // 1. Cari kontainer di HTML untuk menaruh tombol
  const container = document.getElementById('share-buttons-container');
  if (!container) return; // Jika kontainer tidak ada, hentikan fungsi
  
  // 2. Amankan judul dan URL agar valid saat dimasukkan ke link
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  
  // 3. Buat struktur HTML untuk semua tombol
  const buttonsHtml = `
        <h4>Bagikan Cerita Ini:</h4>
        <div class="share-buttons">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="share-btn" title="Bagikan ke Facebook">
                <i class="fab fa-facebook-f"></i>
            </a>
            
            <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn" title="Bagikan ke Twitter">
                <i class="fab fa-twitter"></i>
            </a>
            
            <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" class="share-btn" title="Bagikan ke WhatsApp">
                <i class="fab fa-whatsapp"></i>
            </a>
            
            <a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn" title="Bagikan ke Telegram">
                <i class="fab fa-telegram-plane"></i>
            </a>
            
            <button id="copy-link-btn" class="share-btn" title="Salin Tautan">
                <i class="fas fa-link"></i>
            </button>
        </div>
    `;
  
  // 4. Masukkan HTML yang sudah dibuat ke dalam kontainer
  container.innerHTML = buttonsHtml;
  
  // 5. Tambahkan logika untuk tombol "Salin Tautan" setelah tombolnya muncul
  const copyBtn = document.getElementById('copy-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      // Gunakan API browser untuk menyalin URL ke clipboard
      navigator.clipboard.writeText(url).then(() => {
        // Beri feedback visual jika berhasil
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        // Kembalikan ikon seperti semula setelah 2 detik
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-link"></i>';
        }, 2000);
      }).catch(err => {
        // Log error jika gagal
        console.error('Gagal menyalin tautan:', err);
      });
    });
  }
}
  
  function initializePostPage() {
    setupBackButton();
    renderSinglePostPage();
    initializeTheme();
    setupTagPanelInteractions();
  }
  
  initializePostPage();
});