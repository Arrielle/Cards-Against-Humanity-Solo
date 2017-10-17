var io;
var gameSocket;

//FOR SOME HARDCODED INFORMATION SEARCH: HARD CODED
//SEND CARDS TO CZAR

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
  // gameSocket.on('setCzar', setCzar);
  gameSocket.on('selectRoundWinner', selectRoundWinner);
  gameSocket.on('findCzar', findCzar);
  // gameSocket.on('cardsToJudge', cardsToJudge);
  // gameSocket.on('playerHideButton', changePlayerStatus);
  gameSocket.on('sendCardsToCzar', sendCardsToServer);
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
  cardsToPick: null,
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
  // Host Joins the Room and waits for the players
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
  // console.log('HOST PREP DATA BBY', data);
  beginNewGame();

}

function beginNewGame(data) {
  game.isStarted = true;
  // console.log('new game beginning');
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
  // console.log('at host view?', game.hostSocketId);
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
**************************** */

// A player clicked the 'START GAME' button.
// Attempt to connect them to the room that matches the gameId entered by the player.
// data Contains data entered via player's input - playerName and gameId.
function playerJoinGame(data) {
  var sock = this;
  var room = gameSocket.adapter.rooms[data.gameId];
  // Look up the room ID in the Socket.IO manager object to make sure it exists
  // Additionally, make sure the room is not full.
  if( room != undefined && room.length <= 5){
    console.log('this room exists');
    // Attach the socket id to the data object.
    data.mySocketId = sock.id;
    // Join the room
    sock.join(data.gameId);
    //adds the new player to the players array.
    game.players.push(data);

    if (room.length == 4){ //hard coded. Set the room one higher than the # of players you want.
      console.log('GAME IS READY TO START');
      //now it knows that the room is full.
      hostPrepareGame();
    }
    // Emit an event notifying the clients that the player has joined the room.
    io.sockets.in(data.gameId).emit('playerJoinedRoom', data, game);
    //If the room is full.
  } else if (room == undefined){
    console.log('The cake is a lie.');
    // Otherwise, send an error message back to the player.
    this.emit('errorAlert', {message: "Sorry about that! It looks like this room does not exist."} );
  }else if (room.length > 4){//hard coded, set the room one higher than the # of players you want.
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
  game.players = playersObject;
  //players object is all 4 players
  //loop through these players to find their socket and cards in hand
  for (var i = 0; i < playersObject.length; i++) {
    //cards in 'this' players hand.
    var cards = playersObject[i].cardsInHand;
    //'this' players socketId
    var playerSocketId = playersObject[i].mySocketId;
    //'this' players playerNameupdatePlayerView
    var name = playersObject[i].playerName
    //emit these cards specifically to this player
    io.to(playerSocketId).emit('dealWhiteCards', {playersObject: playersObject[i]});
    // io.to(playerSocketId).emit('dealWhiteCards', {playerCards: cards, playerName: name, playersObject: playersObject[i]});
  }
}


function sendCardsToServer(playerCards, playerObject){
  game.databaseId = playerCards[0].databaseId;
  var numberOfSelectedCards = checkCardsInHand(playerCards);
  var cardsToPick = game.cardsToPick;  //finds out what the current rounds 'number of cards to pick' is set to
  //if the player has selected ther right number of cards their card is added to the cardsToJudge array
  if (numberOfSelectedCards == cardsToPick) {
    // nextPlayer(player); //sends white cards, and sets the next player.
    whiteCardsToSend(playerCards, playerObject);
    //this updates the czar view if everyone has played.
    if (game.cardsToJudge.length == 2){ //HARD CODED
      var cardsToJudge = game.cardsToJudge;
      var gameId = game.gameId;
      var player = data;
      io.sockets.in(gameId).emit('czarCards', cardsToJudge);
      // socket.emit('cardsToJudge', self.host);
    }
  }
}

//~.:------------>TIES PLAYER TO CARD THAT WAS SENT<------------:.~//
function whiteCardsToSend(playerCards, playerObject){
  for (var i = 0; i < game.players.length; i++) { //loops through the players (server)
    if (game.players[i].mySocketId == playerObject.mySocketId) { //finds the correct socket/player
      // console.log('beforesplice', playerObject.cardsInHand.length);
      for (var j = 0; j < playerCards.length; j++) { //loops through the players cards
        if(playerCards[j].selected){ //finds the ones that have been selected
          game.cardsToJudge.push(playerCards[j]); //adds the card to the cards to judge array.
          playerCards.splice(j, 1); //also splice the same card from the game.players.cardsInHand
          game.players[i].cardsInHand.splice(j, 1);
          playerObject.cardsInHand = game.players[i].cardsInHand;
          io.to(playerObject.mySocketId).emit('updatePlayerView', true, playerObject);
        }
      }
    }
  }
  for (var i = 0; i < game.cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
    game.cardsToJudge[i].selected = false;
  }//ends for
  shuffleArray(game.cardsToJudge); //shuffles the array so that the czar doesn't know who the card came from.
}//ends function

//~.:------------>DETERMINES HOW MANY CARDS A PLAYER HAS SELECTED TO SEND TO THE CZAR<------------:.~//
function checkCardsInHand(cardsInHand){
  var numberOfSelectedCards = 0; //initialized numberOfSelctedCards to 0
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
  // console.log('HEY THERE - players array in findCzar server', playersArray);

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
  console.log(players);
  for (var i = 0; i < players.length; i++) {
    console.log('inside of for');
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

    console.log('THE GAME IS OVER');

  } else {
    console.log('skipped');
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
