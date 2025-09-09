const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    name: {
        type: String
    },
    nik: {
        type: String,
        unique: true,
        sparse: true
    }
});
module.exports = mongoose.model('User', userSchema);