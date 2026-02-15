const mongoose = require('mongoose');
const bankSchema = new mongoose.Schema({
    bank_name: {
        type: String,
        unique: true
    },
    slug: {
        type: String
    },
    kode_transfer: {
        type: String,
        unique: true,
        sparse: true
    }
}, { strict: false });
module.exports = mongoose.model('Banks', bankSchema);