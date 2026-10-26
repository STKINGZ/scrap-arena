const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{EventEmitter}=require('node:events');
test('three-shot magazine, strict reload boundary, Overdrive penalty and respawn reset',()=>{
 let clock=10000,step,last;class IO extends EventEmitter{to(){return {emit:(event,s)=>last=s};}}
 const context={require:n=>n==='socket.io'?{Server:IO}:n==='http'?{createServer:()=>({listen(){}})}:require(n),__dirname,module:{exports:{}},process:{env:{},argv:[]},console,Date:{now:()=>clock},setInterval:fn=>step=fn};
 vm.runInNewContext(fs.readFileSync(__dirname+'/server.js','utf8')+'\nmodule.exports={rooms,io};',context);
 const {rooms,io}=context.module.exports;function connect(){const s=new EventEmitter();s.data={};s.join=()=>{};s.leave=()=>{};io.emit('connection',s);return s;}function send(s,event,data){let answer;const cb=r=>answer=r;data===undefined?s.emit(event,cb):s.emit(event,data,cb);if(event==='start'&&answer?.ok){clock+=3000;step();}return answer;}
 const a=connect(),joined=send(a,'join',{create:true,mapId:'The Void'}),b=connect();send(b,'join',{code:joined.code});send(a,'start');const room=rooms.get(joined.code),p=room.players[joined.id];p.x=500;p.y=500;const q=Object.values(room.players).find(v=>v!==p);q.x=1800;q.y=1800;
 assert.equal(p.ammo,3);assert.equal(p.reloadUntil,0);send(a,'input',{x:0,y:0,a:0,fire:true});step();assert.equal(p.ammo,2);clock+=180;step();assert.equal(p.ammo,1);clock+=180;step();assert.equal(p.ammo,3);assert.equal(p.reloadUntil,clock+1000);const shot=p.shot;clock=p.reloadUntil;step();assert.equal(p.shot,shot);clock++;step();assert.equal(p.ammo,2);

 p.level=4;const ammo=p.ammo;assert(send(a,'overdrive',{a:0}).ok);assert.equal(p.ammo,ammo);assert.equal(p.reloadUntil,clock+1000);clock+=200;step();assert.equal(p.ammo,ammo);assert(send(a,'overdrive',{a:0}).ok,'Overdrive ignores standard magazine and reload');assert.equal(p.ammo,ammo);assert.equal(last.players.find(v=>v.id===p.id).reloadUntil,p.reloadUntil);assert.equal(last.players.find(v=>v.id===p.id).ammo,ammo);
 p.alive=false;p.respawn=clock;p.ammo=1;clock++;step();assert.equal(p.ammo,3);assert.equal(p.reloadUntil,0);
});
