document.addEventListener('DOMContentLoaded', () => {

    const loader = document.getElementById('page-loader');
    const titleHeader = document.getElementById('blog-post-title-header');
    const contentContainer = document.getElementById('blog-post-content-container');
    const backButton = document.getElementById('back-button');
    const navContainer = document.getElementById('post-navigation-container');
    const panelContainer = document.getElementById('tags-panel-container');
    
    let isSwipeActive = false;
    let prevPostUrl = null;
    let nextPostUrl = null;
    
    async function fetchAllPostsByLabel(blogId, apiKey, label) {
        let allPosts = [];
        let nextPageToken = null;
        const MAX_RESULTS_PER_PAGE = 500;
        const encodedLabel = encodeURIComponent(label);

        do {
            let url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&labels=${encodedLabel}&fetchImages=true&maxResults=${MAX_RESULTS_PER_PAGE}&orderBy=published`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`API Error ${response.status}`);
                const data = await response.json();
                if (data.items) {
                    allPosts = allPosts.concat(data.items);
                }
                nextPageToken = data.nextPageToken;
            } catch (error) {
                break; 
            }
        } while (nextPageToken);

        return allPosts;
    }

    function setupSidePanel() {
        const container = document.getElementById('tags-panel-container');
        const toggleBtn = document.getElementById('tags-toggle-btn');
        if (!container || !toggleBtn) return { update: () => {} };
        
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
            }
        };
        
        const togglePanel = () => {
          if (panel) {
            panel.classList.toggle('is-open');
          }
        };
        
        toggleBtn.addEventListener('click', togglePanel);
        return { update: updatePanel };
    }

    const sidePanel = setupSidePanel();
    
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
    
    function renderPostMetaAndShare(post, foundBlog) {
        const container = document.getElementById('post-meta-and-share-container');
        if (!container) return;

        const blogName = foundBlog ? foundBlog.name : "Nama Blog Tidak Ditemukan"; 
        const authorName = post.author.displayName || "Penulis";
        const publishedDate = new Date(post.published).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        const updatedDate = new Date(post.updated).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        const viewsCount = post.views || 'N/A';
        
        const encodedUrl = encodeURIComponent(post.url);
        const encodedTitle = encodeURIComponent(post.title);

        const combinedHtml = `
            <div class="post-meta-details">
                <p class="post-meta">
                    <span class="meta-item"><i class="fas fa-book"></i> ${blogName}</span>
                    <span class="meta-item"><i class="fas fa-user-edit"></i> ${authorName}</span>
                    <span class="meta-item"><i class="fas fa-calendar-alt"></i> Publikasi: ${publishedDate}</span>
                    <span class="meta-item"><i class="fas fa-history"></i> Update: ${updatedDate}</span>
                    <span class="meta-item"><i class="fas fa-eye"></i> Dibaca: ${viewsCount}</span>
                </p>
            </div>

            <div class="share-area">
                <h4>Bagikan Cerita Ini:</h4>
                <div class="share-buttons">
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="share-btn" title="Bagikan ke Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn" title="Bagikan ke Twitter"><i class="fab fa-twitter"></i></a>
                    <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" class="share-btn" title="Bagikan ke WhatsApp"><i class="fab fa-whatsapp"></i></a>
                    <a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn" title="Bagikan ke Telegram"><i class="fab fa-telegram-plane"></i></a>
                    <button id="copy-link-btn" class="share-btn" title="Salin Tautan"><i class="fas fa-link"></i></button>
                </div>
            </div>
        `;
        
        container.innerHTML = combinedHtml;
        
        const copyBtn = container.querySelector('#copy-link-btn');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(post.url).then(() => {
              copyBtn.innerHTML = '<i class="fas fa-check"></i>';
              setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-link"></i>';
              }, 2000);
            }).catch(err => {});
          });
        }
    }
    
    async function renderPostNavigation(currentPostId, labels) {
        if (!labels || labels.length === 0) return;
        const primaryLabel = labels[0];

        try {
            const fetchPromises = config.blogIds.map(blogId => 
                fetchAllPostsByLabel(blogId, config.apiKey, primaryLabel) 
            );

            const allPostsArrays = await Promise.all(fetchPromises);
            let posts = allPostsArrays.flat().filter(post => post);

            posts.sort((a, b) => new Date(a.published) - new Date(b.published)); 

            const currentIndex = posts.findIndex(post => post.id === currentPostId);
            if (currentIndex === -1) return;

            prevPostUrl = currentIndex > 0 ? `post.html?id=${posts[currentIndex - 1].id}` : null;
            nextPostUrl = currentIndex < posts.length - 1 ? `post.html?id=${posts[currentIndex + 1].id}` : null;
            
            if (navContainer) {
              navContainer.innerHTML = '';
            }

        } catch (error) {
            if (navContainer) navContainer.innerHTML = '';
        }
    }
    
    async function loadPostsForTag(label) {
        const decodedLabel = decodeURIComponent(label);
        if (sidePanel.update) {
    let skeletonHTML = '<div class="panel-post-list-container">';
    for (let i = 0; i < 7; i++) { // Buat 7 baris placeholder
        skeletonHTML += `
            <a class="panel-post-item skeleton">
                <div class="skeleton-img"></div>
                <span class="panel-post-item-title"></span>
            </a>
        `;
    }
    skeletonHTML += '</div>';
    sidePanel.update(decodedLabel, skeletonHTML);
        }
        
        try {
            const fetchPromises = config.blogIds.map(blogId => 
                fetchAllPostsByLabel(blogId, config.apiKey, decodedLabel) 
            );

            const allPostsArrays = await Promise.all(fetchPromises);
            let posts = allPostsArrays.flat().filter(post => post);

            posts.sort((a, b) => new Date(a.published) - new Date(b.published)); 

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

    async function renderSinglePostPage() {
        if (loader) loader.classList.remove('hidden');
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');
    
        if (!postId) {
            if (loader) loader.classList.add('hidden');
            return;
        }

        let foundPost = null;
        let sourceBlogId = null;

        for (const blogId of config.blogIds) {
            const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}?key=${config.apiKey}`;
            
            try {
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    foundPost = await response.json();
                    sourceBlogId = blogId; 
                    break; 
                }
            } catch (error) {
                console.warn(`Gagal mencari post ${postId} di Blog ID ${blogId}. Mencoba blog berikutnya...`);
            }
        }

        if (!foundPost) {
            if (loader) loader.classList.add('hidden');
            titleHeader.textContent = "Tidak Ditemukan";
            contentContainer.innerHTML = `<p class="info-text">Postingan dengan ID: ${postId} tidak ditemukan di seluruh sumber blog.</p>`;
            return;
        }
        let foundBlog = null;
        if (sourceBlogId) {
            try {
                const blogDetailUrl = `https://www.googleapis.com/blogger/v3/blogs/${sourceBlogId}?key=${config.apiKey}`;
                const response = await fetch(blogDetailUrl);
                if (response.ok) {
                    foundBlog = await response.json();
                }
            } catch (e) {
                console.warn("Gagal mengambil detail blog.", e);
            }
        }
        
        try {
            const post = foundPost; 
            
            document.title = `${post.title} - Revisi Pro`;
            titleHeader.textContent = post.title; 
            contentContainer.innerHTML = `<div class="post-body">${post.content}</div>`;

            renderPostMetaAndShare(post, foundBlog); 
            setupEndOfPostObserver();

            const tagsContent = createPostTagsContent(post.labels);
            if (sidePanel.update) sidePanel.update("Novel Sedang dibaca", tagsContent);

            renderPostNavigation(post.id, post.labels); 

        } catch (error) {
            titleHeader.textContent = "Gagal Memuat";
            contentContainer.innerHTML = `<p class="info-text">Terjadi kesalahan saat menampilkan data.</p>`;
        } finally {
            if (loader) setTimeout(() => loader.classList.add('hidden'), 300);
        }
    }
    function setupEndOfPostObserver() {
    const targetElement = document.getElementById('post-navigation-container');
    if (!targetElement) return;
    
    const options = {
        root: null, 
        rootMargin: '0px',
        threshold: 0.1 
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {

                toggleSwipeListeners(true);
            } else {
            
                toggleSwipeListeners(false);
            }
        });
    }, options);
    
    observer.observe(targetElement); 
}
    function createPostTagsContent(labels) {
        if (!labels || labels.length === 0) return '<p class="info-text">Postingan ini tidak memiliki tag.</p>';
        let listHtml = '<ul class="tag-list-in-panel">';
        labels.forEach(label => {
          listHtml += `<li><a href="#" data-label="${encodeURIComponent(label)}"><i class="fas fa-tag fa-xs"></i><span>${label}</span></a></li>`;
        });
        return listHtml + '</ul>';
    }

    let touchstartX = 0;
    let touchendX = 0;
    const threshold = 50; 
    const swipeArea = document.body;
    
    function handleGesture() {
        const swipeDistance = touchendX - touchstartX;
        
        if (swipeDistance < -threshold) {
          if (nextPostUrl) window.location.href = nextPostUrl;
        }
        
        if (swipeDistance > threshold) {
          if (prevPostUrl) window.location.href = prevPostUrl;
        }
    }
    
    function toggleSwipeListeners(active) {
    if (active) {
        if (!isSwipeActive) {
            swipeArea.addEventListener('touchstart', touchStartHandler, { passive: true });
            swipeArea.addEventListener('touchend', touchEndHandler);
            swipeArea.addEventListener('mousedown', mouseDownHandler);
            swipeArea.addEventListener('mouseup', mouseUpHandler);
            isSwipeActive = true;
            
            }
    } else {
        if (isSwipeActive) {
            swipeArea.removeEventListener('touchstart', touchStartHandler);
            swipeArea.removeEventListener('touchend', touchEndHandler);
            swipeArea.removeEventListener('mousedown', mouseDownHandler);
            swipeArea.removeEventListener('mouseup', mouseUpHandler);
            isSwipeActive = false;
            }
    }
}

const touchStartHandler = (e) => { touchstartX = e.changedTouches[0].screenX; };
const touchEndHandler = (e) => { touchendX = e.changedTouches[0].screenX; handleGesture(); };
const mouseDownHandler = (e) => { touchstartX = e.screenX; };
const mouseUpHandler = (e) => { touchendX = e.screenX; handleGesture(); };


    function initializePostPage() {
        setupBackButton();
        renderSinglePostPage();
        setupTagPanelInteractions();
    }

    initializePostPage();
});