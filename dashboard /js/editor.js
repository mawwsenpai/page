// File: js/editor.js (Versi Lengkap dengan Toolbar di Panel)
(() => {
    // --- 1. KONFIGURASI & INISIALISASI ---
    firebase.initializeApp(config.firebase);
    const auth = firebase.auth();
    const db = firebase.database();

    // --- 2. STATE HALAMAN ---
    const pageState = {
        blogId: null, postId: null, autoLabel: null,
        isGapiReady: false, quill: null,
    };

    // --- 3. ELEMEN DOM ---
    const dom = {
        loader: document.getElementById('page-loader'),
        backButton: document.getElementById('back-button'),
        titleInput: document.getElementById('post-title-input'),
        settingsToggleBtn: document.getElementById('settings-toggle-btn'),
        settingsPanel: document.getElementById('settings-panel'),
        closeSettingsBtn: document.getElementById('close-settings-btn'),
        labelsInput: document.getElementById('labels-input'),
        statusRadios: document.querySelectorAll('input[name="status"]'),
        saveDraftBtn: document.getElementById('save-draft-btn'),
        publishBtn: document.getElementById('publish-btn'),
        infoStatus: document.getElementById('info-status'),
        infoWordCount: document.getElementById('info-word-count'),
        infoNovelLabel: document.getElementById('info-novel-label'),
        infoLastUpdated: document.getElementById('info-last-updated'),
    };

    // --- 4. FUNGSI UTAMA ---

    async function initialize() {
        toggleLoader(true);
        const params = new URLSearchParams(window.location.search);
        pageState.blogId = params.get('blogId');
        pageState.postId = params.get('postId');
        pageState.autoLabel = params.get('label');
        
        if (!pageState.blogId || !pageState.autoLabel) {
            showErrorState("Informasi Blog atau Label tidak ditemukan di URL.");
            return;
        }
        
        dom.backButton.href = `bab.html?blogId=${pageState.blogId}&label=${pageState.autoLabel}`;
        
        initQuill();
        setupEventListeners();

        try {
            await loadGapiClient();
            auth.onAuthStateChanged(handleUserAuthentication);
        } catch (error) {
            showErrorState("Gagal memuat komponen Google.");
        }
    }

    async function handleUserAuthentication(user) {
        if (user) {
            const token = await getUserTokenFromDb(user.uid);
            if (token) {
                gapi.client.setToken({ access_token: token });
                if (pageState.postId) {
                    await loadPostData();
                } else {
                    document.title = "Postingan Baru";
                    updateInfoWidget({ status: 'DRAFT', labels: [pageState.autoLabel], content: '' });
                    toggleLoader(false);
                }
            } else {
                showErrorState("Token tidak ditemukan.");
            }
        } else {
            window.location.href = 'main.html';
        }
    }

    function initQuill() {
        const toolbarContainer = document.getElementById('quill-toolbar-container');
        toolbarContainer.innerHTML = `
            <span class="ql-formats"><select class="ql-header"></select></span>
            <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button><button class="ql-strike"></button></span>
            <span class="ql-formats"><button class="ql-blockquote"></button></span>
            <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
            <span class="ql-formats"><select class="ql-align"></select></span>
            <span class="ql-formats"><button class="ql-link"></button><button class="ql-image"></button><button class="ql-video"></button></span>
            <span class="ql-formats"><button class="ql-clean"></button></span>`;
            
        pageState.quill = new Quill('#quill-editor', {
            modules: { toolbar: '#quill-toolbar-container' },
            theme: 'snow',
            placeholder: 'Mulai tulis ceritamu di sini...'
        });
        
        pageState.quill.on('text-change', () => {
            const wordCount = getWordCount();
            dom.infoWordCount.textContent = wordCount;
        });
    }

    async function loadPostData() {
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.posts.get({
                blogId: pageState.blogId, postId: pageState.postId, fetchBody: true, view: 'AUTHOR',
            }));
            if (!response.result) throw new Error("Postingan tidak ditemukan.");
            
            const post = response.result;
            document.title = `Edit: ${post.title}`;
            dom.titleInput.textContent = post.title;
            pageState.quill.root.innerHTML = post.content || '';
            
            const status = post.status === 'DRAFT' ? 'DRAFT' : 'LIVE';
            document.querySelector(`input[name="status"][value="${status}"]`).checked = true;
            
            updateInfoWidget(post);
            renderLabels(post.labels);

        } catch (error) {
            console.error("Gagal memuat post:", error);
            if (error.status === 404) {
                 showErrorState("Postingan tidak ditemukan. Mungkin telah dihapus.");
            } else {
                 showErrorState("Gagal memuat data postingan.");
            }
        } finally {
            toggleLoader(false);
        }
    }

    // --- 5. FUNGSI EVENT & AKSI ---
    
    function setupEventListeners() {
        dom.settingsToggleBtn.onclick = () => dom.settingsPanel.classList.toggle('is-open');
        dom.closeSettingsBtn.onclick = () => dom.settingsPanel.classList.remove('is-open');
        dom.saveDraftBtn.onclick = () => savePost(false);
        dom.publishBtn.onclick = () => savePost(true);
    }

    function updateInfoWidget(post = {}) {
        const isDraft = post.status === 'DRAFT';
        const wordCount = post.content ? post.content.split(/\s+/).filter(Boolean).length : getWordCount();
        
        dom.infoStatus.textContent = isDraft ? 'Draft' : 'Live';
        dom.infoStatus.className = `info-value ${isDraft ? 'draft' : 'live'}`;
        dom.infoWordCount.textContent = wordCount;
        dom.infoNovelLabel.textContent = pageState.autoLabel;
        
        if(post.updated) {
            dom.infoLastUpdated.textContent = new Date(post.updated).toLocaleString('id-ID');
        } else {
            dom.infoLastUpdated.textContent = 'Belum disimpan';
        }
    }

    async function savePost(publish) {
        toggleLoader(true);
        const title = dom.titleInput.textContent.trim();
        if (!title) {
            alert("Judul tidak boleh kosong!");
            toggleLoader(false);
            return;
        }

        const content = pageState.quill.root.innerHTML;
        const manualLabels = dom.labelsInput.value.split(',').map(l => l.trim()).filter(Boolean);
        const allLabels = [...new Set([pageState.autoLabel, ...manualLabels])];

        const resource = { title, content, labels: allLabels };

        try {
            let response;
            if (pageState.postId) {
                response = await callBloggerApi(() => gapi.client.blogger.posts.update({
                    blogId: pageState.blogId, postId: pageState.postId, resource, publish,
                }));
            } else {
                response = await callBloggerApi(() => gapi.client.blogger.posts.insert({
                    blogId: pageState.blogId, resource, isDraft: !publish,
                }));
                pageState.postId = response.result.id;
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('postId', pageState.postId);
                window.history.replaceState({}, '', newUrl);
            }
            
            updateInfoWidget(response.result); // Update widget info dengan data terbaru
            alert(`Postingan berhasil ${publish ? 'dipublikasikan' : 'disimpan sebagai draft'}!`);

        } catch (error) {
            console.error("Gagal menyimpan post:", error);
            alert("Gagal menyimpan postingan. Lihat konsol untuk detail.");
        } finally {
            toggleLoader(false);
            dom.settingsPanel.classList.remove('is-open');
        }
    }
    
    // --- 6. FUNGSI PEMBANTU ---
    
    async function refreshToken() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope(config.gapi.scope);
        provider.setCustomParameters({ prompt: 'consent' });
        try {
            const result = await auth.signInWithPopup(provider);
            const token = result.credential?.accessToken;
            if (!token) throw new Error("Gagal mendapatkan accessToken baru.");
            gapi.client.setToken({ access_token: token });
            await db.ref(`users/${result.user.uid}`).update({ bloggerAccessToken: token });
            return token;
        } catch (error) {
            console.error("Gagal menyegarkan token:", error);
            await auth.signOut();
            window.location.href = 'main.html';
            throw error;
        }
    }

    async function callBloggerApi(apiCall, retryCount = 1) {
        if (!pageState.isGapiReady) throw new Error("GAPI client belum siap.");
        try {
            return await apiCall();
        } catch (error) {
            if (error.result?.error?.code === 401 && retryCount > 0) {
                console.warn("API call gagal (401). Mencoba refresh token...");
                await refreshToken();
                return await callBloggerApi(apiCall, retryCount - 1);
            }
            throw error;
        }
    }

    function getWordCount() {
        if (!pageState.quill) return 0;
        const text = pageState.quill.getText().trim();
        return text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0;
    }
    
    async function loadGapiClient() {
        await new Promise((resolve, reject) => gapi.load('client', { callback: resolve, onerror: reject }));
        await gapi.client.init({ apiKey: config.gapi.apiKey, discoveryDocs: config.gapi.discoveryDocs });
        pageState.isGapiReady = true;
    }

    const getUserTokenFromDb = (uid) => db.ref(`users/${uid}/bloggerAccessToken`).once('value').then(snap => snap.val());
    
    const toggleLoader = (show) => dom.loader.style.display = show ? 'flex' : 'none';

    const showErrorState = (message) => {
        document.body.innerHTML = `<div style="color:red;padding:20px;text-align:center;font-family: var(--font-ui);">${message}</div>`;
        toggleLoader(false);
    }
    
    function renderLabels(labels = []) {
        const manualLabels = [];
        (labels || []).forEach(label => {
            if (label !== pageState.autoLabel) {
                manualLabels.push(label);
            }
        });
        dom.labelsInput.value = manualLabels.join(', ');
    }
    
    // --- 7. JALANKAN APLIKASI ---
    initialize();

})();