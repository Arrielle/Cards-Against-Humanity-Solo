var io;
var gameSocket;

exports.initGame = function(sio, socket){
  io = sio;
  gameSocket = socket;
  //
  var game_sockets = {};

  io.sockets.on('connection', function (socket) {
    socket.on('game_connect', function(){

      console.log("Game connected", socket.id);

      game_sockets[socket.id] = {
        socket: socket,
        controller_id: undefined
      };
      socket.emit("game_connected");
    });
  });

    var game_connected = function() {
      var url = "http://204.62.150.131:3000?id=" + io.id;
      document.body.innerHTML += url;
      io.removeListener('game_connected', game_connected);
    };

    io.on('game_connected', game_connected);
  //
}
