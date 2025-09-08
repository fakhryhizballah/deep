const fs = require('fs');
const path = require('path');
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const mongoose = require('mongoose');
const axios = require('axios');
const HostApi = process.env.HOST_API || 'http://localhost:8000'
const Host = process.env.HOST || 'http://localhost:3000'

module.exports = {
    findFace: async(path) => {
        try {
            let findFace = await axios.get(HostApi + '/api/face/findID/internal?path=' + path)
            let faceInde = []
            if (findFace.data.result.state == true) {
                const session = await mongoose.startSession();
                try {
                    console.log(findFace.data.result)
                    session.startTransaction();
                    const [saveImage] = await Image.create([{ url: findFace.data.result.img }], { session });
                    const facesData = findFace.data.result.data.map(i => ({
                        file: i.imgID,
                        idface: i.id,
                        images: saveImage._id
                    }))
                    await Faces.insertMany(facesData, { session })
                    await session.commitTransaction();
                    await session.endSession();
                    return
                } catch (error) {
                    await session.abortTransaction();
                    await session.endSession();
                    return error
                } finally {
                    await session.endSession(); // Memastikan sesi selalu diakhiri
                }
            }
            for (let y of findFace.data.result.data) {
                let findUser = await Faces.findOne({ idface: y.id }).populate('images').populate('user')
                // console.log(typeof findUser) 
                faceInde.push({
                    findUser,
                    score: 1 - (y.vector_score)
                }
            )
            }
            let data = {
                jumlah_face: findFace.data.result.total,
                dikenali: faceInde
            }
            // console.log(data)
            return data
        } catch (error) {
            return error
        }
    }
    
}