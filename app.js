var _package = require('./package.json');

var deferred = require('deferred');
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

var Story = function(obj){
	for(var i in obj){
		this[i] = obj[i];
	}
};
Story.prototype = {
	id:false,
	title:"New Story",
	synopsis:"No synopsis",
	verbiage:"",	
	append:function(text){
		this.verbiage += " "+text.trim();
		io.to(this.id).emit('append',{
			storyId:this.id,
			verbiage:text.trim()
		});
	}
}

var stories = []; 

stories.push(new Story({
	id:"banana",
	title:"Test",
	verbiage:"Test"
}));

stories.push(new Story({
	id:"e5f62ncvo3",
	title:"Test2",
	verbiage:"THIS IS A LONGER"
}));

stories.push(new Story({
	id:"dwdawfg32g2",
	title:"Much longer test name to check how it reacts.",
	verbiage:""
}));

stories.push(new Story({
	id:"dwadawfg4vres",
	title:"A name that is simply too long to be properly allowed, but is good for seeing what happens to the frontend.",
	verbiage:""
}));

var getTopStories = function(){
	return stories;
};

var noise = function(story){
	
	var x = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";
	var words = x.split(" ");
	
	var word = words[Math.floor(Math.random()*words.length)];
	story.append(word);
	
	setTimeout(function(){
		noise(story);
	},300+(Math.random()*3217))
}
for(var x in stories){
	console.log("noise on",stories[x].id)
	noise(stories[x]);
}

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