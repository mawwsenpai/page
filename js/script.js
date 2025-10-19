

document.addEventListener('DOMContentLoaded', () => {
    
    /* --- FUNGSI UTILITY & UI (TIDAK BERUBAH) --- */
    let allCombinedPosts = [];
    
    function createLatestPostCard(post) {
        const imageUrl = (post.images && post.images.length > 0) ?
            post.images[0].url.replace(/\/s\d+(-c)?\//, '/w800-h450-c/') :
            `https://via.placeholder.com/800x450/0c1012/94a3b8?text=No+Image`;
        
        return `
            <div class="latest-post-card">
                <a href="post.html?id=${post.id}" class="latest-post-card-link">
                    <div class="latest-post-cover">
                        <img src="${imageUrl}" alt="Cover: ${post.title}" loading="eager"/>
                    </div>
                    <div class="latest-post-info">
                        <h3 class="latest-post-title">${post.title}</h3>
                    </div>
                </a>
            </div>`;
    }
    
    function createCategoryCard(post, label) {
        const imageUrl = (post.images && post.images.length > 0) ?
            post.images[0].url.replace(/\/s\d+(-c)?\//, '/w200-h300-c/') :
            `https://via.placeholder.com/200x300/0c1012/94a3b8?text=${label}`;
        
        const labelPageUrl = `bab.html?label=${encodeURIComponent(label)}`;
        
        return `
            <a href="${labelPageUrl}" class="category-card" title="${label}">
                <div class="category-card-cover">
                    <img src="${imageUrl}" alt="Kategori: ${label}" loading="lazy"/>
                </div>
                <div class="category-card-title">${label}</div>
            </a>
        `;
    }
    
    function createLatestPostPlaceholder() {
        return `
            <div class="latest-post-card skeleton">
                <div class="latest-post-cover skeleton-img"></div>
                <div class="latest-post-info">
                    <h3 class="latest-post-title skeleton-text"></h3>
                </div>
            </div>`;
    }
    
    function createCategoryCardPlaceholder() {
        return `
            <div class="category-card skeleton">
                <div class="category-card-cover skeleton-img"></div>
                <div class="category-card-title skeleton-text"></div>
            </div>`;
    }
    
    function createCategoryListPlaceholder(count = 8) {
        let placeholders = '';
        for (let i = 0; i < count; i++) {
            placeholders += createCategoryCardPlaceholder();
        }
        return placeholders;
    }
    
    /* --- FUNGSI PENGAMBILAN & PENGGABUNGAN DATA (BARU) --- */
    
    // Muat & Gabungkan data dari semua blog (Max 500 post per blog untuk Home)
    async function loadAndCombineAllDataForHome() {
        console.log(`Memuat data dari ${config.blogIds.length} blog...`);
        
        const fetchPromises = config.blogIds.map(blogId => {
            const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${config.apiKey}&fetchImages=true&maxResults=500&orderBy=published`;
            return fetch(apiUrl)
                .then(response => response.ok ? response.json() : { items: [] })
                .catch(error => {
                    console.error(`Gagal memuat dari blog ${blogId}:`, error);
                    return { items: [] };
                });
        });
        
        try {
            const allPostsArrays = await Promise.all(fetchPromises);
            
            // Gabungkan SEMUA postingan dan filter yang null
            let combinedPosts = allPostsArrays.flatMap(data => data.items || []);
            
            // Urutkan keseluruhan data gabungan (Terbaru ke Terlama)
            combinedPosts.sort((a, b) => new Date(b.published) - new Date(a.published));
            
            // Simpan di variabel global
            allCombinedPosts = combinedPosts;
            
            console.log(`Total ${allCombinedPosts.length} postingan dimuat dan digabungkan.`);
            return combinedPosts;
            
        } catch (error) {
            console.error("Gagal memproses data gabungan:", error);
            return combinedPosts;
        }
    }
    
    /* --- FUNGSI RENDER (MODIFIKASI) --- */
    
    async function renderLatestPost() {
        const container = document.getElementById('latest-post-container');
        if (!container) return;
        
        // Tampilkan placeholder di awal
        if (allCombinedPosts.length === 0) {
            container.innerHTML = createLatestPostPlaceholder();
            return;
        }
        
        // Ambil postingan paling terbaru secara keseluruhan dari data gabungan
        const overallLatestPost = allCombinedPosts[0];
        
        if (overallLatestPost) {
            container.innerHTML = createLatestPostCard(overallLatestPost);
        } else {
            container.innerHTML = `<p>Tidak ada postingan terbaru.</p>`;
        }
    }
    
    async function renderCategoryList() {
    const container = document.getElementById('category-list-container');
    if (!container) return;
    
    if (allCombinedPosts.length === 0) {
        container.innerHTML = createCategoryListPlaceholder(8);
        return;
    }
    
    const posts = allCombinedPosts;
    const labelMap = new Map();
    
    // Iterasi untuk mencari postingan paling LAMA untuk setiap label
    posts.forEach(post => {
        if (post.labels) {
            post.labels.forEach(label => {
                // 👇 PERUBAHANNYA CUMA DI SINI 👇
                // Hapus `if`, biarkan dia menimpa terus menerus.
                // Data terakhir yang masuk adalah dari post terlama.
                labelMap.set(label, post);
            });
        }
    });
    
    const categories = Array.from(labelMap.entries());
    
    if (categories.length === 0) {
        container.innerHTML = `<p>Tidak ada kategori ditemukan.</p>`;
        return;
    }
    
    // Tampilkan hanya 8 kategori teratas (atau sesuai kebutuhan)
    const topCategories = categories.slice(0, 8);
    
    container.innerHTML = topCategories.map(([label, post]) => createCategoryCard(post, label)).join('');
}
    
    /* --- INISIALISASI --- */
    
    async function initializeHomePage() {
        // Tampilkan placeholder saat memuat data
        document.getElementById('latest-post-container').innerHTML = createLatestPostPlaceholder();
        document.getElementById('category-list-container').innerHTML = createCategoryListPlaceholder(8);
        
        // 1. Muat dan gabungkan data di awal
        await loadAndCombineAllDataForHome();
        
        // 2. Render komponen menggunakan data yang sudah siap
        renderLatestPost();
        renderCategoryList();
        
        // (Fitur pencarian di luar scope file ini)
    }
    
    initializeHomePage();
});