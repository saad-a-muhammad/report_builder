"use strict";
const { sequelize } = require('../database/db_connect');
const { QueryTypes } = sequelize;
const Sequelize = require('sequelize');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const mysql = require('mysql');
const { Pool } = require('pg');

/**
 * @name createConnection
 * @description create db connection.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} user
 */
exports.previewReport = catchAsyncErrors(async ({body:{ joins, connection }},res) => {
  try {
    // create connection
    const connConfig = {
      username: connection.host_username,
      password: connection.host_password,
      database: connection.default_db,
      host: connection.host_name,
      port: connection.host_port,
      dialect: connection.connection_type
    }
    const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);
    // build query
    const query = buildReportQuery(joins);
    console.log(query);
    // execute query
    const data  = await connSequelize.query(query,{
      type: QueryTypes.SELECT
    });
    
    res.status(200).json({
      data: data,
      query,
      success: true
    });
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
exports.saveReport = catchAsyncErrors(async ({body:{connection_id, name, description, data_query, data_model}},res) => {
  try {
    const connections = await sequelize.query(`SELECT * FROM db_connections WHERE id = :connID`,{
        replacements:{
          connID: connection_id
        },
        type: QueryTypes.SELECT
    });
    if (connections.length > 0) {
      //insert report data
      await sequelize.query(`INSERT INTO report_models (connection_id, name, description, data_query, data_model) VALUES (:connection_id, :name, :description,:data_query, :data_model)`,{
        replacements:{
          connection_id: connection_id,
          name: name,
          description: description,
          data_query: data_query,
          data_model: data_model
        }
      });
      return res.status(200).json({
        success: true,
        message: 'Successfully Created Data Model!'
      });  
    } else {
      return res.status(200).json({
        success: true,
        message: 'No Connection!'
      });
    }
  } catch (error) {
    console.log(error)
  }
});

/**
 * @name buildReportQuery
 * @description builds query
 * @param {object} connection
 * @param {object} components
 *
 * @returns {string} query string
 */

async function buildReportQuery(joins){
  const p_table = joins.map(e=>e.from_table);
  
  // const s_table = joins.map(e=>e.to_table); .substring(0,2) ${joins[0].to_table.substring(0,2)} ${p_table[0].substring(0,2)}

  let query = `SELECT * FROM ${p_table[0]} ${joins[0].type} 
                ${joins[0].to_table} ON 
                    ${joins[0].from_table}.${joins[0].from_column.column_name} = ${joins[0].to_table}.${joins[0].to_column.column_name} 
               `;
  if (joins.length>1) {
    for (let i=1; i < joins.length; i++) {
      const el = joins[i];
      query+=` ${el.type} ${el.to_table} ${el.to_table.substring(0,2)} ON ${el.from_table.substring(0,2)}.${el.from_column.column_name} = ${el.to_table.substring(0,2)}.${el.to_column.column_name} `
    }
  }
  return query; 
};