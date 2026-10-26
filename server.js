const express=require('express'),http=require('http'),{Server}=require('socket.io'),crypto=require('crypto');
const app=express(),server=http.createServer(app),io=new Server(server);app.use(express.static(__dirname+'/public'));
const Physics=require('./public/physics');
const W=3000,H=3000,colors=['#44edff','#ff4fc8','#a6ff49','#ffb732','#bc7bff','#ff5269','#56ffcb','#528cff','#fff34f','#ff824f','#d1a6ff','#7aff76','#ffa9dd','#a8dfff','#f5e5b8'];
// Layout data only: all obstacles remain axis-aligned rectangles.
const block=(x,y,w,h)=>({x,y,w,h}),hole=(x,y,r=260,pullStrength=368)=>({x,y,r,pullStrength}),portal=(x,y,r=40)=>({x,y,r});
const layout=(obstacles=[],wormholes=[],blackHoles=[])=>({obstacles,wormholes,blackHoles});
// Seeded cover stays identical across clients, rooms, and server restarts.
let coverSeed=48371;function coverRandom(){coverSeed=(coverSeed*16807)%2147483647;return (coverSeed-1)/2147483646;}
const swiss=[];for(let i=0;i<20;i++){let o;do{o=block(100+Math.floor(coverRandom()*1740),100+Math.floor(coverRandom()*1740),42,42);}while(swiss.some(q=>Math.hypot(q.x-o.x,q.y-o.y)<100));swiss.push(o);}
const classicMaps={
 'The Void':layout(),
 'Asteroid Belt':layout([block(230,325,90,100),block(600,475,85,90),block(1030,275,100,100),block(1550,400,90,90),block(380,950,100,100),block(900,875,85,90),block(1350,1025,100,100),block(1730,925,90,90),block(250,1600,85,90),block(720,1500,100,100),block(1160,1625,85,90),block(1610,1525,100,100)]),
 'Crossfire':layout([block(920,400,160,1200),block(400,920,1200,160)]),
 'The Trenches':layout([block(100,460,1800,80),block(100,960,1800,80),block(100,1460,1800,80)]),
 'Four Corners':layout([block(80,80,380,380),block(1540,80,380,380),block(80,1540,380,380),block(1540,1540,380,380)]),
 'Event Horizon':layout([],[],[hole(1000,1000,400,420)]),
 'Gravity Pinball':layout([],[],[hole(400,400,300,345),hole(1000,350,300,345),hole(1600,450,300,345),hole(450,1450,300,345),hole(1000,1650,300,345),hole(1600,1500,300,345)]),
 'Portal Kombat':layout([],[[portal(160,160),portal(1840,1840)],[portal(1840,160),portal(160,1840)]]),
 'Swiss Cheese':layout(swiss),
 'Bermuda Triangle':layout([],[],[hole(1000,650,330,345),hole(680,1220,330,345),hole(1320,1220,330,345)]),
 'Snipe City':layout([block(640,60,80,550),block(640,680,80,640),block(640,1390,80,550),block(1280,60,80,550),block(1280,680,80,640),block(1280,1390,80,550)]),
 'Ping Pong':layout([],[],[hole(200,1000,400,403),hole(1800,1000,400,403)]),
 'Peekaboo':layout([block(320,260,330,100),block(1350,260,330,100),block(250,900,100,330),block(1650,770,100,330),block(320,1640,330,100),block(1350,1640,330,100)],[[portal(480,480),portal(1520,1520)],[portal(1520,480),portal(480,1520)],[portal(470,1060),portal(1530,940)]]),
 'Quantum Spaghetti':layout([block(600,330,160,100),block(1240,1570,160,100),block(330,1240,100,160),block(1570,600,100,160)],[[portal(160,160),portal(1840,1840)],[portal(1840,160),portal(160,1840)],[portal(1000,160),portal(1000,1840)],[portal(160,1000),portal(1840,1000)]],[hole(650,650,320,368),hole(1350,650,320,368),hole(650,1350,320,368),hole(1350,1350,320,368)]),
 'The Meat Grinder':layout([block(520,200,400,1600),block(1080,200,400,1600)],[],[hole(900,800,300,403),hole(1100,1200,300,403)])
};
// Build classic arenas at 1.5x scale; gravity strengths and physics stay unchanged.
const scaleMap=m=>layout(m.obstacles.map(o=>block(o.x*1.5,o.y*1.5,o.w*1.5,o.h*1.5)),m.wormholes.map(pair=>pair.map(h=>portal(h.x*1.5,h.y*1.5,h.r*1.5))),m.blackHoles.map(h=>hole(h.x*1.5,h.y*1.5,Math.min(400,h.r*1.5),h.pullStrength)));
const box=(x,y,size,t=70)=>[block(x,y,size,t),block(x,y+size-t,size,t),block(x,y+t,t,size-2*t),block(x+size-t,y+t,t,size-2*t)];
const ikea=[];for(let row=0;row<6;row++)for(let col=0;col<6;col++){const x=350+col*390,y=350+row*390;ikea.push((row+col)%2?block(x,y,70,260):block(x,y,260,70));}
const checkers=[];for(let row=0;row<9;row++)for(let col=0;col<9;col++)if((row+col)%2===0)checkers.push(block(200+col*300,200+row*300,200,200));
const tight=[];for(let row=0;row<5;row++)for(let col=0;col<5;col++)tight.push((row+col)%2?block(900+col*250,900+row*250,90,160):block(900+col*250,900+row*250,160,90));
const boxes=[[500,500],[1800,500],[500,1800],[1800,1800]];
const maps=Object.fromEntries(Object.entries(classicMaps).map(([name,m])=>[name,scaleMap(m)]));
Object.assign(maps,{
 'The Cosmic Donut':layout(box(950,950,1100,90),[[portal(700,1500),portal(1200,1500)]],[hole(1500,1500,350,403)]),
 'Ikea Furniture Maze':layout(ikea,[[portal(220,1500),portal(2780,1500)],[portal(1500,220),portal(1500,2780)]]),
 'Yeet Street':layout([block(250,850,2500,100),block(250,2050,2500,100)],Array.from({length:6},(_,i)=>[portal(450+i*420,1090,48),portal(2550-i*420,1910,48)])),
 'Gravitational Wedgie':layout([block(1000,800,100,400),block(1900,1800,100,400)],[[portal(350,450),portal(1650,1000)],[portal(2650,2550),portal(1350,2000)]],[hole(1500,1000,380,420),hole(1500,2000,380,420)]),
 'Panic Room':{...layout(box(1100,1100,800),[[portal(650,1500),portal(1500,1500)]]),spawnExclusions:[block(1100,1100,800,800)]},
 "Schrödinger's Box":{...layout(boxes.flatMap(([x,y])=>box(x,y,700)),[[portal(350,1400),portal(850,850)],[portal(2650,1600),portal(2150,2150)]],[hole(2150,850,230,368),hole(850,2150,230,368)]),spawnExclusions:boxes.map(([x,y])=>block(x,y,700,700))},
 'The Checkered Past':layout(checkers),
 'Asthma Attack':layout(tight,[[portal(700,1500),portal(2300,1500)]]),
 'Spicy Meatball':layout([block(1250,1130,500,80),block(1250,1790,500,80),block(1130,1250,80,500),block(1790,1250,80,500)],[],[hole(1500,1500,400,420)])
});
// Deterministic map enrichment: keep themes and sealed rooms, add navigable chaos.
function enrichMap(m,name,index){
 const originalPairs=m.wormholes.length,originalHoles=m.blackHoles.length;
 const chaos=index>=5;
 function clearPoint(x,y,clearance){return x>clearance+20&&y>clearance+20&&x<3000-clearance-20&&y<3000-clearance-20&&!m.obstacles.some(o=>{const dx=x-Math.max(o.x,Math.min(x,o.x+o.w)),dy=y-Math.max(o.y,Math.min(y,o.y+o.h));return dx*dx+dy*dy<clearance*clearance;})&&!(m.spawnExclusions||[]).some(o=>x>o.x-clearance&&x<o.x+o.w+clearance&&y>o.y-clearance&&y<o.y+o.h+clearance);}
 function locate(clearance,extra=()=>true,preferred=[]){for(const q of preferred)if(clearPoint(q.x,q.y,clearance)&&extra(q.x,q.y))return q;for(let i=0;i<6000;i++){const x=160+coverRandom()*2680,y=160+coverRandom()*2680;if(clearPoint(x,y,clearance)&&extra(x,y))return {x:Math.round(x),y:Math.round(y)};}throw Error('No safe layout position: '+name);}
 if(chaos){
  const newPairs=Math.max(2,originalPairs*2)-originalPairs;
  for(let i=0;i<newPairs;i++){const pair=[];for(let j=0;j<2;j++){const q=locate(130,(x,y)=>m.wormholes.flat().concat(pair).every(h=>Math.hypot(x-h.x,y-h.y)>210)&&m.blackHoles.every(h=>Math.hypot(x-h.x,y-h.y)>190));pair.push(portal(q.x,q.y,40));}m.wormholes.push(pair);}
  const nodes=m.wormholes.flat();nodes.forEach((h,i)=>h.id=`${index}-${i}`);
  const chain=m.wormholes.slice(originalPairs).flat();if(chain.length<3)chain.unshift(nodes[1]);chain.forEach((h,i)=>h.nextId=chain[(i+1)%chain.length].id);
  const newHoles=Math.max(2,originalHoles*2)-originalHoles;
  for(let i=0;i<newHoles;i++){const exit=chain[i%chain.length],near=Array.from({length:16},(_,j)=>({x:exit.x+Math.cos(j*Math.PI/8)*250,y:exit.y+Math.sin(j*Math.PI/8)*250}));const q=locate(80,(x,y)=>m.blackHoles.every(h=>Math.hypot(x-h.x,y-h.y)>230)&&nodes.every(h=>Math.hypot(x-h.x,y-h.y)>210),near);m.blackHoles.push(hole(q.x,q.y,320,403));}
 }
 if(name!=='The Void'){
  const count=chaos?Math.min(22,8+Math.ceil(m.obstacles.length*.35)):8;
  for(let i=0;i<count;i++){const w=50+Math.floor(coverRandom()*60),h=i%2?50:90;const q=locate(90,(x,y)=>m.wormholes.flat().every(p=>Math.hypot(x-p.x,y-p.y)>220)&&m.blackHoles.every(p=>Math.hypot(x-p.x,y-p.y)>140));m.obstacles.push(block(q.x-w/2,q.y-h/2,w,h));}
 }
 m.originalAnomalies={wormholes:originalPairs,blackHoles:originalHoles};
}
Object.entries(maps).forEach(([name,m],i)=>enrichMap(m,name,i));
app.get('/maps',(_req,res)=>res.json(Object.entries(maps).map(([id,map])=>({id,name:id,...map}))));
const rooms=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),radius=Physics.shipRadius,rect=(x,y,r,o)=>{const dx=x-clamp(x,o.x,o.x+o.w),dy=y-clamp(y,o.y,o.y+o.h);return dx*dx+dy*dy<r*r;};
function spawn(p,room){for(let i=0;i<100;i++){p.x=50+Math.random()*(W-100);p.y=50+Math.random()*(H-100);if(!(room.spawnExclusions||[]).some(o=>rect(p.x,p.y,36,o))&&!room.obstacles.some(o=>rect(p.x,p.y,36,o))&&!room.blackHoles.some(h=>Math.hypot(p.x-h.x,p.y-h.y)<h.r+36)&&!room.wormholes.flat().some(h=>Math.hypot(p.x-h.x,p.y-h.y)<h.r+41)&&!Object.values(room.players).some(q=>q!==p&&q.alive&&Math.hypot(q.x-p.x,q.y-p.y)<100))break;}Object.assign(p,{hp:100,alive:true,level:0,vx:0,vy:0,warp:0,wormholeUntil:0,shield:Date.now()+1000,input:{x:0,y:0,a:0,fire:false},shot:0,ammo:Physics.shipClass(p).ammo,reloadUntil:0,iFrameUntil:0,a:0,overdriveShot:0,omegaUntil:0,spawnedAt:Date.now()});}
const teamColor=t=>t==='Red'?'#ff5269':'#44edff';
function teamScores(r){return r.teamTotals;}
function balancedTeam(r){const list=Object.values(r.players);return list.filter(p=>p.team==='Red').length<=list.filter(p=>p.team==='Blue').length?'Red':'Blue';}
function state(r){return {isPublic:r.isPublic,lobbyColors:colors.slice(0,10),mode:r.mode,teamScores:teamScores(r),serverTime:Date.now(),isRedAlert:!!r.isRedAlert,supernovaStartedAt:r.supernovaStartedAt||0,matchStartTime:r.matchStartTime||0,code:r.code,host:r.host,phase:r.phase,left:Math.max(0,Math.ceil((r.ends-Date.now())/1000)),players:Object.values(r.players).map(({input,token,...p})=>({...p,thrust:!!(input.x||input.y)})),bullets:r.bullets,asteroids:r.asteroids,scrap:r.scrap,events:r.events,impacts:r.impacts,chat:r.chat,obstacles:r.obstacles,mapName:r.mapName,wormholes:r.wormholes,blackHoles:r.blackHoles,maps:Object.keys(maps),width:W,height:H};}
function broadcast(r){io.to(r.code).emit('state',state(r));}
function leave(s){const r=rooms.get(s.data.room);if(!r)return;const p=r.players[s.data.pid];if(p){p.connected=false;p.input={x:0,y:0,a:p.a||0,fire:false};p.expire=Date.now()+15000;if(r.host===p.id)r.host=Object.values(r.players).find(q=>q.connected)?.id||p.id;}broadcast(r);}
function destroyShip(p,r,owner,now,cause='Black Hole'){if(!p.alive)return;p.alive=false;p.deaths++;p.respawn=now+3000;const killer=r.players[owner];if(killer){killer.kills++;killer.score+=100;if(r.mode==='tdm'){r.teamTotals[killer.team].kills++;r.teamTotals[killer.team].score+=100;}}r.events.unshift({killer:{id:owner,name:killer?.name||cause,color:killer?.color||'#bc7bff'},victim:{id:p.id,name:p.name,color:p.color},text:`${killer?.name||cause} destroyed ${p.name}`,at:now});r.events=r.events.slice(0,4);for(let i=0;i<3+Math.floor(p.level/2);i++){const a=Math.random()*Math.PI*2,d=12+Math.random()*35,x=clamp(p.x+Math.cos(a)*d,10,W-10),y=clamp(p.y+Math.sin(a)*d,10,H-10);if(r.scrap.length<160)r.scrap.push({id:crypto.randomUUID(),x,y,expires:now+15000});}}
// Bounded, server-only PvE entities. Failed placement retries on the next interval.
function spawnAsteroid(r){
 const type=Math.random()<.5?'large':'small',rad=type==='large'?40:20;
 for(let i=0;i<100;i++){
  const x=rad+20+Math.random()*(W-2*rad-40),y=rad+20+Math.random()*(H-2*rad-40);
  if(r.obstacles.some(o=>rect(x,y,rad+10,o))||(r.spawnExclusions||[]).some(o=>rect(x,y,rad+10,o))||r.blackHoles.some(h=>Math.hypot(x-h.x,y-h.y)<h.r+rad+20)||r.wormholes.flat().some(h=>Math.hypot(x-h.x,y-h.y)<h.r+rad+20)||r.asteroids.some(a=>Math.hypot(x-a.x,y-a.y)<rad+a.radius+20)||Object.values(r.players).some(p=>p.alive&&Math.hypot(x-p.x,y-p.y)<rad+radius(p)+60))continue;
    r.asteroids.push({id:crypto.randomUUID(),type,x,y,vx:Math.random()*160-80,vy:Math.random()*160-80,rotation:Math.random()*Math.PI*2,rotationSpeed:(Math.random()*2-1)*1.2,shapeSeed:Math.floor(Math.random()*100000),hp:type==='large'?40:8,radius:rad,warp:0,wormholeUntil:0});return true;
 }return false;
}
function destroyAsteroid(a,r,now){
 if(a.dead)return;a.dead=true;const count=a.type==='large'?3:1;
 // Make room for the full drop while retaining the existing scrap budget.
 r.scrap.splice(0,Math.max(0,r.scrap.length+count-160));
 for(let i=0;i<count;i++)r.scrap.push({id:crypto.randomUUID(),x:a.x,y:a.y,expires:now+15000});
 r.impacts.push({id:crypto.randomUUID(),type:'asteroidDestroyed',x:a.x,y:a.y,color:'#ffb732',at:now});
}
function collisionDamage(p,r,amount,now,owner=null){
 if(!p.alive||p.shield>now||now<(p.iFrameUntil||0))return false;
 p.hp=Math.max(0,p.hp-amount);p.iFrameUntil=now+500;
 r.impacts.push({id:crypto.randomUUID(),x:p.x,y:p.y,color:p.color,team:p.team,at:now});
 if(!p.hp)destroyShip(p,r,owner,now,'Collision');return true;
}
function bounceCircles(p,q,total){
 const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy),nx=d?dx/d:1,ny=d?dy/d:0;
 p.vx+=nx*100;p.vy+=ny*100;q.vx-=nx*100;q.vy-=ny*100;
 // Depenetrate only into clear space, preserving rectangular cover boundaries.
 const overlap=Math.max(0,total-d)+.5;return {nx,ny,overlap};
}
function fireStandard(p,r,now){
 const spec=Physics.shipClass(p);if(r.bullets.length+spec.shots>256)return false;
 p.shot=now;p.ammo--;if(p.ammo<=0){p.reloadUntil=now+spec.reload;p.ammo=spec.ammo;}p.shield=0;
 for(let i=0;i<spec.shots;i++){const angle=p.a+(spec.shots===3?(i-1)*Math.PI/12:0),rad=radius(p);r.bullets.push({id:crypto.randomUUID(),owner:p.id,team:p.team,x:p.x+Math.cos(angle)*(rad+spec.radius+3),y:p.y+Math.sin(angle)*(rad+spec.radius+3),vx:Math.cos(angle)*spec.bulletSpeed,vy:Math.sin(angle)*spec.bulletSpeed,damage:spec.damage*(1+p.level*.1),radius:spec.radius,color:p.color,weapon:p.classId,piercing:!!spec.piercing,hitIds:[],expires:now+spec.life});}return true;
}
function publicRooms(){return [...rooms.values()].filter(r=>r.isPublic===true&&['lobby','results'].includes(r.phase)&&Object.values(r.players).some(p=>p.connected)).map(r=>({code:r.code,hostName:r.players[r.host]?.name||'Pilot',mapName:r.mapName,playerCount:Object.values(r.players).filter(p=>p.connected).length,maxPlayers:15,mode:r.mode,phase:r.phase,joinable:r.phase!=='playing'&&Object.keys(r.players).length<15}));}
io.on('connection',s=>{
 s.on('listRooms',(ack=()=>{})=>{if(typeof ack==='function')ack({rooms:publicRooms()});});
 s.on('toggleVisibility',(ack=()=>{})=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.data.pid)return ack({error:'Only the host can change room visibility.'});if(!['lobby','results'].includes(r.phase))return ack({error:'Change room visibility before a match starts.'});r.isPublic=!r.isPublic;broadcast(r);ack({ok:true,isPublic:r.isPublic});});
 s.on('selectColor',(color,ack=()=>{})=>{const r=rooms.get(s.data.room),p=r?.players[s.data.pid];if(!p||!['lobby','results'].includes(r.phase))return ack({error:'Choose your color in the lobby.'});if(typeof color!=='string'||!colors.slice(0,10).includes(color))return ack({error:'Choose a color from the palette.'});if(Object.values(r.players).some(q=>q.id!==p.id&&q.color===color))return ack({error:'That color is already taken.'});p.color=color;broadcast(r);ack({ok:true});});

 s.on('join',(data={},ack=()=>{})=>{if(s.data.room)return ack({error:'Already in a room.'});let code=String(data.code||'').toUpperCase().trim(),r;if(data.create){if(data.isPublic!==undefined&&typeof data.isPublic!=='boolean')return ack({error:'Invalid room visibility.'});if(data.mode!==undefined&&!['ffa','tdm'].includes(data.mode))return ack({error:'Invalid game mode.'});const mapId=data.mapId===undefined?'Crossfire':data.mapId;if(typeof mapId!=='string'||!Object.hasOwn(maps,mapId))return ack({error:'Unknown map. Select a map from the catalog.'});do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));r={code,isPublic:data.isPublic===true,mode:data.mode||'ffa',teamTotals:{Red:{score:0,kills:0},Blue:{score:0,kills:0}},mapName:mapId,...maps[mapId],host:null,phase:'lobby',ends:0,isRedAlert:false,supernovaStartedAt:0,players:{},bullets:[],scrap:[],asteroids:[],nextAsteroidAt:0,events:[],impacts:[],chat:[]};rooms.set(code,r);}else r=rooms.get(code);if(!r)return ack({error:'Room not found. Check the code.'});let p=Object.values(r.players).find(p=>p.token===data.token&&!p.connected);if(!p){if(Object.keys(r.players).length>=15)return ack({error:'Room is full.'});if(['starting','playing','supernova'].includes(r.phase))return ack({error:'Match in progress. Join after this round.'});const id=crypto.randomUUID();p={id,classId:'striker',team:r.mode==='tdm'?balancedTeam(r):null,token:crypto.randomUUID(),name:String(data.name||'Pilot').trim().slice(0,18)||'Pilot',color:colors.find(c=>!Object.values(r.players).some(p=>p.color===c)),score:0,kills:0,deaths:0,collected:0,connected:true};r.players[id]=p;spawn(p,r);}p.connected=true;p.expire=0;if(!r.host||!r.players[r.host]?.connected)r.host=p.id;s.data.room=code;s.data.pid=p.id;s.join(code);ack({id:p.id,token:p.token,code});broadcast(r);});
 s.on('selectClass',(classId,ack=()=>{})=>{const r=rooms.get(s.data.room),p=r?.players[s.data.pid];if(!p||!['lobby','results'].includes(r.phase))return ack({error:'Choose your class before the match.'});if(typeof classId!=='string'||!Object.hasOwn(Physics.CLASSES,classId))return ack({error:'Unknown ship class.'});p.classId=classId;spawn(p,r);broadcast(r);ack({ok:true});});
 s.on('chat',(message,ack=()=>{})=>{const r=rooms.get(s.data.room),p=r?.players[s.data.pid],now=Date.now();if(!p||!p.connected)return ack({error:'Join a room first.'});if(typeof message!=='string')return ack({error:'Invalid message.'});const text=message.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,50);if(!text)return ack({error:'Write a message first.'});if(now<(p.chatUntil||0))return ack({error:'Please wait a moment.'});p.chatUntil=now+700;r.chat.push({id:crypto.randomUUID(),name:p.name,color:p.color,text,at:now});r.chat=r.chat.slice(-5);broadcast(r);ack({ok:true});});
 s.on('switchTeam',(ack=()=>{})=>{const r=rooms.get(s.data.room),p=r?.players[s.data.pid];if(!p||!p.connected||r.mode!=='tdm'||!['lobby','results'].includes(r.phase))return ack({error:'Switch teams before the match or rematch.'});const target=p.team==='Red'?'Blue':'Red';if(Object.values(r.players).filter(q=>q.team===target).length>=8)return ack({error:'That team is full.'});p.team=target;broadcast(r);ack({ok:true});});
 s.on('selectMap',(name,ack=()=>{})=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.data.pid)return ack({error:'Only the host can select a map.'});if(!['lobby','results'].includes(r.phase))return ack({error:'Wait until the round ends.'});if(typeof name!=='string'||!Object.hasOwn(maps,name))return ack({error:'Unknown map.'});r.asteroids=[];r.nextAsteroidAt=0;r.mapName=name;Object.assign(r,{spawnExclusions:[]},maps[name]);for(const p of Object.values(r.players))spawn(p,r);broadcast(r);ack({ok:true});});
 s.on('start',(ack=()=>{})=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.data.pid)return ack({error:'Only the host can start.'});if(!['lobby','results'].includes(r.phase))return ack({error:'Match is already starting or running.'});if(Object.values(r.players).filter(p=>p.connected).length<2)return ack({error:'At least 2 connected players are needed.'});if(r.mode==='tdm'&&!['Red','Blue'].every(t=>Object.values(r.players).some(p=>p.connected&&p.team===t)))return ack({error:'Each team needs at least one connected pilot.'});r.teamTotals={Red:{score:0,kills:0},Blue:{score:0,kills:0}};r.asteroids=[];r.nextAsteroidAt=0;r.isRedAlert=false;r.supernovaStartedAt=0;r.phase='starting';r.matchStartTime=Date.now()+3000;r.ends=0;r.bullets=[];r.scrap=[];r.events=[];r.impacts=[];for(const p of Object.values(r.players)){Object.assign(p,{score:0,kills:0,deaths:0,collected:0});spawn(p,r);p.shield=r.matchStartTime+1000;}broadcast(r);ack({ok:true});});
 s.on('endMatch',(ack=()=>{})=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.data.pid)return ack({error:'Only the host can end the match.'});if(r.phase!=='playing')return ack({error:'No match is running.'});r.phase='results';r.ends=Date.now();broadcast(r);ack({ok:true});});
 s.on('leaveRoom',(ack=()=>{})=>{const r=rooms.get(s.data.room),pid=s.data.pid;if(r){delete r.players[pid];r.bullets=r.bullets.filter(b=>b.owner!==pid);s.leave(r.code);if(r.host===pid)r.host=Object.values(r.players).find(p=>p.connected)?.id||Object.keys(r.players)[0];if(Object.keys(r.players).length)broadcast(r);else rooms.delete(r.code);}s.data.room=null;s.data.pid=null;ack({ok:true});});
 s.on('overdrive',(v={},ack=()=>{})=>{const r=rooms.get(s.data.room),p=r?.players[s.data.pid],now=Date.now();if(!r||r.phase!=='playing'||!p?.alive||!p.connected)return ack({error:'Overdrive is only available while alive in a match.'});if(p.level<2)return ack({error:'Overdrive needs 2 upgrade levels.'});if(now<(p.omegaUntil||0))return ack({error:'Omega Beam is already active.'});if(!Number.isFinite(v.a))return ack({error:'Invalid aim.'});if(now-p.overdriveShot<180||(p.level<10&&r.bullets.length>=256))return ack({error:'Weapon is recharging.'});if(p.level===10){p.level=0;p.omegaUntil=now+3000;p.overdriveShot=now;p.shield=0;broadcast(r);return ack({ok:true,omega:true});}p.level-=2;p.reloadUntil=now+1000;p.overdriveShot=now;p.shot=now;p.shield=0;if(p.classId!=='sniper')p.a=v.a;const rad=radius(p);r.bullets.push({id:crypto.randomUUID(),owner:p.id,team:p.team,x:p.x+Math.cos(p.a)*(rad+13),y:p.y+Math.sin(p.a)*(rad+13),vx:Math.cos(p.a)*960,vy:Math.sin(p.a)*960,damage:50,radius:10,overdrive:true,color:p.color,expires:now+1800});broadcast(r);ack({ok:true});});
 s.on('input',(v={})=>{const r=rooms.get(s.data.room),p=r?.players[s.data.pid];if(r?.phase==='starting'||r?.phase==='supernova')return;if(p&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.a))p.input={x:clamp(v.x,-1,1),y:clamp(v.y,-1,1),a:v.a,fire:!!v.fire};});s.on('disconnect',()=>leave(s));
});
let tick=0;setInterval(()=>{const now=Date.now(),dt=1/30;for(const [code,r]of rooms){for(const p of Object.values(r.players))if(!p.connected&&p.expire<now)delete r.players[p.id];if(!Object.keys(r.players).length){rooms.delete(code);continue;}if(r.phase==='starting'&&now>=r.matchStartTime){r.phase='playing';r.ends=now+180000;for(const p of Object.values(r.players)){p.input={x:0,y:0,a:p.a||0,fire:false};p.shield=now+1000;}broadcast(r);continue;}if(r.phase==='playing'&&now>=r.ends){r.phase='supernova';r.supernovaStartedAt=now;for(const p of Object.values(r.players))p.input={x:0,y:0,a:p.a||0,fire:false};broadcast(r);}else if(r.phase==='supernova'&&now>=r.supernovaStartedAt+2000){r.phase='results';broadcast(r);}if(r.phase==='playing'){
if(!r.isRedAlert&&r.ends-now<=30000){r.isRedAlert=true;r.nextAsteroidAt=Math.min(r.nextAsteroidAt||now,now+750);broadcast(r);}
if(r.asteroids.length<(r.isRedAlert?30:15)&&now>=r.nextAsteroidAt){spawnAsteroid(r);r.nextAsteroidAt=now+(r.isRedAlert?750:1500);}
for(const a of r.asteroids){Physics.moveAsteroid(a,r,W,H,dt,now);if(r.blackHoles.some(h=>Math.hypot(a.x-h.x,a.y-h.y)<Math.max(10,h.r*.08)+a.radius))destroyAsteroid(a,r,now);}
for(const p of Object.values(r.players)){if(!p.connected)continue;if(!p.alive){if(now>=p.respawn)spawn(p,r);else continue;}const u=p.input;const movement=Physics.moveShip(p,u,r,W,H,dt,now);if(movement.wallHit)collisionDamage(p,r,2,now);const rad=radius(p);for(const h of r.blackHoles){if(p.shield<=now&&Math.hypot(p.x-h.x,p.y-h.y)<Math.max(10,h.r*.08)+rad){p.hp=Math.max(0,p.hp-30*dt);if(!p.hp)destroyShip(p,r,null,now);}}if(!p.alive)continue;const spec=Physics.shipClass(p);if(u.fire&&now-p.shot>=spec.cooldown&&now>p.reloadUntil)fireStandard(p,r,now);}
const alive=Object.values(r.players).filter(p=>p.alive&&p.connected);
for(const p of alive)for(const a of r.asteroids){if(a.dead||!p.alive)continue;const total=radius(p)+a.radius;if(Math.hypot(p.x-a.x,p.y-a.y)<total){collisionDamage(p,r,3,now);const push=bounceCircles(p,a,total);const x=clamp(p.x+push.nx*push.overlap, radius(p),W-radius(p)),y=clamp(p.y+push.ny*push.overlap,radius(p),H-radius(p));if(!r.obstacles.some(o=>rect(x,y,radius(p),o))){p.x=x;p.y=y;}}}
for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){const p=alive[i],q=alive[j];if(!p.alive||!q.alive)continue;const total=radius(p)+radius(q);if(Math.hypot(p.x-q.x,p.y-q.y)<total){const friendly=r.mode==='tdm'&&p.team===q.team;collisionDamage(p,r,10,now,friendly?null:q.id);collisionDamage(q,r,10,now,friendly?null:p.id);const push=bounceCircles(p,q,total);for(const [ship,sign]of [[p,1],[q,-1]]){const rad=radius(ship),x=clamp(ship.x+sign*push.nx*push.overlap/2,rad,W-rad),y=clamp(ship.y+sign*push.ny*push.overlap/2,rad,H-rad);if(!r.obstacles.some(o=>rect(x,y,rad,o))){ship.x=x;ship.y=y;}}}}


// Exact circle/rotated-rectangle intersection for the 40 by 1500 piercing beam.
function beamHits(owner,target,rad){const angle=owner.a||0,cos=Math.cos(angle),sin=Math.sin(angle),origin=radius(owner),dx=target.x-owner.x,dy=target.y-owner.y,x=dx*cos+dy*sin-origin,y=-dx*sin+dy*cos;const ex=x-clamp(x,0,1500),ey=y-clamp(y,-20,20);return ex*ex+ey*ey<=rad*rad;}
for(const owner of alive){if(!owner.alive||now>=(owner.omegaUntil||0))continue;for(const target of alive){if(target===owner||!target.alive||target.shield>now||(r.mode==='tdm'&&target.team===owner.team))continue;if(beamHits(owner,target,radius(target))){target.hp=Math.max(0,target.hp-2);if(!target.hp)destroyShip(target,r,owner.id,now);}}for(const rock of r.asteroids)if(!rock.dead&&beamHits(owner,rock,rock.radius))destroyAsteroid(rock,r,now);}

for(const b of r.bullets){for(let k=0,steps=Math.max(3,Math.ceil(Math.hypot(b.vx,b.vy)*dt/8));k<steps&&!b.dead;k++){Physics.gravity(b,r.blackHoles,dt/steps);b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;Physics.teleport(b,r.wormholes,now,b.radius||4);if(b.x<0||b.x>W||b.y<0||b.y>H||r.obstacles.some(o=>rect(b.x,b.y,b.radius||4,o))){b.dead=true;break;}for(const a of r.asteroids){if(a.dead||(b.hitIds||[]).includes(a.id))continue;const dx=b.x-a.x,dy=b.y-a.y,hit=a.radius+(b.radius||4);if(dx*dx+dy*dy<hit*hit){b.hitIds??=[];b.hitIds.push(a.id);a.hp=b.overdrive?0:a.hp-b.damage;if(a.hp<=0)destroyAsteroid(a,r,now);if(b.piercing){if(a.hp>0)r.impacts.push({id:b.id+':'+a.id,type:'asteroidDamage',x:b.x,y:b.y,color:'#ffb732',at:now});}else{b.dead=true;b.impactType=a.hp<=0?'asteroidDestroyedBullet':'asteroidDamage';break;}}}if(b.dead)break;for(const p of Object.values(r.players)){if((r.mode==='tdm'&&p.team===b.team)||p.id===b.owner||(b.hitIds||[]).includes(p.id)||!p.alive||!p.connected||p.shield>now)continue;const hitRadius=radius(p)+(b.radius||4),dx=p.x-b.x,dy=p.y-b.y;if(dx*dx+dy*dy<hitRadius*hitRadius){b.hitIds??=[];b.hitIds.push(p.id);if(!b.piercing)b.dead=true;else r.impacts.push({id:b.id+':'+p.id,x:b.x,y:b.y,color:b.color,team:b.team,at:now});p.hp=Math.max(0,p.hp-b.damage);if(!p.hp){destroyShip(p,r,b.owner,now);}if(b.dead)break;}}}}
for(const b of r.bullets)if(b.dead)r.impacts.push({id:b.id,x:b.x,y:b.y,color:b.color,team:b.team,type:b.impactType,at:now});r.asteroids=r.asteroids.filter(a=>!a.dead);r.impacts=r.impacts.filter(e=>now-e.at<1000).slice(-80);r.bullets=r.bullets.filter(b=>!b.dead&&b.expires>now);r.scrap=r.scrap.filter(s=>{if(s.expires<=now)return false;const p=Object.values(r.players).find(p=>p.alive&&p.connected&&Math.hypot(p.x-s.x,p.y-s.y)<radius(p)+9);if(!p)return true;p.level=Math.min(10,p.level+1);p.score+=10;p.collected++;if(r.mode==='tdm')r.teamTotals[p.team].score+=10;return false;});}
if(tick%3!==2)broadcast(r);}tick++;},1000/30);
const port=Number(process.env.PORT||process.argv[process.argv.indexOf('--port')+1])||3000;
server.listen(port,'0.0.0.0',()=>console.log('Scrap Arena listening on http://localhost:'+port));
