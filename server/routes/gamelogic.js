var io;
var gameSocket;

exports.initGame = function(sio, socket){
  io = sio;
  gameSocket = socket;

//HOST EVENTS
  //START A NEW GAME
  //CHECK IF ROOM IS FULL
  //ADDING THE WHITE CARDS
  //REVEALING THE WHITE CARDS
  //DISPLAYING THE CURRENT CZAR AND CURRENT PLAYER
  //DRAW BLACK CARD? (THIS WOULD BE EMITED TO EVERYONE. . .)

//PLAYER EVENTS
  //JOIN GAME
  //PLAY CARDS
  //CZAR SELECT CARDS
  //GAVE OVER
  //DRAW CARDS

  var game_sockets = {};

  io.sockets.on('connection', function (socket) {
    console.log('connection?');
    socket.on('game_connect', function(){

      console.log("Game connected", socket.id);

      game_sockets[socket.id] = {
        socket: socket,
        controller_id: undefined
      };

      console.log(game_sockets[socket.id]);

      socket.emit("game_connected");
    });
  });
}



// exports.initGame = function(sio, socket){
//   io = sio;
//   gameSocket = socket;
//
//   gameSocket.on('hostCreateNewGame', hostCreateNewGame);
//
// }//ends init game
//
//
// function hostCreateNewGame() {
//     // Create a unique Socket.IO Room
//     var thisGameId = ( Math.random() * 100000 ) | 0;
//
//     // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
//     this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});
//
//     // Join the Room and wait for the players
//     this.join(thisGameId.toString());
// };
//
//
// //for client.js
// // self.onCreateClick = function () {
// //     console.log('Clicked "Create A Game"');
// //     IO.socket.emit('hostCreateNewGame');
// // }
