import { Writable } from 'stream';

import logger from '../logger';
import { 
  FILE_UPLOAD_MAXBLOB 
} from '../../config';

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

  const dbxOutStream = new Writable({
    async write( chunk, encoding, callback ) {
      bytesRead += chunk.length;
      const isFirstChunkSet = offset == 0;
      const isLastChunk = bytesRead == fsstats.size;
      
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

  if( FILE_UPLOAD_MAXBLOB < dbxOutStream.writableHighWaterMark ){
    // Edge case: Allowing chunks that could exceed FILE_UPLOAD_MAXBLOB
    throw new Error( 'FILE_UPLOAD_MAXBLOB cannot be lower than streamingSessio\'s writableHighWaterMark' );
  } else {
    return dbxOutStream;
  }
};

export default streamingSession;