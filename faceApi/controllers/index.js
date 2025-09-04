// const { User, Preferences, Nohp } = require('../models/x');
const fs = require('fs');
const path = require('path');
const User = require("../models/Users")
const Image = require("../models/Image")
const Faces = require("../models/Faces")
const mongoose = require('mongoose');
const axios = require('axios');
const HostApi = process.env.HOST_API || 'http://localhost:8000'
const Host = process.env.HOST_API || 'http://localhost:3000'
module.exports = {
    indexUsers: async(req, res) => {
        try {
            let findNik = await User.findOne({nik: req.body.nik})
            if(findNik){
                return res.status(201).json({
                    status: false,
                    message: 'nik sudah terdaftar',
                });
            }
            let findUser = await User.findOne({username: req.body.username})
            if(findUser){
                return res.status(201).json({
                    status: false,
                    message: 'username sudah terdaftar',
                });
            }
        }catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
        // const result = await axios.post(HostApi + '/api/face/index/url?UrlImage=' + req.body.UrlImage + '&nameId=' + req.body.username)
        const result = await axios.post(`${HostApi}/api/face/index/dump?url=${req.body.UrlImage}`)
        console.log(result.data)
        if (result.data == false) {
            return res.status(201).json({
                status: false,
                message: 'wajah tidak ditemukan',
            });
        }
        const session = await mongoose.startSession();
            try {
                session.startTransaction();
                let body = req.body
                let newUser = new User({
                    username: body.username,
                    nik: body.nik
                })
                // Simpan user
                const [saveUser] = await User.create(
                    [{ username: body.username, nik: body.nik }],
                    { session }
                )

                // Simpan image
                const [saveImage] = await Image.create(
                    [{ url: req.body.UrlImage, user: saveUser._id }],
                    { session }
                )

                // Siapkan data face
                const facesData = result.data.map(i => ({
                    file: i.imgID,
                    idface: i.id,
                    images: saveImage._id,
                    user: saveUser._id
                }))
           
                // Simpan face dalam batch
                await Faces.insertMany(facesData, { session })
                await session.commitTransaction()
                await session.endSession();
                return res.status(201).json({
                    message: 'Pengguna berhasil dibuat',
                    // data: newUser
                    });
            } catch (error) {
                await session.abortTransaction();
                await session.endSession();
                // Tangani kesalahan jika data duplikat
                if (error.code === 11000) {
                    result.data.map(async(i) => {
                        console.log(i)
                        await req.cache.del(i.id)
                        if (fs.existsSync(path.join(__dirname, "../data", i.imgID))) {
                            console.log(path.join(__dirname, "../data", i.imgID))
                        fs.unlinkSync(path.join(__dirname, "../data", i.imgID))
                    }
                    })
                    console.log(error)
                    const field = Object.keys(error.keyValue)[0];
                    const message = `Nilai '${error.keyValue[field]}' untuk field '${field}' sudah ada.`;
                    return res.status(409).json({ message }); // 409 Conflict
                }
                console.log(error)
                // Tangani kesalahan validasi atau kesalahan lainnya
               return res.status(400).json({ 
                    message: "error" ,
                    data: error.message
                });
            }

    },
    findUserByUrl: async (req, res) => {
        try {
            let body = req.body
            const result = await axios.get(`${HostApi}/api/face/findID/url?url=${body.UrlImage}`)
            if (result.data.data == false) {
                return res.status(201).json({
                    status: false,
                    message: 'wajah tidak ditemukan',
                });
            }
            let hasil = result.data.data.docs[0]
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
            console.log(findUser)
            findUser.file = `${Host}/asset/img/${findUser.file}`
            for (let y of result.data.data.docs) {
                console.log(y)
                y.kecocokan = 1 - (y.vector_score)
                y.kecocokan = (y.kecocokan * 100).toFixed(2) + '%'
            }
              return res.status(200).json({
                message: "success",
                data: {
                    kecocokan: (kecocokan * 100).toFixed(2) + '%',
                    status: status,
                    findUser
                },
                  raw: result.data.data.docs
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    },
    findAllUser: async (req, res) => {
        try {
            const users = await User.aggregate([
                {
                    $lookup: {
                        from: "images",              // nama collection (jamak, sesuai di MongoDB)
                        localField: "_id",
                        foreignField: "user",
                        as: "images"
                    }
                },
                {
                    $unwind: {
                        path: "$images",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "faces",
                        localField: "images._id",
                        foreignField: "images",
                        as: "images.faces"
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        username: { $first: "$username" },
                        nik: { $first: "$nik" },
                        images: { $push: "$images" }
                    }
                }
            ])
            for (let x of users) {
                for (let y of x.images) {
                    for (let z of y.faces) {
                        z.file = `${Host}/asset/img/${z.file}`
                    }
                }
                
            }
            return res.status(200).json({
                message: "success",
                record: users.length,
                data: users
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    }
    // updateUser: async (req, res) => {
    //     try {
    //         let body = req.body
    //        let  findUser = await User.findOne({username: body.username})
    //        if(!findUser){
    //             return res.status(404).json({
    //                 message: "username not found",
    //                 data: null
    //         })
    //        }
    //         console.log(findUser.preferences._id)
    //         console.log(body.preferences)
    //         let updatePreferences = await Preferences.findByIdAndUpdate(
    //             findUser.preferences._id,
    //              {$set: body.preferences},
    //             { new: true, runValidators: true })
    //         return res.status(200).json({
    //             message: "success",
    //             data: updatePreferences
    //         })
    //     } catch (error) {
    //         return res.status(500).json({
    //             message: "error",
    //             data: error
    //         })
    //     }
    // },
    // addBiodata: async (req, res) => {
    //     try {
    //         let body = req.body
    //         let findUser = await User.findOne({ username: body.username })
    //         if (!findUser) {
    //             return res.status(404).json({
    //                 message: "username not found",
    //                 data: null
    //             })
    //         }
    //         let updatePreferences = await Preferences.findByIdAndUpdate(
    //             findUser.preferences._id,
    //             { $push: { "bio": body.biodata } },
    //             { new: true, runValidators: true })
    //         return res.status(200).json({
    //             message: "success",
    //             data: updatePreferences
    //         })
    //     } catch (error) {
    //         return res.status(500).json({
    //             message: "error",
    //             data: error
    //         })
    //     }
    // },
    // addNohp: async (req, res)=>{
    //     const session = await mongoose.startSession();
    //     try{
    //         session.startTransaction();
    //         let body = req.body
    //         let findUser = await User.findOne({username: body.username}).populate('preferences')
    //         if(!findUser){
    //             return res.status(404).json({
    //                 message: "username not found",
    //                 data: null
    //         })
    //        }
    //     //    console.log(findUser)
    //         console.log(findUser.preferences._id)
    //         let addNohp = new Nohp({
    //             nohp: body.nohp
    //         })
    //         await addNohp.save({ session })
    //         await Preferences.findByIdAndUpdate(
    //             findUser.preferences._id,
    //             { $push: { nohp: addNohp._id } },
    //             { new: true, runValidators: true },
    //             { session }
    //         )
    //         await findUser.save({ session })
    //         await session.commitTransaction();
    //         await session.endSession();
    //         return res.status(200).json({
    //             message: "success",
    //             data: findUser
    //         })
    //     }catch(error){
    //         await session.abortTransaction();
    //         await session.endSession();
    //         return res.status(500).json({
    //             message: "error",
    //             data: error
    //         })
    //     }

    // },
    // allUsers: async (req, res) => {
    //     try {
            
    //         let limit = req.query.limit || 10;
    //         console.log(limit)
    //         limit || (limit = 10);
    //         // console.log(limit)
    //         let users = await User.find().populate({
    //             path: 'preferences', populate: { path: 'nohp' }
    //         }).limit(limit)
    //         return res.status(200).json({
    //             message: "success",
    //             record: users.length,
    //             data: users
    //         })
    //     } catch (error) {
    //         return res.status(500).json({
    //             message: "error",
    //             data: error
    //         })
    //     }
       
    // },
    // facebyUrl: async (req, res) => {
    //     try {
    //         console.log(req.query.url)
    //         const result = await axios.post(`http://localhost:8000/api/face/index/url?url=${req.query.url}`)
    //         console.log(result)
    //         return res.status(200).json({
    //             message: "success",
    //             data: result
    //         })
    //     } catch (error) {
    //         return res.status(500).json({
    //             message: "error",
    //             data: error
    //         })
    //     }
    // }
}