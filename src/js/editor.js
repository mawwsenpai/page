(() => {
    if (typeof config === 'undefined' || !config.firebase || !config.gapi) {
        console.error("Objek konfigurasi global (config) tidak ditemukan atau tidak lengkap!");
        document.body.innerHTML = `<div class="error-state">Konfigurasi aplikasi gagal dimuat.</div>`;
        return;
    }

    firebase.initializeApp(config.firebase);
    const auth = firebase.auth();
    const db = firebase.database();


    const pageState = {
        blogId: null,
        postId: null,
        autoLabel: null,
        isGapiReady: false,
        quill: null,
    };


    const dom = {
        loader: document.getElementById('page-loader'),
        backButton: document.getElementById('back-button'),
        titleInput: document.getElementById('post-title-input'),
        settingsToggleBtn: document.getElementById('settings-toggle-btn'),
        settingsPanel: document.getElementById('settings-panel'),
        closeSettingsBtn: document.getElementById('close-settings-btn'),
        saveDraftBtn: document.getElementById('save-draft-btn'),
        publishBtn: document.getElementById('publish-btn'),
        infoStatus: document.getElementById('info-status'),
        infoWordCount: document.getElementById('info-word-count'),
        infoNovelLabel: document.getElementById('info-novel-label'),
        infoLastUpdated: document.getElementById('info-last-updated'),
    };

    async function initialize() {
        toggleLoader(true);
        const params = new URLSearchParams(window.location.search);
        pageState.blogId = params.get('blogId');
        pageState.postId = params.get('postId');
        pageState.autoLabel = params.get('label');

        if (!pageState.blogId || !pageState.autoLabel) {
            showErrorState("Informasi Blog atau Label tidak valid.");
            return;
        }

        dom.backButton.href = `bab.html?blogId=${pageState.blogId}&label=${pageState.autoLabel}`;
        dom.infoNovelLabel.textContent = pageState.autoLabel;

        initQuill();
        setupEventListeners();

        try {
            await loadGapiClient();
            auth.onAuthStateChanged(handleUserAuthentication);
        } catch (error) {
            console.error("Error saat inisialisasi GAPI:", error);
            showErrorState("Gagal memuat komponen Google.");
        }
    }

    async function handleUserAuthentication(user) {
        if (!user) {
            window.location.href = 'main.html';
            return;
        }

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
            showErrorState("Token akses Blogger tidak ditemukan. Silakan login kembali.");
        }
    }

    async function loadPostData() {
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.posts.get({
                blogId: pageState.blogId,
                postId: pageState.postId,
                fetchBody: true,
                view: 'AUTHOR',
            }));

            const post = response.result;
            if (!post) throw new Error("Postingan tidak ditemukan.");

            document.title = `Edit: ${post.title}`;
            dom.titleInput.value = post.title;
            pageState.quill.clipboard.dangerouslyPasteHTML(0, post.content || '');
            pageState.quill.setSelection(0, 0); // Fokus ke awal editor
            updateInfoWidget(post);

        } catch (error) {
            console.error("Gagal memuat post:", error);
            showErrorState("Gagal memuat data postingan dari Blogger.");
        } finally {
            toggleLoader(false);
        }
    }

    async function savePost(publish) {
        toggleLoader(true);
        const title = dom.titleInput.value.trim();
        if (!title) {
            showNotification("Judul tidak boleh kosong!", 'error');
            toggleLoader(false);
            return;
        }

        const rawContent = pageState.quill.root.innerHTML;
        const processedContent = processImagesForBlogger(rawContent);
        const resource = {
            title,
            content: processedContent,
            labels: [pageState.autoLabel].filter(Boolean),
        };

        try {
            let response;
            let actionMessage;

            if (pageState.postId) {
                // Update post yang sudah ada
                response = await callBloggerApi(() => gapi.client.blogger.posts.update({
                    blogId: pageState.blogId,
                    postId: pageState.postId,
                    resource,
                    publish,
                }));
                actionMessage = publish ? 'Postingan berhasil diperbarui!' : 'Draft berhasil diperbarui!';
            } else {
                
                response = await callBloggerApi(() => gapi.client.blogger.posts.insert({
                    blogId: pageState.blogId,
                    resource,
                    isDraft: !publish,
                }));
                pageState.postId = response.result.id;
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('postId', pageState.postId);
                window.history.replaceState({}, '', newUrl);
                actionMessage = publish ? 'Postingan berhasil dipublikasikan!' : 'Postingan berhasil disimpan sebagai draft!';
            }

            updateInfoWidget(response.result);
            const redirectAction = publish ? () => window.location.href = dom.backButton.href : null;
            showNotification(actionMessage, 'success', redirectAction);

        } catch (error) {
            console.error("Gagal menyimpan post:", error);
            showNotification("Gagal menyimpan postingan. Cek konsol!", 'error');
        } finally {
            toggleLoader(false);
            dom.settingsPanel.classList.remove('is-open');
        }
    }


    function initQuill() {
        const toolbarContainer = document.getElementById('quill-toolbar-container');
        if (!toolbarContainer) return;

        toolbarContainer.innerHTML = `
            <div class="custom-toolbar">
                <span class="custom-group">
                    <button class="ql-bold"></button>
                    <button class="ql-italic"></button>
                    <button class="ql-underline"></button>
                </span>
                <span class="custom-group">
                    <button class="ql-header" value="1"></button>
                    <button class="ql-header" value="2"></button>
                    <button class="ql-blockquote"></button>
                </span>
                <span class="custom-group">
                    <select class="ql-color"></select>
                    <select class="ql-background"></select>
                </span>
                <span class="custom-group">
                    <button class="ql-list" value="ordered"></button>
                    <button class="ql-list" value="bullet"></button>
                    <button class="ql-indent" value="-1"></button>
                    <button class="ql-indent" value="+1"></button>
                </span>
                <span class="custom-group">
                    <button class="ql-link"></button>
                    <button class="ql-image"></button>
                </span>
                <span class="custom-group">
                    <button class="ql-clean"></button>
                </span>
            </div>
        `;

        pageState.quill = new Quill('#quill-editor', {
            modules: {
                toolbar: '#quill-toolbar-container .custom-toolbar'
            },
            theme: 'snow',
            placeholder: 'Mulai tulis ceritamu di sini...'
        });

        pageState.quill.on('text-change', () => {
            dom.infoWordCount.textContent = getWordCount();
        });
    }

    function setupEventListeners() {
        dom.settingsToggleBtn.onclick = () => dom.settingsPanel.classList.toggle('is-open');
        dom.closeSettingsBtn.onclick = () => dom.settingsPanel.classList.remove('is-open');
        dom.saveDraftBtn.onclick = () => savePost(false);
        dom.publishBtn.onclick = () => savePost(true);
    }

function processImagesForBlogger(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    const images = container.querySelectorAll('img');
    
    images.forEach(img => {
        if (img.parentElement.classList.contains('blogger-image-wrapper')) {
            return;
        }
        if (img.src.includes('bp.blogspot.com')) {
            const originalUrl = img.src.replace(/\/s\d+(-[a-zA-Z])?\/|\/w\d+-h\d+(-[a-zA-Z])?\//g, '/s0/');
            img.src = originalUrl;
        }
        img.removeAttribute('width');
        img.removeAttribute('height');
        img.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 0; padding: 0; border: none;';
    
        const wrapper = document.createElement('div');
        wrapper.classList.add('blogger-image-wrapper'); 
        wrapper.style.cssText = 'clear: both; text-align: center; margin: 1em auto; padding: 0;';
        
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
    });
    
    return container.innerHTML;
}

    function updateInfoWidget(post = {}) {
        const status = post.status || 'DRAFT';
        const isDraft = status === 'DRAFT';
        
        dom.infoStatus.textContent = isDraft ? 'Draft' : 'Live';
        dom.infoStatus.className = `info-value ${isDraft ? 'draft-status' : 'live-status'}`;
        dom.infoWordCount.textContent = getWordCount();
        dom.infoNovelLabel.textContent = pageState.autoLabel;
        
        if (post.updated) {
            dom.infoLastUpdated.textContent = new Date(post.updated).toLocaleString('id-ID');
        } else {
            dom.infoLastUpdated.textContent = 'Belum disimpan';
        }
    }

    async function callBloggerApi(apiCall, retryCount = 1) {
        if (!pageState.isGapiReady) throw new Error("GAPI client belum siap.");
        try {
            return await apiCall();
        } catch (error) {
            if (error.result?.error?.code === 401 && retryCount > 0) {
                console.warn("Token kedaluwarsa (401). Mencoba refresh token...");
                await refreshToken();
                return await callBloggerApi(apiCall, retryCount - 1);
            }
            throw error;
        }
    }
    
    async function refreshToken() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope(config.gapi.scope);
        provider.setCustomParameters({ prompt: 'consent' });
        try {
            const result = await auth.signInWithPopup(provider);
            const token = result.credential?.accessToken;
            if (!token) throw new Error("Gagal mendapatkan token akses baru.");
            gapi.client.setToken({ access_token: token });
            await db.ref(`users/${result.user.uid}`).update({ bloggerAccessToken: token });
        } catch (error) {
            console.error("Gagal menyegarkan token:", error);
            await auth.signOut();
            window.location.href = 'main.html';
        }
    }
    
    async function loadGapiClient() {
        await new Promise((resolve, reject) => gapi.load('client', { callback: resolve, onerror: reject }));
        await gapi.client.init({
            apiKey: config.gapi.apiKey,
            discoveryDocs: config.gapi.discoveryDocs
        });
        pageState.isGapiReady = true;
    }
    const toggleLoader = (show) => {
        if (dom.loader) dom.loader.style.display = show ? 'flex' : 'none';
    };

    const getWordCount = () => {
        if (!pageState.quill) return 0;
        const text = pageState.quill.getText().trim();
        return text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0;
    };
    const getUserTokenFromDb = (uid) => db.ref(`users/${uid}/bloggerAccessToken`).once('value').then(snap => snap.val());
    
    const showErrorState = (message) => {
        document.body.innerHTML = `<div class="error-state"><strong>ERROR:</strong> ${message}</div>`;
        toggleLoader(false);
    };
    
    function showNotification(message, type = 'success', onOkCallback) {
        document.querySelector('.notification-overlay')?.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'notification-overlay';
        
        const panel = document.createElement('div');
        panel.className = `notification-panel ${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
        
        panel.innerHTML = `
            <i class="fas ${iconClass} icon"></i>
            <span>${message}</span>
            <button class="notification-button">OK</button>
        `;
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        const closeNotification = () => {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
                if (typeof onOkCallback === 'function') onOkCallback();
            }, 300);
        };
        
        panel.querySelector('.notification-button').addEventListener('click', closeNotification);
    }
    
    initialize();

})();