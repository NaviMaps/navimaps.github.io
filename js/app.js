// Interfaz de Mapa del Delta: mapa en <canvas>, gestos, GPS, buscador, menú y ruta.
// React y htm vienen de los <script> del index.html (variables globales).
import { DIRS, NICE, px, ll, dist, bearing, norm, flex, fmtT } from './geo.js';
import { PREFS, solve } from './ruta.js';
import { CATS, ovp, local, waterEls, parseRes, dTo } from './datos.js';
import { PRE, ES_TEST } from './entorno.js';
import { exportar, leer, unirPuntos } from './respaldo.js';

var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
var html = htm.bind(React.createElement);

// Resolución del canvas: hasta 2x. A 3x el iPhone dibuja más del doble de píxeles por cuadro y gasta más batería.
var dpr = Math.min(window.devicePixelRatio || 1, 2);

var MAX_TILES_MEM = 400;   // mosaicos que se guardan en memoria mientras la app está abierta
var MIN_PASO_KM = 0.01;    // el recorrido suma un punto solo si te moviste al menos 10 m
var GLOW_PASADAS = 3;      // veces que pasa el destello animado por la ruta antes de quedarse quieta

// Dibuja el tramo de la polilínea sp entre las longitudes a y b (cum = longitudes acumuladas)
function pl(ctx, sp, a, b, cum) {
  if (b <= a) return;
  ctx.beginPath();
  var st = false;
  for (var i = 1; i < sp.length; i++) {
    var c0 = cum[i - 1], c1 = cum[i];
    if (c1 < a || c0 > b) continue;
    var sg = (c1 - c0) || 1, ta = Math.max(a, c0), tb = Math.min(b, c1);
    var x0 = sp[i - 1].x + (sp[i].x - sp[i - 1].x) * (ta - c0) / sg, y0 = sp[i - 1].y + (sp[i].y - sp[i - 1].y) * (ta - c0) / sg;
    var x1 = sp[i - 1].x + (sp[i].x - sp[i - 1].x) * (tb - c0) / sg, y1 = sp[i - 1].y + (sp[i].y - sp[i - 1].y) * (tb - c0) / sg;
    if (!st) { ctx.moveTo(x0, y0); st = true; } else ctx.lineTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
}

function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function load() { try { return JSON.parse(localStorage.getItem(PRE+'delta') || 'null') || {}; } catch (e) { return {}; } }

function App(){
  var sv=useRef(null);if(!sv.current)sv.current=load();
  var V=useRef({lat:sv.current.lat||-34.38,lng:sv.current.lng||-58.57,z:sv.current.z||11,r:0});
  var _m=useState(sv.current.marks||[]),marks=_m[0],setMarks=_m[1];
  var _t=useState(sv.current.track||[]),track=_t[0],setTrack=_t[1];
  var _me=useState(null),me=_me[0],setMe=_me[1];
  var _r=useState(false),rec=_r[0],setRec=_r[1];
  var _k=useState(0),km=_k[0],setKm=_k[1];
  var _s=useState('0.0'),spd=_s[0],setSpd=_s[1];
  var _n=useState(''),name=_n[0],setName=_n[1];
  var _pn=useState(null),pin=_pn[0],setPin=_pn[1];
  var _to=useState(''),toast=_to[0],setToast=_to[1];
  var _sa=useState(!!sv.current.sat),sat=_sa[0],setSat=_sa[1];
  var _w=useState(null),wx=_w[0],setWx=_w[1];
  var satR=useRef(!!sv.current.sat);
  var _d=useState(null),dest=_d[0],setDest=_d[1];
  var _sp=useState(sv.current.cruise||8),cruise=_sp[0],setCruise=_sp[1];
  var _ro=useState(null),route=_ro[0],setRoute=_ro[1];
  var _rg=useState(false),routing=_rg[0],setRouting=_rg[1];
  var _mn=useState(false),menu=_mn[0],setMenu=_mn[1];
  var _tb=useState('puntos'),tab=_tb[0],setTab=_tb[1];
  var _ly=useState(sv.current.layers||{marks:true,track:true,route:true,wx:true}),layers=_ly[0],setLayers=_ly[1];
  var _ed=useState(-1),ed=_ed[0],setEd=_ed[1];
  var _ev=useState(''),edv=_ev[0],setEdv=_ev[1];
  var _or=useState(null),orig=_or[0],setOrig=_or[1];
  var _q=useState(''),q=_q[0],setQ=_q[1];
  var _rs=useState([]),res=_rs[0],setRes=_rs[1];
  var _se=useState(-1),sel=_se[0],setSel=_se[1];
  var _so=useState(false),sopen=_so[0],setSopen=_so[1];
  var _sb=useState('near'),sortBy=_sb[0],setSortBy=_sb[1];
  var _sg=useState(false),searching=_sg[0],setSearching=_sg[1];
  var _hi=useState(function(){try{return JSON.parse(localStorage.getItem(PRE+'delta_hist')||'[]')}catch(e){return []}}),hist=_hi[0],setHist=_hi[1];
  var cmp=useRef(null),hy=useRef(0);
  var _co=useState(false),col=_co[0],setCol=_co[1];
  var _pf=useState(function(){try{var x=parseInt(localStorage.getItem(PRE+'delta_pref'),10);return x>=0&&x<=2?x:2}catch(e){return 2}}),pref=_pf[0],setPref=_pf[1];
  var _lc=useState(local()?local().length:0),lc=_lc[0],setLc=_lc[1];
  useEffect(function(){function f(){setLc(local()?local().length:0)}window.addEventListener('delta-local',f);f();return function(){window.removeEventListener('delta-local',f)}},[]);
  function setPrefP(i){setPref(i);try{localStorage.setItem(PRE+'delta_pref',String(i))}catch(e){}}
  var _th=useState(function(){try{return localStorage.getItem(PRE+'delta_theme')||'auto'}catch(e){return 'auto'}}),theme=_th[0],setTheme=_th[1];
  var _on=useState(navigator.onLine!==false),online=_on[0],setOnline=_on[1];
  useEffect(function(){
    function on(){setOnline(true);tiles.current={};req();say('Volvió la señal')}
    function off(){setOnline(false);say('Sin señal: uso los mapas y cauces guardados')}
    window.addEventListener('online',on);window.addEventListener('offline',off);
    return function(){window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[]);

  var cv=useRef(null),sc=useRef(null),scl=useRef(null),raf=useRef(0),tiles=useRef({}),drawRef=useRef(null);
  var D=useRef({}),wid=useRef(null),first=useRef(true),lock=useRef(null),trk=useRef(track),kmR=useRef(0),recR=useRef(false),tt=useRef(0),saveT=useRef(0),fr=useRef(0);
  D.current={pin:pin,marks:marks,track:track,me:me,dest:dest,route:route,layers:layers,orig:orig,res:res,sel:sel,cruise:cruise};

  // Guarda todo en el celular. save() junta varios cambios en una sola escritura:
  // normalmente espera 0,4 s; mientras grabás, escribe como mucho cada 15 s (el recorrido puede ser largo).
  // saveNow() escribe ya: al detener la grabación y cuando la app pasa a segundo plano.
  function saveNow(){clearTimeout(saveT.current);saveT.current=0;
    try{localStorage.setItem(PRE+'delta',JSON.stringify({marks:D.current.marks,track:trk.current,layers:D.current.layers,
      lat:V.current.lat,lng:V.current.lng,z:V.current.z,cruise:D.current.cruise,sat:satR.current}))}catch(e){}}
  function save(){if(!saveT.current)saveT.current=setTimeout(saveNow,recR.current?15000:400)}
  function req(){if(!raf.current)raf.current=requestAnimationFrame(function(){raf.current=0;if(drawRef.current)drawRef.current()})}
  function say(t){setToast(t);clearTimeout(tt.current);tt.current=setTimeout(function(){setToast('')},1800)}
  // Mosaicos del mapa en memoria. Cada uno anota en qué cuadro se usó por última vez (used)
  // para poder descartar los más viejos cuando hay más de MAX_TILES_MEM.
  function tkey(z,x,y){return (satR.current?'s/':'o/')+z+'/'+x+'/'+y}
  function peek(z,x,y){return tiles.current[tkey(z,x,y)]}
  function trimTiles(){var T=tiles.current,ks=Object.keys(T);if(ks.length<=MAX_TILES_MEM)return;
    ks.sort(function(a,b){return T[a].used-T[b].used});
    ks.slice(0,ks.length-MAX_TILES_MEM).forEach(function(k){T[k].onload=null;delete T[k]})}
  function tile(z,x,y){var sat=satR.current,k=tkey(z,x,y),T=tiles.current;if(T[k]){T[k].used=fr.current;return T[k]}var im=new Image();im.used=fr.current;im.onload=function(){im.ok=1;req()};im.onerror=function(){delete T[k]};im.crossOrigin='anonymous';
    im.src=sat?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+z+'/'+y+'/'+x:'https://tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png';T[k]=im;return im}

  drawRef.current=function(){
    var c=cv.current;if(!c)return;var ctx=c.getContext('2d'),w=c.width/dpr,h=c.height/dpr,v=V.current,d=D.current;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    fr.current++;
    // Colores del tema: se leen una vez por cuadro, no una vez por cada punto dibujado
    var C={bg:css('--bg'),fg:css('--fg'),grid:css('--grid'),accent:css('--accent'),danger:css('--danger')};
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,w,h);
    var cc=px(v.lat,v.lng,v.z),ox=cc.x-w/2,oy=cc.y-h/2,R=Math.hypot(w,h)/2,ex=R-w/2,ey=R-h/2;
    ctx.translate(w/2,h/2);ctx.rotate(v.r);ctx.translate(-w/2,-h/2);
    if(cmp.current)cmp.current.style.transform='rotate('+v.r+'rad)';
    ctx.strokeStyle=C.grid;ctx.lineWidth=1;ctx.beginPath();
    for(var gx=-(ox%64)-Math.ceil(ex/64)*64;gx<w+ex;gx+=64){ctx.moveTo(gx,-ey);ctx.lineTo(gx,h+ey)}
    for(var gy=-(oy%64)-Math.ceil(ey/64)*64;gy<h+ey;gy+=64){ctx.moveTo(-ex,gy);ctx.lineTo(w+ex,gy)}
    ctx.stroke();
    var zt=Math.max(0,Math.min(18,Math.round(v.z))),s=Math.pow(2,v.z-zt),ts=256*s,n=Math.pow(2,zt);
    for(var tx=Math.floor((ox-ex)/ts);tx<=Math.floor((ox+w+ex)/ts);tx++)for(var ty=Math.floor((oy-ey)/ts);ty<=Math.floor((oy+h+ey)/ts);ty++){
      if(ty<0||ty>=n)continue;var X=((tx%n)+n)%n,im=tile(zt,X,ty);
      if(im.ok)ctx.drawImage(im,tx*ts-ox,ty*ts-oy,ts+.5,ts+.5);
      else if(zt>0){// mientras carga, muestra el cuarto que corresponde del mosaico de un zoom menos
        var pi=peek(zt-1,X>>1,ty>>1);if(pi&&pi.ok){pi.used=fr.current;ctx.drawImage(pi,(X&1)*128,(ty&1)*128,128,128,tx*ts-ox,ty*ts-oy,ts+.5,ts+.5)}}}
    if(fr.current%30===0)trimTiles();
    function P(p){var q=px(p.lat,p.lng,v.z);return{x:q.x-ox,y:q.y-oy}}
    if(d.layers.track&&d.track.length>1){ctx.strokeStyle=C.accent;ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();d.track.forEach(function(p,i){var q=P(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke()}
    (d.res||[]).forEach(function(r){var on=r.i===d.sel;
      if(r.lines){ctx.strokeStyle=on?'#ff1f1f':'rgba(255,40,40,.65)';ctx.lineWidth=on?9:6;ctx.lineCap='round';ctx.lineJoin='round';
        r.lines.forEach(function(ln){ctx.beginPath();ln.forEach(function(p,j){var q=P(p);j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke()});ctx.lineCap='butt'}
      else{var q=P(r);ctx.fillStyle=on?'#ff7a1a':'#7c5cff';ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(q.x,q.y,on?10:7,0,7);ctx.fill();ctx.stroke()}
      if(on){var lq=P(r);ctx.save();ctx.translate(lq.x,lq.y);ctx.rotate(-v.r);ctx.font='600 13px system-ui';ctx.lineWidth=3;ctx.strokeStyle=C.bg;ctx.strokeText(r.name,12,-12);ctx.fillStyle=C.fg;ctx.fillText(r.name,12,-12);ctx.restore()}});
    (d.layers.marks?d.marks:[]).forEach(function(m){var q=P(m);ctx.fillStyle=C.danger;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,8,0,7);ctx.fill();ctx.stroke();
      ctx.font='600 13px system-ui';ctx.lineWidth=3;ctx.strokeStyle=C.bg;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-v.r);ctx.strokeText(m.name,12,5);ctx.fillStyle=C.fg;ctx.fillText(m.name,12,5);ctx.restore()});
    if(d.dest&&d.layers.route){var dq=P(d.dest);if(d.route&&d.route.ok){var sp=d.route.pts.map(P),cum=[0],tot=0;
        for(var ci=1;ci<sp.length;ci++){tot+=Math.hypot(sp[ci].x-sp[ci-1].x,sp[ci].y-sp[ci-1].y);cum.push(tot)}
        ctx.lineJoin='round';ctx.lineCap='round';
        ctx.strokeStyle='rgba(0,50,0,.5)';ctx.lineWidth=9;pl(ctx,sp,0,tot,cum);
        ctx.strokeStyle='#39ff14';ctx.lineWidth=5;pl(ctx,sp,0,tot,cum);
        // Destello: pasa GLOW_PASADAS veces cuando se calcula la ruta y después se detiene.
        // Mientras grabás un recorrido no se anima, para no redibujar el mapa 60 veces por segundo.
        var Ls=Math.max(70,tot*0.18),dur=Math.min(4000,Math.max(1500,(tot+Ls)/0.32)),el=performance.now()-(d.route.t0||0);
        if(!recR.current&&el<GLOW_PASADAS*(dur+900)){var ph=el%(dur+900);
          if(ph<dur){var hd=ph/dur*(tot+Ls);ctx.shadowColor='#39ff14';ctx.shadowBlur=14;
            for(var k=0;k<6;k++){ctx.strokeStyle='rgba(235,255,225,'+(0.15+0.17*k)+')';ctx.lineWidth=7;pl(ctx,sp,Math.max(0,hd-Ls+Ls*k/6),Math.min(tot,hd-Ls+Ls*(k+1)/6),cum)}
            ctx.shadowBlur=0}
          req()}
        ctx.lineCap='butt'}else if(d.orig||d.me){var mq=P(d.orig||d.me);ctx.setLineDash([10,8]);ctx.strokeStyle=C.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mq.x,mq.y);ctx.lineTo(dq.x,dq.y);ctx.stroke();ctx.setLineDash([])}
      ctx.fillStyle='#e8a317';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(dq.x,dq.y,10,0,7);ctx.fill();ctx.stroke()}
    if(d.orig&&d.layers.route){var oq=P(d.orig);ctx.fillStyle='#2e9e5b';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(oq.x,oq.y,10,0,7);ctx.fill();ctx.stroke()}
    if(d.pin){var pq=P(d.pin);ctx.fillStyle='#e5484d';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(pq.x,pq.y-22,11,Math.PI*0.8,Math.PI*2.2);ctx.lineTo(pq.x,pq.y);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(pq.x,pq.y-22,4,0,7);ctx.fill()}
    if(d.me){var q=P(d.me);ctx.fillStyle='rgba(10,124,140,.25)';ctx.beginPath();ctx.arc(q.x,q.y,18,0,7);ctx.fill();
      ctx.fillStyle='#0a7c8c';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,8,0,7);ctx.fill();ctx.stroke()}
    var mpp=156543.03*Math.cos(v.lat*Math.PI/180)/Math.pow(2,v.z),m100=100*mpp,nv=NICE[0];
    NICE.forEach(function(x){if(x<=m100*1.4)nv=x});
    if(sc.current)sc.current.style.width=(nv/mpp)+'px';
    if(scl.current)scl.current.textContent=nv>=1000?(nv/1000)+' km':nv+' m';
  };

  function zoomAt(sx,sy,nz){var v=V.current;nz=Math.max(3,Math.min(19,nz));var w=cv.current.clientWidth,h=cv.current.clientHeight,c=px(v.lat,v.lng,v.z),
    fx=sx-w/2,fy=sy-h/2,cr=Math.cos(v.r),sr=Math.sin(v.r),ux=fx*cr+fy*sr,uy=-fx*sr+fy*cr,g=ll(c.x+ux,c.y+uy,v.z),k=px(g.lat,g.lng,nz),p=ll(k.x-ux,k.y-uy,nz);
    v.lat=Math.max(-85,Math.min(85,p.lat));v.lng=p.lng;v.z=nz;req()}

  function toLL(sx,sy){var v=V.current,w=cv.current.clientWidth,h=cv.current.clientHeight,c=px(v.lat,v.lng,v.z),fx=sx-w/2,fy=sy-h/2,cr=Math.cos(v.r),sr=Math.sin(v.r);
    return ll(c.x+fx*cr+fy*sr,c.y-fx*sr+fy*cr,v.z)}
  useEffect(function(){
    var c=cv.current,G={ptr:{},last:null,lastTap:0,pinch:null},v=V.current;
    function pos(e){var r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
    function size(){var r=c.getBoundingClientRect();c.width=r.width*dpr;c.height=r.height*dpr;req()}
    function down(e){setSopen(false);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();c.setPointerCapture(e.pointerId);G.ptr[e.pointerId]=pos(e);G.last={t:Date.now(),moved:0};G.pinch=null;G.acc=0;G.rot=false;
      // Mantener apretado medio segundo sin mover: pone un pin ahí y pregunta el nombre
      clearTimeout(G.lp);var p0=G.ptr[e.pointerId];G.lp=Object.keys(G.ptr).length===1?setTimeout(function(){if(G.last&&G.last.moved<10&&Object.keys(G.ptr).length===1){G.last.moved=99;var g=toLL(p0.x,p0.y);setName('');setPin({lat:g.lat,lng:g.lng})}},500):0}
    function move(e){var p=G.ptr[e.pointerId];if(!p)return;var np=pos(e),ids=Object.keys(G.ptr);
      if(ids.length===2){G.ptr[e.pointerId]=np;var a=G.ptr[ids[0]],b=G.ptr[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
        if(G.pinch){var ang=Math.atan2(b.y-a.y,b.x-a.x),da=ang-G.pinch.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;
          G.acc=(G.acc||0)+da;if(!G.rot){if(Math.abs(G.acc)>0.26){G.rot=true;da=G.acc-(G.acc>0?0.26:-0.26)}else da=0}
          zoomAt(mx,my,v.z+Math.log2(d/G.pinch.d));v.r+=da;
          var cr=Math.cos(v.r),sr=Math.sin(v.r),sx=mx-G.pinch.x,sy=my-G.pinch.y,c1=px(v.lat,v.lng,v.z),q=ll(c1.x-(sx*cr+sy*sr),c1.y-(-sx*sr+sy*cr),v.z);v.lat=q.lat;v.lng=q.lng;req()}
        G.pinch={d:d,x:mx,y:my,a:Math.atan2(b.y-a.y,b.x-a.x)};if(G.last)G.last.moved=99;return}
      var dx=np.x-p.x,dy=np.y-p.y;if(G.last)G.last.moved+=Math.abs(dx)+Math.abs(dy);if(G.last&&G.last.moved>=10)clearTimeout(G.lp);
      var cr2=Math.cos(v.r),sr2=Math.sin(v.r),c2=px(v.lat,v.lng,v.z),q2=ll(c2.x-(dx*cr2+dy*sr2),c2.y-(-dx*sr2+dy*cr2),v.z);v.lat=Math.max(-85,Math.min(85,q2.lat));v.lng=q2.lng;G.ptr[e.pointerId]=np;req()}
    function up(e){var np=pos(e);clearTimeout(G.lp);delete G.ptr[e.pointerId];G.pinch=null;
      if(!Object.keys(G.ptr).length){if(G.last&&G.last.moved<8&&Date.now()-G.last.t<300){var n=Date.now();if(n-G.lastTap<320){zoomAt(np.x,np.y,v.z+1);G.lastTap=0}else G.lastTap=n}save()}}
    function ctxm(e){e.preventDefault()}
    function wheel(e){e.preventDefault();var p=pos(e);zoomAt(p.x,p.y,v.z-e.deltaY*0.002);save()}
    function vis(){if(document.visibilityState==='visible'){if(recR.current)wake()}else saveNow()}
    c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
    c.addEventListener('wheel',wheel,{passive:false});c.addEventListener('contextmenu',ctxm);window.addEventListener('resize',size);document.addEventListener('visibilitychange',vis);
    window.addEventListener('pagehide',saveNow);
    size();
    return function(){c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up);
      c.removeEventListener('wheel',wheel);c.removeEventListener('contextmenu',ctxm);window.removeEventListener('resize',size);document.removeEventListener('visibilitychange',vis);window.removeEventListener('pagehide',saveNow)}
  },[]);

  useEffect(function(){req();save()},[marks,track,me,dest,route,layers,orig,res,sel,cruise,sat]);
  useEffect(req,[pin]);

  function wake(){try{if(navigator.wakeLock)navigator.wakeLock.request('screen').then(function(l){lock.current=l}).catch(function(){})}catch(e){}}
  function startGPS(){
    if(!navigator.geolocation){say('Sin geolocalización en este navegador');return}
    if(wid.current!==null)return;
    wid.current=navigator.geolocation.watchPosition(function(p){
      var np={lat:p.coords.latitude,lng:p.coords.longitude};
      // Recorrido: solo lecturas precisas (menos de 50 m de error) y solo si te moviste al menos 10 m
      if(recR.current&&p.coords.accuracy<50){var t=trk.current,paso=t.length?dist(t[t.length-1],np):Infinity;
        if(paso>=MIN_PASO_KM){if(t.length)kmR.current+=paso;trk.current=t.concat([np]);setTrack(trk.current);setKm(kmR.current)}}
      setMe(np);
      if(first.current){V.current.lat=np.lat;V.current.lng=np.lng;V.current.z=Math.max(V.current.z,14);first.current=false}
      var sp=p.coords.speed;setSpd(sp!=null&&sp>=0?(sp*1.94384).toFixed(1):'0.0');
    },function(){wid.current=null;say('No pude obtener tu ubicación. Revisá los permisos.')},{enableHighAccuracy:true,maximumAge:2000})}
  function locate(){var m=D.current.me;
    if(m){V.current.lat=m.lat;V.current.lng=m.lng;V.current.z=Math.max(V.current.z,15);req();save()}
    else{first.current=true;startGPS();say('Buscando tu posición…')}}
  function recOn(on){recR.current=on;setRec(on);
    if(on){trk.current=[];kmR.current=0;setTrack([]);setKm(0);startGPS();wake();say('Grabando. Dejá la pantalla encendida')}
    else{try{if(lock.current)lock.current.release()}catch(e){}lock.current=null;saveNow()}}
  // Pin puesto con el dedo: guardarlo con nombre, ir ahí o salir desde ahí
  function pinDone(){setPin(null);setName('');if(document.activeElement&&document.activeElement.blur)document.activeElement.blur()}
  function addMark(){if(!pin)return;var nm=name.trim()||('Punto '+(marks.length+1));
    setMarks(marks.concat([{name:nm,lat:pin.lat,lng:pin.lng}]));pinDone();say('Guardado: '+nm)}
  function pinDest(){setDest({lat:pin.lat,lng:pin.lng});setCol(false);pinDone();say('Destino marcado')}
  function pinOrig(){setOrig({lat:pin.lat,lng:pin.lng});pinDone();say('Salida marcada')}
  useEffect(function(){setRoute(null)},[dest,orig,pref]);
  function flyTo(lat,lng,z){var v=V.current,s={lat:v.lat,lng:v.lng,z:v.z},t0=performance.now();
    (function st(t){var k=Math.min(1,(t-t0)/700),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;v.lat=s.lat+(lat-s.lat)*e;v.lng=s.lng+(lng-s.lng)*e;v.z=s.z+(z-s.z)*e;req();if(k<1)requestAnimationFrame(st);else save()})(t0)}
  function fitPts(pts){var a=1e9,b=-1e9,c=1e9,d=-1e9;pts.forEach(function(p){a=Math.min(a,p.lat);b=Math.max(b,p.lat);c=Math.min(c,p.lng);d=Math.max(d,p.lng)});
    var w=cv.current.clientWidth,h=cv.current.clientHeight,z=17;
    for(;z>3;z-=0.25){var p1=px(b,c,z),p2=px(a,d,z);if(p2.x-p1.x<=w*0.8&&p2.y-p1.y<=h*0.4)break}
    flyTo((a+b)/2,(c+d)/2,Math.min(z,17))}
  function northUp(){var v=V.current,r0=((v.r+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI,t0=performance.now();
    (function st(t){var k=Math.min(1,(t-t0)/350),e=1-Math.pow(1-k,3);v.r=r0*(1-e);req();if(k<1)requestAnimationFrame(st)})(t0)}
  function addHist(t){var h=[t].concat(hist.filter(function(x){return x!==t})).slice(0,15);setHist(h);try{localStorage.setItem(PRE+'delta_hist',JSON.stringify(h))}catch(e){}}
  function clearSearch(){setQ('');setRes([]);setSel(-1);setSopen(false)}
  function pick(r){setSel(r.i);setSopen(false);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    if(r.lines){var pts=[];r.lines.forEach(function(l){pts=pts.concat(l)});fitPts(pts)}else flyTo(r.lat,r.lng,16)}
  function runSearch(text){
    var t=(typeof text==='string'?text:q).trim();if(!t)return;
    setQ(t);setSopen(true);setSel(-1);setSearching(true);addHist(t);
    var v=V.current,la=Math.round(v.lat*20)/20,lo=Math.round(v.lng*20)/20,cat=null,n=norm(t),body;
    CATS.forEach(function(c){if(!cat&&c.re.test(n))cat=c});
    if(!cat&&local()){var nr=n.replace(/[^a-z0-9 ]/g,''),loc=local().filter(function(x){return x.tags&&x.tags.waterway&&x.tags.name&&norm(x.tags.name).indexOf(nr)>=0});
      if(loc.length){var r0=parseRes(loc),p0=[];setRes(r0);setSearching(false);r0.forEach(function(x){x.lines.forEach(function(l){p0=p0.concat(l)})});fitPts(p0);return}}
    if(cat)body='[out:json][timeout:25];('+cat.f.map(function(f){return 'nwr'+f+'(around:15000,'+la.toFixed(4)+','+lo.toFixed(4)+');'}).join('')+');out center tags 80;';
    else{var bb=[la-0.7,lo-0.7,la+0.7,lo+0.7].map(function(x){return x.toFixed(4)}).join(','),rx=flex(t);
      body='[out:json][timeout:25];(way["waterway"~"^(river|canal|stream|tidal_channel)$"]["name"~"'+rx+'",i]('+bb+');'+['amenity','leisure','tourism'].map(function(k){return 'nwr["name"~"'+rx+'",i]["'+k+'"]('+bb+');'}).join('')+');out geom;'}
    ovp(body,function(i){if(i>0)say('El servidor tarda, probando otro…')}).then(function(j){var r=parseRes(j.elements||[]);setRes(r);setSearching(false);
      if(!r.length){say('No encontré resultados');return}
      var pts=[];r.forEach(function(x){if(x.lines)x.lines.forEach(function(l){pts=pts.concat(l)});else pts.push(x)});
      if(r.length===1&&!r[0].lines){setSel(0);flyTo(r[0].lat,r[0].lng,16)}else fitPts(pts)})
     .catch(function(){setSearching(false);say('No pude buscar ahora. Probá de nuevo en un rato.')});
  }
  useEffect(function(){var r=document.documentElement;if(theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',theme);
    try{localStorage.setItem(PRE+'delta_theme',theme)}catch(e){}req()},[theme]);
  function setLayer(k){var n=Object.assign({},layers);n[k]=!n[k];setLayers(n)}
  function saveEd(i){var nm=edv.trim();if(nm)setMarks(marks.map(function(m,j){return j===i?{name:nm,lat:m.lat,lng:m.lng}:m}));setEd(-1)}
  function sw(on,fn){return html`<button className=${'sw'+(on?' on':'')} onClick=${fn} aria-label="Activar o desactivar"><i></i></button>`}
  function calcRoute(){
    var m=D.current.orig||D.current.me,d=D.current.dest;
    if(!m||!d){say('Necesito tu posición (◎) y un destino');return}
    setRouting(true);setRoute(null);
    var G=0.05,pd=0.04,s=Math.floor((Math.min(m.lat,d.lat)-pd)/G)*G,n=Math.ceil((Math.max(m.lat,d.lat)+pd)/G)*G,w=Math.floor((Math.min(m.lng,d.lng)-pd)/G)*G,e=Math.ceil((Math.max(m.lng,d.lng)+pd)/G)*G;
    var pr=waterEls(s,w,n,e,function(i){if(i>0)say('El servidor tarda, probando otro…')});
    pr
      .then(function(els){return{elements:els}})
      .then(function(j){var r=solve(j.elements||[],m,d,PREFS[pref]);r.t0=performance.now();setRoute(r);setRouting(false);if(!r.ok)say(r.msg)})
      .catch(function(){setRouting(false);say('No pude bajar los cauces. Probá de nuevo en un rato.')});
  }
  function goTo(m){V.current.lat=m.lat;V.current.lng=m.lng;V.current.z=Math.max(V.current.z,14);req();save()}
  // Copia de seguridad (Ajustes): exportar a un archivo .json e importarlo de vuelta
  var fileIn=useRef(null);
  function doExport(){if(!marks.length&&!track.length){say('No hay puntos ni recorrido para exportar');return}
    exportar(marks,trk.current).then(function(r){if(r==='ok')say('Respaldo listo')}).catch(function(){say('No pude exportar')})}
  function doImport(e){var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
    leer(f).then(function(d){
      var antes=marks.length,nm=unirPuntos(marks,d.marks),sum=nm.length-antes,tr=false;
      if(d.track.length>1&&!recR.current&&(!trk.current.length||confirm('El respaldo trae un recorrido de '+d.track.length+' puntos. ¿Reemplazar el recorrido actual?'))){
        var k=0;for(var i=1;i<d.track.length;i++)k+=dist(d.track[i-1],d.track[i]);
        trk.current=d.track;kmR.current=k;setTrack(d.track);setKm(k);tr=true}
      setMarks(nm);setTimeout(saveNow,0);
      say(sum||tr?('Importado: '+sum+' punto'+(sum===1?'':'s')+(tr?' y recorrido':'')):'No había nada nuevo para importar')
    }).catch(function(er){say(er.message||'No pude leer el archivo')})}
  function del(i){setMarks(marks.filter(function(_,j){return j!==i}))}
  function step(d){zoomAt(cv.current.clientWidth/2,cv.current.clientHeight/2,Math.round(V.current.z)+d);save()}

  function toggleSat(){satR.current=!satR.current;setSat(satR.current);req()}
  useEffect(function(){
    var alive=true;
    function go(){var v=V.current,m=D.current.me,la=m?m.lat:v.lat,lo=m?m.lng:v.lng;
      fetch('https://api.open-meteo.com/v1/forecast?latitude='+la.toFixed(3)+'&longitude='+lo.toFixed(3)+'&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn')
        .then(function(r){return r.json()}).then(function(j){if(alive&&j.current)setWx(j.current)}).catch(function(){})}
    go();var id=setInterval(go,600000);return function(){alive=false;clearInterval(id)}
  },[]);

  var from=orig||me;
  var rk=(route&&route.ok)?route.km:(from&&dest?dist(from,dest):0);
  var sref=me||{lat:V.current.lat,lng:V.current.lng};
  var list=res.map(function(r){return{r:r,d:dTo(r,sref)}});
  list.sort(sortBy==='near'?function(a,b){return a.d-b.d}:function(a,b){return a.r.name.localeCompare(b.r.name)});
  var dst=rec?'Grabando… '+(km/1.852).toFixed(2)+' mn':(km?(km/1.852).toFixed(2)+' mn recorridas':'Sin grabar');

  return html`<div id="app">
    <canvas ref=${cv}></canvas>
    <div className="hud">${ES_TEST?html`<small style=${{background:'#d9480f',color:'#fff',fontWeight:700,borderRadius:6,padding:'1px 6px',alignSelf:'flex-start'}}>PRUEBA</small>`:null}<b>${spd} nd</b><small>${dst}</small><div className="scale" ref=${sc}></div><small ref=${scl}></small>${wx&&layers.wx?html`<small>Viento ${Math.round(wx.wind_speed_10m)} nd ${DIRS[Math.round(wx.wind_direction_10m/45)%8]} · ráf. ${Math.round(wx.wind_gusts_10m)}</small><small>${Math.round(wx.temperature_2m)} °C</small>`:null}${online?null:html`<small style=${{color:'var(--danger)',fontWeight:600}}>Sin señal</small>`}<small>© ${sat?'Esri':'OpenStreetMap'}</small></div>
    <div className="fabs">
      <button className="fab" aria-label="Acercar" onClick=${function(){step(1)}}>+</button>
      <button className="fab" aria-label="Alejar" onClick=${function(){step(-1)}}>−</button>
      <button className="fab" aria-label="Mi posición" onClick=${locate}>◎</button>
      <button className="fab" aria-label="Satélite" onClick=${toggleSat}>${sat?'🗺':'🛰'}</button>
      <button className=${'fab'+(rec?' recon':'')} aria-label=${rec?'Detener recorrido':'Grabar recorrido'} onClick=${function(){recOn(!rec)}}>${rec?html`<i className="sq"></i>`:html`<i className="dot"></i>`}</button>
    </div>
    <div id="toast" className=${toast?'on':''}>${toast}</div>
    <button className="fab burger" aria-label="Menú" onClick=${function(){setMenu(true)}}>☰</button>
    <button className="fab compass" aria-label="Norte arriba" onClick=${northUp}><span ref=${cmp}><svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2L17 13H7Z" fill="#e5484d"/><path d="M12 22L7 13H17Z" fill="currentColor" opacity=".45"/></svg></span></button>
    <div className="sb"><span>🔍</span><input value=${q} placeholder="Buscar lugares, ríos, arroyos…" enterKeyHint="search"
      onFocus=${function(){setSopen(true)}} onInput=${function(e){setQ(e.target.value)}}
      onKeyDown=${function(e){if(e.key==='Enter'){runSearch();e.target.blur()}}} />
      ${q?html`<button className="clr" aria-label="Limpiar" onClick=${clearSearch}>✕</button>`:null}</div>
    <div id="sr" className=${sopen?'on':''}>
      ${searching?html`<div className="empty">Buscando…</div>`
       :list.length?html`<div><div className="srh"><b>${list.length} resultados</b><div className="seg">
            <button className=${'mini'+(sortBy==='near'?' on':'')} onClick=${function(){setSortBy('near')}}>Más cercano</button>
            <button className=${'mini'+(sortBy==='name'?' on':'')} onClick=${function(){setSortBy('name')}}>A–Z</button></div></div>
          ${list.map(function(x){var r=x.r;return html`<div className=${'mi'+(sel===r.i?' sel':'')} key=${r.i}>
            <span onClick=${function(){pick(r)}}>${r.name}<small style=${{color:'var(--muted)',display:'block'}}>${r.kind}${r.lines?' · '+r.km.toFixed(1)+' km de largo':''} · a ${x.d.toFixed(1)} km</small></span>
            ${r.lines?null:html`<button className="mini" aria-label="Guardar" onClick=${function(){setMarks(marks.concat([{name:r.name,lat:r.lat,lng:r.lng}]));say('Guardado: '+r.name)}}>☆</button>
              <button className="mini" aria-label="Ir" onClick=${function(){setDest({lat:r.lat,lng:r.lng});setSopen(false);say('Destino: '+r.name)}}>➤</button>`}
          </div>`})}</div>`
       :html`<div><div className="srh"><b>Sugerencias</b></div>
          <div className="chips">${CATS.map(function(c){return html`<button key=${c.n} className="mini" onClick=${function(){runSearch(c.n)}}>${c.e} ${c.n}</button>`})}</div>
          ${hist.length?html`<div><div className="srh"><b>Recientes</b></div>${hist.slice(0,5).map(function(h){return html`<div className="mi" key=${h}><span onClick=${function(){runSearch(h)}}>${h}</span></div>`})}</div>`:null}</div>`}
    </div>
    <div id="scrim" className=${menu?'on':''} onClick=${function(){setMenu(false)}}></div>
    <div id="menu" className=${menu?'open':''}>
      <div className="mh"><b>Menú</b><button className="mini" onClick=${function(){setMenu(false)}}>Cerrar</button></div>
      <div className="tabs">${[['puntos','Puntos'],['capas','Capas'],['historial','Historial'],['ajustes','Ajustes']].map(function(t){
        return html`<button key=${t[0]} className=${'tab'+(tab===t[0]?' on':'')} onClick=${function(){setTab(t[0])}}>${t[1]}</button>`})}</div>
      <div className="mb">
        ${tab==='puntos'?(marks.length?marks.map(function(m,i){return html`<div className="mi" key=${i}>
            ${ed===i
              ?html`<input className="ei" value=${edv} onInput=${function(e){setEdv(e.target.value)}} onKeyDown=${function(e){if(e.key==='Enter')saveEd(i)}} />
                <button className="mini" onClick=${function(){saveEd(i)}}>OK</button>`
              :html`<span onClick=${function(){goTo(m);setMenu(false)}}>${m.name}${me?html`<small style=${{color:'var(--muted)'}}> · ${dist(me,m).toFixed(1)} km</small>`:null}</span>
                <button className="mini" aria-label="Renombrar" onClick=${function(){setEd(i);setEdv(m.name)}}>✎</button>
                <button className="mini" aria-label="Ir" onClick=${function(){setDest(m);setMenu(false)}}>➤</button>
                <button className="mini" aria-label="Borrar" style=${{color:'var(--danger)'}} onClick=${function(){del(i)}}>✕</button>`}
          </div>`}):html`<div className="empty">Todavía no guardaste ningún punto. Usá Marcar en el mapa.</div>`)
        :tab==='capas'?html`<div>
            <div className="lr"><span>Puntos guardados</span>${sw(layers.marks,function(){setLayer('marks')})}</div>
            <div className="lr"><span>Recorrido grabado</span>${sw(layers.track,function(){setLayer('track')})}</div>
            <div className="lr"><span>Destino y ruta</span>${sw(layers.route,function(){setLayer('route')})}</div>
            <div className="lr"><span>Viento y clima</span>${sw(layers.wx,function(){setLayer('wx')})}</div>
            <div className="lr"><span>Vista satelital</span>${sw(sat,toggleSat)}</div>
          </div>`
        :tab==='historial'?html`<div>${hist.length?hist.map(function(h){return html`<div className="mi" key=${h}><span onClick=${function(){setMenu(false);runSearch(h)}}>🔍 ${h}</span></div>`}):html`<div className="empty">Todavía no hiciste búsquedas.</div>`}
            ${hist.length?html`<div className="lr"><span>Borrar historial</span><button className="mini" style=${{color:'var(--danger)'}} onClick=${function(){setHist([]);try{localStorage.removeItem(PRE+'delta_hist')}catch(e){}}}>Borrar</button></div>`:null}</div>`
        :html`<div>
            <div className="lr"><span>Tema</span><div className="seg">${[['auto','Auto'],['light','Claro'],['dark','Oscuro']].map(function(t){
              return html`<button key=${t[0]} className=${'tab'+(theme===t[0]?' on':'')} style=${{padding:'0 10px'}} onClick=${function(){setTheme(t[0])}}>${t[1]}</button>`})}</div></div>
            <div className="lr"><span>Velocidad de crucero</span><div className="seg">
              <button className="mini" onClick=${function(){setCruise(Math.max(1,cruise-1))}}>−</button><span>${cruise} nd</span>
              <button className="mini" onClick=${function(){setCruise(Math.min(40,cruise+1))}}>+</button></div></div>
            <div className="lr" style=${{flexWrap:'wrap',padding:'8px 0'}}><span>Prioridad de cauces</span><div className="seg" style=${{width:'100%'}}>${PREFS.map(function(p,i){
              return html`<button key=${i} className=${'tab'+(pref===i?' on':'')} style=${{padding:'0 6px'}} onClick=${function(){setPrefP(i)}}>${p.n}</button>`})}</div></div>
            <div className="lr"><span>Cauces guardados</span><small style=${{color:'var(--muted)'}}>${lc?lc.toLocaleString('es-AR')+' tramos ✓':'no cargados'}</small></div>
            <div className="lr"><span>Copia de seguridad<br/><small style=${{color:'var(--muted)'}}>${marks.length} puntos · ${track.length>1?'con recorrido':'sin recorrido'}</small></span><div className="seg">
              <button className="mini" onClick=${doExport}>Exportar</button>
              <button className="mini" onClick=${function(){if(fileIn.current)fileIn.current.click()}}>Importar</button></div>
              <input ref=${fileIn} type="file" accept=".json,application/json" style=${{display:'none'}} onChange=${doImport} /></div>
            <div className="lr"><span>Borrar recorrido grabado</span><button className="mini" style=${{color:'var(--danger)'}} onClick=${function(){trk.current=[];kmR.current=0;setTrack([]);setKm(0);say('Recorrido borrado')}}>Borrar</button></div>
          </div>`}
      </div>
    </div>
    ${pin?html`<div id="pincard">
      <div className="row"><b style=${{flex:1}}>Nuevo punto</b><button className="clr" aria-label="Cancelar" onClick=${pinDone}>✕</button></div>
      <div className="row"><input value=${name} placeholder="Nombre (muelle, arroyo…)" enterKeyHint="done"
        onInput=${function(e){setName(e.target.value)}} onKeyDown=${function(e){if(e.key==='Enter')addMark()}} /></div>
      <div className="row"><button className="btn p" onClick=${addMark}>Guardar</button><button className="btn" onClick=${pinDest}>Ir ahí</button>${dest?html`<button className="btn" onClick=${pinOrig}>Salir de acá</button>`:null}</div>
    </div>`:null}
    ${dest?html`<div id="sheet" className=${col?'col':''} style=${{'--peek':from?'64px':'42px'}}>
      <div id="handle" onPointerDown=${function(e){hy.current=e.clientY}} onPointerUp=${function(e){var dy=e.clientY-hy.current;if(dy>24)setCol(true);else if(dy<-24)setCol(false);else setCol(!col)}}><i></i>${col&&from?html`<span className="sumtx">${(rk/1.852).toFixed(1)} mn · ${fmtT(rk/1.852/cruise)}</span>`:null}</div>
      <div className="route">
        ${from?html`<div><b>${(rk/1.852).toFixed(1)} mn</b> · ${rk.toFixed(1)} km · ${route&&route.ok?'por agua':'en línea recta, rumbo '+Math.round(bearing(from,dest))+'°'}</div>
          <div>Llegada en <b>${fmtT(rk/1.852/cruise)}</b> a ${cruise} nd</div>`
          :html`<div>Activá ◎ o mantené apretado el mapa para elegir la salida</div>`}
        <div className="rr"><small>Desde:</small>
          <button className=${'mini'+(!orig?' on':'')} onClick=${function(){setOrig(null)}}>Mi ubicación</button>
          <button className=${'mini'+(orig?' on':'')} onClick=${function(){if(!orig)say('Mantené apretado el mapa y tocá Salir de acá')}}>Otro punto</button></div>
        <button className="btn p" disabled=${routing} onClick=${calcRoute}>${routing?'Calculando…':'Ruta por agua'}</button>
        <div className="rr">
          <button className="mini" onClick=${function(){setCruise(Math.max(1,cruise-1))}}>−</button>
          <span>${cruise} nd</span>
          <button className="mini" onClick=${function(){setCruise(Math.min(40,cruise+1))}}>+</button>
          <button className="mini" onClick=${function(){setDest(null)}}>Quitar destino</button>
        </div>
        <small>${route?(route.ok?'Ruta sobre cauces de OpenStreetMap que prioriza ríos, luego canales y arroyos. No sabe si un arroyo está seco ni las alturas de puentes. No reemplaza las cartas oficiales.':route.msg+'. Se muestra la línea recta.'):'Línea recta. Tocá Ruta por agua para seguir los cauces.'}</small>
      </div>
    </div>`:null}
  </div>`;
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
