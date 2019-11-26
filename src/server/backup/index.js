import _ from 'lodash';
import path from 'path';
import { spawn } from 'child_process';

import logger from '../logger';
import { DATABASE_NAME, BACKUPS_DIRECTORY } from '../../config';
import provider from './dropbox';

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
    '-c': 'localhost:28015',
    '-f': `${DATABASE_NAME}_dump_${getDateTime()}.tar.gz`,
    '-e': DATABASE_NAME,
    '--clients': 3,
    '--temp-dir': path.resolve( BACKUPS_DIRECTORY )
  };
  opts = _.defaultsDeep( {}, opts, dumpOpts );
  const spawnArgs = _.flattenDeep( [ 'dump' ].concat( _.toPairs( opts ) ) );
  const spawnOpts = { cwd: path.resolve( BACKUPS_DIRECTORY ) };

  const dbDump = spawn( CMD, spawnArgs , spawnOpts );

  return new Promise( ( resolve, reject ) => {

    dbDump.on( 'exit', code => {
      const message = `Exited with code ${code}`;
      
      if( code ){
        logger.error( message );
        reject( message );

      } else {
        logger.info( message );
        const { cwd: dumpDirectory } = spawnOpts;
        const { '-f': dumpFile } = opts;
        const path = '/' + dumpFile;
        
        // should return immediately
        provider.upload( dumpDirectory, dumpFile, path )
          .then( () => resolve( message ) )
          .catch( error => reject( error ) );
      }
    });
    
    dbDump.on( 'error', error => reject( error ) );

    // Log any and all messages 
    dbDump.stdout.on( 'data', data => logger.info( `${data}` ) );
    dbDump.stderr.on( 'data', data => logger.error( `${data}` ) );

  });
};

export default backup;