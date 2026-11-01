
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

})();
