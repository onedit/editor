var PlayModule = {
	name: "Play",
	bigicon: "imgs/tabicon-player.png",

	state: "stop",

	preferences_panel: [{name:"play", title:"Play", icon:null }],

	max_delta_time: 1/15,
	inplayer: false,

	icons: {
		play: "&#9658;",
		stop: "&#8718;",
		pause: "&#10074;&#10074;",
		stoprecord: "&#8718;&#10004;",
		eject: "&#9167;",
		reload: "&#8635"
	},

	preferences: { //persistent settings
		tint_interface_when_playing: true,
		render_play_border: true,
		restore_state_after_play: true
	},

	init: function()
	{
		LiteGUI.addCSS("\
			#play-tools { position: fixed; top: 2px; right: 300px; font-size: 1.4em; padding-right: 3px; z-index: 10; } \
			#play-tools button { padding: 0 0.5em; overflow: hidden; height: 1.25em; } \
			#play-tools button.enabled { background: #AEE !important;} \
			#restore-button { background: #944 !important;} \
		");

		//Register in CanvasManager to render the border on playmode
		RenderModule.canvas_manager.addWidget( PlayModule, 10 );

		//If the scene is cleared be sure to change mode to stop
		LEvent.bind( LS.GlobalScene, "clear", this.onSceneStop, this );
		LEvent.bind( LS.GlobalScene, "code_error", this.onSceneError, this );

		//play tools panel
		var container = document.createElement("div");
		container.id = "play-tools";
		container.className = "big-buttons";
		container.innerHTML = "<button class='litebutton' id='play-button' title='Play'>"+this.icons.play+"</button><button class='litebutton' id='pause-button' title='Pause' disabled>"+this.icons.pause+"</button><button class='litebutton' id='stopkeep-button' disabled title='Stop And Save'>"+this.icons.stoprecord+"</button><button class='litebutton' id='restore-button' title='restore'>"+this.icons.reload+"</button><button class='litebutton' id='launch-button' title='launch'>"+this.icons.eject+"</button>";
		this.play_button = container.querySelector("#play-button");
		this.pause_button = container.querySelector("#pause-button");
		this.stopkeep_button = container.querySelector("#stopkeep-button");
		this.restore_button = container.querySelector("#restore-button");
		this.restore_button.style.display = "none";
		this.launch_button = container.querySelector("#launch-button");
		this.play_button.addEventListener("click", this.onPlay.bind(this) );
		this.pause_button.addEventListener("click", this.onPause.bind(this) );
		this.stopkeep_button.addEventListener("click", this.onStopKeep.bind(this) );
		this.launch_button.addEventListener("click", this.launch.bind(this) );
		this.restore_button.addEventListener("click", this.restore.bind(this) );

		setTimeout( function() { //timeout because some weird glitch
			document.getElementById("mainmenubar").appendChild( container );
		}, 1000);

		this.tab = LiteGUI.main_tabs.addTab("Player", {id:"ingametab", bigicon: this.bigicon, size: "full", module: EditorModule, callback: function() {
			//get the canvas
			var canvas = RenderModule.appendViewportTo( PlayModule.tab.content );
			RenderModule.render_settings.in_player = true;
			PlayModule.inplayer = true;
			LS.Renderer._in_player = true;
			LS.GUI._allow_change_cursor = true;
		},
		callback_leave: function() {
			PlayModule.inplayer = false;
			LS.Renderer._in_player = false;
			LS.GUI._allow_change_cursor = false;
			RenderModule.appendViewportTo(null);
		}});

		//overwrite method to add the module to the right place
		var GUIgetRoot = LS.GUI.getHTMLRoot.bind(LS.GUI);
		LS.GUI.getHTMLRoot = function()
		{
			var gui = GUIgetRoot();
			if( gui.parentNode != PlayModule.tab.content)
				PlayModule.tab.content.appendChild( gui );
			return gui;
		},

		this.tab.content.style.overflow = "hidden";
	},

	//play clicked
	onPlay: function()
	{
		if(this.state == "stop") //play
		{
			//send ready signal
			var result = LEvent.trigger( LS.GlobalScene, "prepare_play" );
			if( result === true )
			{
				console.log("Play aborted");
				return;
			}

			//serialize before launching
			this._backup = LS.GlobalScene.serialize();
			var selected_node = SelectionModule.getSelectedNode();
			this._selected_node_uid = selected_node ? selected_node.uid : null;

			this.play_button.innerHTML = this.icons.stop;
			this.pause_button.removeAttribute('disabled');
			this.pause_button.classList.remove("enabled");
			this.stopkeep_button.removeAttribute('disabled');
			this.changeState("play");
		}
		else //stop
		{
			this.play_button.innerHTML = this.icons.play;
			this.pause_button.setAttribute('disabled','disabled');
			this.pause_button.classList.remove("enabled");
			this.stopkeep_button.setAttribute('disabled','disabled');
			this.changeState("stop");

			//restore old scene
			if(this.preferences.restore_state_after_play)
				this.restore();
		}
	},

	onPause: function() {
		if( this.state == "play" )
			this.changeState("pause");
		else if( this.state == "pause" )
			this.changeState("unpause");
		else
			return;

		//LEvent.trigger( LS.GlobalScene, this.state == "pause" ? "pause" : "unpause" );
		if( this.state == 'pause' )
			this.pause_button.classList.add("enabled");
		else
			this.pause_button.classList.remove("enabled");
	},

	onStopKeep: function() {
		if(this.state != "play")
			return;
		this.changeState("stop");
		this.play_button.innerHTML = "Play";
		this.pause_button.setAttribute('disabled','disabled');
		this.pause_button.classList.remove("enabled");
	},

	launch: function()
	{
		var that = this;
		DriveModule.checkResourcesSaved( true, inner_ready );

		function inner_ready()
		{
			//pass current scene
			var scene_info = LS.GlobalScene.serialize();

			//open window
			var demo_window = that.demo_window;

			if(!demo_window)
			{
				demo_window = window.open("player.html?preview", "", "width=800, height=600")
				demo_window.onload = launch;

				var console = window.console;

				//helps debugging
				demo_window.console._log = demo_window.console.log;
				demo_window.console.log = function(){
					var args = Array.prototype.slice.call(arguments);
					demo_window.console._log.apply( console, args );
					args.unshift("WINDOW:");
					console.log.apply( console, args );
				}

				demo_window.console._warn = demo_window.console.warn;
				demo_window.console.warn = function(){
					var args = Array.prototype.slice.call(arguments);
					demo_window.console._warn.apply( console, args );
					args.unshift("WINDOW:");
					console.warn.apply(	console, args );
				}

				demo_window.console._error = demo_window.console.error;
				demo_window.console.error = function(){
					var args = Array.prototype.slice.call(arguments);
					demo_window.console._error.apply( console, args );
					args.unshift("WINDOW:");
					console.error.apply( console, args );
				}

				demo_window.onbeforeunload  = function(){ 
					that.demo_window = null;
				}
				that.demo_window = demo_window;
			}
			else
				launch();

			//play
			function launch()
			{
				if(!demo_window.player)
					return LiteGUI.alert("Error loading player window");
				demo_window.player.autoplay = true;
				demo_window.player.setScene( scene_info, inner_launched, inner_before_play );
			};

			function inner_before_play( scene )
			{
				//console.log("scene ready to be played in window");
			}

			function inner_launched( scene )
			{
				//console.log("scene launched in window");
			}
		}
	},

	play: function()
	{
		this.changeState("play");
	},

	stop: function()
	{
		this.changeState("stop");
	},

	restore: function()
	{
		this.restore_button.style.display = "none";
		var scene = LS.GlobalScene;
		LEvent.trigger(scene,"beforeReload");
		scene.clear();
		scene.configure(this._backup);
		LEvent.trigger(scene,"reload");
		if(this._selected_node_uid)
		{
			var old_selected_node = scene.getNodeByUId( this._selected_node_uid );
			if(old_selected_node)
				SelectionModule.setSelection( old_selected_node );
		}
		EditorModule.refreshAttributes();
	},

	changeState: function(state)
	{
		if(state == this.state) 
			return;

		var scene = LS.GlobalScene;

		if(state == "play")
		{
			this.state = "play";
			console.log("%c + START ", 'background: #222; color: #AFA; font-size: 1.4em');
			if(this.preferences.tint_interface_when_playing)
				LiteGUI.root.classList.add("playing");
			LEvent.bind( scene,"finish", this.onSceneStop, this );
			LS.Input.reset(); //this force some events to be sent
			LS.GUI.reset();

			scene.start();
			EditorModule.render_debug_info = false;
			EditorModule.refreshAttributes();
			RenderModule.requestFrame();
		}
		else if(state == "pause")
		{
			this.state = "pause";
			console.log("%c + PAUSE", 'background: #222; color: #AFA; font-size: 1.4em');
			scene.pause();
		}
		else if(state == "unpause")
		{
			this.state = "play";
			console.log("%c + UNPAUSE", 'background: #222; color: #AFA; font-size: 1.4em');
			scene.unpause();
		}
		else if(state == "stop")
		{
			this.state = "stop";
			console.log("%c + FINISH ", 'background: #222; color: #AAF; font-size: 1.4em');
			LiteGUI.root.classList.remove("playing");
			scene.finish();
			LS.Tween.reset();
			EditorModule.render_debug_info = true;
			RenderModule.requestFrame();
			LEvent.unbind( scene,"finish", this.onSceneStop, this );
			LS.GUI.reset();
		}
	},

	//ensures that if we are using an external file it has been loaded 
	reloadScripts: function( callback )
	{
		var to_reload = [];
		var res = LS.GlobalScene.getResources();
		for(var i in res)
		{
			if(i.indexOf("://") == -1)
				continue;
			to_reload.push(i);
			LS.ResourcesManager.unregisterResource( i );
		}
		
		if(callback)
			callback();
	},

	onSceneStop: function()
	{
		this.changeState("stop");
		this.play_button.innerHTML = this.icons.play;
	},

	onSceneError: function()
	{
		if(this.state != "play")
			return;
		this.restore_button.style.display = "";
	},

	//called from CanvasManager with every user event
	onevent: function(e)
	{
		if(!this.inplayer)
			return;

		//dont know where to put this
		var r = RenderModule.passEventToLiteScene(e);

		//block propagation (mousemove should be propagated so when dragging panels works)
		if(e.type != "mousemove")
			e.stopPropagation();
		e.preventDefault();
		return true;
	},

	//file (or item) dropped over the Player
	onItemDrop: function(e)
	{
		if(!this.inplayer)
			return;

		var r = false;
		if( e.dataTransfer.files.length )
		{
			for(var i = 0; i < e.dataTransfer.files.length; ++i )
			{
				var file = e.dataTransfer.files[i];
				var r = LEvent.trigger( LS.GlobalScene, "fileDrop", { file: file, event: e } );
				if(r === false)
				{
					e.stopPropagation();
					e.stopImmediatePropagation();
					r = true;
				}
			}
		}
		return r;
	},

	render: function()
	{
		if(!RenderModule.frame_updated || this.inplayer || LS.GlobalScene._state == LS.STOPPED || !this.preferences.render_play_border)
			return;

		//render inplayer border
		var ctx = gl;
		ctx.start2D();
		ctx.strokeColor = [0,1,1,0.8];
		ctx.strokeRect(1,1,gl.canvas.width-2,gl.canvas.height-2);
		ctx.finish2D();
	},

	update: function(dt)
	{
		if(dt > PlayModule.max_delta_time)
			dt = PlayModule.max_delta_time;
		if( this.state == 'play' )
		{
			LS.Tween.update(dt);
			LS.Input.update(dt);
			LS.GlobalScene.update(dt);
			this.checkErrors();
		}
	},

	checkErrors: function()
	{
		if( vec3.distance(LS.ZEROS,[0,0,0]) > 0 ||
			vec3.distance(LS.ONES,[1,1,1]) > 0 ||
			vec3.distance(LS.RIGHT,[1,0,0]) > 0 ||
			vec3.distance(LS.LEFT,[-1,0,0]) > 0 ||
			vec3.distance(LS.TOP,[0,1,0]) > 0 ||
			vec3.distance(LS.BOTTOM,[0,-1,0]) > 0 ||
			vec3.distance(LS.FRONT,[0,0,-1]) > 0 ||
			vec3.distance(LS.BACK,[0,0,1]) > 0 )
			console.error("LS base vectors have been modifyed!, you never should change LS.FRONT,LS.BACK,LS.RIGHT,LS.LEFT,LS.TOP,LS.BOTTOM,LS.ZEROS or LS.ONES");
	},

	onShowPreferencesPanel: function(name,widgets)
	{
 		if(name != "play")
			return;

		widgets.addCheckbox("Reset scene after play",PlayModule.preferences.restore_state_after_play, { callback: function(value) { 
			PlayModule.preferences.restore_state_after_play = value;
		}});

		widgets.addCheckbox("Show Play window border",PlayModule.preferences.render_play_border, { callback: function(value) { 
			PlayModule.preferences.render_play_border = value;
		}});

		widgets.addCheckbox("Tint Interface while playing",PlayModule.preferences.tint_interface_when_playing, { callback: function(value) { 
			PlayModule.preferences.tint_interface_when_playing = value;
		}});

	}
};

CORE.registerModule( PlayModule );