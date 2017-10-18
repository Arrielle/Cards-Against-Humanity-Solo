var io;
var gameSocket;

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



//FOR SOME HARDCODED INFORMATION SEARCH: HARD CODED
//SEND CARDS TO CZAR

exports.initGame = function(sio, socket){
  io = sio;
  gameSocket = socket;

  gameSocket.emit('connected', { message: "You are connected!" });
  gameSocket.on('hostCreateNewGame', hostCreateNewGame);
  gameSocket.on('findPlayersCards', findPlayersCards);
  gameSocket.on('selectRoundWinner', selectRoundWinner);
  gameSocket.on('findCzar', findCzar);
  gameSocket.on('sendCardsToCzar', sendCardsToServer);
  gameSocket.on('playerJoinGame', playerJoinGame);
}

/* ****************************
*                             *
*       HOST FUNCTIONS        *
*                             *
******************************* */

function hostCreateNewGame() { // The 'START' button was clicked and 'hostCreateNewGame' event occurred.
var self = this;
var socketId = this.id;
var whiteCardsRequired = 10;
var cardsToPick = 1;
var currentRound = 1;
var pointsToWin = 2

pool.connect(function(err, client, done) {
  if(err){
    console.log(err);
  }else{
    client.query('INSERT INTO game_init (room_id, hostsocket_id, whitecardsrequired, cardstopick, currentround, pointstowin) VALUES ($1, $2, $3, $4, $5, $6) returning id;',
    [0, socketId, whiteCardsRequired, cardsToPick, currentRound, pointsToWin], function(err, result) {
      done();
      if(err){
        console.log(err);
      }else{
        var thisRoomId = result.rows[0].id; // Room ID is the id from the database
        console.log('jeepers', result.rows[0]);
        self.emit('newGameCreated', {roomId: thisRoomId, hostSocketId: this.id, gameIsReady: true, whitecardsrequired: whiteCardsRequired}); // Return the Room ID (roomid) and the socket ID (mySocketId) to the browser client
        self.join(thisRoomId.toString()); // Host Joins the Room and waits for the players
      }
    });
  }
});
};

function hostPrepareGame(data) {
  pool.connect(function(err, client, done){
    if(err){
      res.sendStatus(500);
    } else {
      client.query('SELECT * from players_in_game WHERE room_id = $1;', [data.roomId], function(err, result){
        done();
        if(err){
          console.log(err);
        } else {
          pool.connect(function(err, client, done){
            if(err){
              res.sendStatus(500);
            } else {
              data.players = result.rows;
              client.query('SELECT whitecardsrequired FROM game_init WHERE id = $1;', [data.roomId], function(err, result){
                done();
                if(err){
                  console.log(err);
                } else {
                  data.whiteCardsRequired = result.rows[0].whitecardsrequired;
                  for (var i = 0; i < data.players.length; i++) {
                    data.players[i].cardsInHand = [];
                    playerSocketId = data.players[i].mysocket_id;
                    changePlayerView(data, playerSocketId);
                    changeHostView(data);
                  }
                }
              });
            }
          });
        }
      });
    }
  });
}

function changeHostView(data){
  pool.connect(function(err, client, done){
    if(err){
      res.sendStatus(500);
    } else {
      client.query('SELECT * FROM game_init WHERE id = $1;', [data.roomId], function(err, result){
        done();
        if(err){
          console.log(err);
        } else {
          data.hostSocketId = result.rows[0].hostsocket_id;
          data.hostGameTemplate = true;
          data.isStarted = true;
          io.to(data.hostSocketId).emit('changeHostView', data);
        }
      });
    }
  });
}

/* ****************************
*                             *
*       Player FUNCTIONS      *
*                             *
**************************** */

// A player clicked the 'START GAME' button.
// Attempt to connect them to the room that matches the gameId entered by the player.
// data Contains data entered via player's input - playerName and gameId.
function playerJoinGame(data) {
  var room = gameSocket.adapter.rooms[data.roomId];
  var self = this;
  if( room != undefined && room.length <= 3){ // Look up the room ID in the Socket.IO manager object to make sure it exists and is not full
    data.mySocketId = this.id; // Attach the socket id to the data object.
    this.join(data.roomId); // Join the room
    pool.connect(function(err, client, done) {
      if(err){
        console.log(err);
        res.sendStatus(500);
      }else{
        client.query('INSERT INTO players_in_game (player_name, room_id, mysocket_id, score) VALUES ($1, $2, $3, $4) returning id;',
        [data.playerName, data.roomId, self.id, 0], function(err, result) {
          done();
          if(err){
            console.log(err);
          }else{
            if (room.length == 2){ //hard coded. Set the room one higher than the # of players you want.
              hostPrepareGame(data);
            }
            io.sockets.in(data.roomId).emit('playerJoinedRoom', data);// Emit an event notifying the clients that the player has joined the room.
          }
        });
      }
    });
  } else if (room == undefined){ //If the room does not exist
    console.log('The cake is a lie.');
    this.emit('errorAlert', {message: "Sorry, but it looks like that room doesn't exist!"} );
  }else if (room.length > 3){//hard coded, set the room one higher than the # of players you want.
    this.emit('errorAlert', {message: "Sorry, but this room is full!"})
  }
}

function changePlayerView(data, playerSocketId){
  data.playerGameTemplate = true;
  data.playerJoining = false;
  io.to(playerSocketId).emit('changePlayerView', data);
}

function findPlayersCards(playersObject){//players object is all players
  for (var i = 0; i < playersObject.length; i++) {//loop through the players to find their socket and change their views 'deal their cards'
  var playerSocketId = playersObject[i].mysocket_id;
  io.to(playerSocketId).emit('dealWhiteCards', {playersObject: playersObject[i]}); //emit these cards specifically to this player
}
}


function sendCardsToServer(playerCards, playerObject){
  var roomId = playerObject.room_id;
  var numberOfSelectedCards = checkCardsInHand(playerCards);
  pool.connect(function(err, client, done) {
    if(err){
      console.log(err);
      res.sendStatus(500);
    }else{
      client.query('SELECT cardstopick FROM game_init WHERE id = $1',
      [roomId], function(err, result) {
        done();
        if(err){
          console.log(err);
        }else{
          var cardsToPick = result.rows[0].cardstopick;
          if (numberOfSelectedCards == cardsToPick) {
            //this updates the czar view if everyone has played.
            //query the database for cards to judge.
            pool.connect(function(err, client, done) {
              if(err){
                console.log(err);
              }else{
                client.query('SELECT * FROM game_cards_to_judge WHERE roomid = $1;',
                [roomId], function(err, result) {
                  done();
                  if(err){
                    console.log(err);
                  }else{
                    var cardsToJudge = result.rows;
                    pool.connect(function(err, client, done) {
                      if(err){
                        console.log(err);
                        res.sendStatus(500);
                      }else{
                        client.query('SELECT * FROM players_in_game WHERE room_id = $1',
                        [cardObject.roomId, cardObject.cardId.id], function(err, result) {
                          done();
                          if(err){
                            console.log(err);
                            res.sendStatus(501);
                          }else{
                            var playersInGame = result.rows;
                            whiteCardsToSend(playerCards, playerObject, cardsToJudge, playersInGame);
                            if (cardsToJudge.length == playersInGame.length){
                              io.sockets.in(roomId).emit('czarCards', cardsToJudge);
                            }
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        }
      });
    }
  });
}

//~.:------------>TIES PLAYER TO CARD THAT WAS SENT<------------:.~//
function whiteCardsToSend(playerCards, playerObject, cardsToJudge, playersInGame){
  var roomId = playerObject.room_id;
  var players = playersInGame;
  //query the database for players
  //query the database for cards to judge
  for (var i = 0; i < players.length; i++) { //For every player in the game
    if (players[i].mysocket_id == playerObject.mysocket_id) { //if their socket matcheds the current playerObject socket
      for (var j = 0; j < playerCards.length; j++) { //loops through the players cards
        if(playerCards[j].selected){ //finds the ones that have been selected
          selectedCard = playerCards[j]
          pool.connect(function(err, client, done) {
            if(err){
              console.log(err);
            }else{
              client.query('INSERT INTO game_cards_to_judge (game_id, card_id, card_text, sent_by, related_socket, roomid) VALUES ($1, $2, $3, $4, $5, $6);',
              [roomId, selectedCard.id, selectedCard.text, playerObject.player_name, playerObject.mysocket_id, roomId], function(err, result) {
                done();
                if(err){
                  console.log(err);
                }else{
                }
              });
            }
          });
          playerCards.splice(j, 1);
          playerObject.cardsInHand = playerCards;
          io.to(playerObject.mySocketId).emit('updatePlayerView', true, playerObject);
        }
      }
    }
  }
  for (var i = 0; i < cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
    cardsToJudge[i].selected = false;
  }//ends for
  shuffleArray(cardsToJudge); //shuffles the array so that the czar doesn't know who the card came from.
}//ends function

//~.:------------>DETERMINES HOW MANY CARDS A PLAYER HAS SELECTED TO SEND TO THE CZAR<------------:.~//
function checkCardsInHand(cardsInHand){
  var numberOfSelectedCards = 0;
  for (var i = 0; i < cardsInHand.length; i++) { //checks to see how many 'numberOfSelectedCards' there really are
  if(cardsInHand[i].selected){
    numberOfSelectedCards++
  }
}
return numberOfSelectedCards;
}

//~.:------------>SHUFFLE THE WHITE CARDS SO THE CZAR DOESN'T KNOW WHO SENT THEM<------------:.~//
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}


/* ********************************
*                                 *
*       GAME LOGIC FUNCTIONS      *
*                                 *
******************************** */



function findCzar(playersArray){
  for (var i = 0; i < playersArray.length; i++) {
    playerSocketId = playersArray[i].mySocketId;
    if(playersArray[i].isCzar){
      io.to(playerSocketId).emit('showCzarView', true);
    } else if (!playersArray[i].isCzar){
      io.to(playerSocketId).emit('showCzarView', false)
    }
  }
}



function selectRoundWinner(cardsToJudge){
  //  NEED THE DATABASE ID
  //  Go through the array of cards and make sure that one of them is selected
  for (var i = 0; i < cardsToJudge.length; i++) {
    if(cardsToJudge[i].selected){
      setRoundWinner(cardsToJudge); //finds who won the round and awards them points
      roundWinner = game.players[roundWinnerIndex];
      //ALERT USERS WHO WON... THEN RESET EVERYTHING
      checkIfGameOver(game.players); //checks to see if anyone has the correct number of points yet


      // drawBlackCard(self.host.databaseId); //draws a new black card NEED DATABASE ID
      // drawCards(self.host.databaseId); // draws white cards NEED DATABASE ID
      // setCzar(self.host.players); //needs to set current czar to nothing and then set the next czar
      //UPDATE ALL VIEWS

      //need to alert host that the player has scored.
    }
  }
}

function setRoundWinner(cardsToJudge){
  for (var i = 0; i < cardsToJudge.length; i++) { //loop through cards to judge
    if(cardsToJudge[i].selected){ //find the card in the array that is selected
      var winner = cardsToJudge[i].playerName; //find the user who sent that card, and set them to winner.
      for (var i = 0; i < game.players.length; i++) { //loop through the player array
        if(game.players[i].playerName == winner){ //find whichever player won the round
          game.players[i].playerScore++; //player gets a point
          return roundWinnerIndex = i;
        }
      }
    }
  }
}

function checkIfGameOver(players){
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerScore >= 2){ //hard coded
      gameWinner = players[i].playerName;
      game.isOver = true;
      for (var j = 0; j < players.length; j++) {
        players[j].isCzar = false;
        io.sockets.in(game.gameId).emit('gameOver', gameWinner);
      }
    }
  }
  if (game.isOver){
    game = {
      databaseId: null,
      gameId: null,
      hostSocketId: null,
      players: [],
      currentBlackCard: null,
      whiteCardsRequired: 10,
      cardsToPick: 1,
      currentRound: 1,
      cardsToJudge: [],
      pointsToWin: 2,
      winner: null,
      isStarted: false,
      isNewGame: false,
      isOver: false,
    }

    player = {
      playerName: null,
      socketId: null,
      playerScore: null,
      cardsInHand: [],
      cardsToPick: null,
      isCzar: false,
      isReady: false
    }

    var hostSocketId = null;
  } else {
    newRound(players); //sets up for a new round
    changeHostView();
    io.sockets.in(game.gameId).emit('newRound', game);
  }
}

function newRound(players){
  if(!game.isOver){
    game.currentRound++;
    game.cardsToJudge = [];
    io.sockets.in(game.gameId).emit('czarCards', game.cardsToJudge);
    io.sockets.in(game.gameId).emit('updatePlayerView', false, players);
  }
}
