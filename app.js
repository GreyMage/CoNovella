var _package = require('./package.json');

var express = require('express');
var app = express();

app.set('views', __dirname + '/dist/views');
app.set('view engine', 'jade');

app.use(express.static(__dirname + '/dist/public'));
app.get('/', function (req, res) {
  res.render('index', { name: _package.name});
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
