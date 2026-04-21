require('dotenv').config();
const mongoose = require('mongoose');
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const Identity = require("../models/Identity")
const axios = require('axios');
const fs = require('fs');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Terhubung ke MongoDB!'))
    .catch(err => console.error('Gagal terhubung ke MongoDB:', err));
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

async function main() {
    // let dataUser = await User.find({
    //     nik: { $ne: null },
    //     kontak: { $ne: null }
    // })
    // console.log(dataUser.length)
    // // console.log(JSON.stringify(dataUser, null, 2))
    // for (let x of dataUser) {
    //     console.log(x.nik)
    //     let ifexist = await Identity.findOne({ 'identifier.value': x.nik })
    //     if (ifexist) {
    //         for (let y of x.kontak.email) {
    //             console.log(y)
    //             let updateData = await Identity.updateOne(
    //                 { _id: ifexist._id }, // Lebih cepat menggunakan ID hasil findOne
    //                 {
    //                     $addToSet: {
    //                         contacts: {
    //                             system: 'Email',
    //                             // use: 'mobile',
    //                             value: y,
    //                         }
    //                     }
    //                 }
    //             );
    //             console.log(updateData)
    //             // return
    //         }
    //         for (let y of x.kontak.no_hp) {
    //             console.log(y)
    //             let updateData = await Identity.updateOne(
    //                 { _id: ifexist._id }, // Lebih cepat menggunakan ID hasil findOne
    //                 {
    //                     $addToSet: {
    //                         contacts: {
    //                             system: 'Phone',
    //                             // use: 'mobile',
    //                             value: y,
    //                         }
    //                     }
    //                 }
    //             );
    //             console.log(updateData)
    //             // return
    //         }
    //         // let updateData = await Identity.updateOne(
    //         //     { _id: ifexist._id }, // Lebih cepat menggunakan ID hasil findOne
    //         //     {
    //         //         $addToSet: {
    //         //             contacts: {
    //         //                 system: 'Email',
    //         //                 use: 'mobile',
    //         //                 value: x.email,
    //         //             }
    //         //         }
    //         //     }
    //         // );
    //         // if (updateData.modifiedCount > 0) {
    //         //     console.log(`NIK ${x.nik}: NIP ${x.nip} berhasil ditambahkan.`);
    //         // } else {
    //         //     console.log(`NIK ${x.nik}: NIP sudah ada atau tidak ada perubahan.`);
    //         // }
    //         // continue
    //     }
    // }
    // for (let x of dataUser) {
    //     console.log(x.nip)
    //     let ifexist = await Identity.findOne({ 'identifier.value': x.nik })
    //     if (ifexist) {
    //         let updateData = await Identity.updateOne(
    //             { _id: ifexist._id }, // Lebih cepat menggunakan ID hasil findOne
    //             {
    //                 $addToSet: {
    //                     identifier: {
    //                         system: 'Nomor Induk Pegawai',
    //                         use: 'official',
    //                         value: x.nip,
    //                     }
    //                 }
    //             }, {
    //             upsert: true
    //         }
    //         );
    //         if (updateData.modifiedCount > 0) {
    //             console.log(`NIK ${x.nik}: NIP ${x.nip} berhasil ditambahkan.`);
    //         } else {
    //             console.log(`NIK ${x.nik}: NIP sudah ada atau tidak ada perubahan.`);
    //         }
    //         continue
    //     }
    //     let data = {
    //         identifier: [
    //             {
    //                 system: 'Nomor Induk Penduduk',
    //                 use: 'official',
    //                 value: x.nik,
    //             },
    //             {
    //                 system: 'Nama Lengkap',
    //                 use: 'official',
    //                 value: x.name,
    //             }
    //         ]
    //     }
    //     let simpan = await Identity.create(data)
    // }

}
// main()

async function preProses() {
    let dataUser = fs.readFileSync('./cache/Users.json', 'utf8')
    dataUser = JSON.parse(dataUser)
    console.log(dataUser.length)
    for (let x of dataUser) {
        console.log(x.nik)
        let ifexist = await Identity.findOne({ 'identifier.value': x.nik })
        if (ifexist) {
            let updateDataEmail = await Identity.updateOne(
                { _id: ifexist._id }, // Lebih cepat menggunakan ID hasil findOne
                {
                    $addToSet: {
                        contacts: {
                            system: 'Email',
                            // use: 'mobile',
                            value: x.email,
                        }
                    }
                }
            );
            console.log(updateDataEmail)
            let updateDataPhone = await Identity.updateOne(
                { _id: ifexist._id }, // Lebih cepat menggunakan ID hasil findOne
                {
                    $addToSet: {
                        contacts: {
                            system: 'Phone',
                            // use: 'mobile',
                            value: x.wa,
                        }
                    }
                }
            );
            console.log(updateDataPhone)
        }
    }

    // let updatedata = await Identity.updateMany(
    //     { "contacts.value": null, "contacts.system": 'Email' },
    //     {
    //         $unset: {
    //             'contacts': 1
    //         }
    //     }
    // )
    console.log("Selesai")

    return
}
preProses()