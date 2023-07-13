const express = require('express');
const route = express.Router();
//import controller
const { createConnection, connectionList, testConnection, tableList, viewList, columnList, schemaList, removeConnection } = require('../controllers/ConnectionController');

const { previewReport, saveReport} = require('../controllers/ReportBuilderController');


/* -----all API routes for Report builder data----- */

// connection routes
route.route('/get-connection-list').get(connectionList);
route.route('/test-connection').post(testConnection);
route.route('/create-connection').post(createConnection);
route.route('/remove-connection').get(removeConnection);
route.route('/get-schemas').post(schemaList);
route.route('/get-tables').get(tableList);
route.route('/get-views').get(viewList);
route.route('/get-columns').get(columnList);

// report builder routes
route.route('/preview-report').post(previewReport);
route.route('/save-report').post(saveReport);


module.exports = route