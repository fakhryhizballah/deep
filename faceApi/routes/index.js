const express = require("express");
const routes = express.Router();

const base = require('../controllers');

routes.post("/user", base.indexUsers);
routes.post("/user/create", base.addUser);
routes.post("/user/manual", base.addIndexUser);
routes.post("/user/kyc", base.addKycUser);
routes.get("/users", base.findAllUser);
routes.get("/user", base.getUser);
routes.delete("/user/face", base.deleteUser);
routes.post("/find/users", base.findUserByUrl);
routes.get("/find/faceid", base.findFace);
routes.get("/find/face/undefined", base.findFaceUndefined);
routes.get("/find/face/undefined/statistics", base.findFaceUndefinedStatistics);

// routes.put("/user", base.updateUser);
// routes.post("/user/nohp", base.addNohp);
// routes.post("/user/biodata", base.addBiodata);
// routes.get("/users", base.allUsers);

// routes.get("/finder/byurl", base.facebyUrl);

module.exports = routes;