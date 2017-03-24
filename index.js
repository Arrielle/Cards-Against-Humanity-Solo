var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var agx = require('./gamelogic');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Listen for Socket.IO Connections. Once connected, starts the game logic.
io.sockets.on('connection', function (socket) {
    agx.initGame(io, socket);
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
