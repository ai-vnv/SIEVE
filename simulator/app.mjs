import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Encounter,scenario,rng} from './core.mjs';
import {cinematicTraffic,wheelAngle,payloadFraction} from './traffic.mjs';
const $=id=>document.getElementById(id),query=new URLSearchParams(location.search);
if(query.has('paper'))document.body.classList.add('paper');
if(query.has('clean'))document.body.classList.add('clean');
for(const id of ['family','policy','layer','seed'])if(query.has(id))$(id).value=query.get(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#8faeb5');scene.fog=new THREE.Fog('#9caeab',650,1600);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;$('viewport').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,0.5,3500);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=25;controls.maxDistance=1100;
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.45;
scene.add(new THREE.HemisphereLight('#d8efff','#726348',1.8));
const sun=new THREE.DirectionalLight('#fff0d4',2.2);sun.position.set(-250,400,150);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-470,right:470,top:470,bottom:-470,near:1,far:1000});sun.shadow.normalBias=.15;sun.shadow.bias=-.0001;scene.add(sun);
const mat=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const earth=mat('#8c755d'),rock=mat('#716656'),road=mat('#ac9980'),yellow=mat('#f4b52e',.45,.25),steel=mat('#253331',.6,.5),rubber=mat('#202527'),glass=mat('#284957',.15,.7),white=mat('#d7ddd0'),orange=mat('#e98635');
function mesh(g,m,x=0,y=0,z=0,parent=scene){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(w,h,d,m,x,y,z,p=scene){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);}
function cyl(r1,r2,h,m,x,y,z,p=scene,n=16){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),m,x,y,z,p);}
const random=rng(2027);
function groundTexture(seed,roadSurface=false){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),r=rng(seed),im=ctx.createImageData(512,512);for(let i=0;i<512*512;i++){const v=150+r()*65;im.data[i*4]=v;im.data[i*4+1]=v;im.data[i*4+2]=v;im.data[i*4+3]=255;}ctx.putImageData(im,0,0);for(let i=0;i<1800;i++){ctx.fillStyle=`rgba(40,35,25,${r()*.18})`;ctx.beginPath();ctx.ellipse(r()*512,r()*512,.4+r()*2,.2+r(),r()*6,0,7);ctx.fill();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(18,18);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;}
const soilTexture=groundTexture(181);earth.map=soilTexture;rock.map=soilTexture;road.map=groundTexture(77,true);
earth.bumpMap=soilTexture;earth.bumpScale=.35;road.bumpMap=road.map;road.bumpScale=.12;rock.bumpMap=soilTexture;rock.bumpScale=.2;

// Terraces are closed strips with irregular rock faces and horizontal benches.
function terrainRing(inner,outer,yInner,yOuter,material,wobble=0){
 const pos=[],idx=[],colors=[],segments=220,col=new THREE.Color();
 for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;const w=1+.015*Math.sin(9*a)+.009*Math.cos(17*a);for(const [r,y]of[[inner,yInner],[outer,yOuter]]){pos.push(Math.cos(a)*r*w,y+Math.sin(a*31)*wobble,Math.sin(a)*r*w*.78);col.set(material.color).multiplyScalar(.88+random()*.24);colors.push(col.r,col.g,col.b);}}
 for(let i=0;i<segments;i++){let j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);const uv=[];for(let j=0;j<pos.length;j+=3)uv.push(pos[j]/110,pos[j+2]/110);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();const m=material.clone();m.vertexColors=true;m.side=THREE.DoubleSide;return mesh(g,m);
}
const floor=mesh(new THREE.CircleGeometry(1000,160),earth);floor.rotation.x=-Math.PI/2;floor.position.y=-.4;
for(let k=0;k<6;k++){const r=195+k*37;terrainRing(r,r+13,k*15,(k+1)*15,earth,0);terrainRing(r+13,r+37,(k+1)*15,(k+1)*15,earth,0);}
terrainRing(417,1100,90,90,earth,0);
// A measured centreline parameterized by arc length for truck placement.
const route=[],lengths=[0];let total=0;
for(let i=0;i<=1600;i++){const a=i/1600*Math.PI*2;const p=new THREE.Vector3(155*Math.cos(a),.22,112*Math.sin(a));route.push(p);if(i){total+=p.distanceTo(route[i-1]);lengths.push(total);}}
function routeAt(s,offset=0){s=((s%total)+total)%total;let lo=0,hi=1600;while(lo+1<hi){const mid=(lo+hi)>>1;if(lengths[mid]<s)lo=mid;else hi=mid;}const f=(s-lengths[lo])/(lengths[hi]-lengths[lo]);const p=route[lo].clone().lerp(route[hi],f),d=route[hi].clone().sub(route[lo]).normalize();p.add(new THREE.Vector3(-d.z,0,d.x).multiplyScalar(offset));return {p,d};}
// The evaluated lane has its own arc-length table; clearance and motion use lane metres.
const lanePoints=[],laneLengths=[0];let laneTotal=0;
for(let i=0;i<=1600;i++){const p=routeAt(i/1600*total,8).p;lanePoints.push(p);if(i){laneTotal+=p.distanceTo(lanePoints[i-1]);laneLengths.push(laneTotal);}}
function laneAt(s,offset=0){s=((s%laneTotal)+laneTotal)%laneTotal;let lo=0,hi=1600;while(lo+1<hi){const mid=(lo+hi)>>1;if(laneLengths[mid]<s)lo=mid;else hi=mid;}const f=(s-laneLengths[lo])/(laneLengths[hi]-laneLengths[lo]);const p=lanePoints[lo].clone().lerp(lanePoints[hi],f),d=lanePoints[hi].clone().sub(lanePoints[lo]).normalize();p.add(new THREE.Vector3(-d.z,0,d.x).multiplyScalar(offset));return {p,d};}
function strip(offset,width,material){const pos=[],idx=[];for(let i=0;i<=1600;i++){const {p,d}=routeAt(i/1600*total,offset),n=new THREE.Vector3(-d.z,0,d.x);for(const side of[-1,1]){let q=p.clone().addScaledVector(n,width/2*side);pos.push(q.x,q.y+(offset===0?.05:.10),q.z);}}for(let i=0;i<1600;i++){let j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);const uv=[];for(let i=0;i<=1600;i++){uv.push(i/1600*8,0,i/1600*8,1);}g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();const m=material.clone();m.side=THREE.DoubleSide;return mesh(g,m);}
strip(0,32,road);strip(8,1,mat('#94836d'));strip(-8,1,mat('#94836d'));
for(let s=0;s<total;s+=12){let {p,d}=routeAt(s);const line=box(.25,.035,4,white,p.x,.31,p.z);line.rotation.y=Math.atan2(d.x,d.z);}
// Continuous protective windrows, reflective bollards, and road-edge stones.
for(let side of[-1,1]){let points=[];for(let s=0;s<=total;s+=2)points.push(routeAt(s,side*19).p.add(new THREE.Vector3(0,.7,0)));const curve=new THREE.CatmullRomCurve3(points,true);mesh(new THREE.TubeGeometry(curve,420,1.15,5,true),earth);for(let s=0;s<total;s+=20){let {p}=routeAt(s,side*17);cyl(.15,.2,2.1,white,p.x,1.05,p.z);cyl(.17,.17,.42,orange,p.x,1.5,p.z);}}
// Switchback access road from floor to rim, shown as a graded ramp.
const rampPoints=[new THREE.Vector3(160,.1,35),new THREE.Vector3(198,12,75),new THREE.Vector3(250,30,100),new THREE.Vector3(265,47,25),new THREE.Vector3(320,68,-35),new THREE.Vector3(375,90,-65),new THREE.Vector3(470,90,-85)];
const rampCurve=new THREE.CatmullRomCurve3(rampPoints);const rp=[],ri=[];for(let i=0;i<=200;i++){const t=i/200,p=rampCurve.getPoint(t),d=rampCurve.getTangent(t),n=new THREE.Vector3(-d.z,0,d.x).normalize();for(let sign of[-1,1]){const q=p.clone().addScaledVector(n,sign*11);rp.push(q.x,q.y+.3,q.z);}}for(let i=0;i<200;i++){let j=i*2;ri.push(j,j+1,j+2,j+1,j+3,j+2);}const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));rg.setIndex(ri);rg.computeVertexNormals();const rm=road.clone();rm.side=THREE.DoubleSide;mesh(rg,rm);
// Stockpiles and loose rock: all geometry is generated from one fixed visual seed.
for(let i=0;i<550;i++){const a=random()*Math.PI*2,r=30+random()*550;let y=r<190?0:Math.min(90,Math.ceil((r-195)/37)*15);if(r<185||(r>195&&r<417&&(r-195)%37<15))continue;const o=mesh(new THREE.IcosahedronGeometry(1+random()*2.6,1),rock,Math.cos(a)*r,y,Math.sin(a)*r*.78);o.scale.set(1,.4+random()*.65,1);o.rotation.set(random(),random()*6,random());}
for(let i=0;i<5;i++){const o=mesh(new THREE.ConeGeometry(13+random()*12,12+random()*8,10),mat('#6e7267'),55+i*15,6,-27+i*9);o.scale.z=.75;}
// Crusher, conveyor, site workshop and floodlighting.
box(20,8,16,steel,42,4,20);box(22,1,18,yellow,42,8.5,20);box(9,5,10,earth,44,11,20);
// Ground-level receiving pocket connects the tipping bay to the crusher.
box(10,.2,10,rubber,25,.4,20);box(10,1.2,.5,steel,25,.9,14.8);box(10,1.2,.5,steel,25,.9,25.2);box(.5,1.2,10,steel,30,.9,20);
box(54,.12,18,road,-54,.06,-28);box(45,.12,17,road,7,.06,20);
for(let i=0;i<6;i++){box(.5,17,.5,steel,16+i*9,8,45);box(9,.6,5,steel,20+i*9,16,45);box(9,.15,3,mat('#3c4140'),20+i*9,16.4,45);}
for(let i=0;i<3;i++){box(17,6,10,white,445+i*23,93,-110);box(18,.5,11,steel,445+i*23,96,-110);box(4,3,.2,glass,445+i*23,93,-104.8);}
for(const [x,z]of[[0,60],[95,45],[-90,30]]){cyl(.25,.4,24,steel,x,12,z);box(6,.4,.7,steel,x,24,z);for(let j=-1;j<=1;j++)box(1.2,.8,.5,white,x+j*2,23.8,z);}
// Excavator with tracks, articulated boom and bucket.
const excavator=new THREE.Group();scene.add(excavator);excavator.position.set(80,0,-28);excavator.rotation.y=-.5;
box(9,2,1.8,rubber,0,1,3.4,excavator);box(9,2,1.8,rubber,0,1,-3.4,excavator);box(7,2,7,yellow,0,3,0,excavator);box(3,3,3,glass,-1,5,2,excavator);
function beam(a,b,w,m,p){const d=b.clone().sub(a),o=box(w,d.length(),w,m,...a.clone().add(b).multiplyScalar(.5).toArray(),p);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
beam(new THREE.Vector3(1,4,0),new THREE.Vector3(8,12,0),1.5,yellow,excavator);beam(new THREE.Vector3(8,12,0),new THREE.Vector3(14,8,0),1.2,yellow,excavator);box(4,2,4,steel,14,7.5,0,excavator);
function label(text,color='#dfedcd',scale=1){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='rgba(18,40,40,.88)';ctx.beginPath();ctx.roundRect(8,15,496,96,12);ctx.fill();ctx.fillStyle=color;ctx.font='38px "Times New Roman"' ;ctx.textAlign='center';ctx.fillText(text,256,77);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));sp.scale.set(13*scale,3.25*scale,1);sp.userData.textLabel=true;return sp;}
function truck(name,color=yellow){const g=new THREE.Group();scene.add(g);box(10,1.1,5.2,steel,0,2.4,0,g);box(6.4,1.4,5.8,color,-1.2,3.4,0,g);box(7.2,.5,6.1,color,-1.2,4.4,0,g);for(let side of[-1,1]){const wall=box(7.2,2.3,.32,color,-1.2,5.4,side*3,g);wall.rotation.x=side*.15;}box(.4,2.2,6,color,-4.8,5.4,0,g);box(.5,2.5,6,color,2.5,5.5,0,g);box(3.4,1,6.8,color,3.7,3.9,0,g);box(2.5,2.3,2.6,color,3.8,5.3,-1.5,g);box(.08,1.2,2.2,glass,5.08,5.6,-1.5,g);box(1.8,1.2,.08,glass,3.8,5.6,-2.85,g);box(3.1,.25,3.2,color,3.8,6.55,-1.5,g);box(.8,2.3,1.2,steel,3.2,5.4,1.7,g);cyl(.14,.14,2.3,steel,2.6,7,1.3,g);cyl(.3,.3,.35,glass,4,6.85,-1.5,g);
 g.userData.wheels=[];
 for(const x of[-3.1,-.9,3.8])for(const z of[-3,3]){
 const wheel=new THREE.Group();wheel.position.set(x,1.65,z);g.add(wheel);g.userData.wheels.push(wheel);
 let tire=cyl(1.65,1.65,1.1,rubber,0,0,0,wheel,24);tire.rotation.x=Math.PI/2;
 let hub=cyl(.8,.8,1.13,steel,0,0,0,wheel);hub.rotation.x=Math.PI/2;
 let cap=cyl(.35,.35,1.16,color,0,0,0,wheel);cap.rotation.x=Math.PI/2;
 for(let j=0;j<12;j++){let a=j*Math.PI/6;const tread=box(.25,.25,1.15,steel,1.61*Math.cos(a),1.61*Math.sin(a),0,wheel);tread.rotation.z=a;}
 // Asymmetric hub spokes make physical rotation visible without painted text.
 for(let j=0;j<3;j++){const a=j*Math.PI*2/3;const spoke=box(.5,.14,1.18,color,.5*Math.cos(a),.5*Math.sin(a),0,wheel);spoke.rotation.z=a;}
 }

 for(let z of[-2.8,2.8]){box(.18,.5,.6,white,5.45,3.3,z,g);box(.12,.35,.5,orange,-5.05,2.5,z,g);}for(let i=0;i<5;i++)box(.6,.15,1,steel,5.5,1+i*.55,-1.5,g);
 for(let x of[2.5,5.2])for(let z of[-3.2,3.2])cyl(.055,.055,1.4,white,x,4.7,z,g,6);beam(new THREE.Vector3(2.5,5.4,3.2),new THREE.Vector3(5.2,5.4,3.2),.08,white,g);
 // A continuous ore volume and rough top fill the bed; height is a state variable.
 const load=new THREE.Group();load.position.y=4.65;g.add(load);g.userData.load=load;g.userData.payloadFraction=1;
 box(6.4,1.15,5.2,rock,-1.15,.575,0,load);
 const heap=mesh(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),rock,-1.15,1.12,0,load);heap.scale.set(3.2,.8,2.6);
 for(let i=0;i<28;i++){const o=mesh(new THREE.DodecahedronGeometry(.35+random()*.25,0),rock,-4+random()*5.8,1.25+random()*.3,-2.2+random()*4.4,load);o.scale.y=.65;}
 const tag=label(name);tag.position.set(0,10,0);g.add(tag);return g;}
const ego=truck('A-01'),obstacle=truck('A-02 · STOP',orange),hauler=truck('A-03');
function rollTruck(g,distance){g.userData.rollMetres=distance;for(const wheel of g.userData.wheels)wheel.rotation.z=wheelAngle(distance);}
function setPayload(g,fraction){const f=Math.min(1,Math.max(0,fraction));g.userData.payloadFraction=f;g.userData.load.visible=f>.001;g.userData.load.scale.y=Math.max(.001,f);}
function place(g,s){const{p,d}=laneAt(s);g.position.copy(p);g.rotation.y=-Math.atan2(d.z,d.x);rollTruck(g,s);}
const safeGroup=new THREE.Group();scene.add(safeGroup);
const halo=mesh(new THREE.RingGeometry(9,9.25,72),new THREE.MeshBasicMaterial({color:'#d9f298',side:THREE.DoubleSide,transparent:true,opacity:.8}),0,.5,0,safeGroup);halo.rotation.x=-Math.PI/2;
const obstacleZone=mesh(new THREE.RingGeometry(11,11.5,72),new THREE.MeshBasicMaterial({color:'#ff996f',side:THREE.DoubleSide,transparent:true,opacity:.9}),0,.5,0,safeGroup);obstacleZone.rotation.x=-Math.PI/2;
const arcG=new THREE.BufferGeometry(),arc=new THREE.Line(arcG,new THREE.LineBasicMaterial({color:'#dcf4a1',transparent:true,opacity:.85}));safeGroup.add(arc);
const dustGroup=new THREE.Group();scene.add(dustGroup);const dc=document.createElement('canvas');dc.width=128;dc.height=128;const dctx=dc.getContext('2d'),grad=dctx.createRadialGradient(64,64,1,64,64,64);grad.addColorStop(0,'rgba(197,169,128,.3)');grad.addColorStop(.45,'rgba(193,168,133,.14)');grad.addColorStop(1,'rgba(186,169,142,0)');dctx.fillStyle=grad;dctx.fillRect(0,0,128,128);const dustTex=new THREE.CanvasTexture(dc);
for(let i=0;i<42;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:dustTex,transparent:true,depthWrite:false,opacity:.28}));sp.userData={phase:random(),side:(random()-.5)*16,height:1+random()*7};sp.scale.setScalar(13+random()*18);dustGroup.add(sp);}
const siteLabel=label('North bench','#e7e4cf',2);siteLabel.position.set(10,6,-105);scene.add(siteLabel);if(query.has('paper')){siteLabel.visible=false;for(const g of [ego,obstacle,hauler])g.children.filter(c=>c.isSprite).forEach(c=>c.visible=false);}
// Operational stress scenes: visible obstructions and segregated field personnel.
const slide=new THREE.Group();scene.add(slide);const hazardPoint=laneAt(400).p;
for(let i=0;i<48;i++){const r=1+random()*3.2,o=mesh(new THREE.IcosahedronGeometry(r,1),rock,(random()-.5)*24,r*.55,(random()-.5)*18,slide);o.scale.set(1,.6+random()*.7,1);o.rotation.set(random()*2,random()*6,random());}
slide.position.copy(hazardPoint);slide.visible=false;
function worker(pose='signal'){const g=new THREE.Group();const vest=mat('#ed9223',.65),pants=mat('#29464c'),skin=mat('#b78865'),stripe=mat('#e8eccf');
box(.54,.63,.3,vest,0,1.13,0,g);box(.57,.075,.32,stripe,0,1.06,0,g);box(.08,.6,.32,stripe,-.16,1.14,0,g);box(.08,.6,.32,stripe,.16,1.14,0,g);
for(let k of[-1,1]){box(.18,.7,.22,pants,k*.15,.54,0,g);box(.22,.13,.38,rubber,k*.15,.13,.06,g);}
mesh(new THREE.SphereGeometry(.18,16,12),skin,0,1.65,0,g);cyl(.23,.23,.07,yellow,0,1.82,0,g);mesh(new THREE.SphereGeometry(.22,16,10,0,Math.PI*2,0,Math.PI/2),yellow,0,1.82,0,g);
beam(new THREE.Vector3(-.27,1.4,0),new THREE.Vector3(-.43,.9,.08),.15,vest,g);beam(new THREE.Vector3(.27,1.4,0),new THREE.Vector3(.56,pose==='signal'?1.78:1.1,.13),.15,vest,g);mesh(new THREE.SphereGeometry(.10,10,8),skin,.56,pose==='signal'?1.78:1.1,.13,g);
if(pose==='signal'){const sign=label('STOP','#ffe4b1',.18);sign.position.set(.75,2.05,.13);g.add(sign);}return g;}
const crew=new THREE.Group();scene.add(crew);const crewLocation=laneAt(430,-25);crew.position.copy(crewLocation.p);crew.rotation.y=-Math.atan2(crewLocation.d.z,crewLocation.d.x);
for(let i=0;i<3;i++){const w=worker(i===0?'signal':'observe');w.position.set(i*2.0,0,i%2*1.2);crew.add(w);}
// Physical separation around the crew muster point.
for(let i=0;i<5;i++){const barrier=box(2.4,.9,.65,white,i*2.5-2,.45,3,crew);box(1.2,.22,.68,orange,i*2.5-2,.63,3,crew);}
for(let i=0;i<5;i++)cyl(.08,.34,.9,orange,i*2-2,.45,1.8,crew,16);
const crossingWorker=worker();scene.add(crossingWorker);crossingWorker.visible=false;
const closureSign=label('ROAD CLOSED','#f7d1a7',.75);closureSign.position.copy(hazardPoint).add(new THREE.Vector3(0,8,0));scene.add(closureSign);closureSign.visible=false;
// Loading and discharge scenes are illustrative workflow animations; numerical
// fleet evidence remains in the independently seeded shift scheduler.
const workflowTrucks=[truck('L-01'),truck('L-02'),truck('D-01'),truck('D-02')];
const [loaderTruck,loaderQueue,dumpTruck,dumpQueue]=workflowTrucks;
loaderTruck.position.set(-51,.25,-28);loaderQueue.position.set(-77,.25,-28);
dumpTruck.position.set(16,.25,20);dumpTruck.rotation.y=Math.PI;
dumpQueue.position.set(-12,.25,20);dumpQueue.rotation.y=Math.PI;
excavator.position.set(-51,0,-42);excavator.rotation.y=-Math.PI/2;
// Raise the rear-hinged body, keeping chassis, cab, wheels, and personnel fixed.
const dumpBed=new THREE.Group();dumpBed.position.set(-4.8,4.4,0);dumpTruck.add(dumpBed);
for(const part of [...dumpTruck.children].filter((o,i)=>(i>=2&&i<=6)||o===dumpTruck.userData.load)){part.position.sub(dumpBed.position);dumpBed.add(part);}
const oreStream=new THREE.Group();scene.add(oreStream);
for(let i=0;i<22;i++)mesh(new THREE.IcosahedronGeometry(.35+random()*.45,0),rock,20+random()*3,1+random()*5,18+random()*4,oreStream);
const bucketOre=new THREE.Group();scene.add(bucketOre);
for(let i=0;i<18;i++)mesh(new THREE.IcosahedronGeometry(.25+random()*.35,0),rock,-52+random()*3,5+random()*6,-30+random()*3,bucketOre);
const stationWorkers=[];
for(const [x,z]of[[-52,-17],[9,34]]){for(let i=0;i<3;i++){const w=worker('observe');w.position.set(x+i*2,0,z);scene.add(w);stationWorkers.push(w);}for(let i=0;i<5;i++){box(2.3,.9,.65,white,x-2+i*2.5,.45,z-3);box(1.2,.22,.68,orange,x-2+i*2.5,.65,z-3);}}
const passingTrucks=[truck('H-04'),truck('H-05'),truck('H-06'),truck('H-07')];
const shovelSwing=excavator.rotation.y;
function updateWorkflow(t){
 const cycle=t%16;dumpBed.rotation.z=.9*Math.min(1,cycle/3)*Math.min(1,(16-cycle)/3);
 setPayload(loaderTruck,Math.min(1,cycle/7));setPayload(loaderQueue,0);setPayload(dumpTruck,Math.max(0,1-(cycle-3)/8));setPayload(dumpQueue,1);
 bucketOre.visible=cycle<7;oreStream.visible=cycle>3&&cycle<11;
 excavator.rotation.y=shovelSwing+.13*Math.sin(t*.45);
 bucketOre.children.forEach((o,i)=>o.position.y=5+((i*.39-t*2)%3+3)%3);
 oreStream.children.forEach((o,i)=>o.position.y=.7+((i*.27-t*2.5)%4.8+4.8)%4.8);
 passingTrucks.forEach((g,i)=>{const opposite=i%2===0,{p,d}=routeAt((opposite?-1:1)*t*7+[350,200,650,540][i],opposite?-8:8);g.position.copy(p);g.rotation.y=-Math.atan2(d.z,d.x)+(opposite?Math.PI:0);rollTruck(g,t*7);setPayload(g,opposite?0:1);});
}
if(query.has('paper'))for(const g of [...workflowTrucks,...passingTrucks])g.children.filter(o=>o.isSprite).forEach(o=>o.visible=false);
// Batch rigid parts by material. This keeps the detailed scene below a few hundred
// draw calls and avoids allocating thousands of per-object shadow draws per frame.
function batchRigid(parent){const buckets=new Map();for(const o of [...parent.children]){if(!o.isMesh||Array.isArray(o.material))continue;o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{material:o.material,geometries:[],objects:[]});const b=buckets.get(key);b.geometries.push(g);b.objects.push(o);}for(const b of buckets.values()){if(b.objects.length<2){b.geometries.forEach(g=>g.dispose());continue;}const merged=mergeGeometries(b.geometries);if(!merged){b.geometries.forEach(g=>g.dispose());continue;}const o=new THREE.Mesh(merged,b.material);o.castShadow=true;o.receiveShadow=true;for(const old of b.objects){parent.remove(old);old.geometry.dispose();}b.geometries.forEach(g=>g.dispose());parent.add(o);}}
for(const g of [ego,obstacle,hauler,...workflowTrucks,...passingTrucks]){batchRigid(g.userData.load);for(const wheel of g.userData.wheels)batchRigid(wheel);}
for(const parent of [scene,excavator,ego,obstacle,hauler,slide,dumpBed,...workflowTrucks,...passingTrucks,...stationWorkers,...crew.children.filter(x=>x.isGroup)])batchRigid(parent);
let needsRender=true;controls.addEventListener('change',()=>{needsRender=true;});let lastFrame=-1;let run,frames,elapsed=0,playing=!query.has('paused'),view=query.get('view')||'overview',last=performance.now();
function deploy(){const seed=Number($('seed').value);if(!Number.isInteger(seed)||seed<0||seed>4294967295){$('seed').value=27000;}
 lastFrame=-1;run=new Encounter(scenario(Number($('seed').value),$('family').value),$('policy').value,$('layer').value);run.run();frames=run.trace;elapsed=0;$('timeline').max=run.t;playing=!query.has('paused');
 $('sceneTitle').textContent={nominal:'Clear road',dust:'Dust',wet:'Wet road',combined:'Dust + wet road','extreme-dust':'Extreme dust','landslide':'Landslide / route closed','human-crossing':'Crew crossing / exclusion zone'}[run.spec.family];$('sceneSubtitle').textContent=`Seed ${run.spec.seed} · ${$('policy').selectedOptions[0].text} · ${run.layer==='nominal-model'?'Nominal model':'Extended model'}`;
 $('decel').textContent=run.decel.toFixed(2)+' m/s²';$('visibility').textContent=run.spec.visibility.toFixed(1)+' m';$('latency').textContent=run.spec.latency.toFixed(2)+' s';place(obstacle,run.spec.obstacleS);obstacleZone.position.copy(obstacle.position);obstacleZone.position.y=.4;setView(view);update();}
function setView(v){view=v;if(run&&!['loading','unloading','operations','passing'].includes(v))$('sceneTitle').textContent={nominal:'Clear road',dust:'Dust',wet:'Wet road',combined:'Dust + wet road','extreme-dust':'Extreme dust',landslide:'Landslide / route closed','human-crossing':'Crew crossing / exclusion zone'}[run.spec.family];document.body.classList.toggle('workflow',['loading','unloading','operations','passing'].includes(v));if(['loading','unloading','operations','passing'].includes(v)){$('sceneTitle').textContent={loading:'Loading',unloading:'Unloading',operations:'Mine operations',passing:'Two-way haul road'}[v];}if(v==='loading'){camera.position.set(-87,22,11);controls.target.set(-50,4,-29);}if(v==='unloading'){camera.position.set(-20,24,63);controls.target.set(19,5,23);}if(v==='operations'){camera.position.set(-175,155,180);controls.target.set(-5,0,-4);}if(v==='passing'){const p=routeAt(275).p;camera.position.copy(p).add(new THREE.Vector3(-38,35,60));controls.target.copy(p);} document.body.classList.toggle('cockpit',['driver','left','right'].includes(v));controls.enabled=!['driver','left','right'].includes(v);ego.visible=!['driver','left','right'].includes(v);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('chosen',b.dataset.view===v));if(v==='overview'){camera.position.set(-370,330,420);controls.target.set(-15,10,0);}if(v==='field'){const{p,d}=laneAt(430,-25);camera.position.copy(p).add(new THREE.Vector3(-10,4.5,13));controls.target.copy(p).add(new THREE.Vector3(3,1,0));}if(v==='top'){camera.position.set(0,700,5);controls.target.set(0,0,0);}if(v==='follow'){const f=frames[Math.min(frames.length-1,Math.round(elapsed/.05))],{p,d}=laneAt(f.s);camera.position.copy(p).addScaledVector(d,-35).add(new THREE.Vector3(25,18,15));controls.target.copy(p).addScaledVector(d,20);}controls.update();}
function update(){needsRender=true;const i=Math.min(frames.length-1,Math.max(0,Math.round(elapsed/.05))),f=frames[i];updateWorkflow(elapsed);place(ego,f.s);place(hauler,650+f.t*6);slide.visible=run.spec.roadClosed;closureSign.visible=run.spec.roadClosed;obstacle.visible=!run.spec.roadClosed&&!run.spec.crewPresent;crossingWorker.visible=run.spec.crewPresent;if(crossingWorker.visible){const {p}=laneAt(400,Math.sin(f.t*.15)*9);crossingWorker.position.copy(p);}halo.position.copy(ego.position);halo.position.y=.5;
 const points=[];for(let j=0;j<=50;j++)points.push(laneAt(f.s+j/50*Math.min(f.trigger,Math.max(0,f.gap))).p.add(new THREE.Vector3(0,.4,0)));arc.geometry.setFromPoints(points);
 dustGroup.visible=run.spec.dust&&run.layer==='extended-model';dustGroup.children.forEach(sp=>{const data=sp.userData,{p}=laneAt(run.spec.obstacleS-15-data.phase*65, data.side);sp.position.copy(p);sp.position.y=data.height+Math.sin(f.t*.5+data.phase*6);sp.material.opacity=run.spec.extremeDust?.95:.28;sp.scale.setScalar(run.spec.extremeDust?42:18+data.phase*16);if(run.spec.extremeDust){sp.position.copy(laneAt(f.s+10+data.phase*90,data.side*2).p);sp.position.y=data.height+3;}});
 if(['driver','left','right'].includes(view)){const {p,d}=laneAt(f.s+4),side=new THREE.Vector3(-d.z,0,d.x);camera.position.copy(p).add(new THREE.Vector3(0,6.3,0)).addScaledVector(side,-1.5);const look=view==='driver'?d:side.multiplyScalar(view==='left'?-1:1);controls.target.copy(camera.position).addScaledVector(look,65);controls.target.y-=2;camera.lookAt(controls.target);}
 if(view==='follow'){const {p,d}=laneAt(f.s);camera.position.copy(p).addScaledVector(d,-35).add(new THREE.Vector3(25,18,15));controls.target.copy(p).addScaledVector(d,20);}
 $('speed').textContent=(f.v*3.6).toFixed(1);$('gap').textContent=f.gap.toFixed(1)+' m';$('trigger').textContent=f.trigger.toFixed(1)+' m';$('clock').textContent=`00:${f.t.toFixed(2).padStart(5,'0')}`;$('timeline').value=f.t;
 const status=run.policy==='integrated'&&run.targetSpeed===0?(f.v===0?'HOLD':'SAFE STOP'):f.collision?'COLLISION':f.done?'STOPPED':f.braking?'BRAKING':f.detected?'OBSTACLE DETECTED':'EN ROUTE';$('status').textContent=status;const color=f.gap<5?'#f89878':'#deef9e';$('status').style.color=color;$('dashStatus').textContent=status;$('dashSpeed').textContent=(f.v*3.6).toFixed(0);$('dashGap').textContent=f.gap.toFixed(1)+' m clearance';$('dashBrake').textContent=f.braking?'ON':'OFF';
 $('verdict').textContent=run.policy==='integrated'&&run.targetSpeed===0?'Human clearance required':f.gap<5?'Clearance < 5 m':f.done?'Stopped safely':'Minimum: 5 m';$('verdict').style.color=color;$('play').textContent=playing?'Ⅱ':'▶';
 const c=$('chart'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);const yy=g=>h-8-Math.max(0,g)/run.spec.gap*(h-18);ctx.strokeStyle='#51625a';ctx.lineWidth=1;for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(0,10+k*55);ctx.lineTo(w,10+k*55);ctx.stroke();}ctx.strokeStyle='#d69783';ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(0,yy(5));ctx.lineTo(w,yy(5));ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#deef9e';ctx.lineWidth=3;ctx.beginPath();for(let k=0;k<=i;k++){const q=frames[k],x=q.t/run.t*w,y=yy(q.gap);k?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
$('restart').onclick=()=>{deploy();playing=true;};$('play').onclick=()=>{if(elapsed>=run.t)elapsed=0;playing=!playing;update();};$('timeline').oninput=()=>{playing=false;elapsed=Number($('timeline').value);update();};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('overlay').onclick=()=>{safeGroup.visible=!safeGroup.visible;$('overlay').setAttribute('aria-pressed',String(safeGroup.visible));};$('export').onclick=()=>{const evidence={modelVersion:'sieve-1.1.0',evidenceKind:'simulation',physicalValidation:false,requirement:'R-STOP-5',spec:run.spec,...run.result()};const url=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`sieve-${run.spec.seed}-${run.policy}.json`;a.click();URL.revokeObjectURL(url);};
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);needsRender=true;});
deploy();if(query.has('t'))elapsed=Math.min(run.t,Number(query.get('t')));update();$('loading').remove();
function cinematic(t){
 playing=false;controls.enabled=false;view='cinematic';document.body.classList.add('clean');
 scene.traverse(o=>{if(o.userData.textLabel)o.visible=false;});safeGroup.visible=false;dustGroup.visible=false;slide.visible=false;closureSign.visible=false;crossingWorker.visible=false;
 ego.visible=false;obstacle.visible=false;hauler.visible=false;
 updateWorkflow(t*2);const traffic=cinematicTraffic(t),phase=traffic.phase;
 const smooth=u=>u*u*(3-2*u);
 if(phase==='loading'){
   const u=t/6;camera.position.set(-91+u*7,22,14-u*4);controls.target.set(-51,4,-29);
   bucketOre.visible=t>1&&t<5.6;dumpBed.rotation.z=0;
 }else if(phase==='hauling'||phase==='return'){
   bucketOre.visible=false;const returning=phase==='return',u=returning?(t-20)/4:(t-6)/8;
   const {p,d}=routeAt(traffic.hero.s,traffic.hero.lane);
   setPayload(hauler,returning?0:1);rollTruck(hauler,traffic.hero.s*traffic.hero.direction);
   passingTrucks.forEach((g,i)=>{const a=traffic.background[i],{p:q,d:v}=routeAt(a.s,a.lane);g.position.copy(q);g.rotation.y=-Math.atan2(v.z,v.x)+(a.direction<0?Math.PI:0);setPayload(g,a.direction>0?1:0);rollTruck(g,a.s*a.direction);});
   hauler.visible=true;hauler.position.copy(p);hauler.rotation.y=-Math.atan2(d.z,d.x)+(returning?Math.PI:0);
   camera.position.copy(p).addScaledVector(d,returning?30:-30).add(new THREE.Vector3(-22,20,34));controls.target.copy(p).add(new THREE.Vector3(0,3,0));
 }else{
   const u=(t-14)/6;camera.position.set(-18+u*5,22,60-u*3);controls.target.set(19,4,21);
   dumpBed.rotation.z=.9*smooth(Math.min(1,u*2));bucketOre.visible=false;
 }
 setPayload(loaderTruck,payloadFraction('loading',Math.min(t,6)));setPayload(dumpTruck,t<14?1:payloadFraction('unloading',t));
 oreStream.visible=phase==='unloading'&&t>16&&t<19.5;
 controls.target.y=Math.max(2,controls.target.y);camera.lookAt(controls.target);renderer.render(scene,camera);needsRender=false;
 scene.updateMatrixWorld(true);
 const actors=[...workflowTrucks,...passingTrucks,...(hauler.visible?[hauler]:[])].map((g,i)=>({id:`truck-${i}`,kind:'truck',x:g.position.x,z:g.position.z,yaw:g.rotation.y,halfLength:6.2,halfWidth:3.8,payloadFraction:g.userData.payloadFraction,rollMetres:g.userData.rollMetres||0,wheelAngles:g.userData.wheels.map(w=>w.rotation.z)}));
 for(const [i,g]of [...stationWorkers,...crew.children.filter(x=>x.isGroup)].entries()){const p=g.getWorldPosition(new THREE.Vector3());actors.push({id:`worker-${i}`,kind:'worker',x:p.x,z:p.z,yaw:0,halfLength:.6,halfWidth:.6});}
 return {phase,illustrative:true,time:t,actors,heroPayload:phase==='loading'?loaderTruck.userData.payloadFraction:phase==='unloading'?dumpTruck.userData.payloadFraction:hauler.userData.payloadFraction};
}
window.sieve={cinematic,setTime(t){playing=false;elapsed=Math.min(run.t,Math.max(0,t));update();controls.update();renderer.render(scene,camera);},setView,get result(){return run.result();},get ready(){return true;},get stats(){return {calls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};},renderer};
let lastDraw=0;function animate(now){requestAnimationFrame(animate);if(now-lastDraw<33)return;lastDraw=now;const dt=Math.min(.1,(now-last)/1000);last=now;if(playing){if(['loading','unloading','operations','passing'].includes(view)){elapsed=(elapsed+dt*Number($('rate').value))%90;}else{elapsed=Math.min(run.t,elapsed+dt*Number($('rate').value));if(elapsed>=run.t)playing=false;}update();}const changed=controls.update();if(changed||needsRender){renderer.render(scene,camera);needsRender=false;}}requestAnimationFrame(animate);

renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;$('status').textContent='Restoring view…';});renderer.domElement.addEventListener('webglcontextrestored',()=>{$('status').textContent='View restored';update();});

$('shift').onclick=async()=>{const data=await fetch('../results/haulage-summary.json').then(r=>r.json());const names={fast:'Fast / blind',blanket:'Blanket restriction',context:'Context aware',coordinated:'Human coordinated'};$('shiftCards').innerHTML=data.summary.map(r=>`<article><h3>${names[r.policy]}</h3><strong>${r.throughputTph.mean.toFixed(0)} t/h</strong><span>Delivered throughput</span><strong>${r.meanCycleMin.mean.toFixed(1)} min</strong><span>Mean cycle</span><strong>${r.averageMovingKph.mean.toFixed(1)} km/h</strong><span>Mean moving speed</span><strong class="${r.collisions.mean?'risk':''}">${r.collisions.mean.toFixed(2)}</strong><span>Collisions per shift</span></article>`).join('');$('shiftPanel').hidden=false;};$('closeShift').onclick=()=>{$('shiftPanel').hidden=true;};
