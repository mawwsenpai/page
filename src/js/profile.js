// js/profile.js - Logic for Profile Check and View (Load profile.html)

const DEFAULT_PHOTO = "https://ui-avatars.com/api/?name=U&background=random";

// Safe DOM utility functions
const showLoading = (text = "Memuat...") => { 
    const loadingText = document.querySelector('#loading-overlay .loading-text');
    if (loadingText) loadingText.textContent = text; 
    document.getElementById('loading-overlay').classList.add('is-open'); 
};
const hideLoading = () => document.getElementById('loading-overlay').classList.remove('is-open');
const showNotification = (msg, isError = false) => {
    console.log(`Notifikasi (${isError ? 'Error' : 'Info'}):`, msg);
    alert(msg);
};

// --- GAPI Token Utility ---
function requestGapiToken(gapiTokenClient) {
    return new Promise((resolve, reject) => {
        const token = gapi.client.getToken();
        if (token && token.access_token && (!token.expires_at || (token.expires_at > Date.now() + 60000))) {
            resolve();
            return;
        }
        
        gapiTokenClient.callback = (tokenResponse) => {
            if (tokenResponse.error) {
                reject(new Error("Otorisasi GAPI gagal."));
            } else {
                resolve();
            }
        };
        gapiTokenClient.requestAccessToken(); 
    });
}


async function initializeApp() {
    showLoading("Mengecek status profil...");
    
    // --- Inisialisasi Firebase ---
    let firebaseApp, auth, database;
    try {
        firebaseApp = firebase.initializeApp(config.firebase);
        auth = firebase.auth();
        database = firebase.database();
    } catch (e) {
        console.error("Firebase Gagal Inisialisasi:", e);
        showNotification("Gagal inisialisasi Firebase! Cek konfigurasi.", true);
        hideLoading();
        return;
    }

    // --- Inisialisasi GAPI ---
    let gapiTokenClient = null;
    await new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({ apiKey: config.gapi.apiKey, discoveryDocs: config.gapi.discoveryDocs });
                gapiTokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: config.gapi.clientId,
                    scope: config.gapi.scope,
                    callback: () => {}, 
                });
                resolve();
            } catch (error) {
                console.error("Gagal inisialisasi GAPI:", error);
                reject(new Error("Gagal inisialisasi Google API Client."));
            }
        });
    }).catch(e => { showNotification(e.message, true); hideLoading(); return; });


    // --- Auth Listener ---
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "main.html"; // Redirect ke halaman login
            return;
        }

        const userProfileRef = database.ref(`profiles/${user.uid}`);
        
        // Cek Keberadaan Profil di Firebase RTDB
        userProfileRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                // Profil ADA, Lanjutkan memuat UI profile.html
                loadProfileFunctions(user, database, gapiTokenClient, snapshot.val());
                
            } else {
                // Profil BELUM ADA, arahkan ke halaman setup
                window.location.href = "handle-createprofile.html"; 
            }
        });
    });
}

// Logika kompleks dimuat di sini untuk halaman profile.html
async function loadProfileFunctions(currentUser, database, gapiTokenClient, profilePointer) {
    const el = {
        profileImg: document.getElementById('profile-img'),
        profileName: document.getElementById('profile-name'),
        profileEmail: document.getElementById('profile-email'),
        profileDesc: document.getElementById('profile-desc'),
        socialLinksView: document.getElementById('social-links-view'),
        editProfileBtn: document.getElementById('edit-profile-btn'),
        logoutBtn: document.getElementById('logout-btn-profile'),
        editModal: document.getElementById('edit-profile-modal'),
        postsScroller: document.getElementById('profile-posts-scroller'),
        postsLoading: document.getElementById('profile-posts-loading'),
        blogLabelsContainer: document.getElementById('blog-labels-container'), 
        statPosts: document.getElementById('stat-posts'),
        tabButtons: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
    };

    let currentProfileData = null;
    let userProfileRef = database.ref(`profiles/${currentUser.uid}`);
    
    // --- Tab Switching Logic ---
    function handleTabClick(e) {
        const tabName = e.currentTarget.dataset.tab;
        el.tabButtons.forEach(btn => btn.classList.remove('active'));
        el.tabContents.forEach(content => content.style.display = 'none');
        e.currentTarget.classList.add('active');
        document.getElementById(`tab-content-${tabName}`).style.display = 'block';
    }
    el.tabButtons.forEach(btn => btn.addEventListener('click', handleTabClick));

    // Ambil Data Profil & Postingan
    async function fetchProfileAndPosts(blogId, postId) {
        showLoading("Memuat data profil...");
        try {
            await requestGapiToken(gapiTokenClient); 
            const response = await gapi.client.blogger.posts.get({ blogId, postId });
            if(response.result.url) { await userProfileRef.update({ postUrl: response.result.url }); }
            currentProfileData = JSON.parse(response.result.content); 
            displayProfile(currentProfileData);
            await Promise.all([ fetchPostsFromBlogger(blogId), fetchAllLabelsFromBlog(blogId) ]);
        } catch (e) {
            console.error("Gagal mengambil profil/postingan:", e);
            showNotification("Gagal memuat profil/postingan. Coba Edit Profil untuk otorisasi ulang.", true);
        } finally { hideLoading(); }
    }
    
    function displayProfile(data) {
        el.profileImg.src = data.photo || DEFAULT_PHOTO;
        el.profileName.innerHTML = `${data.name || "Pengguna"} <span class="verified-badge-check" title="Profil Terhubung ke Blogger"></span>`;
        el.profileDesc.textContent = data.desc || "Belum ada deskripsi.";
        el.profileEmail.textContent = data.email || currentUser.email;
        el.statPosts.textContent = '...'; 
        
        let infoHtml = ''; 
        infoHtml += `<p class="profile-info-item"><strong>ID Profile (UID):</strong> <code>${data.firebaseUid || 'N/A'}</code></p>`;
        
        const { socials } = data;
        if (socials && Object.values(socials).some(link => link)) {
            infoHtml += `<div class="social-icons-wrapper">`;
            if (socials.tiktok) infoHtml += `<a href="https://tiktok.com/@${socials.tiktok}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
            if (socials.instagram) infoHtml += `<a href="https://instagram.com/${socials.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
            if (socials.youtube) infoHtml += `<a href="https://youtube.com/${socials.youtube}" target="_blank" title="YouTube"><i class="fab fa-youtube"></i></a>`;
            if (socials.facebook) infoHtml += `<a href="https://facebook.com/${socials.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>`;
            infoHtml += `</div>`;
        }
        el.socialLinksView.innerHTML = infoHtml;
    }
    
    async function fetchPostsFromBlogger(blogId) { 
        if (!blogId) return;
        el.postsLoading.textContent = "Memuat postingan..."; 
        el.postsScroller.innerHTML = '';
        el.statPosts.textContent = '0'; 
        try {
            await requestGapiToken(gapiTokenClient); 
            const response = await gapi.client.blogger.posts.list({ blogId, fetchImages: true, maxResults: 50, fetchBodies: false });
            let postCount = 0;
            if (response.result.items && response.result.items.length > 0) {
                response.result.items.forEach(post => {
                    if (post.title === currentUser.uid && post.labels && post.labels.includes("RevisiPro-Profile")) return; 
                    postCount++;
                    let coverImg = post.images && post.images.length > 0 ? post.images[0].url : "https://placehold.co/300x300/1f2937/9ca3af?text=No+Preview";
                    const cardHTML = `<a href="${post.url}" target="_blank" class="novel-card"><div class="novel-card-cover"><img src="${coverImg}" alt="Cover"/></div></a>`;
                    el.postsScroller.innerHTML += cardHTML;
                });
            } 
            el.statPosts.textContent = postCount; 
            if(postCount === 0) { el.postsLoading.style.display = 'block'; el.postsLoading.textContent = "Belum ada postingan lain di blog ini."; } else { el.postsLoading.style.display = 'grid'; }
        } catch (e) { el.postsLoading.textContent = "Gagal memuat postingan."; el.postsLoading.style.display = 'block'; el.statPosts.textContent = 'Error'; }
    }
    
    async function fetchAllLabelsFromBlog(blogId) {
        if (!blogId || !el.blogLabelsContainer) return;
        el.blogLabelsContainer.innerHTML = `<p class="loading-message">Memuat label...</p>`;
        try {
            await requestGapiToken(gapiTokenClient); 
            const response = await gapi.client.blogger.posts.list({ blogId: blogId, maxResults: 50, fetchLabels: true });
            const allLabels = new Set();
            if (response.result.items) {
                response.result.items.forEach(post => {
                    if (post.labels) { post.labels.forEach(label => allLabels.add(label)); }
                });
            }
            const uniqueLabels = Array.from(allLabels).filter(label => label !== 'RevisiPro-Profile');
            let listHTML = `<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">`;
            if (uniqueLabels.length > 0) {
                uniqueLabels.forEach(label => { listHTML += `<span class="tag-chip">${label}</span>`; });
            } else { listHTML += `<p class="loading-message">Belum ada label/tag yang terdeteksi.</p>`; }
            listHTML += `</div>`;
            el.blogLabelsContainer.innerHTML = listHTML;
        } catch (e) { el.blogLabelsContainer.innerHTML = `<p class="loading-message" style="color: var(--danger-color);">Gagal memuat label.</p>`; }
    }

    // --- Logika Edit Profile & Logout ---
    el.logoutBtn.addEventListener('click', () => auth.signOut());
    
    // Mulai memuat data profil
    fetchProfileAndPosts(profilePointer.blogId, profilePointer.postId);
}


document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(error => {
        console.error("Kesalahan Fatal Saat Memulai Aplikasi:", error);
        alert(`Aplikasi Gagal Memuat: ${error.message}`);
        hideLoading();
    });
});
