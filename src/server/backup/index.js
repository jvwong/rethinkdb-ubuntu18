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
    '-e': DATABASE_NAME,
    '-f': `${DATABASE_NAME}_dump_${getDateTime()}.tar.gz`
  };
  opts = _.defaultsDeep( {}, opts, dumpOpts );
  const spawnArgs = _.flattenDeep( [ 'dump' ].concat( _.toPairs( opts ) ) );
  const spawnOpts = { cwd: path.resolve( BACKUPS_DIRECTORY ) };

  const dbDump = spawn( CMD, spawnArgs , spawnOpts );

  return new Promise( ( resolve, reject ) => {

    dbDump.on( 'exit', ( code, signal ) => {
      const message = `Exited with ${code} and signal ${signal}`;
      logger.info( message );

      if( code || signal ){
        reject( message );

      } else {

        const { cwd: dumpDirectory } = spawnOpts;
        // const { '-f': dumpFile } = opts;
        const dumpFile = 'PathwayCommons12.intact.hgnc.txt.gz';

        //this should resolve  immediately and let provider run in background.
        provider.upload( dumpDirectory, dumpFile )
          .then( () => resolve( message ) )
          .catch( error => reject( error ) );
      }
    });
    
    dbDump.on( 'error', error => {
      logger.error( `Subprocess error: ${error}` );
      reject( error );
    });

    // Log any and all messages 
    dbDump.stdout.on( 'data', data => logger.info( `${data}` ) );

    dbDump.stderr.on( 'data', data => {
      logger.error( `${data}` );
      reject( data );
    });

  });
};

export default backup;