myApp.controller('HomeController', ['$scope', '$http', function($scope, $http) {
  var self = this;
  var socket = io();

  self.link = window.location.origin;

  //********************************//
  //                                //
  //        Socket Functions        //
  //                                //
  //********************************//

  socket.on('newGameCreated', onNewGameCreated );
  socket.on('errorAlert', error);
  socket.on('playerJoinedRoom', playerJoinedRoom);
  socket.on('changeHostView', onChangeHostView);
  socket.on('changePlayerView', onChangePlayerView);
  socket.on('dealWhiteCards', dealWhiteCards);
  socket.on('showCzarView', czarView);
  socket.on('czarCards', updateCzarView);
  socket.on('updatePlayerView', updatePlayerView);
  socket.on('newRound', newRound);
  socket.on('gameOver', gameOver);
  // socket.on('sendCardsToServer', sendCardsToServer)

  // //*************************//
  // //                         //
  // //        Game Data        //
  // //                         //
  // //*************************//
  // var self = this;
  // self.gameOver = false;
  // self.gameSetup = {
  //   // Keep track of the gameId, which is identical to the ID
  //   //of the Socket.IO Room used for the players and host to communicate
  //   gameId: 0,
  //   databaseId: 0,
  //   //This is used to differentiate between 'Host' and 'Player' browsers.
  //   myRole: '',   // 'Player' or 'Host'
  //   //The Socket.IO socket object identifier. This is unique for
  //   //each player and host. It is generated when the browser initially
  //   //connects to the server when the page loads for the first time.
  //   mySocketId: '',
  //   //Identifies the current round. Starts at 0 because it corresponds
  //   //to the array of winning black cards stored on the server.
  //   isStarted: false,
  //   whiteCardsRequired: 10,
  //   cardsToPick: 1,
  //   isOver: false
  // }
  //
  // self.host = {
  //   databaseId: null,
  //   numPlayersInRoom: 0,
  //   hostSocketId: null,
  //   isNewGame: false,
  //   isOver: false,
  //   players: [],
  //   currentBlackCard: null,
  //   currentRound: 1,
  //   cardsToJudge: [],
  //   pointsToWin: 2,
  //   winner: null,
  // }
  //
  // self.player = {
  //   playerName: null,
  //   playerScore: null,
  //   cardsInHand: [],
  //   isCzar: false,
  //   isReady: false
  // }

  //*******************************//
  //                               //
  //    Host Join/Game Creation    //
  //                               //
  //*******************************//

  //When the Create new game button is clicked on the DOM, hostCreateNewGame is sent to the server
  //Which in turn emits newGameCreated back to the client
  //Which then runs the onNewGameCreated function
  //Which then spins up the new game information
  self.onCreateClick = function () {
    socket.emit('hostCreateNewGame');
  }

  function onNewGameCreated(data) {
    //Data contains : {roomId, hostSocketId, gameIsReady}
    //$apply() is used to execute an expression in angular from outside of the angular framework.
    //Because we are calling into the angular framework we need to perform proper scope life cycle of exception handling, executing watches.
    $scope.$apply(self.gameInit(data));
  }

  self.gameInit = function(data) {
      self.isStarted = data.gameIsReady;
      self.roomId = data.roomId;
  }


  //*******************//
  //                   //
  //    Player Join    //
  //                   //
  //*******************//

  function error(data) {
    alert(data.message);
  }

  //player has clicked start
  self.onPlayerStartClick = function () {
    var data = {
      roomId : self.roomId,
      playerName : self.playerName,
      playerScore: 0,
      cardsInHand: [],
      isCzar: false,
      isReady: false
    };
    socket.emit('playerJoinGame', data);
  }

  //When a player clicks Join a Game the Join Game view is displayed.
  self.playerJoinView = function(){
    self.playerJoining = true;
  }

  function gameOver(data){
    $scope.$apply(applyNewView(data));
  }

  function applyNewView(data){
    self.gameOver = true;
    self.playerName = data;
    self.isStarted = false;
    self.gameTemplate = false;
    self.hostGameTemplate = false;
    self.playerIsCzar = false;
  }

  function playerJoinedRoom(data, gameData) {
      updateWaitingScreen(data);
  }

  // function playerJoinedRoom(data, gameData) {
  //   // When a player joins a room, do the updateWaitingScreen funciton.
  //   updateWaitingScreen(data);
  // }
  //
  function updateWaitingScreen(playerData) {
    $('#playersWaiting').append('<p/>Player ' + playerData.playerName + ' joined the game.</p>');
    $('#playerWaitingMessage').append('<p>Joined Game ' + playerData.roomId + '. Waiting on other players... Please wait for the game to begin.</p>');
  }

  //************************//
  //                        //
  //    GAME START VIEWS    //
  //                        //
  //************************//

  function error(data) {
  swal({
    title: 'Oops...',
    text: data.message,
    confirmButtonColor: '#000',
  });
}

  function onChangeHostView(data){
    startGame(data.roomId, data.players, data);
    $scope.$apply(changeHostView(data));
  }

  function changeHostView(data){
    self.hostGameTemplate = true;
    self.isStarted = true;
    self.gameTemplate = true;
    self.players = data.players;
  }

  function setCurrentBlackCard(blackCard){
    self.currentBlackCard = blackCard;
  }

  function onChangePlayerView(data){
    $scope.$apply(applyPlayerView(data));
  }

  function applyPlayerView(data){
    self.playerGameTemplate = data.playerGameTemplate; //true
    self.playerJoining = data.playerJoining; //false
  }

  //**********************************************************//
  //                                                          //
  //                     GAME LOGIC START                     //
  //                                                          //
  //**********************************************************//

  //Add game to the database
  function startGame(roomId, players, data){
      drawBlackCard(roomId, players, data);
      drawCards(roomId, players, data);
      setCzar(data);
  }

  function setCzar(data) {
    // if (data.players[0].isCzar){
    //   data.players[0].isCzar = false;
    //   data.players[1].isCzar = true;
    // } else if (data.players[1].isCzar){
    //   data.players[1].isCzar = false;
    //   data.players[2].isCzar = true;
    // }
    // else if (data.players[2].isCzar){
    //   data.players[2].isCzar = false;
    //   data.players[0].isCzar = true;
    //   // game.players[3].isCzar = true;
    // }
    // // else if (game.players[3].isCzar){
    // //   game.players[3].isCzar = false;
    // //   game.players[0].isCzar = true;
    // // }
    // else {
      data.players[0].isCzar = true;
    // }
    socket.emit('findCzar', data.players)
  }


  //****************************//
  //                            //
  //    Black Card Functions    //
  //                            //
  //****************************//

  //~.:------------>DRAW A BLACK CARD<------------:.~//
  function drawBlackCard(roomId, players, data){
    objectToSend = {roomId: roomId};
    $http({
      method: 'POST',
      url: '/allBlackCards',
      data: objectToSend
    }).then(function(response){
      var blackCard = response.data[0]; //this is the black card that was drawn
      setCurrentBlackCard(blackCard);
      data.currentBlackCard = blackCard;
      self.currentBlackCard = blackCard;
      var blackCardId = data.currentBlackCard.id;
      removeBlackCardFromDeck(blackCardId, roomId);
    });
  }
  //~.:------------>REMOVE BLACK CARD FROM 'DECK'<------------:.~//
  function removeBlackCardFromDeck(cardId, databaseId){
    var blackCardObject = {gameId: databaseId, cardId: cardId };
    $http({
      method: 'POST',
      url: '/postBlackCards',
      data: blackCardObject
    }).then(function(response){
    });
  }

  //****************************//
  //                            //
  //    White Card Functions    //
  //                            //
  //****************************//
  //~.:------------>DRAW WHITE CARDS AT RANDOM<------------:.~//
  function drawCards(roomId, players, data){
    objectToSend = {roomId: roomId}; //Send the game id to the sever so that we can check for all white cards that have not been played in this game.
    $http({
      method: 'POST',
      url: '/allWhiteCards',
      data: objectToSend
    }).then(function(response){
      var whiteCardDeck = response.data; //this is the shuffled deck of white cards
      for (var i = 0; i < players.length; i++) { //loops through the player array
        var cardsToDraw = data.whiteCardsRequired - players[i].cardsInHand.length; //sets the number of cards to draw based on how many are needed
        addCardsToHand(cardsToDraw, whiteCardDeck, players[i], roomId, data); //takes white cards from the shuffled white deck based on num needed
        cards = players[i].cardsInHand; //sets cards to the current players hand of cards.
        for (var j = 0; j < cards.length; j++) { //loops through the players cards and adds them to the database one at a time
          removeCardsFromDeck(cards[j].id, roomId); //This adds cards to my database so that I can compare later to ensure no cards that have already been drawn are drawn again.
        }
      }
    });
  }
  // ~.:------------>ADD CARDS TO THE PLAYER OBJECT<------------:.~//
  function addCardsToHand(numberCardsToDraw, deck, player, roomId, data) {
    var playerName = player.playerName;
    for (i = 0; i < numberCardsToDraw; i++) {
      var whiteIndex = Math.floor(Math.random() * deck.length); //selects a white card from the deck at random
      player.cardsInHand.push(deck[whiteIndex]); //pushes the random card into the players hand
      deck.splice(whiteIndex, 1); //Removes the random card from the shuffled deck.
    }
    for (var i = 0; i < player.cardsInHand.length; i++) {
      player.cardsInHand[i].roomId = roomId;
      // player.cardsInHand[i].gameId = game.gameId;
      player.cardsInHand[i].playerName = player.playerName;
      // player.cardsInHand[i].cardsToPick = game.cardsToPick;
    }
    socket.emit('findPlayersCards', data.players);
  }
  //~.:------------>REMOVE THE CARDS FROM THE DECK<------------:.~//
  function removeCardsFromDeck(cardId, roomId){
    var whiteCardObject = {roomId: roomId, cardId: cardId };
    $http({
      method: 'POST',
      url: '/postWhiteCards',
      data: whiteCardObject
    });
  }

  function dealWhiteCards(data, game){
    $scope.$apply(showCardsOnDom(data, game));
  }

  function showCardsOnDom(data, game){
    self.playerObject = data;
  }

  //***********************************//
  //                                   //
  //    SELECTING AND SENDING CARDS    //
  //                                   //
  //***********************************//

  //~.:------------>SELECT CARD CSS CHANGES<------------:.~//
  self.selectCard = function(card, cardsInHand, playerName, playerObject){
    card.selected = true; //gives the card that was selected a property of 'selected' and sets it to true.
    playerObject.hasPlayed = true; //need to update the view based on this...
    var cardsToPick = 1;  //finds out what the current rounds 'number of cards to pick' is set to
    var numberOfSelectedCards = checkCardsInHand(cardsInHand);  //Checks to see if the correct number of cards has been chosen
    if (numberOfSelectedCards > cardsToPick){ //if the number of cards selected is > cards to pick, it removes the .selected from all cards in the array.
      for (var i = 0; i < cardsInHand.length; i++) {
        cardsInHand[i].selected = false;
      }
      card.playerName = playerName;
      card.selected = true; //sets the card that was last clicked as the selected card. (it was removed by my previous if)
    }
  }

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

//~.:------------>SELECT CARD CSS CHANGES WHEN CZAR SELECTING<------------:.~//
self.selectCardCzar = function(card, cardsInHand){
  card.selected = true; //gives the card that was selected a property of 'selected' and sets it to true.
  var cardsToPick = self.gameSetup.cardsToPick;  //finds out what the current rounds 'number of cards to pick' is set to
  var numberOfSelectedCards = checkCardsInHand(cardsInHand);  //Checks to see if the correct number of cards has been chosen
  if (numberOfSelectedCards > cardsToPick){ //if the number of cards selected is > cards to pick, it removes the .selected from all cards in the array.
    for (var i = 0; i < cardsInHand.length; i++) {
      cardsInHand[i].selected = false;
    }
    card.selected = true; //sets the card that was last clicked as the selected card. (it was removed by my previous if)
  }
}

//~.:------------>SEND CARDS TO CZAR<------------:.~//
self.sendCardsToCzar = function(playerCards, playerObject){
  socket.emit('sendCardsToCzar', playerCards, playerObject)
}

//**********************//
//                      //
//    CZAR FUNCTIONS    //
//                      //
//**********************//
//~.:------------>SETS THE CURRENT CZAR<------------:.~//
//hard coded who czar is... NEED TO MAKE DYNAMIC
// function setCzar(players){
//   console.log('setCzar: ', players);
//   socket.emit('setCzar', players);
// }
//~.:------------>CHANGES THE CZAR VIEW<------------:.~//
function czarView(data){
  $scope.$apply(fuckinghell(data));
}

function fuckinghell(data){
  self.playerIsCzar = data;
}

function updateCzarView(data){
  console.log('FA;LSJDFKA;LSFJD');
  $scope.$apply(cardsToJudgeUpdateView(data));
}

function cardsToJudgeUpdateView(data){
  self.cardsToJudge = data;
  //need game here
}

function updatePlayerView(data, playerObject){
  $scope.$apply(playerHasPlayed(data, playerObject));
}

function playerHasPlayed(data, playerObject){
  self.playerObject.playersObject.cardsInHand = playerObject.cardsInHand;
  self.playerDone = data;
}

//Sets all players isCzar to false
function noCzar(){
  //makes view false (can I get rid of this?)
  self.playerIsCzar = false;
  //makes the status in the host object false.
  for (var i = 0; i < self.host.players.length; i++) {
    self.host.players[i].isCzar = false;
  }
}

//***************************//
//                           //
//    SELECT ROUND WINNER    //
//                           //
//***************************//

self.selectRoundWinner = function(cardsToJudge){
  //go to the server -> figure out who was
  socket.emit('selectRoundWinner', cardsToJudge);
}

function newRound(data){
  roomId = data.roomId;
  players = data.players;
  drawBlackCard(roomId, players, data);
  drawCards(roomId, players, data);
  setCzar(game);
}

function setRoundWinner(){
  //loops through the array of cards to judge
  for (var i = 0; i < self.host.cardsToJudge.length; i++) { //loop through cards to judge
    //if the card is selected, it's the winner
    if(self.host.cardsToJudge[i].selected){ //find the card in the array that is selected
      //find the player who sent the card and give them points.
      var winner = self.host.cardsToJudge[i].playerName; //find the user who sent that card, and set them to winner.
      for (var i = 0; i < self.host.players.length; i++) { //loop through the player array
        if(self.host.players[i].playerName == winner){ //whichever player is the winner
          self.host.players[i].playerScore++; //gets a point
        }//ends if
      }//ends for
    }//ends if
  }//ends for
}//ends function

}]);
