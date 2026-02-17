require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const Banks = require("../models/Banks")
const axios = require('axios');

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
async function getUsser(params) {
    
    let dataUser = await User.findOne({ nik : params.nik })
    let findFace = await Faces.find({ user: dataUser._id }).populate('images')
    if (findFace.length > 0) {
        let updateUser = await User.findByIdAndUpdate(dataUser._id, {
            $set: {
                face: [
                    {
                        jumlah_face: findFace.length,
                        faceID: findFace[0]._id,
                        soruce: findFace[0].images.url
                    }
                ]
            }
        });
    }

    mongoose.disconnect();
    console.log('Mongoose disconnected');
    return dataUser
}
// getUsser({ nik: '3303052508870004'})

async function updateUserFace() {
    let dataUsers = await User.find()
    for (let x of dataUsers) {
        let findFace = await Faces.find({ user: x._id }).populate('images')
        let soruce = findFace.map(y => y.images.url)
        if (findFace.length > 0) {
            let updateUser = await User.findByIdAndUpdate(x._id, {
                $set: {
                    face: [
                        {
                            jumlah_face: findFace.length,
                            faceID: findFace[0]._id,
                            soruce: soruce
                        }
                    ]
                }
            });
        }
    }
    console.log(dataUsers)
}
// updateUserFace()

async function updateNIP() {
    let dataUsers = fs.readFileSync('cache/Users.json');
    dataUsers = JSON.parse(dataUsers)
    // dataUsers = dataUsers.filter(x => x.nip === '')
    // findOneAndUpdate
    for (let x of dataUsers) {
        console.log(x)
        try {
            let updateUser = await User.findOneAndUpdate(
                { nik: x.nik },
                {
                    // 1. Gunakan $set untuk field biasa (bukan array)
                    $set: {
                        nip: x.nip,
                        // status_kerja: x.status,
                        tgl_lahir: new Date(x.tgl_lahir.split('/').reverse().join('-')), // Cara lebih singkat membalik tgl
                        jenis_kelamin: x.jenis_kelamin,
                    },
                    // 2. Gunakan $addToSet di level utama untuk field array
                    $addToSet: {
                        "kontak.email": x.email,
                        "kontak.no_hp": x.wa,
                        'instansi': 'RSUD DR ABDUL AZIZ SINGKAWANG'
                    },
                },
                { new: true } // Mengembalikan data terbaru setelah update
            );
            console.log(updateUser);
        } catch (error) {
            console.log(error)

            let updateUser = await User.findOneAndUpdate(
                    { nik: x.nik },
                    {
                        // 1. Gunakan $set untuk field biasa (bukan array)
                        $unset: {
                            instansi: '',
                        }
                    },
                    { new: true } // Mengembalikan data terbaru setelah update
                );
             await User.findOneAndUpdate(
                { nik: x.nik },
                {
                    // 1. Gunakan $set untuk field biasa (bukan array)
                    $set: {
                        nip: x.nip,
                        // status_kerja: x.status,
                        tgl_lahir: new Date(x.tgl_lahir.split('/').reverse().join('-')), // Cara lebih singkat membalik tgl
                        jenis_kelamin: x.jenis_kelamin,
                    },
                    // 2. Gunakan $addToSet di level utama untuk field array
                    $addToSet: {
                        "kontak.email": x.email,
                        "kontak.no_hp": x.wa,
                        'instansi': 'RSUD DR ABDUL AZIZ SINGKAWANG'
                    },
                },
                { new: true } // Mengembalikan data terbaru setelah update
            );
 
        }
        
    }
    mongoose.disconnect();
    console.log('Mongoose disconnected');
}
// updateNIP()
async function  addNewUser() {
    // 1. Ambil data dari file dan paksa jadi String + Trim spasi
    const rawData = JSON.parse(fs.readFileSync('cache/dataRSU_Full.json', 'utf8'));

    for (let x of rawData) {
        console.log(x)
        // console.log(x['Nama Lengkap'])
        let isextis = await User.findOne({ nik: x.NIK })
        console.log(isextis)
        if (!isextis) {
            console.log(x.NIK)
            let createUser = await User.create({
                username: x.NIK,
                name: x['Nama Lengkap'],
                nik: x.NIK,
                instansi: ['RSU SAADAH SINGKAWANG'],
                kontak: {
                    email: [x.Email],          // array
                    no_hp: [x['No. HP']],      // array
                    alamat: [x['Alamat']],     // array
                }
            });
            console.log(createUser)
        } else {
            let updateUser = await User.findOneAndUpdate(
                { nik: x.NIK },
                {
                    $addToSet: {
                        "instansi": "RSU SAADAH SINGKAWANG",
                        "kontak.email": x.Email,
                        "kontak.no_hp": x['No. HP'],
                        "kontak.alamat": x.Alamat
                    }
                },
                { new: true } // Mengembalikan data terbaru setelah update
            );
        }
    }

    mongoose.disconnect();
    console.log('Mongoose disconnected');
}
addNewUser()
async function adduserNik(params) {
    let dataUsers = fs.readFileSync('cache/11. GAJI P3K NOPEMBER 2025_Full.json');
    dataUsers = JSON.parse(dataUsers)
    // console.log(dataUsers)
    for (let x of dataUsers.sheet1) {
        if (x.nik_pegawai === '') {
            
        }
        let dataUser = await User.findOne({ nik: x.nik_pegawai })
        console.log(dataUser)
        
    }
    mongoose.disconnect();
    console.log('Mongoose disconnected');
}
// adduserNik()
async function pull(){
    let dataPehawai = fs.readFileSync('cache/11. GAJI PNS NOPEMBER 2025_NIK.json');
    dataPehawai = JSON.parse(dataPehawai)
    console.log(dataPehawai.length)
    let dataUsers = await User.find()
    console.log(dataUsers.length)

    let filteredDataPehawai = dataPehawai.filter(x => !dataUsers.some(y => y.nik === x.nik_pegawai))
    for (let x of filteredDataPehawai) {
        console.log(x)
        let dataUser = await User.create({
            username: x.nik_pegawai,
            name: x.nama_pegawai,
            nik: x.nik_pegawai,
            nip: x.nip_pegawai,
            tgl_lahir: new Date(x.tanggal_lahir_pegawai.split('-').reverse().join('-')),
            status_kerja: "PNS"
        })
        console.log(dataUser)
        // return
    }
    // mongoose.disconnect();
    
}
// pull()

async function nipDuplikat(params) {
    let users = await User.aggregate([
        {
            // 1. Kelompokkan berdasarkan field yang ingin dicek duplikatnya
            $group: {
                _id: "$nip",           // Field target
                count: { $sum: 1 },    // Hitung jumlah kemunculannya
                docs: { $push: "$_id" } // Simpan semua ID dokumen yang memiliki NIK tersebut
            }
        },
        {
            // 2. Filter hanya yang jumlahnya (count) lebih dari 1
            $match: {
                count: { $gt: 1 }
            }
        },
        {
            // 3. Opsional: Rapikan output
            $project: {
                _id: 0,
                nikDuplikat: "$_id",
                jumlah: "$count",
                idDokumen: "$docs"
            }
        }
    ])
    let nipDuplikat = users.map(x => x.nikDuplikat)
    console.log(nipDuplikat)
}
// nipDuplikat()

async function updateInstatsi() {
    let dataPehawai = fs.readFileSync('cache/11. GAJI P3K NOPEMBER 2025_Full.json');
    dataPehawai = JSON.parse(dataPehawai)
    for (let x of dataPehawai.Sheet1) {
        let dataUser = await User.findOneAndUpdate(
            { nip: x.nip_pegawai },
            {
                $set: { status_kerja: "PPPK" },
                $addToSet: { instansi: x.skpd }
            },
            { new: true } // Mengembalikan data terbaru setelah update
        )
        console.log(dataUser)
    }
    mongoose.disconnect();

}
// updateInstatsi()