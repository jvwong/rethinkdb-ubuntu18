import fs, { fstat } from 'fs';
import path from 'path';
import Promise from 'bluebird';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import { Writable } from 'stream';

import logger from '../logger';
import { 
  DROPBOX_ACCESS_TOKEN, 
  FILE_UPLOAD_THRESHOLD,
  FILE_UPLOAD_MAXBLOB 
} from '../../config';

const readFile = Promise.promisify( fs.readFile );
const stat = Promise.promisify( fs.stat );

let offset = 0;
let session_id;


// const getSubChunks = chunk => {
//   const subChunks = [];
//   let offset = 0;
//   while ( offset < chunk.length ) {
//     var subChunkSize = Math.min( FILE_UPLOAD_MAXBLOB, chunk.length - offset );
//     subChunks.push( chunk.slice( offset, offset + subChunkSize ) );
//     offset += subChunkSize;
//   }
//   return subChunks; 
// };

const dropBoxUpload = async ( directory, filename ) => {
  const uploadPath = '/' + filename;
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
      logger.info( `File below FILE_UPLOAD_THRESHOLD: ${fsstats.size}` );
      const file = await readFile( filePath ); 
      const dbxResponse = await dbx.filesUpload({ path: '/' + filename, contents: file });
      logger.info( dbxResponse );

    } else {
      // filesUploadSession* API
      // It is a requirement that FILE_UPLOAD_THRESHOLD > FILE_UPLOAD_MAXBLOB
      logger.info( `File above FILE_UPLOAD_THRESHOLD: ${fsstats.size}` );

      
      const fileReadStream = await fs.createReadStream( filePath ); 

      const dropboxStream = new Writable({
        async write(chunk, encoding, callback) {
          const isFirstChunk = offset == 0;
          const isLastChunk = offset + chunk.length == fsstats.size;
          
          // Edge case: isFirstSubChunk && isLastSubChunk
          if ( isFirstChunk ) {
            // Starting multipart upload of file
            const dbxResponse = await dbx.filesUploadSessionStart({ close: false, contents: chunk });
            session_id = dbxResponse.session_id;
            offset += chunk.length;
            logger.info( `Beginning multi part upload session: ${session_id}` );
  
          } else if( isLastChunk ) {
            logger.info( `isLastSubChunk` );
            // Last chunk of data, close session
            const cursor = { session_id, offset  };
            const commit = { path: uploadPath, mode: 'add', autorename: true, mute: false };
            await dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: chunk });
            logger.info( `Uploaded last chunk at: ${uploadPath}` );

          } else {  
            // Append part to the upload session
            const cursor = { session_id, offset };
            await dbx.filesUploadSessionAppendV2({ cursor, close: false, contents: chunk });
            offset += chunk.length;
            logger.info( `Uploaded ${offset}/${fsstats.size}` );
          } 
          callback();
        }
      });
      dropboxStream.on( 'close', () => { logger.info(`close`); });
      // dropboxStream.on( 'drain', () => { logger.info(`drain`); });
      dropboxStream.on( 'finish', () => { logger.info(`finish`); });
      dropboxStream.on( 'error', error => { logger.error(`error: ${error}`); });
      fileReadStream.pipe( dropboxStream ); 

      return 'done';
  
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