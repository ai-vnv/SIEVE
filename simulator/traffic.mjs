/** Presentation-only traffic and conservative planar footprint checks.
 * Separate from the longitudinal encounter benchmark and finite-shift model.
 */
export function cinematicTraffic(t){
 const phase=t<6?'loading':t<14?'hauling':t<20?'unloading':'return';
 if(phase!=='hauling'&&phase!=='return')return {phase,hero:null,background:Array.from({length:4},(_,i)=>({id:`H-${i}`,s:(i%2===0?-1:1)*t*14+[350,200,650,540][i],lane:i%2===0?-8:8,direction:i%2===0?-1:1}))};
 const returning=phase==='return',dt=t-(returning?20:6),progress=returning?410-dt*165/4:210+dt*175/8;
 const hero={id:'hero',s:progress,lane:returning?-8:8,direction:returning?-1:1,loaded:!returning};
 const background=Array.from({length:4},(_,i)=>{const opposite=i%2===0,ownLane=opposite===returning;
  return {id:`H-${i}`,s:ownLane?progress+80-Math.floor(i/2)*180:(returning?270+dt*20:350-dt*20)-Math.floor(i/2)*180,lane:opposite?-8:8,direction:opposite?-1:1};});
 return {phase,hero,background};
}
function axes(p){return [[Math.cos(p.yaw),-Math.sin(p.yaw)],[Math.sin(p.yaw),Math.cos(p.yaw)]];}
export function intersect(a,b,margin=0){
 const A=axes(a),B=axes(b),d=[b.x-a.x,b.z-a.z];
 for(const axis of [...A,...B]){
  const dot=v=>Math.abs(v[0]*axis[0]+v[1]*axis[1]);
  const ra=(a.halfLength+margin)*dot(A[0])+(a.halfWidth+margin)*dot(A[1]);
  const rb=(b.halfLength+margin)*dot(B[0])+(b.halfWidth+margin)*dot(B[1]);
  if(dot(d)>ra+rb)return false;
 }
 return true;
}
export function overlapPairs(actors,margin=.5){const pairs=[];for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){if(actors[i].kind==='worker'&&actors[j].kind==='worker')continue;if(intersect(actors[i],actors[j],margin))pairs.push([actors[i].id,actors[j].id]);}return pairs;}

export const wheelAngle=(distance,radius=1.65)=>-distance/radius;
export function payloadFraction(phase,t){
 if(phase==='loading')return Math.max(0,Math.min(1,(t-.5)/4.7));
 if(phase==='hauling')return 1;
 if(phase==='unloading')return Math.max(0,Math.min(1,1-(t-16)/3.2));
 return 0;
}
