// File: js/main.js (Versi Final Paling Lengkap)
(() => {
    // --- 1. KONFIGURASI & INISIALISASI ---
    const config = {
        firebase: {
            apiKey: "AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60",
            authDomain: "revisipro-6dd30.firebaseapp.com",
            databaseURL: "https://revisipro-6dd30-default-rtdb.asia-southeast1.firebasedatabase.app",
        },
        gapi: {
            apiKey: 'AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60',
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/blogger/v3/rest"],
            scope: 'https://www.googleapis.com/auth/blogger'
        }
    };

    // Pengecekan mandiri untuk masalah 'addScope'
    if (typeof config.gapi.scope !== 'string' || config.gapi.scope === '') {
        alert("FATAL ERROR: 'scope' di konfigurasi main.js tidak valid! Kode tidak akan berjalan.");
        return; // Hentikan eksekusi jika config rusak
    }

    firebase.initializeApp(config.firebase);
    const auth = firebase.auth();
    const db = firebase.database();

    // --- 2. STATE APLIKASI ---
    const appState = {
        currentUser: null,
        currentBlogId: null,
        isGapiReady: false,
        allPosts: [], // Cache untuk semua postingan
    };

    // --- 3. ELEMEN DOM ---
    const dom = {
        loader: document.getElementById('loader'),
        sidebar: document.getElementById('app-sidebar'),
        mainLayout: document.querySelector('.main-layout'),
        // Views
        dashboardView: document.getElementById('dashboard-view'),
        analysisView: document.getElementById('analysis-view'),
        analysisSelection: document.getElementById('analysis-selection'),
        analysisDetail: document.getElementById('analysis-detail'),
        initialBlogSelectionView: document.getElementById('initial-blog-selection-view'),
        dashboardEmptyState: document.getElementById('dashboard-empty-state'),
        // Tombol & Navigasi
        sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
        backToAnalysisSelectionBtn: document.getElementById('back-to-analysis-selection'),
        // Konten
        blogNameHeader: document.getElementById('blog-name-header'),
        welcomeTitle: document.getElementById('welcome-title'),
        initialBlogList: document.getElementById('initial-blog-list'),
        novelListContainer: document.getElementById('novel-list-container'),
        analysisNovelList: document.getElementById('analysis-novel-list'),
        analysisDetailTitle: document.getElementById('analysis-detail-title'),
        analysisDetailList: document.getElementById('analysis-detail-list'),
        // Modal
        addNovelModal: document.getElementById('add-novel-modal'),
        closeAddNovelModal: document.getElementById('close-add-novel-modal'),
        novelTitleInput: document.getElementById('novel-title-input'),
        createNovelBtn: document.getElementById('create-novel-btn'),
    };

    // --- 4. FUNGSI UTAMA & ALUR KERJA ---

    async function initialize() {
        setupEventListeners();
        toggleLoader(true);
        try {
            await loadGapiClient();
            auth.onAuthStateChanged(handleAuthStateChange);
        } catch (error) {
            console.error("Gagal inisialisasi GAPI:", error);
            showErrorState("Gagal memuat komponen Google. Coba refresh halaman.");
        }
    }

    async function handleAuthStateChange(user) {
        toggleAllViews(false);
        if (user) {
            appState.currentUser = user;
            const tokenFromDb = await getUserDataFromDb(user.uid, 'bloggerAccessToken');
            if (tokenFromDb) {
                gapi.client.setToken({ access_token: tokenFromDb });
                renderSidebar('main');
                const selectedBlogId = await getUserDataFromDb(user.uid, 'selectedBlogId');
                if (selectedBlogId) {
                    appState.currentBlogId = selectedBlogId;
                    const blog = await callBloggerApi(() => gapi.client.blogger.blogs.get({ blogId: appState.currentBlogId }));
                    if(blog) dom.blogNameHeader.textContent = blog.result.name;
                    await fetchAllPosts();
                    await renderDashboard();
                } else {
                    await renderInitialBlogSelection();
                }
            } else {
                await refreshToken();
            }
        } else {
            renderSidebar('guest');
            updateUIForGuest();
            toggleLoader(false);
        }
    }

    async function fetchAllPosts() {
        toggleLoader(true);
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.posts.list({
                blogId: appState.currentBlogId,
                maxResults: 500,
                status: ['live', 'draft'],
                fetchImages: true,
                view: 'AUTHOR'
            }));
            if (response && response.result.items) {
                appState.allPosts = response.result.items;
            } else {
                 appState.allPosts = [];
            }
        } catch (error) {
            console.error("Gagal mengambil semua post:", error);
            appState.allPosts = [];
        } finally {
            toggleLoader(false);
        }
    }

    async function renderDashboard() {
        toggleAllViews(false);
        dom.dashboardView.classList.remove('hidden');

        const novelMap = new Map();
        appState.allPosts.forEach(post => post.labels?.forEach(label => {
            if (!novelMap.has(label)) novelMap.set(label, { post, count: 0 });
        }));
        appState.allPosts.forEach(post => post.labels?.forEach(label => {
            if (novelMap.has(label)) novelMap.get(label).count++;
        }));

        const addCard = document.createElement('div');
        addCard.className = 'create-label-card';
        addCard.innerHTML = `<div class="icon-placeholder"><i class="fas fa-plus-circle"></i><span>Buat Novel Baru</span></div>`;
        addCard.onclick = () => dom.addNovelModal.classList.remove('hidden');

        const novelCards = Array.from(novelMap.entries()).map(([label, { post, count }]) => {
            const imgUrl = (post.images?.[0]?.url.replace(/\/s\d+(-c)?\//, '/w200-h300-c/')) || `https://via.placeholder.com/200x300/1a2026/94a3b8?text=${encodeURIComponent(label)}`;
            const cardLink = document.createElement('a');
            cardLink.href = `bab.html?blogId=${appState.currentBlogId}&label=${encodeURIComponent(label)}`;
            cardLink.className = 'tag-card-link';
            cardLink.innerHTML = `
                <div class="tag-card">
                    <div class="tag-card-cover"><img src="${imgUrl}" alt="${label}"></div>
                    <div class="tag-card-info"><h3 class="tag-card-title">${label}</h3></div>
                    <div class="analysis-overlay">
                        <h4 class="analysis-title">Analisis Novel</h4>
                        <span class="analysis-stat">${count}</span>
                        <span class="analysis-label">Total Bab</span>
                    </div>
                </div>`;
            return cardLink;
        });
        dom.novelListContainer.replaceChildren(addCard, ...novelCards);
    }

    function renderAnalysisView() {
        toggleAllViews(false);
        dom.analysisView.classList.remove('hidden');
        dom.analysisSelection.classList.remove('hidden');
        dom.analysisDetail.classList.add('hidden');
        
        const novelMap = new Map();
        appState.allPosts.forEach(post => post.labels?.forEach(label => {
            if (!novelMap.has(label)) novelMap.set(label, { post });
        }));

        dom.analysisNovelList.innerHTML = '';
        novelMap.forEach(({ post }, label) => {
            const div = document.createElement('div');
            div.className = 'initial-blog-list-item';
            div.innerHTML = `<h3>${label}</h3>`;
            div.onclick = () => renderAnalysisDetail(label);
            dom.analysisNovelList.appendChild(div);
        });
    }

    function renderAnalysisDetail(label) {
        dom.analysisSelection.classList.add('hidden');
        dom.analysisDetail.classList.remove('hidden');
        dom.analysisDetailTitle.textContent = `Analisis: ${label}`;
        
        const postsInNovel = appState.allPosts.filter(p => p.labels?.includes(label));
        
        dom.analysisDetailList.innerHTML = '';
        if (postsInNovel.length > 0) {
            const header = document.createElement('div');
            header.className = 'chapter-list-header';
            header.innerHTML = `<div class="col-title">Judul Bab</div><div class="col-views">Tayangan</div><div class="col-comments">Komentar</div><div class="col-date">Tanggal</div>`;
            
            const list = document.createElement('div');
            list.className = 'chapter-list';
            postsInNovel.forEach(post => {
                const item = document.createElement('div');
                item.className = 'chapter-item';
                const publishDate = new Date(post.published).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                item.innerHTML = `
                    <div class="chapter-item-title">${post.title}</div>
                    <div class="chapter-item-meta">
                        <div class="meta-item views"><i class="fas fa-eye icon"></i><span>${post.pageviews || 'N/A'}</span></div>
                        <div class="meta-item comments"><i class="fas fa-comments icon"></i><span>${post.replies.totalItems}</span></div>
                        <div class="meta-item date"><span>${publishDate}</span></div>
                    </div>`;
                list.appendChild(item);
            });
            dom.analysisDetailList.replaceChildren(header, list);
        } else {
            dom.analysisDetailList.innerHTML = '<p>Tidak ada bab untuk dianalisis.</p>';
        }
    }
    
    async function renderInitialBlogSelection() {
        toggleLoader(true);
        toggleAllViews(false);
        dom.initialBlogSelectionView.classList.remove('hidden');
        dom.welcomeTitle.textContent = `Selamat Datang, ${appState.currentUser.displayName}!`;
        dom.initialBlogList.innerHTML = `<p>Memuat daftar blog...</p>`;
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.blogs.listByUser({ userId: 'self' }));
            if (!response) return;
            const blogs = response.result.items || [];
            dom.initialBlogList.innerHTML = '';
            if (blogs.length > 0) {
                blogs.forEach(blog => {
                    const div = document.createElement('div');
                    div.className = 'initial-blog-list-item';
                    div.innerHTML = `<h3>${blog.name}</h3>`;
                    div.onclick = () => selectBlog(blog.id);
                    dom.initialBlogList.appendChild(div);
                });
            } else {
                dom.initialBlogList.innerHTML = '<p>Anda tidak memiliki blog. Buat dulu di Blogger.com</p>';
            }
        } catch (error) {
            console.error("Gagal memuat daftar blog:", error);
        } finally {
            toggleLoader(false);
        }
    }

    // --- 5. FUNGSI AKSI & EVENT HANDLER ---

    async function refreshToken() {
        console.log("Memulai proses penyegaran token...");
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope(config.gapi.scope);
        provider.setCustomParameters({ prompt: 'consent' });
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            const token = result.credential?.accessToken;
            if (!token) throw new Error("Gagal mendapatkan accessToken baru.");
            gapi.client.setToken({ access_token: token });
            await db.ref(`users/${user.uid}`).update({ displayName: user.displayName, email: user.email, photoURL: user.photoURL, bloggerAccessToken: token });
            console.log("Token baru berhasil disimpan.");
            await handleAuthStateChange(user);
        } catch (error) {
            console.error("Gagal menyegarkan token:", error);
            await auth.signOut();
            showErrorState("Gagal mendapatkan izin dari Google. Silakan coba login kembali.");
        }
    }

    async function callBloggerApi(apiCall, retryCount = 1) {
        if (!appState.isGapiReady) throw new Error("GAPI client belum siap.");
        try {
            return await apiCall();
        } catch (error) {
            if (error.result?.error?.code === 401 && retryCount > 0) {
                console.warn("API call gagal (401). Mencoba refresh token...");
                await refreshToken();
                return; // Hentikan eksekusi, biarkan refreshToken memicu alur baru
            }
            throw error;
        }
    }
    
    async function handleLogin() { await refreshToken(); }

    async function handleLogout() {
        toggleLoader(true);
        await auth.signOut();
        window.location.reload();
    }

    async function selectBlog(blogId) {
        toggleLoader(true);
        appState.currentBlogId = blogId;
        await db.ref(`users/${appState.currentUser.uid}`).update({ selectedBlogId: blogId });
        await fetchAllPosts();
        await renderDashboard();
    }

    async function handleCreateNewNovel() {
        const novelTitle = dom.novelTitleInput.value.trim();
        if (!novelTitle) { alert("Judul Novel tidak boleh kosong!"); return; }
        toggleLoader(true);
        dom.addNovelModal.classList.add('hidden');
        dom.novelTitleInput.value = '';
        try {
            const placeholder = await callBloggerApi(() => gapi.client.blogger.posts.insert({
                blogId: appState.currentBlogId, isDraft: true,
                resource: { title: `Bab 1: [Judul Bab Pertama Anda]`, content: `<p>Ini adalah placeholder...</p>`, labels: [novelTitle] }
            }));
            if (placeholder?.result) {
                window.location.href = `bab.html?blogId=${appState.currentBlogId}&label=${encodeURIComponent(novelTitle)}`;
            } else { throw new Error("Gagal membuat postingan placeholder."); }
        } catch (error) {
            console.error("Gagal membuat novel:", error);
            alert("Gagal membuat novel baru.");
            toggleLoader(false);
        }
    }
    
    // --- 6. FUNGSI SIDEBAR & PEMBANTU ---
    
    function setupEventListeners() {
        dom.sidebarToggleBtn.onclick = () => dom.sidebar.classList.toggle('is-open');
        dom.closeAddNovelModal.onclick = () => {
            dom.novelTitleInput.value = '';
            dom.addNovelModal.classList.add('hidden');
        };
        dom.createNovelBtn.onclick = handleCreateNewNovel;
        dom.backToAnalysisSelectionBtn.onclick = renderAnalysisView;
    }
    
    function renderSidebar(state) {
        let content = '';
        if (state === 'guest') {
            content = `<div class="sidebar-header"><h2 class="sidebar-title">Dashboard</h2></div><div class="sidebar-content"><div class="control-group"><h3 class="control-group-title">Akun</h3><ul class="nav-list"><li><a class="nav-link" href="#" id="login-btn"><i class="fas fa-sign-in-alt"></i><span>Login</span></a></li></ul></div></div>`;
        } else if (state === 'main') {
            const user = appState.currentUser;
            content = `<div class="sidebar-header"><h2 class="sidebar-title">Dashboard</h2><button id="close-sidebar-btn" class="modal-close-btn">&times;</button></div><div class="sidebar-content"><div class="profile-card"><img id="profile-avatar" src="${user.photoURL || ''}" alt="Avatar"><h3 id="profile-name">${user.displayName}</h3><p id="profile-email">${user.email}</p></div><div class="control-group"><h3 class="control-group-title">Menu</h3><ul class="nav-list"><li><a class="nav-link" href="#" id="nav-beranda"><i class="fas fa-home"></i><span>Beranda Novel</span></a></li><li><a class="nav-link" href="#" id="nav-analisis"><i class="fas fa-chart-line"></i><span>Analisis Novel</span></a></li></ul></div><div class="control-group"><h3 class="control-group-title">Akun</h3><ul class="nav-list"><li><a class="nav-link" href="#" id="switch-blog-btn"><i class="fas fa-exchange-alt"></i><span>Ganti Blog</span></a></li><li><a class="nav-link" href="#" id="logout-btn"><i class="fas fa-sign-out-alt"></i><span>Logout</span></a></li></ul></div></div>`;
        } else if (state === 'blog-selection') {
            content = `<div class="sidebar-header"><button id="back-to-menu-btn" class="modal-close-btn">&larr;</button><h2 class="sidebar-title">Pilih Blog</h2></div><div class="sidebar-content"><ul class="nav-list" id="sidebar-blog-list"><li>Memuat...</li></ul></div>`;
        }
        dom.sidebar.innerHTML = content;
        attachSidebarEventListeners(state);
    }
    
    function attachSidebarEventListeners(state) {
        if (state === 'guest') {
            document.getElementById('login-btn').onclick = handleLogin;
        } else if (state === 'main') {
            document.getElementById('logout-btn').onclick = handleLogout;
            document.getElementById('close-sidebar-btn').onclick = () => dom.sidebar.classList.remove('is-open');
            document.getElementById('nav-beranda').onclick = (e) => { e.preventDefault(); renderDashboard(); dom.sidebar.classList.remove('is-open'); };
            document.getElementById('nav-analisis').onclick = (e) => { e.preventDefault(); renderAnalysisView(); dom.sidebar.classList.remove('is-open'); };
            document.getElementById('switch-blog-btn').onclick = async () => {
                renderSidebar('blog-selection');
                const listEl = document.getElementById('sidebar-blog-list');
                try {
                    const response = await callBloggerApi(() => gapi.client.blogger.blogs.listByUser({ userId: 'self' }));
                    if(!response) return;
                    const blogs = response.result.items || [];
                    listEl.innerHTML = '';
                    blogs.forEach(blog => {
                        const li = document.createElement('li');
                        li.innerHTML = `<a href="#" class="nav-link">${blog.name}</a>`;
                        li.onclick = async (e) => { e.preventDefault(); dom.sidebar.classList.remove('is-open'); await selectBlog(blog.id); };
                        listEl.appendChild(li);
                    });
                } catch(e) { listEl.innerHTML = '<li>Gagal memuat.</li>'; }
            };
        } else if (state === 'blog-selection') {
            document.getElementById('back-to-menu-btn').onclick = () => renderSidebar('main');
        }
    }

    async function loadGapiClient() {
        await new Promise((resolve, reject) => gapi.load('client', { callback: resolve, onerror: reject }));
        await gapi.client.init({ apiKey: config.gapi.apiKey, discoveryDocs: config.gapi.discoveryDocs });
        appState.isGapiReady = true;
    }
    const getUserDataFromDb = (uid, path = '') => db.ref(`users/${uid}/${path}`).once('value').then(snap => snap.val());
    const toggleLoader = (show) => dom.loader.classList.toggle('hidden', !show);
    const toggleAllViews = (show) => {
        const views = [dom.dashboardView, dom.analysisView, dom.initialBlogSelectionView, dom.dashboardEmptyState];
        views.forEach(view => view.classList.add('hidden'));
    };
    function updateUIForGuest() {
        toggleAllViews(false);
        dom.dashboardEmptyState.classList.remove('hidden');
        dom.blogNameHeader.textContent = "Silakan Login";
    }
    function showErrorState(message) {
        document.body.innerHTML = `<div style="color:red;padding:20px;text-align:center;font-family: var(--font-ui);">${message}</div>`;
        toggleLoader(false);
    }
    
    // --- 8. JALANKAN APLIKASI ---
    initialize();

})();