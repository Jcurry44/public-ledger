
(function(){
"use strict";
var tabs=[].slice.call(document.querySelectorAll('.tabs [role=tab]'));
function pick(t,focus){tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on?'true':'false');x.tabIndex=on?0:-1;
  var p=document.getElementById(x.getAttribute('aria-controls'));if(p)p.hidden=!on;});if(focus)t.focus();}
tabs.forEach(function(t,i){t.addEventListener('click',function(){pick(t);});
  t.addEventListener('keydown',function(e){var n=null;
    if(e.key==='ArrowRight')n=tabs[(i+1)%tabs.length];else if(e.key==='ArrowLeft')n=tabs[(i+tabs.length-1)%tabs.length];
    else if(e.key==='Home')n=tabs[0];else if(e.key==='End')n=tabs[tabs.length-1];
    if(n){e.preventDefault();pick(n,true);}});});
var pb=document.getElementById('printBtn');if(pb)pb.addEventListener('click',function(){window.print();});
/* r7 (lanes/API.md): Share goes through the one PL.share - the share sheet on a touch phone, else the link copied, a toast either way;
   the toast module's PL.shareLink until the chrome has it */
var sb=document.getElementById('shareBtn');if(sb)sb.addEventListener('click',function(){var u=sb.getAttribute('data-url');
  if(window.PL&&PL.share)PL.share({url:u,title:document.title});else if(window.PL&&PL.shareLink)PL.shareLink(document.title,u,{coarse:true});});
/* '+N more in The detail' opens that tab instead of jumping to a hidden pane */
[].forEach.call(document.querySelectorAll('.to-detail'),function(a){a.addEventListener('click',function(e){
  var t=document.getElementById('tab-detail');if(t){e.preventDefault();pick(t,true);}});});
/* the lanes: the whole lane is the instrument (the chrome's PL.scrubber). A mouse hovers and the nearest bar within 14px
   answers; a finger pressed and slid along the lane scrubs - the nearest bar always answers - and lifting leaves the
   readout up (lift to peek); a tap previews, a second tap (or the readout itself) opens; a click opens. Only linked
   bars count - the dashed 'next expected' slot and a not-yet-read stub carry no page. The bar under the pointer and
   every mark or row sharing its key (the other lane, the directory row) light together through PL.hl. */
var HG=document.querySelector('[data-hgroup]'),HOV=PL.hl.hoverable();
/* embedded (?embed=id): a bar or the readout opens its brief in the host's own window, never inside the frame */
var EMB=!!(PL.embed&&PL.embed.mode);
function go(h){if(EMB)window.open(new URL(h,location.href).href,'_top');else location.href=h;}
if(EMB)[].forEach.call(document.querySelectorAll('[data-pl-chart] a[href]'),function(a){a.target='_top';});
[].forEach.call(document.querySelectorAll('.tl'),function(tl){
  var bars=[].slice.call(tl.querySelectorAll('a.tb')),pop=tl.querySelector('.pop'),sel=null,touch=false;
  if(!bars.length||!pop)return;
  /* a bar's own link never navigates by itself: the lane decides (a finger previews first, a mouse opens);
     the readout is its own link and keeps its default. pointerType backs up the hover query (a touch screen that
     also reports hover still previews first). */
  tl.addEventListener('pointerdown',function(e){touch=e.pointerType!=='mouse';});
  tl.addEventListener('click',function(e){if(e.target===pop){e.stopPropagation();return;}if(e.target.closest&&e.target.closest('a.tb'))e.preventDefault();},true);
  var near=function(x,lim){var b=null,bd=1e9;bars.forEach(function(el){var r=el.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-x);
    if(d<bd){bd=d;b=el;}});return bd<=lim?b:null;};
  var show=function(b){bars.forEach(function(x){x.classList.toggle('is-h',x===b);});
    if(!b){tl.classList.remove('pop-on');pop.hidden=true;sel=null;return;}
    pop.textContent=(b.getAttribute('data-t')||b.getAttribute('data-r'))+'  →';pop.setAttribute('href',b.getAttribute('href'));pop.setAttribute('aria-label','Open the brief: '+(b.getAttribute('aria-label')||''));if(EMB)pop.target='_top';pop.hidden=false;tl.classList.add('pop-on');
    /* measure at left:0 with the plot's width as the ceiling, then pin that width: an absolutely positioned box
       re-wraps to (plot width - left) once left is set, so the measured width is fixed before it moves */
    var tr=tl.getBoundingClientRect();pop.style.left='0px';pop.style.width='';pop.style.maxWidth=Math.floor(tr.width)+'px';
    var w=Math.min(pop.offsetWidth,Math.floor(tr.width)),br=b.getBoundingClientRect(),c=br.left+br.width/2-tr.left;
    pop.style.width=w+'px';pop.style.left=Math.max(0,Math.min(tr.width-w,c-w/2))+'px';sel=b;};
  /* pick = show + light the key everywhere (the hl group fires its callbacks; show alone is what those callbacks use) */
  var pick=function(b){show(b);if(!HG)return;if(b)PL.hl.set(HG,b.getAttribute('data-hk'),b);else PL.hl.clear(HG);};
  tl.__lane={show:show,bars:bars};
  /* r3 PL-07: the lane is ONE keyboard stop (the arrow keys step bar by bar, each spoken; Enter opens); the bar links leave the tab
     order - the directory below lists every brief */
  bars.forEach(function(b){ b.setAttribute('tabindex','-1'); });
  var linked=bars.filter(function(b){ return !b.classList.contains('is-t')&&!b.classList.contains('is-f'); });
  PL.scrubber(tl,{
    keys:{idx:function(x){ var b=near(x,1e9); return b?linked.indexOf(b):-1; }, label:tl.getAttribute('aria-label')||'Every warrant, one bar each',
          read:function(i){ var b=linked[i]; return b?(b.getAttribute('aria-label')||b.getAttribute('data-t')||''):''; }},
    onMove:function(x,touch){pick(near(x,touch?1e9:14));},
    onLeave:function(wasTouch){if(!wasTouch)pick(null);},
    /* r5 F-15: one tap on a bar opens its brief (a slide reads the lane; the values that matter are on the lane already) */
    onTap:function(x){var b=near(x,22);if(!b){pick(null);return;}if(b.classList.contains('is-t')||b.classList.contains('is-f'))return;
      go(b.getAttribute('href'));}
  });
});
/* a click outside every lane lets go (one listener for all lanes: a lane must never clear the key a sibling lane just set) */
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.tl'))return;
  [].forEach.call(document.querySelectorAll('.tl'),function(tl){if(tl.__lane)tl.__lane.show(null);});if(HG)PL.hl.clear(HG);});
/* a directory row (or a question) under the pointer: the lanes answer with that night's readout too */
if(HG){var gn=HG.getAttribute('data-hgroup');
  (PL.hl.on[gn]=PL.hl.on[gn]||[]).push(function(key,g,src){if(src&&src.closest&&src.closest('.tl'))return;
    [].forEach.call(document.querySelectorAll('.tl'),function(tl){var L=tl.__lane;if(!L)return;
      var b=L.bars.filter(function(x){return x.getAttribute('data-hk')===key&&!x.classList.contains('fl');})[0];if(b)L.show(b);});});
  (PL.hl.off[gn]=PL.hl.off[gn]||[]).push(function(){[].forEach.call(document.querySelectorAll('.tl'),function(tl){if(tl.__lane)tl.__lane.show(null);});});}
/* the phone fold: three named questions and one button. It folds only here, so scripts off (and every width past 640px) shows everything. */
var phone=!!(window.matchMedia&&window.matchMedia('(max-width:640px)').matches);
var am=document.getElementById('askMore'),al=document.getElementById('askList');
if(am&&al&&phone){al.classList.add('folded');am.hidden=false;
  am.addEventListener('click',function(){var first=[].filter.call(al.children,function(li){return li.offsetParent===null;})[0];
    al.classList.remove('folded');am.setAttribute('aria-expanded','true');am.hidden=true;
    if(first){first.setAttribute('tabindex','-1');first.focus({preventScroll:true});}});}
/* r5 F-15: the lanes' in-place labels never overlap. Measured after layout (a label's width depends on the screen): where two would touch,
   the later one in the lane - 'largest' after 'this warrant' or 'latest' - steps aside with its leader; a slide along the lane reads it */
function declutter(){[].forEach.call(document.querySelectorAll('.tl'),function(tl){
  var tags=[].slice.call(tl.querySelectorAll('.tag'));
  tags.forEach(function(t){t.hidden=false;var l=t.previousElementSibling;if(l&&l.classList.contains('lead-line'))l.hidden=false;});
  for(var i=1;i<tags.length;i++)for(var j=0;j<i;j++){if(tags[j].hidden)continue;
    var a=tags[i].getBoundingClientRect(),b=tags[j].getBoundingClientRect();
    if(a.left<b.right+6&&b.left<a.right+6&&a.top<b.bottom&&b.top<a.bottom){tags[i].hidden=true;
      var l=tags[i].previousElementSibling;if(l&&l.classList.contains('lead-line'))l.hidden=true;break;}}});}
declutter();var dct;window.addEventListener('resize',function(){clearTimeout(dct);dct=setTimeout(declutter,150);});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(declutter);
})();
