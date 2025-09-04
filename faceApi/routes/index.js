const express = require("express");
const routes = express.Router();

const base = require('../controllers');

routes.post("/user", base.indexUsers);
routes.get("/users", base.findAllUser);
routes.post("/find/users", base.findUserByUrl);

// routes.put("/user", base.updateUser);
// routes.post("/user/nohp", base.addNohp);
// routes.post("/user/biodata", base.addBiodata);
// routes.get("/users", base.allUsers);

// routes.get("/finder/byurl", base.facebyUrl);

module.exports = routes;