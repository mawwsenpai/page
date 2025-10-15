document.addEventListener('DOMContentLoaded', () => {
    
    firebase.initializeApp(config.firebase);
    const auth = firebase.auth();
    const db = firebase.database();
    
    const views = {
        login: document.getElementById('login-view'),
        blogSelection: document.getElementById('blog-selection-view'),
        dashboard: document.getElementById('dashboard-view'),
    };
    
    const loginBtn = document.getElementById('login-btn');
    const logoutButtons = document.querySelectorAll('.logout-btn');
    const blogListContainer = document.getElementById('blog-list-container');
    const novelListContainer = document.getElementById('novel-list-container');
    const dashboardTitle = document.getElementById('dashboard-title');
    
    let currentBlogId = null;
    let currentUser = null;
    
    function showView(viewName) {
        Object.values(views).forEach(view => {
            if (view) view.classList.add('hidden');
        });
        if (views[viewName]) views[viewName].classList.remove('hidden');
    }
    
    async function handleLogin() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope(config.gapiScope);
        try {
            const result = await auth.signInWithPopup(provider);
            const { user, credential } = result;
            const bloggerToken = credential ? credential.accessToken : null;
            if (!bloggerToken) throw new Error("Gagal mendapatkan accessToken.");
            
            await db.ref('users/' + user.uid).set({
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                bloggerAccessToken: bloggerToken,
            });
        } catch (error) {
            console.error("Gagal login dengan popup:", error);
        }
    }
    
    async function handleLogout() {
        await auth.signOut();
        window.location.reload();
    }
    
    async function renderBlogSelection() {
        showView('blogSelection');
        blogListContainer.innerHTML = `<li class="blog-list-item">Memuat daftar blog...</li>`;
        try {
            const response = await gapi.client.blogger.blogs.listByUser({ userId: 'self' });
            const blogs = response.result.items || [];
            blogListContainer.innerHTML = '';
            if (blogs.length === 0) {
                blogListContainer.innerHTML = '<li class="blog-list-item">Tidak ada blog. Buat dulu di Blogger.com.</li>';
                return;
            }
            blogs.forEach(blog => {
                const li = document.createElement('li');
                li.className = 'blog-list-item';
                li.textContent = blog.name;
                li.addEventListener('click', () => selectBlog(blog));
                blogListContainer.appendChild(li);
            });
        } catch (error) {
            console.error("Gagal memuat daftar blog:", error);
        }
    }
    
    async function selectBlog(blog) {
        currentBlogId = blog.id;
        await db.ref(`users/${currentUser.uid}`).update({ selectedBlogId: blog.id });
        renderDashboard();
    }
    
    async function renderDashboard() {
        if (!currentBlogId) return renderBlogSelection();
        showView('dashboard');
        novelListContainer.innerHTML = '<p class="info-message">Memuat novel...</p>';
        try {
            const blogInfo = await gapi.client.blogger.blogs.get({ blogId: currentBlogId });
            dashboardTitle.textContent = blogInfo.result.name;
            const response = await gapi.client.blogger.posts.list({
                blogId: currentBlogId,
                maxResults: 500,
                fetchImages: true,
                status: ['live', 'draft']
            });
            const posts = response.result.items || [];
            const novelMap = new Map();
            posts.forEach(post => {
                if (post.labels) post.labels.forEach(label => {
                    if (!novelMap.has(label)) novelMap.set(label, post);
                });
            });
            novelListContainer.innerHTML = '';
            novelMap.forEach((post, label) => {
                const imgUrl = (post.images && post.images.length > 0) ? post.images[0].url.replace(/\/s\d+(-c)?\//, '/w200-h300-c/') : `https://via.placeholder.com/200x300/1a2026/94a3b8?text=${encodeURIComponent(label)}`;
                const card = document.createElement('a');
                card.href = `bab-page.html?label=${encodeURIComponent(label)}`;
                card.className = 'novel-card';
                card.innerHTML = `<img src="${imgUrl}" alt="${label}" class="novel-card-cover"><div class="novel-card-title">${label}</div>`;
                novelListContainer.appendChild(card);
            });
            const addCard = document.createElement('div');
            addCard.className = 'add-novel-card';
            addCard.innerHTML = `<i class="fas fa-plus-circle"></i><span>Tambah Novel</span>`;
            addCard.addEventListener('click', handleCreateNewNovel);
            novelListContainer.appendChild(addCard);
        } catch (error) {
            console.error("Gagal memuat data dasbor:", error);
            novelListContainer.innerHTML = '<p class="error-message">Gagal memuat novel.</p>';
        }
    }
    
    async function handleCreateNewNovel() {
        const novelTitle = prompt("Masukkan Judul Novel Baru (ini akan menjadi Kategori/Label):");
        if (!novelTitle || novelTitle.trim() === '') return;
        const trimmedTitle = novelTitle.trim();
        try {
            await gapi.client.blogger.posts.insert({
                blogId: currentBlogId,
                isDraft: false,
                resource: {
                    title: `[Novel] ${trimmedTitle}`,
                    content: `Placeholder untuk novel "${trimmedTitle}".`,
                    labels: [trimmedTitle]
                }
            });
            renderDashboard();
        } catch (error) {
            alert('Gagal membuat novel. Cek konsol.');
        }
    }
    
    function setupEventListeners() {
        loginBtn.addEventListener('click', handleLogin);
        logoutButtons.forEach(btn => btn.addEventListener('click', handleLogout));
    }
    
    function main() {
        setupEventListeners();
        gapi.load('client', () => {
            gapi.client.init({ apiKey: config.apiKey, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/blogger/v3/rest"] })
                .then(() => {
                    auth.onAuthStateChanged(async (user) => {
                        if (user) {
                            currentUser = user;
                            const userSnapshot = await db.ref('users/' + user.uid).once('value');
                            const userData = userSnapshot.val();
                            if (userData && userData.bloggerAccessToken) {
                                gapi.client.setToken({ access_token: userData.bloggerAccessToken });
                                if (userData.selectedBlogId) {
                                    currentBlogId = userData.selectedBlogId;
                                    renderDashboard();
                                } else {
                                    renderBlogSelection();
                                }
                            } else {
                                handleLogout();
                            }
                        } else {
                            currentUser = null;
                            showView('login');
                        }
                    });
                });
        });
    }
    
    main();
});