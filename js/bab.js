document.addEventListener('DOMContentLoaded', () => {

    const headerElement = document.getElementById('chapter-header');
    const titleElement = document.getElementById('chapter-title');
    const infoElement = document.getElementById('chapter-info');
    const listContainer = document.getElementById('chapter-list');

    /**
     * Mengambil parameter 'label' dari URL
     */
    function getLabelFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('label');
    }

    /**
     * Menampilkan data header (gambar, judul, info)
     */
    function renderHeader(firstPost, totalPosts) {
        const labelName = getLabelFromURL();
        // Ambil gambar 9:16 dari postingan pertama (terlama) dalam label ini
        const imageUrl = (firstPost.images && firstPost.images.length > 0)
            ? firstPost.images[0].url.replace(/\/s\d+(-c)?\//, '/w400-h711-c/')
            : `https://via.placeholder.com/400x711/0c1012/94a3b8?text=No+Image`;

        headerElement.style.backgroundImage = `url(${imageUrl})`;
        titleElement.textContent = labelName;
        document.title = `${labelName} - Revisi Pro`;
        infoElement.textContent = `${totalPosts} Bab | Diperbarui ${new Date(firstPost.updated).toLocaleDateString('id-ID')}`;
    }

    /**
     * Menampilkan daftar bab, diurutkan dari terlama ke terbaru
     */
    function renderChapterList(posts) {
        if (posts.length === 0) {
            listContainer.innerHTML = '<p class="info-text">Tidak ada bab ditemukan di kategori ini.</p>';
            return;
        }

        let chapterHtml = '';
        posts.forEach((post, index) => {
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


    /**
     * Fungsi utama untuk mengambil data dan menjalankan halaman
     */
    async function initializeBabPage() {
        const label = getLabelFromURL();
        if (!label) {
            titleElement.textContent = "Kategori Tidak Ditemukan";
            listContainer.innerHTML = '<p class="info-text">Label kategori tidak ada di URL.</p>';
            return;
        }

        // Ambil semua post dengan label ini
        const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts?key=${config.apiKey}&labels=${encodeURIComponent(label)}&maxResults=500&fetchImages=true`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            
            const posts = data.items || [];
            
            // Blogger API mengembalikan dari terbaru, kita balik urutannya agar jadi terlama -> terbaru
            posts.reverse(); 
            
            if (posts.length > 0) {
                renderHeader(posts[0], posts.length);
                renderChapterList(posts);
            } else {
                titleElement.textContent = label;
                infoElement.textContent = "0 Bab";
                renderChapterList([]); // Tampilkan pesan kosong
            }
            
        } catch (error) {
            console.error("Gagal mengambil data bab:", error);
            titleElement.textContent = "Gagal Memuat";
            listContainer.innerHTML = '<p class="info-text">Terjadi kesalahan saat mengambil data. Coba lagi nanti.</p>';
        }

        // Tetap jalankan tema dari app.js
        initializeTheme();
    }

    initializeBabPage();
});