const firebaseConfig = {
  apiKey: "AIzaSyBvWOW46b0zJ3zmUp4fSUyaw1VnNvxCF60",
  authDomain: "revisipro-6dd30.firebaseapp.com",
  databaseURL: "https://revisipro-6dd30-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "revisipro-6dd30",
  storageBucket: "revisipro-6dd30.firebasestorage.app",
  messagingSenderId: "162356562012",
  appId: "1:162356562012:web:930b28b96619402431be99",
  measurementId: "G-S7Z7C0K69T"
};

// 2. DEKLARASIKAN KONFIGURASI GAPI (Blogger/Google API)
// Blogger API Key biasanya sama dengan Firebase API Key (atau harus dibuat terpisah untuk GAPI)
const gapiConfig = {
  apiKey: firebaseConfig.apiKey, // Menggunakan API Key yang sama untuk GAPI (Penting!)
  clientId: '162356562012-ts06rfqmcajg8v88qop424kqq3cic4c3.apps.googleusercontent.com',
  discoveryDocs: ["https://blogger.googleapis.com/$discovery/rest?version=v3"],
  scope: "https://www.googleapis.com/auth/blogger", // Izin penuh untuk write/read
};


// 3. DEKLARASIKAN OBJEK UTAMA 'config'
const config = {
  // Config Blog & API Key Blogger/Google
  apiKey: gapiConfig.apiKey,
  blogId: '1753829636995064210',
  blogIds: ['6254769183374606696', '1753829636995064210', '3323617570205840546'],
  
  // Konfigurasi GAPI (Digunakan di auth.js untuk load client)
  gapi: gapiConfig,
  
  // Konfigurasi Firebase (Digunakan di auth.js untuk inisialisasi)
  firebase: firebaseConfig,
};