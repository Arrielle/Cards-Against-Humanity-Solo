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
  socket.on('beginNewGame', beginNewGame );
  socket.on('changeHostView', onChangeHostView);
  socket.on('changePlayerView', onChangePlayerView);
  socket.on('dealWhiteCards', dealWhiteCards);

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
    currentRound: 0,
    isStarted: false,
    whiteCardsRequired: 10,
    cardsToPick: 1,
    isOver: false
  }

  self.host = {
    numPlayersInRoom: 0,
    hostSocketId: null,
    isNewGame: false,
    players: [],
    currentBlackCard: null,
    currentRound: 0,
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
    socket.emit('hostCreateNewGame');
  }

  function onNewGameCreated(data) {
    //$scope.$apply allows angular to see the results even though it's happening outside of angular (sockets).
    //$apply() is used to execute an expression in angular from outside of the angular framework.
    //Because we are calling into the angular framework we need to perform proper scope life cycle of exception handling, executing watches.
    $scope.$apply(gameInit(data));
  }

  function gameInit(data) {
    self.gameSetup.gameId = data.gameId;
    self.gameSetup.mySocketId = data.mySocketId;
    self.host.hostSocketId = data.mySocketId;
    self.gameSetup.myRole = 'Host';
    self.gameSetup.isStarted = true;
    // gameSetup.Host.numPlayersInRoom = 0;
    console.log("Game started with ID: " + self.gameSetup.gameId + ' by host: ' + self.gameSetup.mySocketId);
    console.log('self.gameSetup on game init?', self.gameSetup);

  }

  //*******************//
  //                   //
  //    Player Join    //
  //                   //
  //*******************//
  self.gameId = null;
  self.playerName = null

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
      isCzar: false
      // numPlayersInRoom : self.host.numPlayersInRoom,
    };
    socket.emit('playerJoinGame', data);
  }

  //When a player clicks Join a Game the Join Game view is displayed.
  self.playerJoinView = function(){
    console.log(self.host.players);
    self.playerJoining = true;
  }

  function playerJoinedRoom(data) {
    // When a player joins a room, do the updateWaitingScreen funciton.
    updateWaitingScreen(data);
  }
  //
  function updateWaitingScreen(data) {
    // Update host screen - switch to angular
    $('#playersWaiting').append('<p/>Player ' + data.playerName + ' joined the game.</p>');
    $('#playerWaitingMessage').append('<p>Joined Game ' + data.gameId + '. Waiting on other players... Please wait for the game to begin.</p>');

    // Store the new player's data on the Host.
    self.host.players.push(data);
    // Increment the number of players in the room
    self.host.numPlayersInRoom += 1;
    // If x players have joined, start the game!
    if (self.host.numPlayersInRoom === 2) {
      console.log('Room is full. Initilizing hostRoomFull!');
      // Let the server know that x players are present.
      socket.emit('hostRoomFull', self.gameSetup.gameId);
    }
  }
  //
  // function updatePlayerWaitingScreen(data) {
  //   console.log('what is this data?', data);
  //   if(socket.id === data.mySocketId){
  //     self.gameSetup.myRole = 'Player';
  //     self.gameSetup.gameId = data.gameId;
  // $('#playerWaitingMessage').append('<p>Joined Game ' + data.gameId + '. Waiting on other players... Please wait for the game to begin.</p>');
  //   }
  // }

  //************************//
  //                        //
  //    GAME START VIEWS    //
  //                        //
  //************************//

  function beginNewGame(data) {
    socket.emit('changeHostView', self.host.hostSocketId)
    //loop through player sockets to find player socket ID information, and update their view specifically
    for (var i = 0; i < self.host.players.length; i++) {
      socketId = self.host.players[i].mySocketId;
      socket.emit('changePlayerView', socketId);
    }
  }

  function onChangeHostView(){
    //changes the hosts view
    postNewGameToDatabase(self.gameSetup.gameId);
    $scope.$apply(hostGameTemplate());
  }

  function onChangePlayerView(){
    //changes the players view
    $scope.$apply(playerGameTemplate());
  }

  function hostGameTemplate(){
    self.hostGameTemplate = true;
    self.gameSetup.isStarted
  }

  function playerGameTemplate(){
    self.playerGameTemplate = true;
    self.playerJoining = false;
  }

  //**********************************************************//
  //                                                          //
  //                     GAME LOGIC START                     //
  //                                                          //
  //**********************************************************//

  //Add game to the database
  function postNewGameToDatabase(inGameId){
    gameIdObject = {gameId: inGameId};
    $http({
      method: 'POST',
      url: '/game/newGame',
      data: gameIdObject
    }).then(function(response){
      databaseId = response.data[0].id;
      //Draw a black card. A black card that has been drawn, cannot be drawn again.
      drawBlackCard(databaseId);
      drawCards();
      setCzar();
      console.log('self.host.players', self.host.players);
    });
  }

  //****************************//
  //                            //
  //    Black Card Functions    //
  //                            //
  //****************************//

  //~.:------------>DRAW A BLACK CARD<------------:.~//
  self.databaseId = 0;   //This is the 100% unique id taken from the database.

  function drawBlackCard(databaseId){
    self.databaseId = databaseId;
    objectToSend = {gameId: databaseId};
    $http({
      method: 'POST',
      url: '/allBlackCards',
      data: objectToSend
    }).then(function(response){
      var blackCard = response.data[0]; //this is the black card that was drawn
      self.host.currentBlackCard = blackCard;
      var blackCardId = response.data[0].id;
      // console.log('blackCardId', blackCardId, 'databaseId', self.databaseId);
      //Make sure the black card that was drawn, cannot be drawn again.
      removeBlackCardFromDeck(blackCardId, databaseId);
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
  function drawCards(){ //Give this function the player array
    objectToSend = {gameId: self.databaseId}; //I need to send the database ID
    console.log('database id at drawCards', self.databaseId);
    console.log('players cards', self.host.players[0].currentCards);
    console.log('players', self.host.players);

    $http({
      method: 'POST',
      url: '/allWhiteCards',
      data: objectToSend //database id object
    }).then(function(response){
      var whiteCardDeck = response.data; //this is the shuffled deck of white cards
      for (var i = 0; i < self.host.players.length; i++) { //loops through the player array
        var cardsToDraw = self.gameSetup.whiteCardsRequired - self.host.players[i].cardsInHand.length; //sets the number of cards to draw based on how many are needed
        addCardsToHand(cardsToDraw, whiteCardDeck, self.host.players[i]); //takes white cards from the shuffled white deck based on num needed
        cards = self.host.players[i].cardsInHand; //sets cards to the current players hand of cards.
        for (var j = 0; j < cards.length; j++) { //loops through the players cards and adds them to the database one at a time
          removeCardsFromDeck(cards[j].id); //This adds cards to my database so that I can compare later to ensure no cards that have already been drawn are drawn again.
        }
      }
    });
  }
  //~.:------------>ADD CARDS TO THE PLAYER OBJECT<------------:.~//
  function addCardsToHand(numberCardsToDraw, deck, player) {
    for (i = 0; i < numberCardsToDraw; i++) {
      var whiteIndex = Math.floor(Math.random() * deck.length); //selects a white card from the deck at random
      player.cardsInHand.push(deck[whiteIndex]); //pushes the random card into the players hand
      deck.splice(whiteIndex, 1); //Removes the random card from the shuffled deck.
    }
    socket.emit('findPlayersCards', self.host.players);
  }
  //~.:------------>REMOVE THE CARDS FROM THE DECK<------------:.~//
  function removeCardsFromDeck(cardId){
    var whiteCardObject = {gameId: self.databaseId, cardId: cardId };
    $http({
      method: 'POST',
      url: '/postWhiteCards',
      data: whiteCardObject
    }).then(function(response){
    });
  }

  function dealWhiteCards(data){
    console.log('deal white cards', data);
    $scope.$apply(showCardsOnDom(data));
  }

  function showCardsOnDom(cardArray){
    self.playerCardsInHand = cardArray;
  }

  //***********************************//
  //                                   //
  //    SELECTING AND SENDING CARDS    //
  //                                   //
  //***********************************//

  //~.:------------>SELECT CARD CSS CHANGES<------------:.~//
  self.selectCard = function(card, cardsInHand){
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

//~.:------------>SEND CARDS TO CZAR<------------:.~//
self.sendCardsToCzar = function(player){
  var cardsInHand = player.currentCards; //finds the players cards
  var numberOfSelectedCards = checkCardsInHand(cardsInHand);
  var cardsToPick = self.gameSetup.cardsToPick;  //finds out what the current rounds 'number of cards to pick' is set to
  if (numberOfSelectedCards == cardsToPick) {
    nextPlayer(player); //sends white cards, and sets the next player.
  }
}

//~.:------------>TIES PLAYER TO CARD THAT WAS SENT<------------:.~//
function whiteCardsToSend(player){
  var playerCards = player.currentCards; //finds the cards that the player is holding
  var playerName = player.playerName;
  for (var i = 0; i < playerCards.length; i++) { //loops through the players cards
    playerCards[i].playerName = playerName; //this ties the player to the card that was sent.
    if(playerCards[i].selected){ //finds the ones that have been selected
      self.round.cardsToJudge.push(playerCards[i]); //adds the card to the cards to judge array.
      playerCards.splice(i, 1);
      // playerCards[i] = {removeMe: i}; //sets that card to null.
      for (var i = 0; i < self.round.cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
        self.round.cardsToJudge[i].selected = false;
      }//ends for
    }//ends if
  }//ends for
  shuffleArray(self.round.cardsToJudge); //shuffles the array so that the czar doesn't know who the card came from.
}//ends function

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
//**********************//
//                      //
//    CZAR FUNCTIONS    //
//                      //
//**********************//

//hard coded who czar is... NEED TO MAKE DYNAMIC
function setCzar(){
  console.log('set czar', self.host.players);
  console.log('is Czar?', self.host.players[0].isCzar);
  player = self.host.players
  if (player[0].isCzar){
    player[0].isCzar = false;
    player[1].isCzar = true;
  } else if (player[1].isCzar){
    player[1].isCzar = false;
    // player[2].isCzar = true;
    player[0].isCzar = true;
  }
  // else if (player[2].isCzar){
  //   player[2].isCzar = false;
  //   player[3].isCzar = true;
  // }else if (player[3].isCzar){
  //   player[3].isCzar = false;
  //   player[0].isCzar = true;
  // }
  else {
    player[0].isCzar = true;
  }
  console.log(player);
}

//player view needs to change based on who the Czar is.
//host view needs to reflect who the Czar is.

//select the CZAR player
//send cards to czar
//check if all players have played their cards
//if they have, it's time for czar to select a winner
//award points
//check if game winner
//select the next czar
//draw white cards
//draw black card

}]);
