/**
 * =================================================================================
 * File: profile.js (Versi Final Stabil)
 * Deskripsi: Mengelola semua logika untuk halaman profil pengguna.
 * Alur Kerja:
 * 1. Inisialisasi Firebase & Google API Client (GAPI).
 * 2. Cek status login pengguna.
 * 3. Tampilkan data profil awal dari Akun Google (untuk UI yang responsif).
 * 4. Cek Firebase RTDB untuk melihat apakah profil Blogger sudah pernah dibuat.
 * - JIKA SUDAH ADA: Ambil data final dari postingan Blogger & perbarui UI.
 * - JIKA BELUM ADA: Jalankan alur setup pengguna baru secara otomatis.
 * 5. Sediakan fungsi untuk mengedit dan menyimpan profil.
 *
 * DEPENDENSI:
 * - config.js (Wajib terisi dengan API Keys & Client ID yang benar)
 * - Firebase SDK & Google API Client (dimuat di profile.html)
 * =================================================================================
 */

// Menjalankan kode setelah seluruh halaman dan API eksternal siap
window.onload = () => {

    // --- 1. INISIALISASI & KONFIGURASI ---
    let firebaseApp, auth, database;
    try {
        // Inisialisasi Firebase dari objek 'config' di file config.js
        firebaseApp = firebase.initializeApp(config.firebase);
        auth = firebase.auth();
        database = firebase.database();
    } catch (e) {
        console.error("Firebase Gagal Inisialisasi:", e);
        alert("FATAL ERROR: Gagal memuat Firebase! Periksa kembali file config.js Anda.");
        return;
    }

    // --- 2. STATE APLIKASI ---
    const appState = {
        currentUser: null,
        userProfilePointer: null, // Berisi { blogId, postId, blogPostUrl } dari Firebase
        gapiTokenClient: null,
        isGapiReady: false,
        currentProfileData: null, // Cache untuk data profil final dari Blogger
    };

    // --- 3. ELEMEN DOM ---
    // Mengambil semua elemen yang dibutuhkan sekali saja untuk performa
    const dom = {
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingText: document.querySelector('#loading-overlay .loading-text'),
        profileView: document.getElementById('user-profile-view'),
        profileMainPanel: document.getElementById('profile-main-panel'),
        profileImg: document.getElementById('profile-img'),
        profileName: document.getElementById('profile-name'),
        profileEmail: document.getElementById('profile-email'),
        profileDesc: document.getElementById('profile-desc'),
        socialLinksView: document.getElementById('social-links-view'),
        editProfileBtn: document.getElementById('edit-profile-btn'),
        logoutBtn: document.getElementById('logout-btn-profile'),
        bloggerConnectContainer: document.getElementById('blogger-connect-container'),
        editModal: document.getElementById('edit-profile-modal'),
        editImgPreview: document.getElementById('profile-edit-img'),
        editPhotoInput: document.getElementById('profile-edit-photo'),
        editName: document.getElementById('profile-edit-name'),
        editDesc: document.getElementById('profile-edit-desc'),
        editSocial: { tiktok: document.getElementById('social-tiktok'), instagram: document.getElementById('social-instagram'), youtube: document.getElementById('social-youtube'), facebook: document.getElementById('social-facebook') },
        saveProfileBtn: document.getElementById('save-profile-btn'),
        modalCloseBtns: document.querySelectorAll('.modal-close-btn'),
        postsSection: document.getElementById('profile-posts-section'),
        postsScroller: document.getElementById('profile-posts-scroller'),
        postsLoading: document.getElementById('profile-posts-loading'),
    };

    // --- 4. FUNGSI UTAMA & ALUR KERJA ---

    // Fungsi inisialisasi utama yang dijalankan pertama kali
    async function initialize() {
        setupEventListeners();
        showLoading("Mempersiapkan aplikasi...");
        try {
            await loadGapiClient();
            auth.onAuthStateChanged(handleAuthStateChange);
        } catch (error) {
            console.error("Gagal inisialisasi GAPI:", error);
            showNotification("Gagal memuat komponen Google. Silakan refresh halaman.", true);
            hideLoading();
        }
    }

    // Menangani perubahan status login (saat login berhasil atau saat logout)
    function handleAuthStateChange(user) {
        if (user) {
            appState.currentUser = user;
            dom.profileEmail.textContent = user.email;
            displayInitialProfile(user); // Tampilkan data awal SEGERA
            checkUserProfileExistence(); // Cek data final di latar belakang
        } else {
            window.location.href = "main.html"; // Jika logout, kembali ke halaman utama
        }
    }

    // Menampilkan data profil awal dari Akun Google untuk UX yang lebih baik
    function displayInitialProfile(user) {
        dom.profileImg.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random`;
        dom.profileName.innerHTML = `${user.displayName || "Pengguna"} <i class="fas fa-spinner fa-spin" style="font-size: 0.8em; color: var(--text-secondary);" title="Menyelaraskan data..."></i>`;
        dom.profileDesc.textContent = "Menyelaraskan dengan data cloud...";
        dom.profileMainPanel.style.display = 'block';
        dom.bloggerConnectContainer.style.display = 'none';
        dom.postsSection.style.display = 'block';
        dom.postsLoading.textContent = "Memuat postingan...";
        hideLoading(); // Sembunyikan loading utama setelah data awal tampil
    }

    // Mengecek apakah pengguna sudah punya profil di Firebase RTDB
    function checkUserProfileExistence() {
        if (!appState.currentUser) return;
        const userProfileRef = database.ref(`profiles/${appState.currentUser.uid}`);
        userProfileRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                appState.userProfilePointer = snapshot.val();
                fetchProfileFromBlogger(appState.userProfilePointer.blogId, appState.userProfilePointer.postId);
                fetchPostsFromBlogger(appState.userProfilePointer.blogId);
            } else {
                handleFirstTimeSetup(); // Pengguna baru, mulai alur otomatis
            }
        }).catch(error => {
            console.error("Gagal cek Firebase RTDB:", error);
            showNotification("Gagal memeriksa data profil.", true);
        });
    }

    // Alur setup otomatis untuk pengguna baru
    async function handleFirstTimeSetup() {
        showLoading("Mempersiapkan profil perdana Anda...");
        try {
            await requestGapiToken(true); // Paksa minta izin pertama kali
            const { blogId, postId, postUrl, defaultData } = await createInitialBloggerProfile();
            const profilePointer = { blogId, postId, blogPostUrl: postUrl };
            await database.ref(`profiles/${appState.currentUser.uid}`).set(profilePointer);
            
            appState.userProfilePointer = profilePointer;
            appState.currentProfileData = defaultData;
            displayFinalProfile(defaultData);
            fetchPostsFromBlogger(blogId);

            hideLoading();
            showNotification("Profil Anda berhasil dibuat secara otomatis!");
        } catch (error) {
            console.error("Setup Gagal:", error);
            showNotification("Gagal membuat profil: " + error.message, true);
            dom.bloggerConnectContainer.style.display = 'block';
            dom.profileMainPanel.style.display = 'none';
            hideLoading();
        }
    }

    // --- 5. FUNGSI INTERAKSI DENGAN BLOGGER API (Bagian Paling Penting) ---

    // Wrapper API cerdas yang menangani token kedaluwarsa (401)
    async function callBloggerApi(apiCall) {
        if (!appState.isGapiReady) throw new Error("Google API Client belum siap.");
        try {
            return await apiCall();
        } catch (error) {
            if (error.result?.error?.code === 401) {
                console.warn("API call gagal (401 Unauthorized). Meminta otorisasi ulang...");
                showNotification("Sesi Google Anda berakhir. Harap berikan izin lagi.");
                await requestGapiToken(true);
                return await apiCall(); // Coba lagi
            }
            if (error.result?.error) {
                 const gError = error.result.error;
                 throw new Error(`Google API Error: ${gError.message} (Code: ${gError.code})`);
            }
            throw error;
        }
    }

    // Fungsi untuk meminta otorisasi (dengan Promise)
    function requestGapiToken(forcePrompt = false) {
        return new Promise((resolve, reject) => {
            if (!forcePrompt && gapi.client.getToken()) return resolve();
            appState.gapiTokenClient.callback = (tokenResponse) => {
                if (tokenResponse.error) reject(new Error("Otorisasi Gagal: " + (tokenResponse.error_description || tokenResponse.error)));
                else resolve();
            };
            appState.gapiTokenClient.requestAccessToken(forcePrompt ? { prompt: 'consent' } : { hint: appState.currentUser.email });
        });
    }

    // Membuat postingan profil awal secara otomatis
    async function createInitialBloggerProfile() {
        showLoading("Mencari blog Anda...");
        const blogsResponse = await callBloggerApi(() => gapi.client.blogger.blogs.listByUser({ userId: 'self' }));
        if (!blogsResponse.result.items?.length) throw new Error("Anda tidak memiliki blog. Silakan buat satu di Blogger.com terlebih dahulu.");
        
        const blog = blogsResponse.result.items[0];
        const blogId = blog.id;

        showLoading("Membuat postingan profil di Blogger...");
        const defaultData = {
            name: appState.currentUser.displayName || "Pengguna Baru",
            photo: appState.currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(appState.currentUser.displayName || 'U')}`,
            desc: "Selamat datang di profil saya! Edit deskripsi ini untuk memperkenalkan diri Anda.",
            socials: { tiktok: "", instagram: "", youtube: "", facebook: "" }
        };
        const newPostResource = { title: appState.currentUser.uid, content: JSON.stringify(defaultData), labels: ["RevisiPro-Profile"] };
        const createResponse = await callBloggerApi(() => gpi.client.blogger.posts.insert({ blogId, resource: newPostResource, isDraft: false }));
        if (!createResponse.result?.id) throw new Error("Gagal membuat postingan profil di Blogger.");
        
        return { blogId, postId: createResponse.result.id, postUrl: createResponse.result.url, defaultData };
    }
    
    // Mengambil data profil final dari postingan Blogger
    async function fetchProfileFromBlogger(blogId, postId) {
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.posts.get({ blogId, postId }));
            if (!response?.result?.content) throw new Error("Konten postingan profil kosong atau tidak dapat diakses.");
            const profileData = JSON.parse(response.result.content);
            appState.currentProfileData = profileData;
            displayFinalProfile(profileData);
        } catch (e) {
            console.error("Gagal mengambil profil final:", e);
            showNotification(`Gagal memuat data profil final: ${e.message}`, true);
            dom.profileName.innerHTML += ` <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);" title="Gagal memuat data final: ${e.message}"></i>`;
        } finally {
            hideLoading();
        }
    }

    // --- 6. FUNGSI TAMPILAN & EDIT UI ---

    // Menampilkan data final ke UI, menggantikan data awal
    function displayFinalProfile(data) {
        dom.profileImg.src = data.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'U')}`;
        dom.profileName.innerHTML = `${data.name || "Pengguna"} <span class="verified-badge-check" title="Profil Terhubung ke Blogger"></span>`;
        dom.profileDesc.textContent = data.desc || "Belum ada deskripsi.";
        dom.socialLinksView.innerHTML = '';
        const { socials } = data;
        if (socials) {
            if (socials.tiktok) dom.socialLinksView.innerHTML += `<a href="https://tiktok.com/@${socials.tiktok}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
            if (socials.instagram) dom.socialLinksView.innerHTML += `<a href="https://instagram.com/${socials.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
            if (socials.youtube) dom.socialLinksView.innerHTML += `<a href="https://youtube.com/${socials.youtube}" target="_blank" title="YouTube"><i class="fab fa-youtube"></i></a>`;
            if (socials.facebook) dom.socialLinksView.innerHTML += `<a href="https://facebook.com/${socials.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>`;
        }
    }

    // Membuka modal edit dengan data terbaru
    async function openEditModal() {
        showLoading("Mempersiapkan editor...");
        try {
            let dataToEdit = appState.currentProfileData;
            if (!dataToEdit) {
                if (!appState.userProfilePointer) throw new Error("Profil belum terhubung.");
                const { blogId, postId } = appState.userProfilePointer;
                const response = await callBloggerApi(() => gapi.client.blogger.posts.get({ blogId, postId }));
                dataToEdit = JSON.parse(response.result.content);
                appState.currentProfileData = dataToEdit;
            }
            dom.editImgPreview.src = dataToEdit.photo || "";
            dom.editName.value = dataToEdit.name || '';
            dom.editDesc.value = dataToEdit.desc || '';
            Object.keys(dom.editSocial).forEach(key => { dom.editSocial[key].value = dataToEdit.socials?.[key] || ''; });
            dom.editModal.classList.add('is-open');
        } catch (error) {
            showNotification(`Gagal memuat data untuk diedit: ${error.message}`, true);
        } finally {
            hideLoading();
        }
    }

    // Menyimpan perubahan profil
    async function saveProfileChanges() {
        showLoading("Menyimpan profil...");
        const { blogId, postId } = appState.userProfilePointer;
        if (!blogId || !postId) { hideLoading(); showNotification("Profil tidak terhubung.", true); return; }
        try {
            const file = dom.editPhotoInput.files[0];
            let photoDataUrl = dom.editImgPreview.src;
            if (file) {
                showLoading("Memproses gambar...");
                photoDataUrl = await resizeAndEncodeImage(file);
            }
            const newProfileData = {
                name: dom.editName.value.trim() || "Pengguna", desc: dom.editDesc.value.trim(), photo: photoDataUrl,
                socials: Object.fromEntries(Object.keys(dom.editSocial).map(key => [key, dom.editSocial[key].value.trim()]))
            };
            showLoading("Memperbarui postingan Blogger...");
            await callBloggerApi(() => gapi.client.blogger.posts.patch({ blogId, postId, resource: { content: JSON.stringify(newProfileData) } }));
            
            appState.currentProfileData = newProfileData;
            showNotification("Profil berhasil diperbarui!");
            dom.editModal.classList.remove('is-open');
            displayFinalProfile(newProfileData);
        } catch (e) { console.error("Gagal menyimpan profil:", e); showNotification("Gagal menyimpan: " + e.message, true); } finally { hideLoading(); }
    }


    // --- 7. FUNGSI PEMBANTU LAINNYA ---
    
    // Menyiapkan semua event listener
    function setupEventListeners() {
        dom.logoutBtn.addEventListener('click', () => auth.signOut());
        dom.editProfileBtn.addEventListener('click', openEditModal);
        dom.saveProfileBtn.addEventListener('click', saveProfileChanges);
        dom.modalCloseBtns.forEach(btn => btn.addEventListener('click', () => btn.closest('.modal').classList.remove('is-open')));
        dom.editPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { dom.editImgPreview.src = event.target.result; }; reader.readAsDataURL(file); }
        });
    }

    // Memuat GAPI Client
    async function loadGapiClient() {
        await new Promise((resolve, reject) => gapi.load('client', { callback: resolve, onerror: reject }));
        await gapi.client.init({ apiKey: config.gapi.apiKey, discoveryDocs: config.gapi.discoveryDocs });
        appState.isGapiReady = true;
    }

    // Helper untuk mengubah ukuran & encode gambar ke Base64
    function resizeAndEncodeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
        return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); let { width, height } = img; if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } } canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', quality)); }; img.onerror = reject; img.src = e.target.result; }; reader.onerror = reject; reader.readAsDataURL(file); });
    }

    // Mengambil daftar postingan untuk ditampilkan di profil
    async function fetchPostsFromBlogger(blogId) {
        if (!blogId) return;
        dom.postsLoading.textContent = "Memuat postingan..."; dom.postsLoading.style.display = 'block';
        try {
            const response = await callBloggerApi(() => gapi.client.blogger.posts.list({ blogId, fetchImages: true, maxResults: 10 }));
            dom.postsScroller.innerHTML = ''; let postCount = 0;
            if (response.result.items?.length > 0) {
                response.result.items.forEach(post => {
                    if (post.title === appState.currentUser.uid) return; postCount++;
                    let coverImg = "https://placehold.co/150x210/2d3748/94a3b8?text=No+Cover";
                    if (post.images?.length > 0) coverImg = post.images[0].url;
                    const tags = (post.labels || []).join(', ');
                    const cardHTML = `<a href="${post.url}" target="_blank" class="novel-card"><div class="novel-card-cover"><img src="${coverImg}" alt="Cover"/></div><div class="novel-card-info"><h4 class="novel-card-title">${post.title}</h4><div class="novel-card-tags">${tags || 'Tanpa Kategori'}</div></div></a>`;
                    dom.postsScroller.innerHTML += cardHTML;
                });
            }
            if(postCount === 0) { dom.postsLoading.textContent = "Belum ada postingan lain di blog ini."; dom.postsLoading.style.display = 'block'; } 
            else { dom.postsLoading.style.display = 'none'; }
        } catch (e) { console.error("Gagal load posts:", e); dom.postsLoading.textContent = "Gagal memuat postingan."; dom.postsLoading.style.display = 'block'; }
    }
    
    // --- 8. JALANKAN APLIKASI ---
    initialize();

}; // Akhir dari window.onload

