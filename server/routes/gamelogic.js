var io;
var gameSocket;

exports.initGame = function(sio, socket){
  io = sio;
  gameSocket = socket;

  gameSocket.emit('connected', { message: "You are connected!" });
  // Host Events
  gameSocket.on('hostCreateNewGame', hostCreateNewGame);
  // gameSocket.on('hostRoomFull', hostPrepareGame);
  // gameSocket.on('hostCountdownFinished', hostStartGame);
  // gameSocket.on('hostNextRound', hostNextRound);

  // Player Events
  gameSocket.on('playerJoinGame', playerJoinGame);
  // gameSocket.on('playerAnswer', playerAnswer);
  // gameSocket.on('playerRestart', playerRestart);
}

/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */
 // The 'START' button was clicked and 'hostCreateNewGame' event occurred.
function hostCreateNewGame() {
    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;
    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});
    console.log('Host has created a new game!');
    console.log('Game ID: ', thisGameId, 'Socket ID: ', this.id);
    // Join the Room and wait for the players
    this.join(thisGameId.toString());
};

/* *******************************
   *                             *
   *       Player FUNCTIONS      *
   *                             *
   ******************************* */

   /**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    console.log('Player ' + data.playerName + ' attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;
    // Look up the room ID in the Socket.IO manager object to make sure it exists
    var room = gameSocket.adapter.rooms[data.gameId];

    // If the room exists...
    if( room != undefined ){
      console.log('this room exists');
        // // attach the socket id to the data object.
        // data.mySocketId = sock.id;
        // // Join the room
        // sock.join(data.gameId);
        //
        // console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );
        //
        // // Emit an event notifying the clients that the player has joined the room.
        // io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        console.log('this room does not exist');
        // Otherwise, send an error message back to the player.
        // this.emit('error',{message: "This room does not exist."} );
    }
}



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
//
//   var game_sockets = {};
//   var controller_sockets = {};
//   console.log('game sockets', game_sockets);
//
//
//   io.sockets.on('connection', function (socket) {
//     console.log('game sockets', game_sockets);
//
//
//     console.log('connection on page load');
//     socket.on('game_connect', function(){
//
//       // console.log("Game connected", socket.id);
//
//       game_sockets[socket.id] = {
//         socket: socket,
//         controller_id: undefined
//       };
//       // console.log(game_sockets[socket.id]);
//       socket.emit("game_connected");
//     });
//   });
//
//   //When a controller/player connects to the game
//   socket.on('controller_connect', function(game_socket_id){
//     // console.log('game sockets -> ', game_sockets_id);
//     console.log('game sockets', game_sockets);
//
//     // console.log('game sockets[socket id]', game_sockets[game_socket_id]);
//   //if the gamesocket object has a game socket id and does not have a controller id
//   if (game_sockets[game_socket_id] && !game_sockets[game_socket_id].controller_id) {
//     console.log('game sockets', game_sockets);
//
//     console.log("Controller connected");
//     controller_sockets[socket.id] = {
//       socket: socket,
//       game_id: game_socket_id
//     };
//
//     game_sockets[game_socket_id].controller_id = socket.id;
//     game_sockets[game_socket_id].socket.emit("controller_connected", true);
//     socket.emit("controller_connected", true);
//
//   } else {
//     console.log("Controller attempted to connect but failed");
//     socket.emit("controller_connected", false);
//   }
//
// });
// }
//
// // function hostCreateNewGame() {
// //     // Create a unique Socket.IO Room
// //     var thisGameId = ( Math.random() * 100000 ) | 0;
// //
// //     // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
// //     this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});
// //
// //     // Join the Room and wait for the players
// //     this.join(thisGameId.toString());
// // };
//
// // exports.initGame = function(sio, socket){
// //   io = sio;
// //   gameSocket = socket;
// //
// //   gameSocket.on('hostCreateNewGame', hostCreateNewGame);
// //
// // }//ends init game
// //
// //
// // function hostCreateNewGame() {
// //     // Create a unique Socket.IO Room
// //     var thisGameId = ( Math.random() * 100000 ) | 0;
// //
// //     // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
// //     this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});
// //
// //     // Join the Room and wait for the players
// //     this.join(thisGameId.toString());
// // };
// //
// //
// // //for client.js
// // // self.onCreateClick = function () {
// // //     console.log('Clicked "Create A Game"');
// // //     IO.socket.emit('hostCreateNewGame');
// // // }
