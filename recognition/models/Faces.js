const mongoose = require('mongoose');
const images = require('./Image');

const faceSchema = new mongoose.Schema({
    file: String,
    idface: String,
    images: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        sparse: true
    },
    identifiedBy: {
        type: String
    },
    accuracy: {
        type: Number
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Faces', faceSchema);