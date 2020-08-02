/* This module allows to create Cubemaps and store them as resources */
var CubemapTools = {
	name: "CubemapTools",

	default_resolution: 256,

	current_cubemap: null,
	preview_in_viewport: false,

	init: function()
	{
		LiteGUI.menubar.add("Actions/Cubemap tools", { callback: function() { CubemapTools.showDialog(); }});
	},

	showDialog: function()
	{
		var dialog = null;

		if(this.dialog)
		{
			this.dialog.highlight();
			return;
		}

		//RenderModule.canvas_manager.addWidget( CubemapTools );

		var dialog = new LiteGUI.Dialog( { id: "dialog_cubemap", title:"Cubemap generator", parent:"#visor", close: true, minimize: true, width: 360, min_height: 160, scroll: false, draggable: true});
		dialog.show('fade');
		dialog.setPosition(100,100);
		dialog.on_close = function(){ 
			CubemapTools.dialog = null;
			CubemapTools.preview_in_viewport = false;
			RenderModule._overwrite_render_callback = null;
			LS.GlobalScene.requestFrame();
		}
		this.dialog = dialog;

		LiteGUI.createDropArea( dialog.content, enableDragDropCubemapImages );

		var name = "cubemap_" + (Math.random() * 1000).toFixed(0);
		var resolution = CubemapTools.default_resolution;
		var loaded_resolution = CubemapTools.default_resolution;
		var center = "camera eye";
		var result = "cubemap";
		var cubemap_modes = { "Cross Left": "CUBECROSSL", "Vertical": "CUBEVERT", "Polar":"CUBEPOLAR" };
		var mode = "CUBECROSSL";
		var layers = 0x3;
		var export_format = "CUBECROSSL";

		var url = "";
		var original_file = null;
		var cubemap_options = { keep_image: true, is_cross: 1 };

		var widgets = new LiteGUI.Inspector( { id: "cubemapgen_widgets", name_width: 100 });
		dialog.content.appendChild( widgets.root );
		widgets.on_refresh = refresh;

		var info_widget = null;

		function refresh()
		{
			widgets.clear();

			//widgets.addTitle("Current Cubemap");
			widgets.addString("Name", CubemapTools.current_cubemap ? CubemapTools.current_cubemap.filename : "Not selected", { disabled: true });

			if( CubemapTools.current_cubemap )
			{
				widgets.widgets_per_row = 1;
				widgets.addCombo("Resolution", CubemapTools.current_cubemap.width, { values: [1,2,4,8,16,32,64,128,256,512,1024,2048], callback: function(v) { 
					loaded_resolution = v;
				}});
				widgets.widgets_per_row = 1;

				widgets.addButtons("Actions", ["Blur","Resize","Clone","Irradiance"], { callback: function(v) { 
					var cubemap = CubemapTools.current_cubemap;
					if(!cubemap)
						return;

					if(v == "Blur")
					{
						cubemap.applyBlur( 1,1,1 );
						LS.RM.resourceModified( cubemap );
					}
					else if(v == "Resize")
					{
						var copy_cubemap = new GL.Texture( loaded_resolution, loaded_resolution, cubemap.getProperties() );
						cubemap.copyTo( copy_cubemap );
						copy_cubemap.filename = cubemap.filename;
						copy_cubemap.fullpath = cubemap.fullpath;
						copy_cubemap.remotepath = cubemap.remotepath;
						CubemapTools.current_cubemap = copy_cubemap;
						LS.RM.registerResource( copy_cubemap.fullpath || copy_cubemap.filename, copy_cubemap );
					}
					else if(v == "Clone")
					{
						var copy_cubemap = cubemap.clone();
						copy_cubemap.filename = "copy_" + LS.RM.getFilename( cubemap.filename );
						CubemapTools.current_cubemap = copy_cubemap;
						LS.RM.registerResource( copy_cubemap.filename, copy_cubemap );
						widgets.refresh();
					}
					else if(v == "Irradiance")
					{
						var fullpath = cubemap.fullpath || cubemap.filename;
						var extension = LS.RM.getExtension( fullpath );
						var basename = LS.RM.getBasename( fullpath );
						var folder = LS.RM.getFolder( fullpath );

						cubemap = CubemapTools.generateIrradianceFromCubemap( cubemap );
						cubemap.filename = "IR_" + basename + "." + extension;

						//cubemap.fullpath = folder + "/" + fullpath;
						CubemapTools.current_cubemap = cubemap;
						LS.RM.registerResource( cubemap.filename, cubemap );
						widgets.refresh();
					}
					LS.GlobalScene.refresh();
				}});

				widgets.addButton("Helper", "Set as Environment", { callback: function(v) {
					var cubemap = CubemapTools.current_cubemap;
					if(!cubemap)
						return;
					if(!LS.GlobalScene.info)
						LS.GlobalScene.root.addComponent( LS.Components.GlobalInfo() );
					LS.GlobalScene.info.textures.environment = cubemap.fullpath || cubemap.filename;
					if( !LS.GlobalScene.root.getComponent( LS.Components.Skybox ) )
						LS.GlobalScene.root.addComponent( new LS.Components.Skybox() );
					LS.GlobalScene.refresh();
					EditorModule.refreshAttributes();
				}});

				widgets.addCheckbox("Preview in viewport", CubemapTools.preview_in_viewport, function(v){
					CubemapTools.preview_in_viewport = v;
					RenderModule._overwrite_render_callback = v ? CubemapTools.render.bind(CubemapTools) : null;
					LS.GlobalScene.requestFrame();
				});
			}
			else
			{
				CubemapTools.preview_in_viewport = false;
				RenderModule._overwrite_render_callback = null;
			}

			widgets.addSection("Generate from Scene");

			widgets.addString("Name", name, { callback: function(v) { 
				name = v;
			}});

			widgets.addCombo("Resolution", CubemapTools.default_resolution, { values: [32,64,128,256,512,1024], callback: function(v) { 
				resolution = v;
			}});

			widgets.addCombo("Center", center , { values: ["camera eye","camera target","node","mesh"], callback: function(v) { 
				center = v;
			}});

			widgets.addLayers("Layers", layers , { callback: function(v) { 
				layers = v;
			}});

			widgets.addCombo("Mode", mode , { values: cubemap_modes, callback: function(v) { 
				mode = v;
			}});

			widgets.addButton("Preview", "Open Window", { callback: function(v) { 
				var position = computePosition();
				var image = CubemapTools.generateCubemapFromScene( position, { layers: layers, size: resolution, mode: mode } );
				if(!image)
					return;
				var new_window = window.open("","Visualizer","width="+(image.width + 20)+", height="+(image.height));
				new_window.document.body.style.margin = 0;
				new_window.document.body.style.padding = 0;
				new_window.document.body.style.backgroundColor = "black";
				new_window.document.body.appendChild( image );
				LS.GlobalScene.refresh();
			}});


			/*
			widgets.addCombo("Result", "cubemap", { values: ["cubemap","spherical","image x6"], callback: function(v) { 
				result = v;
			}});
			*/

			widgets.addSeparator();


			widgets.addButton(null, "Create cubemap", { callback: function() {
				var position = computePosition();
				var image = CubemapTools.generateCubemapFromScene( position, { layers: layers, size: resolution, mode: mode } );
				if(!image)
					return;
				/*
				if(keep)
				{
					image.link = image.toDataURL('image/jpg');
					LS.ResourcesManager.registerResource( name + "_intermediate.png", image );
				}
				*/
				
				var texture = GL.Texture.cubemapFromImage( image, mode == "CUBECROSSL" ? { is_cross: 1 } : null );
				texture.image = image;
				LS.ResourcesManager.registerResource( name + "_" + mode + ".png", texture );
				LiteGUI.alert("Cubemap created with name: " + name + ".png");
				CubemapTools.current_cubemap = texture;
				widgets.refresh();
			}});

			widgets.addSection("Load", { collapsed: false });

			widgets.addCombo("Input Mode",mode, { values: cubemap_modes, callback: function(v){
				mode = v;
				if(v == "CUBECROSSL")
					cubemap_options = { keep_image: true, is_cross: 1 };
				else if(v == "CUBEPOLAR")
					cubemap_options = { keep_image: true, is_polar: 1 };
				else
					cubemap_options = { keep_image: true };
			}});
			widgets.addString("URL","", { callback: function(v){ url = v; original_file = null; }});
			widgets.addFile("From File", null, { generate_url: true, callback: function(file_info){ 
				if(!file_info)
				{
					url = original_file = null;
					return;
				}
				url = file_info.url; 
				original_file = file_info.file;
			}});
			widgets.addTexture("From Memory/Server","", { skip_load: true, callback: function(name){ 
				url = name; original_file = null;
				loadCubemap();
			}});

			info_widget = widgets.addInfo(null, "" );

			widgets.addButton( null, "Load cubemap", { callback: loadCubemap });

			widgets.addSeparator();
			widgets.addInfo(null,"You can also drag a set of six images containing every side of a cubemap where the files contains the string posx,posy,posz,negx,negy,negz depending on the side");
			widgets.addString("Ouput name", name, { callback: function(v) { 
				dialog.cubemap_name = v;
			}});
			widgets.addCombo("Output size", CubemapTools.default_resolution, { values: [0,32,64,128,256,512,1024], callback: function(v) { 
				dialog.cubemap_resolution = v;
			}});

			widgets.addSection("Export", { collapsed: false });
			widgets.addCombo("Format", export_format, { values: cubemap_modes, callback: function(v) { 
				export_format = v;
			}});
			widgets.addButton( null, "Download cubemap", { callback: downloadCubemap });


		}//refresh

		widgets.refresh();

		function loadCubemap()
		{
			if(!name)
			{
				LiteGUI.alert("No Cubemap name specified");
				return;
			}

			if(!url)
			{
				LiteGUI.alert("No Cubemap url specified");
				return;
			}

			//is a texture in memory
			var res = LS.ResourcesManager.getResource( url );
			if(res)
			{
				if( res.texture_type == gl.TEXTURE_CUBE_MAP )
				{
					CubemapTools.current_cubemap = res;
					widgets.refresh();
					return;
				}

				if(!res.img)
					return console.log("Texture doesnt have the original image attached");
				var texture = GL.Texture.cubemapFromImage( res.img, cubemap_options );
				processResult( texture );
			}

			//is an external filename
			info_widget.setValue("Loading...");
			var texture = GL.Texture.cubemapFromURL( LS.ResourcesManager.getFullURL( url ), cubemap_options , function(tex){
				if(!tex)
					return LiteGUI.alert("Error creating the cubemap, check the size. Only 1x6 (vertical) or 6x3 (cross) formats supported.");
				processResult( tex );
				CubemapTools.current_cubemap = tex;
				widgets.refresh();
			});
		}

		function processResult( texture )
		{
			if(!texture)
			{
				LiteGUI.alert("Texture is not CUBEMAP, check that the name has CUBECROSSL in it to specify the cubemap type.");
				return;
			}
			var fullname = name + "_" + mode + ".png";
			if(texture.fullpath)
			{
				name = fullname = texture.fullpath;
			}
			else
				LS.ResourcesManager.registerResource( fullname, texture );
			if(original_file)
				texture._original_file = original_file;
			else
				LS.ResourcesManager.getURLasFile( url, function(file) { texture._original_file = file; }); //keep the original file in case we want to save it
			info_widget.setValue("Cubemap created with name: " + fullname);
		}

		function computePosition()
		{
			var camera = RenderModule.selected_camera;
			var position = vec3.create();
			var node = SelectionModule.getSelectedNode();

			if(center == "camera eye")
				position = camera.getEye();
			else if(center == "camera target")
				position = camera.getCenter();
			else if(center == "node" && node && node.transform )
				position = node.transform.getGlobalPosition();
			else if(center == "mesh" && node && node._instances && node._instances.length )
			{
				var ri = node._instances[0];
				position = BBox.getCenter( ri.aabb );
			}
			return position;
		}

		function enableDragDropCubemapImages( e, dialog )
		{
			console.log(e.dataTransfer);
			var path = e.dataTransfer.getData("res-fullpath");
			if( path )
			{
				var res = LS.RM.getResource(path);
			}
			else if( e.dataTransfer.files.length )
			{
				if(e.dataTransfer.files.length != 6)
				{
					LiteGUI.alert("You need six images to create a cubemap");
					return;
				}
				var name = dialog.cubemap_name;
				var size = dialog.cubemap_resolution;
				that.generateCubemapFromFiles( e.dataTransfer.files, null, { name: name, size: size } );
			}
			e.preventDefault();
			e.stopPropagation();
		}

		function downloadCubemap()
		{
			var cubemap = CubemapTools.current_cubemap;
			if(!cubemap)
				return;
			var data = null;
			if(export_format == "CUBEPOLAR")
			{
				var polar_texture = CubemapTools.convertCubemapToPolar(cubemap);
				data = polar_texture.toBinary();
			}
			else if(export_format == "CUBEVERT")
			{
				var image = CubemapTools.convertCubemapToVerticalImage(cubemap);
				data = image.toBlob(function(v){
					LiteGUI.downloadFile("cubemap.png", v );
				});
			}
			else //if(export_format == "CUBECROSSL")
			{
				data = cubemap.toBinary();
			}

			if(data)
				LiteGUI.downloadFile("cubemap.png", data );
		}
	},

	//generate cubemap from current view
	generateCubemapFromScene: function( position, options )
	{
		options = options || {};
		var size = options.size || 256;
		var mode = options.mode || "vertical";
		var position = position || RenderModule.selected_camera.getEye();
		
		var canvas = null;

		if(mode == "CUBEVERT")
			canvas = createCanvas( size, size * 6 );
		else if(mode == "CUBECROSSL")
			canvas = createCanvas( size * 4, size * 3 );
		else
		{
			console.error("Unknown mode: " + mode);
			return;
		}
		var ctx = canvas.getContext("2d");

		var cams = LS.Camera.cubemap_camera_parameters;

		var render_settings = RenderModule.render_settings;
		render_settings.skip_viewport = true; //avoids overwriting the viewport and aspect
		render_settings.layers = options.layers !== undefined ? options.layers : 0xFF;
		var bg_color = LS.GlobalScene.root.camera ? LS.GlobalScene.root.camera.background_color : [0,0,0,1];

		var near = RenderModule.selected_camera.near;
		var far = RenderModule.selected_camera.far;

		gl.viewport( 0, 0, size, size );

		for(var i = 0; i < 6; ++i)
		{
			//gl.clearColor( Math.abs(cams[i].dir[0]), Math.abs(cams[i].dir[1]), Math.abs(cams[i].dir[2]), 1.0);
			gl.clearColor( bg_color[0], bg_color[1], bg_color[2], bg_color[3]);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			var face = cams[i];
			var cam_info = { layers: 0xFF, eye: position, center: [ position[0] + face.dir[0], position[1] + face.dir[1], position[2] + face.dir[2]], up: face.up, fov: 90, aspect: 1.0, near: near, far: far };
			var camera = new LS.Camera( cam_info );
			//LS.Renderer.renderFrame( camera, render_settings );

			LS.Renderer.enableCamera( camera, render_settings, true );
			LS.Renderer.renderInstances( render_settings );

			var frame = gl.snapshot( 0, 0, size, size, true );
			//ctx.drawImage( frame, 0, gl.canvas.height - resolution, resolution, resolution, 0,resolution*i, resolution, resolution );

			var face = cams[i];
			if(mode == "CUBEVERT")
				ctx.drawImage( frame, 0, 0, size, size, 0, size*i, size, size );
			else if(mode == "CUBECROSSL")
				ctx.drawImage( frame, 0, 0, size, size, face.crossx * size, face.crossy * size, size, size );
			else
				console.log("Unknown mode: " + mode );
		}

		render_settings.skip_viewport = false;
		return canvas;
	},

	generateIrradianceFromCubemap: function( cubemap )
	{
		//downscale
		var copy_cubemap = new GL.Texture( 64, 64, cubemap.getProperties() );
		cubemap.copyTo( copy_cubemap );
		cubemap = copy_cubemap;
		
		//blur
		for(var i = 0; i < 8; ++i)
			cubemap.applyBlur( i,i,1 );

		//downscale again
		var copy_cubemap = new GL.Texture( 8, 8, cubemap.getProperties() );
		cubemap.copyTo( copy_cubemap );
		cubemap = copy_cubemap;

		//blur again
		for(var i = 0; i < 6; ++i)
			cubemap.applyBlur( i, i, 1 );

		return cubemap;
	},

	convertCubemapToPolar: function( cubemap_texture, size, target_texture, keep_type )
	{
		return GL.Texture.cubemapToTexture2D( cubemap_texture, size, target_texture, keep_type, 0 );
	},

	convertCubemapToVerticalImage: function( cubemap_texture )
	{
		var pixels = cubemap_texture.getCubemapPixels();
		var final_pixels = new Uint8Array( cubemap_texture.width * cubemap_texture.height * 6 * 4 );
		var pos = 0;
		for(var i = 0; i < 6; ++i)
		{
			final_pixels.set(pixels[i],pos);
			pos += pixels[i].length;
		}

		var canvas = createCanvas(cubemap_texture.width, cubemap_texture.height*6 );
		var ctx = canvas.getContext("2d");
		var data = ctx.getImageData(0,0,canvas.width,canvas.height);
		data.data.set(final_pixels);
		ctx.putImageData(data,0,0);
		return canvas;
	},

	generateCubemapFromFiles: function( files, callback, options )
	{
		options = options || {};
		var face_names = ["posx","posy","posz","negx","negy","negz"];
		var faces = {};
		var imgs = {};
		var size = 0;
		var num_images_loaded = 0;
		var imgs_urls = {};

		var alert_dialog = LiteGUI.alert("Generating cubemap...");

		//read files
		for(var i = 0; i < files.length; i++)
		{
			var file = files[i];
			var name = file.name.toLowerCase();
			var found = false;
			for(var j in face_names)
			{
				var face_name = face_names[j];
				if( name.indexOf(face_name) == -1 )
					continue;
				found = true;
				faces[ face_name ] = file;
				face_names.splice(j,1);
				console.log( "Reading " + face_name + " " + file.size );
				var objectURL = URL.createObjectURL( file );
				imgs_urls[ face_name ] = objectURL;
				num_images_loaded++;
				if(num_images_loaded == 6)
					inner_load();
			}
			if(!found)
			{
				alert_dialog.close();
				LiteGUI.alert("Error: Cubemap image doesnt have a valid name: " + name);
				return;
			}
		}

		if(face_names.length)
		{
			alert_dialog.close();
			LiteGUI.alert("Files must have names as posx,negx, etc to specify the face");
			return;
		}

		//load images
		function inner_load()
		{
			var face_name = null;
			var img_url = null;
			for(var i in imgs_urls)
			{
				img_url = imgs_urls[i];
				face_name = i;
				URL.revokeObjectURL( imgs_urls );
				delete imgs_urls[i];
				break;
			}

			if(!face_name)
			{
				//we have all the images
				console.log("Compositing images");
				inner_create();
				return;
			}
			
			console.log("Loading " + face_name);
			var img = new Image();
			img.face_name = face_name;
			img.src = img_url;
			img.onload = function()
			{
				console.log("Loaded " + this.face_name);
				if(!size)
					size = img.width;
				if(img.width != img.height || size != img.width)
				{
					alert_dialog.close();
					LiteGUI.alert("Error: Cubemap images must be square and have the same resolution");
					return;
				}
				imgs[ this.face_name ] = img;
				inner_load();
			}
			img.onerror = function(err){ console.error(err); }
		}

		//generate the cross image
		function inner_create()
		{
			var size = options.size || 512;

			//create canvas
			var canvas = createCanvas(size*4,size*3);
			var ctx = canvas.getContext("2d");
			ctx.fillStyle = "black";
			ctx.fillRect(0,0, canvas.width, canvas.height);
			ctx.drawImage( imgs["negx"], 0, size, size,size );
			ctx.drawImage( imgs["posz"], size, size, size,size );
			ctx.drawImage( imgs["posx"], size*2, size, size,size );
			ctx.drawImage( imgs["negz"], size*3, size, size,size );
			ctx.drawImage( imgs["posy"], size, 0, size,size );
			ctx.drawImage( imgs["negy"], size, size*2, size,size );

			console.log("Converting to dataURL...");
			var img_data = canvas.toDataURL("image/png", 0.9);

			console.log("Generating file from dataURL...");
			var cubemap_file = dataURItoBlob(img_data);
			var objectURL = URL.createObjectURL( cubemap_file );
			var img = new Image();
			img.src = objectURL;
			img.filename = (options.name || ("cubemap_"+ (Math.floor(Math.random()*1000))) ) + "_CUBECROSSL.png";
			img.onload = function(){
				//document.body.appendChild(img); //debug
				console.log("Cubemap registered");
				var texture = new GL.Texture.cubemapFromImage(this, { is_cross: 1 } );
				texture._original_file = cubemap_file;
				LS.ResourcesManager.registerResource( this.filename, texture );
			}
			alert_dialog.close();
			LiteGUI.alert("Cubemap created!");
			if(callback)
				callback(texture);
		}
	},

	render: function( camera )
	{
		//disabled

		if(!this.dialog || !this.current_cubemap || !this.preview_in_viewport)
			return false;

		if(!RenderModule.frame_updated || this.inplayer )
			return false;

		var scene = this._preview_scene;
		if(!this._preview_scene)
		{
			scene = this._preview_scene = new LS.Scene();
			scene.root.addComponent( new LS.Components.Skybox() );
			scene.info.ambient_color = [1,1,1];
			scene._sphere = new LS.SceneNode();
			scene._sphere.addComponent( new LS.Components.GeometricPrimitive({ geometry: LS.Components.GeometricPrimitive.SPHERE, subdivisions: 20 }) );
			scene.root.addChild( scene._sphere );
			scene._sphere.material = new LS.StandardMaterial();
			scene._sphere.material.reflection_factor = 1;
			scene._sphere.material.reflection_fresnel = 0;

			var render_settings = new LS.RenderSettings();
			//render_settings.lights_disabled = true;
			this.preview_render_settings = render_settings;
		}
		scene.root.camera.configure( camera.serialize() );
		LS.RM.textures[ ":cubemap" ] = this.current_cubemap;
		scene.info.textures.environment = ":cubemap";
		scene.info.textures.irradiance = ":cubemap";

		scene._sphere.transform.position = camera.getCenter();

		LS.Renderer.render( scene, this.preview_render_settings );

		return true;
	}
}

CORE.registerModule( CubemapTools );


