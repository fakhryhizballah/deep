const fs = require('fs');
const path = require('path');
const ensureDir = require('./utils/ensureDir');

function startWatcher(tmpDir, outDir) {
    ensureDir(tmpDir);
    ensureDir(outDir);

    // gunakan polling interval kecil kalau fs.watch kurang andal di sistem file tertentu
    fs.watch(tmpDir, { persistent: true }, (eventType, filename) => {
        if (!filename) return;
        if (eventType === 'rename') {
            // file baru dibuat atau dihapus
            const tmpPath = path.join(tmpDir, filename);
            fs.stat(tmpPath, (err, stats) => {
                if (err) return; // file mungkin belum ada / dihapus
                if (!stats.isFile()) return;

                // beri nama baru berdasarkan timestamp
                const now = new Date();
                const ts = now.toISOString().replace(/[:.]/g, '-'); // contoh: 2025-11-30T19-05-01-123Z
                const ext = path.extname(filename) || '.jpg';
                const newName = `frame_${ts}${ext}`;
                const newPath = path.join(outDir, newName);

                // pindah (rename)
                fs.rename(tmpPath, newPath, (err) => {
                    if (err) {
                        console.error('Gagal memindahkan file', tmpPath, err);
                    } else {
                        console.log('Saved frame ->', newName);
                    }
                });
            });
        }
    });

    console.log(`Watching ${tmpDir} -> moving frames into ${outDir}`);
}

module.exports = startWatcher;
