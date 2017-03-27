myApp.controller('HomeController', ['$scope', function($scope) {
  console.log('home controller running');
  var self = this;
  var socket = io();

  self.message = 'Welcome to the Home View!';
  self.link = window.location.origin;

  socket.on('newGameCreated', onNewGameCreated );
  socket.on('errorAlert', error);
  socket.on('fullRoomError', fullRoomError);
  socket.on('playerJoinedRoom', playerJoinedRoom);
  socket.on('beginNewGame', beginNewGame );
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

  function fullRoomError(){
    alert(data.message);
  }


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
  }

  self.host = {
      numPlayersInRoom: 0,
      isNewGame: false,
      players: [],
      currentBlackCard: null,
      currentRound: 0,
    }

  //*******************//
  //                   //
  //    Player Join    //
  //                   //
  //*******************//

  //Error connecting


  function error(data) {
    console.log('error?', data);
    alert(data.message);
  }

  //player has clicked start
  self.onPlayerStartClick = function () {
    console.log('Player clicked "Start"');
    // collect data to send to the server
    var data = {
      gameId : +($('#inputGameId').val()),
      playerName : $('#inputPlayerName').val() || 'anon',
      numPlayersInRoom : self.host.numPlayersInRoom
    };

    // console.log(data);

    // Send the gameId and playerName to the server
    if (self.host.numPlayersInRoom < 2){
    socket.emit('playerJoinGame', data);
  } else {
    socket.emit('roomIsFull', data);
  }
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

  //
  function playerJoinedRoom(data) {
    // When a player joins a room, do the updateWaitingScreen funciton.
    // There are two versions of this function: one for the 'host' and
    // another for the 'player'.
    //
    // On the 'host' browser window, the App.Host.updateWiatingScreen function is called.
    // And on the player's browser, App.Player.updateWaitingScreen is called.
    if (self.host.numPlayersInRoom < 2){
    updatePlayerWaitingScreen(data);
    updateWaitingScreen(data);
  } else {
    alert('Sorry, but it looks like this room is full.');
  }
  }
  //
  function updateWaitingScreen(data) {
    // If this is a restarted game, show the screen.
    // if ( self.host.isNewGame ) {
    //   // App.Host.displayNewGameScreen();
    // }
    // Update host screen
    console.log(data.playerName);
    $('#playersWaiting').append('<p/>Player ' + data.playerName + ' joined the game.</p>');

    // Store the new player's data on the Host.
    console.log('update screen data', data);
    self.host.players.push(data);

    // Increment the number of players in the room
    self.host.numPlayersInRoom += 1;
    console.log('numPlayersInRoom', self.host.numPlayersInRoom);

    // If four players have joined, start the game!
    if (self.host.numPlayersInRoom === 2) {
      // console.log('Room is full. Almost ready!');

      // Let the server know that four players are present.
      socket.emit('hostRoomFull', self.App.gameId);
    }
  }
  //
  function updatePlayerWaitingScreen(data) {
    if(socket.id === data.mySocketId){
      self.App.myRole = 'Player';
      self.App.gameId = data.gameId;

      $('#playerWaitingMessage').append('<p>Joined Game ' + data.gameId + '. Waiting on other players... Please wait for the game to begin.</p>');
    }
  }
  //

  function beginNewGame(data) {
    console.log('data in begin new game', data);
    console.log('players', self.host.players);
      // App[App.myRole].gameCountdown(data);
  }

}]);
