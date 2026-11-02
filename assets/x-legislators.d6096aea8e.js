
(function(){
"use strict";
var PL=window.PL=window.PL||{};
(function(){
/* layer - the one SHEET MODEL: Back closes the sheet, the page behind it is inert, Tab stays inside it, it is aria-modal on a phone.
   var L=PL.layer({hide:function(fromPop){...}, isOpen:function(){...}, auto:true});
     L.push(url)   a layer just opened: push ONE history entry (url optional) unless it already holds one; true if it pushed
     L.pushed      true while this layer holds an entry (a page whose own URL sync pushed it sets L.pushed=true)
     L.pop()       a reader closed it (button, Esc, backdrop, swipe): pop the entry it pushed, once; false if there was none
                   (a sheet opened straight from a link has no entry and only hides)
     L.swallow()   true once, right after a pop: the popstate the pop caused is the page's to ignore
     L.sub(el, close)  an inner disclosure opened inside the layer (a line's history under its row): ONE more entry on top of
                   the layer's own, so Back runs close() and the layer stays (Fable r8); a disclosure that replaces it re-uses
                   the entry. When el leaves the page another way (tapped shut, its table redrawn) that entry is popped, and
                   L.pop() takes it along with the layer's own.
     L.subBack()   true once, on the popstate that was that Back, after close() ran (an auto layer asks it itself; a page
                   with its own popstate asks it right after L.swallow())
   With auto (the default) the module also listens for popstate: Back while the layer is open calls hide(true) and never leaves
   the page; the popstate a pop() caused is swallowed (then o.landed(), if given). A page that applies state on popstate itself passes auto:false and
   asks L.swallow() first.
   The MODAL half (a sheet is a dialog, not a panel that happens to sit on top):
     L.modal(el, {phoneOnly, label, role, focus, opener})   engage: every sibling of el's ancestor chain gets the inert attribute
                   (a sibling marked data-pl-keep, or an aria-live region, is left alone - the toast, the scrim), el gets
                   role=dialog + aria-modal=true (+ aria-label=label when it has none), Tab / Shift+Tab wrap inside it, and focus
                   moves to `focus` (selector or element; default the first focusable). phoneOnly:true engages only at <=640px
                   (a desktop dropdown is not a modal). One modal at a time; true if engaged.
     L.unmodal({focus:false})   release it: inert, role, aria-modal and the Tab trap come off, focus returns to `opener` (or
                   whatever had focus when it engaged) unless focus:false.
     L.open(el, {url, ...modal opts}) = push + modal;  L.close(fromPop) = unmodal + pop (nothing popped when fromPop). */
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
    if(PL.ret&&PL.ret.paint) PL.ret.paint();      /* PL-21: the Done pill follows the modal (a sheet with its own footer hides it) */
    return true;
  }
  PL._layers=PL._layers||[];
  PL.layer=function(o){
    o=o||{};
    var L={o:o}, skip=false, skipT=null, pushed=false;
    /* exit and return: the runtime watches every layer, so a phone gets its Done button and the return chip steps aside */
    Object.defineProperty(L,'pushed',{enumerable:true,get:function(){ return pushed; },set:function(v){ pushed=!!v; if(PL.ret&&PL.ret.paint) PL.ret.paint(); }});
    PL._layers.push(L);
    L.push=function(url){
      if(L.pushed) return false;
      /* reloaded, or came Back, INTO this sheet's own entry (the page re-opens it from what it saved): re-use that entry */
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
        /* gone another way: pop its entry - only while the reader is still on it, in an open layer */
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
      if(PL.ret&&PL.ret.paint) PL.ret.paint();      /* PL-21: repaint the exit runtime now this sheet is the modal */
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
/* ret - EXIT AND RETURN (Joe, 2026-10-07): "when you interact with something there needs to be an extremely easy way to exit and
   get back exactly to where you just were." Every page, no wiring:
     - each history entry keeps a key (plk), its depth on this page (pld) and the page the reader hopped in from (plf) in
       history.state; pushState / replaceState are wrapped, so a page's own URL sync keeps them (a page's own state rides along);
     - the entry's scroll, its folds (<details>) and whatever the page adds with PL.ret.keep(fn) are saved as the reader scrolls,
       on every in-site hop and on pagehide (sessionStorage), and put back when the reader comes Back or reloads - held while late
       content fills in, until the reader moves or 4 s pass. PL.ret.saved is that record ({y, s}) for a page with more to re-apply
       (decisions' "Show more"); PL.ret.restoring says one is in flight (a page skips its own landing scroll then);
     - a JUMP (a control that moves the page a screen or more - "See all N bills", a pager, "N mention a dollar figure") gets its
       own history entry, so Back returns to the spot it left, plus a "Back to where you were" chip;
     - after an in-site hop a "<- Back to <page>" chip returns to the exact entry the reader left (history.go when that entry sits
       right behind this page, else a navigation that restores the same saved record);
     - on a phone every open layer gets a Done button in thumb reach (it presses Escape - the close every sheet honours - and
       steps Back if the sheet is still open).
   PL.ret.label(fn) names this page on the next page's chip (default: the <title> up to its first ' - ' or ' | '). */
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
  /* r8 integrate: a push that names the spot it left (plj - a press held while the page's code loaded, the city front) files that spot */
  H.pushState=function(s,t,u){ var c=cur(); save(s&&typeof s==='object'&&s.plj!=null?s.plj:null); var r=rawPush.call(H,merge(s,{plk:newKey(),pld:(c.pld||0)+1,plf:c.plf,plb:c.plb}),t,u); last=cur(); paint(); return r; };
  var nav=''; try{ var ne=performance.getEntriesByType('navigation')[0]; nav=ne?ne.type:''; }catch(e){}
  /* the page restores its own scroll: the browser's restore lands before grown lists and late rows exist, and is clamped short */
  try{ if('scrollRestoration' in H) H.scrollRestoration='manual'; }catch(e){}

  /* ---- this entry's identity: Back and reload keep it; a fresh arrival takes a new one, plus the page it hopped in from */
  var st=cur(), go=load('go'), hop=load('hop'), adopted=false;
  store('go',null); store('hop',null);
  if(!st.plk){
    var ref=(document.referrer||'').split('#')[0];
    if(go&&Date.now()-go.t<15000&&go.u===location.href){ var g0=load('s:'+go.k); st=merge(st,{plk:go.k,pld:0,plf:g0&&g0.f}); adopted=true; }
    else{
      st=merge(st,{plk:newKey(),pld:0});
      if(hop&&Date.now()-hop.t<60000&&hop.u!==location.href&&(!ref||hop.u.split('#')[0]===ref)){
        st.plf={u:hop.u,k:hop.k,l:hop.l};
        st.plb=H.length>1?1:0;          /* a new tab has nothing behind it: its chip navigates instead of stepping back */
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

  /* ---- restore: hold the saved spot while the page fills in */
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

  /* ---- Back / Forward inside the page: an entry this script never wrote (a fragment link) gets a key, one deeper */
  function arrive(){
    var s=cur();
    if(!s.plk){ var p=last||{}; s=merge(s,{plk:newKey(),pld:(p.pld||0)+1,plf:p.plf,plb:p.plb}); rawReplace.call(H,s,'',location.href); }
    last=s; return s;
  }
  window.addEventListener('popstate',function(){
    var s=arrive(), v=load('s:'+s.plk), n=0;
    /* after the page's own handler (and never under an open layer: the page behind a sheet did not move) */
    if(v&&v.p===location.pathname) requestAnimationFrame(function again(){
      if(anyOpen()) return;
      if(Math.abs(window.scrollY-v.y)>1) window.scrollTo({top:v.y,behavior:'instant'});
      if(++n<8) requestAnimationFrame(again);
    });
    paint();
  });
  window.addEventListener('hashchange',function(){ arrive(); paint(); });

  /* ---- hops: any in-site link records the exact spot it left */
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

  /* ---- jumps: a control that moves the page a screen or more gets an entry of its own */
  var input=0, jumpT=null;
  ['wheel','touchmove','keydown'].forEach(function(ev){ window.addEventListener(ev,function(e){ if(ev!=='keydown'||/^(Arrow|Page|Home|End| )/.test(e.key)) input=Date.now(); },{capture:true,passive:true}); });
  document.addEventListener('click',function(e){
    if(!e.isTrusted||settling||anyOpen()) return;          /* a script's own click (a restore re-opening a card) is no jump */
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
          store('s:'+s.plk,record(y0));          /* the entry it leaves remembers the spot BEFORE the jump */
          rawPush.call(H,{plk:newKey(),pld:(s.pld||0)+1,plf:s.plf,plb:s.plb,plj:Math.round(y0)},'',location.href);
          last=cur(); save(); paint();
        }
      }
    },100);
  },true);

  /* ---- the chip */
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
    /* a view change (the city page's parts, PLV) is a drill-in wherever it lands: its chip shows for as long as the reader is on it */
    var s=cur(), f=s.plf, pv=!!s.plview&&s.plj!=null, j=pv||(s.plj!=null&&Math.abs(window.scrollY-s.plj)>window.innerHeight*0.5);
    if(!chip){
      if(!f&&!j) return;
      chip=document.createElement('button'); chip.type='button'; chip.className='pl-ret-chip'; chip.setAttribute('data-pl-keep','');
      chip.addEventListener('click',back);
      /* PL-24: the pill's own band at the foot of the screen, and the same room at the end of the page */
      band=document.createElement('div'); band.className='pl-ret-band'; band.setAttribute('aria-hidden','true'); band.setAttribute('data-pl-keep','');
      room=document.createElement('div'); room.className='pl-ret-room'; room.setAttribute('aria-hidden','true'); room.setAttribute('data-pl-keep','');
      document.body.appendChild(room); document.body.appendChild(band); document.body.appendChild(chip);
    }
    if(pv){ chip.textContent='← Back to where you were'; chip.setAttribute('aria-label','Back to where you were on this page'); }
    else if(j){ chip.textContent=(s.plj<window.scrollY?'↑':'↓')+' Back to where you were'; chip.setAttribute('aria-label','Back to where you were on this page'); }
    else if(f){ chip.textContent='← Back to '+f.l; chip.setAttribute('aria-label','Back to '+f.l+', where you were'); }
    /* r4 F-06: a change of part on a page whose own strip carries the way back (a.rhome) needs no second control */
    chip.hidden=(!f&&!j)||anyOpen()||(pv&&!!document.querySelector('.rail a.rhome'));
    if(band){ band.hidden=chip.hidden; room.hidden=chip.hidden; }
    if(!away0){ away0=1; awayWatch(); }
    /* a NEW way back (a fresh jump, an in-site hop, Back to another entry) starts in view; a repaint after a scroll pause does not */
    var ak=(s.plk||'')+'|'+(s.plj!=null?s.plj:'')+'|'+(f?f.u:'');
    if(ak!==awayKey){ awayKey=ak; away(false); }
    if(!chip.hidden){ var lf=lift(); chip.style.bottom='calc('+lf+'px + env(safe-area-inset-bottom))'; if(band) band.style.bottom=Math.max(0,lf-16)+'px'; }
  }
  /* r3 PL-05 (2026-10-31): the pill never parks over the page. Scrolling down (reading on) slides it and its band away; a deliberate
     scroll up (60px from the lowest point), the top of the page, the end of the page (the room keeps the last rows clear of it) or
     keyboard focus brings it back - one tap back is always one scroll-up away, and nothing under it is covered while the reader reads. */
  var away0=0, awayOn=false;
  function away(on){
    if(on===awayOn||!chip) return; awayOn=on;
    chip.classList.toggle('pl-away',on); if(band) band.classList.toggle('pl-away',on);
  }
  var awayKey=null;
  function awayWatch(){
    var lastY=window.scrollY||0, low=lastY, q=false, input=0;
    /* the reader's own scrolling only: a page's landing scroll after a jump (the moment the pill matters most) never sends it away */
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
  /* clear of whatever the page pins to the bottom of a phone (the front page's section pager): the chip rides above it */
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

  /* ---- Done: a phone sheet's close in thumb reach */
  var done=null, padded=null;
  /* r7: the OPEN layer - a page keeps its closed sheets in its markup with aria-modal set (the register's line sheet), and the first
     [aria-modal=true] in the document was that hidden one: the pill's room went to it and the menu's last row sat under the pill. The
     first one shown on screen, else the first one shown at all (a sheet still rising from below the fold) */
  function openLayer(sel){ var a=document.querySelectorAll(sel||'[aria-modal=true]'), i, r, best=null;
    for(i=0;i<a.length;i++){ r=a[i].getBoundingClientRect();
      if(!(r.width>0&&r.height>0)||getComputedStyle(a[i]).visibility==='hidden') continue;
      if(r.bottom>0&&r.top<window.innerHeight) return a[i];
      best=best||a[i]; }
    return best; }
  /* r5 F-19: the pill floats over the sheet's last lines, so the open layer's scroller (the layer itself, or its first descendant that
     scrolls) gets the pill's height as extra bottom padding while the pill shows - the last line scrolls clear of it */
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
    padded.style.scrollPaddingBottom='calc(72px + env(safe-area-inset-bottom))';      /* r6 F-26: a focused item scrolls clear of the pill too */
  }
  function paintDone(){
    /* PL-21 (UX audit 2026-10-31): a sheet that owns its footer (data-pl-foot: its own apply/close buttons at the bottom) is closed
       from that footer - the pill would sit on its primary button ('Show 586 resolutions' read 'Show 5' and a tap hit Done) */
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
  /* ---- under the toolbars: iPhone Safari (iOS 26) runs the PAGE on under its floating toolbar and the status bar but paints no
     FIXED content there - not a sheet, its box-shadow, nor a pseudo-element hung below it - so under an open sheet the live page
     showed through (Joe, 10-28). Two plain document blocks (document content IS painted there) track the fixed viewport's top
     and bottom edges while a phone layer is open, each painted like what the layer shows at that edge: the sheet at the
     bottom, the scrim at the top. Off screen everywhere else, and capped at the page's end so they never add scroll. */
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
      var off=d.getBoundingClientRect().top+y-p[1]; if(Math.abs(off)>.5) d.style.top=(p[1]-off)+'px';   /* a positioned body */
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
    queueUnder(); [90,320,700].forEach(function(t){ setTimeout(queueUnder,t); });   /* the sheet is still rising */
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
    /* PL-24: the pill's band (76px = 16 + the 44px pill + 16) and the matching room at the end of the page */
    +'.pl-ret-band{position:fixed;left:0;right:0;bottom:0;z-index:2147482999;height:calc(76px + env(safe-area-inset-bottom));'
    +'background:var(--paper,#fbf8f1);border-top:1px solid var(--rule,rgba(0,0,0,.12));box-shadow:0 -10px 24px -18px rgba(20,18,10,.45)}'
    +'.pl-ret-room{height:calc(76px + env(safe-area-inset-bottom))}.pl-ret-band[hidden],.pl-ret-room[hidden]{display:none}'
    /* r3 PL-05: away while the reader scrolls on (a slide, none under reduced motion); keyboard focus always brings it back */
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
    /* a sheet opened by an address (a shared link) pushes no history entry, so nothing repainted: watch the page's sheet
       open and close instead, so Done and the toolbar cover come with it (Fable r7) */
    var mo=document.getElementById('modal');
    if(mo&&window.MutationObserver) new MutationObserver(function(){ paint(); }).observe(mo,{attributes:true,attributeFilter:['hidden']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else setTimeout(boot,0);

  PL.ret={
    saved:saved, restoring:!!saved, back:back, paint:paint,
    keep:function(fn){ keepFn=fn; },
    label:function(fn){ labelFn=fn; },
    adopt:!!(saved&&st.plLayer)          /* reloaded / came Back INTO a sheet's entry: the page's first push re-uses it */
  };
})();})();

})();
