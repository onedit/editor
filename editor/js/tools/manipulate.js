var manipulateTool = {
	name: "manipulate",
	description: "Manipulate the node",
	section: "foo",
	icon: "imgs/mini-icon-ball.png",
	keyShortcut: 51, //G

	circle_size: 50,

	state: null,
	state_action: false,
	circle_center: vec3.create(),
	gizmo_center: vec3.create(),
	click_pos: vec3.create(),

	getGizmoLocalCenter: function( node, result )
	{
		result = result || vec3.create();

		if( ToolsModule.center_system == "instances" && node._instances && node._instances.length )
		{
			for(var i in node._instances)
				vec3.add( result, result, node._instances[i].oobb ); //node._instances[i].center
			vec3.scale(result,result,1/node._instances.length);
		}

		return result;
	},

	//called form ToolsModule
	renderEditor: function(camera)
	{
		if(!EditorView.mustRenderGizmos()) 
			return;

		var selection = SelectionModule.getSelection();
		if(!selection) 
			return;
		var node = selection.node; //could be null

		var gizmo_model = ToolUtils.getSelectionMatrix();
		if(!gizmo_model)
			return null;

		//var pos = node.transform.getGlobalPosition( this.gizmo_center );
		var pos = selection.instance.constructor === LS.SceneNode ?  this.getGizmoLocalCenter(node) : vec3.create();

		mat4.multiplyVec3( pos, gizmo_model, pos );
		this.gizmo_center.set( pos );

		//ToolUtils.prepareDrawing();
		//var camera = ToolUtils.getCamera();
		var camera2D = ToolUtils.enableCamera2D( camera );
		var pos2D = camera.project(pos);

		if( pos2D[2] < 0 ) 
			return;
		pos2D[2] = 0;
		this.circle_center.set(pos2D);

		//now render the gizmo
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		LS.Draw.push();
		LS.Draw.translate(pos2D);

		var circle_size = this.circle_size;

		var color = (node && node._is_bone) ? [1,0.1,1] : [1,0.6,0.1];

		//center circle
		LS.Draw.scale(5,5,5);
		LS.Draw.setColor( color );
		LS.Draw.setAlpha(0.5);
		LS.Draw.renderMesh( EditorView.debug_render.circle_mesh, gl.TRIANGLES );

		//rotate line
		LS.Draw.scale(circle_size / 5.0, circle_size / 5.0, circle_size / 5.0);
		LS.Draw.setAlpha( this.state == "rotate" ? 0.6 : 0.3 );
		LS.Draw.renderMesh( EditorView.debug_render.circle_empty_mesh, gl.LINE_LOOP );

		//move circle
		LS.Draw.scale(0.95,0.95,0.95);
		LS.Draw.setAlpha( this.state == "move" ? 0.4 : 0.2 );
		LS.Draw.renderMesh( EditorView.debug_render.circle_mesh, gl.TRIANGLES );
		LS.Draw.pop();

		gl.enable(gl.DEPTH_TEST);
	},

	mousedown: function(e)
	{
		if(!this.enabled) 
			return;
		if(e.which != 1)  //LEFT (do not use GL.LEFT_MOUSE_BUTTON because which use special format)
			return;

		var selection = SelectionModule.getSelection();
		if(!selection) 
			return;
		var node = selection.node; //could be null

		var gizmo_model = ToolUtils.getSelectionMatrix();
		if(!gizmo_model)
			return null;
		var pos = selection.instance.constructor === LS.SceneNode ?  this.getGizmoLocalCenter(node) : vec3.create();
		mat4.multiplyVec3( pos, gizmo_model, pos );

		var camera = ToolUtils.getCamera(e);
		var camera2D = ToolUtils.getCamera2D(camera);
		var pos2D = camera.project(pos);

		if(pos2D[2] < 0) //behind camera
			return;
		pos2D[2] = 0;

		this.circle_center.set(pos2D);

		var state = this.checkCursorState(e);
		this.state = state;
		this.updateCursor();

		if(e.shiftKey)
		{
			if(!state)
			{
				return;
			}
			else
			{
				var instances = SelectionModule.cloneSelectedInstance();
				if(instances)
					SelectionModule.setMultipleSelection(instances, false);
			}
		}
		else if(state) //there is an action performed
		{
			if(node)
			{
				if(node._is_bone && node.parentNode && node.parentNode._is_bone && !e.ctrlKey)
					ToolUtils.saveNodeTransformUndo(node.parentNode);
				else 
					ToolUtils.saveSelectionTransformUndo();
			}
		}

		if(state == "move")
		{
			this.state_action = true;
			ToolUtils.testPerpendicularPlane( e.canvasx, gl.canvas.height - e.canvasy, this.gizmo_center, this.click_pos );
		}
		else if(state == "rotate")
		{
			this.state_action = true;
			ToolUtils.testPerpendicularPlane( e.canvasx, gl.canvas.height - e.canvasy, this.gizmo_center, this.click_pos );
		}
		else
			this.state_action = false;
	},

	mouseup: function(e)
	{
		if(this.state_action)
			EditorModule.refreshAttributes();

		var selection_info = SelectionModule.getSelection();
		if( selection_info && selection_info.node && selection_info.node === LS.GlobalScene.root )
			CORE.afterUserAction("component_changed", selection_info.instance );
		else
			ToolUtils.afterSelectionTransform();

		this.state_action = false;
	},

	mousemove: function(e)
	{
		var mouse = vec3.fromValues( e.canvasx, e.canvasy, 0 );
		var old = this.state;

		//do not change state if there is an action in course
		if(!this.state_action)
		{
			this.state = this.checkCursorState(e);
			this.updateCursor();
		}

		var ret = null;
		if(e.dragging && this.state_action && e.which == 1)
			ret = this.onMouseDrag(e);

		EditorModule.updateInspector();

		if(this.state != old)
			LS.GlobalScene.refresh();

		return ret;
	},

	mousewheel: function(e)
	{
		if(!e.dragging)
			return;


		var selection = SelectionModule.getSelection();
		if(!selection) 
			return;
		var node = selection.node; //could be null

		if(this.state == "move")
		{
			var camera = ToolUtils.getCamera(e);
			var eye = camera.getEye();
			var delta = vec3.sub(vec3.create(), eye, this.gizmo_center );
			vec3.scale(delta,delta, (e.wheel < 0 ? 0.02 : -0.02) );
			var T = mat4.setTranslation( mat4.create(), delta );
	
			if( node && node._is_bone && node.parentNode && node.parentNode._is_bone && !e.ctrlKey )
				ToolUtils.applyTransformMatrixToBone(T);
			else
				ToolUtils.applyTransformMatrixToSelection(T);

			ToolUtils.testPerpendicularPlane( e.canvasx, gl.canvas.height - e.canvasy, this.gizmo_center, this.click_pos );
			EditorModule.updateInspector();
			LS.GlobalScene.refresh();
			return true;		
		}
	},

	onMouseDrag: function(e)
	{
		var selection = SelectionModule.getSelection();
		if(!selection) 
			return;
		var node = selection.node; //could be null

		var gizmo_model = ToolUtils.getSelectionMatrix();
		if(!gizmo_model)
			return null;
		var pos = selection.instance.constructor === LS.SceneNode ?  this.getGizmoLocalCenter(node) : vec3.create();
		mat4.multiplyVec3( pos, gizmo_model, pos );

		if(this.state == "move")
		{
			var result = vec3.create();
			ToolUtils.testPerpendicularPlane( e.canvasx, gl.canvas.height - e.canvasy, this.click_pos, result );
			var delta = vec3.sub(vec3.create(), result, this.click_pos);
			this.click_pos.set( result );

			var T = mat4.create();
			mat4.translate(T,T,delta);

			if(node && node._is_bone && node.parentNode && node.parentNode._is_bone && !e.ctrlKey)
				ToolUtils.applyTransformMatrixToBone(T);
			else
				ToolUtils.applyTransformMatrixToSelection(T);

		}
		else if(this.state == "rotate")
		{
			var camera = ToolUtils.getCamera(e);
			var result = vec3.create();
			ToolUtils.testPerpendicularPlane( e.canvasx, gl.canvas.height - e.canvasy, this.gizmo_center, result );
			var A = vec3.sub( vec3.create(), this.click_pos, this.gizmo_center );
			var B = vec3.sub( vec3.create(), result, this.gizmo_center );
			this.click_pos.set( result );
			vec3.normalize(A,A);
			vec3.normalize(B,B);
			//var axis = vec3.sub( vec3.create(), this.gizmo_center, camera.getEye() );
			var axis = vec3.cross( result, A,B );
			var angle = -Math.acos( Math.clamp( vec3.dot(A,B), -1,1) );
			//var angle = vec2.computeSignedAngle(A,B);
			if(angle != 0)
			{
				//need to know direction
				//var direction = vec3.dot( axis, vec3.cross(vec3.create(), A,B));
				//if(direction > 0) angle *= -1;

				var R = mat4.create();
				vec3.normalize(axis,axis);
				mat4.rotate( R, R, angle, axis );

				ToolUtils.applyTransformMatrixToSelection( R, this.gizmo_center );
			}
		}

		return this.state != null;
	},

	checkCursorState: function(e)
	{
		var mouse = vec3.fromValues( e.canvasx, e.canvasy, 0 );
		var dist = vec3.distance( mouse, this.circle_center );
		if( dist < (this.circle_size * 0.95) )
			return "move";
		else if( dist < this.circle_size * 1.05 )
			return "rotate";
		return null;
	},

	updateCursor: function()
	{
		var selection = SelectionModule.getSelection();
		if(!selection)
		{
			gl.canvas.style.cursor = null;
			return;
		}

		if(this.state == "move")
			gl.canvas.style.cursor = "move";
		else if(this.state == "rotate")
			gl.canvas.style.cursor = "e-resize";
		else
			gl.canvas.style.cursor = null;
	}
};

ToolsModule.registerTool(manipulateTool);

