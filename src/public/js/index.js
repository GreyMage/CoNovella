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
	
	var handleWelcomeMsg = function(){
		if(!store.get("Welcomed")){
			var wm = document.getElementById("welcome");
			wm.classList.add("show");
			var dismissButtons = wm.getElementsByClassName("dismiss");		
			var dismiss = function(){
				wm.classList.remove('show');
				store.set("Welcomed","1");
			};
			
			for(var i=0;i<dismissButtons.length;i++){
				var el = dismissButtons[i];
				console.log("attaching to",el);
				el.addEventListener("click",dismiss);
			}
		}
	};
	
	var initHook = initSocketIo();
	initHook.done(function(){regEvents();});
	initHook.done(function(){handleWelcomeMsg();});
  
})(); 
