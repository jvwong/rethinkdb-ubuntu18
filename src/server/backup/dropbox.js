import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import Promise from 'bluebird';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';

import logger from '../logger';
import { DROPBOX_ACCESS_TOKEN, DROPBOX_UPLOAD_THRESHOLD } from '../../config';

const readFile = Promise.promisify( fs.readFile );
const stat = Promise.promisify( fs.stat );

const upload = async ( directory, filename ) => {

  const filePath = path.resolve( directory, filename );
  const dbxOpts = {
    fetch, 
    accessToken: DROPBOX_ACCESS_TOKEN 
  };
  const dbx = new Dropbox( dbxOpts );

  try {
    const fsstats = await stat( filePath );
    
    if ( fsstats.size < DROPBOX_UPLOAD_THRESHOLD ) { 
      logger.info( `File below DROPBOX_UPLOAD_THRESHOLD` );
      const file = await readFile( path.resolve( directory, filename ) ); 
      const dbxResponse = await dbx.filesUpload({ path: '/' + filename, contents: file });
      logger.info( dbxResponse );

    } else {
      logger.info( `File above DROPBOX_UPLOAD_THRESHOLD` );
    }
  
  } catch (e) {
    logger.error( `Error uploading: ${e}` );
    throw e;
  }
  
  
  

    
  // } else { // File is bigger than 150 Mb - use filesUploadSession* API
  //   const maxBlob = 8 * 1000 * 1000; // 8Mb - Dropbox JavaScript API suggested max file / chunk size
  //   var workItems = [];     
  
  //   var offset = 0;
  //   while (offset < file.size) {
  //     var chunkSize = Math.min(maxBlob, file.size - offset);
  //     workItems.push(file.slice(offset, offset + chunkSize));
  //     offset += chunkSize;
  //   } 
      
  //   const task = workItems.reduce((acc, blob, idx, items) => {
  //     if (idx == 0) {
  //       // Starting multipart upload of file
  //       return acc.then(function() {
  //         return dbx.filesUploadSessionStart({ close: false, contents: blob})
  //                   .then(response => response.session_id)
  //       });          
  //     } else if (idx < items.length-1) {  
  //       // Append part to the upload session
  //       return acc.then(function(sessionId) {
  //        var cursor = { session_id: sessionId, offset: idx * maxBlob };
  //        return dbx.filesUploadSessionAppendV2({ cursor: cursor, close: false, contents: blob }).then(() => sessionId); 
  //       });
  //     } else {
  //       // Last chunk of data, close session
  //       return acc.then(function(sessionId) {
  //         var cursor = { session_id: sessionId, offset: file.size - blob.size };
  //         var commit = { path: '/' + file.name, mode: 'add', autorename: true, mute: false };              
  //         return dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: blob });           
  //       });
  //     }          
  //   }, Promise.resolve());
    
  //   task.then(function(result) {
  //     var results = document.getElementById('results');
  //     results.appendChild(document.createTextNode('File uploaded!'));
  //   }).catch(function(error) {
  //     console.error(error);
  //   });
    
  // }
  // return false;
};

const dropbox = {
  upload
};

export default dropbox;