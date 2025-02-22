import * as constaints from './Constants.js'
import sqlite3 from 'sqlite3'

class ADOSQLite{

    static instance;
    connection;

    constructor(){
        this.connection = new sqlite3.Database(constaints.DB, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
              console.log('Could not connect to database', err)
            } else {
              this.connection.run('CREATE TABLE IF NOT EXISTS messages(id, user, time, message)');
            }
            }
        );
    }

    get(command, params){
      return new Promise((resolve, reject)=>{
        if(this.connection==null) return;
        this.connection.get(command, params, function(err, row){
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      })
    }

    query(command, method){
      return new Promise((resolve, reject)=>{
            try{
              if(this.connection==null) return;
              console.log('command', command);
              this.connection[method](command, (error, result)=>{
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
              })
            }
            catch(error){
              console.log("database query error", error);
            }
        })
  }

  static getInstance() {
    if (!ADOSQLite.instance) {
      ADOSQLite.instance = new ADOSQLite();
    }
    return ADOSQLite.instance;
  }
}

export default ADOSQLite;