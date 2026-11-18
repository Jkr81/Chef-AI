const qs = s => document.querySelector(s);
function fit(){ const h=innerHeight, w=innerWidth; const f=Math.min(1,(h-40)/844);
  document.documentElement.style.setProperty('--fit',f);
  document.documentElement.style.setProperty('--fitdemo',Math.min(1.12,(h-40)/844, (w-640)/390)); }
addEventListener('resize',fit); fit();
const qsa = s => [...document.querySelectorAll(s)];
const order = ['splash','home','generate','scan','verify','brew','recipe','chat'];
let current = 'splash';
const state = { chef:'Bobby Flay', people:2, ingredients:[], scanned:false, saved:false, noOven:false };

function go(id, back){
  if(id===current) return;
  const from = qs('#'+current), to = qs('#'+id);
  from.classList.remove('active');
  from.classList.toggle('back', !back);
  to.classList.remove('back');
  if(back){ to.classList.add('back'); void to.offsetWidth; }
  to.classList.add('active'); to.classList.remove('back');
  to.scrollTop = 0;
  current = id;
  qs('#status').classList.toggle('light', id==='splash'||id==='scan');
  if(id==='scan') startScan();
  if(id==='verify') buildVerify();
  if(id==='brew') runBrew();
  if(id==='recipe') buildRecipe();
  if(id==='chat') openChat();
}
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-go]');
  if(b) go(b.dataset.go, b.hasAttribute('data-back'));
});

function toast(t){ const el=qs('#toast'); el.textContent=t; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1800); }

/* chips */
qsa('.chips').forEach(g=>g.addEventListener('click',e=>{
  const c=e.target.closest('.chip'); if(!c) return;
  if(g.hasAttribute('data-single')) g.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
  c.classList.toggle('on', g.hasAttribute('data-single') ? true : !c.classList.contains('on'));
}));
qs('#chefPick').addEventListener('click',e=>{
  const c=e.target.closest('.chef'); if(!c) return;
  qsa('#chefPick .chef').forEach(x=>x.classList.remove('on')); c.classList.add('on'); state.chef=c.dataset.chef;
});
qs('#minus').onclick=()=>{ state.people=Math.max(1,state.people-1); qs('#ppl').textContent=state.people; };
qs('#plus').onclick=()=>{ state.people=Math.min(8,state.people+1); qs('#ppl').textContent=state.people; };

/* ingredients tags */
function renderTags(){
  qs('#tags').innerHTML = state.ingredients.map((x,i)=>`<span class="tag">${x.em} ${x.name}<button data-rm="${i}">×</button></span>`).join('');
  qs('#prefill').classList.toggle('show', state.scanned && state.ingredients.length>0);
}
qs('#tags').addEventListener('click',e=>{ const r=e.target.closest('[data-rm]'); if(r){ state.ingredients.splice(+r.dataset.rm,1); renderTags(); }});
qs('#ingInput').addEventListener('keydown',e=>{
  if(e.key==='Enter' && e.target.value.trim()){ state.ingredients.push({em:'🥄',name:e.target.value.trim()}); e.target.value=''; renderTags(); }
});

/* scan */
const detections = [
  {em:'🍗',name:'Chicken breast',conf:96,x:70,y:330,w:96,h:84},
  {em:'🍅',name:'Tomatoes',conf:93,x:200,y:300,w:84,h:80},
  {em:'🧀',name:'Mozzarella',conf:88,x:120,y:440,w:86,h:78},
  {em:'🥚',name:'Eggs',conf:91,x:236,y:420,w:78,h:78},
  {em:'🌿',name:'Basil',conf:79,x:64,y:220,w:76,h:76},
  {em:'🍞',name:'Breadcrumbs?',conf:54,x:214,y:204,w:80,h:80,low:true},
];
let scanTimers=[];
function startScan(){
  scanTimers.forEach(clearTimeout); scanTimers=[];
  const f=qs('#foods'); f.innerHTML='';
  detections.forEach(d=>{
    f.insertAdjacentHTML('beforeend',`<div class="food" style="left:${d.x+d.w/2-30}px;top:${d.y+d.h/2-36}px">${d.em}</div><div class="det ${d.low?'low':''}" style="left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px"><span>${d.name.replace('?','')} ${d.conf}%</span></div>`);
  });
  qs('#scan').classList.add('scanning');
  qs('#scanCount').textContent='Looking for ingredients…';
  const boxes=qsa('#foods .det');
  boxes.forEach((b,i)=>scanTimers.push(setTimeout(()=>{
    b.classList.add('show');
    qs('#scanCount').textContent=`${i+1} ingredient${i?'s':''} detected`+(detections.slice(0,i+1).some(d=>d.low)?' · 1 needs a check':'');
    if(i===boxes.length-1) qs('#scan').classList.remove('scanning');
  },500+i*420)));
}
qs('#nextIng').onclick=()=>{ toast('Point at the next shelf or item'); };
qs('#scanDone').onclick=()=>go('verify');

/* verify */
let vstate=[];
function buildVerify(){
  vstate = detections.map(d=>({...d,name:d.name.replace('?',''),on:!d.low}));
  renderVerify();
}
function renderVerify(){
  qs('#vlist').innerHTML = vstate.map((d,i)=>`<div class="vitem ${d.on?'on':''} ${d.low?'low':''}" data-v="${i}">
    <span class="em">${d.em}</span><span class="nm">${d.name}<small>${d.low?'Not sure, '+d.conf+'% confident. Is this right?':d.conf+'% confident'}</small></span><span class="check">✓</span></div>`).join('');
}
qs('#vlist').addEventListener('click',e=>{ const v=e.target.closest('[data-v]'); if(v){ const d=vstate[+v.dataset.v]; d.on=!d.on; renderVerify(); }});
qs('#verifyContinue').onclick=()=>{
  state.ingredients = vstate.filter(d=>d.on).map(d=>({em:d.em,name:d.name}));
  state.scanned=true; renderTags(); go('generate', true);
  if(!qs('#chefPick .chef.on')) {}
};

/* generate */
qs('#generateBtn').onclick=()=>{
  if(!state.ingredients.length){ toast('Add or scan at least one ingredient'); return; }
  go('brew');
};
function runBrew(){
  qs('#brewChef').textContent=state.chef;
  const steps=qsa('#brew .bstep'); steps.forEach(s=>s.classList.remove('done'));
  qsa('#brew .brew-steps')[0].querySelector('.bstep').innerHTML=`<b>✓</b><span>Reading your ${state.ingredients.length} ingredients</span>`;
  const s2=qsa('#brew .bstep');
  s2.forEach((s,i)=>setTimeout(()=>s.classList.add('done'),500+i*600));
  setTimeout(()=>{ if(current==='brew') go('recipe'); }, 3200);
}

/* recipe */
const chefStyles = {
  'Bobby Flay':{t:'Smoky Chicken Parm',note:"<b>Chef's touch:</b> Bobby Flay-style: char the tomatoes first for a smoky sauce, and finish with a pinch of chili flakes."},
  'Anthony Bourdain':{t:'Rustic Chicken Parm',note:"<b>Chef's touch:</b> Bourdain-style: no fuss. Tear the mozzarella by hand and serve it straight from the pan."},
  'Ina Garten':{t:'Classic Chicken Parm',note:"<b>Chef's touch:</b> Ina-style: use good olive oil and fresh basil, and keep it simple."}
};
function frac(x){ const w=Math.floor(x), r=Math.round((x-w)*4); const f=['','¼','½','¾'][r%4]; const W=w+(r===4?1:0); return (W?W+(f?' ':''):'')+f || '¼'; }
function buildRecipe(){
  const st=chefStyles[state.chef]||chefStyles['Bobby Flay'];
  const p=state.people, k=p/2;
  const has=n=>state.ingredients.some(x=>x.name.toLowerCase().includes(n));
  qs('#rTitle').textContent = state.noOven ? st.t.replace('Chicken Parm','Skillet Chicken Parm') : st.t;
  qs('#rBadge').textContent='Inspired by '+state.chef;
  qs('#rServ').textContent=p;
  qs('#rTime').textContent= state.noOven?'35 min':'45 min';
  qs('#rSub').textContent = state.noOven ? 'Stovetop version, no oven needed. Crispy cutlets simmered in sauce under a lid to melt the cheese.' : `Crispy cutlets, charred-tomato sauce and melted mozzarella. Built from the ${state.ingredients.length} ingredients you scanned.`;
  const ings=[
    ['Chicken breast', `${(k*2)|0} breasts (~${Math.round(k*16)} oz)`],
    ['Tomatoes', `${Math.round(k*4)} medium`],
    ['Mozzarella', `${Math.round(k*4)} oz`],
    ['Eggs', `${Math.max(1,Math.round(k*1))} large`],
    ['Basil', `${Math.round(k*6)} leaves`],
    [has('bread')?'Breadcrumbs':'Crushed crackers', frac(k*0.5)+' cup'],
    ['Olive oil, salt, pepper','pantry'],
  ];
  qs('#rIngs').innerHTML = ings.map((x,i)=>`<li class="${i===5&&!has('bread')?'sub':''}"><span>${x[0]}${i===5&&!has('bread')?' <small>(swap)</small>':''}</span><span>${x[1]}</span></li>`).join('');
  const steps = state.noOven ? [
    'Pound chicken to ½ inch. Dip in beaten egg, then crumbs.',
    'Char halved tomatoes in a dry skillet 4 min, then crush into a quick sauce with salt and basil.',
    'Pan-fry cutlets in olive oil, 4–5 min per side, until golden.',
    'Nestle cutlets into the sauce, top with mozzarella and <b>cover with a lid 3–4 min</b> to melt. No oven needed.',
    'Check that the chicken reaches 165°F, then serve with torn basil.'
  ] : [
    'Heat oven to 425°F. Pound chicken to ½ inch.',
    'Dip chicken in beaten egg, then crumbs. Pan-fry 3 min per side.',
    'Char halved tomatoes in a hot skillet, then crush into a sauce with basil.',
    'Top cutlets with sauce and mozzarella. Bake 12–15 min until bubbling.',
    'Check that the chicken reaches 165°F, then finish with fresh basil.'
  ];
  qs('#rSteps').innerHTML = steps.map((s,i)=>`<li class="${state.noOven&&(i===2||i===3)?'changed':''}"><b>${i+1}</b><span>${s}</span></li>`).join('');
  qs('#rNote').innerHTML = st.note;
}
qs('#saveBtn').onclick=()=>{
  if(!state.saved){
    state.saved=true;
    qs('#pastMeals').insertAdjacentHTML('afterbegin',`<div class="meal new"><div class="ph" style="background:#F6D2C2">🍗</div><div class="t">${qs('#rTitle').textContent}<small>${state.chef} style · just now</small></div></div>`);
  }
  toast('Saved to Past Meals'); setTimeout(()=>go('home',true),900);
};
qs('#customizeBtn').onclick=()=>go('chat');

/* chat */
let chatOpened=false;
function addMsg(who, html){
  const m=qs('#msgs');
  m.insertAdjacentHTML('beforeend', who==='bot'
    ? `<div style="align-self:flex-start;max-width:84%"><p class="who">Chef AI</p><div class="msg bot">${html}</div></div>`
    : `<div style="align-self:flex-end;max-width:84%;display:flex;flex-direction:column;align-items:flex-end"><p class="who">Me</p><div class="msg me">${html}</div></div>`);
  m.scrollTop=m.scrollHeight;
}
function openChat(){
  if(chatOpened) return; chatOpened=true;
  addMsg('bot', `Here's your recipe: <b>${qs('#rTitle').textContent}</b> for ${state.people}, ${state.chef} style.<ul><li>Crumb-coated cutlets</li><li>Charred-tomato sauce</li><li>Melted mozzarella</li></ul><p style="margin-top:6px">Want me to change anything? Ingredients, tools, time or flavor.</p>`);
}
const replies = [
  {k:['oven'], r:()=>{ state.noOven=true; buildRecipe(); return `No problem. Here's a <b>stovetop version</b>:<ul><li>Pan-fry the cutlets instead of baking them</li><li>Simmer them in the tomato sauce</li><li>Cover with a lid 3–4 min to melt the mozzarella</li></ul><p class="mini">✓ Recipe updated · cook time now 35 min</p>`; }},
  {k:['dairy'], r:()=>`Swap mozzarella for a dairy-free shred, or skip the cheese and add extra basil and a drizzle of olive oil. <p class="mini">✓ Allergen note updated</p>`},
  {k:['spic','hot'], r:()=>`Add ½ tsp chili flakes to the sauce and a pinch of cayenne to the crumbs. That fits ${state.chef}'s style too.<p class="mini">✓ Recipe updated</p>`},
  {k:['bread','crumb','instead'], r:()=>`Crushed crackers, panko, or finely grated parmesan all work. For gluten-free, use crushed rice cereal.`},
];
function botReply(q){
  const m=qs('#msgs');
  m.insertAdjacentHTML('beforeend','<div class="msg bot typing" id="typing"><i></i><i></i><i></i></div>'); m.scrollTop=m.scrollHeight;
  setTimeout(()=>{
    qs('#typing')?.remove();
    const hit=replies.find(x=>x.k.some(k=>q.toLowerCase().includes(k)));
    addMsg('bot', hit?hit.r():`Good question. I'd adjust the recipe for that. (This prototype has scripted answers; the full version sends this to our LLM/RAG model.)`);
  },1400);
}
function send(q){ if(!q.trim()) return; addMsg('me', q); qs('#chatInput').value=''; botReply(q); }
qs('#quick').addEventListener('click',e=>{ const c=e.target.closest('[data-q]'); if(c) send(c.dataset.q); });
qs('#sendBtn').onclick=()=>send(qs('#chatInput').value);
qs('#chatInput').addEventListener('keydown',e=>{ if(e.key==='Enter') send(e.target.value); });

/* ---------- auto demo ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const caps=[
  ['Launch','A friendly entry point','Chef AI opens with a clear signifier: one Start button and a chef mascot that sets the tone.'],
  ['Main page','Start a meal or revisit one','The home screen shows Generate Meal, past meals and chefs to draw inspiration from.'],
  ['Generate Meal','Tell the AI what you have','Users type ingredients or tap the camera, pick a chef, and set meal type, difficulty, servings, diet and equipment.'],
  ['Image recognition','Scan the fridge or pantry','Computer vision detects ingredients and shows a confidence score for each one. Low-confidence items are flagged instead of guessed.'],
  ['Human in the loop','Verify before generating','Users confirm or fix what the AI saw. This handles exceptions before they turn into a bad recipe.'],
  ['Generate','Preferences pre-filled','Confirmed ingredients drop back into the form automatically. Pick a chef and hit Generate.'],
  ['LLM / RAG','Brewing up your recipe','The model draws on curated recipe sources and the chef\'s style. Progress steps give feedback while it works.'],
  ['Result','A recipe tailored to you','Cook time, scaled measurements, steps, a chef\'s touch, and an AI disclosure with allergen and food-safety notes.'],
  ['Chatbot','Refine it in conversation','"I don\'t want to use the oven." The chatbot rewrites the recipe for the stovetop and updates it live.'],
  ['Save','Back to the main page','The meal is saved to Past Meals so it can be cooked again.'],
];
function setCap(i){
  const c=caps[i]; const el=qs('#cap');
  el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim');
  el.innerHTML=`<p class="n">${String(i+1).padStart(2,'0')} · ${c[0]}</p><h2>${c[1]}</h2><p>${c[2]}</p>`;
  qsa('#prog i').forEach((p,j)=>p.classList.toggle('on',j<=i));
}
const cur=qs('#cursor');
async function tap(sel, wait=650){
  const el=typeof sel==='string'?qs(sel):sel;
  el.scrollIntoView({block:'nearest'}); await sleep(250);
  const r=el.getBoundingClientRect();
  cur.style.left=(r.left+r.width/2)+'px'; cur.style.top=(r.top+r.height/2)+'px';
  await sleep(600);
  cur.classList.remove('tap'); void cur.offsetWidth; cur.classList.add('tap');
  el.click(); await sleep(wait);
}
async function scrollScreen(id, to, ms=1200){
  const s=qs('#'+id); const start=s.scrollTop; const end= to==='bottom'? s.scrollHeight : to; const t0=performance.now();
  return new Promise(res=>{ (function f(t){ const k=Math.min(1,(t-t0)/ms); const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; s.scrollTop=start+(end-start)*e; k<1?requestAnimationFrame(f):res(); })(t0); });
}
async function typeInto(sel, text){
  const el=qs(sel); for(const ch of text){ el.value+=ch; await sleep(55); }
}
async function demo(){
  document.body.classList.add('demo');
  qs('#prog').innerHTML=caps.map(()=>'<i></i>').join('');
  cur.style.left='75vw'; cur.style.top='80vh';
  await sleep(600);
  setCap(0); await sleep(2600);
  await tap('#startBtn', 400);
  setCap(1); await sleep(2800);
  await tap('#genMealBtn', 500);
  setCap(2); await sleep(1800);
  await tap('#camBtn', 300);
  setCap(3); await sleep(4400);
  await tap('#scanDone', 500);
  setCap(4); await sleep(1500);
  await tap('#vlist .vitem.low', 900);
  await tap('#verifyContinue', 500);
  setCap(5); await sleep(1200);
  await tap('#chefPick .chef[data-chef="Bobby Flay"]', 500);
  await scrollScreen('generate', 330, 1100);
  await tap('#diffChips .chip:nth-child(1)', 300);
  await tap('#plus', 400);
  await scrollScreen('generate','bottom',1000);
  await tap('#generateBtn', 200);
  setCap(6); await sleep(3400);
  setCap(7); await sleep(1500);
  await scrollScreen('recipe', 560, 2200); await sleep(1200);
  await scrollScreen('recipe','bottom',1600); await sleep(1000);
  await tap('#customizeBtn', 1400);
  setCap(8);
  await tap('#chatInput', 200);
  await typeInto('#chatInput', "I don't want to use the oven. Modify the recipe.");
  await sleep(300);
  await tap('#sendBtn', 3600);
  await tap('#chat .topbar .iconbtn', 800);
  await scrollScreen('recipe', 520, 1400); await sleep(1800);
  setCap(9);
  await scrollScreen('recipe','bottom',900);
  await tap('#saveBtn', 2400);
  await sleep(1500);
  window.__demoDone=true;
}


if(location.hash==='#demo' || new URLSearchParams(location.search).has('demo')) window.addEventListener('load',()=>setTimeout(demo,300));

/* Past meals horizontal scroll buttons */
qs('#pastLeft').onclick = () => qs('#pastMeals').scrollBy({ left: -150, behavior: 'smooth' });
qs('#pastRight').onclick = () => qs('#pastMeals').scrollBy({ left: 150, behavior: 'smooth' });