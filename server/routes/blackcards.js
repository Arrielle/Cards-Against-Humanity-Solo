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

router.post('/allBlackCards', function(req,res){
  var cardObject = req.body;
  // console.log('here is the post body -> ', req.body);
  // console.log('here is the post id', req.body.gameId);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('WITH  allgamecards AS (SELECT * FROM game_black_cards WHERE game_black_cards.game_id = $1) SELECT * FROM allgamecards RIGHT OUTER JOIN black_cards ON black_cards.id = allgamecards.black_id WHERE game_id IS NULL AND pick = 1 ORDER BY RANDOM() LIMIT 1;',
        [cardObject.gameId], function(err, result) {
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

// {gameId: self.game.sessionId, cardId: cardId }
router.post('/postBlackCards', function(req, res) {
  var cardObject = req.body;
  // console.log('here is the post card object', req.body);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('INSERT INTO game_black_cards (game_id, black_id) VALUES ($1, $2);',
        [cardObject.gameId, cardObject.cardId], function(err, result) {
          done();
          if(err){
            console.log(err);
            res.sendStatus(500);
          }else{
            res.sendStatus(201);
          }
      });
    }
  });
});

router.get('/blackCards', function(req,res){
  // console.log('I hit my get BLACKcards route?');
  pool.connect(function(err, client, done){
    if(err){
      res.sendStatus(500);
    } else {
      client.query('SELECT * from black_cards ORDER BY RANDOM();', function(err, result){
        done();
        if(err){
          console.log(err);
          res.sendStatus(500);
        } else {
        res.status(200).send(result.rows);
      }
      });
    }
  });
});

module.exports = router;
