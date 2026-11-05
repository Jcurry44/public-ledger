
/* r7 F-12 + W-07: the record chart. A column is a year: a mouse over it, a tap on it or the left / right arrow keys select one, and
   the readout under the chart says that year in one line ('2019 · attendance 93% · 2 no votes · 23 sponsored') and how it was counted
   on a second; the year's column lights and prints its three values. Leaving with the mouse, or Esc, goes back to the year the reader
   chose (at first, the latest). One set of listeners serves every chart on the page, however late its record was filled. */
var plRC=(function(){
  var HOV=window.matchMedia('(hover:hover)'), cur=null;
  function data(rc){ if(!rc.__yr){ try{ rc.__yr=JSON.parse(rc.getAttribute('data-yr'))||[]; }catch(e){ rc.__yr=[]; } } return rc.__yr; }
  function served(rc){ var o=[]; data(rc).forEach(function(e,i){ if(e) o.push(i); }); return o; }
  function nf(n){ return Number(n).toLocaleString('en-US'); }
  function pl(n,one,many){ return nf(n)+' '+(n===1?one:many); }
  function read(rc,i){
    var d=data(rc), s=served(rc), y=d[s[0]][0]-s[0]+i, e=d[i];
    if(!e) return '<b>'+y+'</b> &middot; not serving that year<span class="r2"> Their years in this record: '+d[s[0]][0]+
      (s.length>1?'&ndash;'+d[s[s.length-1]][0]:'')+'.</span>';
    var att=e[1]?Math.round(100*(e[1]-e[2])/e[1])+'%':'not readable';
    return '<b>'+e[0]+'</b> &middot; attendance '+att+' &middot; '+pl(e[3],'no vote','no votes')+' &middot; '+nf(e[4])+' sponsored'+
      '<span class="r2"> Present at '+nf(e[1]-e[2])+' of '+pl(e[1],'meeting','meetings')+' with a recorded vote'+
      (rc.getAttribute('data-sofar')===String(e[0])?' so far':'')+' &middot; '+pl(e[5],'motion made','motions made')+'.</span>';
  }
  function show(rc,i){
    [].forEach.call(rc.querySelectorAll('.rc-g>span.on,.rc-ax>span.on'),function(c){ c.classList.remove('on'); });
    [].forEach.call(rc.querySelectorAll('.rc-g,.rc-ax'),function(g){ var c=g.children[i]; if(c) c.classList.add('on'); });
    var r=rc.querySelector('.rc-read');
    if(r&&rc.__shown!==i){ rc.__shown=i; r.innerHTML=read(rc,i); }
  }
  function home(rc){ var s=served(rc); return rc.__sel!=null?rc.__sel:s[s.length-1]; }
  function at(rc,x){
    var g=rc.querySelector('.rc-g'); if(!g) return -1;
    var r=g.getBoundingClientRect(), n=g.children.length; if(!n||x<r.left||x>r.right) return -1;
    return Math.max(0,Math.min(n-1,Math.floor((x-r.left)/(r.width/n))));
  }
  function init(root){
    [].forEach.call((root||document).querySelectorAll('.rc'),function(rc){ if(rc.__init||!served(rc).length) return; rc.__init=1; show(rc,home(rc)); });
  }
  function back(){ if(cur){ show(cur,home(cur)); cur=null; } }
  document.addEventListener('pointermove',function(e){
    if(e.pointerType!=='mouse'||!HOV.matches) return;
    var p=e.target.closest&&e.target.closest('.rc-p'), rc=p&&p.closest('.rc'), i=rc?at(rc,e.clientX):-1;
    if(cur&&cur!==rc) back();
    if(i<0){ back(); return; }
    cur=rc; show(rc,i);
  });
  document.documentElement.addEventListener('mouseleave',back);
  document.addEventListener('click',function(e){
    var p=e.target.closest&&e.target.closest('.rc-p'); if(!p) return;
    var rc=p.closest('.rc'), i=at(rc,e.clientX); if(i<0) return;
    rc.__sel=i; cur=null; show(rc,i);
  });
  document.addEventListener('keydown',function(e){
    var p=e.target.closest&&e.target.closest('.rc-p'); if(!p||e.target!==p) return;
    var rc=p.closest('.rc'), s=served(rc); if(!s.length) return;
    /* before the reader has chosen a year the chart shows the latest: the right arrow then starts the walk at the first year */
    var k=e.key, j=rc.__sel==null?(k==='ArrowRight'?-1:s.length-1):s.indexOf(rc.__shown), nx=null;
    if(k==='ArrowRight') nx=s[Math.min(s.length-1,j+1)];
    else if(k==='ArrowLeft') nx=s[Math.max(0,j-1)];
    else if(k==='Home') nx=s[0];
    else if(k==='End') nx=s[s.length-1];
    else if(k==='Escape'){ rc.__sel=null; show(rc,home(rc)); return; }      /* (a sheet around it still closes on the same key) */
    else return;
    e.preventDefault(); rc.__sel=nx; show(rc,nx);
  });
  return {init:init};
})();
/* r7 W-06 + API.md: one Share - the chrome's PL.share (the share sheet on a touch screen, else the link copied, a toast either way);
   until a page has it, the toast module's share / copy */
function plShare(url,title){
  if(window.PL&&PL.share) return PL.share({url:url,title:title});
  if(window.PL&&PL.shareLink) return PL.shareLink(title,url,{coarse:true});
  if(window.PL&&PL.copyText) return PL.copyText(url,'Link copied');
}
var phoneMQ=window.matchMedia('(max-width:640px)');
function $(id){ return document.getElementById(id); }
/* r6 F-15: a record's panel fills from the page's payload the first time it opens (on a desk, in the sheet, by its address, for print).
   r7 F-13: the payload is a file beside the page once the build stamps it; if it did not load, the list says so above itself and a
   record opened says so in its place - the shared failure message (PL.dataFail) with a Try again that asks for the file again. */
var LZ=null, lzBusy=false;
function payload(){
  if(LZ) return LZ;
  var d=window.PLD&&PLD['pl-lazy'];
  if(!d){ var el=$('pl-lazy'); if(el){ try{ d=JSON.parse(el.textContent); }catch(x){ d=null; } } }
  return (LZ=d||null);
}
function fill(ext){
  if(!ext||!ext.hasAttribute('data-pl-lazy')) return true;
  var d=payload(); if(!d||!d[ext.id]) return false;
  ext.innerHTML=d[ext.id]; ext.removeAttribute('data-pl-lazy'); return true;
}
function failIn(el,retry){
  if(!el) return;
  if(window.PL&&PL.dataFail){ PL.dataFail(el,retry); return; }
  el.innerHTML='<p class="lz-msg" role="status">'+(navigator.onLine===false?'You&rsquo;re offline: this part needs a connection.':'This part of the page didn&rsquo;t load: the connection may have dropped.')+
    ' <button type="button" class="pl-pill lz-retry">Try again</button></p>';
  var b=el.querySelector('.lz-retry'); if(b) b.addEventListener('click',function(){ if(!retry){ location.reload(); return; } var r=retry(); if(r&&r.then) r.then(null,function(){ failIn(el,retry); }); });
}
function lzFail(){ var f=$('lzFail'); if(f){ f.hidden=false; failIn(f,lzRetry); } }
function lzRetry(){
  return new Promise(function(ok,no){
    if(payload()){ lzOk(); ok(); return; }
    var s=document.querySelector('script[data-pl-payload="pl-lazy"]');
    if(!s){ location.reload(); return; }
    if(lzBusy){ no(); return; } lzBusy=true;
    var n=document.createElement('script'); n.src=s.src+(s.src.indexOf('?')<0?'?':'&')+'try='+Date.now();
    n.onload=function(){ lzBusy=false; if(payload()){ lzOk(); ok(); } else no(); };
    n.onerror=function(){ lzBusy=false; no(); };
    document.body.appendChild(n);
  });
}
function lzOk(){
  var f=$('lzFail'); if(f){ f.hidden=true; f.innerHTML=''; }
  /* a record that was open when its file failed fills now, on a desk or in the sheet */
  [].forEach.call(document.querySelectorAll('.lext[data-pl-lazy]:not([hidden])'),function(x){ if(fill(x)) plRC.init(x); });
  if(!SHEET.el.hidden&&SHEET.opener){ var x=$(SHEET.opener.getAttribute('aria-controls')); if(fill(x)){ $('lsBody').innerHTML=x.innerHTML; plRC.init($('lsBody')); } }
}
if(!((window.PLD&&PLD['pl-lazy'])||$('pl-lazy'))) lzFail();
window.addEventListener('beforeprint',function(){ [].forEach.call(document.querySelectorAll('.lext[data-pl-lazy]'),function(x){ if(fill(x)) plRC.init(x); }); });
/* r7 R-15: paper lists every member from any window - the earlier members' fold opens only on a wide screen (a phone printed 14 fewer) */
(function(){ var e=$('earlier'), was=null; if(!e) return;
  window.addEventListener('beforeprint',function(){ if(was===null){ was=e.open; e.open=true; } });
  window.addEventListener('afterprint',function(){ if(was!==null){ e.open=was; was=null; } }); })();
/* a member's row is a disclosure: on a desk it opens the record below it; on a phone it opens the record in a bottom sheet
   (see openSheet), so the page never jumps and nothing pushes the other members down */
document.addEventListener('click',function(e){
  var b=e.target.closest('.lbtn'); if(!b) return;
  if(phoneMQ.matches){ openSheet(b); return; }
  var open=b.getAttribute('aria-expanded')==='true', ext=$(b.getAttribute('aria-controls'));
  if(!open){ if(fill(ext)) plRC.init(ext); else failIn(ext,lzRetry); }
  b.setAttribute('aria-expanded',String(!open));
  ext.hidden=open;
  b.closest('.lm').classList.toggle('open',!open);
  memberHash(open?null:b.closest('.lm').id);      /* r4 F-03: the open record is the page's address */
});
/* MOB-15: the member's record as a bottom sheet. The sheet is filled from the row's own record (the same chart, numbers and
   links into the register); opening it pushes ONE history entry so Back closes it and never leaves the page. */
var SHEET={el:$('lsheet'), opener:null, from:null}, LAYER=PL.layer({hide:function(fromPop){ closeSheet(true); }, isOpen:function(){ return !SHEET.el.hidden; }});
/* r4 F-03: the record in view is the address (#m-<name>), replaced in place so Back still means what it meant; null takes it off */
function memberHash(id){
  try{ var u=new URL(location.href); u.hash=id?'#'+id:''; history.replaceState(history.state,'',u.href.replace(/#$/,'')); }catch(e){}
}
function openSheet(b,from,noPush){
  if(!SHEET.el.hidden) return;      /* r4 F-03: one record at a time (an address and the exit runtime may both ask) */
  var li=b.closest('.lm'), ext=$(b.getAttribute('aria-controls')), body=$('lsBody');
  $('lsTitle').textContent=li.getAttribute('data-full')||li.getAttribute('data-name');
  $('lsSub').textContent=li.getAttribute('data-sub');
  if(fill(ext)){ body.innerHTML=ext.innerHTML; plRC.init(body); } else failIn(body,lzRetry);
  body.scrollTop=0;
  SHEET.opener=b; SHEET.from=from||null; b.setAttribute('aria-expanded','true');
  SHEET.el.hidden=false; document.documentElement.style.overflow='hidden';
  /* r4 F-03: the sheet's own entry carries the record's address; a record opened BY its address (a shared link) pushes no entry */
  if(noPush) memberHash(li.id); else LAYER.push(location.pathname+location.search+'#'+li.id);
  /* the page model's one sheet: the rest of the page goes inert, Tab stays inside it, it is aria-modal (the backdrop is the
     tap-to-close target, so it carries data-pl-keep and stays live) */
  LAYER.modal(SHEET.el.querySelector('.sheet'),{opener:from||b,focus:'#lsClose'});
}
function closeSheet(fromPop){
  if(SHEET.el.hidden) return;
  LAYER.unmodal({focus:false});
  SHEET.el.hidden=true; document.documentElement.style.overflow='';
  var sh=SHEET.el.querySelector('.sheet'); sh.style.transform=''; sh.classList.remove('dragging');
  var b=SHEET.opener, f=SHEET.from; SHEET.opener=null; SHEET.from=null;
  if(b){ b.setAttribute('aria-expanded','false'); var t=(f&&f.isConnected)?f:b; if(t.isConnected) t.focus({preventScroll:true}); }
  if(!fromPop){ if(!LAYER.pop()) memberHash(null); }
  else memberHash(null);
}
$('lsClose').addEventListener('click',function(){ closeSheet(false); });
$('lsBack').addEventListener('click',function(){ closeSheet(false); });
document.addEventListener('keydown',function(e){
  if(SHEET.el.hidden) return;
  if(e.key==='Escape'){ e.preventDefault(); closeSheet(false); }      /* Tab is trapped by the layer */
});
/* a swipe down on the sheet's header (or its handle) dismisses it; the body keeps its own scroll */
(function(){
  var sh=SHEET.el.querySelector('.sheet'), head=$('lsHead'), y0=null, dy=0;
  head.addEventListener('touchstart',function(e){ if(!e.touches||!e.touches[0]) return; y0=e.touches[0].clientY; dy=0; sh.classList.add('dragging'); },{passive:true});
  head.addEventListener('touchmove',function(e){ if(y0===null||!e.touches||!e.touches[0]) return; dy=Math.max(0,e.touches[0].clientY-y0); sh.style.transform='translateY('+dy+'px)'; },{passive:true});
  function end(){ if(y0===null) return; sh.classList.remove('dragging'); sh.style.transform=''; var d=dy; y0=null; dy=0; if(d>90) closeSheet(false); }
  head.addEventListener('touchend',end); head.addEventListener('touchcancel',end);
})();
/* a phone rotated or a window widened: the sheet is a phone thing */
if(phoneMQ.addEventListener) phoneMQ.addEventListener('change',function(){ if(!phoneMQ.matches) closeSheet(false); });
/* find your legislator by address (PL-01): the tax estimate's address search - the City's final roll, the same matching, the same
   rows - over data/districts/nt-2026.json, every parcel's district in the roll's order (tools/build_districts.py), both fetched on
   first use. A pick names the district, its legislator and the census block that decides it; a parcel the State's map does not draw
   says so rather than guess. r7 F-13: if either file fails to load, the answer's place says so (the shared failure message) with a
   Try again that fetches them again; the Board of Elections lookup below stays. */
var FIND=(function(){
  var box=$('afind'), F=JSON.parse($('find-data').textContent), inp=$('addr-leg'), list=$('addrL-leg'), res=$('fres'), how=$('findHow'),
      R=null, T=null, DT=null, hits=[], act=-1, loading=false, moved=false, pend=null, pendA='', me={i:null,a:null,restore:function(i,a){ pend=[i,a]; load(); }};
  /* r5 W-01: 'your home' - an address picked here, on the tax estimate or on the front page is kept on this device only (localStorage:
     never sent, never in an address), so this finder answers for it on arrival; 'Forget this address' removes it */
  function homeGet(){try{return localStorage.getItem('pl-home')||''}catch(e){return ''}}function homeSet(a){try{localStorage.setItem('pl-home',String(a).slice(0,120))}catch(e){}}function homeForget(){try{localStorage.removeItem('pl-home');localStorage.removeItem('pl-home-x')}catch(e){}}function homeNote(k,v){try{var a=localStorage.getItem('pl-home')||'';if(!a)return;var x=JSON.parse(localStorage.getItem('pl-home-x')||'{}');if(x.a!==a)x={a:a};x[k]=v;localStorage.setItem('pl-home-x',JSON.stringify(x))}catch(e){}}
  var B36='0123456789abcdefghijklmnopqrstuvwxyz';
  /* matching: every typed word must start a word of the address, as typed or in its long form ('e' or 'eas' finds East,
     'st' finds St, '16th' finds Sixteenth) - so a half-typed word never loses the match */
  var LONG={e:'east',w:'west',n:'north',s:'south',st:'street',ave:'avenue',av:'avenue',rd:'road',dr:'drive',pl:'place',ct:'court',
    ln:'lane',blvd:'boulevard',pkwy:'parkway',terr:'terrace',ter:'terrace',cir:'circle',hwy:'highway',sq:'square',
    '1st':'first','2nd':'second','3rd':'third','4th':'fourth','5th':'fifth','6th':'sixth','7th':'seventh','8th':'eighth','9th':'ninth',
    '10th':'tenth','11th':'eleventh','12th':'twelfth','13th':'thirteenth','14th':'fourteenth','15th':'fifteenth','16th':'sixteenth',
    '17th':'seventeenth','18th':'eighteenth','19th':'nineteenth','20th':'twentieth'};
  function words(s){return String(s).toLowerCase().replace(/[,#]|\.(?=\s|$)/g,' ').split(/\s+/).filter(Boolean)}
  function addrToks(s){var w=words(s);return w.concat(w.map(function(x){return LONG[x]}).filter(Boolean))}
  /* PL-12 (UX audit 2026-10-31): the roll's property class in plain words, the state's own categories by code */
  function clsOf(c){ c=+c||0; if(c===210||c===215) return 'one-family home'; if(c===220) return 'two-family home'; if(c===230) return 'three-family home'; if(c===260) return 'seasonal home'; if(c===270) return 'mobile home'; if(c===280||c===281) return 'multi-family home'; if(c===283) return 'home with a business'; if(c>=200&&c<300) return 'residential'; if(c>=300&&c<400) return 'vacant land'; if(c===411) return 'apartments'; if(c>=400&&c<500) return 'commercial'; if(c>=500&&c<600) return 'recreation'; if(c>=600&&c<700) return 'community service'; if(c>=700&&c<800) return 'industrial'; if(c>=800&&c<900) return 'utility'; if(c>=900) return 'public land'; if(c>=100&&c<200) return 'farm'; return ''; }
  function starts(t,w){var l=LONG[w];return t.some(function(x){return x.indexOf(w)===0||(l&&x.indexOf(l)===0)})}
  function hx(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
  function fmt(n){return '$'+Math.round(n).toLocaleString('en-US')}
  /* a street name is a word of three letters or more, or an ordinal ('16th'): a house number alone is not an address (PL-19) */
  function named(w){return /[a-z]{3,}/.test(w)||/^\d+(st|nd|rd|th)$/.test(w)}
  /* r8 F-10: a file that fails - or that hangs - says so under the box within 5 s (the shared message, Try again fetches both again);
     a late arrival still answers, and takes the message away */
  var slow=null;
  function failNow(){ close(); res.hidden=false; how.hidden=false; failIn(res,function(){ res.hidden=true; res.innerHTML=''; loading=false; load(); }); }
  function load(){
    if(DT||loading) return; loading=true;
    function get(u){ return fetch(u).then(function(r){ if(!r.ok) throw 0; return r.json(); }); }
    clearTimeout(slow); slow=setTimeout(function(){ if(!DT&&loading) failNow(); },4500);
    Promise.all([get(F.roll),get(F.table)]).then(function(a){
      if(a[1].year!==a[0].year||a[1].parcels!==a[0].a.length) throw 0;      /* the table is this roll's own, or the box says nothing */
      clearTimeout(slow); if(res.querySelector('.pl-fail,.lz-msg')){ res.innerHTML=''; res.hidden=true; }
      R=a[0]; DT=a[1]; T=R.a.map(addrToks); loading=false;
      if(pend){ var p=pend; pend=null; if(R.a[p[0]]===p[1]) show(p[0],false); }
      else if(pendA){ var k=R.a.indexOf(pendA); pendA=''; if(k>=0) show(k,false); }
      else if(inp.value&&document.activeElement===inp) search();
    }).catch(function(){ clearTimeout(slow); loading=false; failNow(); });
  }
  function close(){list.hidden=true;inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');act=-1}
  function mark(i){act=i;[].forEach.call(list.children,function(li,j){li.setAttribute('aria-selected',j===i?'true':'false')});
    if(i>=0){inp.setAttribute('aria-activedescendant','addrO-leg-'+i);list.children[i].scrollIntoView({block:'nearest'})}
    else inp.removeAttribute('aria-activedescendant')}
  function search(){
    var q=words(inp.value),html;hits=[];
    if(me.i!=null&&inp.value!==R.a[me.i]){ me.i=null; me.a=null; res.hidden=true; how.hidden=false; }     /* a new address: the old answer goes */
    if(!q.length||(q.length===1&&q[0].length<2)){close();return}
    if(!DT)load();
    if(!q.some(named))html='<li class="none" role="option" aria-disabled="true">'+hx(F.hint)+'</li>';
    else{
      if(!DT){close();return}                  /* the files are on their way: no stale hint meanwhile; load() re-runs this */
      var num=/^\d+$/.test(q[0])?+q[0]:null,rest=q.slice(1);
      if(num!==null&&rest.length&&rest.some(named)){
        /* PL-12 (UX audit 2026-10-31): a house number and a street list that street's addresses, the typed number first and then the NEAREST numbers - never 1000-1099 ahead of 98 and 102 because they start with the same digits */
        for(var i=0;i<T.length;i++){var t=T[i];if(rest.every(function(w){return starts(t,w)}))hits.push(i)}
        hits.sort(function(a,b){var na=parseFloat(R.a[a]),nb=parseFloat(R.a[b]);return (isNaN(na)?1e9:Math.abs(na-num))-(isNaN(nb)?1e9:Math.abs(nb-num))||a-b});
      }else{
        for(var i=0;i<T.length&&hits.length<60;i++){
          var t=T[i];
          if(q.every(function(w){return starts(t,w)}))hits.push(i);
        }
        if(/^\d/.test(q[0]))hits.sort(function(a,b){return (T[a][0]===q[0]?0:1)-(T[b][0]===q[0]?0:1)||a-b});
        else hits.sort(function(a,b){return (/^\d/.test(R.a[a])?0:1)-(/^\d/.test(R.a[b])?0:1)||a-b});   /* homes before lots (PL-20) */
      }
      hits=hits.slice(0,8);
      html=hits.length?hits.map(function(i,j){return '<li role="option" id="addrO-leg-'+j+'" aria-selected="false"><b>'+
        hx(R.a[i])+'</b><span>'+[R.c&&clsOf(R.c[i])||'',/^\d/.test(R.a[i])?'':'no house number'].filter(Boolean).join(' \u00b7 ')+'</span></li>'}).join('')
        :'<li class="none" role="option" aria-disabled="true">No address on the '+R.year+' roll matches. Try the house number and street name only; an apartment may be listed under its building&rsquo;s number.</li>';
    }
    /* F-03 (clean-slate audit 2026-10-31): the first suggestion is highlighted - and Enter takes it - only when it carries the house number as typed (or no number was typed); otherwise Enter keeps the text and says there is no such address */
    var exact=hits.length&&(!/^\d/.test(q[0])||T[hits[0]][0]===q[0]);
    list.innerHTML=html;list.hidden=false;inp.setAttribute('aria-expanded','true');mark(exact?0:-1);moved=false;
  }
  function show(i,picked){
    me.i=i; me.a=R.a[i]; inp.value=R.a[i]; homeSet(R.a[i]);
    var c=DT.r.substr(2*i,2), h='<p class="fr-k">'+hx(R.a[i])+'</p>';
    if(c==='--'){
      h+='<p class="fr-d">No district shown</p><p class="fr-how">'+(DT.why.sub.indexOf(i)>=0?F.sub:F['new'])+'</p>';
      homeNote('leg',null);
    }else{
      var b=DT.blocks[B36.indexOf(c.charAt(0))*36+B36.indexOf(c.charAt(1))], m=F.m[b[2]], o=DT.near[i];
      homeNote('leg',{d:b[2],n:m.n,s:m.s});      /* r6 W-01: the front shows it */
      h+='<p class="fr-d">District '+b[2]+'</p><p class="fr-n"><b>'+hx(m.n)+'</b><span>'+hx(m.p)+'</span></p>'+
        '<p class="fr-a"><a class="pl-btn pri frec" href="#m-'+m.s+'" data-slug="'+m.s+'">Open their record</a></p>'+
        (o!=null?'<p class="fr-w">'+F.near.replace('{m}',F.near_m).replace('{o}',o?'District '+o:'another district')+'</p>':'')+
        '<p class="fr-how">'+F.how.replace('{t}',b[0]).replace('{b}',b[1]).replace('{p}',b[3]).replace('{d}',b[2])+'</p>';
    }
    h+='<p class="fr-also">For this address: <a href="index.html#taxes">your tax estimate</a>'+
      ' &middot; <button type="button" class="also-x">Forget this address</button></p>';
    res.innerHTML=h; res.hidden=false; how.hidden=true;      /* the answer carries its own 'how this is known', block by block */
    /* on a phone the keyboard covers the answer: put it away and bring the answer into view */
    /* r3 PL-14: focus moves TO the answer (it also puts the keyboard away) - never back to the page's top, as a blur did */
    if(picked&&phoneMQ.matches){ res.setAttribute('tabindex','-1'); try{ res.focus({preventScroll:true}); }catch(e){ res.focus(); }
      res.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}); }
  }
  function pick(j){ var i=hits[j]; if(i==null) return; close(); show(i,true); }
  res.addEventListener('click',function(e){ var x=e.target.closest('.also-x'); if(!x) return; homeForget(); x.parentNode.textContent='Forgotten on this device.'; });
  (function(){ var hs=homeGet(); if(hs&&!inp.value){ pendA=hs; load(); } })();      /* r5 W-01: a home kept on this device is answered on arrival */
  inp.addEventListener('focus',load);
  inp.addEventListener('input',search);
  inp.addEventListener('keydown',function(e){
    if(list.hidden&&e.key==='ArrowDown'){search();e.preventDefault();return}
    if(list.hidden)return;
    if(e.key==='ArrowDown'){if(moved||act!==0)mark(Math.min(act+1,hits.length-1));moved=true;e.preventDefault()}
    else if(e.key==='ArrowUp'){if(hits.length)mark(Math.max(act-1,0));e.preventDefault()}
    else if(e.key==='Enter'){if(act>=0){pick(act);e.preventDefault()}
      else if(R&&!list.hidden&&hits.length){e.preventDefault();
        res.innerHTML='<p class="findq">No <b>'+hx(inp.value.trim())+'</b> on the roll: pick the nearest from the list, or check the number.</p>';res.hidden=false;how.hidden=true}}
    else if(e.key==='Escape'){close();e.preventDefault()}
  });
  list.addEventListener('mousedown',function(e){e.preventDefault()});
  list.addEventListener('click',function(e){var li=e.target.closest('li[id]');if(li)pick(+li.id.split('-').pop())});
  inp.addEventListener('blur',function(){setTimeout(close,120)});
  return me;
})();
/* exit and return (10-07): a Back or a reload re-opens what the reader had open - the member's sheet on a phone (re-using its
   history entry, so one Back still closes it), the open rows on a desk, the address they looked up; the runtime then puts the
   scroll back */
if(window.PL&&PL.ret){
  PL.ret.keep(function(){
    var s={open:[].map.call(document.querySelectorAll('.lbtn[aria-expanded="true"]'),function(b){ var c=b.closest('.lm'); return c&&c.id; }).filter(Boolean)};
    if(!SHEET.el.hidden&&SHEET.opener){ var c=SHEET.opener.closest('.lm'); s.m=c&&c.id; }
    if(FIND.i!=null) s.a=[FIND.i,FIND.a];
    return s;
  });
  (function(R){
    if(!R) return;
    if(R.a) FIND.restore(R.a[0],R.a[1]);
    if(R.m&&phoneMQ.matches){ var mc=$(R.m), mb=mc&&mc.querySelector('.lbtn'); if(mb) openSheet(mb); }
    else if(!phoneMQ.matches&&R.open) R.open.forEach(function(id){ var c=$(id), b=c&&c.querySelector('.lbtn'); if(b&&b.getAttribute('aria-expanded')!=='true') b.click(); });
  })(PL.ret.saved&&PL.ret.saved.s);
}
/* the earlier members are an ink-row fold: open on a desk, closed on a phone (until the reader touches it) */
(function(){
  var ds=[].slice.call(document.querySelectorAll('details[data-open-wide]'));
  function apply(){ ds.forEach(function(d){ if(!phoneMQ.matches) d.open=true; else if(!d.touched_) d.open=false; }); }
  ds.forEach(function(d){ d.addEventListener('toggle',function(){ if(phoneMQ.matches) d.touched_=true; }); });
  if(phoneMQ.addEventListener) phoneMQ.addEventListener('change',apply);
  apply();
})();
/* order within each roster; the default is the surname (the page is rendered that way, so no re-sort on load); any other
   choice has a URL (?sort=). The value at the right of every row is the thing the order is about. */
(function(){
  var row=$('sortRow'), sub=$('sortsub');
  var LABEL={no:'Ordered by no votes cast, most first',
             rate:'Ordered by no votes per 100 votes, highest first',
             att:'Ordered by attendance, lowest first',
             sp:'Ordered by resolutions sponsored, most first',
             dist:'In district order, 1 to 15',
             name:'In alphabetical order. The buttons re-order the list; tap a member for their record.'};
  var SHORT={name:'in alphabetical order', dist:'in district order'};
  var NOV=function(li){ var n=+li.getAttribute('data-no'); return '<b class="num">'+n+'</b><small>no vote'+(n===1?'':'s')+'</small>'; };
  var VAL={name:NOV, dist:NOV, no:NOV,
    att:function(li){ return '<b class="num">'+li.getAttribute('data-atts')+'%</b><small>attendance</small>'; },
    rate:function(li){ return '<b class="num">'+li.getAttribute('data-rates')+'</b><small>per 100 votes</small>'; },
    sp:function(li){ return '<b class="num">'+li.getAttribute('data-sp')+'</b><small>sponsored</small>'; }};
  function key(c,s){
    if(s==='name') return c.getAttribute('data-name').toLowerCase();
    if(s==='att') return +c.getAttribute('data-att');
    if(s==='dist') return (+c.getAttribute('data-dist'))*10000+(3000-(+c.getAttribute('data-y1')));     /* an earlier member of the same district: the more recent first */
    return -(+c.getAttribute('data-'+s));
  }
  function apply(s,write){
    [].forEach.call(document.querySelectorAll('.roster'),function(r){
      var cards=[].slice.call(r.querySelectorAll(':scope>.lm'));
      cards.sort(function(a,b){var ka=key(a,s),kb=key(b,s); if(ka<kb) return -1; if(ka>kb) return 1;
        return a.getAttribute('data-name')<b.getAttribute('data-name')?-1:1;});
      cards.forEach(function(c){ r.appendChild(c); var v=c.querySelector('.pl-row-v'); if(v) v.innerHTML=VAL[s](c); });
    });
    [].forEach.call(row.querySelectorAll('[data-sort]'),function(b){ var on=b.getAttribute('data-sort')===s; b.setAttribute('aria-pressed',String(on)); b.classList.toggle('on',on); });
    /* both rosters re-sort, so both subtitles say so (the first is aria-live) */
    sub.textContent=LABEL[s];
    [].forEach.call(document.querySelectorAll('[data-sortsub]'),function(e){e.textContent=SHORT[s]||(LABEL[s].charAt(0).toLowerCase()+LABEL[s].slice(1));});
    if(write){ try{var u=new URL(location.href); if(s==='name') u.searchParams.delete('sort'); else u.searchParams.set('sort',s); history.replaceState(history.state,'',u);}catch(e){} }
  }
  row.addEventListener('click',function(e){var b=e.target.closest('[data-sort]'); if(!b) return; apply(b.getAttribute('data-sort'),true);});
  var s0=''; try{s0=new URL(location.href).searchParams.get('sort')||'';}catch(e){}
  if(s0==='act') s0='sp';
  if(LABEL[s0]&&s0!=='name') apply(s0,false);
})();
/* find your legislator: a district number (or the address answer's 'Open their record') opens that member's record - the sheet on a
   phone; on a desk the row comes to the top and opens in place, lit for a moment - and focus goes back to it when the sheet closes */
document.addEventListener('click',function(e){
  var c=e.target.closest('.dchip,.frec'); if(!c) return;
  var li=$('m-'+c.getAttribute('data-slug')), b=li&&li.querySelector('.lbtn'); if(!b) return;
  e.preventDefault();     /* the link is the no-script path: it jumps to the row; with a script the row opens its record too */
  if(phoneMQ.matches){ openSheet(b,c); return; }
  if(b.getAttribute('aria-expanded')!=='true') b.click();
  li.scrollIntoView({behavior:(window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'),block:'start'});
  li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash'); setTimeout(function(){li.classList.remove('flash');},1700);
  b.focus({preventScroll:true});
});
/* the sources fold opens when a link (the footer's, a shared URL) points at it */
(function(){
  var d=$('sources'); if(!d) return;
  function show(){ d.open=true; }
  if(location.hash==='#sources') show();
  window.addEventListener('hashchange',function(){ if(location.hash==='#sources') show(); });
  document.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('a[href="#sources"]'); if(a) show(); });
})();
/* a #m-<name> landing (a shared link, the search, a roll-call tile) lights that member's row and opens the record */
(function(){
  var h=location.hash; if(h.indexOf('#m-')!==0) return;
  var c=$(h.slice(1)); if(!c||!c.classList.contains('lm')) return;
  c.classList.add('flash'); setTimeout(function(){c.classList.remove('flash');},1700);
  /* r4 F-03: a shared record's address opens the record - the sheet on a phone, the row on a desk - its title in focus */
  var b=c.querySelector('.lbtn'); if(!b) return;
  /* (Back onto a sheet's own entry is the exit runtime's to re-open - it re-uses that entry - so only a fresh arrival opens it here) */
  if(phoneMQ.matches){ if(SHEET.el.hidden && !(history.state&&history.state.plLayer)) openSheet(b,null,true); }
  else if(b.getAttribute('aria-expanded')!=='true'){ b.click(); c.scrollIntoView({block:'start'}); b.focus({preventScroll:true}); }
})();
/* r7 W-06: Share shares the member's own page (its card names them): the phone's share sheet, else the link copied - a toast either way */
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-mshare]'); if(!b) return;
  plShare(new URL('legislators/'+b.getAttribute('data-mshare')+'.html',location.href).href,b.getAttribute('data-mname')+' \u2014 county legislator');
});
