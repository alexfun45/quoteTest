import ADOSQLite from './ADOSQLite.js'

let instance = null;

export const getDBInstance = () => {
  if (!instance) {
    instance = new ADOSQLite();
  }
  return instance;
}