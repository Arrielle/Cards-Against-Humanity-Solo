myApp.controller('GameController',function() {
  console.log('home controller running');
  var self = this;
  self.message = 'Welcome to the Home View!';

  var socket = io();

  self.onCreateClick = function () {
    console.log('Clicked "Create A Game"');
    socket.emit('hostCreateNewGame');
  }

  socket.on('newGameCreated', onNewGameCreated );

  function onNewGameCreated(data) {
    gameInit(data);
    console.log('hit: ok');
  }

  function gameInit(data) {
    self.App.gameId = data.gameId;
    self.App.mySocketId = data.mySocketId;
    self.App.myRole = 'Host';
    self.App.isStarted = true;
    // App.Host.numPlayersInRoom = 0;
    displayNewGameScreen(self.App);
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

    }
  }

  console.log('self.App before game start?', self.App)

  function displayNewGameScreen(appStatus) {
    // Display the URL on screen so people can connect?
    $('#gameURL').html('<h2>Open this site on your mobile device ' + window.location.href + '</h2>');

    // Show the gameId / room id on screen
    $('#spanNewGameCode').html('<h2>Use this as your Game ID ' + self.App.gameId + '<h2>');

    console.log('Is the game started when I hit displayNewGameScreen?', appStatus.isStarted);
  }

  //*******************//
  //                   //
  //    Player Join    //
  //                   //
  //*******************//

  self.onPlayerStartClick = function() {
    // console.log('Player clicked "Start"');

    // collect data to send to the server
    var data = {
      gameId : +($('#inputGameId').val()),
      playerName : $('#inputPlayerName').val() || 'anon'
    };

    // Send the gameId and playerName to the server
    socket.emit('playerJoinGame', data);

    // Set the appropriate properties for the current player.
    self.App.myRole = 'Player';
    // self.App.Player.myName = data.playerName;
  }

  self.playerJoin = function(){
    console.log('player join clicked');
    $('#inputPlayerName').html('<input type="text" name="" placeholder="Player Name" value=""/>');
    $('#inputGameId').html('<input type="text" name="" placeholder="Game ID" value=""/>')
    $('#gameStartBtn').html('<button ng-click="onPlayerStartClick()" type="button" name="button">Start Game!</button>');
  }

});
