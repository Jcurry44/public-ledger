
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
var sub=null, subObs=null;
function subOff(){ sub=null; if(subObs){ subObs.disconnect(); subObs=null; } }
L.pop=function(){
var n=(L.pushed?1:0)+(sub?1:0); subOff();
if(!n) return false;
L.pushed=false; skip=true; clearTimeout(skipT); skipT=setTimeout(function(){ skip=false; },600);
try{ history.go(-n); return true; }catch(e){ skip=false; return false; }
};
L.swallow=function(){ if(!skip) return false; skip=false; clearTimeout(skipT); return true; };
L.sub=function(el,close){
if(sub){ sub.el=el; sub.close=close; return; }
try{ history.pushState({plLayer:1},'',location.href); }catch(e){ return; }
sub={el:el, close:close, k:(history.state||{}).plk};
if(!window.MutationObserver) return;
subObs=new MutationObserver(function(){
if(!sub||sub.el.isConnected) return;
var mine=(history.state||{}).plk===sub.k, open=!o.isOpen||o.isOpen(); subOff();
if(!mine||!open) return;
skip=true; clearTimeout(skipT); skipT=setTimeout(function(){ skip=false; },600);
try{ history.back(); }catch(e){ skip=false; }
});
subObs.observe(document.body,{childList:true,subtree:true});
};
L.subBack=function(){ if(!sub) return false; var c=sub.close; subOff(); if(c) c(); return true; };
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
t.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}));
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

(function(){
  var D=document, PL=window.PL||{};
  /* Share: the page's own address (PL.share hands on the published one, PL.canonURL) */
  D.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-share]'); if(!b) return;
    var u=location.href.split('#')[0].split('?')[0], t=D.title.split(' | ')[0];
    if(PL.share) PL.share({url:u,title:t}); else if(PL.copyText) PL.copyText(u,'Link copied');
  });
  /* 'Read the whole text': without script it opens the record's quick view; with it, the meeting's text shard fills the box here */
  var a=D.getElementById('txMore'), box=D.getElementById('rtx');
  if(a&&box){
    var b=D.createElement('button'); b.type='button'; b.className=a.className; b.id='txMore'; b.textContent=a.textContent;
    b.setAttribute('aria-expanded','false'); b.setAttribute('aria-controls','rtx');
    var day=a.getAttribute('data-tx'), v=a.getAttribute('data-txv'), id=location.pathname.split('/').pop().replace(/\.html$/,''), short=box.innerHTML, whole=null, mk=box.querySelector('.rtx-cut'), mkH=mk?'<span class="rtx-end"></span>'+mk.outerHTML:'';
    a.parentNode.replaceChild(b,a);
    function show(){ box.textContent=whole.replace(/  /g,'   '); box.insertAdjacentHTML('beforeend',mkH); b.textContent='Show less'; b.setAttribute('aria-expanded','true'); box.focus({preventScroll:true}); }
    function load(){
      var k='R-tx-'+day, P=window.PLD=window.PLD||{};
      if(P[k]){ whole=P[k][id]||null; if(whole) show(); return; }
      b.setAttribute('aria-busy','true');
      var s=D.createElement('script'); s.src='../data/decisions/tx-'+day+'.js'+(v?'?v='+v:'');
      s.onload=function(){ b.removeAttribute('aria-busy'); whole=(P[k]||{})[id]||null; if(whole) show(); };
      s.onerror=function(){ b.removeAttribute('aria-busy'); s.remove();
        var slot=D.createElement('div'); box.parentNode.insertBefore(slot,box.nextSibling);
        if(PL.dataFail) PL.dataFail(slot,function(){ slot.remove(); load(); }); };
      D.head.appendChild(s);
    }
    b.addEventListener('click',function(){
      if(b.getAttribute('aria-expanded')==='true'){ box.innerHTML=short; b.textContent='Read the whole text'; b.setAttribute('aria-expanded','false'); return; }
      if(whole) show(); else load();
    });
  }
  /* the minutes picture that does not arrive says so where it would be */
  D.addEventListener('error',function(e){
    var im=e.target; if(!im||im.tagName!=='IMG'||!im.closest||!im.closest('.vpic')) return;
    var pic=im.closest('.vpic'), keep=pic.innerHTML;
    if(PL.dataFail) PL.dataFail(pic,function(){ pic.innerHTML=keep; });
  },true);
})();
