document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-container');
    const backButton = document.getElementById('back-button');
    
    const MIN_CHARS = 3;
    let currentFetchAbortController = null;
    let allCombinedPosts = [];
    
    // Cache untuk menyimpan detail nama blog (untuk performa)
    const blogDetailsCache = new Map();

    // --- FUNGSI UTILITY BARU: Load Blog Details ---
    async function loadBlogDetails() {
        const fetchPromises = config.blogIds.map(blogId => {
            const blogDetailUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}?key=${config.apiKey}`;
            
            return fetch(blogDetailUrl)
                .then(response => response.ok ? response.json() : null)
                .catch(error => {
                    console.error(`Gagal memuat detail blog ${blogId}:`, error);
                    return null;
                });
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(blog => {
            if (blog && blog.id && blog.name) {
                blogDetailsCache.set(blog.id, blog.name);
            }
        });
    }

    // --- FUNGSI LOADING & UI ---

    function showInPageLoading() {
        resultsContainer.innerHTML = `
            <div class="in-page-loading">
                <div class="spinner-small"></div>
                <p>Mencari novel dari semua blog...</p>
            </div>
        `;
        searchInput.disabled = true;
    }

    function hideInPageLoading() {
        searchInput.disabled = false;
    }

    function createNovelCard(post, label) {
        // Mengambil nama blog dari cache
        const blogName = blogDetailsCache.get(post.blog.id) || "Blog Tidak Diketahui";
        
        const publishedDate = new Date(post.published).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const imageUrl = (post.images && post.images.length > 0) ?
            post.images[0].url.replace(/\/s\d+(-c)?\//, '/w150-h225-c/') :
            `https://via.placeholder.com/150x225/0c1012/94a3b8?text=${label}`;
        
        const labelPageUrl = `bab.html?label=${encodeURIComponent(label)}`; 
        
        return `
            <a href="${labelPageUrl}" class="novel-list-item" title="${label}">
                <div class="novel-cover">
                    <img src="${imageUrl}" alt="Cover: ${label}" loading="lazy"/>
                </div>
                <div class="novel-info">
                    <h3 class="novel-title">${label}</h3>
                    <p class="novel-meta">
                        <span class="meta-item"><i class="fas fa-book"></i> ${blogName}</span>
                        <span class="meta-item"><i class="fas fa-calendar-alt"></i> ${publishedDate}</span>
                    </p>
                    <p class="novel-status">Klik untuk melihat bab...</p>
                </div>
            </a>
        `;
    }
    
    // --- FUNGSI PENCARIAN & LOGIKA ---

    async function performSearch(query) {
    const encodedQuery = encodeURIComponent(query);
    const maxResultsPerBlog = 50;
    const labelMap = new Map(); 
    
    if (currentFetchAbortController) {
        currentFetchAbortController.abort();
    }
    currentFetchAbortController = new AbortController();
    const signal = currentFetchAbortController.signal;
    
    showInPageLoading();
    const fetchPromises = config.blogIds.map(blogId => {
        const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${config.apiKey}&q=${encodedQuery}&fetchImages=true&maxResults=${maxResultsPerBlog}&orderBy=published`;
        return fetch(apiUrl, { signal })
            .then(response => response.ok ? response.json() : { items: [] })
            .catch(error => {
                if (error.name === 'AbortError') return null;
                return { items: [] };
            });
    });
    
    const allResultsArrays = await Promise.all(fetchPromises);
    hideInPageLoading();
    
    const lowerQuery = query.toLowerCase();
    let combinedMatches = allResultsArrays
        .filter(data => data && data.items)
        .flatMap(data => data.items || []);
    
    const finalMatchingPosts = combinedMatches.filter(post => {
        const titleMatch = post.title.toLowerCase().includes(lowerQuery);
        const labelMatch = post.labels && post.labels.some(label =>
            label.toLowerCase().includes(lowerQuery)
        );
        return titleMatch || labelMatch;
    });
    
    // 👇 PERUBAHANNYA CUMA DI BAGIAN INI 👇
    finalMatchingPosts.forEach(post => {
        if (post.labels) {
            post.labels.forEach(label => {

                labelMap.set(label, post);
            });
        }
    });
    
    return Array.from(labelMap.entries());
}

    // --- EVENT LISTENERS & INISIALISASI ---

    async function initializeSearchPage() {
        // 1. Fetch dan cache semua detail nama blog sekali di awal
        searchInput.disabled = true;
        resultsContainer.innerHTML = '<p class="info-text">Memuat detail blog untuk pencarian...</p>';
        await loadBlogDetails(); 
        
        // 2. Siapkan UI dan input
        searchInput.disabled = false;
        searchInput.focus();
        resultsContainer.innerHTML = `<p class="info-text">Masukkan minimal ${MIN_CHARS} karakter untuk memulai pencarian.</p>`;
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value.trim();
            
            if (query.length < MIN_CHARS) {
                resultsContainer.innerHTML = `<p class="info-text">Masukkan minimal ${MIN_CHARS} karakter untuk memulai pencarian.</p>`;
                return;
            }
            
            const searchResults = await performSearch(query);
            
            if (currentFetchAbortController && currentFetchAbortController.signal.aborted) {
                return; 
            }
            
            if (searchResults.length > 0) {
                resultsContainer.innerHTML = searchResults
                    .map(([label, post]) => createNovelCard(post, label))
                    .join('');
            } else {
                resultsContainer.innerHTML = `<p class="info-text">Tidak ditemukan novel yang cocok untuk "${query}".</p>`;
            }
        });
    }
    
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            history.back();
        });
    }

    initializeSearchPage();
});