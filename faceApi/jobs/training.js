require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const mongoose = require('mongoose');
const HostApi = process.env.HOST_API || 'http://localhost:8000'
const Host = process.env.HOST || 'http://localhost:3000'
const DIR_DATA = process.env.DIR_DATA || path.join(__dirname + '/data/');

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
async function siapaAja(filedir) {
    console.log(filedir)
    let file = fs.readFileSync(filedir, 'base64');
    let body = {
        base64: file
    }
    let response = await axios.post(HostApi + '/api/face/findIDs/base64', body)
    if (response.data.data == null || response.data.data == false) {
        return false
    }
    console.log("Jumlah wajah", response.data.data.length)
    console.log(response)
    let subject = []
    for (let x of response.data.data) {
        // x = x
        let index = 0;
        let kecocokan = 1 - (x.search_result.docs[0].vector_score)
       
        let status = ""
        if (kecocokan >= 0.85) {
            status = "Cocok";
            if (kecocokan >= 0.96) {
                status = "Identik";
                console.log(x.search_result.docs[0].id)
                console.log(kecocokan)
                continue
            }
            index = 1
        } else if (kecocokan >= 0.49) {
            status = "Mirip";
            index = 1
        } else {
            status = "Tidak Cocok";
        }
        if (index == 1) {
            console.log(kecocokan)
            console.log(x.search_result.docs[0].id)
            let findUser = await Faces.findOne({ idface: x.search_result.docs[0].id }).populate('user')
            console.log(findUser)
            const buffer = Buffer.from(x.crop_face_base64, 'base64');
            // 3. Define the output file path and name
            const outputPath = `./faces/${findUser.user.name.replace(/\s/g, '')}_${kecocokan.toFixed(2)}.jpg`;
            // 4. Write the buffer to a file
            fs.writeFile(outputPath, buffer, async (err) =>  {
                if (err) {
                    console.error('Error saving image:', err);
                } else {
                    console.log(`Image successfully saved to ${outputPath}`);
                    await indexFaces(findUser.user.nik, outputPath, `${findUser.user.name.replace(/\s/g, '')}_${kecocokan.toFixed(2)}.jpg`)
                }
            });
        }
    }
}
// siapaAja('./images/DEV00398.jpeg')
async function findall() {
    let datafiles = fs.readdirSync('./images')
    for await (const file of datafiles) {
        console.log(file)
        let x = await siapaAja('./images/' + file)
        console.log(x)

        // return
    }
    
}
findall()

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
async function indexFaces(nik, filedir, filename) {
    let findUser = await User.findOne({ nik: nik })
    console.log(findUser)
    let addIndex = await addIndexBase64(filedir, filename)
    console.log(nik, filedir, filename)
    console.log(addIndex)
    if (addIndex.data) {
        try {
            fs.copyFileSync(filedir, path.join(DIR_DATA, filename));
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