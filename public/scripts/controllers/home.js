myApp.controller('HomeController',function() {
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
    // Fill the game screen with the appropriate HTML
    // turn game on?
    // App.$gameArea.html(App.$templateNewGame);

    // Display the URL on screen so people can connect?
    $('#gameURL').text(window.location.href);
    // App.doTextFit('#gameURL');

    // Show the gameId / room id on screen
    $('#spanNewGameCode').text(self.App.gameId);

    console.log('Is the game started when I hit displayNewGameScreen?', appStatus.isStarted);
  }

});
