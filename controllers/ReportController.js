"use strict";
const Sequelize = require('sequelize');
const { QueryTypes } = Sequelize;
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const mysql = require('mysql');
const { Pool } = require('pg');
const db = require('../database/sqlite_connect');

/**
 * @name previewReport
 * @description create db connection.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} user
 */
exports.previewReport = async ({body:{ joins, connection, table, selecedCols, filters, group_by, sort_by}},res) => {
  const dbSchema = connection.connection_type == 'postgres' ? connection.default_db_schema : connection.default_db;
  const query = buildReportQuery({joins,table, selecedCols, filters, group_by, sort_by, dbSchema});
  try {
    const connConfig = {
      username: connection.host_username,
      password: connection.host_password,
      database: connection.default_db,
      host: connection.host_name,
      port: connection.host_port,
      dialect: connection.connection_type
    }
    const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);

    

    const data = await connSequelize.query(query,{
      type: QueryTypes.SELECT
    });
      
    res.status(200).json({
      error_message: '',
      data: data,
      query,
      success: true
    });
  } catch (error) {
    // console.log(error);
    res.status(200).json({
      error_message: error.message,
      data: [],
      query,
      success: false
    });
  }
};

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
    db.get(`SELECT * FROM db_connections WHERE id = ?`, [connection_id], async (err, connection) => {
      if (err) {
        console.error('Error executing SELECT query:', err.message);
      } else {
        if (connection) {
          const insertQuery = `
            INSERT INTO report_models (connection_id, name, description, data_query, data_model)
            VALUES (?, ?, ?, ?, ?)
          `;        
          db.run(insertQuery, [connection_id, name, description, data_query, data_model], function (err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Failed to create Data Model'
              });
            } else {
              return res.status(200).json({
                success: true,
                message: 'Successfully Created Data Model!'
              });
            }
          });
        } else {
          return res.status(200).json({
            success: false,
            message: 'No Connection!'
          });
        } 
      }
    });
  } catch (error) {
    console.log(error)
  }
});

/**
 * @name reportList
 * @description get report (data models) list.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} user
 */
exports.reportList = catchAsyncErrors(async ({query: {connection_id}},res) => {
  try {
    db.all(`SELECT * FROM report_models WHERE connection_id = ?`, [connection_id], (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve data'
        });
      } else {
        return res.status(200).json({
          success: true,
          data: rows
        });
      }
    });
  } catch (error) {
    console.error('Error executing SELECT operation:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve data'
    });
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

function buildReportQuery({joins, table=[], selecedCols, filters, group_by, sort_by, dbSchema}){
  try {
    let filter_clause = '', group_by_clause = '', sort_by_clause = '';
    
    if (group_by.length) {
      group_by_clause = 'GROUP BY '
      for (const [i,el] of group_by.entries()) {
        group_by_clause+=` ${ i > 0 ? ',' : '' } ${el.column.table_name}.${el.column.column_name} `
      }
    }
    if (sort_by.length) {
      sort_by_clause = 'ORDER BY '
      for (const [i,el] of sort_by.entries()) {
        sort_by_clause+=` ${ i > 0 ? ',' : '' } ${el.column.table_name}.${el.column.column_name} ${el.order.toUpperCase()}`
      }
    }
    if (filters.length) {
      filter_clause = 'WHERE '
      for (const el of filters) {
        filter_clause+=` ${el.and_or ? el.and_or : ``} ${el.column.table_name}.${el.column.column_name} ${el.operator_type} ${ el.filter_value.one ? `'${el.filter_value.one}'` : ``  } ${el.filter_value.two ? `between '${el.filter_value.two}'` : '' } `
      }
    }
    if (table.length) {
      return `SELECT ${selecedCols.length>0 ? selecedCols.toString() : `*`} FROM ${table[0]} ${filter_clause} \n\t  ${group_by_clause} \n\t ${sort_by_clause}`;
    }
    const p_table = joins.map(e=>e.from_table);
    
    // const s_table = joins.map(e=>e.to_table); .substring(0,2) ${joins[0].to_table.substring(0,2)} ${p_table[0].substring(0,2)}
  
    let query = `SELECT ${selecedCols.length>0 ? selecedCols.toString() : `*`} FROM ${dbSchema}.${p_table[0]} ${joins[0].join_type} 
                  ${dbSchema}.${joins[0].to_table} ON 
                  ${dbSchema}.${joins[0].from_table}.${joins[0].from_column.column_name} = ${dbSchema}.${joins[0].to_table}.${joins[0].to_column.column_name}`;
    if (joins.length>1) {
      for (let i=1; i < joins.length; i++) {
        const el = joins[i];
        query+=` ${el.join_type} ${dbSchema}.${el.to_table} ON ${dbSchema}.${el.from_table}.${el.from_column.column_name} = ${dbSchema}.${el.to_table}.${el.to_column.column_name} `
      }
    } 
    console.log(`${query} ${filter_clause}`);
    return `${query} ${filter_clause} \n\t ${group_by_clause} \n\t ${sort_by_clause}`;
    
  } catch (error) {
    console.log(error);
  }
  
};