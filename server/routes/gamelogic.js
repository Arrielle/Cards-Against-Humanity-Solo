//FOR SOME HARDCODED INFORMATION SEARCH: HARD CODED

const router = require('express').Router();
const pg = require('pg');
const config = require('../modules/database-config');
const pool = new pg.Pool(config);

exports.initGame = function(sio, socket){
  /* **************************
  *                           *
  *       SOCKET CALLS        *
  *                           *
  *****************************/
  io = sio;
  gameSocket = socket;
  //SAYING HI
  gameSocket.emit('connected', { message: "You are connected!" });
  //INITIALIZING GAME
  gameSocket.on('hostCreateNewGame', hostCreateNewGame);
  gameSocket.on('playerJoinGame', playerJoinGame);
  gameSocket.on('cardToJudge', cardsToJudge);

  // gameSocket.on('cardsToJudge', cardsToJudge);
  //POSSIBLY HANDLING PG ERRORS?
  // pool.on('error', function(e, client) {
  //   console.log('Pool Error...');
  // });
  /* ****************************************
  *                                         *
  *              GAME INIT                  *
  *       ON CREATE A NEW GAME CLICK        *
  *                                         *
  **************************************** */
  // The 'START' button was clicked and 'hostCreateNewGame' event occurred.
  function hostCreateNewGame() {
    // Create a unique Socket.IO Room
    var thisRoomId = ( Math.random() * 100000 ) | 0;
    var hostSocketId = this.id;
    // Join the Room and wait for the players
    this.join(thisRoomId.toString());
    // Send the host to the database.
    pool.query('INSERT INTO game_init (room_id, hostSocket_id) VALUES ($1, $2) returning id;', [thisRoomId, hostSocketId]);
    this.emit('gameInitView', thisRoomId);
  };
  /* ***********************************
  *                                    *
  *             GAME INIT              *
  *       PLAYER JOINED FUNCTIONS      *
  *                                    *
  ************************************ */
  // A player clicked the 'JOIN!' button.
  // Attempt to connect them to the room that matches the gameId entered by the player.
  function playerJoinGame(player) {
    var room = gameSocket.adapter.rooms[player.roomId]; //the room that the player is joining
    var playerName = player.playerName; //The players name
    var maxRoomSize = 2; //HARD CODED
    if( room != undefined && room.length <= maxRoomSize){ //check the room to see if it exists and whether or not it is full.
      console.log(room.length, '||', maxRoomSize);
      console.log('1 The room exists! Entering room ', player.roomId,'.');
      player = {mySocketId: this.id, roomId: player.roomId, playerName: player.playerName} //player object to pass to queries
      // Join the room
      this.join(player.roomId);
      // Emit an event notifying the clients that the player has joined the room
      io.sockets.in(player.roomId).emit('playerJoinedRoom', player);
      // Initialzes the game data via database queries
      addPlayersToGame(player);
    } else if (room == undefined){ //The room does not exist.
      console.log('The cake is a lie.');
      this.emit('errorAlert', {message: "Sorry about that! It looks like this room does not exist."} );
    } else if (room.length > maxRoomSize){ //The room is full.
      this.emit('errorAlert', {message: "Sorry, but this room is full!"})
    }
  }

  function addPlayersToGame(player){
    //~.:------------>INSERTING THE PLAYER INTO THE PLAYERS TABLE<------------:.~//
    pool.query('INSERT INTO players_in_game(player_name, room_id, mySocket_id) VALUES ($1, $2, $3);',
    [player.playerName, player.roomId, player.mySocketId], function(err, result) {
      //~.:------------>UPDATES THE USERS GAME ID<------------:.~//
      pool.query('UPDATE players_in_game AS p SET game_id = g.id FROM game_init AS g WHERE p.room_id = g.room_id AND g.room_id = $1 RETURNING g.id;',
      [player.roomId], function(err, result) {
        gameId = result.rows[0].id;
        findAllPlayersInGame(gameId);
      });
    });
  }

  function findAllPlayersInGame(gameId){
    //~.:------------>DETERMINES HOW MANY PLAYERS ARE IN THE GAME<------------:.~//
    pool.query('SELECT COUNT(*) FROM game_init LEFT OUTER JOIN players_in_game ON game_init.id = players_in_game.game_id WHERE game_id = $1;',
    [gameId], function(err, result) {
      console.log('game count Should be hit twice... ', result.rows[0].count);
      playersInGame = result.rows[0].count;
      //~.:------------>IF MAX PLAYERS HAVE JOINED THE GAME IT'S TIME TO PULL THE GAME DATA<------------:.~//
      if(playersInGame == 2){ //HARD CODED
        accessingGameData(gameId)
      }
    });
  }

  function accessingGameData(gameId){
    //~.:------------>RETRIEVE GAME DATA<------------:.~//
    pool.query('SELECT * FROM game_init LEFT OUTER JOIN players_in_game ON game_init.id = players_in_game.game_id WHERE game_id = $1;',
    [gameId], function(err, result) {
      gameSettings = {
        gameId: gameId,
        roomId: result.rows[0].room_id,
        hostSocketId: result.rows[0].hostsocket_id,
        currentBlackCard: result.rows[0].currentblackcard_id,
        whiteCardsRequired: result.rows[0].whitecardsrequired,
        cardsToPick: result.rows[0].cardstopick,
        currentRound: result.rows[0].currentround,
        pointsToWin: result.rows[0].pointstowin,
        isStarted: result.rows[0].isstarted,
        isOver: result.rows[0].isover,
        numberOfPlayers: 2 //hard coded
      }
      //~.:------------>PLAYER SCHEMA<------------:.~//
      var players = [];
      for (var i = 0; i < result.rows.length; i++) {
        players[i] = {
          playerName: result.rows[i].player_name,
          gameId: gameId,
          mySocketId: result.rows[i].mysocket_id,
          score: result.rows[i].score,
          isCzar: result.rows[i].isczar,
          isReady: result.rows[i].isready,
          isRoundWinner: result.rows[i].isroundwinner,
          isGameWinner: result.rows[i].isgamewinner,
          cardsInHand: [],
        }
      }
      //SET THE CZAR // UPDATE VIEWS
      drawWhiteCardDeck(gameSettings, players); //LET PLAYERS KNOW
      drawBlackCard(gameSettings, players); //LET PLAYERS KNOW
      // for (var i = 0; i < players.length; i++) {
      //   io.to(players[i].mySocketId).emit('showPlayerView');
      // }
      io.to(gameSettings.hostSocketId).emit('gameStartHost', players);
    });
  }

  //****************************//
  //                            //
  //    White Card Functions    //
  //                            //
  //****************************//
  //~.:------------>DRAW WHITE CARDS AT RANDOM<------------:.~//
  function drawWhiteCardDeck(gameSettings, players){ //Give this function the player array
    gameId = gameSettings.gameId;
    pool.query('WITH  allgamecards AS (SELECT * FROM game_white_cards WHERE game_white_cards.game_id = $1) SELECT * FROM allgamecards RIGHT OUTER JOIN white_cards ON white_cards.id = allgamecards.white_id WHERE game_id IS NULL AND white_cards.played = false ORDER BY RANDOM();',
    [gameId], function(err, result) {
      var whiteCardDeck = result.rows; //this is the shuffled deck of white cards
      for (var i = 0; i < players.length; i++) { //loops through the player array
        var cardsToDraw = gameSettings.whiteCardsRequired - players[i].cardsInHand.length; //sets the number of cards to draw based on how many are needed
        player = players[i];
        addCardsToHand(cardsToDraw, whiteCardDeck, player, gameSettings);//takes white cards from the shuffled white deck based on num needed
        cards = players[i].cardsInHand; //sets cards to the current players hand of cards.
        for (var j = 0; j < cards.length; j++) { //loops through the players cards and adds them to the database one at a time
          removeWhiteCardsFromDeck(cards[j].id, gameId); //This adds cards to my database so that I can compare later to ensure no cards that have already been drawn are drawn again.
        }
      }
      setCzar(gameSettings, players); //LET THE PLAYERS KNOW . . .
    });
  }
  // ~.:------------>ADD CARDS TO THE PLAYER OBJECT<------------:.~//
  function addCardsToHand(cardsToDraw, whiteCardDeck, player, gameSettings) {
    for (i = 0; i < cardsToDraw; i++) {
      var whiteIndex = Math.floor(Math.random() * whiteCardDeck.length); //selects a white card from the deck at random
      player.cardsInHand.push(whiteCardDeck[whiteIndex]); //pushes the random card into the players hand
      whiteCardDeck.splice(whiteIndex, 1); //Removes the random card from the shuffled deck.
    }
    for (var i = 0; i < player.cardsInHand.length; i++) {
      player.cardsInHand[i].gameId = gameSettings.gameId;
      player.cardsInHand[i].roomId = gameSettings.roomId;
      player.cardsInHand[i].playerName = player.playerName;
      player.cardsInHand[i].relatedSocket = player.mySocketId;
      addCardToDatabaseHand(player.cardsInHand[i].id, player.cardsInHand[i].text, gameSettings.gameId, player.mySocketId);
    }
    io.to(player.mySocketId).emit('drawWhiteCards', player);
  }
  //~.:------------>REMOVE THE CARDS FROM THE DECK<------------:.~//
  function removeWhiteCardsFromDeck(cardId, gameId){
    pool.query('INSERT INTO game_white_cards (game_id, white_id) VALUES ($1, $2);',
    [gameId, cardId], function(err, result) {
    });
  }

  function addCardToDatabaseHand(cardId, cardText, gameId, playerSocket){
    pool.query('INSERT INTO player_cards_in_hand(card_id, card_text, game_id, player_socket) VALUES ($1, $2, $3, $4);',
    [cardId, cardText, gameId, playerSocket], function(err, result) {
    });
  }
  //****************************//
  //                            //
  //    Black Card Functions    //
  //                            //
  //****************************//
  //~.:------------>DRAW A BLACK CARD<------------:.~//
  function drawBlackCard(gameSettings, players){
    gameId = gameSettings.gameId;
    pool.query('WITH  allgamecards AS (SELECT * FROM game_black_cards WHERE game_black_cards.game_id = $1) SELECT * FROM allgamecards RIGHT OUTER JOIN black_cards ON black_cards.id = allgamecards.black_id WHERE game_id IS NULL AND pick = 1 ORDER BY RANDOM() LIMIT 1;',
    [gameId], function(err, result) {
      var currentBlackCard = result.rows[0];
      blackCardId = result.rows[0].id;
      blackCardText = result.rows[0].text;
      //emit the black card to the sockets as well as the host.
      //change the currentblackcard in the games settings (database)?
      //remove the black card from the deck.
      removeBlackCardFromDeck(blackCardId, gameId);
      updateCurrentBlackCardInDatabase(blackCardText, gameId);
      //send the black card info to ALL players.
      io.sockets.in(gameSettings.roomId).emit('drawNewBlackCard', blackCardText); //ok
    });
  }
  //~.:------------>REMOVE BLACK CARD FROM 'DECK'<------------:.~//
  function removeBlackCardFromDeck(blackCardId, gameId){
    pool.query('INSERT INTO game_black_cards (game_id, black_id) VALUES ($1, $2);',
    [gameId, blackCardId], function(err, result) {
    });
  }
  //~.:------------>ADD BLACK CARD TO 'GAME SETTINGS'<------------:.~//
  function updateCurrentBlackCardInDatabase(blackCardText, gameId){
    // console.log('blackcard', blackCardText, gameId);
    pool.query('UPDATE game_init SET currentBlackCard_id = $1 WHERE id = $2;',
    [blackCardText, gameId], function(err, result) {
      // console.log('UPDATE', err, result);
    });
  }
  /* **************************
  *                           *
  *       CZAR FUNCTIONS      *
  *                           *
  ***************************** */

  //SET THE CZAR ON THE CLIENT SIDE.
  function setCzar(gameSettings, players) { //hard coded
    if (players[0].isCzar){
      players[0].isCzar = false;
      players[1].isCzar = true;
      io.to(players[0].mySocketId).emit('czarView', false);
      currentCzar = players[1]
    } else if (players[1].isCzar){
      players[1].isCzar = false;
      // game.players[2].isCzar = true;
      players[0].isCzar = true;
      io.to(players[1].mySocketId).emit('czarView', false);
      currentCzar = players[0]
    }
    // else if (game.players[2].isCzar){
    //   game.players[2].isCzar = false;
    //   game.players[3].isCzar = true;
    // }else if (game.players[3].isCzar){
    //   game.players[3].isCzar = false;
    //   game.players[0].isCzar = true;
    // }
    else {
      players[0].isCzar = true;
      currentCzar = players[0];
    }
    //update database to let it know which player is czar.
    updateCzarDb(currentCzar, gameSettings.gameId);
  }

  function updateCzarDb(currentCzar, gameId){
    pool.query('UPDATE players_in_game SET isczar = FALSE WHERE game_id = $1;',
    [gameId], function(err, result) {
      pool.query('UPDATE players_in_game SET isczar = TRUE WHERE game_id = $1 AND mysocket_id = $2;',
      [gameId, currentCzar.mySocketId], function(err, result) {
        io.to(currentCzar.mySocketId).emit('czarView', true);

      });
    });
  }

  /* ********************************
  *                                 *
  *       GAME LOGIC FUNCTIONS      *
  *                                 *
  ******************************** */

  function cardsToJudge(playerCards, playerObject){
    // console.log('playerCards', playerCards[0], 'playerObject', playerObject.playerName, '||', playerObject.mySocketId);
    for (var j = 0; j < playerCards.length; j++) { //loops through the players cards
      if(playerCards[j].selected){ //finds the ones that have been selected
        var cardToSend = playerCards[j];
        playerCards.splice(j, 1); //also splice the same card from the game.players.cardsInHand
        playerObject.cardsInHand = playerCards;
        // console.log(playerCards.length);
        io.to(playerObject.mySocketId).emit('drawWhiteCards', playerObject);
        sendCardsToCzar(cardToSend, playerObject);
      }//ends if
    }//ends for
  }

function sendCardsToCzar(cardToSend, playerObject){
  gameId = playerObject.gameId;
  cardId = cardToSend.id;
  cardText = cardToSend.text;
  sentBy = cardToSend.playerName;
  relatedSocket = cardToSend.relatedSocket;
  roomId = cardToSend.roomId;
  pool.query('INSERT INTO game_cards_to_judge (game_id, card_id, card_text, sent_by, related_socket, roomId) VALUES ($1, $2, $3, $4, $5, $6);',
  [gameId, cardId, cardText, sentBy, relatedSocket, roomId], function(err, result) {
    pool.query('SELECT COUNT(*) FROM game_cards_to_judge WHERE game_id = $1 AND roomid = $2',
    [gameId, roomId], function(err, result) {
      console.log(result.rowCount);
      if (result.rowCount == 1) { //hard coded
          pool.query('SELECT * FROM game_cards_to_judge WHERE game_id = $1 AND roomid = $2',
          [gameId, roomId], function(err, result) {
            var cardsToJudge = shuffleArray(result.rows);
            io.sockets.in(roomId).emit('judgementTime', cardsToJudge);
          });
      }
    });
  });
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

//when the czar is done selecting cards, delete all of the rows from the game_cards_to_judge table where the gameID is the same.



  // //~.:------------>TIES PLAYER TO CARD THAT WAS SENT<------------:.~//
  // function cardsToJudge(playerCards, playerObject){
  //   gameId = player.gameId;
  //   //~.:------------>RETRIEVE GAME DATA<------------:.~//
  //   pool.query('SELECT * FROM game_init LEFT OUTER JOIN players_in_game ON game_init.id = players_in_game.game_id WHERE game_id = $1;',
  //   [gameId], function(err, result) {
  //     gameSettings = {
  //       gameId: result.rows[0].id,
  //       roomId: result.rows[0].room_id,
  //       hostSocketId: result.rows[0].hostsocket_id,
  //       currentBlackCard: result.rows[0].currentblackcard_id,
  //       whiteCardsRequired: result.rows[0].whitecardsrequired,
  //       cardsToPick: result.rows[0].cardstopick,
  //       currentRound: result.rows[0].currentround,
  //       pointsToWin: result.rows[0].pointstowin,
  //       isStarted: result.rows[0].isstarted,
  //       isOver: result.rows[0].isover,
  //       numberOfPlayers: 2 //hard coded
  //     }
  //     //~.:------------>PLAYER SCHEMA<------------:.~//
  //     var players = [];
  //     for (var i = 0; i < result.rows.length; i++) {
  //       players[i] = {
  //         playerName: result.rows[i].player_name,
  //         gameId: gameId,
  //         mySocketId: result.rows[i].mysocket_id,
  //         score: result.rows[i].score,
  //         isCzar: result.rows[i].isczar,
  //         isReady: result.rows[i].isready,
  //         isRoundWinner: result.rows[i].isroundwinner,
  //         isGameWinner: result.rows[i].isgamewinner,
  //         cardsInHand: [],
  //       }
  //
  //       for (var i = 0; i < players.length; i++) { //loops through the players
  //         if (players[i].mySocketId == player.mySocketId) { //finds the correct socket/player
  //           // console.log('beforesplice', player.cardsInHand.length);
  //           for (var j = 0; j < playerCards.length; j++) { //loops through the players cards
  //             if(playerCards[j].selected){ //finds the ones that have been selected
  //               game.cardsToJudge.push(playerCards[j]); //adds the card to the cards to judge array.
  //               playerCards.splice(j, 1); //also splice the same card from the game.players.cardsInHand
  //               game.players[i].cardsInHand.splice(j, 1);
  //               player.cardsInHand = game.players[i].cardsInHand;
  //               // console.log('aftersplice', player.cardsInHand.length);
  //               io.to(player.mySocketId).emit('updatePlayerView', true, player);
  //             }//ends if
  //           }//ends for
  //         }
  //       }
  //       for (var i = 0; i < game.cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
  //         game.cardsToJudge[i].selected = false;
  //       }//ends for
  //       shuffleArray(game.cardsToJudge);
  //       //shuffles the array so that the czar doesn't know who the card came from.
  //
  //       if (game.cardsToJudge.length == 3){ //HARD CODED
  //         var cardsToJudge = game.cardsToJudge;
  //         var gameId = game.gameId;
  //         var player = data;
  //         io.sockets.in(gameId).emit('czarCards', cardsToJudge);
  //         // socket.emit('cardsToJudge', self.host);
  //         //clear any placeholder cards
  //       }
  //   });
  // }



  // function findCzar(playersArray){
  //   // console.log('HEY THERE - players array in findCzar server', playersArray);
  //   for (var i = 0; i < playersArray.length; i++) {
  //     playerSocketId = playersArray[i].mySocketId;
  //     if(playersArray[i].isCzar){
  //       // console.log('i czar', i);
  //       io.to(playerSocketId).emit('showCzarView', true);
  //     } else if (!playersArray[i].isCzar){
  //       // console.log('i NOT czar', i);
  //       io.to(playerSocketId).emit('showCzarView', false)
  //     }
  //   }
  // }

  // // // function selectRoundWinner(cardsToJudge){
  // // //   //  NEED THE DATABASE ID
  // // //   //  Go through the array of cards and make sure that one of them is selected
  // // //   for (var i = 0; i < cardsToJudge.length; i++) {
  // // //     if(cardsToJudge[i].selected){
  // // //       setRoundWinner(cardsToJudge); //finds who won the round and awards them points
  // // //       roundWinner = game.players[roundWinnerIndex];
  // // //       //ALERT USERS WHO WON... THEN RESET EVERYTHING
  // // //       checkIfGameOver(); //checks to see if anyone has 10 points yet
  // // //       newRound(); //sets up for a new round
  // // //       changeHostView();
  // // //
  // // //       console.log('game should be on round two with no cards to judge', game);
  // // //       io.sockets.in(game.gameId).emit('newRound', game);
  // // //
  // // //       // drawBlackCard(self.host.databaseId); //draws a new black card NEED DATABASE ID
  // // //       // drawCards(self.host.databaseId); // draws white cards NEED DATABASE ID
  // // //       // setCzar(self.host.players); //needs to set current czar to nothing and then set the next czar
  // // //       //UPDATE ALL VIEWS
  // // //
  // // //       //need to alert host that the player has scored.
  // // //     }
  // // //   }
  // // // }
  // // //
  // function setRoundWinner(cardsToJudge){
  //   //loops through the array of cards to judge
  //   for (var i = 0; i < cardsToJudge.length; i++) { //loop through cards to judge
  //     //if the card is selected, it's the winner
  //     if(cardsToJudge[i].selected){ //find the card in the array that is selected
  //       //find the player who sent the card and give them points.
  //       var winner = cardsToJudge[i].playerName; //find the user who sent that card, and set them to winner.
  //       for (var i = 0; i < game.players.length; i++) { //loop through the player array
  //         if(game.players[i].playerName == winner){ //whichever player is the winner
  //           game.players[i].playerScore++; //gets a point
  //           return roundWinnerIndex = i;
  //         }//ends if
  //       }//ends for
  //     }//ends if
  //   }//ends for
  // }//ends function
  // // //
  // // // function checkIfGameOver(){
  // // //   for (var i = 0; i < game.players.length; i++) {
  // // //     if (game.players[i].points >= game.pointsToWin){
  // // //       game.winner = game.players[i].playerName;
  // // //       game.isOver = true;
  // // //     }
  // // //   }
  // // //   if(game.isOver){
  // // //     for (var i = 0; i < game.players.length; i++) {
  // // //       game.players[i].isCzar = false;
  // // //       console.log('THE GAME IS OVER!');
  // // //     }
  // // //   }
  // // //   console.log('GAME IS NOT OVER');
  // // // }
  // // //
  // // // function newRound(){
  // // //   if(!game.isOver){
  // // //     game.currentRound++;
  // // //     game.cardsToJudge = [];
  // // //     io.sockets.in(game.gameId).emit('czarCards', game.cardsToJudge);
  // // //     io.sockets.in(game.gameId).emit('updatePlayerView', false, game.players);
  // // //   }
}
