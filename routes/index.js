const express = require('express');
const route = express.Router();
//import controller
const { createConnection, connectionList } = require('../controllers/ConnectionController');


/* -----all API routes for Report builder data----- */

// connection routes
route.route('/get-connection-list').get(connectionList);
route.route('/create-connection').post(createConnection);

module.exports = route