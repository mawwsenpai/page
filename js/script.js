// ISI LENGKAP UNTUK FILE: js/script.js

document.addEventListener('DOMContentLoaded', () => {
    
    /**
     * Membuat kartu besar untuk postingan terbaru (16:9)
     */
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
    
    /**
     * Membuat kartu kecil untuk kategori (2:3) dengan judul label
     */
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
    
    /**
     * Mengambil dan menampilkan HANYA SATU postingan terbaru.
     */
    async function renderLatestPost() {
        const container = document.getElementById('latest-post-container');
        if (!container) return;
        const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts?key=${config.apiKey}&fetchImages=true&maxResults=1`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            if (!data.items || data.items.length === 0) {
                container.innerHTML = `<p>Tidak ada postingan terbaru.</p>`;
                return;
            }
            container.innerHTML = createLatestPostCard(data.items[0]);
        } catch (error) {
            console.error(`Gagal memuat postingan terbaru:`, error);
            container.innerHTML = `<p>Gagal memuat postingan.</p>`;
        }
    }
    
    /**
     * Mengambil 1 postingan dari setiap label terlama untuk ditampilkan sebagai kategori.
     */
    async function renderCategoryList() {
        const container = document.getElementById('category-list-container');
        if (!container) return;
        
        try {
            const allPostsUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts?key=${config.apiKey}&maxResults=200&fetchImages=true&orderBy=published`;
            const response = await fetch(allPostsUrl);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            if (!data.items) throw new Error("Gagal mengambil daftar postingan.");
            
            const labelMap = new Map();
            data.items.forEach(post => {
                if (post.labels) {
                    post.labels.forEach(label => {
                        if (!labelMap.has(label)) {
                            labelMap.set(label, post);
                        }
                    });
                }
            });
            
            const categories = Array.from(labelMap.entries());
            if (categories.length === 0) {
                container.innerHTML = `<p>Tidak ada kategori ditemukan.</p>`;
                return;
            }
            container.innerHTML = categories.map(([label, post]) => createCategoryCard(post, label)).join('');
        } catch (error) {
            console.error(`Gagal memuat daftar kategori:`, error);
            container.innerHTML = `<p>Gagal memuat kategori.</p>`;
        }
    }
    
    // --- INISIALISASI HALAMAN UTAMA ---
    function initializeHomePage() {
        renderLatestPost();
        renderCategoryList();
        initializeTheme();
    }
    
    initializeHomePage();
});