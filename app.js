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

var stories = [
	{
		id:1,
		title:"Herpaderpa",
		verbiage:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam aliquam diam quis fermentum hendrerit. Donec congue maximus nisi at mollis. Sed sollicitudin commodo elit, vitae egestas ipsum auctor quis. Praesent iaculis urna quis massa bibendum, quis sagittis enim pulvinar. Morbi volutpat pharetra orci, finibus vestibulum erat cursus ac. Donec sit amet erat interdum, suscipit neque a, pellentesque enim. Donec eros elit, gravida in imperdiet at, varius at lacus. Integer viverra sem lorem, vitae pretium erat facilisis in. Aenean interdum tincidunt feugiat."
	},
	{
		id:2,
		title:"How Pomf Saved the Day",
		verbiage:"Nullam at auctor diam, a interdum risus. Quisque ultricies massa quis dolor convallis euismod. Nulla sit amet neque sodales, laoreet libero eget, volutpat neque. Sed faucibus nisl eu tortor pellentesque, sit amet dictum lorem condimentum. Vestibulum ornare, ante ac efficitur interdum, erat odio maximus diam, id ultricies diam mi eu sem. Sed tempor arcu eget pretium efficitur. Nunc aliquet purus nisi, eget pellentesque sapien vestibulum in. Donec at dui at nunc laoreet lobortis nec et ex. Vestibulum euismod vehicula lacus, quis finibus urna faucibus eu. Aliquam ac arcu vestibulum, pharetra mauris vitae, faucibus quam. Nulla viverra facilisis lacus, ac ultrices tellus volutpat non. Cras bibendum mauris vehicula, suscipit sapien ac, finibus urna. Donec dignissim risus in enim luctus sagittis. Integer id elit sem. Sed fermentum lorem erat, et ultrices orci feugiat quis. Proin facilisis ante quis massa finibus facilisis."
	}
];

var getTopStories = function(){
	return stories;
};

var noise = function(){
	var words = ['Nullam','vehicula','pharetra','Lorem','consectetur'];
	
	var word = words[Math.floor(Math.random()*words.length)];
	io.to('1').emit('append',{storyId:1,verbiage:word});
	
	var word = words[Math.floor(Math.random()*words.length)];
	io.to('2').emit('append',{storyId:2,verbiage:word});
	
	setTimeout(function(){
		noise();
	},300)
}
noise();

io.on('connection', function (socket) {
	socket.on('getTopStories', function () {
		var sto = getTopStories();
		sto.forEach(function(story){
			socket.join(story.id);
			console.log("socket joining channel",story.id);
		});
		socket.emit("recvTopStories",getTopStories());
	});
});

server.listen(3000);