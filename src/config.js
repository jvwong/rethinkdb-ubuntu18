import _ from 'lodash';

const env = ( key, defaultVal ) => {
  if( process.env[key] != null ){
    let val =  process.env[key];

    if( _.isInteger( defaultVal ) ){
      val = parseInt( val );
    }
    else if( _.isBoolean( defaultVal ) ){
      val = JSON.parse( val );
    }

    return val;
  } else {
    return defaultVal;
  }
};

export const PORT = env('PORT', 3000);
export const LOG_LEVEL = env('LOG_LEVEL', 'info');
export const RETHINKDB_DUMP_CRON_SCHEDULE = env('RETHINKDB_DUMP_CRON_SCHEDULE', '30 * * * * *');

// Data directories
export const DATA_DIRECTORY = env('DATA_DIRECTORY', 'data');
export const FACTOID_DATA_DIRECTORY = env('FACTOID_DATA_DIRECTORY', 'factoid');

// Storage providers
export const DROPBOX_ACCESS_TOKEN = env('DROPBOX_ACCESS_TOKEN', '');