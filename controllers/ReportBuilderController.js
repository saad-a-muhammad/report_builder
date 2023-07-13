"use strict";
const { sequelize } = require('../database/db_connect');
const { QueryTypes } = sequelize;
const Sequelize = require('sequelize');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const mysql = require('mysql');
const { Pool } = require('pg');



/**
 * @name previewReport
 * @description preview report.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} query
 */
exports.previewReport = catchAsyncErrors(async ({body:{ connection_id }},res) => {
    try {
        const connections = await sequelize.query(`SELECT * FROM db_connections WHERE id = :connID`,{
            replacements:{
                connID: connection_id
            },
            type: QueryTypes.SELECT
        });
    
        if (connections.length > 0) {
            const connection = connections[0];
            const connConfig = {
                username: connection.host_username,
                password: connection.host_password,
                database: connection.default_db,
                host: connection.host_name,
                port: connection.host_port,
                dialect: connection.connection_type
            }
            const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);
        
            const components = null;
            const query = buildReportQuery(connSequelize, components);

            res.status(200).json({
                success: true,
                data: query
            });
        } else {
            res.status(200).json({
                success: true,
                message: 'No Connection!'
            });
        }
     
    } catch (error) {
        console.log(error)
    }
   
});

/**
 * @name saveReport
 * @description save report
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} message
 */
exports.saveReport = catchAsyncErrors(async ({body:{connection_type, host, port, user_name, password }},res) => {
  
});


/**
 * @name buildReportQuery
 * @description builds query
 * @param {object} connection
 * @param {object} components
 *
 * @returns {string} query string
 */
const buildReportQuery = catchAsyncErrors(async (connection, components) => {
    // build query functionality
});

 

