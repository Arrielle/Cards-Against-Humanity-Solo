myApp.controller('HomeController', ['$scope', function($scope) {
  console.log('home controller running');
  var self = this;
  var socket = io();

  self.message = 'Welcome to the Home View!';
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
  socket.on('changePlayerView', onChangePlayerView)


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
      numPlayersInRoom : self.host.numPlayersInRoom,
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
    // There are two versions of this function: one for the 'host' and
    // another for the 'player'.
    updatePlayerWaitingScreen(data);
    updateWaitingScreen(data);
  }
  //
  function updateWaitingScreen(data) {
    // Update host screen
    $('#playersWaiting').append('<p/>Player ' + data.playerName + ' joined the game.</p>');
    // Store the new player's data on the Host.
    self.host.players.push(data);
    // Increment the number of players in the room
    self.host.numPlayersInRoom += 1;
    // If x players have joined, start the game!
    if (self.host.numPlayersInRoom === 2) {
      // console.log('Room is full. Almost ready!');
      // Let the server know that x players are present.
      socket.emit('hostRoomFull', self.gameSetup.gameId);
    }
  }
  //
  function updatePlayerWaitingScreen(data) {
    if(socket.id === data.mySocketId){
      self.gameSetup.myRole = 'Player';
      self.gameSetup.gameId = data.gameId;
      $('#playerWaitingMessage').append('<p>Joined Game ' + data.gameId + '. Waiting on other players... Please wait for the game to begin.</p>');
    }
  }

  //************************//
  //                        //
  //    GAME START VIEWS    //
  //                        //
  //************************//

  function beginNewGame(data) {
    console.log('data in begin new game', data);
    socket.emit('changeHostView', self.host.hostSocketId)
    //loop through player sockets to find player socket ID information.
    for (var i = 0; i < self.host.players.length; i++) {
      socketId = self.host.players[i].mySocketId;
      socket.emit('changePlayerView', socketId)
    }
    console.log('players at begin new game', self.host.players);
  }

  function onChangeHostView(){
    console.log('made it to change Host View');
    console.log('in change view', self.gameSetup.myRole);
    $scope.$apply(hostGameTemplate());
    console.log('is template true?', self.hostGameTemplate);
  }

  function onChangePlayerView(){
    console.log('made it to change Host View');
    console.log('in change view', self.gameSetup.myRole);
    $scope.$apply(playerGameTemplate());
    console.log('is template true?', self.hostGameTemplate);
  }

  function hostGameTemplate(){
    self.hostGameTemplate = true;
    self.gameSetup.isStarted
  }

  function playerGameTemplate(){
    self.playerGameTemplate = true;
    self.playerJoining = false;
  }


}]);
