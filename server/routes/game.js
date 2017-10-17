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


// router.post('/newGame', function(req, res) {
//   var newGameObject = req.body;
//   console.log('req.body newGameObject-->', newGameObject);
//   // db query
//   pool.connect(function(err, client, done) {
//     if(err){
//       console.log(err);
//       res.sendStatus(500);
//     }else{
//       client.query('INSERT INTO game_init (room_id, hostsocket_id, whitecardsrequired, cardstopick, currentround, pointstowin) VALUES ($1, $2, $3, $4, $5, $6) returning id;',
//       [newGameObject.roomId, newGameObject.hostSocket, newGameObject.whiteCardsReq, newGameObject.cardsToPick, newGameObject.currentRound, newGameObject.pointsToWin], function(err, result) {
//         done();
//         if(err){
//           console.log(err);
//           res.sendStatus(500);
//         }else{
//           res.status(201).send(result.rows);
//           console.log('result post', result.rows);
//         }
//       });
//     }
//   });
// });
router.post('/playerJoin', function(req, res) {
  req.body
  console.log('req.body', req.body);

  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('INSERT INTO players_in_game (player_name, room_id, game_id mysocket_id, score) VALUES ($1, $2, $3, $4) returning id;',
      [req.body.playerName, req.body.gameId, req.body.databaseId, req.body.mySocketId, req.body.score], function(err, result) {
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
