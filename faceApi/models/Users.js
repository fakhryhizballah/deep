const mongoose = require('mongoose');
const preferencesSchema = new mongoose.Schema({
    name: String,
    nik: String,
    nohp:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NoHp',
        required: false,
    }],
    bio: {
        type: Object,
        default: {}
    }

});
const nohpSchema = new mongoose.Schema({
    nohp: {
        type: String,
        unique: true
    },
});




const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    UrlImage: String,
    preferences: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Preferences',
        required: true
    }
});
const User = mongoose.model('User', userSchema);
const Preferences = mongoose.model('Preferences', preferencesSchema);
const Nohp = mongoose.model('Nohp', nohpSchema);

module.exports = {
    User,
    Preferences,
    Nohp,

};