require('dotenv').config();
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const Identity = require("../models/Identity")
const mongoose = require('mongoose');

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

async function run() {
    let dataFace = await Faces.find({
        user: { $exists: true }, user: { $ne: null },
        identity: { $exists: false }
    })
    // console.log(dataFace)
    for (let x of dataFace) {
        console.log(x)
        console.log(x.user)
        let findUser = await User.findOne({ _id: x.user })
        console.log(findUser)
        if (findUser) {
            let findIdentit = await Identity.findOne({ 'identifier.value': findUser.nik })
            console.log(findIdentit)
            if (findIdentit) {
                let update = await Faces.updateOne(
                    { _id: x._id },
                    { $set: { identity: findIdentit._id } } // Gunakan $set jika 'identity' bukan array
                );
                console.log("Update Result:", update);
            }
        }
        // return
    }
}
run()