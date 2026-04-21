const mongoose = require('mongoose');

const identitySchema = new mongoose.Schema({
    meta: {
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }
},{ strict: false });

module.exports = mongoose.model('Identity', identitySchema);