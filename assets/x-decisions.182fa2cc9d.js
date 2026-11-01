
(function(){
"use strict";
var PL=window.PL=window.PL||{};
(function(){
/* fmt - one number vocabulary for every chart (see tools/_chrome.py) */
PL.MINUS='−';
PL.money0=function(n){return (n<0?'−$':'$')+Math.round(Math.abs(n)).toLocaleString('en-US');};
PL.fmtSigned=function(v,f){f=f||PL.money0;return (v<0?PL.MINUS:'+')+f(Math.abs(v));};
PL.fmtPct=function(v,d){return (v<0?PL.MINUS:'+')+Math.abs(v).toFixed(d==null?1:d)+'%';};
PL.niceStep=function(maxV,target){
  if(!(maxV>0)) return 1;
  var raw=maxV/(target||4), pw=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), m=raw/pw;
  return (m<1.5?1:m<3.5?2:m<7.5?5:10)*pw;
};
/* the top tick picks the unit for the whole axis (M once it reaches $1M, K below), the step picks the decimals:
   a $500K step under a $2M top prints $0.5M . $1.0M . $1.5M . $2.0M */
PL.axisFmt=function(step,top){
  top=top||step*4;
  if(top>=1e6){var d=((step/1e6)%1)?1:0;return function(v){return v===0?'$0':'$'+(v/1e6).toFixed(d)+'M';};}
  /* under a $10K top, whole dollars ('$250 ... $1,250': per-resident axes); above, the step picks the decimals, as in M */
  if(top>=1e3){ if(top<1e4) return function(v){return v===0?'$0':'$'+Math.round(v).toLocaleString('en-US');};
    var dk=((step/1e3)%1)?1:0; return function(v){return v===0?'$0':'$'+(v/1e3).toFixed(dk)+'K';}; }
  var dc=step<1?2:0; return function(v){return v===0?'$0':'$'+v.toFixed(dc);};   /* a cents-scale axis ($0.50 ... $2.00) never repeats a label */
};
PL.axisTicks=function(maxV,target){
  var s=PL.niceStep(maxV,target),out=[];
  for(var g=0;g<=maxV*(1+1e-9);g+=s) out.push(Math.round(g*1e6)/1e6);
  return {step:s,ticks:out,fmt:PL.axisFmt(s,out[out.length-1])};
};
/* a lone value in chart furniture: two decimals in billions ($3.26B, never $3261M), one decimal in millions, whole thousands below */
PL.fmtM1=function(v){return v>=9.9995e8?'$'+(v/1e9).toFixed(2)+'B':v>=995000?'$'+(v/1e6).toFixed(1)+'M':'$'+Math.round(v/1e3)+'K';};
/* a count in prose ('the six largest', 'median of the nine') is derived, never typed - words for 0-99, digits beyond */
(function(){
  var ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen',
    'fifteen','sixteen','seventeen','eighteen','nineteen'], TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  PL.numword=function(n){
    n=Math.round(n); if(!(n>=0&&n<100)) return String(n);
    if(n<20) return ONES[n];
    return TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:'');
  };
})();
PL.capword=function(s){return s.charAt(0).toUpperCase()+s.slice(1);};
/* the Trend sentence (Joe + Fable, 10-28): the filed change first, the change in prices beside it - stated, never netted,
   since the two ends can sit on different reporting bases - then the share as a plain fraction ('one dollar in five').
   t = {v0, vN, y0, yN, s0, sN, cpi, of, yL, vL, sL}: the first and latest filed amounts and years, their shares of the total
   (%), the CPI-U annual averages by year (absent = no price clause), what the share is of ('city spending'), the last
   year anything was filed with its amount and share (when the latest is zero), the first and latest per-resident
   amounts (p0, pN; absent = no clause), and drill (figures as buttons). */
PL.trendSentence=function(t){
  if(!(t.v0>0)) return '';
  var r=t.vN/t.v0, pc=(r-1)*100, c0=t.cpi&&t.cpi[t.y0], cN=t.cpi&&t.cpi[t.yC||t.yN];   /* yC: the newest year with prices */
  function fp(s){ return s<0.05?'under 0.1%':s.toFixed(1)+'%'; }
  /* drill: each figure is a button - the change and the prices open their workings, the share and the per-resident
     figures switch the chart to that lens (PL.trendTab) */
  function btn(k,v,txt){ return t.drill?'<button type="button" class="tnum" '+k+'="'+v+'">'+txt+'</button>':txt; }
  /* a category no longer filed says so, never 'Down 100%' */
  if(!t.vN&&t.vL) return '<b>Nothing filed after '+t.yL+'.</b> Its last filing, '+PL.money0(t.vL)+', was '+fp(t.sL)+' of '+t.of+'.';
  /* past four times the first year, a multiple reads better than a percent ('Up 13x', not 'Up 1213%') */
  var chg=Math.round(pc)===0?'About level':r>4?'Up '+(r>=10?Math.round(r):r.toFixed(1))+'&times;':(pc>0?'Up ':'Down ')+Math.abs(pc).toFixed(0)+'%';
  var h='<b>'+btn('data-tw','chg',chg)+' since '+t.y0;
  if(c0&&cN){ var pp=(cN/c0-1)*100; h+='; '+btn('data-tw','cpi','prices '+(pp>=0?'rose ':'fell ')+Math.abs(pp).toFixed(0)+'%'+(t.yC&&t.yC!==t.yN?' to '+t.yC:'')); }
  h+='.</b> ';
  function frac(s){ if(!(s>0)) return 0; var n=Math.round(100/s); return (n>=2&&n<=10&&Math.abs(100/n-s)<=1.5)?n:0; }   /* 'one in nineteen' is not how anyone talks */
  var n0=frac(t.s0), nN=frac(t.sN);
  if(n0&&n0===nN) h+='About '+btn('data-lens','share','one dollar in '+PL.numword(n0))+' of '+t.of+', then and now.';
  else if(n0&&nN) h+='From '+btn('data-lens','share','one dollar in '+PL.numword(n0))+' of '+t.of+' to one in '+PL.numword(nN)+'.';
  else h+='From '+btn('data-lens','share',fp(t.s0))+' of '+t.of+' to '+fp(t.sN)+'.';
  if(t.p0&&t.pN) h+=' '+btn('data-lens','pc','Per resident, '+PL.money0(t.p0)+' in '+t.y0+' and '+PL.money0(t.pN)+' in '+t.yN)+'.';
  return h;
};})();

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
/* tip - the pointer tooltip. var T=PL.tip(); T.show(html,x,y) on hover, T.hide() on leave; it follows the pointer while
   shown and flips to the other side of it at the viewport edge. The node is created on first use. */
PL.tip=function(){
  var el=null, vis=false;
  function node(){
    if(!el){ el=document.createElement('div'); el.className='pl-tip'; el.hidden=true; el.setAttribute('role','presentation'); document.body.appendChild(el); }
    return el;
  }
  function move(x,y){
    var t=node(), r=t.getBoundingClientRect(), L=x+14, T=y+16;
    if(L+r.width>window.innerWidth-8) L=Math.max(8,x-14-r.width);
    if(T+r.height>window.innerHeight-8) T=y-12-r.height;
    t.style.left=L+'px'; t.style.top=T+'px';
  }
  document.addEventListener('pointermove',function(e){ if(vis) move(e.clientX,e.clientY); });
  return {
    show:function(html,x,y){ var t=node(); t.innerHTML=html; t.hidden=false; vis=true; move(x,y); },
    move:move,
    hide:function(){ if(el) el.hidden=true; vis=false; },
    visible:function(){ return vis; }
  };
};})();

(function(){
/* toast - PL.toast(msg, ms) shows a line at the bottom centre; PL.copyText(text, done) copies (clipboard API, then a
   selected textarea, then it names the address so the reader can copy it by hand); PL.shareLink(title, url, {coarse:true})
   opens the native share sheet where there is one (coarse: only on touch screens) and copies otherwise. */
(function(){
  var tt=null;
  PL.toast=function(msg,ms){
    var t=document.getElementById('plToast');
    if(!t){ t=document.createElement('div'); t.className='pl-toast'; t.id='plToast'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); }
    t.textContent=msg; t.classList.add('show');
    clearTimeout(tt); tt=setTimeout(function(){t.classList.remove('show');},ms||2000);
  };
  PL.copyText=function(s,done){
    var ok=function(){PL.toast(done||'Link copied');};
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok,function(){fallback();});
    else fallback();
    function fallback(){
      var ta=document.createElement('textarea'); ta.value=s; ta.setAttribute('readonly','');
      ta.style.cssText='position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select();
      var did=false; try{did=document.execCommand('copy');}catch(e){}
      document.body.removeChild(ta); PL.toast(did?(done||'Link copied'):'Copy this address: '+s,did?2000:4000);
    }
  };
  PL.shareLink=function(title,url,o){
    url=url||location.href;
    if(navigator.share&&(!(o&&o.coarse)||window.matchMedia('(pointer:coarse)').matches)) navigator.share({title:title||document.title,url:url}).catch(function(){});
    else PL.copyText(url);
  };
})();})();

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
  H.pushState=function(s,t,u){ var c=cur(); save(); var r=rawPush.call(H,merge(s,{plk:newKey(),pld:(c.pld||0)+1,plf:c.plf,plb:c.plb}),t,u); last=cur(); paint(); return r; };
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
  function save(){ if(settling) return; var s=cur(); if(s.plk) store('s:'+s.plk,record(window.scrollY)); }
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
  /* r5 F-19: the pill floats over the sheet's last lines, so the open layer's scroller (the layer itself, or its first descendant that
     scrolls) gets the pill's height as extra bottom padding while the pill shows - the last line scrolls clear of it */
  function roomFor(on){
    if(padded&&(!on||!padded.isConnected)){ padded.style.paddingBottom=padded.getAttribute('data-pl-pb')||''; padded.style.scrollPaddingBottom='';
      padded.removeAttribute('data-pl-pb'); padded=null; }
    if(!on||padded) return;
    var m=document.querySelector('[aria-modal=true]'); if(!m) return;
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
    var on=anyOpen(), own=!!document.querySelector('[aria-modal=true][data-pl-foot]'),
        phone=window.matchMedia('(max-width:640px)').matches||(window.matchMedia('(max-width:760px)').matches&&!!document.querySelector('.pl-switch.is-open'));
    if(on&&phone&&!own){
      if(!done){
        done=document.createElement('button'); done.type='button'; done.className='pl-done'; done.textContent='Done'; done.setAttribute('data-pl-keep','');
        done.addEventListener('click',function(){
          var t=document.querySelector('[aria-modal=true]')||document.body;
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
    +'border:1px solid var(--rule-strong,rgba(0,0,0,.2));background:var(--ink,#1c1a15);color:var(--paper,#fbf8f1);font:inherit;font-size:16px;font-weight:600;cursor:pointer;'
    +'box-shadow:0 10px 26px -10px rgba(20,18,10,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    +'.pl-ret-chip{left:16px;bottom:calc(16px + env(safe-area-inset-bottom));max-width:min(80vw,380px);'
    +'background:color-mix(in srgb,var(--card,#fff) 88%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);'
    +'color:var(--ink,#1c1a15);font-size:15px;padding:0 16px;box-shadow:0 8px 24px -8px rgba(0,0,0,.45),inset 0 0 0 .5px rgba(255,255,255,.08)}'
    +'.pl-done{left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));min-width:132px;height:48px;font-size:17px}'
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

(function(){
/* hydrate - the prerender contract. The build paints every first-screen figure into the HTML; PL.hydrate(id, html) re-derives
   it and, the first time it touches an element, checks that the page it was handed already said exactly that (whitespace
   aside). Any disagreement is reported once by PL.hydrate.report(where) as a console error, which fails the page gate, so the
   Python formatting and the script's formatting cannot drift apart silently and a reader on a slow link sees the true value as
   the FIRST value. Spans marked .ph-x are hidden on phones by CSS; textContent does not change, so they compare equal. */
(function(){
  var seen={}, drift=[];
  PL.hydrate=function(id,html){
    var el=document.getElementById(id); if(!el) return;
    if(!seen[id]){
      seen[id]=1;
      var t=document.createElement('span'); t.innerHTML=html;
      var norm=function(s){return String(s||'').replace(/[\s\u00a0]+/g,' ').trim();};
      var had=norm(el.textContent), want=norm(t.textContent);
      if(had!==want) drift.push('#'+id+' page: "'+had+'" / data: "'+want+'"');
    }
    el.innerHTML=html;
  };
  PL.hydrate.report=function(where){
    if(drift.length) console.error('prerender drift ('+drift.length+'): rebuild '+(where||'this page')+' - '+drift.join(' | '));
  };
})();
/* fitMin - the element keeps ONE height across every state: an offscreen clone is laid out with each state's text and the
   tallest wins as the element's min-height, so a control that changes the copy never moves what is below it.
   states = any array; paint(probe, state) writes that state's text into the clone. */
PL.fitMin=function(el,states,paint){
  if(!el) return 0;
  var cs=getComputedStyle(el), base=el.cloneNode(true), probes=[], frag=document.createDocumentFragment(), mx=0;
  base.removeAttribute('id'); base.removeAttribute('style');
  [].forEach.call(base.querySelectorAll('[id]'),function(e){e.removeAttribute('id');});
  var css='position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;min-height:0;height:auto;'+
    'width:'+el.getBoundingClientRect().width+'px;padding:'+cs.padding+';border-width:'+cs.borderWidth;
  /* PL-19: write every state first (detached), insert them together, then read: ONE layout pass, not one per state */
  states.forEach(function(s){ var p=base.cloneNode(true); p.style.cssText=css; paint(p,s); probes.push(p); frag.appendChild(p); });
  el.parentNode.appendChild(frag);
  probes.forEach(function(p){ mx=Math.max(mx,p.getBoundingClientRect().height); });
  probes.forEach(function(p){ p.parentNode.removeChild(p); });
  el.style.minHeight=Math.ceil(mx)+'px';
  return mx;
};
/* refit - run a measuring function now, once the display face has loaded, and (debounced) on resize */
PL.refit=function(fn){
  fn();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fn);
  var t; window.addEventListener('resize',function(){ clearTimeout(t); t=setTimeout(fn,150); });
};})();

(function(){
/* jump - an INSTANT scroll, whatever the stylesheet's scroll-behavior says: a link lands, it does not animate 10,000px.
   Chromium reads the behaviour from the LAST style recalc, so one is forced between setting and restoring it. */
PL.jump=function(el,block){
  var de=document.documentElement, prev=de.style.scrollBehavior;
  de.style.scrollBehavior='auto';
  void getComputedStyle(de).scrollBehavior;
  el.scrollIntoView({block:block||'start',behavior:'auto'});
  de.style.scrollBehavior=prev;
};})();

})();
