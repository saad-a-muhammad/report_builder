const express = require('express');
const route = express.Router();
//import controller
const { createConnection, connectionList, testConnection, tableList, viewList, columnList, schemaList, removeConnection } = require('../controllers/ConnectionController');
const { previewReport, saveReport, deleteReport, reportList, generateExcel, generateCsv, generatePdf, removeFile } = require('../controllers/ReportController')


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
route.route('/remove-report').get(deleteReport);

// exports routes
route.route('/get-excel').post(generateExcel);
route.route('/get-csv').post(generateCsv);
route.route('/get-pdf').post(generatePdf);
route.route('/remove-file').post(removeFile);

module.exports = route