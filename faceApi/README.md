# 🏥 SatuSehat SDMK Scraper

Aplikasi Node.js untuk scraping data tenaga kesehatan dari portal SatuSehat (Sistem Informasi Kesehatan) dan menyimpan foto profil dengan nomor STR sebagai nama file.

## ✨ Fitur

- ✅ Scrape data profil tenaga kesehatan (nama, kompetensi, status SKP, dll)
- ✅ Download dan simpan foto profil dengan `noSTR` sebagai filename
- ✅ Extract data SIP (Surat Izin Praktik)
- ✅ Simpan hasil scraping dalam format JSON
- ✅ Batch scraping untuk multiple noSTR
- ✅ Error handling yang robust
- ✅ Format output yang rapi dan terstruktur

## 📋 Struktur File

```
faceApi/
├── scraper.js           # Main scraper untuk single URL
├── batch-scraper.js     # Batch processor untuk multiple IDs
├── debug.js             # Debug script untuk inspect HTML structure
├── images/              # Folder penyimpanan foto
├── output/              # Folder penyimpanan JSON data
└── nakes_list.txt       # Template file untuk batch scraping
```

## 🚀 Cara Penggunaan

### 1. Single Scraping

Scrape data dari single noSTR atau URL:

```bash
# Dengan noSTR
node scraper.js IH00000634255514

# Dengan URL lengkap
node scraper.js https://satusehat.kemkes.go.id/sdmk/nakes/IH00000634255514
```

**Output:**
- `output/IH00000634255514.json` - File data JSON
- `images/IH00000634255514.jpg` - File foto profil

### 2. Batch Scraping

Scrape multiple noSTR sekaligus:

```bash
# Edit file nakes_list.txt dengan daftar noSTR
nano nakes_list.txt

# Run batch scraper
node batch-scraper.js nakes_list.txt
```

Format `nakes_list.txt`:
```
# Komentar bisa diawali dengan #
IH00000634255514
IH00000761234567
IH00000901234567
```

**Output:**
- `output/batch_results.json` - Summary hasil batch scraping
- `output/*.json` - File data untuk setiap noSTR
- `images/*.jpg` - Foto untuk setiap noSTR

## 📊 Output Format

### File JSON Struktur

```json
{
  "noSTR": "IH00000634255514",
  "validasiSTR": "Tervalidasi",
  "nama": "Sunarsih",
  "jenisKelamin": "Perempuan",
  "kompetensi": "Bidan Vokasi Level 5",
  "statusKecukupanSKP": "Tidak Cukup (per tanggal 10 Februari 2026, 22:44 WIB)",
  "periodePemenuhanSKP": "21 Maret 2022 - 20 Maret 2027",
  "sips": [
    {
      "sipNo": "500.16.7.2/SIPB/060/PDNP-B/2023",
      "tanggalTerbit": "10 April 2023",
      "tanggalBerakhir": "20 Maret 2027",
      "tempatPraktik": "ORGANISASI PROFESI IBI",
      "provinsi": "Kalimantan Barat",
      "kabKota": "Kota Singkawang"
    }
  ],
  "lastUpdated": "10 Februari 2026, 16:30 WIB",
  "fotoPath": "images/IH00000634255514.jpg"
}
```

## 🔧 Dependencies

```json
{
  "axios": "^1.x.x",     // HTTP client
  "cheerio": "^1.x.x"    // HTML parser
}
```

Install dengan:
```bash
npm install axios cheerio
```

## ⚙️ Konfigurasi

Edit `scraper.js` untuk customize:

```javascript
const CONFIG = {
    baseUrl: 'https://satusehat.kemkes.go.id/sdmk/nakes/',
    imagesDir: path.join(__dirname, 'images'),
    outputDir: path.join(__dirname, 'output'),
    dataFile: 'scraped_data.json'
};
```

## 📝 Contoh Output Terminal

```
📋 Memulai scraping: https://satusehat.kemkes.go.id/sdmk/nakes/IH00000634255514

🧑 Data Profil:
   NoSTR: IH00000634255514
   Nama: Sunarsih
   Kompetensi: Bidan Vokasi Level 5

📜 SIP:  1 catatan ditemui

📸 Memproses foto...
  ✓ Foto disimpan: IH00000634255514.jpg

💾 Data disimpan: output/IH00000634255514.json

✅ Scraping selesai!
```

## ⚠️ Catatan Penting

- Halaman SatuSehat menggunakan JavaScript rendering, pastikan server Anda bisa handle dynamic content
- Rate limiting: Hindari terlalu banyak request dalam waktu singkat untuk menghindari IP blocking
- Data sensitif: Pastikan menyimpan data secara aman sesuai regulasi privasi

## 🐛 Troubleshooting

### Foto tidak terekstrak
- Periksa apakah URL masih valid
- Coba dengan URL lain untuk test
- Check network/firewall settings

### Error "Cannot find module"
```bash
npm install axios cheerio  # Install dependencies
node scraper.js [URL]      # Try again
```

### Timeout error
```bash
# Increase timeout di scraper.js
timeout: 20000  // dari 10000 menjadi 20000
```

## 📜 License

MIT

## 👨‍💻 Kontributor

Made with ❤️ for healthcare data management

---

**Last Updated:** 10 Februari 2026
