import fs from 'fs';
import Promise from 'bluebird';
import { Writable } from 'stream';

import logger from '../logger';
// import { 
//   FILE_UPLOAD_MAXBLOB 
// } from '../../config';

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

const streamingSession = ( path, fsstats, dbx ) => {
  let 
    session_id, 
    offset = 0;
  const dbxOutStream = new Writable({
    async write(chunk, encoding, callback) {
      const isFirstChunk = offset == 0;
      const isLastChunk = offset + chunk.length == fsstats.size;

      try {
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
          const commit = { path, mode: 'add', autorename: true, mute: false };
          const metadata = await dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: chunk });
          logger.info( `Uploaded last chunk: ${JSON.stringify(metadata, null, 2)}` );

        } else {  
          // Append part to the upload session
          const cursor = { session_id, offset };
          await dbx.filesUploadSessionAppendV2({ cursor, close: false, contents: chunk });
          offset += chunk.length;
          logger.info( `Uploaded ${offset}/${fsstats.size}` );
        } 
        callback();

      } catch (error){
        callback( error );
      }
    }
  });
  return dbxOutStream;
};

export default streamingSession;