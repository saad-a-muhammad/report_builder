const express = require('express');
const helmet = require("helmet");
const path = require("path");
// const mkdirp = require("mkdirp");
const cors = require("cors");
const app = express();
require("dotenv").config();
// require('./scheduler');
const { authUser } = require('./middlewares/auth'); 
const routes = require('./routes');
// parse incoming JSON requests
app.use(express.json({limit: '50mb'}));
global.rootPath = path.join(__dirname, "");
// set global route path
// mkdirp.sync(path.join(global.rootPath, "/public/app/reports")); 
// mkdirp.sync(path.join(global.rootPath, "/public/app/s3_bucket")); 
// set root of the path
app.use(express.static(path.join(global.rootPath, "/public"))); 
// enable cors for all origins
// credentials are set true to pass the header
app.use(
    cors({
        origin: true, 
        credentials: true, 
    })
);
app.use(helmet());
app.use(authUser); 
app.use('/api/v1',routes);
module.exports = app;