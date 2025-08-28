const express = require("express");
const routes = express.Router();

const base = require('../controllers');

routes.post("/user", base.indexUsers);

routes.put("/user", base.updateUser);
routes.post("/user/nohp", base.addNohp);

routes.get("/users", base.allUsers);

module.exports = routes;