const { spawn } = require('child_process');
const path = require('path');
const ensureDir = require('./utils/ensureDir');
const watcher = require('./watcher');
const cfg = require('./config');

ensureDir(cfg.tmpDir);
ensureDir(cfg.outDir);

// mulai watcher untuk memproses frame yang dihasilkan ffmpeg
watcher(cfg.tmpDir, cfg.outDir);

// build argumen ffmpeg:
// -rtsp_transport tcp : gunakan TCP (lebih stabil/latency lebih tinggi); bisa diubah ke udp
// -i <url> : input RTSP
// -vf fps=<n> : ekstrak n frame per detik
// -q:v 2 : quality JPEG (1 terbaik, 31 terburuk)
// -f image2 <tmpDir>/frame_%06d.jpg : tulis frame ke file pattern
const ffmpegArgs = [
    "-rtsp_transport", "tcp",
    "-i", cfg.rtspUrl,
    "-vf", `fps=${cfg.fps}`,
    "-q:v", "2",
    "-f", "image2",
    path.join(cfg.tmpDir, cfg.imagePattern)
];

console.log("Menjalankan ffmpeg dengan args:", ffmpegArgs.join(' '));

const ff = spawn(cfg.ffmpegPath, ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

ff.stdout.on('data', (d) => {
    // ffmpeg biasanya menulis status ke stderr, stdout jarang dipakai
    console.log('[ffmpeg stdout]', d.toString());
});

ff.stderr.on('data', (d) => {
    // ffmpeg output diagnostic ke stderr
    process.stderr.write(d.toString());
});

ff.on('exit', (code, signal) => {
    console.log(`ffmpeg exited code=${code} signal=${signal}`);
});

// tangani SIGINT/SIGTERM untuk menutup ffmpeg dengan rapi
function shutdown() {
    console.log('Menutup aplikasi, menghentikan ffmpeg...');
    if (!ff.killed) {
        ff.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 1000);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
