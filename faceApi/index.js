require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const redis = require('redis');
const app = express();
const path = require('path');

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

app.use("/asset/img/", express.static(path.join(__dirname + '/data/'), {
    setHeaders: (res, path, stat) => {
        res.set('Cache-Control', 'public, max-age=86400');
    }
}));

const routes = require('./routes');
app.use('/api', routes);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('running on port', PORT);
});