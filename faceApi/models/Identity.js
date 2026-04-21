const mongoose = require('mongoose');
const identitySchema = new mongoose.Schema({
    meta: {
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    identifier: {
        value: {
            type: String,
            unique: true,
            sparse: true
        }
    }
}, { strict: false });

identitySchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
    // Memaksa query untuk menambahkan update pada field 'meta.lastUpdated'
    // menggunakan waktu +07:00
    this.set({ 'meta.lastUpdated': Date.now() });
    next();
});
module.exports = mongoose.model('Identity', identitySchema);