document.addEventListener('DOMContentLoaded', () => {
  const novelTitleEl = document.getElementById('novel-title');
  const chapterListContainerEl = document.getElementById('chapter-list-container');
  const addChapterBtnEl = document.getElementById('add-chapter-btn');
  
  const urlParams = new URLSearchParams(window.location.search);
  const novelLabel = urlParams.get('label');
  let currentBlogId = null;
  
  if (!novelLabel) {
    novelTitleEl.textContent = "Label Tidak Ditemukan";
    chapterListContainerEl.innerHTML = '<p class="error-message">URL tidak valid.</p>';
    return;
  }
  
  novelTitleEl.textContent = decodeURIComponent(novelLabel);
  addChapterBtnEl.addEventListener('click', () => {
    window.location.href = `editor-page.html?label=${novelLabel}`;
  });
  
  function renderChapterList(posts) {
    chapterListContainerEl.innerHTML = '';
    if (posts.length === 0) {
      chapterListContainerEl.innerHTML = '<p class="info-message">Belum ada bab di novel ini. Klik "Tambah Bab" untuk memulai.</p>';
      return;
    }
    
    posts.sort((a, b) => new Date(b.published) - new Date(a.published));
    
    posts.forEach(post => {
      const item = document.createElement('div');
      item.className = 'chapter-list-item';
      const publishedDate = new Date(post.published).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      
      item.innerHTML = `
                <div>
                    <h3 class="chapter-title">${post.title} <small>${post.status === 'draft' ? '(Draft)' : ''}</small></h3>
                    <p class="chapter-date">Diterbitkan: ${publishedDate}</p>
                </div>
                <div class="chapter-actions">
                    <button class="edit-btn" data-id="${post.id}" title="Edit Bab"><i class="fas fa-pen"></i></button>
                </div>
            `;
      
      item.querySelector('.edit-btn').addEventListener('click', (e) => {
        const postId = e.currentTarget.dataset.id;
        window.location.href = `editor-page.html?postId=${postId}`;
      });
      
      chapterListContainerEl.appendChild(item);
    });
  }
  
  async function fetchChapters() {
    try {
      const response = await gapi.client.blogger.posts.list({
        blogId: currentBlogId,
        labels: decodeURIComponent(novelLabel),
        maxResults: 500,
        status: ['live', 'draft']
      });
      renderChapterList(response.result.items || []);
    } catch (error) {
      console.error("Gagal memuat bab:", error);
      chapterListContainerEl.innerHTML = '<p class="error-message">Gagal mengambil data bab dari server.</p>';
    }
  }
  
  function main() {
    firebase.initializeApp(config.firebase);
    const auth = firebase.auth();
    
    gapi.load('client', async () => {
      await gapi.client.init({ apiKey: config.apiKey, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/blogger/v3/rest"] });
      
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          const userSnapshot = await firebase.database().ref('users/' + user.uid).once('value');
          const userData = userSnapshot.val();
          if (userData && userData.bloggerAccessToken && userData.selectedBlogId) {
            gapi.client.setToken({ access_token: userData.bloggerAccessToken });
            currentBlogId = userData.selectedBlogId;
            fetchChapters();
          } else {
            window.location.href = 'main.html';
          }
        } else {
          window.location.href = 'main.html';
        }
      });
    });
  }
  
  const config = {
    apiKey: 'AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60',
    firebase: {
      apiKey: "AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60",
      authDomain: "revisipro-6dd30.firebaseapp.com",
      databaseURL: "https://revisipro-6dd30-default-rtdb.asia-southeast1.firebasedatabase.app",
    }
  };
  
  main();
});