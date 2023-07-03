"use strict";
const { sequelize } = require('../database/db_connect');
const { QueryTypes } = sequelize;
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');

/**
 * @name createConnection
 * @description create db connection.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} user
 */
exports.createConnection = catchAsyncErrors(async ({body:{connection_name, connection_type, host, port, user_name, password, user_id }},res) => {
 
  await sequelize.query(`INSERT INTO db_connections (connection_name,connection_type, host_name,host_port, host_username, host_password, user_id ) VALUES (:connection_name, :connection_type :host_name,:host_port, :host_username, :host_password, :user_id)`,{
    replacements:{
      connection_name: connection_name,
      connection_type: connection_type,
      host_name: host,
      host_port: port,
      host_username: user_name,
      host_password: password,
      user_id : 1 //user_id - change later
    }
  });

  res.status(200).json({
    success: true,
    message: 'Connection created'
  });
});
/**
 * @name connectionList
 * @description get connection list.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} user
 */
exports.connectionList = catchAsyncErrors(async (req,res) => {
 
  const connection =  await sequelize.query(`SELECT * FROM db_connections`);

  res.status(200).json({
    success: true,
    data: connection
  });
});




