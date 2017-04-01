var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var path = require('path');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon')


// Routes/Modules
var cah = require('./routes/gamelogic');
var game = require('./routes/game');
var blackcards = require('./routes/blackcards');
var whitecards = require('./routes/whitecards');
var players = require('./routes/players');


// Serve index file
app.get('/', function(req, res) {
  res.sendFile(path.resolve('./public/views/index.html'));
});

app.use(favicon(path.join(__dirname, '../public/images/favicon.ico')))


// Serve back static files
app.use(express.static('./public'));
app.use(bodyParser.json());

// Listen for Socket.IO Connections. Once connected, starts the game logic.
io.sockets.on('connection', function (socket) {
    cah.initGame(io, socket);
});

//Sever Modules
app.use('/game', game);
app.use('/', blackcards);
app.use('/', whitecards);
app.use('/', players);


// Spin up server
http.listen(port, function(){
  console.log('listening on *:' + port);
});
