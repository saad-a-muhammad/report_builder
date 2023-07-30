const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create db_connections table
    db.run(
      'CREATE TABLE IF NOT EXISTS db_connections (id INTEGER PRIMARY KEY AUTOINCREMENT,connection_type TEXT NOT NULL,connection_name TEXT,host_name TEXT NOT NULL,host_port INTEGER NOT NULL,host_username TEXT NOT NULL,host_password TEXT,user_id INTEGER NOT NULL,default_db TEXT,default_db_schema TEXT);',
      (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
        } else {
          console.log('Table "db_connections" created or already exists.');
        }
      }
    );

    // Create report_models table
    db.run(
      'CREATE TABLE IF NOT EXISTS report_models (id INTEGER PRIMARY KEY AUTOINCREMENT,connection_id INTEGER,name TEXT,description TEXT,data_query TEXT,data_model TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP);',
      (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
        } else {
          console.log('Table "report_models" created or already exists.');
        }
      }
    );    
  }   
});
   
module.exports = db;