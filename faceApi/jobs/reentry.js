require('dotenv').config();
const mongoose = require('mongoose');
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const Identity = require("../models/Identity")
const axios = require('axios');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Terhubung ke MongoDB!'))
    .catch(err => console.error('Gagal terhubung ke MongoDB:', err));
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

async function main() {
    let dataUser = await User.find({
        nip: { $ne: null },
        nik: { $ne: null }
    })
    console.log(dataUser.length)
    for (let x of dataUser) {
        console.log(x.nip)
        let ifexist = await Identity.findOne({ 'identifier.value': x.nik })
        if (ifexist) {
            let updateData = await Identity.updateOne(
                { _id: ifexist._id }, // Lebih cepat menggunakan ID hasil findOne
                {
                    $addToSet: {
                        identifier: {
                            system: 'Nomor Induk Pegawai',
                            use: 'official',
                            value: x.nip,
                        }
                    }
                },{
                    upsert: true
                }
            );
            if (updateData.modifiedCount > 0) {
                console.log(`NIK ${x.nik}: NIP ${x.nip} berhasil ditambahkan.`);
            } else {
                console.log(`NIK ${x.nik}: NIP sudah ada atau tidak ada perubahan.`);
            }
            continue
        }
        let data = {
            identifier: [
                {
                    system: 'Nomor Induk Penduduk',
                    use: 'official',
                    value: x.nik,
                },
                {
                    system: 'Nama Lengkap',
                    use: 'official',
                    value: x.name,
                }
            ]
        }
        let simpan = await Identity.create(data)
    }
    // let updateData = await Identity.updateOne(
    //             { 'identifier.value': '6101015311890003' }, // Lebih cepat menggunakan ID hasil findOne
    //             {
    //                 $addToSet: {
    //                     identifier: {
    //                         system: 'Nomor Induk Pegawai',
    //                         use: 'official',
    //                         value: "x",
    //                     }
    //                 }
    //             }
    //         );
    //         console.log(updateData)
    //         if (updateData.modifiedCount > 0) {
    //             console.log(`berhasil ditambahkan.`);
    //         } else {
    //             console.log(`NIP sudah ada atau tidak ada perubahan.`);
    //         }

}
main()