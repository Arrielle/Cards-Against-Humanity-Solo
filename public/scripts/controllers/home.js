myApp.controller('HomeController', ['$scope', '$http', function($scope, $http) {
  console.log('home controller running');
  var self = this;

  self.link = window.location.origin;

  //********************************//
  //                                //
  //        Socket Functions        //
  //                                //
  //********************************//
  var socket = io.connect();

  // socket.on('newGameCreated', onNewGameCreated );
  socket.on('gameInitView', gameInitView);
  socket.on('playerJoinedRoom', playerJoinedRoomNotice);
  socket.on('drawNewBlackCard', displayBlackCard);
  socket.on('gameStartHost', gameStartHostView);
  socket.on('drawWhiteCards', drawWhiteCards);
  socket.on('sendCards', sendCards);
  socket.on('czarView', czarView);
  socket.on('judgementTime', judgementTime);
  socket.on('errorAlert', error);
  // socket.on('message', logItOut);
  //
  // function logItOut(message){
  //   console.log(message.text);
  // }

  //*******************************//
  //                               //
  //    Host Join/Game Creation    //
  //                               //
  //*******************************//

  //Emits Data to the Server and Spins up a New Socket Room
  self.onCreateClick = function () {
    socket.emit('hostCreateNewGame');
  }
  //Call to this function was sent from the server, with the room ID.
  function gameInitView(thisRoomId) {
    $scope.$apply(showHostView(thisRoomId));
  }
  //Updates The Host's View
  function showHostView(thisRoomId){
    self.isStarted = true;
    self.gameTemplate = false;
    self.roomId = thisRoomId;
  }

  //*******************//
  //                   //
  //    Player Join    //
  //                   //
  //*******************//

  //When a player clicks Join a Game the Join Game view is displayed.
  self.playerJoinView = function(){
    self.playerJoining = true;
  }
  //player has clicked start
  self.onPlayerStartClick = function () {
    // collect data to send to the server/database
    var userData = {roomId : self.roomId, playerName : self.playerName};
    socket.emit('playerJoinGame', userData);
  }
  //Error if the user tries to join a room that is full, or non existant.
  function error(data) {
    swal({
      title: 'Oops...',
      text: data.message,
      confirmButtonColor: '#000',
    });
  }

  function playerJoinedRoomNotice(player) {
    // When a player joins a room, do the updateWaitingScreen function
    // Need to upgrade to angular.
    $('#playersWaiting').append('<p/>Player ' + player.playerName + ' joined the game.</p>');
    $('#playerWaitingMessage').append('<p>Joined Game ' + player.playerName + '. Waiting on other players... Please wait for the game to begin.</p>');
  }

  //****************************//
  //                            //
  //    GAME INITILIZE VIEWS    //
  //                            //
  //****************************//

  function gameStartHostView(players){
    $scope.$apply(applyNewHostView(players));
  }

  function applyNewHostView(players){
    self.gameTemplate = true;
    self.players = players;
  }

  function displayBlackCard(blackCardText){
    $scope.$apply(applyBlackCard(blackCardText));
  }

  function applyBlackCard(blackCardText){
    self.currentBlackCard = blackCardText;
  }

  function drawWhiteCards(player){
    $scope.$apply(applyWhiteCards(player));
  }

  function applyWhiteCards(player){
    // self.cardsInHand = player.cardsInHand;
    self.player = player;
    self.playerGameTemplate = true;
  }

  function sendCards(player){
    $scope.$apply(applyWhiteCards(player));
  }

  function applySendCards(player){
    self.player = player;
  }

  function czarView(isCzar, player){
    $scope.$apply(applyCzarView(isCzar, player));
  }

  function applyCzarView(isCzar, player){
    self.playerIsCzar = isCzar;
    self.playerGameTemplate = true;
  }

  function judgementTime(cardsToJudge){
    $scope.$apply(applyCards(cardsToJudge));
  }

  function applyCards(cardsToJudge){
    self.cardsToJudge = cardsToJudge;
  }

  //***********************************//
  //                                   //
  //    SELECTING AND SENDING CARDS    //
  //                                   //
  //***********************************//

  //   //~.:------------>SELECT CARD CSS CHANGES<------------:.~//
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
  var cardsToPick = 1;  //hard coded //finds out what the current rounds 'number of cards to pick' is set to
  var numberOfSelectedCards = checkCardsInHand(cardsInHand);  //Checks to see if the correct number of cards has been chosen
  if (numberOfSelectedCards > cardsToPick){ //if the number of cards selected is > cards to pick, it removes the .selected from all cards in the array.
    for (var i = 0; i < cardsInHand.length; i++) {
      cardsInHand[i].selected = false;
    }
    card.selected = true; //sets the card that was last clicked as the selected card. (it was removed by my previous if)
  }
}

// ~.:------------>SEND CARDS TO CZAR<------------:.~//
self.sendCardsToCzar = function(playerCards, playerObject){
  var numberOfSelectedCards = checkCardsInHand(playerCards);
  if (numberOfSelectedCards == 1){
    socket.emit('cardToJudge', playerCards, playerObject);
    self.playerDone = true;
  }
}

//DECLARE A WINNER!

// function whiteCardsToSend(playerCards, playerObject){
//   for (var i = 0; i < game.players.length; i++) { //loops through the players (server)
//     if (game.players[i].mySocketId == playerObject.mySocketId) { //finds the correct socket/player
//       // console.log('beforesplice', playerObject.cardsInHand.length);
//       for (var j = 0; j < playerCards.length; j++) { //loops through the players cards
//         if(playerCards[j].selected){ //finds the ones that have been selected
//           game.cardsToJudge.push(playerCards[j]); //adds the card to the cards to judge array.
//           playerCards.splice(j, 1); //also splice the same card from the game.players.cardsInHand
//           game.players[i].cardsInHand.splice(j, 1);
//           playerObject.cardsInHand = game.players[i].cardsInHand;
//           // console.log('aftersplice', playerObject.cardsInHand.length);
//           io.to(playerObject.mySocketId).emit('updatePlayerView', true, playerObject);
//         }//ends if
//       }//ends for
//     }
//   }
//   for (var i = 0; i < game.cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
//     game.cardsToJudge[i].selected = false;
//   }//ends for
//   shuffleArray(game.cardsToJudge); //shuffles the array so that the czar doesn't know who the card came from.
// }//ends function

//~.:------------>TIES PLAYER TO CARD THAT WAS SENT<------------:.~//
// function whiteCardsToSend(playerCards, playerObject){
//   //NEED TO KNOW ABOUT ALL PLAYERS...
//   for (var i = 0; i < game.players.length; i++) { //loops through the players (server)
//     if (game.players[i].mySocketId == playerObject.mySocketId) { //finds the correct socket/player
//       // console.log('beforesplice', playerObject.cardsInHand.length);
//       for (var j = 0; j < playerCards.length; j++) { //loops through the players cards
//         if(playerCards[j].selected){ //finds the ones that have been selected
//           game.cardsToJudge.push(playerCards[j]); //adds the card to the cards to judge array.
//           playerCards.splice(j, 1); //also splice the same card from the game.players.cardsInHand
//           game.players[i].cardsInHand.splice(j, 1);
//           playerObject.cardsInHand = game.players[i].cardsInHand;
//           // console.log('aftersplice', playerObject.cardsInHand.length);
//           io.to(playerObject.mySocketId).emit('updatePlayerView', true, playerObject);
//         }//ends if
//       }//ends for
//     }
//   }
//   for (var i = 0; i < game.cardsToJudge.length; i++) {//changes all cards in the array from selected to unselected.
//     game.cardsToJudge[i].selected = false;
//   }//ends for
//   shuffleArray(game.cardsToJudge); //shuffles the array so that the czar doesn't know who the card came from.
// }//ends function
//
// function shuffleArray(array) {
//   for (var i = array.length - 1; i > 0; i--) {
//     var j = Math.floor(Math.random() * (i + 1));
//     var temp = array[i];
//     array[i] = array[j];
//     array[j] = temp;
//   }
//   return array;
// }
// //**********************//
// //                      //
// //    CZAR FUNCTIONS    //
// //                      //
// //**********************//

// //~.:------------>CHANGES THE CZAR VIEW<------------:.~//
// function czarView(data){
//   $scope.$apply(applyCzar(data));
// }
//
// function applyCzar(data){
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
self.selectRoundWinner = function(cardsToJudge){
  //go to the server -> figure out who it was
  socket.emit('selectRoundWinner', cardsToJudge);
}
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
