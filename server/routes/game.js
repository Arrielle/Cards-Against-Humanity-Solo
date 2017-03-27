var router = require('express').Router();
var pg = require('pg');
var config = {
  database: 'cardsagainsthumanity',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
};

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
