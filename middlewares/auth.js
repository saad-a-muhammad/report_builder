
const jwt = require('jsonwebtoken');
//const { getLoggedInUser } = require('../controllers/ReportController');
const fs = require("fs");
const adminPaths = [
  '/api/v1/get-activity-log-report-data',
  '/api/v1/get-email-opt-out-list',
  '/api/v1/get-properties-with-sales-data',
  '/api/v1/get-properties-with-connect-data',
  '/api/v1/get-properties-with-cleanings-plus-data'
];


/**
 * @name authUser
 * @description get token from header. verify and decode payload to authenticate user. Check if token is expired or not. 
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 */
exports.authUser = async (req,res,next) =>{
    try {
      res.header('Cache-Control','no-cache,no-store,max-age=0');
      res.header('Pragma','no-cache');
      res.header('Expires','-1');
      res.header("Access-Control-Allow-Origin", "*");
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header("Access-Control-Allow-Headers", "x-openrtb-version,Content-Type,*");
        
      next() // proceed to controller
       
    } catch (error) {
      res.status(200).json({
        success: false,
        message:'Invalid User'
      });
    }
  };