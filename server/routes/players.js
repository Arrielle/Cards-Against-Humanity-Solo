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

router.post('/newPlayer', function(req, res) {
  // console.log('newPlayer post: ', req.body);
  var newPlayerObject = req.body;

  // db query
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('INSERT INTO players_in_game(player_name, room_id, mySocket_id) VALUES ($1, $2, $3);',
      [newPlayerObject.playerName, newPlayerObject.roomId, newPlayerObject.mySocketId], function(err, result) {
        done();
        if(err){
          console.log(err);
          res.sendStatus(500);
        }else{
          res.sendStatus(201);
          // console.log('result post', result.rows);
        }
      });
    }
  });
});

router.post('/findAllPlayers', function(req,res){
  var gameId = req.body.gameId;
  // console.log('here is the post body -> ', req.body.gameId);
  // console.log('here is the post id', req.body.gameId);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('SELECT * FROM players_in_game WHERE game_id = $1;',
        [gameId], function(err, result) {
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

//SETS THE GAME ID EQUAL TO THE DATABASE ID
router.put('/addPlayersToGame', function(req,res){
  var roomId = req.body.roomId;
  console.log('here is the players post body -> ', roomId);
  // console.log('here is the post id', req.body.gameId);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('UPDATE players_in_game AS p SET game_id = g.id FROM game_init AS g WHERE p.room_id = g.room_id AND g.room_id = $1 RETURNING g.id;',
        [roomId], function(err, result) {
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



module.exports = router;
