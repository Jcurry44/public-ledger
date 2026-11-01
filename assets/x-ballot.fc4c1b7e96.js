
(function(){
  "use strict";
  var D={"eday":"2026-11-03","edayShort":"Tue Nov 3","polls":"6 a.m. to 9 p.m.","ratio":0.4,"presets":{"mv":[150000,250000,400000],"av":[60000,100000,160000]},"p95":170000,"min":1000,"max":1000000000,"hint":"Add the street name, like 123 Oliver St","mine":" &middot; if you vote at this address, your ballot has <b>1</b> local question: City Proposition One","q":{"nt":{"rate":0.84,"years":30,"ratio":true,"of":"a home","lead":"if the City borrows the full $18 million"},"somerset":{"rate":0.54,"years":0,"ratio":false,"of":"property","lead":"at the ballot\u2019s estimate of $0.54 per $1,000"}}};
  var $=function(id){return document.getElementById(id)};
  var fmt=function(x,c){return '$'+x.toLocaleString('en-US',{minimumFractionDigits:c?2:0,maximumFractionDigits:c?2:0})};
  /* a typed or pasted value. A leading $, spaces and commas are formatting; cents are dropped, never rounded up; a trailing k or m
     is thousand or million (150k, 1.2m). Anything else - a minus sign, other letters ('1e6' once read as 16 and '$150k' as 150), a
     second point - is refused with what to type instead, never read as some other number (audit PL-10). Digits are shifted as text,
     so 1.1m is exactly 1100000. -> {n: whole dollars or null, why: '' | empty | neg | bad | min | max} */
  function parse(s){
    var t=String(s).replace(/\s/g,'').replace(/^\$/,'');
    if(!t)return {n:null,why:'empty'};
    if(/^[-−–]/.test(t))return {n:null,why:'neg'};
    var m=/^([\d,]*)(?:\.(\d*))?([kKmM]?)$/.exec(t);
    if(!m||!/\d/.test(m[1]+(m[2]||'')))return {n:null,why:'bad'};
    /* with a k or m the commas must be thousands groups: '1,2m' is no way to write 1.2 million, so it is not read as 12 million */
    if(m[3]&&/,/.test(m[1])&&!/^\d{1,3}(,\d{3})+$/.test(m[1]))return {n:null,why:'bad'};
    var z=m[3]?(/k/i.test(m[3])?3:6):0,f=m[2]||'';
    while(f.length<z)f+='0';
    var d=(m[1].replace(/,/g,'')+f.slice(0,z)).replace(/^0+(?=\d)/,'');
    if(d.length>12)return {n:null,why:'max'};
    var n=+d||0;
    return {n:n,why:n<D.min?'min':n>D.max?'max':''};
  }

  /* the eyebrow's tense, decided when the page is READ (the build wrote today's) */
  var w=$('bWhen');
  if(w){
    var e=new Date(D.eday+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);
    var n=Math.round((e-t)/864e5),dl=D.edayShort,h;
    if(n>1)h='Election day '+dl+' &middot; in '+n+' days';
    else if(n===1)h='Election day is tomorrow, '+dl;
    else if(n===0)h='Election day is today &middot; polls '+D.polls;
    else h='Voted '+dl+' &middot; results from the county board';
    w.innerHTML=h;
    var vb=document.querySelector('.vote'),boe=vb&&vb.querySelector('a[href*="niagaracounty"]');
    if(n<0&&vb&&boe)vb.innerHTML='<div><span class="sk">Voted</span><b>'+dl+'</b></div><div><span class="sk">Results</span><b><a href="'+
      boe.getAttribute('href')+'" rel="noopener">Niagara County Board of Elections</a></b></div>';
  }

  /* one tab per question; the hash names it so a shared link opens the right one */
  var tabs=[].slice.call(document.querySelectorAll('.tabs [role=tab]'));
  function show(id,push){
    tabs.forEach(function(b){var on=b.id==='tab-'+id;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;
      $(b.getAttribute('aria-controls')).hidden=!on;});
    if(push){try{history.replaceState(null,'','#'+id)}catch(x){}}
  }
  tabs.forEach(function(b,i){
    b.addEventListener('click',function(){show(b.id.slice(4),true)});
    b.addEventListener('keydown',function(ev){
      if(ev.key!=='ArrowRight'&&ev.key!=='ArrowLeft')return;
      var j=(i+(ev.key==='ArrowRight'?1:tabs.length-1))%tabs.length;show(tabs[j].id.slice(4),true);tabs[j].focus();ev.preventDefault();});
  });
  var h0=(location.hash||'').slice(1);
  show(D.q[h0]?h0:tabs[0].id.slice(4),false);

  /* the address search: the City's final roll (address + city taxable value only), fetched on first use */
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
  /* r5 W-01: 'your home' - an address picked here, on the tax estimate or on the legislators page is kept on this device only
     (localStorage: never sent, never in an address), so this page answers for it on arrival; 'Forget this address' removes it */
  function homeGet(){try{return localStorage.getItem('pl-home')||''}catch(e){return ''}}function homeSet(a){try{localStorage.setItem('pl-home',String(a).slice(0,120))}catch(e){}}function homeForget(){try{localStorage.removeItem('pl-home');localStorage.removeItem('pl-home-x')}catch(e){}}function homeNote(k,v){try{var a=localStorage.getItem('pl-home')||'';if(!a)return;var x=JSON.parse(localStorage.getItem('pl-home-x')||'{}');if(x.a!==a)x={a:a};x[k]=v;localStorage.setItem('pl-home-x',JSON.stringify(x))}catch(e){}}
  [].forEach.call(document.querySelectorAll('.find[data-roll]'),function(box){
    var id=box.id.slice(5),inp=$('addr-'+id),list=$('addrL-'+id),found=$('addrF-'+id),R=null,T=null,hits=[],act=-1,loading=false,moved=false,onR=null;
    function load(){
      if(R||loading)return;loading=true;
      fetch(box.getAttribute('data-roll')).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
        R=d;T=d.a.map(function(a){return addrToks(a)});loading=false;if(onR){var f=onR;onR=null;f()}else if(inp.value)search();
      }).catch(function(){box.hidden=true});
    }
    function also(){return ' <span class="also">For this address: <a href="index.html#taxes">your tax estimate</a> &middot; '+
      '<a href="legislators.html#find">your county legislator</a> &middot; <button type="button" class="also-x">Forget this address</button></span>'}
    found.addEventListener('click',function(e){var x=e.target.closest('.also-x');if(!x)return;homeForget();x.parentNode.textContent='Forgotten on this device.'});
    function close(){list.hidden=true;inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');act=-1}
    function mark(i){act=i;[].forEach.call(list.children,function(li,j){li.setAttribute('aria-selected',j===i?'true':'false')});
      if(i>=0){inp.setAttribute('aria-activedescendant','addrO-'+id+'-'+i);list.children[i].scrollIntoView({block:'nearest'})}
      else inp.removeAttribute('aria-activedescendant')}
    /* a street name is a word of three letters or more, or an ordinal ('16th'): a house number alone is not an address, and the search
       will not page through a block by number (audit PL-19). 'East' and 'Ave' count - East Ave is a street on the roll - so '123 st'
       gets the hint and '123 east' the list */
    function named(w){return /[a-z]{3,}/.test(w)||/^\d+(st|nd|rd|th)$/.test(w)}
    function search(){
      var q=words(inp.value),html;hits=[];
      if(!q.length||(q.length===1&&q[0].length<2)){close();return}
      if(!R)load();
      if(!q.some(named))html='<li class="none" role="option" aria-disabled="true">'+hx(D.hint)+'</li>';
      else{
        if(!R){close();return}                 /* the roll is still on its way: no stale hint meanwhile; load() re-runs this */
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
        html=hits.length?hits.map(function(i,j){return '<li role="option" id="addrO-'+id+'-'+j+'" aria-selected="false"><b>'+
          hx(R.a[i])+'</b><span>'+(R.c&&clsOf(R.c[i])?clsOf(R.c[i])+' \u00b7 ':'')+(/^\d/.test(R.a[i])?'':'no house number \u00b7 ')+(R.v[i]?'assessed '+fmt(R.v[i]):'no taxable value')+'</span></li>'}).join('')
          :'<li class="none" role="option" aria-disabled="true">No address on the '+R.year+' roll matches. Try the house number and street name only; an apartment may be listed under its building&rsquo;s number.</li>';
      }
      /* F-03 (clean-slate audit 2026-10-31): the first suggestion is highlighted - and Enter takes it - only when it carries the house number as typed (or no number was typed); otherwise Enter keeps the text and says there is no such address */
      var exact=hits.length&&(!/^\d/.test(q[0])||T[hits[0]][0]===q[0]);
      list.innerHTML=html;list.hidden=false;inp.setAttribute('aria-expanded','true');mark(exact?0:-1);moved=false;
    }
    function pick(j,quiet){
      var i=hits[j];if(i==null)return;
      inp.value=R.a[i];close();homeSet(R.a[i]);
      var ca=$('calc-'+id),v=$('v-'+id);
      if(!R.v[i]){      /* review F-06: nothing to price - the box keeps its value, the calculator says why, in the city page's words */
        ca.setAttribute('data-addr',R.a[i]);ca.setAttribute('data-av','0');ca.setAttribute('data-year',R.year);ca.setAttribute('data-zero','1');
        v.dispatchEvent(new Event('input'));      /* r6 F-28: the calculator updates first, then the line says why it shows no cost */
        found.innerHTML='<b>'+hx(R.a[i])+'</b>: the '+R.year+' final roll lists it with no city taxable value, so this question costs it nothing.'+also();
        if(id==='nt')homeNote('ballot','none');
      }else{
        ca.removeAttribute('data-zero');
        var av=ca.querySelector('[data-basis=av]');if(av&&av.getAttribute('aria-pressed')!=='true')av.click();
        v.value=R.v[i].toLocaleString('en-US');v.dispatchEvent(new Event('input'));
        found.innerHTML='<b>'+hx(R.a[i])+'</b>: city taxable value <b>'+fmt(R.v[i])+'</b> on the '+R.year+' final roll, after any exemptions'+D.mine+also();
        ca.setAttribute('data-addr',R.a[i]);ca.setAttribute('data-av',R.v[i]);ca.setAttribute('data-year',R.year);v.dispatchEvent(new Event('input'));
        if(id==='nt'){var oc=$('o-'+id);homeNote('ballot',oc?oc.textContent.trim():'');}      /* r6 W-01: the front shows it */
      }
      /* on a phone the answer sits ABOVE the search: bring it into view once the address is picked */
      if(!quiet&&window.matchMedia('(max-width:760px)').matches){var rm=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
        $('o-'+id).scrollIntoView({block:'center',behavior:rm?'auto':'smooth'})}
    }
    inp.addEventListener('focus',load);
    inp.addEventListener('input',search);
    inp.addEventListener('keydown',function(e){
      if(list.hidden&&e.key==='ArrowDown'){search();e.preventDefault();return}
      if(list.hidden)return;
      if(e.key==='ArrowDown'){if(moved||act!==0)mark(Math.min(act+1,hits.length-1));moved=true;e.preventDefault()}
      else if(e.key==='ArrowUp'){if(hits.length)mark(Math.max(act-1,0));e.preventDefault()}
      else if(e.key==='Enter'){if(act>=0){pick(act);e.preventDefault()}
        else if(R&&!list.hidden&&hits.length){e.preventDefault();
          found.innerHTML='No <b>'+hx(inp.value.trim())+'</b> on the '+R.year+' final roll: pick the nearest from the list, or check the number.'}}
      else if(e.key==='Escape'){close();e.preventDefault()}
    });
    list.addEventListener('mousedown',function(e){e.preventDefault()});
    list.addEventListener('click',function(e){var li=e.target.closest('li[id]');if(li)pick(+li.id.split('-').pop())});
    inp.addEventListener('blur',function(){setTimeout(close,120)});
    /* r5 W-01: a home kept on this device is priced on arrival (quietly: the page does not scroll to it) */
    var hs=homeGet();if(hs&&!inp.value){onR=function(){var k=R.a.indexOf(hs);if(k>=0){hits=[k];pick(0,true)}};load()}
  });

  /* the calculators */
  Object.keys(D.q).forEach(function(id){
    var q=D.q[id],inp=$('v-'+id),out=$('o-'+id),sub=$('os-'+id),vm=$('vm-'+id),basis=q.ratio?'mv':'av',calc=$('calc-'+id);      /* r4 F-02: market first, as the home page */
    /* what the field holds: n the figure as read (or null), v the figure to price (0 when there is none), msg what is wrong with the text */
    function read(){
      var r=parse(inp.value),nm=basis==='mv'?'market value':'assessed value',a=basis==='mv'?'a ':'an ',msg='';
      if(r.why==='empty')msg='Enter '+a+nm+', like '+D.presets[basis][1].toLocaleString('en-US')+'.';
      else if(r.why==='neg')msg=(basis==='mv'?'A ':'An ')+nm+' can\u2019t be negative.';
      else if(r.why==='bad')msg='Use numbers only, like 150,000 or $150k.';
      else if(r.why==='min')msg='Enter '+a+nm+' of '+fmt(D.min)+' or more.';
      else if(r.why==='max')msg='This calculator covers values up to '+fmt(D.max)+'.';
      return {n:r.n,v:msg?0:r.n,msg:msg};
    }
    function parcel(r){var a=calc.getAttribute('data-addr'),pv=+calc.getAttribute('data-av')||0,v=r.n;
      if(!a||!pv||v==null)return null;return (basis==='av'?v===pv:v===Math.round(pv/D.ratio/1000)*1000)?{a:a,v:pv,y:calc.getAttribute('data-year')}:null}
    function run(){
      var r=read(),P=parcel(r),jl=calc.querySelector('[data-jump]'),A=calc.getAttribute('data-addr'),
        zero=calc.hasAttribute('data-zero')||(!P&&A&&r.n===0&&+calc.getAttribute('data-av')===0),      /* an address picked from the roll with no taxable value */
        msg=P||zero?'':r.msg;                                           /* a picked address is not a typing mistake */
      if(jl)jl.textContent=P?'Change address \u2193':'Your home: find your address \u2193';
      if(vm.textContent!==msg)vm.textContent=msg;
      inp.setAttribute('aria-invalid',msg?'true':'false');
      if(zero||(!P&&!r.v)){        /* nothing to price: say so, and leave no figure from an earlier value on the page */
        out.textContent='\u2014';sub.textContent=zero?'Nothing to price: the roll lists '+A+' with no city taxable value':'No estimate yet';
        [].forEach.call(calc.querySelectorAll('[data-r]'),function(b){b.textContent='\u2014'});var t0=$('t-'+id);if(t0)t0.textContent='\u2014';return}
      var v=r.n,av=P?P.v:(basis==='mv'?v*D.ratio:v),tag=basis==='mv'?'worth '+fmt(v)+' (assessed about '+fmt(Math.round(av/100)*100)+')':'assessed at '+fmt(v)+(q.ratio&&v?' (about '+fmt(Math.round(v/D.ratio/1000)*1000)+' at market)':'');
      out.textContent=fmt(av*q.rate/1000);
      sub.textContent=q.lead+(P?', for '+P.a+': taxable value '+fmt(P.v)+' on the '+P.y+' roll (about '+fmt(Math.round(P.v/D.ratio/1000)*1000)+' at market)':', for '+q.of+' '+tag)+
        /* r4 F-02: an assessed figure few homes reach is said back at market, in case a market value went into the assessed box */
        ((!P&&q.ratio&&basis==='av'&&D.p95&&v>D.p95)?'. 95 of 100 homes here are assessed under '+fmt(D.p95)+': if '+fmt(v)+' is what it would sell for, switch to Market value':'');
      [].forEach.call(calc.querySelectorAll('[data-r]'),function(b){
        var x=av*parseFloat(b.getAttribute('data-r'))/1000;b.textContent=(b.getAttribute('data-sign')?'−':'')+fmt(x,!!b.getAttribute('data-sign'));});
      var th=$('t-'+id);if(th)th.textContent=fmt(Math.round(av*q.rate/1000)*q.years);
    }
    inp.addEventListener('input',run);
    inp.addEventListener('beforeinput',function(){calc.removeAttribute('data-zero');});      /* the reader's own value is priced again */
    /* leaving the field tidies a value that read ('150k' becomes 150,000); text that did not read stays as typed, beside its note */
    inp.addEventListener('blur',function(){var r=read();if(r.v)inp.value=r.v.toLocaleString('en-US');});
    [].forEach.call(calc.querySelectorAll('[data-v]'),function(p){p.addEventListener('click',function(){
      calc.removeAttribute('data-zero');inp.value=(+p.getAttribute('data-v')).toLocaleString('en-US');run();});});
    [].forEach.call(calc.querySelectorAll('[data-basis]'),function(s){s.addEventListener('click',function(){
      var nb=s.getAttribute('data-basis');if(nb===basis||(nb==='mv'&&!q.ratio))return;
      /* only a value that read is converted between assessed and market; anything else stays as typed, and its note follows the new basis */
      var r0=read(),P0=parcel(r0),v=r0.v;basis=nb;
      [].forEach.call(calc.querySelectorAll('[data-basis]'),function(o){o.setAttribute('aria-pressed',o===s?'true':'false')});
      inp.setAttribute('aria-label',basis==='mv'?'Your home’s market value in dollars':'Your home’s assessed value in dollars');
      if(P0)inp.value=(basis==='mv'?Math.round(P0.v/D.ratio/1000)*1000:P0.v).toLocaleString('en-US');
      else if(v)inp.value=(Math.round((basis==='mv'?v/D.ratio:v*D.ratio)/1000)*1000).toLocaleString('en-US');
      var pre=D.presets[basis];
      [].forEach.call(calc.querySelectorAll('[data-v]'),function(p,i){p.setAttribute('data-v',pre[i]);p.textContent='$'+pre[i]/1000+'K';});
      var hA=$('vhA-'+id);if(hA)hA.textContent=basis==='mv'?'Or type what your home would sell for today; the City assesses at '+
        Math.round(D.ratio*100)+'% of that. The buttons are market values.':'Or type the assessed value from your tax bill; it is not what you paid.';
      run();});});
  });
  /* the numbers fold is open on a desk and an ink row on a phone (until the reader touches it) */
  (function(){
    var mq=window.matchMedia('(max-width:640px)'),ds=[].slice.call(document.querySelectorAll('details[data-open-wide]'));
    function apply(){ds.forEach(function(d){if(!mq.matches)d.open=true;else if(!d.touched_)d.open=false;});}
    ds.forEach(function(d){d.addEventListener('toggle',function(){if(mq.matches)d.touched_=true;});});
    if(mq.addEventListener)mq.addEventListener('change',apply);else mq.addListener(apply);
    apply();
  })();
  /* the phone's 'find your address' link: land on the search, keyboard up */
  [].forEach.call(document.querySelectorAll('[data-jump]'),function(a){a.addEventListener('click',function(e){
    var i=$(a.getAttribute('data-jump'));if(!i)return;e.preventDefault();
    i.scrollIntoView({block:'center',behavior:'smooth'});i.focus({preventScroll:true});});});
})();
