
(function(){
"use strict";
/* r6 F-15: the stamp moves the big data block beside the page (PLD.cdata). r7 F-13 (outside audit 2026-11-01 r7): when that file did not
   arrive (a dropped connection, a blocked request) or the chrome's runtime is missing, every part this script draws says so, with a way to try
   again - never a script error over a silent, empty chart. The figures printed in the page (the hero, the rows, the tables) stay; the parts
   are marked data-cdata="part" (the message goes there), "hide" (a control with nothing to work on) or "show" (a panel that waits for the
   data to appear, shown now so its message is seen: the m/ ledgers' 'Across the county'). The message is the chrome's
   (PL.dataFail) when it is there - its script comes after this one, so this waits for the parse - and the same words here when it is not. */
var O=null;
try{O=(window.PLD&&PLD.cdata)||JSON.parse(document.getElementById('cdata').textContent);}catch(e){O=null;}
if(!O||!O.flows||!window.PL||!PL.money0){
  var noData=function(){
    [].forEach.call(document.querySelectorAll('[data-cdata="hide"]'),function(el){el.hidden=true;});
    [].forEach.call(document.querySelectorAll('[data-cdata="show"]'),function(el){el.hidden=false;});
    [].forEach.call(document.querySelectorAll('[data-cdata="part"]'),function(el){
      if(window.PL&&PL.dataFail){PL.dataFail(el);return;}
      el.innerHTML='<p class="pl-dfail" role="status">'+(navigator.onLine===false?'You&rsquo;re offline: this part needs a connection.':
        'This part of the page didn&rsquo;t load: the connection may have dropped.')+' <button type="button" class="pill">Try again</button></p>';
      el.querySelector('button').addEventListener('click',function(){location.reload();});});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',noData); else noData();
  return;
}
var F=O.flows, FD=O.dict;
/* one spelling on every public page (SPEC 1.4): the Comptroller's 'Judgements' reads 'Judgments' - display only; the payload keeps the filing's own labels, so every page's data still equals its source */
['l2','narr'].forEach(function(k){FD[k]=FD[k].map(function(v){return v.replace(/Judgements/g,'Judgments');});});
var FI_YR=0,FI_SEC=1,FI_L1=2,FI_L2=3,FI_OBJ=4,FI_NARR=5,FI_ACCT=6,FI_AMT=7;
var REDUCED=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
var money0=PL.money0;                              /* the chrome's runtime module 'fmt' */
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escA(v){return esc(v).replace(/"/g,'&quot;');}

/* ---- shared helpers: true minus, compact money, 1-2-5 axis ticks, edge fades, the scrub ---- */
function sgn(v){return v<0?'−':'+';}
function mCompact(v){var a=Math.abs(v);
  return (v<0?'−':'')+'$'+(a>=995e6?(a/1e9).toFixed(2)+'B':a>=995000?(a/1e6>=9.95?Math.round(a/1e6):(a/1e6).toFixed(1))+'M':Math.round(a/1e3)+'K');}
function niceStep(m2,parts){var t=m2/parts,p=Math.pow(10,Math.floor(Math.log(t)/Math.LN10)),c=t/p;
  return (c>=5?5:c>=2.5?2.5:c>=2?2:1)*p;}
function axMoney(g){return g===0?'$0':mCompact(g);}
/* a zero-centred deviation bar: the side says which way, the hatch says 'down'
   (shape and position, never hue). max = the largest |value| shown with it */
function dvBar(d,max){var w=max?Math.min(100,Math.abs(d)/max*100):0;
  return '<span class="dv" aria-hidden="true"><i class="'+(d>=0?'o':'u')+'" style="width:'+(w/2).toFixed(1)+'%"></i></span>';}
function arrowGlyph(d){return '<span aria-hidden="true">'+(d>=0?'▲':'▼')+' </span>';}
/* strips that scroll sideways fade at the edge that has more behind it */
function edgeFade(el){
  if(!el) return;
  function upd(){var m=el.scrollWidth-el.clientWidth;
    el.classList.toggle('ovl',m>4&&el.scrollLeft>4);
    el.classList.toggle('ovr',m>4&&el.scrollLeft<m-4);}
  if(!el.__fade){el.__fade=1;el.addEventListener('scroll',upd,{passive:true});
    window.addEventListener('resize',upd,{passive:true});}
  upd();
}
/* One chart scrub for every plot: the chrome's PL.scrubber (touch-action:pan-y so a vertical swipe scrolls the page, a 6px
   sideways move starts a scrub) driving this page's show / hide / pick. opts.live = pick as the finger moves. */
function attachScrub(hit,idxAt,show,hide,opts){
  opts=opts||{};
  var last=-1;
  PL.scrubber(hit,{
    onMove:function(x,touch){var i=idxAt(x);show(i);if(touch&&opts.live&&opts.pick&&i!==last){last=i;opts.pick(i);}},
    onLeave:function(){last=-1;hide();},
    onTap:opts.pick?function(x){opts.pick(idxAt(x));}:null,
    keys:opts.label?{idx:idxAt,label:opts.label,read:opts.read}:null      /* r3 PL-07: a keyboard stop that steps year by year and says each */
  });
}
function say(msg){var l=document.getElementById('plLive');if(l){l.textContent='';setTimeout(function(){l.textContent=msg;},30);}}
function toast(msg){PL.toast(msg,2200);}      /* the toast is a live region: it announces itself */
/* ---- the address contract: ?y= is the filing year; the hash is the open sheet
   (#cat=<sec>|<label>[|<tab>], #cmp=<a>|<b>, #acct-<code>). Opening a sheet PUSHES one entry
   so Back closes it; everything that changes inside the sheet REPLACES, so Back still closes
   it in one step. A same-page link to one of these addresses opens it without a second entry. */
function hashReplace(h){try{history.replaceState(history.state,'',location.pathname+location.search+(h||''));}catch(e){}}
function catHash(){var h='#cat='+MODAL.sec+'|'+encodeURIComponent(MODAL.label);
  if(MODAL.tab&&MODAL.tab!=='breakdown') h+='|'+MODAL.tab; return h;}
var HOVER=window.matchMedia('(hover:hover)').matches;
/* share: the native sheet where there is one (touch screens), the clipboard everywhere else, and a word either way */
function shareLink(title){if(PL.share)PL.share({url:location.href,title:title,text:title});else PL.shareLink(title,location.href,{coarse:true});}

/* the hovered category row's own series, echoed beside the row: the big chart carries the ghost too,
   but at laptop height Schedule 2 sits a screen below it. Hover-capable devices only; on touch the
   row's tap opens the sheet, whose Trend tab is the same series in full. */
var gcardEl=null;
function ghostCard(row,sec,label,col){
  if(!gcardEl){gcardEl=document.createElement('div');gcardEl.className='gcard';gcardEl.setAttribute('aria-hidden','true');
    document.body.appendChild(gcardEl);
    window.addEventListener('scroll',function(){gcardEl.style.display='none';},{passive:true});
    document.addEventListener('pointerdown',function(){gcardEl.style.display='none';},true);}
  if(!row){gcardEl.style.display='none';return;}
  var v=seriesFor(sec,label), f=-1, li=v.length-1, gaps=0;
  for(var q=0;q<v.length;q++){if(v[q]>0){f=q;break;}}
  if(f<0){gcardEl.style.display='none';return;}
  for(var g=f;g<=li;g++) if(v[g]==null) gaps++;
  gcardEl.innerHTML='<b>'+esc(label)+'</b><span class="gy num">'+O.years[f]+'–'+O.years[li]+
    (gaps?' · '+gaps+' year'+(gaps>1?'s':'')+' not reported':'')+'</span>'+
    sparkSVG(v.map(function(val,i){return i<f?null:val;}),col)+
    '<span class="gv num">'+mCompact(v[f])+' &rarr; '+(v[li]==null?'no filing':mCompact(v[li]))+'</span>'+
    '<span class="gh">ghosted on the chart below</span>';
  var r=row.getBoundingClientRect(); gcardEl.style.display='block';
  var cw=gcardEl.offsetWidth, ch=gcardEl.offsetHeight;
  var left=Math.max(8,Math.min(r.right-cw,window.innerWidth-cw-8));
  var top=r.top-ch-6; if(top<64) top=r.bottom+6;
  gcardEl.style.left=left+'px'; gcardEl.style.top=top+'px';
}

/* ---- flow helpers (identical to the city page) ---- */
function flowsFor(year, sec, l1Label){
  var out=[];
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_YR]!==year || f[FI_SEC]!==sec) continue;
    if(FD.l1[f[FI_L1]]!==l1Label) continue;
    out.push(f);
  }
  return out;
}
function sumBy(rows, dictKey, idx){
  var m={};
  rows.forEach(function(f){ var k=FD[dictKey][f[idx]]; m[k]=(m[k]||0)+f[FI_AMT]; });
  return Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1];});
}
var catIndex=null;
function buildCatIndex(){
  catIndex={};
  for(var i=0;i<F.length;i++){
    var f=F[i], sec=f[FI_SEC], k=sec+'|'+FD.l1[f[FI_L1]];
    (catIndex[k]||(catIndex[k]={}))[f[FI_YR]]=((catIndex[k]||{})[f[FI_YR]]||0)+f[FI_AMT];
    var t='T'+sec;
    (catIndex[t]||(catIndex[t]={}))[f[FI_YR]]=((catIndex[t]||{})[f[FI_YR]]||0)+f[FI_AMT];
  }
}
/* a year with no row under the category is null, never 0: the renderers break the line there
   (a missing filing is shown as missing - the page's own Schedule 4 promise) */
function seriesFor(sec,l1){
  if(!catIndex) buildCatIndex();
  var m=catIndex[sec+'|'+l1]||{};
  return O.years.map(function(y){return m[y]==null?null:m[y];});
}
function sectionSeries(sec){
  if(!catIndex) buildCatIndex();
  var m=catIndex['T'+sec]||{};
  return O.years.map(function(y){return m[y]||0;});
}
function subSeriesFor(sec,l1){
  var m={};
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_SEC]!==sec || FD.l1[f[FI_L1]]!==l1) continue;
    var k=FD.l2[f[FI_L2]];
    (m[k]||(m[k]={}))[f[FI_YR]]=((m[k]||{})[f[FI_YR]]||0)+f[FI_AMT];
  }
  return Object.keys(m).map(function(k){
    var vals=O.years.map(function(y){return m[k][y]==null?null:m[k][y];});
    return {label:k,values:vals,last:vals[vals.length-1]||0};
  }).sort(function(a,b){return b.last-a.last;});
}
/* one path per run of filed years: 'M' at every run start, nothing where the year is null */
function pathRuns(values,x,y){
  var d='',on=false;
  for(var i=0;i<values.length;i++){
    if(values[i]==null){on=false;continue;}
    d+=(on?'L':'M')+x(i).toFixed(1)+' '+y(values[i]).toFixed(1)+' ';on=true;
  }
  return d;
}
/* an area under each run (closed to the base), and a dot for a run of one, which no line can show */
function areaRuns(values,x,y,base){
  var out=[],run=[];
  function flush(){if(!run.length)return;var a=run[0],b=run[run.length-1];
    out.push('M'+x(a).toFixed(1)+' '+base+' '+run.map(function(i){return 'L'+x(i).toFixed(1)+' '+y(values[i]).toFixed(1);}).join(' ')+' L'+x(b).toFixed(1)+' '+base+' Z');run=[];}
  for(var i=0;i<values.length;i++){if(values[i]==null)flush();else run.push(i);}
  flush();return out.join(' ');
}
function loneRuns(values){
  var out=[];
  for(var i=0;i<values.length;i++)
    if(values[i]!=null&&(i===0||values[i-1]==null)&&(i===values.length-1||values[i+1]==null)) out.push(i);
  return out;
}
function pctChange(a,b){
  if(!a) return b?'new':'—';
  var p=(b-a)/a*100;
  return (p>=0?'+':'')+p.toFixed(0)+'%';
}

/* ---- reusable line chart with crosshair (ported) ---- */
function renderLine(host, values, opts){
  opts=opts||{};
  /* drawn at the width it is shown at, so the type is real type (11.5px+), never a scaled-down viewBox */
  var yrs=O.years, W=Math.round(host.clientWidth||0)||760, narrow=W<520;
  var H=opts.h||210, ml=narrow?46:58, mr=narrow?12:16, mt=12, mb=narrow?22:24;
  var fs=12;      /* r8 F-12: the scale's smallest token at every width (was 11.5 on a desk) */
  var max=Math.max.apply(null,values.concat((opts.ref||[]).filter(function(v){return v!=null;})))*1.08||1;
  var x=function(i){return ml+(W-ml-mr)*(i/(yrs.length-1));};
  var y=function(v){return mt+(H-mt-mb)*(1-v/max);};
  var fmt=opts.pct?function(v){return v.toFixed(1)+'%';}:money0;
  /* the house ladder (PL.axisTicks), as on the front page: '$0K' per resident and '$13M' for $12.5M were this axis (Fable r7) */
  var p=[], AT=PL.axisTicks(max,4), pS=AT.ticks.length>1?AT.ticks[1]-AT.ticks[0]:1, pD=pS>=1?0:pS>=0.1?1:2;   /* a half-point step reads 0.5%, never '1% 1%' */
  var tf=opts.pct?function(v){return v===0?'0%':v.toFixed(pD)+'%';}:AT.fmt;
  ml=Math.max(ml, Math.max.apply(null,AT.ticks.map(function(g){ return String(tf(g)).length; }))*fs*0.76+9);   /* room for the longest tick (text face, PL-07: up to 0.76em a character - '$200M') */
  AT.ticks.forEach(function(gv){
    p.push('<line class="gl" x1="'+ml+'" y1="'+y(gv).toFixed(1)+'" x2="'+(W-mr)+'" y2="'+y(gv).toFixed(1)+'"/>');
    p.push('<text class="ax" x="'+(ml-7)+'" y="'+(y(gv)+fs/3).toFixed(1)+'" text-anchor="end" font-size="'+fs+'">'+tf(gv)+'</text>');
  });
  var bi=yrs.indexOf(O.schemaBreak);
  if(bi>0){
    var bx=((x(bi)+x(bi-1))/2).toFixed(1);
    p.push('<line class="brk" x1="'+bx+'" y1="'+mt+'" x2="'+bx+'" y2="'+(H-mb)+'"/>');
    /* the 2013 name: at the foot of its rule, beside it, or higher up it - the first place no line runs through (Fable r7/r8) */
    if(opts.brkLabel){
      var bT='basis changed '+O.schemaBreak, bP=function(a){ return (a||[]).map(function(v,i){ return v==null?null:[x(i),y(v)]; }); };
      var bF=H-mb-6, bH=mt+fs+2, bC=[];
      [bF,bH,bF-(bF-bH)/4,(bF+bH)/2,bH+(bF-bH)/4].forEach(function(yy){ bC.push({x:+bx,y:yy,a:'middle'},{x:+bx+5,y:yy,a:'start'},{x:+bx-5,y:yy,a:'end'}); });
      var bS=PL.chartSpot({text:bT, fs:fs, lines:[bP(values),bP(opts.ref)], boxes:[], top:0, bottom:H-mb+1, left:ml, right:W, cands:bC});
      if(bS){ var bLab=[bS.x,bS.y,bT,bS.a];
        p.push('<text class="ax axh" x="'+bS.x+'" y="'+bS.y+'" text-anchor="'+bS.a+'" font-size="'+fs+'">'+bT+'</text>'); }
      else var bKey=bT;                                  /* no clear place on the plot: the key under it names the rule */
    }
  }
  var every=narrow?10:5, lastI=yrs.length-1, gapU=narrow?42:46;
  yrs.forEach(function(yr,i){
    if(!(yr%every===0||i===lastI)) return;
    if(i!==lastI&&x(lastI)-x(i)<gapU) return;              /* never two labels that touch */
    p.push('<text class="ax" x="'+x(i).toFixed(1)+'" y="'+(H-mb+fs+3)+'" text-anchor="'+(i===lastI?'end':'middle')+'" font-size="'+fs+'">'+
      yr+'</text>');
  });
  /* a year with no filing under this line is a break in the line, never a point at $0 */
  p.push('<path d="'+areaRuns(values,x,y,H-mb)+'" fill="var('+opts.color+')" opacity=".10"/>');
  p.push('<path class="ln" d="'+pathRuns(values,x,y)+'" stroke="var('+opts.color+')"/>');
  /* the price yardstick (opts.ref, the Trend tab): the first year's amount carried forward by consumer prices, dashed in
     ink - a pattern, never a hue - and named in a key under the plot */
  if(opts.ref){
    var rd='', rl=-1;
    opts.ref.forEach(function(v,i){ if(v==null) return; rd+=(rd?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1); rl=i; });
    if(rl>0){
      p.push('<path class="ghost" d="'+rd+'"/>');
      var refEnd=rl;                                   /* named once the marks are placed (below) */
    }
  }
  loneRuns(values).forEach(function(i){
    p.push('<circle cx="'+x(i).toFixed(1)+'" cy="'+y(values[i]).toFixed(1)+'" r="2.5" fill="var('+opts.color+')"/>');});
  var mBoxes=[], mRings=(opts.marks||[]).filter(function(k){ return values[k]!=null; }).map(function(k){ return [k,[x(k)-5,y(values[k])-5,x(k)+5,y(values[k])+5]]; });   /* the other marks' rings */
  if(bLab){ var bw0=bLab[2].length*fs*0.68, bx0=bLab[3]==='start'?bLab[0]:bLab[3]==='end'?bLab[0]-bw0:bLab[0]-bw0/2; mBoxes.push([bx0-2,bLab[1]-fs,bx0+bw0+2,bLab[1]+3]); }
  (opts.marks||[]).forEach(function(i){
    if(values[i]==null) return;
    p.push('<circle cx="'+x(i).toFixed(1)+'" cy="'+y(values[i]).toFixed(1)+'" r="4" fill="var(--paper)" '+
      'stroke="var('+opts.color+')" stroke-width="2"><title>'+yrs[i]+' — tap to see what moved</title></circle>');
    /* the mark's year above its ring, below it, at a corner beside it, or a line further out - the first spot no line or
       other label runs through; with none, the ring goes unlabelled (its chip under the chart names the year) (Fable r7/r8) */
    var mx=x(i), my=y(values[i]), mA=mx>W-mr-24?'end':'middle', mP=function(a){ return (a||[]).map(function(v,k){ return v==null?null:[x(k),y(v)]; }); };
    var mC=[];
    [0,fs+2].forEach(function(o2){ mC.push({x:mx,y:my-9-o2,a:mA},{x:mx,y:my+fs+8+o2,a:mA},{x:mx+5,y:my-7-o2,a:'start'},{x:mx-5,y:my-7-o2,a:'end'},
      {x:mx+5,y:my+fs+5+o2,a:'start'},{x:mx-5,y:my+fs+5+o2,a:'end'}); if(!o2) mC.push({x:mx+9,y:my+fs/3,a:'start'},{x:mx-9,y:my+fs/3,a:'end'}); });
    var mS=PL.chartSpot({text:String(yrs[i]), fs:fs, lines:[mP(values),mP(opts.ref)].concat(bi>0?[[[+bx,mt],[+bx,H-mb]]]:[]), boxes:mBoxes.concat(mRings.filter(function(r){ return r[0]!==i; }).map(function(r){ return r[1]; })), top:0, bottom:H-mb, left:ml-4, right:W, cands:mC});
    if(!mS) return;
    var mw=4*fs*0.68, m0=mS.a==='end'?mS.x-mw:mS.a==='start'?mS.x:mS.x-mw/2; mBoxes.push([m0, mS.y-fs, m0+mw, mS.y+3]);
    p.push('<text class="ax axh" x="'+mS.x.toFixed(1)+'" y="'+mS.y.toFixed(1)+'" text-anchor="'+mS.a+'" font-size="'+fs+'">'+yrs[i]+'</text>');
  });
  if(opts.sel!=null&&values[opts.sel]!=null)
    p.push('<circle cx="'+x(opts.sel).toFixed(1)+'" cy="'+y(values[opts.sel]).toFixed(1)+'" r="5" '+
      'fill="var('+opts.color+')" stroke="var(--paper)" stroke-width="2"/>');
  /* rings (opts.pins): the years a sentence figure points at */
  (opts.pins||[]).forEach(function(i){ if(values[i]==null) return;
    p.push('<circle cx="'+x(i).toFixed(1)+'" cy="'+y(values[i]).toFixed(1)+'" r="8" fill="none" stroke="var(--ink)" stroke-width="1.6"/>'); });
  /* the yardstick's name, placed last: on the plot where PL.refLabel finds room against the lines, the 2013 rule and name,
     the marks, their years and the rings; else in a key under it (Fable r6/r7) */
  if(refEnd>0){
    var RL=PL.refLabel({x:x, y:y, values:values, ref:opts.ref, rl:refEnd, fs:fs, W:W, H:H, mt:mt, mb:mb, ml:ml, mr:mr,
      text:yrs[opts.refFrom]+' at '+yrs[refEnd]+' prices '+(opts.short||PL.fmtM1)(opts.ref[refEnd]), marks:opts.marks||[], markBoxes:mBoxes,
      rings:(opts.pins||[]).concat(opts.sel!=null?[opts.sel]:[]), rule:bi>0?+bx:null, brk:bLab||null, cls:'ghostl'});
    if(RL.svg) p.push(RL.svg);
    var rkey=RL.key;
  }
  p.push('<g class="xh" style="opacity:0"><line class="brk" y1="'+mt+'" y2="'+(H-mb)+'"/>'+
    '<circle class="dot" r="4.5" fill="var('+opts.color+')"/></g>');
  p.push('<rect class="hit" x="'+ml+'" y="'+mt+'" width="'+(W-ml-mr)+'" height="'+(H-mt-mb)+'" fill="transparent"'+
    (opts.onPick?' style="cursor:pointer"':'')+'/>');
  host.innerHTML='<div class="chartwrap"><svg class="trend" viewBox="0 0 '+W+' '+H+'">'+p.join('')+
    '</svg><div class="tip"></div></div>'+(rkey||bKey?'<p class="ckey">'+(rkey?'<span><i aria-hidden="true"></i>'+rkey+'</span>':'')+
      (bKey?'<span><i class="kv" aria-hidden="true"></i>'+bKey+'</span>':'')+'</p>':'');
  var svg=host.querySelector('svg'), tip=host.querySelector('.tip'),
      wrap=host.querySelector('.chartwrap'), xh=host.querySelector('.xh'),
      xl=xh.querySelector('line'), xc=xh.querySelector('circle');
  var hit=host.querySelector('.hit');
  function idxAt(clientX){
    var r=svg.getBoundingClientRect();
    var i=Math.round(((clientX-r.left)/r.width*W-ml)/((W-ml-mr)/(yrs.length-1)));
    return Math.max(0,Math.min(yrs.length-1,i));
  }
  function show(i){
    xh.style.opacity=1;
    var none=values[i]==null;
    xl.setAttribute('x1',x(i)); xl.setAttribute('x2',x(i));
    xc.setAttribute('cx',x(i)); xc.setAttribute('cy',y(none?0:values[i])); xc.style.opacity=none?0:1;
    tip.innerHTML='<div class="ty num">'+yrs[i]+'</div><div class="tl"><span>'+
      esc(opts.name||'Value')+'</span><span class="num">'+(none?'no filing':fmt(values[i]))+'</span></div>'+
      (opts.ref&&opts.ref[i]!=null?'<div class="tl"><span>'+yrs[opts.refFrom]+' at '+yrs[i]+' prices</span><span class="num">about '+(opts.short||PL.fmtM1)(opts.ref[i])+'</span></div>':'');
    tip.style.opacity=1;
    var wx=x(i)/W*wrap.clientWidth;
    tip.style.left=Math.min(Math.max(wx-tip.offsetWidth/2,0),wrap.clientWidth-tip.offsetWidth)+'px';
    tip.style.top='2px';
  }
  function hide(){tip.style.opacity=0;tip.style.left='0px';xh.style.opacity=0;}
  attachScrub(hit,idxAt,show,hide,{pick:opts.onPick,label:(opts.name||'Value')+' by year',read:function(){return tip.textContent;}});
}

function sparkSVG(values,color,sharedMax,brk){   /* brk: draw the reporting-basis break (the Mix panels) */
  var W=200,H=38,max=sharedMax||Math.max.apply(null,values.map(function(v){return v||0;}))||1;
  var x=function(i){return W*(i/(values.length-1));};
  var y=function(v){return H-(H-3)*(v/max)-1.5;};
  /* a year with no filing is a gap in the spark, never a point at $0 */
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+
    '<path d="'+areaRuns(values,x,y,H)+'" fill="var('+color+')" opacity=".12"/>'+
    '<path d="'+pathRuns(values,x,y)+'" fill="none" stroke="var('+color+')" stroke-width="2" vector-effect="non-scaling-stroke"/>'+
    loneRuns(values).map(function(i){return '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(values[i]).toFixed(1)+'" r="2" fill="var('+color+')"/>';}).join('')+
    (brk?PL.sparks.brk(O.years,O.schemaBreak):'')+'</svg>';
}

/* ---- share strip + mini bars, filterable (ported) ---- */
var SHARE_COLORS=['--sch','--cty','--cnt'];
function miniBars(items,total,cssVar,attrKey,activeVal){
  var max=items.reduce(function(m,x){return Math.max(m,x[1]);},0)||1;
  return '<div class="minis">'+items.map(function(x){
    var act=attrKey&&activeVal===x[0];
    return '<div class="sb'+(attrKey?' can':'')+(act?' on':'')+'"'+
        (attrKey?' '+attrKey+'="'+escA(x[0])+'" role="button" tabindex="0"':'')+'>'+
      '<span>'+esc(x[0])+(act?' <b class="onmark">&#10003;</b>':'')+'</span>'+
      '<span class="num">'+money0(x[1])+' <span style="color:var(--faint)">'+
        (total?(x[1]/total*100).toFixed(1):'0')+'%</span></span>'+
      '<span class="t"><i style="width:'+(x[1]/max*100).toFixed(2)+'%;background:var('+cssVar+')"></i></span></div>';
  }).join('')+'</div>';
}
function shareBar(items,total,filterKey,activeVal){
  var head=items.slice(0,3), tail=items.slice(3);
  var parts=head.map(function(x,i){return {label:x[0],v:x[1],css:'var('+SHARE_COLORS[i]+')'};});
  var tv=tail.reduce(function(s,x){return s+x[1];},0);
  if(tv>0) parts.push({label:'All other ('+tail.length+')',v:tv,css:'#bfcac4',mut:1});
  var attr=function(p){
    if(!filterKey||p.mut) return '';
    return ' '+filterKey+'="'+escA(p.label)+'" role="button" tabindex="0"';
  };
  var h='<div class="tb-bar sharebar" style="height:26px;margin:6px 0 10px">'+parts.map(function(p){
    var act=filterKey&&activeVal===p.label;
    return '<i'+attr(p)+(act?' class="on"':'')+' style="width:'+(p.v/total*100).toFixed(2)+
      '%;background:'+p.css+(filterKey&&!p.mut?';cursor:pointer':'')+'" title="'+
      esc(p.label)+' — '+money0(p.v)+' ('+(p.v/total*100).toFixed(1)+'%)"></i>';}).join('')+'</div>';
  h+='<div class="sharelegend">'+parts.map(function(p){
    var act=filterKey&&activeVal===p.label;
    return '<span'+attr(p)+' class="'+(filterKey&&!p.mut?'can ':'')+(act?'on':'')+'"'+
      (p.mut?' style="color:var(--muted)"':'')+'><b style="background:'+p.css+'"></b>'+
      esc(p.label)+(act?' <b class="onmark">&#10003;</b>':'')+
      ' <span class="num">'+money0(p.v)+' · '+(p.v/total*100).toFixed(1)+'%</span></span>';
  }).join('')+'</div>';
  if(tv>0)
    h+='<details class="tailx"><summary>See the '+tail.length+' grouped as “All other”</summary>'+
       miniBars(tail,total,'--exp',filterKey,activeVal)+'</details>';
  return h;
}
function drillHTML(year,sec,label,cssVar){
  var all=flowsFor(year,sec,label);
  if(!all.length) return '';
  var fL2=MODAL.fL2||null, fObj=MODAL.fObj||null;
  var byL2=function(f){return !fL2||FD.l2[f[FI_L2]]===fL2;};
  var byObj=function(f){return !fObj||FD.obj[f[FI_OBJ]]===fObj;};
  var rows=all.filter(function(f){return byL2(f)&&byObj(f);});
  var l2rows=all.filter(byObj), objrows=all.filter(byL2);
  var l2=sumBy(l2rows,'l2',FI_L2), obj=sumBy(objrows,'obj',FI_OBJ);
  var l2t=l2rows.reduce(function(s,f){return s+f[FI_AMT];},0);
  var objt=objrows.reduce(function(s,f){return s+f[FI_AMT];},0);
  var h='';
  if(l2.length>1||(l2.length===1&&l2[0][0]!==label)||fL2)
    h+='<h4>Within '+esc(label)+'</h4>'+miniBars(l2,l2t,cssVar,'data-fl2',fL2);
  if(obj.length>1||fObj)
    h+='<h4>By type of spending</h4>'+shareBar(obj,objt,'data-fobj',fObj);
  var showObj=obj.length>1||(obj.length===1&&obj[0][0]!=='Unclassified');
  var chips='';
  if(fL2) chips+=' <span class="chip-f">'+esc(fL2)+'<button type="button" data-cclear="l2" aria-label="Clear">&#10005;</button></span>';
  if(fObj) chips+=' <span class="chip-f">'+esc(fObj)+'<button type="button" data-cclear="obj" aria-label="Clear">&#10005;</button></span>';
  var countTxt=(fL2||fObj)?rows.length+' of '+all.length:String(all.length);
  h+='<h4>'+countTxt+' account line'+(rows.length===1?'':'s')+chips+
    ' <span style="text-transform:none;letter-spacing:0">— select one for its '+O.years.length+'-year history</span></h4>'+
    '<ul class="pl-rows acct-list">'+
    (function(){
      var sorted=rows.slice().sort(function(a,b){return b[FI_AMT]-a[FI_AMT];}), seen={};
      sorted.forEach(function(f){var k=FD.narr[f[FI_NARR]], fl=(/^[A-Z]+/.exec(f[FI_ACCT]||'')||[''])[0]; (seen[k]||(seen[k]={}))[fl]=1;});
      return sorted.map(function(f){
        var nm=FD.narr[f[FI_NARR]], code=f[FI_ACCT]||'', fl=(/^[A-Z]+/.exec(code)||[''])[0];
        /* one name under two funds (the school's Operation of Plant: general, school lunch, capital) differs only by the fund the code starts with: say which fund, in words */
        var lab=esc(nm)+(Object.keys(seen[nm]).length>1&&fl?' ('+esc((O.fundNames&&O.fundNames[fl])||('fund '+fl))+')':'');
        return '<li><button type="button" class="pl-row" data-acct="'+escA(code)+'" aria-expanded="false">'+
          '<span class="pl-row-l">'+lab+'</span>'+
          '<span class="pl-row-s"><span class="num">'+esc(code)+'</span>'+(showObj?' · '+esc(FD.obj[f[FI_OBJ]]):'')+'</span>'+
          '<span class="pl-row-v num">'+money0(f[FI_AMT])+'</span></button></li>';
      }).join('');
    })()+'</ul>';
  if(!rows.length)
    h+='<p class="lede">Nothing matches both selections — clear one above.</p>';
  h+='<p class="note">Group and line names are the State Comptroller&rsquo;s, for the account codes this government files.</p>';
  return h;
}

/* ---- ranked lists (ported) ----
   opts.hk(x,i): the row's hover-linking key (data-key, the chrome's PL.hl) so a chart mark can light it and it can
   light the chart; 'All other' rows never carry one. Two lines per row: label + figure, then the bar. */
function renderRank(el,items,cssVar,total,onClick,expand,onOther,opts){
  opts=opts||{};
  var max=items.reduce(function(m,x){return Math.max(m,x[1]);},0);
  el.innerHTML=items.map(function(x,i){
    var pct=total?(x[1]/total*100):0;
    var isOther=/^All other/.test(x[0]);
    var clickable=onClick&&!isOther;
    var drillable=expand&&!isOther;
    var otherable=isOther&&onOther;
    var interactive=clickable||drillable||otherable;
    var hk=(opts.hk&&!isOther)?opts.hk(x,i):null;
    return '<div class="rk'+(drillable?' can':'')+(hk?' pl-hl':'')+'"'+
        (hk?' data-key="'+escA(hk)+'"':'')+
        (clickable?' data-rank="'+i+'" style="cursor:pointer"':'')+
        (drillable?' data-exp="'+i+'" aria-expanded="false"':'')+
        (otherable?' data-other="1" style="cursor:pointer"':'')+
        (interactive?' role="button" tabindex="0"':'')+'>'+
      '<span class="lb"'+(isOther?' style="color:var(--muted)"':'')+'>'+esc(x[0])+
        (otherable?' <span class="see">— view all</span>':'')+'</span>'+
      '<span class="vl num"'+(isOther?' style="color:var(--muted)"':'')+'>'+
        '<span class="sh">'+pct.toFixed(1)+'%<span class="pl-vh"> of total</span></span>'+money0(x[1])+'</span>'+
      '<span class="tr"><i'+(isOther?' class="oth"':'')+' style="width:'+(x[1]/max*100).toFixed(2)+'%'+(isOther?'':';background:var('+cssVar+')')+'"></i></span>'+
    '</div>';}).join('');
  if(!el.__wired){
    el.__wired=true;
    el.addEventListener('click',function(e){
      var o=e.target.closest('[data-other]');
      if(o&&el.__other){el.__other(o);return;}
      var d=e.target.closest('[data-exp]');
      if(d&&el.__expand){el.__expand(el.__items[+d.getAttribute('data-exp')],d);return;}
      var t=e.target.closest('[data-rank]');
      if(t&&el.__click) el.__click(el.__items[+t.getAttribute('data-rank')]);
    });
  }
  el.__items=items; el.__click=onClick; el.__expand=expand; el.__other=onOther;
}

/* ---- category modal (ported: breakdown / trend / composition) ---- */
var MODAL={kind:'cat',year:null,sec:0,label:'',color:'--rev',tab:'breakdown',opener:null};
window.__traceEnv=function(){return {openModal:openModal, O:O};};
/* ---- the rail's totals chip: computed from the payload, synchronously. It is never read
   back from a node that is still animating, so it cannot show $0 or a half-counted figure ---- */
(function(){
  var rail=document.querySelector('.rail'), mb=document.getElementById('railMb');
  var hero=document.querySelector('.hcard')||document.querySelector('h1');
  if(!rail||!hero) return;
  var li=O.years.length-1;
  if(mb) mb.querySelector('.mb-s').innerHTML=
    '<b style="color:var(--rev-ink)">'+money0(O.rev[li])+'</b> in &middot; '+
    '<b style="color:var(--exp-ink)">'+money0(O.exp[li])+'</b> out';
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(en){
      rail.classList.toggle('scrolled',!en[0].isIntersecting);
    },{threshold:0}).observe(hero);
  }
})();

/* budget-vs-actual rows expand into a summary: two bars, the detail accounts
   inside the line from the filing, and a trace into the ledger */
(function(){
  var bud=document.getElementById('budget');
  if(!bud) return;
  var BY=O.years[O.years.length-1];
  function money(v){return '$'+Math.round(v).toLocaleString('en-US');}
  function buildX(tr, all){
    var f0=+tr.getAttribute('data-f0'), f1=+tr.getAttribute('data-f1');
    var b=+tr.getAttribute('data-b'), a=+tr.getAttribute('data-a');
    var mx=Math.max(b,a,1);
    var det=[];
    O.flows.forEach(function(f){
      if(f[0]!==BY||f[1]!==1) return;
      var code=String(f[6]||'');
      if(code.replace(/[^A-Z]/gi,'').toUpperCase()!=='A') return;
      var d=code.replace(/[^0-9]/g,'');
      var fn=+d.slice(0,4);
      if(!(fn>=f0&&fn<f1)) return;
      det.push([code,O.dict.narr[f[5]]||'',f[7]]);
    });
    det.sort(function(x,y){return Math.abs(y[2])-Math.abs(x[2]);});
    var top=all?det:det.slice(0,6);
    var rest=det.length-top.length;
    var h='<div class="bxbars">'+
      '<div class="bxb"><span class="l">Budgeted</span><span class="bar">'+
        '<i style="width:'+(100*b/mx).toFixed(1)+'%;background:var(--faint)"></i></span>'+
        '<span class="v num">'+money(b)+'</span></div>'+
      '<div class="bxb"><span class="l">Actual</span><span class="bar">'+
        '<i style="width:'+(100*a/mx).toFixed(1)+'%;background:var(--ink)"></i></span>'+
        '<span class="v num">'+money(a)+'</span></div></div>';
    if(top.length){
      h+='<div class="bxh">Inside this line &middot; '+BY+' filing</div>';
      top.forEach(function(r2){
        h+='<div class="bxr" data-code="'+r2[0]+'" tabindex="0" role="button">'+
          '<span class="c num">'+r2[0]+'</span><span class="n">'+
          String(r2[1]).replace(/&/g,'&amp;').replace(/</g,'&lt;')+
          '</span><span class="a num">'+money(r2[2])+'</span><span class="go">&rsaquo;</span></div>';
      });
      if(rest>0) h+='<button class="bxmore" type="button">Show all '+det.length+' accounts in this range</button>';
      h+='<div class="bxnote">Amounts are the filed actuals. Select any account to open its '+
         '31-year history.</div>';
    } else {
      h+='<div class="bxnote">No detail accounts in this range in the '+BY+' filing.</div>';
    }
    return h;
  }
  bud.addEventListener('click',function(e){
    var more=e.target.closest('.bxmore');
    if(more){
      var xrow=more.closest('tr.bvx-row');
      var src=xrow.previousElementSibling;
      xrow.querySelector('.bvx').innerHTML=buildX(src,true);
      return;
    }
    var bxr=e.target.closest('.bxr[data-code]');
    if(bxr){
      var code=bxr.getAttribute('data-code');
      var fund=code.replace(/[^A-Z]/gi,'').toUpperCase();
      var fn=code.replace(/[^0-9]/g,'').slice(0,4);
      traceAcct('#acct-'+fund+fn);
      return;
    }
    var tr=e.target.closest('tr.bv'); if(!tr) return;
    var nxt=tr.nextElementSibling;
    if(nxt&&nxt.classList.contains('bvx-row')){
      nxt.remove(); tr.setAttribute('aria-expanded','false'); return;
    }
    var row=document.createElement('tr');
    row.className='bvx-row';
    row.innerHTML='<td colspan="5"><div class="bvx">'+buildX(tr)+'</div></td>';
    tr.parentNode.insertBefore(row,tr.nextSibling);
    tr.setAttribute('aria-expanded','true');
  });
  bud.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ') return;
    var tr=e.target.closest('tr.bv'); if(!tr) return;
    e.preventDefault(); tr.click();
  });
})();

/* the drill-down is a real layer: opening it pushes a history entry (so Back closes the
   sheet instead of leaving the site), and everything behind it is inert while it is open */
var BEHIND='.page';
/* Back closes the sheet (the chrome's 'layer' contract): opening pushes ONE entry, a reader's close pops it, and Back while it is
   open closes it without leaving the page */
var LAYER=PL.layer({isOpen:function(){var m=document.getElementById('modal');return !!m&&!m.hidden;},hide:function(){closeModal(true);},
  /* a pop landed: the entry under it takes the page's address now - a closed sheet's (arrival) address goes; an open sheet's
     is its category and tab as they are, so the hashchange the landing fires finds the sheet already open */
  landed:function(){if(document.getElementById('modal').hidden){if(/^#(cat=|cmp=|acct-)/.test(location.hash))hashReplace('');}
    else if(MODAL.kind==='cat')hashReplace(catHash());}});
/* exit and return (10-07): window.__plArriving is set while a sheet opens from the address the page arrived with */
function showModal(hash){
  var m=document.getElementById('modal'), was=m.hidden;
  m.hidden=false;
  document.body.style.overflow='hidden';
  [].forEach.call(document.querySelectorAll(BEHIND),function(n){n.setAttribute('inert','');});
  if(was){ if(window.__plArriving&&!LAYER.pushed) hashReplace(hash||''); else LAYER.push(hash); }   /* an arrival sheet adds no entry */
}
function closeModal(fromPop){
  var m=document.getElementById('modal');
  if(m.hidden) return;
  m.hidden=true;
  document.body.style.overflow='';
  [].forEach.call(document.querySelectorAll(BEHIND),function(n){n.removeAttribute('inert');});
  if(fromPop!==true&&!LAYER.pop()) hashReplace('');   /* an arrival sheet held no entry: its address goes with it */
  if(MODAL.opener&&MODAL.opener.hasAttribute&&MODAL.opener.hasAttribute('aria-expanded')) MODAL.opener.setAttribute('aria-expanded','false');
  if(MODAL.opener&&MODAL.opener.focus) MODAL.opener.focus();
}
function tabButtons(){
  return '<button type="button" role="tab" data-tab="breakdown" aria-selected="true" tabindex="0"><span class="tl-l">Breakdown</span><span class="tl-s">Lines</span></button>'+
    '<button type="button" role="tab" data-tab="trend" aria-selected="false" tabindex="-1">Trend</button>'+
    '<button type="button" role="tab" data-tab="composition" aria-selected="false" tabindex="-1"><span class="tl-l">Composition</span><span class="tl-s">Mix</span></button>'+'<button type="button" role="tab" data-tab="across" aria-selected="false" tabindex="-1"><span class="tl-l">Across the county</span><span class="tl-s">County</span></button>';
}
function selectTab(name,focus){
  [].forEach.call(document.querySelectorAll('#mTabs button'),function(x){
    var on=x.dataset.tab===name;x.setAttribute('aria-selected',on?'true':'false');x.setAttribute('tabindex',on?'0':'-1');
    if(on&&focus) x.focus();});
  renderTab(name);
}
function openModal(year,sec,label,cssVar,opener){
  MODAL.kind='cat';
  MODAL.year=year;MODAL.sec=sec;MODAL.label=label;MODAL.color=cssVar;
  MODAL.tab='breakdown';MODAL.opener=opener||null;
  MODAL.fL2=null;MODAL.fObj=null;
  if(opener&&opener.hasAttribute&&opener.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded','true');   /* the row that opened the sheet shows it: the selected state, the chevron turned */
  document.getElementById('mTabs').innerHTML=tabButtons();
  var rows=flowsFor(year,sec,label);
  var total=rows.reduce(function(s,f){return s+f[FI_AMT];},0);
  var secTot=sectionSeries(sec)[O.years.indexOf(year)]||0;
  document.getElementById('mEyebrow').textContent=(sec?'Expenditure':'Revenue')+' · '+year+' filing · Barker';
  document.getElementById('mTitle').textContent=label;
  document.getElementById('mBig').innerHTML='<span class="num">'+money0(total)+'</span> '+
    '<span>'+(secTot?(total/secTot*100).toFixed(1):'0')+'% of '+(sec?'expenditure':'revenue')+'</span>';
  if(!total){                                         /* never '$0 · 0.0%' over a category no longer filed (Fable r7) */
    var sv=seriesFor(sec,label), lf=-1; for(var q=O.years.indexOf(year);q>=0;q--) if(sv[q]>0){ lf=q; break; }
    if(lf>=0) document.getElementById('mBig').innerHTML='<span>Nothing filed in '+year+'; last filed '+O.years[lf]+':</span> <span class="num">'+money0(sv[lf])+'</span>';
  }
  showModal('#cat='+sec+'|'+encodeURIComponent(label));      /* the open drill-down has its own address */
  /* a category filed as one line has nothing to break down: open on its history instead */
  var first=(rows.length<=1&&sumBy(rows,'l2',FI_L2).length<=1)?'trend':'breakdown';
  selectTab(first,!!opener);
  if(!opener){ var shf=document.querySelector('#modal .sheet'); if(shf){ shf.setAttribute('tabindex','-1'); shf.focus({preventScroll:true}); } }   /* an arrival: no focus ring (Fable r7) */
}
function renderTab(tab){
  MODAL.tab=tab;
  if(MODAL.kind==='cat') hashReplace(catHash());
  var body=document.getElementById('mBody');
  var yr=MODAL.year, sec=MODAL.sec, label=MODAL.label, col=MODAL.color;

  if(tab==='breakdown'){
    body.innerHTML=drillHTML(yr,sec,label,col)||'<p class="lede">No detail filed for this category.</p>';
    return;
  }
  if(tab==='trend'){
    /* the Trend tab is the chrome's (PL.trendTab, one implementation with the county family); the page lends its series,
       its chart and its account lines */
    var rowsAt=function(i){
      if(i<1) return [];
      var cur={}, was={}, keys={};
      flowsFor(O.years[i],sec,label).forEach(function(f){ var k=f[FI_NARR]+'|'+f[FI_ACCT]; cur[k]=(cur[k]||0)+f[FI_AMT]; });
      flowsFor(O.years[i-1],sec,label).forEach(function(f){ var k=f[FI_NARR]+'|'+f[FI_ACCT]; was[k]=(was[k]||0)+f[FI_AMT]; });
      Object.keys(cur).forEach(function(k){ keys[k]=1; }); Object.keys(was).forEach(function(k){ keys[k]=1; });
      return Object.keys(keys).map(function(k){ var c=cur[k]||0, w=was[k]||0;
        return {narr:FD.narr[+k.split('|')[0]], acct:k.split('|')[1], cur:c, was:w, d:c-w}; })
        .sort(function(a,b){ return Math.abs(b.d)-Math.abs(a.d); });
    };
    PL.trendTab({body:body, label:label, sec:sec, years:O.years, brk:O.schemaBreak, cpi:O.cpi, pop:O.pop||null,
      vals:seriesFor(sec,label), tot:sectionSeries(sec), col:col, of:sec?'total spending':'total revenue', esc:esc, renderLine:renderLine, rowsAt:rowsAt, state:MODAL});
    return;
  }
  if(tab==='across'){ renderAcross(body,sec,label); return; }
  var subs=subSeriesFor(sec,label);
  if(subs.length<2){
    body.innerHTML='<p class="lede">'+esc(label)+' is filed as a single line — there are no '+
      'sub-categories to compare over time. The Trend tab shows its history.</p>';
    return;
  }
  var iLast=O.years.length-1;
  /* one shared scale by default (small multiples that can be compared), each panel's own on request;
     a part whose last five filings are all zero folds to one line that names its last non-zero year */
  var live=subs.filter(function(s){return s.values.slice(-5).some(function(v){return v>0;});});
  var dead=subs.filter(function(s){return live.indexOf(s)<0;});
  var sharedMax=live.reduce(function(m,s){return Math.max(m,Math.max.apply(null,s.values));},0)||1;
  var own=!!MODAL.ownScale;
  body.innerHTML='<h4>Each part of '+esc(label)+', '+O.years[0]+'–'+O.years[iLast]+
      ' <span style="text-transform:none;letter-spacing:0;font-weight:400">&middot; slide or hover across a panel to read any year</span></h4>'+
    (live.length>1?'<div class="seg" id="mixSeg" role="group" aria-label="Scale"><button type="button" data-own="0" aria-pressed="'+(own?'false':'true')+'">One shared scale</button>'+
      '<button type="button" data-own="1" aria-pressed="'+(own?'true':'false')+'">Each to itself</button></div>':'')+
    '<div class="small" id="mixPanels">'+live.map(function(s){
      var f=s.values.findIndex(function(v){return v>0;});
      return '<div class="sm"><div class="n">'+esc(s.label)+'</div>'+
        '<div class="v num">'+money0(s.last)+' <span style="color:var(--faint)">'+
          pctChange(f>=0?s.values[f]:0,s.last)+' since '+(f>=0?O.years[f]:O.years[0])+'</span></div>'+
        '<div class="spw" style="color:var('+MODAL.color+')">'+sparkSVG(s.values,MODAL.color,own?null:sharedMax,true)+'</div>'+
        PL.sparks.axis(O.years,O.schemaBreak)+'</div>';
    }).join('')+'</div>'+
    (dead.length?'<h4>No longer filed</h4><div class="minis">'+dead.map(function(s){
      var li=-1;for(var q=s.values.length-1;q>=0;q--){if(s.values[q]>0){li=q;break;}}
      return '<div class="sb"><span>'+esc(s.label)+'</span><span class="num" style="color:var(--muted)">'+
        (li<0?'never above zero':'last non-zero filing '+O.years[li]+' ('+money0(s.values[li])+')')+'</span></div>';}).join('')+'</div>':'')+
    '<p class="note">'+(own?'Each panel is scaled to its own maximum: read the shape and the figures, not the relative heights.'
      :'Every panel shares one scale (its top is '+money0(sharedMax)+'), so heights compare across panels.')+
      (O.years.indexOf(O.schemaBreak)>0?' The dashed line is the '+O.schemaBreak+' reporting-basis change.':'')+'</p>';
  /* read together: one year across every panel (the chrome's PL.sparks) */
  var mels=document.querySelectorAll('#mixPanels .sm');
  PL.sparks(live.map(function(s,k){ return {el:mels[k], values:s.values,
      max:own?(Math.max.apply(null,s.values.map(function(v){return v||0;}))||1):sharedMax}; }),
    O.years, function(v,yr){ return '<b>'+yr+'</b>'+(v==null?'not reported':money0(v)); });
  var ms=document.getElementById('mixSeg');
  if(ms) ms.addEventListener('click',function(e){var b=e.target.closest('button[data-own]');if(!b)return;
    MODAL.ownScale=b.getAttribute('data-own')==='1';renderTab('composition');});
}

/* ---- across the county: the same category, every government ---- */
/* every government's m/ page honours '#cat=' (North Tonawanda's too: its filings-in-the-county twin is the
   like-for-like comparison; the full city ledger at the site root has no category address) */
function acrossHref(slug,sec,label){
  return slug+'.html#cat='+sec+'|'+encodeURIComponent(label);
}
function renderAcross(body,sec,label,mini){
  var rows=((O.xc||{})[String(sec)]||{})[label]||[];
  var here={}; rows.forEach(function(r){here[r[5]]=1;});
  var zeros=(O.xcAll||[]).filter(function(a){return !here[a[4]];});
  var per=function(r){return r[2]/r[3];};
  var self=null, rank=0;
  rows.forEach(function(r,i){ if(r[5]===O.selfSlug){self=r;rank=i+1;} });
  var med=0;
  if(rows.length){ var ps=rows.map(per).slice().sort(function(a,b){return a-b;});
    med=ps[Math.floor(ps.length/2)]; }
  var max=rows.length?per(rows[0]):1;
  var h='<div class="mstats">'+
    '<div class="mstat"><div class="k">'+esc(O.selfShort)+'</div><div class="v num">'+
      (self?'$'+Math.round(per(self)).toLocaleString('en-US')+'<span style="font-size:var(--fs-13);line-height:var(--lh-16);color:var(--muted)"> per resident</span>':'no filing')+'</div></div>'+
    '<div class="mstat"><div class="k">Rank</div><div class="v num">'+
      (self?rank+' of '+rows.length:'—')+'</div></div>'+
    '<div class="mstat"><div class="k">Median</div><div class="v num">$'+
      Math.round(med).toLocaleString('en-US')+'</div></div>'+
    '<div class="mstat"><div class="k">Who filed it</div><div class="v" style="font-size:var(--fs-17);line-height:var(--lh-24)">'+
      (zeros.length?zeros.length+' of the '+(O.xcAll||[]).length+' governments did not':'Every one of the '+(O.xcAll||[]).length+' governments filed')+'</div></div>'+
  '</div>';
  var shown=mini?rows.filter(function(r,i){return i<4||r[5]===O.selfSlug;}):rows;
  h+=(mini?'<div style="height:10px"></div>':'<h4>'+esc(label)+' per resident — every government that files it</h4>')+'<div class="rank">'+
    shown.map(function(r){
      var me=r[5]===O.selfSlug, pv=per(r);
      var inner='<span class="lb"'+(me?' style="font-weight:700"':' style="color:var(--muted)"')+'>'+
        esc(r[0])+' <span class="clsch">'+r[1].toUpperCase()+'</span>'+(me?' <span class="fnt">this government</span>':'')+'</span>'+
        '<span class="vl num"'+(me?'':' style="color:var(--muted)"')+'>$'+Math.round(pv).toLocaleString('en-US')+'</span>'+
        '<span class="tr"><i style="width:'+(pv/max*100).toFixed(1)+'%;background:'+
          (me?'var(--exp)':'var(--rule-strong)')+'"></i></span>'+
        (mini?'':'<span class="pc"><span class="num">$'+Math.round(r[2]).toLocaleString('en-US')+'</span> total · '+r[4]+' · <span class="num">'+r[3].toLocaleString('en-US')+'</span> residents (2020 Census)</span>');
      return me?'<div class="rk">'+inner+'</div>'
        :'<a class="rk can" href="'+escA(acrossHref(r[5],sec,label))+'">'+inner+'</a>';
    }).join('')+'</div>';
  if(mini&&shown.length<rows.length)
    h+='<p class="note">Showing '+shown.length+' of '+rows.length+' governments that file this category — open it for all of them.</p>';
  if(!mini&&zeros.length)
    h+='<p class="note">Governments with nothing reported on this line (or zero): '+zeros.map(function(a){return esc(a[0]);}).join(', ')+
       '. Nothing reported usually means the county, a district or another layer runs that service there.</p>';
  h+=mini?'<p class="note">Differences reflect <b>who runs the service</b>, not who runs it efficiently. Each figure is that '+
     'government&rsquo;s own latest filing; populations are the 2020 Census.</p>'
    :'<p class="note">Differences reflect <b>who runs the service</b>, not who runs it efficiently — '+
     'service levels and structures differ. Each figure is that government&rsquo;s own latest filing. Populations are the 2020 Census, via New York State&rsquo;s official mirror (data.ny.gov sxhg-qquj, retrieved July 31, 2026).</p>';
  body.innerHTML=h;
}

/* ---- the on-page 'Across the county' panel: this government's biggest spend, ranked against every filer ---- */
(function(){
  var panel=document.getElementById('acrossPanel'); if(!panel) return;
  var li=O.years.length-1, list=O.expByYear[String(O.years[li])]||[];
  if(!list.length) return;
  var label=list[0][0];
  panel.hidden=false;
  document.getElementById('acTitle').textContent='Across the county · '+label;
  document.getElementById('acSub').textContent='This government’s biggest spending category in its '+O.years[li]+
    ' filing, per resident, against every government that files it.';
  renderAcross(document.getElementById('acBody'),1,label,true);
  document.getElementById('acOpen').addEventListener('click',function(e){
    openModal(O.years[li],1,label,'--exp',e.currentTarget); selectTab('across',true);});
})();

/* ---- per-account history (ported; county general ledger) ---- */
/* Plain-English guide to the recurring state account codes - hand-curated,
   simplified, and silent where a code is not confidently known. */
var GLOSS={
 '1001':'The property-tax levy - the amount raised directly on taxable property.',
 '1081':'Payments in lieu of taxes (PILOTs) from tax-exempt or IDA-abated properties.',
 '1090':'Interest and penalties collected on late property taxes.',
 '1120':'This government\u2019s share of the county\u2019s sales-tax distribution.',
 '2401':'Interest earned on the government\u2019s own deposits and investments.',
 '2610':'Fines and forfeited bail from courts and violations.',
 '2650':'Proceeds from selling scrap and surplus equipment.',
 '2680':'Insurance recoveries - claim payouts received for losses.',
 '2701':'Refunds of money spent in earlier years.',
 '2770':'The state\u2019s catch-all account - its own name says \u201c(specify)\u201d.',
 '3001':'State revenue sharing (AIM) - general unrestricted state aid.',
 '3005':'Mortgage tax - the county-collected tax on recorded mortgages, shared out.',
 '3110':'The sheriff\u2019s office - county law enforcement.',
 '3150':'The county jail.',
 '4310':'Mental-health administration.',
 '4322':'Contracted community mental-health program services.',
 '6010':'Social-services administration.',
 '6100':'Medicaid - the county\u2019s share of program payments.',
 '6140':'Safety-net assistance - locally funded public assistance.',
 '1165':'The district attorney\u2019s office.',
 '3101':'Basic Formula (Foundation) Aid - the state\u2019s main school operating aid, set by a statewide formula from enrollment, district wealth and student need.',
 '3102':'Lottery Aid - the same foundation aid stream, funded from lottery receipts; a budget label, not extra money.',
 '3103':'BOCES Aid - state reimbursement for shared-service costs run through BOCES.',
 '3190':'State aid for the school lunch program.',
 '3289':'Other state education aid outside the main formulas.',
 '3501':'CHIPS - the state\u2019s Consolidated Highway Improvement aid for local roads.',
 '2110':'Teaching, regular school - classroom instruction salaries and costs.',
 '2250':'Programs for students with disabilities.',
 '5510':'Pupil transportation run by the district itself.',
 '5540':'Pupil transportation bought from contractors.',
 '1620':'Operating public buildings - custodians, utilities, upkeep.',
 '1910':'Unallocated insurance - premiums not charged to one department.',
 '1930':'Judgments and claims paid against the government.',
 '3120':'The police department.',
 '3410':'The fire department.',
 '5110':'Street maintenance - paving, patching, everyday road work.',
 '5142':'Snow removal.',
 '8120':'Sewer collection - the pipes.',
 '8130':'Sewage treatment - the plant.',
 '8320':'Water source, supply and pumping.',
 '8330':'Water purification.',
 '8160':'Refuse and garbage collection.',
 '9010':'Employer contributions to the state retirement system (ERS).',
 '9015':'Employer contributions to the police and fire retirement system.',
 '9030':'Social Security - the employer\u2019s FICA share.',
 '9040':'Workers\u2019 compensation.',
 '9060':'Hospital and medical insurance for employees and retirees.',
 '9710':'Serial bonds - principal and interest on long-term borrowing.',
 '9901':'Transfers to other funds - internal moves, not outside spending.',
 '9950':'Transfers to capital project funds - internal moves, not outside spending.'
};
/* codes that mean different things on the revenue vs spending side */
var GLOSS2={
 '1170':{r:'Franchise fees - what utilities and cable pay to use public rights-of-way.',
         e:'The public defender\u2019s office.'}
};
function glossFor(code,sec){
  var d=(code||'').replace(/[^0-9]/g,'');
  if(d.length<4) return null;
  var fn=d.slice(0,4);
  if(GLOSS2[fn]){
    if(sec===0||sec==='r') return GLOSS2[fn].r;
    if(sec===1||sec==='e') return GLOSS2[fn].e;
    return null;  /* side unknown - say nothing rather than guess */
  }
  return GLOSS[fn]||null;
}

function acctHistory(tr){
  /* the row is a .pl-row button; its history opens under it (aria-expanded + the turned chevron are the open state) */
  var li=tr.parentNode, open=li.querySelector('.acct-hist');
  if(open){open.remove();tr.setAttribute('aria-expanded','false');hashReplace(catHash());return;}
  var already=document.querySelector('#mBody .acct-hist');
  if(already){var ab=already.parentNode.querySelector('[data-acct]');if(ab) ab.setAttribute('aria-expanded','false');already.remove();}
  var code=tr.getAttribute('data-acct');
  var vals=O.years.map(function(){return null;});          /* null = no row that year: a gap, not $0 */
  var narr='';
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_SEC]===MODAL.sec&&f[FI_ACCT]===code){
      var yi=O.years.indexOf(f[FI_YR]);
      vals[yi]=(vals[yi]||0)+f[FI_AMT];
      narr=FD.narr[f[FI_NARR]];
    }
  }
  var iN=vals.length-1, latest=vals[iN];
  var prior=vals.slice(0,iN).filter(function(v){return v>0;}).sort(function(a,b){return a-b;});
  var med=prior.length?prior[Math.floor(prior.length/2)]:0;
  var firstIdx=vals.findIndex(function(v){return v>0;});
  var read='';
  if(med>0&&latest>0){
    var ratio=latest/med;
    read='FY'+O.years[iN]+': <b class="num">'+money0(latest)+'</b> — '+
      (ratio>=1?ratio.toFixed(1)+'&times;':(1/ratio).toFixed(1)+'&times; below')+
      ' the prior-year median ('+money0(med)+').';
    if(ratio>=3&&latest>=50000) read='FY'+O.years[iN]+': <b class="num">'+money0(latest)+'</b> — <b>'+ratio.toFixed(1)+'&times; its usual level</b> (the prior-year median is '+money0(med)+').';
  } else if(latest>0){
    read='FY'+O.years[iN]+': <b class="num">'+money0(latest)+'</b> — no meaningful prior history.';
  } else {
    var lk=-1; for(var q=iN;q>=0;q--) if(vals[q]>0){ lk=q; break; }   /* a line no longer filed: when it was, and that nothing came after */
    if(lk>=0) read='Last filed FY'+O.years[lk]+': <b class="num">'+money0(vals[lk])+'</b>. Nothing since.';
  }
  if(firstIdx>0) read+=' First appears FY'+O.years[firstIdx]+'.';
  var g=glossFor(code, MODAL.sec);
  if(g) read+='<span class="gloss">What this is: '+g+'</span>';
  if(/Unclassified/i.test(narr))
    read+=' The 2770-series is the state&rsquo;s catch-all — its own name says <i>&ldquo;(specify)&rdquo;</i>, '+
      'so a large or growing balance is a standard audit question. The itemization lives in the '+
      'county&rsquo;s general ledger, one request away.';
  var row=document.createElement('div');
  row.className='acct-hist';
  row.innerHTML='<div class="ah-chart"></div><p class="fnt" style="margin:8px 0 0;max-width:76ch">'+read+'</p>';
  li.appendChild(row);
  tr.setAttribute('aria-expanded','true');
  renderLine(row.querySelector('.ah-chart'),vals,{color:MODAL.color,name:code,h:170});
  LAYER.sub(row,function(){ row.remove(); tr.setAttribute('aria-expanded','false'); hashReplace(catHash()); });   /* Back closes this history first; the sheet stays (Fable r8) */
  /* the open account has the address Every resolution (decisions.html) already uses (#acct-<fund><function>) */
  var am=/^([A-Z]{1,3})(\d{4})/.exec(code||''); if(am) hashReplace('#acct-'+am[1]+am[2]);
}

/* ---- modal wiring ---- */
(function(){
  document.getElementById('mBody').addEventListener('click',function(e){
    if(MODAL.kind==='cat'&&MODAL.tab==='breakdown'){
      var cc=e.target.closest('[data-cclear]');
      if(cc){if(cc.getAttribute('data-cclear')==='l2')MODAL.fL2=null;else MODAL.fObj=null;
        renderTab('breakdown');return;}
      var f2=e.target.closest('[data-fl2]');
      if(f2){var v2=f2.getAttribute('data-fl2');
        MODAL.fL2=(MODAL.fL2===v2)?null:v2;renderTab('breakdown');return;}
      var fo=e.target.closest('[data-fobj]');
      if(fo){var vo=fo.getAttribute('data-fobj');
        MODAL.fObj=(MODAL.fObj===vo)?null:vo;renderTab('breakdown');return;}
    }
    if(MODAL.kind==='compare'){
      var mv=e.target.closest('tr[data-mvlabel]');
      if(mv){
        var lbl=mv.getAttribute('data-mvlabel'), ms=+mv.getAttribute('data-mvsec');
        var toYear=+document.getElementById('cmpB').value;
        openModal(toYear, ms, lbl, ms?'--exp':'--rev', null);
        selectTab('trend');
        return;
      }
    }
    var tr=e.target.closest('[data-acct]');
    if(tr) acctHistory(tr);
  });
  document.getElementById('mTabs').addEventListener('click',function(e){
    var b=e.target.closest('button[data-tab]');if(!b)return;
    selectTab(b.dataset.tab);
  });
  document.getElementById('mTabs').addEventListener('keydown',function(e){
    var k=e.key; if(k!=='ArrowRight'&&k!=='ArrowLeft'&&k!=='Home'&&k!=='End') return;
    var bs=[].slice.call(this.querySelectorAll('button')), i=bs.indexOf(document.activeElement); if(i<0) return;
    e.preventDefault();
    var n=k==='Home'?0:k==='End'?bs.length-1:(i+(k==='ArrowRight'?1:bs.length-1))%bs.length;
    selectTab(bs[n].dataset.tab,true);
  });
  document.getElementById('modal').addEventListener('click',function(e){
    if(e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!document.getElementById('modal').hidden) closeModal();
  });
})();

/* ---- phone: drag the sheet's header down to dismiss it ---- */
(function(){
  var sheet=document.querySelector('#modal .sheet'), hd=sheet&&sheet.querySelector('header');
  if(!hd) return;
  var phone=window.matchMedia('(max-width:640px)');
  var y0=null,dy=0,pid=null;
  hd.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse'||!phone.matches||e.target.closest('button')) return;
    y0=e.clientY;dy=0;pid=e.pointerId;try{hd.setPointerCapture(pid);}catch(x){}
  });
  hd.addEventListener('pointermove',function(e){
    if(y0===null||e.pointerId!==pid) return;
    dy=Math.max(0,e.clientY-y0);sheet.style.transition='none';sheet.style.transform='translateY('+dy+'px)';
  });
  function end(){
    if(y0===null) return;
    var far=dy>110;y0=null;sheet.style.transition='transform .18s ease';
    if(far){sheet.style.transform='translateY(100%)';
      setTimeout(function(){sheet.style.transform='';sheet.style.transition='';closeModal();},170);}
    else{sheet.style.transform='';setTimeout(function(){sheet.style.transition='';},200);}
  }
  hd.addEventListener('pointerup',end);hd.addEventListener('pointercancel',end);
})();


/* ---- compare two years, in the modal ---- */
function catTotals(sec,yr){
  var m={};
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_YR]!==yr||f[FI_SEC]!==sec) continue;
    var k=FD.l1[f[FI_L1]];
    m[k]=(m[k]||0)+f[FI_AMT];
  }
  return m;
}
function movers(sec,a,b){
  var A=catTotals(sec,a),B=catTotals(sec,b),keys={};
  Object.keys(A).forEach(function(k){keys[k]=1;});Object.keys(B).forEach(function(k){keys[k]=1;});
  return Object.keys(keys).map(function(k){
    var av=A[k]||0,bv=B[k]||0;
    return {k:k,a:av,b:bv,d:bv-av,pct:av?(bv-av)/av*100:(bv?null:0)};
  }).sort(function(x,y){return Math.abs(y.d)-Math.abs(x.d);});
}
/* 'As filed' is the default. When a one-time item (debt proceeds) moves the revenue headline,
   the pair says so in its own words and offers - opt-in - the same pair without it. */
var dbtOff=false;
function debtLabel(){var k=null;(FD.l1||[]).forEach(function(l){if(/^proceeds of (debt|obligations)/i.test(l)) k=l;});return k;}
function renderCompare(){
  var a=+document.getElementById('cmpA').value, b=+document.getElementById('cmpB').value;
  var ia=O.years.indexOf(a), ib=O.years.indexOf(b);
  var out=document.getElementById('cmpOut');
  if(ia<0||ib<0||a===b){out.innerHTML='<p class="lede">Pick two different years.</p>';return;}
  var revA=O.rev[ia],revB=O.rev[ib],expA=O.exp[ia],expB=O.exp[ib];
  var DL=debtLabel(), dA=0, dB=0;
  if(DL){var cA=catTotals(0,a), cB=catTotals(0,b); dA=cA[DL]||0; dB=cB[DL]||0;}
  var asked=DL&&Math.abs(dB-dA)>=1000000&&Math.abs(dB-dA)>=0.25*Math.abs(revB-revA);
  var off=asked&&dbtOff;
  var rA=off?revA-dA:revA, rB=off?revB-dB:revB;
  var netA=rA-expA,netB=rB-expB;
  var revGrowth=rA?(rB-rA)/rA*100:0;
  var expGrowth=expA?(expB-expA)/expA*100:0;
  var sign=function(v){return sgn(v)+money0(Math.abs(v));};
  var pc=function(v){return (v>=0?'+':'−')+Math.abs(v).toFixed(1)+'%';};
  var swing=
    '<div class="swing">'+
      '<div class="sw"><div class="k">Revenue'+(off?' (no debt proceeds)':'')+'</div><div class="v num" style="color:var(--rev-ink)">'+sign(rB-rA)+
        '</div><div class="n num">'+pc(revGrowth)+' · '+money0(rA)+' → '+money0(rB)+'</div></div>'+
      '<div class="sw"><div class="k">Expenditure</div><div class="v num" style="color:var(--exp-ink)">'+sign(expB-expA)+
        '</div><div class="n num">'+pc(expGrowth)+' · '+money0(expA)+' → '+money0(expB)+'</div></div>'+
      '<div class="sw"><div class="k">'+a+' net</div><div class="v num">'+sign(netA)+
        '</div><div class="n">'+(netA<0?'filing gap':'surplus')+'</div></div>'+
      '<div class="sw"><div class="k">'+b+' net</div><div class="v num">'+sign(netB)+
        '</div><div class="n">'+(netB<0?'filing gap':'surplus')+'</div></div>'+
    '</div>';
  var dbt='';
  if(asked){
    dbt='<p class="dbt">'+(off
      ?'<b>Debt proceeds removed.</b> Revenue is shown without the '+money0(dA)+' ('+a+') and '+money0(dB)+' ('+b+') of debt proceeds; spending is unchanged, so the debt-financed outlay stays in it.'
      :'<b>Debt proceeds moved this pair:</b> revenue includes '+money0(dA)+' in '+a+' and '+money0(dB)+' in '+b+'.')+
      '<button class="pill" id="dbtToggle" type="button">'+(off?'Show as filed':'Show without debt proceeds')+'</button></p>';
  }
  var line='Between '+a+' and '+b+', revenue '+(rB>=rA?'rose':'fell')+' '+
    Math.abs(revGrowth).toFixed(1)+'% while spending '+(expB>=expA?'rose':'fell')+' '+
    Math.abs(expGrowth).toFixed(1)+'%. The bottom line moved '+sign(netB-netA)+', from '+
    money0(netA)+' to '+money0(netB)+'. ';
  line+=expGrowth>revGrowth
    ?'<b>Spending grew faster than revenue</b> — the categories marked below are the ones that outpaced it.'
    :'Revenue grew at least as fast as spending over this pair.';
  if((a<O.schemaBreak)!==(b<O.schemaBreak))
    line+=' <b>These two years sit on different reporting bases</b> (the Comptroller changed its reporting schema in '+
          O.schemaBreak+'), so part of any change here is definitional rather than real.';
  function table(sec,label,wrapId){
    var rows=movers(sec,a,b).filter(function(m){return Math.abs(m.d)>=5000&&!(off&&sec===0&&m.k===DL);}).slice(0,8);
    if(!rows.length) return '';
    var mx=rows.reduce(function(s,m){return Math.max(s,Math.abs(m.d));},0);
    return '<div id="'+wrapId+'"><h4 style="margin:18px 0 8px">'+label+'</h4>'+
      '<table class="mv"><caption class="pl-vh">'+label+', '+a+' to '+b+'</caption><thead><tr><th scope="col">Category</th><th scope="col" class="r">'+a+'</th><th scope="col" class="r">'+b+
      '</th><th scope="col" class="r">Change</th><th scope="col" class="r">%</th><th scope="col" class="m-dev">down &#9666; &#9656; up</th></tr></thead><tbody>'+
      rows.map(function(m){
        var outpaced=sec===1&&m.pct!==null&&m.d>0&&m.pct>revGrowth;
        return '<tr data-mvlabel="'+escA(m.k)+'" data-mvsec="'+sec+'" role="button" tabindex="0" title="Open — full history and drill"><td class="m-name">'+esc(m.k)+
            (outpaced?'<span class="flag">OUTPACED REVENUE</span>':'')+'</td>'+
          '<td class="r num m-vals" data-l="'+a+'">'+money0(m.a)+'</td>'+
          '<td class="r num m-vals" data-l="'+b+'">'+money0(m.b)+'</td>'+
          '<td class="r num m-delta '+(m.d<0?'dn':'up')+'">'+arrowGlyph(m.d)+sign(m.d)+'</td>'+
          '<td class="r num m-pct '+(m.d<0?'dn':'up')+'">'+(m.pct===null?'new':(m.pct>=0?'+':'−')+Math.abs(m.pct).toFixed(0)+'%')+'</td>'+
          '<td class="m-dev">'+dvBar(m.d,mx)+'</td></tr>';
      }).join('')+'</tbody></table></div>';
  }
  out.innerHTML=swing+dbt+'<p class="verdictline">'+line+'</p>'+
    table(1,'Expenditure movers','mvExpWrap')+table(0,'Revenue movers','mvRevWrap');
  var tg=document.getElementById('dbtToggle');
  if(tg) tg.addEventListener('click',function(){dbtOff=!dbtOff;renderCompare();});
}
var cmpYearA=null,cmpYearB=null;
function openCompareModal(opener,a,b){
  MODAL.kind='compare';MODAL.opener=opener||null;
  if(O.years.indexOf(a)>=0&&O.years.indexOf(b)>=0&&a!==b){cmpYearA=a;cmpYearB=b;}
  if(cmpYearA===null){cmpYearA=O.years[O.years.length-2];cmpYearB=O.years[O.years.length-1];}
  document.getElementById('mTabs').innerHTML='';
  document.getElementById('mEyebrow').textContent='Annual filings · Barker';
  document.getElementById('mTitle').textContent='Compare two years';
  document.getElementById('mBig').innerHTML='<span>What moved between them — and which categories grew faster than revenue did.</span>';
  document.getElementById('mBody').innerHTML=
    '<div class="cmpbar">'+
      '<button class="pill step" id="cmpPrev" type="button" aria-label="Previous pair of years">‹</button>'+
      '<label>From <select id="cmpA"></select></label>'+
      '<label>to <select id="cmpB"></select></label>'+
      '<button class="pill step" id="cmpNext" type="button" aria-label="Next pair of years">›</button>'+
    '</div><div id="cmpOut"></div>';
  var A=document.getElementById('cmpA'),B=document.getElementById('cmpB');
  O.years.forEach(function(y){A.appendChild(new Option(y,y));B.appendChild(new Option(y,y));});
  A.value=cmpYearA;B.value=cmpYearB;
  function sync(){cmpYearA=+A.value;cmpYearB=+B.value;renderCompare();hashReplace('#cmp='+cmpYearA+'|'+cmpYearB);}
  A.addEventListener('change',sync);B.addEventListener('change',sync);
  function shift(step){
    var ia=O.years.indexOf(+A.value),ib=O.years.indexOf(+B.value);
    if(ia+step<0||ib+step>O.years.length-1)return;
    A.value=O.years[ia+step];B.value=O.years[ib+step];sync();
  }
  document.getElementById('cmpPrev').addEventListener('click',function(){shift(-1);});
  document.getElementById('cmpNext').addEventListener('click',function(){shift(1);});
  renderCompare();
  showModal('#cmp='+cmpYearA+'|'+cmpYearB);      /* the pair has an address */
  document.querySelector('#modal .xbtn').focus();
}
document.getElementById('cmpOpen').addEventListener('click',function(e){openCompareModal(e.currentTarget);});
/* share: the sheet's own address, or the selected year's */
document.getElementById('mLink').addEventListener('click',function(){
  var t=document.getElementById('mTitle').textContent;shareLink(t+' — '+document.title);});
document.getElementById('shareYear').addEventListener('click',function(){
  var u=new URL(location.href);u.hash='#filing';
  try{history.replaceState(history.state,'',u.pathname+u.search+u.hash);}catch(e){}
  shareLink(selYear+' filing — '+document.title);});

/* ---- the hero follows the selected year ----
   The chart beside the card is the year scrubber, so a card fixed on the latest filing would contradict
   it the moment a reader picks a year. setHero(i) rewrites the three figures and their labels, the
   register line (the earlier reporting basis is named there), the 'what changed' row (the pair ending in
   that year, debt proceeds named when they moved the headline - the same words tools/muni_routes.move_row
   prerenders for the latest pair) and shows the way back. The prerendered latest-year figures are the
   page's first paint; the script checks them against its own data and reports drift as a console error,
   which fails the page gate. The card shows its OWN height for the year it shows (the first screen never carries
   a blank band for a note only some other year needs). Where the chart sits BELOW the card (under 1180px) a pick
   that grows the 'what changed' row keeps the grown height for the rest of the visit - a ratchet, so scrubbing
   across years never makes the chart flip-flop under a finger - and when the card is scrolled off the top the
   page is nudged by the same amount (iOS has no scroll anchoring). Beside the chart (1180px and up) nothing
   below the card can move, so nothing is reserved. The 'Latest' chip releases the ratchet. */
var HERO_LI=O.years.length-1;
var HERO_FY=/\bFY\d{4}/.test((document.querySelector('#hRev .k')||{textContent:''}).textContent)?'FY':'';
function pct1(a,b){if(!a) return b?'new':'—';var p=(b-a)/Math.abs(a)*100;return (p>=0?'+':'−')+Math.abs(p).toFixed(1)+'%';}
/* 1.8: a one-year change of 25% or more gets its context - the three changes before it averaged - and never a cause (the series the page already has) */
function yoy(arr,i){var a=arr[i-1],b=arr[i];return a?(b-a)/Math.abs(a)*100:null;}
function swingTxt(label,arr,i){
  var p=yoy(arr,i); if(p==null||Math.abs(p)<25) return '';
  var h='<span class="dbtn">'+label+' '+(p<0?'−':'+')+Math.abs(p).toFixed(1)+'%: a one-year swing';
  if(i>=4){var q=[yoy(arr,i-1),yoy(arr,i-2),yoy(arr,i-3)];
    if(q.indexOf(null)<0){var m=(q[0]+q[1]+q[2])/3; h+='; the three-year average is '+(m<0?'−':'+')+Math.abs(m).toFixed(1)+'%';}}
  return h+'.</span>';
}
function heroMove(i){
  var yrs=O.years;
  if(i<1) return {html:'<span class="k">What changed</span><span class="mv1">No earlier filing on record to compare with.</span>',href:null};
  var a=yrs[i-1],b=yrs[i],ra=O.rev[i-1],rb=O.rev[i],ea=O.exp[i-1],eb=O.exp[i];
  var DL=debtLabel(),da=0,db=0;
  if(DL){da=catTotals(0,a)[DL]||0;db=catTotals(0,b)[DL]||0;}
  var asked=Math.abs(db-da)>=1000000&&Math.abs(db-da)>=0.25*Math.abs(rb-ra);
  var h='<span class="k">What changed · '+a+' &rarr; '+b+'</span>'+
    (asked?'<span class="mv1">Revenue <b class="num">'+pct1(ra-da,rb-db)+'</b> <span class="mvq">without debt proceeds</span></span>'
      :'<span class="mv1">Revenue <b class="num">'+pct1(ra,rb)+'</b></span>')+
    '<span class="mv1">Expenditure <b class="num">'+pct1(ea,eb)+'</b></span>'+
    '<span class="go">What moved &rarr;</span>';
  if(asked) h+='<span class="dbtn">As filed, with debt proceeds (<span class="num">'+money0(da)+'</span> in '+a+', <span class="num">'+money0(db)+
    '</span> in '+b+'), revenue <b class="num">'+pct1(ra,rb)+'</b>.</span>';
  h+=swingTxt('Spending',O.exp,i)+swingTxt('Revenue',O.rev,i);
  if(a<O.schemaBreak&&b>=O.schemaBreak) h+='<span class="dbtn">These two filings sit on different reporting bases.</span>';
  return {html:h,href:'#cmp='+a+'|'+b};
}
/* r8 W-05: the 'usually' lines follow the picked year: the (up to) ten yearly changes before its change, on its reporting basis, and
   the median net of the ten filings before it - the words the build prints for the latest year (build_county.py, US_MOVE / US_NET) */
function usualFor(i){
  var yrs=O.years,b=yrs[i],ch=[],nets=[],k,y,B=O.schemaBreak;
  for(k=1;k<=i;k++){y=yrs[k];if(y>=b-10&&y<b&&yrs[k-1]===y-1&&((y-1)>=B)===(y>=B)&&(y>=B)===(b>=B)) ch.push(k);}
  for(k=0;k<i;k++){y=yrs[k];if(y>=b-10&&(y>=B)===(b>=B)) nets.push(O.rev[k]-O.exp[k]);}
  return {ch:ch,nets:nets};
}
function usSign(p){return (p>=0?'+':'\u2212')+Math.abs(p).toFixed(1)+'%';}
function usualMove(i){
  if(i<1) return '';
  var u=usualFor(i); if(u.ch.length<3) return '';
  var yrs=O.years,DL=debtLabel(),da=0,db=0;
  if(DL){da=catTotals(0,yrs[i-1])[DL]||0;db=catTotals(0,yrs[i])[DL]||0;}
  var asked=Math.abs(db-da)>=1000000&&Math.abs(db-da)>=0.25*Math.abs(O.rev[i]-O.rev[i-1]);
  function rx(k){return O.rev[k]-(asked&&DL?(catTotals(0,yrs[k])[DL]||0):0);}
  var se=0,sr=0;
  u.ch.forEach(function(k){se+=(O.exp[k]-O.exp[k-1])/O.exp[k-1]*100;sr+=(rx(k)-rx(k-1))/rx(k-1)*100;});
  se/=u.ch.length;sr/=u.ch.length;
  return '<span class="hus">Usually: spending <b class="num">'+usSign(se)+'</b>, revenue <b class="num">'+usSign(sr)+'</b>'+
    (asked?' without debt proceeds':'')+' a year &mdash; the average of the '+u.ch.length+' yearly changes '+yrs[u.ch[0]]+'&ndash;'+
    yrs[u.ch[u.ch.length-1]]+' (county-by-year.csv)</span>';
}
function usualNet(i){
  var u=usualFor(i),v=u.nets.slice().sort(function(a,b){return a-b;}),n=v.length;
  if(n<3) return '';
  var m=n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2, yrs=O.years, b=yrs[i], ys=[];
  for(var k=0;k<i;k++){var y=yrs[k];if(y>=b-10&&(y>=O.schemaBreak)===(b>=O.schemaBreak)) ys.push(y);}
  return 'Usually <b class="num">'+(m<0?'\u2212':'+')+money0(Math.abs(m))+'</b> &mdash; the median net of the '+n+' filings '+ys[0]+'&ndash;'+ys[ys.length-1];
}
function setHero(i){
  if(i<0||i>HERO_LI) return;
  var yr=O.years[i],rev=O.rev[i],exp=O.exp[i],net=rev-exp,pre=yr<O.schemaBreak;
  function put(id,v){var e=document.getElementById(id);if(e&&e.innerHTML!==v) e.innerHTML=v;}
  put('hRevV',money0(rev));put('hExpV',money0(exp));put('hNetV',(net<0?'−':'+')+money0(Math.abs(net)));
  [['hRev','Revenue · '+HERO_FY+yr],['hExp','Expenditure · '+HERO_FY+yr],['hNet','Net · '+HERO_FY+yr+' filing']].forEach(function(p){
    var k=document.querySelector('#'+p[0]+' .k');if(k&&k.textContent!==p[1]) k.textContent=p[1];});
  /* the earlier basis takes the line (the chip beside it names the way back); 'reporting' and the source are desk-only
     (.ph-x) so the line never truncates beside the chip on a phone - the same markup the page prerenders */
  put('hRegT',pre?'Pre-'+O.schemaBreak+' <span class="ph-x">reporting </span>basis':'Annual filing<span class="ph-x"> · NYS Comptroller</span>');
  var rs=document.getElementById('heroReset');if(rs) rs.hidden=(i===HERO_LI);
  var nu=document.getElementById('hNetU');
  if(nu){var t=usualNet(i);nu.hidden=!t;if(t) put('hNetU',t);}
  var mv=document.querySelector('.hcard .hmove');
  if(mv){
    var r0=mv.getBoundingClientRect(),m=heroMove(i);
    if(mv.hasAttribute('data-us')) m.html+=usualMove(i);
    if(mv.innerHTML!==m.html) mv.innerHTML=m.html;
    if(m.href){mv.setAttribute('href',m.href);mv.removeAttribute('aria-disabled');}
    else{mv.removeAttribute('href');mv.setAttribute('aria-disabled','true');}
    var d=mv.getBoundingClientRect().height-r0.height;
    if(d>0.5&&HERO_STACKED.matches){
      mv.style.minHeight=Math.ceil(r0.height+d)+'px';                  /* the ratchet: never shrinks again this visit */
      if(r0.bottom<=0) window.scrollBy({top:d,left:0,behavior:'instant'});   /* card above the viewport: hold the reader's place */
    }
  }
}
var HERO_STACKED=window.matchMedia('(max-width:1179px)');
function fitHero(){                    /* a resize or a late font starts the ratchet over: the card's own height again */
  var mv=document.querySelector('.hcard .hmove');if(mv) mv.style.minHeight='';
}
(function(){
  var li=HERO_LI,e=document.getElementById('hRevV'),x=document.getElementById('hExpV');
  if(e&&e.textContent!==money0(O.rev[li])) console.error('hero drift: prerendered '+e.textContent+' vs data '+money0(O.rev[li]));
  if(x&&x.textContent!==money0(O.exp[li])) console.error('hero drift: prerendered '+x.textContent+' vs data '+money0(O.exp[li]));
  var rs=document.getElementById('heroReset');
  if(rs){
    rs.setAttribute('aria-label','Back to the latest filing, '+HERO_FY+O.latest);   /* the arrow glyph is CSS-drawn */
    rs.addEventListener('click',function(e){
      fitHero();                                              /* the way back to the latest filing releases the ratchet */
      renderYear(O.latest);                                   /* hides the chip - under the focus, if a key pressed it */
      /* a keyboard press (detail 0) moves the focus to the year select (which now reads the latest year) when it is on screen,
         else to the card itself (tabindex -1): the reader keeps a place, never <body>. A pointer press parks on the card. */
      var p=document.getElementById('ySel'),r=p&&p.getBoundingClientRect();
      var t=(!e.detail&&p&&r.bottom>0&&r.top<innerHeight)?p:document.querySelector('.hcard');
      if(t) t.focus({preventScroll:true});
    });
  }
})();

/* ---- year panels (ported) ---- */
/* the top eight categories on a desk, the top five on a phone ('All other' always opens the rest - nothing is truncated) */
var PHONE=window.matchMedia('(max-width:640px)'), rankOpen={rev:false,exp:false};
function rankTop(){return PHONE.matches?5:8;}
var selYear=(function(){var q=+(new URLSearchParams(location.search).get('y')||0);return O.years.indexOf(q)>=0?q:O.latest;})();
function groupRank(list,open){
  var T=rankTop();
  if(open||list.length<=T+1) return list;
  var head=list.slice(0,T),tv=0;
  for(var i=T;i<list.length;i++)tv+=list[i][1];
  return head.concat([['All other ('+(list.length-T)+' categories)',tv]]);
}
function renderYear(yr){
  selYear=yr;
  try{var uq=new URL(location.href); if(yr===O.latest) uq.searchParams.delete('y'); else uq.searchParams.set('y',yr);
    history.replaceState(history.state,'',uq.pathname+uq.search+uq.hash);}catch(e){}   /* the selected year has an address */
  var rc=O.revByYear[String(yr)]||[],ec=O.expByYear[String(yr)]||[];
  var rt=rc.reduce(function(s,x){return s+x[1];},0);
  var et=ec.reduce(function(s,x){return s+x[1];},0);
  document.getElementById('revTot').textContent=money0(rt);
  document.getElementById('expTot').textContent=money0(et);
  var basis=yr<O.schemaBreak?' · pre-'+O.schemaBreak+' reporting basis':'';
  document.getElementById('revSub').textContent=yr+' filing · '+rc.length+' categories'+basis;
  document.getElementById('expSub').textContent=yr+' filing · '+ec.length+' categories'+basis;
  [['revRank','revMore','rev',rc,'--rev',rt,0],
   ['expRank','expMore','exp',ec,'--exp',et,1]].forEach(function(cfg){
    var el=document.getElementById(cfg[0]),btn=document.getElementById(cfg[1]);
    var key=cfg[2],list=cfg[3],col=cfg[4],tot=cfg[5],sec=cfg[6];
    function toggle(){rankOpen[key]=!rankOpen[key];renderYear(selYear);}
    renderRank(el,groupRank(list,rankOpen[key]),col,tot,null,
      function(item,node){openModal(selYear,sec,item[0],col,node);},
      toggle,{hk:function(x){return sec+'|'+x[0];}});
    /* hover-link (the chrome's PL.hl): point at - or focus - a category row and its own 31-year series is
       ghosted on the chart below and echoed beside the row, and the row lights. On touch the row's tap opens
       the sheet, whose Trend tab is the same series in full. The root is bound once; rows re-render freely. */
    if(!el.__hl){el.__hl=1;
      PL.hl.bind([el],{attr:'data-key',sel:'.rk[data-key]',
        on:function(k,src){if(!k) return;var j=k.indexOf('|'),s=+k.slice(0,j),lb=k.slice(j+1);
          if(typeof ghostTrend==='function') ghostTrend(s,lb); if(HOVER&&src) ghostCard(src,s,lb,col);},
        off:function(){if(typeof ghostTrend==='function') ghostTrend(null); ghostCard(null);}});}
    var T=rankTop();
    if(list.length>T+1){
      /* on a phone the 'All other (N categories) - view all' row is the way in; the button only appears to close it again */
      btn.hidden=PHONE.matches&&!rankOpen[key];
      btn.textContent=rankOpen[key]?'Show the top '+T
        :'Show all '+list.length+' categories';
      if(!btn.__wired){btn.__wired=true;btn.addEventListener('click',toggle);}
    } else btn.hidden=true;
  });
  if(syncYearStep) syncYearStep();                           /* the year control (select + Earlier / Later) reads the selected year */
  setHero(O.years.indexOf(yr));                              /* the hero follows the Schedule */
  if(liveOn){var lq=O.years.indexOf(yr);say(yr+' filing: revenue '+money0(O.rev[lq])+', expenditure '+money0(O.exp[lq])+'.');}
  if(typeof markTrendYear==='function') markTrendYear(yr);
}
var liveOn=false, syncYearStep=null;
(function(){
  /* the year control (PL-28): Earlier, a native <select> of every filing year, Later - one compact component on every width, the same stepper the
     city ledger's finances view carries. The chart below is the other way to pick (a click or a slide); this is the keyboard and screen-reader
     path: three tab stops, the arrow keys work on the select natively. Earlier and Later stay in the tab order at either end (aria-disabled,
     never disabled), so a keyboard user who steps to the first or last year keeps the focus. The address (?y=) is renderYear's, as before. */
  var sel=document.getElementById('ySel'), prev=document.getElementById('ysPrev'), next=document.getElementById('ysNext'), stepEl=document.getElementById('yearStep');
  if(!sel||!prev||!next) return;
  sel.textContent='';
  O.years.slice().reverse().forEach(function(y){sel.appendChild(new Option(HERO_FY+y,y));});     /* newest first, as the city ledger's */
  function aim(b,y){                                         /* an end of the list: the button is aria-disabled and points nowhere */
    if(y==null){b.setAttribute('aria-disabled','true');b.removeAttribute('data-year');}
    else{b.removeAttribute('aria-disabled');b.setAttribute('data-year',y);}
  }
  syncYearStep=function(){
    var i=O.years.indexOf(selYear);
    if(sel.value!==String(selYear)) sel.value=String(selYear);
    aim(prev,i>0?O.years[i-1]:null); aim(next,i>=0&&i<O.years.length-1?O.years[i+1]:null);
  };
  function step(d){
    var i=O.years.indexOf(selYear)+d;
    if(i<0||i>=O.years.length) return;
    renderYear(O.years[i]);
    if(stepEl&&stepEl.__let) stepEl.__let();                 /* a pick lets go of the chart preview: the chart shows the year just chosen */
  }
  prev.addEventListener('click',function(){step(-1);});
  next.addEventListener('click',function(){step(1);});
  sel.addEventListener('change',function(){renderYear(+sel.value);});
  /* the ranked lists show five rows on a phone and eight on a desk: crossing the line re-draws them */
  PHONE.addEventListener?PHONE.addEventListener('change',function(){renderYear(selYear);}):PHONE.addListener(function(){renderYear(selYear);});
})();

/* ---- the big trend, scrubbable ---- */
var markTrendYear, ghostTrend;
function drawTrend(){
  var wrapEl=document.getElementById('trendWrap');
  var cw=wrapEl.clientWidth||window.innerWidth, narrow=cw<700;
  /* drawn at its real width, so the type is real type (11.5px+), not a scaled-down 8px */
  var W=Math.round(cw),H=narrow?260:300, tight=cw<300;
  var ml=narrow?(tight?44:46):60,mr=narrow?(tight?84:88):104,mt=14,mb=26;
  var fs=12;      /* r8 F-12: the scale's smallest token at every width (was 11.5 on a desk) */
  var yrs=O.years,rev=O.rev,exp=O.exp;
  var max=Math.max.apply(null,rev.concat(exp))*1.06;
  var x=function(i){return ml+(W-ml-mr)*(i/(yrs.length-1));};
  var y=function(v){return mt+(H-mt-mb)*(1-v/max);};
  var svg=document.getElementById('trend'),p=[];
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  svg.style.fontSize=fs+'px';
  var AT=PL.axisTicks(max,narrow?3:5);                 /* the chrome's one ladder: the format follows the step ($1.25M is never '$1.3M', '$5.0M' never sits beside '$10M') */
  /* PL-07 (UX audit 2026-10-31): the ticks are set in the text face now - room for the longest one ('$200M' is ~0.76em a character), so a
     label never leaves the chart at 320px */
  ml=Math.max(ml, Math.max.apply(null,AT.ticks.map(function(g){ return String(AT.fmt(g)).length; }))*fs*0.76+10);
  AT.ticks.forEach(function(g){
    p.push('<line class="gl" x1="'+ml+'" y1="'+y(g).toFixed(1)+'" x2="'+(W-mr)+'" y2="'+y(g).toFixed(1)+'"/>');
    p.push('<text class="ax" x="'+(ml-8)+'" y="'+(y(g)+fs/3).toFixed(1)+'" text-anchor="end" font-size="'+fs+'">'+AT.fmt(g)+'</text>');
  });
  var bi=yrs.indexOf(O.schemaBreak);
  if(bi>0){
    var bx=((x(bi)+x(bi-1))/2).toFixed(1);
    p.push('<line class="brk" x1="'+bx+'" y1="'+mt+'" x2="'+bx+'" y2="'+(H-mb)+'"/>');
    if(!narrow)
      p.push('<text class="ax bnote" x="'+(+bx+5)+'" y="'+(mt+10)+'" font-size="'+fs+'">reporting basis changed '+O.schemaBreak+'</text>');
  }
  /* four-digit years: the first, every tenth, the last - never two that touch */
  var li=yrs.length-1, tickYrs=[0];
  yrs.forEach(function(yr,i){if(yr%10===0&&i>0&&i<li) tickYrs.push(i);});
  tickYrs.push(li);
  var gapU=narrow?46:52;
  tickYrs=tickYrs.filter(function(i,k){
    if(k===0||i===li) return true;
    return Math.abs(x(i)-x(0))>=gapU&&Math.abs(x(li)-x(i))>=gapU;});
  tickYrs.forEach(function(i){
    p.push('<text class="ax" x="'+x(i).toFixed(1)+'" y="'+(H-mb+fs+4)+'" text-anchor="'+(i===0?'start':i===li?'end':'middle')+'" font-size="'+fs+'">'+yrs[i]+'</text>');
  });
  function path(arr){return arr.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');}
  /* the gap IS the chart: a wash where revenue runs above expenditure, a hatch where expenditure
     runs above revenue, each segment split exactly where the two lines cross; half strength
     before the reporting-basis change, which is drawn, never smoothed (doctrine call) */
  p.push('<defs><pattern id="hatchExp" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">'+
    '<line x1="0.75" y1="0" x2="0.75" y2="4" stroke="var(--exp)" stroke-width="1.5"/></pattern></defs>');
  var polys={w:[],h:[],wp:[],hp:[]};
  function quad(key,xa,ra,ea,xb,rb,eb){polys[key].push('M'+xa.toFixed(1)+' '+y(ra).toFixed(1)+' L'+xb.toFixed(1)+' '+y(rb).toFixed(1)+
    ' L'+xb.toFixed(1)+' '+y(eb).toFixed(1)+' L'+xa.toFixed(1)+' '+y(ea).toFixed(1)+' Z');}
  for(var gi=0;gi<li;gi++){
    var d0=rev[gi]-exp[gi], d1=rev[gi+1]-exp[gi+1], pre=yrs[gi+1]<O.schemaBreak;
    var x0=x(gi),x1=x(gi+1);
    if((d0>=0)===(d1>=0)){quad((d0>=0?'w':'h')+(pre?'p':''),x0,rev[gi],exp[gi],x1,rev[gi+1],exp[gi+1]);}
    else{var t=d0/(d0-d1), xm=x0+(x1-x0)*t, vm=rev[gi]+(rev[gi+1]-rev[gi])*t;
      quad((d0>=0?'w':'h')+(pre?'p':''),x0,rev[gi],exp[gi],xm,vm,vm);
      quad((d1>=0?'w':'h')+(pre?'p':''),xm,vm,vm,x1,rev[gi+1],exp[gi+1]);}
  }
  if(polys.wp.length) p.push('<path class="gapw pre" d="'+polys.wp.join(' ')+'"/>');
  if(polys.hp.length) p.push('<path class="gaph pre" d="'+polys.hp.join(' ')+'"/>');
  if(polys.w.length) p.push('<path class="gapw" d="'+polys.w.join(' ')+'"/>');
  if(polys.h.length) p.push('<path class="gaph" d="'+polys.h.join(' ')+'"/>');
  p.push('<path class="ln" d="'+path(exp)+'" stroke="var(--exp)"/>');
  p.push('<path class="ln" d="'+path(rev)+'" stroke="var(--rev)"/>');
  /* two computed annotations, each inside ONE reporting basis so the pair that straddles the
     break is never labelled: the widest gap, and (wide screens) the biggest one-year move.
     Drawn here, PLACED after layout (placeAnn below): the type is measured, then each label
     takes the band that is clear of the series, the end labels, the basis note, the
     selected-year rule and the other label - and never leaves the chart box. Two lines on a phone. */
  var b0=Math.max(0,bi), ann=[], annNote='';
  var gapI=-1,gapV=0,capTxt='';
  for(var ai=b0;ai<=li;ai++){var gv=Math.abs(rev[ai]-exp[ai]);if(gv>gapV){gapV=gv;gapI=ai;}}
  if(gapI>=0&&gapV>0){var above=exp[gapI]>rev[gapI], gl1='Widest gap · '+yrs[gapI], gl2=(above?'spending':'revenue')+' above by '+mCompact(gapV);
    capTxt='<b>Widest gap:</b> '+yrs[gapI]+', '+(above?'spending':'revenue')+' above by '+mCompact(gapV);
    if(!narrow) ann.push({i:gapI,yTop:Math.min(y(rev[gapI]),y(exp[gapI])),yBot:Math.max(y(rev[gapI]),y(exp[gapI])),lines:[gl1+' · '+gl2]});}
  var capEl=document.getElementById('trendCap');
  if(capEl){capEl.hidden=!(narrow&&capTxt);capEl.innerHTML=narrow?capTxt:'';}   /* ≤700px: a caption line under the plot, so nothing sits on the lines */
  if(!narrow){var mvI=-1,mvV=0;
    for(var mi=b0+1;mi<=li;mi++){var mv=Math.abs(exp[mi]-exp[mi-1]);if(mv>mvV){mvV=mv;mvI=mi;}}
    if(mvI>0&&mvI!==gapI){ann.push({i:mvI,pt:y(exp[mvI]),lines:['Biggest move · '+yrs[mvI]+' · expenditure '+sgn(exp[mvI]-exp[mvI-1])+mCompact(mvV)]});}}
  ann.forEach(function(a,k){
    var ax=x(a.i);
    p.push('<g class="anng" data-k="'+k+'"><path class="annl" d=""/>'+
      (a.yTop!=null?'<line class="annl" x1="'+(ax-5).toFixed(1)+'" y1="'+a.yTop.toFixed(1)+'" x2="'+(ax+5).toFixed(1)+'" y2="'+a.yTop.toFixed(1)+'"/>'+
        '<line class="annl" x1="'+(ax-5).toFixed(1)+'" y1="'+a.yBot.toFixed(1)+'" x2="'+(ax+5).toFixed(1)+'" y2="'+a.yBot.toFixed(1)+'"/>':'')+
      '<text class="ann" font-size="'+fs+'">'+a.lines.map(function(s,j){return '<tspan x="0" dy="'+(j?(fs*1.25).toFixed(1):0)+'">'+esc(s)+'</tspan>';}).join('')+'</text></g>');
  });
  /* a ghost: one category's own series, drawn on this scale while its row is pointed at */
  p.push('<path id="tghost" class="ghost" d="" style="display:none"/><text id="tghostl" class="ghostl" font-size="'+fs+'" style="display:none"></text>');
  /* end labels carry the value and never overprint: when the two ends are closer than a
     line of type they are pushed apart around their midpoint, with a leader to each end */
  var ry=y(rev[li]), ey=y(exp[li]), gap=fs*1.4, ly=[ry,ey];
  if(Math.abs(ry-ey)<gap){var mid=(ry+ey)/2; ly=ry<=ey?[mid-gap/2,mid+gap/2]:[mid+gap/2,mid-gap/2];}
  var lx=W-mr+10;
  [['Rev',rev[li],ly[0],ry,'--rev','--rev-ink'],['Exp',exp[li],ly[1],ey,'--exp','--exp-ink']].forEach(function(e){
    p.push('<path class="lead" d="M'+x(li).toFixed(1)+' '+e[3].toFixed(1)+' L'+(lx-3)+' '+e[2].toFixed(1)+'" stroke="var('+e[4]+')"/>');
    p.push('<text class="end" x="'+lx+'" y="'+(e[2]+fs/3).toFixed(1)+'" font-size="'+fs+'" style="fill:var('+e[5]+')">'+e[0]+' '+mCompact(e[1])+'</text>');
  });
  p.push('<g id="tsel" style="opacity:0"><line class="sel" y1="'+mt+'" y2="'+(H-mb)+'"/>'+
    '<circle class="dot" r="4" fill="var(--rev)"/><circle class="dot" r="4" fill="var(--exp)"/></g>');
  p.push('<g id="tcross" style="opacity:0"><line class="brk" y1="'+mt+'" y2="'+(H-mb)+'"/>'+
    '<circle class="dot" r="4.5" fill="var(--rev)"/><circle class="dot" r="4.5" fill="var(--exp)"/></g>');
  p.push('<rect id="thit" x="'+ml+'" y="'+mt+'" width="'+(W-ml-mr)+'" height="'+(H-mt-mb)+'" fill="transparent"/>');
  svg.innerHTML=p.join('');
  /* place the annotations: measured type, the cheapest clear band (cost = series crossed + obstacles
     overlapped + a little leader length), inside [ml, W) always */
  (function placeAnn(){
    if(!ann.length) return;
    var selI=Math.max(0,yrs.indexOf(selYear)), lineH=fs*1.25, plotL=ml, plotR=W-mr, n1=yrs.length-1, span=plotR-plotL;
    function bbox(el){try{var b=el.getBBox();if(b&&b.width)return b;}catch(e){}return null;}
    var obs=[];
    [].forEach.call(svg.querySelectorAll('text.end,text.bnote'),function(t){var b=bbox(t);if(b)obs.push({x0:b.x-2,y0:b.y-1,x1:b.x+b.width+2,y1:b.y+b.height+1});});
    obs.push({x0:x(selI)-4,y0:mt,x1:x(selI)+4,y1:H-mb});                  /* the selected-year rule */
    /* the two LINES at an x (each one on its own: the space between them is clear, and a label may sit in it) */
    function linesAt(px){var t=Math.max(0,Math.min(n1,(px-plotL)/span*n1)),i=Math.floor(t),j=Math.min(n1,i+1),f=t-i;
      return [y(rev[i]+(rev[j]-rev[i])*f),y(exp[i]+(exp[j]-exp[i])*f)];}
    function cost(L,T,R,B,a){
      /* any crossing (10 a sample, sampled every 1.5 units INCLUDING both edges of the box, so a line
         clipping a corner is seen; the page gate samples the same way) or overlap (30) outranks the
         longest leader (at most 5) */
      var c=0, hits=0, x0=Math.max(L,plotL), x1=Math.min(R,plotR), nS=Math.max(1,Math.ceil((x1-x0)/1.5));
      for(var s=0;s<=nS;s++){var ye=linesAt(x0+(x1-x0)*s/nS);
        if((ye[0]>=T-3&&ye[0]<=B+3)||(ye[1]>=T-3&&ye[1]<=B+3))hits++;}
      /* and every year's own vertex: a one-year spike is a point no x-grid is sure to land on */
      for(var v=0;v<=n1;v++){var vx=x(v);if(vx<L-1||vx>R+1)continue;
        var vr=y(rev[v]),ve=y(exp[v]);if((vr>=T-3&&vr<=B+3)||(ve>=T-3&&ve<=B+3))hits++;}
      c+=hits*10;
      obs.forEach(function(o){if(o.x1>=L&&o.x0<=R&&o.y1>=T&&o.y0<=B)c+=30;});
      var my=a.pt!=null?a.pt:(T>a.yBot?a.yBot:a.yTop);
      return {c:c+Math.max(0,Math.min(T>my?T-my:my-B,400))/80,hits:hits};
    }
    ann.forEach(function(a,k){
      var g=svg.querySelector('.anng[data-k="'+k+'"]'),t=g.querySelector('text'),lead=g.querySelector('path');
      /* the measured glyph box (ascent to descent, every line), not the nominal size */
      var b=bbox(t), w=b?b.width:Math.max.apply(null,a.lines.map(function(s){return s.length;}))*fs*0.58;
      var h=b?b.height:fs*1.3+(a.lines.length-1)*lineH, asc=b?-b.y:fs*0.8, ax=x(a.i), best=null, tops=[], q;
      for(q=0;q<4;q++) tops.push(mt+2+q*lineH);
      for(q=0;q<4;q++) tops.push(H-mb-6-h-q*lineH);
      tops.forEach(function(T){[ax-w/2,ax+6,ax-6-w,ax-w/4,ax-3*w/4,ax+6+w/2,ax-6-w*1.5].forEach(function(L){
        L=Math.max(plotL+2,Math.min(L,W-3-w));
        var r=cost(L,T,L+w,T+h,a); if(!best||r.c<best.c) best={c:r.c,hits:r.hits,L:L,T:T};});});
      /* no band clear of the series at this width (a phone plot narrower than the label): the label leaves
         the chart rather than sit on a line, and its facts go into the note under the chart instead */
      if(best.hits){g.style.display='none';annNote+=a.lines.join(', ').replace(' · ',': ')+'. ';return;}
      var L=best.L,T=best.T,R=L+w,B=T+h;
      t.setAttribute('y',(T+asc).toFixed(1));
      [].forEach.call(t.querySelectorAll('tspan'),function(ts){ts.setAttribute('x',L.toFixed(1));});
      /* the leader runs from the mark to the label's nearest edge, with an elbow where the label stepped aside */
      var fromY=a.pt!=null?a.pt:(T>a.yBot?a.yBot:a.yTop), down=T>fromY;
      if(a.pt!=null) fromY+=down?6:-6;
      var toY=down?T-3:B+3, ex=Math.max(L+4,Math.min(R-4,ax)), d;
      if(Math.abs(ex-ax)<1) d='M'+ax.toFixed(1)+' '+fromY.toFixed(1)+' L'+ax.toFixed(1)+' '+toY.toFixed(1);
      else{var ky=down?toY-lineH*0.6:toY+lineH*0.6;
        d='M'+ax.toFixed(1)+' '+fromY.toFixed(1)+' L'+ax.toFixed(1)+' '+ky.toFixed(1)+' L'+ex.toFixed(1)+' '+ky.toFixed(1)+' L'+ex.toFixed(1)+' '+toY.toFixed(1);}
      lead.setAttribute('d',d);
      obs.push({x0:L-4,y0:T-2,x1:R+4,y1:B+2});                                  /* the next label keeps clear */
    });
  })();
  var cross=document.getElementById('tcross');
  var cl=cross.querySelector('line'),cd=cross.querySelectorAll('circle');
  function idxAt(clientX){
    var rr=svg.getBoundingClientRect();
    var i=Math.round(((clientX-rr.left)/rr.width*W-ml)/((W-ml-mr)/(yrs.length-1)));
    return Math.max(0,Math.min(yrs.length-1,i));
  }
  function show(i){
    cross.style.opacity=1;
    cl.setAttribute('x1',x(i));cl.setAttribute('x2',x(i));
    cd[0].setAttribute('cx',x(i));cd[0].setAttribute('cy',y(rev[i]));
    cd[1].setAttribute('cx',x(i));cd[1].setAttribute('cy',y(exp[i]));
    readout(i,true);                     /* the docked readout is the only one: nothing floats over the data */
  }
  /* the docked readout: the figures for the year under the pointer, else the selected year */
  function readout(i,hover){
    var net=rev[i]-exp[i];
    document.getElementById('trendSub').innerHTML='<span class="ty">'+yrs[i]+'</span>'+
      '<span><span class="tn">Revenue</span> <span class="num" style="color:var(--rev-ink)">'+money0(rev[i])+'</span></span>'+
      '<span><span class="tn">Expenditure</span> <span class="num" style="color:var(--exp-ink)">'+money0(exp[i])+'</span></span>'+
      '<span><span class="tn">Net</span> <span class="num">'+sgn(net)+money0(Math.abs(net))+'</span></span>'+
      (yrs[i]<O.schemaBreak?'<span class="tn">earlier reporting basis</span>':'')+
      (hover?'':'<span class="tn">'+(yrs[i]===selYear?'selected':'')+'</span>');
  }
  function hide(){cross.style.opacity=0;readout(Math.max(0,yrs.indexOf(selYear)));}
  var hit=document.getElementById('thit');
  hit.style.cursor='crosshair';
  attachScrub(hit,idxAt,show,hide,{live:true,pick:function(i){if(yrs[i]!==selYear) renderYear(yrs[i]);},
    label:'Revenue and expenditure by filing year',read:function(){return document.getElementById('trendSub').textContent;}});
  var sel=document.getElementById('tsel');
  var sl=sel.querySelector('line'),sd=sel.querySelectorAll('circle');
  markTrendYear=function(yr){
    var i=yrs.indexOf(yr);
    if(i<0){sel.style.opacity=0;return;}
    sl.setAttribute('x1',x(i));sl.setAttribute('x2',x(i));
    sd[0].setAttribute('cx',x(i));sd[0].setAttribute('cy',y(rev[i]));
    sd[1].setAttribute('cx',x(i));sd[1].setAttribute('cy',y(exp[i]));
    sel.style.opacity=1;
    readout(i);
  };
  markTrendYear(selYear);
  /* hover-link: a category row's own series, drawn on this chart's scale */
  var gp=document.getElementById('tghost'), gl=document.getElementById('tghostl');
  ghostTrend=function(sec,label){
    if(sec==null){gp.style.display='none';gl.style.display='none';return;}
    var v=seriesFor(sec,label), f=-1;
    for(var q=0;q<v.length;q++){if(v[q]>0){f=q;break;}}
    if(f<0){gp.style.display='none';gl.style.display='none';return;}
    gp.setAttribute('d',pathRuns(v.map(function(val,i){return i<f?null:val;}),x,y));   /* a gap where no row was filed */
    gp.style.display='';
    var ly=y(v[li]||0)-fs*0.6, ends=[y(rev[li]),y(exp[li])];
    ends.forEach(function(e){if(Math.abs(e-ly)<fs*1.3) ly=e-fs*1.3;});
    gl.setAttribute('x',(x(li)-6).toFixed(1));gl.setAttribute('y',Math.max(mt+fs,ly).toFixed(1));gl.setAttribute('text-anchor','end');
    gl.textContent=label+' '+(v[li]==null?'no filing '+yrs[li]:mCompact(v[li]));gl.style.display='';
  };
  /* the year control points at the chart too: point at - or focus - Earlier / Later and the chart answers with the year it leads to
     (the chrome's PL.hl). A pick lets go of it (the step handler calls __let), so the chart then shows the year just chosen. */
  var stepEl=document.getElementById('yearStep');
  if(stepEl){stepEl.__show=show;stepEl.__hide=hide;            /* the newest draw's closures, after any resize */
    if(!stepEl.__chart){stepEl.__chart=1;
      var hlSet=PL.hl.bind([stepEl],{attr:'data-year',sel:'button[data-year]',
        on:function(k){var i=yrs.indexOf(+k);if(i>=0) stepEl.__show(i);},off:function(){stepEl.__hide();}});
      stepEl.__let=function(){hlSet(null);};}}
  /* the mapping detail is desk-only (.ph-x; the Method says it too); what a phone keeps is the part that guards the reading:
     the basis changed, and figures either side of the dashed line are not strictly comparable */
  document.getElementById('trendNote').innerHTML=esc(annNote)+'Series covers '+yrs[0]+'–'+yrs[li]+'. '+
    'The Comptroller changed its reporting schema in '+O.schemaBreak+'.<span class="ph-x"> Both eras publish 15 columns under '+
    'different names, so the mapping is resolved by column name per era (the choice was validated '+
    'for continuity on the city series).</span> Figures either side of the dashed line are not strictly comparable.';
  /* the chart speaks: a computed, method-neutral description that counts within ONE basis (never across
     the break), and the same figures as a table */
  var cb=Math.max(0,bi),up=0,nb=0;
  for(var q=cb;q<=li;q++){nb++;if(rev[q]>exp[q]) up++;}
  document.getElementById('trendDesc').textContent=
    'Revenue was '+money0(rev[0])+' in '+yrs[0]+' and '+money0(rev[li])+' in '+yrs[li]+'; expenditure was '+
    money0(exp[0])+' and '+money0(exp[li])+'. The reporting basis changed in '+O.schemaBreak+', so figures on '+
    'either side are not strictly comparable; the chart draws the break and shades the earlier years at half strength. '+
    (bi>0?'On the post-'+O.schemaBreak+' basis, revenue exceeded expenditure in '+up+' of '+nb+' filings. ':'')+
    'The same figures are in the table below the chart.';
}
(function(){
  var d=document.getElementById('trendData'); if(!d) return;
  d.addEventListener('toggle',function(){
    var host=document.getElementById('trendTable');
    if(!d.open||host.firstChild) return;
    host.innerHTML='<table class="mv"><caption class="pl-vh">Revenue, expenditure and net by filing year</caption><thead><tr><th scope="col">Filing year</th><th scope="col" class="r">Revenue</th><th scope="col" class="r">Expenditure</th><th scope="col" class="r">Net</th></tr></thead><tbody>'+
      O.years.slice().reverse().map(function(yr){var i=O.years.indexOf(yr),n=O.rev[i]-O.exp[i];
        return '<tr><td class="m-name">'+yr+(yr<O.schemaBreak?' <span class="fnt">earlier basis</span>':'')+'</td><td class="r num m-vals" data-l="Revenue">'+money0(O.rev[i])+
          '</td><td class="r num m-vals" data-l="Expenditure">'+money0(O.exp[i])+'</td><td class="r num m-delta" data-l="Net">'+sgn(n)+money0(Math.abs(n))+'</td></tr>';}).join('')+
      '</tbody></table>';
  });
})();
drawTrend();
renderYear(selYear);
fitHero();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitHero);
liveOn=true;
var rT;window.addEventListener('resize',function(){clearTimeout(rT);rT=setTimeout(function(){drawTrend();fitHero();},150);});



/* ---- the section rail: the page's one section outline (2026-10-30: the floating 1/6 pager is gone) ---- */
/* tabs and their sections are paired once, so the marked tab can never drift off the section it names (an in-page tab with no
   section is a build error, see muni_routes.check_rail); a tab that leaves the page (href not '#...') is not part of the spy.
   The section in view is marked (.on + aria-current="location"); nothing is marked on the first screen above the first section. */
var railPairs=[].slice.call(document.querySelectorAll('.rail a[href^="#"]')).map(function(a){
  return [a,document.querySelector(a.getAttribute('href'))];}).filter(function(p){return p[1];});
var links=railPairs.map(function(p){return p[0];});
var secs=railPairs.map(function(p){return p[1];});
var current=-1, painted=null;
var railIn=document.querySelector('.rail .rail-in');
edgeFade(railIn);
function paint(){
  var on=current>=0?links[current]:null;
  links.forEach(function(a){var is=a===on;a.classList.toggle('on',is);
    if(is)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
  if(painted!==on){painted=on;                     /* the rail scrolls to the marked tab, never the page */
    var r=on&&on.parentNode;
    if(r&&r.scrollWidth>r.clientWidth+4) r.scrollTo({left:Math.max(0,on.offsetLeft-(r.clientWidth-on.offsetWidth)/2)});
  }
}
function syncNav(){
  if(document.documentElement.classList.contains('pl-tabs')) return;      /* r6 F-05: a phone's tabs mark their own part */
  var yv=window.scrollY+92,best=-1;
  secs.forEach(function(s,i){if(s.offsetTop<=yv)best=i;});
  if(best>=0&&window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2) best=secs.length-1;
  current=best;
  paint();
}
/* keyboard focus never lands under the pinned rail: a control reached by Tab / Shift+Tab that sits behind it is scrolled clear
   (anchor jumps already land below it: the sections' scroll-margin). The drill-down sheet and the masthead are left alone. */
(function(){
  var rail=document.querySelector('.rail'); if(!rail) return;
  document.addEventListener('focusin',function(e){
    var t=e.target; if(!t||!t.getBoundingClientRect||rail.contains(t)) return;
    if(t.closest&&t.closest('#modal,.pl-mast,.pl-switch,[role="dialog"]')) return;
    if(t.matches&&!t.matches(':focus-visible')) return;
    var rb=rail.getBoundingClientRect(); if(rb.top>1||!rb.height) return;
    var r=t.getBoundingClientRect();
    if(r.top<rb.bottom&&r.bottom>0) window.scrollBy(0,r.top-rb.bottom-12);
  });
})();
window.addEventListener('scroll',syncNav,{passive:true});
window.addEventListener('resize',syncNav);
syncNav();

/* an address opens its sheet: '#cat=<0|1>|<label>[|<tab>]' (a shared link, a reload, another
   government's 'Across the county' row) opens that category's drill-down for the SELECTED filing
   year; '#cmp=<a>|<b>' opens the compare sheet on that pair. The same addresses on a same-page link
   (the hero's 'what changed' row) open the sheet through hashchange - the entry the link made is
   replaced first, so Back still closes the sheet in one step. */
(function(){
  function openFromHash(h,viaLink){
    /* the section may be 0|1 (this family's own links) or rev|exp (the city page's 'Across the county' rows,
       which encode the whole value - IDXB-12); the address is decoded once, as a whole, before it is read */
    var raw=h; try{raw=decodeURIComponent(h);}catch(e){}
    var m=/^#cat=(0|1|rev|exp)[|]([^|]+?)(?:[|](breakdown|trend|composition|across))?$/.exec(raw);
    if(m){
      var sec=m[1]==='exp'?1:m[1]==='rev'?0:+m[1], label=m[2];
      var yr=flowsFor(selYear,sec,label).length?selYear:O.years[O.years.length-1];
      if(!flowsFor(yr,sec,label).length) return false;
      hashReplace('');                                      /* the sheet pushes its own entry */
      openModal(yr,sec,label,sec?'--exp':'--rev',null);
      if(m[3]&&m[3]!==MODAL.tab) selectTab(m[3]);
      return true;
    }
    m=/^#cmp=(\d{4})[|](\d{4})$/.exec(h);
    if(m){
      var a=+m[1],b=+m[2];
      if(O.years.indexOf(a)<0||O.years.indexOf(b)<0||a===b) return false;
      hashReplace('');
      openCompareModal(null,a,b);
      return true;
    }
    return false;
  }
  var h0=location.hash;
  if(/^#(cat|cmp)=/.test(h0)) window.addEventListener('load',function(){setTimeout(function(){window.__plArriving=true;try{openFromHash(h0);}finally{window.__plArriving=false;}},250);});
  /* a same-page link to a sheet opens it directly (no second history entry) */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#cat="],a[href^="#cmp="]'); if(!a) return;
    if(!document.getElementById('modal').hidden) closeModal(true);
    if(openFromHash(a.getAttribute('href'),true)) e.preventDefault();
  });
  window.addEventListener('hashchange',function(){
    var h=location.hash; if(!/^#(cat|cmp)=/.test(h)) return;
    if(!document.getElementById('modal').hidden){
      if(MODAL.kind==='cat'&&h===catHash()) return;   /* Back out of a line's history lands on the sheet's own address: already open */
      closeModal(true);
    }
    openFromHash(h,true);
  });
})();

})();
/* r7 F-13: what needs no data - the bars' entrance, the folds, the keyboard on row-like controls - runs whether or not the data arrived */
(function(){
"use strict";
var REDUCED=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
/* ---- neighbors toggle: totals vs per resident ---- */
(function(){
  var seg=document.getElementById('sibSeg'), host=document.getElementById('sibRank');
  if(!seg||!host) return;
  seg.addEventListener('click',function(e){
    var b=e.target.closest('button[data-mode]'); if(!b) return;
    [].forEach.call(seg.querySelectorAll('button'),function(x){
      x.setAttribute('aria-pressed',x===b?'true':'false');});
    var mode=b.getAttribute('data-mode');
    [].forEach.call(host.querySelectorAll('a.rk'),function(a){
      var v=+a.getAttribute('data-'+mode), w=a.getAttribute('data-w'+mode);
      a.querySelector('.vl').textContent='$'+v.toLocaleString('en-US')+(mode==='per'?' per resident':'');
      a.querySelector('.tr i').style.width=w+'%';
    });
  });
})();

/* ---- bars grow once on view ---- */
(function(){
  if(REDUCED||!('IntersectionObserver' in window))return;
  var lists=[].slice.call(document.querySelectorAll('.rank'));
  lists.forEach(function(x){x.classList.add('pregrow');});
  var io=new IntersectionObserver(function(es){es.forEach(function(en){
    if(!en.isIntersecting)return;en.target.classList.remove('pregrow');io.unobserve(en.target);});},{threshold:.15});
  lists.forEach(function(x){io.observe(x);});
})();

/* ---- r8 W-01: the aside answers for the remembered home when this device keeps one ---- */
(function(){
  var a=document.querySelector('aside[data-pl-aside][data-rate]'); if(!a) return;
  var h='',x=null;
  try{h=localStorage.getItem('pl-home')||'';x=JSON.parse(localStorage.getItem('pl-home-x')||'null');}catch(e){}
  try{if(window.PLAddr&&PLAddr.home){var ph=PLAddr.home();if(ph&&ph.a&&!ph.preview) h=ph.a;}}catch(e){}
  var c=(h&&x&&x.a===h&&x.card&&x.card.a===h)?x.card:null; if(!c) return;
  var rate=+a.getAttribute('data-rate'),fy=a.getAttribute('data-fy'),$=function(id){return document.getElementById(id);};
  var money0=function(n){return (n<0?'−$':'$')+Math.round(Math.abs(n)).toLocaleString('en-US');};      /* the chrome's money0, whole dollars */
  if(c.mv||c.ex){
    $('asHomeV').textContent=c.mv?money0(Math.round(c.mv/1000*rate)):'$0';
    $('asHomeS').textContent=c.mv?(c.a+' \u00b7 about '+money0(c.mv)+' at market on the City\u2019s roll \u00b7 FY'+fy+' county rate'):(c.a+' \u00b7 wholly exempt on the roll');
    $('asHome').hidden=false;
  }
  if(c.leg&&c.dist&&c.dist.d){
    var l=document.createElement('a'); l.href='legislators/'+c.leg.s+'.html'; l.textContent=c.leg.n;
    $('asLegV').textContent=''; $('asLegV').appendChild(l);
    $('asLegS').textContent='District '+c.dist.d+(c.leg.p?' \u00b7 '+c.leg.p:'')+' \u00b7 for '+c.a;
  }
})();

/* ---- folds (C-C2): a phone shows the top of a long list and one 44px button opens the rest (a desk shows it all);
   a <details data-wide-open> starts open on a desk and folded on a phone - every honesty note stays outside the folds ---- */
(function(){
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-fold]'); if(!b) return;
    var t=document.getElementById(b.getAttribute('data-fold')); if(!t) return;
    var o=t.classList.toggle('open');
    b.setAttribute('aria-expanded',o?'true':'false');
    b.textContent=b.getAttribute(o?'data-less':'data-more');
  });
  /* r8 F-04: the budget lines fold to the ten biggest (the total stays); the button says how many are behind it */
  /* VISUALS (2026-11-02, the owner's call): nothing is behind a click - every budget line shows, as in r7 (F-04's fold is withdrawn; the
     button stays hidden) */
  var wide=window.matchMedia('(min-width:641px)');
  function openWide(){if(wide.matches) [].forEach.call(document.querySelectorAll('details[data-wide-open]'),function(d){d.open=true;});}
  openWide();                                    /* a phone turned to landscape gains the desk layout (its summary is hidden): the fold must already be open */
  if(wide.addEventListener) wide.addEventListener('change',openWide); else wide.addListener(openWide);
})();

/* ---- keyboard for row-like controls ---- */
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var t=e.target.closest('[data-rank],[data-exp],[data-acct],[data-other],[data-fl2],[data-fobj],[data-cclear],[data-mvlabel]');
  if(!t||t!==e.target||t.tagName==='BUTTON'||t.tagName==='A')return;
  e.preventDefault();
  t.click();
});

})();

/* deep link from Every resolution (decisions.html): #acct-A9950 opens that account's
   category modal and expands its history */
function traceAcct(hash){
  var m=/^#acct-([A-Z]{1,3})(\d{4})$/.exec(hash); if(!m) return;
  if(!window.__traceEnv) return;                     /* r7 F-13: the data did not arrive (the page says so where it would have drawn) */
  var env=window.__traceEnv(); var O=env.O, openModal=env.openModal;
  var fund=m[1], fn=m[2], best=null;
  O.flows.forEach(function(f){
    var code=String(f[6]||'');
    var d=code.replace(/[^0-9]/g,''), L=code.replace(/[^A-Za-z]/g,'').toUpperCase();
    if(d.slice(0,4)!==fn) return;
    if(L && fund && L!==fund) return;
    if(!best || f[0]>best[0] || (f[0]===best[0] && Math.abs(f[7])>Math.abs(best[7]))) best=f;
  });
  if(!best){
    /* fund not filed under that letter - retry on function digits alone */
    O.flows.forEach(function(f){
      var d=String(f[6]||'').replace(/[^0-9]/g,'');
      if(d.slice(0,4)!==fn) return;
      if(!best || f[0]>best[0] || (f[0]===best[0] && Math.abs(f[7])>Math.abs(best[7]))) best=f;
    });
  }
  if(!best) return;
  openModal(best[0], best[1], O.dict.l1[best[2]], best[1]?'--exp':'--rev', null);
  setTimeout(function(){
    var rows=Array.prototype.slice.call(document.querySelectorAll('#modal [data-acct]'));
    var hit=null;
    rows.forEach(function(r2){
      var d2=String(r2.getAttribute('data-acct')||'').replace(/[^0-9]/g,'');
      if(!hit && d2.slice(0,4)===fn) hit=r2;
    });
    if(hit){ hit.click(); hit.scrollIntoView({block:'center'}); }
  }, 900);
}
if(location.hash.indexOf('#acct-')===0){
  window.addEventListener('load',function(){ setTimeout(function(){ window.__plArriving=true; try{ traceAcct(location.hash); }finally{ window.__plArriving=false; } }, 250); });
}
/* a link to an account on this very page changes only the hash: open the account then too */
window.addEventListener('hashchange',function(){ if(location.hash.indexOf('#acct-')===0) traceAcct(location.hash); });
/* r8 review R8-02: #bl-A8000 is a General fund line of Budget vs actual: the part opens (the chrome's views land on it), a folded line
   unfolds, and the line is scrolled to the middle and marked (a left rule and a tint, never hue alone) */
function landLine(){
  var m=/^#bl-A\d{4}$/.exec(location.hash); if(!m) return;
  setTimeout(function(){
    var tr=document.getElementById(location.hash.slice(1)); if(!tr) return;
    var t=document.getElementById('rootTable'), b=document.querySelector('[data-fold="rootTable"]');
    if(t&&b&&t.classList.contains('bfold')&&!t.classList.contains('open')&&tr.classList.contains('bmore')) b.click();
    [].forEach.call(document.querySelectorAll('#rootTable tr.bl-hit'),function(x){ x.classList.remove('bl-hit'); });
    tr.classList.add('bl-hit'); tr.scrollIntoView({block:'center'});
  },320);
}
window.addEventListener('hashchange',landLine);
if(/^#bl-A\d{4}$/.test(location.hash)) window.addEventListener('load',landLine);
