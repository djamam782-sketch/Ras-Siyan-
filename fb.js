// Firebase : connexion, rôles (administrateur / lecteur) et approbation des enseignants
var ADMIN='djamam782@gmail.com',role=null,wait='',me=null,ready=false,busy=false,unsub=[],reqs=[],amode='login';
firebase.initializeApp({apiKey:"AIzaSyBKqHpLpy0I1_U-zpCha3KsmBwZX0aaO-M",authDomain:"ras-siyan.firebaseapp.com",projectId:"ras-siyan",storageBucket:"ras-siyan.firebasestorage.app",messagingSenderId:"989614745034",appId:"1:989614745034:web:ffc9f592f5cefcc9099b33"});
var auth=firebase.auth(),fs=firebase.firestore(),adlg=document.getElementById('adlg');
students={};
document.getElementById('mode').textContent='Fiches enregistrées en ligne, accès protégé par connexion.';

function persist(id,obj){
  var prev=students[id];students[id]=obj;
  return fs.collection('eleves').doc(id).set(obj).then(function(){return true},function(){
    if(prev)students[id]=prev;else delete students[id];
    showErr("Enregistrement refusé : seul l'administrateur peut ajouter ou modifier.");return false});
}
function remove(id){fs.collection('eleves').doc(id).delete().catch(function(){})}

function msg(e){
  var c=e&&e.code||'';
  if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c))return 'E-mail ou mot de passe incorrect.';
  if(c==='auth/email-already-in-use')return 'Cette adresse e-mail a déjà un compte. Utilisez « Connexion ».';
  if(c==='auth/weak-password')return 'Mot de passe trop court (8 caractères minimum).';
  if(c==='auth/invalid-email')return 'Adresse e-mail invalide.';
  if(c==='auth/network-request-failed')return 'Pas de connexion internet.';
  if(c==='auth/too-many-requests')return 'Trop de tentatives, réessayez dans quelques minutes.';
  return 'Une erreur est survenue ('+(c||'inconnue')+').';
}
function aerr(m){var e=document.getElementById('aerr');if(e)e.textContent=m}
function openA(){try{if(!adlg.open)adlg.showModal()}catch(e){adlg.setAttribute('open','')}}

function lockHtml(){
  if(!ready)return '<p class="empty">Chargement…</p>';
  if(!me)return '<div class="lock"><h3>Espace réservé au personnel</h3><p>Connectez-vous pour consulter les fiches des élèves.</p><button class="add" id="lg">Connexion</button></div>';
  var t={en_attente:['Demande envoyée','Votre compte a bien été créé. L\'administrateur doit approuver votre accès avant que vous puissiez voir les fiches.'],
    refuse:['Accès refusé','L\'administrateur n\'a pas autorisé ce compte.'],erreur:['Chargement impossible','Les fiches n\'ont pas pu être chargées. Vérifiez votre connexion puis réessayez.']}[wait]||['Vérification…',''];
  return '<div class="lock"><h3>'+t[0]+'</h3><p>'+t[1]+'</p><div class="acts" style="justify-content:center"><button class="add" id="rf">Actualiser</button><button class="b2" id="lo">Déconnexion</button></div></div>';
}
function bindLock(){
  var a=document.getElementById('lg'),b=document.getElementById('rf'),c=document.getElementById('lo');
  if(a)a.onclick=function(){amode='login';authForm()};
  if(b)b.onclick=function(){start(auth.currentUser)};
  if(c)c.onclick=function(){auth.signOut()};
}
function navAuth(){
  var n=document.getElementById('navauth'),np=reqs.filter(function(r){return r.statut==='en_attente'}).length;
  if(!me){n.innerHTML='<button class="add" id="nl">Connexion</button>';document.getElementById('nl').onclick=function(){amode='login';authForm()};return}
  n.innerHTML=(role==='admin'?'<button class="b2" id="nr">Accès'+(np?' ('+np+')':'')+'</button> ':'')+'<button class="b2" id="no">Déconnexion</button>';
  var r=document.getElementById('nr');if(r)r.onclick=reqPanel;
  document.getElementById('no').onclick=function(){auth.signOut()};
}

function authForm(){
  var lg=amode==='login';
  adlg.className='sheet';
  adlg.innerHTML='<form class="fm" id="af" novalidate><div class="fmh"><h3>'+(lg?'Connexion':'Créer un compte enseignant')+'</h3><p>Espace réservé au personnel de l\'école</p></div><div class="fmb">'+
    (lg?'':'<label>Nom complet<input name="nom" autocomplete="name"></label>')+
    '<label>Adresse e-mail<input type="email" name="email" autocomplete="email"></label>'+
    '<label>Mot de passe'+(lg?'':' (8 caractères minimum)')+'<input type="password" name="pw" autocomplete="'+(lg?'current-password':'new-password')+'"></label>'+
    (lg?'':'<p class="age">Après la création du compte, l\'administrateur doit approuver votre accès.</p>')+
    '<p class="err" id="aerr" role="alert"></p><div class="acts"><button class="add" type="submit">'+(lg?'Se connecter':'Envoyer ma demande')+'</button>'+
    '<button class="b2" type="button" id="sw">'+(lg?'Créer un compte':'J\'ai déjà un compte')+'</button>'+(lg?'<button class="b2" type="button" id="fg">Mot de passe oublié</button>':'')+
    '<button class="b2" type="button" id="ax">Fermer</button></div></div></form>';
  var f=document.getElementById('af');
  document.getElementById('sw').onclick=function(){amode=lg?'signup':'login';authForm()};
  document.getElementById('ax').onclick=function(){adlg.close()};
  var fg=document.getElementById('fg');
  if(fg)fg.onclick=function(){
    var m=f.elements.email.value.trim();if(!m){aerr("Saisissez d'abord votre adresse e-mail.");return}
    auth.sendPasswordResetEmail(m).then(function(){aerr('E-mail de réinitialisation envoyé à '+m+'.')},function(e){aerr(msg(e))});
  };
  f.onsubmit=function(e){
    e.preventDefault();var el=f.elements,m=el.email.value.trim(),p=el.pw.value;aerr('');
    if(!m||!p){aerr('Saisissez votre e-mail et votre mot de passe.');return}
    if(lg){auth.signInWithEmailAndPassword(m,p).catch(function(x){aerr(msg(x))});return}
    var nom=el.nom.value.trim();if(!nom){aerr('Saisissez votre nom complet.');return}
    if(p.length<8){aerr(msg({code:'auth/weak-password'}));return}
    busy=true;
    auth.createUserWithEmailAndPassword(m,p).then(function(c){
      return fs.collection('acces').doc(c.user.uid).set({nom:nom,email:m,statut:'en_attente',date:new Date().toISOString()}).then(function(){busy=false;start(c.user)});
    }).catch(function(x){busy=false;aerr(msg(x));if(auth.currentUser)start(auth.currentUser)});
  };
  openA();
}

function reqPanel(){
  amode='req';adlg.className='sheet';
  var ord={en_attente:0,approuve:1,refuse:2},l=reqs.slice().sort(function(a,b){return ord[a.statut]-ord[b.statut]});
  var lab={en_attente:'En attente',approuve:'Approuvé',refuse:'Refusé'};
  adlg.innerHTML='<div class="fm"><div class="fmh"><h3>Accès des enseignants</h3><p>Approuvez les comptes qui peuvent consulter les fiches.</p></div><div class="fmb">'+
    (l.length?l.map(function(r){
      return '<div class="rq"><div><b>'+esc(r.nom||'Sans nom')+'</b><small>'+esc(r.email)+' · <span class="bdg">'+lab[r.statut]+'</span></small></div><div class="acts">'+
        (r.statut!=='approuve'?'<button class="add" data-s="approuve" data-u="'+esc(r.uid)+'">Approuver</button>':'')+
        (r.statut!=='refuse'?'<button class="b2" data-s="refuse" data-u="'+esc(r.uid)+'">'+(r.statut==='approuve'?'Retirer l\'accès':'Refuser')+'</button>':'')+'</div></div>';
    }).join(''):'<p class="empty">Aucune demande pour le moment.</p>')+
    '<div class="acts"><button class="b2" id="ax">Fermer</button></div></div></div>';
  document.getElementById('ax').onclick=function(){adlg.close()};
  adlg.querySelectorAll('[data-u]').forEach(function(b){b.onclick=function(){fs.collection('acces').doc(b.dataset.u).update({statut:b.dataset.s}).catch(function(){})}});
  openA();
}

function listen(){
  unsub.push(fs.collection('eleves').onSnapshot(function(sn){var o={};sn.forEach(function(x){o[x.id]=x.data()});students=o;render()},function(){role=null;wait='erreur';render()}));
}
function listenReq(){
  unsub.push(fs.collection('acces').onSnapshot(function(sn){
    reqs=[];sn.forEach(function(x){var d=x.data();d.uid=x.id;reqs.push(d)});navAuth();
    if(adlg.open&&amode==='req')reqPanel();
  }));
}
function start(u){
  unsub.forEach(function(f){f()});unsub=[];role=null;wait='';me=u;reqs=[];students={};ready=true;navAuth();
  if(adlg.open&&amode!=='req'&&u)adlg.close();
  if(!u){render();return}
  if(String(u.email).toLowerCase()===ADMIN){role='admin';listen();listenReq();navAuth();render();return}
  var ref=fs.collection('acces').doc(u.uid);
  ref.get().then(function(d){
    if(d.exists)return d.data().statut;
    return ref.set({nom:u.displayName||'',email:u.email,statut:'en_attente',date:new Date().toISOString()}).then(function(){return 'en_attente'});
  }).then(function(st){
    if(st==='approuve'){role='lecteur';listen()}else wait=st||'en_attente';
    navAuth();render();
  }).catch(function(){wait='erreur';render()});
}
auth.onAuthStateChanged(function(u){if(!busy)start(u)});
render();
