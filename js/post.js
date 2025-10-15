document.addEventListener('DOMContentLoaded', () => {
      
  const loader = document.getElementById('page-loader');
  const titleHeader = document.getElementById('blog-post-title-header');
  const contentContainer = document.getElementById('blog-post-content-container');
  const backButton = document.getElementById('back-button');
  const navContainer = document.getElementById('post-navigation-container');
  const panelContainer = document.getElementById('tags-panel-container');
function setupSidePanel() {
    
  const container = document.getElementById('tags-panel-container');
  const toggleBtn = document.getElementById('tags-toggle-btn');
  
  if (!container) {
      return { update: () => {} };
  } else {
  
  }
  
  if (!toggleBtn) {
    return { update: () => {} };
  } else {
  }
  
  let panel; 
  
  const updatePanel = (title, contentHtml) => {
      if (!panel) {
      container.innerHTML = '';
      panel = document.createElement('div');
      panel.className = 'tags-slide-panel';
      container.appendChild(panel);
    }
    panel.innerHTML = `
          <div class="settings-panel-header">
              <h3>${title}</h3>
              <button id="close-tags-btn">&times;</button>
          </div>
          <div class="tags-panel-body">${contentHtml}</div>`;
    
    const closeBtn = panel.querySelector('#close-tags-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', togglePanel);
    } else {
    }
  };
  
  const togglePanel = () => {
    if (panel) {
      panel.classList.toggle('is-open');
    } else {
    }
  };
  
  toggleBtn.addEventListener('click', togglePanel);
  return { update: updatePanel };
}

const sidePanel = setupSidePanel();
  let prevPostUrl = null;
  let nextPostUrl = null;

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
      if (sidePanel.update) sidePanel.update("Novel Sedang dibaca", tagsContent);

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
    if (!labels || labels.length === 0) return;
    const primaryLabel = labels[0];

    try {
      const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts?key=${config.apiKey}&labels=${encodeURIComponent(primaryLabel)}&maxResults=500&fetchBodies=false`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      const posts = (data.items || []).reverse();

      const currentIndex = posts.findIndex(post => post.id === currentPostId);
      if (currentIndex === -1) return;

      if (currentIndex > 0) {
        const prevPost = posts[currentIndex - 1];
        prevPostUrl = `post.html?id=${prevPost.id}`;
      }

      if (currentIndex < posts.length - 1) {
        const nextPost = posts[currentIndex + 1];
        nextPostUrl = `post.html?id=${nextPost.id}`;
      }
      
      if (navContainer) {
        navContainer.innerHTML = '';
      }
      
    } catch (error) {
   
    }
  }

  function renderShareButtons(title, url) {
    const container = document.getElementById('share-buttons-container');
    if (!container) return;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const buttonsHtml = `
            <h4>Bagikan Cerita Ini:</h4>
            <div class="share-buttons">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="share-btn" title="Bagikan ke Facebook"><i class="fab fa-facebook-f"></i></a>
                <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn" title="Bagikan ke Twitter"><i class="fab fa-twitter"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" class="share-btn" title="Bagikan ke WhatsApp"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn" title="Bagikan ke Telegram"><i class="fab fa-telegram-plane"></i></a>
                <button id="copy-link-btn" class="share-btn" title="Salin Tautan"><i class="fas fa-link"></i></button>
            </div>
        `;
    container.innerHTML = buttonsHtml;
    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-link"></i>';
          }, 2000);
        }).catch(err => {
        });
      });
    }
  }

  const swipeArea = document.body;
  let touchstartX = 0;
  let touchendX = 0;
  const threshold = 50; 

  function handleGesture() {
    const swipeDistance = touchendX - touchstartX;
    if (swipeDistance < -threshold) {
      if (nextPostUrl) window.location.href = nextPostUrl;
    }
    if (swipeDistance > threshold) {
      if (prevPostUrl) window.location.href = prevPostUrl;
    }
  }

  swipeArea.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
  swipeArea.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; handleGesture(); });
  swipeArea.addEventListener('mousedown', e => { touchstartX = e.screenX; });
  swipeArea.addEventListener('mouseup', e => { touchendX = e.screenX; handleGesture(); });


  function initializePostPage() {
    setupBackButton();
    renderSinglePostPage();
    setupTagPanelInteractions();
  }

  initializePostPage();
});