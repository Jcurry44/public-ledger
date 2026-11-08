
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
        '<span class="t"><span class="nm">'+esc(p.label)+'</span><span class="fg">'+sM(p.z[iN])+' <span>&middot; '+pc(s)+'</span></span></span>'+
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
    EL.forEach(function(q){ words(q.label).forEach(function(w){ lw0=Math.max(lw0,tw(w.t)); }); });
    /* a word longer than the column first tries the 12px size and the 8px gutter (the floor's own size), then the run gives way */
    if(lw0>Lw&&fs>12){ fs=12; G=8; cache={}; lw0=0; Lw=Math.min(190,Math.floor((W*0.6-2*G)/2));
      EL.forEach(function(q){ words(q.label).forEach(function(w){ lw0=Math.max(lw0,tw(w.t)); }); }); }
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
      var bl=L.map(function(s,k){ var v=side?s.b:s.a, ln=compact?['']:wrap(s.label,pc(v)); return {k:k, py:yv(v), L:ln, v:v, h:ln.length*lh}; })
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
      return '<div class="sm"><div class="n">'+esc(p.label)+'</div>'+
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
    /* v3 (Mix review P1-3): the inner disclosures are a stack - a readout, then a line's history inside it - each with its own
       entry, so Back closes the innermost and the one beneath keeps its entry */
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
      /* the same disclosure, or one that replaced the top one (another line's history in its place): re-use that entry */
      if(t&&(t.el===el||!t.el.isConnected)){ t.el=el; t.close=close; return; }
      try{ history.pushState({plLayer:1},'',location.href); }catch(e){ return; }
      subs.push({el:el, close:close, k:(history.state||{}).plk});
      if(subObs||!window.MutationObserver) return;
      subObs=new MutationObserver(function(){
        if(!subs.length||subs[subs.length-1].el.isConnected) return;
        /* gone another way (tapped shut, its readout closed around it): pop their entries - only while the reader is still on the
           top one, in an open layer */
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
    /* v3 (Mix review P2-4): Escape - and the phone's Done pill, which presses it - closes the innermost open disclosure first, by
       stepping Back over its entry (so the history stays one entry per open thing); the sheet's own Escape runs only when none is open */
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
  /* VISUALS (2026-11-02): a fragment link on this page records the spot it leaves too, before anything moves (window capture runs ahead
     of the parts' own handler): a reader who never scrolled had no record, so Back stayed wherever the fragment had scrolled to */
  window.addEventListener('click',function(e){
    if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    var a=e.target&&e.target.closest?e.target.closest('a[href*="#"]'):null; if(!a) return;
    var u; try{ u=new URL(a.href,location.href); }catch(x){ return; }
    if(u.origin===location.origin&&u.pathname===location.pathname&&u.search===location.search&&u.hash&&u.hash!==location.hash) save();
  },true);

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
          PL._subEsc=0;
          t.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}));
          if(PL._subEsc) return;              /* v3: it closed the innermost disclosure; the sheet stays */
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
