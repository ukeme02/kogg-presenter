const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const mode of ['base','local','sync'])test('operator pairing in '+mode+' generates a QR without sign-in and clears it when revoked',async()=>{
 const ids=['cloudRemoteStatus','cloudRemoteLink','cloudRemoteCode','cloudRemoteSteps','cloudRemoteCopy','cloudRemoteShare','cloudRemoteStop','cloudRemoteStart','cloudRemotePairing'];
 const nodes=new Map(ids.map(id=>[id,{value:'',hidden:false,innerHTML:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},replaceChildren(){this.innerHTML='';}}]));let callbacks;
 const pair={topic:'00000000-1111-2222-3333-444444444444',secret:'A'.repeat(44),expiresAt:Date.now()+60000};
 const context={window:{qrcode:require('../js/vendor/qrcode.js'),KOGGCloudSession:{createOperator(o){callbacks=o;return {start:async()=>{await o.canStart?.();return o.onLink(pair);},stop:()=>o.onLink('')};}},addEventListener(){}},$:id=>nodes.get(id),live:{},workMode:()=>mode,location:{protocol:'https:',href:'https://kogg-presenter.pages.dev/'},URL,btoa,navigator:{}};
 vm.runInNewContext(fs.readFileSync('js/cloud-remote-operator.js','utf8'),context);
 await nodes.get('cloudRemoteStart').handlers.click();const link=new URL(nodes.get('cloudRemoteLink').value);assert.equal(link.pathname,'/cloud-remote.html');assert.equal(link.search,'');assert.match(link.hash,/^#pair=/);assert.match(nodes.get('cloudRemoteCode').innerHTML,/<svg/);assert.equal(nodes.get('cloudRemoteCode').hidden,false);assert.equal(nodes.get('cloudRemoteSteps').hidden,true);assert.equal(nodes.get('cloudRemotePairing').hidden,false);assert.equal(nodes.get('cloudRemoteStart').textContent,'Create new connection');
 nodes.get('cloudRemoteStop').handlers.click();assert.equal(nodes.get('cloudRemoteLink').value,'');assert.equal(nodes.get('cloudRemoteCode').hidden,true);assert.equal(nodes.get('cloudRemoteCopy').disabled,true);assert.equal(nodes.get('cloudRemotePairing').hidden,true);assert.equal(nodes.get('cloudRemoteStart').textContent,'Connect phone');
});
test('search inputs and every credential input have separate form owners in operator markup',()=>{
 const html=fs.readFileSync('index.html','utf8');let form=null;const owners={};
 for(const tag of html.matchAll(/<\/?(?:form|input)\b[^>]*>/g)){
  if(tag[0].startsWith('</form')){form=null;continue;}
  const attrs=Object.fromEntries([...tag[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  if(tag[0].startsWith('<form')){assert.equal(form,null,'forms cannot nest');form=attrs.id;}
  else if(attrs.id)owners[attrs.id]={form,...attrs};
 }
 assert.equal(owners.bookSearch.form,'quickJumpForm');assert.equal(owners.quickGo.form,'quickGoForm');assert.equal(owners.bibleSearch.form,'bibleSearchForm');
 for(const input of Object.values(owners).filter(x=>x.type==='password')){assert.ok(input.form,'credential requires an explicit form');assert.notEqual(input.form,owners.bookSearch.form);}
 assert.equal(owners.bookSearch.autocomplete,'off');assert.equal(owners.authPassword.autocomplete,'current-password');
});


test('phone entry point has no login fields or Sync library script',()=>{const html=fs.readFileSync('cloud-remote.html','utf8');assert.doesNotMatch(html,/type="(?:password|email)"|src="js\/sync.js"|remoteSignIn/);assert.match(html,/No account needed/);});
