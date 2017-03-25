var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var path = require('path');

// Routes/Modules
var cah = require('./routes/gamelogic');

// Serve index file
app.get('/', function(req, res) {
  res.sendFile(path.resolve('./public/views/index.html'));
});

// Serve back static files
app.use(express.static('./public'));

// Listen for Socket.IO Connections. Once connected, starts the game logic.
io.sockets.on('connection', function (socket) {
    cah.initGame(io, socket);
});

// Spin up server
http.listen(port, function(){
  console.log('listening on *:' + port);
});
