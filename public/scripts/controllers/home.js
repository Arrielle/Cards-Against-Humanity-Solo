myApp.controller('HomeController', ['$scope', '$http', function($scope, $http) {
  console.log('home controller running');
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
  // socket.on('sendCardsToServer', sendCardsToServer)

  //*************************//
  //                         //
  //        Game Data        //
  //                         //
  //*************************//

  self.gameSetup = {
    // Keep track of the gameId, which is identical to the ID
    //of the Socket.IO Room used for the players and host to communicate
    gameId: 0,
    //This is used to differentiate between 'Host' and 'Player' browsers.
    myRole: '',   // 'Player' or 'Host'
    //The Socket.IO socket object identifier. This is unique for
    //each player and host. It is generated when the browser initially
    //connects to the server when the page loads for the first time.
    mySocketId: '',
    //Identifies the current round. Starts at 0 because it corresponds
    //to the array of winnign black cards stored on the server.
    isStarted: false,
    whiteCardsRequired: 10,
    cardsToPick: 1,
    isOver: false
  }

  self.host = {
    databaseId: null,
    numPlayersInRoom: 0,
    hostSocketId: null,
    isNewGame: false,
    isOver: false,
    players: [],
    currentBlackCard: null,
    currentRound: 1,
    cardsToJudge: [],
    pointsToWin: 2,
    winner: null,
  }

  self.player = {
    playerName: null,
    playerScore: null,
    cardsInHand: [],
    isCzar: false,
    isReady: false
  }

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
    console.log('Clicked "Create A Game"');
    // data = {
    //   gameData: self.host,
    //   playerData: self.player
    // }
    socket.emit('hostCreateNewGame');
  }

  function onNewGameCreated(data) {
    //Data contains : gameId && hostSocketId
    //$scope.$apply allows angular to see the results even though it's happening outside of angular (sockets).
    //$apply() is used to execute an expression in angular from outside of the angular framework.
    //Because we are calling into the angular framework we need to perform proper scope life cycle of exception handling, executing watches.
    $scope.$apply(gameInit(data));
  }

  function gameInit(data) {
    console.log("Game started with ID: " + data.gameId + ' by host: ' + data.hostSocketId);
    //shows game init view.
    self.isStarted = data.gameIsReady;
    self.gameId = data.gameId;
  }

  //*******************//
  //                   //
  //    Player Join    //
  //                   //
  //*******************//
  self.gameId = null;
  self.playerName = null;


  function error(data) {
    console.log('error?', data);
    alert(data.message);
  }

  //player has clicked start
  self.onPlayerStartClick = function () {

    // collect data to send to the server
    var data = {
      gameId : self.gameId,
      playerName : self.playerName,
      playerScore: 0,
      cardsInHand: [],
      isCzar: false,
      isReady: false
      // numPlayersInRoom : self.host.numPlayersInRoom,
    };
    socket.emit('playerJoinGame', data);
  }

  //When a player clicks Join a Game the Join Game view is displayed.
  self.playerJoinView = function(){
    self.playerJoining = true;
  }

  function playerJoinedRoom(data, gameData) {
    // When a player joins a room, do the updateWaitingScreen funciton.
    updateWaitingScreen(data);
  }
  //
  function updateWaitingScreen(playerData) {
    // Update host screen - switch to angular!! :)
    $('#playersWaiting').append('<p/>Player ' + playerData.playerName + ' joined the game.</p>');
    $('#playerWaitingMessage').append('<p>Joined Game ' + playerData.gameId + '. Waiting on other players... Please wait for the game to begin.</p>');
  }

  //************************//
  //                        //
  //    GAME START VIEWS    //
  //                        //
  //************************//

  function onChangeHostView(data, game){

    console.log('game id? ', game.gameId, 'players? ', game.players);

    postNewGameToDatabase(game.gameId, game.players, game);
    //changes the hosts view
    changeHostView(data, game);
  }

  function changeHostView(data, game){
    console.log('WHAT IS THIS GAME', game.currentBlackCard);
    self.hostGameTemplate = data.hostGameTemplate;
    self.gameSetup.isStarted = data.isStarted;
    self.gameTemplate = true;
    self.players = game.players;
    setCurrentBlackCard(game.currentBlackCard)
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
  function postNewGameToDatabase(inGameId, players, game){
    //bring data here and put it into setCzar ---
    console.log('post new game', inGameId);
    gameIdObject = {gameId: inGameId};
    $http({
      method: 'POST',
      url: '/game/newGame',
      data: gameIdObject
    }).then(function(response){
      databaseId = response.data[0].id;
      console.log('my shit should have been posted...', databaseId);
      game.databaseId = response.data[0].id;
      //Draw a black card. A black card that has been drawn, cannot be drawn again.
      drawBlackCard(databaseId, players, game);
      drawCards(databaseId, players, game);
      setCzar(players);


      whatWillYouBe(game);
    });
  }

  function whatWillYouBe(game){
    socket.emit('newGameData', game);
  }

  //****************************//
  //                            //
  //    Black Card Functions    //
  //                            //
  //****************************//

  //~.:------------>DRAW A BLACK CARD<------------:.~//
  function drawBlackCard(databaseId, players, game){
    objectToSend = {gameId: databaseId};
    $http({
      method: 'POST',
      url: '/allBlackCards',
      data: objectToSend
    }).then(function(response){
      var blackCard = response.data[0]; //this is the black card that was drawn
      setCurrentBlackCard(blackCard);

      game.currentBlackCard = blackCard;

      console.log('card text?', game.currentBlackCard.text);
      console.log('card id?', game.currentBlackCard.id);
      // console.log('in draw post', self.host.currentBlackCard.text);
      var blackCardId = game.currentBlackCard.id;
      removeBlackCardFromDeck(blackCardId, databaseId);
      console.log('game inside of post', game);
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
  function drawCards(databaseId, players, game){ //Give this function the player array
    objectToSend = {gameId: databaseId}; //I need to send the database ID
    $http({
      method: 'POST',
      url: '/allWhiteCards',
      data: objectToSend //database id object
    }).then(function(response){
      var whiteCardDeck = response.data; //this is the shuffled deck of white cards
      for (var i = 0; i < players.length; i++) { //loops through the player array
        var cardsToDraw = game.whiteCardsRequired - players[i].cardsInHand.length; //sets the number of cards to draw based on how many are needed
        addCardsToHand(cardsToDraw, whiteCardDeck, players[i], databaseId, game); //takes white cards from the shuffled white deck based on num needed
        cards = players[i].cardsInHand; //sets cards to the current players hand of cards.
        for (var j = 0; j < cards.length; j++) { //loops through the players cards and adds them to the database one at a time
          removeCardsFromDeck(cards[j].id, databaseId); //This adds cards to my database so that I can compare later to ensure no cards that have already been drawn are drawn again.
        }
      }
    });
  }
  // ~.:------------>ADD CARDS TO THE PLAYER OBJECT<------------:.~//
  function addCardsToHand(numberCardsToDraw, deck, player, databaseId, game) {
    var playerName = player.playerName;
    for (i = 0; i < numberCardsToDraw; i++) {
      var whiteIndex = Math.floor(Math.random() * deck.length); //selects a white card from the deck at random
      player.cardsInHand.push(deck[whiteIndex]); //pushes the random card into the players hand
      deck.splice(whiteIndex, 1); //Removes the random card from the shuffled deck.
    }
    for (var i = 0; i < player.cardsInHand.length; i++) {
      player.cardsInHand[i].databaseId = databaseId;
      player.cardsInHand[i].gameId = game.gameId;
      player.cardsInHand[i].playerName = player.playerName;
      player.cardsInHand[i].cardsToPick = game.cardsToPick;
    }
    socket.emit('findPlayersCards', game.players);
  }
  //~.:------------>REMOVE THE CARDS FROM THE DECK<------------:.~//
  function removeCardsFromDeck(cardId, databaseId){
    var whiteCardObject = {gameId: databaseId, cardId: cardId };
    $http({
      method: 'POST',
      url: '/postWhiteCards',
      data: whiteCardObject
    }).then(function(response){
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

//   function sendCardsToServer(game, playerCards, playerObject){
//     console.log('game.players', game.players);
//     var numberOfSelectedCards = checkCardsInHand(playerCards);
//     var cardsToPick = self.gameSetup.cardsToPick;  //finds out what the current rounds 'number of cards to pick' is set to
//     if (numberOfSelectedCards == cardsToPick) {
//       // nextPlayer(player); //sends white cards, and sets the next player.
//       whiteCardsToSend(playerCards);
//       //this updates the czar view if everyone has played.
//       if (self.host.cardsToJudge.length == 1){
//         socket.emit('cardsToJudge', self.host);
//         //clear any placeholder cards
//       }
//       socket.emit('playerHideButton', playerObject);
//     }
//   }
//
//
//
// //~.:------------>TIES PLAYER TO CARD THAT WAS SENT<------------:.~//
// function whiteCardsToSend(playerCards){
//   for (var i = 0; i < playerCards.length; i++) { //loops through the players cards
//     if(playerCards[i].selected){ //finds the ones that have been selected
//       self.host.cardsToJudge.push(playerCards[i]); //adds the card to the cards to judge array.
//       playerCards.splice(i, 1);
//       for (var i = 0; i < self.host.cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
//         self.host.cardsToJudge[i].selected = false;
//       }//ends for
//     }//ends if
//   }//ends for
//   shuffleArray(self.host.cardsToJudge); //shuffles the array so that the czar doesn't know who the card came from.
// }//ends function
//
// //~.:------------>SHUFFLE THE WHITE CARDS SO THE CZAR DOESN'T KNOW WHO SENT THEM<------------:.~//
// function shuffleArray(array) {
//   for (var i = array.length - 1; i > 0; i--) {
//     var j = Math.floor(Math.random() * (i + 1));
//     var temp = array[i];
//     array[i] = array[j];
//     array[j] = temp;
//   }
//   return array;
// }

//loop through self.host.cardsToJudge and find the username of people who have sent cardsToJudge

// function checkIfPlayed(){
//   for (var i = 0; i < self.host.cardsToJudge.length; i++) {
//     var playerName = self.host.cardsToJudge[i].playerName
//     socket.emit('checkIfPlayed', playerName);
//   }
// }

//**********************//
//                      //
//    CZAR FUNCTIONS    //
//                      //
//**********************//
//~.:------------>SETS THE CURRENT CZAR<------------:.~//
//hard coded who czar is... NEED TO MAKE DYNAMIC
function setCzar(players){
  socket.emit('setCzar', players);
}
//~.:------------>CHANGES THE CZAR VIEW<------------:.~//
function czarView(data){
  self.playerIsCzar = data;
}

function updateCzarView(data){
  console.log(data);
  $scope.$apply(cardsToJudgeUpdateView(data));
}

function cardsToJudgeUpdateView(data){
  self.host.cardsToJudge = data;
}

function updatePlayerView(data){
  $scope.$apply(playerHasPlayed(data));
}

function playerHasPlayed(data){
  console.log('here is some epic data', data);
  self.playerObject.playersObject.cardsInHand = data.cardsInHand;
  self.playerDone = true;
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

self.selectRoundWinner = function(host){
  console.log('WHAT IS IN HERE?!', self.host.players);
  //  NEED THE DATABASE ID
  //  Go through the array of cards and make sure that one of them is selected
  for (var i = 0; i < self.host.cardsToJudge.length; i++) {
    if(self.host.cardsToJudge[i].selected){
      setRoundWinner(); //finds who won the round and awards them points
      //ALERT USERS WHO WON... THEN RESET EVERYTHING
      checkIfGameOver(); //checks to see if anyone has 10 points yet
      newRound(); //sets up for a new round
      // drawBlackCard(self.host.databaseId); //draws a new black card NEED DATABASE ID
      // drawCards(self.host.databaseId); // draws white cards NEED DATABASE ID
      // setCzar(self.host.players); //needs to set current czar to nothing and then set the next czar
      //UPDATE ALL VIEWS
      console.log(self.host.currentBlackCard.text);
      console.log('HOST', self.host);
    }
  }
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

function checkIfGameOver(){
  for (var i = 0; i < self.host.players.length; i++) {
    if (self.host.players[i].points >= self.host.pointsToWin){
      self.host.winner = self.host.players[i].playerName;
      self.host.isOver = true;
    }
  }
  if(self.host.isOver){
    for (var i = 0; i < self.host.players.length; i++) {
      self.host.players[i].isCzar = false;
      console.log('THE GAME IS OVER!');
    }
  }
  console.log('GAME IS NOT OVER');
}

function newRound(){
  if(!self.host.isOver){
    self.host.currentRound++;
    self.host.currentBlackCard = null;
    self.host.cardsToJudge = [];
  }
}

//loop through all players, if every player who is not czar hasPlayed, display the button on the czar view
//

//check if all players have played their cards
//if they have, it's time for czar to select a winner
//award points
//update host view to reflect new score.
//check if game winner
//reset important round information.
//select the next czar
//draw white cards
//draw black card
//host view needs to reflect who the Czar is.


}]);
