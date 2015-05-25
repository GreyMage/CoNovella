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
			top.push(Librarian.collection[i]);
		}
		top.sort(function(x,y){
			if(x.updated < y.updated) return 1;
			if(x.updated > y.updated) return -1;
			return 0;
		})
		d.resolve(top.splice(0,max));
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

// The executor handles story author queues.
var Executor = {};
Executor.queues = {};
Executor.newTurnTimer = function(story){
	clearTimeout(Executor.currentTimer);
	Executor.currentTimer = setTimeout(function(){
		console.log("EXEC: Timeout for story");
		Executor.rotateTheBoard(story);
	},1000*20);
}
Executor.initQueue = function(story){
	if(!!Executor.queues[story._id]) return;
	console.log("EXEC: Created author queue for",story.channel());
	Executor.queues[story._id] = [];
	Executor.newTurnTimer(story);
};
Executor.getAuthorArray = function(story){
	if(!Executor.queues[story._id]) Executor.initQueue(story);
	var queue = Executor.queues[story._id];
	var out = [];
	for(var i=0;i<queue.length;i++){
		if(!queue[i]) continue;
		var n = queue[i].nickname || "Some Dude"
		out.push({
			id:queue[i].id,
			nick:n
		});
	}
	return out;
};
Executor.removeAuthor = function(author){
	console.log("EXEC: removing author from all queues");
	for(var i in Executor.queues){
		if(!!~Executor.queues[i].indexOf(author)){
			console.log("EXEC: removing from",i);
			Executor.queues[i].splice(Executor.queues[i].indexOf(author),1);
			Librarian.getStory(i).done(function(story){
				io.to(story.channel()).emit("modauthors",Executor.getAuthorArray(story));
			});
		}
	}
};
Executor.addAuthorToStory = function(author,story){
	if(!Executor.queues[story._id]) Executor.initQueue(story);
	var queue = Executor.queues[story._id];
	Executor.removeAuthor(author);
	console.log("EXEC: Adding author to queue for",story.channel());
	queue.push(author);
	author.emit("joinedAuthors",story._id);
	console.log("EXEC: watching for disconnect on this new guy");
	author.on("disconnect",function(){
		Executor.removeAuthor(author);
	})
	io.to(story.channel()).emit("modauthors",Executor.getAuthorArray(story));
};
Executor.handleSubmission = function(socket,story,data){
	if(!Executor.queues[story._id]) Executor.initQueue(story);
	var queue = Executor.queues[story._id];
	console.log("EXEC: trying to add",data);
	
	while(queue.length > 0){
		if(!queue[0]) { queue.shift(); continue }
		if(!queue[0].socket.connected) { queue.shift(); continue }
		break;
	}
	
	if(queue.length == 0) {
		console.log("EXEC: but cancelled because nobody is home");
		return;
	}
	
	if(queue[0] !== socket) {
		console.log("EXEC: but cancelled because",queue[0].id,"is not",socket.id);
		return;
	}
	
	// TODO: Make this more configureable
	var fragments = data.verbiage.split(/\s+/);
	if(fragments.length > 3) return; // AKA if > story.wpt
	story.append(fragments.join(" "));
	
	Executor.rotateTheBoard(story);
}
Executor.rotateTheBoard = function(story){

	if(!Executor.queues[story._id]) Executor.initQueue(story);
	var queue = Executor.queues[story._id];
	
	var x = queue.shift()
	if(x) queue.push(x);
	
	io.to(story.channel()).emit("modauthors",Executor.getAuthorArray(story))
	Executor.newTurnTimer(story);
	
};

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

	console.log(socket.id);

	socket.on('getTopStories', function () {
		Executor.removeAuthor(socket);
		leaveAllStoryRooms(socket).done(function(){
			Librarian.getTopStories().done(function(topStories){
				topStories.forEach(function(story){
					socket.join(story.channel());
				});
				socket.emit("recvTopStories",topStories);
			});
		})
		
	});
	
	socket.on('joinAuthors',function(data){
		Librarian.getStory(data._id).done(function(story){
			Executor.addAuthorToStory(socket,story);
			//console.log(Executor.queues);
		});
	});
	
	socket.on('append',function(data){
		Librarian.getStory(data._id).done(function(story){
			Executor.handleSubmission(socket,story,data);
		});
	});
	
	socket.on('nick',function(data){
		socket.nickname = data
	});
	
	socket.on('createNewStory',function(data){
		console.log(data);
		var s = new Story({});
		s.save().done(function(){
			Librarian.manage(s);
			socket.emit("createdNew",s);
		});
	});
	
	socket.on('spectate',function(data){
		leaveAllStoryRooms(socket).done(function(){
			Librarian.getStory(data._id).done(function(story){
				socket.join(story.channel());
				socket.emit("recvSpectate",story);
			});
		});
	});
	
});

server.listen(3000);