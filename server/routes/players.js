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
  console.log('newPlayer post: ', req.body);
  var newPlayerObject = req.body;

  // db query
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('INSERT INTO players_in_game(player_name, room_id, mySocket_id) VALUES ($1, $2, $3);',
      [newPlayerObject.player_name, newPlayerObject.roomId, newPlayerObject.mySocketId], function(err, result) {
        done();
        if(err){
          console.log(err);
          res.sendStatus(500);
        }else{
          res.sendStatus(201);
          console.log('result post', result.rows);
        }
      });
    }
  });
});

router.post('/findGame', function(req,res){
  var cardObject = req.body;
  console.log('here is the post body -> ', req.body);
  // console.log('here is the post id', req.body.gameId);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('SELECT game_init.id FROM game_init right OUTER JOIN players_in_game ON game_init.room_id = players_in_game.room_id WHERE game_init.room_id = $1 LIMIT 1;',
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





module.exports = router;
