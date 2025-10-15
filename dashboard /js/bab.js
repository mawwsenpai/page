(() => {
    
    firebase.initializeApp(config.firebase);
    const auth = firebase.auth();
    const db = firebase.database();
    
    // --- 2. STATE HALAMAN ---
    const pageState = {
        blogId: null,
        label: null,
        isGapiReady: false,
    };
    
    // --- 3. ELEMEN DOM ---
    const dom = {
        loader: document.getElementById('loader'),
        header: document.getElementById('chapter-header'),
        title: document.getElementById('chapter-title'),
        info: document.getElementById('chapter-info'),
        addNewBtn: document.getElementById('add-new-chapter-btn'),
        listContainer: document.getElementById('chapter-list-content'),
    };
    
    // --- 4. FUNGSI UTAMA ---
    
    async function initialize() {
        toggleLoader(true);
        
        // Ambil parameter dari URL
        const params = new URLSearchParams(window.location.search);
        pageState.blogId = params.get('blogId');
        pageState.label = params.get('label');
        
        if (!pageState.blogId || !pageState.label) {
            showErrorState("Informasi Blog atau Label tidak ditemukan di URL.");
            return;
        }
        
        try {
            await loadGapiClient();
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const token = await getUserTokenFromDb(user.uid);
                    if (token) {
                        gapi.client.setToken({ access_token: token });
                        await loadChapterData(); // Muat data setelah user terverifikasi
                    } else {
                        showErrorState("Token otentikasi tidak ditemukan. Silakan login ulang dari halaman utama.");
                    }
                } else {
                    window.location.href = 'main.html'; // Jika tidak login, kembalikan ke main.html
                }
            });
        } catch (error) {
            showErrorState("Gagal memuat komponen Google.");
        }
    }
    
    async function loadChapterData() {
        dom.title.textContent = decodeURIComponent(pageState.label);
        
        // Atur link tombol Tambah Bab Baru agar membawa info label
        dom.addNewBtn.href = `editor.html?blogId=${pageState.blogId}&label=${pageState.label}`;
        
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.posts.list({
                blogId: pageState.blogId,
                labels: pageState.label,
                fetchBodies: true, // Ambil 'content' untuk hitung kata
                maxResults: 500,
                status: ['live', 'draft'] // Ambil postingan live dan draft
            }));
            
            const posts = response.result.items || [];
            dom.info.textContent = `${posts.length} Bab ditemukan`;
            
            // Atur gambar header dari postingan pertama yang punya gambar
            const firstPostWithImage = posts.find(p => p.images && p.images.length > 0);
            if (firstPostWithImage) {
                dom.header.style.backgroundImage = `url(${firstPostWithImage.images[0].url})`;
            }
            
            dom.listContainer.innerHTML = ''; // Kosongkan container
            if (posts.length > 0) {
                posts.forEach(post => {
                    const postElement = createChapterItemElement(post);
                    dom.listContainer.appendChild(postElement);
                });
            } else {
                dom.listContainer.innerHTML = '<p style="padding: 1rem;">Belum ada bab di dalam novel ini.</p>';
            }
            
        } catch (error) {
            console.error("Gagal memuat data bab:", error);
            dom.listContainer.innerHTML = '<p style="padding: 1rem; color: #e53e3e;">Gagal memuat daftar bab.</p>';
        } finally {
            toggleLoader(false);
        }
    }
    
    // --- 5. FUNGSI PEMBANTU ---
    
    function createChapterItemElement(post) {
        const wordCount = post.content ? post.content.split(/\s+/).length : 0;
        const publishDate = new Date(post.published).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const isDraft = post.status === 'DRAFT';
        
        const a = document.createElement('a');
        a.className = 'chapter-item';
        // Link untuk mengedit post yang sudah ada
        a.href = `editor.html?blogId=${pageState.blogId}&postId=${post.id}&label=${pageState.label}`; 
        
        a.innerHTML = `
            <div class="chapter-item-title">${post.title}</div>
            <div class="chapter-item-meta">
                <div class="meta-item status">
                    <span class="status-dot ${isDraft ? 'draft' : 'live'}"></span>
                    <span>${isDraft ? 'Draft' : 'Live'}</span>
                </div>
                <div class="meta-item views">
                    <i class="fas fa-eye icon"></i>
                    <span>${post.replies.totalItems}</span> </div>
                <div class="meta-item words">
                    <i class="fas fa-file-word icon"></i>
                    <span>${wordCount}</span>
                </div>
                <div class="meta-item date">
                    <i class="fas fa-calendar-alt icon"></i>
                    <span>${publishDate}</span>
                </div>
            </div>
        `;
        return a;
    }
    
    // Fungsi-fungsi helper otentikasi (disederhanakan untuk halaman ini)
    async function loadGapiClient() {
        await new Promise((resolve) => gapi.load('client', resolve));
        await gapi.client.init({ apiKey: config.gapi.apiKey, discoveryDocs: config.gapi.discoveryDocs });
        pageState.isGapiReady = true;
    }
    const getUserTokenFromDb = (uid) => db.ref(`users/${uid}/bloggerAccessToken`).once('value').then(snap => snap.val());
    const callBloggerApi = (apiCall) => apiCall(); // Versi sederhana, asumsi token valid
    const toggleLoader = (show) => dom.loader.style.display = show ? 'flex' : 'none';
    const showErrorState = (message) => {
        document.body.innerHTML = `<div style="color:red;padding:20px;text-align:center;">${message}</div>`;
        toggleLoader(false);
    }
    
    // --- 6. JALANKAN APLIKASI ---
    initialize();
    
})();