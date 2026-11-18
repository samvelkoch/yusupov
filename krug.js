/* «Круг»: хордовая диаграмма. Имена по кругу (сгруппированы по кругам), ленты — общие абзацы/записи. По мотивам «На просвет». */
window.Krug=function(host,K,o){
  var NS='http://www.w3.org/2000/svg', NOD=K.nodes, EDG=K.edges, CL=K.clusters, ST={per:-1,cl:-1,sel:null,hov:null};
  function E(t,a,p){ var n=document.createElementNS(NS,t); for(var k in a) n.setAttribute(k,a[k]); if(p) p.appendChild(n); return n; }
  function h(t,c,x){ var n=document.createElement(t); if(c) n.className=c; if(x!=null) n.textContent=x; return n; }
  var SH=[1,.62,.4,.26,.16,.1]; function op(c){ return c<0?.12:SH[c%SH.length]; }
  host.textContent='';
  var ctl=h('div','kr-ctl'); host.appendChild(ctl);
  var pc=h('div','chips'); [[-1,'всё'],[0,o.per[0]],[1,o.per[1]]].forEach(function(x){ var b=h('button','chip',x[1]); b.type='button'; b.dataset.p=x[0]; b.addEventListener('click',function(){ ST.per=x[0]; apply(); }); pc.appendChild(b); }); ctl.appendChild(pc);
  var cc=h('div','chips'); var mk=function(i,l){ var b=h('button','chip'); b.type='button'; b.dataset.c=i; if(i>=0){ var sw=h('i','kr-sw'); sw.style.opacity=op(i); b.appendChild(sw); } b.appendChild(document.createTextNode(l)); b.addEventListener('click',function(){ ST.cl=(ST.cl===i&&i>=0)?-1:i; apply(); }); cc.appendChild(b); };
  mk(-1,'все кружки'); CL.forEach(function(c,i){ mk(i,c.names.slice(0,2).map(shortName).join(', ')+' и др. · '+c.n); }); ctl.appendChild(cc);
  var fi=h('input','search'); fi.type='search'; fi.placeholder='найти имя'; fi.setAttribute('aria-label','Найти имя'); ctl.appendChild(fi);
  fi.addEventListener('input',function(){ var q=fi.value.trim().toLowerCase(); if(!q) return; for(var i=0;i<NOD.length;i++){ if(NOD[i].name.toLowerCase().indexOf(q)>-1){ ST.sel=i; apply(); break; } } });
  var grid=h('div','kr-grid'), box=h('div','kr-svg'), card=h('aside','card kr-card'); card.setAttribute('aria-live','polite'); grid.appendChild(box); grid.appendChild(card); host.appendChild(grid);
  var on=function(i){ var n=NOD[i]; return (ST.per<0?n.n:n.per[ST.per])>0&&(ST.cl<0||n.cl===ST.cl); };
  // геометрия
  var adj=NOD.map(function(){ return []; }); EDG.forEach(function(e){ adj[e[0]].push([e[1],e[2]]); adj[e[1]].push([e[0],e[2]]); });
  var str=adj.map(function(a){ return a.reduce(function(t,x){ return t+x[1]; },0); }), wOf=function(i){ return Math.max(str[i],1); };
  var cls=[]; NOD.forEach(function(n){ if(cls.indexOf(n.cl)<0) cls.push(n.cl); }); cls.sort(function(a,b){ return (a<0)-(b<0)||a-b; });
  var order=[]; cls.forEach(function(c){ NOD.map(function(_,i){ return i; }).filter(function(i){ return NOD[i].cl===c; }).sort(function(a,b){ return wOf(b)-wOf(a)||NOD[b].n-NOD[a].n; }).forEach(function(i){ order.push(i); }); });
  var s, gR, gA, gL, ribs=[], arcs=[], a0=[], a1=[], ang=[], cx, cy, R, th, w, H, fs, mob;
  function shortName(n){ n=n.replace(/\s*\(.*?\)/g,'').replace(/^Великий князь |^Великая княгиня |^Вел\. кн\. /,''); var w=n.split(' '); return w.length>=3&&!/[:]| и /.test(n)?w[0]+' '+w[w.length-1]:n; }
  function dA(x,y){ return Math.atan2(Math.sin(x-y),Math.cos(x-y)); }
  function draw(){
    box.textContent=''; w=box.clientWidth||600; mob=innerWidth<600; H=mob?w+40:Math.min(w,640); fs=mob?10:11.5; th=mob?7:10;
    s=E('svg',{viewBox:'0 0 '+w+' '+H,width:'100%',height:H,role:'img','aria-label':o.title},box);
    cx=w/2; cy=H/2; R=Math.min(w,H)/2-(mob?70:116); var TAU=2*Math.PI, gap=cls.length>1?.03:0, span=TAU-gap*cls.length, tot=order.reduce(function(t,i){ return t+wOf(i); },0);
    var a=-Math.PI/2, prev=null; order.forEach(function(i){ if(prev!==null&&NOD[i].cl!==prev) a+=gap; prev=NOD[i].cl; var d=span*wOf(i)/tot; a0[i]=a; a1[i]=a+d; ang[i]=a+d/2; a+=d; });
    var P=function(t,r){ return [cx+r*Math.cos(t),cy+r*Math.sin(t)]; }, f=function(v){ return v.toFixed(1); };
    gR=E('g',{},s); gA=E('g',{},s); gL=E('g',{},s);
    var slot={}; NOD.forEach(function(_,i){ var c=a0[i], k=(a1[i]-a0[i])/wOf(i); adj[i].slice().sort(function(p,q){ return dA(ang[q[0]],ang[i])-dA(ang[p[0]],ang[i]); }).forEach(function(x){ slot[i+'_'+x[0]]=[c,c+x[1]*k]; c+=x[1]*k; }); });
    var Ri=R-1, arcTo=function(p){ return 'A'+f(Ri)+','+f(Ri)+' 0 0 1 '+f(p[0])+','+f(p[1]); };
    ribs=EDG.map(function(e){ var i=e[0], j=e[1], p=slot[i+'_'+j], q=slot[j+'_'+i]; var A0=P(p[0],Ri),A1=P(p[1],Ri),B0=P(q[0],Ri),B1=P(q[1],Ri);
      var d='M'+f(A0[0])+','+f(A0[1])+arcTo(A1)+'Q'+f(cx)+','+f(cy)+' '+f(B0[0])+','+f(B0[1])+arcTo(B1)+'Q'+f(cx)+','+f(cy)+' '+f(A0[0])+','+f(A0[1])+'Z';
      return {i:i,j:j,p:E('path',{d:d,'class':'kr-rib'},gR)}; });
    arcs=NOD.map(function(n,i){ var b=Math.max(a1[i]-.0025,a0[i]+.002), big=b-a0[i]>Math.PI?1:0; var p0=P(a0[i],R),p1=P(b,R),p2=P(b,R+th),p3=P(a0[i],R+th);
      var p=E('path',{d:'M'+f(p0[0])+','+f(p0[1])+'A'+f(R)+','+f(R)+' 0 '+big+' 1 '+f(p1[0])+','+f(p1[1])+'L'+f(p2[0])+','+f(p2[1])+'A'+f(R+th)+','+f(R+th)+' 0 '+big+' 0 '+f(p3[0])+','+f(p3[1])+'Z','class':'kr-arc',tabindex:0,role:'button','aria-label':n.name},gA);
      var tt=E('title',{},p); tt.textContent=n.name;
      p.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(i); } });
      p.addEventListener('pointerenter',function(e){ if(e.pointerType==='mouse'){ ST.hov=i; apply(); } }); p.addEventListener('pointerleave',function(e){ if(e.pointerType==='mouse'){ ST.hov=null; apply(); } });
      return p; });
    s.addEventListener('click',function(e){ var bb=s.getBoundingClientRect(), k=w/bb.width, x=(e.clientX-bb.left)*k-cx, y=(e.clientY-bb.top)*k-cy;
      if(Math.hypot(x,y)<R*.72){ pick(null); return; } var t=Math.atan2(y,x), best=null, bd=9; order.forEach(function(i){ var d=Math.max(0,Math.abs(dA(t,ang[i]))-(a1[i]-a0[i])/2); if(d<bd){ bd=d; best=i; } }); pick(best); });
    apply();
  }
  function pick(i){ ST.sel=(i==null||ST.sel===i)?null:i; apply(); if(ST.sel!=null&&innerWidth<1000) card.scrollIntoView({block:'nearest',behavior:'smooth'}); }
  function apply(){
    Array.prototype.forEach.call(pc.children,function(b){ b.setAttribute('aria-pressed',String(+b.dataset.p===ST.per)); });
    Array.prototype.forEach.call(cc.children,function(b){ b.setAttribute('aria-pressed',String(+b.dataset.c===ST.cl)); });
    var foc=ST.hov!=null?ST.hov:ST.sel, nb={}; if(foc!=null){ nb[foc]=1; adj[foc].forEach(function(x){ nb[x[0]]=1; }); }
    ribs.forEach(function(r){ var both=on(r.i)&&on(r.j), isF=foc!=null&&(r.i===foc||r.j===foc); r.p.style.opacity=!both?.02:(foc==null?.16:(isF?.6:.03)); if(isF) gR.appendChild(r.p); });
    arcs.forEach(function(p,i){ p.style.opacity=!on(i)?.08:(foc!=null&&!nb[i]?.25:1); p.style.fillOpacity=op(NOD[i].cl); p.classList.toggle('sel',i===ST.sel); });
    gL.textContent=''; var shown=[], minGap=(fs+1)/(R+th), P=function(t,r){ return [cx+r*Math.cos(t),cy+r*Math.sin(t)]; };
    var pri=function(i){ return (i===foc?2e9:0)+(nb[i]?1e9:0)+wOf(i); };
    order.slice().sort(function(x,y){ return pri(y)-pri(x); }).forEach(function(i){ if(!on(i)&&i!==foc) return; if(foc!=null&&mob&&!nb[i]) return;
      if(shown.some(function(t){ return Math.abs(dA(t,ang[i]))<minGap; })) return; shown.push(ang[i]);
      var t=ang[i], left=Math.cos(t)<0, xy=P(t,R+th+5), dx=Math.cos(t), dy=Math.sin(t);
      var room=Math.min(dx>.01?(w-xy[0])/dx:dx<-.01?xy[0]/-dx:1e9, dy>.01?(H-xy[1])/dy:dy<-.01?xy[1]/-dy:1e9)-4;
      var nm=mob?shortName(NOD[i].name):NOD[i].name, maxc=Math.floor(room/(fs*.56)); if(nm.length>maxc) nm=maxc>3?nm.slice(0,maxc-1)+'…':''; if(!nm) return;
      var deg=t*180/Math.PI, tx=E('text',{x:xy[0].toFixed(1),y:xy[1].toFixed(1),'text-anchor':left?'end':'start','dominant-baseline':'middle',transform:'rotate('+(left?deg+180:deg).toFixed(1)+' '+xy[0].toFixed(1)+' '+xy[1].toFixed(1)+')','class':'kr-lbl','font-size':fs},gL);
      tx.textContent=nm; if(i===foc) tx.style.fontWeight='700'; if(foc!=null&&!nb[i]) tx.style.opacity=.35; });
    renderCard();
  }
  function renderCard(){ card.textContent=''; var n=ST.sel!=null?NOD[ST.sel]:null;
    if(!n){ card.appendChild(h('p','eyebrow','Карточка')); card.appendChild(h('h3',null,'Выберите имя')); card.appendChild(h('p','lead',o.hint));
      var ch=h('div','chips'); NOD.slice().sort(function(a,b){ return b.n-a.n; }).slice(0,8).forEach(function(x){ var b=h('button','chip',x.name); b.type='button'; b.addEventListener('click',function(){ ST.sel=NOD.indexOf(x); apply(); }); ch.appendChild(b); }); card.appendChild(ch); return; }
    card.appendChild(h('p','eyebrow',o.title+' · '+(n.cl>=0?'кружок: '+CL[n.cl].names.slice(0,2).map(shortName).join(', '):'вне кружков')));
    var t=h('h3',null,n.name); card.appendChild(t);
    if(n.pid&&o.person){ var pl=h('a','more-link','Справка →'); pl.href='#p-'+n.pid; card.appendChild(pl); }
    var tl=h('div','kr-tiles'); [[n.n,o.unitN(n.n)],[n.np,o.unitP(n.np)]].forEach(function(x){ var d=h('div','kr-tile'); d.appendChild(h('b',null,String(x[0]))); d.appendChild(h('span',null,x[1])); tl.appendChild(d); }); card.appendChild(tl);
    if(n.nb.length){ card.appendChild(h('h4',null,'Чаще всего рядом')); var c=h('div','chips'); n.nb.forEach(function(x){ var b=h('button','chip',NOD[x[0]].name+' · '+x[1]); b.type='button'; b.addEventListener('click',function(){ ST.sel=x[0]; apply(); }); c.appendChild(b); }); card.appendChild(c); }
    card.appendChild(h('h4',null,o.refsTitle)); var rr=h('div','chips'); n.refs.forEach(function(r){ rr.appendChild(o.ref(r)); }); card.appendChild(rr);
    if(n.ctx.length){ card.appendChild(h('h4',null,o.ctxTitle)); n.ctx.forEach(function(x){ var q=h('blockquote','kr-q'); q.appendChild(document.createTextNode('«'+x.s+'» ')); q.appendChild(o.ref(x.r)); card.appendChild(q); }); }
  }
  draw(); var rt=null; addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(function(){ if(box.offsetParent) draw(); },200); });
  return {redraw:draw};
};
