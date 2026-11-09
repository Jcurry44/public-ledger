
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
var $=function(id){return document.getElementById(id);};
var phoneMQ=window.matchMedia('(max-width:640px)');
/* an explicit 'smooth' in script beats the stylesheet's reduced-motion rule, so every scripted jump asks first */
function smoothB(){return (window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches)?'auto':'smooth';}
var html=document.documentElement;
/* r7 F-13 (W-08): a part whose data did not arrive says so, with one way out - the chrome's shared message (PL.dataFail) when it is
   there, the same words here when it is not. Never an empty part, never an uncaught error. */
function failPart(el,retry){
  if(!el) return;
  if(window.PL&&PL.dataFail){ PL.dataFail(el,retry); return; }
  var off=navigator.onLine===false;
  el.innerHTML='<div class="ldg ldfail" role="alert"><span>'+(off?'You’re offline: this part needs a connection.':'This part of the page didn’t load: the connection may have dropped.')+
    '</span> <button class="pill" type="button">Try again</button></div>';
  el.querySelector('button').addEventListener('click',function(){ if(retry) retry(); else location.reload(); });
}
/* r7 W-03: the site's one 'Report a correction' link (the chrome turns it into an email when it is used, with the page's address and
   the record in view, [data-pl-record]); a record's receipt carries it with its id and page */
var CORR="<span class=\"pl-cx\"><a class=\"pl-correct\" href=\"corrections.html\" data-pl-correct>Report a correction</a> <button type=\"button\" class=\"pl-cx-copy\" data-pl-correct-copy>or copy it</button><span class=\"pl-cx-said\" role=\"status\" aria-live=\"polite\"></span></span>";
/* the records (the #R block, or the PLD payload script the stamp moves it into) did not arrive: both lists they draw say so, and
   Try again asks for the script once more and boots the register when it lands */
var REG_FAILED=false;
function regFail(){
  if(REG_FAILED||REG_BOOTED) return;
  REG_FAILED=true;
  $('register').classList.remove('pend');document.documentElement.classList.remove('reg-pend');        /* r7 F-39: the failure message shows where the list would be */
  ['moreBtn','contMore'].forEach(function(id){ var b=$(id); if(b) b.style.display='none'; });
  var sc=$('stripChart'); if(sc) sc.hidden=true;
  /* the head of the page too: a row of the latest meeting or of the money opens nothing without the records, and on a phone the
     register is another tab - the reader learns it where they are */
  var top=$('regFailTop'); if(top){ top.hidden=false; failPart(top,regRetry); }
  failPart($('list'),regRetry); failPart($('contList'),regRetry);
}
function regRetry(){
  var old=document.querySelector('script[data-pl-payload~="R"]');
  if(!old||!old.src){ location.reload(); return; }
  var s=document.createElement('script');
  function again(){ REG_FAILED=false; regFail(); }
  s.onload=function(){
    if(!(window.PLD&&PLD.R)){ again(); return; }
    REG_FAILED=false;
    ['moreBtn','contMore'].forEach(function(id){ var b=$(id); if(b) b.style.display=''; });
    var sc=$('stripChart'); if(sc) sc.hidden=false;
    var top=$('regFailTop'); if(top){ top.hidden=true; top.innerHTML=''; }
    $('list').innerHTML=''; $('contList').innerHTML='';
    bootRegister(true);
  };
  s.onerror=again;
  s.src=old.src; document.body.appendChild(s);
}
/* a records script that fails says so at once (resource errors reach a capture listener on window, not a bubbling one) */
window.addEventListener('error',function(e){
  var t=e.target; if(t&&t.tagName==='SCRIPT'&&/(^|\s)R(\s|$)/.test(t.getAttribute('data-pl-payload')||'')) setTimeout(regFail,0);
},true);
/* ---------- Move 10: the register boots lazily ----------
   The record payload (#R, 3.7 MB of JSON at the END of the body, after the chrome script, so the masthead, the theme and the
   rail are live before it is even tokenised) is parsed on first use, not on load. bootRegister(sync) does the whole
   register in two tasks - parse + indexes + controls, then (next frame) the first paint of the list, the marks and the
   hydrate check - unless it is booted FOR something (a landing that names a row or a search, a tap on a drill), when both
   run at once so the answer is there for that very event. Everything the register needs lives inside this function. */
var REG_BOOTED=false, REG_PHASE2=null;
function bootRegister(sync){
  if(REG_BOOTED){ if(REG_PHASE2&&sync){ var f0=REG_PHASE2; REG_PHASE2=null; f0(); } return; }
  var R=(window.PLD&&PLD.R)||null;      /* r6 F-15: the stamp moves the block beside the page (a PLD payload) */
  if(!R){ try{ R=JSON.parse($('R').textContent); }catch(e){ R=null; } }      /* r7 F-13: a block cut short by a dropped connection is a failure, not an error */
  if(!R){ regFail(); return; }
  REG_BOOTED=true;
var CM=R.summary.committees, RECS=[];     /* the records LOADED so far: the two newest years ride in the page, every older year is a shard (the record store, below) */
var CTY=(R.cty&&R.cty.exp)||{}, CTYB=(R.cty&&R.cty.basis)||'';
var money0=function(v){return '$'+Math.round(v).toLocaleString('en-US');};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
function moneyShort(v){
  if(v<1e6) return money0(v);
  var m=v/1e6, s=(m>=100?m.toFixed(0):(m>=10?m.toFixed(1):m.toFixed(2)));
  if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,'');
  return '$'+s+'M';
}
var PT_ACR={"SAMHSA":1,"HRA":1,"IDA":1,"NY":1,"NYS":1,"NYSDOT":1,"DOT":1,"EMS":1,"DPW":1,"CSEA":1,"PBA":1,"FEMA":1,"HUD":1,"DSS":1,"SOC":1,"LLC":1,"USA":1,"COVID":1,"FY":1,"MH":1,"II":1,"III":1,"IV":1,"HVAC":1,"NCCC":1,"DA":1,"WNY":1,"COE":1,"OFA":1,"COLA":1,"RFP":1,"HR":1,"DWI":1,"YMCA":1,"SHSP":1,"OASAS":1,"EMPG":1,"BOCES":1,"CHA":1,"SEQRA":1,"GIS":1,"ADA":1,"SUNY":1,"EPA":1,"USEPA":1,"DMV":1,"DOJ":1,"CDC":1,"CSX":1,"OMH":1,"HMEP":1,"CRTF":1,"BJA":1,"DBA":1,"NIMAC":1,"SYEP":1,"TRT":1,"FIFI":1,"NACC":1,"AFL":1,"CIO":1,"BCS":1,"ELC":1,"MCP":1,"RETI":1,"BIP":1,"REDI":1}, PT_PL={"niagara":"Niagara","lockport":"Lockport","tonawanda":"Tonawanda","wheatfield":"Wheatfield","lewiston":"Lewiston","newfane":"Newfane","porter":"Porter","royalton":"Royalton","somerset":"Somerset","wilson":"Wilson","pendleton":"Pendleton","hartland":"Hartland","cambria":"Cambria","barker":"Barker","olcott":"Olcott","youngstown":"Youngstown","ransomville":"Ransomville","erie":"Erie","buffalo":"Buffalo","albany":"Albany","cuomo":"Cuomo","hochul":"Hochul","trott":"Trott","krull":"Krull","inc":"Inc"}, PT_STOP={"the":1,"of":1,"a":1,"an":1,"and":1,"or":1,"for":1,"to":1,"in":1,"on":1,"at":1,"by":1,"with":1,"from":1,"over":1,"into":1,"new":1,"other":1,"local":1,"that":1,"this":1,"all":1,"any":1,"each":1,"no":1,"as":1,"be":1,"is":1,"its":1,"it":1}, TIDY_NOUNS=["Modification", "Amendment", "Project", "Division", "Creek", "Sheriff", "Replacement", "Preparation", "Grant", "Team", "Upgrade", "Roof"];
function plainTitle0(t){
  var out=t.replace(/\s+[-\u2013\u2014]\s*$/,''), L=out.replace(/[^A-Za-z]/g,'');
  if(!L.length||L.replace(/[^A-Z]/g,'').length/L.length<=0.6) return out;
  var s=out.toLowerCase().replace(/[a-z]+(?:['\u2019][a-z]+)*/g,function(w){var u=w.toUpperCase(); return PT_ACR[u]?u:(PT_PL.hasOwnProperty(w)?PT_PL[w]:w);});
  s=s.replace(/\b([A-Za-z']+) (road|creek|river|street|avenue|lake|canal|harbor)\b/g,function(m,p,q){return PT_STOP[p.toLowerCase()]?m:p.charAt(0).toUpperCase()+p.slice(1)+' '+q.charAt(0).toUpperCase()+q.slice(1);});
  s=s.replace(/\bNiagara county\b/g,'Niagara County').replace(/\bNiagara falls\b/g,'Niagara Falls').replace(/\bErie county\b/g,'Erie County')
    .replace(/\bnew York\b/g,'New York').replace(/\bnorth Tonawanda\b/g,'North Tonawanda').replace(/\bno\.(?=\s*\d)/g,'No.');
  return s.charAt(0).toUpperCase()+s.slice(1);
}
/* PL-30: the spacing the county's source ran together, put back - the build's tidy_title (the same four rules, the same noun list); only a
   space is ever added. plainTitle0 is the shared sentence case alone: a title the register changed here (r._tc) says what the county printed. */
var TIDY_RE=[[/\bof((?:19|20)\d{2})\b/g,'of $1'],[/(\d)of((?:19|20)\d{2})\b/g,'$1 of $2'],[/\bOf(?=[A-Z][a-z]{3,})/g,'Of '],
  [/\b((?:19|20)\d{2})(?=[A-Z][a-z]{2,})/g,'$1 '],[new RegExp('(^|[^A-Za-z])('+TIDY_NOUNS.join('|')+')(?=[A-Z][a-z]{2,})','g'),'$1$2 '],
  [/(^|[^A-Za-z])Order(?=No\b)/g,'$1Order '],[/\bof(the|a)\b/g,'of $1']];
function tidyTitle(t){ for(var k=0;k<2;k++) for(var i=0;i<TIDY_RE.length;i++) t=t.replace(TIDY_RE[i][0],TIDY_RE[i][1]); return t; }
function plainTitle(t){ return tidyTitle(plainTitle0(t)); }

var MON=['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'];   /* the house month table (C.MONTHS_SHORT) */
var TIP=PL.tip();
/* the tooltip repeats what the controls already say (aria-labels, the record itself): hidden from assistive tech, like any decoration */
(function(){ var show=TIP.show; TIP.show=function(h,x,y){ show(h,x,y); var n=document.querySelector('.pl-tip'); if(n) n.setAttribute('aria-hidden','true'); }; })();
/* the one pointer tooltip: the strip's marks, the hover pairs and the account preview share it */
var LMV='2026-10-20';                      /* the latest meeting with votes read (the h1's date and the headline's counts are re-derived from it) */

/* LEG-17: the county's own yearly series for every cited account code its filing carries (see tools/build_decisions.py) */
var ACS=R.acct||null, AC=(ACS&&ACS.s)||{}, AC_Y0=ACS?ACS.y0:0, AC_BRK=ACS?ACS.brk:null, AYN=ACS?(ACS.y1-ACS.y0+1):31;
function acFirst(a){ for(var i=0;i<a.v.length;i++) if(a.v[i]!=null) return i; return -1; }
function acLast(a){ for(var i=a.v.length-1;i>=0;i--) if(a.v[i]!=null) return i; return -1; }
/* one series as a line: a gap where a year was not filed (never a zero), the older basis (before AC_BRK) at half strength
   and not joined to the later years, the latest filed year dotted. w x h is the box; big adds the zero hairline and the
   break marker. Shape only - the pill carries no figure, the tooltip carries the labelled ones. */
function acSpark(a,w,h,big){
  var v=a.v, n=v.length, lo=0, hi=0, i, P=big?4:1.5, bi=(AC_BRK!=null)?(AC_BRK-AC_Y0):-1;
  v.forEach(function(x){ if(x==null) return; if(x>hi) hi=x; if(x<lo) lo=x; });
  if(hi===lo) hi=lo+1;
  function X(k){ return P+k*(w-2*P)/(n-1); }
  function Y(x){ return h-P-(x-lo)/(hi-lo)*(h-2*P); }
  var segs=[], cur=null, o='';
  for(i=0;i<n;i++){
    if(v[i]==null){ cur=null; continue; }
    if(!cur||(bi>0&&i===bi)){ cur={pre:bi>0&&i<bi,pts:[]}; segs.push(cur); }
    cur.pts.push([X(i),Y(v[i])]);
  }
  if(big) o+='<path class="z" d="M'+P+' '+Y(0).toFixed(1)+'H'+(w-P)+'"/>';
  if(big&&bi>0&&acFirst(a)<bi&&acLast(a)>=bi) o+='<path class="bk" d="M'+((X(bi-1)+X(bi))/2).toFixed(1)+' 1V'+(h-1)+'"/>';
  segs.forEach(function(s){
    if(s.pts.length>1) o+='<path'+(s.pre?' class="pre"':'')+' d="M'+s.pts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1);}).join('L')+'"/>';
    else o+='<circle'+(s.pre?' class="pre"':'')+' cx="'+s.pts[0][0].toFixed(1)+'" cy="'+s.pts[0][1].toFixed(1)+'" r="'+(big?1.8:1.2)+'"/>';
  });
  var li=acLast(a); if(li>=0) o+='<circle cx="'+X(li).toFixed(1)+'" cy="'+Y(v[li]).toFixed(1)+'" r="'+(big?2.8:2)+'"/>';
  return '<svg'+(big?'':' class="aspk" width="'+w+'" height="'+h+'"')+' viewBox="0 0 '+w+' '+h+'" aria-hidden="true" focusable="false">'+o+'</svg>';
}
function acAria(c,a,gl){
  var li=acLast(a);
  /* the name starts with the pill's visible text (code, then the plain-English gloss when it shows one), so a voice user's
     'click A3150 ...' matches; the filing's own wording for the code follows */
  var nm=c+(gl?' · '+gl:'')+(a.n&&a.n!==gl?(/[.]$/.test(gl||'')?' ':'. ')+'Filed as '+a.n:'');
  return nm+(/[.]$/.test(nm)?' ':'. ')+'The county’s own filing, '+(a.k==='e'?'spending':'revenue')+' side: FY'+(AC_Y0+li)+' '+money0(a.v[li])+'. Opens that account’s history on the county ledger.';
}
/* the labelled preview: the code and the filing's own name for it, the series, first and latest filed year with the
   latest figure, and what the line is NOT (not this resolution's amount; a code on both sides of the filing says so) */
function acTipHTML(c){
  var a=AC[c]; if(!a) return '';
  var fi=acFirst(a), li=acLast(a), side=a.k==='e'?'spending':'revenue';
  var spans=AC_BRK!=null&&AC_Y0+fi<AC_BRK&&AC_Y0+li>=AC_BRK;
  return '<b class="num">'+esc(c)+'</b>'+(a.n?' · '+esc(a.n):'')+
    '<span class="acv">'+acSpark(a,280,56,true)+'</span>'+
    '<span class="acx"><span>FY'+(AC_Y0+fi)+'</span><b>FY'+(AC_Y0+li)+' · '+money0(a.v[li])+'</b></span>'+
    '<span class="acn">The county’s own filing, '+side+' side, the whole function’s total as filed, one point per year'+
    (spans?'. Before '+AC_BRK+' the filing used an older basis: drawn lighter and not joined to the years after it':'')+
    (a.b?'. The same code is also a '+(a.k==='e'?'revenue':'spending')+' line in the filing, not drawn':'')+
    '. Not this resolution’s amount.</span>';
}

/* the one reading of a record's headline figure. A ceiling, and the typed
   award / revenue / bid figures, may rank; a figure merely mentioned in the text
   (kinds m, inc, dec, ret) is shown muted and is never ranked, summed or crowned
   as the biggest. Anything larger than the county's entire year of spending is
   flagged unverified. */
var RANKABLE={cap:1,awd:1,rev:1,bid:1};
var KW={cap:'spending limit',awd:'award',rev:'revenue',bid:'bid'};
/* r3 PL-02: a vote that failed approved nothing, so its figure is what it PROPOSED. Twin: build_decisions.kind_label() / kind_word() */
var KINDF={cap:'Spending limit it proposed',awd:'Contract it proposed',rev:'Revenue it proposed'};
function kp(r,k){ return isFailed(r)&&KINDF[k]?KINDF[k]:KINDP[k]; }
function kwr(r,k){ return (isFailed(r)&&k!=='bid'?'proposed ':'')+KW[k]; }      /* PL-17: a ceiling is a 'spending limit' (an 'up to' authorization), in words */
function ctyLimit(r){return CTY[r.date.slice(0,4)]||CTY[CTYB]||0;}
function fig(r){
  /* a contract change its title does not announce (r.co): the not-to-exceed its clauses recite is the original
     contract's, not this vote's - its largest other figure shows, under its own kind (IF-146-26) */
  if(r.co){
    var b=null; (r.am||[]).forEach(function(a){ if(a[1]!=='cap'&&(!b||a[0]>b[0])) b=a; });
    if(!b) return null;
    var lc=ctyLimit(r), oc=!!(lc&&b[0]>lc);
    return {v:b[0],k:b[1],over:oc,rank:!!RANKABLE[b[1]]&&!oc};
  }
  var v=r.cap||r.amt; if(!v) return null;
  var k='cap';
  if(!r.cap){k='m'; (r.am||[]).some(function(a){if(a[0]===r.amt){k=a[1];return true;}return false;});}
  var lim=ctyLimit(r), over=!!(lim&&v>lim);
  return {v:v,k:k,over:over,rank:!!RANKABLE[k]&&!over};
}
var FAILW={Rejected:1,Failed:1};
function isFailed(r){var v=r.vote;return !!(v&&FAILW[v.out]&&v.noes>=v.ayes);}

/* search reaches names AND the quoted money excerpts the page ships (a county
   award title rarely names the contractor; the bid tabulation does): one
   lowercase haystack per record, built once. _x is the excerpt text alone, so
   a hit there can say so. _cer marks ceremonial traffic (symbolic / advocacy
   and the Community Partnership grants) for the per-meeting fold. */
var CP_RE=/community partnership/i;
/* a rescission names the resolution it undoes: both sides say so in their record. RESC (a rescinding record -> the ids it undoes) is read
   off each record as it arrives; RESCBY (an undone id -> its rescinder) crosses years, so the build ships it whole (R.resc) */
var RESC={}, RESCBY=R.resc||{};
/* the reading a record gets once, the moment it arrives (in the page, from a year shard, and again when its quoted text lands) */
function decorate(r){
  var v=r.vote||{};
  r._f=fig(r);
  r._cer=(r.tp==='s')||CP_RE.test(r.title);
  r._x=(r.am||[]).map(function(a){return a[2]||'';}).join(' ‖ ').toLowerCase();
  r._n=(r.id+' '+r.title+' '+(r.cms||'')+' '+(v.mover||'')+' '+(v.second||'')+' '+
    (v.no_names||[]).join(' ')+' '+(v.abs_names||[]).join(' ')+' '+(r.sp||[]).join(' ')).toLowerCase();
  ptitle(r); if(r._tc) r._n+=' '+r._pt.toLowerCase();                  /* PL-30: the title as the page shows it is searchable too */
  if(r.vx&&r.vx.length) r._n+=' '+r.vx.join(' ').toLowerCase();
  r._s=r._n+' '+r._x;
  var ids=(r.rescinds||[]).filter(function(i){return i!==r.id;});
  if(ids.length||/^\s*rescind/i.test(r.title)) RESC[r.id]=ids;
}
/* within a meeting: the rows that drew a no first, then the figures that may
   rank (a ceiling, an award, revenue, a bid - never an in-text mention),
   largest first, then the rest in the clerk's order with the ceremonial
   traffic last so it can fold. Newest meeting first, always. */
function tier(r){
  if(r.vote&&r.vote.noes>0) return 0;
  if(r._f&&r._f.rank) return 1;
  return r._cer?3:2;
}
/* only tier 3 folds: ceremonial traffic that drew no no and carries no figure
   that may rank. A dissent row or a ranked figure is never hidden in a fold. */
function folds(r){return tier(r)===3;}
function regCmp(a,b){
  if(a.date!==b.date) return a.date<b.date?1:-1;
  var ta=tier(a), tb=tier(b);
  if(ta!==tb) return ta-tb;
  if(ta===1&&a._f.v!==b._f.v) return b._f.v-a._f.v;
  return a.id<b.id?-1:1;
}
/* the clerk's own order: by id, with the contested rows still lifted above the traffic */
function idCmp(a,b){
  if(a.date!==b.date) return a.date<b.date?1:-1;
  var ca=(a.vote&&a.vote.noes>0)?1:0, cb=(b.vote&&b.vote.noes>0)?1:0;
  if(ca!==cb) return cb-ca;
  return a.id<b.id?-1:1;
}
/* the clerk's sequence within a year: oldest meeting first, by id within it (the strip's order) */
function seqCmp(a,b){ return a.date<b.date?-1:(a.date>b.date?1:(a.id<b.id?-1:1)); }

/* ---------- the record store (PL-05) ----------
   The page keeps the two newest years' records (their core fields) in the HTML. Every other year is a shard - data/decisions/<year>.js, a
   classic script that sets window.PLD["R-<year>"] - injected as a <script> element when something needs it (never fetch(): the gates open
   the page from file://, where fetch fails and a script tag works). What needs a year: the list of that year, a search or a filter (they
   span every year), a deep link (?open=, #m-<date>), the sheet of a record that is not here yet. The quoted text of the inline years is a
   shard too (text-<year>.js): the search reads it, and so does the sheet's 'amounts quoted' fold. RECS is what has arrived; years, YD and
   AG (the build's digests: what spans every year without a record) say what exists. A digest is checked against the records the moment
   they arrive (verifyYear / verifyAll): any disagreement is one console error, like every prerender figure. */
var YD=R.yd, AG=R.ag, SH=R.sh||{}, INL={}, DTOT=0, TXT={};
(R.yi||[]).forEach(function(y){INL[y]=1;});
var years=Object.keys(YD).sort().reverse();
var byYear={}, byYearId={}, byYearSeq={}, YREC={}, LOADED={}, BYID={}, STAND={};
years.forEach(function(y){ byYear[y]=[]; byYearId[y]=[]; byYearSeq[y]=[]; YREC[y]=[]; DTOT+=YD[y].n; });
function aggObj(a){ var o={}; a.forEach(function(p){o[p[0]]=p[1];}); return o; }
/* the year a resolution id belongs to ('IF-079-19' -> '2019'; the build asserts the suffix is the date's year), '' for no such year */
function yearOfId(id){ var m=/-(\d\d)$/.exec(id||''); var y=m?String(2000+(+m[1])):''; return YD[y]?y:''; }
function allLoaded(){ return years.every(function(y){return LOADED[y];}); }
/* RECS in the data file's order: oldest year first, each year as its shard listed it (a search that ties on every key keeps it) */
function rebuildRECS(){
  RECS.length=0;
  years.slice().reverse().forEach(function(y){ if(LOADED[y]) Array.prototype.push.apply(RECS,YREC[y]); });
}
function addYear(y,list){
  if(LOADED[y]) return;
  var rs=list.map(function(r){ var s=STAND[r.id]; if(s) r=s; decorate(r); BYID[r.id]=r; return r; });      /* a vote with a no that cont.js already brought is that very object */
  YREC[y]=rs; LOADED[y]=true;
  byYear[y]=rs.slice().sort(regCmp); byYearId[y]=rs.slice().sort(idCmp); byYearSeq[y]=rs.slice().sort(seqCmp);
  notePend(rs); rebuildRECS(); verifyYear(y,rs); if(allLoaded()) verifyAll(); checkRituals();
}
/* the quoted text and the printed committee line of an inline year (text-<year>.js): back into the records that kept their core only */
function applyText(y,d){
  YREC[y].forEach(function(r){
    var t=d[r.id]; if(!t) return;
    if(t[0]) r.cms=t[0];
    (t[1]||[]).forEach(function(x,i){ if(r.am&&r.am[i]) r.am[i][2]=x; });
    decorate(r);
  });
  TXT[y]=1;
}
var SHDONE={}, SHQ={}, SERL=null, CONTOLD=[], STUBS={};
var VRX={}, SEATY={};      /* r7 W-03: each vote's receipt (vr-<year>.js) and each year's roll, as the receipts arrive */
/* the shards a view of these years reads: a year that is not in the page, and - when the quoted text is read (a search) - the text of the
   years that are */
function shardKeys(ys,text){
  var ks=[]; ys.forEach(function(y){ if(!INL[y]) ks.push(y); else if(text) ks.push('text-'+y); }); return ks;
}
function mergeMaps(d){
  ['sources','srcs','msrc'].forEach(function(k){ if(!d[k]) return; var t=R[k]||(R[k]={}); for(var x in d[k]) t[x]=d[k][x]; });
}
function ingest(key,d){
  if(key==='series'){ SERL=d.s; return; }
  if(key.indexOf('vr-')===0){ SEATY[key.slice(3)]=d.seat||[]; var rr=d.r||{}; for(var k in rr) VRX[k]=rr[k]; return; }      /* r7 W-03: a year's receipts */
  if(key==='cont'){
    mergeMaps(d);
    CONTOLD=d.resolutions.map(function(r){
      var cur=BYID[r.id]; if(cur) return cur;                      /* its year is already here: that is the object the register uses */
      decorate(r); STAND[r.id]=r; BYID[r.id]=r; return r;
    });
    return;
  }
  if(key.indexOf('text-')===0){ applyText(key.slice(5),d); return; }
  mergeMaps(d); addYear(key,d.resolutions);
}
/* one shard: a <script> element, once; every caller waits on the same load; a failed load can be tried again.
   fix wave 11-08 (U01): a load is bounded - a file that has not arrived in SHMS ms counts as failed (its script is dropped and a late
   arrival is ignored), so a stuck request ends in a named failure with Try again instead of 'still reading' for ever */
var SHMS=15000, SHTRY={};      /* a file asked for again gets its own address (&r=n): the stuck request would otherwise hold the retry behind it (the browser's cache lock) */
function shardGet(key,ok,bad){
  if(SHDONE[key]){ ok(); return; }
  var q=SHQ[key]; if(q){ q.push([ok,bad]); return; }
  q=SHQ[key]=[[ok,bad]];
  var s=document.createElement('script'), over=false, tm=null;
  function settle(good){
    if(over) return; over=true; clearTimeout(tm);
    if(!good){ s.onload=s.onerror=null; SHTRY[key]=(SHTRY[key]||0)+1; }
    delete SHQ[key]; if(s.parentNode) s.parentNode.removeChild(s);
    q.forEach(function(w){ var f=good?w[0]:w[1]; if(f){ try{ f(); }catch(e){ setTimeout(function(){ throw e; }); } } });
  }
  s.async=true;
  s.onload=function(){
    var d=window.PLD&&window.PLD['R-'+key];
    if(!d){ settle(false); return; }
    try{ ingest(key,d); }catch(e){ try{ console.error('decisions shard '+key+': '+e); }catch(x){} settle(false); return; }
    SHDONE[key]=true; settle(true);
  };
  s.onerror=function(){ settle(false); };
  tm=setTimeout(function(){ settle(false); },SHMS);
  s.src=SH[key]+(SHTRY[key]?(SH[key].indexOf('?')<0?'?':'&')+'r='+SHTRY[key]:''); document.head.appendChild(s);
}
/* every key settles (arrives, fails or runs out of time) before the answer: ok() when all arrived, else bad(failed keys) - so the years
   that did arrive are already in the register when the failure is shown */
function shardAll(keys,ok,bad){
  var left=keys.length, failed=[];
  if(!left){ ok(); return; }
  function fin(){ if(--left) return; if(!failed.length) ok(); else if(bad) bad(failed); }
  keys.forEach(function(k){ shardGet(k,fin,function(){ failed.push(k); fin(); }); });
}
/* the first keystroke in the search box starts every year's shard (a search spans them all) */
function preloadAll(){ shardAll(shardKeys(years,true),function(){},function(){}); }
/* every shard the page has (each year, the text, the series, the contested votes) as one promise: the gates load them all before reading the register (a search or a record from an older year
   renders the moment its year is here; tools/test_vendor_xref.py checks every year, so it waits for every year first) */
window.__plAllShards=function(){ return new Promise(function(res,rej){ shardAll(Object.keys(SH),res,function(){ rej(new Error('a decisions shard failed to load')); }); }); };
var TPL={}; (R.summary.topics||[]).forEach(function(t){TPL[t[0]]=t[1];});
TPL.s='Statements, not spending';      /* the data's name for the symbolic topic says nothing to a resident (SPEC 2.4); the payload keeps it */
var CONTESTED=[];      /* every vote with a no, newest first: built when the older ones arrive (cont.js - contBoot) */
/* the older years' votes with a no (cont.js) and the inline years' own, in the data file's order, then newest first - the very list
   RECS.filter(...).sort(...) made when every record was in the page */
function buildContested(){
  var a=CONTOLD.slice();
  years.slice().reverse().forEach(function(y){ if(INL[y]) YREC[y].forEach(function(r){ if(r.vote&&r.vote.noes>0) a.push(r); }); });
  return a.sort(function(x,y){return x.date<y.date?1:-1;});
}

/* order: 'money' (dissent, money, the rest) or 'id' (the clerk's); only: '' |
   'no' | 'sp' narrows a name search to the rows where that name voted no /
   sponsored (the legislators' page links in with it); all: show the mover-only
   consent-calendar matches a name search folds away; open: a row's id */
var state={year:years[0], cm:'', tp:'', q:'', money:false, mover:'', order:'money', only:'', all:false, loose:false, open:'', shown:0, um:false, ur:false, yo:''};
/* PL-20 (UX audit 2026-10-31): the votes the trust card counts as not matched - a resolution in a meeting whose minutes have a text layer
   and no vote line matched for it - are a register view of their own (?unmatched=1), every year */
function unmatched(r){ return !r.vote && (R.mstat||{})[r.date]==='ok'; }
/* F-04 (clean-slate audit 2026-10-31): every resolution with no vote read yet - unposted or unreadable minutes, a meeting still to come,
   or no vote line matched - listed with its reason (?unread=1); read + not read = the headline's total */
function unread(r){ return !r.vote; }
var expanded={};   /* per-meeting fold of the ceremonial traffic: date -> 1 when opened */

/* 'Same decision, every year': resolutions whose normalised title recurs in
   three or more years form a series (the mortgage-tax distribution, the sales-tax
   budget modification, the highway-materials bid...). A record shows its series
   newest first, each entry's own figure labelled by kind and never summed, and
   says how many months earlier the previous one was - a semiannual series is
   not 'last year'. Placeholder titles never form a series. */
/* The series are DEFINED at build time (tools/build_decisions.py series_key / _build_series) and ship as ONE shard (series.js): every series,
   each member newest first as a LEAN record - date, committee, sponsors, the vote's tally, the ranked and the in-text figure, taken as the
   build's rank_fig / text_fig took them - which is all the record's last-year-beside-this-year table and its year pills read, so a sheet
   never loads ten years to draw them. A record carries the index of its series (r.sr): SERL[r.sr] = {k, ny, r, m:[members]}. */
/* NOV-10: what changed since the last time. The JS twin of ser_diff() / ser_phrase() in tools/build_decisions.py - an amount is
   compared only where BOTH sides carry the same kind of ranked figure (a ceiling, award, revenue or bid, never above the county's
   whole year of spending); a figure merely printed in the text is a mention: muted, never compared, never added. */
var MINUS='\u2212', AMTL={cap:'Spending limit',awd:'Award',rev:'Revenue',bid:'Bid'};
function rankFig(r){
  var best=null, lim=ctyLimit(r);
  function cand(v,k){ if(lim&&v>lim) return; if(!best||v>best.v) best={v:v,k:k}; }
  if(r.cap&&!r.co) cand(r.cap,'cap');
  (r.am||[]).forEach(function(a){ if(RANKABLE[a[1]]&&!(r.co&&a[1]==='cap')) cand(a[0],a[1]); });
  return best;
}
function textFig(r){
  var best=null; (r.am||[]).forEach(function(a){ if(!RANKABLE[a[1]]&&(!best||a[0]>best.v)) best={v:a[0],k:a[1]}; });
  if(best){ var lim=ctyLimit(r); best.over=!!(lim&&best.v>lim); }
  return best;
}
function pctOf(dv,base){
  if(!base) return '';
  if(dv>0&&dv/base>10) return 'over 10×, check the PDF';
  var pc=Math.floor(Math.abs(dv)/base*100+.5);
  return pc===0?'<1%':(dv>0?'+':MINUS)+pc+'%';
}
function monthsBetween(a,b){ return (+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5,7)-+a.slice(5,7)); }
function monLabel(d){ return MON[+d.slice(5,7)-1]+' '+d.slice(0,4); }
function serDiff(p,r){
  var mo=monthsBetween(p.date,r.date);
  var ys=(mo>=11&&mo<=13)?'last year':monLabel(p.date);       /* a semiannual series is not 'last year': name the real gap */
  var rows=[], fa=rankFig(p), fb=rankFig(r), ta=textFig(p), tb=textFig(r), textDiffers=false;
  function wm(f){ return KW[f.k]+' '+money0(f.v); }
  if(fa&&fb&&fa.k===fb.k){
    var dv=fb.v-fa.v, pct=pctOf(dv,fa.v), sg=dv>0?'+':MINUS;
    rows.push({k:'amount',label:AMTL[fa.k],a:fa.k==='cap'?'up to '+money0(fa.v):money0(fa.v),b:fb.k==='cap'?'up to '+money0(fb.v):money0(fb.v),dir:dv===0?'eq':(dv>0?'up':'down'),
      chg:dv===0?'same':sg+money0(Math.abs(dv))+(pct?' \u00b7 '+pct:''),
      frag:dv===0?'':wm(fa)+' \u2192 '+money0(fb.v)+(pct?' ('+pct+')':''),muted:false});
  } else if(fa&&fb){
    rows.push({k:'amount',label:'Amount',a:wm(fa),b:wm(fb),dir:'ne',chg:'different kinds, not compared',frag:wm(fa)+' \u2192 '+wm(fb),muted:false});
  } else if(fa||fb){
    rows.push({k:'amount',label:'Amount',a:fa?wm(fa):'no ranked figure',b:fb?wm(fb):'no ranked figure',dir:'ne',
      chg:fb?'newly a ranked figure':'no ranked figure now',
      frag:fb?wm(fb)+' (none ranked '+ys+')':'no ranked figure (was '+wm(fa)+')',muted:false});
  }
  if(!(fa||fb)&&(ta||tb)){
    textDiffers=!(ta&&tb&&ta.v===tb.v);
    rows.push({k:'text',label:'In text',a:ta?money0(ta.v)+(ta.over?' (unverified)':''):'\u2014',b:tb?money0(tb.v)+(tb.over?' (unverified)':''):'\u2014',
      dir:'na',chg:'mentions, not compared',frag:'',muted:true});
  }
  var va=p.vote, vb=r.vote;
  function vt(x,v){ return v.ayes+'\u2013'+v.noes+(isFailed(x)?' \u00b7 rejected':''); }
  if(va&&vb){
    var dn=vb.noes-va.noes, same=dn===0&&isFailed(p)===isFailed(r), d_, chg;      /* the ayes move with who was in the room: only the noes (or the outcome) are a change */
    if(same){ d_='eq'; chg=vb.noes===0?'no one voted no, either time':'same number of noes'; }
    else if(dn>0){ d_='up'; chg=dn===1?'1 more no vote':dn+' more no votes'; }
    else if(dn<0){ d_='down'; chg=dn===-1?'1 fewer no vote':(-dn)+' fewer no votes'; }
    else { d_='ne'; chg='a different outcome'; }
    rows.push({k:'vote',label:'Vote',a:vt(p,va),b:vt(r,vb),dir:d_,chg:chg,frag:same?'':'vote '+vt(p,va)+' \u2192 '+vt(r,vb),muted:false});
  } else if(va||vb){
    rows.push({k:'vote',label:'Vote',a:va?va.ayes+'\u2013'+va.noes:'not read',b:vb?vb.ayes+'\u2013'+vb.noes:'not read',dir:'na',chg:'not compared',frag:'',muted:false});
  }
  var spa=p.sp||[], spb=r.sp||[];
  if(spa.length||spb.length){
    var sm=spa.slice().sort().join('|')===spb.slice().sort().join('|'), a1=spa.join(', ')||'none named', b1=spb.join(', ')||'none named';
    rows.push({k:'sponsor',label:'Sponsor',a:a1,b:b1,dir:sm?'eq':'ne',chg:sm?'same':'changed',frag:sm?'':'sponsor '+a1+' \u2192 '+b1,muted:false});
  } else {
    var ca=CM[p.cm]||('Committee '+p.cm), cb=CM[r.cm]||('Committee '+r.cm), sc=p.cm===r.cm;      /* by code: the printed joint-committee wording and OCR typos are not a change */
    rows.push({k:'sponsor',label:'Committee',a:ca,b:cb,dir:sc?'eq':'ne',chg:sc?'same':'changed',frag:sc?'':'committee '+ca+' \u2192 '+cb,muted:false});
  }
  return {p:p,r:r,mo:mo,ys:ys,rows:rows,textDiffers:textDiffers};
}
function serPhrase(d){
  var frags=d.rows.filter(function(w){return w.frag;}).map(function(w){return w.frag;});
  if(frags.length) return frags.slice(0,2).join(' \u00b7 ');
  var NM={amount:'ranked figure',vote:'vote',sponsor:'sponsor'};
  var same=d.rows.filter(function(w){return w.dir==='eq';}).map(function(w){return w.label==='Committee'?'committee':NM[w.k];}).filter(Boolean);
  var lst=!same.length?'nothing':(same.length===1?same[0]:same.slice(0,-1).join(', ')+' and '+same[same.length-1]);
  return (same.length?'no change in '+lst+' since '+d.ys:'nothing to compare since '+d.ys)+(d.textDiffers?' \u00b7 in-text figure differs':'');
}
var GLY={up:'\u25b2 ',down:'\u25bc ',eq:'= ',ne:'\u2260 ',na:''};
var monYr=monLabel;
/* last year beside this year: a real table (row headers, column headers) - the change is a glyph and a word in the cell, never a colour */
function serTableHTML(d){
  var p=d.p, r=d.r, L=d.ys==='last year'?['Last year','This year']:['Previous','This one'];
  var h='<div class="rdf"><table class="rdf-t"><caption class="pl-vh">What changed since the previous time this decision came up</caption>'+
    '<thead><tr><th scope="col"><span class="pl-vh">Measure</span></th><th scope="col">'+L[0]+'<span class="rdf-d"> &middot; '+monYr(p.date)+'</span></th>'+
    '<th scope="col">'+L[1]+'<span class="rdf-d"> &middot; '+monYr(r.date)+'</span></th></tr></thead><tbody>';
  d.rows.forEach(function(w){
    h+='<tr'+(w.muted?' class="mut"':'')+'><th scope="row">'+esc(w.label)+'</th><td>'+esc(w.a)+'</td><td>'+esc(w.b)+
      (w.chg?'<br><span class="rdf-chg '+w.dir+'">'+GLY[w.dir]+esc(w.chg)+'</span>':'')+'</td></tr>';
  });
  return h+'</tbody></table><div class="mnote">Compared with <a class="num" href="?open='+encodeURIComponent(p.id)+'">'+p.id+'</a>, the previous time. '+
    'An amount is compared only where both are the same kind of ranked figure; a figure printed in the text is a mention and is never compared or added.</div></div>';
}
/* a phone loads 40 rows, not 120: the register is a list you scan, not a page you scroll */
var PAGE=phoneMQ.matches?30:50;      /* r8 F-04: fifty rows a page on a desk, so the register's part stays within four laptop screens */

/* local date - toISOString is UTC and flips 'today' at 8pm Eastern */
var TODAY=(function(){var d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
/* the vote badge ladder: plain < outlined (drew a no) < filled word (failed).
   Where the printed counts and the recorded outcome disagree we say what the
   record says rather than choose. */
function voteBadge(r){
  if(!r.vote){
    if(r.date>TODAY) return '<span class="vb nov">not yet held</span>';
    if((R.mstat||{})[r.date]==='none') return '<span class="vb nov" title="The county has not posted the minutes for this meeting yet">votes not read yet</span>';
    return '<span class="vb nov">no vote matched</span>';
  }
  var v=r.vote, out=v.out||'';
  var t=v.ayes+'&ndash;'+v.noes;
  var abs=v.absent?' <span class="vabs">('+v.absent+' abs)</span>':'';
  if(FAILW[out]){
    if(v.noes>=v.ayes) return '<span class="vb rej num">Rejected '+t+abs+'</span>';
    return '<span class="vb disq num" title="The counts printed in the minutes show more ayes than noes, but the record says '+esc(out)+'. The minutes are the authority.">'+t+abs+' &middot; record says '+esc(out)+'</span>';
  }
  if(v.noes>v.ayes) return '<span class="vb disq num" title="The counts printed in the minutes show more noes than ayes, but the record says '+esc(out)+'. The minutes are the authority.">'+t+abs+' &middot; record says '+esc(out)+'</span>';
  return '<span class="'+(v.noes>0?'vb dis':'vb')+' num">'+t+abs+'</span>';
}
function amtBadge(r,viaText){
  var f=r._f; if(!f) return '';
  var unv=f.over?'<span class="unv" title="Larger than everything the county spends in a year - almost certainly a reference number or a parse artefact">unverified</span>':'';
  if(f.k==='cap') return '<span class="ab num">up to '+money0(f.v)+unv+'</span>';
  if(f.rank) return '<span class="ab k2 num"><i>'+kwr(r,f.k)+'</i> '+money0(f.v)+'</span>';
  if(f.k==='tot'||f.k==='chg') return '<span class="ab txt num">'+KINDX[f.k]+' &middot; '+money0(f.v)+unv+'</span>';
  /* a row found by a NAME in its text (a bid tabulation, the city hop): its in-text figure is the largest in the whole text, not that name's */
  if(viaText) return '<span class="ab txt num" title="The largest dollar figure printed anywhere in this resolution&rsquo;s text - not necessarily the amount of the name you searched">largest figure in text &middot; '+money0(f.v)+unv+'</span>';
  return '<span class="ab txt num" title="The largest dollar figure printed anywhere in this resolution&rsquo;s text - not necessarily what it approves">mentions '+money0(f.v)+unv+'</span>';      /* PL-17: words, not shorthand */
}
/* ---------- the city hop (same-name payees) ----------
   VXQ: every spelling the city page can hand over (a key's name and each payee spelling, lowercase) -> its key; VXSET: key ->
   {resolution id}. byRes is id -> the LIST of keys, because one record can name several payees (IF-101-22 names Nova Site AND
   Scott Lawn Yard). A search for exactly one of those spellings lists exactly the resolutions the city's count named (B13): a
   plain substring would also catch 'CIR Electrical' under 'CIR Electric', so the whole name is the rule, and the page says how
   many more rows contain the letters and offers them (state.loose). */
var VXK={}, VXQ={}, VXSET={}, VXE=null, VXWIDE=0, VXEX='';
(function(){
  var vx=R.vx; if(!vx||!vx.keys) return;
  vx.keys.forEach(function(e){ VXK[e.k]=e; [e.q].concat(e.payees||[]).forEach(function(n){ var l=String(n).toLowerCase(); if(!VXQ[l]) VXQ[l]=e; }); });
  var br=vx.byRes||{};
  Object.keys(br).forEach(function(id){ br[id].forEach(function(k){ (VXSET[k]=VXSET[k]||{})[id]=1; }); });
})();
/* the key a search names as a WHOLE spelling, or null (a fragment, a legislator, a topic: the ordinary substring search) */
function vxQuery(){ var q=state.q.toLowerCase(); return (state.q.length>=2&&!state.only&&VXQ[q])||null; }
/* what the city page's own link hands back: every spelling, so the landing sums the same lines the pill promised (B6) */
function vxPayeeParam(e){ return encodeURIComponent((e.payees||[e.q]).join('|')); }
/* how a row matched a search, ranked: the title or id (0), the quoted money
   text (1), a sponsor (2), a no vote or an absence (3), the second (4), the
   mover (5) - the floor leader moves most resolutions, so a mover-only
   match is noise and folds. Returns {t:tier, why:text}. */
/* Move 4: WHAT text matched, shown. A same-name key is matched the way build_vendor_xref.py matched it - the normalised
   key as a whole phrase, title first, then the quoted money excerpts - and the span it sits in is marked in the record's
   own words, so 'Same name' is checkable at a glance: the Amazon key lights "Amazon" inside "Amazon Distribution Center",
   not the city's "AMAZON CAPITAL SERVICES". vxRe builds a tolerant pattern from the key's words (any punctuation between
   them, '&' for 'and', no letter or digit on either side - the same boundary rule as the Python whole_phrase). */
var VXRE={};
function vxRe(k){
  if(VXRE[k]) return VXRE[k];
  var w=k.split(' ').map(function(t){ return t==='and'?'(?:and|&)':t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); });
  return VXRE[k]=new RegExp('(^|[^a-z0-9])('+w.join('[^a-z0-9]{1,4}')+')(?![a-z0-9])','i');
}
/* {where:'t'|'x'|'', i:excerpt index, s:start, e:end} - the first place the key's phrase sits in this record's own text */
function vxLocate(r,k){
  var re=vxRe(k), m=re.exec(r.title||'');
  if(m) return {where:'t',i:-1,s:m.index+m[1].length,e:m.index+m[0].length};
  var am=r.am||[];
  for(var i=0;i<am.length;i++){ var x=am[i][2]||''; m=re.exec(x); if(m) return {where:'x',i:i,s:m.index+m[1].length,e:m.index+m[0].length}; }
  return {where:'',i:-1,s:0,e:0};
}
/* text with one span marked, escaped around the mark; a window of `pad` characters either side when asked */
function markSpan(text,s,e,pad){
  var a=pad!=null?Math.max(0,s-pad):0, b=pad!=null?Math.min(text.length,e+pad):text.length;
  if(pad!=null){ /* cut at a word edge, never mid-word */ while(a>0&&/[a-z0-9]/i.test(text.charAt(a-1))) a--; while(b<text.length&&/[a-z0-9]/i.test(text.charAt(b))) b++; }
  return (a>0?'…':'')+esc(text.slice(a,s))+'<mark class="vxm">'+esc(text.slice(s,e))+'</mark>'+esc(text.slice(e,b))+(b<text.length?'…':'');
}
/* the same-name keys of a record that the current search names (the searched one first), or every key it carries */
function vxKeysFor(r){
  var ks=(R.vx&&R.vx.byRes&&R.vx.byRes[r.id])||[], q=state.q.toLowerCase();
  if(!ks.length) return [];
  var es=ks.map(function(k){return VXK[k];}).filter(function(e){return !!e;});
  function hit(e){ return q.length>=2&&(VXQ[q]===e||e.q.toLowerCase().indexOf(q)>=0||e.payees.some(function(p){return p.toLowerCase().indexOf(q)>=0;}))?0:1; }
  return es.sort(function(a,b){ return hit(a)-hit(b); });
}
/* how a row matched a search, ranked: the title or id (0), the quoted money
   text (1), a sponsor (2), a no vote or an absence (3), the second (4), the
   mover (5) - the floor leader moves most resolutions, so a mover-only
   match is noise and folds. Returns {t:tier, why:HTML, viaText:bool, title:HTML|null}:
   why is the short reason drawn beside the badges (already escaped), title is
   the row's title with the matched span marked when the match sits there. */
function matchHow(r,q){
  var v=r.vote||{}, i;
  function has(n){return n&&n.toLowerCase().indexOf(q)>=0;}
  var ti=(r.id+' '+r.title+' '+ptitle(r)).toLowerCase().indexOf(q);
  if(ti>=0){
    /* a plain hit in the title: mark it (an id hit marks nothing - the id is already the first thing on the row) */
    var pt=ptitle(r), tt=pt.toLowerCase().indexOf(q);
    return {t:0,why:'',viaText:false,title:(tt>=0&&tt+q.length<=pt.length)?markSpan(pt,tt,tt+q.length):null};
  }
  if(r.vx){ for(var vi=0;vi<r.vx.length;vi++){ if((r.vx[vi]||'').toLowerCase().indexOf(q)>=0){
    /* a same-name key: show where the county's own words carry it */
    var es=vxKeysFor(r), loc=null, e0=null;
    for(var ei=0;ei<es.length&&!loc;ei++){ var l=vxLocate(r,es[ei].k); if(l.where){ loc=l; e0=es[ei]; } }
    if(loc&&loc.where==='t') return {t:0,why:'name in the title',viaText:false,title:markSpan(ptitle(r),loc.s,loc.e)};
    if(loc) return {t:0,why:'in the text: “'+markSpan(r.am[loc.i][2]||'',loc.s,loc.e,26)+'”',viaText:true,title:null,long:true};
    return {t:0,why:'names '+esc(r.vx[vi])+' in its text',viaText:true,title:null};
  } } }
  var xi=r._x.indexOf(q);
  if(xi>=0){
    /* the excerpt that holds the hit, with the hit marked (the haystack joins the excerpts with ' ‖ ', so walk to the one it sits in) */
    var am=r.am||[], off=0;
    for(i=0;i<am.length;i++){ var xl=(am[i][2]||'').length; if(xi<off+xl){ var s0=xi-off; return {t:1,why:'in the text: “'+markSpan(am[i][2]||'',s0,s0+q.length,26)+'”',viaText:true,title:null,long:true}; } off+=xl+3; }
    return {t:1,why:'in the text',viaText:true,title:null};
  }
  for(i=0;i<(r.sp||[]).length;i++) if(has(r.sp[i])) return {t:2,why:'sponsor: '+esc(r.sp[i]),viaText:false,title:null};
  for(i=0;i<(v.no_names||[]).length;i++) if(has(v.no_names[i])) return {t:3,why:'voted no: '+esc(v.no_names[i]),viaText:false,title:null};
  for(i=0;i<(v.abs_names||[]).length;i++) if(has(v.abs_names[i])) return {t:3,why:'absent: '+esc(v.abs_names[i]),viaText:false,title:null};
  if((r.cms||'').toLowerCase().indexOf(q)>=0) return {t:2,why:'committee',viaText:false,title:null};
  if(has(v.second)) return {t:4,why:'seconded by '+esc(v.second),viaText:false,title:null};
  if(has(v.mover)) return {t:5,why:'moved by '+esc(v.mover),viaText:false,title:null};
  return {t:6,why:'',viaText:false,title:null};
}
var NOMATCH={t:6,why:'',viaText:false,title:null};
function matchWhy(r,q){ return q?matchHow(r,q):NOMATCH; }
/* the 'by' slot: sponsor surnames on an individual-legislator row, the
   committee's short name on the rest */
/* every name carries the key the hover pair reads (data-hv = role:value). On the register's own rows the slot is live; the
   contested list below is not a hover root, so its names stay plain text */
function byHTML(r,live){
  var sp=r.sp||[];
  function nm(role,val,txt){ return live?'<span class="nm" data-hv="'+role+':'+esc(val)+'">'+esc(txt)+'</span>':esc(txt); }
  if(sp.length) return sp.slice(0,3).map(function(n){return nm('sp',n,n);}).join(' · ')+(sp.length>3?' +'+(sp.length-3):'');
  return nm('cm',r.cm,CM[r.cm]||r.cm);
}
/* on a phone the committee name leaves the row (the sheet's kicker has it); sponsor surnames stay */
function byCls(r){ return (r.sp&&r.sp.length)?'rby':'rby cmx'; }
/* a name in an opened record is a real link: the register narrowed to exactly that member's no votes / sponsorships
   (?q=Name&only=no|sp - the same address the legislators page's '+N more' uses); hover or focus lights those rows */
function nmLink(n,role){
  return '<a class="nm" href="?q='+encodeURIComponent(n)+'&only='+role+'" data-nm="'+esc(n)+'" data-only="'+role+'" data-hv="'+role+':'+esc(n)+'" title="'+
    (role==='no'?'Every resolution '+esc(n)+' voted no on':'Every resolution '+esc(n)+' sponsored')+'">'+esc(n)+'</a>';
}
/* r7 F-30: a twin's row names the other and how it went (R.tw: the build's one note, the ledger rows say the same) */
function twinBadge(r){ var t=R.tw&&R.tw[r.id]; return t?t.map(function(x){ return '<span class="twn">twin of <b class="num">'+esc(x[0])+'</b> ('+x[1]+')</span>'; }).join(''):''; }
function rowHTML(r,i,pool,gm){
  var split='', v=r.vote;
  if(pool==='c'){
    var pc=100*v.ayes/(v.ayes+v.noes);
    split='<span class="split" aria-hidden="true"><i style="width:'+pc.toFixed(0)+'%"></i></span> ';
  }
  var mh=pool?NOMATCH:matchWhy(r,state.q.length>=2?(r._mq!=null?r._mq:state.q.toLowerCase()):''), why=mh.why;
  /* r7 DECISIONS3: a row listed for printing the searched year, not for being from it, says so - and its own date */
  if(!pool&&YQ&&r._yf===1) why='prints &ldquo;'+YQ.y+'&rdquo; &middot; '+fmtDate(r.date)+(why?' &middot; '+why:'');
  /* the spine IS the vote: 2px per no, capped at 6px; a dot at its head if it failed */
  var sp=(v&&v.noes>0)?Math.min(6,2*v.noes):0;
  /* Move 10: the row head's accessible name is the id and the title; the sponsor / committee and the badges describe it
     (aria-describedby), so a screen reader hears "IF-101-22, Award of bid ..." and not a 300-character run */
  var pid='rh-'+(pool||'r')+'-'+r.id;
  return '<div class="rrow'+(isFailed(r)?' fail':'')+(gm?' gm':'')+(why?' why':'')+'" data-i="'+i+'" data-d="'+r.date+'" data-id="'+r.id+'" data-cm="'+r.cm+'"'+(pool?' data-pool="'+pool+'"':'')+
    (sp?' style="--sp:'+sp+'px"':'')+'>'+
    '<div class="rtop" tabindex="0" role="button" aria-haspopup="dialog" aria-labelledby="'+pid+'i '+pid+'t" aria-describedby="'+pid+'b '+pid+'d">'+
      '<span class="rid num" id="'+pid+'i">'+r.id+'</span>'+
      '<span class="'+byCls(r)+'" id="'+pid+'b" title="'+esc(r.sp&&r.sp.length?'Sponsored by '+r.sp.join(', '):(CM[r.cm]||r.cm)+' committee')+'">'+byHTML(r,!pool)+'</span>'+
      '<span class="rtitle" id="'+pid+'t"'+(ptitle(r)&&r._tc?' title="'+esc('As printed: '+r.title)+'"':'')+'>'+(mh.title||esc(ptitle(r)))+'</span>'+
      '<span class="rbadges" id="'+pid+'d">'+(why?'<span class="mwhy'+(mh.long?' long':'')+'">'+why+'</span>':'')+
        split+amtBadge(r,mh.viaText)+(RESCBY[r.id]?'<span class="rsc" title="Rescinded by '+RESCBY[r.id]+'">rescinded</span>':'')+voteBadge(r)+twinBadge(r)+'</span>'+
    '</div></div>';
}
/* one row for a meeting's ceremonial run: the real count, the grants' range
   (never a sum), the tally if every one is the same; opens to the rows.
   Every sentence with a number is computed from the rows it folds. */
function groupHTML(d,rows,open){
  var cp=rows.filter(function(r){return CP_RE.test(r.title);}), n=rows.length;
  var label=cp.length===n?'Community Partnership grants':(cp.length?'ceremonial resolutions, '+cp.length+' of them Community Partnership grants':'ceremonial or advocacy resolutions');
  var amts=rows.map(function(r){return r.amt;}).filter(function(x){return x;});
  var bits=[];
  if(amts.length){
    var lo=Math.min.apply(null,amts), hi=Math.max.apply(null,amts);
    bits.push((lo!==hi?money0(lo)+'–'+money0(hi):money0(lo))+(amts.length>1?' each':'')+', in the text');
  }
  var tal={}, nv=0, nd=0, nf=0;
  rows.forEach(function(r){var v=r.vote; if(!v){nv++;return;} if(v.noes>0) nd++; if(isFailed(r)) nf++; var k=v.ayes+'–'+v.noes; tal[k]=(tal[k]||0)+1;});
  var ks=Object.keys(tal);
  if(ks.length===1&&!nv) bits.push('every one '+ks[0]);
  else if(ks.length) bits.push((n-nv-nf)+' passed, '+(nd?nd+' had a no vote':'none had a no vote')+(nf?', '+nf+' failed':'')+(nv?', '+nv+' vote'+(nv===1?'':'s')+' not matched':''));
  else if(nv) bits.push('votes not read yet');
  return '<div class="rrow grp" data-d="'+d+'"><button class="rtop gtop" type="button" aria-expanded="'+(open?'true':'false')+'" data-g="'+d+'">'+
    '<span class="rid num">'+(open?'−':'+')+n+'</span>'+
    '<span class="rtitle"><b>'+n+' '+label+'</b>'+(bits.length?' · '+esc(bits.join(' · ')):'')+'</span>'+
    '<span class="rbadges"><span class="gch">'+(open?'fold':'show the '+n)+'</span></span></button></div>';
}
/* ---------- the record sheet (SPEC 2.1) ----------
   A row that stands for one resolution - a latest-meeting row, a register row, a row that had a no, a ceiling, a same-vote-every-year row,
   a mark on the strip - opens ONE sheet: the title in full, the vote, the one headline amount, who sponsored and moved it, the quoted
   amounts behind a fold (never a raw table fragment), the same decision in other years, and the source PDF. The page behind does not
   move, so closing it (Done, X, Esc, a tap outside, Back) lands the reader exactly where they were. */
var KINDP={cap:'Spending limit (up to)',awd:'Contract awarded',bid:'Bids received (includes losing bids)',rev:'Revenue accepted'};
var KINDX={cap:'spending limit',awd:'award',bid:'bid',rev:'revenue',inc:'budget +',dec:'budget −',ret:'returned',chg:'contract change',tot:'revised contract total'};
/* r8 review R8-03: on a contract change a not-to-exceed is the contract's own amount as printed, never this vote's spending limit
   (build_shares.kind_word and _kx below are the twins) */
/* r8 confirm C8-02: the twin of tools/figures.cap_word - the words around a not-to-exceed say what it is on a contract change, change order
   or amendment: a revised total, the change, or an earlier figure recited */
var CW_T=/change\s*order|amendment|supplemental\s+agreement/i, CW_REV=/revised\s+contract(?:\s+(?:amount|price|total|fee))?\s+(?:of|to|not\s+to\s+exceed)\s*$/i,
    CW_CHG=/^[\s\d]*(?:\.\d+)?\s*,?\s*(?:for|to)\s+(?:a\s+)?(?:revised\s+contract|total\s+contract)/i, CW_REC=/^[\s\d]*(?:\.\d+)?\s*[,;]?\s*(?:and\s+)?.?\s*WHEREAS/i;
function cwCtx(a){ var s=String(a[2]||''), dg=String(Math.floor(a[0])), re=/\$\s*(\d[\d,\s]*(?:\.\d+)?)/g, m;
  while((m=re.exec(s))){ var d=m[1].split('.')[0].replace(/\D/g,''); var e=m.index+m[0].length;
    if(d&&(d===dg||(e>=s.length-2&&d.length>=4&&dg.indexOf(d)===0))) return [s.slice(Math.max(0,m.index-70),m.index), s.slice(e,e+50)]; }
  return null; }
function kx(r,a){
  if(a[1]==='cap'&&(r.co||CW_T.test(r.title||''))){ var c=cwCtx(a);
    if(c&&CW_REV.test(c[0])) return 'revised contract amount, as printed';
    if(c&&CW_CHG.test(c[1])) return 'contract change, as printed';
    if(c&&CW_REC.test(c[1])) return 'original contract amount, recited';
    if(r.co) return 'original contract amount, recited'; }
  return KINDX[a[1]]; }
function ptitle(r){
  /* r7 DECISIONS3: a title printed in capitals shows in the County's own case (r.tc: 'Krull Park', never 'Krull park'), the build's shown_title */
  if(r._pt===undefined){ var p=r.tc||plainTitle0(r.title); r._pt=tidyTitle(p); r._tc=r._pt!==p; }     /* _tc: the register put a space back in this title (PL-30) */
  return r._pt;
}
/* PL-30: where the register put a space back, the sheet says what the county printed (the build's as_printed_html says the same on the poster's sheet) */
function printedNote(r){ ptitle(r); return r._tc?'<p class="rsq">As printed: <i>'+esc(r.title)+'</i></p>':''; }
/* r7 R-01: a title read from the record's own block in the minutes says so (the agenda's listing named another resolution, a heading,
   nothing, or was cut short): the build's title_note_html() prints the same line on the poster's sheet */
function titleNote(r){ return r.tm===1?'<p class="rsq tmq">Title as printed in the minutes</p>':''; }
function dollarN(s){ var m=String(s).match(/\$/g); return m?m.length:0; }
/* a plain ink row with no chevron (the vote, the amount): label, optional sub-line, value */
function roRow(l,v,s){
  return '<div class="pl-row ro'+(s?'':' ns')+'"><span class="pl-row-l">'+l+'</span>'+(s?'<span class="pl-row-s">'+s+'</span>':'')+(v?'<span class="pl-row-v num">'+v+'</span>':'')+'</div>';
}
/* r3 PL-01: how a vote's noes are known. Named (the minutes list them), worked out ("d": the minutes name the ayes and the absent,
   and the noes are the rest of that year's seated chamber - the build checks the arithmetic ties to 15 seats) or count only ("c":
   no page may say who). Twin: build_decisions.nob_note() */
function nobNote(r){
  var v=r.vote, a=v.absent||0;
  if(v.nob==='d') return ' &mdash; worked out: the minutes name the '+v.ayes+' aye'+(v.ayes===1?'':'s')+(a?' and the '+a+' absent':'')+', and these are the other '+v.noes+' members seated in '+r.date.slice(0,4);
  if(v.nob==='c') return 'Voted no: not named &mdash; the minutes print how many ('+v.noes+'), not who';
  return '';
}
function recVoteRow(r){
  var v=r.vote, fut=r.date>TODAY;
  if(v){
    var out=v.out||'Adopted', subs=[];
    if(v.noes>0&&v.no_names&&v.no_names.length) subs.push('Voted no: <b>'+v.no_names.map(function(n){return nmLink(n,'no');}).join(', ')+'</b>'+nobNote(r));
    else if(v.noes>0&&v.nob==='c') subs.push(nobNote(r));
    if(v.absent) subs.push(v.absent+' absent'+(v.abs_names&&v.abs_names.length?': '+v.abs_names.map(esc).join(', '):''));
    if(FAILW[out]&&v.noes<v.ayes) subs.push('The counts printed in the minutes show more ayes than noes, but the record says '+esc(out)+'. The minutes are the authority.');
    else if(!FAILW[out]&&v.noes>v.ayes) subs.push('The counts printed in the minutes show more noes than ayes, but the record says '+esc(out)+'. The minutes are the authority.');
    if(v.ocr) subs.push('Read from the county’s scanned minutes by local OCR — the minutes PDF is the authority');
    return roRow(esc(out),v.ayes+'–'+v.noes,subs.join('<br>'));
  }
  if(fut) return roRow('Not voted on yet','','On the printed agenda for a meeting that hasn’t been held yet — the vote will appear here once the county posts the minutes.');
  var ms=(R.mstat||{})[r.date];
  var why=ms==='scan'?'The minutes for this meeting are a scanned image with no text layer — a machine can’t read the vote. The minutes PDF is the authority.'
    :ms==='ocr'?'The minutes for this meeting are a scanned image. Local OCR recovered most of its votes, but no vote line for this item survived the checks — the minutes PDF is the authority.'
    :ms==='none'?'The county has not posted minutes for this meeting — no vote record exists to read.'
    :'No vote line found for this item in the meeting’s minutes — the minutes PDF is the authority.';
  return roRow('Vote not read','',why);
}
/* the amounts the text quotes: a fold, at most three whole sentences, never an OCR table row (more than three $ signs) */
/* a contract change its title does not announce (r.co): the restated whole leads, said as what it is (IF-146-26) */
function coFirst(am){
  var w={tot:0,chg:1};
  return am.map(function(a,i){return [a,i];}).sort(function(x,y){
    var a=x[0][1] in w?w[x[0][1]]:2, b=y[0][1] in w?w[y[0][1]]:2; return a-b||x[1]-y[1];}).map(function(x){return x[0];});
}
/* r3 PL-02: a budget change that FAILED shows the largest change it proposed (its RESOLVED lines); an adopted one keeps them in the
   quoted amounts. Twin: build_decisions.bud_row() */
function budRow(r){
  if(!isFailed(r)) return '';
  var b=null, lim=ctyLimit(r); (r.am||[]).forEach(function(a){ if((a[1]==='inc'||a[1]==='dec')&&!(lim&&a[0]>lim)&&(b===null||a[0]>b)) b=a[0]; });
  return b===null?'':roRow('Largest budget change it proposed',money0(b),'It failed, so the budget stayed as adopted');
}
function coRow(r){
  if(!r.co) return '';
  var t=null,c=null; (r.am||[]).forEach(function(a){ if(a[1]==='tot'&&(!t||a[0]>t)) t=a[0]; if(a[1]==='chg'&&(!c||a[0]>c)) c=a[0]; });
  return t?roRow('Revised contract total',money0(t),'A change to an existing contract, as printed; not new spending permission')
          :(c?roRow('Contract change',money0(c),'A change to an existing contract, as printed'):'');
}
function recExcerpts(r){
  var am=r.co?coFirst(r.am||[]):(r.am||[]); if(!am.length) return '';
  var n=r.amtn||am.length, keep=am.filter(function(a){return a[2]!=null&&dollarN(a[2])<=3;}).slice(0,3), more=n-keep.length;
  var h='<details class="pl-fold"><summary>Amounts quoted in the text ('+n+')</summary>';
  keep.forEach(function(a){
    h+='<p class="rx">“'+esc(String(a[2]||'').replace(/\ufffd+/g,' ').replace(/\s+/g,' ').trim())+'” <b class="num">— '+money0(a[0])+'</b>'+(kx(r,a)?'<small>'+kx(r,a)+'</small>':'')+'</p>';
  });
  if(more>0) h+='<p class="rxmore">+ '+more+' more in the PDF</p>';
  return h+'<p class="rxnote">Excerpts as printed. A spending limit is permission; budget rows move existing money; bids include losing bids; a contract change restates a contract&rsquo;s total.</p></details>';
}
/* the same decision in other years: last year beside this year, then a pill per year (a pill opens that year's record in this sheet) */
function recSeries(r){
  var S0=(r.sr!=null&&SERL)?SERL[r.sr]:null; if(!S0) return '';
  var ser=S0.m, idx=-1, h='';
  for(var q=0;q<ser.length;q++) if(ser[q].id===r.id){ idx=q; break; }
  if(idx<0) return '';
  var prev=ser[idx+1];
  /* the pills carry each year's RANKED figure only (a ceiling, award, revenue or bid), labelled by kind and never added; a figure
     more than ten times the series' median is a parse artefact until the PDF says otherwise. A series with no ranked figure in
     any year shows its years only - the figures printed in its text are mentions, not amounts. */
  var rfs=ser.map(rankFig);
  var vals=rfs.filter(Boolean).map(function(f){return f.v;}).sort(function(a,b){return a-b;});
  var med=vals.length?vals[Math.floor(vals.length/2)]:0;
  var k0=(rfs.filter(Boolean)[0]||{}).k, uni=rfs.every(function(f){return !f||f.k===k0;});      /* one kind throughout: say it once, in the note */
  function ft(f){return f?esc(uni?money0(f.v):KW[f.k]+' '+money0(f.v))+((vals.length>=3&&f.v>10*med)?' <span class="unv" title="More than ten times the median figure of this series - almost certainly a parse artefact; check the resolution text">unverified</span>':''):'';}
  var span=+ser[0].date.slice(0,4)-+ser[ser.length-1].date.slice(0,4)+1;
  h+='<div class="ser"><div class="mnh">'+(S0.r?'Comes back year after year &middot; '+S0.ny+' of '+span+' years':'Same decision, other years &middot; '+ser.length+' times in '+S0.ny+' years')+'</div>';
  if(prev) h+=serTableHTML(serDiff(prev,r));
  var ycount={}; ser.slice(0,10).forEach(function(s){ var y=s.date.slice(0,4); ycount[y]=(ycount[y]||0)+1; });    /* two a year (a semiannual series): name the month */
  h+='<div class="srow">'+ser.slice(0,10).map(function(s,i){
    return '<a class="pill'+(s.id===r.id?' here':'')+'" href="?open='+encodeURIComponent(s.id)+'"'+(s.id===r.id?' aria-current="true"':'')+'>'+(ycount[s.date.slice(0,4)]>1?monLabel(s.date):s.date.slice(0,4))+(rfs[i]?' &middot; '+ft(rfs[i]):'')+'</a>';
  }).join(' ')+(ser.length>10?'<span class="mnote">+ '+(ser.length-10)+' earlier</span>':'')+'</div>'+
  '<div class="mnote">'+(vals.length?(uni?'Each year&rsquo;s '+(k0==='cap'?'spending limit ("up to")':KW[k0]+' figure')+' as printed in its text; never added across years.':'Ranked figures as printed in each year&rsquo;s text, labelled by kind; never added across years.'):'No spending limit, award, revenue or bid is printed in any year&rsquo;s text.')+'</div></div>';
  return h;
}
/* the same-name hop back to the city checkbook, and the accounts the resolution cites: two folds under the record */
function recLinks(r){
  var h='';
  var ves=vxKeysFor(r);
  if(ves.length){
    /* what matched, in the record's own words - the county's phrase marked where it sits (title or quoted text), beside the city's
       spelling of the payee, so the reader can see that "Amazon" is a brand-name match on a distribution centre, not a line to
       AMAZON CAPITAL SERVICES; a key the match could not be located for says so rather than pretend */
    h+='<details class="pl-fold vx-city"><summary>Same name in the city’s checkbook'+(ves.length>1?' ('+ves.length+')':'')+'</summary>'+
      ves.map(function(e){
        var loc=vxLocate(r,e.k), cityNm=e.payees.join(' / '), alias=e.payees.every(function(p){return p.toLowerCase()!==e.q.toLowerCase();});
        var where=loc.where==='t'?'In the title: '+markSpan(ptitle(r),loc.s,loc.e,40)
                 :loc.where==='x'?'In the text: “'+markSpan(r.am[loc.i][2]||'',loc.s,loc.e,40)+'”'
                 :'Matched on the normalised name “'+esc(e.k)+'” (the exact span could not be located in this record&rsquo;s text)';
        return '<p class="vline vxwhat"><span class="vxw">What matched</span> '+where+
          ' <span class="vxcity">&middot; the city&rsquo;s payee is spelled <b>'+esc(cityNm)+'</b>'+(alias?' &mdash; a one-word brand match on &ldquo;'+esc(e.q)+'&rdquo;':'')+'</span></p>';
      }).join('')+
      '<p class="srow">'+ves.map(function(e){
        var c=e.city||{}, nm=e.payees.length>1?e.q+' ('+e.payees.length+' spellings)':e.payees[0];
        return '<a class="pill" href="./?payee='+vxPayeeParam(e)+'&from=county" title="'+esc(R.vx.honesty||'')+'">'+esc(nm)+
          ' &middot; '+money0(c.amt||0)+' &middot; '+(c.lines||0)+' lines &middot; '+(c.warrants||0)+' warrants&nbsp;&rarr;</a>';
      }).join(' ')+'</p>'+
      '<div class="mnote">Name match only. The county authorises or accepts money; '+esc(R.vx.claims||'')+'. Never added together.</div></details>';
  }
  if(r.ac&&r.ac.length){
    h+='<details class="pl-fold acs"><summary>Accounts cited ('+r.ac.length+')</summary>'+
      '<p class="srow">'+r.ac.map(function(c){
        var g=glossFor(c), a=AC[c], gs=g?g.split(' - ')[0].split(' — ')[0]:'';
        return '<a class="pill acp" href="county.html#acct-'+c+'"'+(a?' data-ac="'+c+'" aria-label="'+esc(acAria(c,a,gs))+'"':'')+'>'+c+
          (g?' &middot; <span class="acg">'+esc(gs)+'</span>':'')+(a?acSpark(a,44,14,false):'')+'</a>';
      }).join(' ')+'</p>'+
      '<div class="mnote">Trace them in the ledger: each opens that account&rsquo;s '+AYN+'-year history on the county ledger.'+
        (r.ac.some(function(c){return AC[c];})?' The line on a pill is the county&rsquo;s own yearly total for that code, not this resolution&rsquo;s amount<span class="achint"> &mdash; hover or focus it for the figures</span>.':'')+'</div></details>';
  }
  return h;
}
/* Audit improvement 6: the sheet's one line of scale. The largest sum the resolution's TEXT names (r.amt) against the county's own filed
   spending for the resolution's year (R.cty: the figures county.html is built from), or - when that year is not filed yet - the latest
   filed year, named. It says nothing about what the vote authorizes, spends or pays: the sum is only a number printed in the text. No
   amount, or one larger than the county's whole year of spending (the sheet flags that as unverified), no line. consequence_html() in
   tools/build_decisions.py says the same on the poster's sheet. */
function consequenceLine(r){
  var a=r.amt; if(!a) return '';
  var y=r.date.slice(0,4), ky=CTY[y]?y:CTYB, exp=CTY[ky]; if(!exp||a>exp) return '';
  var p=100*a/exp, ps;
  if(p<0.1) ps='less than 0.1%';
  else if(p<10) ps='about '+(Math.floor(p*10+0.5)/10).toFixed(1).replace(/\.0$/,'')+'%';
  else ps='about '+Math.floor(p+0.5)+'%';
  return '<p class="rsq rscons">The largest sum it names: <b class="num">'+moneyShort(a)+'</b>, '+ps+' of the county&rsquo;s '+ky+' spending ('+moneyShort(exp)+(ky!==y?', the latest year filed':'')+').</p>';
}
/* which PDF holds what: the build's own provenance (build_resolutions.py), read the way minutes_url / packet_url read it in the generator.
   minUrl: the minutes the vote was read from ('' for a record with no vote). pkUrl: the packet that prints the resolution's text -
   R.srcs[date][r.pk] (no R.srcs for the meeting = its one packet, R.sources); a floor item (ft 2) with no pk is in no packet: its text is in the minutes. */
function minUrl(r){ return r.vote?(r.ms||(R.msrc&&R.msrc[r.date])||''):''; }
function pkUrl(r){
  var l=R.srcs&&R.srcs[r.date], i=r.pk;
  if(r.ft===2&&i==null) return '';
  return l?(l[i||0]||''):(i?'':((R.sources&&R.sources[r.date])||''));
}
/* ---------- r7 W-03: the vote, in the County's minutes ----------
   A record's receipt: its block on its page of the minutes, drawn at build time (tools/build_vote_receipts.py: outlined, the heading
   and the vote line underlined, a long middle folded out; a scanned page whole), the County's original opened at that page, a check
   line that sets the printed tally beside the member count, the roll call by member (every tile a link to the member's page), and
   the correction link carrying the record and the page. VRX[id] = [page, to, pages, w, h, said, how, roll, parts, printed, pp]; the
   build's roll_of() decided every tile - this only draws what it decided. */
var VR_WHY={"v": "its block in the minutes did not tie out to this vote when the site read them, and a wrong page is worse than none", "i": "the text the County\u2019s minutes carry does not print this resolution\u2019s number", "f": "the site has no copy of these minutes to draw from", "s": "the County posted these minutes as a scanned image, and the scan\u2019s text does not give this vote line a page"}, ROLL_WHY={"y": "the County\u2019s roll for that year, as the site has it, does not seat all 15 members by name", "m": "the minutes of that meeting name someone who is not on that January\u2019s roll (a seat may have changed hands), and no member is placed by guess", "n": "the minutes print how many voted no, not every name", "a": "the minutes print how many were absent, not who", "s": "the printed counts do not add up to the chamber\u2019s 15 seats"}, PP_NOTE=" &mdash; the County&rsquo;s file stores these pages out of order; the block&rsquo;s text runs from one straight on to the next";      /* the build's words (VR_WHY / ROLL_WHY / PP_NOTE), the poster's sheet prints the same */
function slugOf(k){ return String(k).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function vrFile(r,e){ return 'votes/'+r.date+'/'+(e[6]==='o'?'p'+e[0]:r.id)+'.webp'; }
function vrDrawn(e){ return e&&(e[6]==='t'||e[6]==='k'||e[6]==='o'); }
function rollTiles(r,e){
  var v=r.vote, seat=SEATY[r.date.slice(0,4)]||[], t=e[7]||'';
  if(t.charAt(0)==='-'||t.length!==seat.length||!seat.length) return '';
  var lab={A:'Aye',N:'No',X:'Absent'}, cls={A:'',N:' no',X:' ab'};
  return '<ul class="vroll" aria-label="How each member voted, '+esc(fmtDate(r.date))+'">'+seat.map(function(k,i){
    var c=t.charAt(i), role=k===v.mover?' &middot; moved':(k===v.second?' &middot; seconded':'');
    return '<li><a class="vt'+cls[c]+'" href="legislators/'+slugOf(k)+'.html"><b>'+esc(k)+'</b><span>'+lab[c]+role+'</span></a></li>';
  }).join('')+'</ul>';
}
function rollCheck(r,e){
  var v=r.vote, t=e[7]||'', said=e[5];
  /* the quoted line ends its own sentence when it ends on a stop ('… 0 Absent.') */
  var pr=(said?'The minutes print <q class="vsaid">'+esc(said)+'</q>':'The minutes print '+v.ayes+' ayes and '+v.noes+' noes')+(said&&/[.!?]$/.test(said)?' ':'. ');
  if(t&&t.charAt(0)!=='-'){
    var n=function(c){ return t.split(c).length-1; }, A=n('A'), N=n('N'), X=n('X'), same=A===v.ayes&&N===v.noes&&X===(v.absent||0);
    return '<p class="vchk">'+pr+'The roll call below counts <b>'+A+' Aye, '+N+' No, '+X+' Absent</b>'+
      (same?': the same as printed.':': not what is printed, and the minutes are the authority.')+'</p>';
  }
  var why=ROLL_WHY[t.slice(1)];
  return '<p class="vchk">'+pr+'Not laid out member by member'+(why?': '+why:'')+'.</p>';
}
function vrFigure(r,e){
  var mu=minUrl(r), how=e[6], d=esc(fmtDate(r.date));
  if(!vrDrawn(e)) return '<p class="vcap">No picture of this vote&rsquo;s page: '+(VR_WHY[how]||VR_WHY.f)+'.'+(mu?' The County&rsquo;s minutes, linked below, are the authority.':'')+'</p>';
  var pg=e[0], to=e[1], pages=e[2], src=vrFile(r,e), num=how==='k'?e[9]:r.id, pp=e[10]||null;
  /* r7 R-01: pages the County's file stores out of order are named one by one, in the order the block's text runs (pages_words) */
  var ppw=pp?'Pages '+(pp.length>1?pp.slice(0,-1).join(', ')+' and '+pp[pp.length-1]:pp[0]):'';
  var where=(pp?ppw:(to>pg?'Pages '+pg+'&ndash;'+to:'Page '+pg))+' of the '+(how==='o'?'scanned ':'')+'minutes of '+d+(pages?' ('+pages+' pages)':'')+(pp?PP_NOTE:'');
  var what=how==='o'?'the County posted a scan, so the whole page is shown and the block is not outlined'
    :'Resolution No. '+esc(num)+' from its heading to its vote, outlined'+(e[8]>1?', the middle of its text folded out':'');
  if(how==='k') what+='. The minutes print the number <b class="num">'+esc(num)+'</b> at its head; its title, tally and mover are '+esc(r.id)+'&rsquo;s';
  var alt=(how==='o'?'Page '+pg+' of the scanned minutes of '+fmtDate(r.date):'Resolution No. '+num+' in the minutes of '+fmtDate(r.date)+', '+
    (pp?ppw.toLowerCase():(to>pg?'pages '+pg+' to '+to:'page '+pg))+', outlined')+(e[5]?'. Its vote line: '+e[5]:'');
  return '<figure class="vfig"><div class="vpic"><a class="vimg" href="'+src+'" target="_blank" rel="noopener" title="Open the picture full size">'+
    '<img src="'+src+'" width="'+e[3]+'" height="'+e[4]+'" loading="lazy" decoding="async" alt="'+esc(alt)+'"></a></div>'+
    '<figcaption>'+where+': '+what+'. '+(mu?'<a class="vorig" href="'+esc(mu)+'#page='+pg+'" target="_blank" rel="noopener">The County&rsquo;s original (PDF, page '+pg+')</a>':'')+'</figcaption></figure>';
}
function recReceipt(r){
  if(!r.vote) return '';
  var e=VRX[r.id], h='<section class="vrc" aria-labelledby="vrH"><h3 class="vrh" id="vrH">The vote, in the County&rsquo;s minutes</h3>';
  if(!e) return h+'<div class="vrfail"></div></section>';           /* the year's receipts did not arrive: recFill puts the shared message here */
  var rec=esc(r.id)+(vrDrawn(e)?' &middot; p.'+e[0]:'')+' of the minutes of '+esc(fmtDate(r.date));
  return h+vrFigure(r,e)+rollCheck(r,e)+rollTiles(r,e)+
    '<p class="vfix">Something wrong on this record? '+CORR+' &mdash; <span class="vrec" data-pl-record>'+rec+'</span> goes with it.</p></section>';
}
/* the sheet's content, top to bottom (the kicker is the sheet's own head): title, vote, amount, who, notes, quoted amounts, series, links, buttons */
function recSheetHTML(r){
  var v=r.vote, h='', fut=r.date>TODAY, rf=rankFig(r);
  h+='<h2 class="pl-h2" id="rsTitle">'+esc(ptitle(r))+'</h2>'+titleNote(r)+printedNote(r);
  h+='<div class="pl-rows">'+recVoteRow(r)+(rf?roRow(kp(r,rf.k),money0(rf.v),isFailed(r)?'It failed, so nothing was approved':(rf.k==='cap'?'Permission to spend, not a payment':'')):(r.co?coRow(r):budRow(r)))+'</div>';
  h+=consequenceLine(r);
  var who=[];
  if(r.sp&&r.sp.length) who.push('Sponsored by '+r.sp.map(function(n){return nmLink(n,'sp');}).join(', '));
  if(v&&v.mover) who.push('Moved by '+esc(v.mover)+(v.second?', seconded by '+esc(v.second):''));
  if(who.length) h+='<p class="rsq">'+who.join(' &middot; ')+'</p>';
  /* r7 F-30: a twin is the County's record, not a duplicate here: say so, and open the other */
  if(R.tw&&R.tw[r.id]) h+=R.tw[r.id].map(function(t){
    return '<p class="rsq twq"><span class="twn">twin of <a class="num" href="?open='+encodeURIComponent(t[0])+'">'+esc(t[0])+'</a> ('+t[1]+')</span> '+
      'The same title and the same figure, the same night: both numbers are on the County&rsquo;s own record.</p>';
  }).join('');
  var tpn=r.tp&&TPL[r.tp]&&r.tp!=='o'?TPL[r.tp]:'';
  if(tpn) h+='<p class="rsq">About: '+esc(tpn)+'</p>';
  if(fut&&!(r.am&&r.am.length)&&!r.cap) h+='<p class="rsq">The posted agenda lists this resolution by title only &mdash; dollar detail arrives with the full packet.</p>';
  /* ?open= rather than ?q=: a rescission's title names the id it undoes, so a search for that id lands on two rows */
  if(RESCBY[r.id])
    h+='<p class="rsnote">Rescinded by <a href="?open='+encodeURIComponent(RESCBY[r.id])+'" class="num">'+RESCBY[r.id]+'</a> &mdash; '+
       (r.cap?'this spending limit is no longer live permission.':'this resolution is no longer in force.')+'</p>';
  if(RESC[r.id]&&RESC[r.id].length)
    h+='<p class="rsq">Rescinds '+RESC[r.id].map(function(i){return '<a href="?open='+encodeURIComponent(i)+'" class="num">'+i+'</a>';}).join(', ')+
       (r.cap?' &mdash; the figure restates the rescinded limit, it is not a new permission.':'.')+'</p>';
  if(r._f&&r._f.over)
    h+='<p class="rsnote">The figure <b>'+money0(r._f.v)+'</b> is larger than everything the county spends in a whole year ('+
       money0(ctyLimit(r))+', its '+(CTY[r.date.slice(0,4)]?r.date.slice(0,4):CTYB)+' filing with the State Comptroller). '+
       'It is almost certainly a reference number or a parsing artefact, not money &mdash; treat it as unverified and check the resolution text.</p>';
  h+=recReceipt(r)+recExcerpts(r)+recSeries(r)+recLinks(r);
  /* the vote lives in the MINUTES and the text in the PACKET that prints it. The old single 'source PDF' was the meeting's first packet,
     which for a meeting filed as an agenda cover plus a resolutions packet (12-9-25) holds neither the resolution nor its vote. */
  var mu=minUrl(r), pu=pkUrl(r), msc=(R.msrc&&R.msrc[r.date])||'', main='', more='';
  function ext(u,cls,t){ return '<a class="'+cls+'" target="_blank" rel="noopener" href="'+esc(u)+'">'+t+'</a>'; }
  if(v){
    if(mu){
      var ve=VRX[r.id], vp=vrDrawn(ve)?ve[0]:0;      /* r7 W-03: opened at the page that prints the vote */
      main=ext(vp?mu+'#page='+vp:mu,'pl-btn pri',vp?'The County&rsquo;s original (PDF, page '+vp+')':'Open the minutes (the vote)');
      if(pu&&pu!==mu) more=ext(pu,'pl-pill','The resolution text (PDF)');      /* a votey packet IS the minutes: one file, one link */
    } else {
      h+='<p class="rsq">The county has posted no minutes for this meeting, so there is no minutes PDF to open for this vote.</p>';
      if(pu) main=ext(pu,'pl-btn pri','Open the resolution text (PDF)');
    }
  } else {
    if(pu) main=ext(pu,'pl-btn pri','Open the resolution text (PDF)');
    if(msc&&msc!==pu) more=ext(msc,'pl-pill','The minutes (PDF)');            /* no vote line for this item: the meeting's minutes are the authority, so they are one tap away */
  }
  /* r8 W-03: the record's own page (r/<id>.html) comes first; the County's original and the register follow */
  h+='<div class="pl-btns"><a class="pl-btn pri" href="r/'+encodeURIComponent(r.id)+'.html">Open its page&nbsp;&rarr;</a>'+main.replace('pl-btn pri','pl-btn')+
     '<button class="pl-btn" type="button" data-reg="'+esc(r.id)+'">Find it in the register</button></div>'+
     '<p class="cprow">'+more+'<a class="pl-pill cpl" href="?open='+encodeURIComponent(r.id)+'" title="Copy a link that opens this record">Copy link</a></p>';
  return h;
}
var RS={el:$('rsheet'),box:null,id:'',opener:null};
var BASE_TITLE=document.title;      /* r8 F-09: the page's own title, given back when a record closes */
RS.box=RS.el.querySelector('.sheet');
/* r7 R-02: every way in (an ?open= link, a row, Back / Forward, an r/ doorway, a legislator's no vote) lands at the sheet's top */
function sheetFocus(){ RS.box.focus({preventScroll:true}); $('rsBody').scrollTop=0; }
/* r7 W-03: a receipt picture that does not arrive says so where it would be (an image's error reaches a capture listener), and
   Try again draws the sheet again */
RS.box.addEventListener('error',function(e){
  var im=e.target; if(!im||im.tagName!=='IMG'||!im.closest||!im.closest('.vpic')) return;
  var r=BYID[RS.id]; failPart(im.closest('.vpic'),function(){ if(r&&RS.id===r.id) recFill(r); });
},true);
/* the sheet is the page model's one SHEET (PL.layer): opening pushes ONE history entry (the page's own ?open= address, below), so the
   Back gesture closes the sheet instead of leaving the page; the rest of the page goes inert, Tab stays inside, it is aria-modal.
   auto:false because the page's own popstate handler (further down) also restores the register's state. */
var RL=PL.layer({auto:false});
function recFill(r){
  $('rsKick').innerHTML='<span class="num">'+esc(r.id)+'</span> &middot; '+esc(CM[r.cm]||r.cms||r.cm)+' &middot; '+(r.date>TODAY?'scheduled ':'')+'<span class="nw">'+fmtDate(r.date)+'</span>';
  var b=$('rsBody'); b.innerHTML=recSheetHTML(r); b.scrollTop=0;
  /* r7 F-13 / W-03: the year's receipts did not arrive - the shared message in their place, and Try again fetches them and redraws */
  var vf=b.querySelector('.vrfail');
  if(vf) failPart(vf,function retry(){
    shardGet('vr-'+r.date.slice(0,4),function(){ if(RS.id===r.id) recFill(r); },
      function(){ var x=$('rsBody').querySelector('.vrfail'); if(x&&RS.id===r.id) failPart(x,retry); });
  });
}
/* mode 'arrive': opened by an address (a shared ?open= link, a reload, Forward) - no history entry of its own, so one Back leaves */
function busy(el,on){ if(el&&el.setAttribute){ if(on) el.setAttribute('aria-busy','true'); else el.removeAttribute('aria-busy'); } }
/* what a record's sheet reads beyond the record: the quoted text (an inline year keeps it in a text shard) and the series digest (a
   record that comes back every year). The sheet opens the moment they are here; a record from a year that has not arrived waits for the year. */
function recKeys(r){
  var ks=[], y=r.date.slice(0,4);
  if(INL[y]&&r.am&&r.am.length) ks.push('text-'+y);
  if(r.sr!=null) ks.push('series');
  if(r.vote&&SH['vr-'+y]) ks.push('vr-'+y);      /* r7 W-03: where its vote is printed, and the roll call by member */
  return ks;
}
function openRec(id,opener,mode){
  var r=BYID[id];
  if(!r){
    var y=yearOfId(id);
    if(!y||LOADED[y]) return false;                                  /* no such record */
    busy(opener,1);
    shardGet(y,function(){ busy(opener,0); if(BYID[id]) openRec(id,opener,mode); else if(mode==='arrive'){ state.open=''; syncURL(); noRec(id); } },
      function(){
        busy(opener,0);
        /* r7 F-13: a shared link to a record whose year did not come leaves a Try again where the register would be (a toast alone is gone in seconds) */
        if(mode==='arrive') failPart($('list'),function(){ render(); openRec(id,opener,mode); });
        if(window.PL&&PL.toast) PL.toast(id+' didn\u2019t load: the connection may have dropped. Try again.',5000);
      });
    return true;
  }
  var ks=recKeys(r);
  if(ks.some(function(k){return !SHDONE[k];})){
    busy(opener,1);
    shardAll(ks,function(){ busy(opener,0); showRec(id,opener,mode); },function(){ busy(opener,0); showRec(id,opener,mode); });      /* a shard that will not load: the sheet opens without it */
    return true;
  }
  return showRec(id,opener,mode);
}
function showRec(id,opener,mode){
  var r=BYID[id]; if(!r) return false;
  var was=!!RS.id;
  TIP.hide();
  recFill(r); RS.id=id; if(opener||!was) RS.opener=opener||null;
  state.open=id;
  RS.el.hidden=false; html.style.overflow='hidden';
  if(!was){
    if(mode==='arrive') syncURL(false); else { syncURL(true); RL.pushed=true; }
    /* r7 R-02: the sheet opens at its top - the title, then the minutes picture. Focus goes to the sheet itself (tabindex=-1,
       labelled by its title) without scrolling, so the first Tab is Close and the order runs down the sheet; focusing the
       primary button (the County's original, far down) scrolled the sheet 806 of 1,487 px on a phone */
    RL.modal(RS.box,{label:ptitle(r),focus:{focus:sheetFocus},opener:RS.opener});
    sheetFocus();
  } else {
    syncURL(false);                                   /* another record opened from inside the sheet: the same history entry, a new address */
    sheetFocus();                                     /* r7 R-02: the next record opens at its top too */
  }
  return true;
}
function recHide(){
  RL.unmodal({focus:false});
  RS.el.hidden=true; html.style.overflow='';
  RS.box.style.transform=''; RS.box.classList.remove('dragging');
  var op=RS.opener, was=RS.id; RS.id=''; RS.opener=null; state.open='';
  if(op&&op.isConnected&&op.getClientRects().length) op.focus({preventScroll:true});
  else{
    /* r8: a record opened by an address (a shared link, a reload) has no opener: focus lands on its row in the register when it is drawn,
       else on the page's heading - never on <body> */
    var rw=document.querySelector('[data-rid="'+was+'"],.rrow[data-id="'+was+'"] button,.rrow[data-id="'+was+'"] a');
    if(rw&&rw.getClientRects().length) rw.focus({preventScroll:false});
    else{ var h1=document.querySelector('#main h1'); if(h1){ if(!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex','-1'); h1.focus({preventScroll:true}); } }
  }
}
/* a reader closed it (X, Esc, a tap outside, a swipe, Done): pop the entry it pushed (a sheet opened by an address has none: only the address is rewritten) */
function closeRec(fromPop){
  if(!RS.id) return;
  recHide();
  if(fromPop) RL.pushed=false; else if(!RL.pop()) syncURL();
}
/* the reader chose to go to the register from the sheet ('Find it in the register', a name in the vote): the sheet closes WITHOUT popping,
   so its entry stays as the origin (its address is the page's own again) and what the reader asked for pushes ONE entry on top - Back
   returns to where they tapped from */
function recToRegister(){
  if(!RS.id) return;
  recHide();
  RL.pushed=false; syncURL(false);
}
$('rsClose').addEventListener('click',function(){ closeRec(false); });
$('rsBack').addEventListener('click',function(){ closeRec(false); });
document.addEventListener('keydown',function(e){
  if(!RS.id||e.key!=='Escape') return;
  e.preventDefault(); closeRec(false);                 /* Tab is trapped by the layer */
});
$('rsBody').addEventListener('click',function(e){
  var rb=e.target.closest('[data-reg]');
  if(rb){ var id=rb.getAttribute('data-reg'); recToRegister(); drillTo(id); return; }
  var cl=e.target.closest('.cpl'); if(cl){ copyLink(cl,e); return; }
  var a=e.target.closest('a[href^="?open="]');
  if(a&&!(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)){
    e.preventDefault();
    var o=decodeURIComponent(a.getAttribute('href').slice(6));
    if(!openRec(o,null)) { recToRegister(); state.q=o; qEl.value=o; render(); syncURL(true); }
  }
});
/* a swipe down on the sheet's head (or its handle) dismisses it; the body keeps its own scroll */
(function(){
  var sh=RS.box, head=$('rsHead'), y0=null, dy=0;
  head.addEventListener('touchstart',function(e){ if(!e.touches||!e.touches[0]) return; y0=e.touches[0].clientY; dy=0; sh.classList.add('dragging'); },{passive:true});
  head.addEventListener('touchmove',function(e){ if(y0===null||!e.touches||!e.touches[0]) return; dy=Math.max(0,e.touches[0].clientY-y0); sh.style.transform='translateY('+dy+'px)'; },{passive:true});
  function end(){ if(y0===null) return; sh.classList.remove('dragging'); sh.style.transform=''; var d=dy; y0=null; dy=0; if(d>90) closeRec(false); }
  head.addEventListener('touchend',end); head.addEventListener('touchcancel',end);
})();
function applyFilters(p){
  if(state.cm) p=p.filter(function(r){return r.cm===state.cm;});
  if(state.tp) p=p.filter(function(r){return (r.tp||'o')===state.tp;});
  if(state.money) p=p.filter(function(r){return r.cap||(r.am&&r.am.length);});
  if(state.mover) p=p.filter(function(r){return r.vote&&r.vote.mover===state.mover;});
  if(state.um) p=p.filter(unmatched);
  if(state.ur) p=p.filter(unread);
  return p;
}
/* a name search: the rows where the name is in the title, the text, the
   sponsors or the vote come first; the rows where the name only MOVED the
   mover-only fold under one line (FOLD.n) unless state.all */
var FOLD={n:0};
/* r7 DECISIONS3: a year in a search has two readings, and the reader sees both. r6 F-17 read a year typed with other words as the
   year ('2015 bridge' found nothing as a phrase) - but then 'Adoption of 2024 Budget' found nothing: B-008-23, the 11-3 vote that
   adopted the 2024 budget, is dated Dec 12, 2023. Now a search that names a year (one the register holds) lists
     from the year   the resolutions of that year with the other words in them (the other words as typed, a phrase), and
     printing it     the resolutions of any year that print the year as a word and each of the other words,
   the second left out while 'Only resolutions from <year>' is on. A year with other words opens with both (the whole words as typed,
   in a title, lead the list); a year on its own opens on its year, the chip on. The chip is the reader's (?yo=on|off), kept by a
   reload and by Back; a new search starts from its own default. YQ says what the list holds: the note above it and the phone's
   summary line say it in words, and a row that is listed only for printing the year says so beside its title. */
var YQ=null;
function yearOfQ(q){ var m=q.match(/(^|\s)((?:19|20)\d{2})(?=\s|$)/); return (m&&byYear[m[2]])?m[2]:null; }
function pool(){
  var p;
  FOLD.n=0; VXE=null; VXWIDE=0; VXEX=''; YQ=null;
  if(state.q.length>=2){
    var q=state.q.toLowerCase(), y=state.only?null:yearOfQ(q);
    if(y){
      var rest=q.replace(new RegExp('(^|\\s)'+y+'(?=\\s|$)'),' ').replace(/\s+/g,' ').trim(), yre=new RegExp('(^|[^0-9])'+y+'(?![0-9])');
      var words=rest?rest.split(' '):[], only=state.yo==='on'||(state.yo!=='off'&&!rest), nF=0, nP=0;
      p=[];
      RECS.forEach(function(r){
        var s=r._s, inF=r.date.slice(0,4)===y&&(!rest||s.indexOf(rest)>=0);
        var inP=yre.test(s)&&words.every(function(w){return s.indexOf(w)>=0;});
        if(inF) nF++; else if(inP) nP++;
        if(!(inF||(inP&&!only))) return;
        r._yx=s.indexOf(q)>=0?0:1; r._yf=inF?0:1;
        r._mq=r._yx===0?q:(inF?rest:y);
        p.push(r);
      });
      YQ={y:y,rest:rest,only:only,nF:nF,nP:nP};
    } else {
      p=RECS.filter(function(r){return r._s.indexOf(q)>=0;});
      p.forEach(function(r){ r._yx=0; r._yf=0; r._mq=q; });
    }
    VXE=vxQuery(); VXWIDE=0; VXEX='';
    if(VXE){
      var set=VXSET[VXE.k]||{}, wide=p.filter(function(r){return !set[r.id];});
      VXWIDE=wide.length;
      if(wide.length){ var ws=wide[0]._s, wi=ws.indexOf(q), wj=wi+q.length; while(wj<ws.length&&/[a-z0-9]/.test(ws.charAt(wj))) wj++; VXEX=ws.slice(wi,wj); }
      /* the city's count, row for row: every record the crosswalk tied to this name, found by the crosswalk's own match
         (a normalised whole-phrase on the title and the quoted text) and nothing it did not */
      if(!state.loose){ p=RECS.filter(function(r){return !!set[r.id];}); p.forEach(function(r){ r._yx=0; r._yf=0; r._mq=q; }); }
    }
    /* a row of the year that matches by its date alone (a year searched on its own) is a match, not a mover-only fold */
    p.forEach(function(r){r._t=r._mq?matchHow(r,r._mq).t:0;});
    if(state.only==='no') p=p.filter(function(r){return (r.vote&&r.vote.no_names||[]).some(function(n){return n.toLowerCase().indexOf(q)>=0;});});
    else if(state.only==='sp') p=p.filter(function(r){return (r.sp||[]).some(function(n){return n.toLowerCase().indexOf(q)>=0;});});
    else if(!state.all){
      var keep=p.filter(function(r){return r._t<5;});
      if(keep.length){ FOLD.n=p.length-keep.length; p=keep; }
    }
    /* the words as typed in full lead their tier ('Adoption of 2024 Budget' is B-008-23's title), then the year's own rows */
    p=p.slice().sort(function(a,b){ if(a._t!==b._t) return a._t-b._t; if(a._yx!==b._yx) return a._yx-b._yx; if(a._yf!==b._yf) return a._yf-b._yf; return regCmp(a,b); });
  } else {
    p=state.um ? RECS.filter(unmatched).sort(regCmp) : state.ur ? RECS.filter(unread).sort(regCmp) : ((state.order==='id'?byYearId:byYear)[state.year]||[]);
  }
  return applyFilters(p);
}
/* the per-meeting fold is on only in the plain view: no search, no filter,
   money order - a search or a chip means 'show me every row' */
function folding(){ return !(state.q.length>=2)&&!filtersActive()&&state.order!=='id'; }
/* a filter that empties the current year jumps to the newest year that has
   matches - the chip counts span all twelve years, the click means "show me" */
function autoJump(){
  if(state.q.length>=2) return null;
  if(!(state.cm||state.tp||state.money||state.mover)) return null;
  if(pool().length) return null;
  for(var i=0;i<years.length;i++){
    if(applyFilters(byYear[years[i]]||[]).length){
      var from=state.year;
      state.year=years[i];
      syncYearPills();
      return {to:years[i], from:from};
    }
  }
  return {none:true};
}
function syncYearPills(){
  yr.querySelectorAll('.yb').forEach(function(x){
    x.setAttribute('aria-pressed',x.getAttribute('data-y')===state.year);});
}
var SEEDS=[];
function trySeedsHTML(){
  return SEEDS.map(function(s){
    return '<button class="tryb" type="button" data-q="'+esc(s)+'">'+esc(s)+'</button>';}).join('');
}
/* a strip that scrolls sideways (the Try chips on a phone) fades at the edge that has more behind it: .ovl / .ovr, which the
   stylesheet turns into an edge mask. Nothing is set while every chip fits. The ResizeObserver also covers a rotation and the row
   being shown or hidden; the scroll listener is passive. */
function edgeFade(el){
  if(!el||el.__fade) return;
  el.__fade=1;
  function upd(){
    var m=el.scrollWidth-el.clientWidth;
    el.classList.toggle('ovl',m>4&&el.scrollLeft>4);
    el.classList.toggle('ovr',m>4&&el.scrollLeft<m-4);
  }
  el.addEventListener('scroll',upd,{passive:true});
  if(window.ResizeObserver) new ResizeObserver(upd).observe(el); else window.addEventListener('resize',upd,{passive:true});
  upd();
}
function filtersActive(){return !!(state.cm||state.tp||state.money||state.mover||state.um||state.ur);}
function activeCount(){
  return (state.cm?1:0)+(state.tp?1:0)+(state.money?1:0)+(state.mover?1:0)+(state.order==='id'?1:0)+
    ((state.q.length<2&&state.year!==years[0])?1:0);
}
function resetFilters(){
  state.cm='';state.tp='';state.money=false;state.mover='';state.year=years[0];state.order='money';state.only='';state.all=false;state.loose=false;state.um=false;state.ur=false;state.yo='';
  syncControls();
  render();syncURL();
}
/* paint every control from state (boot, popstate, reset) */
function syncControls(){
  cc.querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x.getAttribute('data-cm')===state.cm);});
  $('moneyChip').setAttribute('aria-pressed',String(state.money));
  moverSel.value=state.mover;moverSel.classList.toggle('on',!!state.mover);
  tpSel.value=state.tp;tpSel.classList.toggle('on',!!state.tp);
  $('orderRow').querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x.getAttribute('data-order')===state.order);});
  if(qEl.value!==state.q) qEl.value=state.q;
  syncYearPills();
}
/* the phone's one-line summary under the search: what you are looking at */
function syncLive(){
  /* the match count lives in #qn on a desktop and in the summary line on a phone; only the visible one speaks */
  var ph=phoneMQ.matches;
  $('qn').setAttribute('aria-live',ph?'off':'polite');
  $('sumline').setAttribute('aria-live',ph?'polite':'off');
}
if(phoneMQ.addEventListener) phoneMQ.addEventListener('change',syncLive);
function paintSummary(n){
  syncLive();
  var q=state.q.length>=2, bits=[];
  bits.push(q?((state.only==='no'?'Voted no: ':state.only==='sp'?'Sponsored by: ':'Search ')+'<b>&ldquo;'+esc(state.q)+'&rdquo;</b>'):((state.um||state.ur)?'<b>Every year</b>':'<b>'+state.year+'</b>'));
  if(q&&YQ) bits.push(YQ.only?'only from '+YQ.y:'from '+YQ.y+' or printing it');      /* r7 DECISIONS3: which reading of the year */
  if(state.um) bits.push('vote not matched to the minutes');
  if(state.ur) bits.push('no vote read yet');
  if(state.cm) bits.push(esc(CM[state.cm]||state.cm));
  if(state.tp) bits.push(esc(TPL[state.tp]||state.tp));
  if(state.money) bits.push('mentions dollars');
  if(state.mover) bits.push('moved by '+esc(state.mover));
  if(state.order==='id') bits.push('clerk&rsquo;s order');
  bits.push('<b>'+n.toLocaleString('en-US')+'</b> '+(q?(n===1?'match':'matches'):(n===1?'resolution':'resolutions')));
  $('sumTxt').innerHTML=bits.join(' &middot; ');
  var narrowed=filtersActive()||state.order==='id'||(!q&&state.year!==years[0])||(q&&!!state.only);
  $('sumx').hidden=!narrowed;
  $('sumline').classList.toggle('has',narrowed);
  var c=activeCount();
  fbtn.classList.toggle('has',c>0);
  $('fcount').textContent=c?' · '+c:'';
  fbtn.setAttribute('aria-label',c?'Filters, '+c+' active':'Filters');
  $('fshow').textContent='Show '+n.toLocaleString('en-US')+(q?(n===1?' match':' matches'):(n===1?' resolution':' resolutions'));
}
/* render(): a fresh list; render(true): one more page; render('keep'): the
   same rows again (a fold opened or closed) without adding a page */
/* Move 5: a meeting with NO vote to read - minutes the county has not posted (the newest agenda: votes pending; two older
   sittings: never posted) or a meeting not yet held - is one fold row in the year view, not a screen of identical
   'votes not read yet' pills above the first recorded vote. The hero band already tells the pending story; the register
   opens on the latest meeting WITH votes. The fold opens in place (the +N row, 'See the agenda', a deep link to a row or to
   #m-<date>) and its rows then draw under the meeting's own header. The count on the row is the rows it folds. */
var PEND={};
/* the meetings of this year whose votes are not to be read: not yet held, minutes posted late, or never posted. A year's dates are all in
   its own records, so each year is read as it arrives */
function notePend(rs){
  var any={}; rs.forEach(function(r){ if(r.vote) any[r.date]=1; });
  var pl={}; (R.summary.pending_meetings||[]).forEach(function(d){pl[d]=1;});
  rs.forEach(function(r){ var d=r.date; if(any[d]||PEND[d]) return;
    if(d>TODAY) PEND[d]='future'; else if((R.mstat||{})[d]==='none') PEND[d]=pl[d]?'pending':'never'; });
}
/* the prerender contract for the digests: what the build counted, the page counts again from the records and says so if it differs */
var DRIFTN=0, ALLOK=false;
function drift(msg){ DRIFTN++; try{ console.error('prerender drift: rebuild decisions.html - '+msg); }catch(e){} }
function verifyYear(y,rs){
  var d=YD[y], per={}, nm=0, c=0, f=0, u=0, mo=0, mm=0, t='', ci=[], seq=byYearSeq[y], bad=[], i;
  rs.forEach(function(r){
    per[r.date]=(per[r.date]||0)+1;
    if(!r.vote) u++; else if(r.vote.noes>0){ c++; if(isFailed(r)) f++; }
    if(r.cap||(r.am&&r.am.length)) mo++;
  });
  Object.keys(per).forEach(function(k){ nm++; if(per[k]>mm) mm=per[k]; });
  for(i=0;i<seq.length;i++){ var k=tickCls(seq[i]); t+=k; if(k==='c') ci.push([i,seq[i].id,seq[i].date,seq[i].vote.ayes,seq[i].vote.noes,isFailed(seq[i])?1:0]); }
  [['n',rs.length],['m',nm],['mm',mm],['c',c],['f',f],['u',u],['mo',mo],['t',t]].forEach(function(p){ if(d[p[0]]!==p[1]) bad.push(p[0]+' page "'+d[p[0]]+'" / records "'+p[1]+'"'); });
  if(JSON.stringify(d.ci||[])!==JSON.stringify(ci)) bad.push('the votes with a no');
  if(bad.length) drift(y+': '+bad.join('; '));
}
function verifyAll(){
  if(ALLOK) return; ALLOK=true;
  function tally(){ var ix={}, a=[]; return {add:function(k){ if(ix[k]===undefined){ ix[k]=a.length; a.push([k,0]); } a[ix[k]][1]++; }, list:a}; }
  var cm=tally(), mv=tally(), no=tally(), sp=tally(), mo=0, bad=[];
  RECS.forEach(function(r){
    var v=r.vote||{};
    cm.add(r.cm); if(v.mover) mv.add(v.mover);
    (v.no_names||[]).forEach(function(n){no.add(n);}); (r.sp||[]).forEach(function(n){sp.add(n);});
    if(r.cap||(r.am&&r.am.length)) mo++;
  });
  [['cm',cm.list],['mv',mv.list],['no',no.list],['sp',sp.list]].forEach(function(p){ if(JSON.stringify(AG[p[0]])!==JSON.stringify(p[1])) bad.push(p[0]); });
  if(mo!==AG.money) bad.push('money '+AG.money+'/'+mo);
  if(RECS.length!==DTOT) bad.push('total '+DTOT+'/'+RECS.length);
  if(bad.length) drift('every year: '+bad.join('; '));
}
/* the Rituals list: each row's 'what changed' is re-derived from the two newest records of its series (the build drew it) - as soon as both
   are here; the row names its previous record (data-r1) so the check needs no series shard */
var RITDONE={}, RITN=0, RITREP=0;
function checkRituals(){
  [].forEach.call(document.querySelectorAll('#rituals .rit-row'),function(row){
    var c=row.querySelector('.rit-chg'); if(!c||!c.id||RITDONE[c.id]) return;
    var r0=BYID[row.getAttribute('data-rid')], r1=BYID[row.getAttribute('data-r1')]; if(!r0||!r1) return;
    RITDONE[c.id]=1; RITN++;
    PL.hydrate(c.id,esc(serPhrase(serDiff(r1,r0))));
  });
  if(window.__regReady&&RITN>RITREP){ RITREP=RITN; PL.hydrate.report('decisions.html'); }
}
/* the records the page carries (the two newest years) enter the store now */
(function(){
  var by={}; (R.resolutions||[]).forEach(function(r){ var y=r.date.slice(0,4); (by[y]=by[y]||[]).push(r); });
  Object.keys(by).forEach(function(y){ addYear(y,by[y]); });
})();
function pendFolded(d){ return !!PEND[d]&&!expanded[d]; }
function pendWhy(d){
  return PEND[d]==='future'?'meeting not yet held':PEND[d]==='pending'?'votes appear when the minutes post':'the county never posted minutes for this meeting';
}
function pendHTML(d,n){
  var kind=PEND[d]==='never'?'resolutions':'resolutions on the agenda';
  return '<div class="rrow grp pend" id="m-'+d+'" data-d="'+d+'"><button class="rtop gtop" type="button" aria-expanded="false" data-g="'+d+'">'+
    '<span class="rid num">+'+n+'</span>'+
    '<span class="rtitle"><b>'+n+' '+kind+' &middot; '+fmtDate(d)+'</b> &middot; '+pendWhy(d)+'</span>'+
    '<span class="rbadges"><span class="gch">show the '+(PEND[d]==='never'?'rows':'agenda')+'</span></span></button></div>';
}
var RSEQ=0;
/* what the current view reads: the selected year, or - for a search or a filter, which span every year - all of them (and, for a search,
   the quoted text the newest years keep in text shards) */
function needKeys(){
  var all=state.q.length>=2||filtersActive();
  return shardKeys(all?years:[state.year],state.q.length>=2);
}
/* the years a set of shards stands for, as one range ('2015–2024'): the older years when any are missing, else the text's years */
function loadingYears(ks){
  var ys=[], tx=[];
  ks.forEach(function(k){ if(SHDONE[k]) return; if(k.indexOf('text-')===0) tx.push(k.slice(5)); else ys.push(k); });
  var a=(ys.length?ys:tx).sort();
  return !a.length?'':(a[0]===a[a.length-1]?a[0]:a[0]+'\u2013'+a[a.length-1]);
}
function paintLoading(ks){
  $('list').innerHTML='<div class="ldg" role="status"><i aria-hidden="true"></i><span>Loading '+loadingYears(ks)+'\u2026</span></div>';
  $('moreBtn').style.display='none';
  $('qn').textContent='';          /* the count appears only when every year it covers has arrived (the hop gate reads it) */
  $('sumTxt').innerHTML=(state.q.length>=2?'Search <b>&ldquo;'+esc(state.q)+'&rdquo;</b>':'<b>'+state.year+'</b>')+' &middot; loading&hellip;';      /* no stale count beside the card */
}
/* fix wave 11-08 (U01): the files that did not arrive, by name - '2018', '2017 and 2018', 'the full text of 2026' */
function failNames(ks){
  var ys=[], tx=[];
  ks.forEach(function(k){ if(SHDONE[k]) return; if(k.indexOf('text-')===0) tx.push(k.slice(5)); else ys.push(k); });
  function and(a){ a=a.slice().sort(); return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1]; }
  var out=[]; if(ys.length) out.push(and(ys)); if(tx.length) out.push('the full text of '+and(tx));
  return out.join(' and ');
}
function paintLoadFail(ks,retry,failed){
  var nm=failNames(failed&&failed.length?failed:ks);
  $('moreBtn').style.display='none';
  /* r5 F-04: the summary line says it too - it no longer reads 'loading…' over a failure - and names what did not come */
  $('sumTxt').innerHTML=(state.q.length>=2?'Search <b>&ldquo;'+esc(state.q)+'&rdquo;</b>':'<b>'+state.year+'</b>')+' &middot; '+(nm?esc(nm)+' didn&rsquo;t load':'couldn&rsquo;t load');
  /* fix wave 11-08 (U01): a search keeps what the years that did arrive found - the matches so far, newest first - under one line that names the
     years missing and a Try again that asks for those files only (the arrived ones are done and are not asked for twice) */
  var p=null; if(state.q.length>=2){ try{ p=pool(); }catch(e){ p=null; } }
  if(p&&p.length&&nm){
    var n=p.length, sh=Math.min(n,PAGE);
    var h='<div class="pl-fail ldpart" role="alert"><p class="pl-fail-t"><b>'+n.toLocaleString('en-US')+' match'+(n===1?'':'es')+' so far</b> from the years that loaded'+
      (n>sh?', the newest '+sh+' shown':'')+'. <b>'+esc(nm)+' didn&rsquo;t load</b>, so this list is not complete.</p>'+
      '<button class="pl-pill pl-fail-b" type="button">Try '+esc(nm)+' again</button></div>';
    for(var i=0;i<sh;i++) h+=rowHTML(p[i],i,'');
    $('list').innerHTML=h;
    html.classList.remove('reg-pend');
    var bt=$('list').querySelector('.ldpart button');
    bt.addEventListener('click',function(){ bt.disabled=true; bt.textContent='Trying again…'; retry(); });
    return;
  }
  failPart($('list'),retry);      /* r7 F-13: the site's one failure message and one Try again */
  var ft=$('list').querySelector('.pl-fail-t,.ldfail span'); if(ft&&nm) ft.textContent+=' '+nm+' didn’t load.';
}
function withShards(ks,fn){
  if(ks.every(function(k){return SHDONE[k];})){ fn(); return; }
  var seq=RSEQ;      /* fix wave 11-08 (U01): a newer search drawn meanwhile owns the list; this boot's failure does not paint over it */
  paintLoading(ks); paintPartial(ks);
  ks.forEach(function(k){ if(!SHDONE[k]) shardGet(k,function(){ if(seq===RSEQ&&!ks.every(function(x){return SHDONE[x];})) paintPartial(ks); },function(){}); });
  shardAll(ks,fn,function(failed){ if(seq===RSEQ) paintLoadFail(ks,function(){ withShards(needKeys(),fn); },failed); });
}
/* r8 F-04: a search arriving by address (?q=) answers from the years already here while the older ones load - the matches so far,
   newest first, under a line that says which years are still being read; the count (#qn) waits for every year, as before (the
   hop gate reads it), and the full answer replaces this one the moment the last year arrives */
function paintPartial(ks){
  if(state.q.length<2) return;
  var p; try{ p=pool(); }catch(e){ return; }
  if(!p||!p.length) return;
  var h='<div class="ldg" role="status"><i aria-hidden="true"></i><span>'+p.length.toLocaleString('en-US')+' so far, newest first &middot; still reading '+loadingYears(ks)+'…</span></div>';
  for(var i=0;i<Math.min(p.length,PAGE);i++) h+=rowHTML(p[i],i,'');
  $('list').innerHTML=h;
  document.documentElement.classList.remove('reg-pend');      /* the rows so far take their room now */
}
function render(more){
  var seq=++RSEQ, ks=needKeys();
  if(ks.every(function(k){return SHDONE[k];})){ renderNow(more); return; }
  paintLoading(ks); paintPartial(ks);
  ks.forEach(function(k){ if(!SHDONE[k]) shardGet(k,function(){ if(seq===RSEQ&&!ks.every(function(x){return SHDONE[x];})) paintPartial(ks); },function(){}); });
  shardAll(ks,function(){ if(seq===RSEQ) render(more); },function(failed){ if(seq===RSEQ) paintLoadFail(ks,function(){ render(more); },failed); });      /* RSEQ: an older query never paints over a newer one */
}
function renderNow(more){
  hvRelease();
  var jump=more?null:autoJump();
  var p=pool();
  if(!more) state.shown=0;
  /* the window is counted in rows DRAWN: a folded meeting costs one line, not its hundred rows, so the first page of the
     year is the latest meeting with votes and not a fold plus nothing */
  var want=more==='keep'?Math.max(state.shown,PAGE):state.shown+PAGE, drawn=0, hidden=0, i=0;
  var h='', lastDate='', seq=[], fold=folding(), gseen={}, gcount={};
  if(!state.q){ for(var s=0;s<p.length;s++){ if(!seq.length||seq[seq.length-1]!==p[s].date) seq.push(p[s].date); } }
  var counts={}; if(!state.q){ p.forEach(function(x){counts[x.date]=(counts[x.date]||0)+1; if(folds(x)) gcount[x.date]=(gcount[x.date]||0)+1;}); }
  for(i=0;i<p.length&&drawn<want;i++){
    var r=p[i];
    if(!state.q&&pendFolded(r.date)){
      if(r.date!==lastDate){ lastDate=r.date; h+=pendHTML(r.date,counts[r.date]); }
      hidden++; continue;
    }
    drawn++;
    if(!state.q && r.date!==lastDate){
      lastDate=r.date;
      var n=counts[r.date];
      var fut=r.date>TODAY;
      var ni=seq.indexOf(r.date)+1, nxt=seq[ni];
      h+='<div class="mday'+(PEND[r.date]?' pend':'')+'" id="m-'+r.date+'" data-d="'+r.date+'"><h3>'+fmtDate(r.date)+'</h3><span class="mn num">'+n+' resolutions'+
        (PEND[r.date]?' &middot; '+pendWhy(r.date):'')+'</span>'+
        (PEND[r.date]?'<button class="mfold" type="button" data-g="'+r.date+'" aria-expanded="true">fold</button>':'')+
        (nxt?'<button class="mnext" type="button" data-to="'+nxt+'" aria-label="Jump to the '+(nxt<r.date?'earlier':'later')+' meeting, '+fmtDate(nxt)+'" title="'+(nxt<r.date?'Earlier':'Later')+' meeting">'+'<span class="ph-xs">'+(nxt<r.date?'earlier':'later')+' meeting </span>&darr;</button>':'')+
        '</div>';
    }
    /* the ceremonial run of a meeting (two or more tier-3 rows) folds into one
       line that keeps the real count; opened, the members draw indented beneath
       it. The pool is tier-sorted, so the fold sits LAST in its meeting, under
       every dissent row and every ranked figure. */
    if(fold&&folds(r)&&gcount[r.date]>=2){
      if(!gseen[r.date]){
        gseen[r.date]=1;
        /* the run is one unit: its members are contiguous from here to the end of
           the meeting, and when the fold is open every one of them draws here,
           whatever the page window - a fold never opens onto a partial list */
        var op=!!expanded[r.date], mem=[];
        for(var k=i;k<p.length&&p[k].date===r.date;k++) if(folds(p[k])) mem.push(k);
        h+=groupHTML(r.date,mem.map(function(k2){return p[k2];}),op);
        if(op) mem.forEach(function(k2){h+=rowHTML(p[k2],k2,'',true);});
      }
      continue;
    }
    h+=rowHTML(r,i,'');
  }
  /* the rest of a folded meeting is skipped without drawing (its rows never count toward the window) */
  while(i<p.length&&!state.q&&pendFolded(p[i].date)){ if(p[i].date!==lastDate){ lastDate=p[i].date; h+=pendHTML(p[i].date,counts[p[i].date]); } hidden++; i++; }
  state.shown=i;
  var upTo=i, visible=p.length-(function(){ var k=0; if(!state.q) p.forEach(function(x){ if(pendFolded(x.date)) k++; }); return k; })();
  var pre='';
  if(jump&&jump.to){
    pre='<p class="jumpNote" style="margin:10px 14px">No matches in '+jump.from+' &mdash; jumped to <b>'+jump.to+
      '</b>, the newest year with results.</p>';
  }
  /* a city spelling is searched as a WHOLE name, the same rule the city page counted by: say so, and say what the plain text search would add */
  if(VXE||(state.loose&&vxQuery())){
    var ve0=VXE||vxQuery(), nset=Object.keys(VXSET[ve0.k]||{}).length;
    if(!state.loose) pre+='<div class="foldnote vxnote"><span>Same rule as the city page: the whole name, <b>'+nset+'</b> resolution'+(nset===1?'':'s')+'.'+
      (VXWIDE?' <b>'+VXWIDE+' more</b> hold the same letters inside a longer name (&ldquo;'+esc(VXEX)+'&rdquo;) and are left out.':'')+'</span>'+
      (VXWIDE?'<button class="pill" type="button" id="vxLoose">Show those too</button>':'')+'</div>';
    else pre+='<div class="foldnote vxnote"><span>A plain text search: <b>'+p.length+'</b> rows contain &ldquo;'+esc(state.q)+'&rdquo;. The city page counted only the <b>'+nset+'</b> that carry the whole name.</span>'+
      '<button class="pill" type="button" id="vxTight">Whole name only</button></div>';
  }
  if(FOLD.n){
    pre+='<div class="foldnote"><span><b>'+p.length.toLocaleString('en-US')+'</b> name &ldquo;'+esc(state.q)+'&rdquo; in the title, the text, as sponsor, or in the vote. '+
      '<b>+ '+FOLD.n.toLocaleString('en-US')+' more</b> only as the member who moved them.</span>'+
      '<button class="pill" type="button" id="foldAll">Show those too</button></div>';
  }
  /* r7 DECISIONS3: the two readings of a year in the search, in words, and the chip that keeps or drops the second */
  if(YQ){
    var yw=YQ.rest?' with &ldquo;'+esc(YQ.rest)+'&rdquo;':'', yn=function(n){return '<b>'+n.toLocaleString('en-US')+'</b>';};
    var yfrom=yn(YQ.nF)+' resolution'+(YQ.nF===1?'':'s')+' from '+YQ.y+yw;
    var ypr=YQ.nP?yn(YQ.nP)+' more from any year print'+(YQ.nP===1?'s':'')+' &ldquo;'+YQ.y+'&rdquo;'+(YQ.rest?' and the other words':''):'no other resolution prints &ldquo;'+YQ.y+'&rdquo;'+(YQ.rest?' with the other words':'');
    pre+='<div class="foldnote yrnote" id="yrNote"><span>'+yfrom+(YQ.only?'. '+(YQ.nP?ypr+', left out':ypr)+'.':'; '+ypr+', listed too.')+'</span>'+
      '<button class="pill yrchip" type="button" id="yrOnly" aria-pressed="'+YQ.only+'">'+(YQ.only?'<span aria-hidden="true">&#10003;</span>':'')+'Only resolutions from '+YQ.y+'</button></div>';
  }
  if(!h){
    var hasF=filtersActive();
    h=hasF
      ?'<div style="padding:22px 16px 26px"><p class="mut">Nothing matches this combination of filters '+
        'in any year.</p><button class="pill" id="clearAll" style="cursor:pointer">'+
        'Clear filters</button></div>'
      :'<div style="padding:22px 16px 26px"><p class="mut" style="margin-top:0">'+
        (state.q.length>=2?'No resolution title, id, legislator name, or quoted money excerpt contains &ldquo;<b>'+esc(state.q)+'</b>&rdquo;'+
          (state.only?' in the rows where that name '+(state.only==='no'?'voted no':'sponsored')+'.':'.')+' The county&rsquo;s titles rarely name a contractor; the bid tabulations in the text sometimes do.':'Nothing matches.')+
        '</p><div class="tryrow"><span>Try</span>'+trySeedsHTML()+'</div></div>';
  }
  $('list').innerHTML=pre+h;
  edgeFade($('list').querySelector('.tryrow'));        /* the 'nothing matches' state offers the Try chips again, in a row of its own */
  var ca=$('clearAll');
  if(ca) ca.addEventListener('click',function(){resetFilters();});
  var fa=$('foldAll');
  if(fa) fa.addEventListener('click',function(){state.all=true;render();syncURL();});
  var vl=$('vxLoose'), vt=$('vxTight');
  if(vl) vl.addEventListener('click',function(){state.loose=true;render();syncURL();});
  if(vt) vt.addEventListener('click',function(){state.loose=false;render();syncURL();});
  var yo=$('yrOnly');
  if(yo) yo.addEventListener('click',function(){
    state.yo=(YQ&&YQ.only)?'off':'on'; render(); syncURL();
    var b=$('yrOnly'); if(b) b.focus({preventScroll:true});           /* the list is drawn again: the chip keeps the keyboard */
  });
  $('qn').textContent=state.q.length>=2?(p.length+' match'+(p.length===1?'':'es')+(FOLD.n?' (+'+FOLD.n.toLocaleString('en-US')+' folded)':'')):'';
  $('controls').classList.toggle('searching',state.q.length>=2);
  $('register').classList.toggle('searching',state.q.length>=2);
  yr.querySelectorAll('.yb').forEach(function(b){b.disabled=state.q.length>=2;});
  $('ylab').textContent=state.q.length>=2?' · searching every year':'';
  /* the button counts the rows it can draw: a folded meeting's rows are neither 'shown' nor 'more' (its own row says how many it holds) */
  $('moreBtn').style.display=upTo<p.length?'':'none';
  $('moreBtn').textContent='Show '+Math.min(PAGE,visible-(upTo-hidden))+' more · '+(upTo-hidden).toLocaleString('en-US')+' of '+visible.toLocaleString('en-US')+' shown';
  window.__pool=p;
  paintSummary(p.length);
  renderStrip(p);
}

/* ---------- the years, as marks (the poster's grammar, live) ----------
   Every resolution is one tick, drawn from the embedded records: one row per
   year on ONE shared scale (px per resolution is the same in every row, so a
   longer row is a busier year), newest year first - the selected year opens
   into its meetings (segments on a desk, one row per meeting on a phone).
   Height = noes, a filled head = failed, faint = no vote read yet: ink on
   paper, no hue carries meaning. Hover a mark and its row lights (and the
   reverse); click opens the record; a search or a filter dims every mark that
   is not in the result, so the strip shows WHERE in twelve years the matches
   sit. Annotations name the biggest fights of the newest three years only. */
var TICK={"row":{"h":16,"u":3,"q":5,"c0":7,"ck":2,"cmax":13},"big":{"u":4,"q":8,"c0":12,"ck":3,"cmax":44},"sheet":{"u":4,"q":7,"c0":11,"ck":3,"cmax":40},"pph":{"u":4,"q":8,"c0":14,"ck":3,"cmax":24}};
var GAP=5, LABW=58, LABW_P=44, MLABW=52;
/* the strip's shared scale - the busiest year, the year with the most meetings, the meeting with the most resolutions - comes from the build's
   digest, so the scale is the same whether or not a year's records have arrived. A year that has not arrived is drawn from its digest: one
   stub per resolution (a tick's class and height, and - for a vote with a no, which can be hovered and opened - its id, date and tally). */
var MAXN=0, MAXM=0, MAXMN=0;
years.forEach(function(y){ var d=YD[y]; MAXN=Math.max(MAXN,d.n); MAXM=Math.max(MAXM,d.m); MAXMN=Math.max(MAXMN,d.mm); });
var RECENT=years.slice(0,3);
function stubVote(c){ return {ayes:c[3],noes:c[4],out:c[5]?'Rejected':'Adopted'}; }
function stubRecs(y){
  if(STUBS[y]) return STUBS[y];
  var d=YD[y], t=d.t, ci={}, out=[], i;
  (d.ci||[]).forEach(function(c){ ci[c[0]]=c; });
  for(i=0;i<t.length;i++){
    var c=ci[i];
    out.push(c?{id:c[1],date:c[2],vote:stubVote(c)}:{id:'',date:'',vote:t.charAt(i)==='q'?{ayes:0,noes:0}:null});
  }
  return STUBS[y]=out;
}
function stubById(id){
  var y=yearOfId(id), d=y&&YD[y], c=d?(d.ci||[]).filter(function(x){return x[1]===id;})[0]:null;
  return c?{id:id,date:c[2],vote:stubVote(c)}:null;
}
function stripRecs(y){ return LOADED[y]?byYearSeq[y]:stubRecs(y); }
var POS={};     /* id -> where its mark sits on the strip (svg key, x, baseline, overlay height): what a hover pair draws over */
function tickH(r,g){ var v=r.vote; if(!v) return g.u; if(v.noes>0) return Math.min(g.c0+g.ck*v.noes,g.cmax); return g.q; }
/* a title shortened at a word boundary, never mid-word (name fidelity) */
function cutw(t,n){ if(t.length<=n) return t; var s=t.slice(0,n), k=s.lastIndexOf(' '); if(k>=Math.max(12,n>>1)) s=s.slice(0,k); return s.replace(/[\s,;:\-–—(]+$/,'')+'…'; }
function tickCls(r){ var v=r.vote; return !v?'u':(v.noes>0?'c':'q'); }
function shortD(d){ return MON[+d.slice(5,7)-1]+' '+(+d.slice(8)); }
/* one mark that carries its identity (the open year, every contested vote, a search hit) */
function markEl(r,x,base,g,extra){
  var h=tickH(r,g), xs=x.toFixed(1), ys=(base-h).toFixed(1);
  var s='<line class="'+tickCls(r)+extra+'" data-id="'+r.id+'" x1="'+xs+'" y1="'+base+'" x2="'+xs+'" y2="'+ys+'"/>';
  /* the head is the channel no hue carries (PL-25): a solid ink dot = failed outright, an open ring = had a no vote and passed */
  if(isFailed(r)) s+='<circle class="f'+extra+'" data-id="'+r.id+'" cx="'+xs+'" cy="'+ys+'" r="4"/>';
  else if(r.vote&&r.vote.noes>0) s+='<circle class="h'+extra+'" data-id="'+r.id+'" cx="'+xs+'" cy="'+ys+'" r="3"/>';
  return s;
}
/* a compact row of marks (a year, or one meeting on a phone): quiet marks that
   carry no identity are ONE path; every contested vote and every hit is its own
   element so it can be hovered, lit and opened */
function rowSVG(rs,s,g,inPool,x0,out,key){
  var base=g.h-3, qd=[], ud=[], dq=[], du=[];
  out.push('<line class="axis" x1="'+x0.toFixed(1)+'" y1="'+base+'" x2="'+(x0+rs.length*s).toFixed(1)+'" y2="'+base+'"/>');
  for(var i=0;i<rs.length;i++){
    var r=rs[i], x=x0+i*s+s/2, hit=!inPool||!!inPool[r.id], c=tickCls(r);
    if(key&&r.id) POS[r.id]={k:key,x:x,b:base,o:g.h-6};
    if(c==='c'||(inPool&&hit)) out.push(markEl(r,x,base,g,inPool?(hit?' hit':' dim'):''));
    else (c==='q'?(hit?qd:dq):(hit?ud:du)).push('M'+x.toFixed(1)+' '+base+'v-'+tickH(r,g));
  }
  if(qd.length) out.push('<path class="q" d="'+qd.join('')+'"/>');
  if(ud.length) out.push('<path class="u" d="'+ud.join('')+'"/>');
  if(dq.length) out.push('<path class="q dim" d="'+dq.join('')+'"/>');
  if(du.length) out.push('<path class="u dim" d="'+du.join('')+'"/>');
}
/* the open year on a desk: its meetings as segments on the shared scale, the
   date under each wide enough to carry one, the newest years' biggest fights
   named above their marks */
function yearOpenSVG(y,rs,s,inPool,W){
  var g=TICK.big, meets=[];
  rs.forEach(function(r){ if(!meets.length||meets[meets.length-1].d!==r.date) meets.push({d:r.date,rs:[]}); meets[meets.length-1].rs.push(r); });
  var ann=[];
  if(RECENT.indexOf(y)>=0) ann=rs.filter(function(r){return r.vote&&r.vote.noes>0;}).sort(function(a,b){
    var fa=isFailed(a)?1:0, fb=isFailed(b)?1:0; if(fa!==fb) return fb-fa; if(a.vote.noes!==b.vote.noes) return b.vote.noes-a.vote.noes; return a.date<b.date?1:-1; }).slice(0,3);
  var A=ann.length?14*ann.length+8:0, T=g.cmax+6, base=A+T, H=base+18, out=[], x0=0, pos={}, lend=-1e9;
  meets.forEach(function(m,mi){
    var w=m.rs.length*s, last=mi===meets.length-1;
    out.push('<rect class="seg" data-d="'+m.d+'" x="'+x0.toFixed(1)+'" y="'+A+'" width="'+w.toFixed(1)+'" height="'+(T+16)+'"><title>'+fmtDate(m.d)+' · '+m.rs.length+' resolutions</title></rect>');
    out.push('<line class="axis" x1="'+x0.toFixed(1)+'" y1="'+base+'" x2="'+(x0+w).toFixed(1)+'" y2="'+base+'"/>');
    m.rs.forEach(function(r,j){ var x=x0+j*s+s/2; pos[r.id]=x; POS[r.id]={k:'y'+y,x:x,b:base,o:Math.min(T-2,22)}; var hit=!inPool||!!inPool[r.id]; out.push(markEl(r,x,base,g,inPool?(hit?' hit':' dim'):'')); });
    /* a date under every segment wide enough to carry one, never two that collide;
       the narrow last segment labels itself end-anchored */
    var lab=shortD(m.d), lw=7.8*lab.length, lx=(last&&w<lw)?(x0+w-lw):x0;
    if((w>=lw+4||mi===0||last)&&lx>lend+8){
      out.push('<text class="ml" x="'+lx.toFixed(1)+'" y="'+(base+13)+'">'+lab+'</text>');
      lend=lx+lw;
    }
    x0+=w+GAP;
  });
  /* annotations: failed first, then the most noes; labels step up a level when they would collide.
     The title is cut at a WORD boundary to the width the row can carry (never a fixed-character
     ellipsis): the verbatim title is in the tooltip and the record one click away. */
  var picks=ann.map(function(r){return {x:pos[r.id],r:r};}).sort(function(a,b){return a.x-b.x;}), levels=[-1e9,-1e9,-1e9];
  picks.forEach(function(p){
    var r=p.r, v=r.vote, tail=' — '+(isFailed(r)?'rejected':'had a no vote')+' '+v.ayes+'–'+v.noes;
    var budget=Math.max(24,Math.min(84,Math.floor((W-8)/6.7)-r.id.length-1-tail.length));
    var txt=r.id+' '+cutw(tidyTitle(r.title),budget)+tail;
    var w=6.7*txt.length, xa=(p.x+w<W-4)?p.x-6:Math.max(0,p.x+6-w);
    var lvl=0; for(var k=0;k<3;k++){ if(xa>levels[k]+10){lvl=k;break;} lvl=2; }
    levels[lvl]=xa+w;
    var ly=A-6-lvl*14, ty=base-tickH(r,g);
    out.push('<path class="lead" d="M'+p.x.toFixed(1)+' '+(ty-4).toFixed(1)+'V'+(ly+3)+'"/><text class="an" x="'+xa.toFixed(1)+'" y="'+ly+'">'+esc(txt)+'</text>');
  });
  return {svg:out.join(''),H:H};
}
function yearLabel(y,rs){
  var d=YD[y];          /* the build's digest, checked against the records as they arrive (verifyYear) */
  return y+': '+d.n+' resolutions in '+d.m+' meetings, '+d.c+' had a no vote, '+d.f+' failed, '+d.u+' with no vote read';
}
/* what the strip draws in ink under a narrowing: a search's hits (every year),
   or - for a committee / topic / money / mover filter - the SAME predicate run
   over every year, so the picture never implies "no matches elsewhere" */
var STRIPALL=null;
function stripPool(p){
  STRIPALL=null;
  if(state.q.length>=2) return p;
  if(!filtersActive()) return null;
  STRIPALL=applyFilters(RECS);
  return STRIPALL;
}
var STRIPFOLD=false, STRIPOPEN=false, STRIPDIRTY=false;   /* FOLD on a landing that carries a search; OPEN = the reader opened it */
function syncStripFold(p){
  var det=$('stripd'), sm=$('stripSum'); if(!det) return;
  /* r8 F-04: on a laptop with the page's views, the strip is a fold the reader opens (its line says what it holds), so the register's
     part - fifty rows - keeps to four screens */
  /* VISUALS (2026-11-02, the owner's call): visuals are never behind a click - the strip shows open on a laptop again, as in r7 (F-04's fold
     is withdrawn); only a landing that carries a search still folds it under its caption */
  var desk=false;
  var fold=(STRIPFOLD&&state.q.length>=2)||desk;
  if(state.q.length<2) STRIPFOLD=false;           /* a cleared search is a plain page again: a later search does not fold it */
  det.classList.toggle('foldable',fold);
  if(!fold){ det.open=true; return; }
  if(desk&&state.q.length<2){
    sm.innerHTML='<span>Every resolution, one mark each: <b>'+years.length+'</b> years, every no vote and failure marked</span><span class="sact">'+(STRIPOPEN?'hide the marks':'show the marks')+'</span>';
    det.open=STRIPOPEN; return;
  }
  var ys={}; p.forEach(function(r){ys[r.date.slice(0,4)]=1;});
  sm.innerHTML='<span>Where the <b>'+p.length.toLocaleString('en-US')+'</b> match'+(p.length===1?' falls':'es fall')+': <b>'+Object.keys(ys).length+'</b> of '+years.length+' years</span><span class="sact">'+(STRIPOPEN?'hide the marks':'show the marks')+'</span>';
  det.open=STRIPOPEN;
}
/* a phone: twelve rows of 1px ticks cannot be read or tapped, so the years are ink rows (label, what happened that year, the count,
   a chevron); a row filters the register to that year and pushes an entry (Back returns). They sit in a fold that opens on the reader's
   tap and closes once a year is chosen; while a search is on, the years are not a control (a search spans every year) and only the caption shows */
var YROPEN=false;
function yearRowsHTML(){
  var h='';
  years.forEach(function(y){
    var dg=YD[y], c=dg.c, f=dg.f;
    h+='<button class="pl-row" type="button" data-yr="'+y+'"'+(y===state.year?' aria-current="true"':'')+'>'+
      '<span class="pl-row-l num">'+y+'</span>'+
      '<span class="pl-row-s">'+c+' had a no vote'+(f?' &middot; '+f+' failed outright':'')+'</span>'+
      '<span class="pl-row-v num">'+dg.n.toLocaleString('en-US')+'<small>resolutions</small></span></button>';
  });
  return h;
}
function phoneYears(p){
  if(state.q.length>=2) return '<p class="scap">'+stripCaption(p)+'</p>';
  stripPool(p);
  /* the rows are drawn when the fold opens (a closed fold's rows are not on the screen to be tapped) */
  return '<details class="pl-fold yrfold" id="yrFold"'+(YROPEN?' open':'')+'><summary>Browse by year &middot; <span class="num">'+state.year+'</span> of '+years.length+' years</summary>'+
    '<div class="pl-rows yrrows" id="yrRows" role="group" aria-label="Every year, '+years[years.length-1]+' to '+years[0]+'">'+(YROPEN?yearRowsHTML():'')+'</div></details>'+
    '<p class="scap">'+stripCaption(p)+'</p>';
}
function phoneYear(y){
  if(!byYear[y]) return;
  YROPEN=false; state.year=y; syncYearPills(); syncURL(true); render();
  var t=document.querySelector('.regbox'); if(t) t.scrollIntoView({behavior:smoothB(),block:'start'});
}
function renderStrip(p){
  var el=$('strip'); if(!el) return;
  if(!LOADED[state.year]) return;          /* the selected year's records are not here yet (a resize while it loads): renderNow draws the strip when they are */
  if(phoneMQ.matches&&!(PL.embed&&PL.embed.mode)){
    var d0=$('stripd'); d0.classList.remove('foldable'); d0.open=true; STRIPFOLD=false;
    el.classList.remove('hvon'); POS={}; STRIPDIRTY=false;
    el.innerHTML=phoneYears(p);
    var yf=$('yrFold'); if(yf) yf.addEventListener('toggle',function(){ YROPEN=yf.open; var yb=$('yrRows'); if(yf.open&&yb&&!yb.firstChild) yb.innerHTML=yearRowsHTML(); });
    return;
  }
  syncStripFold(p);
  /* a closed fold has no width to draw into: remember, and draw when it opens */
  if(!$('stripd').open){ STRIPDIRTY=true; return; }
  STRIPDIRTY=false;
  el.classList.remove('hvon'); POS={};
  var phone=phoneMQ.matches, searching=state.q.length>=2, lit=stripPool(p);
  var inPool=null; if(lit){ inPool={}; lit.forEach(function(r){inPool[r.id]=1;}); }
  var full=el.clientWidth||(phone?362:1110);
  var W=full-(phone?LABW_P:LABW)-8, s=(W-GAP*MAXM)/MAXN, g=TICK.row;
  var h='<div class="skey">'+"<span class=\"lg\"><i class=\"lq\"></i>no one voted no</span><span class=\"lg\"><i class=\"lc\"></i><span>had a no vote<span class=\"lgx\"> (open head; taller = more no votes)</span></span></span><span class=\"lg\"><i class=\"lc lf\"></i><span>failed outright<span class=\"lgx\"> (solid head)</span></span></span><span class=\"lg\"><i class=\"lu\"></i>no vote read yet</span>"+'<span class="sgate">'+DTOT.toLocaleString('en-US')+' resolutions &middot; every resolution matched to its agenda &#10003;</span></div><div class="syrs">';
  var others='';
  years.forEach(function(y){
    var rs=stripRecs(y), open=!searching&&y===state.year, row;
    var btn='<button class="syl num" type="button" data-y="'+y+'" aria-pressed="'+open+'"'+(searching?' disabled':'')+' title="'+(searching?'A search spans every year':'Show '+y)+'">'+y+'</button>';
    if(open&&!phone){
      row=yearOpenSVG(y,rs,s,inPool,W);
      h+='<div class="syr open" data-y="'+y+'">'+btn+'<svg data-y="'+y+'" data-k="y'+y+'" width="'+W+'" height="'+row.H+'" viewBox="0 0 '+W+' '+row.H+'" role="img" aria-label="'+esc(yearLabel(y,rs))+'">'+row.svg+'</svg></div>';
    } else if(open){
      /* the open year on a phone: one row per meeting, every meeting on one scale */
      var meets=[]; rs.forEach(function(r){ if(!meets.length||meets[meets.length-1].d!==r.date) meets.push({d:r.date,rs:[]}); meets[meets.length-1].rs.push(r); });
      var Wm=full-MLABW-6, sm=Wm/MAXMN;
      h+='<div class="syr open" data-y="'+y+'">'+btn+'<div class="smeets" role="img" aria-label="'+esc(yearLabel(y,rs))+'">'+meets.map(function(m){
        var out=[]; rowSVG(m.rs,sm,g,inPool,0,out,'m'+m.d);
        return '<div class="smr"><span class="sml">'+shortD(m.d)+'</span><svg data-y="'+y+'" data-d="'+m.d+'" data-k="m'+m.d+'" width="'+Wm+'" height="'+g.h+'" viewBox="0 0 '+Wm+' '+g.h+'" aria-hidden="true">'+out.join('')+'</svg></div>';
      }).join('')+'</div></div>';
    } else {
      var out=[]; rowSVG(rs,s,g,inPool,0,out,'y'+y);
      row='<div class="syr" data-y="'+y+'">'+btn+'<svg data-y="'+y+'" data-k="y'+y+'" width="'+W+'" height="'+g.h+'" viewBox="0 0 '+W+' '+g.h+'" role="img" aria-label="'+esc(yearLabel(y,rs))+'">'+out.join('')+'</svg></div>';
      if(phone&&!searching) others+=row; else h+=row;
    }
  });
  if(others){
    var on=years.length-1, om=DTOT-YD[state.year].n;
    h+='<details class="sothers"><summary>The other '+on+' years &middot; '+om.toLocaleString('en-US')+' resolutions</summary>'+others+'</details>';
  }
  h+='</div><p class="scap">'+stripCaption(p)+'</p>';
  if(!searching){
    var rs2=byYear[state.year]||[], byCm={}; rs2.forEach(function(r){byCm[r.cm]=(byCm[r.cm]||0)+1;});
    var top=Object.keys(byCm).sort(function(a,b){return byCm[b]-byCm[a];}).slice(0,5);
    h+='<div class="dcm">'+top.map(function(c){ return '<button class="dcmb" type="button" data-dcm="'+c+'" data-hv="cm:'+c+'"><b>'+esc(CM[c]||c)+'</b> '+byCm[c]+'</button>'; }).join('')+'</div>';
  }
  el.innerHTML=h;
}
/* the caption: every number computed from the rows it describes. NO dollar
   sum - the ceilings are counted and the one figure named is a single
   resolution's own ceiling. */
function MARKS_ON(){ return !phoneMQ.matches||!!(PL.embed&&PL.embed.mode); }      /* the marks are drawn on a desk; a phone shows the year rows instead */
function stripCaption(p){
  if(state.q.length>=2){
    var ys={}; p.forEach(function(r){ys[r.date.slice(0,4)]=1;});
    return '<b>'+p.length.toLocaleString('en-US')+'</b> match'+(p.length===1?'':'es')+' for &ldquo;'+esc(state.q)+'&rdquo;'+(FOLD.n?' (+ '+FOLD.n.toLocaleString('en-US')+' folded)':'')+
      ' across <b>'+Object.keys(ys).length+'</b> of '+years.length+' years'+(MARKS_ON()?' &mdash; drawn in ink; every other mark is faint.':'.');
  }
  var y=state.year, rs=byYear[y]||[], meets={}; rs.forEach(function(r){meets[r.date]=1;});
  var caps=rs.filter(function(r){return r.cap;}), big=null;
  caps.forEach(function(r){ if(!big||r.cap>big.cap) big=r; });
  var cont=0, fail=0, unread=0, sym=0;
  rs.forEach(function(r){ if(!r.vote) unread++; else if(r.vote.noes>0){cont++; if(isFailed(r)) fail++;} if(r.tp==='s') sym++; });
  var s='<b>'+y+'</b> &middot; '+rs.length+' resolutions in '+Object.keys(meets).length+' meeting'+(Object.keys(meets).length===1?'':'s')+
    ' &middot; <b>'+cont+'</b> had a no vote'+(fail?', <b>'+fail+'</b> failed':'')+' &middot; '+caps.length+' carry a spending limit'+
    (big?', the largest '+money0(big.cap)+' (<span class="num">'+big.id+'</span>)':'')+' &middot; '+(rs.length?Math.round(100*sym/rs.length):0)+'% statements, not spending'+
    (unread?' &middot; '+unread+' with no vote read yet':'');
  if(filtersActive()){
    var all=STRIPALL||applyFilters(RECS), ays={}; all.forEach(function(r){ays[r.date.slice(0,4)]=1;});
    s='<b>'+p.length.toLocaleString('en-US')+'</b> of '+rs.length+' in '+y+' match the filters, <b>'+all.length.toLocaleString('en-US')+
      '</b> across <b>'+Object.keys(ays).length+'</b> of '+years.length+' years'+(MARKS_ON()?' &mdash; drawn in ink; every other mark is faint. ':'. ')+s;
  }
  return s;
}
/* marks <-> rows: hover one and the other lights (the chrome's PL.hl.bind: hover-capable pointers only, so a tap never leaves a
   stuck highlight; a keyboard focus on a row lights its mark too); a tooltip (PL.tip) names the mark */
function tickInfo(r){
  var v=r.vote, vt;
  if(v) vt=v.ayes+'–'+v.noes+(v.absent?' ('+v.absent+' abs)':'')+(isFailed(r)?' · rejected':(v.noes>0?' · had a no vote':''));
  else vt=(r.date>TODAY||(R.mstat||{})[r.date]==='none')?'votes not read yet':'no vote matched';
  return '<b class="num">'+esc(r.id)+'</b> · '+(r.title?esc(cutw(tidyTitle(r.title),96)):'')+'<br>'+esc(vt)+' · '+fmtDate(r.date);
}
(function(){
  var el=$('strip');
  PL.hl.bind([el,$('list')],{attr:'data-id',sel:'#strip [data-id],#list .rrow[data-id]',leave:'member',
    enter:function(m,e){
      if(!el.contains(m)){ TIP.hide(); return; }
      var id=m.getAttribute('data-id'), rr=BYID[id]||stubById(id);
      if(rr) TIP.show(tickInfo(rr),e.clientX,e.clientY); else TIP.hide();
    },
    off:function(){ TIP.hide(); }});
  /* nearest mark to a tap or click on a row (marks are 1-3px wide) */
  function nearest(sv,cx){
    var b=sv.getBoundingClientRect(), x=cx-b.left, best='', bd=12;
    [].forEach.call(sv.querySelectorAll('line[data-id]'),function(l){ var d=Math.abs(+l.getAttribute('x1')-x); if(d<bd){bd=d;best=l.getAttribute('data-id');} });
    return best;
  }
  el.addEventListener('click',function(e){
    var yrb=e.target.closest('[data-yr]'); if(yrb){ phoneYear(yrb.getAttribute('data-yr')); return; }
    var yb=e.target.closest('.syl');
    if(yb){ if(!yb.disabled) pickYear(yb.getAttribute('data-y')); return; }
    var dc=e.target.closest('[data-dcm]');
    if(dc){ var chip=document.querySelector('#cmChips [data-cm="'+dc.getAttribute('data-dcm')+'"]')||document.querySelector('#cmChips [data-cm=""]'); if(chip) chip.click(); return; }
    var t=e.target.closest('[data-id]'), id=t?t.getAttribute('data-id'):'', sv=e.target.closest('svg');
    if(!id&&sv) id=nearest(sv,e.clientX);
    if(id){ TIP.hide(); stripDrill(id); return; }
    /* the whole year row is the target (its label, its marks, the air above them) */
    var row=e.target.closest('.syr');
    if(row){ var y=row.getAttribute('data-y'); if(y&&state.q.length<2&&y!==state.year) pickYear(y); }
  });
  var rt=null;
  window.addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(function(){ if(window.__pool) renderStrip(window.__pool); },160); });
  $('stripSum').addEventListener('click',function(){
    setTimeout(function(){
      var det=$('stripd'); STRIPOPEN=det.open;
      if(window.__pool){ if(STRIPDIRTY) renderStrip(window.__pool); else syncStripFold(window.__pool); }
    },0);
  });
})();
/* ---------- committee chip / legislator name <-> rows (Move 17) ----------
   One PL.hl group, keyed 'cm:IF' | 'sp:Name' | 'no:Name' on every chip, name and link that carries data-hv. Hover or
   focus one and every row in the register that shares it lights (a wash; the rest step back), the strip draws a taller
   accent tick over each of that key's marks in every year, and a tooltip counts them - in this view and across every year
   (counts, never dollars). Hover-capable pointers and keyboard focus only; on a touch screen a tap on a chip is the filter
   itself (the tap path), and the names in an opened record are real links into the register. The rows, the marks and the
   tooltip are drawn from the same records the register is, so the picture can only agree with the list. */
var HVPT={x:0,y:0}, hvHeld=false;
function hvSplit(key){ var i=key.indexOf(':'); return [key.slice(0,i),key.slice(i+1)]; }
function hvTest(key){
  var k=hvSplit(key), role=k[0], val=k[1];
  if(role==='cm') return function(r){return r.cm===val;};
  if(role==='sp') return function(r){return (r.sp||[]).indexOf(val)>=0;};
  return function(r){return !!(r.vote&&(r.vote.no_names||[]).indexOf(val)>=0);};
}
function hvTipHTML(key,n,of,all){
  var k=hvSplit(key), role=k[0], val=k[1], scope=state.q.length>=2?'in this search':'in '+state.year;
  var who=role==='cm'?'<b>'+esc(CM[val]||val)+'</b> committee':(role==='sp'?'Sponsor <b>'+esc(val)+'</b>':'Voted no: <b>'+esc(val)+'</b>');
  return who+'<br>'+n.toLocaleString('en-US')+' of '+of.toLocaleString('en-US')+' '+scope+' · '+all.toLocaleString('en-US')+' across every year';
}
/* a taller accent tick over every mark of the key, one path per svg (the strip's own marks are left where they are, faded) */
function stripOverlay(t){
  var el=$('strip'); if(!el) return;
  var by={}, any=false;
  for(var i=0;i<RECS.length;i++){
    var r=RECS[i], p=POS[r.id]; if(!p||!t(r)) continue;
    (by[p.k]=by[p.k]||[]).push('M'+p.x.toFixed(1)+' '+p.b+'v-'+p.o); any=true;
  }
  Object.keys(by).forEach(function(k){
    var sv=el.querySelector('svg[data-k="'+k+'"]'); if(!sv) return;
    var pth=document.createElementNS('http://www.w3.org/2000/svg','path'); pth.setAttribute('class','hv'); pth.setAttribute('d',by[k].join(''));
    sv.appendChild(pth);
  });
  if(any) el.classList.add('hvon');
}
/* the tooltip sits at the pointer; a keyboard focus has no pointer, so it hangs under the focused element */
function tipAt(html,src){
  var kb=false; try{ kb=!!src&&src.matches(':focus-visible')&&!src.matches(':hover'); }catch(e){}
  if(kb){
    /* the browser scrolls a focused element into view AFTER focusin fires - and, with html.pl-live, SMOOTHLY - so a rect read
       now is the pre-scroll one and the tip would hang off screen. One frame later, if the element is not fully on screen,
       finish that scroll at once (centred, as the browser would) and measure after it; if focus has moved on, show nothing */
    requestAnimationFrame(function(){
      if(document.activeElement!==src) return;
      var b=src.getBoundingClientRect();
      if(b.top<0||b.bottom>window.innerHeight){ PL.jump(src,'center'); b=src.getBoundingClientRect(); }
      TIP.show(html,b.left+Math.min(24,b.width/2),b.bottom-12);
    });
  }
  else TIP.show(html,HVPT.x,HVPT.y);
}
var HVKEY='';
/* a key's count across every year, from the build's digest (the records of a year that has not arrived cannot be counted) */
function hvAll(key){
  var k=hvSplit(key), a=AG[k[0]==='cm'?'cm':(k[0]==='sp'?'sp':'no')];
  for(var i=0;i<a.length;i++) if(a[i][0]===k[1]) return a[i][1];
  return 0;
}
/* the accent ticks are drawn for every year, so a hover that stays on a key brings the years that have not arrived (a pointer passing over is
   not asked to) and draws them over again */
function hvMore(key,t,src){
  if(allLoaded()||(src&&src.closest&&src.closest('#strip'))) return;
  HVKEY=key;
  setTimeout(function(){
    if(!hvHeld||HVKEY!==key) return;
    shardAll(shardKeys(years,false),function(){ if(hvHeld&&HVKEY===key){ if(window.__pool) renderStrip(window.__pool); stripOverlay(t); } },function(){});
  },300);
}
function hvOn(key,src){
  hvHeld=true;
  var t=hvTest(key), pl=window.__pool||[], n=0, all=hvAll(key), i;
  for(i=0;i<pl.length;i++) if(t(pl[i])) n++;
  [].forEach.call($('list').querySelectorAll('.rrow'),function(row){
    var r=BYID[row.getAttribute('data-id')], on=!!r&&t(r);
    row.classList.toggle('hl',on); row.classList.toggle('hd',!on);
  });
  stripOverlay(t);
  tipAt(hvTipHTML(key,n,pl.length,all),src);
  hvMore(key,t,src);
}
function hvOff(){
  hvHeld=false; HVKEY='';
  [].forEach.call($('list').querySelectorAll('.rrow.hl,.rrow.hd'),function(r){ r.classList.remove('hl'); r.classList.remove('hd'); });
  var el=$('strip'); el.classList.remove('hvon');
  [].forEach.call(el.querySelectorAll('svg .hv'),function(p){ p.remove(); });
  TIP.hide();
}
/* PL.hl.bind takes ONE group per root element (the strip<->rows pair above already owns #strip and #list), so each pair listens
   on its own container: the whole register section for this one, the register box for the account preview below */
var hvSet=PL.hl.bind([$('register'),$('regList')],{attr:'data-hv',sel:'[data-hv]',leave:'member',
  enter:function(m,e){ HVPT.x=e.clientX; HVPT.y=e.clientY; },on:hvOn,off:hvOff});
/* a list that is drawn again (a filter, a search, a year) is a new picture: let go of the held key */
function hvRelease(){ if(hvHeld) hvSet(null); }
/* a name in an opened record: the register narrowed to that member's no votes / sponsorships, exactly the legislators page's '+N more' */
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[data-nm]'); if(!a) return;
  /* a modified or non-primary click is the browser's (new tab, new window, save link): the href is the same address */
  if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
  e.preventDefault();
  recToRegister();
  hvRelease();
  state.q=a.getAttribute('data-nm'); qEl.value=state.q; state.only=a.getAttribute('data-only')||''; state.all=false;state.loose=false;state.yo=''; state.open='';
  syncURL(true); render(); noteSearched();              /* push first: the redraw below may shorten the page and clamp the spot the entry saves */
  $('register').scrollIntoView({behavior:smoothB()});
});
/* LEG-17: the account preview - the same tooltip, keyed by the pill's code */
PL.hl.bind([$('list').parentNode],{attr:'data-ac',sel:'.acp[data-ac]',leave:'member',
  enter:function(m,e){ HVPT.x=e.clientX; HVPT.y=e.clientY; },
  on:function(key,src){ var h=acTipHTML(key); if(h) tipAt(h,src); },
  off:function(){ TIP.hide(); }});
function pickYear(y){ if(!byYear[y]) return; state.year=y; syncYearPills(); render(); syncURL(); }
/* a click on a mark is a drill: Back returns; the row opens in its own year,
   widening past any narrowing the mark sat outside of */
function stripDrill(id){
  /* an embedded strip (?embed=strip) has no register to drill into: the mark opens that resolution on the full page */
  if(PL.embed&&PL.embed.mode){ try{ window.open(location.pathname.split('/').pop()+'?open='+encodeURIComponent(id),'_top'); }catch(e){} return; }
  openRec(id,null);
}
function fmtDate(d){
  return MON[+d.slice(5,7)-1]+' '+(+d.slice(8))+', '+d.slice(0,4);
}

/* controls */
var yr=$('yearRow'), cc=$('cmChips'), qEl=$('q'), qt=null, MOVERS={};
var moverSel=$('moverSel'), tpSel=$('tpSel'), fbtn=$('fbtn'), fdeck=$('fdeck'), fscrim=$('fscrim');
var SEARCHED=false;
try{SEARCHED=localStorage.getItem('pl-dec-searched')==='1';}catch(e){}
yr.innerHTML=years.map(function(y){
  return '<button class="yb num" type="button" data-y="'+y+'" aria-pressed="'+(y===state.year)+'">'+y+'</button>';}).join('');
yr.addEventListener('click',function(e){
  var b=e.target.closest('[data-y]'); if(!b) return;
  state.year=b.getAttribute('data-y');
  syncYearPills();
  render();syncURL();
});
$('orderRow').addEventListener('click',function(e){
  var b=e.target.closest('[data-order]'); if(!b) return;
  state.order=b.getAttribute('data-order')==='id'?'id':'money';
  $('orderRow').querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
  render();syncURL();
});
var counts=aggObj(AG.cm);      /* committee totals across every year: the build's digest */
var order=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];});
/* sub-threshold committee codes are OCR one-offs - rows keep their code,
   but they do not earn a filter chip */
cc.innerHTML='<button class="fch" type="button" data-cm="" aria-pressed="true">All</button>'+
  order.filter(function(c){return counts[c]>=10;}).map(function(c){
    return '<button class="fch" type="button" data-cm="'+c+'" data-hv="cm:'+c+'" aria-pressed="false">'+esc(CM[c]||c)+
      '<span class="n num">'+counts[c]+'</span></button>';}).join('');
cc.addEventListener('click',function(e){
  var b=e.target.closest('[data-cm]'); if(!b) return;
  state.cm=b.getAttribute('data-cm');
  cc.querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
  render();syncURL();
});
/* every state the register can be in has a URL: ?q= (kept for the deep links
   that already point here, #q= too), y= year, cm= committee, tp= topic,
   money=1, mover=, order=id, only=no|sp, all=1, open=<id>. Keystrokes and
   filter taps replaceState; a drill a reader CLICKS INTO (a hero row, a
   ceiling, a Try chip, 'open the meeting') pushes, so Back returns to where
   they were instead of leaving the site. */
/* the register's own part of the address (everything but ?open=): popstate compares it with the last one written, so a Back that only closes the
   record sheet re-reads nothing (the list, its 'Show more' and the spot stay), while an address that carries a different search or filter is read */
var LASTSIG='';
function addrSig(){
  try{ var sp=new URL(location.href).searchParams; return ['q','y','cm','tp','money','mover','order','only','all','loose','yo'].map(function(k){ return k+'='+(sp.get(k)||''); }).join('&'); }
  catch(e){ return ''; }
}
function syncURL(push){
  try{
    var u=new URL(location.href);
    function set(k,v){ if(v) u.searchParams.set(k,v); else u.searchParams.delete(k); }
    set('q',state.q.length>=2?state.q:'');
    set('y',(state.q.length<2&&state.year!==years[0])?state.year:'');
    set('cm',state.cm); set('tp',state.tp); set('money',state.money?'1':''); set('mover',state.mover); set('unmatched',state.um?'1':''); set('unread',state.ur?'1':'');
    set('order',state.order==='id'?'id':''); set('only',state.q.length>=2?state.only:''); set('all',(state.q.length>=2&&state.all)?'1':''); set('loose',(state.q.length>=2&&state.loose)?'1':''); set('yo',(state.q.length>=2&&state.yo&&yearOfQ(state.q.toLowerCase()))?state.yo:'');
    set('open',state.open);
    if(u.hash.indexOf('#q=')===0||/^#m-\d{4}/.test(u.hash)) u.hash='';
    var st={pl:fdeck.classList.contains('open')?'sheet':'reg'};
    /* r8 F-09: an open record names the tab, the bookmark and the history entry ('B-004-25 · Budget Modification Sales Tax — Every
       resolution | Public Ledger'); closing it gives the page its own title back */
    var ro=state.open&&BYID[state.open], tt=ro?state.open+' · '+ptitle(ro)+' — '+BASE_TITLE.split(' — ')[0]+' | Public Ledger':BASE_TITLE;
    document.title=tt;
    if(push) history.pushState(st,tt,u); else history.replaceState(st,tt,u);
    LASTSIG=addrSig();
  }catch(e){}
}
function readState(){
  var sp;
  try{sp=new URL(location.href).searchParams;}catch(e){return;}
  var q=sp.get('q')||'';
  if(!q&&location.hash.indexOf('q=')===1){ try{q=decodeURIComponent(location.hash.slice(3));}catch(e){q=location.hash.slice(3);} }
  state.q=q.trim();
  /* the city page's return link for a name it spells two ways is ?payee=A|B; a search for that set is the one name */
  if(state.q.indexOf('|')>0){
    var sps=state.q.split('|').map(function(x){return x.trim();}), e0=VXQ[sps[0].toLowerCase()];
    if(e0&&sps.every(function(x){return VXQ[x.toLowerCase()]===e0;})) state.q=e0.q;
  }
  var y=sp.get('y'); state.year=(y&&byYear[y])?y:years[0];
  var cm=sp.get('cm')||''; state.cm=(cm&&counts[cm]>=10)?cm:'';
  var tp=sp.get('tp')||''; state.tp=TPL[tp]?tp:'';
  state.money=sp.get('money')==='1';
  state.um=sp.get('unmatched')==='1';
  state.ur=sp.get('unread')==='1';
  var mv=sp.get('mover')||''; state.mover=(mv&&MOVERS[mv])?mv:'';
  state.order=sp.get('order')==='id'?'id':'money';
  var on=sp.get('only')||''; state.only=(on==='no'||on==='sp')?on:'';
  state.all=sp.get('all')==='1';
  state.loose=sp.get('loose')==='1';
  var yo=sp.get('yo')||''; state.yo=(yo==='on'||yo==='off')?yo:'';      /* r7 DECISIONS3: the year chip, as the reader left it */
  state.open=sp.get('open')||'';
  /* a bare ?open=<id> for a row outside the default year lands on that row's own year */
  if(state.open&&state.q.length<2&&!(y&&byYear[y])){
    var oy=yearOfId(state.open); if(oy) state.year=oy;
  }
  LASTSIG=addrSig();
}
window.addEventListener('popstate',function(){
  if(RL.swallow()||FL.swallow()){ syncURL(); return; }  /* the pop a close button caused: only the URL needs the filters changed in the sheet */
  if(RS.id){
    var uo=''; try{ uo=new URL(location.href).searchParams.get('open')||''; }catch(e){}
    if(!uo){ closeRec(true); if(addrSig()===LASTSIG){ syncURL(); return; } }      /* Back closed the record sheet: its entry is gone, the page behind never moved */
  }                                                      /* an address that names a record: read it (below), the sheet shows that one */
  if(fdeck.classList.contains('open')){ sheetClose(true); syncURL(); return; }
  readState(); syncControls(); render(); if(state.open) openRow(state.open);
});
function noteSearched(){
  if(state.q.length<2||SEARCHED) return;
  SEARCHED=true; try{localStorage.setItem('pl-dec-searched','1');}catch(e){}
  $('tryRow').classList.add('seen');
}
qEl.addEventListener('input',function(){
  preloadAll();
  clearTimeout(qt); qt=setTimeout(function(){state.q=qEl.value.trim();state.loose=false;state.yo='';render();syncURL();noteSearched();},140);
});
$('moreBtn').addEventListener('click',function(){render(true);});
(function(){
  var mc=$('moneyChip');
  var n=AG.money;
  PL.hydrate('moneyN',n.toLocaleString('en-US'));
  mc.addEventListener('click',function(){
    state.money=!state.money;
    mc.setAttribute('aria-pressed',state.money);
    render();syncURL();
  });
  var movers=aggObj(AG.mv);
  var names=Object.keys(movers).filter(function(n2){return movers[n2]>=5;})
    .sort(function(a,b){return movers[b]-movers[a];});
  names.forEach(function(n2){MOVERS[n2]=movers[n2];});
  moverSel.innerHTML='<option value="">Moved by: anyone</option>'+names.map(function(n2){
    return '<option value="'+esc(n2)+'">Moved by '+esc(n2)+' ('+movers[n2].toLocaleString('en-US')+')</option>';}).join('');
  moverSel.addEventListener('change',function(){
    state.mover=moverSel.value;
    moverSel.classList.toggle('on',!!state.mover);
    render();syncURL();
  });
  var items=(R.summary.topics||[]).slice().sort(function(a,b){return b[2]-a[2];});
  tpSel.innerHTML='<option value="">About: anything</option>'+items.map(function(t){
    return '<option value="'+t[0]+'">'+esc(TPL[t[0]]||t[1])+' ('+t[2].toLocaleString('en-US')+')</option>';}).join('');
  tpSel.addEventListener('change',function(){
    state.tp=tpSel.value;
    tpSel.classList.toggle('on',!!state.tp);
    render();syncURL();
  });
})();
$('sumx').addEventListener('click',function(){resetFilters();});

/* the phone's Filters sheet: the same controls, lifted into a bottom sheet. It is the page model's one SHEET (PL.layer, the
   runtime's 'layer' module - the same model as the Go-to sheet): opening pushes ONE history entry, so the Back gesture closes
   the sheet instead of leaving the page (closing by button pops that entry); the rest of the page goes inert, Tab stays
   inside the sheet and it is aria-modal. The scrim carries data-pl-keep: it is the tap-to-close target, so it stays live.
   auto:false because this page's own popstate handler (below) also restores the register's state. */
var FL=PL.layer({auto:false});
function sheetOpen(){
  if(!phoneMQ.matches) return;
  fdeck.classList.add('open');
  fscrim.hidden=false;html.style.overflow='hidden';
  fbtn.setAttribute('aria-expanded','true');
  fdeck.setAttribute('tabindex','-1');
  FL.push();
  FL.modal(fdeck,{phoneOnly:true,opener:fbtn,label:'Filters',focus:fdeck});
}
function sheetClose(fromPop){
  if(!fdeck.classList.contains('open')) return;
  fdeck.classList.remove('open');
  fdeck.removeAttribute('tabindex');
  fscrim.hidden=true;html.style.overflow='';
  fbtn.setAttribute('aria-expanded','false');
  FL.unmodal({focus:phoneMQ.matches});
  if(fromPop) FL.pushed=false; else FL.pop();      /* Back already popped the entry; a button pops it here (popstate is swallowed) */
}
fbtn.addEventListener('click',function(){fdeck.classList.contains('open')?sheetClose(false):sheetOpen();});
/* r5 F-09: on a laptop 'Filters' opens and closes the controls in place */
fbtn.addEventListener('click',function(){ if(phoneMQ.matches) return; var on=!fdeck.classList.contains('dopen');
  fdeck.classList.toggle('dopen',on); fbtn.setAttribute('aria-expanded',on?'true':'false'); });
$('fclose').addEventListener('click',function(){sheetClose(false);});
$('fshow').addEventListener('click',function(){sheetClose(false);});
$('fclear').addEventListener('click',resetFilters);
fscrim.addEventListener('click',function(){sheetClose(false);});
document.addEventListener('keydown',function(e){
  if(!fdeck.classList.contains('open')) return;
  if(e.key==='Escape'){e.preventDefault();sheetClose();return;}      /* Tab is trapped by the layer */
});
(phoneMQ.addEventListener?phoneMQ.addEventListener('change',onPhoneChange):phoneMQ.addListener(onPhoneChange));
window.addEventListener('resize',function(){setPlaceholder();});
function onPhoneChange(){
  if(!phoneMQ.matches){sheetClose();html.classList.remove('rail-off');}
  setPlaceholder();
}
/* a long placeholder is cut mid-word on a phone: shorten it there */
function setPlaceholder(){
  qEl.placeholder=window.matchMedia('(max-width:360px)').matches?'Search resolutions'
    :phoneMQ.matches?('Search '+DTOT.toLocaleString('en-US')+' resolutions')
    :('Search '+DTOT.toLocaleString('en-US')+' resolutions — a topic, a road, a legislator, or one of the named vendors…');
}
setPlaceholder();

/* the rail slides away on scroll-down (phones) so the sticky stack is the search row alone */
(function(){
  var last=window.scrollY, tick=false;
  window.addEventListener('scroll',function(){
    if(tick) return; tick=true;
    requestAnimationFrame(function(){
      tick=false;
      var y=window.scrollY, d=y-last;
      if(!phoneMQ.matches||fdeck.classList.contains('open')){html.classList.remove('rail-off');last=y;return;}
      if(y<=120){html.classList.remove('rail-off');last=y;return;}
      if(d>8){html.classList.add('rail-off');last=y;}
      else if(d<-6){html.classList.remove('rail-off');last=y;}
    });
  },{passive:true});
})();
/* the sticky meeting headers sit under the search row: measure it once and on resize */
(function(){
  var c=$('controls');
  function m(){html.style.setProperty('--ctlh',c.offsetHeight+'px');}
  m();
  if(window.ResizeObserver) new ResizeObserver(m).observe(c); else window.addEventListener('resize',m);
})();

/* try-chips: worked examples, one of each kind of search. The two names are
   picked live from the data: the member with the most no votes, and the
   heaviest sponsor who is not the floor leader - so the worked example shows
   a record, not 3,500 consent-calendar rows. */
(function(){
  var tr=$('tryRow');
  SEEDS=['casino funding','landfill','sheriff','mortgage tax'];
  var nos=aggObj(AG.no), sps=aggObj(AG.sp), movers=aggObj(AG.mv);
  var topMover=Object.keys(movers).sort(function(a,b){return movers[b]-movers[a];})[0];
  var topNo=Object.keys(nos).sort(function(a,b){return nos[b]-nos[a];})[0];
  var topSp=Object.keys(sps).filter(function(n){return n!==topMover&&n!==topNo;}).sort(function(a,b){return sps[b]-sps[a];})[0];
  if(topSp) SEEDS.splice(2,0,topSp);
  if(topNo) SEEDS.splice(2,0,topNo);
  if(R.vx&&R.vx.keys&&R.vx.keys.length){
    var vk=R.vx.keys.slice().sort(function(a,b){return (b.city.amt||0)-(a.city.amt||0);});
    if(vk[0]) SEEDS.unshift(vk[0].q);
    if(vk[1]&&SEEDS.indexOf(vk[1].q)<0) SEEDS.splice(1,0,vk[1].q);
  }
  tr.insertAdjacentHTML('beforeend',trySeedsHTML());
  edgeFade(tr);
  if(SEARCHED) tr.classList.add('seen');
  (function vxPaintArrive(){
    var box=$('vxArrive'); if(!box) return;
    var u=new URL(location.href);
    if(u.searchParams.get('from')!=='city'){ box.hidden=true; return; }
    var q=u.searchParams.get('q')||'', ve=VXQ[q.toLowerCase()];
    box.innerHTML='<span><b>Same name</b> from the city checkbook'
      +(q?' &middot; '+esc(q):'')+'.</span>'
      +'<a href="./?payee='+(ve?vxPayeeParam(ve):encodeURIComponent(q))+'&from=county">Back to the city register&nbsp;&rarr;</a>';
    box.hidden=false;
  })();

  function go(e){
    var b=e.target.closest('[data-q]'); if(!b) return;
    qEl.value=b.getAttribute('data-q');
    state.q=qEl.value; state.only=''; state.all=false;state.loose=false;state.yo=''; state.open=''; render(); syncURL(true); noteSearched();
    qEl.focus();
  }
  tr.addEventListener('click',go);
  $('list').addEventListener('click',go);
})();

/* a drill INTO the register from above it (a hero row, a ceiling): the id
   becomes the search, the URL gets a history entry (Back returns), and the
   one matching row opens */
function drillTo(id){
  qEl.value=id; state.q=id; state.only=''; state.all=false;state.loose=false;state.yo=''; state.open='';
  syncURL(true); render();                 /* the entry is pushed BEFORE the list is redrawn: a shorter page would clamp the spot it saves */
  $('register').scrollIntoView({behavior:smoothB()});
}
(function(){
  var el=$('topCaps'), el2=$('topCapsAll'), lg=$('ledger'), rit=$('rituals');
  function onDrill(e){ var b=e.target.closest('[data-rid]'); if(!b) return; openRec(b.getAttribute('data-rid'),b); }
  if(rit) rit.addEventListener('click',onDrill);
  if(el) el.addEventListener('click',onDrill);
  if(el2) el2.addEventListener('click',onDrill);
  if(lg) lg.addEventListener('click',onDrill);
  /* a statement of position that drew a no at the latest meeting waits behind its own pill under the list (none at most meetings) */
  var lp=$('ledPos'), lpg=$('ledgerPos'), lpn=$('ledPosNote');
  if(lp&&lpg) lp.addEventListener('click',function(){
    var on=lp.getAttribute('aria-pressed')!=='true';
    lp.setAttribute('aria-pressed',String(on)); lpg.hidden=!on;
    if(lpn) lpn.textContent=lpn.getAttribute(on?'data-on':'data-off');
  });
  /* the two views of the ceilings list */
  var mv=document.querySelector('.mview');
  if(mv) mv.addEventListener('click',function(e){
    var b=e.target.closest('[data-mv]'); if(!b) return;
    var all=b.getAttribute('data-mv')==='all';
    mv.querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
    el.hidden=all; el2.hidden=!all;
    /* both captions are composed at build time from the lists they describe */
    $('topCapsSub').innerHTML=all?$('topCapsSub').getAttribute('data-sub-all'):$('topCapsSub').getAttribute('data-sub-12');
  });
  if($('topCapsSub')) $('topCapsSub').setAttribute('data-sub-12',$('topCapsSub').innerHTML);
})();

/* NOV-10: the Rituals list - a topic cut and 'show more' over rows the build already drew (the first six are in the HTML) */
(function(){
  var box=$('rituals'); if(!box) return;
  var rows=[].slice.call(box.querySelectorAll('.rit-row')), more=$('ritMore'), chips=$('ritChips'), tp='', shown=6;
  function paint(){
    var vis=0, tot=0;
    rows.forEach(function(row){ var ok=!tp||(tp==='*chg'?row.getAttribute('data-chg')==='1':row.getAttribute('data-tp')===tp); if(ok) tot++; var on=ok&&vis<shown; row.hidden=!on; if(on) vis++; });
    more.hidden=vis>=tot;
    more.innerHTML='Show '+Math.min(12,tot-vis)+' more &middot; '+vis+' of '+tot;
  }
  chips.addEventListener('click',function(e){
    var b=e.target.closest('[data-rtp]'); if(!b) return;
    tp=b.getAttribute('data-rtp'); shown=6;
    [].forEach.call(chips.querySelectorAll('.fch'),function(x){x.setAttribute('aria-pressed',x===b);});
    paint();
  });
  more.addEventListener('click',function(){ shown+=12; paint(); });
})();

/* votes with a no: a collapsed preview, expand on demand; 'Failed outright' is its own cut; newest first, the margin sort a pill.
   The statements of position (R.pos: a stance, not spending or law - classified at build time by the pattern contested.html's game
   uses) never lead the list: they sit behind their own pill, one tap away. The cut chips, the note and the 'Show all' count each
   say the view on screen; the register's own 104 / 45 above are the whole record and do not move. */
function contBoot(){
  CONTESTED=buildContested();
  var fmt=function(n){return n.toLocaleString('en-US');};
  var el=$('contList'), btn=$('contMore'), chips=$('contChips'), sortEl=$('contSort'), posBtn=$('contPos'), note=$('contPosNote');
  var PREVIEW=phoneMQ.matches?4:25, STEP=25, mode='all', sort='date', pos=false, view=CONTESTED, shown=PREVIEW;      /* r8 F-04: 25 on a desk, then 25 more */
  var POSID={}; (R.pos||[]).forEach(function(id){ POSID[id]=1; });
  var CUT={ main:CONTESTED.filter(function(r){return !POSID[r.id];}), pos:CONTESTED.filter(function(r){return !!POSID[r.id];}) };
  CUT.mainF=CUT.main.filter(isFailed); CUT.posF=CUT.pos.filter(isFailed);
  function n(x){ return x.toLocaleString('en-US'); }
  function stmtN(){ return (mode==='rej'?CUT.posF:CUT.pos).length; }
  function stmtNote(k){ return k+' statement'+(k===1?'':'s')+' of position (a stance, not spending or law) '+(k===1?'is':'are')+' under '+(k===1?'its':'their')+' own filter.'; }
  PL.hydrate('contChips','<button class="fch" type="button" data-cmode="all" aria-pressed="true">All with a no <span class="n num">'+n(CUT.main.length)+'</span></button>'+
    '<button class="fch" type="button" data-cmode="rej" aria-pressed="false">Failed outright <span class="n num">'+n(CUT.mainF.length)+'</span></button>');
  PL.hydrate('contPos','Statements of position ('+n(CUT.pos.length)+')');
  PL.hydrate('contPosNote',stmtNote(CUT.pos.length));
  function ordered(){
    var a=(pos?(mode==='rej'?CUT.posF:CUT.pos):(mode==='rej'?CUT.mainF:CUT.main)).slice();
    if(sort==='margin') a.sort(function(x,y){ var mx=Math.abs(x.vote.ayes-x.vote.noes), my=Math.abs(y.vote.ayes-y.vote.noes); return mx!==my?mx-my:(x.date<y.date?1:-1); });      /* closest to a tie first */
    return a;
  }
  /* the chips, the pill and the note say what the next tap would show, so every figure on screen is the view's own */
  function say(){
    var k=stmtN();
    if(pos&&!k) pos=false;                                   /* a cut with no statements has nothing to show behind the pill */
    chips.querySelector('[data-cmode="all"] .n').textContent=n((pos?CUT.pos:CUT.main).length);
    chips.querySelector('[data-cmode="rej"] .n').textContent=n((pos?CUT.posF:CUT.mainF).length);
    posBtn.textContent='Statements of position ('+n(k)+')';
    posBtn.setAttribute('aria-pressed',String(pos));
    posBtn.hidden=!pos&&!k;
    note.hidden=!pos&&!k;
    note.textContent=pos?'Showing the '+n(k)+' statement'+(k===1?'':'s')+' of position. Tap the filter again for the votes that move money or law.':stmtNote(k);
  }
  function paint(m){
    say();
    view=ordered(); shown=m;
    el.innerHTML=view.slice(0,m).map(function(r,i){return rowHTML(r,i,'c');}).join('');
    btn.style.display=m>=view.length?'none':'';
    var what=pos?(mode==='rej'?' failed statements of position':' statements of position'):(mode==='rej'?' failed votes':' votes with a no');
    btn.textContent=phoneMQ.matches?'Show all '+view.length+what:'Show '+Math.min(STEP,view.length-m)+' more \u00b7 '+m+' of '+view.length+what;
  }
  paint(PREVIEW);
  btn.addEventListener('click',function(){paint(phoneMQ.matches?view.length:Math.min(view.length,shown+STEP));});
  chips.addEventListener('click',function(e){
    var b=e.target.closest('[data-cmode]'); if(!b) return;
    mode=b.getAttribute('data-cmode');
    chips.querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
    paint(PREVIEW);
  });
  sortEl.addEventListener('click',function(e){
    var b=e.target.closest('[data-csort]'); if(!b) return;
    sort=b.getAttribute('data-csort');
    sortEl.querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
    paint(PREVIEW);
  });
  posBtn.addEventListener('click',function(){ pos=!pos; paint(PREVIEW); });
  el.addEventListener('click',function(e){
    var t=e.target.closest('.rtop'); if(t) openRec(t.parentNode.getAttribute('data-id'),t);
  });
  el.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ') return;
    if(!e.target.classList||!e.target.classList.contains('rtop')) return; e.preventDefault(); openRec(e.target.parentNode.getAttribute('data-id'),e.target);
  });
  /* the hero's counts of the votes that had a no: re-derived from the very list the section draws */
  PL.hydrate('hCont',fmt(CONTESTED.length)); PL.hydrate('hFail',fmt(CONTESTED.filter(isFailed).length));
  PL.hydrate.report('decisions.html');
}
function contFail(){
  failPart($('contList'),function(){ shardGet('cont',contBoot,contFail); });      /* r7 F-13: the shared message */
}
shardGet('cont',contBoot,contFail);
/* r8 W-01: the aside marks the reader's own legislator when this device remembers a home (the front's card or the legislators finder
   wrote it to pl-home-x); a mark is a heavier left rule, a sunk background and the word 'yours' - never a hue */
(function(){
  var ul=$('asMem'); if(!ul) return;
  var h='',x=null; try{ h=localStorage.getItem('pl-home')||''; x=JSON.parse(localStorage.getItem('pl-home-x')||'null'); }catch(e){}
  if(!h||!x||x.a!==h) return;
  var l=(x.card&&x.card.a===h&&x.card.leg)?x.card.leg:x.leg, d=(x.card&&x.card.dist&&x.card.dist.d)||(x.leg&&x.leg.d);
  if(!l||!l.s) return;
  var li=ul.querySelector('li[data-s="'+l.s+'"]'), you=$('asYou');
  if(li){ li.classList.add('you'); if(you) you.textContent='For '+h+': District '+(d||li.getAttribute('data-d'))+'.'; }
  else if(you){ you.innerHTML=''; var a=document.createElement('a'); a.href='legislators/'+l.s+'.html'; a.textContent=(l.n||l.s)+(d?', District '+d:'')+' →';
    you.appendChild(document.createTextNode('For '+h+': ')); you.appendChild(a); }
})();
/* the money list on a phone: the five largest, the other five one tap away (the button follows whichever list is showing) */
(function(){
  var b=$('tcMore'), a=$('topCaps'), c=$('topCapsAll'); if(!b||!a||!c) return;
  function cur(){ return c.hidden?a:c; }
  function paint(){
    var l=cur(), open=l.classList.contains('open'), n=Math.max(0,l.querySelectorAll('.tcap').length-5);
    b.hidden=n<1; b.setAttribute('aria-expanded',String(open));
    b.textContent=open?'Show the five largest only':'Show the other '+PL.numword(n);
  }
  b.addEventListener('click',function(){ cur().classList.toggle('open'); paint(); });
  var mv=document.querySelector('.mview'); if(mv) mv.addEventListener('click',function(){ setTimeout(paint,0); });
  paint();
})();
/* details that are a fold on phones and plain on a desk: closed on a phone until the reader touches them */
(function(){
  var ds=[].slice.call(document.querySelectorAll('details[data-open-wide]'));
  function apply(){ ds.forEach(function(d){ if(!phoneMQ.matches) d.open=true; else if(!d.__touched) d.open=false; }); }
  ds.forEach(function(d){ d.addEventListener('toggle',function(){ if(phoneMQ.matches) d.__touched=true; }); });
  if(phoneMQ.addEventListener) phoneMQ.addEventListener('change',apply);
  apply();
})();
/* hero money tally -> $ filter + register */
(function(){
  var t=$('tallyMoney'); if(!t) return;
  t.addEventListener('click',function(){
    var mc=$('moneyChip');
    if(mc.getAttribute('aria-pressed')!=='true') mc.click();
    $('register').scrollIntoView({behavior:smoothB()});
  });
  /* the hero's 'Failed outright' row lands on the contested list already cut to Rejected */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('.hrow[data-cmode]'); if(!a) return;
    var c=document.querySelector('#contChips [data-cmode="'+a.getAttribute('data-cmode')+'"]');
    if(c&&c.getAttribute('aria-pressed')!=='true') c.click();
  });
})();
$('list').addEventListener('click',function(e){
  var nb=e.target.closest('.mnext');
  if(nb){gotoMeeting(nb.getAttribute('data-to'),true); return;}
  var g=e.target.closest('.gtop,.mfold');
  if(g){ var d=g.getAttribute('data-g'); if(expanded[d]) delete expanded[d]; else expanded[d]=1; render('keep');
    /* focus follows the control: the fold row, or the meeting header's fold button once the meeting is open */
    var gg=document.querySelector('.gtop[data-g="'+d+'"],.mfold[data-g="'+d+'"]'); if(gg) gg.focus(); return; }
  var cl=e.target.closest('.cpl');
  if(cl){ copyLink(cl,e); return; }
  var t=e.target.closest('.rtop'); if(t) toggleRow(t.parentNode);
});
$('list').addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ') return;
  if(!e.target.classList||!e.target.classList.contains('rtop')||e.target.classList.contains('gtop')) return;   /* a link inside the opened record keeps its own Enter; the group row is a real button */
  e.preventDefault(); toggleRow(e.target.parentNode);
});
/* a register row (or a row that had a no) opens the record sheet; the page behind it does not move */
function toggleRow(row){ openRec(row.getAttribute('data-id'),row.querySelector('.rtop')); }
/* open one record by id from an address or a Back / Forward (no history entry of its own) */
function openRow(id){ return openRec(id,null,'arrive'); }
/* r5 F-23: a link that names no record on file says so, instead of quietly dropping ?open= */
function noRec(id){ if(window.PL&&PL.toast) PL.toast('No resolution \u201c'+String(id).slice(0,40)+'\u201d is on record here \u2014 it may have been renumbered. Try a search for its title.',9000); }
/* W-10: 'Copy link' copies the record's share page (r/<id>.html, tools/build_shares.py): a chat previews ITS title and vote, then it opens ?open=<id> here */
function copyLink(a,e){
  var id=decodeURIComponent((a.getAttribute('href')||'').slice(6));          /* the pill's href: '?open=<id>' */
  e.preventDefault(); PL.copyText('https://jcurry44.github.io/public-ledger/r/'+encodeURIComponent(id)+'.html');          /* the chrome's copy: clipboard API, then a selected textarea, then the address in the toast */
}

/* 'Open the meeting' lands ON that meeting's header, which then glows for 1.5s */
function gotoMeeting(d,push){
  var y=d.slice(0,4);
  if(!YD[y]) return;
  if(LOADED[y]) gotoMeetingNow(d,push);
  else shardGet(y,function(){ gotoMeetingNow(d,push); },function(){ state.year=y; render(); });      /* a year that will not load: the list says so, with a way to try again */
}
function gotoMeetingNow(d,push){
  var unfold=PEND[d]&&!expanded[d];
  if(unfold) expanded[d]=1;                         /* 'See the agenda' opens the fold, it does not land on a closed one */
  if(state.q||d.slice(0,4)!==state.year||filtersActive()||state.order==='id'){
    state.q='';qEl.value='';state.year=d.slice(0,4);state.cm='';state.tp='';state.money=false;state.mover='';state.order='money';state.only='';state.all=false;state.loose=false;state.yo='';state.open='';state.um=false;state.ur=false;
    syncControls();render();syncURL(push);
  } else if(unfold) render('keep');
  var h=$('m-'+d);
  if(!h){
    /* a meeting below the rows drawn so far (a phone draws 40): draw down to its last row, then land on it */
    var pl=window.__pool||[], last=-1;
    for(var j=0;j<pl.length;j++) if(pl[j].date===d) last=j;
    if(last<0) return;
    state.shown=Math.max(state.shown,last+1-PAGE);
    render(true);
    h=$('m-'+d); if(!h) return;
  }
  h.scrollIntoView({behavior:smoothB(),block:'start'});
  [].forEach.call(document.querySelectorAll('[data-d="'+d+'"]'),function(x){
    x.classList.remove('flash');void x.offsetWidth;x.classList.add('flash');
    setTimeout(function(){x.classList.remove('flash');},1600);});
}
document.addEventListener('click',function(e){
  var a=e.target.closest('[data-meeting]'); if(!a) return;
  e.preventDefault(); gotoMeeting(a.getAttribute('data-meeting'),true);
});

/* deep links: ?q=Bradt (or #q=) opens the register pre-searched - campaign
   and record pages can point straight at a lookup; ?open=<id> opens one row;
   #m-YYYY-MM-DD opens that meeting; every filter has its own parameter */
function phase2(){
readState();
syncControls();
STRIPFOLD=state.q.length>=2;      /* a landing that carries a search folds the marks under one line (B11): the answer is the first thing on screen */
/* a landing that carries a search opens on the answer: on a desk the register's top; on a phone the arrival line and the first result
   sit right under the search row, past the heading and the blurb (and the folded marks are one line, not a 330px strip) */
function landOnResults(){
  if(!phoneMQ.matches){ $('register').scrollIntoView(); return; }
  var a=$('vxArrive'), sl=$('sumline'), t=(a&&!a.hidden)?a:(sl&&sl.offsetParent?sl:$('list')), c=$('controls');
  window.scrollTo({top:Math.max(0,t.getBoundingClientRect().top+window.scrollY-c.offsetHeight-8),behavior:'auto'});
}
var DEEP=(function(){
  if(state.q&&!(window.PL&&PL.ret&&PL.ret.restoring)){ setTimeout(landOnResults,60); }   /* a Back / reload keeps the reader's own spot */
  var m=/^#m-\d{4}-\d\d-\d\d$/.test(location.hash)?location.hash.slice(3):'';
  /* r8 W-01: a meeting's address (#m-<date>) names a header the register draws later, so the views frame cannot place it: open the
     register's part for it (the rail's own tab, as a reader's tap would) */
  if(m) setTimeout(function(){ var a=document.querySelector('nav.rail a[href="#register"]'), g=$('register');
    if(a&&document.documentElement.classList.contains('pl-views')&&g&&!g.hasAttribute('data-part-on')) a.click(); },0);
  return m;
})();
try{history.replaceState({pl:'reg'},'',location.href);}catch(e){}
function first(){
render();
/* exit and return (10-07): a Back or a reload re-grows the register to where the reader had it ("Show more" is not in the
   address); the runtime then holds the exact spot */
if(window.PL&&PL.ret){
  if(PL.ret.saved&&PL.ret.saved.s&&PL.ret.saved.s.shown>state.shown){ state.shown=PL.ret.saved.s.shown; render('keep'); }
  PL.ret.keep(function(){ return {shown:state.shown}; });
}
if(DEEP) setTimeout(function(){gotoMeeting(DEEP);},80);
else if(state.open) setTimeout(function(){ if(!openRow(state.open)){ var gone=state.open; state.open=''; syncURL(); noRec(gone); } },60);          /* an address that names no record: the page, not a stale ?open= - and it says so (r5 F-23) */
document.documentElement.classList.remove('pl-deep');            /* r5 F-02: the answer is drawn - what sits below it shows, in place */
noteSearched();

/* the prerender contract: the build paints every first-screen figure into the HTML (the h1's date, the headline's counts, the
   record card, the $ chip, the contested chips); the script re-derives each one from the records and, the first time it touches
   an element, checks that the page it was handed already said exactly that. One console error names every disagreement and
   fails the page gate, so Python's formatting and this script's cannot drift apart silently - and a reader on a slow link
   sees the true figure as the FIRST value. */
(function(){
  var fmt=function(n){return n.toLocaleString('en-US');};
  var lv=RECS.filter(function(r){return r.date===LMV;}), vt=lv.filter(function(r){return r.vote;});
  var money=function(rs){return rs.filter(function(r){return r.cap||(r.am&&r.am.length);}).length;};
  PL.hydrate('lhDate',fmtDate(LMV));
  PL.hydrate('lhN',fmt(lv.length)); PL.hydrate('lhN2',fmt(lv.length)); PL.hydrate('lhV',fmt(vt.length));
  PL.hydrate('lhC',fmt(vt.filter(function(r){return r.vote.noes>0;}).length)); PL.hydrate('lhF',fmt(vt.filter(isFailed).length));
  PL.hydrate('lhM',fmt(money(lv)));
  /* the counts that span every year come from the build's digests (R.yd, R.ag); each year's digest is checked against its records as they arrive */
  PL.hydrate('hTotal',fmt(DTOT)); PL.hydrate('hMeet',fmt(R.summary.meetings));
  /* the meetings on record that carry no resolution: the count above minus the distinct meeting dates the records themselves name */
  var nd=0; years.forEach(function(y){ nd+=YD[y].m; });
  PL.hydrate('hNone',fmt(R.summary.meetings-nd));
  PL.hydrate('hMoney',fmt(AG.money));
  checkRituals();
  RITREP=RITN;
  PL.hydrate.report('decisions.html');
})();
window.__regReady=true;
$('register').classList.remove('pend');document.documentElement.classList.remove('reg-pend');          /* r7 F-39: drawn - its parts take their own room, in the same frame */
}
withShards(needKeys(),first);
}
if(sync) phase2();
else { REG_PHASE2=phase2; requestAnimationFrame(function(){ setTimeout(function(){ if(REG_PHASE2){ var f=REG_PHASE2; REG_PHASE2=null; f(); } },0); }); }
}
/* WHEN the register boots: at once for a landing that names a row, a search, a filter or a meeting (the answer must be the
   first thing on screen); otherwise on the first touch of anything that needs it (capture phase, so the listeners the boot
   binds see that same event), when the register scrolls within 300px, or when the browser is idle after load - whichever
   comes first. Before the payload has been parsed by the HTML parser there is nothing to boot from: the wish is kept and
   honoured at DOMContentLoaded. */
(function(){
  function needsNow(){ try{ var u=new URL(location.href); return /[?&](q|y|cm|tp|money|mover|order|only|all|loose|open|from)=/.test(u.search)||/^#(q=|m-\d{4}-\d\d-\d\d$)/.test(u.hash); }catch(e){ return false; } }
  var SEL='#register,#contested,#ledger,#heroRows,#topCaps,#topCapsAll,#rituals,[data-meeting],#tallyMoney,[data-cmode],.rail a,.pl-primary,.pl-sheet-primary,[data-q],.pl-btns a[href="#register"]';
  var wantSync=false;
  /* r6 F-15: the records are the #R block, or the PLD payload the stamp moved it into (a script in its place) */
  function tryBoot(sync){ if(!$('R')&&!(window.PLD&&PLD.R)){ wantSync=wantSync||sync; return false; } bootRegister(sync); return REG_BOOTED; }
  /* ?embed=strip: the chart is drawn from the register's records, so the embed boots it at once (the payload is not parsed yet when the
     runtime isolates the chart: the wish is kept and honoured at DOMContentLoaded) */
  var sc=$('stripChart'); if(sc) sc.addEventListener('pl:embed',function(){ tryBoot(true); });
  ['pointerdown','click','focusin','keydown','input'].forEach(function(t){
    document.addEventListener(t,function(e){
      if(REG_BOOTED&&!REG_PHASE2) return;
      var el=e.target; if(!el||!el.closest) return;
      if(t==='keydown'){ if(e.key!=='/'&&!el.closest('#register')) return; }
      else if(!el.closest(SEL)) return;
      tryBoot(true);
    },true);
  });
  function onDom(){
    /* r7 F-13: the document is parsed and the records never came (their script was blocked or the connection dropped): the lists say so
       now, not never. A payload that loads late (an async script) gets until its own load or error event, at most 4 s. */
    if(!$('R')&&!(window.PLD&&PLD.R)){
      var ps=document.querySelector('script[data-pl-payload~="R"]');
      if(ps&&ps.async&&!ps.hasAttribute('data-ok')&&!ps.hasAttribute('data-err')){
        var t0=setTimeout(function(){ if(!tryBoot(true)) regFail(); },4000);
        ps.addEventListener('load',function(){ clearTimeout(t0); if(!tryBoot(true)) regFail(); });
        ps.addEventListener('error',function(){ clearTimeout(t0); regFail(); });
      } else regFail();
      return;
    }
    if(needsNow()||wantSync){ tryBoot(true); return; }
    var reg=$('register');
    if(window.IntersectionObserver&&reg){
      var io=new IntersectionObserver(function(es){ if(es.some(function(x){return x.isIntersecting;})){ io.disconnect(); tryBoot(false); } },{rootMargin:'300px 0px'});
      io.observe(reg);
    }
    var idle=window.requestIdleCallback||function(f){ return setTimeout(f,700); };
    function later(){ idle(function(){ tryBoot(false); },{timeout:1500}); }
    if(document.readyState==='complete') later(); else window.addEventListener('load',later);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',onDom); else onDom();
})();

/* press / anywhere to search (the search field itself boots the register on focus) */
document.addEventListener('keydown',function(e){
  if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey) return;
  var t=(e.target.tagName||'');
  if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT') return;
  e.preventDefault(); var q=$('q'); q.focus(); q.select();
});

/* rail scrollspy: the active tab is scrolled into view, never left off-screen */
(function(){
  var links=[].slice.call(document.querySelectorAll('.rail a[href^="#"]'));
  var secs=links.map(function(a){return $(a.getAttribute('href').slice(1));});
  var rail=document.querySelector('.rail-in');
  var tick=false, cur=-1;
  function paint(){
    tick=false;
    if(document.documentElement.classList.contains('pl-tabs')) return;      /* r6 F-05: a phone's tabs mark their own part */
    var y=window.scrollY+130, on=0;
    for(var i=0;i<secs.length;i++){ if(secs[i]&&secs[i].offsetTop<=y) on=i; }
    if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-2) on=secs.length-1;
    links.forEach(function(a,i){a.classList.toggle('on',i===on);});
    if(on!==cur&&rail&&rail.scrollWidth>rail.clientWidth+4){
      var a=links[on];
      rail.scrollTo({left:Math.max(0,a.offsetLeft-(rail.clientWidth-a.offsetWidth)/2)});
    }
    cur=on;
  }
  window.addEventListener('scroll',function(){
    if(!tick){tick=true;requestAnimationFrame(paint);}
  },{passive:true});
  paint();
})();
