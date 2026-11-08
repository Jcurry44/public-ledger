
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
/* r10 F-02: PL.focusTo(el, {scroll}) - a ROUTE moved the reader (a tab, a door, a stat that opens a view): keyboard focus and a screen reader go to
   the destination's heading (el if it is one, else the first shown heading inside el, else el). tabindex=-1, no ring, no dialog semantics. A real
   sheet is PL.layer's L.modal, not this. */
PL.focusTo=function(el,o){
  o=o||{}; if(typeof el==='string') el=D.querySelector(el); if(!el) return null;
  var H='h1,h2,h3,h4,h5,h6,[role=heading]', t=el.matches&&el.matches(H)?el:[].filter.call(el.querySelectorAll(H),function(h){ return h.getClientRects().length; })[0]||el;
  if(!t.hasAttribute('tabindex')) t.setAttribute('tabindex','-1');
  t.focus({preventScroll:true});
  if(o.scroll){ var r=D.querySelector('.rail'), h=r&&getComputedStyle(r).position==='sticky'?r.offsetHeight:0;
    window.scrollTo({top:Math.max(0,t.getBoundingClientRect().top+window.scrollY-h-12),behavior:'instant'}); }
  return t;
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
/* r8 W-10: one honest failure for every fetch a page makes. PL.loadJSON(url, part, retry) -> a Promise of the parsed JSON. Any failure (no
   connection, a 404, a file that is not JSON, a page opened from disk) puts the one 'didn't load' box with Try again in `part` (an element or
   a selector; omit it and saying so is the caller's) and rejects, so the caller stops. Try again runs retry() (the caller's own re-load,
   which may call PL.loadJSON again) or, with no retry, loads the same file into the same part and then reloads the page's state by reload. */
PL.loadJSON=function(url,part,retry){
  function go(){ if(location.protocol==='file:') return Promise.reject(new Error(url));
    return fetch(url).then(function(r){ if(!r.ok) throw new Error(url+' '+r.status); return r.json(); }); }
  return go().catch(function(e){ if(part) PL.dataFail(part,typeof retry==='function'?retry:null); throw e; });
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
  if(!PL.mixTab) PL.mixTab=noop;
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

})();
