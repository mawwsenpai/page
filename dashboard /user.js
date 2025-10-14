// dashboard/user.js

document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI --- //
    const CLIENT_ID = config.clienid; 
    const API_KEY = config.apiKey; 
    const BLOG_ID = config.blogId;
    const SCOPES = 'https://www.googleapis.com/auth/blogger';

    let tokenClient;
    let gapiInited = false;
    let gisInited = false;
    let accessToken = null;

    // --- DOM ELEMENTS --- //
    const loginBtn = document.getElementById('login-btn');
    const loginLinkContainer = document.getElementById('login-link-container');
    const userProfileLinkContainer = document.getElementById('user-profile-link-container');
    const profileImgNav = document.querySelector('.profile-nav-link-img');
    const profileNameNav = document.querySelector('.profile-nav-link span');

    const views = document.querySelectorAll('.main-view');
    const novelListScroller = document.getElementById('novel-list-scroller');
    const chapterListContainer = document.getElementById('chapter-list');
    
    // Tombol Navigasi
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const backToNovelBtn = document.getElementById('back-to-novel-btn');
    const sidebarLinks = document.querySelectorAll('.nav-link[data-view]');

    // Detail Novel Elements
    const novelCoverImg = document.getElementById('novel-cover-img');
    const novelTitle = document.getElementById('novel-title');
    const novelDescription = document.getElementById('novel-description');
    
    // Editor Elements
    const chapterEditorView = document.getElementById('chapter-editor-view');
    const editorTitleInput = document.getElementById('main-header-title-input');
    const editorTextarea = document.getElementById('main-editor-textarea');
    const saveChapterBtn = document.getElementById('save-chapter-btn');
    const addChapterBtn = document.getElementById('add-chapter-btn');

    // Modal Elements
    const createNovelModal = document.getElementById('create-novel-modal');
    const confirmCreateNovelBtn = document.getElementById('confirm-create-novel');
    const newNovelTitleInput = document.getElementById('new-novel-title');

    let allPostsCache = [];
    let novelsData = new Map();
    let currentNovelLabel = null;
    let currentEditingPostId = null;

    // --- INISIALISASI --- //

    function initializeGapiClient() {
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/blogger/v3/rest'],
        }).then(() => { gapiInited = true; maybeEnableButtons(); });
    }

    function initializeGisClient() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                accessToken = tokenResponse.access_token;
                fetchUserProfile();
                showDashboard();
            },
        });
        gisInited = true;
        maybeEnableButtons();
    }
    
    gapi.load('client', initializeGapiClient);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGisClient;
    document.body.appendChild(script);

    function maybeEnableButtons() {
        if (gapiInited && gisInited) {
            loginBtn.disabled = false;
        }
    }

    // --- AUTENTIKASI --- //

    loginBtn.addEventListener('click', () => {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });

    async function fetchUserProfile() {
        try {
            const response = await gapi.client.blogger.users.get({ userId: 'self' });
            const profile = response.result;
            loginLinkContainer.style.display = 'none';
            userProfileLinkContainer.style.display = 'block';
            profileImgNav.src = profile.avatar.url;
            profileNameNav.textContent = profile.displayName;
        } catch (err) {
            console.error("Gagal mendapatkan profil pengguna:", err);
        }
    }

    // --- NAVIGASI & PENGELOLAAN TAMPILAN --- //

    function switchView(viewId) {
        views.forEach(view => {
            view.classList.toggle('active', view.id === viewId);
        });
        document.querySelector('.nav-link.active')?.classList.remove('active');
        document.querySelector(`.nav-link[data-view="${viewId}"]`)?.classList.add('active');
    }
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = e.currentTarget.dataset.view;
            if (viewId) switchView(viewId);
        });
    });

    backToDashboardBtn.addEventListener('click', () => switchView('app-dashboard'));
    backToNovelBtn.addEventListener('click', () => showNovelDetail(currentNovelLabel));

    // --- LOGIKA UTAMA & API CALLS --- //

    async function showDashboard() {
        // Tampilkan loading
        novelListScroller.innerHTML = `<p>Memuat novel...</p>`;
        try {
            const response = await gapi.client.blogger.posts.list({
                blogId: BLOG_ID,
                maxResults: 500, // Ambil semua post untuk membangun daftar novel
                fetchBodies: false,
                fetchImages: true,
                orderBy: 'published' // Ambil dari yang terlama
            });

            allPostsCache = response.result.items || [];
            processPostsIntoNovels();
            renderNovelList();
        } catch (error) {
            console.error("Gagal memuat daftar post:", error);
            novelListScroller.innerHTML = `<p>Gagal memuat novel. Coba lagi nanti.</p>`;
        }
    }

    function processPostsIntoNovels() {
        novelsData.clear();
        if (!allPostsCache) return;

        allPostsCache.forEach(post => {
            if (post.labels && post.labels.length > 0) {
                post.labels.forEach(label => {
                    if (!novelsData.has(label)) {
                        novelsData.set(label, {
                            title: label,
                            chapters: [],
                            firstPost: post // Post pertama dengan label ini akan jadi representasi
                        });
                    }
                    novelsData.get(label).chapters.push(post);
                });
            }
        });
    }

    function renderNovelList() {
        novelListScroller.innerHTML = '';
        if (novelsData.size === 0) {
            novelListScroller.innerHTML = `<p>Anda belum punya novel. Silakan buat yang baru!</p>`;
            return;
        }

        novelsData.forEach(novel => {
            const firstPost = novel.firstPost;
            const coverUrl = (firstPost.images && firstPost.images.length > 0)
                ? firstPost.images[0].url.replace(/\/s\d+(-c)?\//, '/w200-h300-c/')
                : 'https://via.placeholder.com/200x300/0c1012/94a3b8?text=No+Cover';

            const card = document.createElement('div');
            card.className = 'novel-card';
            card.dataset.label = novel.title;
            card.innerHTML = `
                <div class="novel-card-cover">
                    <img src="${coverUrl}" alt="Cover ${novel.title}" loading="lazy"/>
                </div>
                <div class="novel-card-info">
                    <h3 class="novel-card-title">${novel.title}</h3>
                </div>
            `;
            card.addEventListener('click', () => showNovelDetail(novel.title));
            novelListScroller.appendChild(card);
        });
    }
    
    function showNovelDetail(label) {
        currentNovelLabel = label;
        const novel = novelsData.get(label);
        if (!novel) return;

        const firstPost = novel.firstPost;
        const coverUrl = (firstPost.images && firstPost.images.length > 0)
            ? firstPost.images[0].url.replace(/\/s\d+(-c)?\//, '/w400-h600-c/')
            : 'https://via.placeholder.com/400x600/0c1012/94a3b8?text=No+Cover';
        
        novelCoverImg.src = coverUrl;
        novelTitle.textContent = novel.title;
        // Deskripsi bisa diambil dari post khusus metadata nanti
        novelDescription.textContent = `Novel dengan genre ${novel.title}.`;

        renderChapterList(novel.chapters);
        switchView('novel-detail-view');
    }

    function renderChapterList(chapters) {
        chapterListContainer.innerHTML = '';
        if (chapters.length === 0) {
            chapterListContainer.innerHTML = '<p>Belum ada bab di novel ini.</p>';
            return;
        }
        chapters.forEach(chapter => {
            const item = document.createElement('div');
            item.className = 'chapter-item';
            item.innerHTML = `
                <span class="chapter-item-title">${chapter.title}</span>
                <div class="chapter-item-actions">
                    <button class="app-button outline edit-chapter-btn" data-post-id="${chapter.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="app-button outline danger delete-chapter-btn" data-post-id="${chapter.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            chapterListContainer.appendChild(item);
        });
    }

    async function saveChapter() {
        if (!accessToken) {
            alert("Sesi login berakhir. Silakan login kembali.");
            return;
        }
        
        const title = editorTitleInput.value.trim();
        const content = editorTextarea.value;
        if (!title) {
            alert("Judul bab tidak boleh kosong!");
            return;
        }

        const postBody = {
            title: title,
            content: content,
            labels: [currentNovelLabel]
        };

        try {
            let response;
            if (currentEditingPostId) { // Mode Edit
                response = await gapi.client.blogger.posts.update({
                    blogId: BLOG_ID,
                    postId: currentEditingPostId,
                    resource: postBody,
                    access_token: accessToken
                });
            } else { // Mode Buat Baru
                response = await gapi.client.blogger.posts.insert({
                    blogId: BLOG_ID,
                    resource: postBody,
                    access_token: accessToken
                });
            }
            alert('Bab berhasil disimpan!');
            await showDashboard(); // Refresh data
            showNovelDetail(currentNovelLabel); // Kembali ke detail novel
        } catch (error) {
            console.error("Gagal menyimpan bab:", error);
            alert("Terjadi kesalahan saat menyimpan bab.");
        }
    }

    // --- EVENT LISTENERS DINAMIS & MODAL --- //
    
    // Event listener untuk tombol edit/delete di daftar bab
    chapterListContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-chapter-btn');
        const deleteBtn = e.target.closest('.delete-chapter-btn');

        if (editBtn) {
            currentEditingPostId = editBtn.dataset.postId;
            // Ambil konten post
            const response = await gapi.client.blogger.posts.get({
                blogId: BLOG_ID,
                postId: currentEditingPostId
            });
            const post = response.result;
            editorTitleInput.value = post.title;
            editorTextarea.value = post.content || '';
            switchView('chapter-editor-view');
        }

        if (deleteBtn) {
            // Logika untuk konfirmasi dan hapus
        }
    });
    
    addChapterBtn.addEventListener('click', () => {
        currentEditingPostId = null; // Mode buat baru
        editorTitleInput.value = '';
        editorTextarea.value = '';
        switchView('chapter-editor-view');
    });

    saveChapterBtn.addEventListener('click', saveChapter);
    document.querySelector('button[data-modal-target="create-novel-modal"]').addEventListener('click', () => {
    createNovelModal.classList.add('is-open');
    });
    // Tutup Modal
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal').classList.remove('is-open'));
    });

    // Logika Buat Novel Baru (membuat post pertama sebagai placeholder)
    confirmCreateNovelBtn.addEventListener('click', async () => {
        const title = newNovelTitleInput.value.trim();
        if (!title) {
            alert("Judul novel tidak boleh kosong!");
            return;
        }

        const postBody = {
            title: `Bab 1: Awal Mula Cerita ${title}`, // Judul bab pertama default
            content: `<p>Ini adalah awal dari petualangan di novel ${title}. Selamat menulis!</p>`,
            labels: [title] // Ini yang akan menjadi "Novel"
        };
        
        try {
            await gapi.client.blogger.posts.insert({
                blogId: BLOG_ID,
                resource: postBody,
                access_token: accessToken
            });
            alert('Novel baru berhasil dibuat!');
            createNovelModal.classList.remove('is-open');
            await showDashboard(); // Refresh
        } catch (error) {
            console.error("Gagal membuat novel:", error);
            alert("Gagal membuat novel baru.");
        }
    });
});