const cv=document.getElementById('c'),ctx=cv.getContext('2d'),ui=document.getElementById('ui');
const W=360,H=620,CX=180,CY=230,R=76,PI=Math.PI,TAU=PI*2;
let DPR=1;
function fit(){DPR=Math.min(devicePixelRatio||1,2);const s=Math.min(innerWidth/W,innerHeight/H);
cv.style.width=W*s+'px';cv.style.height=H*s+'px';cv.width=W*DPR;cv.height=H*DPR;ui.style.fontSize=(s*16)+'px'}
addEventListener('resize',fit);fit();


let DB=null,dbReady=true; // versi mandiri: data disimpan di localStorage
const L={get(k){try{return JSON.parse(localStorage.getItem('pp_'+k))}catch(e){return null}},set(k,v){try{localStorage.setItem('pp_'+k,JSON.stringify(v))}catch(e){}}};
const store={
 async getDoc(col,id){if(DB){try{const s=await DB.doc(col+'/'+id).get();if(s.exists)return s.data()}catch(e){}}
  return (L.get(col)||{})[id]||null},
 async setDoc(col,id,data){let ok=false;if(DB){try{await DB.doc(col+'/'+id).set(data);ok=true}catch(e){}}
  if(!ok){const m=L.get(col)||{};m[id]=data;L.set(col,m)}return ok},
 async top(){if(DB){try{const s=await DB.collection('scores').orderBy('best','desc').limit(5).get();return s.docs.map(d=>d.data())}catch(e){}}
  return Object.values(L.get('scores')||{}).sort((a,b)=>b.best-a.best).slice(0,5)}
};
async function sha(salt,pw){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pw));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const rnd=()=>[...crypto.getRandomValues(new Uint8Array(8))].map(x=>x.toString(16).padStart(2,'0')).join('');


let user=null,best=0,screen='auth',tab='in';
async function register(name,pw){
 const id=name.toLowerCase();
 if(!/^[a-z0-9_]{3,16}$/.test(id))return 'Nama 3-16 karakter: huruf, angka, atau garis bawah.';
 if(pw.length<4)return 'Kata sandi minimal 4 karakter.';
 if(await store.getDoc('accounts',id))return 'Nama itu sudah dipakai. Coba nama lain.';
 const salt=rnd();await store.setDoc('accounts',id,{salt,hash:await sha(salt,pw)});
 await store.setDoc('scores',id,{name:id,best:0});enter(id,0);return '';
}
async function login(name,pw){
 const id=name.toLowerCase(),a=await store.getDoc('accounts',id);
 if(!a||a.hash!==await sha(a.salt,pw))return 'Nama atau kata sandi salah.';
 const sc=await store.getDoc('scores',id);enter(id,sc?sc.best:0);return '';
}
function enter(id,b){user=id;best=b;L.set('session',id);screen='menu';render()}
function logout(){user=null;L.set('session',null);screen='auth';render()}
async function saveBest(){if(user&&g.score>best){best=g.score;await store.setDoc('scores',user,{name:user,best})}}

const $=s=>ui.querySelector(s);
async function render(){
 if(screen==='play'){ui.innerHTML='';return}
 if(screen==='auth'){
  ui.innerHTML=`<div class="card"><h1>Pisau Peri</h1><div class="tabs"><button id="t1" class="${tab==='in'?'':'alt'}">Masuk</button><button id="t2" class="${tab==='up'?'':'alt'}">Daftar</button></div>
  <input id="u" placeholder="Nama pemain" autocomplete="username" maxlength="16"><input id="p" type="password" placeholder="Kata sandi" autocomplete="${tab==='in'?'current-password':'new-password'}">
  <div class="err" id="e"></div><button id="go">${tab==='in'?'Masuk':'Buat akun'}</button>
  <p class="note">${!dbReady?'Menyambungkan penyimpanan…':DB?'Akun dan skor tersimpan di penyimpanan gim.':'Akun dan skor tersimpan di perangkat ini saja.'}</p></div>`;
  $('#t1').onclick=()=>{tab='in';render()};$('#t2').onclick=()=>{tab='up';render()};
  const go=async()=>{const e=$('#e'),b=$('#go');b.disabled=true;e.textContent='';
   try{const m=await(tab==='in'?login:register)($('#u').value.trim(),$('#p').value);if(m)e.textContent=m}catch(x){e.textContent='Gagal memproses. Coba lagi.'}
   b.disabled=false};
  $('#go').onclick=go;ui.querySelectorAll('input').forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')go()});
 }else if(screen==='menu'||screen==='over'){
  const t=await store.top(),over=screen==='over';
  ui.innerHTML=`<div class="card"><h1>${over?'Mantra gagal':'Halo, '+user}</h1>
  <p>${over?`Skor <b>${g.score}</b> di tahap <b>${g.stage}</b>${g.score>=best&&g.score>0?' · rekor baru!':''}`:'Lempar belati ke kue ajaib. Jangan kena belati lain.'}<br>Rekor kamu: <b>${best}</b></p>
  <ol>${t.map((r,i)=>`<li class="${r.name===user?'me':''}"><span>${i+1}. ${r.name}</span><span>${r.best}</span></li>`).join('')||'<li>Belum ada skor.</li>'}</ol>
  <button id="go">${over?'Coba lagi':'Main'}</button><button id="out" class="alt">Keluar</button></div>`;
  $('#go').onclick=start;$('#out').onclick=logout;
 }
}

const norm=a=>{a%=TAU;return a<0?a+TAU:a},diff=(a,b)=>{const d=Math.abs(norm(a)-norm(b));return d>PI?TAU-d:d};
const stars=Array.from({length:26},(_,i)=>({x:(i*89)%W,y:(i*47)%380,p:i*1.7}));
let g={stage:1,score:0,left:0,total:0,rot:0,t:0,stuck:[],fly:null,fall:null,parts:[],shake:0,state:'idle',timer:0};
function setup(){const s=g.stage;g.total=g.left=Math.min(4+s,9);g.stuck=[];g.fly=null;g.t=0;
 const n=Math.min(1+Math.floor(s/1.5),6);let k=0;while(g.stuck.length<n&&k++<200){const a=Math.random()*TAU;if(g.stuck.every(b=>diff(a,b)>.6))g.stuck.push(a)}
 g.state='play'}
function spd(){const s=g.stage,b=1.3+.15*Math.min(s,10),p=(s-1)%3;return p===0?b:p===1?b*1.5*Math.sin(g.t*.9):b*(1+.7*Math.sin(g.t*2.2))}
function petals(x,y,n,sp){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=(.3+Math.random())*sp;g.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,r:3+Math.random()*4,rot:0,vr:(Math.random()-.5)*8,life:1+Math.random()*.6,col:['#e49bb9','#ffc2dc','#fff','#e7e41a'][i%4]})}}
function throwKnife(){if(g.state!=='play'||g.fly||g.left<=0)return;g.fly={y:540};g.left--;sfx.throw()}
function land(){const a=norm(PI/2-g.rot);g.fly=null;
 if(g.stuck.some(b=>diff(a,b)<.22)){g.fall={x:CX,y:CY+R,vx:(Math.random()-.5)*240,vy:-360,r:PI/2,vr:8};g.state='over';g.shake=12;g.timer=0;sfx.fail();saveBest();return}
 g.stuck.push(a);g.score+=10;g.shake=4;sfx.hit();petals(CX,CY+R,5,110);
 if(g.left===0){g.state='clear';g.timer=0;g.score+=20;sfx.clear();petals(CX,CY,40,280)}}
function update(dt){g.t+=dt;g.shake=Math.max(0,g.shake-dt*30);
 if(g.state==='play'||g.state==='clear'||g.state==='idle')g.rot+=(g.state==='idle'?.7:spd())*dt;
 if(g.fly){g.fly.y-=1400*dt;if(g.fly.y<=CY+R)land()}
 if(g.state==='clear'){g.timer+=dt;if(g.timer>1.2){g.stage++;setup()}}
 if(g.fall){const f=g.fall;f.vy+=1800*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.r+=f.vr*dt}
 if(g.state==='over'){g.timer+=dt;if(g.timer>.9&&screen==='play'){screen='over';render()}}
 g.parts=g.parts.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.rot+=p.vr*dt;p.life-=dt;return p.life>0})}
function knife(){ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-3,-6);ctx.lineTo(28,-6);ctx.lineTo(28,6);ctx.lineTo(-3,6);ctx.closePath();
 ctx.fillStyle='#f4f0ff';ctx.fill();ctx.strokeStyle='#a58bd6';ctx.lineWidth=1.5;ctx.stroke();
 ctx.fillStyle='#ffc94d';ctx.beginPath();ctx.roundRect(27,-11,6,22,3);ctx.fill();
 ctx.fillStyle='#ff5f9e';ctx.beginPath();ctx.roundRect(33,-4,20,8,4);ctx.fill();
 ctx.fillStyle='#ffc94d';ctx.beginPath();ctx.arc(56,0,5,0,TAU);ctx.fill()}
function heart(s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,s*.9);ctx.bezierCurveTo(-s*1.8,-s*.3,-s*.7,-s*1.4,0,-s*.4);ctx.bezierCurveTo(s*.7,-s*1.4,s*1.8,-s*.3,0,s*.9);ctx.fill()}
function draw(){ctx.setTransform(DPR,0,0,DPR,0,0);
 const sk=ctx.createLinearGradient(0,0,0,H);sk.addColorStop(0,'#ffe6f2');sk.addColorStop(.55,'#ffb7d5');sk.addColorStop(1,'#d9a8f0');ctx.fillStyle=sk;ctx.fillRect(0,0,W,H);
 ctx.save();if(g.shake)ctx.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);
 stars.forEach(s=>{ctx.globalAlpha=.4+.6*Math.abs(Math.sin(g.t*1.2+s.p));ctx.fillStyle='#fff';ctx.fillRect(s.x,s.y,2.5,2.5)});ctx.globalAlpha=1;
 ctx.fillStyle='#f6a6cb';ctx.beginPath();ctx.ellipse(70,650,220,110,0,0,TAU);ctx.fill();ctx.fillStyle='#f08dba';ctx.beginPath();ctx.ellipse(310,660,210,110,0,0,TAU);ctx.fill();
 ctx.fillStyle='#6b2560';ctx.font="600 20px Fredoka,'Trebuchet MS',sans-serif";ctx.textAlign='left';ctx.fillText('Skor '+g.score,16,34);
 ctx.textAlign='right';ctx.fillText('Tahap '+g.stage,W-16,34);
 ctx.save();ctx.translate(CX,CY);ctx.rotate(g.rot);
 g.stuck.forEach(a=>{ctx.save();ctx.rotate(a);ctx.translate(R,0);knife();ctx.restore()});
 ctx.fillStyle='#ff8fbd';for(let i=0;i<16;i++){const a=i/16*TAU;ctx.beginPath();ctx.arc(Math.cos(a)*R,Math.sin(a)*R,11,0,TAU);ctx.fill()}
 ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.fill();ctx.fillStyle='#fff4fa';ctx.beginPath();ctx.arc(0,0,R-13,0,TAU);ctx.fill();
 ctx.strokeStyle='#ffc2dc';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,R-28,0,TAU);ctx.stroke();
 for(let i=0;i<12;i++){const a=i/12*TAU;ctx.fillStyle=['#ffd36e','#8ff0d0','#d9a8f0'][i%3];ctx.beginPath();ctx.arc(Math.cos(a)*(R-20),Math.sin(a)*(R-20),3,0,TAU);ctx.fill()}
 heart(13,'#ff5f9e');ctx.restore();
 if(g.fly){ctx.save();ctx.translate(CX,g.fly.y);ctx.rotate(PI/2);knife();ctx.restore()}
 if(g.fall){ctx.save();ctx.translate(g.fall.x,g.fall.y);ctx.rotate(g.fall.r);knife();ctx.restore()}
 for(let i=0;i<g.total;i++){const used=i<g.total-g.left;ctx.save();ctx.translate(CX+(i-(g.total-1)/2)*22,585);ctx.rotate(-PI/2);ctx.scale(.5,.5);ctx.globalAlpha=used?.25:1;ctx.translate(-28,0);knife();ctx.restore()}
 g.parts.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=Math.min(1,p.life);ctx.fillStyle=p.col;ctx.beginPath();ctx.ellipse(0,0,p.r,p.r*.6,0,0,TAU);ctx.fill();ctx.restore()});
 if(g.state==='clear'){ctx.globalAlpha=Math.min(1,g.timer*3);ctx.fillStyle='#e0377f';ctx.textAlign='center';ctx.font="400 44px 'Grand Hotel','Brush Script MT',cursive";ctx.fillText('Menawan!',CX,CY+8)}
 ctx.restore()}
function start(){g.stage=1;g.score=0;g.rot=0;g.fall=null;g.parts=[];screen='play';ui.innerHTML='';setup()}
document.getElementById('wrap').addEventListener('pointerdown',e=>{if(screen==='play'&&!e.target.closest('#ui,#snd'))throwKnife()});
addEventListener('keydown',e=>{if(e.code==='Space'&&screen==='play'){e.preventDefault();throwKnife()}});

let AC,master,muted=!!L.get('mute'),mTimer,step=0;
function audio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=muted?0:1;master.connect(AC.destination)}catch(e){}}
 if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d,type='sine',v=.08,t0=0,slide=0){const a=audio();if(!a)return;const o=a.createOscillator(),k=a.createGain(),t=a.currentTime+t0;
 o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(f*slide,t+d);
 k.gain.setValueAtTime(v,t);k.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(k);k.connect(master);o.start(t);o.stop(t+d)}
const sfx={
 throw(){tone(400,.12,'triangle',.07,0,2)},
 hit(){tone(900,.1,'sine',.08);tone(1350,.14,'sine',.05,.03)},
 fail(){tone(300,.5,'sawtooth',.07,0,.3)},
 clear(){[523,659,784,1047].forEach((f,i)=>tone(f,.3,'triangle',.07,i*.1))},
 click(){tone(700,.07,'triangle',.06)}
};
const melody=[523,659,784,659,880,784,659,523,587,659,784,659,587,523,440,523],bass=[131,98,110,87];
function startMusic(){if(mTimer)return;mTimer=setInterval(()=>{if(muted||document.hidden)return;
 tone(melody[step%16],.9,'sine',.035);if(step%4===0)tone(bass[(step/4|0)%4],1.6,'triangle',.04);step++},450)}
const snd=document.getElementById('snd');
function paintSnd(){snd.textContent=muted?'🔇':'🔊';snd.setAttribute('aria-label',muted?'Nyalakan suara':'Matikan suara')}
snd.onclick=()=>{audio();muted=!muted;L.set('mute',muted?1:0);if(master)master.gain.value=muted?0:1;paintSnd();if(!muted){sfx.click();startMusic()}};
paintSnd();
document.addEventListener('pointerdown',()=>{audio();startMusic()},{once:true});
ui.addEventListener('click',e=>{if(e.target.closest('button'))sfx.click()});

let last=performance.now();
(function loop(now){const dt=Math.min((now-last)/1000,.033);last=now;update(dt);draw();requestAnimationFrame(loop)})(last);
(async()=>{const s=L.get('session');if(s){const sc=await store.getDoc('scores',s);if(await store.getDoc('accounts',s)){enter(s,sc?sc.best:0);return}}render()})();
