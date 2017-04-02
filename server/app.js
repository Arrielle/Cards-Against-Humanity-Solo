//Requires
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const path = require('path');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon')

//Routes/Modules
const cah = require('./routes/gamelogic');
const game = require('./routes/game');
const blackcards = require('./routes/blackcards');
const whitecards = require('./routes/whitecards');
const players = require('./routes/players');


//Serve index file
app.get('/', function(req, res) {
  res.sendFile(path.resolve('./public/views/index.html'));
});
//Serve Favicon
app.use(favicon(path.join(__dirname, '../public/images/favicon.ico')))
// Serve back static files
app.use(express.static('./public'));
app.use(bodyParser.json());

// Listen for Socket.IO Connections. Once connected, starts the game logic.
// io.sockets.on('connection', function(socket){
//   cah.initGame(io, socket);
// });

io.on('connection', function(socket){
  cah.initGame(io, socket);
});

//Middleware
app.use('/game', game);
app.use('/', blackcards);
app.use('/', whitecards);
app.use('/', players);

// Spin up server
http.listen(port, function(){
  console.log('listening on *:' + port);
});
