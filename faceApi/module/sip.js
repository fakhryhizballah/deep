const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const DIR_DATA = process.env.DIR_DATA || path.join(__dirname + '/data/');

// Configuration
const CONFIG = {
    baseUrl: 'https://satusehat.kemkes.go.id/sdmk/nakes/',
    imagesDir: DIR_DATA,
    outputDir: path.join(__dirname, 'output'),
    dataFile: 'scraped_data.json'
};

// Ensure directories exist
[CONFIG.imagesDir, CONFIG.outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

/**
 * Helper function untuk extract nilai dari text menggunakan regex
 */
function extractValue(text, pattern) {
    const regex = new RegExp(pattern, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

/**
 * Fungsi untuk menyimpan gambar Base64 ke file lokal
 */
async function saveBase64Image(base64String, filename) {
    try {
        if (!base64String || !filename) {
            throw new Error('base64String dan filename harus disediakan');
        }

        // Buang header "data:image/...;base64," jika ada
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");

        if (!base64Data) {
            throw new Error('Base64 string kosong setelah menghapus header');
        }

        // Convert base64 ke Buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Simpan ke folder images
        const filePath = path.join(CONFIG.imagesDir, filename);

        await fs.promises.writeFile(filePath, buffer);
        console.log(`  ✓ Foto disimpan: ${filename}`);
        return filePath;
    } catch (error) {
        console.error(`  ✗ Error menyimpan foto: ${error.message}`);
        return null;
    }
}

/**
 * Fungsi utama untuk scrape data dari SatuSehat
 */
async function scrapeSatuSehat(noSTR) {
    console.log(`\n📋 Memulai scraping: ${noSTR}\n`);

    try {
        // Fetch halaman
        const { data } = await axios.get(CONFIG.baseUrl + noSTR, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8'
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        const pageText = $.text();

        // Extract gambar profile - cari yang paling awal atau dengan selector spesifik
        let imgSrc = null;
        
        // Try berbagai cara untuk find image
        $('img').each((i, elem) => {
            const src = $(elem).attr('src') || '';
            if (src.startsWith('data:image') && !imgSrc) {
                imgSrc = src;
                return false; // break
            }
        });
        
        // Fallback: cek atribut src atau data-src
        if (!imgSrc) {
            const imgElem = $('img[src*="data:"], img[data-src*="data:"]').first();
            imgSrc = imgElem.attr('src') || imgElem.attr('data-src');
        }

        // Extract data profil
        const nakesData = {
            noSTR: extractValue(pageText, 'No\\.\\s*STR\\s*:(.*?)(?=Tervalidasi|Nama)') || 'Tidak ditemui',
            validasiSTR: pageText.includes('Tervalidasi') ? 'Tervalidasi' : 'Tidak Tervalidasi',
            nama: extractValue(pageText, 'Nama\\s*:(.*?)(?=Jenis kelamin)') || 'Tidak ditemui',
            jenisKelamin: extractValue(pageText, 'Jenis kelamin\\s*:(.*?)(?=Kompetensi)') || 'Tidak ditemui',
            kompetensi: extractValue(pageText, 'Kompetensi\\s*:(.*?)(?=Status kecukupan)') || 'Tidak ditemui',
            statusKecukupanSKP: extractValue(pageText, 'Status kecukupan SKP\\s*:(.*?)(?=Periode pemenuhan)') || 'Tidak ditemui',
            periodePemenuhanSKP: extractValue(pageText, 'Periode pemenuhan SKP\\s*:(.*?)(?=No\\.\\s*SIP|$)') || 'Tidak ditemui',
            sips: [],
            lastUpdated: $('strong').last().text(),  // Ambil teks dari elemen pertama
            fotoPath: null
        };

        // Display basic info
        console.log('🧑 Data Profil:');
        console.log(`   NoSTR: ${nakesData.noSTR}`);
        console.log(`   Nama: ${nakesData.nama}`);
        console.log(`   Kompetensi: ${nakesData.kompetensi}`);

            const sipResults = [];

            // Strategy 1: Desktop rows
            $('div.flex.bg-white.text-sm.p-4.items-center.border-b').each((i, el) => {
                const cols = $(el).find('div');
                const sipNo = $(cols[0]).text().trim();
                if (!sipNo) return;
                const tanggalTerbit = $(cols[1]).text().trim() || 'Tidak ditemui';
                const tanggalBerakhir = $(cols[2]).text().trim() || 'Tidak ditemui';
                const tempatPraktik = $(cols[3]).text().trim() || 'Tidak ditemui';
                const provinsi = $(cols[4]).text().trim() || 'Tidak ditemui';
                const kabKota = $(cols[5]).text().trim() || 'Tidak ditemi';
                sipResults.push({ sipNo, tanggalTerbit, tanggalBerakhir, tempatPraktik, provinsi, kabKota });
            });

            // Strategy 2: Mobile/stacked cards
            if (sipResults.length === 0) {
                $('div.border-t.mt-4.pt-4.flex-col .rounded-xl.border').each((i, el) => {
                    const sipNo = $(el).find('span:contains("No. SIP")').next().text().trim();
                    if (!sipNo) return;
                    const tanggalTerbit = $(el).find('span:contains("Tanggal terbit")').next().text().trim() || 'Tidak ditemui';
                    const tanggalBerakhir = $(el).find('span:contains("Tanggal berakhir")').next().text().trim() || 'Tidak ditemui';
                    const tempatPraktikText = $(el).find('span:contains("Tempat praktik")').next().text().trim() || 'Tidak ditemui';
                    // Split location if comma separated
                    const locationParts = tempatPraktikText.split(',').map(p => p.trim());
                    sipResults.push({
                        sipNo,
                        tanggalTerbit,
                        tanggalBerakhir,
                        tempatPraktik: locationParts[0] || 'Tidak ditemui',
                        provinsi: locationParts[1] || 'Tidak ditemui',
                        kabKota: locationParts[2] || 'Tidak ditemi'
                    });
                });
            }

            // Strategy 3: Text fallback (use section between 'No. SIP' and 'Sumber data')
            if (sipResults.length === 0) {
                const sipStart = pageText.indexOf('No. SIP');
                const sipEnd = pageText.indexOf('Sumber data', sipStart >= 0 ? sipStart : 0) || pageText.length;
                if (sipStart >= 0) {
                    const sipSection = pageText.substring(sipStart, sipEnd);
                    // Rows often contain SIP number followed by dates and location; split by repeating SIP numbers
                    const sipNumbers = sipSection.match(/\d+\.\d+\.\d+\.\d+\/[A-Z]+\/[\dA-Z\-]+\/\d+/g) || [];
                    const unique = [...new Set(sipNumbers)];
                    unique.forEach((sipNo) => {
                        // find the sipNo occurrence and capture following tokens
                        const idx = sipSection.indexOf(sipNo);
                        if (idx === -1) return;
                        const tail = sipSection.substring(idx + sipNo.length, idx + sipNo.length + 400);
                        // try to extract two dates (e.g., "10 April 2023") and then location text
                        const dates = tail.match(/(\d{1,2}\s+\w+\s+\d{4})/g) || [];
                        const tanggalTerbit = dates[0] ? dates[0].trim() : 'Tidak ditemui';
                        const tanggalBerakhir = dates[1] ? dates[1].trim() : 'Tidak ditemui';
                        // location is remainder after dates
                        const afterDates = tail.replace(dates[0] || '', '').replace(dates[1] || '', '').trim();
                        // attempt to split by double spaces or commas
                        const locParts = afterDates.split(/\s{2,}|,\s*/).map(p => p.trim()).filter(Boolean);
                        const tempatPraktik = locParts[0] || 'Tidak ditemui';
                        const provinsi = locParts[1] || 'Tidak ditemui';
                        const kabKota = locParts[2] || 'Tidak ditemi';
                        sipResults.push({ sipNo: sipNo.trim(), tanggalTerbit, tanggalBerakhir, tempatPraktik, provinsi, kabKota });
                    });
                }
            }

            // Deduplicate and assign
            const seen = new Set();
            nakesData.sips = sipResults.filter(s => {
                const k = `${s.sipNo}::${s.tempatPraktik}`;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            });

            console.log(`\n📜 SIP:  ${nakesData.sips.length} catatan ditemui`);

        // Save gambar jika ditemui
        if (imgSrc && imgSrc.startsWith('data:image')) {
            const noSTR = nakesData.noSTR
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9_-]/g, '');
            
            console.log(`\n📸 Memproses foto...`);
            const fotoPath = await saveBase64Image(imgSrc, `${noSTR}.jpg`);
            nakesData.fotoPath = fotoPath ? path.relative(__dirname, fotoPath) : null;
        } else {
            console.log(`\n📸 Foto: Tidak ditemui`);
        }

        // Save data ke JSON
        const outputPath = path.join(CONFIG.outputDir, `${nakesData.noSTR.replace(/\s+/g, '_')}.json`);
        await fs.promises.writeFile(outputPath, JSON.stringify(nakesData, null, 2));
        console.log(`\n💾 Data disimpan: ${path.relative(__dirname, outputPath)}`);

        console.log('\n✅ Scraping selesai!\n');
        return nakesData;

    } catch (error) {
        if (error.response) {
            console.error(`\n❌ Error HTTP ${error.response.status}: ${error.response.statusText}`);
        } else if (error.code === 'ECONNABORTED') {
            console.error(`\n❌ Timeout - server tidak merespons`);
        } else {
            console.error(`\n❌ Error: ${error.message}`);
        }
        return null;
    }
}
module.exports = { scrapeSatuSehat };