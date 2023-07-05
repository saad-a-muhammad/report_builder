const express = require('express');
const route = express.Router();
//import controller
const { createConnection, connectionList, testConnection, tableList, viewList, columnList, schemaList } = require('../controllers/ConnectionController');


/* -----all API routes for Report builder data----- */

// connection routes
route.route('/get-connection-list').get(connectionList);
route.route('/test-connection').post(testConnection);
route.route('/create-connection').post(createConnection);
route.route('/get-schemas').post(schemaList);
route.route('/get-tables').get(tableList);
route.route('/get-views').get(viewList);
route.route('/get-columns').get(columnList);

module.exports = route