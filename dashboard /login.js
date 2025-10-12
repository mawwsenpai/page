window.onload = () => {
    // --- KONFIGURASI ---
    const CLIENT_ID = 'MASUKKAN_CLIENT_ID_KAMU_DI_SINI'; // !!! GANTI DENGAN CLIENT ID DARI GOOGLE CLOUD !!!

    // Cek jika pengguna sudah login, langsung arahkan ke dashboard
    if (sessionStorage.getItem('blogger_token')) {
        window.location.href = 'main.html';
        return;
    }

    // Inisialisasi Google Identity Services
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse // Fungsi yang dijalankan setelah login berhasil
    });

    // Render tombol login Google
    google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: "filled_blue", size: "large", text: "signin_with", shape: "pill", width: "300" } 
    );

    // Fungsi untuk menangani token dari Google
    function handleCredentialResponse(response) {
        console.log("Login Berhasil, Token diterima.");

        // 'response.credential' adalah JWT, kita butuh access_token untuk Blogger API
        // Jadi kita akan tukarkan
        const token = response.credential;
        
        // Kita gunakan model "Token" untuk mendapatkan access_token
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/blogger',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    console.log("Access Token berhasil didapatkan!");
                    
                    // Simpan "tiket masuk" (access token) di sessionStorage
                    sessionStorage.setItem('blogger_token', tokenResponse.access_token);

                    // Arahkan pengguna ke halaman dashboard utama
                    window.location.href = 'main.html';
                }
            }
        });
        
        client.requestAccessToken();
    }
};