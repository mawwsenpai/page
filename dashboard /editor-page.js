document.addEventListener('DOMContentLoaded', () => {
  const editorView = document.getElementById('editor-view');
  const loaderView = document.getElementById('loader-view');
  const titleInput = document.getElementById('chapter-title-input');
  const contentTextarea = document.getElementById('chapter-editor-textarea');
  const saveBtn = document.getElementById('save-chapter-btn');
  const backBtn = document.getElementById('back-btn');
  
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('postId');
  const novelLabel = urlParams.get('label');
  
  let currentBlogId = null;
  let isEditMode = !!postId;
  
  backBtn.addEventListener('click', () => {
    const returnLabel = isEditMode ? sessionStorage.getItem('editPostReturnLabel') : novelLabel;
    if (returnLabel) {
      window.location.href = `bab-page.html?label=${returnLabel}`;
    } else {
      window.location.href = 'main.html';
    }
  });
  
  saveBtn.addEventListener('click', handleSave);
  
  async function handleSave() {
    const title = titleInput.value.trim();
    const content = contentTextarea.value;
    
    if (!title) {
      alert("Judul bab tidak boleh kosong!");
      return;
    }
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    
    try {
      const finalLabel = isEditMode ? sessionStorage.getItem('editPostReturnLabel') : novelLabel;
      const resource = { title, content, labels: [decodeURIComponent(finalLabel)] };
      let savedPost;
      
      if (isEditMode) {
        savedPost = await gapi.client.blogger.posts.update({
          blogId: currentBlogId,
          postId: postId,
          resource: resource
        });
      } else {
        savedPost = await gapi.client.blogger.posts.insert({
          blogId: currentBlogId,
          isDraft: false,
          resource: resource
        });
      }
      window.location.href = `bab-page.html?label=${finalLabel}`;
    } catch (error) {
      console.error("Gagal menyimpan bab:", error);
      alert("Gagal menyimpan bab. Cek konsol untuk detail.");
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
    }
  }
  
  async function loadPostForEdit() {
    try {
      const response = await gapi.client.blogger.posts.get({
        blogId: currentBlogId,
        postId: postId,
        fetchBody: true
      });
      const post = response.result;
      titleInput.value = post.title;
      contentTextarea.value = post.content || '';
      if (post.labels && post.labels.length > 0) {
        sessionStorage.setItem('editPostReturnLabel', encodeURIComponent(post.labels[0]));
      }
    } catch (error) {
      console.error("Gagal memuat post:", error);
      alert("Gagal memuat data post untuk diedit.");
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
            if (isEditMode) {
              await loadPostForEdit();
            }
            loaderView.classList.add('hidden');
            editorView.classList.remove('hidden');
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