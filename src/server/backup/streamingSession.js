import { Buffer } from 'Buffer';
import { Writable } from 'stream';

import logger from '../logger';
import { 
  FILE_UPLOAD_MAXBLOB 
} from '../../config';

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

const finishSession = async ( dbx, path, session_id, offset, contents ) => {
  const cursor = { session_id, offset  };
  const commit = { path, mode: 'add', autorename: true, mute: false };
  const metadata = await dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents });
  return metadata;
};

const streamingSession = ( path, fsstats, dbx ) => {
  
  let 
    session_id, 
    offset = 0,
    bytesRead = 0,
    chunkSet = [],
    chunkSetLength = 0;
  const close = false;

  //Edge case: What if chunk.length > FILE_UPLOAD_MAXBLOB? Needs to be greater than readable.highwatermark .
  const dbxOutStream = new Writable({
    async write( chunk, encoding, callback ) {
      const isFirstChunkSet = offset == 0;
      const isLastChunk = bytesRead + chunk.length == fsstats.size;
      bytesRead += chunk.length;
      
      if( !isLastChunk && chunkSetLength + chunk.length <= FILE_UPLOAD_MAXBLOB ) {
        // The chunkSet isn't ready to upload yet
        chunkSet.push( chunk );
        chunkSetLength += chunk.length;
        return callback();
      }

      // The chunkSet is big enough to upload
      try {
        
        if ( isFirstChunkSet ) {
          // Starting multipart upload of file
          const contents = Buffer.concat( chunkSet );
          const dbxResponse = await dbx.filesUploadSessionStart({ close, contents });
          session_id = dbxResponse.session_id;
          offset += contents.length;
          logger.info( `Beginning multi part upload session: ${session_id}` );

          if( isLastChunk ){
            const metadata = await finishSession( dbx, path, session_id, offset, chunk );
            offset += chunk.length;
            logger.info( `Uploaded last chunk: ${JSON.stringify(metadata, null, 2)}` );

          } else {
            chunkSet = [ chunk ];
            chunkSetLength = chunk.length;
          }

        } else if( isLastChunk ) {
          const contents = Buffer.concat( chunkSet.concat( chunk ) );
          const metadata = await finishSession( dbx, path, session_id, offset, contents );
          offset += contents.length;
          logger.info( `Uploaded last chunk: ${JSON.stringify(metadata, null, 2)}` );

        } else {  
          // Append part to the upload session
          const contents = Buffer.concat( chunkSet );
          const cursor = { session_id, offset };
          await dbx.filesUploadSessionAppendV2({ cursor, close, contents });
          offset += chunkSetLength;  
          chunkSet = [ chunk ];
          chunkSetLength = chunk.length;
        }
        logger.info( `Uploaded ${offset}/${fsstats.size}` );
        callback();

      } catch (error){
        callback( error );
      }
    }
  });
  return dbxOutStream;
};

export default streamingSession;