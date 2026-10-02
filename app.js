var CLASSES=[
  {id:'ps',nom:'PS',titre:'Petite Section',age:'Élèves de 3 ans'},
  {id:'ms',nom:'MS',titre:'Moyenne Section',age:'Élèves de 4 ans'},
  {id:'gs',nom:'GS',titre:'Grande Section',age:'Élèves de 5 ans'},
  {id:'cp',nom:'CP',titre:'Cours Préparatoire',age:'Élèves de 6 ans'},
  {id:'ce1',nom:'CE1',titre:'Cours Élémentaire 1',age:'Élèves de 7 ans'}
];
var LS='rassiyan-v2',students={},cur='ps',q='',db=null,photo='';
try{var sv=JSON.parse(localStorage.getItem(LS)||'null');if(sv&&typeof sv==='object')students=sv}catch(e){}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(students))}catch(e){}}
function uid(){return 'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function fmt(d){if(!d)return '';var p=d.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d}
function ini(n){return String(n).split(' ').slice(0,2).map(function(w){return w.charAt(0).toUpperCase()}).join('')}
function okImg(s){return typeof s==='string'&&s.indexOf('data:image/')===0}
function cls(id){return CLASSES.filter(function(c){return c.id===id})[0]||CLASSES[0]}
function avatar(s,big){
  var c='av'+(s.sexe==='F'?' g':'')+(big?' big':'');
  return okImg(s.photo)?'<img class="'+c+'" alt="" src="'+s.photo+'">':'<span class="'+c+'">'+esc(ini(s.nom))+'</span>';
}
function list(){
  return Object.keys(students).map(function(k){var o=Object.assign({},students[k]);o.id=k;return o})
    .filter(function(s){return s.classe===cur}).sort(function(a,b){return a.nom.localeCompare(b.nom)});
}
function setMode(shared){
  document.getElementById('mode').textContent=shared?'Fiches enregistrées en ligne et partagées avec le personnel autorisé.':'Fiches enregistrées sur cet appareil uniquement.';
}
function persist(id,obj){
  var prev=students[id];students[id]=obj;
  if(db){return db.collection('eleves').doc(id).set(obj).then(function(){return true},function(){
    if(prev)students[id]=prev;else delete students[id];
    showErr("Enregistrement impossible : vous n'avez pas les droits d'écriture.");return false})}
  saveLocal();return Promise.resolve(true);
}
function remove(id){
  if(db){db.collection('eleves').doc(id).delete().catch(function(){})}
  else{delete students[id];saveLocal();render()}
}

var tabs=document.getElementById('tabs'),panel=document.getElementById('panel'),dlg=document.getElementById('dlg');
function render(){
  if(!role){tabs.innerHTML='';panel.innerHTML=lockHtml();bindLock();return}
  tabs.innerHTML='';
  CLASSES.forEach(function(c){
    var b=document.createElement('button');b.className='tab';b.setAttribute('role','tab');
    b.setAttribute('aria-selected',c.id===cur);b.textContent=c.nom;
    b.onclick=function(){cur=c.id;q='';render()};tabs.appendChild(b);
  });
  var c=cls(cur),all=list();
  var f=all.filter(function(s){return s.nom.toLowerCase().indexOf(q.toLowerCase())>-1});
  var fi=all.filter(function(s){return s.sexe==='F'}).length;
  var cards=f.map(function(s){
    return '<button class="st" data-open="'+esc(s.id)+'">'+avatar(s)+'<span><b>'+esc(s.nom)+'</b><small>'+(s.sexe==='F'?'Fille':'Garçon')+(s.naissance?' · né(e) le '+fmt(s.naissance):'')+'</small></span></button>';
  }).join('');
  panel.innerHTML='<h3>'+c.nom+' — '+c.titre+'</h3><p class="age">'+c.age+'</p>'+
    '<div class="stats"><div class="stat"><b>'+all.length+'</b>Élèves</div><div class="stat"><b>'+fi+'</b>Filles</div><div class="stat"><b>'+(all.length-fi)+'</b>Garçons</div></div>'+
    '<div class="tools"><input type="search" id="q" placeholder="Rechercher un élève" value="'+esc(q)+'">'+(role==='admin'?'<button class="add" id="new">Inscrire un élève</button>':'')+'</div>'+
    (f.length?'<div class="grid">'+cards+'</div>':'<p class="empty">'+(all.length?'Aucun élève ne correspond à cette recherche.':'Aucun élève inscrit en '+c.nom+'. Utilisez « Inscrire un élève » pour créer la première fiche.')+'</p>');
  var qi=document.getElementById('q');
  qi.oninput=function(){q=qi.value;var p=qi.selectionStart;render();var n=document.getElementById('q');n.focus();n.setSelectionRange(p,p)};
  var nb=document.getElementById('new');if(nb)nb.onclick=function(){openForm()};
  panel.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){openFiche(b.dataset.open)}});
}

function telDigits(n){return String(n||'').replace(/[^0-9+]/g,'')}
function wa(n){var d=String(n||'').replace(/\D/g,'');if(d.length===8)d='253'+d;return d.length>=9?'https://wa.me/'+d:''}
function age(d){if(!d)return '';var b=new Date(d),n=new Date();if(isNaN(b))return '';var a=n.getFullYear()-b.getFullYear(),m=n.getMonth()-b.getMonth();if(m<0||(m===0&&n.getDate()<b.getDate()))a--;return a>=0?a+' ans':''}
function show(){try{if(!dlg.open)dlg.showModal()}catch(e){dlg.setAttribute('open','')}}
function showErr(m){var e=document.getElementById('err');if(e)e.textContent=m}
function ic(icon,label,val,c){return '<div class="ic '+(c||'')+'"><span class="ico">'+icon+'</span><div><small>'+label+'</small><b>'+val+'</b></div></div>'}
function contact(label,nom,t,c){
  var d=telDigits(t);
  return '<div class="ct '+c+'"><small>'+label+'</small><b>'+(esc(nom)||'Non renseigné')+'</b>'+(d?'<a class="call" href="tel:'+d+'">📞 '+esc(t)+'</a>':'<span class="nc">Numéro non renseigné</span>')+'</div>';
}
function openFiche(id){
  var s=students[id];if(!s)return;var c=cls(s.classe),a=age(s.naissance),w=wa(s.wa);
  var pic=okImg(s.photo)?'<img class="pic" alt="Photo de '+esc(s.nom)+'" src="'+s.photo+'">':'<span class="pic ini">'+esc(ini(s.nom))+'</span>';
  dlg.className='sheet';
  dlg.innerHTML='<div class="fx"><div class="hd">'+pic+'<span class="tag">Cahier de correspondance · 2026/2027</span><h3>'+esc(s.nom)+'</h3>'+
    '<div class="chips"><span>'+c.nom+' — '+c.titre+'</span>'+(a?'<span>'+a+'</span>':'')+'<span>'+(s.sexe==='F'?'Fille':'Garçon')+'</span></div></div>'+
    '<div class="bd"><div class="ig">'+ic('🎂','Date de naissance',fmt(s.naissance)||'Non renseignée')+ic('📚','Classe',c.nom+' — '+c.titre)+
    ic('💬','WhatsApp pour le suivi des cours',w?'<a href="'+w+'" target="_blank" rel="noopener">'+esc(s.wa)+'</a>':(esc(s.wa)||'Non renseigné'),'full')+
    ic('🩺','Informations médicales importantes',s.sante?'<span class="med">'+esc(s.sante)+'</span>':'Non renseigné','full warm')+'</div></div>'+
    '<div class="ctw"><h4>Contacts des parents</h4><div class="cg">'+contact('Père / tuteur',s.p1nom,s.p1tel,'b')+contact('Mère / tutrice',s.p2nom,s.p2tel,'g')+'</div>'+
    '<div class="acts">'+(role==='admin'?'<button class="add" id="ed">Modifier</button><button class="b2" id="rm">Supprimer</button>':'')+'<button class="b2" id="cl">Fermer</button></div></div></div>';
  var ed=document.getElementById('ed');if(ed)ed.onclick=function(){openForm(id)};
  var rm=document.getElementById('rm');
  if(rm)rm.onclick=function(){
    if(rm.dataset.sure){remove(id);dlg.close()}
    else{rm.dataset.sure='1';rm.textContent='Confirmer la suppression';rm.className='b2 danger'}
  };
  document.getElementById('cl').onclick=function(){dlg.close()};
  show();
}
function prev(){return okImg(photo)?'<img class="up-img" alt="" src="'+photo+'">':'<span class="up-ph">📷</span>'}
function openForm(id){
  var s=id?students[id]:{classe:cur,sexe:'F'};photo=s.photo||'';
  function v(k){return esc(s[k])}
  dlg.className='sheet';
  dlg.innerHTML='<form class="fm" id="ff" novalidate><div class="fmh"><h3>'+(id?'Modifier la fiche':'Inscrire un élève')+'</h3><p>Cahier de correspondance · année scolaire 2026/2027</p></div><div class="fmb">'+
    '<label class="up" for="pf"><span id="pv">'+prev()+'</span><span><b>Photo de l\'élève</b><small>Touchez pour choisir une image PNG ou JPEG</small></span></label><input type="file" id="pf" accept="image/png,image/jpeg" hidden>'+
    '<div class="fg"><label class="w2">Nom et prénom de l\'élève<input name="nom" required value="'+v('nom')+'"></label>'+
    '<label>Date de naissance<input type="date" name="naissance" value="'+v('naissance')+'"></label>'+
    '<label>Sexe<select name="sexe"><option value="F"'+(s.sexe==='F'?' selected':'')+'>Fille</option><option value="G"'+(s.sexe==='G'?' selected':'')+'>Garçon</option></select></label>'+
    '<label class="w2">Classe<select name="classe">'+CLASSES.map(function(c){return '<option value="'+c.id+'"'+(c.id===s.classe?' selected':'')+'>'+c.nom+' — '+c.titre+'</option>'}).join('')+'</select></label>'+
    '<label>Nom du père / tuteur<input name="p1nom" value="'+v('p1nom')+'"></label><label>Téléphone du père<input type="tel" name="p1tel" value="'+v('p1tel')+'"></label>'+
    '<label>Nom de la mère / tutrice<input name="p2nom" value="'+v('p2nom')+'"></label><label>Téléphone de la mère<input type="tel" name="p2tel" value="'+v('p2tel')+'"></label>'+
    '<label class="w2">WhatsApp pour le suivi des cours<input type="tel" name="wa" value="'+v('wa')+'"></label></div>'+
    '<label>Informations médicales importantes<textarea name="sante" rows="3">'+v('sante')+'</textarea></label>'+
    '<p class="err" id="err" role="alert"></p>'+
    '<div class="acts"><button class="add" type="submit">Enregistrer la fiche</button><button class="b2" type="button" id="cn">Annuler</button></div></div></form>';
  document.getElementById('cn').onclick=function(){id?openFiche(id):dlg.close()};
  document.getElementById('pf').onchange=function(e){
    var f=e.target.files[0];if(!f)return;
    if(f.type!=='image/png'&&f.type!=='image/jpeg'){showErr('Format non accepté : choisissez une image PNG ou JPEG.');return}
    showErr('');var r=new FileReader();
    r.onload=function(){var im=new Image();
      im.onerror=function(){showErr("Cette image n'a pas pu être lue.")};
      im.onload=function(){
        var k=Math.min(1,420/Math.max(im.width,im.height)),cv=document.createElement('canvas'),x;
        cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);x=cv.getContext('2d');
        x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);x.drawImage(im,0,0,cv.width,cv.height);
        photo=cv.toDataURL('image/jpeg',0.82);document.getElementById('pv').innerHTML=prev();
      };im.src=r.result};
    r.readAsDataURL(f);
  };
  document.getElementById('ff').onsubmit=function(e){
    e.preventDefault();var fd=new FormData(e.target),o={photo:photo};
    ['nom','sexe','naissance','classe','p1nom','p1tel','p2nom','p2tel','wa','sante'].forEach(function(k){o[k]=String(fd.get(k)||'').trim()});
    if(!o.nom){showErr("Indiquez le nom et prénom de l'élève.");return}
    if(!photo){showErr("Ajoutez la photo de l'élève (PNG ou JPEG).");return}
    var nid=id||uid();cur=o.classe;
    persist(nid,o).then(function(ok){if(ok){render();openFiche(nid)}});
  };
  show();
}

