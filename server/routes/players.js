const router = require('express').Router();
const pg = require('pg');
const config = require('../modules/database-config');
const pool = new pg.Pool(config);


//
// router.post('/findAllPlayers', function(req,res){
//   var gameId = req.body.gameId;
//   // console.log('here is the post body -> ', req.body.gameId);
//   // console.log('here is the post id', req.body.gameId);
//   pool.connect(function(err, client, done) {
//     if(err){
//       console.log(err);
//       res.sendStatus(500);
//     }else{
//       client.query('SELECT * FROM players_in_game WHERE game_id = $1;',
//         [gameId], function(err, result) {
//           done();
//           if(err){
//             console.log(err);
//             res.sendStatus(500);
//           }else{
//             res.status(201).send(result.rows);
//           }
//       });
//     }
//   });
// });
//
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
