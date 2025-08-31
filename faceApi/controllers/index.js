const { User, Preferences, Nohp } = require('../models/Users');
const mongoose = require('mongoose');
const axios = require('axios');
const HostApi = process.env.HOST_API || 'http://localhost:8000'
module.exports = {
    indexUsers: async(req, res) => {
        // const result = await axios.post(HostApi + '/api/face/index/url?UrlImage=' + req.body.UrlImage + '&nameId=' + req.body.username)
        const result = await axios.post(`http://localhost:8000/api/face/index/url?nameId=${req.body.username}&url=${req.body.UrlImage}`)
        console.log(result.data)
        if (!result.data.status) {
            return res.status(201).json({
                status: false,
                message: 'gagal',
                data: result.data.message
            });
        }
        const session = await mongoose.startSession();
            try {
                session.startTransaction();
                let body = req.body
                let addUser = new User({
                    username: body.username,
                    UrlImage: body.UrlImage,
                })
                let addPreferences = new Preferences({
                    name: body.preferences.name,
                    nik: body.preferences.nik,
                    nohp: [],
                    bio: body.preferences.bio || []
                })
                // console.log(body.preferences.nohp)
                if (body.preferences.nohp) {
                    for (let x of body.preferences.nohp) {
                        let addNohp = new Nohp({
                            nohp: x
                        })
                        console.log(addNohp)
                        await addNohp.save({ session })
                        addPreferences.nohp.push(addNohp._id)
                    }
                }

                await addPreferences.save({ session })

                addUser.preferences = addPreferences._id
                let newUser = await addUser.save({ session });
                await session.commitTransaction();
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
                    // Kode kesalahan 11000 menandakan duplikasi
                    // Dapatkan nama field yang duplikat dari pesan kesalahan
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
    updateUser: async (req, res) => {
        try {
            let body = req.body
           let  findUser = await User.findOne({username: body.username})
           if(!findUser){
                return res.status(404).json({
                    message: "username not found",
                    data: null
            })
           }
            console.log(findUser.preferences._id)
            console.log(body.preferences)
            let updatePreferences = await Preferences.findByIdAndUpdate(
                findUser.preferences._id,
                 {$set: body.preferences},
                { new: true, runValidators: true })
            return res.status(200).json({
                message: "success",
                data: updatePreferences
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    },
    addBiodata: async (req, res) => {
        try {
            let body = req.body
            let findUser = await User.findOne({ username: body.username })
            if (!findUser) {
                return res.status(404).json({
                    message: "username not found",
                    data: null
                })
            }
            let updatePreferences = await Preferences.findByIdAndUpdate(
                findUser.preferences._id,
                { $push: { "bio": body.biodata } },
                { new: true, runValidators: true })
            return res.status(200).json({
                message: "success",
                data: updatePreferences
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    },
    addNohp: async (req, res)=>{
        const session = await mongoose.startSession();
        try{
            session.startTransaction();
            let body = req.body
            let findUser = await User.findOne({username: body.username}).populate('preferences')
            if(!findUser){
                return res.status(404).json({
                    message: "username not found",
                    data: null
            })
           }
        //    console.log(findUser)
            console.log(findUser.preferences._id)
            let addNohp = new Nohp({
                nohp: body.nohp
            })
            await addNohp.save({ session })
            await Preferences.findByIdAndUpdate(
                findUser.preferences._id,
                { $push: { nohp: addNohp._id } },
                { new: true, runValidators: true },
                { session }
            )
            await findUser.save({ session })
            await session.commitTransaction();
            await session.endSession();
            return res.status(200).json({
                message: "success",
                data: findUser
            })
        }catch(error){
            await session.abortTransaction();
            await session.endSession();
            return res.status(500).json({
                message: "error",
                data: error
            })
        }

    },
    allUsers: async (req, res) => {
        try {
            
            let limit = req.query.limit || 10;
            console.log(limit)
            limit || (limit = 10);
            // console.log(limit)
            let users = await User.find().populate({
                path: 'preferences', populate: { path: 'nohp' }
            }).limit(limit)
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
    facebyUrl: async (req, res) => {
        try {
            console.log(req.query.url)
            const result = await axios.post(`http://localhost:8000/api/face/index/url?url=${req.query.url}`)
            console.log(result)
            return res.status(200).json({
                message: "success",
                data: result
            })
        } catch (error) {
            return res.status(500).json({
                message: "error",
                data: error
            })
        }
    }
}