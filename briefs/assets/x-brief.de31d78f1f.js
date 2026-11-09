
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
    if(moved.length||gap){ i0=bi; while(i0<iN&&!(V[i0]>0)) i0++; }
  }
  var and=function(a){ return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1]; };
  var why;
  if(i0===c0) why=(bi>0&&c0<bi&&iN>=bi)
      ? 'From '+Y[c0]+', the first filing year: no part was renamed or regrouped across the '+E.brk+' reporting-basis change, so both ends compare.'
      : 'From '+Y[c0]+', the first year anything was filed here.';
  else why='From '+Y[i0]+', the first year on the new reporting basis: '+(moved.length
      ? esc(and(moved))+(moved.length>1?' were':' was')+' first filed under '+(moved.length>1?'those names':'that name')+' then'
      : 'before it the parts do not add up to the category')+', so an earlier start would draw a relabelling, not a shift.';
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
  function close(restore){
    var o=S.mxOpen; if(!o) return; S.mxOpen=null;
    if(o.el&&o.el.isConnected) o.el.remove();
    if(o.btn) o.btn.setAttribute('aria-expanded','false');
    var svg=document.querySelector('#mxSlope svg'); if(svg){ svg.classList.remove('pick'); [].forEach.call(svg.querySelectorAll('g.on'),function(g){ g.classList.remove('on'); g.setAttribute('aria-expanded','false'); }); }
    if(restore!==false&&o.top!=null) scr.scrollTop=o.top;
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
