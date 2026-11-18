(function(){
  // Прогресс читателя (опция). По умолчанию открыто всё: Иван книгу прочитал.
  function nums(str){ var out=[]; String(str==null?'':str).replace(/(\d+)\s*[–-]\s*(\d+)|(\d+)/g,function(m,a,b,c){ if(a){ for(var i=+a;i<=+b;i++) out.push(i);} else out.push(+c); return m; }); return out; }
  function gate(D,R){
    var ALL=D.chapters.length; D.__owner=ALL;
    if(!(R>=1)||R>=ALL){ D.__R=ALL; return D; }
    D.__R=R; D.__gated=true;
    var ok=function(x){ return (x.ch||0)<=R; };
    D.quotes=D.quotes.filter(ok); D.timeline=D.timeline.filter(ok); D.photos=D.photos.filter(ok);
    D.world=D.world.map(function(s){ var c=Object.assign({},s); c.items=s.items.filter(ok); return c; }).filter(function(s){ return s.items.length; });
    D.diary.entries=D.diary.entries.filter(function(e){ var n=nums(e.ch); return n.length&&n.every(function(k){ return k<=R; }); });
    D.profiles=D.profiles.map(function(p){ var c=Object.assign({},p); c.ev=p.ev.filter(ok); c.chs=c.ev.map(function(e){ return e.ch; }).join(', '); c.bio=[]; return c; }).filter(function(p){ return p.ev.length; });
    delete D.front.conclusion;
    return D;
  }
  window.__yusGate=gate;
})();
(function(){
function start(D){
  var T=D.themes;
  function el(tag,cls,txt){ var n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }
  function nums(str){ var out=[]; String(str==null?'':str).replace(/(\d+)\s*[–-]\s*(\d+)|(\d+)/g,function(m,a,b,c){ if(a){ for(var i=+a;i<=+b;i++) out.push(i);} else out.push(+c); return m; }); return out; }
  var ALL=D.__owner, R=D.__R, MAXCH=R, PARTS=D.parts;
  function lab(n){ return n<=27?'I·'+n:'II·'+(n-27); }
  function partOf(n){ return n<=27?PARTS[0]:PARTS[1]; }
  function chLink(n){ var a=el('a','chl','гл. '+lab(n)); a.href='#ch-'+n; return a; }
  function rangeLab(str){ var n=nums(str); if(!n.length) return ''; var a=n[0], b=n[n.length-1]; return a===b?lab(a):lab(a)+'–'+(b<=27||a>27?(b<=27?b:b-27):lab(b)); }

  // header
  var pct=Math.round(100*R/ALL);
  document.getElementById('bar').style.width=pct+'%';
  document.getElementById('pct').textContent=D.__gated?'гл. '+lab(R)+' из 46':'прочитано: 46 глав · 2 книги';
  (function(){ var b=document.getElementById('pct-btn'), p=document.getElementById('readpos'); function set(v){ p.hidden=!v; b.setAttribute('aria-expanded',v?'true':'false'); }
    b.addEventListener('click',function(e){ e.stopPropagation(); set(p.hidden); }); p.addEventListener('click',function(e){ e.stopPropagation(); });
    document.addEventListener('click',function(){ set(false); }); document.addEventListener('keydown',function(e){ if(e.key==='Escape') set(false); }); })();
  var pill=document.getElementById('where-pill'); pill.textContent=D.__gated?'Читаю: гл. '+lab(R):'1887–1967 · 46 глав';
  pill.addEventListener('click',function(){ go('chapter',D.__gated?R:1); });
  (function(){ var sel=document.getElementById('read-sel');
    for(var i=1;i<=ALL;i++){ var o=document.createElement('option'); o.value=String(i); o.textContent=(i===ALL?'до конца (всё открыто)':'гл. '+lab(i)+' · '+D.chapters[i-1].title.slice(0,28)+(D.chapters[i-1].title.length>28?'…':'')); sel.appendChild(o); }
    sel.value=String(R); sel.addEventListener('change',function(){ try{ if(+sel.value>=ALL) localStorage.removeItem('yus-read'); else localStorage.setItem('yus-read',sel.value); }catch(e){} location.reload(); });
    document.getElementById('read-note').textContent=D.__gated?'Скрыто всё, что после главы '+lab(R)+'. Справки о людях и Заключение откроются в конце.':'Иван книгу прочитал, поэтому открыто всё. Читаете сами? Выберите главу, и дальнейшее скроется.';
  })();

  // карточка цитаты
  function quoteCard(q){
    var c=el('article','q'+(q.themes.indexOf('claude')>-1?' claude':''));
    c.appendChild(el('blockquote',null,'«'+q.text+'»'));
    var m=el('div','meta'); var a=chLink(q.ch); m.appendChild(a);
    q.themes.forEach(function(t){ m.appendChild(el('span',t==='claude'?'tag claude':'tag',T[t]||t)); }); c.appendChild(m);
    if(q.context||q.comment){
      var d=el('details','more'); d.appendChild(el('summary',null,'Контекст и комментарий')); var w=el('div','notes');
      if(q.context){ var p=el('p'); p.appendChild(el('b',null,'Контекст. ')); p.appendChild(document.createTextNode(q.context)); w.appendChild(p); }
      if(q.comment){ var p2=el('p'); p2.appendChild(el('b',null,'Комментарий. ')); p2.appendChild(document.createTextNode(q.comment)); w.appendChild(p2); }
      d.appendChild(w); c.appendChild(d);
    }
    return c;
  }
  var sorted=D.quotes.slice().sort(function(a,b){ return a.ord-b.ord; });

  // ДНЕВНИК ИВАНА: текст с простым markdown (списки «- », ссылки <url>)
  function richP(t,box){
    var ul=null;
    t.forEach(function(s){
      if(/^- /.test(s)){ if(!ul){ ul=el('ul','jl'); box.appendChild(ul); } ul.appendChild(inline(el('li'),s.slice(2))); return; }
      ul=null; box.appendChild(inline(el('p'),s));
    });
  }
  function inline(node,s){
    var re=/\(?<(https?:\/\/[^>]+)>\)?|\*\*([^*]+)\*\*/g, last=0, m;
    while((m=re.exec(s))){ node.appendChild(document.createTextNode(s.slice(last,m.index)));
      if(m[1]){ var a=el('a','src-link','↗ источник'); a.href=m[1]; a.target='_blank'; a.rel='noopener'; node.appendChild(a); }
      else node.appendChild(el('b',null,m[2]));
      last=m.index+m[0].length; }
    node.appendChild(document.createTextNode(s.slice(last))); return node;
  }
  var JE=D.diary.entries;
  function jTitle(e){ return e.n<=28?'Бранч '+e.n:'Постскриптум '+['первый','второй','третий'][e.n-29]; }
  function jEntry(e,open,segFilter){
    var d=el('details','card jstory brunch'); d.id='b-'+e.n; if(open) d.open=true;
    var sm=el('summary'), h=el('div','jtop'); h.appendChild(el('span','jdate',jTitle(e)));
    if(e.ch){ var cs=el('span','chl',rangeLab(e.ch)); h.appendChild(cs); }
    sm.appendChild(h); var first=(e.segs[0].p[0]||''); var lead=first.length>140?first.slice(0,first.lastIndexOf(' ',140))+'…':first;
    sm.appendChild(el('p','jlead',lead)); sm.appendChild(el('span','wchev','+')); d.appendChild(sm);
    var b=el('div','jbody');
    e.segs.forEach(function(s){ if(segFilter&&!segFilter(s)) return; richP(s.p,b);
      if(s.read){ var r=el('p','jread',s.read); if(s.ch){ r.appendChild(document.createTextNode(' · ')); nums(s.ch).forEach(function(n,i){ if(n>R) return; if(i) r.appendChild(document.createTextNode(' ')); r.appendChild(chLink(n)); }); } b.appendChild(r); } });
    var ps=bPics(e.n); if(ps.length){ var st=el('div','bpics'); ps.forEach(function(x){ var f=figure(x.img); var fc=f.querySelector('figcaption'); fc.insertBefore(el('span',null,x.t),fc.firstChild); st.appendChild(f); }); b.appendChild(st); }
    d.appendChild(b); return d;
  }
  // фото к бранчу: из энциклопедии Ивана и с его карты, без повторов
  function bPics(n){ var IVd=D.ivan||{}, seen={}, out=[];
    (IVd.enc||[]).map(function(x){ return [x.b,x.title,x.img]; }).concat(((D.maps||{}).ivan||{points:[]}).points.map(function(x){ return [x.b,x.name,x.img]; }))
      .forEach(function(x){ if(x[0]!==n||!x[2]||!x[2].src||seen[x[2].src]) return; seen[x[2].src]=1; out.push({t:x[1],img:x[2]}); });
    return out.slice(0,3); }
  (function(){ var jl=document.getElementById('j-list'), jc=document.getElementById('j-chips');
    var groups=[['Книга первая',function(e){ var n=nums(e.ch); return n.length&&n[0]<=27; }],['Книга вторая',function(e){ var n=nums(e.ch); return n.length&&n[0]>27; }],['Постскриптумы',function(e){ return !e.ch; }]];
    groups.forEach(function(g,i){ var es=JE.filter(g[1]); if(!es.length) return;
      var b=el('a','chip',g[0]); b.href='#brunch'; b.appendChild(el('span','n',String(es.length))); b.addEventListener('click',function(ev){ ev.preventDefault(); var t=document.getElementById('jg-'+i); if(t) t.scrollIntoView({block:'start',behavior:'smooth'}); }); jc.appendChild(b);
      var hd=el('p','jgroup',g[0]); hd.id='jg-'+i; jl.appendChild(hd); es.forEach(function(e,k){ jl.appendChild(jEntry(e,i===0&&k===0)); }); });
  })();

  // МИР ИВАНА: вкладки внутри «Бранчей»
  var IV=D.ivan||{};
  function bLink(n){ var a=el('a','chl blink','бранч '+n); a.href='#b-'+n; return a; }
  (function(){ var tabs=document.getElementById('b-tabs'); if(!tabs) return;
    var defs=[['diary','Дневник',JE.length],['mornings','Утро за утром',(IV.mornings||[]).length],['echo','Переклички',(IV.echo||[]).length],['enc','Энциклопедия',(IV.enc||[]).length],['shelf','Полка',(IV.shelf||[]).length],['notes','Что заметил Иван',(IV.notes||[]).length],['map','Карта',D.maps&&D.maps.ivan?D.maps.ivan.points.length:0]];
    var built={};
    function bshow(id,save){ defs.forEach(function(d){ var on=d[0]===id; document.getElementById('bp-'+d[0]).hidden=!on; var b=document.getElementById('bt-'+d[0]); if(b) b.setAttribute('aria-pressed',on?'true':'false'); });
      if(!built[id]&&BUILD[id]){ built[id]=1; BUILD[id](document.getElementById('bp-'+id)); }
      if(save){ try{ localStorage.setItem('yus-btab',id); }catch(e){} } }
    defs.forEach(function(d){ if(!d[2]) return; var b=el('button','chip',d[1]); b.type='button'; b.id='bt-'+d[0]; b.appendChild(el('span','n',String(d[2]))); b.addEventListener('click',function(){ bshow(d[0],true); }); tabs.appendChild(b); });
    var MV=(IV.mornings||[]).filter(function(m){ return JE.some(function(e){ return e.n===m.b; }); });
    var BUILD={
      mornings:function(p){ p.appendChild(el('p','lead bp-lead','28 утр по порядку: где Иван читал, какая была погода, что творилось вокруг стола. Полоса — сколько страниц из 428 уже позади.'));
        var ol=el('ol','mlist'); MV.forEach(function(m){ var li=el('li','card mcard2'); var top=el('div','mtop'); top.appendChild(bLink(m.b)); var e=JE.filter(function(x){ return x.n===m.b; })[0]; if(e&&e.ch) top.appendChild(el('span','chl',rangeLab(e.ch)));
          li.appendChild(top); var bar=el('div','mbar'); var tr=el('span','mtrack'), i=el('i'); i.style.width=Math.round(100*m.pages/428)+'%'; tr.appendChild(i); bar.appendChild(tr); bar.appendChild(el('span',null,m.pages+' стр.')); li.appendChild(bar);
          function row(k,v){ if(!v||v==='—') return; var r=el('p','mrow'); r.appendChild(el('b',null,k+' ')); r.appendChild(document.createTextNode(v)); li.appendChild(r); }
          row('Где.',m.where); row('Погода.',m.sky); row('Вокруг.',m.scene); row('Настроение.',m.mood); ol.appendChild(li); }); p.appendChild(ol); },
      echo:function(p){ p.appendChild(el('p','lead bp-lead','Где утро Ивана перекликается с главой Феликса. Слева Иван, справа Феликс, внизу — что их связывает (наша трактовка).'));
        (IV.echo||[]).filter(function(x){ return x.ch<=R; }).forEach(function(x){ var c=el('article','card echo'); var g=el('div','echo-g');
          var a=el('div','echo-i'); var ah=el('div','mtop'); ah.appendChild(el('span','rl','Иван')); ah.appendChild(bLink(x.b)); a.appendChild(ah); a.appendChild(el('blockquote',null,'«'+x.ivan+'»')); g.appendChild(a);
          var b=el('div','echo-f'); var bh=el('div','mtop'); bh.appendChild(el('span','rl','Феликс')); bh.appendChild(chLink(x.ch)); b.appendChild(bh); b.appendChild(el('p',null,x.felix)); g.appendChild(b); c.appendChild(g);
          var br=el('p','echo-b'); br.appendChild(el('span','kind reading','Трактовка')); br.appendChild(document.createTextNode(' '+x.bridge)); c.appendChild(br); p.appendChild(c); }); },
      enc:function(p){ p.appendChild(el('p','lead bp-lead','Что Иван подсвечивает сам: его «матчасть», места, люди и книги из его мира, параллели с сегодняшним днём и то, что стояло на столе. Сначала его слова, ниже, отдельно, — наша справка.'));
        var cats=IV.cats||{}; Object.keys(cats).forEach(function(k){ var its=(IV.enc||[]).filter(function(x){ return x.cat===k; }); if(!its.length) return;
          p.appendChild(el('p','jgroup',cats[k])); var w=el('div','enc');
          its.forEach(function(x){ var c=el('article','card enc-c'); if(x.img&&x.img.src) c.appendChild(figure(x.img)); var t=el('div','mtop'); t.appendChild(el('h3',null,x.title)); t.appendChild(bLink(x.b)); c.appendChild(t);
            c.appendChild(el('blockquote',null,'«'+x.ivan+'»')); if(x.note){ var n=el('p','enc-n'); n.appendChild(el('span','kind fact','Справка')); n.appendChild(document.createTextNode(' '+x.note)); c.appendChild(n); } w.appendChild(c); }); p.appendChild(w); }); },
      shelf:function(p){ p.appendChild(el('p','lead bp-lead','Список литературы Ивана из постскриптума: книги, которые всплывали в разговорах с князем. Под каждой — почему она связана с мемуарами.'));
        var w=el('div','shelf'); (IV.shelf||[]).forEach(function(x){ var c=el('article','card book'); if(x.img&&x.img.src) c.appendChild(figure(x.img)); c.appendChild(el('b','bk-t',x.t)); c.appendChild(el('span','bk-a',x.a)); c.appendChild(el('p',null,x.why)); var m=el('div','mtop'); m.appendChild(bLink(x.b)); if(x.ch&&x.ch<=R) m.appendChild(chLink(x.ch)); c.appendChild(m); w.appendChild(c); }); p.appendChild(w); },
      notes:function(p){ p.appendChild(el('p','lead bp-lead','Сквозные темы, к которым Иван возвращается в разных бранчах.'));
        (IV.notes||[]).forEach(function(x){ var c=el('article','card note'); c.appendChild(el('h3',null,x.title)); c.appendChild(el('blockquote',null,'«'+x.ivan+'»')); var m=el('div','mtop'); x.b.forEach(function(n){ m.appendChild(bLink(n)); }); c.appendChild(m); p.appendChild(c); }); },
      map:function(p){ p.appendChild(mapBlock('ivan',D.maps.ivan,function(pt){ return [bLink(pt.b)]; })); }
    };
    window.__bshow=bshow;
    var sv=null; try{ sv=localStorage.getItem('yus-btab'); }catch(e){} bshow(sv&&document.getElementById('bt-'+sv)?sv:'diary');
  })();

  // КАРТЫ: Leaflet подгружается по требованию, подложка Esri Canvas (светлая/тёмная по теме)
  var LL=null;
  function loadLeaflet(){ if(LL) return LL; LL=new Promise(function(ok,no){ var c=document.createElement('link'); c.rel='stylesheet'; c.href='vendor/leaflet/leaflet.css'; document.head.appendChild(c);
    var s=document.createElement('script'); s.src='vendor/leaflet/leaflet.js'; s.onload=function(){ ok(window.L); }; s.onerror=no; document.head.appendChild(s); }); return LL; }
  function isDark(){ var t=document.documentElement.getAttribute('data-theme'); return t==='dark'||t==='night'||(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches); }
  function mapBlock(id,M,links){
    var blk=el('div','block map-block'); blk.id='map-'+id; var hd=el('header'); hd.appendChild(el('h3',null,M.title)); if(M.lead) hd.appendChild(el('p','lead',M.lead)); blk.appendChild(hd);
    var wrap=el('div','map-wrap'), box=el('div','lmap'); wrap.appendChild(box); var ol=el('ol','map-legend'); wrap.appendChild(ol); blk.appendChild(wrap);
    var pts=M.points.filter(function(p){ return !p.ch||p.ch<=R; }).sort(function(a,b){ return (a.ch||a.b||0)-(b.ch||b.b||0); }), marks=[];
    pts.forEach(function(p,i){ var li=el('li'); li.dataset.n=i+1; li.tabIndex=0; li.appendChild(el('span','pin',String(i+1))); var t=el('div'); if(p.img&&p.img.src){ var th=el('img','lthumb'); th.src=p.img.src; th.alt=''; th.loading='lazy'; th.addEventListener('error',function(){ th.remove(); }); t.appendChild(th); } t.appendChild(el('b',null,p.name)); t.appendChild(document.createTextNode(' '+p.text)); var w=el('span','chs'); (p.ch?[chLink(p.ch)]:links(p)).forEach(function(a){ w.appendChild(a); }); t.appendChild(w); li.appendChild(t); ol.appendChild(li); });
    loadLeaflet().then(function(L){
      var map=L.map(box,{scrollWheelZoom:false,attributionControl:true}); var dark=isDark();
      // Esri Canvas: без ключа, серая (светлая/тёмная по теме); если не грузится — OSM, обесцвеченная CSS
      var ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_'+(dark?'Dark':'Light')+'_Gray_', at='© Esri, HERE, OpenStreetMap';
      var base=L.tileLayer(ESRI+'Base/MapServer/tile/{z}/{y}/{x}',{attribution:at,maxZoom:16}).addTo(map), ref=L.tileLayer(ESRI+'Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:16}).addTo(map), bad=0;
      base.on('tileerror',function(){ if(++bad!==4) return; map.removeLayer(base); map.removeLayer(ref); box.classList.add('osm');
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:18}).addTo(map); });
      var line=[]; pts.forEach(function(p,i){ var m=L.marker(p.ll,{icon:L.divIcon({className:'lpin',html:'<span>'+(i+1)+'</span>',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(map); m.on('click',function(){ hl(i+1,false); }); marks.push(m); line.push(p.ll); });
      if(id==='felix') L.polyline(line,{color:dark?'#bbb':'#555',weight:1,opacity:.6,dashArray:'3 5'}).addTo(map);
      map.fitBounds(L.latLngBounds(line).pad(.1)); blk.__map=map;
      function hl(n,fly){ Array.prototype.forEach.call(ol.children,function(li){ li.classList.toggle('on',li.dataset.n===String(n)); }); marks.forEach(function(m,i){ var e=m.getElement(); if(e) e.classList.toggle('on',i+1===n); });
        if(fly) map.flyTo(pts[n-1].ll,Math.max(map.getZoom(),6),{duration:.6}); else { var li=ol.querySelector('li[data-n="'+n+'"]'); if(li) li.scrollIntoView({block:'nearest',behavior:'smooth'}); } }
      ol.addEventListener('click',function(e){ var li=e.target.closest('li'); if(li&&!e.target.closest('a')) hl(+li.dataset.n,true); });
      ol.addEventListener('keydown',function(e){ var li=e.target.closest('li'); if(li&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); hl(+li.dataset.n,true); } });
      setTimeout(function(){ map.invalidateSize(); map.fitBounds(L.latLngBounds(line).pad(.1)); },60);
    }).catch(function(){ box.textContent='Карта не загрузилась.'; });
    return blk;
  }

  // ГЛАВА
  var chState=1, cpGrid=document.getElementById('cp-grid'), cpOpen=document.getElementById('cp-open');
  PARTS.forEach(function(P){ var h=el('div','cp-part'); h.appendChild(el('b',null,P.name)); h.appendChild(el('span',null,P.years)); cpGrid.appendChild(h);
    for(var k=P.a;k<=P.b;k++){ (function(k){ var b=el('button','cp-cell',String(k-P.a+1)); b.type='button'; b.id='cp-'+k;
      if(k<=MAXCH){ b.title=D.chapters[k-1].title; b.addEventListener('click',function(){ setGrid(false); go('chapter',k); }); } else { b.disabled=true; b.title='Ещё не прочитано'; }
      cpGrid.appendChild(b); })(k); } });
  (function(){ var f=el('div','cp-part cp-front'); Object.keys(D.front).forEach(function(k){ var a=el('a','chip',D.front[k].title); a.href='#front-'+k; a.addEventListener('click',function(){ setGrid(false); }); f.appendChild(a); }); cpGrid.appendChild(f); })();
  function setGrid(v){ cpGrid.hidden=!v; cpOpen.setAttribute('aria-expanded',v?'true':'false'); }
  cpOpen.addEventListener('click',function(){ setGrid(cpGrid.hidden); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') setGrid(false); });
  ['cp-prev','ch-prev'].forEach(function(id){ document.getElementById(id).addEventListener('click',function(){ go('chapter',chState-1); }); });
  ['cp-next','ch-next'].forEach(function(id){ document.getElementById(id).addEventListener('click',function(){ go('chapter',chState+1); }); });
  var lane={felix:'var(--lupine)',rod:'var(--poppy)',history:'var(--valley)'};
  function tlItem(e,withCh){ var li=el('li'); li.style.setProperty('--c',lane[e.lane]||'var(--muted)');
    li.appendChild(el('div','when',e.when)); li.appendChild(el('div','dot'));
    var wt=el('div','what'); wt.appendChild(document.createTextNode(e.text)); if(withCh){ var s=el('span','src'); s.appendChild(chLink(e.ch)); wt.appendChild(s); } li.appendChild(wt); return li; }
  function renderChapter(n){
    chState=n; var c=D.chapters[n-1], P=partOf(n);
    Array.prototype.forEach.call(cpGrid.querySelectorAll('.cp-cell'),function(b){ if(b.id==='cp-'+n) b.setAttribute('aria-current','true'); else b.removeAttribute('aria-current'); });
    document.getElementById('cp-label').textContent='Глава '+lab(n)+' · '+n+' из 46';
    document.getElementById('cp-prev').disabled=document.getElementById('ch-prev').disabled=n<=1;
    document.getElementById('cp-next').disabled=document.getElementById('ch-next').disabled=n>=MAXCH;
    document.getElementById('ch-eyebrow').textContent=P.name+' · глава '+(n-P.a+1)+(c.years?' · '+c.years:'');
    document.getElementById('ch-title').textContent=c.title;
    document.getElementById('ch-topics').textContent=c.topics;
    var su=document.getElementById('ch-summary'); su.textContent=''; c.summary.forEach(function(s){ su.appendChild(el('li',null,s)); });
    var fr=document.getElementById('ch-front'); fr.textContent='';
    function fl(k,t){ if(!D.front[k]) return; var a=el('a','more-link',t); a.href='#front-'+k; fr.appendChild(a); }
    if(n===1){ fl('preface','Предисловие внучки →'); fl('readers','«Моим читателям» →'); }
    if(n===ALL) fl('conclusion','Заключение издателей: что было после →');
    var cl=document.getElementById('ch-ctx'); cl.textContent=''; document.getElementById('ch-ctx-block').hidden=!c.context.length;
    c.context.forEach(function(it){ var li=el('li'); li.appendChild(el('span','kind '+it.kind,it.kind==='fact'?'Факт':'Трактовка')); li.appendChild(el('span',null,it.text)); cl.appendChild(li); });
    var qs=sorted.filter(function(q){ return q.ch===n; }), ql=document.getElementById('ch-quotes'); ql.textContent='';
    document.getElementById('ch-q-block').hidden=!qs.length; qs.forEach(function(q){ ql.appendChild(quoteCard(q)); });
    var ws=worldFor(n), wl=document.getElementById('ch-world'); wl.textContent=''; document.getElementById('ch-w-block').hidden=!ws.length; ws.forEach(function(x){ wl.appendChild(worldCard(x)); });
    var ts=D.timeline.filter(function(e){ return e.ch===n; }), tl=document.getElementById('ch-tl'); tl.textContent=''; document.getElementById('ch-t-block').hidden=!ts.length; ts.forEach(function(e){ tl.appendChild(tlItem(e,false)); });
    var js=JE.filter(function(e){ return nums(e.ch).indexOf(n)>-1; }), jl=document.getElementById('ch-journal'); jl.textContent='';
    document.getElementById('ch-j-block').hidden=!js.length;
    js.forEach(function(e){ jl.appendChild(jEntry(e,true,function(s){ return !s.ch||nums(s.ch).indexOf(n)>-1; })); });
    (IV.echo||[]).filter(function(x){ return x.ch===n; }).forEach(function(x){ var c=el('article','card echo'); var t=el('div','mtop'); t.appendChild(el('span','rl','Перекличка')); t.appendChild(bLink(x.b)); c.appendChild(t);
      c.appendChild(el('blockquote',null,'«'+x.ivan+'»')); var br=el('p','echo-b'); br.appendChild(el('span','kind reading','Трактовка')); br.appendChild(document.createTextNode(' '+x.bridge)); c.appendChild(br); jl.appendChild(c); document.getElementById('ch-j-block').hidden=false; });
    var pb=document.getElementById('ch-people'); pb.textContent=''; var ps=PROF.filter(function(p){ return p.ev.some(function(e){ return e.ch===n; }); });
    document.getElementById('ch-p-block').hidden=!ps.length; ps.forEach(function(p){ var a=el('a','chip',p.name); a.href='#p-'+p.id; pb.appendChild(a); });
  }

  // ЦИТАТЫ
  var active='all'; try{ var sv=localStorage.getItem('yus-qtheme'); if(sv&&(sv==='all'||T[sv])) active=sv; }catch(e){}
  var qchips=document.getElementById('q-chips'), qlist=document.getElementById('qlist');
  function count(k){ return k==='all'?D.quotes.length:D.quotes.filter(function(q){ return q.themes.indexOf(k)>-1; }).length; }
  function renderQuotes(){
    qchips.textContent='';
    ['all'].concat(Object.keys(T)).forEach(function(k){ var n=count(k); if(!n) return;
      var b=el('button','chip',k==='all'?'Все':T[k]); b.type='button'; b.appendChild(el('span','n',String(n)));
      b.setAttribute('aria-pressed',k===active?'true':'false');
      b.addEventListener('click',function(){ active=k; try{ localStorage.setItem('yus-qtheme',k); }catch(e){} renderQuotes(); });
      qchips.appendChild(b); });
    qlist.textContent='';
    sorted.filter(function(q){ return active==='all'||q.themes.indexOf(active)>-1; }).forEach(function(q){ qlist.appendChild(quoteCard(q)); });
  }
  renderQuotes();

  // ЛЮДИ
  var PROF=D.profiles, PID={}; PROF.forEach(function(p){ PID[p.id]=p; });
  var GROUPS=[]; PROF.forEach(function(p){ if(GROUPS.indexOf(p.group)<0) GROUPS.push(p.group); });
  var GCLS=['g-ham','g-tra','g-ames','g-row','g-oth','g-oth','g-oth'];
  var pg=document.getElementById('prof-grid'), cq=document.getElementById('cast-q'), jump=document.getElementById('cast-jump');
  GROUPS.forEach(function(g,i){ var n=PROF.filter(function(p){ return p.group===g; }).length; var b=el('a','chip',g); b.href='#people'; b.appendChild(el('span','n',String(n)));
    b.addEventListener('click',function(e){ e.preventDefault(); var t=document.getElementById('pg-'+i); if(t) t.scrollIntoView({block:'start',behavior:'smooth'}); }); jump.appendChild(b); });
  function renderCast(){ var f=(cq.value||'').trim().toLowerCase(); pg.textContent=''; var any=false;
    GROUPS.forEach(function(g,i){ var ps=PROF.filter(function(p){ return p.group===g&&(!f||(p.name+' '+p.short).toLowerCase().indexOf(f)>-1); }); if(!ps.length) return; any=true;
      var w=el('section','pg '+GCLS[i]); w.id='pg-'+i; w.appendChild(el('h3','pg-h',g)); var grid=el('div','pg-grid');
      ps.forEach(function(p){ var a=el('a','card pcard'); a.href='#p-'+p.id; a.appendChild(el('b',null,p.name)); a.appendChild(el('span',null,p.short)); var cs=el('span','pc-ch',p.ev.length?(p.ev.length===1?'гл. '+lab(p.ev[0].ch):p.ev.length+' '+plural(p.ev.length,'глава','главы','глав')):''); a.appendChild(cs); grid.appendChild(a); });
      w.appendChild(grid); pg.appendChild(w); });
    if(!any) pg.appendChild(el('p','empty','Никого не нашлось. Попробуйте имя или роль: «балерина», «адвокат».')); }
  function plural(n,a,b,c){ var m=n%10, h=n%100; return (m===1&&h!==11)?a:(m>=2&&m<=4&&(h<12||h>14))?b:c; }
  cq.addEventListener('input',renderCast); renderCast();

  function patRe(p){ try{ return p.pat?new RegExp(p.pat):null; }catch(e){ return null; } }
  function renderPerson(id){ var box=document.getElementById('person'); box.textContent=''; var p=PID[id];
    if(!p){ box.appendChild(el('p','empty','Такого человека в справке нет.')); return; }
    var hd=el('div','block p-head'); var back=el('a','more-link','← Все люди'); back.href='#people'; hd.appendChild(back);
    hd.appendChild(el('p','eyebrow',p.group)); hd.appendChild(el('h2',null,p.name)); if(p.short) hd.appendChild(el('p','lead',p.short));
    var cc=el('div','p-chs'); cc.appendChild(el('span','rl','В главах')); p.ev.forEach(function(e){ cc.appendChild(chLink(e.ch)); }); hd.appendChild(cc); box.appendChild(hd);
    if(p.bio.length){ var bio=el('div','block'); bio.appendChild(el('h3',null,'Кто это')); var bc=el('div','card p-bio'); p.bio.forEach(function(t){ bc.appendChild(el('p',null,t)); }); bio.appendChild(bc); box.appendChild(bio); }
    if(p.ev.length){ var eb=el('div','block'); eb.appendChild(el('h3',null,'По главам')); var ol=el('ol','p-ev card');
      p.ev.forEach(function(e){ var li=el('li'); li.appendChild(chLink(e.ch)); li.appendChild(el('span',null,e.t)); ol.appendChild(li); }); eb.appendChild(ol); box.appendChild(eb); }
    var re=patRe(p);
    var qs=re?sorted.filter(function(q){ return re.test(q.text)||re.test(q.context||''); }):[];
    if(qs.length){ var qb=el('div','block'); qb.appendChild(el('h3',null,'Цитаты ('+qs.length+')')); var ql=el('div','quotes'); qs.forEach(function(q){ ql.appendChild(quoteCard(q)); }); qb.appendChild(ql); box.appendChild(qb); }
    var ws=[]; D.world.forEach(function(s){ s.items.forEach(function(x){ if(re&&re.test(x.title)) ws.push(x); }); });
    if(ws.length){ var wb=el('div','block'); wb.appendChild(el('h3',null,'В «Мире»')); var wl=el('div','wlist'); ws.forEach(function(x){ wl.appendChild(worldCard(x)); }); wb.appendChild(wl); box.appendChild(wb); }
  }

  // РОД
  (function(){ var Rd=D.rod, box=document.getElementById('rod-tree'); document.getElementById('rod-lead').textContent=Rd.lead;
    function pcard(x,cls){ var d=el(x.id&&PID[x.id]?'a':'div','p '+cls); if(x.id&&PID[x.id]) d.href='#p-'+x.id; d.appendChild(el('strong',null,x.n)); if(x.d) d.appendChild(el('span',null,x.d)); return d; }
    function gen(x,cls){ var g=el('div','gen'), c=el('div','couple'); c.appendChild(pcard(x,cls)); if(x.sp){ c.appendChild(el('span','eq','⚭')); c.appendChild(pcard({n:x.sp},cls+' sp')); } g.appendChild(c); return g; }
    var a=el('article','fam'); a.appendChild(el('h3',null,'Юсуповы')); a.lastChild.appendChild(el('small',null,'от ногайских ханов к князьям'));
    Rd.line.forEach(function(x){ a.appendChild(gen(x,'ham')); }); box.appendChild(a);
    var b=el('article','fam'); b.appendChild(el('h3',null,'Эльстоны')); b.lastChild.appendChild(el('small',null,'отцовская линия'));
    Rd.elston.forEach(function(x){ b.appendChild(gen(x,'tra')); }); box.appendChild(b);
    var c=el('article','fam fam-wide'); c.appendChild(el('h3',null,'Дети и потомки')); c.lastChild.appendChild(el('small',null,'Зинаида Николаевна ⚭ Феликс Сумароков-Эльстон'));
    var g=el('div','gen'), cp=el('div','couple'); Rd.kids.forEach(function(x){ var w=el('div','kid'); var cc=el('div','couple'); cc.appendChild(pcard(x,'ham')); if(x.sp){ cc.appendChild(el('span','eq','⚭')); cc.appendChild(pcard({n:x.sp,id:'irina'},'tra')); } w.appendChild(cc); cp.appendChild(w); }); g.appendChild(cp); c.appendChild(g);
    Rd.down.forEach(function(x){ c.appendChild(gen(x,'ham')); });
    c.appendChild(el('p','fam-note','Внучка Ксения — автор предисловия к этому изданию. Род Юсуповых по мужской линии пресёкся на Феликсе.')); box.appendChild(c);
    document.getElementById('rod-scheme').appendChild(figure({src:'img/book/i_001.jpg',full:'img/book/i_001.jpg',cap:'«Род Юсуповых»: схема из издания',credit:'из издания «Мемуаров»',color:true}));
    var ph=document.getElementById('rod-photos'); D.photos.forEach(function(x){ var f=figure({src:x.src,full:x.src,cap:x.cap,credit:'из издания «Мемуаров»'}); var cap=f.querySelector('figcaption'); cap.appendChild(chLink(x.ch)); ph.appendChild(f); });
  })();

  // ВРЕМЯ
  (function(){ var box=document.getElementById('dual');
    var H=D.timeline.filter(function(e){ return e.lane==='history'&&e.y; }), F=D.timeline.filter(function(e){ return e.lane!=='history'&&e.y; });
    var hd=el('div','dl-row dl-head'); hd.appendChild(el('span',null,'История')); hd.appendChild(el('span',null,'Феликс и семья')); box.appendChild(hd);
    var ys=D.timeline.filter(function(e){ return e.y; }).map(function(e){ return e.y; }); var y0=Math.floor(Math.min.apply(null,ys)/10)*10, y1=Math.max.apply(null,ys);
    var pre=D.timeline.filter(function(e){ return e.y&&e.y<1850; });
    function item(e,cls){ var it=el('div','dl-it '+cls); it.appendChild(el('span','dl-w',e.when)); it.appendChild(el('span','dl-t',e.text)); it.appendChild(chLink(e.ch)); return it; }
    function row(title,hs,fs){ if(!hs.length&&!fs.length) return; box.appendChild(el('div','dl-dec',title)); var r=el('div','dl-row'), L=el('div','dl-col dl-h'), Rc=el('div','dl-col dl-n');
      hs.forEach(function(e){ L.appendChild(item(e,'lane-valley')); }); fs.forEach(function(e){ Rc.appendChild(item(e,e.lane==='rod'?'lane-ham':'lane-tra')); });
      if(!hs.length) L.appendChild(el('span','dl-empty','—')); if(!fs.length) Rc.appendChild(el('span','dl-empty','—')); r.appendChild(L); r.appendChild(Rc); box.appendChild(r); }
    if(pre.length) row('До 1850',H.filter(function(e){ return e.y<1850; }),F.filter(function(e){ return e.y<1850; }));
    for(var d=Math.max(y0,1850);d<=y1;d+=10){ (function(d){ row(d+'-е',H.filter(function(e){ return e.y>=d&&e.y<d+10; }),F.filter(function(e){ return e.y>=d&&e.y<d+10; })); })(d); }
    var tl=document.getElementById('tl'); D.timeline.forEach(function(e){ tl.appendChild(tlItem(e,true)); });
    // кто в какой главе
    var sw=document.getElementById('swim-people'), rows=PROF.filter(function(p){ return p.ev.length>=3; }).sort(function(a,b){ return a.ev[0].ch-b.ev[0].ch; });
    var head=el('div','sw-row sw-head'); head.appendChild(el('span','sw-l','')); var hc=el('div','sw-cells'); hc.style.setProperty('--n',MAXCH);
    for(var c=1;c<=MAXCH;c++) hc.appendChild(el('span','sw-n'+(c===28?' ps':''),c===1?'I':c===28?'II':'')); head.appendChild(hc); sw.appendChild(head);
    rows.forEach(function(p){ var r=el('div','sw-row'); var l=el('a','sw-l nolink',p.name); l.href='#p-'+p.id; r.appendChild(l); var cells=el('div','sw-cells'); cells.style.setProperty('--n',MAXCH);
      var on={}; p.ev.forEach(function(e){ on[e.ch]=1; });
      for(var c=1;c<=MAXCH;c++){ var ps=c===28?' ps':''; if(on[c]){ var x=el('a','sw-c on'+ps); x.href='#ch-'+c; x.title='гл. '+lab(c); x.setAttribute('aria-label',p.name+', гл. '+lab(c)); cells.appendChild(x); } else cells.appendChild(el('span','sw-c'+ps)); }
      r.appendChild(cells); sw.appendChild(r); });
  })();

  // МИР
  var COM='https://commons.wikimedia.org/wiki/';
  function figure(im){
    var f=el('figure','wimg'+(im.color?' color':'')), a=el('a'), page=im.page||(im.file&&!/^img\//.test(im.file)?COM+'File:'+encodeURIComponent(im.file.replace(/ /g,'_')):null);
    a.href=im.full||im.src; a.addEventListener('click',function(e){ e.preventDefault(); openLb(im,page); });
    var img=el('img'); img.loading='lazy'; img.decoding='async'; img.alt=im.cap||''; img.src=im.src;
    img.addEventListener('error',function(){ f.remove(); }); a.appendChild(img); f.appendChild(a);
    var fc=el('figcaption'); if(im.cap) fc.appendChild(el('span',null,im.cap));
    var cr=el(page?'a':'span','credit',im.credit||'Wikimedia Commons'); if(page){ cr.href=page; cr.target='_blank'; cr.rel='noopener'; } fc.appendChild(cr); f.appendChild(fc);
    return f;
  }
  var lb=null;
  function openLb(im,page){
    if(!lb){ lb=el('div','lb'); lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true');
      lb.innerHTML='<button class="lb-x" type="button" aria-label="Закрыть">✕</button><img alt=""><div class="lb-cap"><span></span><a target="_blank" rel="noopener"></a></div>';
      lb.addEventListener('click',function(e){ if(e.target.closest('a')) return; closeLb(); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&lb&&!lb.hidden) closeLb(); });
      document.body.appendChild(lb); }
    var img=lb.querySelector('img'); img.src=im.full||im.src; img.alt=im.cap||'';
    lb.querySelector('.lb-cap span').textContent=im.cap||''; var cr=lb.querySelector('.lb-cap a'); cr.textContent=im.credit||'Wikimedia Commons'; if(page) cr.href=page; else cr.removeAttribute('href');
    lb.hidden=false; document.documentElement.style.overflow='hidden';
  }
  function closeLb(){ lb.hidden=true; lb.querySelector('img').removeAttribute('src'); document.documentElement.style.overflow=''; }
  function worldCard(x){
    var c=el('article','card wcard'); var top=el('div','wtop'); top.appendChild(el('span','when',x.when)); top.appendChild(chLink(x.ch));
    c.appendChild(top); c.appendChild(el('h3',null,x.title)); c.appendChild(el('p',null,x.text));
    if(x.img&&x.img.src) c.insertBefore(figure(x.img),c.firstChild);
    return c;
  }
  function worldRow(x){
    var d=el('details','card wrow'); var s=el('summary');
    if(x.img&&x.img.src){ var th=el('img','wthumb'); th.loading='lazy'; th.decoding='async'; th.alt=''; th.src=x.img.src; th.addEventListener('error',function(){ th.remove(); }); s.appendChild(th); }
    var h=el('div','wrow-h'); var top=el('div','wtop'); top.appendChild(el('span','when',x.when)); top.appendChild(el('span','chl','гл. '+lab(x.ch)));
    h.appendChild(top); h.appendChild(el('h3',null,x.title)); s.appendChild(h); s.appendChild(el('span','wchev','+')); d.appendChild(s);
    var body=el('div','wrow-b'); d.appendChild(body); var filled=false;
    d.addEventListener('toggle',function(){ if(!d.open||filled) return; filled=true; var c=worldCard(x); while(c.firstChild){ var n=c.firstChild; c.removeChild(n); if(n.tagName==='H3') continue; body.appendChild(n); } });
    return d;
  }
  var W=D.world, wsec=document.getElementById('w-sections'), wch=document.getElementById('w-chips');
  function worldFor(n){ var out=[]; W.forEach(function(s){ s.items.forEach(function(x){ if(x.ch===n) out.push(x); }); }); return out; }
  var panels={}, wbtn={};
  function addTab(id,title,cnt,build){
    var b=el('button','chip',title); b.type='button'; b.setAttribute('aria-pressed','false'); b.appendChild(el('span','n',String(cnt)));
    b.addEventListener('click',function(){ wshow(id,true); }); wch.appendChild(b); wbtn[id]=b;
    var p=el('div','wpanel'); p.hidden=true; p.dataset.build='1'; panels[id]={el:p,build:build}; wsec.appendChild(p);
  }
  function wshow(id,save){ if(!panels[id]) id=Object.keys(panels)[0];
    Object.keys(panels).forEach(function(k){ var P=panels[k], on=k===id; P.el.hidden=!on; wbtn[k].setAttribute('aria-pressed',on?'true':'false');
      if(on&&P.el.dataset.build){ delete P.el.dataset.build; P.build(P.el); } });
    if(save){ try{ localStorage.setItem('yus-wsec',id); }catch(e){} }
  }
  W.forEach(function(s){ addTab(s.id,s.title,s.items.length,function(p){ var blk=el('div','block'); if(s.lead){ var hd=el('header'); hd.appendChild(el('p','lead',s.lead)); blk.appendChild(hd); }
    var l=el('div','wrows'); s.items.forEach(function(x){ l.appendChild(worldRow(x)); }); blk.appendChild(l); p.appendChild(blk); }); });
  if(D.maps&&D.maps.felix) addTab('map','Карта',D.maps.felix.points.filter(function(p){ return p.ch<=R; }).length,function(p){ p.appendChild(mapBlock('felix',D.maps.felix)); });
  var wsaved=null; try{ wsaved=localStorage.getItem('yus-wsec'); }catch(e){}
  wshow(wsaved||(W[0]&&W[0].id));

  // ПРЕДИСЛОВИЕ / МОИМ ЧИТАТЕЛЯМ / ЗАКЛЮЧЕНИЕ
  function renderFront(k){ var box=document.getElementById('front'); box.textContent=''; var F=D.front[k];
    if(!F){ box.appendChild(el('p','empty','Этот текст откроется, когда книга будет дочитана.')); return; }
    var b=el('div','block'); var hd=el('header'); hd.appendChild(el('p','eyebrow',F.by)); hd.appendChild(el('h2',null,F.title)); b.appendChild(hd);
    var c=el('div','card p-bio front-text'); F.p.forEach(function(t){ c.appendChild(el('p',null,t)); }); b.appendChild(c);
    var nav=el('div','front-links'); Object.keys(D.front).forEach(function(j){ if(j===k) return; var a=el('a','more-link',D.front[j].title+' →'); a.href='#front-'+j; nav.appendChild(a); });
    var a=el('a','more-link','К главе I·1 →'); a.href='#ch-1'; nav.appendChild(a); b.appendChild(nav); box.appendChild(b); }

  // АВТОССЫЛКИ: имена → справка, «гл. N» → глава
  var LP=PROF.filter(function(p){ return p.pat; }).map(function(p){ return {id:p.id,re:p.pat}; });
  var BIG=new RegExp('(гл\\.\\s?\\d+(?:[–-]\\d+)?)'+LP.map(function(x){ return '|('+x.re.replace(/\((?!\?)/g,'(?:')+')'; }).join(''),'g');
  var SKIP='A,BUTTON,INPUT,TEXTAREA,SCRIPT,STYLE,SUMMARY,H1,H2,NAV,SELECT,OPTION,LABEL,BLOCKQUOTE';
  function linkify(root,selfId){
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(t){ for(var e=t.parentNode;e&&e!==root.parentNode;e=e.parentNode){ if(e.nodeType===1&&(SKIP.indexOf(e.tagName)>-1||e.classList.contains('nolink')||e.classList.contains('jbody'))) return NodeFilter.FILTER_REJECT; } return /\S/.test(t.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT; }}), list=[];
    while(w.nextNode()) list.push(w.currentNode);
    list.forEach(function(t){ var s=t.nodeValue, last=0, frag=null, m; BIG.lastIndex=0;
      while((m=BIG.exec(s))){ if(!m[0]){ BIG.lastIndex++; continue; } var href=null;
        if(m[1]){ var n=nums(m[1])[0]; if(n<=MAXCH) href='#ch-'+n; }
        else { for(var i=0;i<LP.length;i++){ if(m[i+2]){ if(LP[i].id!==selfId) href='#p-'+LP[i].id; break; } } }
        if(!href) continue; if(!frag) frag=document.createDocumentFragment();
        frag.appendChild(document.createTextNode(s.slice(last,m.index))); var a=document.createElement('a'); a.className='auto'; a.href=href; a.textContent=m[0]; frag.appendChild(a); last=m.index+m[0].length; }
      if(frag){ frag.appendChild(document.createTextNode(s.slice(last))); t.parentNode.replaceChild(frag,t); } });
  }
  var curPerson=null;
  function linkAll(){ ['ch-summary','ch-ctx','ch-world','ch-quotes','ch-tl','tl','dual','w-sections','qlist','prof-grid'].forEach(function(id){ var r=document.getElementById(id); if(r) linkify(r,null); });
    var pr=document.getElementById('person'); if(pr) linkify(pr,curPerson); }
  var lt=null; new MutationObserver(function(){ if(lt) return; lt=setTimeout(function(){ lt=null; linkAll(); },30); }).observe(document.querySelector('main'),{childList:true,subtree:true}); linkAll();

  // МАРШРУТЫ: #chapter, #ch-3, #brunch, #b-5, #quotes, #people, #p-id, #rod, #time, #world, #front-preface
  var tabs=['chapter','brunch','quotes','people','rod','time','world','person','front'];
  function show(tab,n){
    tabs.forEach(function(t){ document.getElementById('v-'+t).hidden=(t!==tab); });
    var tb=tab==='person'?'people':tab==='front'?'chapter':tab;
    Array.prototype.forEach.call(document.querySelectorAll('nav.tabbar a'),function(a){ if(a.dataset.tab===tb) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    if(tab==='chapter') renderChapter(Math.min(Math.max(n||chState,1),MAXCH));
    if(tab==='person'){ curPerson=n; renderPerson(n); }
    if(tab==='front') renderFront(n);
  }
  function parse(){ var h=decodeURIComponent((location.hash||'').slice(1)), m;
    if((m=h.match(/^ch-(\d+)$/))) return ['chapter',+m[1]]; if((m=h.match(/^p-([a-z0-9_]+)$/))) return ['person',m[1]];
    if((m=h.match(/^front-([a-z]+)$/))) return ['front',m[1]]; if((m=h.match(/^b-(\d+)$/))) return ['brunch',+m[1]];
    if(tabs.indexOf(h)>-1) return [h,null]; return ['chapter',D.__gated?R:1]; }
  function go(tab,n){ var h=tab==='chapter'&&n?'ch-'+n:(tab==='person'?'p-'+n:tab); if(location.hash.slice(1)===h){ show(tab,n); } else { location.hash=h; } window.scrollTo(0,0); }
  function route(first){ var r=parse(); show(r[0],r[1]);
    if(r[0]==='brunch'&&r[1]){ if(window.__bshow) window.__bshow('diary'); var d=document.getElementById('b-'+r[1]); if(d){ d.open=true; d.scrollIntoView({block:'start'}); return; } }
    if(!first) window.scrollTo(0,0); }
  window.addEventListener('hashchange',function(){ route(false); });
  route(true);
}
  fetch('data.json?v='+Date.now(),{cache:'no-cache'}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(D){ var R=0; try{ R=+localStorage.getItem('yus-read')||0; }catch(e){} start(window.__yusGate(D,R)); })
    .catch(function(e){ console.error(e); var m=document.createElement('p'); m.className='wrap empty'; m.textContent='Не удалось загрузить данные ('+e.message+'). Обновите страницу.'; document.querySelector('main').prepend(m); });
})();
