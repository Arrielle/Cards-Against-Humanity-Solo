myApp.controller('HomeController', ['$scope', function($scope) {
  console.log('home controller running');
  var self = this;
  var socket = io();

  self.message = 'Welcome to the Home View!';
  self.link = window.location.origin;

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
  socket.on('newGameCreated', onNewGameCreated );

  function onNewGameCreated(data) {
    //$scope.$apply allows angular to see the results even though it's happening outside of angular (sockets).
    //$apply() is used to execute an expression in angular from outside of the angular framework.
    //Because we are calling into the angular framework we need to perform proper scope life cycle of exception handling, executing watches.
    $scope.$apply(gameInit(data));
  }

  function gameInit(data) {
    self.App.gameId = data.gameId;
    self.App.mySocketId = data.mySocketId;
    self.App.myRole = 'Host';
    self.App.isStarted = true;
    // App.Host.numPlayersInRoom = 0;
    console.log("Game started with ID: " + self.App.gameId + ' by host: ' + self.App.mySocketId);
    console.log('self.App on game init?', self.App);

  }

  self.App = {
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
    host: {
      numPlayersInRoom: 0,
      isNewGame: false,
      players: [],
      currentBlackCard: null,
      currentRound: 0,
    },
    player: {
      myName: null
    }
  }

  //*******************//
  //                   //
  //    Player Join    //
  //                   //
  //*******************//


// //this isn't working yet?!
//   self.onPlayerStartClick = function() {
//     console.log('Player clicked "Start"');
//     //

//   }

  self.onPlayerStartClick = function () {
    console.log('Player clicked "Start"');
        // collect data to send to the server
        var data = {
          gameId : +($('#inputGameId').val()),
          playerName : $('#inputPlayerName').val() || 'anon'
        };

        // console.log(data);

        // Send the gameId and playerName to the server
        socket.emit('playerJoinGame', data);

        // Set the appropriate properties for the current player.
        // self.App.myRole = 'Player';
        // self.App.Player.myName = data.playerName;
        // // console.log(self.App);
  }

//When a player clicks Join a Game the Join Game view is displayed.
  self.playerJoinView = function(){
    console.log('player join clicked');
    self.playerJoining = true;
  }

}]);
