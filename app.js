var _package = require('./package.json');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var INDEV = true;

app.set('views', __dirname + '/dist/views');
app.set('view engine', 'jade');

app.use(express.static(__dirname + '/dist/public'));
app.get('/', function (req, res) {
  res.render('index', { name: _package.name, INDEV:INDEV});
}); 

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

server.listen(3000);