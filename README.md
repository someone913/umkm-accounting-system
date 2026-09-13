# Aneka Snack — UMKM Accounting System

Web-based accounting system prototype untuk studi kasus UMKM makanan keluarga di Bantul, Yogyakarta. Aplikasi mengolah transaksi operasional menjadi jurnal, buku besar, neraca saldo, jurnal penyesuaian, dan laporan keuangan dalam satu periode akuntansi.

> **Status:** In Development  
> Data yang digunakan merupakan data simulasi untuk pembelajaran dan portofolio, bukan pembukuan resmi usaha.

## Live Preview

Demo statis tersedia melalui GitHub Pages. Demo memakai data contoh dan menyimpan perubahan hanya selama halaman masih dibuka. Penyimpanan Cloudflare D1 dan ekspor server tersedia pada versi backend.

## Tujuan Proyek

Proyek ini dibuat untuk mempraktikkan siklus akuntansi UMKM sekaligus memahami hubungan antara antarmuka aplikasi, business logic, API, dan database dalam penyusunan laporan keuangan.

## Fitur Utama

- Dashboard ringkasan penjualan, laba bersih, kas, piutang, utang, dan aset
- Pencatatan penjualan, pembelian, kas dan bank
- Master barang dan pencatatan persediaan
- Pembentukan jurnal otomatis dari transaksi rutin
- Buku besar dengan saldo berjalan
- Neraca saldo sebelum dan setelah penyesuaian
- Penyesuaian penyusutan, beban akrual, dan persediaan akhir
- Laporan laba rugi, perubahan modal, dan posisi keuangan
- Pengaturan nama usaha dan periode laporan
- Ekspor laporan ke PDF dan XLSX
- Penyimpanan state aplikasi pada Cloudflare D1

## Alur Akuntansi

```text
Transaksi
   ↓
Jurnal Umum
   ↓
Buku Besar
   ↓
Neraca Saldo
   ↓
Jurnal Penyesuaian
   ↓
Neraca Saldo Disesuaikan
   ↓
Laporan Keuangan
```

## Arsitektur Aplikasi

```text
Frontend (React/Vinext)
        ↓ HTTP Request
API Routes / Business Logic
        ↓ Query
Cloudflare D1 (SQLite)
        ↓ Data
Jurnal, Buku Besar, dan Laporan Keuangan
```

### Frontend

Antarmuka digunakan untuk memasukkan transaksi, memilih periode, menjalankan proses akhir bulan, dan menampilkan laporan. Perhitungan akuntansi pada prototype dijalankan oleh business logic aplikasi berdasarkan data transaksi yang tersimpan.

### Backend dan API

Backend berjalan melalui Cloudflare Worker dan route server:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/state` | Mengambil data akuntansi milik pengguna |
| `PUT` | `/api/state` | Menyimpan atau memperbarui data akuntansi |
| `POST` | `/api/export/xlsx` | Membentuk laporan dalam format XLSX |
| `POST` | `/api/export/pdf` | Membentuk laporan dalam format PDF |

### Database

Cloudflare D1 digunakan sebagai database SQL berbasis SQLite. Pada versi prototype, state akuntansi disimpan per pengguna pada tabel `accounting_states`.

| Kolom | Fungsi |
| --- | --- |
| `user_id` | Identitas sesi browser dan primary key |
| `state_json` | Data profil usaha, periode, transaksi, barang, dan penyesuaian |
| `updated_at` | Waktu pembaruan terakhir |

Skema dan migrasi database tersedia di folder `db/` dan `drizzle/`.

## Tech Stack

- TypeScript
- React dan Vinext
- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Drizzle ORM
- HTML dan CSS

## Struktur Utama

```text
app/                 halaman dan API routes
db/                  koneksi serta skema database
drizzle/             migrasi database
public/app.js         business logic siklus akuntansi
worker/              entry point Cloudflare Worker
tests/                pengujian alur dan perhitungan
```

## Menjalankan Secara Lokal

Persyaratan: Node.js 22 atau lebih baru.

```bash
npm install
npm run dev
```

Database lokal dijalankan melalui binding D1/Miniflare. Versi prototype memakai cookie sesi anonim agar data pada satu browser tidak bercampur dengan browser lain. Sistem login dan otorisasi pengguna belum menjadi bagian dari scope proyek.

## Catatan Pengembangan

Repository ini merupakan versi pengembangan. Prioritas berikutnya adalah menyiapkan public demo yang aman, memperbaiki pemisahan data menjadi tabel transaksi yang lebih terstruktur, dan menambah pengujian laporan keuangan.

## Author

**Ebnu Abdillah Muhyi**  
Accounting student — STIE SBI Yogyakarta  
[LinkedIn](https://www.linkedin.com/in/ebnuabdillah/)
