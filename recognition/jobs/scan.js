require('dotenv').config();
const fs  = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const FormData = require('form-data');
const { DatabaseSync } = require('node:sqlite');
const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');
const datadir = process.env.DIR_DATA || path.join(__dirname + '/data/');

/**
 * Memindai direktori secara rekursif dan menyimpan metadata file ke SQLite.
 * 
 * @param {string} targetDir - Path direktori yang akan dipindai.
 * @param {string} dbPath - Path file database SQLite (default: ':memory:').
 */
function scanDirAndSaveToSQLite(targetDir, dbPath = 'index.db') {
    // 1. Inisialisasi Database menggunakan node:sqlite (Synchronous API)
    const database = new DatabaseSync(targetDir + '/' + dbPath);

    // Buat tabel jika belum ada
    database.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL UNIQUE,
            file_size INTEGER NOT NULL,
            extension TEXT,
            status INTEGER DEFAULT 1,
            scan_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME
        )
    `);

    // Siapkan statement SQL untuk performa insert yang lebih baik
    const insertStmt = database.prepare(`
        INSERT INTO files (file_name, file_path, file_size, extension,created_at)
        VALUES (?, ?, ?, ?, ? )
    `);

    // Fungsi helper rekursif untuk membaca direktori
   async function walkSync(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            // Contoh opsional: Menampilkan jumlah total data di database
            const countResult = database.prepare('SELECT COUNT(*) as total FROM files WHERE status = 1').get();
            console.log(`Total file tercatat di database: ${countResult.total}`);

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    // Jika folder, telusuri lagi secara rekursif
                    // walkSync(fullPath);
                } else if (entry.isFile()) {
                    // Jika file, ambil informasi detailnya
                    const stats = fs.statSync(fullPath);
                    const ext = path.extname(entry.name).toLowerCase();
                    // cek in DB 
                    const result = database.prepare('SELECT * FROM files WHERE file_name = ?').get(entry.name);
                    if (!result) {
                        let created_at = new Date(stats.birthtimeMs).toISOString().slice(0, 19).replace('T', ' ') || new Date().toISOString();
                        console.log(created_at);
                        // Eksekusi insert ke database
                        let x = insertStmt.run(
                            entry.name,
                            fullPath,
                            stats.size,
                            ext,
                            created_at
                        );
                        console.log(x)
                    }
                }
            }
        } catch (error) {
            console.error(error)
            console.error(`Gagal membaca direktori ${currentDir}:`, error.message);
        }
    }

    console.log(`Memulai pemindaian pada direktori: ${targetDir}`);
    const startTime = performance.now();

    // Jalankan transaksi agar proses insert data massal jauh lebih cepat
    database.exec('BEGIN TRANSACTION');
    try {
        walkSync(targetDir);
        database.exec('COMMIT');
        console.log('Pemindaian dan penyimpanan data ke SQLite selesai.');
    } catch (err) {
        database.exec('ROLLBACK');
        console.error('Terjadi kesalahan, transaksi dibatalkan:', err.message);
    }

    const endTime = performance.now();
    console.log(`Waktu eksekusi: ${(endTime - startTime).toFixed(2)} ms`);

    // Contoh opsional: Menampilkan jumlah total data di database
    const countResult = database.prepare('SELECT COUNT(*) as total FROM files').get();
    console.log(`Total file tercatat di database: ${countResult.total}`);

}

// Contoh Penggunaan:
// scanDirAndSaveToSQLite('/Volumes/Fakhry/Backup/deep/data', 'index.db');
// scanDirAndSaveToSQLite('./data/', 'index.db');
/**
 * Fungsi untuk membaca data dari database SQLite
 * @param {string} dbPath - Path ke file .db Anda
 */
async function readSQLite(targetDir ,dbPath = 'index.db') {
    console.log(`Membaca data dari database: ${dbPath}`);
    try {
        fs.accessSync(targetDir + "/" + dbPath);
        console.log('Indeks tersedia.');
    } catch (err) {
        console.error('File Indeks tidak ditemukan.');
    }
    try {
        const absolutePath = path.resolve(targetDir + dbPath);
        console.log(`Membuka database dari: ${absolutePath}`);

        // 1. Buka koneksi database (read-only atau read-write)
        const databasedb = new DatabaseSync(absolutePath);
        const db = new Database(targetDir + dbPath);
        sqliteVec.load(db);
        const vecVersion = db.prepare('SELECT vec_version() AS version').get();
        console.log('sqlite-vec version:', vecVersion.version);
        // 3. Buat Virtual Table untuk Vektor (misal: 4 dimensi dengan Cosine distance)
        db.exec(`
            DROP TABLE IF EXISTS vec_items;
        `);
        db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_items USING vec0(
            document_id integer primary key,
            embedding float[512] distance_metric=cosine
        );
        `);

                // Buat Table biasa untuk Menyimpan Metadata Dokumen
        // db.exec(`
        // CREATE TABLE IF NOT EXISTS documents (
        //     id INTEGER PRIMARY KEY AUTOINCREMENT,
        //     content TEXT,
        //     file_name TEXT UNIQUE
        // );
        // `);
        // const insertDoc = db.prepare('INSERT INTO documents (content, file_name) VALUES (?, ?)');
        const insertVec = db.prepare('INSERT INTO vec_items (document_id, embedding) VALUES (?, ?)');
        const insertDocumentWithVector = db.transaction((id, vectorArray) => {
            // Insert Metadata ke tabel documents
            if (vectorArray.length !== 512) {
                throw new Error(
                    `Expected 512 dimensions, got ${vectorArray.length}`
                );
            }
            // const info = insertDoc.run(content, fileName);
            // sqlite-vec membutuhkan INTEGER untuk rowid
            // const rowid = BigInt(info.lastInsertRowid);
            const rowid = BigInt(id);

            const float32 = new Float32Array(vectorArray);

            const embedding = Buffer.from(
                float32.buffer,
                float32.byteOffset,
                float32.byteLength
            );

            // Insert Vektor ke virtual table vec_items menggunakan rowid yang sama
            if (embedding.byteLength !== 512 * 4) {
                throw new Error(
                    `Invalid embedding size: ${embedding.byteLength}`
                );
            }
            // console.log(rowid, vectorArray);

            let x = insertVec.run(rowid, embedding);
            return x;
        });

        // Contoh 1: Mengambil SEMUA baris data dari tabel (misal: tabel 'files')
        console.log('\n--- Mengambil Semua Data ---');
        const query = `
            SELECT file_name, id FROM files where extension = '.jpg' and status = 1;
        `;

        const statement = databasedb.prepare(query);
        const tables = statement.all();
        for (let data of tables) {
            console.log(targetDir+ data.file_name);
            try {
                fs.accessSync(targetDir + data.file_name);
                console.log('File tersedia.');  
            } catch (err) {
                console.error('File tidak ditemukan.');
                databasedb.prepare('UPDATE files SET status = 0 where file_name = ?').run(data.file_name);
                continue
            }
            let payload = new FormData();
            payload.append('file', fs.createReadStream(targetDir + data.file_name));
          
            try {
                const config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: process.env.HOST_EMBED + '/reembed',
                    headers: {
                        'accept': 'application/json',
                        ...payload.getHeaders() // PENTING: sertakan boundary header dari form-data
                    },
                    data: payload
                };

                const response = await axios.request(config);
                console.log(`Success [${data.file_name}]:`, response.data);
                if (response.data.data[0].confidence === 1) {
                    let y = insertDocumentWithVector(
                        data.id,
                        response.data.data[0].embedding
                    );
                    console.log(y);
                    if (y.changes === 1) {

                        databasedb.prepare('UPDATE files SET status = 2 where id = ?').run(data.id);
                    }
                }
                
                // Function Transaction untuk Insert Dokumen & Vektor sekaligus

            } catch (err) {
                console.error(err);
                console.error(`Gagal mengunggah [${data.file_name}]:`, err.message);
            }  
        }
    } catch (error) {
        console.error(error);
        console.error('Gagal membaca database:', error.message);
    }
}
// readSQLite('./data/','index.db')

async function find(targetDir, dbPath, filename) {

    let payload = new FormData();
    payload.append('file', fs.createReadStream(targetDir + filename));
    // 4. Prepared Statements

    try {
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: process.env.HOST_EMBED + '/reembed',
            headers: {
                'accept': 'application/json',
                ...payload.getHeaders() // PENTING: sertakan boundary header dari form-data
            },
            data: payload
        };

        const response = await axios.request(config);
        console.log(`Success [${filename}]:`, response.data);
        // Function Transaction untuk Insert Dokumen & Vektor sekaligus
            const db = new Database(targetDir + dbPath, {
                safeIntegers: true
            });
            sqliteVec.load(db);
        const queryVector = new Float32Array(response.data.data[0].embedding);

            const results = db.prepare(`
            SELECT
                d.id,
                d.file_name,
                v.distance
            FROM vec_items v
            JOIN files d ON d.id = v.document_id
            WHERE v.embedding MATCH ?
            AND v.k = ?
            ORDER BY v.distance
        `).all(queryVector, 5);

            console.log(results);


    } catch (err) {
        console.error(err);
        console.error(`Gagal mengunggah [${data.file_name}]:`, err.message);
    }

}
find('./data/', 'index.db','039849f1-66f4-4fe6-b0a4-bf2bfe402474-crop0.jpg')

// Penggunaan:
// readfiledir('/Volumes/Fakhry/Backup/deep/data/');
// readSQLite('/Volumes/Fakhry/Backup/deep/data/index.db');
// readDataFromSQLite('/Volumes/Fakhry/Backup/deep/data/index.db');
// readDataFromSQLite('./index.db');
// module.exports = { scanDirAndSaveToSQLite };


