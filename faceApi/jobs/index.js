require('dotenv').config();
const { exiftool } = require("exiftool-vendored");
const fs = require('fs');
const path = require('path');
let mainPath = process.env.DIR_DATA || path.join(__dirname + './../data/');
console.log(mainPath)

async function finders(path){
    const filePath = path;

    fs.readdir(filePath, { withFileTypes: true }, (err, items) => {
        console.log(items);
        // items.forEach(item => {
        //     if (item.isFile()) {
        //         console.log("FILE →", item.name);
        //     } else if (item.isDirectory()) {
        //         console.log("FOLDER →", item.name);
        //     }
        // });
    });
    
}
finders(mainPath)
async function readExif(path) {
    const filePath = path;

    const data = await exiftool.read(filePath);
    console.log(data);

    await exiftool.end();
}
// readExif( mainPath + '0a4c999d-b0dc-4cfe-8a1c-0ffb56b3cc8e-crop0.jpg')

async function writeExif(path) {
    const filePath = path;

    try {
        await exiftool.write(filePath, {
            Title: "closeup",
            Artist: "Fakhry",
            Comment: "NIK",
            Copyright: "© 2025 Fakhry"
        });

        console.log("Metadata berhasil ditulis!");
    } catch (err) {
        console.error("Gagal menulis metadata:", err);
    } finally {
        await exiftool.end();
    }
}