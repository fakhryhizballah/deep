const { exiftool } = require("exiftool-vendored");
const fs = require('fs');
let mainPath = "/Volumes/Fakhry/Backup/deep/data/";
// try {
//     // const data = fs.readFileSync(mainPath + '0a4c999d-b0dc-4cfe-8a1c-0ffb56b3cc8e-crop0.jpg', ['utf8']);
//     const fileInfo = fs.statSync(mainPath + '0a4c999d-b0dc-4cfe-8a1c-0ffb56b3cc8e-crop0.jpg');
//     console.log(fileInfo);
    
//     // 'data' will contain the file's content
//     // console.log(data.toString()); // If 'data' is a Buffer and you want a string
// } catch (err) {
//     console.error('Error reading file:', err);
// }
async function finders(path){
    const filePath = path;

    fs.readdir(filePath, { withFileTypes: true }, (err, items) => {
        console.log(items.length);
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