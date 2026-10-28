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
| `NUXT_GOOGLE_SHEETS_PRODUCTION2025_SHEETS_JSON` | JSON array seluruh tab detail dan range A1 Production 2025 | Hasil audit workbook resmi dan parser Development | Tidak |
| `NUXT_GOOGLE_SHEETS_PRODUCTION2026_SPREADSHEET_ID` | ID workbook Production untuk reporting year 2026 | URL spreadsheet resmi setelah `/spreadsheets/d/` dan sebelum `/edit` | Tidak, tetapi tetap server-only |
| `NUXT_GOOGLE_SHEETS_PRODUCTION2026_SHEETS_JSON` | JSON array seluruh tab detail dan range A1 Production 2026 | Hasil audit workbook resmi dan parser Development | Tidak |
| `NUXT_GOOGLE_SHEETS_ACCESS_TOKEN` | OAuth 2.0 bearer access token dengan scope Google Sheets read-only | Mekanisme OAuth/identitas organisasi yang disetujui | **Ya** |

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
4. Isi satu objek JSON untuk setiap tab detail dengan `sheetName` dan range A1 tanpa nama sheet.
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

Daftar test-backed untuk workbook 2026 adalah `Prod Per TT Karet`, `Prod Per
TT Teh`, `Prod Per TT Arabika`, `Prod Per TT Robusta`, `Prod Per TT Edel`, dan
`Prod Per TT Bulk`. Sheet summary yang dibuktikan oleh test adalah `PRODUKSI`
dan `REKAP Prod per TT`. Ini adalah baseline dari parser/test lokal, bukan
verifikasi workbook Google live. Fixture Development 2025 hanya membuktikan
keluarga Karet, Teh, Arabika, dan Robusta melalui metadata fixture; daftar
sheet/range live 2025 tetap harus diverifikasi.

## Autentikasi Google

`NUXT_GOOGLE_SHEETS_ACCESS_TOKEN` **bukan API key**. Reader mengirimkannya
sebagai:

```http
Authorization: Bearer <access-token>
```

Access token harus diterbitkan oleh mekanisme yang disetujui organisasi,
misalnya OAuth server-side atau workload identity/service account yang
dikelola deployment. Token memiliki masa berlaku; jangan menempelkan token
jangka pendek ke source code atau meminta pengguna mengirimkannya melalui chat.

Implementasi saat ini sengaja memakai provider token server-injected agar
reader tidak mengarang mekanisme credential. Sebelum production deployment,
owner infrastruktur perlu mengganti pemasokan token ini dengan mekanisme
rotasi/renewal organisasi bila token statis tidak diperbolehkan.

Untuk akses spreadsheet, identitas Google tersebut juga harus diberi izin
Viewer pada workbook resmi. API key saja tidak memenuhi kontrak reader saat
ini karena reader menggunakan Authorization bearer token.

## Verifikasi Setelah Konfigurasi

1. Isi dua Spreadsheet ID, dua daftar `SHEETS_JSON`, dan satu access token di environment server tanpa mengubah kode.
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
