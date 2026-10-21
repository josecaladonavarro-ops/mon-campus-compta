/* Progression formative locale. Aucune note de PEC attribuée automatiquement. */
(() => {
  'use strict';
  const C = window.CAMPUS_CONTENT, KEY = 'campus_m1_v2';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const blank = () => ({version:2,done:[],checks:{},notes:{},td:{},quiz:null,quizDraft:[],active:0});
  let storageOK = true, restoring = false, state = blank();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.version === 2) {
      state.done = Array.isArray(raw.done) ? [...new Set(raw.done.filter(i => Number.isInteger(i) && i >= 0 && i < 6))] : [];
      for (const k of ['checks','notes','td']) if (raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k])) state[k] = raw[k];
      if (raw.quiz && Array.isArray(raw.quiz.answers) && raw.quiz.answers.length === C.quiz.length) state.quiz = raw.quiz;
      if (Array.isArray(raw.quizDraft) && raw.quizDraft.length === C.quiz.length) state.quizDraft = raw.quizDraft;
      state.active = Number.isInteger(raw.active) && raw.active >= 0 && raw.active < 6 ? raw.active : 0;
    }
  } catch (_) { storageOK = false; }
  // Les anciens brouillons PEC sont repris dans leur page, sans marquer le cours accompli.
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; }
    catch (_) { storageOK = false; }
    status();
  }
  function status() { if ($('storage-status')) $('storage-status').textContent = storageOK ? 'Progression sauvegardée dans ce navigateur. Exportez une sauvegarde pour changer d’appareil.' : 'Sauvegarde locale indisponible : gardez cette page ouverte et exportez votre travail.'; }
  const allowed = i => i >= 0 && i < 6 && (i === 0 || Array.from({length:i},(_,n)=>n).every(n=>state.done.includes(n)));
  function scoreQuiz(answers) { return C.quiz.reduce((n,q,i)=>n+(answers[i]===q.answer?1:0),0); }
  // Normaliser les données restaurées sans leur attribuer de validation pédagogique.
  state.done = state.done.filter(i => i < 5 ? state.checks[i] === true : state.quiz && scoreQuiz(state.quiz.answers) / C.quiz.length >= .7);
  if (!allowed(state.active)) state.active = 0;
  function updateProgress() {
    const done=state.done.length;
    if ($('bar')) $('bar').style.width = `${done/6*100}%`;
    if ($('count')) $('count').textContent = `${done} / 6 séquences terminées`;
    if ($('td-count')) $('td-count').textContent = `${C.td.filter((_,i)=>state.td[i]?.passed).length} / 10 contrôles de TD réussis`;
    if ($('unlock')) $('unlock').textContent = done===6 ? 'Parcours d’autoévaluation terminé. PEC à faire corriger séparément. Module 02 en préparation.' : 'Module 02 en préparation. Le quiz ne note pas votre PEC écrite.';
    status();
  }
  function options(q,name,value) {
    if ('number' in q) return `<label for="${name}">Montant en euros</label><input id="${name}" name="${name}" inputmode="decimal" autocomplete="off" value="${esc(value ?? '')}" placeholder="Ex. 12 000,50">`;
    return q.options.map((v,j)=>`<label class="choice"><input type="radio" name="${name}" value="${j}" ${String(value)===String(j)?'checked':''}> ${esc(v)}</label>`).join('');
  }
  function numeric(value) {
    const text=String(value).trim().replace(/[\s\u00a0\u202f€]/g,'').replace(',','.');
    return text !== '' && /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
  }
  function answerFrom(q,name) { return 'number' in q ? document.querySelector(`[name="${name}"]`)?.value : document.querySelector(`[name="${name}"]:checked`)?.value; }
  function correct(q,value) { return 'number' in q ? Math.abs(numeric(value)-q.number)<.005 : value!==undefined && Number(value)===q.answer; }
  function attempted(q,value) { return 'number' in q ? Number.isFinite(numeric(value)) : value !== undefined; }
  let quizDraft=state.quizDraft.length ? state.quizDraft.slice() : state.quiz?.answers?.slice() || [];
  function renderLesson() {
    const i=state.active, c=C.chapters[i];
    $('nav').innerHTML=C.chapters.map((x,j)=>`<button type="button" data-lesson="${j}" ${allowed(j)?'':'disabled'} ${j===i?'aria-current="step"':''}>${state.done.includes(j)?'✓ ':''}${j+1}. ${esc(x.title)}${allowed(j)?'':' · Verrouillé'}</button>`).join('');
    $('nav').querySelectorAll('button').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.lesson)));
    $('lesson').innerHTML=`<p class="eyebrow">SÉQUENCE ${i+1} / 6</p><h2 tabindex="-1" id="lesson-heading">${esc(c.title)}</h2><p class="muted">${esc(c.duration)}</p><p class="note"><strong>Objectif :</strong> ${esc(c.objectives)}</p>${c.body}<p><a href="module-01-tome.html#chapitre-${i+1}">Relire dans le manuel</a> · <a href="module-01-td.html">Ouvrir le cahier de TD</a></p>${i<5?`<section class="question" aria-labelledby="check-title"><h3 id="check-title">Vérifier ma compréhension</h3><p>${esc(c.check.q)}</p>${options(c.check,'checkpoint')}<button type="button" id="check-answer">Vérifier ma réponse</button><p id="check-feedback" role="status">${state.checks[i]?'Contrôle déjà réussi. Vous pouvez terminer cette séquence.':''}</p></section>`:`<p><a class="btn" href="module-01-pec-interactive.html">Rédiger la PEC 01 →</a></p><form id="quiz-form"><h3>Quiz final — 12 questions</h3><p>Répondez à toutes les questions. Minimum : 9/12. Les réponses sont conservées pendant la navigation.</p>${C.quiz.map((q,j)=>`<fieldset class="question"><legend>${j+1}. ${esc(q.q)}</legend>${options(q,'quiz-'+j,quizDraft[j])}</fieldset>`).join('')}<button type="submit">Corriger mon autoévaluation</button></form><div id="quiz-feedback" aria-live="polite"></div>`}<label for="lesson-note">Mes notes — séquence ${i+1}</label><textarea id="lesson-note" rows="5" placeholder="Expliquez les notions avec vos mots, indiquez les points à revoir.">${esc(state.notes[i]||'')}</textarea>`;
    $('lesson-note').oninput=e=>{state.notes[i]=e.target.value;save();};
    $('previous').disabled=i===0;
    $('next').disabled=i===5;
    $('complete').hidden=i===5;
    $('complete').disabled=i<5 && !state.checks[i];
    $('notice').textContent='';
    if(i<5) $('check-answer').onclick=()=>{
      const q=c.check,v=answerFrom(q,'checkpoint');
      if(!attempted(q,v)) { $('check-feedback').textContent='Renseignez une réponse valide avant de vérifier.';return; }
      const ok=correct(q,v);
      if(ok) state.checks[i]=true;
      $('check-feedback').textContent=(ok?'✓ Réponse correcte. ':'À revoir. ')+q.why;
      $('complete').disabled=!state.checks[i];save();
    };
    else {
      $('quiz-form').onchange=()=>{C.quiz.forEach((q,j)=>{const v=answerFrom(q,'quiz-'+j);quizDraft[j]=v===undefined?null:Number(v);});state.quizDraft=quizDraft.slice();save();};
      $('quiz-form').onsubmit=e=>{e.preventDefault();grade();};
      if(state.quiz?.date) quizFeedback();
    }
    updateProgress();
  }
  function openLesson(i) { if(!allowed(i)) return;state.active=i;save();renderLesson();$('lesson-heading').focus(); }
  function quizFeedback() {
    const answers=state.quiz.answers,score=scoreQuiz(answers),pass=score/C.quiz.length>=.7;
    $('quiz-feedback').innerHTML=`<section class="feedback"><h3>${score}/12 · ${(score/12*20).toFixed(1)}/20 — autoévaluation</h3><p>${pass?'Seuil atteint. La PEC écrite reste à faire corriger séparément.':'Seuil non atteint. Reprenez les points indiqués puis réessayez.'}</p><ol>${C.quiz.map((q,i)=>`<li>${answers[i]===q.answer?'✓':'À revoir'} — ${esc(q.why)} ${answers[i]===q.answer?'':`<a href="module-01-tome.html#chapitre-${q.chapter+1}">Réviser le chapitre ${q.chapter+1}</a>`}</li>`).join('')}</ol></section>`;
  }
  function grade() {
    const answers=C.quiz.map((q,i)=>{const a=answerFrom(q,'quiz-'+i);return a===undefined?null:Number(a);});
    if(answers.includes(null)) { $('quiz-feedback').textContent='Répondez aux 12 questions avant de corriger.';return; }
    quizDraft=answers;state.quizDraft=answers.slice();state.quiz={answers,date:new Date().toISOString()};
    const passed=scoreQuiz(answers)/12>=.7;
    if(passed && [0,1,2,3,4].every(i=>state.done.includes(i))) state.done=[0,1,2,3,4,5];
    else state.done=state.done.filter(i=>i!==5);
    save();renderLesson();quizFeedback();$('quiz-feedback').scrollIntoView({block:'nearest'});
  }
  function initLessons() {
    const hash=Number(location.hash.replace('#sequence-',''))-1;
    if(allowed(hash))state.active=hash;
    $('complete').onclick=()=>{const i=state.active;if(i>=5||!state.checks[i])return;if(!state.done.includes(i))state.done.push(i);save();renderLesson();$('notice').textContent='Séquence terminée. Vous pouvez passer à la suivante.';};
    $('previous').onclick=()=>openLesson(state.active-1);
    $('next').onclick=()=>{if(allowed(state.active+1))openLesson(state.active+1);else $('notice').textContent='Réussissez le contrôle puis terminez cette séquence.';};
    renderLesson();
  }
  function initTD() {
    $('td-list').innerHTML=C.td.map((q,i)=>{
      const d=state.td[i]||{};
      return `<article id="td-${i+1}" class="td"><p class="eyebrow">TD ${String(i+1).padStart(2,'0')} · ${q.minutes} MIN · CHAPITRE ${q.chapter+1}</p><h2>${esc(q.title)}</h2><p>${esc(q.prompt)}</p><label for="td-note-${i}">Mon raisonnement et mes calculs</label><textarea id="td-note-${i}" rows="5">${esc(d.note||'')}</textarea><fieldset><legend>${esc(q.question)}</legend>${options(q,'td-answer-'+i,d.value)}</fieldset><div class="toolbar"><button type="button" data-td="${i}">Vérifier ce contrôle</button><a href="module-01-tome.html#chapitre-${q.chapter+1}">Revoir le chapitre</a></div><div id="td-feedback-${i}" role="status">${d.attempted?`<p>${d.passed?'✓ Contrôle réussi.':'À retravailler.'} ${esc(q.why)}</p>`:''}</div></article>`;
    }).join('');
    C.td.forEach((q,i)=>{
      const capture=()=>{const previous=state.td[i]||{},value=answerFrom(q,'td-answer-'+i);state.td[i]={...previous,note:$('td-note-'+i).value,value,passed:previous.value===value&&previous.passed,attempted:previous.value===value&&previous.attempted};save();updateProgress();};
      $('td-note-'+i).oninput=capture;
      document.querySelectorAll(`[name="td-answer-${i}"]`).forEach(el=>el.addEventListener('input',capture));
      document.querySelector(`[data-td="${i}"]`).onclick=()=>{
        capture();const d=state.td[i];
        if(!d.note.trim()||!attempted(q,d.value)){$('td-feedback-'+i).textContent='Rédigez d’abord une tentative et renseignez le contrôle.';return;}
        d.attempted=true;d.passed=correct(q,d.value);save();
        $('td-feedback-'+i).textContent=(d.passed?'✓ Contrôle réussi. ':'À retravailler. ')+q.why+' Ce contrôle ne note pas la qualité de votre rédaction.';updateProgress();
      };
    });updateProgress();
  }
  function download(name,text,type='text/plain;charset=utf-8') {
    const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
  function exportWork() {
    let pec={};try{pec=JSON.parse(localStorage.getItem('campus_pec01_v1')||'{}');}catch(_){}
    if(document.body.dataset.page==='pec')pec=Object.fromEntries(['student','a','b','c','d','e'].map(id=>[id,$(id).value]));
    download('Campus_Module_01_sauvegarde.json',JSON.stringify({format:'campus-module-01',version:2,exported:new Date().toISOString(),state,pec},null,2),'application/json');
  }
  function initBackup() {
    if($('backup'))$('backup').onclick=exportWork;
    if($('import-backup'))$('import-backup').onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      try {
        if(file.size>2000000)throw Error('Fichier trop volumineux.');
        const d=JSON.parse(await file.text());
        if(d.format!=='campus-module-01'||d.version!==2||!d.state||d.state.version!==2||!Array.isArray(d.state.done)||!d.pec||typeof d.pec!=='object')throw Error('Format de sauvegarde non reconnu.');
        if(!confirm('Remplacer la progression et le brouillon PEC de ce navigateur par cette sauvegarde ?'))return;
        localStorage.setItem(KEY,JSON.stringify(d.state));localStorage.setItem('campus_pec01_v1',JSON.stringify(d.pec));restoring=true;location.reload();
      }catch(err){$('backup-status').textContent='Import impossible : '+err.message;}finally{e.target.value='';}
    };
    if($('print'))$('print').onclick=()=>window.print();
  }
  function initPEC() {
    const ids=['student','a','b','c','d','e'],key='campus_pec01_v1';
    let timer;
    const read=()=>Object.fromEntries(ids.map(id=>[id,$(id).value]));
    try {const d=JSON.parse(localStorage.getItem(key)||'{}');ids.forEach(id=>{if(typeof d?.[id]==='string')$(id).value=d[id];});}catch(_){storageOK=false;}
    function update(){const n=ids.slice(1).filter(id=>$(id).value.trim()).length,words=$('d').value.trim().split(/\s+/).filter(Boolean).length;$('pec-bar').style.width=n*20+'%';$('pec-progress').textContent=n+'/5 rubriques commencées — ceci ne mesure pas leur qualité.';$('words').textContent=words+' mots · objectif 800–1 200';}
    function persist(){if(restoring)return;try{localStorage.setItem(key,JSON.stringify(read()));storageOK=true;$('pec-status').textContent='Brouillon enregistré localement à '+new Date().toLocaleTimeString('fr-FR')+'.';}catch(_){storageOK=false;$('pec-status').textContent='Sauvegarde indisponible. Téléchargez votre copie.';}status();}
    ids.forEach(id=>$(id).oninput=()=>{update();clearTimeout(timer);timer=setTimeout(persist,400);});
    window.addEventListener('pagehide',persist);
    function text(){const d=read();return ['PEC 01 — AUBERGE DES CIMES SAS','Cas fictif ; TVA, intérêts, amortissements et impôt neutralisés.','Identifiant : '+d.student,'','1. CONCEPTS /3',d.a,'','2. BILANS AU 3, 5 ET 10 JANVIER /4',d.b,'','3. RÉSULTAT, BANQUE ET BILAN FINAL /5',d.c,'','4. NOTE AUX ASSOCIÉS /5',d.d,'','5. PIÈCES, MÉTHODE ET LIMITES /3',d.e,'','Énoncé : capital 80 000 ; emprunt 120 000 ; matériel 50 000 dont 30 000 payés ; stocks achetés et payés 12 000 ; principal remboursé 5 000 ; prestations 24 000 dont 18 000 encaissés ; stocks consommés 7 000 ; personnel 9 000 dont 7 000 payé ; loyer payé 3 000. Situation initiale nulle.'].join('\n');}
    async function copy(t){try{await navigator.clipboard.writeText(t);$('pec-status').textContent='Copié.';}catch(_){$('pec-status').textContent='Copie indisponible : téléchargez le fichier.';}}
    $('save').onclick=()=>{clearTimeout(timer);persist();};
    $('export').onclick=()=>{persist();download('PEC_01_Auberge_des_Cimes.txt',text());$('pec-status').textContent='Copie exportée. Aucun envoi automatique.';};
    $('copy').onclick=()=>copy(text());
    $('prompt').onclick=()=>copy('Corrige cette PEC selon le barème : concepts /3 ; bilans au 3, 5 et 10 janvier /4 ; résultat, banque et bilan final /5 ; note aux associés de 800 à 1 200 mots /5 ; pièces, méthode et limites /3. Vérifie chaque calcul, distingue erreur arithmétique et conceptuelle, explique les hypothèses. Donne une note motivée sur 20 et des exercices de remédiation. N’invente pas de travail absent.\n\n'+text());
    $('clear').onclick=()=>{if(!confirm('Effacer uniquement ce brouillon PEC ? Exportez-le d’abord si nécessaire.'))return;clearTimeout(timer);ids.forEach(id=>$(id).value='');persist();update();};
    update();status();
  }
  function initDashboard(){updateProgress();if($('resume'))$('resume').href='module-01.html#sequence-'+(state.active+1);}
  document.querySelectorAll('[data-case-table]').forEach(el=>el.innerHTML='<div class="table-scroll"><table><thead><tr><th>Date</th><th>Opération</th><th>Montant (€)</th></tr></thead><tbody>'+C.caseRows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
  document.querySelectorAll('[data-assumptions]').forEach(el=>el.textContent=C.assumptions);
  const page=document.body.dataset.page;
  if(page==='module')initLessons();
  if(page==='td')initTD();
  if(page==='pec')initPEC();
  if(page==='dashboard')initDashboard();
  initBackup();status();
})();
