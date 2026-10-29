# Konfigurasi Google Sheets Production

Phase 3.3 membaca Google Sheets hanya dari Nitro server. Tidak ada Spreadsheet
ID, nama sheet, range, credential, atau access token yang dikirim dari browser.

## Lokasi Implementasi

- Runtime config private: `nuxt.config.ts` pada `runtimeConfig.googleSheets`.
- Validasi konfigurasi: `server/utils/productionSourceConfig.ts`.
- Provider bearer token: `server/utils/googleSheetsAccessToken.ts`.
- Reader: `server/utils/googleSheetsReader.ts`.
- Endpoint: `GET /api/v1/dashboard/production`.

Nilai runtime diisi melalui environment deployment. Jangan menuliskan nilai
resmi atau secret ke repository, `runtimeConfig.public`, Vue, `public/`, atau
chat.

## KONFIGURASI YANG PERLU DIISI PENGGUNA

| Environment variable | Nilai yang diperlukan | Sumber memperoleh nilai | Sensitif |
| --- | --- | --- | --- |
| `NUXT_GOOGLE_SHEETS_PRODUCTION2025_SPREADSHEET_ID` | ID workbook Production untuk reporting year 2025 | URL spreadsheet resmi setelah `/spreadsheets/d/` dan sebelum `/edit` | Tidak, tetapi tetap server-only |
| `NUXT_GOOGLE_SHEETS_PRODUCTION2025_SHEETS_JSON` | JSON array seluruh tab detail dan range tabel A1 Production 2025 | Hasil audit workbook resmi dan parser Development | Tidak |
| `NUXT_GOOGLE_SHEETS_PRODUCTION2026_SPREADSHEET_ID` | ID workbook Production untuk reporting year 2026 | URL spreadsheet resmi setelah `/spreadsheets/d/` dan sebelum `/edit` | Tidak, tetapi tetap server-only |
| `NUXT_GOOGLE_SHEETS_PRODUCTION2026_SHEETS_JSON` | JSON array seluruh tab detail dan range tabel A1 Production 2026 | Hasil audit workbook resmi dan parser Development | Tidak |
| `NUXT_GOOGLE_SHEETS_ACCESS_TOKEN` | Token bearer statis untuk compatibility test atau deployment yang disetujui | Mekanisme credential organisasi yang disetujui | **Ya, opsional** |

Nama environment mengikuti key private pada `runtimeConfig.googleSheets` di
`nuxt.config.ts`. Bila platform deployment menggunakan konvensi environment
berbeda, mapping tersebut harus dibuat pada platform, bukan di frontend.
Variabel `*_SHEET_NAME` dan `*_RANGE` versi lama sudah tidak dipakai.

## Cara Mengambil Spreadsheet ID

Untuk URL seperti:

```text
https://docs.google.com/spreadsheets/d/1AbCDeFgHIjkLmNop/edit#gid=123
```

Spreadsheet ID adalah:

```text
1AbCDeFgHIjkLmNop
```

Jangan memasukkan URL lengkap, prefix `spreadsheets/d/`, atau suffix `/edit`.
Reader akan menolak nilai yang berbentuk URL/path.

## Cara Menentukan Sheet dan Range

1. Buka workbook Production resmi untuk tahun yang sesuai.
2. Catat seluruh tab detail yang benar-benar dipakai Development, termasuk spasi dan kapitalisasi.
3. Verifikasi header identitas, tahun tanam, luas, populasi, serta dua blok Januari-Desember untuk RKAP dan aktual pada setiap tab.
4. Isi satu objek JSON untuk setiap tab detail dengan `sheetName` dan range tabel A1 tanpa nama sheet. Range satu sel seperti `A1` ditolak karena tidak memuat header dan blok bulan.
5. Jangan masukkan tab summary seperti `PRODUKSI`, `REKAP`, `SUMMARY`, atau `TOTAL` ke daftar detail. Reader tetap mengenali summary bila terlanjur dibaca, tetapi daftar konfigurasi harus hanya berisi sumber detail.

Format JSON wajib berupa array. Contoh placeholder multi-sheet:

```text
NUXT_GOOGLE_SHEETS_PRODUCTION2026_SHEETS_JSON='[{"sheetName":"Prod Per TT Karet","range":"A1:AD600"},{"sheetName":"Prod Per TT Teh","range":"A1:AD600"}]'
```

Pada Windows PowerShell, gunakan satu baris tanpa line break. Di file `.env`,
JSON boleh memakai single quote pembungkus seperti contoh. Jangan menambahkan
`!` atau nama sheet di dalam value `range`; server yang menggabungkannya.

Server mengubah setiap item menjadi A1 range:

```text
'Prod Per TT Karet'!A1:AD600
```

## Lead Measure Karet

Lead Measure Karet memakai workbook 2026 yang sama untuk dua jalur data:

- `NUXT_GOOGLE_SHEETS_LEAD_MEASURE2026_SHEETS_JSON` berisi `Sheet6` dan seluruh
  sheet `EvaProKebun`; jalur ini menjadi sumber observasi bulanan dan detail
  evaluasi.
- `NUXT_GOOGLE_SHEETS_LEAD_MEASURE2026_MASTER_SHEETS_JSON` berisi sheet
  `Master Prod Jan26` sampai `Master Prod Nov26`; jalur ini menjadi satu-satunya
  sumber observasi harian.

Kedua daftar menggunakan objek `{ "sheetName": "...", "range": "A1:..." }`.
Jangan menghapus sheet `Master Prod` yang masih kosong karena sheet tersebut
menandai bulan yang sudah disiapkan dan akan mulai menghasilkan observasi saat
nilai hariannya tersedia. Nilai kosong, formula error, dan hari di luar tanggal
valid kalender tidak dipetakan menjadi observasi sintetis.

Range yang diverifikasi terhadap workbook lokal dan struktur respons Google
live saat Phase 3 adalah:

| Tahun | Sheet | Range tabel |
| --- | --- | --- |
| 2025 | Prod Per TT Karet | `A1:CJ469` |
| 2025 | Prod Per TT Teh | `A1:AP198` |
| 2025 | Prod Per TT Arabika | `A1:AN288` |
| 2025 | Prod Per TT Robusta | `A1:AN276` |
| 2025 | Prod Per TT Edel | `A1:AN89` |
| 2025 | Prod Per TT Bulk | `A1:AN141` |
| 2026 | Prod Per TT Karet | `A1:CW530` |
| 2026 | Prod Per TT Teh | `A1:AP192` |
| 2026 | Prod Per TT Arabika | `A1:AN328` |
| 2026 | Prod Per TT Robusta | `A1:AN403` |
| 2026 | Prod Per TT Edel | `A1:AN89` |
| 2026 | Prod Per TT Bulk | `A1:AN141` |

Header live terdeteksi pada baris 5. Posisi awal RKAP/aktual Karet adalah
`G`/`AS` untuk 2025 dan `G`/`AR` untuk 2026; sheet non-Karet memakai `F`/`AA`.
Range tetap harus diaudit ulang jika pemilik workbook menambah kolom atau baris.

## Autentikasi Google

Provider autentikasi memiliki prioritas berikut:

1. Jika `NUXT_GOOGLE_SHEETS_ACCESS_TOKEN` terisi, token tersebut digunakan untuk
   compatibility mode.
2. Jika token kosong, Nitro menggunakan Google Application Default Credentials
   melalui `google-auth-library`.
3. Jika keduanya gagal, endpoint mengembalikan `SOURCE_AUTH_FAILED` tanpa
   menampilkan detail kredensial.

Scope yang diminta provider ADC adalah:

```text
https://www.googleapis.com/auth/spreadsheets.readonly
```

Reader mengirim bearer token ke Google Sheets API sebagai:

```http
Authorization: Bearer <access-token>
```

### Setup developer lokal dengan ADC

ADC dicari oleh `google-auth-library` melalui resolver resmi Google. Jangan
membaca atau mem-parsing file ADC dari kode aplikasi. Untuk workbook yang
memberi akses kepada service account, setup lokal yang direkomendasikan adalah
ADC dengan impersonasi service account:

```powershell
gcloud auth application-default login --impersonate-service-account=SERVICE_ACCOUNT_EMAIL
```

Ganti `SERVICE_ACCOUNT_EMAIL` dengan service account yang sudah diberi akses
`Viewer` pada workbook. Akun developer harus memiliki izin
`Service Account Token Creator` untuk service account tersebut. Resolver
`google-auth-library` kemudian meminta scope read-only yang didefinisikan
aplikasi:

```text
https://www.googleapis.com/auth/spreadsheets.readonly
```

ADC personal yang dibuat dengan scope default `cloud-platform` dapat ditolak
Google Sheets dengan error `insufficient authentication scopes`, walaupun akun
tersebut adalah pemilik workbook. Scope Sheets melalui default OAuth client
juga dapat diblokir; jangan mengatasi ini dengan menaruh token statis di `.env`.

Perintah tersebut tidak diperlukan setiap kali server dijalankan. Jangan
mencetak access token, refresh token, atau isi file ADC ke terminal, repository,
chat, maupun frontend.

### Production

ADC laptop developer bukan identitas production. Production harus memakai
service identity organisasi yang dikelola platform, misalnya attached service
account atau Workload Identity Federation bila didukung hosting. Identitas
tersebut harus diberi akses `Viewer` hanya pada workbook Production yang
diperlukan.

Target hosting, identitas service, dan autentikasi caller API masih merupakan
keputusan operasional terpisah dan belum dianggap selesai oleh integrasi ADC.

API key tidak memenuhi kontrak reader karena reader menggunakan Authorization
bearer token. Scope read-only juga tidak menggantikan permission workbook;
identitas Google tetap harus diberi izin `Viewer` pada workbook resmi.

## Verifikasi Setelah Konfigurasi

1. Isi dua Spreadsheet ID dan dua daftar `SHEETS_JSON` di environment server.
   Biarkan `NUXT_GOOGLE_SHEETS_ACCESS_TOKEN` kosong jika pengujian memakai ADC.
2. Restart `npm run dev` agar runtime config terbaca.
3. Buka endpoint dengan parameter wajib:

```text
GET /api/v1/dashboard/production?source=google-sheets
```

4. Pastikan response `200` memiliki `apiVersion: "v1"`, `requestId`, records canonical, dan `sourceUpdatedAt: null` bila metadata sumber tidak tersedia.
5. Pilih `Google Sheets` pada Data Source lalu buka dashboard Production.
6. Pastikan dashboard menampilkan status loading lalu data Google; saat gagal, status error terlihat dan tidak ada fallback otomatis ke Development.
7. Uji query invalid, misalnya `bulan=13`; hasil harus `400 INVALID_QUERY` dan tidak memanggil Google.

Jika hasilnya `SOURCE_NOT_CONFIGURED`, konfigurasi server belum lengkap. Jika
`SOURCE_AUTH_FAILED` atau `SOURCE_ACCESS_DENIED`, periksa masa berlaku token,
scope, dan permission Viewer workbook. Jangan menaruh token di URL.
