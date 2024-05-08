/*
 This file is a template for a05 CS433/533
 
 Author: Amir Mohammad Esmaieeli Sikaroudi
 Email: amesmaieeli@email.arizona.edu
 Date: April, 2022
 
 Sources uses for this template:
 First Obj parser:
 https://webglfundamentals.org/
 The library for decoding PNG files is from:
 https://github.com/arian/pngjs
*/

var input = document.getElementById("load_scene");
input.addEventListener("change", readScene);

var dummy_canvas = document.getElementById('dummy_canvas');
var ctx = dummy_canvas.getContext('2d');

var renderingCanvas = document.querySelector("#canvas");
var gl = renderingCanvas.getContext("webgl", {preserveDrawingBuffer: true});

var modelMatrix;

var currentScene;

var doneLoading=false;
var doneProgramming=false;
var filesToRead=[];
var imageData;
var scene;
var objParsed;

var billboardProgram;
var time = 0.0;

var wh = document.getElementById('heightID');
var waterHeight = Number(wh.value);
wh.addEventListener("input", function(evt) {
	if(doneLoading==true){
		waterHeight=Number(wh.value);
	}
}, false);

var ts = document.getElementById('stepID');
var timeStep = Number(ts.value);
ts.addEventListener("input", function(evt) {
	if(doneLoading==true){
		timeStep=Number(ts.value);
	}
}, false);

var l = document.getElementById('lambdaID');
var lambda = Number(l.value);
l.addEventListener("input", function(evt) {
	if(doneLoading==true){
		lambda=Number(l.value);
	}
}, false);

function readScene()
{
	if (input.files.length > 0) {
		if(doneLoading==true)
		{
			newSceneRequested=true;
			filesToRead=[];
			imageData=[];
			objsData=[];
			scenes=[];
		}
		doneLoading=false;
		for(var i=0;i<input.files.length;i++)
		{
			var file = input.files[i];
			var reader = new FileReader();
			filesToRead[i]=true;
			reader.onload = (function(f,index) {
				return function(e) {
					let fileName = f.name;
					let fileExtension = fileName.split('.').pop();

					if(fileExtension=='ppm') {
						var file_data = this.result;
						let img=parsePPM(file_data,fileName);
						imageData.push(img);
						filesToRead[index]=false;
					} else if(fileExtension=='js') {
						var file_data = this.result;
						scene=parseScene(file_data);
						filesToRead[index]=false;
					} else if(fileExtension=='json') {
						var file_data = this.result;
						scene=parseScene(file_data);
						filesToRead[index]=false;
					} else if(fileExtension=='obj') {
						var file_data = this.result;
						objParsed=parseOBJ(file_data);
						filesToRead[index]=false;
					} else if(fileExtension=='png') {
						var file_data = this.result;
						
						var pngImage = new PNGReader(file_data);
						
						pngImage.parse(function(err, png){
							if (err) throw err;
							
							let img = parsePNG(png,fileName);
							
							let width=img.width;
							let height=img.height;
							document.getElementById("dummy_canvas").setAttribute("width", img.width);
							document.getElementById("dummy_canvas").setAttribute("height", img.height);
							let showCaseData = ctx.createImageData(width, height);
							for(var i = 0; i < img.data.length; i+=1){
								showCaseData.data[i*4]=img.data[i].r;
								showCaseData.data[i*4+1]=img.data[i].g;
								showCaseData.data[i*4+2]=img.data[i].b;
								showCaseData.data[i*4+3]=img.data[i].a;
							}
							ctx.putImageData(showCaseData, dummy_canvas.width/2 - width/2, dummy_canvas.height/2 - height/2);
							
							let imageRead=ctx.getImageData(0, 0, dummy_canvas.width, dummy_canvas.height);
							imageData=imageRead;
							filesToRead[index]=false;
						});
					}
				};
			})(file,i);

			let fileName = file.name;
			let fileExtension = fileName.split('.').pop();
			if(fileExtension=='ppm' || fileExtension=='js' || fileExtension=='json' || fileExtension=='obj') {
				reader.readAsBinaryString(file);
			} else if(fileExtension=='png') {
				reader.readAsArrayBuffer(file);
			}
			
		}
		drawScene();
	}
}

function drawScene() {
	if(doneLoading==false)
	{
		var isRemainingRead=false;
		for(let j=0; j<filesToRead.length; j++)
		{
			if(filesToRead[j]==true) {
				isRemainingRead = true;
			}
		}
		if(isRemainingRead==false) {
			currentScene=scene;
			currentScene.billboard.img=imageData;
			
			doneLoading=true;
		}
	} else if(doneLoading==true) {
		if(doneProgramming==false){
			programBillboard();
			makeBillboardBuffers();
			doneProgramming=true;
			
			// Support for Alpha
			gl.enable(gl.BLEND)
			gl.colorMask(true, true, true, true);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		} else {
			time += timeStep;
			renderingFcn();
		}
	}
	
	// Call drawScene again next frame with delay to give user chance of interacting GUI
	requestAnimationFrame(drawScene);
}

function renderingFcn(){
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	webglUtils.resizeCanvasToDisplaySize(gl.canvas);
	
	gl.clearColor(currentScene.camera.DefaultColor[0], currentScene.camera.DefaultColor[1], currentScene.camera.DefaultColor[2], 1.0);
	
	// Clear the canvas AND the depth buffer.
  	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	renderBillboard();
}

function renderBillboard(){
	gl.disable(gl.CULL_FACE);
	
	// Tell it to use our program (pair of shaders)
	gl.useProgram(billboardProgram.program);

	// Bind the positions
	gl.enableVertexAttribArray(billboardProgram.positionLocationAttrib);
	gl.bindBuffer(gl.ARRAY_BUFFER, currentScene.billboard.positionBuffer);
		
	var size = 3;          // 3 components per iteration
	var type = gl.FLOAT;   // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer(
		billboardProgram.positionLocationAttrib, size, type, normalize, stride, offset);
		
	// Bind the normals
	gl.enableVertexAttribArray(billboardProgram.normalLocationAttrib);
	gl.bindBuffer(gl.ARRAY_BUFFER, currentScene.billboard.normalBuffer);
		
	var size = 3;          // 3 components per iteration
	var type = gl.FLOAT;   // 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next normal
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer(
		billboardProgram.normalLocationAttrib, size, type, normalize, stride, offset);
		
	// Bind the texture
	gl.enableVertexAttribArray(billboardProgram.textureLocationAttrib);
	gl.bindBuffer(gl.ARRAY_BUFFER, currentScene.billboard.textureBuffer);
	
	var size = 2;          // 3 components per iteration
	var type = gl.FLOAT;   // 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next normal
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer(billboardProgram.textureLocationAttrib, size, type, normalize, stride, offset);

	// Compute the projection matrix and view matrix, and combine into the view/projection matrix
	var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	var projectionMatrix =
		m4.perspective(degToRad(currentScene.camera.fov), aspect, currentScene.camera.near, currentScene.camera.far);

	var cameraMatrix =
		m4.lookAt([currentScene.camera.position.x,currentScene.camera.position.y,currentScene.camera.position.z], [currentScene.camera.target.x,currentScene.camera.target.y,currentScene.camera.target.z], [currentScene.camera.up.x,currentScene.camera.up.y,currentScene.camera.up.z]);
	var viewMatrix = m4.inverse(cameraMatrix);
	var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

	// Set the viewProjectionMatrix.
	gl.uniformMatrix4fv(billboardProgram.worldViewProjectionUniformLocation, false, viewProjectionMatrix);
		
	// Tell the shader to use texture unit 0 for u_texture
	gl.uniform1i(billboardProgram.textureUniformLocation, 0);
	
	// Send the light direction to the uniform.
	gl.uniform3fv(billboardProgram.lightDirectionUniformLocation, new Float32Array([currentScene.light.locationPoint.x,currentScene.light.locationPoint.y,currentScene.light.locationPoint.z]));
	
	//TODO: You need to send "time" and "water height" to the shader program
	// You can either use the uniform location here or you can use your preprocessed uniform location in the program.
	gl.uniform1f(billboardProgram.heightUniformLocation, waterHeight);
	gl.uniform1f(billboardProgram.timeUniformLocation, time);
	gl.uniform1f(billboardProgram.lambdaUniformLocation, lambda);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}