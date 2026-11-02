
(function(){
"use strict";
var HOVER=window.matchMedia('(hover:hover)').matches;
/* r7 F-13: a part whose data did not arrive (a dropped connection, a blocked file) says so, with a way to try again - never a script error or
   a silent empty box. The chrome's one message (PL.dataFail) when it is there; the same words here when it is not. It runs once the page is
   parsed: the chrome's script comes after this one. */
function dataFail(el,retry){
  if(!el) return;
  function run(){
    if(window.PL&&PL.dataFail){PL.dataFail(el,retry);return;}
    el.innerHTML='<p class="pl-dfail" role="status">'+(navigator.onLine===false?'You&rsquo;re offline: this part needs a connection.':
      'This part of the page didn&rsquo;t load: the connection may have dropped.')+' <button type="button" class="pl-pill">Try again</button></p>';
    el.querySelector('button').addEventListener('click',function(){if(retry)retry();else location.reload();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
}
/* r7 F-13: without the chrome's runtime modules (a blocked file) nothing below can draw - the page's links still work, and the chrome's catch
   of the failed file says so at the head of the page; this script stops here instead of throwing */
if(!window.PL||!PL.hl||!PL.niceStep||!PL.axisFmt) return;
var HOME='city-north-tonawanda';
/* l = the measure's name; f = a card's value in words; m = the same value as the map prints it (short); u = the readout's sentence; sub = what
   'darker' means; cap = what the figures on the map ARE (the divisor and the basis), printed under the map */
function sgn(v){return (v<0?'−':'+')+money(Math.abs(v));}
function gpc(c){var g=c.dataset.growth;return g===''?'—':(+g<0?'−':'+')+Math.abs(+g).toFixed(0)+'%';}
var MEAS={spend:{l:'Spending per resident',f:function(c){return money(+c.dataset.spend);},m:function(c){return money(+c.dataset.spend);},
    u:function(c){return money(+c.dataset.spend)+' per resident';},n:'spending per resident',
    sub:'<span class="w-lt">Darker</span><span class="w-dk">Lighter</span> = more spending per resident, compared within its class (city, town or village)',
    cap:'<b>Spending per resident</b>: each government&rsquo;s latest filed expenditure &divide; its 2020 Census population &mdash; ranked within its class only.'},
  net:{l:'Net per resident',f:function(c){return sgn(+c.dataset.net);},m:function(c){return sgn(+c.dataset.net);},
    u:function(c){return sgn(+c.dataset.net)+' net per resident';},n:'net per resident',
    sub:'<span class="w-lt">Darker</span><span class="w-dk">Lighter</span> = higher net per resident (revenue minus spending), compared within its class (city, town or village)',
    cap:'<b>Net per resident</b>: (revenue &minus; expenditure) in the latest filing &divide; the 2020 Census population &mdash; a single-year gap is not a deficit claim.'},
  growth:{l:'Spending growth since 2013',f:gpc,m:gpc,
    u:function(c){return c.dataset.growth===''?'one filing on this basis':gpc(c)+' since 2013';},n:'spending growth since 2013',
    sub:'<span class="w-lt">Darker</span><span class="w-dk">Lighter</span> = faster spending growth since 2013, compared within its class (city, town or village)',
    cap:'<b>Spending growth since 2013</b>: the latest filed expenditure against the first filing on the current reporting basis, as filed, not per resident.'},
  filing:{l:'Filing completeness',f:function(c){return c.dataset.filed+' of '+c.dataset.span+' years';},m:function(c){return c.dataset.filed+'/'+c.dataset.span;},
    u:function(c){return c.dataset.filed+' of '+c.dataset.span+' years on file';},n:'filing completeness',
    sub:'<span class="w-lt">Darker</span><span class="w-dk">Lighter</span> = more years on file, compared within its class (city, town or village)',
    cap:'<b>Filing completeness</b>: years with a filing in the Comptroller&rsquo;s data, of the years since the government&rsquo;s first.'}};
function money(v){return '$'+Math.round(v).toLocaleString('en-US');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
var cards=[].slice.call(document.querySelectorAll('a.mcard'));
var byKey={};cards.forEach(function(c){byKey[c.dataset.key]=c;});
var shapes=[].slice.call(document.querySelectorAll('.mp,.mk'));
var read=document.getElementById('mread');
var sort='spend', sel=null;
function ordw(n){return n===1?'1st':n===2?'2nd':n===3?'3rd':n+'th';}
function cw(c){return c==='city'?'cities':c==='town'?'towns':'villages';}
/* the readout is ONE ink row: the government's name, what the measure says and its rank in its class, the figure, a chevron to its ledger.
   At rest it shows the home city; a tap, a hover or a focus shows that government - never a scroll. */
function readRow(c){
  var r=+c.getAttribute('data-r-'+sort), n=+c.dataset.ncls;
  return '<a class="pl-row" href="'+esc(c.getAttribute('href'))+'"><span class="pl-row-l">'+esc(c.dataset.name)+'</span>'+
    '<span class="pl-row-s">'+MEAS[sort].u(c)+' &middot; '+ordw(r)+' of '+n+' '+cw(c.dataset.cls)+'</span>'+
    '<span class="pl-row-v">'+MEAS[sort].f(c)+'</span></a>';
}
var shown='';          /* the readout's last words, kept as the string that built them: innerHTML re-serialises (&middot; comes back as a character), so it never equals it,
                          and a readout rewritten with the very same words replaces its link between a tap's touch and its click - the tap on the card was lost */
function tell(key){
  var c=byKey[key||HOME]; if(!c) return;
  var h=readRow(c); if(h===shown) return; shown=h;
  /* PL-07: the readout's link is updated IN PLACE. It is the next tab stop after the last map marker, and a node that is replaced the moment focus
     leaves that marker (off() rewrites the readout on focusout) is gone before Tab lands on it: the keyboard dropped to <body> for one press. */
  var a=read.firstElementChild, t=document.createElement('div'); t.innerHTML=h; var n=t.firstElementChild;
  if(a&&a.tagName==='A'&&n&&a.children.length===n.children.length){
    a.setAttribute('href',n.getAttribute('href'));
    for(var i=0;i<n.children.length;i++) a.children[i].innerHTML=n.children[i].innerHTML;
  } else read.innerHTML=h;
}
/* the pot's rows (F-11): the top six on a phone, every one behind one button */
var potrank=document.getElementById('potrank');
/* r6 F-05: and each long class of the ranked rows, the same way - every 'Show all' names the list it opens (aria-controls) */
[].forEach.call(document.querySelectorAll('.potmore'),function(b){var box=document.getElementById(b.getAttribute('aria-controls'));if(!box)return;
  b.addEventListener('click',function(){var o=box.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');
    b.textContent=b.getAttribute(o?'data-less':'data-more');});});
/* hover-link, both ways (the chrome's PL.hl.bind): every [data-key] in the map, its key, the pot's rows, the list's rows and the card grids
   that shares a key lights together - shapes and badges dim the rest - on hover screens, and on keyboard focus.
   light(null) lets go: the readout falls back to the selected government, or to its resting line. */
var hlSet=PL.hl.bind([document.getElementById('mapwrap'),potrank].concat([].slice.call(document.querySelectorAll('.grid,table.cmpt'))),
  {attr:'data-key',sel:'.mp,.mk,.kk,.ml,tr[data-key],a.mcard,.prow',dim:'.mp,.mk',mark:false,
   on:function(k){tell(k);},off:function(){tell(sel);}});
function light(key){hlSet(key);}
function apply(s,fromUrl){
  sort=s;
  [].forEach.call(document.querySelectorAll('#sortSeg button'),function(b){b.setAttribute('aria-pressed',b.dataset.sort===s?'true':'false');});
  shapes.forEach(function(el){var c=byKey[el.dataset.key];if(c)el.style.setProperty('--p',c.getAttribute('data-p-'+s)+'%');});
  var box=document.getElementById('atlasBox');if(box)box.setAttribute('data-sort',s);      /* F-09: the ramp follows the measure */
  /* the figures ON the map: a town's label carries its value under its name; a badge's value rides in the key; the caption says what the figures are */
  [].forEach.call(document.querySelectorAll('.ml .mlv,.mkey .kv'),function(v){var c=byKey[v.closest('[data-key]').dataset.key];
    var t=c?MEAS[s].m(c):'';if(v.textContent!==t)v.textContent=t;});
  var cap=document.getElementById('mapcap');if(cap&&cap.innerHTML!==MEAS[s].cap)cap.innerHTML=MEAS[s].cap;
  var sub=document.getElementById('mapsub');if(sub&&sub.innerHTML!==MEAS[s].sub)sub.innerHTML=MEAS[s].sub;      /* F-01: the theme's word */
  [].forEach.call(document.querySelectorAll('.grid'),function(g){
    var cs=[].slice.call(g.querySelectorAll('a.mcard'));
    cs.sort(function(a,b){return (+a.getAttribute('data-r-'+s))-(+b.getAttribute('data-r-'+s));});
    cs.forEach(function(c){g.appendChild(c);});});
  cards.forEach(function(c){
    c.querySelector('.mrank').textContent=ordw(+c.getAttribute('data-r-'+s))+' of '+c.dataset.ncls;
    [].forEach.call(c.querySelectorAll('[data-m]'),function(r){r.classList.toggle('on',r.getAttribute('data-m')===s);});});
  if(!fromUrl){try{var u=new URL(location.href);if(s==='spend')u.searchParams.delete('sort');else u.searchParams.set('sort',s);
    history.replaceState(null,'',u.pathname+u.search+u.hash);}catch(e){}}
  tell(sel);
}
document.getElementById('sortSeg').addEventListener('click',function(e){var b=e.target.closest('button[data-sort]');if(b)apply(b.dataset.sort);});
var q=new URLSearchParams(location.search).get('sort');
apply(MEAS[q]?q:'spend',true);
/* the readout sits in the flow, under the map: it holds the height of the tallest answer any government and any measure gives (the name, the words and the
   rank wrap differently at every width), so a tap changes what it says and moves nothing below it */
function fitRead(){
  var box=document.getElementById('mreadw'); if(!box) return;
  var w=box.getBoundingClientRect().width; if(!w) return;
  var keep=sort, h='', wrap=document.createElement('div'), best=0;
  Object.keys(MEAS).forEach(function(s){sort=s;cards.forEach(function(c){h+='<div class="mread" style="margin:0;min-height:0"><div>'+readRow(c)+'</div></div>';});});
  sort=keep;                                            /* every answer is laid out at once (one layout, not one per answer) in a hidden box as wide as the readout */
  wrap.style.cssText='position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0;margin:0;width:'+w+'px';
  wrap.innerHTML=h;box.parentNode.appendChild(wrap);
  [].forEach.call(wrap.children,function(p){best=Math.max(best,p.offsetHeight);});
  wrap.remove();box.style.minHeight=best+'px';
}
fitRead();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitRead);
var frT;window.addEventListener('resize',function(){clearTimeout(frT);frT=setTimeout(fitRead,150);});
/* the tap path, on the map and on the pot: on a touch screen the first tap on a shape or segment selects it (the readout answers),
   the second opens; on a hover screen a click opens (an <a> badge navigates by itself) */
function go(el){var h=el.getAttribute('href')||el.getAttribute('data-href');if(h)location.href=h;}
function tapPath(e){
  var k=e.target.closest&&e.target.closest('[data-key]');if(!k)return;
  if(k.classList.contains('ml')){var s=document.querySelector('.mp[data-key="'+k.dataset.key+'"]');if(!s)return;k=s;}      /* r6 F-24: a name is its shape */
  var key=k.dataset.key, isLink=k.tagName==='A';
  if(HOVER){if(!isLink)go(k);return;}
  e.preventDefault();
  if(sel===key){go(k);return;}
  sel=key;light(key);
}
document.getElementById('mapwrap').addEventListener('click',function(e){
  var k=e.target.closest&&e.target.closest('.kk');
  if(k){sel=k.dataset.key;light(sel);return;}                  /* a key entry selects (the readout answers where the reader is); it never scrolls */
  tapPath(e);});
/* r5 F-17: a key on a shape or a letter selects it (the readout answers) and focus moves to the readout, whose row opens the ledger -
   a key never leaves the page by itself, so 'tap a shape or a letter for its figure' holds for a keyboard too */
function enterOpens(e){if(e.key!=='Enter'&&e.key!==' ')return;
  var k=e.target.closest&&e.target.closest('.mp,.mk');if(!k||!k.dataset.key)return;e.preventDefault();
  sel=k.dataset.key;light(sel);setTimeout(function(){var r=document.querySelector('#mread a.pl-row');if(r)r.focus();},0);}
document.getElementById('mapwrap').addEventListener('keydown',enterOpens);
/* the letter markers are 44px circles (the links themselves) round 26px badges; on a narrow phone some of the circles overlap. Cut each marker's circle along the
   line halfway to every neighbour it overlaps, and the NEARER marker takes a tap, a hover or a click - whatever the order of the page. clip-path is hit-tested, so the
   cut is the browser's own (nothing to re-aim, no dead zone, no point that belongs to two). Worked out from the markers' real positions, so it follows every map width;
   a marker nothing overlaps keeps its plain circle. The build keeps every pair of badges at least 34px apart, so a cut never clips a badge's ring. */
var marks=[].slice.call(document.querySelectorAll('.mk'));
function keepHalf(poly,nx,ny,k){                       /* the part of a convex polygon where x*nx+y*ny <= k (one Sutherland-Hodgman pass) */
  var out=[],i,a,b,da,db,t;
  for(i=0;i<poly.length;i++){
    a=poly[i];b=poly[(i+1)%poly.length];da=a[0]*nx+a[1]*ny-k;db=b[0]*nx+b[1]*ny-k;
    if(da<=0) out.push(a);
    if((da<0&&db>0)||(da>0&&db<0)){t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  return out;
}
function carve(){
  var at=marks.map(function(m){var r=m.getBoundingClientRect();return {m:m,x:r.left+r.width/2,y:r.top+r.height/2,R:r.width/2};});
  at.forEach(function(a){
    if(!a.R){a.m.style.clipPath='';return;}
    var poly=[],i,cut=false;
    for(i=0;i<48;i++) poly.push([a.R*Math.cos(Math.PI*i/24),a.R*Math.sin(Math.PI*i/24)]);
    at.forEach(function(b){
      if(b===a) return;
      var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy);
      if(!d||d>=a.R+b.R) return;                       /* the two circles do not touch */
      poly=keepHalf(poly,dx/d,dy/d,d/2);cut=true;});
    a.m.style.clipPath=cut?'polygon('+poly.map(function(p){return (a.R+p[0]).toFixed(2)+'px '+(a.R+p[1]).toFixed(2)+'px';}).join(',')+')':'';
  });
}
carve();
if(window.ResizeObserver) new ResizeObserver(carve).observe(document.querySelector('.mapin')); else window.addEventListener('resize',carve);
/* ---- compare two governments: the same pre-formatted figures the cards print, two at a time. Ranks are within a class
   only (a pair from two classes says so); the filing years, the census divisor and any missing years are printed, never implied.
   The pair has an address: ?a=<slug>&b=<slug>#compare (#cmp, its address before, still lands on it). ---- */
(function(){
  var el=document.getElementById('cmp'); if(!el) return;
  /* r6 F-15: the data may sit beside the page (PLD); r7 F-13: when it did not arrive, the tool says so and offers to try again */
  var D=null; try{D=(window.PLD&&PLD.cmpdata)||JSON.parse(document.getElementById('cmpdata').textContent);}catch(e){D=null;}
  if(!D||!D.g){dataFail(el);return;}
  var G=D.g;
  var A=document.getElementById('cmpA'), B=document.getElementById('cmpB'), out=document.getElementById('cmpOut');
  var PL_={city:'cities',town:'towns',village:'villages'};
  function nm(g){return g.n+(g.dup?' ('+g.c+')':'');}
  function chip(g){return '<span class="clsch">'+g.c.toUpperCase()+'</span>';}
  function rk(g,k){var r=g.rk[k];return r?'<span class="rkw">'+ordw(r[0])+' of '+r[1]+' '+PL_[g.c]+'</span>':'';}
  /* r7 F-29: on a phone each measure's name is a line of its own above the two figures (.ctl, a visual row: the table keeps its row headers
     for a screen reader), so every figure has half the width and nothing is squeezed into a one-word column, text spacing or not */
  function row(label,fa,fb,cls){return '<tr class="ctl'+(cls?' '+cls:'')+'" aria-hidden="true"><td colspan="3">'+label+'</td></tr>'+
    '<tr'+(cls?' class="'+cls+'"':'')+'><th scope="row">'+label+'</th><td>'+fa+'</td><td>'+fb+'</td></tr>';}
  function dollars(v){return '$'+Math.round(v).toLocaleString('en-US');}
  /* a year inside the span with no filing is MISSING (a gap); a year after the latest filing is NOT YET in the data - the card's two phrases, never one word */
  function absent(g){return (g.missing.length?'<span class="rkw">missing '+g.missing.join(', ')+'</span>':'')+
    (g.late.length?'<span class="rkw">'+g.late.join(', ')+' not yet in the Comptroller data</span>':'');}
  function lastIdx(s){for(var i=s.length-1;i>=0;i--) if(s[i]!=null) return i;return -1;}
  function firstIdx(s){for(var i=0;i<s.length;i++) if(s[i]!=null) return i;return -1;}
  function chart(a,b){
    var n=D.y1-D.y0, vals=[];
    [a.x,b.x].forEach(function(s){s.forEach(function(v){if(v!=null) vals.push(v);});});
    /* one axis vocabulary (the chrome's PL.niceStep / PL.axisFmt): the step picks the decimals, the top picks the unit, so a tick never mixes '$1.3M' with '$10M' */
    var mx=Math.max.apply(null,vals), step=PL.niceStep(mx,3), top=Math.ceil(mx/step-1e-9)*step, afmt=PL.axisFmt(step,top), ticks=[], H=170;
    for(var tv=0;tv<=top*(1+1e-9);tv+=step) ticks.push(Math.round(tv*1e6)/1e6);
    function X(i){return i/n*100;}
    function Y(v){return 100-v/top*100;}
    function path(s){var d='',pen=false;s.forEach(function(v,i){if(v==null){pen=false;return;}d+=(pen?'L':'M')+X(i).toFixed(2)+' '+Y(v).toFixed(2)+' ';pen=true;});return d;}
    var ends=[[a,'a'],[b,'b']].map(function(p){var i=lastIdx(p[0].x);return {g:p[0],k:p[1],i:i,v:p[0].x[i],px:Y(p[0].x[i])/100*H};});
    var desc='Spending per resident, '+D.y0+' to '+D.y1+', on one scale: '+ends.map(function(e){var f=firstIdx(e.g.x);
      return nm(e.g)+' from '+dollars(e.g.x[f])+' in '+(D.y0+f)+' to '+dollars(e.v)+' in '+(D.y0+e.i);}).join('; ')+'.';
    var svg='<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="'+esc(desc).replace(/"/g,'&quot;')+'">'+
      ticks.map(function(t){var y=Y(t);return '<line class="cg" x1="0" x2="100" y1="'+y.toFixed(2)+'" y2="'+y.toFixed(2)+'"/>';}).join('')+
      (D.brk>D.y0&&D.brk<=D.y1?'<line class="cb" x1="'+X(D.brk-D.y0-.5).toFixed(2)+'" x2="'+X(D.brk-D.y0-.5).toFixed(2)+'" y1="0" y2="100"/>':'')+
      '<path class="lb" d="'+path(b.x)+'"/><path class="la" d="'+path(a.x)+'"/></svg>';
    var lab=ticks.map(function(t){return '<span class="cl yl" style="top:'+Y(t).toFixed(2)+'%">'+afmt(t)+'</span>';}).join('')+
      '<span class="cl xl xs" style="left:0">'+D.y0+'</span>'+
      (D.brk>D.y0&&D.brk<D.y1?'<span class="cl xl" style="left:'+X(D.brk-D.y0-.5).toFixed(2)+'%">'+D.brk+'</span>':'')+
      '<span class="cl xl xe">'+D.y1+'</span>';
    /* each line is named at its own end, with its value and its last filing year; when the two ends sit close, the lower label drops below its dot */
    var dy=Math.abs(ends[0].px-ends[1].px), close=dy<30, upper=ends[0].px<=ends[1].px?0:1;
    var dots=ends.map(function(e,j){
      /* a desk: the names sit beside the line ends and part when they would touch; a phone: the key above the chart carries them instead */
      var below=close&&j!==upper, sh=dy<16?(j===upper?-1:1)*(16-dy)/2:0;
      return '<span class="cd d'+e.k+'" style="left:'+X(e.i).toFixed(2)+'%;top:'+Y(e.v).toFixed(2)+'%"></span>'+
        '<span class="ce e'+e.k+'" style="--l:'+X(e.i).toFixed(2)+'%;--t:'+Y(e.v).toFixed(2)+'%;--tp:'+(below?'30%':'-130%')+';--sh:'+sh.toFixed(1)+'px">'+
        esc(nm(e.g))+' '+dollars(e.v)+' · '+(D.y0+e.i)+'</span>';}).join('');
    return '<div class="cchart-h">Spending per resident, each year filed</div>'+
      '<div class="cmp-key"><span><i></i>'+esc(nm(a))+'<span class="cmp-end"> &middot; '+dollars(ends[0].v)+' in '+(D.y0+ends[0].i)+'</span></span>'+
      '<span><i class="kb"></i>'+esc(nm(b))+', dashed<span class="cmp-end"> &middot; '+dollars(ends[1].v)+' in '+(D.y0+ends[1].i)+'</span></span></div>'+
      '<div class="cchart">'+svg+lab+dots+'</div>';
  }
  function render(){
    var a=G[A.value], b=G[B.value];
    if(!a||!b){out.innerHTML='';return;}
    if(a===b){out.innerHTML='<p class="cmp-lede">Pick two different governments to compare.</p>';return;}
    var same=a.c===b.c, mm=a.ly!==b.ly, common=Math.min(a.ly,b.ly);
    var h='<p class="cmp-lede"><b>'+esc(nm(a))+'</b>'+chip(a)+' and <b>'+esc(nm(b))+'</b>'+chip(b)+' &mdash; '+
      (same?'both are '+PL_[a.c]+', so every rank below is among the same '+a.rk.spend[1]+'.'
           :'a '+a.c+' and a '+b.c+': each rank below is within its own class ('+a.rk.spend[1]+' '+PL_[a.c]+', '+b.rk.spend[1]+' '+PL_[b.c]+'), never one government against the other.')+'</p>'+
      '<p class="cmp-mm">'+(mm?'<b>Different filing years.</b> '+esc(nm(a))+'&rsquo;s latest filing is '+a.ly+', '+esc(nm(b))+'&rsquo;s is '+b.ly+'; each is shown at its own latest filing, as on its row, and the last row sets them side by side in '+common+', the latest year both filed. '
        :'Both are shown at their <b>'+a.ly+'</b> filing. ')+
      'Per-resident figures divide filed expenditure by one number, the 2020 Census population ('+a.pop+' and '+b.pop+'), the same divisor for every year. Context, not a scorecard: the two may run different services.</p>';
    h+='<table class="ctab"><thead><tr><th><span class="pl-vh">Measure</span></th><th scope="col">'+esc(nm(a))+chip(a)+'</th><th scope="col">'+esc(nm(b))+chip(b)+'</th></tr></thead><tbody>'+
      row('Latest filing','<span class="num'+(mm?' yrx':'')+'">'+a.ly+'</span>','<span class="num'+(mm?' yrx':'')+'">'+b.ly+'</span>',mm?'cmm':'')+
      row('Revenue','<span class="num">'+a.rev+'</span>','<span class="num">'+b.rev+'</span>')+
      row('Expenditure','<span class="num">'+a.exp+'</span>','<span class="num">'+b.exp+'</span>')+
      row('Net','<span class="num">'+a.net+'</span>','<span class="num">'+b.net+'</span>')+
      row('Population, 2020 Census','<span class="num">'+a.pop+'</span>','<span class="num">'+b.pop+'</span>')+
      row('Spending per resident','<span class="num">'+a.spend+'</span>'+rk(a,'spend'),'<span class="num">'+b.spend+'</span>'+rk(b,'spend'))+
      row('Spending since '+D.brk,'<span class="num">'+a.grow+'</span>'+(a.gfrom!==D.brk&&a.grow!=='—'?'<span class="rkw">from '+a.gfrom+'</span>':'')+rk(a,'growth'),
          '<span class="num">'+b.grow+'</span>'+(b.gfrom!==D.brk&&b.grow!=='—'?'<span class="rkw">from '+b.gfrom+'</span>':'')+rk(b,'growth'))+
      row('Sales-tax share'+(a.share||b.share?', '+(a.share||b.share)[2]:''),
          a.share?'<span class="num">'+a.share[0]+' · '+a.share[1]+'</span>':'<span class="rkw">not in the data</span>',
          b.share?'<span class="num">'+b.share[0]+' · '+b.share[1]+'</span>':'<span class="rkw">not in the data</span>')+
      row('Biggest spend',a.top?esc(a.top[0])+' <span class="num">'+a.top[1]+'</span>':'—',b.top?esc(b.top[0])+' <span class="num">'+b.top[1]+'</span>':'—')+
      row('Years in the data','<span class="num">'+a.filed+' of '+a.span+'</span>'+absent(a),'<span class="num">'+b.filed+' of '+b.span+'</span>'+absent(b))+
      (mm?row('Spending per resident in '+common+', the latest year both filed',
          a.x[common-D.y0]==null?'<span class="rkw">not in the data</span>':'<span class="num">'+dollars(a.x[common-D.y0])+'</span>',
          b.x[common-D.y0]==null?'<span class="rkw">not in the data</span>':'<span class="num">'+dollars(b.x[common-D.y0])+'</span>'):'')+
      '</tbody></table>'+chart(a,b)+
      '<p class="cmp-note">The two lines are on one scale. A year with no filing is never drawn as zero: inside a span it breaks the line, and after a government&rsquo;s latest filing its line simply ends. The dashed vertical line is the '+D.brk+' reporting-basis change: figures either side of it are not strictly comparable. Ranks, figures and filing years are the rows&rsquo;.</p>';
    if(out.innerHTML!==h) out.innerHTML=h;
  }
  function sync(){
    try{var u=new URL(location.href);u.searchParams.set('a',A.value);u.searchParams.set('b',B.value);history.replaceState(null,'',u.pathname+u.search+'#compare');}catch(e){}
  }
  var q=new URLSearchParams(location.search), qa=q.get('a'), qb=q.get('b');
  if(qa&&qb&&G[qa]&&G[qb]&&qa!==qb){A.value=qa;B.value=qb;}
  A.addEventListener('change',function(){render();sync();});
  B.addEventListener('change',function(){render();sync();});
  /* r7 (API.md): the site's one share - the sheet on a phone, the clipboard elsewhere, a word either way */
  document.getElementById('cmpCopy').addEventListener('click',function(){sync();var t='Compare '+nm(G[A.value])+' and '+nm(G[B.value]);
    if(window.PL&&PL.share)PL.share({url:location.href,title:t,text:t});else PL.shareLink(t,location.href,{coarse:true});});
  render();
})();
/* a <details data-wide-open> starts open on a desk and folded on a phone (its row stays, so a desk reader can fold it) */
(function(){var w=window.matchMedia('(min-width:641px)');
  function openWide(){if(w.matches) [].forEach.call(document.querySelectorAll('details[data-wide-open]'),function(d){d.open=true;});}
  openWide();
  if(w.addEventListener) w.addEventListener('change',openWide); else w.addListener(openWide);})();
/* r7 F-18: the ranked list (m/index.html's tables, here). A header press sorts EVERY class table on that column - one state for the list,
   ?by=&dir= its address (an old m/index.html address, ?sort=share&dir=asc, still opens sorted: the map's ?sort= words are its own and
   never collide); the row number is the position on the sorted measure, within the class only. */
(function(){
  var tables=[].slice.call(document.querySelectorAll('table.cmpt'));if(!tables.length)return;
  var by='per',dir='desc',KEYS=/^(name|per|share|year)$/;
  function val(tr,k){if(k==='name')return tr.getAttribute('data-name');var v=tr.getAttribute('data-'+k);return v===''?-Infinity:+v;}
  function apply(){
    tables.forEach(function(t){var tb=t.tBodies[0],rows=[].slice.call(tb.rows);
      rows.sort(function(a,b){var x=val(a,by),y=val(b,by);if(x===y)return 0;var r=x<y?-1:1;return dir==='asc'?r:-r;});
      rows.forEach(function(r){tb.appendChild(r);});
      [].forEach.call(t.tHead.querySelectorAll('th[data-k]'),function(th){
        th.setAttribute('aria-sort',th.getAttribute('data-k')===by?(dir==='asc'?'ascending':'descending'):'none');});});
    try{var u=new URL(location.href);
      if(KEYS.test(u.searchParams.get('sort')||'')){u.searchParams.delete('sort');}
      if(by==='per'&&dir==='desc'){u.searchParams.delete('by');u.searchParams.delete('dir');}
      else{u.searchParams.set('by',by);u.searchParams.set('dir',dir);}
      history.replaceState(null,'',u.pathname+u.search+u.hash);}catch(e){}
  }
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.cmpt .sb');if(!b)return;
    var k=b.closest('th').getAttribute('data-k');
    if(k===by)dir=(dir==='asc'?'desc':'asc');else{by=k;dir=(k==='name'?'asc':'desc');}
    apply();});
  var q=new URLSearchParams(location.search), k=q.get('by')||q.get('sort')||'';
  if(KEYS.test(k)){by=k;dir=q.get('dir')==='asc'?'asc':(q.get('dir')==='desc'?'desc':(k==='name'?'asc':'desc'));}
  apply();
})();
/* the rail marks the part in view on a desk (a phone's tabs mark their own); nothing is marked above the first part */
(function(){
  var ls=[].slice.call(document.querySelectorAll('.rail a[href^="#"]')),
      ss=ls.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));});
  function spy(){
    if(document.documentElement.classList.contains('pl-tabs')) return;
    var y=window.scrollY+120,b=-1;
    ss.forEach(function(s,i){if(s&&s.getBoundingClientRect().top+window.scrollY<=y)b=i;});
    if(b>=0&&window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2)b=ss.length-1;
    ls.forEach(function(a,i){var on=i===b;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
  }
  window.addEventListener('scroll',spy,{passive:true});window.addEventListener('resize',spy);spy();
})();
/* sparklines: one scale per class (true small multiples - the default; the scale's top is said), or each government's own */
document.getElementById('scaleSeg').addEventListener('click',function(e){var b=e.target.closest('button[data-scale]');if(!b)return;
  [].forEach.call(this.querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
  [].forEach.call(document.querySelectorAll('.grid'),function(g){g.classList.toggle('cls',b.dataset.scale==='cls');});
  var cs=document.getElementById('clsScale');if(cs)cs.hidden=b.dataset.scale!=='cls';});
/* the phone card: the essentials, or every figure (one control for all the cards; a card is a link, so it holds no control) */
document.getElementById('cardSeg').addEventListener('click',function(e){var b=e.target.closest('button[data-cards]');if(!b)return;
  [].forEach.call(this.querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
  [].forEach.call(document.querySelectorAll('.grid'),function(g){g.classList.toggle('full',b.dataset.cards==='full');});});
})();
