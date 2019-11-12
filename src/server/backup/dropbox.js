import fs, { fstat } from 'fs';
import path from 'path';
import Promise from 'bluebird';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';

import logger from '../logger';
import { 
  DROPBOX_ACCESS_TOKEN, 
  FILE_UPLOAD_THRESHOLD,
  FILE_UPLOAD_MAXBLOB 
} from '../../config';

const readFile = Promise.promisify( fs.readFile );
const stat = Promise.promisify( fs.stat );

const getSubChunks = chunk => {
  const subChunks = [];
  let offset = 0;
  while ( offset < chunk.length ) {
    var subChunkSize = Math.min( FILE_UPLOAD_MAXBLOB, chunk.length - offset );
    subChunks.push( chunk.slice( offset, offset + subChunkSize ) );
    offset += subChunkSize;
  }
  return subChunks; 
};

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
      logger.info( `File below FILE_UPLOAD_THRESHOLD` );
      const file = await readFile( filePath ); 
      const dbxResponse = await dbx.filesUpload({ path: '/' + filename, contents: file });
      logger.info( dbxResponse );

    } else {
      // filesUploadSession* API
      logger.info( `File above FILE_UPLOAD_THRESHOLD` );
      let session_id,
        offset = 0;

      const fileStream = await fs.createReadStream( filePath ); 
      
      fileStream.on( 'ready', () => logger.info( `Stream is ready` ) );
      fileStream.on( 'end', () => logger.info( `File data read successfully.` ) );      
      fileStream.on( 'data', async function( chunk ) {
        const subChunks = getSubChunks( chunk );
        logger.info( `Got ${chunk.length} bytes` );
        for( const subChunk of subChunks ){
          logger.info( `subChunk.length: ${subChunk.length}` );
          logger.info( `offset: ${offset}` );
          logger.info( `session_id: ${session_id}` );
            

          const isFirstSubChunk = offset == 0;
          const isLastSubChunk = offset + subChunk.length == fsstats.size;

          // Edge case: isFirstSubChunk && isLastSubChunk
          if ( isFirstSubChunk ) {
            logger.info( `isFirstSubChunk` );
            // Starting multipart upload of file
            session_id = await dbx.filesUploadSessionStart({ close: false, contents: subChunk });
            offset += subChunk.length;
            console.log('hey!');
            logger.info( `offset after incrementing: ${offset}` );
  
          } else if( isLastSubChunk ) {
            logger.info( `isLastSubChunk` );
            // Last chunk of data, close session
            const cursor = { session_id, offset  };
            const commit = { path: uploadPath, mode: 'add', autorename: true, mute: false };
            await dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: subChunk });
            console.log('hoo!');
            
          } else {  
            logger.info( `is next subChunk` );
            // Append part to the upload session
            const cursor = { session_id, offset };
            await dbx.filesUploadSessionAppendV2({ cursor, close: false, contents: blob });
            offset += subChunk.length;
            console.log('hee!');
            logger.info( `offset after incrementing: ${offset}` );
          } 
        }
       // logger.info( `Uploaded ${offset} bytes of ${fsstats.size}` );
      });

      
      return new Promise( ( resolve, reject ) => {
        fileStream.on( 'error', error => {
          logger.info( `Error reading data from file: ${error}` );
          reject( error );
        });

        fileStream.on( 'close', () => {
          logger.info( `Data file closed successfully.` );
          resolve( fileStream.path );
        });
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