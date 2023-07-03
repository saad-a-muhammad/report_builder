'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
// config['logging'] = false;
const db = {};
let sequelize;
try {
  if (process.env.DB_USER_NAME && process.env.DB_NAME) {
    const username = process.env.DB_USER_NAME
    const password = process.env.DB_PASSWORD
    const database = process.env.DB_NAME
    const host = process.env.DB_HOST
    const prod_config ={
      username,
      password,
      database,
      host,
      dialect: "mysql"
    }
    sequelize = new Sequelize(database, username, password, prod_config);
  }
  
} catch (error) {
  console.log(error);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
