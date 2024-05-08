class BillboardProgram{
	constructor(
		program,
		positionLocationAttrib,
		normalLocationAttrib,
		textureLocationAttrib,
		textureUniformLocation,
		worldViewProjectionUniformLocation,
		lightDirectionUniformLocation,
		heightUniformLocation,
		timeUniformLocation,
		lambdaUniformLocation){
		this.program=program;
		this.positionLocationAttrib=positionLocationAttrib;
		this.normalLocationAttrib=normalLocationAttrib;
		this.textureLocationAttrib=textureLocationAttrib;
		this.textureUniformLocation=textureUniformLocation;
		this.worldViewProjectionUniformLocation=worldViewProjectionUniformLocation;
		this.lightDirectionUniformLocation=lightDirectionUniformLocation;
		this.heightUniformLocation=heightUniformLocation;
		this.timeUniformLocation=timeUniformLocation;
		this.lambdaUniformLocation=lambdaUniformLocation;
	}
}

function programBillboard(){
	// Creates the vector and fragment shaders.
	// Stores the location of all attributes and uniforms in a BillboardProgram.

	//TODO: Change the shader program to calculate Snell's law. This is the major part of this homework.
	// You need to implement circle logic, calculate the angles, calculate displacement and change the texture coordinate accordingly.
	// Additionally you need to implement light intensity logic which follows the Snell's law.
	// You can check if the displaced texture coordinate is outside [0,1] and make the fragments invisible (shows background)
	// The waves should follow sin and cos functions in x and z directions. The frequency depends on the time scale passes to the shader program.
	var vShaderObj = `
		attribute vec4 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_texcoord;

        varying vec3 v_normal;
        varying vec2 v_texcoord;

        uniform mat4 u_worldViewProjection;

        void main() {
            // Sending the interpolated normal and texcoord to the fragment shader.
            v_normal = a_normal;
            v_texcoord = a_texcoord;

            // Calculate clip scace coordinate: multiply the position by the matrix.
            gl_Position = u_worldViewProjection * a_position;
		}`;
			
	var fShaderObj = `
		precision mediump float;

        varying vec3 v_normal;
        varying vec2 v_texcoord;

        uniform vec3 u_lightDirection;
        uniform sampler2D u_texture;
		uniform float u_height;
		uniform float u_time;
		uniform float u_lambda;

        void main() {
			float x = v_texcoord[0]-0.5;
			float y = v_texcoord[1]-0.5;
			float rho = sqrt(x*x + y*y);
			float theta = atan(y,x);

			// normal
			float h_prime = u_height * sin((rho + u_time)/u_lambda);
			vec3 n = vec3(1.0, 0.0, -1.0/h_prime);
			mat3 R = mat3(cos(theta), sin(theta), 0.0,
						  -sin(theta), cos(theta), 0.0,
						  0.0, 0.0, 1.0);
			n = R * n;
			n = normalize(n);

			// light direction
			vec3 d = vec3(0.0, 0.0, -1.0);

			// update texcoord location.
			vec3 term1 = (d - n * dot(d, n))/1.3;
			vec3 term2 = n * sqrt(1.0 - (1.0 - pow(dot(d, n), 2.0))/pow(1.3, 2.0));
			vec3 t = term1 + term2;

			vec2 tc = vec2(v_texcoord[0] + t[0], v_texcoord[1] + t[1]);

			if (tc[0] < 0.0 || tc[0] > 1.0 || tc[1] < 0.0 || tc[1] > 1.0) {
				gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
			} else {
				gl_FragColor = texture2D(u_texture, tc);
			}
        }`;

	program = webglUtils.createProgramFromSources(gl, [vShaderObj,fShaderObj])
	
	// look up where the vertex data needs to go.
    positionLocationAttrib = gl.getAttribLocation(program, "a_position");
	normalLocationAttrib = gl.getAttribLocation(program, "a_normal");
	textureLocationAttrib = gl.getAttribLocation(program, "a_texcoord");
	
	//Optional TODO: You can preprocess required Uniforms to avoid searching for uniforms when rendering.
	// lookup uniforms
    textureUniformLocation = gl.getUniformLocation(program, "u_texture");
	worldViewProjectionUniformLocation = gl.getUniformLocation(program, "u_worldViewProjection");
	lightDirectionUniformLocation = gl.getUniformLocation(program, "u_lightDirection");
	heightUniformLocation = gl.getUniformLocation(program, "u_height");
	timeUniformLocation = gl.getUniformLocation(program, "u_time");
	lambdaUniformLocation = gl.getUniformLocation(program, "u_lambda");
	
	//Optional TODO: You can preprocess required Uniforms to avoid searching for uniforms when rendering.
	billboardProgram=new BillboardProgram(program,
		positionLocationAttrib,
		normalLocationAttrib,
		textureLocationAttrib,
		textureUniformLocation,
		worldViewProjectionUniformLocation,
		lightDirectionUniformLocation,
		heightUniformLocation,
		timeUniformLocation,
		lambdaUniformLocation);
}

function makeBillboardBuffers(){
	// Load all buffers with data from the scene.
	let billboard = currentScene.billboard;
	
	// Position buffer
    let billboardPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, billboardPositionBuffer);
    setBillboardGeometry(gl, billboard);
	
    // Texture buffer
    let billboardTextcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, billboardTextcoordBuffer);
    setBillboardTexcoords(gl, billboard);
  
    // Normal buffer
    let billboardNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, billboardNormalBuffer);
    setBillboardNormals(gl, billboard);
	
	// Create a texture. Uses global imageData.
	var billboardTextureBuffer = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, billboardTextureBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, imageData);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.generateMipmap(gl.TEXTURE_2D);
  
    billboard.setBuffers(
		billboardPositionBuffer,
		billboardTextcoordBuffer,
		billboardNormalBuffer,
		billboardTextureBuffer);
}

// A utility function to convert a javascript Float32Array to a buffer.
// This function must be called after the buffer is bound.
function setGeometryPositionBuffer(gl,obj) {
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.geometries[0].data.position), gl.STATIC_DRAW);
}

// A utility function to convert a javascript Float32Array to a buffer.
// This function must be called after the buffer is bound.
function setTextureCoordBuffer(gl,obj) {
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.geometries[0].data.texcoord), gl.STATIC_DRAW);
}

// A utility function to convert a javascript Float32Array to a buffer.
// This function must be called after the buffer is bound.
function setNormalBuffer(gl,obj) {
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.geometries[0].data.normal), gl.STATIC_DRAW);
}

//This is a utility function to set vertex colors by random numbers.
function setColorBuffer(gl,obj) {
	var numVertices=obj.geometries[0].data.position.length;
	var colors = new Float32Array(numVertices*3);
	var myrng = new Math.seedrandom('123');
	for(let i=0;i<numVertices*3;i++){
		colors[i]=0.4+myrng()/2;
	}
	gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
}

function setBillboardGeometry(gl, billboard) {
	// Create two triangles which represent the entire billboard.
	var positions = new Float32Array([
		billboard.UpperLeft.x, billboard.UpperLeft.y, billboard.UpperLeft.z,  // first triangle
		billboard.LowerLeft.x, billboard.LowerLeft.y, billboard.UpperRight.z,
		billboard.UpperRight.x, billboard.UpperRight.y, billboard.LowerLeft.z,
		billboard.UpperRight.x,  billboard.UpperRight.y, billboard.LowerLeft.z,  // second triangle
		billboard.LowerLeft.x,  billboard.LowerLeft.y, billboard.LowerRight.z,
		billboard.LowerRight.x,  billboard.LowerRight.y, billboard.LowerRight.z
	]);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

function setBillboardTexcoords(gl, billboard) {
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([	  
			0,0,
			0,1,
			1,0,
			1,0,
			0,1,
			1,1]),
		gl.STATIC_DRAW);
}

function setBillboardNormals(gl, billboard) {
	// Set the billboard normals, which are the same for all vertices.

	let vec1=Vector3.minusTwoVectors(billboard.UpperLeft,billboard.LowerLeft);
	let vec2=Vector3.minusTwoVectors(billboard.LowerRight,billboard.LowerLeft);
	var normalVector=Vector3.crossProduct(vec2,vec1);

	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([	  
			normalVector.x,normalVector.y,normalVector.z,
			normalVector.x,normalVector.y,normalVector.z,
			normalVector.x,normalVector.y,normalVector.z,
			normalVector.x,normalVector.y,normalVector.z,
			normalVector.x,normalVector.y,normalVector.z,
			normalVector.x,normalVector.y,normalVector.z
		]),
		gl.STATIC_DRAW);
}