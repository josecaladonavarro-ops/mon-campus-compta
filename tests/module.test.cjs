const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('module-content.js','utf8'),sandbox);
const C=sandbox.window.CAMPUS_CONTENT;
test('un seul cas cumulatif : quatre bilans, résultat et flux',()=>{
 const s={bank:0,capital:0,loan:0,equipment:0,stock:0,clients:0,supplier:0,personnel:0,result:0};
 const totals=()=>[s.bank+s.equipment+s.stock+s.clients,s.capital+s.loan+s.supplier+s.personnel+s.result];
 const balance=expected=>assert.deepEqual(totals(),[expected,expected]);
 s.bank+=80000;s.capital+=80000;s.bank+=120000;s.loan+=120000;balance(200000);
 s.equipment+=50000;s.bank-=30000;s.supplier+=20000;balance(220000);
 s.stock+=12000;s.bank-=12000;s.loan-=5000;s.bank-=5000;balance(215000);assert.equal(s.bank,153000);
 s.result+=24000;s.bank+=18000;s.clients+=6000;s.stock-=7000;s.result-=7000;s.result-=9000;s.bank-=7000;s.personnel+=2000;s.result-=3000;s.bank-=3000;
 balance(222000);assert.equal(s.bank,161000);assert.equal(s.result,5000);assert.equal(s.stock,5000);
 const operating=s.result-s.clients-s.stock+s.personnel;assert.equal(operating,-4000);
 assert.equal(operating+80000+120000-5000-30000,s.bank);
});
test('six séquences, dix TD, douze questions, renvois valides',()=>{
 assert.equal(C.chapters.length,6);assert.equal(C.td.length,10);assert.equal(C.quiz.length,12);
 for(const q of [...C.quiz,...C.td,...C.chapters.filter(c=>c.check).map(c=>c.check)]){
   if(q.options){assert.ok(Number.isInteger(q.answer));assert.ok(q.answer>=0&&q.answer<q.options.length);}
   else assert.ok(Number.isFinite(q.number));
 }
 assert.equal(Math.ceil(C.quiz.length*.7),9);
 assert.equal(C.td.reduce((sum,q)=>sum+q.minutes,0),470);
});
test('aucun lien local cassé ni ancre de manuel absente',()=>{
 for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"#]+)(?:#([^"]+))?"/g)){
   const link=match[1];if(/^(https?:|mailto:|data:)/.test(link))continue;
   const [filePath,anchor]=link.split('#');assert.ok(fs.existsSync(filePath),`${file}: ${link}`);
   const fragment=anchor||match[2];if(fragment&&filePath.endsWith('.html'))assert.ok(fs.readFileSync(filePath,'utf8').includes(`id="${fragment}"`),`${file}: ${fragment}`);
  }
 }
});
