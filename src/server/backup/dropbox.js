import fs from 'fs';
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

const stream2DropBox = async ( directory, filename, path ) => {
  const filePath = nodepath.resolve( directory, filename );
  const dbxOpts = {
    fetch,
    accessToken: DROPBOX_ACCESS_TOKEN
  };
  const dbx = new Dropbox( dbxOpts );

  try {
    const fsstats = await stat( filePath );console.log(path);

    if ( fsstats.size < FILE_UPLOAD_THRESHOLD ) {
      // filesUpload API
      logger.info( `File below FILE_UPLOAD_THRESHOLD: ${fsstats.size}` );
      const file = await readFile( filePath );
      const dbxResponse = await dbx.filesUpload({ path, contents: file });
      logger.info( `Upload to Dropbox response ${dbxResponse}` );

    } else {
      // filesUploadSession* API
      // It is a requirement that FILE_UPLOAD_THRESHOLD > FILE_UPLOAD_MAXBLOB
      logger.info( `File above FILE_UPLOAD_THRESHOLD: ${fsstats.size}` );
      const fileReadStream = await fs.createReadStream( filePath );
      const dropboxStream = streamingSession( path, fsstats, dbx );
      dropboxStream.on( 'error', error => { throw error; });
      fileReadStream.pipe( dropboxStream );
      return 'done';
    }

  } catch (e) {
    const error = new Error(e.error);
    logger.error( `Error uploading: ${error}` );
    throw error;
  }
};

const dropbox = {
  upload: stream2DropBox
};

export default dropbox;