(function(){
"use strict";
var root=document.documentElement;
var PL=window.PL=window.PL||{};
(function(){
var bars=[].slice.call(document.querySelectorAll('.rail')), q=false;
if(!bars.length) return;
function chk(){ q=false; var y=window.scrollY||0;
bars.forEach(function(b){
if(!(y>0)){ b.classList.remove('pl-stuck'); return; }
var cs=getComputedStyle(b), t=parseFloat(cs.top);
b.classList.toggle('pl-stuck', cs.position==='sticky' && t>=0 && Math.abs(b.getBoundingClientRect().top-t)<3);    }); }
window.addEventListener('scroll',function(){ if(!q){ q=true; requestAnimationFrame(chk); } },{passive:true});
window.addEventListener('resize',chk); chk();
})();
(function(){
var strips=[].slice.call(document.querySelectorAll('.rail .rail-in'));
if(!strips.length) return;
var CHEV='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.25 8.25 6 4.5 9.75" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
strips.forEach(function(s){
var nav=s.closest('.rail'); if(!nav||s.plRail) return; s.plRail=1;
if(getComputedStyle(nav).position==='static') nav.style.position='relative';
function mk(d){ var b=document.createElement('button'); b.type='button'; b.className='pl-rmore pl-r'+d; b.tabIndex=-1;
b.setAttribute('aria-hidden','true'); b.setAttribute('aria-label',d==='r'?'More sections':'Earlier sections'); b.innerHTML='<i>'+CHEV+'</i>'; nav.appendChild(b);
b.addEventListener('click',function(){ s.scrollBy({left:(d==='r'?1:-1)*Math.max(120,Math.round(s.clientWidth*0.7)),behavior:'smooth'}); });
return b; }
var R=mk('r'), L=mk('l'), tm=0;
function place(){ var t=s.offsetTop+'px', h=s.offsetHeight+'px';
R.style.top=L.style.top=t; R.style.height=L.style.height=h;
R.style.left=(s.offsetLeft+s.offsetWidth-40)+'px'; L.style.left=s.offsetLeft+'px'; }
function upd(){ var m=s.scrollWidth-s.clientWidth, x=s.scrollLeft, r=m>1&&x<m-1, l=m>1&&x>0.5;
s.classList.toggle('pl-ovr',r); s.classList.toggle('pl-ovl',l);
R.classList.toggle('on',r); L.classList.toggle('on',l);
if(r||l) place(); }
function show(a,smooth){ if(!a||s.scrollWidth-s.clientWidth<=1) return;
var sr=s.getBoundingClientRect(), ar=a.getBoundingClientRect(), x=s.scrollLeft, G=Math.min(40,Math.max(0,Math.floor((sr.width-ar.width)/2)));
if(ar.left>=sr.left+G-1&&ar.right<=sr.right-G+1) return;
var to=Math.max(0,Math.min(s.scrollWidth-s.clientWidth,Math.round(x+(ar.left+ar.width/2)-(sr.left+sr.width/2))));
if(Math.abs(to-x)>1) s.scrollTo({left:to,behavior:smooth?'smooth':'auto'}); }
function cur(){ return s.querySelector('a.on,a[aria-current]'); }
s.addEventListener('scroll',upd,{passive:true});
window.addEventListener('resize',function(){ upd(); show(cur(),false); },{passive:true});
if(window.ResizeObserver) new ResizeObserver(upd).observe(s);
if(window.MutationObserver) new MutationObserver(function(rs){
var mark=false, i;
for(i=0;i<rs.length;i++){ if(rs[i].target===s) continue; if(rs[i].type==='attributes') mark=true; }
upd();
if(mark){ clearTimeout(tm); tm=setTimeout(function(){ show(cur(),true); },450); }
}).observe(s,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-current']});
upd(); show(cur(),false);
window.addEventListener('load',function(){ upd(); show(cur(),false); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ upd(); });
});
})();
(function(){
var seq=0, NARROW=window.matchMedia('(max-width:719.98px)');
var CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>';
[].forEach.call(document.querySelectorAll('.rail .rail-in'),function(s){
var nav=s.closest('.rail'); if(!nav||nav.plSn) return;
var tabs=[].filter.call(s.children,function(c){ return c.tagName==='A'&&!c.classList.contains('rhome'); });
if(tabs.length<2) return;
nav.plSn=1;
var b=document.createElement('button'), l=document.createElement('div'), id='plSec'+(++seq);
b.type='button'; b.className='pl-sec-btn'; b.setAttribute('aria-expanded','false'); b.setAttribute('aria-controls',id);
b.innerHTML='<span class="pl-vh">This section: </span><span class="pl-sec-cur"></span><span class="pl-sec-n"><span class="pl-sec-c"></span>'+CHEV+'</span>';
l.className='pl-sec-list'; l.id=id;
s.insertBefore(b,tabs[0]); s.insertBefore(l,b.nextSibling);
tabs.forEach(function(a){ l.appendChild(a); });
nav.classList.add('pl-sn');
function name(a){ var c=a.cloneNode(true); [].forEach.call(c.querySelectorAll('.rs,.pl-tfx,[aria-hidden=true]'),function(x){ x.parentNode.removeChild(x); }); return (c.textContent||'').replace(/\s+/g,' ').trim(); }
function paint(){
var shown=tabs.filter(function(a){ return a.style.display!=='none'; }), cur=shown.filter(function(a){ return a.classList.contains('on')||a.hasAttribute('aria-current'); })[0],
secs=shown.filter(function(a){ return (a.getAttribute('href')||'').charAt(0)==='#'; }).length;
b.querySelector('.pl-sec-cur').textContent=cur?name(cur):'';
b.querySelector('.pl-sec-c').textContent='Sections ('+(secs||shown.length)+')';
}
function isOpen(){ return nav.classList.contains('pl-sn-open'); }
function set(on,back){
if(on){ nav.style.setProperty('--pl-secmax',Math.max(180,Math.floor(window.innerHeight-nav.getBoundingClientRect().bottom-14))+'px'); }
nav.classList.toggle('pl-sn-open',on); b.setAttribute('aria-expanded',on?'true':'false');
if(!on&&back) b.focus();
}
b.addEventListener('click',function(){ set(!isOpen(),false); });
nav.addEventListener('keydown',function(e){
if(!isOpen()) return;
if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); set(false,true); return; }
if(e.key==='ArrowDown'||e.key==='ArrowUp'){
var items=tabs.filter(function(a){ return a.style.display!=='none'; }), i=items.indexOf(document.activeElement);
e.preventDefault(); var n=items[e.key==='ArrowDown'?(i+1)%items.length:(i<=0?items.length:i)-1]; if(n) n.focus(); }
});
document.addEventListener('click',function(e){ if(isOpen()&&!nav.contains(e.target)) set(false,false); });
nav.addEventListener('focusout',function(e){ if(isOpen()&&e.relatedTarget&&!nav.contains(e.relatedTarget)) set(false,false); });
l.addEventListener('click',function(e){
var a=e.target.closest&&e.target.closest('a'); if(!a||!isOpen()) return;
var h=a.getAttribute('href')||''; set(false,false);
if(h.charAt(0)!=='#') return;
b.focus({preventScroll:true});
setTimeout(function(){ var t=null; try{ t=document.getElementById(decodeURIComponent(h.slice(1))); }catch(x){}
if(t&&t.getClientRects().length&&window.PL&&PL.focusTo) PL.focusTo(t); },80);
});
(NARROW.addEventListener?NARROW.addEventListener.bind(NARROW,'change'):NARROW.addListener.bind(NARROW))(function(){ set(false,false); });
if(window.MutationObserver) new MutationObserver(paint).observe(l,{subtree:true,attributes:true,childList:true,attributeFilter:['class','aria-current','style']});
paint();
});
})();
(function(){ if(document.querySelector('.pl-fore')) return; var f=document.createElement('div'); f.className='pl-fore'; f.setAttribute('aria-hidden','true'); document.body.appendChild(f); })();
if(!PL.layer||PL.layer.plStub){(function(){
(function(){
var MODAL=null;
var FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
function focusables(el){
return [].filter.call(el.querySelectorAll(FOCUSABLE),function(n){
if(!(n.offsetWidth||n.offsetHeight||n.getClientRects().length)) return false;
return getComputedStyle(n).visibility!=='hidden';
});
}
function release(o){
var st=MODAL; if(!st) return false; MODAL=null;
document.removeEventListener('keydown',st.key,true);
st.inert.forEach(function(s){ s.removeAttribute('inert'); });
[['role',st.role],['aria-modal',st.am],['aria-label',st.lab]].forEach(function(p){
if(p[1]==null) st.el.removeAttribute(p[0]); else st.el.setAttribute(p[0],p[1]);
});
if(!(o&&o.focus===false)){ var op=st.opener; if(op&&op.focus&&document.documentElement.contains(op)) op.focus(); }
if(PL.ret&&PL.ret.paint) PL.ret.paint();      
return true;
}
PL._layers=PL._layers||[];
PL.layer=function(o){
o=o||{};
var L={o:o}, skip=false, skipT=null, pushed=false;
Object.defineProperty(L,'pushed',{enumerable:true,get:function(){ return pushed; },set:function(v){ pushed=!!v; if(PL.ret&&PL.ret.paint) PL.ret.paint(); }});
PL._layers.push(L);
L.push=function(url){
if(L.pushed) return false;
if(PL.ret&&PL.ret.adopt&&history.state&&history.state.plLayer){ PL.ret.adopt=false; L.pushed=true; return false; }
try{ history.pushState({plLayer:1},'',url||location.href); L.pushed=true; return true; }catch(e){ return false; }
};
var subs=[], subObs=null;
function subOff(){ subs=[]; if(subObs){ subObs.disconnect(); subObs=null; } }
L.pop=function(){
var n=(L.pushed?1:0)+subs.length; subOff();
if(!n) return false;
L.pushed=false; skip=true; clearTimeout(skipT); skipT=setTimeout(function(){ skip=false; },600);
try{ history.go(-n); return true; }catch(e){ skip=false; return false; }
};
L.swallow=function(){ if(!skip) return false; skip=false; clearTimeout(skipT); return true; };
L.sub=function(el,close){
var t=subs[subs.length-1];
if(t&&(t.el===el||!t.el.isConnected)){ t.el=el; t.close=close; return; }
try{ history.pushState({plLayer:1},'',location.href); }catch(e){ return; }
subs.push({el:el, close:close, k:(history.state||{}).plk});
if(subObs||!window.MutationObserver) return;
subObs=new MutationObserver(function(){
if(!subs.length||subs[subs.length-1].el.isConnected) return;
var top=subs[subs.length-1], n=0;
while(subs.length&&!subs[subs.length-1].el.isConnected){ subs.pop(); n++; }
var mine=(history.state||{}).plk===top.k, open=!o.isOpen||o.isOpen();
if(!subs.length&&subObs){ subObs.disconnect(); subObs=null; }
if(!mine||!open) return;
skip=true; clearTimeout(skipT); skipT=setTimeout(function(){ skip=false; },600);
try{ history.go(-n); }catch(e){ skip=false; }
});
subObs.observe(document.body,{childList:true,subtree:true});
};
L.subBack=function(){
if(!subs.length) return false;
var t=subs.pop(); if(!subs.length&&subObs){ subObs.disconnect(); subObs=null; }
if(t.close) t.close(); return true; };
document.addEventListener('keydown',function(e){
if(e.key!=='Escape'||!subs.length||(o.isOpen&&!o.isOpen())) return;
if(!subs[subs.length-1].el.isConnected) return;
e.preventDefault(); e.stopImmediatePropagation(); PL._subEsc=Date.now();
try{ history.back(); }catch(x){}
},true);
L.modal=function(el,m){
m=m||{}; release({focus:false});
if(!el || (m.phoneOnly && !window.matchMedia('(max-width:'+(m.phoneOnly===true?640:m.phoneOnly)+'px)').matches)) return false;
var st={el:el, inert:[], opener:m.opener||document.activeElement, role:el.getAttribute('role'),
am:el.getAttribute('aria-modal'), lab:el.getAttribute('aria-label')};
for(var n=el; n && n!==document.body && n.parentNode; n=n.parentNode){
[].forEach.call(n.parentNode.children,function(s){
if(s===n || /^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT)$/.test(s.tagName)) return;
if(s.hasAttribute('data-pl-keep') || s.hasAttribute('aria-live') || s.getAttribute('role')==='status' || s.hasAttribute('inert')) return;
s.setAttribute('inert',''); st.inert.push(s);
});
}
el.setAttribute('role',m.role||'dialog'); el.setAttribute('aria-modal','true');
if(m.label && !st.lab) el.setAttribute('aria-label',m.label);
st.key=function(e){
if(e.key!=='Tab') return;
var f=focusables(el), a=document.activeElement;
if(!f.length){ e.preventDefault(); return; }
if(!el.contains(a)){ e.preventDefault(); f[0].focus(); return; }
if(e.shiftKey && a===f[0]){ e.preventDefault(); f[f.length-1].focus(); }
else if(!e.shiftKey && a===f[f.length-1]){ e.preventDefault(); f[0].focus(); }
};
document.addEventListener('keydown',st.key,true);
MODAL=st;
var f0=m.focus ? (typeof m.focus==='string' ? el.querySelector(m.focus) : m.focus) : focusables(el)[0];
if(f0 && f0.focus) f0.focus();
if(PL.ret&&PL.ret.paint) PL.ret.paint();      
return true;
};
L.unmodal=release;
L.open=function(el,m){ m=m||{}; L.push(m.url); return L.modal(el,m); };
L.close=function(fromPop){ release(); if(!fromPop) L.pop(); };
if(o.auto!==false && o.hide) window.addEventListener('popstate',function(){
if(L.swallow()){ if(o.landed) o.landed(); return; }
if(L.subBack()) return;
L.pushed=false;
if(!o.isOpen || o.isOpen()) o.hide(true);
});
return L;
};
})();
(function(){
if(PL.ret) return;
var H=window.history, NS='pl.ret.', HOLD=4000;
if(/[?&]embed=/.test(location.search)){ PL.ret={keep:function(){},label:function(){},paint:function(){},back:function(){return false;},saved:null,restoring:false}; return; }
function load(k){ try{ return JSON.parse(sessionStorage.getItem(NS+k)||'null'); }catch(e){ return null; } }
function store(k,v){ try{ if(v==null) sessionStorage.removeItem(NS+k); else sessionStorage.setItem(NS+k,JSON.stringify(v)); }catch(e){} }
function newKey(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function cur(){ var s=H.state; return s&&typeof s==='object'?s:{}; }
function merge(s,x){ var n={},k; if(s&&typeof s==='object'){ for(k in s) n[k]=s[k]; } else if(s!=null) n.plv=s; for(k in x){ if(x[k]!=null) n[k]=x[k]; } return n; }
var rawPush=H.pushState, rawReplace=H.replaceState, keepFn=null, labelFn=null, settling=false, chip=null, band=null, room=null, last=null;
function anyOpen(){ var a=PL._layers||[], i; for(i=0;i<a.length;i++){ if(a[i].pushed) return true; try{ if(a[i].o.isOpen&&a[i].o.isOpen()) return true; }catch(e){} } return false; }
H.replaceState=function(s,t,u){ var c=cur(); return rawReplace.call(H,merge(s,{plk:c.plk,pld:c.pld,plf:c.plf,plb:c.plb,plj:c.plj,plview:c.plview}),t,u); };
H.pushState=function(s,t,u){ var c=cur(); save(s&&typeof s==='object'&&s.plj!=null?s.plj:null); var r=rawPush.call(H,merge(s,{plk:newKey(),pld:(c.pld||0)+1,plf:c.plf,plb:c.plb}),t,u); last=cur(); paint(); return r; };
var nav=''; try{ var ne=performance.getEntriesByType('navigation')[0]; nav=ne?ne.type:''; }catch(e){}
try{ if('scrollRestoration' in H) H.scrollRestoration='manual'; }catch(e){}
var st=cur(), go=load('go'), hop=load('hop'), adopted=false;
store('go',null); store('hop',null);
if(!st.plk){
var ref=(document.referrer||'').split('#')[0];
if(go&&Date.now()-go.t<15000&&go.u===location.href){ var g0=load('s:'+go.k); st=merge(st,{plk:go.k,pld:0,plf:g0&&g0.f}); adopted=true; }
else{
st=merge(st,{plk:newKey(),pld:0});
if(hop&&Date.now()-hop.t<60000&&hop.u!==location.href&&(!ref||hop.u.split('#')[0]===ref)){
st.plf={u:hop.u,k:hop.k,l:hop.l};
st.plb=H.length>1?1:0;          
}
}
rawReplace.call(H,st,'',location.href);
}
last=cur();
var saved=(adopted||nav==='back_forward'||nav==='reload')?load('s:'+st.plk):null;
if(saved&&saved.p!==location.pathname) saved=null;
function folds(){
var ds=document.querySelectorAll('details'), b='', ids={}, i;
for(i=0;i<ds.length;i++){ b+=ds[i].open?'1':'0'; if(ds[i].id) ids[ds[i].id]=ds[i].open?1:0; }
return {n:ds.length,b:b,ids:ids};
}
function unfold(d){
if(!d) return;
var ds=document.querySelectorAll('details'), i, want;
for(i=0;i<ds.length;i++){
want=ds[i].id&&d.ids&&(ds[i].id in d.ids)?!!d.ids[ds[i].id]:(ds.length===d.n?d.b.charAt(i)==='1':null);
if(want!==null&&ds[i].open!==want) ds[i].open=want;
}
}
function record(y){
var s=cur(), v={y:Math.round(y),p:location.pathname,u:location.href,f:s.plf||null,d:folds(),s:null};
if(keepFn){ try{ v.s=keepFn(); }catch(e){} }
return v;
}
function save(y){ if(settling) return; var s=cur(); if(s.plk) store('s:'+s.plk,record(typeof y==='number'?y:window.scrollY)); }
var saveT=null;
window.addEventListener('scroll',function(){ clearTimeout(saveT); saveT=setTimeout(function(){ save(); paint(); },160); },{passive:true});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',function(){ if(document.hidden) save(); });
function settle(){
if(!saved||settling) return;
var y=saved.y, t0=Date.now(), iv=null, ro=null, EV=['wheel','touchstart','keydown','pointerdown'];
settling=true; unfold(saved.d);
function stop(){ if(!settling) return; settling=false; clearInterval(iv); if(ro) ro.disconnect(); EV.forEach(function(ev){ window.removeEventListener(ev,stop,true); }); save(); }
function hold(){
if(!settling) return;
var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight), to=Math.min(y,max);
if(Math.abs(window.scrollY-to)>1) window.scrollTo({top:to,behavior:'instant'});
if(Date.now()-t0>HOLD) stop();
}
EV.forEach(function(ev){ window.addEventListener(ev,stop,{capture:true,passive:true}); });
iv=setInterval(hold,100);
if('ResizeObserver' in window){ ro=new ResizeObserver(hold); ro.observe(document.body); }
hold();
}
function arrive(){
var s=cur();
if(!s.plk){ var p=last||{}; s=merge(s,{plk:newKey(),pld:(p.pld||0)+1,plf:p.plf,plb:p.plb}); rawReplace.call(H,s,'',location.href); }
last=s; return s;
}
window.addEventListener('popstate',function(){
var s=arrive(), v=load('s:'+s.plk), n=0;
if(v&&v.p===location.pathname) requestAnimationFrame(function again(){
if(anyOpen()) return;
if(Math.abs(window.scrollY-v.y)>1) window.scrollTo({top:v.y,behavior:'instant'});
if(++n<8) requestAnimationFrame(again);
});
paint();
});
window.addEventListener('hashchange',function(){ arrive(); paint(); });
function label(){
var l=''; try{ l=String(labelFn?labelFn():(document.title||'').split(/ [|–—-] /)[0]); }catch(e){}
l=l.replace(/\s+/g,' ').trim(); return l.length>34?l.slice(0,32).trim()+'…':(l||'the last page');
}
document.addEventListener('click',function(e){
if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
if(!a||(a.target&&a.target!=='_self')||a.hasAttribute('download')) return;
var u; try{ u=new URL(a.href,location.href); }catch(x){ return; }
if(u.origin!==location.origin||!/^(https?|file):$/.test(u.protocol)||(u.pathname===location.pathname&&u.search===location.search)) return;
save(); store('hop',{u:location.href,k:cur().plk,l:label(),t:Date.now()});
});
window.addEventListener('click',function(e){
if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
var a=e.target&&e.target.closest?e.target.closest('a[href*="#"]'):null; if(!a) return;
var u; try{ u=new URL(a.href,location.href); }catch(x){ return; }
if(u.origin===location.origin&&u.pathname===location.pathname&&u.search===location.search&&u.hash&&u.hash!==location.hash) save();
},true);
var input=0, jumpT=null;
['wheel','touchmove','keydown'].forEach(function(ev){ window.addEventListener(ev,function(e){ if(ev!=='keydown'||/^(Arrow|Page|Home|End| )/.test(e.key)) input=Date.now(); },{capture:true,passive:true}); });
document.addEventListener('click',function(e){
if(!e.isTrusted||settling||anyOpen()) return;          
var t=e.target;
if(!t||!t.closest||t.closest('[role=dialog],[aria-modal=true],.pl-ret-chip,.pl-done')) return;
var y0=window.scrollY, t0=Date.now(), k0=cur().plk, p0=location.pathname, prev=y0, still=0, n=0;
clearInterval(jumpT);
jumpT=setInterval(function(){
n++;
var y=window.scrollY;
if(input>t0||settling||location.pathname!==p0||cur().plk!==k0||anyOpen()){ clearInterval(jumpT); return; }
if(Math.abs(y-prev)<1) still++; else { still=0; prev=y; }
if((still>=3&&n>=4)||n>30){
clearInterval(jumpT);
if(Math.abs(y-y0)>window.innerHeight*0.9){
var s=cur();
store('s:'+s.plk,record(y0));          
rawPush.call(H,{plk:newKey(),pld:(s.pld||0)+1,plf:s.plf,plb:s.plb,plj:Math.round(y0)},'',location.href);
last=cur(); save(); paint();
}
}
},100);
},true);
function back(){
var s=cur();
if(s.plj!=null){ H.back(); return true; }
var f=s.plf; if(!f) return false;
save(); store('go',{k:f.k,u:f.u,t:Date.now()});
if(s.plb) H.go(-((s.pld||0)+1)); else location.href=f.u;
return true;
}
function paint(){
paintDone();
var s=cur(), f=s.plf, pv=!!s.plview&&s.plj!=null, j=pv||(s.plj!=null&&Math.abs(window.scrollY-s.plj)>window.innerHeight*0.5);
if(!chip){
if(!f&&!j) return;
chip=document.createElement('button'); chip.type='button'; chip.className='pl-ret-chip'; chip.setAttribute('data-pl-keep','');
chip.addEventListener('click',back);
band=document.createElement('div'); band.className='pl-ret-band'; band.setAttribute('aria-hidden','true'); band.setAttribute('data-pl-keep','');
room=document.createElement('div'); room.className='pl-ret-room'; room.setAttribute('aria-hidden','true'); room.setAttribute('data-pl-keep','');
document.body.appendChild(room); document.body.appendChild(band); document.body.appendChild(chip);
}
if(pv){ chip.textContent='← Back to where you were'; chip.setAttribute('aria-label','Back to where you were on this page'); }
else if(j){ chip.textContent=(s.plj<window.scrollY?'↑':'↓')+' Back to where you were'; chip.setAttribute('aria-label','Back to where you were on this page'); }
else if(f){ chip.textContent='← Back to '+f.l; chip.setAttribute('aria-label','Back to '+f.l+', where you were'); }
chip.hidden=(!f&&!j)||anyOpen()||(pv&&!!document.querySelector('.rail a.rhome'));
if(band){ band.hidden=chip.hidden; room.hidden=chip.hidden; }
if(!away0){ away0=1; awayWatch(); }
var ak=(s.plk||'')+'|'+(s.plj!=null?s.plj:'')+'|'+(f?f.u:'');
if(ak!==awayKey){ awayKey=ak; away(false); }
if(!chip.hidden){ var lf=lift(); chip.style.bottom='calc('+lf+'px + env(safe-area-inset-bottom))'; if(band) band.style.bottom=Math.max(0,lf-16)+'px'; }
}
var away0=0, awayOn=false;
function away(on){
if(on===awayOn||!chip) return; awayOn=on;
chip.classList.toggle('pl-away',on); if(band) band.classList.toggle('pl-away',on);
}
var awayKey=null;
function awayWatch(){
var lastY=window.scrollY||0, low=lastY, q=false, input=0;
function mark(){ input=Date.now(); }
['wheel','touchmove'].forEach(function(ev){ window.addEventListener(ev,mark,{passive:true}); });
window.addEventListener('keydown',function(e){ if(/^(PageDown|PageUp|ArrowDown|ArrowUp|Home|End| |Spacebar)$/.test(e.key)) mark(); });
function chk(){ q=false;
var y=window.scrollY||0, end=document.documentElement.scrollHeight-window.innerHeight-4, mine=Date.now()-input<600;
if(!mine){ lastY=y; low=y; if(y<40||y>=end) away(false); return; }
if(y>lastY+2){ low=y; if(y>80) away(true); }
else if(y<lastY-2){ if(low-y>=60) away(false); }
if(y<40||y>=end) away(false);
lastY=y; }
window.addEventListener('scroll',function(){ if(!q){ q=true; requestAnimationFrame(chk); } },{passive:true});
}
function lift(){
var y=window.innerHeight-24, es=document.elementsFromPoint?document.elementsFromPoint(32,y):[], i, n, cs, r;
for(i=0;i<es.length;i++){
if(es[i]===chip||es[i]===done||es[i]===band) continue;
for(n=es[i];n&&n!==document.body&&n!==document.documentElement;n=n.parentElement){
cs=getComputedStyle(n);
if(cs.position==='fixed'||cs.position==='sticky'){ r=n.getBoundingClientRect(); return r.top>window.innerHeight*0.5?Math.round(window.innerHeight-r.top)+12:16; }
}
return 16;
}
return 16;
}
var done=null, padded=null;
function openLayer(sel){ var a=document.querySelectorAll(sel||'[aria-modal=true]'), i, r, best=null;
for(i=0;i<a.length;i++){ r=a[i].getBoundingClientRect();
if(!(r.width>0&&r.height>0)||getComputedStyle(a[i]).visibility==='hidden') continue;
if(r.bottom>0&&r.top<window.innerHeight) return a[i];
best=best||a[i]; }
return best; }
function roomFor(on){
if(padded&&(!on||!padded.isConnected)){ padded.style.paddingBottom=padded.getAttribute('data-pl-pb')||''; padded.style.scrollPaddingBottom='';
padded.removeAttribute('data-pl-pb'); padded=null; }
if(!on||padded) return;
var m=openLayer(); if(!m) return;
var c=[m].concat([].slice.call(m.querySelectorAll('div,section,article,ul,ol,form,dialog'))), i, cs;
for(i=0;i<c.length&&!padded;i++){ cs=getComputedStyle(c[i]); if(/(auto|scroll)/.test(cs.overflowY)) padded=c[i]; }
padded=padded||m;
var pb=parseFloat(getComputedStyle(padded).paddingBottom)||0;
padded.setAttribute('data-pl-pb',padded.style.paddingBottom||'');
padded.style.paddingBottom='calc('+pb+'px + 72px + env(safe-area-inset-bottom))';
padded.style.scrollPaddingBottom='calc(72px + env(safe-area-inset-bottom))';      
}
function paintDone(){
var on=anyOpen(), own=!!openLayer('[aria-modal=true][data-pl-foot]'),
phone=window.matchMedia('(max-width:640px)').matches||(window.matchMedia('(max-width:760px)').matches&&!!document.querySelector('.pl-switch.is-open'));
if(on&&phone&&!own){
if(!done){
done=document.createElement('button'); done.type='button'; done.className='pl-done'; done.textContent='Done'; done.setAttribute('data-pl-keep','');
done.addEventListener('click',function(){
var t=openLayer()||document.body;
PL._subEsc=0;
t.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}));
if(PL._subEsc) return;              
setTimeout(function(){ if(anyOpen()) H.back(); },150);
});
document.body.appendChild(done);
}
done.hidden=false; roomFor(true);
} else { if(done) done.hidden=true; roomFor(false); }
paintUnder(on&&phone);
}
var under=null, probe=null, uq=false;
function edgeLook(y){
var es=document.elementsFromPoint?document.elementsFromPoint(2,y):[], i, n, cs, bg;
for(i=0;i<es.length;i++){
if(es[i]===done||es[i]===chip||es[i]===probe||(under&&(es[i]===under[0]||es[i]===under[1]))) continue;
for(n=es[i];n&&n!==document.body&&n!==document.documentElement;n=n.parentElement){
cs=getComputedStyle(n); bg=cs.backgroundColor;
if(bg&&bg!=='transparent'&&!/^rgba\(.*,\s*0\)$/.test(bg)) return {bg:bg,bf:cs.webkitBackdropFilter||cs.backdropFilter||'none'};
}
return null;
}
return null;
}
function placeUnder(){
uq=false;
if(!under||!done||done.hidden) return;
under[0].hidden=under[1].hidden=true;
var r=probe.getBoundingClientRect(), y=window.scrollY||0, H=document.documentElement.scrollHeight, E=160,
a=edgeLook(r.top+1), b=edgeLook(r.bottom-1), t0=Math.max(0,y+r.top-E), b0=y+r.bottom;
[[a,t0,y+r.top-t0],[b,b0,Math.min(E,H-b0)]].forEach(function(p,k){
var d=under[k]; if(!p[0]||p[2]<1) return;
d.style.background=p[0].bg; d.style.webkitBackdropFilter=d.style.backdropFilter=p[0].bf;
d.style.top=p[1]+'px'; d.style.height=p[2]+'px'; d.hidden=false;
var off=d.getBoundingClientRect().top+y-p[1]; if(Math.abs(off)>.5) d.style.top=(p[1]-off)+'px';   
});
}
function queueUnder(){ if(!uq&&done&&!done.hidden){ uq=true; requestAnimationFrame(placeUnder); } }
function paintUnder(on){
if(!on){ if(under) under[0].hidden=under[1].hidden=true; return; }
if(!under){
probe=document.createElement('i'); probe.setAttribute('aria-hidden','true'); probe.setAttribute('data-pl-keep','');
probe.style.cssText='position:fixed;left:0;top:0;bottom:0;width:0;visibility:hidden;pointer-events:none';
document.body.appendChild(probe);
under=[0,1].map(function(){ var d=document.createElement('div'); d.className='pl-under'; d.hidden=true;
d.setAttribute('aria-hidden','true'); d.setAttribute('data-pl-keep',''); document.body.appendChild(d); return d; });
window.addEventListener('scroll',queueUnder,{passive:true});
if(window.visualViewport){ visualViewport.addEventListener('resize',queueUnder); visualViewport.addEventListener('scroll',queueUnder); }
document.addEventListener('transitionend',queueUnder,true); document.addEventListener('animationend',queueUnder,true);
}
queueUnder(); [90,320,700].forEach(function(t){ setTimeout(queueUnder,t); });   
}
var css=document.createElement('style');
css.textContent='.pl-ret-chip,.pl-done{position:fixed;z-index:2147483000;display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 18px;border-radius:999px;'
+'border:1px solid var(--rule-strong,rgba(0,0,0,.2));background:var(--ink,#1c1a15);color:var(--paper,#fbf8f1);font:inherit;font-size:var(--fs-17);line-height:var(--lh-24);font-weight:600;cursor:pointer;'
+'box-shadow:0 10px 26px -10px rgba(20,18,10,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
+'.pl-ret-chip{left:16px;bottom:calc(16px + env(safe-area-inset-bottom));max-width:min(80vw,380px);'
+'background:var(--card,#fff);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);'
+'color:var(--ink,#1c1a15);font-size:var(--fs-15);line-height:var(--lh-24);padding:0 16px;box-shadow:0 8px 24px -8px rgba(0,0,0,.45),inset 0 0 0 .5px rgba(255,255,255,.08)}'
+'.pl-done{left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));min-width:132px;height:48px;font-size:var(--fs-17);line-height:var(--lh-24)}'
+'.pl-ret-chip[hidden],.pl-done[hidden]{display:none}.pl-ret-chip:focus-visible,.pl-done:focus-visible{outline:2px solid var(--accent,#9a3b1b);outline-offset:2px}'
+'.pl-under{position:absolute;left:0;right:0;z-index:59;pointer-events:none}.pl-under[hidden]{display:none}'
+'.pl-ret-band{position:fixed;left:0;right:0;bottom:0;z-index:2147482999;height:calc(76px + env(safe-area-inset-bottom));'
+'background:var(--paper,#fbf8f1);border-top:1px solid var(--rule,rgba(0,0,0,.12));box-shadow:0 -10px 24px -18px rgba(20,18,10,.45)}'
+'.pl-ret-room{height:calc(76px + env(safe-area-inset-bottom))}.pl-ret-band[hidden],.pl-ret-room[hidden]{display:none}'
+'.pl-ret-chip,.pl-ret-band{transition:transform .2s ease,opacity .2s ease}'
+'.pl-ret-chip.pl-away{transform:translateY(calc(100% + 40px));opacity:0;pointer-events:none}'
+'.pl-ret-band.pl-away{transform:translateY(100%);opacity:0;pointer-events:none}'
+'.pl-ret-chip.pl-away:focus-visible{transform:none;opacity:1;pointer-events:auto}'
+'@media (prefers-reduced-motion:reduce){.pl-ret-chip,.pl-ret-band{transition:none}}'
+'@media (min-width:1220px){.pl-ret-chip{left:calc(50vw - 570px)}}'
+'@media print{.pl-ret-chip,.pl-done,.pl-under,.pl-ret-band,.pl-ret-room{display:none!important}}';
(document.head||document.documentElement).appendChild(css);
window.addEventListener('resize',function(){ paint(); queueUnder(); });
window.addEventListener('pageshow',function(e){ if(e.persisted){ store('go',null); settling=false; paint(); } });
function boot(){ settle(); paint();
var mo=document.getElementById('modal');
if(mo&&window.MutationObserver) new MutationObserver(function(){ paint(); }).observe(mo,{attributes:true,attributeFilter:['hidden']});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else setTimeout(boot,0);
PL.ret={
saved:saved, restoring:!!saved, back:back, paint:paint,
keep:function(fn){ keepFn=fn; },
label:function(fn){ labelFn=fn; },
adopt:!!(saved&&st.plLayer)          
};
})();
})();}
if(document.querySelector('base[href]')){var self=location.href.replace(/#.*$/,'');
[].forEach.call(document.querySelectorAll('a[href^="#"]'),function(a){a.setAttribute('href',self+a.getAttribute('href'));});}
(function(){var m=document.getElementById('main');if(!m)return;if(!m.hasAttribute('tabindex'))m.setAttribute('tabindex','-1');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.pl-skip');if(!a||!/#main$/.test(a.getAttribute('href')||''))return;
e.preventDefault();m.focus({preventScroll:true});m.scrollIntoView({block:'start'});});})();
function themeNow(){var c=root.getAttribute('data-theme');
if(c!=='dark'&&c!=='light')c=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';return c;}
var tbs=[].slice.call(document.querySelectorAll('.pl-theme'));
function themeLabel(){var l=themeNow()==='dark'?'Switch to light theme':'Switch to dark theme';tbs.forEach(function(b){b.setAttribute('aria-label',l);});}
tbs.forEach(function(b){b.addEventListener('click',function(){var n=themeNow()==='dark'?'light':'dark';
root.setAttribute('data-theme',n);try{localStorage.setItem('pl-theme',n);}catch(e){}themeLabel();});});
if(tbs.length)themeLabel();
(function(){function live(){requestAnimationFrame(function(){root.classList.add('pl-live');});}
if(document.readyState==='complete')live();else window.addEventListener('load',live);})();
(function(){
var DAY=864e5,printing=false;
function two(n){return n<10?'0'+n:''+n;}
function iso(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function mdy(d,ref){return two(d.getMonth()+1)+'/'+two(d.getDate())+(ref&&d.getFullYear()!==ref.getFullYear()?'/'+d.getFullYear():'');}
var MON=['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'];
function ml(d){return MON[d.getMonth()]+' '+d.getDate();}
[].forEach.call(document.querySelectorAll('[data-until]'),function(el){ var u=iso(el.getAttribute('data-until')); if(u&&Date.now()>u.getTime()+DAY) el.remove(); });   
var items=[].slice.call(document.querySelectorAll('[data-pl-next],[data-pl-built]')).map(function(el){
return {el:el,orig:el.innerHTML,cur:el.innerHTML,hid:false};});
function retense(it,now){
var el=it.el,html=it.orig,hide=false,nx=iso(el.getAttribute('data-pl-next')),bt=iso(el.getAttribute('data-pl-built')),sh=el.hasAttribute('data-pl-short'),noun=el.getAttribute('data-pl-short')||'bills';
if(!printing){
if(nx){
var late=now.getTime()>=new Date(nx.getFullYear(),nx.getMonth(),nx.getDate()+1).getTime();
if(late&&el.getAttribute('data-pl-after')==='hide')hide=true;
else html=late?'<b>'+ml(nx)+'</b> '+noun+' not on this site yet':noun+' expected <b>'+ml(nx)+'</b>';
}
if(bt){
var n=Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-bt)/DAY);
if(n>7){var re=/built\s*(?:<b>)?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:<\/b>)?/i,age=n+' days ago';
if(sh)html='updated <b>'+age+'</b>';
else html=re.test(html)?html.replace(re,'built <b>'+age+'</b> ($1)'):html+' <span class="pl-age">\u00b7 built <b>'+age+'</b></span>';}
}
}
if(html!==it.cur){el.innerHTML=html;it.cur=html;}
if(el.getAttribute('data-pl-after')==='hide'&&hide!==it.hid){if(hide)el.setAttribute('hidden','');else el.removeAttribute('hidden');it.hid=hide;}
}
function apply(){var now=new Date();items.forEach(function(it){retense(it,now);});}
PL.fresh={apply:apply,count:function(){return items.length;}};
if(items.length){
apply();
window.addEventListener('beforeprint',function(){printing=true;apply();});
window.addEventListener('afterprint',function(){printing=false;apply();});
try{var mq=window.matchMedia('print'),pf=function(e){printing=!!e.matches;apply();};
if(mq.addEventListener)mq.addEventListener('change',pf);else if(mq.addListener)mq.addListener(pf);}catch(e){}
document.addEventListener('visibilitychange',function(){if(!document.hidden)apply();});
window.addEventListener('pageshow',function(e){if(e.persisted)apply();});
setInterval(apply,600000);
}
})();
(function(){
var SEL='[data-pl-chart]';
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function base(){return (PL.canonURL?PL.canonURL(location.href):location.href).split('#')[0].split('?')[0];}
function chartEl(id){var a=document.querySelectorAll(SEL);for(var i=0;i<a.length;i++)if(a[i].getAttribute('data-pl-chart')===id)return a[i];return null;}
function stateOf(el){var q=el&&el.getAttribute('data-pl-state');return q?q.replace(/^[?&]/,''):'';}
function embedUrl(id){var q=stateOf(chartEl(id));return base()+'?embed='+encodeURIComponent(id)+(q?'&'+q:'');}
function snippet(id){var el=chartEl(id),t=(el&&el.getAttribute('data-pl-title'))||'Public Ledger chart',
h=el?(+el.getAttribute('data-pl-embed-h')||Math.ceil(el.getBoundingClientRect().height)+90):420;
return '<iframe src="'+esc(embedUrl(id))+'" title="'+esc(t)+' (Public Ledger)" width="100%" height="'+h+'" style="border:0;max-width:760px" loading="lazy"></iframe>';}
function copy(text,done){
function fb(){var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:0';
document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}document.body.removeChild(ta);done(ok);}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){done(true);},fb);else fb();}
function mountOne(dout){
var charts=[].filter.call(document.querySelectorAll(SEL),function(el){return el.getAttribute('data-pl-chart');}),
row=dout.querySelector('.pl-dout-emb');
if(!charts.length){if(row)row.parentNode.removeChild(row);return;}
if(!row){
row=document.createElement('div');row.className='pl-dout-emb';
row.innerHTML='<label class="pl-dout-embl" for="plEmbPick">Embed a chart from this page on your own site</label>'+
'<div class="pl-dout-embr"><select id="plEmbPick"></select><button class="pl-dout-a" type="button">Copy embed code</button></div>'+
'<p class="pl-emb-st" role="status"></p>';
dout.appendChild(row);
var b=row.querySelector('button'),s=row.querySelector('.pl-emb-st'),box=null,tm=null;
b.addEventListener('click',function(){var code=snippet(row.querySelector('select').value);
copy(code,function(ok){
b.textContent=ok?'Embed code copied':'Copy the code below';s.textContent=ok?'An iframe of this chart, with its source and tie-out: paste it into any page.':'';
if(!ok){if(!box){box=document.createElement('textarea');box.className='pl-emb-code';box.readOnly=true;box.setAttribute('aria-label','Embed code');row.appendChild(box);}
box.value=code;box.focus();box.select();}
clearTimeout(tm);tm=setTimeout(function(){b.textContent='Copy embed code';s.textContent='';},ok?2600:9000);});});
}
var sel=row.querySelector('select'),was=sel.value;
sel.innerHTML=charts.map(function(el){var id=el.getAttribute('data-pl-chart');
return '<option value="'+esc(id)+'">'+esc(el.getAttribute('data-pl-title')||id)+'</option>';}).join('');
if(was&&chartEl(was))sel.value=was;
}
function mount(scope){
var dout=document.querySelector('.pl-dout');
if(dout){mountOne(dout);return;}
[].forEach.call((scope||document).querySelectorAll(SEL),function(el){
var id=el.getAttribute('data-pl-chart');if(!id||el.querySelector('.pl-emb-bar'))return;
var bar=document.createElement('div'),b=document.createElement('button'),s=document.createElement('span'),box=null,tm=null;
bar.className='pl-emb-bar';b.type='button';b.className='pl-emb-btn';b.textContent='Copy embed';
b.setAttribute('aria-label','Copy embed code for '+(el.getAttribute('data-pl-title')||id));
s.className='pl-emb-st';s.setAttribute('role','status');
b.addEventListener('click',function(){var code=snippet(id);
copy(code,function(ok){
b.textContent=ok?'Embed copied':'Copy the code below';s.textContent=ok?'An iframe of this chart, with its source and tie-out: paste it into any page.':'';
if(!ok){if(!box){box=document.createElement('textarea');box.className='pl-emb-code';box.readOnly=true;box.setAttribute('aria-label','Embed code');bar.appendChild(box);}
box.value=code;box.focus();box.select();}
clearTimeout(tm);tm=setTimeout(function(){b.textContent='Copy embed';s.textContent='';},ok?2600:9000);});});
bar.appendChild(b);bar.appendChild(s);
var slot=el.querySelector('[data-pl-embed-slot]');(slot||el).appendChild(bar);});}
function enter(id){
root.classList.add('pl-embed');
var th=/[?&]theme=(dark|light)\b/.exec(location.search);if(th)root.setAttribute('data-theme',th[1]);
var el=chartEl(id),q=stateOf(el),back=base()+(q?'?'+q:'')+(el&&el.id?'#'+el.id:'');
function link(t){var a=document.createElement('a');a.className='pl-emb-link';a.href=back;a.target='_top';a.rel='noopener';a.textContent=t;return a;}
if(!el){[].forEach.call(document.body.children,function(c){if(!/^(SCRIPT|STYLE|LINK)$/.test(c.tagName))c.classList.add('pl-emb-x');});
var m=document.createElement('div');m.className='pl-emb-miss';m.appendChild(document.createTextNode('There is no chart called \u201c'+id+'\u201d on this page. '));
m.appendChild(link('Public Ledger \u00b7 open the full page'));document.body.appendChild(m);return;}
var n=el;
while(n&&n!==document.body){var p=n.parentNode;if(!p)break;
[].forEach.call(p.children,function(c){if(c!==n&&!/^(SCRIPT|STYLE|LINK|META|TEMPLATE)$/.test(c.tagName))c.classList.add('pl-emb-x');});
if(p!==document.body){p.classList.add('pl-emb-path');p.removeAttribute('hidden');p.removeAttribute('inert');if(p.tagName==='DETAILS')p.open=true;}
n=p;}
el.removeAttribute('hidden');
var title=el.getAttribute('data-pl-title')||id,src=el.getAttribute('data-pl-source'),tie=el.getAttribute('data-pl-tie');
var h=document.createElement('div');h.className='pl-emb-h';h.setAttribute('role','heading');h.setAttribute('aria-level','1');h.textContent=title;
el.parentNode.insertBefore(h,el);
var f=document.createElement('div');f.className='pl-emb-f';
if(src){var s=document.createElement('span');s.className='pl-emb-src';s.textContent='Source: '+src;f.appendChild(s);}
if(tie){var t=document.createElement('span');t.className='pl-emb-tie';var i=document.createElement('i');i.setAttribute('aria-hidden','true');i.textContent='\u2713';
t.appendChild(i);t.appendChild(document.createTextNode(tie));f.appendChild(t);}
f.appendChild(link('Public Ledger \u00b7 open the full page'));
el.parentNode.insertBefore(f,el.nextSibling);
document.title=title+' | Public Ledger';
function post(){try{if(window.parent&&window.parent!==window)window.parent.postMessage({type:'pl-embed-height',id:id,height:Math.ceil(root.getBoundingClientRect().height)},'*');}catch(e){}}
if(window.ResizeObserver)new ResizeObserver(post).observe(document.body);
window.addEventListener('load',post);post();
try{el.dispatchEvent(new CustomEvent('pl:embed',{bubbles:true,detail:{id:id}}));window.dispatchEvent(new Event('resize'));}catch(e){}}
var em=/[?&]embed=([^&#]*)/.exec(location.search),eid=em?decodeURIComponent(em[1].replace(/\+/g,' ')):null;
PL.embed={url:embedUrl,snippet:snippet,mount:mount,mode:eid};
if(eid)enter(eid);else mount();
})();
var sw=document.getElementById('plSwitch'),scrim=document.getElementById('plScrim'),go=document.querySelector('.pl-go');
if(!sw)return;
var groups=[].slice.call(sw.querySelectorAll('.pl-group'));
var phone=window.matchMedia('(max-width:760px)');      
var opener=null;
function sheetOpen(){return sw.classList.contains('is-open');}
var L=PL.layer({hide:function(){hideSheet(true);},isOpen:sheetOpen});
function hideSheet(fromPop,quiet){
if(!sheetOpen())return;
sw.classList.remove('is-open');scrim.hidden=true;root.style.overflow='';
if(go)go.setAttribute('aria-expanded','false');
L.unmodal({focus:!quiet});
if(!quiet&&opener&&opener.focus)opener.focus();
opener=null;
if(!fromPop)L.pop();
}
function closeAll(){var back=null;groups.forEach(function(g){
if(g.hasAttribute('data-open')&&g.contains(document.activeElement))back=g.querySelector('.pl-verb');
g.removeAttribute('data-open');var b=g.querySelector('.pl-verb');if(b)b.setAttribute('aria-expanded','false');});
if(back)back.focus();
hideSheet(false);}
function setOpen(g,on){if(on)g.setAttribute('data-open','');else g.removeAttribute('data-open');
var b=g.querySelector('.pl-verb');if(b)b.setAttribute('aria-expanded',on?'true':'false');}
function openGroup(g){
if(phone.matches&&sheetOpen()){var was=g.hasAttribute('data-open');groups.forEach(function(o){setOpen(o,false);});if(!was)setOpen(g,true);return;}
var open=g.hasAttribute('data-open');closeAll();if(open)return;
setOpen(g,true);
var m=g.querySelector('.pl-menu');if(m){m.style.maxHeight='';var r=m.getBoundingClientRect(),room=Math.floor(window.innerHeight-r.top-12);
if(r.height>room)m.style.maxHeight=Math.max(180,room)+'px';}}
groups.forEach(function(g){var b=g.querySelector('.pl-verb');
b.addEventListener('click',function(e){e.stopPropagation();openGroup(g);});
b.addEventListener('keydown',function(e){if(e.key==='ArrowDown'&&g.hasAttribute('data-open')){e.preventDefault();e.stopPropagation();
var a=g.querySelector('.pl-dest,.pl-xp');if(a)a.focus();}});});
if(go){go.addEventListener('click',function(e){e.stopPropagation();
if(sheetOpen()){closeAll();return;}
opener=go;sw.classList.add('is-open');scrim.hidden=false;root.style.overflow='hidden';go.setAttribute('aria-expanded','true');
groups.forEach(function(g){setOpen(g,false);});
L.push();
L.modal(sw,{phoneOnly:760,opener:go,label:'Go to any Public Ledger page',focus:'.pl-dest'});});}
var x=sw.querySelector('.pl-close');if(x)x.addEventListener('click',closeAll);
scrim.addEventListener('click',closeAll);
sw.addEventListener('click',function(e){
var a=e.target.closest&&e.target.closest('a[href]');if(!a||!sheetOpen())return;
if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||(a.target&&a.target!=='_self'))return;
var href=a.href,here=location.href;
if(href.split('#')[0]===here.split('#')[0]&&href.indexOf('#')<0){e.preventDefault();closeAll();return;}
if(!L.pushed)return;
e.preventDefault();L.pushed=false;hideSheet(true,true);location.replace(href);});
document.addEventListener('click',function(e){if(!sw.contains(e.target)&&!(go&&go.contains(e.target)))closeAll();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){var was=groups.some(function(g){return g.hasAttribute('data-open');})||sheetOpen();
if(was){closeAll();e.stopPropagation();}}});
sw.addEventListener('keydown',function(e){if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
if(!(e.target.closest&&e.target.closest('.pl-dest,.pl-xp,.pl-part,.pl-about')))return;
var items=[].slice.call(sw.querySelectorAll('.pl-dest,.pl-xp,.pl-part,.pl-about')).filter(function(a){return a.offsetParent!==null;});
var i=items.indexOf(document.activeElement);if(i<0)return;e.preventDefault();
var n=items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length];if(n)n.focus();});
phone.addEventListener?phone.addEventListener('change',closeAll):phone.addListener(closeAll);
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-focus]');if(!a)return;
var id=a.getAttribute('data-focus');if(!id)return;closeAll();
setTimeout(function(){var el=document.getElementById(id);if(el){el.focus({preventScroll:true});}},350);});
window.addEventListener('beforeprint',function(){[].forEach.call(document.querySelectorAll('.pregrow'),function(el){el.classList.remove('pregrow');});});
(function(){var op=[];window.addEventListener('beforeprint',function(){op=[].filter.call(document.querySelectorAll('details.pl-sm:not([open])'),function(d){d.open=true;return true;});});
window.addEventListener('afterprint',function(){op.forEach(function(d){d.open=false;});op=[];});})();
})();
(function(){
var TO=['jjcurry027','gmail.com'].join('@'), NL=String.fromCharCode(10);
function txt(el){return (el.textContent||'').replace(/\s+/g,' ').trim();}
function subject(){ return 'Public Ledger correction: '+((document.title||'').split(' | ')[0].replace(/\s+/g,' ').trim()||'a page'); }
function own(el){ var a=el.getAttribute('data-pl-record'); return a&&a.trim()?a.replace(/\s+/g,' ').trim():''; }
function shown(el){ return el.offsetParent!==null||el.getClientRects().length>0||!!(own(el)&&el.parentElement&&el.parentElement.offsetParent!==null&&!el.closest('[data-part]:not([data-part-on])')); }
function flat(n){ var s='', pb=false;
[].forEach.call(n.childNodes,function(c){ var t='', b=false;
if(c.nodeType===3) t=c.nodeValue; else if(c.nodeType===1&&!/^(SCRIPT|STYLE|TEMPLATE)$/.test(c.tagName)){ t=flat(c); b=!/^(inline|contents|none)/.test(getComputedStyle(c).display); }
if(!t) return;
if((b||pb)&&s&&!/\s$/.test(s)&&!/^\s/.test(t)) s+=' · ';      
s+=t; pb=b; });
return s; }
function said(el){ return own(el)||flat(el).replace(/\s+/g,' ').trim(); }
function cap(s,n){ if(s.length<=n) return s; var c=s.slice(0,n-1), i=c.lastIndexOf(' '); return (i>n*0.6?c.slice(0,i):c).replace(/[\s·,;:—-]+$/,'')+'…'; }
function body(){
var main=document.querySelector('main'), seen=[];
var rec=[].filter.call(document.querySelectorAll('[data-pl-record]'),function(el){
if(el.tagName==='MAIN'||el===document.body||(main&&el.contains(main))||!shown(el)) return false;
if(seen.some(function(s){ return s.contains(el); })) return false;      
seen.push(el); return !!said(el); }).map(said).join(' — ');
var pr=[].map.call(document.querySelectorAll('[data-pl-prompts]'),function(el){ return (el.getAttribute('data-pl-prompts')||'').trim(); }).filter(Boolean)[0]||'';
return ['Page: '+location.href].concat(rec?['Record: '+cap(rec,300)]:[],
['','What is wrong:'],pr?[cap(pr,300)]:[],['','','What it should say:','','','A source, if you have one:','']).join(NL);
}
function mail(){ return 'mailto:'+TO+'?subject='+encodeURIComponent(subject())+'&body='+encodeURIComponent(body()); }
function arm(e){var a=e.target&&e.target.closest&&e.target.closest('a[data-pl-correct]');if(a)a.href=mail();}
['pointerdown','focusin','click'].forEach(function(ev){document.addEventListener(ev,arm,true);});
function copy(text,done){
function fb(){var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:0';
document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}document.body.removeChild(ta);done(ok);}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){done(true);},fb);else fb();}
document.addEventListener('click',function(e){
var b=e.target&&e.target.closest&&e.target.closest('[data-pl-correct-copy]'); if(!b) return;
var said=b.parentNode.querySelector('.pl-cx-said');
copy(['To: '+TO,'Subject: '+subject(),'',body()].join(NL),function(ok){
if(said) said.textContent=ok?'Copied. Paste it into any email or message to '+TO+'.':'Copying is blocked here: write to '+TO+'.';
});
});
})();
(function(){
var mast=document.querySelector('header.pl-mast'); if(!mast||!window.PL||/[?&]embed=/.test(location.search)) return;
var ROOT=mast.getAttribute('data-root')||'', IDX=null, R=null, AT=null, DT=null, RS=null, RT=null, ld={}, bad={};
var MON=['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'], B36='0123456789abcdefghijklmnopqrstuvwxyz';
var HINT='A business, an address, a resolution, a legislator, a town or a page.';
var LONG={e:'east',w:'west',n:'north',s:'south',st:'street',ave:'avenue',av:'avenue',rd:'road',dr:'drive',pl:'place',ct:'court',
ln:'lane',blvd:'boulevard',pkwy:'parkway',terr:'terrace',ter:'terrace',cir:'circle',hwy:'highway',sq:'square',
'1st':'first','2nd':'second','3rd':'third','4th':'fourth','5th':'fifth','6th':'sixth','7th':'seventh','8th':'eighth','9th':'ninth',
'10th':'tenth','11th':'eleventh','12th':'twelfth','13th':'thirteenth','14th':'fourteenth','15th':'fifteenth','16th':'sixteenth',
'17th':'seventeenth','18th':'eighteenth','19th':'nineteenth','20th':'twentieth'};
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function money(n){ return n>=1e6?'$'+(n/1e6).toFixed(n>=1e8?0:n>=1e7?1:2).replace(/\.?0+$/,'')+'M':n>=1e4?'$'+Math.round(n/1e3).toLocaleString('en-US')+'K':'$'+Math.round(n).toLocaleString('en-US'); }
function day(iso){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||''); return m?MON[+m[2]-1]+' '+(+m[3])+', '+m[1]:''; }
function toks(s){ return String(s).toLowerCase().replace(/[’']/g,'').split(/[^a-z0-9&]+/).filter(Boolean); }
function every(t,q){ return q.every(function(w){ return t.some(function(x){ return x.indexOf(w)===0; }); }); }
function named(w){ return /[a-z]{3,}/.test(w)||/^\d+(st|nd|rd|th)$/.test(w); }
function awords(s){ return String(s).toLowerCase().replace(/[,#]|\.(?=\s|$)/g,' ').split(/\s+/).filter(Boolean); }
function atoks(s){ var w=awords(s); return w.concat(w.map(function(x){ return LONG[x]; }).filter(Boolean)); }
function starts(t,w){ var l=LONG[w]; return t.some(function(x){ return x.indexOf(w)===0||(l&&x.indexOf(l)===0); }); }
function hl(text,q){
text=String(text);
var ws=q.map(function(w){ return w.replace(/[^a-z0-9&]/g,''); }).filter(Boolean).sort(function(a,b){ return b.length-a.length; });
if(!ws.length) return esc(text);
var rx=new RegExp('(^|[^a-z0-9])('+ws.join('|')+')','gi'), out='', i=0, m;
while((m=rx.exec(text))){ var at=m.index+m[1].length; out+=esc(text.slice(i,at))+'<b>'+esc(m[2])+'</b>'; i=at+m[2].length; if(!m[0].length) rx.lastIndex++; }
return out+esc(text.slice(i));
}
function get(u){ if(location.protocol==='file:') return Promise.reject(new Error(u)); return fetch(ROOT+u).then(function(r){ if(!r.ok) throw new Error(u); return r.json(); }); }
function need(k,f){
if(ld[k]||(bad[k]&&Date.now()-bad[k]<8000)) return ld[k]||null;
ld[k]=f().then(function(x){ delete bad[k]; return x; },function(e){ ld[k]=null; bad[k]=Date.now(); throw e; });
return ld[k];
}
function core(){ return need('i',function(){ return get('data/search-index.json').then(function(d){ IDX=d; }); }); }
function after(){ var c=core(); return c||Promise.reject(new Error('index')); }
function roll(){ return need('r',function(){ return after().then(function(){ return Promise.all([get(IDX.files.roll),get(IDX.files.table)]); }).then(function(a){
R=a[0]; AT=R.a.map(atoks); DT=(a[1].year===R.year&&a[1].parcels===R.a.length)?a[1]:null; }); }); }
function res(){ return need('s',function(){ return after().then(function(){ return get(IDX.files.res); }).then(function(d){
RS=d.rows; RT=RS.map(function(r){ return toks(r[0]+' '+r[2]); }); }); }); }
function district(i){
if(!DT) return null;
var c=DT.r.substr(2*i,2); if(!c||c==='--') return '';
var b=DT.blocks[B36.indexOf(c.charAt(0))*36+B36.indexOf(c.charAt(1))]; return b?b[2]:null;
}
function find(raw){
var q=toks(raw), lo=raw.trim().toLowerCase(), out=[], n=0, wait=[];
if(!IDX) return {g:out,n:0,wait:['the index']};
function group(k,h,rows,all,strong,note){ if(rows.length||note){ out.push({k:k,h:h,rows:rows,all:all,strong:strong,note:note}); n+=rows.length; } }
if(!q.length){
group('p','Pages',IDX.pages.map(function(p){ return {href:p[2],t:esc(p[0]),s:esc(p[1])}; }),null,0);
return {g:out,n:n,wait:wait,empty:true};
}
var aq=awords(raw), fails=[];
if(aq.some(named)){
if(!R){ if(bad.r) fails.push(['r','The North Tonawanda address list']); else wait.push('the roll'); }      
else{
var num=/^\d+$/.test(aq[0])?+aq[0]:null, rest=aq.slice(1), hits=[], i;
if(num!==null&&rest.length&&rest.some(named)){
for(i=0;i<AT.length;i++) if(rest.every(function(w){ return starts(AT[i],w); })) hits.push(i);
hits.sort(function(a,b){ var na=parseFloat(R.a[a]), nb=parseFloat(R.a[b]); return (isNaN(na)?1e9:Math.abs(na-num))-(isNaN(nb)?1e9:Math.abs(nb-num))||a-b; });
} else {
for(i=0;i<AT.length;i++) if(aq.every(function(w){ return starts(AT[i],w); })) hits.push(i);
hits.sort(function(a,b){ var la=/^\d/.test(R.a[a])?0:1, lb=/^\d/.test(R.a[b])?0:1, na=parseFloat(R.a[a])||0, nb=parseFloat(R.a[b])||0;
return la-lb||R.a[a].replace(/^[\d\s\/-]+/,'').localeCompare(R.a[b].replace(/^[\d\s\/-]+/,''))||na-nb||a-b; });
}
var arows=hits.slice(0,5).map(function(i){
var d=district(i), m=d&&IDX.dist[d];
return {href:'index.html?addr='+encodeURIComponent(R.a[i])+'#home', t:hl(R.a[i],aq),
s:(d===''?'no district on the State&rsquo;s parcel map':m?'District '+d+' &middot; '+esc(m[0]):d?'District '+d:'')+(d===null?'':' &middot; ')+'tax estimate for this home'};
});
group('a','Addresses &middot; North Tonawanda roll',arows,null,2,hits.length>5?(hits.length.toLocaleString('en-US')+' addresses match: add the house number'):null);
}
}
if(lo.length>=2){
var pay=IDX.payees.filter(function(p){ return p[0].toLowerCase().indexOf(lo)>=0; });
group('y','Payees',pay.slice(0,5).map(function(p){
return {href:'payees/'+p[1]+'.html',t:hl(p[0],q),s:p[3].toLocaleString('en-US')+(p[3]===1?' claim':' claims')+' approved',v:money(p[2])}; }),
[pay.length>5?{href:'payees/index.html?q='+encodeURIComponent(raw.trim()),t:'All '+pay.length.toLocaleString('en-US')+' payees matching &ldquo;'+esc(raw.trim())+'&rdquo;'}:null,
{href:'claims.html?q='+encodeURIComponent(raw.trim()),t:'Every claim mentioning &ldquo;'+esc(raw.trim())+'&rdquo;'}],
pay.some(function(p){ return (toks(p[0])[0]||'').indexOf(q[0]||'')===0; })?2:1);
}
var mem=IDX.members.filter(function(m){ return every(toks(m[0]+' '+m[1]),q); });
group('l','Legislators',mem.slice(0,5).map(function(m){ return {href:m[3],t:hl(m[0],q),s:esc(m[1])}; }),
mem.length>5?[{href:'legislators.html',t:'All '+mem.length+' legislators'}]:null, mem.some(function(m){ return every(toks(m[0]),q); })?2:1);
var gov=IDX.govs.filter(function(g){ return every(toks(g[0]),q); });
group('g','Towns, cities and the county',gov.slice(0,5).map(function(g){ return {href:g[2],t:hl(g[0],q),s:esc(g[1])}; }),
gov.length>5?[{href:'atlas.html#list',t:'All '+gov.length+' on the county list'}]:null, gov.length?2:0);
if(lo.replace(/[^a-z0-9]/g,'').length>=3){
if(!RS){ if(bad.s) fails.push(['s','The county resolutions']); else wait.push('the resolutions'); }
else{
var rh=[], idq=lo.replace(/\s+/g,'');
for(var j=0;j<RS.length;j++) if(every(RT[j],q)) rh.push(j);
rh.sort(function(a,b){ var ea=RS[a][0].toLowerCase()===idq?0:1, eb=RS[b][0].toLowerCase()===idq?0:1; return ea-eb||(RS[a][1]<RS[b][1]?1:RS[a][1]>RS[b][1]?-1:0); });
group('r','Resolutions'+(rh.length?' &middot; '+rh.length.toLocaleString('en-US')+(rh.length===1?' title matches':' titles match'):''),rh.slice(0,5).map(function(j){ var r=RS[j];
return {href:'decisions.html?open='+encodeURIComponent(r[0]),t:'<span class="num">'+hl(r[0],q)+'</span> &middot; '+hl(r[2],q),s:day(r[1])+(r[3]?' &middot; '+esc(r[3]):'')}; }),
[{href:'decisions.html?q='+encodeURIComponent(raw.trim())+'#register',t:'Every resolution mentioning &ldquo;'+esc(raw.trim())+'&rdquo;'}],
rh.length&&RS[rh[0]][0].toLowerCase()===idq?3:1);
}
}
var pg=IDX.pages.filter(function(p){ return every(toks(p[0]+' '+p[1]+' '+p[3]),q); });
group('p','Pages',pg.slice(0,5).map(function(p){ return {href:p[2],t:hl(p[0],q),s:esc(p[1])}; }),null, pg.some(function(p){ return every(toks(p[0]),q); })?2:0);
var ORD='ayrlgp';
out.sort(function(x,y){ return (y.strong||0)-(x.strong||0)||ORD.indexOf(x.k)-ORD.indexOf(y.k); });
return {g:out,n:n,wait:wait,fails:fails};
}
function failRow(id,k,name){ return '<div class="pl-om-g"><a class="pl-om-r pl-om-all pl-om-retry" role="option" tabindex="-1" aria-selected="false" id="'+id+'" href="#" data-retry="'+k+'">'+
'<span class="pl-om-t">'+name+' didn&rsquo;t load &mdash; try again</span><span class="pl-om-s">The connection may have dropped. Every page is also in the menu.</span></a></div>'; }
function retry(k){ delete bad[k]; ld[k]=null; var p=k==='i'?core():k==='r'?roll():res(); return p||Promise.reject(new Error(k)); }
function combo(inp,list,o){
o=o||{};
var act=-1, opts=[], said=null, sayT=null, last=null, live=document.getElementById(list.id+'S');
function expand(on){ if(o.inline) on=true; list.hidden=!on; inp.setAttribute('aria-expanded',on?'true':'false'); if(!on) mark(-1); if(o.place&&on) o.place(); }
function mark(i){
act=i; opts.forEach(function(a,j){ a.setAttribute('aria-selected',j===i?'true':'false'); });
if(i>=0&&opts[i]){ inp.setAttribute('aria-activedescendant',opts[i].id); opts[i].scrollIntoView({block:'nearest'}); } else inp.removeAttribute('aria-activedescendant');
}
function say(t){ if(!live) return; clearTimeout(sayT); sayT=setTimeout(function(){ if(t!==said){ live.textContent=t; said=t; } },500); }
function draw(){
var raw=inp.value, r=find(raw), h='', k=0, pre=list.id+'-';
if(r.empty&&!o.hint) h+='<p class="pl-om-n">'+HINT+'</p>';      
r.g.forEach(function(g,gi){
h+='<div class="pl-om-g" role="group" aria-labelledby="'+pre+'g'+gi+'"><p class="pl-om-h" id="'+pre+'g'+gi+'">'+g.h+'</p>';
g.rows.forEach(function(x){ h+='<a class="pl-om-r" role="option" tabindex="-1" aria-selected="false" id="'+pre+(k++)+'" href="'+esc(ROOT+x.href)+'"><span class="pl-om-t">'+x.t+'</span>'+
(x.s?'<span class="pl-om-s">'+x.s+'</span>':'')+(x.v?'<span class="pl-om-v num">'+x.v+'</span>':'')+'</a>'; });
if(g.note) h+='<p class="pl-om-x">'+g.note+'</p>';
(g.all||[]).forEach(function(x){ if(x) h+='<a class="pl-om-r pl-om-all" role="option" tabindex="-1" aria-selected="false" id="'+pre+(k++)+'" href="'+esc(ROOT+x.href)+'"><span class="pl-om-t">'+x.t+' &rarr;</span></a>'; });
h+='</div>';
});
if(!r.empty&&!r.n&&!r.wait.length) h+='<p class="pl-om-n">Nothing on Public Ledger goes by &ldquo;'+esc(raw.trim())+'&rdquo;.'+(raw.trim().length<2?'':' The two registers read every claim and every resolution:')+'</p>';
if(r.wait.length) h+='<p class="pl-om-n" aria-hidden="true">Looking in '+r.wait.join(' and ')+'&hellip;</p>';
(r.fails||[]).forEach(function(f){ h+=failRow(pre+(k++),f[0],f[1]); });
if(!r.empty&&!r.n&&!r.wait.length&&raw.trim().length>=2) h+='<div class="pl-om-g">'+
'<a class="pl-om-r pl-om-all" role="option" tabindex="-1" aria-selected="false" id="'+pre+(k++)+'" href="'+esc(ROOT+'claims.html?q='+encodeURIComponent(raw.trim()))+'"><span class="pl-om-t">Every claim mentioning &ldquo;'+esc(raw.trim())+'&rdquo; &rarr;</span></a>'+
'<a class="pl-om-r pl-om-all" role="option" tabindex="-1" aria-selected="false" id="'+pre+(k++)+'" href="'+esc(ROOT+'decisions.html?q='+encodeURIComponent(raw.trim())+'#register')+'"><span class="pl-om-t">Every resolution mentioning &ldquo;'+esc(raw.trim())+'&rdquo; &rarr;</span></a></div>';
h+='<p class="pl-om-f">Enter opens &middot; &uarr;&darr; move &middot; Esc closes &middot; nothing you type leaves this device</p>';
list.innerHTML=h; opts=[].slice.call(list.querySelectorAll('[role=option]'));
mark(!r.empty&&raw.trim()&&opts.length?0:-1);      
var N=opts.length;
say(r.empty?'':r.n?N+(N===1?' result':' results'):r.wait.length?'':N?'No matches: '+N+(N===1?' search':' searches')+' to try':'No results');
last=raw;
}
function run(){
var raw=inp.value, aq=awords(raw), lo=raw.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
var p=core();
function idxFail(){ list.innerHTML=failRow(list.id+'-0','i','The search index'); opts=[].slice.call(list.querySelectorAll('[role=option]')); mark(0); say('The search index didn’t load: try again'); }
if(!p&&!IDX){ idxFail(); return; }
draw();
if(p) p.then(function(){ if(inp.value===raw) draw();
var more=[];
if(aq.some(named)&&!R){ var a=roll(); if(a) more.push(a); }
if(lo.length>=3&&!RS){ var s=res(); if(s) more.push(s); }
more.forEach(function(m){ m.then(function(){ if(inp.value===raw) draw(); },function(){ if(inp.value===raw) draw(); }); });
},function(){ if(inp.value===raw) idxFail(); });
if(o.onInput) o.onInput(raw);
}
function again(a){ var k=a.getAttribute('data-retry'); a.querySelector('.pl-om-t').textContent='Trying again…';
retry(k).then(function(){ run(); },function(){ run(); }); }
inp.addEventListener('input',function(){ expand(true); run(); });
inp.addEventListener('focus',function(){ var c=core(); if(c) c.catch(function(){}); if(o.inline||inp.value||o.openOnFocus){ expand(true); run(); } });      
inp.addEventListener('keydown',function(e){
if(e.key==='ArrowDown'||e.key==='ArrowUp'){
if(list.hidden){ expand(true); run(); }
if(!opts.length) return; e.preventDefault();
var i=act<0?(e.key==='ArrowDown'?0:opts.length-1):(act+(e.key==='ArrowDown'?1:opts.length-1))%opts.length; mark(i); return;
}
if(e.key==='Enter'){ e.preventDefault();
if(act>=0&&opts[act]&&!list.hidden){ var a=opts[act]; if(a.hasAttribute('data-retry')){ again(a); return; } if(o.go) o.go(); location.href=a.href; }
else if(inp.value.trim()&&!o.inline) location.href=ROOT+'search.html?q='+encodeURIComponent(inp.value.trim());
return; }
if(e.key==='Escape'){
if(o.onEscape&&o.onEscape()){ e.preventDefault(); e.stopPropagation(); return; }
if(!list.hidden&&!o.inline){ e.preventDefault(); e.stopPropagation(); expand(false); return; }
if(inp.value){ e.preventDefault(); e.stopPropagation(); inp.value=''; run(); }
}
});
list.addEventListener('mousedown',function(e){ if(e.target.closest('[role=option]')) e.preventDefault(); });      
list.addEventListener('click',function(e){ var a=e.target.closest('[role=option]'); if(a&&a.hasAttribute('data-retry')){ e.preventDefault(); again(a); return; } if(a&&o.go) o.go(); });
return {draw:draw, run:run, expand:expand, input:inp};
}
var form=mast.querySelector('form.pl-omni'), desk=null;
if(form){
var di=form.querySelector('input'), dl=form.querySelector('[role=listbox]');
desk=combo(di,dl,{place:function(){
dl.style.left=''; var r=dl.getBoundingClientRect(), vw=document.documentElement.clientWidth;
if(r.right>vw-12) dl.style.left=Math.round(vw-12-r.right)+'px';
dl.style.maxHeight=Math.max(240,window.innerHeight-dl.getBoundingClientRect().top-16)+'px'; }});
form.addEventListener('submit',function(e){ e.preventDefault(); });
form.addEventListener('focusout',function(){ setTimeout(function(){ if(!form.contains(document.activeElement)) desk.expand(false); },120); });
document.addEventListener('pointerdown',function(e){ if(!form.contains(e.target)) desk.expand(false); });
}
var sx=null, L=null, sheet=null;
function build(){
sx=document.createElement('div'); sx.className='pl-sx'; sx.hidden=true;
sx.innerHTML='<div class="pl-sx-in" data-pl-foot><form class="pl-sx-top" role="search" action="'+esc(ROOT)+'search.html"><label class="pl-vh" for="plSxQ">Search Public Ledger</label>'+
'<input id="plSxQ" name="q" type="search" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="plSxL" aria-describedby="plSxH" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="Search everything">'+
'<button type="button" class="pl-sx-x">Done</button></form><p class="pl-sx-hint" id="plSxH">'+HINT+'</p><div class="pl-sx-res pl-om-l" id="plSxL" role="listbox" aria-label="Search results"></div>'+
'<p class="pl-vh" id="plSxLS" role="status" aria-live="polite"></p></div>';
document.body.appendChild(sx);
var inp=sx.querySelector('input');
sheet=combo(inp,sx.querySelector('#plSxL'),{inline:true,hint:true,onEscape:function(){ close(false); return true; }});
sx.querySelector('form').addEventListener('submit',function(e){ e.preventDefault(); });
sx.querySelector('.pl-sx-x').addEventListener('click',function(){ close(false); });
sx.addEventListener('click',function(e){ if(e.target===sx) close(false); });
L=PL.layer({hide:function(){ close(true); }, isOpen:function(){ return !sx.hidden; }});
}
function open(from,q){
if(desk&&desk.input.getClientRects().length){ desk.input.focus(); if(q!=null){ desk.input.value=q; } desk.expand(true); desk.run(); return; }
if(!sx) build();
sx.hidden=false; document.documentElement.classList.add('pl-sx-on');
if(q!=null) sheet.input.value=q;
L.open(sx.firstChild,{label:'Search Public Ledger',focus:'#plSxQ',opener:from});
sheet.run();
}
function close(fromPop){ if(!sx||sx.hidden) return; sx.hidden=true; document.documentElement.classList.remove('pl-sx-on'); L.close(fromPop); }
PL.search={open:open,close:close,find:function(raw){ return find(raw); },load:function(){ return Promise.all([core(),roll(),res()]); }};
[].forEach.call(document.querySelectorAll('[data-sx]'),function(b){
b.addEventListener('click',function(e){
if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button) return;
e.preventDefault();
var g=document.querySelector('.pl-go[aria-expanded=true]');
if(g){ g.click(); setTimeout(function(){ open(document.querySelector('.pl-searchbtn')||b); },160); } else open(b);
});
});
var pi=document.getElementById('sQ'), pl=document.getElementById('sQL');
if(pi&&pl){
var page=combo(pi,pl,{inline:true,hint:!!document.getElementById('sQH'),onInput:function(raw){ try{ history.replaceState(history.state,'',location.pathname+(raw.trim()?'?q='+encodeURIComponent(raw.trim()):'')); }catch(e){} }});
var q0=null; try{ q0=new URLSearchParams(location.search).get('q'); }catch(e){}
if(q0) pi.value=q0;
page.run(); if(!q0) try{ pi.focus({preventScroll:true}); }catch(e){}
var pf=pi.closest('form'); if(pf) pf.addEventListener('submit',function(e){ e.preventDefault(); });
}
document.addEventListener('keydown',function(e){
if(e.key!=='/'||e.metaKey||e.ctrlKey||e.altKey||e.defaultPrevented) return;
var t=e.target, tag=t&&t.tagName;
if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)) return;
e.preventDefault();
if(pi&&pi.getClientRects().length){ pi.focus(); pi.select(); return; }
open(document.querySelector('.pl-searchbtn'));
});
})();
(function(){
var de=document.documentElement, rail=document.querySelector('nav.rail'), main=document.getElementById('main');
if(!rail||!main||de.hasAttribute('data-view')||/[?&]embed=/.test(location.search)) return;      
var VIEWS=rail.hasAttribute('data-pl-views'), MQ=window.matchMedia('(max-width:640px)'), DESK=window.matchMedia('(min-width:1100px)');
var targets=[], seen={};
[].forEach.call(rail.querySelectorAll('a[href^="#"]'),function(a){
var id=a.getAttribute('href').slice(1), t=id&&document.getElementById(id);
if(t&&t.tagName==='SECTION'&&main.contains(t)&&!seen[id]){ seen[id]=1; targets.push(t); }
});
if(targets.length<2) return;
var host=targets[0].parentNode;
if(!targets.every(function(t){ return t.parentNode===host; })) return;
var kids=[].slice.call(host.children), cur=null, groups={};
kids.forEach(function(k){ if(targets.indexOf(k)>=0){ cur=k.id; groups[cur]=[]; } if(cur&&!/^(SCRIPT|STYLE|TEMPLATE)$/.test(k.tagName)) groups[cur].push(k); });
var order=targets.filter(function(t){ return groups[t.id]; }).map(function(t){ return t.id; });
var on=null;
function partOf(el){ for(var n=el;n&&n!==host;n=n.parentNode){ if(n.parentNode===host){ var g=n.getAttribute&&n.getAttribute('data-part'); return g||null; } } return null; }
function show(id,scroll){
if(!groups[id]) return;
on=id;
order.forEach(function(g){ groups[g].forEach(function(el){ if(g===id) el.setAttribute('data-part-on',''); else el.removeAttribute('data-part-on'); }); });
[].forEach.call(rail.querySelectorAll('a[href^="#"]'),function(a){ var hit=a.getAttribute('href')==='#'+id;
a.classList.toggle('on',hit); if(hit) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
layout();
if(scroll){
if(VIEWS){ var p0=groups[id][0], y=p0.getBoundingClientRect().top+window.scrollY-railH()-8; if(window.scrollY>y) window.scrollTo(0,Math.max(0,y)); }
else{ var top=rail.getBoundingClientRect().bottom+window.scrollY-rail.offsetHeight; if(window.scrollY>top) window.scrollTo(0,top); }
}
try{ window.dispatchEvent(new Event('resize')); }catch(e){}            
mark();
}
var toc=null, asides=[], heads=[], tq=false, io=null, lifted=null;
function railH(){ var h=rail.offsetHeight||0; return getComputedStyle(rail).position==='sticky'?h:0; }
function vis(el){ return !!(el.getClientRects().length); }
function partHeads(g){ var hs=[];
var HSEL='h2[id],h3[id],[role=heading][aria-level="2"][id],[role=heading][aria-level="3"][id]';
groups[g].forEach(function(el){ if(el.id&&el.matches(HSEL)) hs.push(el);
[].forEach.call(el.querySelectorAll(HSEL),function(h){ if(!h.closest('.pl-aside,.pl-toc,[hidden],dialog,.modal')) hs.push(h); }); });
return hs.filter(function(h){ return (h.textContent||'').trim(); }); }
function curHead(){
tq=false; if(!toc||!heads.length) return;
var lim=railH()+Math.min(160,window.innerHeight*0.3), best=heads[0];
heads.forEach(function(h){ if(vis(h)&&h.getBoundingClientRect().top<=lim) best=h; });
[].forEach.call(toc.querySelectorAll('a'),function(a){ var hit=a.getAttribute('href')==='#'+best.id;
if(hit) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
}
function qHead(){ if(!tq){ tq=true; requestAnimationFrame(curHead); } }
function buildToc(){
if(!toc){ toc=document.createElement('nav'); toc.className='pl-toc'; toc.setAttribute('aria-label','On this page'); }
heads=partHeads(on).filter(vis);
var h='<p class="pl-toc-h" aria-hidden="true">On this page</p><ol>';
heads.forEach(function(x){ h+='<li class="pl-toc-'+x.tagName.toLowerCase()+'"><a href="#'+x.id+'">'+(x.getAttribute('data-toc')||x.textContent).replace(/\s+/g,' ').trim().replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</a></li>'; });
if(heads.length===1) h+='<li class="pl-toc-top"><a href="#'+on+'">Back to the top</a></li>';
toc.innerHTML=h+'</ol>'; toc.setAttribute('data-n',heads.length); toc.hidden=heads.length<1;
if(io) io.disconnect();
if(window.IntersectionObserver&&heads.length>1){ io=new IntersectionObserver(qHead,{rootMargin:'0px 0px -55% 0px',threshold:[0,1]}); heads.forEach(function(x){ io.observe(x); }); }
curHead();
}
function headBlock(g){ var h=null; groups[g].some(function(el){ h=/^H[23]$/.test(el.tagName)?el:el.querySelector('h2,h3'); return !!h; });
if(!h) return null; var n=h.nextElementSibling; return n&&n.tagName==='P'?n:h; }
function shut(e){ var d=e.closest('details:not([open])'); return !!d && !(e.closest('summary') && e.closest('summary').parentElement===d); }
function partOverflows(){
var first=groups[on]&&groups[on].filter(function(el){ return el.getClientRects().length; })[0]; if(!first) return false;
var edge=first.getBoundingClientRect().left, lim=0;
groups[on].forEach(function(el){ if(el.getClientRects().length) lim=Math.max(lim,el.getBoundingClientRect().right); });
var colR=first.getBoundingClientRect().right;
if(lim>colR+1) return true;
return groups[on].some(function(el){
if(!el.getClientRects().length) return false;
var all=el.querySelectorAll('*'), i, r;
for(i=0;i<all.length;i++){ r=all[i].getBoundingClientRect(); if(r.width>0&&r.right>colR+1&&r.left<colR&&!shut(all[i])) return true; }
return false; });
}
var flowT=null;
if(window.ResizeObserver) new ResizeObserver(function(){ clearTimeout(flowT); flowT=setTimeout(function(){
if(host.classList.contains('pl-3col')&&on){ var f=groups[on].some(function(el){ return el.hasAttribute('data-pl-wide')&&el.getClientRects().length; })||partOverflows();
if(f!==host.classList.contains('pl-3col-flow')) layout(); } },120); }).observe(host);
function layout(){
if(!VIEWS||!on) return;
var desk=DESK.matches&&!de.classList.contains('pl-tabs-all');
if(desk&&host.contains(rail)&&!lifted){ lifted={p:rail.parentNode,n:rail.nextSibling}; host.parentNode.insertBefore(rail,host); }
else if(!desk&&lifted){ lifted.p.insertBefore(rail,lifted.n&&lifted.n.parentNode===lifted.p?lifted.n:null); lifted=null; }
de.style.setProperty('--pl-railh',railH()+'px');
host.classList.toggle('pl-3col',desk);
var mine=asides.filter(function(a){ return a.plOwner===on; }), page=asides.filter(function(a){ return !a.plOwner; });
var want=mine.length?mine:page, first=groups[on][0];
asides.forEach(function(a){
var w=want.indexOf(a)>=0; if(w) a.removeAttribute('data-pl-off'); else a.setAttribute('data-pl-off','');
if(!w) return;
if(desk){ if(a.parentNode!==host||a.nextElementSibling!==first) host.insertBefore(a,first); }
else{ var hb=headBlock(on); if(hb&&hb.nextElementSibling!==a) hb.parentNode.insertBefore(a,hb.nextSibling); else if(!hb&&a.parentNode!==first.parentNode) host.insertBefore(a,first); }
});
if(desk){
if(!toc) buildToc();
if(toc.parentNode!==host||toc.nextElementSibling!==(want[0]||first)) host.insertBefore(toc,want[0]||first);
buildToc();
var kids=[].slice.call(host.children).filter(function(k){ return k!==toc&&asides.indexOf(k)<0&&getComputedStyle(k).display!=='none'; });
var pre=0, n=0, wide=-1;
kids.forEach(function(k){ if(k.hasAttribute('data-part')){ if(wide<0&&k.hasAttribute('data-pl-wide')) wide=n; n++; } else if(!n){ k.setAttribute('data-pl-pre',''); pre++; } });
toc.style.gridRow=(pre+1)+' / span '+Math.max(1,n);
var flow=groups[on].some(function(el){ return el.hasAttribute('data-pl-wide')&&el.getClientRects().length; })||partOverflows();
host.classList.toggle('pl-3col-flow',flow);
want.forEach(function(a){
if(flow){ a.style.gridRow=''; var last=groups[on][groups[on].length-1]; if(last&&last.parentNode===host&&a.previousElementSibling!==last) host.insertBefore(a,last.nextSibling); }
else a.style.gridRow='1 / span '+Math.max(1,pre+(wide<0?n:wide)); });
} else {
if(toc&&toc.parentNode) toc.parentNode.removeChild(toc);
asides.forEach(function(a){ a.style.gridRow=''; });
[].forEach.call(host.querySelectorAll('[data-pl-pre]'),function(k){ k.removeAttribute('data-pl-pre'); });
}
}
var note=null, sig='', mo=null, fq=false, names={};
function tabOf(g){ return rail.querySelector('a[href="#'+g+'"]'); }
function nameOf(g){ if(!names[g]){ var a=tabOf(g); var c=a&&a.cloneNode(true); if(c) [].forEach.call(c.querySelectorAll('.rs,.pl-tfx'),function(x){ x.parentNode.removeChild(x); });  names[g]=c?(c.textContent||'').replace(/\s+/g,' ').trim():g; } return names[g]; }
function hasFail(g){ return groups[g].some(function(el){ var p=el.previousElementSibling;      
return el.classList.contains('pl-fail')||!!el.querySelector('.pl-fail')||!!(p&&p.classList.contains('pl-fail')&&!p.hasAttribute('data-part')); }); }
function retry(gs){ gs.forEach(function(g){ groups[g].forEach(function(el){
[].forEach.call(el.classList.contains('pl-fail')?[el]:el.querySelectorAll('.pl-fail'),function(f){ var k=f.querySelector('button'); if(k&&!k.disabled) k.click(); }); }); }); }
function mark(){
fq=false;
var bad=de.classList.contains('pl-tabs')?order.filter(hasFail):[], away=bad.filter(function(g){ return g!==on; });
order.forEach(function(g){ var a=tabOf(g); if(!a) return; var m=a.querySelector('.pl-tfx'), want=bad.indexOf(g)>=0;
if(want&&!m){ nameOf(g); m=document.createElement('span'); m.className='pl-tfx';
m.innerHTML='<i aria-hidden="true">!</i><span class="pl-vh"> (didn\u2019t load)</span>'; a.appendChild(m); }
else if(!want&&m) m.parentNode.removeChild(m); });
var s=away.join(' ');
if(s!==sig){
sig=s;
if(note){ note.parentNode.removeChild(note); note=null; }
if(away.length){
note=document.createElement('p'); note.className='pl-tabfail'; note.setAttribute('role','status');
var t=document.createElement('span');
away.forEach(function(g,i){
if(i) t.appendChild(document.createTextNode(i===away.length-1?' and ':', '));
var o=document.createElement('a'); o.href='#'+g; o.textContent=nameOf(g); t.appendChild(o); });
t.appendChild(document.createTextNode(' didn\u2019t load.'));
var k=document.createElement('button'); k.type='button'; k.className='pl-pill'; k.textContent='Try again';
k.addEventListener('click',function(){ retry(away); });
note.appendChild(t); note.appendChild(k);
rail.parentNode.insertBefore(note,rail.nextSibling);
}
}
if(bad.length&&!mo&&window.MutationObserver){ mo=new MutationObserver(function(){ if(!fq){ fq=true; requestAnimationFrame(mark); } });
mo.observe(host,{childList:true,subtree:true}); }
else if(!bad.length&&mo){ mo.disconnect(); mo=null; }
}
document.addEventListener('pl:fail',function(){ if(!fq){ fq=true; setTimeout(mark,0); } });
function fromURL(){
var h=location.hash.slice(1), t=null;
try{ t=h&&document.getElementById(decodeURIComponent(h)); }catch(e){ t=null; }
var g=t?partOf(t):null;
if(g) return g;
if(/[?&](q|open)=/.test(location.search)&&groups.register) return 'register';
return order[0];
}
function enable(){
if(de.classList.contains('pl-tabs')) return;
order.forEach(function(g){ groups[g].forEach(function(el){ el.setAttribute('data-part',g); }); });
if(VIEWS){ de.classList.add('pl-views');
asides=[].slice.call(document.querySelectorAll('aside.pl-aside[data-pl-aside]')).filter(function(a){ return main.contains(a); });
asides.forEach(function(a){ a.plOwner=partOf(a); });
window.addEventListener('scroll',qHead,{passive:true});
window.addEventListener('resize',function(){ de.style.setProperty('--pl-railh',railH()+'px'); qHead(); },{passive:true});
(DESK.addEventListener?DESK.addEventListener.bind(DESK,'change'):DESK.addListener.bind(DESK))(layout);
window.addEventListener('beforeprint',function(){ if(toc&&toc.parentNode) toc.parentNode.removeChild(toc); host.classList.remove('pl-3col'); });
window.addEventListener('afterprint',layout);
}
de.classList.add('pl-tabs'); show(fromURL(),false);
}
function disable(){
if(!de.classList.contains('pl-tabs')) return;
de.classList.remove('pl-tabs');
order.forEach(function(g){ groups[g].forEach(function(el){ el.removeAttribute('data-part'); el.removeAttribute('data-part-on'); }); });
mark();
}
if(VIEWS||MQ.matches) enable();
if(!VIEWS) (MQ.addEventListener?MQ.addEventListener.bind(MQ,'change'):MQ.addListener.bind(MQ))(function(){ if(MQ.matches) enable(); else disable(); });
document.addEventListener('click',function(e){
if(!de.classList.contains('pl-tabs')) return;
var a=e.target.closest&&e.target.closest('a[href*="#"]'); if(!a) return;
var u; try{ u=new URL(a.getAttribute('href'),location.href); }catch(x){ return; }
if(u.pathname!==location.pathname||!u.hash) return;
var t=document.getElementById(decodeURIComponent(u.hash.slice(1))), g=t&&partOf(t);
if(!g) return;
var inRail=rail.contains(a);
if(g!==on) show(g,inRail);
if(!inRail&&e.detail===0&&PL.focusTo) setTimeout(function(){ if(t.getClientRects().length) PL.focusTo(t); },60);
if(inRail){ e.preventDefault();
try{ if(VIEWS){ if(location.hash!==u.hash) history.pushState(null,'',u.hash); } else history.replaceState(history.state,'',u.hash); }catch(x){} }
},true);
window.addEventListener('hashchange',function(){ if(de.classList.contains('pl-tabs')){ var g=fromURL(); if(g!==on) show(g,false); } });
if(VIEWS) window.addEventListener('popstate',function(){ var g=fromURL(); if(g!==on) show(g,false); });
})();
(function(){
if(/[?&]embed=/.test(location.search)) return;
var mast=document.querySelector('header[data-root]'), root=mast?mast.getAttribute('data-root')||'':'';
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))
window.addEventListener('load',function(){ navigator.serviceWorker.register(root+'sw.js').catch(function(){}); });
var strip=null, MON=['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'];
function paint(){
var off=navigator.onLine===false;
if(off&&!strip){
var b=document.querySelector('[data-pl-built]'), d=b&&/^(\d{4})-(\d{2})-(\d{2})$/.exec(b.getAttribute('data-pl-built'));
strip=document.createElement('div'); strip.className='pl-offline'; strip.setAttribute('role','status');
strip.textContent='You are offline: this is the copy of this page kept on this device'+(d?', as of '+MON[+d[2]-1]+' '+(+d[3])+', '+d[1]:'')+'.';
document.body.insertBefore(strip,document.body.firstChild);
} else if(!off&&strip){ strip.parentNode.removeChild(strip); strip=null; }
if(strip) document.documentElement.style.setProperty('--pl-offh',Math.ceil(strip.getBoundingClientRect().bottom+(window.scrollY||0))+'px');
else document.documentElement.style.removeProperty('--pl-offh');
}
window.addEventListener('online',paint); window.addEventListener('offline',paint); paint();
})();
(function(){
if(/[?&]embed=/.test(location.search)) return;
var mast=document.querySelector('header.pl-mast'); if(!mast) return;
var ROOT=mast.getAttribute('data-root')||'', KEY='pl-seen', NO='pl-seen-off', MON=['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'];
function get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function put(k,v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} }
function iso(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function day(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); return m?MON[+m[2]-1]+' '+(+m[3]):''; }
var prev=get(KEY), now=iso(new Date());
function note(){ setTimeout(function(){ put(KEY,iso(new Date())); },10000); }
if(document.readyState==='complete') note(); else window.addEventListener('load',note);
var home=!!mast.querySelector('.pl-menu>.pl-dest[aria-current="page"][data-parts]');      
if(!home||!/^\d{4}-\d{2}-\d{2}$/.test(prev||'')||prev>=now||get(NO)===prev) return;
var s=document.createElement('div'); s.className='pl-since'; s.setAttribute('role','region'); s.setAttribute('aria-label','Since your last visit');
mast.parentNode.insertBefore(s,mast.nextSibling);
function n(c,one,many){ return (c===0?'no':c)+' '+(c===1?one:many); }
function draw(d){
var it=(d&&d.items)||[], b=0, m=0, k=0;
it.forEach(function(x){ if(!x||!(x.date>prev)) return; var f=x.feed||x.kind;
if(f==='warrants') b++; else if(f==='decisions') m++; else if(f==='corrections'||x.kind==='correction') k++; });
var t=b||m||k?'Since you were here on <b>'+day(prev)+'</b>: '+n(b,'new council brief','new council briefs')+', '+n(m,'county meeting','county meetings')+', '+n(k,'correction','corrections')+'.'
:'Nothing new since <b>'+day(prev)+'</b>, when you were last here.';
s.innerHTML='<div class="pl-since-in"><p>'+t+' <a href="'+ROOT+'follow.html">Follow updates</a></p>'+
'<button type="button" class="pl-since-x" aria-label="Dismiss: what is new since your last visit">Dismiss</button></div>';
s.querySelector('button').addEventListener('click',function(){ put(NO,prev); s.parentNode.removeChild(s); });
}
function load(){ return PL.loadJSON(ROOT+'updates.json',s,load).then(draw,function(){}); }
if(window.PL&&PL.loadJSON) load();
})();
(function(){
var first=document.querySelector('a.pl-skip'); if(!first) return;
var link=null;
function field(){ var f=document.querySelector('[data-pl-search]'); if(!f) return null;
return f.matches('input,select,textarea')?f:f.querySelector('input:not([type=hidden]),select,textarea'); }
function reach(i){
if(!i||i.disabled) return false;
if(i.getClientRects().length) return true;
if(i.closest('[data-part]')&&document.documentElement.classList.contains('pl-tabs')) return true;
var d=i.closest('details'); return !!(d&&!d.open&&d.getClientRects().length);
}
function sync(){
var i=field(), on=reach(i);
if(on&&!link){
if(!i.id) i.id='plSkipQ';
link=document.createElement('a'); link.className='pl-skip'; link.textContent='Skip to search';
link.addEventListener('click',function(e){ var f=field(); if(!f) return; e.preventDefault();
for(var d=f.closest('details');d;d=d.parentElement&&d.parentElement.closest('details')) d.open=true;
f.focus(); });
first.parentNode.insertBefore(link,first.nextSibling);
}
if(link){ if(on) link.setAttribute('href','#'+i.id); else{ link.parentNode.removeChild(link); link=null; } }
}
first.addEventListener('focus',sync);
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sync); else sync();
window.addEventListener('load',sync);
})();
(function(){
var G={"warrant":["Warrant","<b>A warrant</b> is the City&rsquo;s list of the claims the Common Council approves for payment at a meeting, usually twice a month: each claim a payee, an amount and the city account it is charged to. Approval is not payment; a claim here does not show that a check cleared. A card statement is the same list for the city&rsquo;s purchasing cards.","warrants?"],"list":["List total","<b>The list total</b> is the sum of every claim on a warrant: the figure the city prints at the foot of the list.","list totals?"],"control":["Control total","<b>A control total</b> is the total the city prints for each fund on a warrant. The claims charged to that fund should add up to it to the penny, and this site checks that they do. A few claims sit outside the funds&rsquo; controls (trust and general-ledger claims, or revenue-type claims); with them, the claims add up to the list total.","control totals?"],"po":["Purchase order","<b>A purchase order</b> (PO) is the city&rsquo;s own number for an order; a claim on a warrant names the order it pays.","purchase orders?"],"ocr":["OCR","<b>OCR</b> (optical character recognition) is software that reads the letters in a picture. When the city posts a warrant only as a scanned image, its claims are read this way, and the warrant is used only when every total printed on it ties to the penny.","OCR"],"resolution":["Resolution","<b>A resolution</b> is a numbered item on the County Legislature&rsquo;s agenda. Members vote on it at a meeting, and the minutes record the vote. The county needs one to spend, contract, settle or move budget money.","resolutions?"],"ceiling":["Ceiling","<b>A ceiling</b> is a spending limit: the most one resolution lets the county spend on something &mdash; permission to spend up to that figure, not a payment. Ceilings are never added together on this site.","ceilings?"],"levy":["Levy","<b>The levy</b> is the total a government raises from property tax for the year. Each property&rsquo;s share is its taxable assessed value times the tax rate.","lev(?:y|ies)"],"approp":["Appropriation","<b>An appropriation</b> is the amount a budget sets aside for one purpose for the year: permission to spend up to it, not spending.","appropriations?"],"fullvalue":["Full value","<b>Full value</b> is a property&rsquo;s estimated market value: its assessed value divided by the share of market value the roll assesses at (the uniform percentage printed on a tax bill).","full (?:market )?values?"],"fundbal":["Fund balance","<b>Fund balance</b> is what a fund has left at the end of a year after all of its revenue and spending so far: a government&rsquo;s reserve, part of it often set aside for a purpose.","fund balances?"],"debt":["Debt proceeds","<b>Debt proceeds</b> are money a government receives by borrowing, through bonds or notes. Its filings count them as a source of money, but they are paid back, with interest, in later years.","debt proceeds"],"typical":["Typical warrant","<b>A typical warrant</b> is the middle one by list total (the median) of the main warrant, the largest regular one, of each earlier meeting night on this register. A purchasing-card statement is set against earlier card statements. Only earlier nights count, and every comparison on the site says how many it counts and since when.","typical (?:regular |card )?warrants?"],"byname":["Votes read by name","<b>Votes read by name</b> are the county votes whose minutes say who voted no: every vote read from the minutes except the few whose no votes are printed only as a count, with no names. Each legislator&rsquo;s no votes, and their rate per 100 votes, are counted on these.","votes? read by name"]}, main=document.getElementById('main');
if(!main||/(^|\/)words\.html$/.test(location.pathname)||/[?&]embed=/.test(location.search)) return;
var mast=document.querySelector('header[data-root]'), ROOT=mast?mast.getAttribute('data-root')||'':'';
var SKIP='a,button,summary,label,select,option,textarea,input,script,style,svg,code,h1,h2,h3,h4,h5,th,nav,header,footer,figure,'+
'.pl-words,.pl-kick,.num,.rail,.pl-btn,.pl-pill,.pl-row,.pl-src,.pl-dout,.pl-vh,[aria-hidden="true"],[data-pl-chart],[hidden],.modal,dialog,'+
'#front';      
var keys=Object.keys(G), RX=new RegExp('\\b('+keys.map(function(k){ return G[k][2]; }).join('|')+')\\b','i');
function keyOf(t){ for(var i=0;i<keys.length;i++){ if(new RegExp('^(?:'+G[keys[i]][2]+')$','i').test(t)) return keys[i]; } return null; }
function run(){
var used={}, todo=[], n=0, firsts={};
[].forEach.call(main.querySelectorAll('.pl-words b'),function(b){ var k=keyOf(b.textContent.replace(/^(a|an|the)\s+/i,'').trim()); if(k) used[k]=1; });
var tw=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,{acceptNode:function(t){
if(!t.nodeValue||!RX.test(t.nodeValue)) return NodeFilter.FILTER_SKIP;
var p=t.parentNode; if(!p||!p.closest||p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
return /flex|grid/.test(getComputedStyle(p).display)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT; }});
while(tw.nextNode()) todo.push(tw.currentNode);
todo.forEach(function(t){
var m=RX.exec(t.nodeValue); if(!m) return;
var k=keyOf(m[1]); if(!k||used[k]) return;
var on=!!(t.parentNode.getClientRects&&t.parentNode.getClientRects().length);
if(!firsts[k]||(on&&!firsts[k].on)) firsts[k]={t:t,on:on}; });
Object.keys(firsts).forEach(function(k){
var t=firsts[k].t, m=RX.exec(t.nodeValue); if(!m||keyOf(m[1])!==k) return;
n++;
var after=t.splitText(m.index); after.splitText(m[1].length);
var a=document.createElement('a'); a.className='pl-dfn'; a.href=ROOT+'words.html#w-'+k; a.setAttribute('data-dfn',k);
a.setAttribute('aria-haspopup','dialog'); a.textContent=after.nodeValue; after.parentNode.replaceChild(a,after);
});
return n;
}
var pop=null, at=null;
function close(){ if(pop){ pop.parentNode.removeChild(pop); pop=null; } if(at){ at.setAttribute('aria-expanded','false'); var a=at; at=null; return a; } return null; }
function open(a){
var k=a.getAttribute('data-dfn'), w=G[k]; if(!w) return;
pop=document.createElement('div'); pop.className='pl-dfn-pop'; pop.setAttribute('role','dialog'); pop.setAttribute('aria-label',w[0]); pop.tabIndex=-1;
pop.innerHTML='<p>'+w[1]+'</p><p class="pl-dfn-more"><a href="'+ROOT+'words.html#w-'+k+'">Every plain word on this site &rarr;</a><button type="button" class="pl-dfn-x">Close</button></p>';
document.body.appendChild(pop); at=a; a.setAttribute('aria-expanded','true');
var r=a.getBoundingClientRect(), pw=pop.offsetWidth, ph=pop.offsetHeight, vw=document.documentElement.clientWidth;
var x=Math.max(8,Math.min(vw-pw-8,r.left+r.width/2-pw/2)), y=r.bottom+8;
if(y+ph>window.innerHeight-8&&r.top-ph-8>8) y=r.top-ph-8;
pop.style.left=(x+window.scrollX)+'px'; pop.style.top=(y+window.scrollY)+'px';
pop.focus({preventScroll:true});      
}
document.addEventListener('click',function(e){
var a=e.target.closest&&e.target.closest('a.pl-dfn');
if(a){ e.preventDefault(); var was=close(); if(was!==a) open(a); return; }
if(pop&&e.target.closest&&e.target.closest('.pl-dfn-x')){ var w0=close(); if(w0) w0.focus(); return; }
if(pop&&!pop.contains(e.target)) close();
});
document.addEventListener('keydown',function(e){
var w=e.target&&e.target.closest&&e.target.closest('a.pl-dfn');
if(w&&(e.key===' '||e.key==='Spacebar')){ e.preventDefault(); w.click(); return; }
if(!pop) return;
if(e.key==='Escape'){ e.stopImmediatePropagation(); var a=close(); if(a) a.focus(); return; }
if(e.key!=='Tab'||!pop.contains(document.activeElement)) return;
var f=[].slice.call(pop.querySelectorAll('a,button')), i=f.indexOf(document.activeElement);
if(e.shiftKey?i<=0:i===f.length-1){ if(e.shiftKey) e.preventDefault(); var b=close(); if(b) b.focus(); }
},true);
function go(){ try{ run(); }catch(e){} }
if(document.readyState==='complete') setTimeout(go,0); else window.addEventListener('load',function(){ setTimeout(go,0); });
})();
;
(function(){
"use strict";
var PL=window.PL=window.PL||{};
(function(){
/* scrub - the one gesture for every chart. touch-action:pan-y on the hit rect, so a thumb that lands on a chart still scrolls
   the page; a horizontal move of 6px (and more sideways than down) starts a scrub, captured until the finger lifts. A mouse
   hovers (hover:hover screens only); a tap or click picks. h = {onMove(clientX, touch), onLeave(wasTouch), onTap(clientX)}. */
PL.scrubber=function(hit,h){
  hit.style.touchAction='pan-y';
  var id=null, x0=0, y0=0, scrubbing=false, moved=false, ptype='mouse';
  var HOV=window.matchMedia('(hover:hover)'), K=h.keys||null;
  hit.addEventListener('pointerdown',function(e){
    ptype=e.pointerType||'mouse';
    if(e.pointerType==='mouse') return;
    id=e.pointerId; x0=e.clientX; y0=e.clientY; scrubbing=false; moved=false;
  });
  /* r3 PL-07: the keyboard. The marks' centres, found once per focus by sampling the chart's own index function across the hit area */
  var cur=-1, cx=null;
  function centres(){
    var r=hit.getBoundingClientRect(), lo={}, hi={}, n=-1, px, i;
    for(px=Math.floor(r.left);px<=Math.ceil(r.right);px++){ i=K.idx(px); if(i==null||i<0) continue; if(!(i in lo)) lo[i]=px; hi[i]=px; if(i>n) n=i; }
    var out=[]; for(i=0;i<=n;i++) out.push(i in lo ? (lo[i]+hi[i])/2 : null);
    return out;
  }
  function step(i){ cur=i; h.onMove(cx[i],false); if(K.read) PL.say(K.read(i)); }
  if(K){
    if(!hit.hasAttribute('tabindex')) hit.setAttribute('tabindex','0');
    hit.setAttribute('role','group'); hit.setAttribute('aria-roledescription','chart');
    if(K.label) hit.setAttribute('aria-label',K.label+'. The left and right arrow keys step through it'+(h.onTap?'; Enter picks.':'.'));
    hit.addEventListener('focus',function(){ cx=centres(); });
    hit.addEventListener('keydown',function(e){
      var k=e.key; if(!cx) cx=centres();
      if(cur<0&&K.start) cur=K.start();      /* a chart whose picked mark is not its last starts stepping from that mark */
      var marks=cx.map(function(c,i){ return c==null?-1:i; }).filter(function(i){ return i>=0; }); if(!marks.length) return;
      var at=marks.indexOf(cur), nx=null;
      if(k==='ArrowRight'||k==='ArrowDown') nx=marks[at<0?0:Math.min(marks.length-1,at+1)];
      else if(k==='ArrowLeft'||k==='ArrowUp') nx=marks[at<0?marks.length-1:Math.max(0,at-1)];
      else if(k==='Home') nx=marks[0];
      else if(k==='End') nx=marks[marks.length-1];
      else if((k==='Enter'||k===' ')&&cur>=0&&h.onTap){ e.preventDefault(); h.onTap(cx[cur]); return; }
      else if(k==='Escape'&&cur>=0){ cur=-1; if(h.onLeave) h.onLeave(false); return; }
      else return;
      e.preventDefault(); step(nx);
    });
    hit.addEventListener('blur',function(){ if(cur>=0){ cur=-1; if(h.onLeave) h.onLeave(false); } });
  }
  var tapI=-1, tapT=0;
  hit.addEventListener('pointermove',function(e){
    if(e.pointerType==='mouse'){ if(HOV.matches) h.onMove(e.clientX,false); return; }
    if(id!==e.pointerId) return;
    if(!scrubbing){
      var dx=e.clientX-x0, dy=e.clientY-y0;
      if(Math.abs(dx)>6 && Math.abs(dx)>Math.abs(dy)){ scrubbing=true; moved=true; try{hit.setPointerCapture(id);}catch(x){} }
      else return;
    }
    h.onMove(e.clientX,true);
  });
  function end(e){
    if(e.pointerType==='mouse') return;
    if(id===e.pointerId){ id=null; if(scrubbing){ scrubbing=false; if(h.onLeave) h.onLeave(true); } }
  }
  hit.addEventListener('pointerup',end);
  hit.addEventListener('pointercancel',function(e){ id=null; scrubbing=false; if(h.onLeave) h.onLeave(false); });
  hit.addEventListener('mouseleave',function(){ if(h.onLeave) h.onLeave(false); });
  if(h.onTap) hit.addEventListener('click',function(e){
    if(moved){ moved=false; return; }          /* a scrub is not a choice */
    /* r3 PL-07: a finger reads before it acts - the first tap on a mark shows its readout, a second tap on the same mark picks it */
    if(K && h.preview!==false && ptype!=='mouse' && e.detail!==0){
      var i=K.idx(e.clientX);
      if(i!==tapI || Date.now()-tapT>5000){ tapI=i; tapT=Date.now(); h.onMove(e.clientX,true); if(K.read) PL.say(K.read(i)); return; }
      tapI=-1;
    }
    h.onTap(e.clientX);
  });
};
/* PL.say(text): the page's one polite live region for chart readouts (a keyboard step, a touch preview) */
PL.say=function(t){
  var l=document.getElementById('plSay');
  if(!l){ l=document.createElement('div'); l.id='plSay'; l.className='pl-vh'; l.setAttribute('aria-live','polite'); l.setAttribute('role','status');
    document.body.appendChild(l); }
  l.textContent=''; if(t) setTimeout(function(){ l.textContent=String(t).replace(/\s+/g,' ').trim(); },40);
};
/* sparks - small multiples read together (Joe, 10-28): a sideways slide, a hover or a tap on any panel puts one year's hairline
   and dot on EVERY panel and that year's figure in each panel's value line; lifting the finger or leaving with the mouse puts
   the latest back (or the year a tap pinned - tap that year again to let go). panels: [{el, values, max}]: el holds a .spw (the
   spark's box; its 200x38 viewBox is stretched across the box, so a value's height is the same 38px in CSS) and a .v line;
   years: the x axis; fmt(value, year) -> the value line for that year (value null = nothing filed). */
PL.sparks=function(panels,years,fmt){
  var n=years.length, H=38, pin=null;
  if(!document.getElementById('pl-sparks-css')){
    var c=document.createElement('style'); c.id='pl-sparks-css';
    c.textContent='.spw{position:relative;margin-top:6px}.spw svg{margin-top:0!important}'
      +'.spw .sl{position:absolute;top:-3px;bottom:-3px;width:0;border-left:1px solid var(--muted);opacity:0;pointer-events:none}'
      +'.spw .sd{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:currentColor;box-shadow:0 0 0 2px var(--card);opacity:0;pointer-events:none}'
      +'.sm .sy{position:relative;height:15px;margin-top:5px;font-size:var(--fs-13);color:var(--faint);line-height:var(--lh-16)}'
      +'.sm .sy span{position:absolute;top:0}.sm .sy .y0{left:0}.sm .sy .y1{right:0}.sm .sy .yb{transform:translateX(-50%)}'
      +'.sm .v b{color:var(--ink);font-weight:600;margin-right:6px}';
    (document.head||document.documentElement).appendChild(c);
  }
  function at(p,cx){ var r=p.w.getBoundingClientRect(); return Math.max(0,Math.min(n-1,Math.round((cx-r.left)/(r.width||1)*(n-1)))); }
  function paint(i){
    panels.forEach(function(p){
      if(i==null){ p.sl.style.opacity=p.sd.style.opacity=0; p.v.innerHTML=p.v0; return; }
      var v=p.values[i];
      p.sl.style.left=p.sd.style.left=(i/(n-1)*100)+'%'; p.sl.style.opacity=1;
      if(v==null) p.sd.style.opacity=0; else { p.sd.style.top=(H-(H-3)*(v/p.max)-1.5)+'px'; p.sd.style.opacity=1; }
      p.v.innerHTML=fmt(v,years[i]);
    });
  }
  panels.forEach(function(p){
    p.w=p.el.querySelector('.spw'); p.v=p.el.querySelector('.v'); p.v0=p.v.innerHTML;
    p.sl=document.createElement('i'); p.sl.className='sl'; p.sd=document.createElement('i'); p.sd.className='sd';
    p.w.appendChild(p.sl); p.w.appendChild(p.sd);
    PL.scrubber(p.el,{onMove:function(cx){ paint(at(p,cx)); }, onLeave:function(){ paint(pin); },
                      onTap:function(cx){ var i=at(p,cx); pin=(pin===i?null:i); paint(pin); }});
  });
};
/* the panels' shared year axis: first and last year, and the reporting-basis break where the spark draws it */
PL.sparks.axis=function(years,brk){
  var n=years.length, bi=years.indexOf(brk), at=(bi-.5)/(n-1)*100;
  return '<div class="sy num" aria-hidden="true"><span class="y0">'+years[0]+'</span>'+
    (bi>0&&at>18&&at<82 ? '<span class="yb" style="left:'+at.toFixed(2)+'%">'+brk+'</span>' : '')+
    '<span class="y1">'+years[n-1]+'</span></div>';
};
/* the break itself, drawn into a 200x38 spark: a dashed rule between the last year of the old basis and the first of the new */
PL.sparks.brk=function(years,brk){
  var bi=years.indexOf(brk); if(bi<1) return '';
  var x=(200*(bi-.5)/(years.length-1)).toFixed(1);
  return '<line x1="'+x+'" x2="'+x+'" y1="0" y2="38" stroke="var(--rule-strong)" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>';
};
/* spot - where a label can sit on a plot: candidates in order, each boxed (text width ~0.62em a character) against the
   plotted lines (sampled between their points) and the given boxes; the first clear one wins, null = no room */
PL.chartSpot=function(o){
  var fs=o.fs;                                   /* the caller's label size (already at or over the SVG text floor) */
  var w=o.text.length*fs*0.62, pad=3;
  function box(c){ var x0=c.a==='end'?c.x-w:c.a==='middle'?c.x-w/2:c.x; return [x0-pad, c.y-fs*0.85-pad, x0+w+pad, c.y+fs*0.3+pad]; }
  function hitBox(b,r){ return b[0]<r[2]&&r[0]<b[2]&&b[1]<r[3]&&r[1]<b[3]; }
  function hitLine(b,pts){
    for(var i=1;i<pts.length;i++){ var p=pts[i-1], q=pts[i]; if(!p||!q) continue;
      if(Math.max(p[0],q[0])<b[0]||Math.min(p[0],q[0])>b[2]) continue;
      for(var t=0;t<=1.0001;t+=0.05){ var X=p[0]+(q[0]-p[0])*t, Y=p[1]+(q[1]-p[1])*t; if(X>=b[0]&&X<=b[2]&&Y>=b[1]&&Y<=b[3]) return true; }
    }
    return false;
  }
  for(var k=0;k<o.cands.length;k++){
    var c=o.cands[k], b=box(c);
    if(b[1]<o.top||b[3]>o.bottom||b[0]<o.left||b[2]>o.right) continue;
    if(o.lines.some(function(L){ return hitLine(b,L); })||o.boxes.some(function(r){ return hitBox(b,r); })) continue;
    return c;
  }
  return null;
};
/* the price yardstick's name: on the plot at the first clear place (its line's end, above or below; the plot's top right,
   top left), clear of the filed line, the yardstick, the marks and their years, the rings and the 2013 name; else a key
   under the plot. {svg, key}: exactly one is non-empty */
PL.refLabel=function(o){
  var fs=o.fs;
  var w=o.text.length*fs*0.62, rx=o.W-o.mr, ys=[], boxes=[];
  function pts(a){ return a.map(function(v,i){ return v==null?null:[o.x(i),o.y(v)]; }); }
  for(var j=0;j<=o.rl;j++) if(o.ref[j]!=null&&o.x(j)>=rx-w-12) ys.push(o.y(o.ref[j]));
  var lo=Math.min.apply(null,ys), hi=Math.max.apply(null,ys), hw=2*fs*0.62+2;
  o.marks.forEach(function(i){ if(o.values[i]==null) return; var cx=o.x(i), cy=o.y(o.values[i]);
    boxes.push([cx-7,cy-7,cx+7,cy+7]); if(!o.markBoxes) boxes.push([cx-2*hw,cy-9-fs,cx+hw,cy-5]); });
  (o.markBoxes||[]).forEach(function(b){ boxes.push(b); });                 /* where the marks' years actually sit */
  o.rings.forEach(function(i){ if(o.values[i]==null) return; var cx=o.x(i), cy=o.y(o.values[i]); boxes.push([cx-9,cy-9,cx+9,cy+9]); });
  if(o.brk){ var bw=o.brk[2].length*fs*0.62, b0=o.brk[3]==='start'?o.brk[0]:o.brk[3]==='end'?o.brk[0]-bw:o.brk[0]-bw/2; boxes.push([b0-2,o.brk[1]-fs,b0+bw+2,o.brk[1]+3]); }
  var c=PL.chartSpot({text:o.text, fs:fs, lines:[pts(o.values),pts(o.ref)].concat(o.rule!=null?[[[o.rule,o.mt],[o.rule,o.H-o.mb]]]:[]),
    boxes:boxes, top:0, bottom:o.H-o.mb, left:o.ml, right:o.W,
    cands:[{x:rx,y:lo-7,a:'end'},{x:rx,y:hi+fs+4,a:'end'},{x:rx,y:o.mt+fs+2,a:'end'},{x:o.ml+6,y:o.mt+fs+2,a:'start'}]});
  if(!c) return {svg:'', key:o.text};
  return {svg:'<text class="'+o.cls+'" x="'+c.x.toFixed(1)+'" y="'+c.y.toFixed(1)+'" text-anchor="'+c.a+'" font-size="'+fs+'">'+o.text+'</text>', key:''};
};
/* trend - the category sheet's Trend tab, ONE implementation for the front page and the county family (Joe + Fable r5/r6,
   10-28). A sentence (the filed change, prices beside it, the share as a plain fraction, per resident) whose figures open
   their workings or switch the lens; a Dollars / Share / Per resident lens on one chart with a price yardstick; year chips
   (the latest, then the marked events with the line that moved most); and what moved in the chosen year, each line opening
   its own history (the page's tr[data-acct] handler). E = {body, label, sec, years, brk, cpi, pop, vals, tot, col, of, esc,
   renderLine, rowsAt(i) -> [{narr, acct, was, cur, d}] by |d|, state}. The lens is kept per sheet; year and workings per
   category. */
PL.trendTab=function(E){
  var Y=E.years, V=E.vals, n=Y.length, S=E.state, esc=E.esc, M0=PL.money0, HOV=window.matchMedia('(hover:hover)').matches;
  if(!document.getElementById('pl-trend-css')){
    var c=document.createElement('style'); c.id='pl-trend-css';
    c.textContent='.tnum{font:inherit;color:inherit;background:none;border:0;margin:0;padding:1px 0;cursor:pointer;text-align:inherit;'
      +'text-decoration:underline;text-decoration-style:dotted;text-decoration-thickness:1.5px;text-underline-offset:4px}'
      +'.tnum[aria-expanded=true],.tnum[aria-pressed=true]{text-decoration-style:solid}'
      +'.twork{margin:-6px 0 14px;padding:10px 12px;border-radius:10px;background:var(--card);border:1px solid var(--rule-strong);font-size:var(--fs-15);color:var(--ink);line-height:var(--lh-24)}'
      +'.twork p{margin:0}.tlens{margin:0 0 8px}'
      +'.tchips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 16px}'
      +'.tchip{min-height:36px;padding:6px 12px;border-radius:999px;border:1px solid var(--rule-strong);background:transparent;color:var(--ink);font:inherit;font-size:var(--fs-14);cursor:pointer;font-variant-numeric:tabular-nums}'
      +'.tchip[aria-pressed=true]{background:var(--ink);color:var(--paper);border-color:var(--ink)}'
      +'.tbrk{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);border-radius:10px;padding:9px 12px;font-size:var(--fs-14);margin:0 0 12px;line-height:var(--lh-20)}'
      +'.mvt{width:100%;border-collapse:collapse;font-size:var(--fs-14);line-height:var(--lh-20)}'
      +'.mvt th{font-size:var(--fs-12);letter-spacing:1.2px;text-transform:uppercase;color:var(--faint);text-align:left;font-weight:600;padding:7px 8px;border-bottom:1px solid var(--rule-strong);white-space:nowrap;line-height:var(--lh-16)}'
      +'.mvt td{padding:8px;border-bottom:1px solid var(--rule);vertical-align:middle}.mvt .r{text-align:right;white-space:nowrap}'
      +'.mvt .mc{color:var(--faint);font-size:var(--fs-13);line-height:var(--lh-16)}.mvt .mr{display:none}.mvt .md{font-weight:600}.mvt .mb,.mvt .mbh{width:120px;padding-left:14px}'
      +'.mvt tr[data-acct]{cursor:pointer}.mvt tr[data-acct]:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}'
      +'@media (hover:hover){.mvt tr[data-acct]:hover td{background:var(--accent-soft)}}'
      +'.tdv{position:relative;display:block;width:100%;height:8px;border-radius:4px;background:var(--gridline)}'
      +'.tdv::before{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:var(--ink);opacity:.55}'
      +'.tdv i{position:absolute;top:0;bottom:0;display:block;background:var(--ink)}.tdv i.o{left:50%;border-radius:0 4px 4px 0}'
      +'.tdv i.u{right:50%;border-radius:4px 0 0 4px;background:repeating-linear-gradient(135deg,var(--ink) 0 2px,transparent 2px 4px);box-shadow:inset 0 0 0 1px var(--ink)}'
      +'.tfoot{font-size:var(--fs-14);color:var(--muted);margin:8px 0 0;line-height:var(--lh-20)}'
      +'@media (max-width:640px){.mvt,.mvt tbody{display:block;width:100%}.mvt thead{display:none}'
      +'.mvt tr{display:grid;grid-template-columns:1fr auto;gap:3px 12px;padding:10px 2px;border-bottom:1px solid var(--rule)}'
      +'.mvt td{display:block;padding:0;border:0}.mvt td.mn{grid-row:1;grid-column:1;font-weight:600}'
      +'.mvt .mr{display:block;font-weight:400;font-size:var(--fs-14);color:var(--muted);margin-top:2px;line-height:var(--lh-20)}'
      +'.mvt td.m1,.mvt td.m2{display:none}.mvt td.md{grid-row:1;grid-column:2;text-align:right}'
      +'.mvt td.mb{grid-row:2;grid-column:1/-1;width:auto;padding:5px 0 0}'
      +'.mvt tr.acct-hist{display:block;padding:0}.mvt tr.acct-hist td{display:block;width:100%}}';
    (document.head||document.documentElement).appendChild(c);
  }
  var share=V.map(function(v,i){ return v==null?null:(E.tot[i]?v/E.tot[i]*100:0); });
  /* a filing one year past the newest population estimate uses that estimate (the note says so) */
  var pLast=E.pop?Math.max.apply(null,Object.keys(E.pop).map(Number)):0;
  function popAt(yr){ return E.pop?(E.pop[yr]||(yr===pLast+1?E.pop[pLast]:0)):0; }
  var per=E.pop?V.map(function(v,i){ var p=popAt(Y[i]); return v==null||!p?null:v/p; }):null;
  var i0=V.findIndex(function(v){ return v>0; }); if(i0<0) i0=0;
  var iN=n-1; while(iN>0&&V[iN]==null) iN--;
  var iL=iN; while(iL>i0&&!V[iL]) iL--;
  var t0=Y[i0], tN=Y[iN], tC=tN; while(E.cpi&&tC>t0&&!E.cpi[tC]) tC--;   /* the newest year with prices (a 2026 filing: 2025) */
  var c0=E.cpi&&E.cpi[t0], cN=E.cpi&&E.cpi[tC];
  var key=E.sec+'|'+E.label; if(S.tKey!==key){ S.tKey=key; S.tSel=null; S.tWork=null; }
  if(!S.tLens||(S.tLens==='pc'&&!per)) S.tLens='usd';
  function grow(a){ return (c0&&cN&&a&&a[i0]!=null)?Y.map(function(yr,i){ return i<i0||!E.cpi[yr]?null:a[i0]*E.cpi[yr]/c0; }):null; }
  function sh(v){ v=Math.abs(v); return v<1000?M0(v):PL.fmtM1(v); }
  var dAt=function(k){ return (V[k]||0)-(V[k-1]||0); };
  /* the events worth a mark, at most two; a move that reverses the one before it (opposite sign, at least 0.6 of its size)
     belongs to that earlier year's event */
  var moves=[], marks=[];
  for(var mi=1;mi<n;mi++) if(Y[mi]!==E.brk&&V[mi]!=null&&V[mi-1]!=null) moves.push([Math.abs(dAt(mi)),mi]);
  moves.sort(function(a,b){ return b[0]-a[0]; });
  var ev=function(i){ var a=dAt(i-1), b=dAt(i);
    return (i>1&&V[i-2]!=null&&Y[i-1]!==E.brk&&a*b<0&&Math.min(Math.abs(a),Math.abs(b))>=0.6*Math.max(Math.abs(a),Math.abs(b)))?i-1:i; };
  moves.forEach(function(m){ var e=ev(m[1]); if(marks.length<2&&marks.indexOf(e)<0) marks.push(e); });
  /* why: the account line that moved most that year (an H account is a capital-project fund) */
  function why(i){ var r=E.rowsAt(i)[0]; if(!r) return '';
    var nm=/^H/.test(r.acct)?'capital':String(r.narr).split(',')[0];
    if(nm.length>22) nm=nm.slice(0,22).replace(/\s+\S*$/,'').replace(/\s+(and|of|to|for|the|&)$/i,'')+'\u2026';   /* cut at a word, never mid-word */
    return nm+' '+(r.d<0?PL.MINUS:'+')+sh(r.d); }
  var lensB=[['usd','Dollars'],['share','Share of '+(E.sec?'spending':'revenue')]].concat(per?[['pc','Per resident']]:[]);
  E.body.innerHTML='<p class="tsent">'+PL.trendSentence({v0:V[i0], vN:V[iN], y0:t0, yN:tN, s0:share[i0], sN:share[iN], cpi:E.cpi, yC:tC, of:E.of,
      yL:Y[iL], vL:V[iL], sL:share[iL], p0:per&&per[i0], pN:per&&per[iN], drill:true})+'</p><div class="twork" id="tWork" hidden></div>'+
    '<h4>'+esc(E.label)+', '+t0+'–'+tN+' <span style="text-transform:none;letter-spacing:0;font-weight:500">&middot; '+
      (HOV?'hover to read a year, click one for what moved':'slide to read a year, tap one for what moved')+'</span></h4>'+
    '<div class="seg tlens" role="group" aria-label="Measure">'+lensB.map(function(b){
      return '<button type="button" data-lens="'+b[0]+'" aria-pressed="false">'+b[1]+'</button>'; }).join('')+'</div>'+
    '<div id="mLine"></div><div class="tchips" id="tChips" role="group" aria-label="Open a year"></div><div id="mMove"></div><p class="note" id="tNote"></p>';
  var pins=null;
  function lens(){ var L=S.tLens;
    if(L==='share') return {v:share, pct:true, ref:null, name:'Share of '+E.of, short:function(v){ return v.toFixed(1)+'%'; }};
    if(L==='pc') return {v:per, ref:grow(per), name:E.label+' per resident', short:function(v){ return '$'+Math.round(v); }};
    return {v:V, ref:grow(V), name:E.label, short:sh};
  }
  function draw(){
    var l=lens();
    E.renderLine(document.getElementById('mLine'), l.v, {color:E.col, name:l.name, pct:!!l.pct, marks:marks, sel:S.tSel, ref:l.ref,
      refFrom:i0, short:l.short, brkLabel:true, pins:pins, onPick:function(i){ if(i>0) pick(i); }});
    var t='';
    if(S.tLens==='usd'&&l.ref) t='The dashed line is '+t0+'&rsquo;s '+M0(V[i0])+' grown only by consumer prices (CPI-U, '+
      '<a href="https://data.bls.gov/timeseries/CUUR0000SA0" rel="noopener">Bureau of Labor Statistics</a>). ';
    else if(S.tLens==='pc') t='Per resident: each year&rsquo;s amount divided by the <a href="https://www.census.gov/programs-surveys/popest.html" rel="noopener">Census Bureau&rsquo;s</a> '+
      'July 1 population estimate for that year (its 1990s estimates were never revised to the 2000 census'+
      (tN>pLast?'; '+tN+' uses the '+pLast+' estimate, the newest published':'')+')'+(l.ref?'; the dashed line is '+t0+'&rsquo;s '+
      M0(per[i0])+' a resident grown only by consumer prices':'')+'. ';
    else if(S.tLens==='share') t='Share: this category divided by total '+(E.sec?'spending':'revenue')+' each year. ';
    document.getElementById('tNote').innerHTML=t+'Figures either side of '+E.brk+' sit on different reporting bases and are not strictly comparable.';
    mark();
  }
  function chips(){
    var ys=(V[iN]||V[iN-1]?[iN]:[]).concat(marks.filter(function(i){ return i!==iN; }).sort(function(a,b){ return a-b; }));   /* no 'latest' chip for a year of nothing */
    if(S.tSel!=null&&ys.indexOf(S.tSel)<0) ys.push(S.tSel);
    document.getElementById('tChips').innerHTML=ys.filter(function(i){ return i>0&&V[i-1]!=null; }).map(function(i){
      var w=i===iN?'latest':(marks.indexOf(i)>=0?why(i):'');
      return '<button type="button" class="tchip" data-ty="'+i+'" aria-pressed="'+(S.tSel===i)+'">'+Y[i]+(w?' &middot; '+esc(w):'')+'</button>';
    }).join('');
  }
  function move(i){
    var el=document.getElementById('mMove'); if(i==null){ el.innerHTML=''; return; }
    var rows=E.rowsAt(i), top=rows.slice(0,7), prev=Y[i-1], yr=Y[i];
    var net=(V[i]||0)-(V[i-1]||0), covered=top.reduce(function(s,r){ return s+r.d; },0), cx=net!==0?Math.abs(covered/net)*100:100;
    var mx=top.reduce(function(m,r){ return Math.max(m,Math.abs(r.d)); },0);
    var h='<h4>What moved in '+yr+' <span style="text-transform:none;letter-spacing:0">— vs '+prev+', net '+(net<0?PL.MINUS:'+')+M0(Math.abs(net))+'</span></h4>';
    if(yr===E.brk||prev===E.brk) h+='<div class="tbrk">This pair straddles the '+E.brk+' reporting-basis change — part of any move here is definitional.</div>';
    if(top.length) h+='<table class="mvt"><thead><tr><th>Account line</th><th class="r">'+prev+'</th><th class="r">'+yr+'</th><th class="r">Change</th>'+
        '<th class="mbh" aria-hidden="true">down &#9666; &#9656; up</th></tr></thead><tbody>'+
      top.map(function(r){
        var flag=r.was===0?'<span class="flag">NEW</span>':(r.cur===0?'<span class="flag">ENDED</span>':''), w=mx?Math.min(100,Math.abs(r.d)/mx*100):0;
        return '<tr data-acct="'+esc(r.acct)+'" role="button" tabindex="0"><td class="mn">'+esc(r.narr)+flag+' <span class="mc num">'+esc(r.acct)+'</span>'+
            '<span class="mr num">'+M0(r.was)+' &rarr; '+M0(r.cur)+'</span></td>'+
          '<td class="r num m1">'+M0(r.was)+'</td><td class="r num m2">'+M0(r.cur)+'</td>'+
          '<td class="r num md"><span aria-hidden="true">'+(r.d>=0?'&#9650;':'&#9660;')+' </span>'+(r.d<0?PL.MINUS:'+')+M0(Math.abs(r.d))+'</td>'+
          '<td class="mb"><span class="tdv" aria-hidden="true"><i class="'+(r.d>=0?'o':'u')+'" style="width:'+(w/2).toFixed(1)+'%"></i></span></td></tr>';
      }).join('')+'</tbody></table>';
    h+='<p class="tfoot">'+(!top.length?'Nothing was filed under '+esc(E.label)+' in '+prev+' or '+yr+'.':
        (top.length===1?'This one account line explains ':'These '+PL.numword(top.length)+' account lines explain ')+
        (cx>=99.5?'all':Math.min(cx,999).toFixed(0)+'%')+' of the net move'+(cx>=105?' (smaller lines moved the other way)':'')+'. '+
        (HOV?'Select':'Tap')+' a line for its history.')+
      (top.some(function(r){ return /^H/.test(r.acct); })?' Accounts beginning H are capital-project funds — one-time outlays, not operating growth.':'')+'</p>';
    el.innerHTML=h;
  }
  function pick(i){ S.tSel=i; draw(); chips(); move(i); }
  function work(k){
    var el=document.getElementById('tWork');
    if(!k||S.tWork===k){ S.tWork=null; el.hidden=true; pins=null; draw(); return; }
    S.tWork=k; var h='';
    if(k==='chg'){ var r=V[iN]/V[i0];
      h=t0+' <b class="num">'+M0(V[i0])+'</b> &rarr; '+tN+' <b class="num">'+M0(V[iN])+'</b>: '+(V[iN]>=V[i0]?'+':PL.MINUS)+M0(Math.abs(V[iN]-V[i0]))+
        ', '+r.toFixed(2)+' times the '+t0+' amount. Both years are ringed on the chart.';
      pins=[i0,iN]; S.tLens='usd';
    } else {
      var g=cN/c0;
      h='Consumer prices (CPI-U, U.S. city average, annual average): <b class="num">'+c0+'</b> in '+t0+' &rarr; <b class="num">'+cN+'</b> in '+tC+
        ', &times;'+g.toFixed(3)+'. At that pace alone, '+t0+'&rsquo;s '+M0(V[i0])+' would be <b class="num">'+M0(V[i0]*g)+'</b> in '+tC+': the dashed line.'+
        (tC!==tN?' Prices for '+tN+' are not published yet.':'');
      pins=null; S.tLens='usd';
    }
    el.innerHTML='<p>'+h+'</p>'; el.hidden=false; draw();
  }
  function mark(){
    [].forEach.call(E.body.querySelectorAll('[data-lens]'),function(b){ b.setAttribute('aria-pressed',String(b.getAttribute('data-lens')===S.tLens)); });
    [].forEach.call(E.body.querySelectorAll('.tnum[data-tw]'),function(b){ b.setAttribute('aria-expanded',String(b.getAttribute('data-tw')===S.tWork)); });
  }
  PL._trendClick=function(e){
    if(!document.getElementById('tChips')) return;
    var b=e.target.closest('[data-lens],[data-tw],[data-ty]'); if(!b||!E.body.contains(b)) return;
    if(b.hasAttribute('data-lens')){ S.tLens=b.getAttribute('data-lens');
      if(S.tWork){ S.tWork=null; pins=null; document.getElementById('tWork').hidden=true; } draw(); return; }
    if(b.hasAttribute('data-tw')){ work(b.getAttribute('data-tw')); return; }
    pick(+b.getAttribute('data-ty'));
  };
  if(!E.body._plTrend){ E.body._plTrend=1; E.body.addEventListener('click',function(e){ if(PL._trendClick) PL._trendClick(e); }); }
  /* open on the latest filing - what moved this year is a resident's question; a category no longer filed opens on its last move */
  if(S.tSel==null){ var kN=iN; while(kN>1&&!V[kN]&&!V[kN-1]) kN--; S.tSel=(kN>0&&V[kN-1]!=null)?kN:null; }
  var w0=S.tWork; S.tWork=null;
  draw(); chips(); move(S.tSel);
  if(w0) work(w0);
};
/* mix - the category sheet's Mix tab, ONE implementation for the front page and the county family (Joe, 11-08: "the lack of
   labels and such make it a little tough"). Three readings, top to bottom: where the money goes in the latest filing (a bar a
   part, dollars and share printed on each), how the split shifted (each part's share at a start year and the latest, a slope),
   and each part year by year (the small multiples, PL.sparks, a figure printed at each end). One ink: parts are told apart by
   their names and places, never a hue. A bar, a slope line or its label opens that part's readout in place (both years' figures
   and its account lines, each opening its own history through the page's [data-acct] handler); Close, a second tap or Back puts
   the sheet back where it was. The slope's start year is computed: a part first filed at the reporting-basis change, or parts
   that stop adding up to the category, move it to the change, so a relabelling is never drawn as a shift.
   E = {body, label, sec, years, brk, subs:[{label, values}], vals (the category's series), col, esc, spark(values, max),
   lines(part, year) -> html of its account lines, sub(el, close) (the page's LAYER.sub), scroller, state} */
PL.mixTab=function(E){
  var Y=E.years, n=Y.length, S=E.state, esc=E.esc, M0=PL.money0, HOV=window.matchMedia('(hover:hover)').matches;
  if(!document.getElementById('pl-mix-css')){
    var c=document.createElement('style'); c.id='pl-mix-css';
    c.textContent='.mx-h,#mBody .mx-h{margin:26px 0 2px;font:600 var(--fs-17)/var(--lh-24) var(--font-sans);color:var(--ink);letter-spacing:normal;text-transform:none}'
      +'.mx-h:first-child,#mBody .mx-h:first-child{margin-top:2px}'
      +'.mx-sub{margin:0 0 10px;font:400 var(--fs-14)/var(--lh-20) var(--font-sans);color:var(--muted);max-width:68ch}'
      +'.mx-bars{list-style:none;margin:0;padding:0;border-top:1px solid var(--rule)}.mx-bars li{margin:0;padding:0}'
      +'.mx-bar{display:block;width:100%;min-height:44px;margin:0;padding:8px 0 10px;border:0;border-bottom:1px solid var(--rule);background:none;color:var(--ink);font:inherit;text-align:left;cursor:pointer}'
      +'.mx-bar .t{display:flex;justify-content:space-between;align-items:baseline;gap:12px}'
      +'.mx-bar .nm{font:600 var(--fs-15)/var(--lh-24) var(--font-sans);min-width:0}'
      +'.mx-bar .fg{font:600 var(--fs-17)/var(--lh-24) var(--font-serif);white-space:nowrap;font-variant-numeric:lining-nums tabular-nums}'
      +'.mx-bar .fg span{font:400 var(--fs-14)/var(--lh-20) var(--font-sans);color:var(--muted)}'
      +'.mx-bar .tr{display:block;height:10px;margin-top:6px;border-radius:4px;background:var(--gridline);overflow:hidden}'
      +'.mx-bar .tr i{display:block;height:100%;min-width:3px;border-radius:4px}'
      +'.mx-bar[aria-expanded=true] .nm{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:5px}'
      +'@media (hover:hover){.mx-bar:hover .nm{color:var(--accent)}.mx-sl g[data-mx]:hover .ln{stroke-width:4}}'
      +'.mx-bar:focus-visible,.mx-sl g[data-mx]:focus-visible{outline:2px solid var(--accent);outline-offset:2px}'
      +'.mx-rd{margin:10px 0 14px;padding:12px 14px;border-radius:10px;background:var(--card);border:1px solid var(--rule-strong)}'
      +'.mx-rd p{margin:0 0 8px;font:400 var(--fs-15)/var(--lh-24) var(--font-sans);color:var(--ink)}'
      +'.mx-rd p.mx-sub{margin:10px 0 4px;color:var(--muted)}'
      +'.mx-x{min-height:44px;margin-top:10px;padding:0 18px;border-radius:999px;border:1px solid var(--rule-strong);background:transparent;color:var(--ink);font:600 var(--fs-14)/var(--lh-20) var(--font-sans);cursor:pointer}'
      +'.mx-sl{display:block;max-width:100%;overflow:visible;margin:4px 0 2px}'
      +'.mx-sl text{fill:var(--ink)}.mx-sl .p{font-family:var(--font-serif);font-weight:600}.mx-sl text.yr{fill:var(--muted);font-weight:600}'
      +'.mx-sl .ln{fill:none;stroke-width:2.5;stroke-linecap:round}.mx-sl .ld{stroke:var(--muted);stroke-width:1;fill:none}.mx-sl .ax{stroke:var(--rule-strong);stroke-width:1}'
      +'.mx-sl g[data-mx]{cursor:pointer;outline:none}.mx-sl g.on .ln{stroke-width:4.5}.mx-sl.pick g[data-mx]:not(.on){opacity:.4}'
      +'.mx-pans .sm .n{white-space:normal;overflow:visible}'
      +'.mx-ax{position:relative;height:36px;margin-top:5px;color:var(--muted);font:400 var(--fs-12)/var(--lh-16) var(--font-sans)}'
      +'.mx-ax span{position:absolute;top:0;white-space:nowrap}.mx-ax b{display:block;font:600 var(--fs-13)/var(--lh-16) var(--font-serif);color:var(--ink)}'
      +'.mx-ax .ab{top:16px;transform:translateX(-50%)}';
    (document.head||document.documentElement).appendChild(c);
  }
  var subs=E.subs||[];
  if(subs.length<2){
    E.body.innerHTML='<p class="lede">'+esc(E.label)+' is filed as a single line: there are no parts to compare. The Trend tab shows its history.</p>';
    return;
  }
  function sM(v){ var a=Math.abs(v||0), s=(v||0)<0?PL.MINUS:'';
    if(a>=999500000) return s+'$'+(a/1e9).toPrecision(3)+'B';
    if(a>=999500) return s+'$'+(a/1e6).toPrecision(3)+'M';
    if(a>=999.5) return s+'$'+(a/1e3).toPrecision(3)+'K';
    return s+'$'+Math.round(a); }
  function pc(v){ return v>=9.95?Math.round(v)+'%':v>=0.05?v.toFixed(1)+'%':v>0?'under 0.1%':'0%'; }
  function p1(v){ return v>0&&v<0.05?'under 0.1%':v.toFixed(1)+'%'; }
  var V=Y.map(function(y,i){ return (E.vals&&E.vals[i])||0; });
  var P=subs.map(function(s){ return {label:s.label, values:s.values, z:s.values.map(function(v){ return v||0; })}; });
  /* fix wave 11-08 (P3): where the category is already named (the bars, the slope's labels, the panels), a part whose name repeats it shows
     only the rest ('State Aid - Health' under State Aid reads 'Health'); readouts and aria labels keep the full name. A short name that
     would match another part's keeps the full one */
  var CATL=String(E.label||'').trim().toLowerCase(), SN={};
  P.forEach(function(p){ var t=String(p.label), r='';
    if(CATL&&t.toLowerCase().indexOf(CATL)===0){ var m=/^(\s*[-–—:,]\s*|\s+)(?=\S)/.exec(t.slice(CATL.length)); if(m) r=t.slice(CATL.length+m[0].length); }
    SN[p.label]=r; });
  P.forEach(function(p){ var r=SN[p.label]; if(r&&P.some(function(q){ return q!==p&&(q.label.toLowerCase()===r.toLowerCase()||(SN[q.label]||'').toLowerCase()===r.toLowerCase()); })) SN[p.label]=''; });
  function sn(t){ return SN[t]||t; }
  /* the latest filing with anything in it */
  var iN=n-1; while(iN>0&&!(V[iN]>0)) iN--;
  function sh(p,i){ return V[i]>0?p.z[i]/V[i]*100:0; }
  function adds(i){ var s=P.reduce(function(t,p){ return t+p.z[i]; },0); return Math.abs(s-V[i])<=Math.abs(V[i])*0.005+1; }
  /* the slope's start: the first year filed, unless parts were renamed or regrouped at the reporting-basis change */
  var c0=V.findIndex(function(v){ return v>0; }); if(c0<0) c0=0;
  var bi=Y.indexOf(E.brk), i0=c0, moved=[], gap=false;
  if(bi>0&&c0<bi&&iN>=bi){
    P.forEach(function(p){ var f=p.z.findIndex(function(v){ return v>0; });
      if(f>=bi&&f<=bi+1&&!p.z.slice(0,bi).some(function(v){ return v>0; })) moved.push(p.label); });
    for(var gi=c0;gi<bi;gi++) if(V[gi]>0&&!adds(gi)) gap=true;
  }
  /* r11 (Codex N01): a new part name is not the only regrouping - an account line can move from one existing part to another
     (General Government's A19894: Operations to 2012, Miscellaneous General Government from 2013). With the page's account lines
     (E.acctParts(year) -> {code: {p: {part: 1}, n: its name}}) every year from the first filing is read account by account: a code
     filed under a different part than the year it was last filed is a move. Moves at or before the basis change move the start to
     the change; a move after the start is said beside the chart. No assurance of continuity is printed that this check did not make. */
  var MV=[], chk=!!E.acctParts, brkIn=bi>0&&c0<bi&&iN>=bi;
  if(chk){ var last={};
    for(var yi=c0;yi<=iN;yi++){ var ap=E.acctParts(Y[yi])||{};
      Object.keys(ap).forEach(function(a){ var p=Object.keys(ap[a].p).sort().join(' + ');
        if(last[a]&&last[a].p!==p) MV.push({a:a, n:ap[a].n||'', f:last[a].p, t:p, i:yi});
        last[a]={p:p}; }); } }
  var mvB=brkIn?MV.filter(function(m){ return m.i<=bi; }):[];
  if(brkIn&&(moved.length||gap||(mvB.length&&mvB.length===MV.length))){ i0=bi; while(i0<iN&&!(V[i0]>0)) i0++; }
  var post=MV.filter(function(m){ return m.i>i0; });
  var and=function(a){ return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1]; };
  function mvs(L,when){ var s=L.slice(0,2).map(function(m){ return 'account '+esc(m.a)+(m.n?' ('+esc(m.n)+')':'')+' moved from '+esc(m.f)+' to '+esc(m.t)+(when?' in '+Y[m.i]:''); });
    if(L.length>2){ var nw=PL.numword?PL.numword(L.length-2):String(L.length-2); s.push(nw+' other account line'+(L.length-2>1?'s':'')+' moved between parts'); }
    return and(s); }
  var why;
  if(i0===c0) why=brkIn
      ? (chk&&!MV.length
          ? 'From '+Y[c0]+', the first filing year. Shares as filed: no account code was filed under a different part across the '+E.brk+' reporting-basis change.'
          : 'From '+Y[c0]+', the first filing year. Shares as filed: the reporting basis changed in '+E.brk+', and account groupings can change with it.')
      : 'From '+Y[c0]+', the first year anything was filed here.';
  else why='From '+Y[i0]+', the first year on the new reporting basis: '+(moved.length
      ? esc(and(moved))+(moved.length>1?' were':' was')+' first filed under '+(moved.length>1?'those names':'that name')+' then, so an earlier start would draw a relabelling, not a shift'
      : mvB.length ? mvs(mvB,true)+', so an earlier start would draw a regrouping, not a shift'
      : 'before it the parts do not add up to the category, so an earlier start would draw a relabelling, not a shift')+'.';
  if(post.length) why+=' Shares as filed: '+mvs(post,true)+', so part of a shift between those parts is a regrouping.';
  /* bars: every part with something in the latest filing, largest first */
  var B=P.filter(function(p){ return p.z[iN]>0; }).sort(function(a,b){ return b.z[iN]-a.z[iN]; });
  /* slope (v2, coordinator 11-08): only a part filed in BOTH years is drawn - nothing filed at one end is never a 0% point; the note
     names each part left out and why. Ranked by the larger of its two shares; slope() draws at most four lines and folds the rest
     into one 'Smaller parts' line (its sentence names what it sums), fewer lines when a label would need more than a short tick */
  var EL=[], OUT=[], SL=[];
  P.forEach(function(p){ var a=sh(p,i0), b=sh(p,iN);
    if(a>0&&b>0) EL.push({label:p.label, a:a, b:b, p:p}); else if(a>0||b>0) OUT.push(p); });
  EL.sort(function(x,y){ return Math.max(y.a,y.b)-Math.max(x.a,x.b)||(x.label<y.label?-1:1); });
  function fold(N){
    var top=EL.slice(0,N), rest=EL.slice(N); if(rest.length===1) return null;     /* a fold of one is that part: the next N tries it */
    if(rest.length){
      var fa=rest.reduce(function(t,q){ return t+q.a; },0), fb=rest.reduce(function(t,q){ return t+q.b; },0);
      /* v3 (review P1-2): 'Smaller parts' only when the fold is below every drawn line at both ends; otherwise it says how many */
      var small=Math.max(fa,fb)<top.reduce(function(m,q){ return Math.min(m,q.a,q.b); },Infinity);
      var nw=PL.numword?PL.numword(rest.length):String(rest.length);
      top.push({label:small?'Smaller parts':nw.charAt(0).toUpperCase()+nw.slice(1)+' other parts', a:fa, b:fb, merged:rest});
    }
    return top.sort(function(x,y){ return y.b-x.b||y.a-x.a; });
  }
  var outWhy=OUT.map(function(p){
    var f=-1, k=-1; for(var i=0;i<n;i++) if(p.z[i]>0){ if(f<0) f=i; k=i; }
    return esc(p.label)+' ('+(p.z[i0]>0 ? (k<iN?'last filed in '+Y[k]:'nothing filed in '+Y[iN]) : (f>i0?'first filed in '+Y[f]:'nothing filed in '+Y[i0]))+')';
  });
  /* panels: a part that filed nothing in the last five years folds to one line naming its last non-zero filing */
  var live=[], gone=[];
  P.forEach(function(p){ (n>=5&&!p.z.slice(-5).some(function(v){ return v>0; })?gone:live).push(p); });
  var gmax=live.reduce(function(m,p){ return Math.max(m,Math.max.apply(null,p.z)); },0)||1;

  S.mxOpen=null;
  var col=E.col, of=esc(E.label);
  E.body.innerHTML=
    '<h4 class="mx-h">'+(E.sec?'Where the money goes, ':'Where the money comes from, ')+Y[iN]+'</h4>'+
    '<p class="mx-sub">'+of+'&rsquo;s '+sM(V[iN])+' in the '+Y[iN]+' filing, part by part. '+(HOV?'Select':'Tap')+' a part for its account lines.</p>'+
    '<ul class="mx-bars" id="mxBars">'+B.map(function(p,k){ var s=sh(p,iN);
      return '<li><button type="button" class="mx-bar" data-mxb="'+k+'" aria-expanded="false">'+
        '<span class="t"><span class="nm">'+esc(sn(p.label))+'</span><span class="fg">'+sM(p.z[iN])+' <span>&middot; '+pc(s)+'</span></span></span>'+
        '<span class="tr" aria-hidden="true"><i style="width:'+Math.min(100,s).toFixed(2)+'%;background:var('+col+')"></i></span></button></li>';
    }).join('')+'</ul>'+
    (iN>i0 ? '<h4 class="mx-h">How the split shifted, '+Y[i0]+' to '+Y[iN]+'</h4><p class="mx-sub" id="mxSlSub">Each part&rsquo;s share of '+of+' in both years. '+why+'</p>'+
      '<div id="mxSlope"></div><div id="mxSlRd"></div><p class="mx-sub" id="mxSlNote"></p>'
      : '')+
    '<h4 class="mx-h">Each part, year by year</h4>'+
    '<p class="mx-sub">'+(HOV?'Hover across a panel to read any year; click to hold one.':'Slide across a panel to read any year; tap to hold one.')+
      ' Dollars as filed, not adjusted for inflation.</p>'+
    (live.length>1?'<div class="seg" id="mxScale" role="group" aria-label="Scale"><button type="button" data-own="0" aria-pressed="false">Same scale</button>'+
      '<button type="button" data-own="1" aria-pressed="false">Zoom each</button></div>':'')+
    '<div class="small mx-pans" id="mxPanels"></div>'+
    '<p class="note" id="mxNote"></p>'+
    (gone.length ? '<p class="note">Filed nothing in the last five years: '+gone.map(function(p){
        var k=-1; for(var i=n-1;i>=0;i--) if(p.z[i]){ k=i; break; }
        var tw=live.filter(function(q){ return q.label!==p.label&&q.label.toLowerCase()===p.label.toLowerCase(); })[0];
        return esc(p.label)+(k>=0 ? ' (last non-zero filing '+Y[k]+', '+M0(p.z[k])+')' : ' (never above zero)')+
          (tw&&k>=0 ? ': the same name in other capitals, filed as &lsquo;'+esc(p.label)+'&rsquo; until '+Y[k]+' and as &lsquo;'+esc(tw.label)+'&rsquo; after that' : '');
      }).join('; ')+'.</p>' : '');
  /* the readout: one at a time, in place under what opened it */
  var scr=E.scroller||E.body;
  /* r11 (Codex N02): closing a readout (Escape, Close, Back) whose focus was inside it, or already lost to the page, puts focus back
     on what opened it - the bar or the slope line, found again by its index if a redraw replaced it - so the next Tab goes on from there */
  function opener(o){ return o.kind==='b' ? E.body.querySelector('[data-mxb="'+o.k+'"]') : document.querySelector('#mxSlope svg g[data-mx="'+o.k+'"]'); }
  function close(restore){
    var o=S.mxOpen; if(!o) return; S.mxOpen=null;
    var ae=document.activeElement, lost=!ae||ae===document.body||ae===document.documentElement||!!(o.el&&o.el.contains(ae));
    if(o.el&&o.el.isConnected) o.el.remove();
    if(o.btn) o.btn.setAttribute('aria-expanded','false');
    var svg=document.querySelector('#mxSlope svg'); if(svg){ svg.classList.remove('pick'); [].forEach.call(svg.querySelectorAll('g.on'),function(g){ g.classList.remove('on'); g.setAttribute('aria-expanded','false'); }); }
    if(restore!==false&&o.top!=null) scr.scrollTop=o.top;
    if(lost&&restore!==false){ var t=opener(o); if(t&&t.isConnected){ try{ t.focus({preventScroll:true}); }catch(x){ t.focus(); } } }
  }
  function body(s){
    if(s.merged) return s.merged.map(function(q){
      return '<p><b>'+esc(q.label)+'</b>: '+p1(q.a)+' in '+Y[i0]+' ('+M0(q.p.z[i0])+'), '+p1(q.b)+' in '+Y[iN]+' ('+M0(q.p.z[iN])+').</p>'; }).join('');
    var p=s.p||s, l=E.lines?E.lines(p.label,Y[iN]):'';
    return '<p><b>'+esc(p.label)+'</b>: '+M0(p.z[iN])+' in '+Y[iN]+', '+p1(sh(p,iN))+' of '+of+'.'+
      (iN>i0?' In '+Y[i0]+': '+M0(p.z[i0])+', '+p1(sh(p,i0))+'.':'')+'</p>'+
      (l?'<p class="mx-sub">Its account lines in '+Y[iN]+'. '+(HOV?'Select':'Tap')+' one for its history.</p>'+l:'');
  }
  function open(kind,k,trigger){
    var same=S.mxOpen&&S.mxOpen.kind===kind&&S.mxOpen.k===k; close(same);
    if(same) return;
    var s=kind==='b'?B[k]:SL[k], el=document.createElement('div');
    el.className='mx-rd'; el.id='mxRd'; el.setAttribute('role','region'); el.setAttribute('aria-label',(s.label)+' readout');
    el.innerHTML=body(s)+'<button type="button" class="mx-x" data-mxx>Close</button>';
    var o={kind:kind, k:k, el:el, top:scr.scrollTop, btn:null};
    if(kind==='b'){ var b=E.body.querySelector('[data-mxb="'+k+'"]'); b.parentNode.appendChild(el); b.setAttribute('aria-expanded','true'); o.btn=b; }
    else { document.getElementById('mxSlRd').appendChild(el);
      var svg=document.querySelector('#mxSlope svg'), g=svg&&svg.querySelector('g[data-mx="'+k+'"]');
      if(g){ svg.classList.add('pick'); g.classList.add('on'); g.setAttribute('aria-expanded','true'); } }
    S.mxOpen=o;
    var r=el.getBoundingClientRect(), sr=scr.getBoundingClientRect();
    if(r.bottom>sr.bottom) scr.scrollTop+=Math.max(0,Math.min(r.bottom-sr.bottom+12, r.top-sr.top-60));
    if(E.sub) E.sub(el,function(){ if(S.mxOpen&&S.mxOpen.el===el) close(); else el.remove(); });
  }
  /* the slope, sized to its box: names wrap to their column, labels never overlap (a leader joins a moved one to its point) */
  function slope(){
    var host=document.getElementById('mxSlope'); if(!host) return;
    /* v3 (review): labels 10px apart (each one's tap area reaches ~36px or more, P2-9); the run between the years at least 40% of the
       width (P2-5); a taller plot (up to 3x) and a leader up to 24px before a line folds, so a phone draws a desk's lines (P1-2) */
    var W=Math.min(640,Math.round(host.clientWidth||340)), nar=W<340, fs=nar?12:13, lh=18, pf=15, GAP=10, SHORT=12, LEAD=24, G=nar?8:11;
    var NS='http://www.w3.org/2000/svg', mt=document.createElementNS(NS,'svg'), tx=document.createElementNS(NS,'text'), cache={};
    mt.setAttribute('class','mx-sl'); mt.setAttribute('aria-hidden','true'); mt.style.cssText='position:absolute;left:-9999px;top:0;visibility:hidden';
    mt.appendChild(tx); E.body.appendChild(mt);
    /* a string's real width in the page's own faces (an estimate while the sheet is not laid out) */
    function tw(t,big){ var k=(big?'p':'n')+t;
      if(cache[k]==null){ tx.setAttribute('font-size',big?pf:fs); tx.setAttribute('class',big?'p':''); tx.textContent=t;
        var w=tx.getComputedTextLength(); cache[k]=w>0?w:String(t).length*(big?pf*0.6:fs*0.56); }
      return cache[k]; }
    /* the pieces a name may wrap between: its spaces (a lone '-' or '&' stays with the next word), and after a slash or hyphen it
       already has ('Losap/' 'Miscellaneous', 'Non-' 'Medicaid'); each piece knows whether a space comes before it */
    function words(t){
      var a=[];
      String(t).split(' ').forEach(function(w){
        if(a.length&&/^[-&]$/.test(a[a.length-1].t)){ a[a.length-1].t+=' '+w; return; }
        w.split(/(?<=[\/-])(?=.)/).forEach(function(q,j){ a.push({t:q, sp:j===0&&a.length>0}); });
      });
      return a; }
    var Lw=Math.min(190,Math.floor((W*0.6-2*G)/2)), lw0=0;
    EL.forEach(function(q){ words(sn(q.label)).forEach(function(w){ lw0=Math.max(lw0,tw(w.t)); }); });
    /* a word longer than the column first tries the 12px size and the 8px gutter (the floor's own size), then the run gives way */
    if(lw0>Lw&&fs>12){ fs=12; G=8; cache={}; lw0=0; Lw=Math.min(190,Math.floor((W*0.6-2*G)/2));
      EL.forEach(function(q){ words(sn(q.label)).forEach(function(w){ lw0=Math.max(lw0,tw(w.t)); }); }); }
    var byWord=lw0>Lw; Lw=Math.max(Lw,Math.ceil(Math.min(lw0,(W-2*G-40)/2)));            /* a single word never runs off the chart (the run then gives way, data-run=word) */
    var x0=Lw+G, x1=W-Lw-G, top=34, base=Math.round(Math.max(180,Math.min(230,W*0.45)));
    /* a label: the name wrapped to its column, the share (Fraunces) after its last word, or on a line of its own when it does not fit */
    function wrap(t,pct){ var pw=tw(pct,1)+4, out=[], cur='';
      words(t).forEach(function(w){ var j=cur+(w.sp?' ':'')+w.t; if(!cur) cur=w.t; else if(tw(j)<=Lw) cur=j; else { out.push(cur); cur=w.t; } });
      if(cur) out.push(cur);
      if(tw(out[out.length-1])+pw>Lw) out.push('');
      return out; }
    /* labels sit centred on their points; a run that would overlap moves as one block, centred on its points (so each moves least) */
    function place(L,side,yv,compact){
      var bl=L.map(function(s,k){ var v=side?s.b:s.a, ln=compact?['']:wrap(sn(s.label),pc(v)); return {k:k, py:yv(v), L:ln, v:v, h:ln.length*lh}; })
        .sort(function(a,b){ return a.py-b.py||a.k-b.k; });
      var C=bl.map(function(b){ return {it:[b], h:b.h}; });
      function lay(c){ var o=0, d=0; c.it.forEach(function(b,j){ b.o=o; d+=b.py-(o+b.h/2); o+=b.h+GAP; }); c.h=o-GAP; c.t=d/c.it.length; }
      C.forEach(lay);
      for(var moved=true;moved;){ moved=false;
        for(var i=0;i+1<C.length;i++) if(C[i].t+C[i].h+GAP>C[i+1].t){ C[i].it=C[i].it.concat(C[i+1].it); C.splice(i+1,1); lay(C[i]); moved=true; break; } }
      C.forEach(function(c){ c.it.forEach(function(b){ b.t=c.t+b.o; }); });
      var lead=0; bl.forEach(function(b){ lead=Math.max(lead,Math.abs(b.t+b.h/2-b.py)); });
      bl.lead=lead; return bl;
    }
    /* for one set of lines: the shortest plot whose leaders are a tick (12px), else the shortest within 24px, else the shortest leaders */
    function fit(L){
      var mx=L.reduce(function(q,s){ return Math.max(q,s.a,s.b); },0)||1, firstLong=null, least=null, r=null;
      [1,1.35,1.7,2.2,3].some(function(m){
        var ph=Math.round(base*m), yv=function(v){ return top+ph*(1-Math.max(0,v)/mx); };
        var BL=[place(L,0,yv),place(L,1,yv)], c={L:L, BL:BL, yv:yv, ph:ph, lead:Math.max(BL[0].lead,BL[1].lead)};
        if(c.lead<=SHORT){ r=c; return true; }
        if(!firstLong&&c.lead<=LEAD) firstLong=c;
        if(!least||c.lead<least.lead) least=c;
        return false;
      });
      return r||firstLong||least;
    }
    /* the most lines (up to four, ranked by their larger share, so a major part never folds while a smaller one is drawn) that fit */
    var best=null;
    for(var N=Math.min(4,EL.length);N>=1;N--){
      var L=fold(N); if(!L) continue;
      var c=fit(L); if(!best||c.lead<best.lead) best=c;
      if(c.lead<=LEAD){ best=c; break; }
    }
    if(best&&best.lead>LEAD){ var sd=best.BL[0].lead>=best.BL[1].lead?0:1, cb=place(best.L,sd,best.yv,true); if(cb.lead<best.BL[sd].lead) best.BL[sd]=cb; }   /* one end only: every line keeps its name at the other */
    mt.remove();
    SL=best?best.L:[];
    var BL=best?best.BL:[[],[]], yv=best?best.yv:function(){ return top; }, plotH=best?best.ph:base;
    /* a label above the plot's top moves the whole chart down under the year names, never the label alone (its leader stays short) */
    var t0=Infinity; BL.forEach(function(bl){ bl.forEach(function(b){ t0=Math.min(t0,b.t); }); });
    if(t0<24){ var dl=24-t0; top+=dl; BL.forEach(function(bl){ bl.forEach(function(b){ b.t+=dl; b.py+=dl; }); }); }
    var H=top+plotH;
    BL.forEach(function(bl){ bl.forEach(function(b){ H=Math.max(H,b.t+b.h); }); });
    H=Math.ceil(H+10);
    var lab=SL.map(function(){ return []; });
    BL.forEach(function(bl,side){ bl.forEach(function(b,i){
      var xe=side?x1:x0, xt=side?x1+G-2:x0-G+2, an=side?'start':'end', cy=b.t+b.h/2, s=[];
      if(Math.abs(cy-b.py)>2) s.push('<path class="ld" d="M'+(side?xe+5:xe-5)+' '+b.py.toFixed(1)+'L'+(side?xt-3:xt+3)+' '+cy.toFixed(1)+'"/>');
      /* its tap area: the label, grown toward 44px up to halfway to its neighbours */
      var lo=i?(bl[i-1].t+bl[i-1].h+b.t)/2:b.t-14, hi=i+1<bl.length?(b.t+b.h+bl[i+1].t)/2:b.t+b.h+14;
      var r0=Math.min(b.t-2,Math.max(lo,cy-22)), r1=Math.max(b.t+b.h+2,Math.min(hi,cy+22));
      s.push('<rect x="'+(side?xe+4:0)+'" y="'+r0.toFixed(1)+'" width="'+(side?W-xe-4:xe-4)+'" height="'+(r1-r0).toFixed(1)+'" fill="transparent"/>');
      b.L.forEach(function(t,j){ var last=j===b.L.length-1;
        s.push('<text x="'+xt+'" y="'+(b.t+lh*(j+1)-4).toFixed(1)+'" text-anchor="'+an+'" font-size="'+fs+'">'+esc(t)+
          (last?(t?' ':'')+'<tspan class="p" font-size="'+pf+'">'+pc(b.v)+'</tspan>':'')+'</text>'); });
      lab[b.k].push(s.join(''));
    }); });
    var note=[], fm=SL.filter(function(s){ return s.merged; })[0];
    if(fm) note.push('&lsquo;'+fm.label+'&rsquo; is '+esc(and(fm.merged.map(function(q){ return q.label; })))+' together, each filed in both years: '+p1(fm.a)+' in '+Y[i0]+' and '+p1(fm.b)+' in '+Y[iN]+'.');
    if(outWhy.length) note.push('Not drawn, because nothing was filed under '+(outWhy.length>1?'them':'it')+' in one of the two years: '+and(outWhy)+'.');
    var nt=document.getElementById('mxSlNote'); if(nt){ nt.innerHTML=note.join(' '); nt.hidden=!note.length; }
    /* v3 (review P2-8, P3-10): nothing filed in both years, or one part that is all of it in both - a sentence, no chart */
    var sb=document.getElementById('mxSlSub');
    if(!SL.length){ if(sb) sb.innerHTML='No part of '+of+' was filed in both '+Y[i0]+' and '+Y[iN]+', so there is no shift to draw.';
      host.innerHTML=''; host._w=host.clientWidth; return; }
    if(SL.length===1&&!SL[0].merged&&SL[0].a>=99.95&&SL[0].b>=99.95){
      if(sb) sb.innerHTML='One part, all of it in both years: '+esc(SL[0].label)+' is 100% of '+of+' in '+Y[i0]+' and in '+Y[iN]+'.';
      host.innerHTML=''; host._w=host.clientWidth; return; }
    var on=S.mxOpen&&S.mxOpen.kind==='s'?S.mxOpen.k:-1;
    var svg='<svg class="mx-sl'+(on>=0?' pick':'')+'"'+(byWord?' data-run="word"':'')+' width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="group" aria-label="Share of '+of+' by part, '+Y[i0]+' and '+Y[iN]+'">'+
      '<text class="yr" x="'+x0+'" y="16" text-anchor="middle" font-size="'+fs+'">'+Y[i0]+'</text><text class="yr" x="'+x1+'" y="16" text-anchor="middle" font-size="'+fs+'">'+Y[iN]+'</text>'+
      '<line class="ax" x1="'+x0+'" x2="'+x0+'" y1="'+(top-10)+'" y2="'+(top+plotH)+'"/><line class="ax" x1="'+x1+'" x2="'+x1+'" y1="'+(top-10)+'" y2="'+(top+plotH)+'"/>'+
      SL.map(function(s,k){ var ya=yv(s.a).toFixed(1), yb=yv(s.b).toFixed(1);
        return '<g data-mx="'+k+'" class="'+(k===on?'on':'')+'" tabindex="0" role="button" aria-expanded="'+(k===on)+'" aria-label="'+esc(s.label)+': '+p1(s.a)+' in '+Y[i0]+', '+p1(s.b)+' in '+Y[iN]+'">'+
          '<line x1="'+x0+'" y1="'+ya+'" x2="'+x1+'" y2="'+yb+'" stroke="transparent" stroke-width="24"/>'+
          '<line class="ln" x1="'+x0+'" y1="'+ya+'" x2="'+x1+'" y2="'+yb+'" stroke="var('+col+')"/>'+
          '<circle cx="'+x0+'" cy="'+ya+'" r="4.5" fill="var('+col+')" stroke="var(--card)" stroke-width="2"/><circle cx="'+x1+'" cy="'+yb+'" r="4.5" fill="var('+col+')" stroke="var(--card)" stroke-width="2"/>'+
          lab[k].join('')+'</g>'; }).join('')+'</svg>';
    host.innerHTML=svg; host._w=host.clientWidth;
  }
  /* the panels: a figure at each end (the start at the part's first non-zero year), the break named under its dashed line */
  /* a panel's headline: the latest figure and its change since the first filing - from a base under $1,000 or under 1% of the
     latest, the starting figure itself (a % of almost nothing reads as noise, review P2-7); nothing filed in the latest year names
     the last filing instead of '$0 -100%' (P3-11) */
  function head(p,f){
    var mu='<span style="color:var(--muted)">', k=-1; for(var i=iN;i>=0;i--) if(p.z[i]>0){ k=i; break; }
    if(!(p.z[iN]>0)) return k>=0 ? 'Nothing filed in '+Y[iN]+' '+mu+'last '+M0(p.z[k])+' in '+Y[k]+'</span>' : 'Nothing filed';
    if(f<0||f===iN) return M0(p.z[iN])+(f===iN?' '+mu+'first filed in '+Y[iN]+'</span>':'');
    if(p.z[f]<1000||p.z[f]<p.z[iN]*0.01) return M0(p.z[iN])+' '+mu+'from '+M0(p.z[f])+' in '+Y[f]+'</span>';
    return M0(p.z[iN])+' '+mu+PL.fmtPct((p.z[iN]-p.z[f])/p.z[f]*100,0)+' since '+Y[f]+'</span>';
  }
  function panels(){
    var own=!!S.mxOwn, el=document.getElementById('mxPanels');
    el.innerHTML=live.map(function(p){
      var f=p.z.findIndex(function(v){ return v>0; }), e=n-1; while(e>0&&p.values[e]==null) e--;
      var fx=f>0?f/(n-1)*100:0, bx=bi>0?(bi-.5)/(n-1)*100:-1;
      return '<div class="sm"><div class="n">'+esc(sn(p.label))+'</div>'+
        '<div class="v num">'+head(p,f)+'</div>'+
        '<div class="spw" style="color:var('+col+')">'+E.spark(p.values, own?(Math.max.apply(null,p.z)||1):gmax)+'</div>'+
        '<div class="mx-ax num">'+(f>=0&&f<e?'<span class="a0" style="'+(fx>50?'right:'+(100-fx).toFixed(2)+'%;text-align:right':'left:'+fx.toFixed(2)+'%')+'"><b>'+sM(p.z[f])+'</b>'+Y[f]+'</span>':'')+
          (bx>0?'<span class="ab" style="left:'+bx.toFixed(2)+'%">'+E.brk+': new basis</span>':'')+
          '<span class="a1" style="right:0;text-align:right"><b>'+sM(p.z[e])+'</b>'+Y[e]+'</span></div></div>';
    }).join('');
    /* a break name that would touch an end label shortens to its year, then goes (the note names the line) */
    [].forEach.call(el.querySelectorAll('.mx-ax'),function(ax){
      /* a late first year whose figure would run into the latest's slides left of it (its own year is printed with it) */
      var s0=ax.querySelector('.a0'), s1=ax.querySelector('.a1');
      if(s0&&s1&&s0.getBoundingClientRect().right>s1.getBoundingClientRect().left-8){ s0.style.left='auto'; s0.style.right=(s1.offsetWidth+12)+'px'; s0.style.textAlign='right'; }
      var b=ax.querySelector('.ab'); if(!b) return;
      function hit(){ var r=b.getBoundingClientRect(); return [].some.call(ax.querySelectorAll('.a0,.a1'),function(s){ var q=s.getBoundingClientRect(); return r.left<q.right+6&&q.left<r.right+6; }); }
      if(hit()){ b.textContent=E.brk; if(hit()) b.hidden=true; }
    });
    PL.sparks(live.map(function(p,k){ return {el:el.children[k], values:p.values, max:own?(Math.max.apply(null,p.z)||1):gmax}; }),
      Y, function(v,yr){ return '<b>'+yr+'</b>'+(v==null?'not reported':M0(v)); });
    [].forEach.call(E.body.querySelectorAll('#mxScale button'),function(b){ b.setAttribute('aria-pressed',String((b.getAttribute('data-own')==='1')===own)); });
    document.getElementById('mxNote').textContent=(own
      ? 'Zoom each: every panel fills its own height, so read the shape and the figures, not the heights between panels.'
      : 'Same scale: every panel shares one scale (the largest part sets it, '+M0(gmax)+'), so heights compare across panels.')+
      (bi>0?' The dashed line marks '+E.brk+', when the State changed its reporting basis.':'')+
      ' Dollars as filed, not adjusted for inflation.';
  }
  PL._mixClick=function(e){
    if(!document.getElementById('mxBars')||!E.body.contains(e.target)) return;
    if(e.target.closest('[data-mxx]')){ close(); return; }
    if(e.target.closest('.mx-rd')) return;
    var b=e.target.closest('[data-mxb]'); if(b){ open('b',+b.getAttribute('data-mxb'),b); return; }
    var g=e.target.closest('g[data-mx]'); if(g){ open('s',+g.getAttribute('data-mx'),g); return; }
    var o=e.target.closest('#mxScale button[data-own]'); if(o){ S.mxOwn=o.getAttribute('data-own')==='1'; panels(); }
  };
  if(!E.body._plMix){ E.body._plMix=1;
    E.body.addEventListener('click',function(e){ if(PL._mixClick) PL._mixClick(e); });
    E.body.addEventListener('keydown',function(e){ var g=e.target.closest&&e.target.closest('g[data-mx]');
      if(g&&(e.key==='Enter'||e.key===' ')&&PL._mixClick){ e.preventDefault(); PL._mixClick({target:g}); } });
    window.addEventListener('resize',function(){ var h=document.getElementById('mxSlope'); if(h&&PL._mixSlope&&h.clientWidth!==h._w) PL._mixSlope(); });
  }
  PL._mixSlope=slope;
  slope(); panels();
};})();

})();
;
/* r8 W-02: the month strip is ONE listbox (role=listbox, a column per month as its option, aria-activedescendant): Left/Up and Right/Down
   step a month, Home/End jump, a tap or the pointer picks the nearest column (the chrome's scrubber: a thumb still scrolls the page).
   The readout says the month, its total and its claims; the list under it becomes that month's claims, each one link to its receipt.
   The data is the page's own (#pyM, written by tools/build_payees.py from site-data): no fetch. */
(function(){
  var box=document.getElementById('pyMs'), out=document.getElementById('pyMr'), list=document.getElementById('pyCl'), more=document.getElementById('pyMore'),
      dat=document.getElementById('pyM'); if(!box||!out||!list||!dat) return;
  var D; try{ D=JSON.parse(dat.textContent); }catch(e){ return; }
  var opts=[].slice.call(box.querySelectorAll('[role=option]')), cols=opts.map(function(o){ return o.querySelector('.c'); });
  var cur=+box.getAttribute('data-on'), CAP=+list.getAttribute('data-cap')||8, open=false;
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function money(v){ return (v<0?'-$':'$')+Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
  function row(c){ var w=D.w[c[0]], href='../receipt.html?d='+encodeURIComponent(w[1])+'&po='+encodeURIComponent(c[3])+'&i='+c[4]+'#page='+c[2];
    return '<li><a href="'+esc(href)+'"><span class="d">'+esc(w[0])+'</span><span class="v">'+money(c[1])+'</span><span class="s"'+(D.ar&&D.ar[c[5]]?' title="'+esc("Printed on the warrant as '"+D.ar[c[5]]+"'")+'"':'')+'>'+esc(D.a[c[5]])+
      '</span><span class="p">p.'+c[2]+' of '+w[2]+'&nbsp;&rarr;</span></a></li>'; }
  function paint(i){
    var m=D.m[i], cs=D.c.filter(function(c){ return D.w[c[0]][3]===i; });
    out.innerHTML='<b>'+esc(m[0])+'</b> &middot; '+(m[2]?'<b>'+esc(m[3])+'</b> &middot; '+m[2]+' claim'+(m[2]===1?'':'s'):'no claims this month');
    list.innerHTML=cs.slice(0,open?cs.length:CAP).map(row).join('');
    if(more){ more.hidden=cs.length<=CAP||open; more.textContent='Show all '+cs.length+' claims in '+m[0]; }
  }
  function pick(i,say){ if(i<0||i>=opts.length) return; cur=i;
    opts.forEach(function(o,j){ o.setAttribute('aria-selected',j===i?'true':'false'); cols[j].classList.toggle('on',j===i); });
    box.setAttribute('aria-activedescendant',opts[i].id); open=false; paint(i); }
  box.addEventListener('keydown',function(e){ var k=e.key, n=null;
    if(k==='ArrowRight'||k==='ArrowDown') n=Math.min(opts.length-1,cur+1); else if(k==='ArrowLeft'||k==='ArrowUp') n=Math.max(0,cur-1);
    else if(k==='Home') n=0; else if(k==='End') n=opts.length-1;
    if(n!=null){ e.preventDefault(); pick(n); } });
  function near(x){ var b=0,bd=1e9; cols.forEach(function(el,i){ var r=el.getBoundingClientRect(), d=Math.abs(r.left+r.width/2-x); if(d<bd){ bd=d; b=i; } }); return b; }
  if(window.PL&&PL.scrubber) PL.scrubber(box,{onMove:function(x){ pick(near(x)); }, onLeave:function(){}, onTap:function(x){ pick(near(x)); }});
  else box.addEventListener('click',function(e){ pick(near(e.clientX)); });
  if(more) more.addEventListener('click',function(){ open=true; paint(cur); var a=list.querySelectorAll('a')[CAP]; if(a) a.focus(); });
})();
(function(){
  var b=document.getElementById('pyShare');
  /* r7 F-27: the site's one share helper (the chrome's head runtime defines it on every page: a phone's share sheet or the clipboard,
     and a toast either way), guarded */
  if(b) b.addEventListener('click',function(){ var u=b.getAttribute('data-url');
    if(window.PL&&PL.share) PL.share({url:u,title:document.title}); else if(window.PL&&PL.copyText) PL.copyText(u,'Link copied'); });
  var f=document.getElementById('pyFilter'), rows=[].slice.call(document.querySelectorAll('#pyList .py-row')), n=document.getElementById('pyN');
  if(f) f.addEventListener('input',function(){ var q=f.value.trim().toLowerCase(), k=0;
    rows.forEach(function(r){ var on=!q||r.getAttribute('data-n').indexOf(q)>=0; r.hidden=!on; if(on) k++; });
    if(n) n.textContent=q?k+' of '+rows.length:''; });
  /* r7 W-01: the site search's 'All N payees matching <q>' opens this page as ?q=<q> - the find box starts with those words */
  if(f){ var q0=''; try{ q0=new URLSearchParams(location.search).get('q')||''; }catch(e){}
    if(q0){ f.value=q0; f.dispatchEvent(new Event('input')); } }
})();
;
