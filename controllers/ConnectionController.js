"use strict";
const Sequelize = require('sequelize');
const { QueryTypes } = Sequelize;
const db = require('../database/sqlite_connect');
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
exports.createConnection = catchAsyncErrors(async ({body:{connection_name, connection_type, host, port, user_name, password, user_id, default_db, default_schema }},res) => {
 
  const insertQuery = `
  INSERT INTO db_connections 
    (connection_name, connection_type, host_name, host_port, host_username, host_password, user_id, default_db, default_db_schema) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    connection_name,
    connection_type,
    host,
    port,
    user_name,
    password,
    1, // user_id - change later
    default_db,
    default_schema ? default_schema : null
  ];

  try {
    db.run(insertQuery, params, function (err) {
      if (err) {
        console.error('Error inserting data:', err.message);
        return res.status(200).json({
          success: false,
          message: err.message
        });
      } else {
        console.log('Connection created!');
        return res.status(200).json({
          success: true,
          message: 'Connection created!'
        });
      }
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @name removeConnection
 * @description remove db connection.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {string} message
 */
exports.removeConnection = catchAsyncErrors(async ({query:{connection_id}},res) => {
  // DELETE operation
  const deleteQuery = `DELETE FROM db_connections WHERE id = ?`;
  try {
    db.run(deleteQuery, connection_id, function (err) {
      if (err) {
        return res.status(200).json({
          success: false,
          message: err.message
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Connection removed!'
        });
      }
    });
  } catch (error) {
    console.error('Error executing query:', error.message);
    res.status(200).json({
      success: false,
      message: error.message
    });
  }
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
 
  const selectQuery = `SELECT * FROM db_connections`;
  try {
    db.all(selectQuery, [], (err, rows) => {
      if (err) {
        return res.status(200).json({
          success: false,
          message: err.message
        });
      } else {
        return res.status(200).json({
          success: true,
          data: rows
        });
      }
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: error.message
    });
  }

});

/**
 * @name testConnection
 * @description test connection and return tables.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} databases
 */
exports.testConnection = catchAsyncErrors(async ({body:{connection_type, host, port, user_name, password }},res) => {
  const hostConfig = {
    user: user_name,
    host: host,
    password: password,
    port: port
  }
  try {
    if (connection_type ===  'mysql') {
      const connection = mysql.createConnection(hostConfig);
      // Connect to the MySQL host
      connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL:', err);
          return res.status(200).json({
            success: false,
            message: 'Error connecting to MySQL: '+ err
          });;
        }
    
        console.log('Connected to MySQL host successfully!');
      
        // Fetch the list of databases
        connection.query('SHOW DATABASES;', (err, results) => {
          if (err) {
            console.error('Error fetching databases:', err);
            return res.status(200).json({
              success: false,
              message: 'Error fetching databases: '+err
            });
          }
      
          const databases = results.map(row => row.Database);
          console.log('Available MySQL databases:', databases);
          res.status(200).json({
            success: true,
            message: 'Connected to MySQL host successfully!',
            data: databases
          });
        });
      
        connection.end();
      });
    } else {
      const pool = new Pool(hostConfig);

      // Connect to the PostgreSQL host
      pool.connect()
        .then(client => {
          console.log('Connected to PostgreSQL host successfully!');

          // Fetch the list of databases
          client.query('SELECT datname FROM pg_database WHERE datistemplate = false;')
            .then(result => {
              const databases = result.rows.map(row => row.datname);
              console.log('Available PostgreSQL databases:', databases);
              res.status(200).json({
                success: true,
                message: 'Connected to PostgreSQL host successfully!',
                data: databases
              });
            })
            .catch(err => {
              console.error('Error fetching databases:', err);
              res.status(200).json({
                success: false,
                message: 'Error fetching databases: '+err
              });
            })
            .finally(() => {
              client.release(); // Release the client back to the pool
            });
        })
        .catch(err => {
          console.error('Error connecting to PostgreSQL:', err);
          res.status(200).json({
            success: false,
            message: 'Error connecting to PostgreSQL: '+err
          });
        });
    }
    
  } catch (error) {
    console.log(error);
    res.status(200).json({
      success: false,
      message: error
    });
  }
});

/**
 * @name tableList
 * @description returns database tables.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} datalist
 */
exports.tableList = catchAsyncErrors(async ({query:{connection_id}},res) => {

  db.get(`SELECT * FROM db_connections WHERE id = ?`, [connection_id], async (err, connection) => {
    if (err) {
      console.error('Error executing SELECT query:', err.message);
    } else {
      if (connection) {
        const connConfig = {
          username: connection.host_username,
          password: connection.host_password,
          database: connection.default_db,
          host: connection.host_name,
          port: connection.host_port,
          dialect: connection.connection_type
        }
        const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);
    
        const datalist = await connSequelize.query(
        `SELECT table_name as tablename FROM information_schema.tables WHERE table_schema = :db and table_type = 'BASE TABLE';`,
        {
          replacements:{
            db: connection.connection_type === 'postgres' ? connection.default_db_schema :  connection.default_db,
          },
          type: QueryTypes.SELECT
        });
        res.status(200).json({
          success: true,
          data: datalist
        });
      } else {
        res.status(200).json({
          success: false,
          message: 'No connection Found!'
        });
      }
    }
  });
});

/**
 * @name viewList
 * @description returns database views.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} datalist
 */

exports.viewList = catchAsyncErrors(async ({query:{connection_id}},res) => {
  db.get(`SELECT * FROM db_connections WHERE id = ?`, [connection_id], async (err, connection) => {
    if (err) {
      console.error('Error executing SELECT query:', err.message);
    } else {
      if (connection) {
        const connConfig = {
          username: connection.host_username,
          password: connection.host_password,
          database: connection.default_db,
          host: connection.host_name,
          port: connection.host_port,
          dialect: connection.connection_type
        }
        const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);
    
        const datalist = await connSequelize.query(
        `SELECT table_name as tablename FROM information_schema.tables WHERE table_schema = :db and table_type = 'VIEW';`,
        {
          replacements:{
            db: connection.connection_type === 'postgres' ? connection.default_db_schema :  connection.default_db,
          },
          type: QueryTypes.SELECT
        });
        res.status(200).json({
          success: true,
          data: datalist
        });
      } else {
        res.status(200).json({
          success: false,
          message: 'No connection Found!'
        });
      }
    }
  });
});

/**
 * @name columnList
 * @description returns database table columns.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} datalist
 */

exports.columnList = catchAsyncErrors(async ({query:{connection_id, table_name}},res) => {
  db.get(`SELECT * FROM db_connections WHERE id = ?`, [connection_id], async (err, connection) => {
    if (err) {
      console.error('Error executing SELECT query:', err.message);
    } else {
      if (connection) {
        const connConfig = {
          username: connection.host_username,
          password: connection.host_password,
          database: connection.default_db,
          host: connection.host_name,
          port: connection.host_port,
          dialect: connection.connection_type
        }
        const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);

        const datalist = await connSequelize.query(
          `SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = :tbl_name
            AND table_schema = :db;`,
        {
          replacements:{
            db: connection.connection_type === 'postgres' ? connection.default_db_schema :  connection.default_db,
            tbl_name : table_name
          },
          type: QueryTypes.SELECT
        });
        res.status(200).json({
          success: true,
          data: datalist
        });
      } else {
        res.status(200).json({
          success: false,
          message: 'No connection Found!'
        });
      }
    }
  });
});

/**
 * @name schemaList
 * @description returns database schemas for postgres.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} datalist
 */
exports.schemaList = catchAsyncErrors(async ({body:{connection_type, host, port, user_name, password, default_db }},res) => {

  const connConfig = {
    username: user_name,
    password: password,
    database: default_db,
    host: host,
    port: port,
    dialect: connection_type
  }
  const connSequelize = new Sequelize(default_db, user_name, password, connConfig);

  const datalist = await connSequelize.query(
    `SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema';`,
  {
    type: QueryTypes.SELECT
  });
  res.status(200).json({
    success: true,
    data: datalist
  });
});