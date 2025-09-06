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
            // console.log(findFace.data)
            let faceInde = []
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