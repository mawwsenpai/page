document.addEventListener('DOMContentLoaded', () => {
    // --- Keamanan: Cek "Tiket Masuk" ---
    const accessToken = sessionStorage.getItem('blogger_token');
    if (!accessToken) {
        // Jika tidak ada tiket, tendang kembali ke halaman login
        window.location.href = 'index.html';
        return;
    }
    
    // --- Pemilihan Elemen DOM ---
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-link');
    const postListContainer = document.getElementById('post-list-container');
    const titleInput = document.getElementById('post-title');
    const editor = document.getElementById('post-content-editor');
    const publishButton = document.getElementById('publish-button');
    const logoutButton = document.getElementById('logout-button');
    
    // --- Logika Navigasi ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            if (!viewId) return;
            
            // Sembunyikan semua view, tampilkan yang dipilih
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
            
            // Update class 'active' di link navigasi
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // --- Logika Logout ---
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('blogger_token'); // Hapus tiket
        window.location.href = 'index.html'; // Kembali ke login
    });
    
    // --- Logika Menampilkan Postingan ---
    async function fetchPosts() {
        postListContainer.innerHTML = `<div class="spinner" style="margin: 3rem auto;"></div>`;
        const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts?key=${config.apiKey}&fetchBodies=true&maxResults=50`;
        
        try {
            const response = await fetch(apiUrl); // Tidak perlu auth untuk membaca
            const data = await response.json();
            const posts = data.items || [];
            
            let postsHtml = '<div class="post-cards-grid">';
            posts.forEach(post => {
                const wordCount = post.content.split(/\s+/).length;
                const publishedDate = new Date(post.published).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                postsHtml += `
                    <div class="post-item-card">
                        <h3>${post.title}</h3>
                        <div class="post-item-meta">
                            <span>${publishedDate}</span>
                            <span>${wordCount} kata</span>
                        </div>
                    </div>
                `;
            });
            postsHtml += '</div>';
            postListContainer.innerHTML = postsHtml;
        } catch (error) {
            postListContainer.innerHTML = '<p>Gagal memuat postingan.</p>';
        }
    }
    
    // --- Logika Membuat Postingan Baru ---
    async function publishPost() {
        const title = titleInput.value;
        const content = editor.innerHTML;
        
        if (!title || !content) {
            alert("Judul dan Konten tidak boleh kosong!");
            return;
        }
        
        publishButton.disabled = true;
        publishButton.textContent = "Loading...";
        
        try {
            const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`, // Gunakan tiket!
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    kind: "blogger#post",
                    blog: { id: config.blogId },
                    title: title,
                    content: content
                })
            });
            
            if (!response.ok) throw new Error(await response.text());
            
            const newPost = await response.json();
            alert(`Postingan "${newPost.title}" berhasil dipublikasikan!`);
            titleInput.value = ''; // Kosongkan form
            editor.innerHTML = '';
            fetchPosts(); // Muat ulang daftar postingan
            document.querySelector('.nav-link[data-view="posts-view"]').click(); // Pindah ke view postingan
            
        } catch (error) {
            console.error("Error saat publish:", error);
            alert("Terjadi kesalahan. Coba login ulang dan pastikan kamu punya izin memposting.");
        } finally {
            publishButton.disabled = false;
            publishButton.textContent = "Publish";
        }
    }
    
    // --- Inisialisasi Halaman ---
    fetchPosts();
    publishButton.addEventListener('click', publishPost);
});