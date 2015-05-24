(function(){
	// WELCOME TO MY NAMESPACE MUAHAHA.	
	// Few fun bits
	
	var deferred = function(){
        var resolved = false;
        var rejected = false;
        var resolvedCallbacks = [];
        var rejectedCallbacks = [];
        var resolveArgs = [];
        var rejectArgs = [];
        var ns = {};
        ns.done = function(cb){
            if(resolved) {
                cb.apply(null,resolveArgs);
                return;
            }
            resolvedCallbacks.push(cb);
            return this;
        };
        ns.fail = function(cb){
            if(rejected) {
                cb.apply(null,rejectArgs);
                return;
            }
            rejectedCallbacks.push(cb);
            return this;
        };
        ns.always = function(cb){
            return ns.done(cb).fail(cb);
        };
        ns.resolve = function(){
            if(rejected || resolved) return;
            resolved = true;
            resolveArgs = arguments;
            for(var i=0;i<resolvedCallbacks.length;i++){
                resolvedCallbacks[i].apply(null,resolveArgs);
            }
            return this;
        };
        ns.reject = function(){
            if(rejected || resolved) return;
            rejected = true;
            rejectArgs = arguments;
            for(var i=0;i<rejectedCallbacks.length;i++){
                rejectedCallbacks[i].apply(null,rejectArgs);
            }
            return this;
        };
        ns.promise = function(){
            return {
                done:function(){ns.done.apply(null,arguments); return this;},
                fail:function(){ns.fail.apply(null,arguments); return this;},
                always:function(){ns.always.apply(null,arguments); return this;}
            };
        };
        return ns;
    };
	var storage = function(){
		var ns={};
		ns.get = function(name){
			if(localStorage) return localStorage.getItem(name);
		};
		ns.set = function(name,val){
			if(localStorage) return localStorage.setItem(name,val);
		};
		ns.del = function(name){
			if(localStorage) return localStorage.removeItem(name);
		};
		return ns;
	};
	var faIcon = function(name){
		//<i class="fa fa-camera-retro"></i>
		var i = document.createElement('i');
		i.classList.add("fa");
		i.classList.add("fa-"+name);
		return i;
	};
	function fadeIn(el) {
		var d = new deferred();
		el.style.opacity = 0;

		var last = +new Date();
		var tick = function() {
			el.style.opacity = +el.style.opacity + (new Date() - last) / 400;
			last = +new Date();

			if (+el.style.opacity < 1) {
				if (window.requestAnimationFrame)
					requestAnimationFrame(tick);
				else 
					setTimeout(tick, 16);
			} else {
				d.resolve();
			}
		};

		tick();
		return d.promise();
	}
	function fadeOut(el) {
		var d = new deferred();
		el.style.opacity = 1;

		var last = +new Date();
		var tick = function() {
			el.style.opacity = +el.style.opacity - (new Date() - last) / 400;
			last = +new Date();

			if (+el.style.opacity > 0) {
				if (window.requestAnimationFrame)
					requestAnimationFrame(tick);
				else 
					setTimeout(tick, 16);
			} else {
				d.resolve();
			}
		};

		tick();
		return d.promise();
	}

	var getFragObj = function(){
		var base = window.location.hash.match(/^#(.*)/);
		if(!base) return {};
		var bits = base[1].split("&");
		var out = {};
		bits.forEach(function(elem){
		  var splat = elem.split("=");
		  out[splat[0]] = true;
		  if(splat.length > 1) out[splat[0]] = splat[1];
		});
		return out;
	};
	
	var setFragObj = function(obj){
		if(!obj && window.location.hash.length > 0){
			console.log("pushing history state to /");
			history.pushState({}, "", "/");
			return;
		}
		var frag = "#";
		var temp = [];
		for(var key in obj){
			var value = obj[key];
			temp.push(key+"="+value);
		}
		frag += temp.join("&");
		
		if(frag == "#") frag = "";
		
		if(frag != window.location.hash){
			console.log(window.location.hash,"!=",frag);
			console.log("pushing history state to ",frag);
			history.pushState({}, "", frag);
		}
	};
	
	var modFragObj = function(delta){
		var x = getFragObj;
		for(var i in delta){
			x[i] = delta[i];
		}
		setFragObj(x);
	};

	// Init storage
	var store = new storage();
	// Init socket.io
	var socket = null;
	var initSocketIo = function(){
		var def = new deferred();
		var oHead = document.getElementsByTagName('head')[0];
		var oScript = document.createElement('script');
		oScript.onload = function(){
			socket = io.connect();
			console.log(socket);
			oScript.parentNode.removeChild(oScript);
			def.resolve();
		};
		oScript.type = 'text/javascript';
		oScript.src = "/socket.io/socket.io.js";
		oHead.appendChild(oScript);
		
		return def.promise();
	};
	
	var regEvents = function(){
		socket.on('news', function (data) {
			console.log(data);
			socket.emit('my other event', { my: 'data' });
		});	
	};
	
	var getTopStories = function(){
		var def = new deferred();
		socket.once('recvTopStories', function(obj){
			obj = obj || [];
			def.resolve(obj);
		});
		socket.emit('getTopStories');
		return def.promise();
	};
	var showScreen = function(el){
	
		var d = new deferred();
		
		socket.removeAllListeners("append"); // unhook from any repeat screen events here.
		
		var screens = document.getElementsByClassName('screen'); 
		var waitFor = 0;
		var vanish = function(el){
			return function(){
				el.classList.remove("show");
				if(!--waitFor) d.resolve();
			};
		};
		for(var i=0;i<screens.length;i++){
			if(screens[i].classList.contains("show")){
				waitFor++;
				fadeOut(screens[i]).done(vanish(screens[i]));
			}
		}
		
		if(!waitFor) d.resolve();
		
		d.done(function(){
			el.classList.add("show");
			fadeIn(el);
		});
		
	};
	var showSpecificStory = function(data){
		var fullPage = document.getElementById('fullPage');
		showScreen(fullPage);
		
		modFragObj({storyid:data._id});
		
		var verbiage = fullPage.getElementsByClassName("verbiage")[0];
		verbiage.innerHTML = data.verbiage;
		
		if(!fullPage.getAttribute("data-scroll-event")){
			var scrollVerbiage = function(e){
			
				var direction = (e.deltaY>0)?1:-1;
				var speed = 50;
				
				var c = parseInt(verbiage.style.bottom,10) || 0;
				c += speed*direction;
				var _c = -1*c;
				
				// clamp
				if(c>0)c=0;
				if(_c > verbiage.clientHeight) c = -1 * verbiage.clientHeight;
				
				verbiage.style.bottom = c+"px";
				
				console.log(c,verbiage.clientHeight);
				return false;
				
			};
			
			fullPage.addEventListener("wheel",scrollVerbiage);
			fullPage.setAttribute("data-scroll-event",1);
		}
		
		var back = fullPage.getElementsByClassName("back")[0];
		
		if(!back.getAttribute("data-back-event")){
		
			console.log("setting callback");
			var goBack = function(){
				showTopStories();
			};
			back.addEventListener("click",goBack);
			back.setAttribute("data-back-event",1);
			
		}
		
		
		var handleMainUpdate = function(obj){
			if(obj._id == data._id)
				verbiage.innerHTML += " "+obj.verbiage;
			else 
				console.log("bad update",obj);
		};
		// CONTINUE HERE 
		socket.on('append', handleMainUpdate);
		
	};
	var showTopStories = function(){ 
		console.log("showTopStories");
		var topList = document.getElementById('topList');
		showScreen(topList);
		setFragObj(false);
		
		// Clean it out.
		topList.innerHTML = "";
		var loadTopStory = function(story){
			
			// BE AWARE!  
			/*
				We need to be able to update these with live edits from the server.
				When we're loading all the stories the server will attach us to the 5 stories
				update events, So we need to handle them, but after we enter one legit it will remove us from those. 
			*/			
			
			// Create Clickable story here
			var storyDiv = document.createElement('div');
			storyDiv.classList.add("story");
			storyDiv.setAttribute("data-story-id",story._id);
			storyDiv.addEventListener("click",function(){
				spectateStory(story._id);
			});
			
			// This contains the live-updating verbiage of the story.
			var verbiage = document.createElement('div');
			verbiage.classList.add("verbiage");
			verbiage.appendChild(document.createTextNode(story.verbiage));
			storyDiv.appendChild(verbiage);
			
			// Access level using fontawesome icons.
			var access = document.createElement('div');
			access.classList.add("access");
			access.appendChild(faIcon("lock"));
			storyDiv.appendChild(access); 
			
			var title = document.createElement('span');
			title.classList.add("title");
			title.appendChild(document.createTextNode(story.title));
			storyDiv.appendChild(title);

			topList.appendChild(storyDiv);
		};
	
		getTopStories().done(function(stories){
			if(!stories.length){
				console.log("No Active stories! Whaaaa!?");
			} else {
				stories.forEach(function(story){
					loadTopStory(story);
				});
			}
			
			var domstories = topList.getElementsByClassName('story');
			var handleTopUpdate = function(obj){
				
				for(var i=0;i<domstories.length;i++){
					if(domstories[i].getAttribute("data-story-id") == obj._id){
						var c = domstories[i].getElementsByClassName('verbiage')[0];
						c.innerHTML += " "+obj.verbiage;
					}
				}
			};
			// CONTINUE HERE 
			socket.on('append', handleTopUpdate);
			
		});
	};
	
	var handleWelcomeMsg = function(){
		var def = new deferred();
		if(!store.get("Welcomed")){
			var wm = document.getElementById("welcome");
			wm.classList.add("show");
			var dismissButtons = wm.getElementsByClassName("dismiss");		
			var dismiss = function(){
				wm.classList.remove('show');
				store.set("Welcomed","1");
				def.resolve();
			};
			
			for(var i=0;i<dismissButtons.length;i++){
				var el = dismissButtons[i];
				el.addEventListener("click",dismiss);
			}
		} else {
			def.resolve();
		}
		return def.promise();
	};
	
	var spectateStory = function(id){
		var def = new deferred();
		
		socket.once('recvSpectate',function(data){
			showSpecificStory(data);
		});
		socket.emit('spectate',{_id:id});
		
		return def.promise();
	};
	
	var handleURL = function(){
		// Check for frag, go direct or go home.
		var frag = getFragObj();
		if(frag.storyid){
			spectateStory(frag.storyid);
		} else {
			showTopStories();
		}
	};
	
	window.addEventListener("popstate",handleURL);
	
	var initHook = initSocketIo();
	initHook.done(function(){regEvents();});
	initHook.done(handleURL);
	initHook.done(function(){handleWelcomeMsg();});
	initHook.done(function(){});
  
})(); 
