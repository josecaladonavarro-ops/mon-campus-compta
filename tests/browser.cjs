const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const http=require('node:http'),path=require('node:path');
const box={window:{}};vm.runInNewContext(fs.readFileSync('module-content.js','utf8'),box);const C=box.window.CAMPUS_CONTENT;
(async()=>{
const server=http.createServer((req,res)=>{const file=path.join(process.cwd(),decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch(_){res.statusCode=404;res.end('Not found');}});
await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CAMPUS_TEST_CHROMIUM||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--no-zygote']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const goto=file=>page.goto('http://127.0.0.1:8765/'+file);
 await goto('module-01.html');
 assert.equal(await page.locator('#nav button:disabled').count(),5);
 await page.locator('#next').click();assert.match(await page.locator('#notice').textContent(),/Réussissez/);
 for(let i=0;i<5;i++){
   const q=C.chapters[i].check;
   await page.locator('#check-answer').click();assert.match(await page.locator('#check-feedback').textContent(),/Renseignez/);
   if('number' in q)await page.locator('[name=checkpoint]').fill(q.number.toLocaleString('fr-FR'));
   else await page.locator(`[name=checkpoint][value="${q.answer}"]`).check();
   await page.locator('#check-answer').click();assert.match(await page.locator('#check-feedback').textContent(),/correcte/);
   await page.locator('#lesson-note').fill('Notes personnelles séquence '+i);
   await page.locator('#complete').click();await page.locator('#next').click();
 }
 await page.locator('#quiz-form button[type=submit]').click();assert.match(await page.locator('#quiz-feedback').textContent(),/12 questions/);
 for(let i=0;i<12;i++)await page.locator(`[name=quiz-${i}][value="${(C.quiz[i].answer+1)%3}"]`).check();
 await page.locator('#quiz-form button[type=submit]').click();assert.match(await page.locator('#quiz-feedback').textContent(),/0\/12/);
 assert.match(await page.locator('#count').textContent(),/5 \/ 6/);
 for(let i=0;i<12;i++)await page.locator(`[name=quiz-${i}][value="${C.quiz[i].answer}"]`).check();
 await page.reload();assert.equal(await page.locator('#quiz-form input:checked').count(),12);
 await page.locator('#quiz-form button[type=submit]').click();assert.match(await page.locator('#quiz-feedback').textContent(),/12\/12/);
 assert.match(await page.locator('#count').textContent(),/6 \/ 6/);
 await page.reload();assert.match(await page.locator('#quiz-feedback').textContent(),/12\/12/);
 await goto('module-01-td.html');await page.locator('[data-td="0"]').click();assert.match(await page.locator('#td-feedback-0').textContent(),/tentative/);
 for(let i=0;i<10;i++){
   const q=C.td[i];await page.locator('#td-note-'+i).fill('Mon raisonnement pour le TD '+i);
   if('number'in q)await page.locator(`[name=td-answer-${i}]`).fill(q.number.toLocaleString('fr-FR'));
   else await page.locator(`[name=td-answer-${i}][value="${q.answer}"]`).check();
   await page.locator(`[data-td="${i}"]`).click();
   assert.match(await page.locator('#td-feedback-'+i).textContent(),/Contrôle réussi/);
 }
 await page.reload();assert.match(await page.locator('#td-count').textContent(),/10 \/ 10/);
 await goto('module-01-pec-interactive.html');
 await page.locator('#a').fill('<script>alert("test")</script> Mon texte et mes concepts');
 await page.locator('#d').fill('un deux trois quatre cinq');
 await page.locator('#save').click();await page.reload();
 assert.match(await page.locator('#a').inputValue(),/Mon texte/);assert.match(await page.locator('#words').textContent(),/5 mots/);
 const exportPromise=page.waitForEvent('download');await page.locator('#export').click();const exp=await exportPromise;
 const text=fs.readFileSync(await exp.path(),'utf8');assert.match(text,/BILANS AU 3, 5 ET 10/);assert.match(text,/Mon texte/);
 await page.locator('.backup summary').click();const backupPromise=page.waitForEvent('download');await page.locator('#backup').click();const backup=await backupPromise;
 const backupPath=await backup.path();const data=JSON.parse(fs.readFileSync(backupPath,'utf8'));assert.equal(data.format,'campus-module-01');assert.equal(data.state.done.length,6);
 await page.locator('#a').fill('modifié');await page.locator('#save').click();
 page.once('dialog',d=>d.accept());await page.locator('#import-backup').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:fs.readFileSync(backupPath)});
 await page.waitForEvent('load');assert.match(await page.locator('#a').inputValue(),/Mon texte/);
 // Un vieux brouillon PEC est repris, sans validation fictive des nouvelles séquences.
 const legacy=await browser.newContext();const legacyPage=await legacy.newPage();await legacyPage.goto('http://127.0.0.1:8765/index.html');
 await legacyPage.evaluate(()=>{localStorage.setItem('campus_pec01_v1',JSON.stringify({a:'ancien brouillon'}));localStorage.setItem('campus_m1_done','[0,1,2,3,4,5]');});
 await legacyPage.goto('http://127.0.0.1:8765/module-01-pec-interactive.html');assert.equal(await legacyPage.locator('#a').inputValue(),'ancien brouillon');
 await legacyPage.goto('http://127.0.0.1:8765/module-01.html');assert.match(await legacyPage.locator('#count').textContent(),/0 \/ 6/);
 await legacyPage.evaluate(()=>localStorage.setItem('campus_m1_v2','not-json'));await legacyPage.reload();assert.equal(await legacyPage.locator('#nav button').count(),6);
 // Échec du stockage : l’interface reste utilisable et signale le problème.
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('disabled')};Storage.prototype.getItem=()=>{throw Error('disabled')};});
 const blockedPage=await blocked.newPage();await blockedPage.goto('http://127.0.0.1:8765/module-01.html');assert.match(await blockedPage.locator('#storage-status').textContent(),/indisponible/);
 // Vérifier chaque page et les débordements aux trois tailles d’écran.
 for(const width of [390,820,1440]){
   await page.setViewportSize({width,height:1000});
   for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){
     await goto(file);assert.equal(await page.locator('h1').count(),1,file);
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${file} déborde à ${width}px`);
   }
   await goto('module-01.html');await page.screenshot({path:path.join(process.env.CAMPUS_SCREENSHOT_DIR||require('node:os').tmpdir(),`campus-${width}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('PASS : parcours, échec/réussite quiz, 10 TD, brouillons, export/import, migration, stockage bloqué, 8 pages × 3 tailles.');
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
