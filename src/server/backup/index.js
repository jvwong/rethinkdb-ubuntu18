import _ from 'lodash';
import path from 'path';
import { spawn } from 'child_process';

import logger from '../logger';
import { DATABASE_NAME, BACKUPS_DIRECTORY } from '../../config';

const handleExit = ( code, signal, opts ) => {
  if( code || signal ) return;  
  logger.info( `RethinkDB dump process exited OK` );
};

const handleError = error => {
  logger.error( `Subprocess error: ${error}` );
};

const getDateTime = () => new Date().toISOString().replace(/:|\./g, "-");

/**
 * backup
 * 
 * @param {Object} opts See {@link https://rethinkdb.com/docs/backup/}
 * @param {String} opts.export The 'database.table'
 */
const backup = opts => {

  const CMD = 'rethinkdb';
  const dumpOpts = {
    '-e': DATABASE_NAME,
    '-f': `${DATABASE_NAME}_dump_${getDateTime()}.tar.gz`
  };
  opts = _.defaultsDeep( {}, opts, dumpOpts );
  const spawnArgs = _.flattenDeep( [ 'dump' ].concat( _.toPairs( opts ) ) );
  const spawnOpts = { cwd: path.resolve( BACKUPS_DIRECTORY ) };

  const subprocess = spawn( CMD, spawnArgs , spawnOpts );
  subprocess.on( 'exit', ( code, signal ) => handleExit( code, signal, opts ) );
  subprocess.on( 'error', handleError );
  subprocess.stderr.on( 'data', data => {
    logger.error( data.toString() );
  });

  return subprocess.stderr;
};

export default backup;