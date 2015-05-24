var _package = require('./package.json');

var deferred = require('deferred');
var Datastore = require('nedb');
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

// Configure Library
var Library = new Datastore({ filename: 'db/library.nedb', autoload: true });
Library.persistence.setAutocompactionInterval(1000*60*10); // Ten minutes

// Configure Librarian 
var Librarian = {};
Librarian.collection = [];
Librarian.speed = 3000;
Librarian.manage = function(story){
	if(!story) return;
	if(!~Librarian.collection.indexOf(story)){
		Librarian.collection.push(story);
	}
	return story;
};
Librarian.tick = function(){

	var d = new deferred();	
	var s = Librarian.manage(Librarian.collection.shift());
	
	d.promise.finally(function(){
		setTimeout(function(){
			Librarian.tick();
		},Librarian.speed);
	});
	
	if(!s) { d.resolve(); return; }
	
	if(!s.dirty){
		d.resolve();
	} else {
		var p = s.save()
		p.catch(function(err){
			console.log("something went wrong...",err);
		});
		p.finally(function(){
			d.resolve(s);
		});
	}
	
}
Librarian.getAllStories = function(){
	var ensureInit = new deferred();
	var d = new deferred();
	Librarian.init().done(function(){
		d.resolve(Librarian.collection); //TODO: Maybe make this a copy?
	});
	return d.promise;
};
Librarian.getStory = function(id){
	var d = new deferred();
	Librarian.init().done(function(){
		for(var i=0;i<Librarian.collection.length;i++){
			if(Librarian.collection[i]._id == id) d.resolve(Librarian.collection[i]);
		}
		d.reject();
	});
	return d.promise;
};
Librarian.getTopStories = function(id){
	var d = new deferred();
	Librarian.init().done(function(){
		var top = [], max = 5
		for(var i=0;i<Librarian.collection.length;i++){
			if(top.length<max) top.push(Librarian.collection[i]);
		}
		d.resolve(top);
	});
	return d.promise;
};
Librarian.init = function(){
	var d = new deferred();
	if(Librarian.inited) {
		d.resolve();
		return d.promise;
	}
	Librarian.inited = true;
	Library.find({}, function (err, docs) {
		var inflated = [];
		for(var i=0;i<docs.length;i++){
			var s = new Story(docs[i]);
			Librarian.manage(s);
			inflated.push(s);
		}
		d.resolve(inflated);
	});
	Librarian.tick();
	return d.promise;
};

// Stories use the library Automatically.
var Story = function(obj){
	this.inflate(obj);
};

Story.prototype = {
	title:"New Story",
	synopsis:"No synopsis",
	verbiage:"",
	updated:0,
	deflate:function(){
		return JSON.stringify(this);
	},
	inflate:function(data){
		if(typeof data != "object") var data = JSON.parse(data);
		for(var i in data){
			this[i] = data[i];
		}
	},
	save:function(){
		var self = this;
		var d = new deferred();
		if(this._id){
			Library.update({_id:this._id}, this, {},function (err, numReplaced) {
				if(err) d.reject(err);
				d.resolve();
			});
		} else {
			Library.insert(this, function (err, newDoc) {   // Callback is optional
				if(err) d.reject(err);
				self.inflate(newDoc);
				d.resolve();
			});
		}
		d.promise.done(function(){
			self.dirty=false;
		});
		return d.promise;
	},
	append:function(text){
		this.verbiage += " "+text.trim();
		this.dirty=true;
		this.updated=new Date().getTime();
		//console.log(this.channel(),"blah");
		io.to(this.channel()).emit('append',{
			_id:this._id,
			verbiage:text.trim()
		});
	},
	channel:function(){
		return "STORY-"+this._id;
	}
}

var noise = function(story){
	
	var x = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";
	var words = x.split(" ");
	
	var word = words[Math.floor(Math.random()*words.length)];
	story.append(word);
	
	setTimeout(function(){
		noise(story);
	},300+(Math.random()*7217));
	
}

// Do stuff
Librarian.getAllStories().done(function(stories){
	for(var x in stories) {
		console.log("noise on",stories[x].title)
		noise(stories[x]);
	}
});

var leaveAllStoryRooms = function(socket){
	var d = new deferred();
	var count = 0;
	socket.rooms.forEach(function(room){
		if(!!room.match(/^STORY-/)){
			count++
			socket.leave(room,function(){
				console.log("socket left channel",room);
				if(!--count) d.resolve();
			});
			
		}
	});
	
	if(!count) d.resolve();
	
	return d.promise;
}

io.on('connection', function (socket) {

	socket.on('getTopStories', function () {
		leaveAllStoryRooms(socket).done(function(){
			Librarian.getTopStories().done(function(topStories){
				topStories.forEach(function(story){
					socket.join(story.channel());
					console.log("socket joining channel",story.channel());
				});
				socket.emit("recvTopStories",topStories);
			});
		})
		
	});
	
	socket.on('spectate',function(data){
		leaveAllStoryRooms(socket).done(function(){
			Librarian.getStory(data._id).done(function(story){
				socket.join(story.channel());
				console.log("socket joining channel",story.channel());
				console.log("now in rooms",socket.rooms);
				socket.emit("recvSpectate",story);
			});
		});
		
	});
	
});

server.listen(3000);