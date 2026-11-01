
var phoneMQ=window.matchMedia('(max-width:640px)');
function $(id){ return document.getElementById(id); }
var KEY=($('keyT')||{}).innerHTML||'';
/* r6 F-15: a record's panel fills from the page's payload the first time it opens (on a desk, in the sheet, by its address, for print) */
var LZ=null;
function fill(ext){
  if(!ext||!ext.hasAttribute('data-pl-lazy')) return;
  if(!LZ) LZ=(window.PLD&&PLD['pl-lazy'])||JSON.parse(($('pl-lazy')||{}).textContent||'{}');
  ext.innerHTML=LZ[ext.id]||''; ext.removeAttribute('data-pl-lazy');
}
window.addEventListener('beforeprint',function(){ [].forEach.call(document.querySelectorAll('.lext[data-pl-lazy]'),fill); });
/* the key to a record goes in when a record opens (once per record), after its chart and numbers */
function withKey(root){ var b=root.querySelector('.lbody'); if(KEY&&b&&!root.querySelector('.fpkey')) b.insertAdjacentHTML('afterend',KEY); }
/* a member's row is a disclosure: on a desk it opens the record below it; on a phone it opens the record in a bottom sheet
   (see openSheet), so the page never jumps and nothing pushes the other members down */
document.addEventListener('click',function(e){
  var b=e.target.closest('.lbtn'); if(!b) return;
  if(phoneMQ.matches){ openSheet(b); return; }
  var open=b.getAttribute('aria-expanded')==='true', ext=$(b.getAttribute('aria-controls'));
  if(!open){ fill(ext); withKey(ext); }
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
  fill(ext);
  $('lsTitle').textContent=li.getAttribute('data-full')||li.getAttribute('data-name');
  $('lsSub').textContent=li.getAttribute('data-sub');
  body.innerHTML=ext.innerHTML; withKey(body);
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
/* find your legislator by address (PL-01): the ballot page's address search - the City's final roll, the same matching, the same
   rows - over data/districts/nt-2026.json, every parcel's district in the roll's order (tools/build_districts.py), both fetched on
   first use. A pick names the district, its legislator and the census block that decides it; a parcel the State's map does not draw
   says so rather than guess. If either file fails to load, the box goes and the Board of Elections lookup below it stays. */
var FIND=(function(){
  var box=$('afind'), F=JSON.parse($('find-data').textContent), inp=$('addr-leg'), list=$('addrL-leg'), res=$('fres'), how=$('findHow'),
      R=null, T=null, DT=null, hits=[], act=-1, loading=false, moved=false, pend=null, pendA='', me={i:null,a:null,restore:function(i,a){ pend=[i,a]; load(); }};
  /* r5 W-01: 'your home' - an address picked here, on the tax estimate or on the ballot page is kept on this device only (localStorage:
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
  function load(){
    if(DT||loading) return; loading=true;
    function get(u){ return fetch(u).then(function(r){ if(!r.ok) throw 0; return r.json(); }); }
    Promise.all([get(F.roll),get(F.table)]).then(function(a){
      if(a[1].year!==a[0].year||a[1].parcels!==a[0].a.length) throw 0;      /* the table is this roll's own, or the box says nothing */
      R=a[0]; DT=a[1]; T=R.a.map(addrToks); loading=false;
      if(pend){ var p=pend; pend=null; if(R.a[p[0]]===p[1]) show(p[0],false); }
      else if(pendA){ var k=R.a.indexOf(pendA); pendA=''; if(k>=0) show(k,false); }
      else if(inp.value&&document.activeElement===inp) search();
    }).catch(function(){ loading=false; box.hidden=true; });
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
        hx(R.a[i])+'</b><span>'+(R.c&&clsOf(R.c[i])?clsOf(R.c[i])+' \u00b7 ':'')+(/^\d/.test(R.a[i])?'':'no house number · ')+(R.v[i]?'assessed '+fmt(R.v[i]):'no taxable value')+'</span></li>'}).join('')
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
    h+='<p class="fr-also">For this address: <a href="index.html#taxes">your tax estimate</a> &middot; <a href="ballot.html">what the ballot would cost</a>'+
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
    if(write){ try{var u=new URL(location.href); if(s==='name') u.searchParams.delete('sort'); else u.searchParams.set('sort',s); history.replaceState(null,'',u);}catch(e){} }
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
/* hover-linking. (1) A year column: hover it in any open record and that year lights, with a tooltip of that member's numbers
   for the year; a tap on a column shows its numbers for a moment. (2) A dot in the glance rows <-> that member's row.
   Hover-capable pointers only for the lighting, so a tap never leaves a stuck highlight. */
(function(){
  var hoverMQ=window.matchMedia('(hover:hover)'), touchMQ=window.matchMedia('(hover:none)'), TIP=PL.tip(), curY='', curName='', tapT=null;
  /* the tooltip repeats what the record already says in print: hidden from assistive tech, like any decoration */
  (function(){ var show=TIP.show; TIP.show=function(h,x,y){ show(h,x,y); var n=document.querySelector('.pl-tip'); if(n) n.setAttribute('aria-hidden','true'); }; })();
  /* on a touch screen the dots are not controls: the list is (the dots stay as a picture) */
  if(touchMQ.matches) [].forEach.call(document.querySelectorAll('.dot'),function(d){ d.setAttribute('aria-hidden','true'); d.tabIndex=-1; });
  function colText(svg,y){
    var yr=[]; try{yr=JSON.parse(svg.getAttribute('data-yr'));}catch(e){}
    var d=null; yr.forEach(function(e){ if(e&&String(e[0])===y) d=e; });
    var nm=svg.getAttribute('data-name');
    if(!d) return '<b>'+nm+'</b> · '+y+' · not serving';
    /* d = [year, readable meetings, absences, no votes, sponsored, motions made] */
    var s='<b>'+nm+'</b> · '+y+'<br>';
    s+=d[1]?('present at '+(d[1]-d[2])+' of '+d[1]+' readable meeting'+(d[1]===1?'':'s')):'no readable meetings that year';
    s+=' · '+d[3]+' no vote'+(d[3]===1?'':'s')+' · '+d[4]+' sponsored · '+d[5].toLocaleString('en-US')+' motions made';
    return s;
  }
  function setY(y){
    if(y===curY) return;
    [].forEach.call(document.querySelectorAll('.fp .hy.lit'),function(e){e.classList.remove('lit');});
    curY=y; if(!y) return;
    [].forEach.call(document.querySelectorAll('.fp .hy[data-y="'+y+'"]'),function(e){e.classList.add('lit');});
  }
  function setName(n){
    if(n===curName) return;
    [].forEach.call(document.querySelectorAll('.lm.lit,.dot.lit'),function(e){e.classList.remove('lit');});
    curName=n; if(!n) return;
    [].forEach.call(document.querySelectorAll('.lm[data-name="'+n+'"],.dot[data-name="'+n+'"]'),function(e){e.classList.add('lit');});
  }
  document.addEventListener('pointerover',function(e){
    if(!hoverMQ.matches) return;
    var h=e.target.closest&&e.target.closest('.fp .hy');
    if(h){ setY(h.getAttribute('data-y')); TIP.show(colText(h.closest('.fp'),curY),e.clientX,e.clientY); }
    else if(curY){ setY(''); TIP.hide(); }
    var d=e.target.closest&&e.target.closest('.dot'), c=e.target.closest&&e.target.closest('.lm');
    /* a parked pointer never clears a keyboard focus (the scroll that follows a focus fires a synthetic pointerover) */
    setName(d?d.getAttribute('data-name'):(c?c.getAttribute('data-name'):focusName));
  });
  var focusName='';
  document.addEventListener('pointerleave',function(){ setY(''); setName(''); TIP.hide(); });
  /* a tap on a column of a record chart shows that year's numbers for a moment */
  document.addEventListener('click',function(e){
    var h=e.target.closest&&e.target.closest('.fp .hy'); if(!h||hoverMQ.matches) return;
    setY(h.getAttribute('data-y')); TIP.show(colText(h.closest('.fp'),curY),e.clientX,e.clientY);
    clearTimeout(tapT); tapT=setTimeout(function(){setY('');TIP.hide();},2500);
  });
  /* the dot nearest a point in a row: the 46px zones overlap sideways, so the zone that caught the click is not always the dot
     meant - the nearest centre is */
  function nearestDot(t,x,y,within){
    var best=null, bd=within!=null?within*within:1e18;
    [].forEach.call(t.querySelectorAll('.dot:not(.cap)'),function(o){ var r=o.getBoundingClientRect(), dx=r.left+r.width/2-x, dy=r.top+r.height/2-y, dd=dx*dx+dy*dy; if(dd<bd){bd=dd;best=o;} });
    return best;
  }
  /* a dot goes to that member's row (and a keyboard focus on a dot lights the row) */
  document.addEventListener('click',function(e){
    var d=e.target.closest&&e.target.closest('.dot'); if(!d||touchMQ.matches) return;
    /* an embedded glance (?embed=glance) has no list: the dot opens that member on the full page */
    if(PL.embed&&PL.embed.mode){ var sl=d.getAttribute('data-name').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); try{ window.open(location.pathname.split('/').pop()+'#m-'+sl,'_top'); }catch(x){} return; }
    /* a real pointer click: take the nearest dot to the pointer (a keyboard or scripted click has no point) */
    if(e.detail>0&&(e.clientX||e.clientY)){ var nd=nearestDot(d.closest('.dpt'),e.clientX,e.clientY,null); if(nd) d=nd; }
    var c=document.querySelector('.lm[data-name="'+d.getAttribute('data-name')+'"]'); if(!c) return;
    c.scrollIntoView({behavior:(window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'),block:'center'});
    c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); setTimeout(function(){c.classList.remove('flash');},1700);
    var b=c.querySelector('.lbtn'); if(b) b.focus({preventScroll:true});
  });
  document.addEventListener('focusin',function(e){ var d=e.target.closest&&e.target.closest('.dot'); if(d){ focusName=d.getAttribute('data-name'); setName(focusName); } });
  document.addEventListener('focusout',function(e){ var d=e.target.closest&&e.target.closest('.dot'); if(d){ focusName=''; setName(''); } });
  /* a click beside every zone (between two stacks, or in the air of the row) goes to the nearest dot within 22px of the
     pointer - never to a farther one */
  document.addEventListener('click',function(e){
    if(touchMQ.matches) return;
    var t=e.target.closest&&e.target.closest('.dpt'); if(!t||e.target.closest('.dot')) return;
    var best=nearestDot(t,e.clientX,e.clientY,22);
    if(best) best.click();
  });
  /* dots that would overlap step up into another lane, and the row grows to hold them - but a stack is four deep at most:
     the rest are counted (+3) beside the top dot of their column. On a desk the lane pitch (24px) leaves every hit zone its
     own band; on a touch screen the dots are not controls, so the pitch closes to 18px. The two named extremes carry their
     label in a lane ABOVE the dots: anchored at the dot's x, grown toward the free side, a second label lane only when two
     labels would collide, and a dashed leader from the label down to the top of that dot's stack. */
  var LABH=26, CAPN=4;
  function PITCH(){ return touchMQ.matches?18:24; }
  function DIAX(){ return touchMQ.matches?16:24; }        /* x-distance that starts a new lane */
  function relane(){
    var P=PITCH(), X=DIAX();
    [].forEach.call(document.querySelectorAll('.dpt'),function(t){
      [].forEach.call(t.querySelectorAll('.more'),function(m){ m.parentNode.removeChild(m); });
      [].forEach.call(t.querySelectorAll('.dot'),function(d){ d.classList.remove('cap'); });
      var W=t.clientWidth, dots=[].slice.call(t.querySelectorAll('.dot')).map(function(d){var m=d.querySelector('.dd'); return {el:d,x:parseFloat(d.style.left)*W/100,half:d.offsetHeight/2||12,ins:m?(parseFloat(getComputedStyle(m).left)||0):0};});
      dots.sort(function(a,b){return a.x-b.x;});
      var ends=[], maxLane=0;
      dots.forEach(function(d){ var lane=-1; for(var k=0;k<ends.length;k++){ if(d.x>ends[k]+X){lane=k;break;} } if(lane<0){lane=ends.length;ends.push(0);} ends[lane]=d.x; d.lane=lane; });
      /* the cap: a fifth dot in a stack is counted, not drawn (a named extreme is always drawn) */
      dots.forEach(function(d){ d.cap=d.lane>=CAPN&&!d.el.classList.contains('ext'); d.el.classList.toggle('cap',d.cap); });
      var vis=dots.filter(function(d){return !d.cap;}), hid=dots.filter(function(d){return d.cap;});
      vis.forEach(function(d){ maxLane=Math.max(maxLane,d.lane); d.more=0; d.names=[]; });
      hid.forEach(function(h){
        var best=null, bd=1e9;
        vis.forEach(function(v){ var dd=Math.abs(v.x-h.x)+(v.lane===CAPN-1?0:1000); if(dd<bd){bd=dd;best=v;} });
        if(best){ best.more++; best.names.push(h.el.getAttribute('data-name')); }
      });
      var hasMore=vis.some(function(d){return d.more>0;});
      /* the labels of the extremes: measure, anchor toward the free side, lane them */
      var labs=[], lends=[];
      vis.forEach(function(d){
        var ext=d.el.classList.contains('ext'), dn=d.el.querySelector('.dn');
        if(!ext){ d.el.classList.toggle('rt',d.x>W*.72); return; }
        var lw=dn.offsetWidth, rt=d.x-8+lw>W+2;
        d.el.classList.toggle('rt',rt);
        labs.push({d:d,dn:dn,L:rt?d.x+8-lw:d.x-8,w:lw,h:dn.offsetHeight||22});
      });
      labs.sort(function(a,b){return a.L-b.L;});
      labs.forEach(function(l){ var lvl=-1; for(var k=0;k<lends.length;k++){ if(l.L>lends[k]+10){lvl=k;break;} } if(lvl<0){lvl=lends.length;lends.push(0);} lends[lvl]=l.L+l.w; l.lvl=lvl; });
      var labLanes=lends.length, top=labLanes*LABH+4+(hasMore?16:0);
      var H=top+(maxLane+1)*P+18;
      t.style.height=H+'px';
      t.style.setProperty('--labh',(labLanes*LABH)+'px');
      function cy(lane){ return top+(maxLane-lane)*P+P/2; }
      vis.forEach(function(d){ d.el.style.top=cy(d.lane)+'px'; });
      labs.forEach(function(l){
        var d=l.d, T=l.lvl*LABH, dotTop=cy(d.lane)-d.half;
        l.dn.style.top=(T-dotTop)+'px';
        /* the leader ends above the TOP of this dot's stack, so it never crosses a stack-mate */
        var topLane=d.lane; vis.forEach(function(o){ if(Math.abs(o.x-d.x)<X) topLane=Math.max(topLane,o.lane); });
        var stackTop=cy(topLane)-d.half, lead=Math.max(0,(stackTop-2)-(T+l.h+2)), INS=d.ins;     /* INS: the button's empty margin around its mark */
        d.el.style.setProperty('--lgap',(dotTop-stackTop+2-INS)+'px');
        d.el.style.setProperty('--lead',(lead>0?lead+INS:0)+'px');
      });
      vis.forEach(function(d){
        if(!d.more) return;
        var m=document.createElement('span'); m.className='more'; m.textContent='+'+d.more; m.title='Also here: '+d.names.join(', ');
        m.style.left=d.x+'px'; m.style.top=(cy(d.lane)-d.half-15+d.ins)+'px'; t.appendChild(m);
      });
    });
  }
  relane(); var rt=null; window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(relane,120);});
  /* a #m-<name> landing (an embedded glance's dot, a shared link) lights that member's row, as a dot click does */
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
  /* r4 F-03: 'Copy link to this record' (Share where the device has a share sheet), from the record or the sheet that copies it */
  document.addEventListener('click',function(e){
    var cb=e.target.closest&&e.target.closest('[data-mcopy]'); if(!cb) return;
    var url=location.href.split('#')[0].split('?')[0]+'#m-'+cb.getAttribute('data-mcopy'), said=cb.parentNode.querySelector('.lcopy-s');
    function done(ok){ if(said){ said.textContent=ok?' Link copied':' Copy this address: '+url; setTimeout(function(){ said.textContent=''; },2600); } }
    if(navigator.share&&phoneMQ.matches){ navigator.share({title:document.title,url:url}).catch(function(){}); return; }
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function(){ done(true); },function(){ done(false); });
    else done(false);
  });
})();
