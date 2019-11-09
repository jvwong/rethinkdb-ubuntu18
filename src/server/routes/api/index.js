import Express from 'express';

let http = Express.Router();

http.get('/', function( req, res, next ){
  res.end('ok');
});

export default http;