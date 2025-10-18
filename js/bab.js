// =========================================================================
// bab.js - Script untuk Halaman Daftar Bab (bab.html)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    let allCombinedPosts = [];
    
    const headerElement = document.getElementById('chapter-header');
    const titleElement = document.getElementById('chapter-title');
    const infoElement = document.getElementById('chapter-info');
    const listContainer = document.getElementById('chapter-list');
    
    /* --- FUNGSI PAGING LINTAS BLOG --- */

    /**
     * Mengambil SEMUA postingan dengan LABEL tertentu dari satu Blog ID menggunakan Paging.
     */
    async function fetchAllPostsByLabel(blogId, apiKey, label) {
        let allPosts = [];
        let nextPageToken = null;
        let url;
        const MAX_RESULTS_PER_PAGE = 500;
        const encodedLabel = encodeURIComponent(label);

        do {
            url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&labels=${encodedLabel}&fetchImages=true&maxResults=${MAX_RESULTS_PER_PAGE}&orderBy=published`;
            
            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`;
            }

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`API Error ${response.status} for label ${label} in ${blogId}`);
                
                const data = await response.json();
                
                if (data.items) {
                    allPosts = allPosts.concat(data.items);
                }
                
                nextPageToken = data.nextPageToken;
            } catch (error) {
                console.error(`Gagal memuat halaman untuk Label ${label} dari ${blogId}:`, error);
                break; 
            }
        } while (nextPageToken);

        return allPosts;
    }

    /* --- FUNGSI UTILITY & RENDER --- */

    function getLabelFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('label');
    }

    function renderHeader(firstPost, totalPosts) {
        const labelName = getLabelFromURL();
        const imageUrl = (firstPost.images && firstPost.images.length > 0)
            ? firstPost.images[0].url.replace(/\/s\d+(-c)?\//, '/w400-h711-c/')
            : `https://via.placeholder.com/400x711/0c1012/94a3b8?text=No+Image`;

        headerElement.style.backgroundImage = `url(${imageUrl})`;
        titleElement.textContent = labelName;
        document.title = `${labelName} - Daftar Bab`;
        infoElement.textContent = `${totalPosts} Bab | Diperbarui ${new Date(firstPost.updated).toLocaleDateString('id-ID')}`;
    }
    
    function renderChapterList(posts) {
        if (posts.length === 0) {
            listContainer.innerHTML = '<p class="info-text">Tidak ada bab ditemukan di kategori ini.</p>';
            return;
        }

        // posts sudah diurutkan tertua ke terbaru (Bab 1, 2, 3...)
        let chapterHtml = '';
        posts.forEach((post, index) => {
            // Index + 1 sebagai nomor bab (asumsi urutan publikasi = urutan bab)
            const chapterNumber = index + 1; 
            const publishedDate = new Date(post.published).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            
            chapterHtml += `
                <a href="post.html?id=${post.id}" class="chapter-item">
                    <span class="chapter-number">${chapterNumber}</span>
                    <div class="chapter-item-details">
                        <p class="chapter-item-title">${post.title}</p>
                        <p class="chapter-item-date"><i class="fas fa-calendar-alt"></i> ${publishedDate}</p>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </a>
            `;
        });
        listContainer.innerHTML = chapterHtml;
    }
    
    /* --- INSIALISASI HALAMAN BAB --- */

    async function initializeBabPage() {
        const label = getLabelFromURL();
        if (!label) {
            titleElement.textContent = "Kategori Tidak Ditemukan";
            listContainer.innerHTML = '<p class="info-text">Label kategori tidak ada di URL.</p>';
            return;
        }
        
        const loadingText = `Memuat semua Bab ${label} dari ${config.blogIds.length} blog...`;
        listContainer.innerHTML = `<p class="info-text loading">${loadingText}</p>`;

        try {
            // 1. Buat promises untuk fetch SEMUA postingan dengan label dari SETIAP blog ID (dengan Paging)
            const fetchPromises = config.blogIds.map(blogId => 
                fetchAllPostsByLabel(blogId, config.apiKey, label)
            );

            const allPostsArrays = await Promise.all(fetchPromises);
            
            // 2. Gabungkan SEMUA postingan dari SEMUA blog
            let labelPosts = allPostsArrays.flat().filter(post => post);
            
            // 3. Urutkan secara kronologis (Bab 1, Bab 2, dst)
            labelPosts.sort((a, b) => new Date(a.published) - new Date(b.published)); 

            if (labelPosts.length > 0) {
                 // Ambil post terbaru (terakhir di array) untuk header
                 const latestPost = labelPosts[labelPosts.length - 1]; 
                 renderHeader(latestPost, labelPosts.length); 
                 renderChapterList(labelPosts);
            } else {
                titleElement.textContent = label;
                infoElement.textContent = "0 Bab";
                renderChapterList([]);
            }
            
        } catch (error) {
            console.error("Gagal mengambil data bab:", error);
            titleElement.textContent = "Gagal Memuat";
            listContainer.innerHTML = '<p class="info-text">Terjadi kesalahan saat mengambil data.</p>';
        }

    }

    initializeBabPage();
});