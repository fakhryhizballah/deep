// const { User, Preferences, Nohp } = require('../models/x');
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
    indexUsers: async(req, res) => {
        try {
            let findNik = await User.findOne({nik: req.body.nik})
            if(findNik){
                return res.status(200).json({
                    status: false,
                    message: 'nik sudah terdaftar',
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
                console.log(body)
                // Simpan user
                let findUsername = await User.findOne({ nik: req.body.username })
                if (findUsername) {
                    body.username = body.username + Math.floor(Math.random() * 100)
                }
                const [saveUser] = await User.create(
                    [{
                        username: body.username,
                        name: body.name,
                        nik: body.nik
                    }],
                    { session }
                )
                console.log(saveUser)

                // Simpan image
                const [saveImage] = await Image.create(
                    [{ url: req.body.UrlImage }],
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
    addUser: async (req, res) => {
        try {
            let findNik = await User.findOne({ nik: req.body.nik })
            if (findNik) {
                return res.status(201).json({
                    status: false,
                    message: 'nik sudah terdaftar',
                });
            }
        } catch (error) {
            return res.status(400).json({
                message: "error",
                data: error
            })
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            // Simpan user
            let body = req.body
            console.log(body)
            // Simpan user
            let findUsername = await User.findOne({ nik: req.body.username })
            if (findUsername) {
                body.username = body.username + Math.floor(Math.random() * 100)
            }
            const [saveUser] = await User.create(
                [{
                    username: body.username,
                    name: body.name,
                    nik: body.nik
                }],
                { session }
            )
            console.log(saveUser)

            await session.commitTransaction()
            await session.endSession();
            return res.status(201).json({
                message: 'Pengguna berhasil dibuat'
            });
        } catch (error) {
            await session.abortTransaction();
            await session.endSession();
            // Tangani kesalahan jika data duplikat
            if (error.code === 11000) {
                const field = Object.keys(error.keyValue)[0];
                const message = `Nilai '${error.keyValue[field]}' untuk field '${field}' sudah ada.`;
                return res.status(409).json({ message }); // 409 Conflict
            }
            console.log(error)
            // Tangani kesalahan validasi atau kesalahan lainnya
            return res.status(500).json({
                message: "error",
                data: error.message
            });
        }
    },
    addIndexUser: async (req, res) => {
        const session = await mongoose.startSession();
        try {
            let body = req.body
            let findIdUser = await User.findOne(body.index)
            if (!findIdUser) {
                return res.status(404).json({
                    message: "user not found",
                    data: null
                })
            }
            session.startTransaction();

            let result = await axios.post(`${HostApi}/api/face/index/dump?url=${body.UrlImage}`)
            if (result.data == false) {
                return res.status(201).json({
                    status: false,
                    message: 'wajah tidak ditemukan',
                });
            }
            const [saveImage] = await Image.create(
                [{ url: body.UrlImage }],
                { session }
            )
            const facesData = result.data.map(i => ({
                file: i.imgID,
                idface: i.id,
                images: saveImage._id,
                user: findIdUser._id
            }))
            await Faces.insertMany(facesData, { session })
            await session.commitTransaction()
            await session.endSession();

            return res.status(200).json({
                message: 'ditambah berhasil dibuat',
                data: Faces
            });
        } catch (error) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(400).json({
                message: "error",
                data: error.message
            });
        }

    },
    addKycUser: async (req, res) => {
        let body = req.body
        try {
            let findIdUser = await User.findById(body._id)
            if (!findIdUser) {
                return res.status(404).json({
                    message: "user not found",
                    data: null
                })
            }
            let updateFace = await Faces.findByIdAndUpdate(body.imgId,
                { $set: { user: findIdUser._id } },
                { new: true, runValidators: true })
            return res.status(200).json({
                message: 'ditambah berhasil dibuat',
                data: updateFace
            });
        } catch (error) {
            return res.status(400).json({
                message: "error",
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
            findUser.file = `/asset/img/${findUser.file}`
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
                        from: "faces",
                        localField: "_id",
                        foreignField: "user",
                        as: "faces"
                    }
                },
                { $unwind: { path: "$faces", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "images",
                        localField: "faces.images",
                        foreignField: "_id",
                        as: "faces.images"
                    }
                },
                { $unwind: { path: "$faces.images", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: "$_id",
                        username: { $first: "$username" },
                        nik: { $first: "$nik" },
                        faces: { $push: "$faces" }
                    }
                }
            ])
            let totalFaces = 0
            for (let x of users) {
                // Lakukan pengecekan
                if (x.faces && x.faces.length > 0 && Object.keys(x.faces[0]).length > 0) {
                    for (let y of x.faces) {
                        y.file = `/asset/img/${y.file}`
                        totalFaces++
                    }
                } else {
                    x.faces = []
                }
            }
            return res.status(200).json({
                message: "success",
                record: users.length,
                totalFaces: totalFaces,
                data: users
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    },
    getUser: async (req, res) => {
        try {
            let body = req.body
            console.log(req.query.username)
            if (req.query.username) {
                const users = await User.find({ username: { $regex: req.query.username, $options: 'i' } })
                return res.status(200).json({
                    message: "success",
                    record: users.length,
                    data: users
                })
            }
            if (req.query.nik) {
                const users = await User.find({ nik: { $regex: req.query.nik, $options: 'i' } })
                return res.status(200).json({
                    message: "success",
                    record: users.length,
                    data: users
                })
            }
            if (req.query.id) {
                const users = await User.find({ _id: { $regex: req.query.id, $options: 'i' } })
                return res.status(200).json({
                    message: "success",
                    record: users.length,
                    data: users
                })
            }
            if (req.query.name) {
                const users = await User.find({ name: { $regex: req.query.name, $options: 'i' } })
                return res.status(200).json({
                    message: "success",
                    record: users.length,
                    data: users
                })
            }
            const users = await User.find()
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
    },
    deleteUser: async (req, res) => {
        try {
            let body = req.body
            let findUser = await Faces.findById(body.id)
            if (!findUser) {
                return res.status(201).json({
                    status: false,
                    message: 'tidak ditemukan di database',
                });
            }
            let updatePreferences = await Faces.findByIdAndUpdate(body.id, { $set: { user: null } }, { new: true, runValidators: true })
            return res.status(200).json({
                message: "success",
                data: findUser
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }

    },
    findFace: async (req, res) => {
        try {
            let body = req.query
            let findUser = await Faces.find({ user: body.user }).populate('images').populate('user')
            console.log(findUser)
            for (let x of findUser) {
                x.file = `/asset/img/${x.file}`
            }
            return res.status(200).json({
                message: "success",
                data: findUser
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    },
    findFaceUndefined: async (req, res) => {
        try {
            let findFace = await Faces.find({ user: null }).populate('images')
            for (let x of findFace) {
                x.file = `/asset/img/${x.file}`
                if (x.images.url.startsWith('http://') || x.images.url.startsWith('https://')) {
                    continue
                } else {
                    x.images.url = `/asset/img/${x.images.url}`
                }
            }
            return res.status(200).json({
                message: "success",
                data: findFace,
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    },
    findFaceUndefinedStatistics: async (req, res) => {
        try {
            let findNotUser = await Faces.countDocuments({ user: null });
            let totalFaces = await Faces.estimatedDocumentCount();
            return res.status(200).json({
                message: "success",
                data: {
                    totalFaces: totalFaces,
                    notIdentified: findNotUser,
                    identified: totalFaces - findNotUser,
                    percentage: parseFloat(((findNotUser / totalFaces) * 100).toFixed(2))
                },
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