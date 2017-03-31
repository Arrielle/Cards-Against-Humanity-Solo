var router = require('express').Router();
var pg = require('pg');

var router = require('express').Router();
var pg = require('pg');
var url = require('url');

if(process.env.DATABASE_URL) {
 var params = url.parse(process.env.DATABASE_URL);
 var auth = params.auth.split(':');

 var config = {
   user: auth[0],
   password: auth[1],
   host: params.hostname,
   port: params.port,
   database: params.pathname.split('/')[1],
   ssl: true
 };
} else {
  var config = {
    database: 'cardsagainsthumanity' || 'postgres://deakcitavmtsug:7194bb474de3bde1b02ee11e5ae22ceac86dda76098a23a83d81cedc530372e3@ec2-54-163-254-76.compute-1.amazonaws.com:5432/dfpj6lsi4kgsis',
    host: 'localhost',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000
  };
}

var pool = new pg.Pool(config);


router.post('/newGame', function(req, res) {
  console.log('hit post route');
  console.log('here is the body ->', req.body);

  var newGameObject = req.body;

  // db query
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('INSERT INTO game_user (username) VALUES ($1) returning id;',
        [newGameObject.gameId], function(err, result) {
          done();
          if(err){
            console.log(err);
            res.sendStatus(500);
          }else{
            res.status(201).send(result.rows);
            console.log('result post', result.rows);
          }
      });
    }
  });
});

module.exports = router;
