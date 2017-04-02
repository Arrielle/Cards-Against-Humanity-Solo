myApp.controller('HomeController', ['$scope', '$http', function($scope, $http) {
  console.log('home controller running');
  var self = this;
  var socket = io();

  self.link = window.location.origin;
  //
  //   //********************************//
  //   //                                //
  //   //        Socket Functions        //
  //   //                                //
  //   //********************************//
  //
  // socket.on('newGameCreated', onNewGameCreated );
  socket.on('gameInitView', gameInitView);
  socket.on('playerJoinedRoom', playerJoinedRoomNotice);
  // socket.on('checkingIfPlayersReady', checkingIfPlayersReady);
  //   socket.on('dealWhiteCards', dealWhiteCards);
  //   socket.on('showCzarView', czarView);
  //   socket.on('czarCards', updateCzarView);
  //   socket.on('updatePlayerView', updatePlayerView);
  //   socket.on('newRound', newRound);
  socket.on('postPlayer', postPlayer);
  //   // socket.on('sendCardsToServer', sendCardsToServer)
  //ALERTS
  socket.on('errorAlert', error);
  //VIEW CHANGES
  socket.on('changeHostView', onChangeHostView);
  socket.on('changePlayerView', onChangePlayerView);
  //
  //   //*******************************//
  //   //                               //
  //   //    Host Join/Game Creation    //
  //   //                               //
  //   //*******************************//
  //Emits Data to the Server and Spins up a New Socket Room
  self.onCreateClick = function () {
    socket.emit('hostCreateNewGame');
  }

  function gameInitView(thisRoomId) {
    $scope.$apply(showHostView(thisRoomId));
  }

  function showHostView(thisRoomId){
    self.isStarted = true;
    self.gameTemplate = false;
    self.roomId = thisRoomId;
  }

  //   //*******************//
  //   //                   //
  //   //    Player Join    //
  //   //                   //
  //   //*******************//
  //player has clicked start
  self.onPlayerStartClick = function () {
    console.log('clicked');
    // collect data to send to the server/database
    var data = {
      roomId : self.roomId,
      playerName : self.playerName,
    };
    socket.emit('playerJoinGame', data);
  }
  //Error if the user tries to join a room that is full, or non existant.
  //Should also alert if the username is empty
  //Should also alert if the username is already in use in THIS room.
  function error(data) {
    swal({
      title: 'Oops...',
      text: data.message,
      confirmButtonColor: '#000',
    });
  }

  // function checkingIfPlayersReady(playersArray){
  //   console.log('heyho', playersArray);
  //   roomId = playersArray.roomId;
  // }

  function postPlayer(playerObject){
    //THIS ADDS THE PLAYER TO THE PLAYERS TABLE
    $http({
      method: 'POST',
      url: '/newPlayer',
      data: playerObject
    }).then(function(response){
      updatePlayerInDatabase(playerObject);
    });
  }
  //THIS JOINS THE PLAYERS TABLE WITH THE GAME_INIT TABLE AND SETS THE GAME ID
  function updatePlayerInDatabase(playerObject){
    $http({
      method: 'PUT',
      url: '/addPlayersToGame',
      data: playerObject
    }).then(function(response){
      gameId = response.data[0].id;
      findGameInformation(gameId);
    });
  }

  function findGameInformation(gameId){
    gameIdObject = {gameId: gameId};
    console.log('object?', gameIdObject.gameId);
    //FINDS ALL PERTINENT GAME INFORMATION
    $http({
      method: 'POST',
      url: '/game/findGame',
      data: gameIdObject
    }).then(function(response){
      console.log('RESPONSE AT GAME INFORMATION', response);

      //consider emitting this logic to the server so that the client does not have access to the information?
      //then from the server emit something back to draw the cards?

      gameSettings = {
        gameId: response.data[0].id,
        roomId: response.data[0].room_id,
        hostSocketId: response.data[0].hostsocket_id,
        currentBlackCard: response.data[0].currentblackcard_id,
        whiteCardsRequired: response.data[0].whitecardsrequired,
        cardsToPick: response.data[0].cardstopick,
        currentRound: response.data[0].currentround,
        pointsToWin: response.data[0].pointstowin,
        isStarted: response.data[0].isstarted,
        isOver: response.data[0].isover,
        numberOfPlayers: 2 //hard coded
      }

      var players = [];

      for (var i = 0; i < response.data.length; i++) {
        players[i] = {
          playerName: response.data[i].player_name,
          mySocketId: response.data[i].mysocket_id,
          score: response.data[i].score,
          isCzar: response.data[i].isczar,
          isReady: response.data[i].isready,
          isRoundWinner: response.data[i].isroundwinner,
          isGameWinner: response.data[i].isgamewinner,
          cardsInHand: [],
        }
      }
      var maxRoomSize = gameSettings.numberOfPlayers;
      console.log('MAX ROOM SIZE', maxRoomSize);
      //NOW take the players and give both of them ten cards
      if(players.length == maxRoomSize){
        console.log('i hit my if!');
        console.log('players in game?', players);
        //emit to server the new playerArray along with the hostID
        // socket.emit('allPlayersConnected', gameSettings, players);
        // drawWhiteCardDeck(gameSettings, players);
      }
    });
  }
  //
  function drawWhiteCardDeck(gameSettings, players){ //Give this function the player array
    objectToSend = {gameId: gameSettings.gameId}; //I need to send the database ID
    $http({
      method: 'POST',
      url: '/allWhiteCards',
      data: objectToSend //database id object
    }).then(function(response){
      var whiteCardDeck = response.data; //this is the shuffled deck of white cards

      socket.emit('dealCardsToPlayers', gameSettings, players, whiteCardDeck);

      //emit the cards to the server
      //draw cards and push them into the player object
      //emit back to the host so it can remove the correct cards from the database
      //sounds good to meeee ?
    });
  }
  //
  //   function addCardsToHand(numberCardsToDraw, deck, player, databaseId, game) {
  //     console.log('database id????', databaseId);
  //     var playerName = player.playerName;
  //     for (i = 0; i < numberCardsToDraw; i++) {
  //       var whiteIndex = Math.floor(Math.random() * deck.length); //selects a white card from the deck at random
  //       player.cardsInHand.push(deck[whiteIndex]); //pushes the random card into the players hand
  //       deck.splice(whiteIndex, 1); //Removes the random card from the shuffled deck.
  //     }
  //     for (var i = 0; i < player.cardsInHand.length; i++) {
  //       player.cardsInHand[i].databaseId = databaseId;
  //       player.cardsInHand[i].gameId = game.gameId;
  //       player.cardsInHand[i].playerName = player.playerName;
  //       player.cardsInHand[i].cardsToPick = game.cardsToPick;
  //     }
  //     socket.emit('findPlayersCards', game.players);
  //   }
  //
  //When a player clicks Join a Game the Join Game view is displayed.
  self.playerJoinView = function(){
    self.playerJoining = true;
  }
  //
  function playerJoinedRoomNotice(player) {
    // When a player joins a room, do the updateWaitingScreen funciton. //BAD!

      $('#playersWaiting').append('<p/>Player ' + player.playerName + ' joined the game.</p>');
      $('#playerWaitingMessage').append('<p>Joined Game ' + player.playerName + '. Waiting on other players... Please wait for the game to begin.</p>');

  }


  //
  //   //************************//
  //   //                        //
  //   //    GAME START VIEWS    //
  //   //                        //
  //   //************************//
  //
  function onChangeHostView(gameData, hostViewData){

    console.log('room id? ', gameData.roomId, 'players? ', gameData.players);

    postNewGameToDatabase(gameData.roomId, gameData.players, gameData);
    //changes the hosts view
    $scope.$apply(changeHostView(gameData, hostViewData));
  }
  //
  function changeHostView(gameData){
    // console.log('WHAT IS THIS GAME', game.currentBlackCard);
    self.hostGameTemplate = hostViewData.hostGameTemplate;
    self.gameSetup.isStarted = hostViewData.isStarted;
    self.gameTemplate = hostViewData.gameTemplate;
    self.players = gameData.players;
    // setCurrentBlackCard(game.currentBlackCard)
  }
  //
  //   function setCurrentBlackCard(blackCard){
  //     self.currentBlackCard = blackCard;
  //   }
  //
  function onChangePlayerView(){
    $scope.$apply(applyPlayerView());
  }
  //
  function applyPlayerView(){
    self.playerGameTemplate = true; //true
    self.playerJoining = false; //false
  }
  //
  //   //**********************************************************//
  //   //                                                          //
  //   //                     GAME LOGIC START                     //
  //   //                                                          //
  //   //**********************************************************//
  //
  //   //Add game to the database
  //   function postNewGameToDatabase(inGameId, players, game){
  //     //bring data here and put it into setCzar ---
  //     console.log('post new game', inGameId);
  //     gameIdObject = {gameId: inGameId};
  //     $http({
  //       method: 'POST',
  //       url: '/game/newGame',
  //       data: gameIdObject
  //     }).then(function(response){
  //       databaseId = response.data[0].id;
  //       game.databaseId = response.data[0].id;
  //       //Draw a black card. A black card that has been drawn, cannot be drawn again.
  //       drawBlackCard(databaseId, players, game);
  //       drawCards(databaseId, players, game);
  //       setCzar(game);
  //       console.log('DATATREE', game.players);
  //     });
  //   }
  //
  //   function setCzar(game) {
  //     console.log('WHAT IS THE GAME.PLAYERS', game.players);
  //     if (game.players[0].isCzar){
  //       game.players[0].isCzar = false;
  //       game.players[1].isCzar = true;
  //     } else if (game.players[1].isCzar){
  //       game.players[1].isCzar = false;
  //       // game.players[2].isCzar = true;
  //       game.players[0].isCzar = true;
  //
  //     }
  //     // else if (game.players[2].isCzar){
  //     //   game.players[2].isCzar = false;
  //     //   game.players[3].isCzar = true;
  //     // }else if (game.players[3].isCzar){
  //     //   game.players[3].isCzar = false;
  //     //   game.players[0].isCzar = true;
  //     // }
  //     else {
  //       game.players[0].isCzar = true;
  //     }
  //     console.log('WHAT IS THE GAME.PLAYERS', game.players);
  //
  //     socket.emit('findCzar', game.players)
  //   }
  //
  //
  //   //****************************//
  //   //                            //
  //   //    Black Card Functions    //
  //   //                            //
  //   //****************************//
  //
  //   //~.:------------>DRAW A BLACK CARD<------------:.~//
  //   function drawBlackCard(databaseId, players, game){
  //     objectToSend = {gameId: databaseId};
  //     $http({
  //       method: 'POST',
  //       url: '/allBlackCards',
  //       data: objectToSend
  //     }).then(function(response){
  //       var blackCard = response.data[0]; //this is the black card that was drawn
  //       setCurrentBlackCard(blackCard);
  //
  //       game.currentBlackCard = blackCard;
  //
  //       console.log('card text?', game.currentBlackCard.text);
  //       console.log('card id?', game.currentBlackCard.id);
  //       // console.log('in draw post', self.host.currentBlackCard.text);
  //       var blackCardId = game.currentBlackCard.id;
  //       removeBlackCardFromDeck(blackCardId, databaseId);
  //       console.log('game inside of post', game);
  //     });
  //   }
  //   //~.:------------>REMOVE BLACK CARD FROM 'DECK'<------------:.~//
  //   function removeBlackCardFromDeck(cardId, databaseId){
  //     var blackCardObject = {gameId: databaseId, cardId: cardId };
  //     $http({
  //       method: 'POST',
  //       url: '/postBlackCards',
  //       data: blackCardObject
  //     }).then(function(response){
  //     });
  //   }
  //
  //   //****************************//
  //   //                            //
  //   //    White Card Functions    //
  //   //                            //
  //   //****************************//
  //   //~.:------------>DRAW WHITE CARDS AT RANDOM<------------:.~//
  //   function drawCards(databaseId, players, game){ //Give this function the player array
  //     objectToSend = {gameId: databaseId}; //I need to send the database ID
  //     $http({
  //       method: 'POST',
  //       url: '/allWhiteCards',
  //       data: objectToSend //database id object
  //     }).then(function(response){
  //       var whiteCardDeck = response.data; //this is the shuffled deck of white cards
  //       for (var i = 0; i < players.length; i++) { //loops through the player array
  //         var cardsToDraw = game.whiteCardsRequired - players[i].cardsInHand.length; //sets the number of cards to draw based on how many are needed
  //         addCardsToHand(cardsToDraw, whiteCardDeck, players[i], databaseId, game); //takes white cards from the shuffled white deck based on num needed
  //         cards = players[i].cardsInHand; //sets cards to the current players hand of cards.
  //         for (var j = 0; j < cards.length; j++) { //loops through the players cards and adds them to the database one at a time
  //           removeCardsFromDeck(cards[j].id, databaseId); //This adds cards to my database so that I can compare later to ensure no cards that have already been drawn are drawn again.
  //         }
  //       }
  //     });
  //   }
  //   // ~.:------------>ADD CARDS TO THE PLAYER OBJECT<------------:.~//
  //   function addCardsToHand(numberCardsToDraw, deck, player, databaseId, game) {
  //     console.log('database id????', databaseId);
  //     var playerName = player.playerName;
  //     for (i = 0; i < numberCardsToDraw; i++) {
  //       var whiteIndex = Math.floor(Math.random() * deck.length); //selects a white card from the deck at random
  //       player.cardsInHand.push(deck[whiteIndex]); //pushes the random card into the players hand
  //       deck.splice(whiteIndex, 1); //Removes the random card from the shuffled deck.
  //     }
  //     for (var i = 0; i < player.cardsInHand.length; i++) {
  //       player.cardsInHand[i].databaseId = databaseId;
  //       player.cardsInHand[i].gameId = game.gameId;
  //       player.cardsInHand[i].playerName = player.playerName;
  //       player.cardsInHand[i].cardsToPick = game.cardsToPick;
  //     }
  //     socket.emit('findPlayersCards', game.players);
  //   }
  //   //~.:------------>REMOVE THE CARDS FROM THE DECK<------------:.~//
  //   function removeCardsFromDeck(cardId, databaseId){
  //     var whiteCardObject = {gameId: databaseId, cardId: cardId };
  //     $http({
  //       method: 'POST',
  //       url: '/postWhiteCards',
  //       data: whiteCardObject
  //     }).then(function(response){
  //     });
  //   }
  //
  //   function dealWhiteCards(data, game){
  //     $scope.$apply(showCardsOnDom(data, game));
  //   }
  //
  //   function showCardsOnDom(data, game){
  //     self.playerObject = data;
  //   }
  //
  //   //***********************************//
  //   //                                   //
  //   //    SELECTING AND SENDING CARDS    //
  //   //                                   //
  //   //***********************************//
  //
  //   //~.:------------>SELECT CARD CSS CHANGES<------------:.~//
  //   self.selectCard = function(card, cardsInHand, playerName, playerObject){
  //     card.selected = true; //gives the card that was selected a property of 'selected' and sets it to true.
  //     playerObject.hasPlayed = true; //need to update the view based on this...
  //     var cardsToPick = 1;  //finds out what the current rounds 'number of cards to pick' is set to
  //     var numberOfSelectedCards = checkCardsInHand(cardsInHand);  //Checks to see if the correct number of cards has been chosen
  //     if (numberOfSelectedCards > cardsToPick){ //if the number of cards selected is > cards to pick, it removes the .selected from all cards in the array.
  //       for (var i = 0; i < cardsInHand.length; i++) {
  //         cardsInHand[i].selected = false;
  //       }
  //       card.playerName = playerName;
  //       card.selected = true; //sets the card that was last clicked as the selected card. (it was removed by my previous if)
  //     }
  //   }
  //
  //   //~.:------------>DETERMINES HOW MANY CARDS A PLAYER HAS SELECTED TO SEND TO THE CZAR<------------:.~//
  //   function checkCardsInHand(cardsInHand){
  //     var numberOfSelectedCards = 0; //initialized numberOfSelctedCards to 0
  //     for (var i = 0; i < cardsInHand.length; i++) { //checks to see how many 'numberOfSelectedCards' there really are
  //     if(cardsInHand[i].selected){
  //       numberOfSelectedCards++
  //     }
  //   }
  //   return numberOfSelectedCards;
  // }
  //
  // //~.:------------>SELECT CARD CSS CHANGES WHEN CZAR SELECTING<------------:.~//
  // self.selectCardCzar = function(card, cardsInHand){
  //   card.selected = true; //gives the card that was selected a property of 'selected' and sets it to true.
  //   var cardsToPick = self.gameSetup.cardsToPick;  //finds out what the current rounds 'number of cards to pick' is set to
  //   var numberOfSelectedCards = checkCardsInHand(cardsInHand);  //Checks to see if the correct number of cards has been chosen
  //   if (numberOfSelectedCards > cardsToPick){ //if the number of cards selected is > cards to pick, it removes the .selected from all cards in the array.
  //     for (var i = 0; i < cardsInHand.length; i++) {
  //       cardsInHand[i].selected = false;
  //     }
  //     card.selected = true; //sets the card that was last clicked as the selected card. (it was removed by my previous if)
  //   }
  // }
  //
  // //~.:------------>SEND CARDS TO CZAR<------------:.~//
  // self.sendCardsToCzar = function(playerCards, playerObject){
  //   socket.emit('sendCardsToCzar', playerCards, playerObject)
  // }
  //
  // //**********************//
  // //                      //
  // //    CZAR FUNCTIONS    //
  // //                      //
  // //**********************//
  // //~.:------------>SETS THE CURRENT CZAR<------------:.~//
  // //hard coded who czar is... NEED TO MAKE DYNAMIC
  // // function setCzar(players){
  // //   console.log('setCzar: ', players);
  // //   socket.emit('setCzar', players);
  // // }
  // //~.:------------>CHANGES THE CZAR VIEW<------------:.~//
  // function czarView(data){
  //   $scope.$apply(fuckinghell(data));
  // }
  //
  // function fuckinghell(data){
  //   self.playerIsCzar = data;
  // }
  //
  // function updateCzarView(data){
  //   console.log(data);
  //   $scope.$apply(cardsToJudgeUpdateView(data));
  // }
  //
  // function cardsToJudgeUpdateView(data){
  //   self.cardsToJudge = data;
  //   //need game here
  // }
  //
  // function updatePlayerView(data, playerObject){
  //   $scope.$apply(playerHasPlayed(data, playerObject));
  // }
  //
  // function playerHasPlayed(data, playerObject){
  //   console.log('here is some epic data', playerObject);
  //   self.playerObject.playersObject.cardsInHand = playerObject.cardsInHand;
  //   self.playerDone = data;
  // }
  //
  // //Sets all players isCzar to false
  // function noCzar(){
  //   //makes view false (can I get rid of this?)
  //   self.playerIsCzar = false;
  //   //makes the status in the host object false.
  //   for (var i = 0; i < self.host.players.length; i++) {
  //     self.host.players[i].isCzar = false;
  //   }
  // }
  //
  // //***************************//
  // //                           //
  // //    SELECT ROUND WINNER    //
  // //                           //
  // //***************************//
  //
  // self.selectRoundWinner = function(cardsToJudge){
  //   //go to the server -> figure out who was
  //   socket.emit('selectRoundWinner', cardsToJudge);
  // }
  //
  // function newRound(game){
  //   databaseId = game.databaseId;
  //   players = game.players;
  //   console.log('ALS;DKJF;ALSDKJF;ALSDJFK', game);
  //   drawBlackCard(databaseId, players, game); //good.
  //   drawCards(databaseId, players, game);
  //   setCzar(game); //needs work.
  //
  //   // drawBlackCard(databaseId, players, game);
  //   // drawCards(databaseId, players, game);
  // }
  //
  // function setRoundWinner(){
  //   //loops through the array of cards to judge
  //   for (var i = 0; i < self.host.cardsToJudge.length; i++) { //loop through cards to judge
  //     //if the card is selected, it's the winner
  //     if(self.host.cardsToJudge[i].selected){ //find the card in the array that is selected
  //       //find the player who sent the card and give them points.
  //       var winner = self.host.cardsToJudge[i].playerName; //find the user who sent that card, and set them to winner.
  //       for (var i = 0; i < self.host.players.length; i++) { //loop through the player array
  //         if(self.host.players[i].playerName == winner){ //whichever player is the winner
  //           self.host.players[i].playerScore++; //gets a point
  //         }//ends if
  //       }//ends for
  //     }//ends if
  //   }//ends for
  // }//ends function
  //
  //
  // //loop through all players, if every player who is not czar hasPlayed, display the button on the czar view
  // //
  //
  // //check if all players have played their cards
  // //if they have, it's time for czar to select a winner
  // //award points
  // //update host view to reflect new score.
  // //check if game winner
  // //reset important round information.
  // //select the next czar
  // //draw white cards
  // //draw black card
  // //host view needs to reflect who the Czar is.
  //
  //
}]);
