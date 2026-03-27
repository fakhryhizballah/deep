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

async function writeExif(path) {
    const filePath = path;
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


async function howis(path) {
    let file = fs.readFileSync(path, 'base64');
    // console.log(file)
    let response = await axios.get(HostApi + '/api/face/findID/base64', {
        params: {
            base64: file
        }
    })
    if (response.data.data == false) {
        return res.status(201).json({
            status: false,
            message: 'wajah tidak ditemukan',
        });
    }
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
        // return res.status(200).json({
        //     message: "tidak ditemukan di database",
        //     kecocokan: (kecocokan * 100).toFixed(2) + '%',
        //     status: status,
        //     // findUser
        // });
    }
    let findUser = await Faces.findOne({ idface: hasil.id }).populate('user')
    console.log(status, kecocokan)
    console.log(findUser)
}
howis()

module.exports = {
    writeExif,
    howis
}