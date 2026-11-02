
(function(){
"use strict";
var PL=window.PL=window.PL||{};
(function(){
/* hl - hover-linking: hover one mark, its kin light up.
   DECLARATIVE. Inside an element carrying data-hgroup="name", every [data-hk="key"] is a mark or a row. A pointer (hover:hover
   screens only) or keyboard focus on one gives every mark with that key .lit; with data-hdim on the group the rest wear .dim
   (data-hdim="<selector>" dims only the marks matching it). The group wears .hl-on and carries data-hover=key while a key is
   held; html[data-hover] carries it too. Touch: a tap on a mark that is not a control and carries data-hk-tap previews it for
   1.6s. PL.hl.on[name] / PL.hl.off[name] are arrays of callbacks - (key, groupEl, sourceEl) / (groupEl) - for what CSS cannot
   draw (a ghost series on a chart, the warrants a payee sits in, a popover). PL.hl.set(groupEl, key) / clear(groupEl) drive it
   from code.
   PROGRAMMATIC. PL.hl.bind(roots, opts) for marks that carry their own attribute and live in several containers. roots = elements
   or selectors; opts = {attr:'data-key', sel:'<member selector, comma-separated parts>', dim:false|true|'<selector>',
   focus:'<selector: only these members respond to focus>', leave:'root'|'member', tap:<ms>, on:fn(key,src), off:fn(),
   enter:fn(member,event)}. leave:'root' (default) holds the key until the pointer leaves every root; leave:'member' lets go as
   soon as it leaves a mark. Returns set(key|null), which lights a key from code (a tap, a selection) whatever the pointer does.
   A pointer parked over nothing never clears a keyboard focus: letting go re-lights the :focus-visible member.
   One group is held at a time (setting a group lets go of the previous one), so two independent keys that must be lit together
   (a year column and a member's card) need their own logic. Without dimming only the previous and the new marks are touched;
   with it (and PL.hl.bind's dim option) every member is visited, so keep dimming groups to a few hundred marks. */
PL.hl=(function(){
  var MQ=window.matchMedia('(hover:hover)'), H=document.documentElement, cur=null, tapT=null, focusAt=0, BOUND=[];
  function q(v){ return String(v).replace(/["\\]/g,'\\$&'); }
  function rootsOf(g){ return g.decl ? [g.el] : g.roots.map(function(r){ return typeof r==='string' ? document.querySelector(r) : r; }).filter(Boolean); }
  function msel(g){ return g.decl ? '[data-hk]' : (g.sel || '['+g.attr+']'); }
  function declOf(el){ return el.__hl || (el.__hl={decl:true, el:el, attr:'data-hk', name:el.getAttribute('data-hgroup'), key:null, litEls:[]}); }
  function dimOf(g){
    if(g.decl){ if(!g.el.hasAttribute('data-hdim')) return false; return g.el.getAttribute('data-hdim') || true; }
    return g.dim || false;
  }
  function members(g){ var o=[]; rootsOf(g).forEach(function(r){ [].push.apply(o, r.querySelectorAll(msel(g))); }); return o; }
  function withKey(g,key){
    var k='['+g.attr+'="'+q(key)+'"]', parts=(g.decl?'[data-hk]':(g.sel||'')), s=parts ? parts.split(',').map(function(p){return p.trim()+k;}).join(',') : k, o=[];
    rootsOf(g).forEach(function(r){ [].push.apply(o, r.querySelectorAll(s)); });
    return o;
  }
  function memberAt(g,t){
    var m=t && t.closest ? t.closest(msel(g)) : null; if(!m) return null;
    if(g.decl) return m.closest('[data-hgroup]')===g.el ? m : null;
    return rootsOf(g).some(function(r){ return r.contains(m); }) ? m : null;
  }
  /* paint: with dimming every member is visited; without it only the previously lit marks and the new ones are touched,
     so a group of thousands of rows costs the same as a group of ten */
  function paint(g,key){
    var d=dimOf(g);
    if(d){
      members(g).forEach(function(m){
        var on=key!=null && m.getAttribute(g.attr)===key, dm=key!=null && !on && (d===true || m.matches(d));
        if(!g.decl && g.mark!==false) m.classList.add('pl-hl');
        m.classList.toggle('lit',on); m.classList.toggle('dim',dm);
      });
      return;
    }
    g.litEls.forEach(function(m){ m.classList.remove('lit'); });
    g.litEls = key==null ? [] : withKey(g,key);
    g.litEls.forEach(function(m){ m.classList.add('lit'); });
  }
  function fire(g,which,key,src){
    if(g.decl){
      ((which==='on'?API.on:API.off)[g.name]||[]).forEach(function(f){ try{ if(which==='on') f(key,g.el,src); else f(g.el); }catch(e){} });
    } else if(g[which]){ try{ if(which==='on') g.on(key,src); else g.off(); }catch(e){} }
  }
  function set(g,key,src){
    if(cur && cur!==g) clear(cur);
    paint(g,key); g.key=key; cur=g;
    if(g.decl){ g.el.classList.add('hl-on'); g.el.setAttribute('data-hover',key); }
    H.setAttribute('data-hover',key);
    fire(g,'on',key,src);
  }
  function clear(g){
    g=g||cur; if(!g) return;
    paint(g,null); g.key=null;
    if(g.decl){ g.el.classList.remove('hl-on'); g.el.removeAttribute('data-hover'); }
    if(cur===g){ cur=null; H.removeAttribute('data-hover'); }
    fire(g,'off');
  }
  /* let go after a pointer leaves - unless a keyboard focus still holds a member of this group */
  function release(g){
    clear(g);
    var a=document.activeElement, fv=false;
    try{ fv = a && a!==document.body && a.matches && a.matches(':focus-visible'); }catch(e){}
    if(!fv) return;
    var m=memberAt(g,a); if(m && (!g.focus || m.matches(g.focus))) set(g,m.getAttribute(g.attr),m);
  }
  function over(g,e){
    if(!MQ.matches || e.pointerType==='touch') return;
    var m=memberAt(g,e.target); if(!m) return;
    if(g.enter) g.enter(m,e);
    var k=m.getAttribute(g.attr); if(g.key!==k) set(g,k,m);
  }
  function out(g,e){
    if(!MQ.matches || e.pointerType==='touch') return;
    var m=memberAt(g,e.target); if(!m) return;
    var to=e.relatedTarget;
    if(to && m.contains(to)) return;
    if(to && memberAt(g,to)) return;      /* moving to a sibling mark: the next pointerover takes over */
    release(g);
  }
  function focusIn(g,e){
    var m=memberAt(g,e.target); if(!m || (g.focus && !m.matches(g.focus))) return;
    set(g,m.getAttribute(g.attr),m); focusAt=performance.now();
  }
  function focusOut(g,e){
    var m=memberAt(g,e.target); if(!m || (g.focus && !m.matches(g.focus))) return;
    if(g.key===m.getAttribute(g.attr)) clear(g);
  }
  /* the tap path: on a touch screen a tap on a non-control mark previews it, then lets go */
  function tap(g,e,ms){
    if(MQ.matches) return;
    var m = g.decl ? (e.target.closest ? e.target.closest('[data-hk][data-hk-tap]') : null) : memberAt(g,e.target);
    if(!m || (g.decl && m.closest('[data-hgroup]')!==g.el)) return;
    if(e.target.closest('a,button')) return;
    clearTimeout(tapT);
    /* a second tap on the same mark lets go - unless this very tap is what focused it (a focusable row:
       focusin already lit it a moment ago), in which case the tap only arms the timer */
    if(g.key===m.getAttribute(g.attr) && performance.now()-focusAt>600){ clear(g); return; }
    set(g,m.getAttribute(g.attr),m);
    tapT=setTimeout(function(){ clear(g); },ms||1600);
  }
  /* declarative groups: delegated from the document, so groups made after load work without a call */
  function declAt(t){ var ge=t && t.closest ? t.closest('[data-hgroup]') : null; return ge ? declOf(ge) : null; }
  document.addEventListener('pointerover',function(e){ var g=declAt(e.target); if(g) over(g,e); });
  document.addEventListener('pointerout',function(e){ var g=declAt(e.target); if(g) out(g,e); });
  document.addEventListener('focusin',function(e){ var g=declAt(e.target); if(g) focusIn(g,e); });
  document.addEventListener('focusout',function(e){ var g=declAt(e.target); if(g) focusOut(g,e); });
  document.addEventListener('click',function(e){ var g=declAt(e.target); if(g) tap(g,e); });
  function bind(roots,o){
    o=o||{};
    var g={decl:false, roots:[].concat(roots), attr:o.attr||'data-key', sel:o.sel||'', dim:o.dim||false, mark:o.mark, focus:o.focus||'',
           on:o.on, off:o.off, enter:o.enter, key:null, litEls:[]};
    g.roots=rootsOf(g);
    g.roots.forEach(function(r){
      if(r.__hlb) return; r.__hlb=1;
      r.addEventListener('pointerover',function(e){ over(g,e); });
      if(o.leave==='member') r.addEventListener('pointerout',function(e){ out(g,e); });
      else r.addEventListener('pointerleave',function(e){ if(e.pointerType==='touch') return; if(MQ.matches) release(g); });
      r.addEventListener('focusin',function(e){ focusIn(g,e); });
      r.addEventListener('focusout',function(e){ focusOut(g,e); });
      if(o.tap) r.addEventListener('click',function(e){ tap(g,e,o.tap); });
    });
    BOUND.push(g);
    return function(key){ if(key==null || key==='') clear(g); else set(g,key); };
  }
  var API={
    set:function(g,key,src){ set(declOf(g),key,src); },
    clear:function(g){ clear(g ? declOf(g) : null); },
    on:{}, off:{}, bind:bind,
    hoverable:function(){ return MQ.matches; }
  };
  return API;
})();})();

(function(){
/* toast - r7 W-08: PL.toast(msg, ms) / PL.copyText(text, msg) / PL.share({url, title, text}) / PL.shareLink(title, url) / PL.dataFail(el, retry)
   are the head runtime's (C.theme_script: _CORE_JS, on every page from its first line). This module is the same code, for a page
   assembled without that head script; it steps aside when the head already defined them. */
/* r7 W-08 (lanes/API.md): the runtime every part of a page may call from its first line - one toast, one copy, one share, one failure
   message - in the head of every page (C.theme_script), so a page's own script can call it whatever order its blocks run in. */
(function(){
var D=document, PL=window.PL=window.PL||{};
if(PL.share) return;
function coarse(){ try{ return matchMedia('(pointer:coarse)').matches; }catch(e){ return false; } }
/* the toast: one status line at the bottom centre. A live region a script has just made is not heard by every screen reader, so the
   first message waits a beat after the region is made; the text is cleared once the toast has faded, so the same words are heard again */
var tt=null, tc=null;
function toastEl(){
  var t=D.getElementById('plToast');
  if(!t){ t=D.createElement('div'); t.className='pl-toast'; t.id='plToast'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite');
    t.setAttribute('data-pl-keep',''); (D.body||D.documentElement).appendChild(t); t._plNew=1; }
  return t;
}
PL.toast=function(msg,ms){
  var t=toastEl(), wait=t._plNew?40:0; t._plNew=0;
  setTimeout(function(){ clearTimeout(tt); clearTimeout(tc); t.textContent=msg; t.classList.add('show');
    tt=setTimeout(function(){ t.classList.remove('show'); tc=setTimeout(function(){ t.textContent=''; },400); },ms||2600); },wait);
};
/* when no way of copying works: the text in a field at the top of the screen, selected, so the reader copies it by hand */
var box=null;
function field(s){
  if(!box){
    box=D.createElement('div'); box.className='pl-cpf'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Copy it from here');
    box.setAttribute('data-pl-keep','');
    box.innerHTML='<input class="pl-cpf-i" readonly aria-label="The text to copy"><button type="button" class="pl-pill pl-cpf-x">Done</button>';
    D.body.appendChild(box);
    box.querySelector('button').addEventListener('click',shut);
    box.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); shut(); } });
  }
  var i=box.querySelector('input');
  if(box.hidden!==false||!box._back) box._back=D.activeElement;
  i.value=s; box.hidden=false; i.focus(); i.select(); try{ i.setSelectionRange(0,s.length); }catch(e){}
}
function shut(){ if(!box) return; box.hidden=true; var b=box._back; box._back=null; if(b&&b.focus&&D.documentElement.contains(b)) b.focus(); }
function linkish(s){ return /^(https?:|mailto:|\.{0,2}\/|[\w.-]+\.html\b)/i.test(s); }
/* PL.copyText(text, msg) -> Promise<true|false>: the clipboard, then the older copy command, then the selected field; a toast every time */
PL.copyText=function(s,msg){
  s=String(s); var lk=linkish(s);
  return new Promise(function(res){
    function ok(){ PL.toast(msg||(lk?'Link copied':'Copied')); res(true); }
    function legacy(){
      var a=D.activeElement, ta=D.createElement('textarea'), did=false;
      ta.value=s; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
      D.body.appendChild(ta); ta.select();
      try{ did=D.execCommand('copy'); }catch(e){}
      D.body.removeChild(ta);
      if(a&&a.focus){ try{ a.focus({preventScroll:true}); }catch(e){} }
      if(did){ ok(); return; }
      field(s);
      PL.toast('Couldn’t copy: '+(lk?'the link':'the text')+' is selected, '+(coarse()?'press and hold it to copy':'copy it with your keyboard'),7000);
      res(false);
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){ try{ navigator.clipboard.writeText(s).then(ok,legacy); }catch(e){ legacy(); } }
    else legacy();
  });
};
/* PL.share({url, title, text}) -> Promise<'shared'|'copied'|'selected'|'cancelled'>: a phone's share sheet, else the link copied. The
   sheet is never offered on a desk (people copy there) nor in an automated browser (no person to pick where it goes); a sheet that
   fails for any reason but the reader's own cancel falls back to the copy, so a press always answers. */
/* r7 R-21: PL.canonURL(u) - the published address (https://jcurry44.github.io/public-ledger/...) of u, or of this page when u is empty, with u's own ?query and #hash: a
   page reached on a local copy, by an alias or from a preview hands on the address a reader can open anywhere. The site root here is the
   masthead's data-root (else read off the page's canonical link); an address outside this site comes back as it was. */
var SITE='https://jcurry44.github.io/public-ledger/';
function siteRoot(){
  var m=D.querySelector('header.pl-mast[data-root]'), here=location.href.split('#')[0].split('?')[0];
  if(m) return new URL(m.getAttribute('data-root')||'./',here);
  var c=D.querySelector('link[rel=canonical]'), h=c&&c.getAttribute('href')||'';
  if(h.indexOf(SITE)!==0) return null;
  var path=h.slice(SITE.length), lp=new URL(here).pathname;
  if(!path) return new URL(lp.replace(/[^\/]*$/,''),here);
  return lp.slice(-path.length)===path?new URL(lp.slice(0,lp.length-path.length),here):null;
}
PL.canonURL=function(u){
  var here=location.href, x;
  try{ x=new URL(u||here,here); }catch(e){ return u||here; }
  if(x.href.indexOf(SITE)===0) return x.href;
  var r=null; try{ r=siteRoot(); }catch(e){ r=null; }
  if(!r||x.protocol!==r.protocol||x.host!==r.host||x.pathname.indexOf(r.pathname)!==0) return x.href;
  var rel=x.pathname.slice(r.pathname.length);
  return SITE+(rel==='index.html'?'':rel)+x.search+x.hash;
};
PL.share=function(o){
  o=o||{};
  var url=PL.canonURL(o.url||location.href), data={title:o.title||D.title,url:url}, sheet=!!navigator.share&&!navigator.webdriver&&coarse();
  if(o.text) data.text=o.text;
  try{ if(sheet&&navigator.canShare&&!navigator.canShare(data)) sheet=false; }catch(e){ sheet=false; }
  function copy(){ return PL.copyText(url,'Link copied').then(function(k){ return k?'copied':'selected'; }); }
  if(!sheet) return copy();
  return navigator.share(data).then(function(){ PL.toast('Shared'); return 'shared'; },
    function(e){ return e&&e.name==='AbortError'?'cancelled':copy(); });
};
PL.shareLink=function(title,url){ return PL.share({title:title,url:url||location.href}); };      /* the r5 name, kept for its callers (PL.share canonicalises) */
/* PL.dataFail(el, retry): the one message for a part that did not load, in place of el's content (a table, a list or a chart keeps its
   box and gets the message just before it). retry = a function that asks again (a promise it returns settles the message); with
   none, Try again reloads the page. The words follow the connection: offline they say so. */
var ON='This part of the page didn’t load: the connection may have dropped.', OFF='You’re offline: this part needs a connection.';
function said(){ return navigator.onLine===false?OFF:ON; }
var KEEP=/^(TABLE|TBODY|THEAD|TFOOT|TR|UL|OL|DL|SELECT|svg|g)$/;
PL.dataFail=function(el,retry,o){
  if(typeof el==='string') el=D.querySelector(el);
  el=el||D.getElementById('main')||D.body; o=o||{};
  var b=D.createElement('div'), p=D.createElement('p'), k=D.createElement('button'), beside=!o.head&&KEEP.test(el.tagName);
  b.className='pl-fail'; b.setAttribute('role','status'); p.className='pl-fail-t'; p.textContent=said();
  k.type='button'; k.className='pl-pill pl-fail-b'; k.textContent='Try again'; b.appendChild(p); b.appendChild(k);
  function reset(){ if(b.isConnected){ k.disabled=false; k.textContent='Try again'; p.textContent=said(); } }
  k.addEventListener('click',function(){
    if(typeof retry!=='function'){ location.reload(); return; }
    k.disabled=true; k.textContent='Trying again…';
    var t=setTimeout(reset,10000), r;
    try{ r=retry(); }catch(e){ clearTimeout(t); reset(); return; }
    if(r&&typeof r.then==='function') r.then(function(){ clearTimeout(t); if(beside&&b.isConnected) b.remove(); },function(){ clearTimeout(t); reset(); });
    else if(beside&&el.childNodes.length){ clearTimeout(t); b.remove(); }
  });
  if(o.head) el.insertBefore(b,el.firstChild);
  else if(beside){ var at=/^(TBODY|THEAD|TFOOT|TR)$/.test(el.tagName)?el.closest('table'):el.tagName==='g'?el.ownerSVGElement:el; at=at||el;
    var x=at.previousElementSibling; if(x&&x.className==='pl-fail') x.remove(); el.innerHTML=''; at.parentNode.insertBefore(b,at); }
  else{ el.innerHTML=''; el.appendChild(b); }
  /* r7 R-07: say it happened (a phone's tabs mark the tab of a part that is not on screen) */
  try{ b.dispatchEvent(new CustomEvent('pl:fail',{bubbles:true})); }catch(e){}
  return b;
};
function reword(){ [].forEach.call(D.querySelectorAll('.pl-fail'),function(b){ var k=b.querySelector('button'), p=b.querySelector('.pl-fail-t');
  if(p&&!(k&&k.disabled)) p.textContent=said(); }); }
addEventListener('online',reword); addEventListener('offline',reword);
/* a page that says nothing still says something: a data script or a script of the page's own that fails to load (data-pl-payload, or
   a file assets/x-*.js the build moved beside the page) gets the message at the head of the part it feeds - its [data-part] or its
   section, else <main> - keeping what the part already shows, unless the page has said so itself by then */
var miss=[], tm=null;
function sweep(){
  tm=null; var list=miss; miss=[];
  if(!list.length||D.querySelector('.pl-fail,[data-pl-retry]')||D.documentElement.hasAttribute('data-pl-failed')) return;
  var main=D.getElementById('main')||D.querySelector('main'), done=[];
  list.forEach(function(s){ var t=(s.closest&&(s.closest('[data-part]')||s.closest('main section')))||main;
    if(!t||done.indexOf(t)>=0) return; done.push(t); place(t); });
}
/* r7 R-06: a sheet open over the page (a record opened from its address) makes the page behind it inert, so the message goes where the reader
   is - the head of the open sheet's scrolling part - and moves to the part it belongs to once the sheet closes */
function layerOpen(){ var a=D.querySelectorAll('[aria-modal=true]'), i, r;
  for(i=0;i<a.length;i++){ r=a[i].getBoundingClientRect(); if(r.width>0&&r.height>0&&getComputedStyle(a[i]).visibility!=='hidden') return a[i]; } return null; }
function place(t){
  var m=layerOpen();
  if(!m||m.contains(t)){ PL.dataFail(t,null,{head:true}); return; }
  var c=[m].concat([].slice.call(m.querySelectorAll('div,section,article'))).filter(function(e){ return /(auto|scroll)/.test(getComputedStyle(e).overflowY); })[0]||m;
  var b=PL.dataFail(c,null,{head:true}), iv=setInterval(function(){
    if(!b.isConnected){ clearInterval(iv); return; }
    if(!b.getClientRects().length){ clearInterval(iv); t.insertBefore(b,t.firstChild); } },400);
}
/* r7 R-06: when a page's file fails to load and it was the shared runtime (the chart helpers, the sheet model), the page's own script, which
   runs next, finds safe stand-ins in its place instead of throwing ('PL.tip is not a function'): a tooltip that never shows, hover-linking
   that links nothing, a figure written without its drift check, a sheet whose history and focus model arrive with the chrome script (the
   stand-in hands every call on to the real PL.layer once it is defined; chrome_script defines it when the runtime did not). Only names
   still missing are filled, and never the number formats (PL.money0, PL.niceStep, PL.axisFmt...): a page that tests for those stops
   cleanly and says so (county, the atlas); the one count in words keeps the runtime's rule. The failure message comes from the sweep below. */
function noop(){}
function stand(){
  if(!PL.tip){ PL.tip=function(){ return {show:noop,move:noop,hide:noop,visible:function(){ return false; }}; }; PL.tip.plStub=1; }
  if(!PL.hl) PL.hl={set:noop,clear:noop,on:{},off:{},bind:function(){ return noop; },plStub:1,
    hoverable:function(){ try{ return matchMedia('(hover:hover)').matches; }catch(e){ return false; } }};
  if(!PL.layer){ PL.layer=function(o){
      o=o||{}; var real=null, L={o:o};
      function R(){ if(!real&&PL.layer&&!PL.layer.plStub) real=PL.layer(o); return real; }
      try{ Object.defineProperty(L,'pushed',{enumerable:true,get:function(){ var r=R(); return r?r.pushed:false; },set:function(v){ var r=R(); if(r) r.pushed=v; }}); }catch(e){}
      ['push','pop','swallow','sub','subBack','modal','unmodal','open','close'].forEach(function(k){ L[k]=function(){ var r=R(); return r?r[k].apply(r,arguments):false; }; });
      (PL._layers=PL._layers||[]).push(L);
      return L; };
    PL.layer.plStub=1; }
  if(!PL.hydrate){ PL.hydrate=function(id,html){ var el=D.getElementById(id); if(el) el.innerHTML=html; }; PL.hydrate.report=noop; }
  if(!PL.jump) PL.jump=function(el,block){ if(el&&el.scrollIntoView) el.scrollIntoView({block:block||'start'}); };
  if(!PL.say) PL.say=noop;
  if(!PL.scrubber) PL.scrubber=noop;
  if(!PL.sparks){ PL.sparks=noop; PL.sparks.axis=PL.sparks.brk=function(){ return ''; }; }
  if(!PL.chartSpot) PL.chartSpot=function(){ return null; };
  if(!PL.refLabel) PL.refLabel=function(o){ return {svg:'',key:(o&&o.text)||''}; };
  if(!PL.trendTab) PL.trendTab=noop;
  if(!PL.fitMin) PL.fitMin=function(){ return 0; };
  if(!PL.refit) PL.refit=function(fn){ try{ fn(); }catch(e){} };
  if(!PL.numword) PL.numword=function(n){      /* the same rule as the runtime's (and C.numword): words for 0-99, digits beyond */
    var O='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' '),
        T='  twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
    n=Math.round(n); if(!(n>=0&&n<100)) return String(n); return n<20?O[n]:T[Math.floor(n/10)]+(n%10?'-'+O[n%10]:''); };
  if(!PL.capword) PL.capword=function(s){ s=String(s); return s.charAt(0).toUpperCase()+s.slice(1); };
}
addEventListener('error',function(e){
  var s=e.target, src=s&&s.tagName==='SCRIPT'?s.getAttribute('src')||'':null;
  if(src===null||!(s.hasAttribute('data-pl-payload')||/(^|\/)assets\/x-[^\/?#]+\.js([?#]|$)/.test(src))) return;
  try{ stand(); }catch(x){}
  miss.push(s);
  if(!tm) tm=setTimeout(sweep,D.readyState==='complete'?600:2500);
},true);
})();})();

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
      +'.sm .sy{position:relative;height:15px;margin-top:5px;font-size:13px;line-height:15px;color:var(--faint)}'
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
      +'.twork{margin:-6px 0 14px;padding:10px 12px;border-radius:10px;background:var(--card);border:1px solid var(--rule-strong);font-size:15px;line-height:1.55;color:var(--ink)}'
      +'.twork p{margin:0}.tlens{margin:0 0 8px}'
      +'.tchips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 16px}'
      +'.tchip{min-height:36px;padding:6px 12px;border-radius:999px;border:1px solid var(--rule-strong);background:transparent;color:var(--ink);font:inherit;font-size:14px;cursor:pointer;font-variant-numeric:tabular-nums}'
      +'.tchip[aria-pressed=true]{background:var(--ink);color:var(--paper);border-color:var(--ink)}'
      +'.tbrk{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);border-radius:10px;padding:9px 12px;font-size:13.5px;margin:0 0 12px}'
      +'.mvt{width:100%;border-collapse:collapse;font-size:14px}'
      +'.mvt th{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:var(--faint);text-align:left;font-weight:600;padding:7px 8px;border-bottom:1px solid var(--rule-strong);white-space:nowrap}'
      +'.mvt td{padding:8px;border-bottom:1px solid var(--rule);vertical-align:middle}.mvt .r{text-align:right;white-space:nowrap}'
      +'.mvt .mc{color:var(--faint);font-size:13px}.mvt .mr{display:none}.mvt .md{font-weight:600}.mvt .mb,.mvt .mbh{width:120px;padding-left:14px}'
      +'.mvt tr[data-acct]{cursor:pointer}.mvt tr[data-acct]:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}'
      +'@media (hover:hover){.mvt tr[data-acct]:hover td{background:var(--accent-soft)}}'
      +'.tdv{position:relative;display:block;width:100%;height:8px;border-radius:4px;background:var(--gridline)}'
      +'.tdv::before{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:var(--ink);opacity:.55}'
      +'.tdv i{position:absolute;top:0;bottom:0;display:block;background:var(--ink)}.tdv i.o{left:50%;border-radius:0 4px 4px 0}'
      +'.tdv i.u{right:50%;border-radius:4px 0 0 4px;background:repeating-linear-gradient(135deg,var(--ink) 0 2px,transparent 2px 4px);box-shadow:inset 0 0 0 1px var(--ink)}'
      +'.tfoot{font-size:14px;line-height:1.5;color:var(--muted);margin:8px 0 0}'
      +'@media (max-width:640px){.mvt,.mvt tbody{display:block;width:100%}.mvt thead{display:none}'
      +'.mvt tr{display:grid;grid-template-columns:1fr auto;gap:3px 12px;padding:10px 2px;border-bottom:1px solid var(--rule)}'
      +'.mvt td{display:block;padding:0;border:0}.mvt td.mn{grid-row:1;grid-column:1;font-weight:600}'
      +'.mvt .mr{display:block;font-weight:400;font-size:13.5px;color:var(--muted);margin-top:2px}'
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
};})();

})();
