var io;
var gameSocket;

exports.initGame = function(sio, socket){
  io = sio;
  gameSocket = socket;

  gameSocket.emit('connected', { message: "You are connected!" });
  // Host Events
  gameSocket.on('hostCreateNewGame', hostCreateNewGame);
  gameSocket.on('hostRoomFull', hostPrepareGame);
  gameSocket.on('changeHostView', changeHostView);
  gameSocket.on('changePlayerView', changePlayerView);
  gameSocket.on('findPlayersCards', findPlayersCards);
  gameSocket.on('setCzar', setCzar);
  gameSocket.on('cardsToJudge', cardsToJudge);
  gameSocket.on('playerHideButton', changePlayerStatus)
  // gameSocket.on('hostCountdownFinished', hostStartGame);
  // gameSocket.on('hostNextRound', hostNextRound);

  // Player Events
  gameSocket.on('playerJoinGame', playerJoinGame);
  // gameSocket.on('playerAnswer', playerAnswer);
  // gameSocket.on('playerRestart', playerRestart);
}

/* ****************************
*                             *
*       HOST FUNCTIONS        *
*                             *
******************************* */
// The 'START' button was clicked and 'hostCreateNewGame' event occurred.
function hostCreateNewGame() {
  // Create a unique Socket.IO Room
  var thisGameId = ( Math.random() * 100000 ) | 0;
  // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
  this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});
  // console.log('Host has created a new game!');
  // console.log('Game ID: ', thisGameId, 'Socket ID: ', this.id);
  // Join the Room and wait for the players
  this.join(thisGameId.toString());
};

function hostPrepareGame(data) {
  var sock = this;
  var data = {
    mySocketId : sock.id,
    gameId : data.gameId,
    players : data.playersArray
  };
  console.log('host prep data', data);
  io.sockets.in(data.gameId).emit('beginNewGame', data);
}

function changeHostView(hostSocketId){
  data = {
    hostGameTemplate: true,
    isStarted: true
  }
  io.to(hostSocketId).emit('changeHostView', data);
}

/* ****************************
*                             *
*       Player FUNCTIONS      *
*                             *
******************************* */

// A player clicked the 'START GAME' button.
// Attempt to connect them to the room that matches the gameId entered by the player.
// data Contains data entered via player's input - playerName and gameId.
function playerJoinGame(data) {
  // console.log('Player ' + data.playerName + ' attempting to join game: ' + data.gameId );
  // A reference to the player's Socket.IO socket object
  var sock = this;
  var room = gameSocket.adapter.rooms[data.gameId];
  // Look up the room ID in the Socket.IO manager object to make sure it exists
  // Additionally, make sure the room is not full.
  if( room != undefined && room.length <= 2){
    console.log('this room exists');
    // Attach the socket id to the data object.
    data.mySocketId = sock.id;
    // Join the room
    sock.join(data.gameId);

    // console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

    // Emit an event notifying the clients that the player has joined the room.
    io.sockets.in(data.gameId).emit('playerJoinedRoom', data);
    //If the room is full.
  } else if (room.length > 2){
    this.emit('errorAlert', {message: "Sorry, but this room is full!"})
    //If the room does not exist
  } else {
    console.log('this room does not exist');
    // Otherwise, send an error message back to the player.
    this.emit('errorAlert', {message: "Sorry about that! It looks like this room does not exist."} );
  }
}

function changePlayerView(playerSocketId){
  data = {
    playerGameTemplate: true,
    playerJoining: false
  }
  io.to(playerSocketId).emit('changePlayerView', data);
}

function findPlayersCards(playersObject){
  //players object is all 4 players
  //loop through these players to find their socket and cards in hand
  for (var i = 0; i < playersObject.length; i++) {
    //cards in 'this' players hand.
    var cards = playersObject[i].cardsInHand;
    //'this' players socketId
    var playerSocketId = playersObject[i].mySocketId;
    //'this' players playerName
    var name = playersObject[i].playerName
    //emit these cards specifically to this player
    io.to(playerSocketId).emit('dealWhiteCards', {playersObject: playersObject[i]});
    // io.to(playerSocketId).emit('dealWhiteCards', {playerCards: cards, playerName: name, playersObject: playersObject[i]});
  }
}

/* ********************************
*                                 *
*       GAME LOGIC FUNCTIONS      *
*                                 *
******************************** */

function setCzar(playersArray){
  console.log('PLAYERS ARRAY', playersArray);
  if (playersArray[0].isCzar){
    playersArray[0].isCzar = false;
    playersArray[1].isCzar = true;
  } else if (playersArray[1].isCzar){
    playersArray[1].isCzar = false;
    // player[2].isCzar = true;
    playersArray[0].isCzar = true;
  }
  // else if (player[2].isCzar){
  //   player[2].isCzar = false;
  //   player[3].isCzar = true;
  // }else if (player[3].isCzar){
  //   player[3].isCzar = false;
  //   player[0].isCzar = true;
  // }
  else {
    playersArray[0].isCzar = true;
  }
  // loop through the players and find the socket as well as their czar status.
  // Emit the status to the right socket.
  for (var i = 0; i < playersArray.length; i++) {
    playerSocketId = playersArray[i].mySocketId;
    if(playersArray[i].isCzar){
      io.to(playerSocketId).emit('showCzarView', true);
    } else if (!playersArray[i].isCzar){
      io.to(playerSocketId).emit('showCzarView', false)
    }
  }
}

function cardsToJudge(data){
  var cardsToJudge = data.cardsToJudge;
  var gameId = data.players[0].gameId;
  var player = data;
  io.sockets.in(gameId).emit('czarCards', cardsToJudge);
}

function changePlayerStatus(data){
  io.to(data.mySocketId).emit('updatePlayerView', data);
}
