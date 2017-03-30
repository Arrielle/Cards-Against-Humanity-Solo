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
  isCzar: false,
  isReady: false
}

/* ****************************
*                             *
*       HOST FUNCTIONS        *
*                             *
******************************* */

var hostSocketId = null;

// The 'START' button was clicked and 'hostCreateNewGame' event occurred.
function hostCreateNewGame() {
  // Create a unique Socket.IO Room
  var thisGameId = ( Math.random() * 100000 ) | 0;
  // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
  this.emit('newGameCreated', {gameId: thisGameId, hostSocketId: this.id, gameIsReady: true});
  // console.log('Host has created a new game!');
  // console.log('Game ID: ', thisGameId, 'Socket ID: ', this.id);
  // Join the Room and wait for the players
  this.join(thisGameId.toString());
  game.hostSocketId = this.id;
};

function hostPrepareGame(data) {
  game.gameId = game.players[0].gameId;
  var data = {
    hostSocketId : game.hostSocketId,
    gameId : game.gameId,
    players : game.players
  };
  console.log('HOST PREP DATA BBY', data);
  beginNewGame();

}

function beginNewGame(data) {
  game.isStarted = true;
  console.log('new game beginning');
  //spin up host view
  // socket.emit('changeHostView', hostSocketId)
  changeHostView();
  // socket.emit('changeHostView', self.host.hostSocketId);
  //loop through player sockets to find player socket ID information, and update their view specifically
  for (var i = 0; i < game.players.length; i++) {
    playerSocketId = game.players[i].mySocketId;
    changePlayerView(playerSocketId);
  }
}

function changeHostView(){
  console.log('at host view?', game.hostSocketId);
  data = {
    hostGameTemplate: true,
    isStarted: true
  }
  io.to(game.hostSocketId).emit('changeHostView', data, game);
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
    //adds the new player to the players array.
    game.players.push(data);

    if (game.players.length == 2){
      console.log('GAME IS READY TO START');
      //now it knows that the room is full.
      hostPrepareGame();
    }
    // Emit an event notifying the clients that the player has joined the room.
    io.sockets.in(data.gameId).emit('playerJoinedRoom', data, game);
    //If the room is full.
  } else if (room == undefined){
    console.log('this room does not exist');
    // Otherwise, send an error message back to the player.
    this.emit('errorAlert', {message: "Sorry about that! It looks like this room does not exist."} );
  } else if (room.length > 2){
    this.emit('errorAlert', {message: "Sorry, but this room is full!"})
    //If the room does not exist
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
