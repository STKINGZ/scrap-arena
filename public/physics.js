(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArenaPhysics=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const STEP=1/30,ACCEL=1800,FRICTION=.85;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const CLASSES=Object.freeze({
  striker:{name:'Striker',gun:'Laser',speed:1.1,ammo:3,reload:1000,cooldown:180,bulletSpeed:640,damage:20,radius:4,life:1800,shots:1,turn:Infinity},
  heavy:{name:'Heavy',gun:'Flak Cannon',speed:.65,ammo:1,reload:1500,cooldown:300,bulletSpeed:360,damage:55,radius:14,life:1800,shots:1,turn:Infinity},
  scout:{name:'Scout',gun:'Rapid Blaster',speed:1.55,ammo:6,reload:500,cooldown:90,bulletSpeed:950,damage:9,radius:2,life:1200,shots:1,turn:Infinity},
  spread:{name:'Spread',gun:'Shotgun',speed:1.05,ammo:2,reload:1000,cooldown:280,bulletSpeed:600,damage:16,radius:4,life:500,shots:3,turn:Infinity},
  sniper:{name:'Sniper',gun:'Railgun',speed:.9,ammo:1,reload:2000,cooldown:300,bulletSpeed:1800,damage:45,radius:3,life:1600,shots:1,turn:1.1,piercing:true}
 });
 const shipClass=p=>CLASSES[p.classId]||CLASSES.striker;
 const shipRadius=p=>36*(1+(p.level||0)*.05);
 function aimAngle(current,target,maxStep){const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+clamp(delta,-maxStep,maxStep);}
 function rect(x,y,r,o){const dx=x-clamp(x,o.x,o.x+o.w),dy=y-clamp(y,o.y,o.y+o.h);return dx*dx+dy*dy<r*r;}
 const GRAVITY_RADIUS=400,GRAVITY_CAP=570;
 function gravity(e,holes,dt,strong=false){let ax=0,ay=0;const forceMultiplier=strong?3:1,rangeMultiplier=strong?1.5:1;for(const h of holes||[]){const dx=h.x-e.x,dy=h.y-e.y,d=Math.hypot(dx,dy),range=Math.min(GRAVITY_RADIUS,h.r)*rangeMultiplier;if(d>0&&d<range){const force=Math.max(0,h.pullStrength)*forceMultiplier*(1-d/range);ax+=dx/d*force;ay+=dy/d*force;}}const cap=GRAVITY_CAP*forceMultiplier,length=Math.hypot(ax,ay),scale=length>cap?cap/length:1;e.vx+=ax*scale*dt;e.vy+=ay*scale*dt;}
 function teleport(e,pairs,now,rad=4){if((e.wormholeUntil||0)>now)return false;for(const pair of pairs||[]){for(let i=0;i<2;i++){const a=pair[i],dx=e.x-a.x,dy=e.y-a.y;if(dx*dx+dy*dy<a.r*a.r){const b=a.nextId?(pairs.flat().find(h=>h.id===a.nextId)||pair[1-i]):pair[1-i],angle=Math.hypot(e.vx,e.vy)>.01?Math.atan2(e.vy,e.vx):0;const offset=b.r+rad+8;e.x=b.x+Math.cos(angle)*offset;e.y=b.y+Math.sin(angle)*offset;e.wormholeUntil=now+750;e.warp=(e.warp||0)+1;return true;}}}return false;}
 function moveShip(p,input,map,width,height,dt,now){const rad=shipRadius(p),spec=shipClass(p),omega=(p.omegaUntil||0)>now;const turn=omega?(Number.isFinite(spec.turn)?spec.turn:5)*.3:spec.turn;p.a=aimAngle(p.a||0,input.a??p.a??0,turn*dt);let ix=input.x,iy=input.y;if(omega){const cx=Math.cos(p.a),cy=Math.sin(p.a),forward=Math.max(0,ix*cx+iy*cy);ix-=forward*cx;iy-=forward*cy;}const len=Math.max(1,Math.hypot(input.x,input.y));let wallHit=false;p.vx=(p.vx||0)+ix/len*ACCEL*spec.speed*dt;p.vy=(p.vy||0)+iy/len*ACCEL*spec.speed*dt;gravity(p,map.blackHoles,dt,true);const friction=Math.pow(FRICTION,dt/STEP);p.vx*=friction;p.vy*=friction;const maxSpeed=340*spec.speed,speed=Math.hypot(p.vx,p.vy);if(speed>maxSpeed){p.vx*=maxSpeed/speed;p.vy*=maxSpeed/speed;}
 // Short axis-separated steps keep drift and gravity from tunneling through cover.
 const steps=Math.max(1,Math.ceil(Math.hypot(p.vx,p.vy)*dt/10));for(let i=0;i<steps;i++){const rawX=p.x+p.vx*dt/steps,x=clamp(rawX,rad,width-rad);if(!map.obstacles.some(o=>rect(x,p.y,rad,o)))p.x=x;else{p.vx=-Math.sign(p.vx||1)*Math.max(60,Math.abs(p.vx)*.35);wallHit=true;}if(x!==rawX){p.vx=-Math.sign(rawX-x)*Math.max(60,Math.abs(p.vx)*.35);wallHit=true;}const rawY=p.y+p.vy*dt/steps,y=clamp(rawY,rad,height-rad);if(!map.obstacles.some(o=>rect(p.x,y,rad,o)))p.y=y;else{p.vy=-Math.sign(p.vy||1)*Math.max(60,Math.abs(p.vy)*.35);wallHit=true;}if(y!==rawY){p.vy=-Math.sign(rawY-y)*Math.max(60,Math.abs(p.vy)*.35);wallHit=true;}teleport(p,map.wormholes,now,rad);}return {wallHit};}
 // Meteors share ship friction, gravity and portal math, but reflect at walls.
 function moveAsteroid(a,map,width,height,dt,now){
  gravity(a,map.blackHoles,dt,true);const friction=Math.pow(FRICTION,dt/STEP);a.vx*=friction;a.vy*=friction;
  const r=a.radius,steps=Math.max(1,Math.ceil(Math.hypot(a.vx,a.vy)*dt/10));
  for(let i=0;i<steps;i++){
   const nx=a.x+a.vx*dt/steps;if(nx<r||nx>width-r||map.obstacles.some(o=>rect(nx,a.y,r,o)))a.vx=-a.vx;else a.x=nx;
   const ny=a.y+a.vy*dt/steps;if(ny<r||ny>height-r||map.obstacles.some(o=>rect(a.x,ny,r,o)))a.vy=-a.vy;else a.y=ny;
   const x=a.x,y=a.y,warp=a.warp,until=a.wormholeUntil;
   if(teleport(a,map.wormholes,now,r)&&(a.x<r||a.x>width-r||a.y<r||a.y>height-r||map.obstacles.some(o=>rect(a.x,a.y,r,o)))){a.x=x;a.y=y;a.warp=warp;a.wormholeUntil=until;}
  }
  a.rotation=(a.rotation||0)+a.rotationSpeed*dt;
 }
 return {STEP,ACCEL,FRICTION,CLASSES,shipClass,shipRadius,aimAngle,GRAVITY_CAP,GRAVITY_RADIUS,rect,gravity,teleport,moveShip,moveAsteroid};
});
