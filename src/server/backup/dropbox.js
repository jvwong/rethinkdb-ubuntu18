import fs, { fstat } from 'fs';
import nodepath from 'path';
import Promise from 'bluebird';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import streamingSession from './streamingSession';

import logger from '../logger';
import { 
  DROPBOX_ACCESS_TOKEN, 
  FILE_UPLOAD_THRESHOLD
} from '../../config';

const readFile = Promise.promisify( fs.readFile );
const stat = Promise.promisify( fs.stat );

const upload2DropBox = async ( directory, filename ) => {
  const path = '/' + filename;
  const filePath = nodepath.resolve( directory, filename );
  const dbxOpts = {
    fetch, 
    accessToken: DROPBOX_ACCESS_TOKEN 
  };
  const dbx = new Dropbox( dbxOpts );

  try {
    const fsstats = await stat( filePath );
    
    if ( fsstats.size < FILE_UPLOAD_THRESHOLD ) { 
      // filesUpload API
      logger.info( `File below FILE_UPLOAD_THRESHOLD: ${fsstats.size}` );
      const file = await readFile( filePath ); 
      const dbxResponse = await dbx.filesUpload({ path, contents: file });
      logger.info( dbxResponse );

    } else {
      // filesUploadSession* API
      // It is a requirement that FILE_UPLOAD_THRESHOLD > FILE_UPLOAD_MAXBLOB
      logger.info( `File above FILE_UPLOAD_THRESHOLD: ${fsstats.size}` );
      const fileReadStream = await fs.createReadStream( filePath );
      const dropboxStream = streamingSession( path, fsstats, dbx );
      // dropboxStream.on( 'close', () => { logger.info(`close`); });
      // dropboxStream.on( 'finish', () => { logger.info(`finish`); });
      dropboxStream.on( 'error', error => { throw error; });
      fileReadStream.pipe( dropboxStream ); 
      return 'done';
    }
  
  } catch (e) {
    logger.error( `Error uploading: ${e}` );
    throw e;
  }
};

const upload = ( directory, filename ) => upload2DropBox ( directory, filename );

const dropbox = {
  upload
};

export default dropbox;