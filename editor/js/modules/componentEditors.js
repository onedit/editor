//Inspector Editors for the most common Components plus Materials and Scene.
//Editors are not included in LiteScene because they do not depend on them

LS.Components.GlobalInfo["@inspector"] = function( component, inspector )
{
	var node = component._root;
	if(!node)
		return;
	var scene = node._in_tree;
	if(!scene)
		return;

	//inspector.addColor("Background", component.background_color, { pretitle: AnimationModule.getKeyframeCode( component, "background_color"), callback: function(color) { vec3.copy(component.background_color,color); } });
	inspector.addColor("Ambient light", component.ambient_color, { pretitle: AnimationModule.getKeyframeCode( component, "ambient_color"), callback: function(color) { vec3.copy(component.ambient_color,color); } });
	inspector.addButtons("Compute SH Irradiance",["Update","Clear"],{ callback: function(v){
		if( v == "Update" )
		{
			var camera = LS.Renderer._current_camera;
			var position = camera.getCenter();
			component.computeIrradiance( position, camera.near, camera.far, camera.background_color );
		}
		else
			component.clearIrradiance();
	}});
	inspector.addColor("Irradiance color", component.irradiance_color, { pretitle: AnimationModule.getKeyframeCode( component, "irradiance_color"), callback: function(color) { vec3.copy(component.irradiance_color,color); } });
	inspector.addSeparator();

	inner_setTexture("environment");

	inspector.addSeparator();
	//inspector.addCheckbox("Linear Pipeline", component.linear_pipeline, { pretitle: AnimationModule.getKeyframeCode( component, "linear_pipeline"), callback: function(v) { component.linear_pipeline = v; } });

	function inner_setTexture(channel)
	{
		inspector.addTexture(channel, component.textures[channel], { pretitle: AnimationModule.getKeyframeCode( component, "textures/" + channel ), channel: channel, callback: function(filename) { 
			component.textures[this.options.channel] = filename;
			if(filename && filename[0] != ":")
				LS.ResourcesManager.load( filename );
		}});
	}

	if( component.render_settings )
	{
		inspector.widgets_per_row = 2;
		inspector.addButton( "Render Settings", "Edit", { width: "calc(100% - 30px)", callback: function(){ EditorModule.showRenderSettingsDialog( component.render_settings ); } } );
		inspector.addButton( null, InterfaceModule.icons.trash, { width: "30px", callback: function(){ component.render_settings = null; EditorModule.refreshAttributes(); } } );
		inspector.widgets_per_row = 1;
	}
	else
		inspector.addButton( "Render Settings", "Create", { callback: function(){ component.render_settings = new LS.RenderSettings(); EditorModule.refreshAttributes(); } } );
}

// Some components need special inspectors
LS.Components.Transform["@inspector"] = function(transform, inspector)
{
	if(!transform)
		return;
	var node = transform._root;

	inspector.addVector3("Position", transform._position, { 
		name_width: 100,
		pretitle: AnimationModule.getKeyframeCode( transform, "position"),
		callback: function(r) { 
			if(r.length == 3)
				transform.setPosition(r[0],r[1],r[2]);
		},callback_before: function() {
			CORE.userAction("component_changed", transform );
		},callback_update: function() {
			return transform._position;
		},
		precision: 3
	});

	var euler = quat.toEuler( vec3.create(), transform._rotation );
	vec3.scale(euler,euler, RAD2DEG );
	//sort by axis, not by yaw,pitch,roll
	var rot = [euler[2],euler[0],euler[1]];

	inspector.addVector3("Rotation", rot, { 
		name_width: 100,
		pretitle: AnimationModule.getKeyframeCode( transform, "rotation"),
		callback: function(r) {
			vec3.scale(r,r, DEG2RAD );
			//back to axis
			var euler = [r[1],r[2],r[0]];
			transform.setRotationFromEuler(euler);
		}, callback_before: function() {
			CORE.userAction("component_changed", transform );
	}});

	var scale_widget = inspector.addVector3("Scale", transform._scaling, {
		name_width: 100,
		step: 0.01,
		pretitle: AnimationModule.getKeyframeCode( transform, "scaling"),
		callback: function(v) {
			transform.setScale(v[0],v[1],v[2]);
		},
		callback_before: function() {
			CORE.userAction("component_changed", transform );
	}});

	inspector.addNumber("Uniform Scale", transform.uniform_scaling, {
		name_width: 100,
		step: 0.01,
		pretitle: AnimationModule.getKeyframeCode( transform, "uniform_scaling"),
		callback: function(v) {
			scale_widget.setValue([v,v,v]);
		}, callback_before: function() {
			CORE.userAction("component_changed", transform );
	}});
}

LS.Transform.prototype.getExtraTitleCode = function()
{
	return AnimationModule.getKeyframeCode( this, "data" );
}

LS.Components.Camera["@inspector"] = function(camera, inspector)
{
	if(!camera) 
		return;
	var node = camera._root;

	inspector.addCombo("Type", camera.type, { values: { "Orthographic" : LS.Camera.ORTHOGRAPHIC, "Perspective": LS.Camera.PERSPECTIVE, "Ortho2D": LS.Camera.ORTHO2D }, pretitle: AnimationModule.getKeyframeCode( camera, "type"), callback: function (value) { 
		camera.type = value;
		inspector.refresh();
	}});

	inspector.widgets_per_row = 2;
	if(camera.type != LS.Camera.ORTHO2D)
	{
		if(camera.type == LS.Camera.PERSPECTIVE)
			inspector.addNumber("Fov", camera.fov, { pretitle: AnimationModule.getKeyframeCode( camera, "fov"), min: 2, max: 180, units:'', callback: function (value) { camera.fov = value; }});
		inspector.addNumber("Aspect", camera.aspect, { pretitle: AnimationModule.getKeyframeCode( camera, "aspect" ), min: 0.1, max: 10, step: 0.01, callback: function (value) { camera.aspect = value; }});
	}
	inspector.addNumber("Near", camera.near, { pretitle: AnimationModule.getKeyframeCode( camera, "near" ), callback: function (value) { camera.near = value; }});
	inspector.addNumber("Far", camera.far, { pretitle: AnimationModule.getKeyframeCode( camera, "far" ), callback: function (value) { camera.far = value; }});
	inspector.widgets_per_row = 1;

	if(camera.type == LS.Camera.ORTHO2D)
		inspector.addVector4("Orthographic", camera.orthographic, {  pretitle: AnimationModule.getKeyframeCode( camera, "orthographic" ),  name_width: 100, callback: function (value) { camera.orthographic = value; }});
	else
	{
		if(camera.type == LS.Camera.ORTHOGRAPHIC)
			inspector.addNumber("Frustum size", camera.frustum_size, {  pretitle: AnimationModule.getKeyframeCode( camera, "frustum_size" ),  name_width: 100, callback: function (value) { camera.frustum_size = value; }});
		inspector.addNumber("focalLength", camera.focalLength, { min: 0.0001, pretitle: AnimationModule.getKeyframeCode( camera, "focalLength" ),  name_width: 100, callback: function(v) { 
			camera.focalLength = v;
		}});
	}

	var is_node_camera = (node && !node._is_root);

	inspector.addSeparator();
	inspector.addLayers("Layers", camera.layers, { pretitle: AnimationModule.getKeyframeCode( camera, "layers"), callback: function (value) { 
		camera.layers = value;
		inspector.refresh();
	}});

	if(!is_node_camera)
	{
		inspector.addSeparator();
		inspector.addVector3("Eye", camera.eye, { name_width: 80, pretitle: AnimationModule.getKeyframeCode( camera, "eye" ), disabled: is_node_camera, callback: function(v) { 
			camera.eye = v;
		}});
		inspector.addVector3("Center", camera.center, { name_width: 80, pretitle: AnimationModule.getKeyframeCode( camera, "center" ), disabled: is_node_camera, callback: function(v) { 
			camera.center = v;
		}});
		inspector.addVector3("Up", camera.up, { name_width: 80, pretitle: AnimationModule.getKeyframeCode( camera, "up" ), disabled: is_node_camera, callback: function(v) { 
			camera.up = vec3.normalize(vec3.create(), v);
		}});
	}

	inspector.addButtons(null,["Copy from current","View from here"],{ callback: function(v){ 
		if(v == "Copy from current")
			inner_copy_from_current();
		else
			inner_view_from_here();
	}});

	inspector.addTitle("Viewport");
	inspector.addVector2("Offset", camera._viewport.subarray(0,2), { pretitle: AnimationModule.getKeyframeCode( camera, "viewport_offset" ),  name_width: 100,min:0, max:1, step: 0.001, callback: function(v) { 
		camera._viewport.subarray(0,2).set(v);
	}});
	inspector.addVector2("Size", camera._viewport.subarray(2,4), { pretitle: AnimationModule.getKeyframeCode( camera, "viewport_size" ), name_width: 100, min:0, max:1, step: 0.001, callback: function(v) { 
		camera._viewport.subarray(2,4).set(v);
	}});

	inspector.addColor("Background Color", camera.background_color , { pretitle: AnimationModule.getKeyframeCode( camera, "background_color" ), callback: function (v) { 
		camera.background_color = v; 
		if(RenderModule.cameras)
			for(var i in RenderModule.cameras)
				RenderModule.cameras[i].background_color = v;
	}});

	inspector.widgets_per_row = 3;
	inspector.addCheckbox("clear color", camera.clear_color , { name_width: "65%", callback: function (v) { camera.clear_color = v; } });
	inspector.addCheckbox("clear depth", camera.clear_depth , { name_width: "65%", callback: function (v) { camera.clear_depth = v; } });
	inspector.addCheckbox("bg. alpha", camera.background_color[3] == 0 , { name_width: "65%", callback: function (v) { camera.background_color[3] = v ? 0 : 1; } });
	inspector.widgets_per_row = 1;

	inspector.addMaterial("Overwrite Material", camera.overwrite_material, { callback: function(v) { camera.overwrite_material = v; } });

	inspector.addTitle("Render to Texture");
	inspector.addCheckbox("Enable", camera.render_to_texture , { callback: function (v) { camera.render_to_texture = v; inspector.refresh(); } });
	if(camera.render_to_texture)
	{
		inspector.addRenderFrameContext("Frame", camera._frame );
		inspector.addCheckbox("Show on Viewport", camera.show_frame , { callback: function (v) { camera.show_frame = v; } });
	}

	function inner_copy_from_current()
	{
		camera.lookAt( RenderModule.camera.eye, RenderModule.camera.center, RenderModule.camera.up );
		inspector.refresh();
	}

	function inner_view_from_here()
	{
		RenderModule.camera.lookAt( camera.getEye(), camera.getCenter(), camera.up );
		inspector.refresh();
	}
}

LS.Components.Light["@inspector"] = function(light, inspector)
{
	if(!light)
		return;

	var node = light._root;

	var light_types = ["Omni","Spot","Directional"];
	inspector.addCombo("Type", light_types[light.type-1], { pretitle: AnimationModule.getKeyframeCode( light, "type"), values: light_types, callback: function(v) { 
		light.type = light_types.indexOf(v)+1; 
	}});

	inspector.addColor("Color", light.color, { pretitle: AnimationModule.getKeyframeCode( light, "color"), callback: function(color) { light.color = color; } });
	inspector.addSlider("Intensity", light.intensity, { pretitle: AnimationModule.getKeyframeCode( light, "intensity"), min:0, max:2, step:0.01, callback: function (value) { light.intensity = value; }});
	inspector.widgets_per_row = 3;
	inspector.addNumber("Angle", light.angle, { pretitle: AnimationModule.getKeyframeCode( light, "angle"), callback: function (value) { light.angle = value; }});
	inspector.addNumber("Angle End", light.angle_end, { pretitle: AnimationModule.getKeyframeCode( light, "angle_end"), callback: function (value) { light.angle_end = value; }});
	inspector.addCheckbox("Spot cone", light.spot_cone != false, { pretitle: AnimationModule.getKeyframeCode( light, "spot_cone"), callback: function(v) { light.spot_cone = v; }});
	inspector.widgets_per_row = 1;
	inspector.addNumber("Frustum size", light.frustum_size || 100, { pretitle: AnimationModule.getKeyframeCode( light, "frustum_size"), callback: function (value) { light.frustum_size = value; }});
	inspector.addLayers("Illuminated Layers", light.illuminated_layers, { pretitle: AnimationModule.getKeyframeCode( light, "illuminated_layers"), callback: function (value) { 
		light.illuminated_layers = value;
		inspector.refresh();
	}});

	var is_root_camera = node._is_root;

	if(is_root_camera)
	{
		inspector.addSeparator();

		inspector.addVector3("Position", light.position, { pretitle: AnimationModule.getKeyframeCode( light, "position"), name_width: 100,  disabled: !is_root_camera, callback: function(v) { 
			light.position = v; 
		}});

		inspector.addVector3("Target", light.target, { pretitle: AnimationModule.getKeyframeCode( light, "target"), name_width: 100, disabled: !is_root_camera, callback: function(v) { 
			light.target = v; 
		}});
	}

	inspector.addSeparator();
	inspector.addCombo("Attenuation type", light.attenuation_type, { pretitle: AnimationModule.getKeyframeCode( light, "attenuation_type"), values: LS.Light.AttenuationTypes, name_width: "50%", callback: function(v) { light.attenuation_type = v; }});
	inspector.widgets_per_row = 2;
	inspector.addNumber("Att. start", light.att_start, { pretitle: AnimationModule.getKeyframeCode( light, "att_start"), callback: function (value) { light.att_start = value;}});
	inspector.addNumber("Att. end", light.att_end, { pretitle: AnimationModule.getKeyframeCode( light, "att_end"), callback: function (value) { light.att_end = value; }});
	inspector.widgets_per_row = 1;
	inspector.addSlider("Phong Offset", light.offset, { pretitle: AnimationModule.getKeyframeCode( light, "offset"), min: 0, step:0.01, max:1, callback: function (value) { light.offset = value; } });
	inspector.addSeparator();
	inspector.widgets_per_row = 2;
	inspector.addCheckbox("Const Diff.", !!light.constant_diffuse, { callback: function(v) { light.constant_diffuse = v; }});
	inspector.addCheckbox("Specular", light.use_specular != false, { callback: function(v) { light.use_specular = v; }});
	inspector.widgets_per_row = 1;

	inspector.addTitle("Shadow");
	inspector.addCheckbox("Cast. shadows", light.cast_shadows, { pretitle: AnimationModule.getKeyframeCode( light, "cast_shadows"), callback: function(v) { light.cast_shadows = v; inspector.refresh(); }});

	if(light.cast_shadows && light._shadowmap )
	{
		inspector.widgets_per_row = 1;
		//inspector.addCheckbox("Reverse faces", light.hard_shadows, { pretitle: AnimationModule.getKeyframeCode( light, "hard_shadows"), callback: function(v) { light.hard_shadows = v; }});
		//inspector.addCheckbox("Hard shadows", light.hard_shadows, { pretitle: AnimationModule.getKeyframeCode( light, "hard_shadows"), callback: function(v) { light.hard_shadows = v; }});
		inspector.addLayers("Shadows Layers", light._shadowmap.layers, { pretitle: AnimationModule.getKeyframeCode( light, "layers"), callback: function (value) { 
			light._shadowmap.layers = value;
			inspector.refresh();
		}});
		inspector.widgets_per_row = 2;
		inspector.addNumber("Near", light.near, { pretitle: AnimationModule.getKeyframeCode( light, "near"), callback: function (value) { light.near = value;}});
		inspector.addNumber("Far", light.far, { pretitle: AnimationModule.getKeyframeCode( light, "far"), callback: function (value) { light.far = value; }});
		inspector.widgets_per_row = 1;
		inspector.addNumber("Bias", light._shadowmap.bias, { pretitle: AnimationModule.getKeyframeCode( light._shadowmap, "bias"), step: 0.001, precision: 3, min:-0.5, callback: function (value) { light._shadowmap.bias = value; }});
		inspector.addCombo("Resolution", !light._shadowmap.resolution ? "Default" : light._shadowmap.resolution, { pretitle: AnimationModule.getKeyframeCode( light, "resolution"), values: ["Default",256,512,1024,2048,4096], callback: function(v) { 
			if(v == "Default")
				light._shadowmap.resolution = 0; 
			else
				light._shadowmap.resolution = parseFloat(v); 
		}});
		inspector.widgets_per_row = 2;
		inspector.addCheckbox("Hard Shadows", light._shadowmap.shadow_mode == 0, { pretitle: AnimationModule.getKeyframeCode( light, "reverse_faces"), callback: function(v) { light._shadowmap.shadow_mode = !v ? 1 : 0; }});
		inspector.addCheckbox("Reverse Faces", light._shadowmap.reverse_faces, { pretitle: AnimationModule.getKeyframeCode( light, "reverse_faces"), callback: function(v) { light._shadowmap.reverse_faces = v; }});
		inspector.addCheckbox("Linear Filter", light._shadowmap.linear_filter, { pretitle: AnimationModule.getKeyframeCode( light, "reverse_faces"), callback: function(v) { light._shadowmap.linear_filter = v; }});
		inspector.addButton(null, "Show Shadowmap", { callback: function(v) { 
			var preview = new TexturePreviewWidget();
			preview._texture = light._shadowmap._texture;
			RenderModule.canvas_manager.root.addChild( preview );
		}});
		inspector.widgets_per_row = 1;
	}

	inspector.addTitle("Textures");
	inspector.addTexture("Proj. texture", light.projective_texture, { pretitle: AnimationModule.getKeyframeCode( light, "projective_texture"), callback: function(filename) { 
		light.projective_texture = filename;
		LS.GlobalScene.refresh();
	}});

	inspector.addTexture("Extra texture", light.extra_texture, { pretitle: AnimationModule.getKeyframeCode( light, "extra_texture"), callback: function(filename) { 
		light.extra_texture = filename;
		LS.GlobalScene.refresh();
	}});

	inspector.addButton(null, "Edit Shader", { callback: function() { 
		CodingModule.openTab();
		CodingModule.editInstanceCode( light, { id: light.uid, title: "Light Shader", lang:"glsl", help: light.constructor.coding_help, getCode: function(){ return light.extra_light_shader_code; }, setCode: function(code){ light.extra_light_shader_code = code; } } );
	}});
}


LS.Components.MeshRenderer.onShowProperties = function( component, inspector )
{
	return; //work in progress
	/*
	var mesh = component.getMesh();

	inspector.addCheckbox("use submaterials", component.use_submaterials, function(v){
		component.use_submaterials = v;
		inspector.refresh();
	});

	if(!component.use_submaterials)
		return;

	inspector.addTitle("Submaterials");

	inspector.addNumber("num_submaterials", component.submaterials.length, { precision: 0, min: 0, step: 1, max: 32, callback: function(v) {
		var mesh = component.getMesh();
		component.submaterials.length = Number(v);
		for(var i = 0; i < component.submaterials.length; ++i)
		{
			var submaterial = null;
			if(mesh && mesh.info && mesh.info.groups)
				submaterial = mesh.info.groups[i] ? mesh.info.groups[i].material : "";
			component.submaterials[i] = submaterial;
		}
		inspector.refresh();
	}});

	if(component.submaterials.length)
		for(var i = 0; i < component.submaterials.length; ++i)
		{
			var title = i;
			if(mesh && mesh.info && mesh.info.groups && mesh.info.groups[i])
				title = i + ": " + mesh.info.groups[i].name;
			inspector.addStringButton( title, component.submaterials[i] || "", { index: i, callback: function() {
			
			}, callback_button: function(v){
				//component.submaterials[ this.options.index ] = null;
				//inspector.refresh();
			}});
		}

	inspector.addButton(null,"Add submaterial", { callback: function() { 
		var submaterial = null;
		var i = component.submaterials.length;
		if(mesh && mesh.info && mesh.info.groups)
			submaterial = mesh.info.groups[i] ? mesh.info.groups[i].material : "";
		component.submaterials.push(submaterial);
		inspector.refresh();
	}});
	*/
}

EditorModule.onShowComponentCustomProperties = function( component, inspector, ignore_edit, replacement_component, extra_name )
{
	//special case: for SceneInclude custom data shown from internal component
	replacement_component = replacement_component || component;
	extra_name = extra_name || "";

	//show properties
	if(component.properties)
		for(var i = 0; i < component.properties.length; i++)
		{
			var p = component.properties[i];
			inspector.add( p.type, p.label || p.name, p.value, { pretitle: AnimationModule.getKeyframeCode( replacement_component, extra_name + p.name ), title: p.name, values: p.values, step: p.step, property: p, callback: inner_on_property_value_change });
		}

	if(ignore_edit)
		return;

	var valid_properties = ["number","vec2","vec3","vec4","color","enum","texture","cubemap","node","string","sampler"];

	inspector.addButton(null,"Edit Properties", { callback: function() { 
		EditorModule.showEditPropertiesDialog( component.properties, valid_properties, inner_on_editproperties );
	}});

	function inner_on_newproperty( p )
	{
		if (component[ p.name ])
		{
			LiteGUI.alert("There is already a property with that name.");
			return;
		}
		else
		{
			if(component.addProperty)
				component.addProperty( p );
			else
				console.error("Component doesnt have createProperty");
		}

		inspector.refresh();
	}

	function inner_on_editproperties( p )
	{
		//component.updateProperty( p );
		//TODO
		inspector.refresh();
	}	

	function inner_on_property_value_change(v)
	{
		var p = this.options.property;
		p.value = v;
		if(component.updateProperty)
			component.updateProperty( p );
		LS.GlobalScene.refresh();
	}
}


LS.Components.CustomData["@inspector"] = function( component, inspector )
{
	return EditorModule.onShowComponentCustomProperties( component, inspector );
}


LS.Components.CameraFX["@inspector"] = function( camerafx, inspector)
{
	if(!camerafx)
		return;
	var node = camerafx._root;

	inspector.addRenderFrameContext("Frame Settings", camerafx.frame, { pretitle: AnimationModule.getKeyframeCode( camerafx, "frame" ), callback: function(v) {} });
	inspector.addCheckbox("Antialiasing", camerafx.use_antialiasing, { name_width: "70%", pretitle: AnimationModule.getKeyframeCode( camerafx, "use_antialiasing" ), callback: function(v) { camerafx.use_antialiasing = v; } });
	inspector.addString("Camera UID", camerafx.camera_uid, { pretitle: AnimationModule.getKeyframeCode( camerafx, "camera_uid" ), callback: function(v) { camerafx.camera_uid = v; } });

	//EditorModule.showFXInfo( camerafx, inspector );
	camerafx.fx.inspect( inspector, camerafx );
}


LS.Components.FrameFX["@inspector"] = function( component, inspector)
{
	if(!component)
		return;
	var node = component._root;

	inspector.widgets_per_row = 2;
	inspector.addRenderFrameContext("Frame Settings", component.frame, { name_width: "70%", pretitle: AnimationModule.getKeyframeCode( component, "frame" ), callback: function(v) {} });
	inspector.addCheckbox("Antialiasing", component.use_antialiasing, { name_width: "70%", pretitle: AnimationModule.getKeyframeCode( component, "use_antialiasing" ), callback: function(v) { component.use_antialiasing = v; } });
	inspector.widgets_per_row = 1;

	inspector.addMaterial("Shader Material", component.shader_material, { pretitle: AnimationModule.getKeyframeCode( component, "shader_material" ), callback: function(v) { component.shader_material = v; }});

	if( component.shader_material )
	{
		var mat = LS.RM.getResource( component.shader_material );
		if(!mat)
			LS.RM.load( component.shader_material, function(){ inspector.refresh(); });
		else
			LS.MaterialClasses.ShaderMaterial["@inspector"]( mat, inspector, true );
	}

	component.fx.inspect( inspector, component );
}

LS.FXStack.prototype.inspect = function( inspector, component )
{
	var that = this;

	var title = inspector.addTitle("Active FX");
	title.addEventListener("contextmenu", function(e) { 
        if(e.button != 2) //right button
            return false;
		//create the context menu
		var contextmenu = new LiteGUI.ContextMenu( ["Copy","Paste"], { title: "FX List", event: e, callback: function(v){
			if(v == "Copy")
				LiteGUI.toClipboard( JSON.stringify( that.serialize() ) );
			else //Paste
			{
				var data = LiteGUI.getLocalClipboard();
				if(data)
					that.configure( data );
				inspector.refresh();
			}
			LS.GlobalScene.refresh();
		}});
        e.preventDefault(); 
        return false;
    });

	var enabled_fx = this.fx;

	for(var i = 0; i < enabled_fx.length; i++)
	{
		var fx = enabled_fx[i];
		var fx_info = LS.FXStack.available_fx[ fx.name ];
		if(!fx_info)
		{
			console.warn("Unknown FX: " + fx.name);
			continue;
		}
		if(fx_info.uniforms)
			for(var j in fx_info.uniforms)
			{
				var uniform = fx_info.uniforms[j];
				if(uniform.type == "float")
					inspector.addNumber( j, fx[j] !== undefined ? fx[j] : uniform.value, {
						pretitle: component ? AnimationModule.getKeyframeCode( component, "fx/"+i+"/"+j ) : "",
						min: uniform.min,
						max: uniform.max,
						step: uniform.step,
						fx_name: j,
						fx: fx,
						callback: function(v){
							this.options.fx[ this.options.fx_name ] = v;
						}				
					});
				else if(uniform.type == "bool")
					inspector.addCheckbox( j, fx[j] !== undefined ? fx[j] : uniform.value, {
						pretitle: component ? AnimationModule.getKeyframeCode( component, "fx/"+i+"/"+j ) : "",
						fx_name: j,
						fx: fx,
						callback: function(v){
							this.options.fx[ this.options.fx_name ] = v;
						}				
					});
				else if(uniform.type == "color3")
					inspector.addColor( j, fx[j] !== undefined ? fx[j] : uniform.value, {
						pretitle: component ? AnimationModule.getKeyframeCode( component, "fx/"+i+"/"+j ) : "",
						fx_name: j,
						fx: fx,
						callback: function(v){
							this.options.fx[ this.options.fx_name ] = v;
						}				
					});
				else if(uniform.type == "sampler2D")
					inspector.addTexture( j, fx[j] !== undefined ? fx[j] : uniform.value, {
						pretitle: component ? AnimationModule.getKeyframeCode( component, "fx/"+i+"/"+j ) : "",
						fx_name: j,
						fx: fx,
						callback: function(v){
							this.options.fx[ this.options.fx_name ] = v;
						}				
					});
				else //for vec2, vec3, vec4
					inspector.add( uniform.type, j, fx[j] !== undefined ? fx[j] : uniform.value, {
						pretitle: component ? AnimationModule.getKeyframeCode( component, "fx/"+i+"/"+j ) : "",
						fx_name: j,
						fx: fx,
						callback: function(v){
							if( this.options.fx[ this.options.fx_name ] && this.options.fx[ this.options.fx_name ].set )
								this.options.fx[ this.options.fx_name ].set( v );
							else
								this.options.fx[ this.options.fx_name ] = v;
						}				
					});
			}
	}

	inspector.addButton(null,"Edit FX", { callback: inner });
	//inspector.addButton(null,"Remove FX", {});

	var selected_enabled_fx = "";

	//show camera fx dialog
	function inner()
	{
		var dialog = LiteGUI.Dialog.getDialog("dialog_show_fx");
		if(dialog)
			dialog.clear();
		else
			dialog = new LiteGUI.Dialog({ id: "dialog_show_fx", title:"FX Settings", close: true, width: 360, height: 370, scroll: false, draggable: true});

		dialog.show();

		var split = new LiteGUI.Split("load_scene_split",[50,50]);
		dialog.add(split);

		//left side
		var widgets_left = new LiteGUI.Inspector();
		widgets_left.addTitle("Available FX");
		split.getSection(0).add( widgets_left );
		var fx = LS.FXStack.available_fx;
		var available_fx = [];
		for(var i in fx)
			available_fx.push(i);
		available_fx = available_fx.sort();		
		var selected_available_fx = "";
		var available_list = widgets_left.addList( null, available_fx, { height: 240, callback: function(v) {
			selected_available_fx = v;
		}});
		widgets_left.addButton(null,"Add FX", { callback: function(){
			that.addFX( selected_available_fx );
			inspector.refresh();
			LS.GlobalScene.refresh();
			inner();
		}});

		var widgets_right = new LiteGUI.Inspector();
		widgets_right.addTitle("Current FX");
		var enabled_list = widgets_right.addList(null, enabled_fx, { selected: selected_enabled_fx, height: 240, callback: function(v) {
			selected_enabled_fx = v;
		}});
		split.getSection(1).add(widgets_right);
		widgets_right.addButtons(null,["Up","Down","Delete"], { callback: function(v){
			if(v == "Delete")
			{
				that.removeFX( selected_enabled_fx );
			}
			else if(v == "Up")
			{
				that.moveFX( selected_enabled_fx );
			}
			else if(v == "Down")
			{
				that.moveFX( selected_enabled_fx, 1 );
			}
			inspector.refresh();
			LS.GlobalScene.refresh();
			inner();
		}});

		dialog.adjustSize();
	}
}

function computeSharedInitialString(array)
{
	var first = array[0];
	for(var i = 0; i < first.length; ++i)
		for(var j = 1; j < array.length; ++j)
			if( first[i] != array[j][i] )
				return i;
	return first.length;
}

LS.Components.MorphDeformer["@inspector"] = function( component, inspector )
{
	inspector.widgets_per_row = 3;
	inspector.addCombo( "mode", component.mode, { name_width: 60, values: LS.Components.MorphDeformer["@mode"].values, width:"40%", callback: function (value) { 
		component.mode = value;
	}});

	inspector.addCheckbox("Use Sliders", LS.Components.MorphDeformer.use_sliders, { name_width: 80, width:"30%", callback: function(v){ 
		LS.Components.MorphDeformer.use_sliders = v; inspector.refresh();
	}});

	inspector.addButton(null,"Edit Morph Targets", { width: "30%", callback: function() { 
		//component.morph_targets.push({ mesh:"", weight: 0.0 });
		EditorModule.showMorphsDialog( component );
		//inspector.refresh();
	}});

	inspector.widgets_per_row = 1;

	if( component.morph_targets.length )
	{
		if(LS.Components.MorphDeformer.use_sliders)
		{
			inspector.addString("Filter", LS.Components.MorphDeformer.filter || "", { callback: function(v) { 
				LS.Components.MorphDeformer.filter = v;
				inspector.refresh();
			}});

			var names = component.morph_targets.map(function(a){return a.mesh;});
			names = LS.Components.MorphDeformer.removeSharedString(names);
			inspector.widgets_per_row = 2;
			for(var i = 0; i < component.morph_targets.length; i++)
			{
				var morph = component.morph_targets[i];
				var pretty_name = morph.name || names[i].replace(/_/g," ");
				if(LS.Components.MorphDeformer.filter && pretty_name.toLowerCase().indexOf( LS.Components.MorphDeformer.filter.toLowerCase() ) == -1 )
					continue;

				inspector.addSlider(pretty_name, morph.weight, { min: -1, max: 1, width: "calc(100% - 40px)", pretitle: AnimationModule.getKeyframeCode( component, "morphs/"+i+"/weight" ), morph_index: i, callback: function(v) { 
					CORE.userAction("component_changed",component);
					component.setMorphWeight( this.options.morph_index, v );
					LS.GlobalScene.refresh();
				}});

				inspector.addButton(null, "0", { width: "40px", morph_index: i, callback: function() { 
					CORE.userAction("component_changed",component);
					component.setMorphWeight( this.options.morph_index, 0 );
					inspector.refresh();
					LS.GlobalScene.refresh();
				}});
			}
			inspector.widgets_per_row = 1;
		}
		else
		{
			inspector.widgets_per_row = 3;
			for(var i = 0; i < component.morph_targets.length; i++)
			{
				var morph = component.morph_targets[i];
				inspector.addMesh("", morph.mesh, { pretitle: AnimationModule.getKeyframeCode( component, "morphs/"+i+"/mesh" ), name_width: 20, align: "right", width: "60%", morph_index: i, callback: function(v) { 
					CORE.userAction("component_changed",component);
					component.setMorphMesh( this.options.morph_index, v );
					LS.GlobalScene.refresh();
				}});

				inspector.addNumber("", morph.weight, { pretitle: AnimationModule.getKeyframeCode( component, "morphs/"+i+"/weight" ), name_width: 20, width: "25%", step: 0.01, morph_index: i, callback: function(v) { 
					CORE.userAction("component_changed",component);
					component.setMorphWeight( this.options.morph_index, v );
					LS.GlobalScene.refresh();
				}});

				inspector.addButton(null, InterfaceModule.icons.trash, { width: "15%", morph_index: i, callback: function() { 
					CORE.userAction("component_changed",component);
					component.removeMorph( this.options.morph_index );
					inspector.refresh();
					LS.GlobalScene.refresh();
				}});
			}
		}
		inspector.widgets_per_row = 1;
	}

	inspector.widgets_per_row = 2;

	inspector.addButton(null,"Add New Morph Target", { callback: function() { 
		CORE.userAction("component_changed",component);
		component.morph_targets.push({ mesh:"", weight: 0.0 });
		inspector.refresh();
	}});

	inspector.addButton(null,"Zero All", { callback: function() { 
		component.clearWeights();
		inspector.refresh();
	}});

	inspector.widgets_per_row = 1;
}

EditorModule.showMorphsDialog = function( component )
{
	if(!component)
		return;

	var dialog = new LiteGUI.Dialog({ id: "dialog_show_morphs", title:"Morphs", close: true, width: 600, height: 520, resizable: true, scroll: true, draggable: true});

	var inspector = new LiteGUI.Inspector({ height: "100%", noscroll: true });
	dialog.add( inspector );
	dialog.show('fade');
	inspector.on_refresh = inner_refresh;
	inspector.refresh();

	function inner_refresh()
	{
		inspector.clear();

		inspector.addCheckbox("delta_meshes", component.delta_meshes, { callback: function(v){ 
			CORE.userAction("component_changed",component);
			component.delta_meshes = v;
		}});

		inspector.addButton(null,"Recompute short names", { callback: function(v){
			for(var i = 0; i < component.morph_targets.length; i++)
			{
				var morph = component.morph_targets[i];
				var names = component.morph_targets.map(function(a){return a.mesh;});
				names = LS.Components.MorphDeformer.removeSharedString(names);
				inspector.widgets_per_row = 2;
				for(var i = 0; i < component.morph_targets.length; i++)
				{
					var pretty_name = names[i].replace(/_/g," ");
					if(LS.Components.MorphDeformer.filter && pretty_name.toLowerCase().indexOf( LS.Components.MorphDeformer.filter.toLowerCase() ) == -1 )
						continue;
					component.setMorphName( i, pretty_name );
				}
				CORE.userAction("component_changed",component);
				EditorModule.refreshAttributes();
				inspector.refresh();
			}
		}});

		var container = inspector.startContainer("scrollable",{ height: 430, scrollable: true });

		inspector.widgets_per_row = 3;
		for(var i = 0; i < component.morph_targets.length; i++)
		{
			var morph = component.morph_targets[i];

			inspector.addString(String(i) + " Name", morph.name || "", { name_width: 80, width: "40%", morph_index: i, callback: function(v) { 
				component.setMorphName( this.options.morph_index, v );
				EditorModule.refreshAttributes();
				LS.GlobalScene.refresh();
			}});

			inspector.addMesh(null, morph.mesh, { name_width: 80, align: "right", width: "50%", morph_index: i, callback: function(v) { 
				component.setMorphMesh( this.options.morph_index, v );
				LS.GlobalScene.refresh();
			}});

			inspector.addButton(null, InterfaceModule.icons.trash, { width: "10%", morph_index: i, callback: function() { 
				CORE.userAction("component_changed",component);
				component.removeMorph( this.options.morph_index );
				inspector.refresh();
				LS.GlobalScene.refresh();
			}});
		}
		inspector.widgets_per_row = 1;

		inspector.endContainer();

		inspector.addButton(null,"Add New Morph Target", { callback: function() { 
			CORE.userAction("component_changed",component);
			component.morph_targets.push({ mesh:"", weight: 0.0 });
			inspector.refresh();
		}});
	}

	return dialog;
}

if(LS.Components.SkinDeformer)
LS.Components.SkinDeformer.onShowProperties = function( component, inspector )
{
	inspector.addButton("","See bones", { callback: function() { 
		EditorModule.showBonesDialog( component.getMesh() ); //right below this function
	}});
}

EditorModule.showBonesDialog = function( mesh )
{
	if(!mesh || !mesh.bones)
	{
		LiteGUI.alert("This mesh doesn't have bones");
		return;
	}

	var dialog = new LiteGUI.Dialog({ id: "dialog_show_bones", title:"Bones in Mesh", close: true, width: 360, height: 270, resizable: true, scroll: false, draggable: true});

	var widgets = new LiteGUI.Inspector({ id: "bones_widgets", height: "100%", noscroll: true });
	dialog.add( widgets );
	dialog.show('fade');
	widgets.on_refresh = inner_refresh;
	widgets.refresh();

	function inner_refresh()
	{
		widgets.clear();

		//get the names
		var selected = null;
		var bone_names = [];
		for(var i in mesh.bones)
			bone_names.push( mesh.bones[i][0] );
		var list = widgets.addList(null, bone_names, { height: "calc( 100% - 60px)", callback: function(v) {
			selected = v;
		}});

		widgets.addInfo("Num. of bones", bone_names.length );

		widgets.addButton(null,"Select Bone", function(){
			if(!selected)
				return;
			var node = LS.GlobalScene.getNode(selected);
			if(!node)
				return;
			SelectionModule.setSelection( node );
		});

		widgets.addButtons(null,["Convert Names to UIDs","Convert UIDs to Names"], function(v){
			if(v == "Convert UIDs to Names")
				mesh.convertBoneNames();
			else
				mesh.convertBoneNames(null,true);
			widgets.refresh();
		});

		//dialog.adjustSize(10);
	}

	return dialog;
}

if( LS.Components.ParticleEmissor )
LS.Components.ParticleEmissor["@inspector"] = function(component, inspector)
{
	if(!component) return;
	var node = component._root;

	inspector.addSlider("Max. Particles", component.max_particles, {step:10,min:10,max:1000, callback: function (value) { component.max_particles = value; }});
	inspector.addNumber("Warmup time", component.warm_up_time, {step:1,min:0,max:10, callback: function (value) { component.warm_up_time = value; }});
	inspector.addCheckbox("Point particles", component.point_particles,  {callback: function (value) { component.point_particles = value; }});

	inspector.addTitle("Emisor");
	inspector.addCombo("Type",component.emissor_type, { values: LS.Components.ParticleEmissor["@emissor_type"].values, callback: function (value) { 
		component.emissor_type = value;
		inspector.refresh();
	}});
	inspector.addNumber("Rate",component.emissor_rate, {step:0.1,min:0,max:100, callback: function (value) { component.emissor_rate = value; }});
	if(component.emissor_type == LS.Components.ParticleEmissor.MESH_EMISSOR)
	{
		inspector.addMesh("Mesh", component.emissor_mesh, { callback: function(filename) { 
			component.emissor_mesh = filename;
			if(filename)
				LS.ResourcesManager.load(filename);
		}});
	}
	else if(component.emissor_type == LS.Components.ParticleEmissor.NODE_EMISSOR)
	{
		inspector.addNode("Node", component.emissor_node, { callback: function(v) { 
			component.emissor_node = v;
		}});
	}
	else
		inspector.addVector3("Size",component.emissor_size, {step:0.1,min:0, callback: function (value) { component.emissor_size = value; }});

	inspector.addTitle("Particles");
	inspector.addNumber("Life",component.particle_life, {step:0.1,min:0.01, callback: function (value) { component.particle_life = value; }});
	inspector.addNumber("Speed",component.particle_speed, {step:0.1,min:0, callback: function (value) { component.particle_speed = value; }});

	inspector.addNumber("Size",component.particle_size, {step:0.1,min:0, callback: function (value) { component.particle_size = value; }});
	inspector.addLine("Size Curve",component.particle_size_curve, {defaulty:0, width: 120, callback: function (value) { component.particle_size_curve = value; }});

	inspector.addTitle("Material");
	inspector.addCheckbox("Use node material", component.use_node_material, {callback: function (value) { component.use_node_material = value; }});
	inspector.addColor("Start Color", component.particle_start_color, { callback: function(color) { component.particle_start_color = color; } });
	inspector.addColor("End Color", component.particle_end_color, { callback: function(color) { component.particle_end_color = color; } });
	inspector.addSlider("Opacity",component.opacity, {step:0.001,min:0,max:1, callback: function (value) { component.opacity = value; }});
	inspector.addLine("Opacity Curve",component.particle_opacity_curve, {defaulty:0, width: 120, callback: function (value) { component.particle_opacity_curve = value; }});
	inspector.addNumber("Grid Texture",component.texture_grid_size, {step:1,min:1,max:5,precision:0, callback: function (value) { component.texture_grid_size = value; }});
	inspector.addTexture("Texture", component.texture, { callback: function(filename) { 
		component.texture = filename;
		if(filename)
			LS.ResourcesManager.load(filename);
	}});

	inspector.widgets_per_row = 2;

	inspector.addCheckbox("Additive blending", component.additive_blending, {callback: function (value) { component.additive_blending = value; }});
	inspector.addCheckbox("Premultiply Alpha", component.premultiplied_alpha, {callback: function (value) { component.premultiplied_alpha = value; }});
	inspector.addCheckbox("Animated texture", component.animated_texture, {callback: function (value) { component.animated_texture = value; }});
	inspector.addCheckbox("Loop Animation", component.loop_animation, {callback: function (value) { component.loop_animation = value; }});
	inspector.addCheckbox("Independent color", component.independent_color, {callback: function (value) { component.independent_color = value; }});
	//inspector.addCheckbox("Soft particles", component.soft_particles, {callback: function (value) { component.soft_particles = value; }});
	inspector.widgets_per_row = 1;

	inspector.addTitle("Physics");
	inspector.addVector3("Gravity",component.physics_gravity, {step:0.1, callback: function (value) { vec3.copy(component.physics_gravity, value); }});
	inspector.addNumber("Rotation",component.particle_rotation, {step:0.1, callback: function (value) { component.particle_rotation = value; }});
	inspector.addSlider("Friction",component.physics_friction, {step:0.001,min:0,max:1, callback: function (value) { component.physics_friction = value; }});
	inspector.addButton("Custom update", "Edit code", { callback: function() {
		CodingModule.editInstanceCode( component, { id: component.uid + ":Update", title: "P.Update", lang:"javascript", getCode: function(){ return component.custom_update_code; }, setCode: function(code){ component.custom_update_code = code;	}}, true);
	}});
	inspector.addTitle("Flags");

	inspector.widgets_per_row = 2;

	inspector.addCheckbox("Align camera", component.align_with_camera, {callback: function (value) { component.align_with_camera = value; }});
	inspector.addCheckbox("Align always", component.align_always, {callback: function (value) { component.align_always = value; }});
	inspector.addCheckbox("Follow emitter", component.follow_emitter, {callback: function (value) { component.follow_emitter = value; }});
	inspector.addCheckbox("Sort in Z", component.sort_in_z, {callback: function (value) { component.sort_in_z = value; }});
	inspector.addCheckbox("Stop", component.stop_update, {callback: function (value) { component.stop_update = value; }});
	inspector.addCheckbox("Ignore Lights", component.ignore_lights, {callback: function (value) { component.ignore_lights = value; }});

	inspector.widgets_per_row = 1;
}

/** extras ****/

if( LS.Components.CameraController )
LS.Components.CameraController.onShowProperties = function(component, inspector)
{
	if(!component._root || !component._root.camera)
		inspector.addInfo(null,"<span class='alert'>Warning: No camera found in node</span>");
}

if(LS.Components.ThreeJS)
LS.Components.ThreeJS.onShowProperties = function( component, inspector )
{
	//add to inspector the vars
	var context = component._script ? component._script._context : null;
	if(context)
	{
		inspector.addTitle("Variables");
		inspector.showObjectFields( context );
	}
}

if(LS.Components.SpriteAtlas)
LS.Components.SpriteAtlas["@inspector"] = function( component, inspector )
{
	inspector.addTexture("texture", component.texture, { callback: function(v){
		component.texture = v;		
	}});

	inspector.addButton("Areas","Edit Areas", function() {
		TextureAreasWidget.createDialog( LiteGUI.root, component );
	});
}

if(LS.Components.SceneInclude)
LS.Components.SceneInclude["@inspector"] = function( component, inspector )
{
	inspector.widgets_per_row = 2;
	inspector.addResource("scene_path", component.scene_path || "", { width: "75%", pretitle: AnimationModule.getKeyframeCode( component, "scene_path" ), callback: function(v) { component.scene_path = v; } });
	inspector.addButton(null,"Open", { width: "25%", callback: function() { 
		if(component.scene_path && component._scene)
			CORE.selectScene( component._scene, true );
	}});
	inspector.widgets_per_row = 1;

	var group = inspector.beginGroup("Settings",{ collapsed: true });
	inspector.widgets_per_row = 2;
	inspector.addCheckbox("include_instances", component.include_instances, { name_width: "70%", pretitle: AnimationModule.getKeyframeCode( component, "include_instances" ), callback: function(v) { component.include_instances = v; } });
	inspector.addCheckbox("include_cameras", component.include_cameras, { name_width: "70%", pretitle: AnimationModule.getKeyframeCode( component, "include_cameras" ), callback: function(v) { component.include_cameras = v; } });
	inspector.widgets_per_row = 1;
	inspector.addCheckbox("include_lights", component.include_lights, { width: "50%", name_width: "70%", pretitle: AnimationModule.getKeyframeCode( component, "include_lights" ), callback: function(v) { component.include_lights = v; } });
	inspector.widgets_per_row = 2;
	inspector.addCheckbox("send_events", component.send_events, { name_width: "70%", pretitle: AnimationModule.getKeyframeCode( component, "send_events" ), callback: function(v) { component.send_events = v; } });
	inspector.addCheckbox("frame_fx", component.frame_fx, { name_width: "70%", pretitle: AnimationModule.getKeyframeCode( component, "frame_fx" ), callback: function(v) { component.frame_fx = v; } });
	inspector.widgets_per_row = 1;
	inspector.endGroup();

	if(!component.scene_path)
		return;

	//add to inspector the vars
	if(!component._scene.root.custom)
	{
		inspector.addSeparator();
		inspector.addButton("No customdata found","Refresh", function(){
			inspector.refresh();
		});
		return;
	}

	inspector.addTitle("Scene Custom Data");
	EditorModule.onShowComponentCustomProperties( component._scene.root.custom, inspector, true, component, "custom/" ); 
}

if(LS.Components.Poser)
LS.Components.Poser["@inspector"] = function( component, inspector)
{
	inspector.widgets_per_row = 2;
	inspector.addInfo("Nodes posed", component.base_nodes.length );
	inspector.addButton(null,"Edit poses", { callback: function(v,e){
		LS.Components.Poser.showPoseNodesDialog( component, e );
	}});

	inspector.widgets_per_row = 1;

	inspector.widgets_per_row = 2;
	for(var i in component.poses )
	{
		var pose = component.poses[i];
		inspector.addSlider(pose.name, pose.weight, { min: 0, max: 1, width: "calc(100% - 40px)", pretitle: AnimationModule.getKeyframeCode( component, "pose/"+i+"/weight" ), pose_name: pose.name, callback: function(v) { 
			component.setPoseWeight( this.options.pose_name, v );
			LS.GlobalScene.refresh();
		}});

		inspector.addButton(null, "0", { width: "40px", pose_name: pose.name, callback: function() { 
			component.setPoseWeight( this.options.pose_name, 0 );
			inspector.refresh();
			LS.GlobalScene.refresh();
		}});
	}
	inspector.widgets_per_row = 1;

	inspector.addButton(null,"Reset to base", { callback: function(v,e){
		component.applyBasePose();
		LS.GlobalScene.refresh();
	}});
}

if(LS.Components.Poser)
LS.Components.Poser.showPoseNodesDialog = function( component, event )
{
	var dialog = new LiteGUI.Dialog({title:"Poses editor", close: true, width: 600, height: 400, resizable: true, scroll: false, draggable: true});

	var area = new LiteGUI.Area();
	area.split( LiteGUI.Area.HORIZONTAL );
	dialog.add(area);

	var widgets_left = new LiteGUI.Inspector({ height: "100%", noscroll: true });
	area.getSection(0).add( widgets_left );
	dialog.show('fade');
	widgets_left.on_refresh = inner_refresh_left;

	var widgets_right = new LiteGUI.Inspector({ height: "100%", noscroll: true });
	area.getSection(1).add( widgets_right );
	widgets_right.on_refresh = inner_refresh_right;

	var node = null;

	widgets_left.refresh();
	widgets_right.refresh();

	function inner_refresh_left()
	{
		widgets_left.clear();

		widgets_left.addTitle("Poses");

		var poses = [];
		for(var i = 0; i < component.poses.length; ++i)
			poses.push( component.poses[i].name );

		if(!component._selected)
			component._selected = poses[0];
		
		widgets_left.addCombo("Pose", component._selected ,{values: poses, callback: function(v){
			component._selected = v;
		}});

		widgets_left.addButtons(null,["Update","Apply","Delete"], function(v){
			if(!component._selected)
				return;
			var pose_name = component._selected;
			var pose = component._poses_by_name[ pose_name ];
			if(!pose)
				return;
			//if(v == "Apply")
			//	component.applyPose( pose_name );
			if( v == "Update")
				component.updatePose( pose_name );
			else if( v == "Apply")
				component.applyPose( pose_name );
			else if( v == "Delete" )
			{
				component.removePose( pose_name );
				component._selected = null;
			}
			widgets_left.refresh();
			LS.GlobalScene.requestFrame();
		});

		var new_pose_name = "";

		widgets_left.addStringButton( "New Pose", new_pose_name, { button:"+", callback: function(v) { 
			new_pose_name = v;
		}, callback_button: function(){
			if(!new_pose_name)
				return;
			component.addPose( new_pose_name );
			component._selected = new_pose_name;
			widgets_left.refresh();
		}});

		widgets_left.addSeparator();

		widgets_left.addTitle("Select a node");
		widgets_left.widgets_per_row = 2;
		var node_widget = widgets_left.addNode("Node", "", { width: "70%", use_node: true, callback: function(v){
			node = v;
		}});
		widgets_left.addButton(null,"From Select.", { width: "30%", callback: function(){
			node_widget.setValue( SelectionModule.getSelectedNode() );
		}});
		widgets_left.widgets_per_row = 1;
		widgets_left.addTitle("Actions");
		widgets_left.addButtons(null,["Add Node", "Add Children"], function(v){
			if(!node)
				return;
			if(v == "Add Node")
			{
				component.addBaseNode( node );
			}
			else if(v == "Add Children")
			{
				var nodes = node.getDescendants();
				for(var i in nodes)
					component.addBaseNode( nodes[i] );
			}
			widgets_right.refresh();
		});
		widgets_left.widgets_per_row = 1;
		widgets_left.addSeparator();
		widgets_left.addButton(null, "Add current scene selected nodes", function(){
			var nodes = SelectionModule.getSelectedNodes();
			for(var i in nodes)
				component.addBaseNode( nodes[i] );
			widgets_right.refresh();
		});
		widgets_left.addButton(null, "Remove current scene selected nodes", function(){
			var nodes = SelectionModule.getSelectedNodes();
			for(var i in nodes)
				component.removeBaseNode( nodes[i] );
			widgets_right.refresh();
		});

		widgets_left.addSeparator();
		widgets_left.addButton(null,"Reset to base", { callback: function(v,e){
			component.applyBasePose();
			LS.GlobalScene.refresh();
		}});
	}

	function inner_refresh_right()
	{
		widgets_right.clear();

		//get the names
		var selected = null;
		var node_names = [];

		var base_nodes = component.base_nodes;
		for(var i in base_nodes)
		{
			var base_node = LS.GlobalScene.getNode( base_nodes[i].node_uid );
			if( base_node )
				node_names.push( base_node.name );
		}

		widgets_right.addTitle("Nodes in poses");

		var list = widgets_right.addList(null, node_names, { height: "calc( 100% - 30px)", callback: function(v) {
			selected = v;
		}});

		widgets_right.addButtons(null,["Remove Selected"],{
			callback: function(v){
				component.removeBaseNode( selected );
				widgets_right.refresh();
			}
		});
	}

	return dialog;
}

if(LS.Components.ReflectionProbe)
{
	LS.Components.ReflectionProbe.onShowProperties = function( component, inspector )
	{
		inspector.widgets_per_row = 3;
		inspector.addButton( null, "Update", { width: "40%", callback: function(){ component.recompute(null,true); LS.GlobalScene.requestFrame(); }});
		inspector.addButton( null, "Update all", { width: "50%", callback: function(){ LS.Components.ReflectionProbe.updateAll(); LS.GlobalScene.requestFrame(); }});
		inspector.addButton( null, LiteGUI.special_codes.download, { width: "10%", callback: function(){ 
			var texture = component.texture;
			if(!texture)
				return;
			var polar_texture = CubemapTools.convertCubemapToPolar(texture);
			var data = polar_texture.toBinary(true);
			LiteGUI.downloadFile("polar_cubemap.png", data );
		}});
		inspector.addSeparator();

		inspector.widgets_per_row = 3;
		inspector.addCheckbox( "Visualize", LS.Components.ReflectionProbe.visualize_helpers, function(v){ LS.Components.ReflectionProbe.visualize_helpers = v; LS.GlobalScene.requestFrame(); });
		inspector.addCheckbox( "Irradiance", LS.Components.ReflectionProbe.visualize_irradiance, function(v){ LS.Components.ReflectionProbe.visualize_irradiance = v; LS.GlobalScene.requestFrame(); });
		inspector.addNumber( "Size", LS.Components.ReflectionProbe.helper_size, function(v){ LS.Components.ReflectionProbe.helper_size = v; LS.GlobalScene.requestFrame(); });
		inspector.widgets_per_row = 1;
	}
}

if(LS.Components.IrradianceCache)
LS.Components.IrradianceCache.onShowProperties = function( component, inspector )
{
	var info = null;

	inspector.widgets_per_row = 2;
	inspector.addButton( null, "update all", { width:"70%", callback: function(){ 
		component.recompute(); LS.GlobalScene.requestFrame();
		info.setValue( (component.getSizeInBytes()/1024).toFixed(1) + " KBs" );
		info_num.setValue( component._irradiance_shs.length );
	}});
	inspector.addButton( null, "[only view]", { width:"30%", callback: function(){ 
		component.recompute( LS.Renderer._current_camera ); LS.GlobalScene.requestFrame();
		info.setValue( (component.getSizeInBytes()/1024).toFixed(1) + " KBs" );
		info_num.setValue( component._irradiance_shs.length );
	}});
	inspector.widgets_per_row = 1;
    inspector.addSeparator();

	inspector.widgets_per_row = 3;
	inspector.addCheckbox( "Visualize", LS.Components.IrradianceCache.show_probes, function(v){ LS.Components.IrradianceCache.show_probes = v; LS.GlobalScene.requestFrame(); });
	inspector.addCheckbox( "Cubemaps", LS.Components.IrradianceCache.show_cubemaps, function(v){ LS.Components.IrradianceCache.show_cubemaps = v; LS.GlobalScene.requestFrame(); });
	inspector.addNumber( "Size", LS.Components.IrradianceCache.probes_size, function(v){ LS.Components.IrradianceCache.probes_size = v; LS.GlobalScene.requestFrame(); });
	inspector.widgets_per_row = 2;
	info = inspector.addInfo( "Total Size", (component.getSizeInBytes()/1024).toFixed(1) + " KBs" );
	info_num = inspector.addInfo( "Num. probes", component._irradiance_shs.length );
	inspector.widgets_per_row = 1;

}

if(LS.Components.MediaPlayer)
	LS.Components.MediaPlayer.onShowProperties = function( component, inspector )
	{
		inspector.addButtons( null, ["Play","Stop"], function(v){ if(v == "Play") component.play(); else component.stop(); });
	}


if(LS.Components.Spline)
LS.Components.Spline.onShowProperties = function( component, inspector )
{
	inspector.widgets_per_row = 2;
	inspector.addInfo( "Num. Points", String(component.numberOfPoints) );
	inspector.addButton( null, "Clear Points", function(){ component.clear(); LS.GlobalScene.requestFrame(); });
	inspector.widgets_per_row = 1;
}