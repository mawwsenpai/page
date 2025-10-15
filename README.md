#  Novel Dashboard for Blogger site

Sebuah aplikasi web modern yang mengubah akun Blogger-mu menjadi platform manajemen novel yang canggih. Tulis, kelola bab, dan analisis performa novelmu dengan antarmuka yang bersih dan intuitif, langsung terhubung dengan Blogger API.

---

## ✨ Fitur Utama

-   **Otentikasi Google**: Login aman dan cepat menggunakan akun Google yang terhubung dengan Blogger.
-   **Manajemen Multi-Blog**: Kelola beberapa blog dari satu dashboard.
-   **Beranda Novel Visual**: Tampilan novel berbasis kartu (card) dengan sampul yang diambil otomatis dari postingan.
-   **Halaman Daftar Bab**: Halaman khusus untuk setiap novel yang menampilkan daftar bab secara terstruktur, lengkap dengan info status (Draft/Live), jumlah kata, dan tanggal.
-   **Editor Teks Canggih**: Editor WYSIWYG (What You See Is What You Get) berbasis Quill.js dengan berbagai alat format, upload gambar/video, dan link.
-   **Panel Pengaturan Terintegrasi**: Semua pengaturan postingan (status, label, info) tersimpan rapi di dalam panel geser yang tidak mengganggu area tulis.
-   **Analisis Novel**: Fitur untuk melihat statistik dasar per novel, seperti total bab, jumlah pengunjung, dan total komentar per bab.
-   **Desain Responsif & Modern**: Tampilan yang optimal di perangkat desktop maupun mobile dengan tema gelap (*glassmorphism*) yang elegan.

---

## 🚀 Teknologi yang Digunakan

-   **Frontend**: HTML5, CSS3, JavaScript (ES6+)
-   **Backend & Database**: Firebase (Authentication & Realtime Database)
-   **API**: Google Blogger API v3 & Google Identity Services
-   **Library**:
    -   [Quill.js](https://quilljs.com/): Untuk Rich Text Editor.
    -   [Font Awesome](https://fontawesome.com/): Untuk ikon.

---

## 🛠️ Instalasi & Konfigurasi

Untuk menjalankan proyek ini di komputermu sendiri (localhost), ikuti langkah-langkah berikut:

### 1. Prasyarat

-   Web server lokal (misalnya, ekstensi **Live Server** di Visual Studio Code).
-   Akun Google dengan setidaknya satu blog di **Blogger.com**.
-   Proyek di **Firebase** dan **Google Cloud Platform**.

### 2. Konfigurasi Kunci API

Ini adalah langkah paling penting. Proyek ini tidak akan berjalan tanpa kunci API yang benar.

Buka file-file JavaScript berikut:
-   `js/main.js`
-   `js/bab.js`
-   `js/editor.js`

Di bagian paling atas setiap file, kamu akan menemukan objek `config`. Ganti semua nilai *placeholder* dengan kredensial dari proyek Firebase dan Google Cloud kamu.
