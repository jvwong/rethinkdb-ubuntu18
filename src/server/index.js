import express from 'express';
import morgan from 'morgan';
import logger from './logger';
import bodyParser from 'body-parser';
import http from 'http';
import stream from 'stream';
// import cron from 'node-cron';

import RoutesApi from './routes/api';
import * as config from '../config';
// import backupCron from './backup';

// cron.schedule( config.RETHINKDB_DUMP_CRON_SCHEDULE, () => {
  // backupCron();
// });

let app = express();
let server = http.createServer(app);

app.use(morgan('dev', {
  stream: new stream.Writable({
    write( chunk, encoding, next ){
      logger.info( chunk.toString('utf8').trim() );

      next();
    }
  })
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// define http routes
app.use( '/api', RoutesApi );
// app.use( '/', RoutesIndex );

app.set( 'port', config.PORT );

server.on( 'error', onError );
server.on( 'listening', onListening );

server.listen( config.PORT );
server.on( 'error', onError );
server.on( 'listening', onListening );

function onError(error) {
  if ( error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof config.PORT === 'string'
    ? 'Pipe ' + config.PORT
    : 'Port ' + config.PORT;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  let addr = server.address();
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.debug('Listening on ' + bind);
}

export default app;
