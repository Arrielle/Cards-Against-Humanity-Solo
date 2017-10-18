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

router.post('/allWhiteCards', function(req,res){
  var cardObject = req.body;
  // console.log('here is the post body -> ', req.body);
  // console.log('here is the post id', req.body.gameId);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('WITH  allgamecards AS (SELECT * FROM game_white_cards WHERE game_white_cards.game_id = $1) SELECT * FROM allgamecards RIGHT OUTER JOIN white_cards ON white_cards.id = allgamecards.white_id WHERE game_id IS NULL AND white_cards.played = false ORDER BY RANDOM();',
        [cardObject.roomId], function(err, result) {
          done();
          if(err){
            console.log(err);
            res.sendStatus(500);
          }else{
            res.status(201).send(result.rows);
          }
      });
    }
  });
});

router.post('/postWhiteCards', function(req, res) {
  var cardObject = req.body;
  // console.log('card object==>', cardObject);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('INSERT INTO game_white_cards (game_id, white_id) VALUES ($1, $2);',
        [cardObject.roomId, cardObject.cardId.id], function(err, result) {
          done();
          if(err){
            console.log(err);
            res.sendStatus(501);
          }else{
            res.sendStatus(201);
          }
      });
    }
  });
});

module.exports = router;
