(() => {
    firebase.initializeApp(config.firebase);
    const auth = firebase.auth();
    const db = firebase.database();
    const dom = {
        loader: document.getElementById('loader'),
        headerBackground: document.getElementById('header-background'),
        title: document.getElementById('chapter-title'),
        info: document.getElementById('chapter-info'),
        addNewBtn: document.getElementById('add-new-chapter-btn'),
        listContainer: document.getElementById('chapter-list-content'),
    };
    
    const pageState = {
        blogId: null,
        label: null,
        isGapiReady: false,
    };
    async function initialize() {
        toggleLoader(true);
        
        const params = new URLSearchParams(window.location.search);
        pageState.blogId = params.get('blogId');
        pageState.label = params.get('label');
        
        if (!pageState.blogId || !pageState.label) {
            showErrorState("Informasi Blog atau Label tidak ditemukan.");
            return;
        }
        
        try {
            await loadGapiClient();
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const token = await getUserTokenFromDb(user.uid);
                    if (token) {
                        gapi.client.setToken({ access_token: token });
                        await loadChapterData();
                    } else {
                        showErrorState("Token tidak ditemukan. Silakan login ulang.");
                    }
                } else {
                    window.location.href = 'main.html';
                }
            });
        } catch (error) {
            showErrorState("Gagal memuat komponen Google.");
        }
    }
    
    async function loadChapterData() {
        dom.title.textContent = decodeURIComponent(pageState.label);
        dom.title.setAttribute('data-title', decodeURIComponent(pageState.label));
        dom.addNewBtn.href = `editor.html?blogId=${pageState.blogId}&label=${pageState.label}`;
        
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.posts.list({
                blogId: pageState.blogId,
                labels: pageState.label,
                fetchBodies: true,
                maxResults: 500,
                status: ['live', 'draft'],
                fetchImages: true, 
            }));
            
            const posts = response.result.items || [];
            dom.info.textContent = `${posts.length} Bab ditemukan`;
            
            const firstPostWithImage = posts.find(p => p.images && p.images.length > 0);
            if (firstPostWithImage) {
                // MODIFIKASI: Mengatur gambar 16:9 di elemen background
                const imageUrl = firstPostWithImage.images[0].url.replace(/\/s\d+(-c)?\//, '/w1280-h720-c/');
                dom.headerBackground.style.backgroundImage = `url(${imageUrl})`;
                
            }
            
            dom.listContainer.innerHTML = '';
            if (posts.length > 0) {
                posts.forEach(post => dom.listContainer.appendChild(createChapterItemElement(post)));
            } else {
                dom.listContainer.innerHTML = '<p style="padding: 1rem; text-align: center;">Belum ada bab.</p>';
            }
        } catch (error) {
            console.error("Gagal memuat bab:", error);
            dom.listContainer.innerHTML = '<p style="padding: 1rem; color: #e53e3e; text-align: center;">Gagal memuat bab.</p>';
        } finally {
            toggleLoader(false);
        }
    }
    function createChapterItemElement(post) {
    const wordCount = post.content ? post.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
    const publishDate = new Date(post.published).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const isDraft = post.status.toLowerCase() === 'draft';
    const statusClass = isDraft ? 'draft' : 'live';
    const statusLabel = isDraft ? 'Draft' : 'Live';
    
    const a = document.createElement('a');
    a.className = 'chapter-item';
    a.href = `editor.html?blogId=${pageState.blogId}&postId=${post.id}&label=${pageState.label}`;
    a.innerHTML = `
        <div class="chapter-item-header">
            <div class="chapter-item-title">${post.title}</div>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        
        <div class="chapter-stats">
            <div class="meta-item views"><span>${post.pageviews || '0'}</span></div>
            <div class="meta-item words"><span>${wordCount}</span></div>
            <div class="meta-item date"><span>${publishDate}</span></div>
        </div>
    `;
    
    return a;
}
    async function loadGapiClient() {
        await new Promise(resolve => gapi.load('client', resolve));
        await gapi.client.init({ apiKey: config.gapi.apiKey, discoveryDocs: config.gapi.discoveryDocs });
        pageState.isGapiReady = true;
    }
    const getUserTokenFromDb = (uid) => db.ref(`users/${uid}/bloggerAccessToken`).once('value').then(snap => snap.val());
    const callBloggerApi = (apiCall) => apiCall();
    const toggleLoader = (show) => dom.loader.classList.toggle('hidden', !show);
    const showErrorState = (message) => {
        document.body.innerHTML = `<div style="color:red;padding:20px;text-align:center;font-family: var(--font-ui);">${message}</div>`;
        toggleLoader(false);
    }
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            document.body.classList.add('is-scrolled');
        } else {
            document.body.classList.remove('is-scrolled');
        }
    });
    
    initialize();
    
})();