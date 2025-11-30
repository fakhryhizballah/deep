module.exports = {
    rtspUrl: "rtsp://username:password@192.168.1.100:554/stream1", // ganti sesuai RTSP anda
    ffmpegPath: "ffmpeg", // jika ffmpeg ada di PATH. Atau berikan path lengkap.
    fps: 1,                // berapa frame per detik yang mau disimpan
    tmpDir: "./frames",
    outDir: "./saved",
    imagePattern: "frame_%06d.jpg" // pola output ffmpeg (temporary)
};
