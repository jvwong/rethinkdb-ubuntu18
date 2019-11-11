import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import Promise from 'bluebird';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';

import logger from '../logger';
import { 
  DROPBOX_ACCESS_TOKEN, 
  FILE_UPLOAD_THRESHOLD,
  FILE_UPLOAD_MAXBLOB } from '../../config';

const readFile = Promise.promisify( fs.readFile );
const stat = Promise.promisify( fs.stat );

const dropBoxUpload = async ( directory, filename ) => {
  const filePath = path.resolve( directory, filename );
  const dbxOpts = {
    fetch, 
    accessToken: DROPBOX_ACCESS_TOKEN 
  };
  const dbx = new Dropbox( dbxOpts );

  try {
    const fsstats = await stat( filePath );
    
    if ( fsstats.size < FILE_UPLOAD_THRESHOLD ) { 
      // filesUpload API
      logger.info( `File below FILE_UPLOAD_THRESHOLD` );
      const file = await readFile( filePath ); 
      const dbxResponse = await dbx.filesUpload({ path: '/' + filename, contents: file });
      logger.info( dbxResponse );

    } else {
      // filesUploadSession* API
      logger.info( `File above FILE_UPLOAD_THRESHOLD` );
      const fileStream = await fs.createReadStream( filePath ); 

      fileStream.on( 'data', chunk => {
        logger.info( `Received ${chunk.length} bytes` );
      });
      
      fileStream.on( 'end', () => {
        logger.info( `Stream end` );
      });
    }
  
  } catch (e) {
    logger.error( `Error uploading: ${e}` );
    throw e;
  }
};

const upload = ( directory, filename ) => dropBoxUpload ( directory, filename );

const dropbox = {
  upload
};

export default dropbox;