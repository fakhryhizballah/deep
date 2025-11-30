require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const redis = require('redis');
const app = express();
const path = require('path');
const fs = require('fs');
const http = require('http').createServer(app); // Perbaikan: Gunakan http.createServer
const io = require('socket.io')(http); // Perbaikan: Pasang Socket.IO ke server http
const PORT = process.env.PORT || 3000;
const DIR_DATA = process.env.DIR_DATA || path.join(__dirname + '/data/');
const DIR_TEMP = process.env.DIR_TEMP || path.join(__dirname, '/received_frames/');

const { findFace } = require('./controllers/soket')

console.log('Signaling server started on port 3000');

app.use(express.json());
app.use(morgan('dev'));
// Koneksi ke MongoDB
// Ini adalah praktik terbaik untuk mengelola pool koneksi
console.log("MONGO_URI:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Terhubung ke MongoDB!'))
    .catch(err => console.error('Gagal terhubung ke MongoDB:', err));
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from DB');
});

// Koneksi ke Redis
const client = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379
    },
    password: process.env.REDIS_PASSWORD
});
client.connect();
client.on('ready', () => {
    console.log('Redis ready');
});
client.on('connect', () => {
    console.log('Redis connected');
});
client.on('error', (err) => {
    console.log('Redis connection error:', err);
});
app.use((req, res, next) => {
    req.cache = client;
    next();
});

app.use('/view', express.static(path.join(__dirname + '/view'), {

}))
app.use("/resource/", express.static(path.join(__dirname + '/public'), {
    setHeaders: (res, path, stat) => {
        res.set('Cache-Control', 'public, max-age=86400');
    }
}));

app.use("/asset/img/", express.static(path.join(DIR_DATA), {
    setHeaders: (res, path, stat) => {
        res.set('Cache-Control', 'public, max-age=86400');
    }
}));

const routes = require('./routes');
app.use('/api', routes);


const frameDir = DIR_TEMP;
if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir);
}
// Tangani koneksi Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected with ID:', socket.id);

    // Tangani event 'camera-frame'
    socket.on('camera-frame', async (imageBuffer) => {
        console.log('Received camera frame');
        // Data yang diterima dari klien adalah ArrayBuffer, langsung bisa ditulis
        const fileName = `camera_frame_${Date.now()}.jpg`;
        fs.writeFileSync(path.join(frameDir, fileName), imageBuffer);
        socket.emit('frame', imageBuffer);
        let data = await findFace(fileName);
        // console.log(data);

        socket.emit('data_foto', data);
        // setTimeout(() => {
        //     fs.unlinkSync(path.join(frameDir, fileName));
        // }, 2000);


    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});


// app.listen(PORT, () => {
//     console.log('running on port', PORT);
// });
http.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
