myApp.controller('HomeController',function() {
  console.log('home controller running');
  var self = this;
  self.message = 'Welcome to the Home View!';

  // App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);
  var socket = io();

  self.onCreateClick = function () {
    console.log('Clicked "Create A Game"');
    socket.emit('hostCreateNewGame');
  }

  socket.on('newGameCreated', function (data) {
    console.log(data);
  });


  socket.on('newGameCreated', onNewGameCreated );

  function onNewGameCreated(data) {
    console.log('do I get to on new game created? -- YUP!');
    gameInit(data);
    console.log(App);
  }

  function gameInit(data) {
    App.gameId = data.gameId;
    App.mySocketId = data.mySocketId;
    App.myRole = 'Host';
    App.isStarted = true;
    // App.Host.numPlayersInRoom = 0;
    displayNewGameScreen();
    console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
  }

  var App = {
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

  function  displayNewGameScreen() {
    // Fill the game screen with the appropriate HTML
    // turn game on?
    // App.$gameArea.html(App.$templateNewGame);

    // Display the URL on screen so people can connect?
    // $('#gameURL').text(window.location.href);
    // App.doTextFit('#gameURL');

    // Show the gameId / room id on screen
    // $('#spanNewGameCode').text(App.gameId);
    console.log('room id and stuff', App.gameId);
  }

});
