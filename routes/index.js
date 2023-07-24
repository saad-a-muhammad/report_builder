const express = require('express');
const route = express.Router();
//import controller
const { createConnection, connectionList, testConnection, tableList, viewList, columnList, schemaList, removeConnection } = require('../controllers/ConnectionController');
const { previewReport, saveReport, reportList } = require('../controllers/ReportController')


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
route.route('/get-report-data').post(previewReport);
route.route('/get-reports').get(reportList);
route.route('/save-report').post(saveReport);


module.exports = route