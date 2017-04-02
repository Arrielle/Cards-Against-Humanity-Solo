const router = require('express').Router();
const pg = require('pg');
const config = require('../modules/database-config');
const pool = new pg.Pool(config);

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
        [cardObject.gameId], function(err, result) {
          done();
          if(err){
            console.log(err);
            res.sendStatus(500);
          }else{
            res.status(201).send(result.rows);
            // console.log('white cards', result.rows);

          }
      });
    }
  });
});
//
// router.post('/postWhiteCards', function(req, res) {
//   var cardObject = req.body;
//   pool.connect(function(err, client, done) {
//     if(err){
//       console.log(err);
//       res.sendStatus(500);
//     }else{
//       client.query('INSERT INTO game_white_cards (game_id, white_id) VALUES ($1, $2);',
//         [cardObject.gameId, cardObject.cardId.id], function(err, result) {
//           done();
//           if(err){
//             console.log(err);
//             res.sendStatus(500);
//           }else{
//             res.sendStatus(201);
//           }
//       });
//     }
//   });
// });

module.exports = router;
