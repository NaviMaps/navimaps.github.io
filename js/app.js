// Interfaz de Mapa del Delta: mapa en <canvas>, gestos, GPS, buscador, menú y ruta.
// React y htm vienen de los <script> del index.html (variables globales).
import { DIRS, NICE, px, ll, dist, bearing, norm, flex, fmtT } from './geo.js';
import { PREFS, solve } from './ruta.js';
import { CATS, ovp, local, waterEls, parseRes, dTo, lugares, lugaresFecha } from './datos.js';
import { PRE, ES_TEST } from './entorno.js';
import { exportar, leer, unirPuntos } from './respaldo.js';
import { ESTILOS, ORDEN, SEAMARK } from './estilos.js';
import { Tutorial, tutorialVisto } from './tutorial.js';
import { zonas, zonaEn, DEPORTES, fuenteZonas, largo } from './zonas.js';
import { alturas, ultimo, fresca, tendencia, estado, hace, metros, hora, dia, cercana, mareas, grafico } from './alturas.js';

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
  // Estilo del mapa base (cuando no está el satélite)
  var _es=useState(ORDEN.indexOf(sv.current.estilo)>=0&&sv.current.estilo!=='sat'?sv.current.estilo:'osm'),estilo=_es[0],setEstilo=_es[1];
  var estR=useRef(estilo);
  function base(){return satR.current?'sat':estR.current}
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
  var _lg=useState(lugares()?lugares().length:0),lgc=_lg[0],setLgc=_lg[1];
  // Alturas del río: rv cambia cuando llega un alturas.json nuevo; rio es la estación abierta en el panel
  var _rv=useState(0),rv=_rv[0],setRv=_rv[1];
  var _ri=useState(null),rio=_ri[0],setRio=_ri[1];
  // Zonas deportivas de Prefectura: zn es la zona abierta en la tarjeta
  var _zn=useState(null),zn=_zn[0],setZn=_zn[1];
  // Tutorial de bienvenida: la primera vez que se abre la app, o desde Ajustes › Ver tutorial
  var _tu=useState(!tutorialVisto()),tuto=_tu[0],setTuto=_tu[1];
  var _cp=useState(false),capas=_cp[0],setCapas=_cp[1];
  useEffect(function(){function f(){req()}window.addEventListener('delta-zonas',f);return function(){window.removeEventListener('delta-zonas',f)}},[]);
  useEffect(function(){function f(){setRv(function(x){return x+1});req()}window.addEventListener('delta-alturas',f);if(alturas())f();return function(){window.removeEventListener('delta-alturas',f)}},[]);
  useEffect(function(){function f(){setLgc(lugares()?lugares().length:0);req()}window.addEventListener('delta-lugares',f);f();return function(){window.removeEventListener('delta-lugares',f)}},[]);
  useEffect(function(){function f(){setLc(local()?local().length:0)}window.addEventListener('delta-local',f);f();return function(){window.removeEventListener('delta-local',f)}},[]);
  function setPrefP(i){setPref(i);try{localStorage.setItem(PRE+'delta_pref',String(i))}catch(e){}}
  var _th=useState(function(){try{return localStorage.getItem(PRE+'delta_theme')||'auto'}catch(e){return 'auto'}}),theme=_th[0],setTheme=_th[1];
  var _on=useState(navigator.onLine!==false),online=_on[0],setOnline=_on[1];
  useEffect(function(){
    function on(){setOnline(true);tiles.current={};req();say('Volvió la señal')}
    function off(){setOnline(false);say('Sin señal: uso los mapas y cauces guardados')}
    window.addEventListener('online',on);window.addEventListener('offline',off);
    return function(){window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[]);

  var drawnPois=useRef([]),drawnRio=useRef([]);
  var cv=useRef(null),sc=useRef(null),scl=useRef(null),raf=useRef(0),tiles=useRef({}),drawRef=useRef(null);
  var D=useRef({}),wid=useRef(null),first=useRef(true),lock=useRef(null),trk=useRef(track),kmR=useRef(0),recR=useRef(false),tt=useRef(0),saveT=useRef(0),fr=useRef(0);
  D.current={zn:zn,rio:rio,pin:pin,marks:marks,track:track,me:me,dest:dest,route:route,layers:layers,orig:orig,res:res,sel:sel,cruise:cruise};

  // Guarda todo en el celular. save() junta varios cambios en una sola escritura:
  // normalmente espera 0,4 s; mientras grabás, escribe como mucho cada 15 s (el recorrido puede ser largo).
  // saveNow() escribe ya: al detener la grabación y cuando la app pasa a segundo plano.
  function saveNow(){clearTimeout(saveT.current);saveT.current=0;
    try{localStorage.setItem(PRE+'delta',JSON.stringify({marks:D.current.marks,track:trk.current,layers:D.current.layers,
      lat:V.current.lat,lng:V.current.lng,z:V.current.z,cruise:D.current.cruise,sat:satR.current,estilo:estR.current}))}catch(e){}}
  function save(){if(!saveT.current)saveT.current=setTimeout(saveNow,recR.current?15000:400)}
  function req(){if(!raf.current)raf.current=requestAnimationFrame(function(){raf.current=0;if(drawRef.current)drawRef.current()})}
  function say(t){setToast(t);clearTimeout(tt.current);tt.current=setTimeout(function(){setToast('')},1800)}
  // Mosaicos del mapa en memoria. Cada uno anota en qué cuadro se usó por última vez (used)
  // para poder descartar los más viejos cuando hay más de MAX_TILES_MEM.
  function tkey(z,x,y,lay){return (lay||base())+'/'+z+'/'+x+'/'+y}
  function peek(z,x,y){return tiles.current[tkey(z,x,y)]}
  function trimTiles(){var T=tiles.current,ks=Object.keys(T);if(ks.length<=MAX_TILES_MEM)return;
    ks.sort(function(a,b){return T[a].used-T[b].used});
    ks.slice(0,ks.length-MAX_TILES_MEM).forEach(function(k){T[k].onload=null;delete T[k]})}
  // Mosaico de la capa lay (estilo base o 'sea' para las señales náuticas). Si falla, se marca para no pedirlo de nuevo en seguida.
  function tile(z,x,y,lay){lay=lay||base();var k=tkey(z,x,y,lay),T=tiles.current;if(T[k]){T[k].used=fr.current;return T[k]}var im=new Image();im.used=fr.current;im.onload=function(){im.ok=1;req()};im.onerror=function(){im.bad=1;setTimeout(function(){if(T[k]===im)delete T[k]},30000)};im.crossOrigin='anonymous';
    im.src=(lay==='sea'?SEAMARK:ESTILOS[lay]).url(z,x,y);T[k]=im;return im}

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
    var EST=ESTILOS[base()],zt=Math.max(0,Math.min(EST.max,18,Math.round(v.z))),s=Math.pow(2,v.z-zt),ts=256*s,n=Math.pow(2,zt);
    for(var tx=Math.floor((ox-ex)/ts);tx<=Math.floor((ox+w+ex)/ts);tx++)for(var ty=Math.floor((oy-ey)/ts);ty<=Math.floor((oy+h+ey)/ts);ty++){
      if(ty<0||ty>=n)continue;var X=((tx%n)+n)%n,im=tile(zt,X,ty);
      if(im.ok)ctx.drawImage(im,tx*ts-ox,ty*ts-oy,ts+.5,ts+.5);
      else if(zt>0){// mientras carga, muestra el cuarto que corresponde del mosaico de un zoom menos
        var pi=peek(zt-1,X>>1,ty>>1);if(pi&&pi.ok){pi.used=fr.current;var hw=(pi.naturalWidth||256)/2;ctx.drawImage(pi,(X&1)*hw,(ty&1)*hw,hw,hw,tx*ts-ox,ty*ts-oy,ts+.5,ts+.5)}}}
    // Señales náuticas de OpenSeaMap encima del mapa (desde zoom 9)
    if(d.layers.sea&&v.z>=SEAMARK.min){var zs=Math.min(SEAMARK.max,Math.round(v.z)),s2=Math.pow(2,v.z-zs),ts2=256*s2,n2=Math.pow(2,zs);
      for(var sx=Math.floor((ox-ex)/ts2);sx<=Math.floor((ox+w+ex)/ts2);sx++)for(var sy=Math.floor((oy-ey)/ts2);sy<=Math.floor((oy+h+ey)/ts2);sy++){
        if(sy<0||sy>=n2)continue;var SX=((sx%n2)+n2)%n2,si=tile(zs,SX,sy,'sea');if(si.ok)ctx.drawImage(si,sx*ts2-ox,sy*ts2-oy,ts2+.5,ts2+.5)}}
    if(fr.current%30===0)trimTiles();
    function P(p){var q=px(p.lat,p.lng,v.z);return{x:q.x-ox,y:q.y-oy}}
    if(d.layers.track&&d.track.length>1){ctx.strokeStyle=C.accent;ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();d.track.forEach(function(p,i){var q=P(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke()}
    // Zonas deportivas de Prefectura (desde zoom 11): áreas pintadas y tramos de río con el color de cada deporte
    var ZN=zonas();
    if(ZN&&d.layers.zonas!==false&&v.z>=11){ctx.lineCap='round';ctx.lineJoin='round';
      ZN.forEach(function(z){var dp=DEPORTES[z.d],on=d.zn&&d.zn.id===z.id;ctx.beginPath();
        z.pts.forEach(function(p,i){var q=P(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});
        if(z.area){ctx.closePath();ctx.globalAlpha=on?.45:.25;ctx.fillStyle=dp.c;ctx.fill();ctx.globalAlpha=.9;ctx.strokeStyle=dp.c;ctx.lineWidth=on?4:2;ctx.setLineDash(z.ap?[8,6]:[]);ctx.stroke()}
        else{ctx.globalAlpha=on?.95:.6;ctx.strokeStyle=dp.c;ctx.lineWidth=(on?10:7)*Math.min(1.4,Math.max(.7,(v.z-10)/4));ctx.setLineDash(z.ap?[12,8]:[]);ctx.stroke()}
        ctx.setLineDash([]);ctx.globalAlpha=1});
      ctx.lineCap='butt'}
    (d.res||[]).forEach(function(r){if(r.mi!=null||(r.poi&&lugares()&&d.layers.pois!==false&&v.z>=(r.c==='fuel'||r.c==='marina'?13:15)))return;var on=r.i===d.sel;
      if(r.lines){ctx.strokeStyle=on?'#ff1f1f':'rgba(255,40,40,.65)';ctx.lineWidth=on?9:6;ctx.lineCap='round';ctx.lineJoin='round';
        r.lines.forEach(function(ln){ctx.beginPath();ln.forEach(function(p,j){var q=P(p);j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke()});ctx.lineCap='butt'}
      else{var q=P(r);ctx.fillStyle=on?'#ff7a1a':'#7c5cff';ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(q.x,q.y,on?10:7,0,7);ctx.fill();ctx.stroke()}
      if(on){var lq=P(r);ctx.save();ctx.translate(lq.x,lq.y);ctx.rotate(-v.r);ctx.font='600 13px system-ui';ctx.lineWidth=3;ctx.strokeStyle=C.bg;ctx.strokeText(r.name,12,-12);ctx.fillStyle=C.fg;ctx.fillText(r.name,12,-12);ctx.restore()}});
    // Lugares del archivo lugares.json. Zoom 13-14: solo combustible y marinas; desde 15, todos.
    // Si dos íconos se pisan se dibuja uno solo (gana el de más prioridad); los nombres, desde zoom 16 y sin encimarse.
    var LG=lugares(),seen={},labs=[],drawn=[];
    if(LG&&d.layers.pois!==false&&v.z>=13){ctx.textAlign='center';ctx.textBaseline='middle';
      var cr0=Math.cos(v.r),sr0=Math.sin(v.r),pinPoi=d.pin&&d.pin.poi;
      LG.forEach(function(x){if(v.z<15&&x.c!=='fuel'&&x.c!=='marina')return;
        var q=P(x);if(q.x<-ex-20||q.x>w+ex+20||q.y<-ey-20||q.y>h+ey+20)return;
        var on=pinPoi&&pinPoi.lat===x.lat&&pinPoi.lng===x.lng;
        // posición real en pantalla (con el giro) para ver si se pisa con otro
        var rx=w/2+(q.x-w/2)*cr0-(q.y-h/2)*sr0,ry=h/2+(q.x-w/2)*sr0+(q.y-h/2)*cr0,ck=Math.round(rx/22)+'_'+Math.round(ry/22);
        if(seen[ck]&&!on)return;seen[ck]=1;drawn.push(x);
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-v.r);
        ctx.fillStyle='rgba(255,255,255,.92)';ctx.strokeStyle=on?C.accent:'rgba(0,0,0,.25)';ctx.lineWidth=on?4:1;ctx.beginPath();ctx.arc(0,0,on?15:12,0,7);ctx.fill();ctx.stroke();
        ctx.font='14px system-ui';ctx.fillStyle='#000';ctx.fillText(x.e,0,1);
        if(v.z>=16&&x.named){ctx.font='600 12px system-ui';var tw=ctx.measureText(x.name).width,box={a:rx+16,b:ry-8,c:rx+16+tw,d:ry+8};
          if(!labs.some(function(o){return box.a<o.c&&box.c>o.a&&box.b<o.d&&box.d>o.b})){labs.push(box);
            ctx.textAlign='left';ctx.lineWidth=3;ctx.strokeStyle=C.bg;ctx.strokeText(x.name,16,0);ctx.fillStyle=C.fg;ctx.fillText(x.name,16,0);ctx.textAlign='center'}}
        ctx.restore()});
      ctx.textAlign='start';ctx.textBaseline='alphabetic'}
    drawnPois.current=drawn;
    // Estaciones de altura del río: cartelito con el último valor (color según el estado), desde zoom 10
    var AL=alturas(),dRio=[];
    if(AL&&d.layers.rio!==false&&v.z>=10){ctx.textBaseline='middle';ctx.textAlign='center';ctx.font='700 11px system-ui';
      AL.estaciones.forEach(function(e){var u=ultimo(e);if(e.lat==null||!u)return;var q=P(e);if(q.x<-ex-30||q.x>w+ex+30||q.y<-ey-20||q.y>h+ey+20)return;
        var st=estado(e,u.v),txt='🌊 '+u.v.toFixed(1).replace('.',',')+(fresca(e)?'':' ·'),tw=ctx.measureText(txt).width+12,on=d.rio===e.id;
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-v.r);ctx.globalAlpha=fresca(e)?1:.7;
        ctx.fillStyle='rgba(255,255,255,.95)';ctx.strokeStyle=st.c.indexOf('var(')===0?'#888':st.c;ctx.lineWidth=on?3:2;
        ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-tw/2,-10,tw,20,10);else ctx.rect(-tw/2,-10,tw,20);ctx.fill();ctx.stroke();
        ctx.fillStyle='#0b3d4a';ctx.fillText(txt,0,1);ctx.restore();dRio.push(e)});
      ctx.textAlign='start';ctx.textBaseline='alphabetic'}
    drawnRio.current=dRio;
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
    if(d.pin&&d.pin.mi!=null){var sq=P(d.pin);ctx.strokeStyle=C.accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(sq.x,sq.y,15,0,7);ctx.stroke()}
    else if(d.pin&&!d.pin.poi){var pq=P(d.pin);ctx.fillStyle='#e5484d';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(pq.x,pq.y-22,11,Math.PI*0.8,Math.PI*2.2);ctx.lineTo(pq.x,pq.y);ctx.closePath();ctx.fill();ctx.stroke();
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
  // ¿El toque cayó sobre un punto guardado? Devuelve su número o -1 (radio de 24 px)
  // ¿El toque cayó sobre un lugar del archivo? Devuelve el lugar o null (radio de 22 px)
  function tapPoi(sp){var d=D.current,L=drawnPois.current,v=V.current;if(!L||!L.length||d.layers.pois===false||v.z<13)return null;
    var g=toLL(sp.x,sp.y),t=px(g.lat,g.lng,v.z),best=null,bd=22;
    L.forEach(function(x){var q=px(x.lat,x.lng,v.z),dd=Math.hypot(q.x-t.x,q.y-t.y);if(dd<bd){bd=dd;best=x}});return best}
  function tapRio(sp){var L=drawnRio.current,v=V.current;if(!L.length)return null;var g=toLL(sp.x,sp.y),t=px(g.lat,g.lng,v.z),best=null,bd=26;
    L.forEach(function(e){var q=px(e.lat,e.lng,v.z),dd=Math.hypot(q.x-t.x,q.y-t.y);if(dd<bd){bd=dd;best=e}});return best}
  function tapMark(sp){var d=D.current;if(!d.layers.marks)return -1;var v=V.current,g=toLL(sp.x,sp.y),t=px(g.lat,g.lng,v.z),best=-1,bd=24;
    d.marks.forEach(function(m,i){var q=px(m.lat,m.lng,v.z),dd=Math.hypot(q.x-t.x,q.y-t.y);if(dd<bd){bd=dd;best=i}});return best}
  useEffect(function(){
    var c=cv.current,G={ptr:{},last:null,lastTap:0,pinch:null},v=V.current;
    function pos(e){var r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
    // Zoom animado alrededor de un punto de la pantalla (doble toque: acerca; toque con dos dedos: aleja)
    function animZoom(sx,sy,dz){if(G.anim)cancelAnimationFrame(G.anim);var z0=v.z,t0=performance.now(),T=300;
      function f(now){var k=Math.min(1,(now-t0)/T),e=1-Math.pow(1-k,3);zoomAt(sx,sy,z0+dz*e);if(k<1)G.anim=requestAnimationFrame(f);else{G.anim=0;save()}}
      G.anim=requestAnimationFrame(f)}
    function size(){var r=c.getBoundingClientRect();c.width=r.width*dpr;c.height=r.height*dpr;req()}
    function down(e){setSopen(false);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();c.setPointerCapture(e.pointerId);
      if(G.anim){cancelAnimationFrame(G.anim);G.anim=0}
      G.ptr[e.pointerId]=pos(e);var np0=Object.keys(G.ptr).length;
      // Gesto: cuántos dedos llegó a tener, cuándo empezó y cuánto se movió (para reconocer el toque con dos dedos)
      if(np0===1)G.gs={t:Date.now(),maxp:1,moved:0,mid:null};else if(G.gs){G.gs.maxp=Math.max(G.gs.maxp,np0);var pp=Object.keys(G.ptr).map(function(k){return G.ptr[k]});G.gs.mid={x:(pp[0].x+pp[1].x)/2,y:(pp[0].y+pp[1].y)/2}}
      G.last={t:Date.now(),moved:np0>1?99:0};G.pinch=null;G.acc=0;G.rot=false;
      // Mantener apretado medio segundo sin mover: pone un pin ahí y pregunta el nombre
      clearTimeout(G.lp);var p0=G.ptr[e.pointerId];G.lp=Object.keys(G.ptr).length===1?setTimeout(function(){if(G.last&&G.last.moved<10&&Object.keys(G.ptr).length===1){G.last.moved=99;var g=toLL(p0.x,p0.y);setName('');setPin({lat:g.lat,lng:g.lng})}},500):0}
    function move(e){var p=G.ptr[e.pointerId];if(!p)return;var np=pos(e),ids=Object.keys(G.ptr);
      if(ids.length===2){G.ptr[e.pointerId]=np;var a=G.ptr[ids[0]],b=G.ptr[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
        if(G.pinch&&G.gs)G.gs.moved+=Math.abs(d-G.pinch.d)+Math.hypot(mx-G.pinch.x,my-G.pinch.y);
        if(G.pinch){var ang=Math.atan2(b.y-a.y,b.x-a.x),da=ang-G.pinch.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;
          G.acc=(G.acc||0)+da;if(!G.rot){if(Math.abs(G.acc)>0.26){G.rot=true;da=G.acc-(G.acc>0?0.26:-0.26)}else da=0}
          zoomAt(mx,my,v.z+Math.log2(d/G.pinch.d));v.r+=da;
          var cr=Math.cos(v.r),sr=Math.sin(v.r),sx=mx-G.pinch.x,sy=my-G.pinch.y,c1=px(v.lat,v.lng,v.z),q=ll(c1.x-(sx*cr+sy*sr),c1.y-(-sx*sr+sy*cr),v.z);v.lat=q.lat;v.lng=q.lng;req()}
        G.pinch={d:d,x:mx,y:my,a:Math.atan2(b.y-a.y,b.x-a.x)};if(G.last)G.last.moved=99;return}
      var dx=np.x-p.x,dy=np.y-p.y;if(G.last)G.last.moved+=Math.abs(dx)+Math.abs(dy);if(G.gs)G.gs.moved+=Math.abs(dx)+Math.abs(dy);if(G.last&&G.last.moved>=10)clearTimeout(G.lp);
      var cr2=Math.cos(v.r),sr2=Math.sin(v.r),c2=px(v.lat,v.lng,v.z),q2=ll(c2.x-(dx*cr2+dy*sr2),c2.y-(-dx*sr2+dy*cr2),v.z);v.lat=Math.max(-85,Math.min(85,q2.lat));v.lng=q2.lng;G.ptr[e.pointerId]=np;req()}
    function up(e){var np=pos(e);clearTimeout(G.lp);delete G.ptr[e.pointerId];G.pinch=null;
      if(!Object.keys(G.ptr).length&&G.gs&&G.gs.maxp===2&&Date.now()-G.gs.t<350&&G.gs.moved<14&&G.gs.mid){var m=G.gs.mid;G.gs=null;G.lastTap=0;animZoom(m.x,m.y,-1);return}
      if(!Object.keys(G.ptr).length){if(G.last&&G.last.moved<8&&Date.now()-G.last.t<300){var hit=tapMark(np);
        if(hit>=0){var hm=D.current.marks[hit];setName('');setPin({lat:hm.lat,lng:hm.lng,mi:hit});G.lastTap=0;save();return}
        var hr=tapRio(np);if(hr){setPin(null);setCapas(false);setRio(hr.id);G.lastTap=0;save();return}
        var hp=tapPoi(np);if(hp){setName('');setZn(null);setPin({lat:hp.lat,lng:hp.lng,poi:hp});G.lastTap=0;save();return}
        if(D.current.layers.zonas!==false&&v.z>=11){var hz=zonaEn(toLL(np.x,np.y),v.z);if(hz){setPin(null);setRio(null);setCapas(false);setZn(hz);G.lastTap=0;save();return}}
        if(D.current.zn)setZn(null);
        if(D.current.pin&&(D.current.pin.mi!=null||D.current.pin.poi))setPin(null);
        var n=Date.now();if(n-G.lastTap<320){animZoom(np.x,np.y,1);G.lastTap=0}else G.lastTap=n}save()}}
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
  useEffect(req,[pin,rio,rv,zn]);

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
  function pinDest(){goDest({lat:pin.lat,lng:pin.lng,name:pin.poi?pin.poi.name:pin.mi!=null&&marks[pin.mi]?marks[pin.mi].name:''});pinDone()}
  function openPoi(r){setSopen(false);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    setName('');setPin({lat:r.lat,lng:r.lng,poi:r});flyTo(r.lat,r.lng,Math.max(V.current.z,15))}
  // Cómo llegar: marca el destino y calcula la ruta por agua apenas haya desde dónde salir
  var autoR=useRef(false);
  function goDest(p){setDest(p);setCol(false);setSopen(false);autoR.current=true;
    if(!D.current.orig&&!D.current.me){first.current=true;startGPS();say('Buscando tu posición para la ruta…')}else say(p.name?'Ruta hasta '+p.name:'Destino marcado')}
  // Abre la tarjeta de un punto guardado y lo centra en el mapa
  function openMark(i){var m=marks[i];if(!m)return;setSopen(false);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    setName('');setPin({lat:m.lat,lng:m.lng,mi:i});flyTo(m.lat,m.lng,Math.max(V.current.z,15))}
  function pinOrig(){setOrig({lat:pin.lat,lng:pin.lng});pinDone();say('Salida marcada')}
  useEffect(function(){setRoute(null)},[dest,orig,pref]);
  useEffect(function(){if(autoR.current&&dest&&(orig||me)){autoR.current=false;calcRoute()}},[dest,orig,me]);
  function flyTo(lat,lng,z){var v=V.current,s={lat:v.lat,lng:v.lng,z:v.z},t0=performance.now();
    (function st(t){var k=Math.min(1,(t-t0)/700),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;v.lat=s.lat+(lat-s.lat)*e;v.lng=s.lng+(lng-s.lng)*e;v.z=s.z+(z-s.z)*e;req();if(k<1)requestAnimationFrame(st);else save()})(t0)}
  // up: deja libre la parte de abajo (panel de la ruta) y encuadra en la mitad de arriba
  function fitPts(pts,up){var a=1e9,b=-1e9,c=1e9,d=-1e9;pts.forEach(function(p){a=Math.min(a,p.lat);b=Math.max(b,p.lat);c=Math.min(c,p.lng);d=Math.max(d,p.lng)});
    var w=cv.current.clientWidth,h=cv.current.clientHeight,z=17;
    for(;z>3;z-=0.25){var p1=px(b,c,z),p2=px(a,d,z);if(p2.x-p1.x<=w*0.8&&p2.y-p1.y<=h*(up?0.34:0.4))break}
    z=Math.min(z,17);if(!up){flyTo((a+b)/2,(c+d)/2,z);return}
    var r=V.current.r,k=px((a+b)/2,(c+d)/2,z),o=h*0.13,g=ll(k.x+o*Math.sin(r),k.y+o*Math.cos(r),z);flyTo(g.lat,g.lng,z)}
  function northUp(){var v=V.current,r0=((v.r+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI,t0=performance.now();
    (function st(t){var k=Math.min(1,(t-t0)/350),e=1-Math.pow(1-k,3);v.r=r0*(1-e);req();if(k<1)requestAnimationFrame(st)})(t0)}
  function addHist(t){var h=[t].concat(hist.filter(function(x){return x!==t})).slice(0,15);setHist(h);try{localStorage.setItem(PRE+'delta_hist',JSON.stringify(h))}catch(e){}}
  function stopSearch(){sq.current++;setSearching(false)}
  function clearSearch(){stopSearch();setQ('');setRes([]);setSel(-1);setSopen(false)}
  function pick(r){setSel(r.i);setSopen(false);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    if(r.lines){var pts=[];r.lines.forEach(function(l){pts=pts.concat(l)});fitPts(pts)}else openPoi(r)}
  // Búsqueda unificada: tus puntos guardados + cauces (archivo local, al instante) + lugares (servidor).
  // Si coincide un punto guardado, va directo a su pin y abre su tarjeta.
  var sq=useRef(0);
  function num(a){a.forEach(function(r,i){r.i=i});return a}
  function runSearch(text){
    var t=(typeof text==='string'?text:q).trim();if(!t)return;
    var my=++sq.current;
    setQ(t);setSopen(true);setSel(-1);setSearching(true);addHist(t);
    var v=V.current,la=Math.round(v.lat*20)/20,lo=Math.round(v.lng*20)/20,cat=null,n=norm(t),body;
    CATS.forEach(function(c){if(!cat&&c.re.test(n))cat=c});
    var first=[],L=lugares();
    function cl(x){return Object.assign({},x)}
    if(cat&&L){var ref=D.current.me||{lat:v.lat,lng:v.lng},dc=L.filter(function(x){return x.c===cat.c});
      var cerca=dc.filter(function(x){return dist(ref,x)<=20});first=num((cerca.length?cerca:dc).map(cl));setRes(first);
      if(first.length===1)openPoi(first[0]);else if(first.length)fitPts(first)}
    if(!cat){
      var mine=D.current.marks.map(function(m,i){return{name:m.name,kind:'Tu punto guardado',lat:m.lat,lng:m.lng,lines:null,mi:i}})
        .filter(function(x){return norm(x.name).indexOf(n)>=0});
      var nr=n.replace(/[^a-z0-9 ]/g,''),loc=local()?parseRes(local().filter(function(x){return x.tags&&x.tags.waterway&&x.tags.name&&norm(x.tags.name).indexOf(nr)>=0})):[];
      var lug=L?L.filter(function(x){return x.named&&norm(x.name).indexOf(n)>=0}).map(cl):[];
      first=num(mine.concat(loc,lug));setRes(first);
      if(mine.length)openMark(mine[0].mi);
      else if(first.length===1&&!first[0].lines)openPoi(first[0]);
      else if(first.length){var p0=[];first.forEach(function(x){if(x.lines)x.lines.forEach(function(l){p0=p0.concat(l)});else p0.push(x)});fitPts(p0)}}
    // Con lugares.json no hace falta el servidor: todo sale del celular, al instante y sin señal
    if(L){setSearching(false);if(!first.length)say('No encontré resultados');return}
    if(cat)body='[out:json][timeout:25];('+cat.f.map(function(f){return 'nwr'+f+'(around:15000,'+la.toFixed(4)+','+lo.toFixed(4)+');'}).join('')+');out center tags 80;';
    else{var bb=[la-0.7,lo-0.7,la+0.7,lo+0.7].map(function(x){return x.toFixed(4)}).join(','),rx=flex(t);
      // Con cauces.json cargado, los cauces ya salieron del archivo: al servidor solo se le piden lugares
      body='[out:json][timeout:25];('+(local()?'':'way["waterway"~"^(river|canal|stream|tidal_channel)$"]["name"~"'+rx+'",i]('+bb+');')+['amenity','leisure','tourism'].map(function(k){return 'nwr["name"~"'+rx+'",i]["'+k+'"]('+bb+');'}).join('')+');out geom;'}
    var srv=ovp(body,function(i){if(i>0&&!first.length)say('El servidor tarda, probando otro…')});
    if(first.length)srv=Promise.race([srv,new Promise(function(ok){setTimeout(function(){ok({elements:[]})},8000)})]);
    srv.then(function(j){if(my!==sq.current)return;
      var extra=parseRes(j.elements||[]),r=num(first.concat(extra));setRes(r);setSearching(false);
      if(first.length)return;
      if(!r.length){say('No encontré resultados');return}
      var pts=[];r.forEach(function(x){if(x.lines)x.lines.forEach(function(l){pts=pts.concat(l)});else pts.push(x)});
      if(r.length===1&&!r[0].lines){setSel(0);flyTo(r[0].lat,r[0].lng,16)}else fitPts(pts)})
     .catch(function(){if(my!==sq.current)return;setSearching(false);if(!first.length)say('No pude buscar ahora. Probá de nuevo en un rato.')});
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
      .then(function(j){var r=solve(j.elements||[],m,d,PREFS[pref]);r.t0=performance.now();setRoute(r);setRouting(false);if(!r.ok)say(r.msg);fitPts(r.ok?r.pts:[m,d],true)})
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

  function toggleSat(){satR.current=!satR.current;setSat(satR.current);req();save()}
  // Elegir estilo en Capas: 'sat' prende el satélite; cualquier otro lo apaga y cambia el mapa base
  function elegirEstilo(k){if(k==='sat'){satR.current=true;setSat(true)}else{satR.current=false;setSat(false);estR.current=k;setEstilo(k)}req();setTimeout(saveNow,0)}
  useEffect(function(){
    var alive=true;
    function go(){var v=V.current,m=D.current.me,la=m?m.lat:v.lat,lo=m?m.lng:v.lng;
      fetch('https://api.open-meteo.com/v1/forecast?latitude='+la.toFixed(3)+'&longitude='+lo.toFixed(3)+'&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn')
        .then(function(r){return r.json()}).then(function(j){if(alive&&j.current)setWx(j.current)}).catch(function(){})}
    go();var id=setInterval(go,600000);return function(){alive=false;clearInterval(id)}
  },[]);

  // Capas: se usan en la pestaña del menú y en el panel del botón de capas
  function capasUI(){return html`<div>
    <div className="lr" style=${{flexWrap:'wrap',padding:'8px 0'}}><span>Estilo de mapa</span><div className="estilos">${ORDEN.map(function(k){var on=sat?k==='sat':k===estilo;
      return html`<button key=${k} className=${'mini'+(on?' on':'')} onClick=${function(){elegirEstilo(k)}}>${ESTILOS[k].n}</button>`})}</div></div>
    <div className="lr"><span>Zonas deportivas <small style=${{color:'var(--muted)'}}>(Prefectura)</small></span>${sw(layers.zonas!==false,function(){var n=Object.assign({},layers);n.zonas=layers.zonas===false;setLayers(n)})}</div>
    ${layers.zonas!==false?html`<div className="zleg">${Object.keys(DEPORTES).map(function(k){var dp=DEPORTES[k];return html`<span key=${k}><i style=${{background:dp.c}}></i>${dp.n}</span>`})}
      <small className="zayuda">Tocá una zona en el mapa para ver qué deporte es. Se ven desde zoom 11; las punteadas son aproximadas.</small></div>`:null}
    <div className="lr"><span>Señales náuticas <small style=${{color:'var(--muted)'}}>(boyas y balizas, OpenSeaMap)</small></span>${sw(!!layers.sea,function(){setLayer('sea')})}</div>
    <div className="lr"><span>Alturas del río</span>${sw(layers.rio!==false,function(){var n=Object.assign({},layers);n.rio=layers.rio===false;setLayers(n)})}</div>
    <div className="lr"><span>Lugares <small style=${{color:'var(--muted)'}}>(combustible, restaurantes…)</small></span>${sw(layers.pois!==false,function(){var n=Object.assign({},layers);n.pois=layers.pois===false;setLayers(n)})}</div>
    <div className="lr"><span>Puntos guardados</span>${sw(layers.marks,function(){setLayer('marks')})}</div>
    <div className="lr"><span>Recorrido grabado</span>${sw(layers.track,function(){setLayer('track')})}</div>
    <div className="lr"><span>Destino y ruta</span>${sw(layers.route,function(){setLayer('route')})}</div>
    <div className="lr"><span>Viento y clima</span>${sw(layers.wx,function(){setLayer('wx')})}</div>
  </div>`}
  var from=orig||me;
  // Altura del río más cercana (a vos o al centro del mapa) para el recuadro de arriba
  var AL=alturas(),rioE=AL?cercana(me||{lat:V.current.lat,lng:V.current.lng}):null,rioU=rioE?ultimo(rioE):null;
  var rioH=rioE&&rioU?{e:rioE,u:rioU}:null,shnAviso=AL&&AL.shn&&AL.shn.aviso;
  var rioSel=AL&&rio!=null?AL.estaciones.filter(function(e){return e.id===rio})[0]:null;
  var rk=(route&&route.ok)?route.km:(from&&dest?dist(from,dest):0);
  var sref=me||{lat:V.current.lat,lng:V.current.lng};
  // Puntos guardados que coinciden con lo escrito (sin tildes). Con el buscador vacío, los 5 más cercanos.
  var nq=norm(q.trim()),saved=marks.map(function(m,i){return{m:m,i:i,d:me?dist(me,m):null}})
    .filter(function(x){return !nq||norm(x.m.name).indexOf(nq)>=0});
  saved.sort(function(a,b){return (a.d==null?0:a.d)-(b.d==null?0:b.d)});saved=nq&&!res.length?saved.slice(0,20):[];
  var list=res.map(function(r){return{r:r,d:dTo(r,sref)}});
  list.sort(function(a,b){var g=(a.r.mi!=null?0:1)-(b.r.mi!=null?0:1);return g||(sortBy==='near'?a.d-b.d:a.r.name.localeCompare(b.r.name))});
  var dst=rec?'Grabando… '+(km/1.852).toFixed(2)+' mn':(km?(km/1.852).toFixed(2)+' mn recorridas':'Sin grabar');

  return html`<div id="app">
    <canvas ref=${cv}></canvas>
    <div className="hud">${ES_TEST?html`<small style=${{background:'#d9480f',color:'#fff',fontWeight:700,borderRadius:6,padding:'1px 6px',alignSelf:'flex-start'}}>PRUEBA</small>`:null}<b>${spd} nd</b><small>${dst}</small><div className="scale" ref=${sc}></div><small ref=${scl}></small>${wx&&layers.wx?html`<small>Viento ${Math.round(wx.wind_speed_10m)} nd ${DIRS[Math.round(wx.wind_direction_10m/45)%8]} · ráf. ${Math.round(wx.wind_gusts_10m)}</small><small>${Math.round(wx.temperature_2m)} °C</small>`:null}${rioH?html`<button className="rioh" onClick=${function(){setRio(rioH.e.id)}}>🌊 ${rioH.e.n.split(' (')[0]} <b>${metros(rioH.u.v)}</b> ${tendencia(rioH.e)}</button>`:null}${shnAviso?html`<button className="rioh" style=${{color:'#c92a2a',fontWeight:700}} onClick=${function(){setRio((rioH&&rioH.e.id)||52)}}>⚠ Aviso del SHN</button>`:null}${online?null:html`<small style=${{color:'var(--danger)',fontWeight:600}}>Sin señal</small>`}</div>
    <div className="atrib">© ${ESTILOS[sat?'sat':estilo].at}${layers.sea?' · OpenSeaMap':''}</div>
    <div className="fabs">
      <button className="fab" aria-label="Mi posición" onClick=${locate}>◎</button>
      <button className="fab" aria-label="Satélite" onClick=${toggleSat}>${sat?'🗺':'🛰'}</button>
      <button className=${'fab'+(rec?' recon':'')} aria-label=${rec?'Detener recorrido':'Grabar recorrido'} onClick=${function(){recOn(!rec)}}>${rec?html`<i className="sq"></i>`:html`<i className="dot"></i>`}</button>
      <button className=${'fab'+(capas?' fabon':'')} aria-label="Capas" onClick=${function(){var a=!capas;setCapas(a);if(a){setPin(null);setRio(null);setZn(null)}}}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3 2.5 8 12 13l9.5-5L12 3z"/><path d="m2.5 12 9.5 5 9.5-5"/><path d="m2.5 16 9.5 5 9.5-5"/></svg></button>
    </div>
    <div id="toast" className=${toast?'on':''}>${toast}</div>
    <button className="fab burger" aria-label="Menú" onClick=${function(){setMenu(true)}}>☰</button>
    <button className="fab compass" aria-label="Norte arriba" onClick=${northUp}><span ref=${cmp}><svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2L17 13H7Z" fill="#e5484d"/><path d="M12 22L7 13H17Z" fill="currentColor" opacity=".45"/></svg></span></button>
    <div className="sb"><span>🔍</span><input value=${q} placeholder="Buscar lugares, ríos, arroyos…" enterKeyHint="search"
      onFocus=${function(){setSopen(true)}} onInput=${function(e){setQ(e.target.value);if(res.length||searching){stopSearch();setRes([]);setSel(-1)}}}
      onKeyDown=${function(e){if(e.key==='Enter'){runSearch();e.target.blur()}}} />
      ${q?html`<button className="clr" aria-label="Limpiar" onClick=${clearSearch}>✕</button>`:null}</div>
    <div id="sr" className=${sopen?'on':''}>
      ${saved.length?html`<div><div className="srh"><b>Tus puntos</b></div>${saved.map(function(x){return html`<div className="mi" key=${'g'+x.i}>
          <span onClick=${function(){openMark(x.i)}}>📍 ${x.m.name}${x.d!=null?html`<small style=${{color:'var(--muted)',display:'block'}}>Guardado · a ${x.d.toFixed(1)} km</small>`:html`<small style=${{color:'var(--muted)',display:'block'}}>Guardado</small>`}</span>
          <button className="mini" aria-label="Cómo llegar" onClick=${function(){goDest({lat:x.m.lat,lng:x.m.lng,name:x.m.name})}}>➤</button></div>`})}</div>`:null}
      ${searching&&!list.length?html`<div className="empty">Buscando…</div>`
       :list.length?html`<div><div className="srh"><b>${list.length} resultados${searching?html` <small style=${{color:'var(--muted)',fontWeight:400}}>· buscando más…</small>`:null}</b><div className="seg">
            <button className=${'mini'+(sortBy==='near'?' on':'')} onClick=${function(){setSortBy('near')}}>Más cercano</button>
            <button className=${'mini'+(sortBy==='name'?' on':'')} onClick=${function(){setSortBy('name')}}>A–Z</button></div></div>
          ${list.map(function(x){var r=x.r;return html`<div className=${'mi'+(sel===r.i?' sel':'')} key=${r.i}>
            <span onClick=${function(){r.mi!=null?openMark(r.mi):pick(r)}}>${r.mi!=null?'📍 ':''}${r.name}<small style=${{color:'var(--muted)',display:'block'}}>${r.kind}${r.lines?' · '+r.km.toFixed(1)+' km de largo':''} · a ${x.d.toFixed(1)} km</small></span>
            ${r.lines?null:html`${r.mi!=null?null:html`<button className="mini" aria-label="Guardar" onClick=${function(){setMarks(marks.concat([{name:r.name,lat:r.lat,lng:r.lng}]));say('Guardado: '+r.name)}}>☆</button>`}
              <button className="mini" aria-label="Ir" onClick=${function(){goDest({lat:r.lat,lng:r.lng,name:r.name})}}>➤</button>`}
          </div>`})}</div>`
       :saved.length?null
       :html`<div>${hist.length?html`<div><div className="srh"><b>Recientes</b></div>${hist.slice(0,5).map(function(h){return html`<div className="mi" key=${h}><span onClick=${function(){runSearch(h)}}>🕘 ${h}</span></div>`})}</div>`:null}
          <div className="srh"><b>Sugerencias</b></div>
          <div className="chips">${CATS.map(function(c){return html`<button key=${c.n} className="mini" onClick=${function(){runSearch(c.n)}}>${c.e} ${c.n}</button>`})}</div></div>`}
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
                <button className="mini" aria-label="Ir" onClick=${function(){setMenu(false);goDest({lat:m.lat,lng:m.lng,name:m.name})}}>➤</button>
                <button className="mini" aria-label="Borrar" style=${{color:'var(--danger)'}} onClick=${function(){del(i)}}>✕</button>`}
          </div>`}):html`<div className="empty">Todavía no guardaste ningún punto. Usá Marcar en el mapa.</div>`)
        :tab==='capas'?capasUI()
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
            <div className="lr"><span>Lugares guardados</span><small style=${{color:'var(--muted)'}}>${lgc?lgc.toLocaleString('es-AR')+' lugares ✓'+(lugaresFecha()?' ('+lugaresFecha().split('-').reverse().join('/')+')':''):'no cargados'}</small></div>
            <div className="lr"><span>Copia de seguridad<br/><small style=${{color:'var(--muted)'}}>${marks.length} puntos · ${track.length>1?'con recorrido':'sin recorrido'}</small></span><div className="seg">
              <button className="mini" onClick=${doExport}>Exportar</button>
              <button className="mini" onClick=${function(){if(fileIn.current)fileIn.current.click()}}>Importar</button></div>
              <input ref=${fileIn} type="file" accept=".json,application/json" style=${{display:'none'}} onChange=${doImport} /></div>
            <div className="lr"><span>Cómo se usa la app</span><button className="mini" onClick=${function(){setMenu(false);setTuto(true)}}>Ver tutorial</button></div>
            <div className="lr"><span>Borrar recorrido grabado</span><button className="mini" style=${{color:'var(--danger)'}} onClick=${function(){trk.current=[];kmR.current=0;setTrack([]);setKm(0);say('Recorrido borrado')}}>Borrar</button></div>
          </div>`}
      </div>
    </div>
    ${rioSel?(function(e){var u=ultimo(e),st=estado(e,u&&u.v),mr=e.id===52?mareas():[],sh=AL.shn,g=grafico(html,e,340,150);
      var fut=e.fc.filter(function(o){return o.t>Date.now()}),mx=fut.reduce(function(a,o){return !a||o.v>a.v?o:a},null),mn=fut.reduce(function(a,o){return !a||o.v<a.v?o:a},null);
      return html`<div id="riocard">
      <div className="row" style=${{alignItems:'center'}}><div style=${{flex:1}}><b style=${{fontSize:'18px'}}>🌊 ${e.n}</b>
        <small style=${{color:'var(--muted)',display:'block'}}>${me&&e.lat!=null?'A '+dist(me,e).toFixed(1)+' km · ':''}Fuente: ${e.fuente==='PNA'?'Prefectura (escala)':e.fuente}</small></div>
        <button className="clr" aria-label="Cerrar" onClick=${function(){setRio(null)}}>✕</button></div>
      <div className="chips rioest">${AL.estaciones.filter(function(x){return x.obs.length}).map(function(x){return html`<button key=${x.id} className=${'mini'+(x.id===e.id?' on':'')} onClick=${function(){setRio(x.id)}}>${x.n.split(' (')[0]}</button>`})}</div>
      ${u?html`<div className="riobig"><b>${metros(u.v)}</b> <span>${tendencia(e)}</span> <i style=${{background:st.c}}>${st.n}</i></div>
        <small style=${{color:'var(--muted)'}}>Medido ${hace(u.t)} (${dia(u.t)} ${hora(u.t)})${fresca(e)?'':' · esta escala se lee una vez por día'}</small>`:html`<div className="empty">Sin mediciones recientes.</div>`}
      ${g?html`<div className="riog">${g}<small style=${{color:'var(--muted)'}}>${e.fc.length?html`Línea llena: medido · punteada: pronóstico del INA (${dia(new Date(e.fc_fecha))} ${hora(new Date(e.fc_fecha))})`:'Últimas 24 horas medidas · sin pronóstico para esta estación'}</small></div>`:null}
      ${mx&&mn?html`<div className="lr"><span>Pronóstico próximos días</span><small>máx. <b>${metros(mx.v)}</b> ${dia(mx.t)} ${hora(mx.t)} · mín. <b>${metros(mn.v)}</b> ${dia(mn.t)} ${hora(mn.t)}</small></div>`:null}
      ${mr.length?html`<div><div className="srh" style=${{paddingTop:'6px'}}><b>Mareas en San Fernando (SHN)</b></div>${mr.map(function(m){return html`<div className="lr" key=${m.t.getTime()}><span>${m.tipo==='pleamar'?'▲ Pleamar':'▼ Bajamar'}</span><small><b>${metros(m.h)}</b> · ${dia(m.t)} ${hora(m.t)}</small></div>`})}
        ${sh&&sh.correccion?html`<small style=${{color:'var(--muted)',display:'block',paddingTop:'4px'}}>Corrección por viento: ${sh.correccion.charAt(0)+sh.correccion.slice(1).toLowerCase()}</small>`:null}</div>`:null}
      ${sh&&sh.aviso?html`<div className="rioaviso"><b>⚠ Aviso del SHN</b><small>${sh.aviso}</small></div>`:null}
      <small style=${{color:'var(--muted)'}}>Altura sobre el cero de la escala: no es la profundidad del lugar.${e.alerta!=null?' Alerta desde '+metros(e.alerta)+'.':''}${e.bajas!=null?' Aguas bajas hasta '+metros(e.bajas)+'.':''} Datos: INA y SHN, actualizados ${hace(new Date(AL.actualizado))}.</small>
    </div>`})(rioSel):null}
    ${capas?html`<div id="capascard">
      <div className="row" style=${{alignItems:'center'}}><b style=${{flex:1,fontSize:'18px'}}>Capas</b><button className="clr" aria-label="Cerrar" onClick=${function(){setCapas(false)}}>✕</button></div>
      ${capasUI()}</div>`:null}
    ${zn&&!pin&&!rioSel?(function(z){var dp=DEPORTES[z.d];return html`<div id="pincard">
      <div className="row" style=${{alignItems:'center'}}><div style=${{flex:1}}><b style=${{fontSize:'18px'}}>${dp.e} ${dp.n}</b>
        <small style=${{color:'var(--muted)',display:'block'}}>Zona de práctica deportiva · ${z.sec}${z.area?'':' · '+largo(z).toFixed(1).replace('.',',')+' km'}</small></div>
        <button className="clr" aria-label="Cerrar" onClick=${function(){setZn(null)}}>✕</button></div>
      <small style=${{color:'var(--muted)'}}>${z.ap?'Ubicación aproximada, pasada a mano del croquis de la Prefectura. ':'Tramo pasado del croquis de la Prefectura sobre el trazado del río. '}Es una referencia: vale lo que dice la disposición vigente de la Prefectura.</small>
      ${fuenteZonas()?html`<a className="btn" style=${{display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}} href=${fuenteZonas()} target="_blank" rel="noopener">Ver croquis de la Prefectura</a>`:null}
    </div>`})(zn):null}
    ${pin&&pin.mi!=null&&marks[pin.mi]?html`<div id="pincard">
      <div className="row" style=${{alignItems:'center'}}><div style=${{flex:1}}><b style=${{fontSize:'18px'}}>${marks[pin.mi].name}</b>
        <small style=${{color:'var(--muted)',display:'block'}}>Punto guardado${me?' · a '+(dist(me,pin)/1.852).toFixed(1)+' mn ('+dist(me,pin).toFixed(1)+' km)':''}</small></div>
        <button className="clr" aria-label="Cerrar" onClick=${pinDone}>✕</button></div>
      <div className="row"><button className="btn p" onClick=${pinDest}>Cómo llegar</button>${dest?html`<button className="btn" onClick=${pinOrig}>Salir de acá</button>`:null}</div>
    </div>`
    :pin&&pin.poi?html`<div id="pincard">
      <div className="row" style=${{alignItems:'center'}}><div style=${{flex:1}}><b style=${{fontSize:'18px'}}>${pin.poi.e?pin.poi.e+' ':''}${pin.poi.name}</b>
        <small style=${{color:'var(--muted)',display:'block'}}>${pin.poi.kind}${me?' · a '+(dist(me,pin)/1.852).toFixed(1)+' mn ('+dist(me,pin).toFixed(1)+' km)':''}</small></div>
        <button className="clr" aria-label="Cerrar" onClick=${pinDone}>✕</button></div>
      <div className="row"><button className="btn p" onClick=${pinDest}>Cómo llegar</button>
        <button className="btn" style=${{flex:'none',padding:'0 16px'}} aria-label="Guardar en tus puntos" onClick=${function(){setMarks(marks.concat([{name:pin.poi.name,lat:pin.lat,lng:pin.lng}]));say('Guardado: '+pin.poi.name);pinDone()}}>☆</button>
        ${dest?html`<button className="btn" onClick=${pinOrig}>Salir de acá</button>`:null}</div>
    </div>`
    :pin?html`<div id="pincard">
      <div className="row"><b style=${{flex:1}}>Nuevo punto</b><button className="clr" aria-label="Cancelar" onClick=${pinDone}>✕</button></div>
      <div className="row"><input value=${name} placeholder="Nombre (muelle, arroyo…)" enterKeyHint="done"
        onInput=${function(e){setName(e.target.value)}} onKeyDown=${function(e){if(e.key==='Enter')addMark()}} /></div>
      <div className="row"><button className="btn p" onClick=${addMark}>Guardar</button><button className="btn" onClick=${pinDest}>Ir ahí</button>${dest?html`<button className="btn" onClick=${pinOrig}>Salir de acá</button>`:null}</div>
    </div>`:null}
    ${dest?html`<div id="sheet" className=${col?'col':''} style=${{'--peek':from?'64px':'42px'}}>
      <div id="handle" onPointerDown=${function(e){hy.current=e.clientY}} onPointerUp=${function(e){var dy=e.clientY-hy.current;if(dy>24)setCol(true);else if(dy<-24)setCol(false);else setCol(!col)}}><i></i>${col&&from?html`<span className="sumtx">${(rk/1.852).toFixed(1)} mn · ${fmtT(rk/1.852/cruise)}</span>`:null}</div>
      <div className="route">
        ${dest.name?html`<div style=${{fontSize:'17px'}}><b>Hacia ${dest.name}</b></div>`:null}
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
          <button className="mini" onClick=${function(){setDest(null);setOrig(null);setRoute(null);autoR.current=false}}>Quitar destino</button>
        </div>
        <small>${route?(route.ok?'Ruta sobre cauces de OpenStreetMap que prioriza ríos, luego canales y arroyos. No sabe si un arroyo está seco ni las alturas de puentes. No reemplaza las cartas oficiales.':route.msg+'. Se muestra la línea recta.'):'Línea recta. Tocá Ruta por agua para seguir los cauces.'}</small>
      </div>
    </div>`:null}
    ${tuto?html`<${Tutorial} html=${html} onClose=${function(){setTuto(false)}} />`:null}
  </div>`;
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
