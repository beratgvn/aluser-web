/* Aluser e-katalog: site içinde sayfa çevirmeli kitap */
(function(){
  'use strict';
  var root=document.querySelector('[data-fb]'); if(!root) return;
  function $(s){return root.querySelector(s)}
  function $$(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
  function clamp(v,a,b){return Math.max(a===undefined?0:a,Math.min(b===undefined?1:b,v))}
  function ease(u){return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2}

  var N=+root.getAttribute('data-n'), SRC=root.getAttribute('data-src'), T=(root.getAttribute('data-titles')||'').split('|'),
      A=1555/2200, S=14, BEND=38, DUR=800,
      stage=$('.fb-stage'), view=$('.fb-view'), book=$('.fb-book'), bar=$('.fb-bar'),
      pl=$('.fb-l'), pr=$('.fb-r'), il=pl.querySelector('img'), ir=pr.querySelector('img'),
      turn=$('.fb-turn'), shL=$('.fb-sh-l'), shR=$('.fb-sh-r'), cnt=$('.fb-count'), rng=$('.fb-range'),
      bZoom=$('[data-fb-zoom]'), bFull=$('[data-fb-full]'),
      RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      single=false, k=0, busy=false, queued=null, zoom=1, pw=0, big=false, sl=[], seen=false, peeked=false, cache={};

  /* Durumlar. Çift sayfa: 0 = kapak, k = (2k, 2k+1), son = arka kapak. Tek sayfa: k = k+1. sayfa */
  function max(){return single?N-1:N/2}
  function L(i){return single?0:(i>0?2*i:0)}
  function R(i){return single?i+1:(2*i+1<=N?2*i+1:0)}
  function pageOf(i){return single?i+1:(i===0?1:2*i)}
  function stateOf(p){p=clamp(p,1,N); return single?p-1:Math.floor(p/2)}
  function shiftOf(i){return single?0:(i===0?-25:(i===max()?25:0))}
  function url(p){return SRC+(big?'l-':'s-')+(p<10?'0':'')+p+'.webp'}
  function alt(p){return 'Aluser e-katalog, sayfa '+p+(T[p-1]?': '+T[p-1]:'')}
  function warm(p){ if(p<1||p>N) return; var u=url(p); if(!cache[u]){cache[u]=new Image(); cache[u].src=u} }
  function setImg(img,box,p){
    if(!p){box.classList.add('is-empty'); return}
    box.classList.remove('is-empty'); var u=url(p); if(img.getAttribute('src')!==u) img.src=u; img.alt=alt(p);
  }
  function label(i){var a=L(i), b=R(i); return (a&&b?a+'–'+b:(a||b))+' / '+N}

  function paint(){
    setImg(il,pl,L(k)); setImg(ir,pr,R(k));
    book.style.transform='translateX('+shiftOf(k)+'%)';
    cnt.textContent=label(k); rng.value=pageOf(k);
    $$('[data-fb-prev]').forEach(function(b){b.disabled=k===0}); $$('[data-fb-next]').forEach(function(b){b.disabled=k===max()});
    [k-1,k+1].forEach(function(i){ if(i>=0&&i<=max()){warm(L(i)); warm(R(i))} });
  }

  /* Çevrilen yaprak: dikey dilimlerden oluşur, dilimler iç içe döndüğü için sayfa kâğıt gibi bükülür */
  function build(){
    var par=turn, i, s, f, b; turn.innerHTML=''; sl=[];
    for(i=0;i<S;i++){
      s=document.createElement('div'); s.className='fb-s'; if(!i) s.style.width=(100/S)+'%';
      f=document.createElement('i'); f.className='fb-f'; b=document.createElement('i'); b.className='fb-b';
      s.appendChild(f); s.appendChild(b); par.appendChild(s); sl.push({el:s,f:f,b:b}); par=s;
    }
  }
  function dress(front,back){
    var w=pw/S, i, o;
    for(i=0;i<S;i++){
      o=sl[i];
      o.f.style.backgroundImage=front?'url('+url(front)+')':'none'; o.f.style.backgroundSize=pw+'px 100%'; o.f.style.backgroundPosition=(-i*w)+'px 0';
      o.b.style.backgroundImage=back?'url('+url(back)+')':'none'; o.b.style.backgroundSize=pw+'px 100%'; o.b.style.backgroundPosition=(-(pw-(i+1)*w)+1)+'px 0';
    }
  }
  /* t: 0 = sağda düz, 1 = solda düz. dir: +1 ileri, -1 geri (dış kenar hareket yönünde öne geçer) */
  function pose(t,dir){
    var th=-180*t, lead=dir*Math.sin(Math.PI*t)*BEND, a0=th+lead/2, d=-lead/(S-1), i, a, br,
        c=Math.cos(th*Math.PI/180), h=Math.sin(-th*Math.PI/180);
    for(i=0;i<S;i++){
      a=a0+d*i; sl[i].el.style.transform='rotateY('+(i?d:a0).toFixed(3)+'deg)';
      br='brightness('+(1-.2*Math.abs(Math.sin(a*Math.PI/180))).toFixed(3)+')'; sl[i].f.style.filter=br; sl[i].b.style.filter=br;
    }
    shR.style.opacity=c>0?(h*.5).toFixed(3):0; shR.style.transform='scaleX('+Math.max(c,.001).toFixed(3)+')';
    shL.style.opacity=c<0?(h*.5).toFixed(3):0; shL.style.transform='scaleX('+Math.max(-c,.001).toFixed(3)+')';
  }
  function shift(from,to,u){book.style.transform='translateX('+(shiftOf(from)+(shiftOf(to)-shiftOf(from))*u).toFixed(3)+'%)'}
  function open(from,to){
    var fwd=to>from;
    dress(fwd?R(from):R(to), fwd?L(to):L(from));
    if(fwd) setImg(ir,pr,R(to)); else setImg(il,pl,L(to));
    pose(fwd?0:1,fwd?1:-1); turn.hidden=false;
  }
  function close(){turn.hidden=true; shL.style.opacity=shR.style.opacity=0}
  /* Sabit sayfaların görseli hazır olunca yaprağı kaldır (titreme olmasın) */
  function settle(to){
    k=to; paint();
    var n=0, done=false, list=[il,ir].filter(function(im,ix){return ix?R(k):L(k)});
    function fin(){ if(done) return; done=true; close(); busy=false; if(queued!==null&&queued!==k){var q=queued; queued=null; go(q)} else queued=null }
    function one(){ if(++n>=list.length) fin() }
    if(!list.length){fin(); return}
    list.forEach(function(im){ if(im.decode) im.decode().then(one,one); else if(im.complete) one(); else {im.onload=im.onerror=one} });
    setTimeout(fin,400);
  }
  function run(t0,t1,dir,from,to,dur,cb){
    var st=0;
    (function step(now){
      if(!st) st=now; var u=clamp((now-st)/dur), e=ease(u), t=t0+(t1-t0)*e;
      pose(t,dir); shift(from,to,to>from?t:1-t);
      if(u<1) requestAnimationFrame(step); else cb();
    })(performance.now());
  }
  function go(to){
    to=clamp(to,0,max()); if(to===k) return;
    if(busy){queued=to; return}
    if(RM||!pw||zoom>1){k=to; paint(); return}
    var from=k, fwd=to>from; busy=true; peeked=true; open(from,to);
    run(fwd?0:1,fwd?1:0,fwd?1:-1,from,to,DUR,function(){settle(to)});
  }
  function goPage(p){go(stateOf(p))}

  /* Sürükleyerek çevirme */
  var drag=null;
  function spine(r){return single?r.left:r.left+r.width/2}
  view.addEventListener('pointerdown',function(e){
    if(e.button>0) return;
    if(zoom>1){ if(e.pointerType==='mouse'){drag={pan:true,id:e.pointerId,x:e.clientX,y:e.clientY,sl:view.scrollLeft,st:view.scrollTop}; view.classList.add('is-grab'); e.preventDefault()} return }
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,r:book.getBoundingClientRect(),on:false,t:0,lx:e.clientX,lt:e.timeStamp,v:0};
    if(e.pointerType==='mouse') e.preventDefault();
  });
  window.addEventListener('pointermove',function(e){
    if(!drag||e.pointerId!==drag.id) return;
    var dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(drag.pan){view.scrollLeft=drag.sl-dx; view.scrollTop=drag.st-dy; return}
    if(!drag.on){
      if(Math.abs(dx)<8) return;
      if(Math.abs(dx)<Math.abs(dy)*1.1||busy||RM){drag=null; return}
      var sx=spine(drag.r), fwd=single?dx<0:drag.x>sx;
      if(!single&&(fwd?dx>0:dx<0)){drag=null; return}
      drag.fwd=fwd; drag.from=k; drag.to=k+(fwd?1:-1);
      if(drag.to<0||drag.to>max()){drag=null; return}
      drag.on=true; busy=true; peeked=true; open(drag.from,drag.to);
      try{view.setPointerCapture(drag.id)}catch(_){}
    }
    var sx2=spine(drag.r), p, a0, a;
    if(single) p=clamp((drag.fwd?-dx:dx)/(pw*.85));
    else{
      a0=Math.acos(clamp((drag.fwd?drag.x-sx2:sx2-drag.x)/pw,-1,1)); a=Math.acos(clamp((drag.fwd?e.clientX-sx2:sx2-e.clientX)/pw,-1,1));
      p=clamp((a-a0)/(Math.PI-a0));
    }
    var dt=e.timeStamp-drag.lt; if(dt>0){drag.v=(e.clientX-drag.lx)/dt; drag.lx=e.clientX; drag.lt=e.timeStamp}
    drag.p=p; drag.t=drag.fwd?p:1-p; pose(drag.t,drag.fwd?1:-1); shift(drag.from,drag.to,p);
    e.preventDefault();
  },{passive:false});
  function drop(e){
    if(!drag||e.pointerId!==drag.id) return; var d=drag; drag=null;
    if(d.pan){view.classList.remove('is-grab'); return}
    if(!d.on){
      if(e.type==='pointerup'&&Math.abs(e.clientX-d.x)<8&&Math.abs(e.clientY-d.y)<8){
        var r=d.r, c=queued!==null?queued:k; if(single) go(c+(e.clientX>r.left+r.width*.36?1:-1)); else go(c+(e.clientX>spine(r)?1:-1));
      }
      return;
    }
    var vel=d.fwd?-d.v:d.v, ok=e.type==='pointerup'&&(d.p>.3||vel>.45), t1=ok?(d.fwd?1:0):(d.fwd?0:1), dur=Math.max(180,DUR*.8*Math.abs(t1-d.t));
    run2(d.t,t1,d.fwd?1:-1,d.from,d.to,dur,function(){settle(ok?d.to:d.from)});
  }
  /* bırakınca kalan yol: doğrusal başlar, yumuşak biter */
  function run2(t0,t1,dir,from,to,dur,cb){
    var st=0;
    (function step(now){
      if(!st) st=now; var u=clamp((now-st)/dur), e=1-Math.pow(1-u,3), t=t0+(t1-t0)*e;
      pose(t,dir); shift(from,to,to>from?t:1-t);
      if(u<1) requestAnimationFrame(step); else cb();
    })(performance.now());
  }
  window.addEventListener('pointerup',drop); window.addEventListener('pointercancel',drop);

  /* Düğmeler, klavye, kaydırıcı, içindekiler */
  root.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button'); if(!b||!root.contains(b)) return;
    if(b.hasAttribute('data-fb-prev')) go(k-1); else if(b.hasAttribute('data-fb-next')) go(k+1);
    else if(b===bZoom) setZoom(zoom>1?1:2); else if(b===bFull) full();
  });
  document.addEventListener('keydown',function(e){
    if(!seen||window.__ksActive||e.altKey||e.ctrlKey||e.metaKey) return; var tg=e.target, tn=tg&&tg.tagName;
    if(tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT') return;
    if(e.key==='ArrowRight'){go((queued!==null?queued:k)+1); e.preventDefault()}
    else if(e.key==='ArrowLeft'){go((queued!==null?queued:k)-1); e.preventDefault()}
    else if(e.key==='Home'){go(0); e.preventDefault()} else if(e.key==='End'){go(max()); e.preventDefault()}
  });
  rng.addEventListener('input',function(){cnt.textContent=label(stateOf(+rng.value))});
  rng.addEventListener('change',function(){goPage(+rng.value)});
  Array.prototype.forEach.call(document.querySelectorAll('[data-fb-go]'),function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var p=+a.getAttribute('data-fb-go'), y=root.getBoundingClientRect().top+window.pageYOffset-((document.querySelector('.hdr')||{}).offsetHeight||0)-12;
      window.scrollTo({top:y,behavior:RM?'auto':'smooth'}); setTimeout(function(){goPage(p)},RM?0:350);
    });
  });

  /* Yakınlaştırma ve tam ekran */
  function setZoom(z){
    zoom=z; root.classList.toggle('is-zoom',z>1); bZoom.setAttribute('aria-pressed',z>1?'true':'false');
    bZoom.setAttribute('aria-label',z>1?'Uzaklaştır':'Yakınlaştır'); fit();
    if(z>1){view.scrollLeft=(view.scrollWidth-view.clientWidth)/2; view.scrollTop=0}
  }
  function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement}
  function full(){
    if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen).call(document); return}
    var f=root.requestFullscreen||root.webkitRequestFullscreen; if(f) try{var p=f.call(root); if(p&&p.catch) p.catch(function(){})}catch(_){}
  }
  if(!(document.fullscreenEnabled||document.webkitFullscreenEnabled)) bFull.hidden=true;
  ['fullscreenchange','webkitfullscreenchange'].forEach(function(n){document.addEventListener(n,function(){root.classList.toggle('is-full',fsEl()===root); bFull.setAttribute('aria-label',fsEl()===root?'Tam ekrandan çık':'Tam ekran'); setTimeout(fit,60)})});

  /* Boyutlandırma: kitap, ekrana sığan en büyük ölçüde; dar ekranda tek sayfa */
  function fit(){
    var isFull=fsEl()===root, vw=window.innerWidth, vh=window.innerHeight, ns=vw<760||vh>vw*1.2, p;
    if(ns!==single){p=pageOf(k); single=ns; k=stateOf(p); queued=null}
    root.classList.toggle('is-single',single);
    var hdr=isFull?0:((document.querySelector('.hdr')||{}).offsetHeight||0), availW=stage.clientWidth-(single?0:2*72),
        availH=Math.min(Math.max(280,vh-hdr-bar.offsetHeight-(isFull?40:64)),isFull?4000:880),
        w=Math.min(availW,availH*A*(single?1:2)), base=Math.max(S*12,Math.floor((single?w:w/2)/S)*S), h=Math.round(base/A), nb;
    w=single?base:base*2; pw=base*zoom;
    view.style.width=w+'px'; view.style.height=h+'px'; book.style.width=(w*zoom)+'px'; book.style.height=(h*zoom)+'px';
    nb=pw*(window.devicePixelRatio||1)>860; if(nb!==big){big=nb; cache={}}
    paint();
  }
  var rt=0; window.addEventListener('resize',function(){clearTimeout(rt); rt=setTimeout(function(){ if(!busy) fit() },120)});

  /* İlk görünüşte kapak hafifçe aralanır: sayfaların çevrilebildiğini gösterir */
  function peek(){
    if(peeked||busy||RM||k!==0||zoom>1||!pw) return; peeked=true; busy=true; open(0,1);
    var st=0, D=1500;
    (function step(now){
      if(!st) st=now; var u=clamp((now-st)/D), t=.17*Math.sin(Math.PI*ease(u));
      pose(t,u<.5?1:-1);
      if(u<1) requestAnimationFrame(step); else settle(0);
    })(performance.now());
  }
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(en){ seen=en[0].isIntersecting; if(seen&&en[0].intersectionRatio>.55) setTimeout(peek,500) },{threshold:[0,.55]}).observe(view);
  } else seen=true;

  build(); root.classList.add('is-ready'); fit();
  var m=/^#sayfa-(\d+)$/.exec(location.hash); if(m){k=stateOf(+m[1]); peeked=true; paint()}
  window.addEventListener('load',function(){ if(!busy) fit() });
})();

/* Animasyonlu katalog: sahneler kendiliğinden oynar; dokunarak, oklarla ya da klavyeyle gezilir */
(function(){
  'use strict';
  var ks=document.querySelector('[data-ks]'); if(!ks) return;
  var sc=Array.prototype.slice.call(ks.querySelectorAll('.ks-sc')), N=sc.length, prog=ks.querySelector('.ks-prog'), cnt=ks.querySelector('.ks-cnt'),
      bars=[], RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      OR=[[86,84],[12,16],[50,104],[90,12],[8,88]], cur=-1, t=0, playing=!RM, inview=false, ended=false, last=0, wipeT=0;
  function pad(n){return (n<10?'0':'')+n}
  function dur(i){return +sc[i].getAttribute('data-d')||6000}
  sc.forEach(function(){var a=document.createElement('i'), b=document.createElement('b'); a.appendChild(b); prog.appendChild(a); bars.push(b)});
  function setPlay(on){playing=on; ks.classList.toggle('is-playing',on); ks.classList.toggle('is-paused',!on||!inview)}
  function show(i){
    i=Math.max(0,Math.min(N-1,i)); if(i===cur) return;
    var prev=cur, s=sc[i], o=OR[i%OR.length]; cur=i; t=0; ended=false;
    sc.forEach(function(x,j){ x.classList.remove('is-prev'); if(j!==i){ x.classList.remove('is-on'); x.setAttribute('aria-hidden','true') } });
    if(prev>=0) sc[prev].classList.add('is-prev');
    s.style.setProperty('--ox',o[0]+'%'); s.style.setProperty('--oy',o[1]+'%'); s.removeAttribute('aria-hidden');
    void s.offsetWidth; s.classList.add('is-on');
    clearTimeout(wipeT); wipeT=setTimeout(function(){ if(prev>=0&&prev!==cur) sc[prev].classList.remove('is-prev') },1150);
    bars.forEach(function(b,j){b.style.transform='scaleX('+(j<i?1:0)+')'});
    cnt.textContent=pad(i+1)+' / '+pad(N);
    /* sıradaki fotoğraf şimdiden yüklensin */
    [i+1,i+2].forEach(function(j){ var im=sc[j]&&sc[j].querySelector('img[loading]'); if(im) im.loading='eager' });
  }
  function go(d){ if(ended&&d>0){show(0); setPlay(!RM); return} show(cur+d) }
  function frame(now){
    var dt=last?now-last:0; last=now;
    if(playing&&inview&&!ended&&!document.hidden){
      t+=Math.min(dt,120); var d=dur(cur); bars[cur].style.transform='scaleX('+Math.min(1,t/d).toFixed(4)+')';
      if(t>=d){ if(cur<N-1) show(cur+1); else {ended=true; setPlay(false)} }
    }
    requestAnimationFrame(frame);
  }
  ks.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button,a');
    if(b){
      if(b.hasAttribute('data-ks-prev')) go(-1); else if(b.hasAttribute('data-ks-next')) go(1);
      else if(b.hasAttribute('data-ks-play')){ if(ended){show(0); setPlay(true)} else setPlay(!playing) }
      return;
    }
    if(e.target.closest&&e.target.closest('.ks-bar')) return;
    if(swiped){swiped=false; return}
    var r=ks.getBoundingClientRect(), x=(e.clientX-r.left)/r.width;
    if(x<.3) go(-1); else if(x>.7) go(1); else if(!RM){ if(ended){show(0); setPlay(true)} else setPlay(!playing) }
  });
  var sx=0, sy=0, sid=null, swiped=false;
  ks.addEventListener('pointerdown',function(e){sid=e.pointerId; sx=e.clientX; sy=e.clientY; swiped=false});
  ks.addEventListener('pointerup',function(e){
    if(e.pointerId!==sid) return; sid=null; var dx=e.clientX-sx, dy=e.clientY-sy;
    if(Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy)*1.3){swiped=true; go(dx<0?1:-1)}
  });
  document.addEventListener('keydown',function(e){
    if(!window.__ksActive||e.altKey||e.ctrlKey||e.metaKey) return; var tn=e.target&&e.target.tagName;
    if(tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT') return;
    if(e.key==='ArrowRight'){go(1); e.preventDefault()} else if(e.key==='ArrowLeft'){go(-1); e.preventDefault()}
    else if(e.key===' '&&tn!=='BUTTON'&&tn!=='A'&&!RM){ if(ended){show(0); setPlay(true)} else setPlay(!playing); e.preventDefault() }
  });
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(en){ var r=en[en.length-1].intersectionRatio; inview=r>.35; window.__ksActive=r>.5; ks.classList.toggle('is-paused',!playing||!inview) },{threshold:[0,.35,.5,.75]}).observe(ks);
  } else { inview=true; window.__ksActive=true }
  ks.classList.add('is-ready');
  /* Sayfa her açılışta sunumun başından (en üstten) başlar; #sayfa-N bağlantısı hariç */
  if(!/^#sayfa-\d+$/.test(location.hash)){
    try{history.scrollRestoration='manual'}catch(e){}
    var moved=false, top0=function(){ if(!moved&&(window.pageYOffset||document.documentElement.scrollTop)>0) window.scrollTo(0,0) };
    ['wheel','touchstart','pointerdown','keydown'].forEach(function(n){addEventListener(n,function(){moved=true},{passive:true,capture:true})});
    top0(); [60,200,500,1000].forEach(function(ms){setTimeout(top0,ms)}); addEventListener('load',top0); addEventListener('pageshow',top0);
  }
  /* Küçük ekranlarda sahne metni alana sığmazsa orantılı küçültülür */
  function fit(){
    sc.forEach(function(s){
      var box=s.querySelector('.ks-tx')||s.querySelector('.ks-in'); if(!box) return;
      var k=1; box.style.setProperty('--k','1');
      var pv=s.style.visibility; s.style.visibility='hidden'; s.style.display='block';
      function over(){var r=box.getBoundingClientRect(),c=box.children,t=1e9,m=-1e9,i,q; for(i=0;i<c.length;i++){q=c[i].getBoundingClientRect(); if(!q.height) continue; t=Math.min(t,q.top); m=Math.max(m,q.bottom)} return m>r.bottom-10||t<r.top+10}
      while(over()&&k>.6){k-=.04; box.style.setProperty('--k',k.toFixed(2))}
      s.style.display=''; s.style.visibility=pv;
    });
  }
  var ft=0; function fitSoon(){clearTimeout(ft); ft=setTimeout(fit,160)}
  fit(); addEventListener('resize',fitSoon); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
  setPlay(playing); show(0); requestAnimationFrame(frame);
})();
