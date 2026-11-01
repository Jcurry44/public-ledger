
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

})();
