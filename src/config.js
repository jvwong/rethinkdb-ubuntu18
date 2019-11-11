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
export const RETHINKDB_DUMP_CRON_SCHEDULE = env('RETHINKDB_DUMP_CRON_SCHEDULE', '10 * * * * *');

// Data directories
export const BACKUPS_DIRECTORY = env('DATA_DIRECTORY', './backups');
export const DATABASE_NAME = env('DATABASE_NAME', 'factoid');

// Storage providers
export const DROPBOX_ACCESS_TOKEN = env('DROPBOX_ACCESS_TOKEN', '');
// export const FILE_UPLOAD_THRESHOLD = env('DROPBOX_UPLOAD_THRESHOLD', 150 * 1024 * 1024 );
export const FILE_UPLOAD_THRESHOLD = env('DROPBOX_UPLOAD_THRESHOLD', 1 );
export const FILE_UPLOAD_MAXBLOB = env('DROPBOX_UPLOAD_MAXBLOB', 8 * 1000 * 1000 );