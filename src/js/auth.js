// =========================================================================
// auth.js - Autentikasi Firebase dan GAPI
// File ini HARUS dimuat sebelum profile.js
// =========================================================================

// Asumsi: config didefinisikan di config.js dan mencakup firebase, gapi
if (typeof config === 'undefined' || !config.firebase || !config.gapi) {
  console.error("Konfigurasi (config.js) tidak ditemukan atau tidak lengkap.");
}

firebase.initializeApp(config.firebase);
const auth = firebase.auth();
const db = firebase.database();

const authState = {
  currentUser: null,
  isGapiLoaded: false,
  bloggerAccessToken: null
};

// Fungsi GAPI Loader
async function loadGapiClient() {
  return new Promise((resolve, reject) => {
    gapi.load('client', {
      callback: async () => {
        try {
          await gapi.client.init({
            apiKey: config.gapi.apiKey,
            discoveryDocs: config.gapi.discoveryDocs
          });
          authState.isGapiLoaded = true;
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      onerror: reject
    });
  });
}

// Fungsi untuk mendapatkan Token Blogger baru (melalui login pop-up)
async function getNewBloggerToken() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope(config.gapi.scope);
  provider.setCustomParameters({ prompt: 'consent' });
  
  const result = await auth.signInWithPopup(provider);
  const user = result.user;
  const token = result.credential?.accessToken;
  
  if (!token) throw new Error("Gagal mendapatkan accessToken baru.");
  
  // Simpan token di DB dan state
  await db.ref(`users/${user.uid}`).update({
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    bloggerAccessToken: token
  });
  
  gapi.client.setToken({ access_token: token });
  authState.bloggerAccessToken = token;
  return user;
}

// Fungsi untuk memuat token dari DB dan refresh GAPI
async function loadAndRefreshToken(user) {
  const tokenFromDb = await db.ref(`users/${user.uid}/bloggerAccessToken`).once('value').then(snap => snap.val());
  
  if (tokenFromDb) {
    gapi.client.setToken({ access_token: tokenFromDb });
    authState.bloggerAccessToken = tokenFromDb;
    return true;
  }
  return false;
}

// Wrapper untuk call Blogger API dengan logic retry 401
async function callBloggerApi(apiCall, isAuthRequired = true) {
  if (!authState.isGapiLoaded) throw new Error("GAPI client belum siap.");
  
  try {
    return await apiCall();
  } catch (error) {
    if (isAuthRequired && error.result?.error?.code === 401) {
      console.warn("API call gagal (401). Mencoba mendapatkan token baru...");
      await getNewBloggerToken(); // Paksa login ulang untuk token baru
      // Coba panggil lagi setelah mendapatkan token baru
      return await apiCall();
    }
    throw error;
  }
}