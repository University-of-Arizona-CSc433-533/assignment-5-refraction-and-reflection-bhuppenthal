class Billboard{
	constructor(UpperLeft,LowerLeft,UpperRight,LowerRight,imgFile,img,ambient){
		this.UpperLeft=UpperLeft;
		this.LowerLeft=LowerLeft;
		this.UpperRight=UpperRight;
		this.LowerRight=LowerRight;
		this.imgFile=imgFile;
		this.img=img;
		this.ambient=ambient;
	}
	
	setBuffers(positionBuffer,textureBuffer,normalBuffer,billboardTextureBuffer){
		this.positionBuffer=positionBuffer;
		this.textureBuffer=textureBuffer;
		this.normalBuffer=normalBuffer;
		this.billboardTextureBuffer=billboardTextureBuffer;
	}
}

class SunLight{
	constructor(locationPoint){
		this.locationPoint=locationPoint;
	}
}

class Camera{
	constructor(position,target,up,fov,far,near,DefaultColor){
		this.position=position;
		this.target=target;
		this.up=up;
		this.fov=fov;//IMPORTANT: It is assumed that FOV is the angle between the center vector and edge of the frustum (half pyramid) but not the entire frustum (full pyramid).
		this.far=far;
		this.near=near;
		this.DefaultColor=DefaultColor;
	}
	setVectors(w,nw,u,v){
		this.w=w;
		this.nw=nw;
		this.u=u;
		this.v=v;
	}
}

class Scene{
	constructor(light,billboard,obj,mirror,camera){
		this.light=light;
		this.billboard=billboard;
		this.camera=camera;
		this.obj=obj;
		this.mirror=mirror;
	}
}



function parseScene(file_data){
	var sceneFile = JSON.parse(file_data);

	let pos=new Vector3(sceneFile.eye[0],sceneFile.eye[1],sceneFile.eye[2]);
	let lookat=new Vector3(sceneFile.lookat[0],sceneFile.lookat[1],sceneFile.lookat[2]);
	let up=new Vector3(sceneFile.up[0],sceneFile.up[1],sceneFile.up[2]);
	let fov=sceneFile.fov_angle;
	let near=sceneFile.near;
	let far=sceneFile.far;
	let DefaultColor=sceneFile.DefaultColor;
	var camera=new Camera(pos,lookat,up,fov,far,near,DefaultColor);

	let light=new SunLight(new Vector3(sceneFile.SunLocation[0],sceneFile.SunLocation[1],sceneFile.SunLocation[2]));

	var billboard;
	if ('billboard' in sceneFile) {
		let upperLeft=new Vector3(sceneFile.billboard.UpperLeft[0],sceneFile.billboard.UpperLeft[1],sceneFile.billboard.UpperLeft[2]);
		let lowerLeft=new Vector3(sceneFile.billboard.LowerLeft[0],sceneFile.billboard.LowerLeft[1],sceneFile.billboard.LowerLeft[2]);
		let upperRight=new Vector3(sceneFile.billboard.UpperRight[0],sceneFile.billboard.UpperRight[1],sceneFile.billboard.UpperRight[2]);
		let billboardHeight=upperLeft.y-lowerLeft.y;
		let lowerRight=new Vector3(upperRight.x,upperRight.y-billboardHeight,upperRight.z);
		
		billboard=new Billboard(upperLeft,
			lowerLeft,
			upperRight,
			lowerRight,
			sceneFile.billboard.filename,
			null,
			null);// comments claim that img assigned later.
	}

	var mirror=null;
	var obj=null;

	return new Scene(light,billboard,obj,mirror,camera);
}