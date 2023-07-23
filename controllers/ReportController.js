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
exports.createReport = catchAsyncErrors(async ({body:{ joins, connection }},res) => {
  
  
  const p_table = joins.map(e=>e.from_table);
  const connConfig = {
    username: connection.host_username,
    password: connection.host_password,
    database: connection.default_db,
    host: connection.host_name,
    port: connection.host_port,
    dialect: connection.connection_type
  }
  const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);

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
  console.log(query);
  const data  = await connSequelize.query(query,{
    type: QueryTypes.SELECT
  });
  
  res.status(200).json({
    data: data,
    query,
    success: true
  });
});

