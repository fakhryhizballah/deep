require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const mongoose = require('mongoose');
const { exiftool } = require("exiftool-vendored");
const HostApi = process.env.HOST_API || 'http://localhost:8000'
const Host = process.env.HOST || 'http://localhost:3000'
const DIR_DATA = process.env.DIR_DATA || path.join(__dirname + '/data/');
const { scrapeSatuSehat } = require('./../module/sip');

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
async function writeExif(filePath) {
    await exiftool.write("./images/CR00000408890904.jpg", {
        Artist: "Fakhry",
        Keywords: ["NIK", "Sela"],
        "ImageDescription": JSON.stringify(["A", "B", "C"]),
        "XMP:Title": "closeup",
    }, ["-overwrite_original"]);

    // await exiftool.end();
    let data = await exiftool.read(filePath, {

    })
    console.log(data)
    await exiftool.end();
}
// writeExif('./images/CR00000408890904.jpg')


//single
async function howis(filedir) {
    let file = fs.readFileSync(filedir, 'base64');
    // console.log(file)
    let body = {
        base64: file
    }
    let response = await axios.post(HostApi + '/api/face/findID/base64', body)
    if (response.data.data == false) {
        return res.status(201).json({
            status: false,
            message: 'wajah tidak ditemukan',
        });
    }
    console.log(response.data.data.docs)
    let hasil = response.data.data.docs[0]
    console.log(hasil)
    let kecocokan = 1 - (hasil.vector_score)
    let status = ""
    if (kecocokan >= 0.9) {
        status = "Cocok";
        if (kecocokan == 1) {
            status = "Identik";
        }
    } else if (kecocokan >= 0.75) {
        status = "Mirip";
    } else {
        status = "Tidak Cocok";
    }
    let findUser = await Faces.findOne({ idface: hasil.id }).populate('user')
    console.log(status)
    console.log(findUser)
}
// howis('./images/CR00000408890904.jpg')
async function addIndexBase64(filedir, filename) {
    let file = fs.readFileSync(filedir, 'base64');
    let body = {
        base64: file,
        filename: filename
    }
    let response = await axios.post(HostApi + '/api/face/index/base64', body)
    if (response.data.data == false) {
        return res.status(201).json({
            status: false,
            message: 'wajah tidak ditemukan',
        });
    }
    return response.data

}
// addIndexBase64('./images/CR00000408890904.jpg', 'CR00000408890904.jpg')



async function siapaAja(filedir) {
    // let metacek = await exiftool.read(filedir, {

    // })
    // console.log(metacek)
    let file = fs.readFileSync(filedir, 'base64');
    let body = {
        base64: file
    }
    let response = await axios.post(HostApi + '/api/face/findIDs/base64', body)
    console.log(response.data)
    if (response.data.data == null) {
        return ({
            status: false,
            message: 'wajah tidak ditemukan',
        });
    }
    console.log("Jumlah wajah", response.data.data.length)
    let subject = []
    for (let x of response.data.data) {
        // x = x.docs[0]
        let index = 0;
        console.log(x)
        let kecocokan = 1 - (x.search_result.docs[0].vector_score)
        let status = ""
        if (kecocokan >= 0.85) {
            status = "Cocok";
            if (kecocokan == 1) {
                status = "Identik";
            }
            index = 1
        } else if (kecocokan >= 0.55) {
            status = "Mirip";
            index = 1
        } else {
            status = "Tidak Cocok";
        }
        if (index == 1) {
            let findUser = await Faces.findOne({ idface: x.search_result.docs[0].id }).populate('user')
            console.log(status, kecocokan)
            console.log(findUser)
            subject.push(findUser.user.name)
        }
    }
    let meta = await exiftool.write(filedir, {
        'XMP:Subject': subject,
    }, ["-overwrite_original"]);
    console.log(meta)
    return meta
}
// siapaAja('./images/6172011110950001.jpg')

async function ihs(nik, filedir, filename) {
    let findUser = await User.findOne({ nik: nik })
    console.log(findUser)
    let addIndex = await addIndexBase64(filedir, filename)
    console.log(nik, filedir, filename)
    console.log(addIndex)
    if (addIndex.data) {
        try {
            const saveImage = await Image.create({
                url: filename
            })
            console.log(saveImage)
            const saveFace = await Faces.create({
                user: findUser._id,
                file: filename,
                images: saveImage._id,
                idface: "face:" + filename
            })
            console.log(saveFace)
            return true
        } catch (error) {
            console.log(error)
        }

    }
    return false
}
// ihs('6171035002940002', './images/LR00000963549624.jpg', 'LR00000963549624.jpg')
let data_nik = []
async function satusehat(NIK) {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://api-satusehat.kemkes.go.id/fhir-r4/v1/Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|' + NIK,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer cw5E4PUdx4H7I40tbvVKE5injIDi'
        }
    };
    let { status, data } = await axios(config).then(res => ({ status: res.status, data: res.data })).catch(err => ({ status: err.response.status, data: err.response.data }));
    console.log(status, data);
    if (status == 400 || status == 404) {
        data_nik.push(NIK)
        return false
    }
    if (data.entry.length == 0) {
        data_nik.push(NIK)
        return false
    }
    let noSTR = []
    // console.log(data.entry[0])
    for (let x of data.entry[0].resource.qualification) {
        // console.log(x.identifier)
        if (x.identifier[0].value.includes('/')) {
            continue
        }
        if (!noSTR.includes(x.identifier[0].value)) {
            noSTR.push(x.identifier[0].value)
        }
    }
    console.log(noSTR)
    for (let x of noSTR) {
        let result = await scrapeSatuSehat(x)
        if (result.fotoPath != null) {
            console.log(result)

            let indexfinal = await ihs(NIK, result.fotoPath, path.basename(result.fotoPath))
            console.log(indexfinal)
            try {
                result.fotoPath = path.basename(result.fotoPath)
                let updateUser = await User.findOneAndUpdate(
                    { nik: NIK },
                    {
                        // 1. Gunakan $set untuk field biasa (bukan array)
                        $set: {
                            str: result
                        }
                    },
                    { new: true } // Mengembalikan data terbaru setelah update
                );
                console.log(updateUser);
            } catch (error) {
                console.log(error)
            }
            return
        }
        
    }
    try {
        let updateUser = await User.findOneAndUpdate(
            { nik: NIK },
            {
                // 1. Gunakan $set untuk field biasa (bukan array)
                $set: {
                    str: {}
                }
            },
            { new: true } // Mengembalikan data terbaru setelah update
        );
        console.log(updateUser);
    } catch (error) {
        console.log(error)
    }
    return

}
// satusehat('6171051111980007')
async function findNakes() {
    let findNIK = await User.find({ str: { $exists: true }, instansi: RegExp("RSU SAADAH SINGKAWANG", "i") }).limit(200)

    console.log(findNIK)
    for (let x of findNIK) {
    let result = await satusehat(x.nik)
    console.log(result)
    }
    console.log('Finish', findNIK.length)
    console.log(data_nik)
    
}
// findNakes()