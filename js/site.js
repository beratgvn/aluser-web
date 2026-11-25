(function(){
  var root=document.documentElement; root.classList.add('js');
  var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var clamp=function(x,a,b){a=a===undefined?0:a;b=b===undefined?1:b;return Math.min(b,Math.max(a,x))};
  var ease=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
  var hdr=$('.hdr'), scenes=[], measures=[];

  /* Menü */
  var mb=$('#menu-btn'), mnav=$('#mnav');
  function closeMenu(){mnav.hidden=true;mb.setAttribute('aria-expanded','false')}
  mb.addEventListener('click',function(){var open=mnav.hidden;mnav.hidden=!open;mb.setAttribute('aria-expanded',String(open))});

  /* Sayfa içi bağlantılar */
  $$('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=a.getAttribute('href').slice(1), t=id==='top'?document.body:document.getElementById(id);
      if(!t) return; e.preventDefault(); closeMenu();
      if(id==='top') window.scrollTo({top:0,behavior:RM?'auto':'smooth'});
      else t.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});
    });
  });

  /* Kaydırınca beliren öğeler */
  var rv=$$('.rv,.rvc');
  if(RM||!('IntersectionObserver' in window)){rv.forEach(function(el){el.classList.add('in')})}
  else{
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    rv.forEach(function(el){io.observe(el)});
  }

  /* Giriş: pencere açılır */
  (function(){
    var hero=$('#hero'); if(!hero||RM) return;
    var stage=$('.hero-stage',hero), slot=$('.hero-slot',hero), media=$('.hero-media',hero), frame=$('.hero-frame',hero), img=$('.hero-pic',media),
        copy=$('.hero-copy',hero), st=$('.hero-statement',hero), hint=$('.hint',hero), R=null, stick=0,
        mq=window.matchMedia('(min-height: 560px)'), on=false;
    /* Kapı kare dizisi: kaydırma ilerledikçe ilgili kare tuvale çizilir.
       Kareler sıkıştırılmış olarak indirilir; oynatma konumunun çevresindekiler arka planda çözülüp hazır tutulur,
       böylece çizim anında ana iş parçacığı beklemez. */
    var cv=$('.hero-seq',media), ctx=cv&&cv.getContext?cv.getContext('2d'):null, S=null, key='', want=0, px=0,
        SETS={d:{n:140,w:1600,h:900},m:{n:140,w:648,h:1080}}, mqm=window.matchMedia('(max-aspect-ratio: 3/5)'),
        lite=!!(navigator.connection&&navigator.connection.saveData), viaImg=!(window.createImageBitmap&&window.fetch&&window.Blob);
    function ready(i){var b=S.bm[i]; return !!b&&b!==1}
    function warm(c,dir){
      var s=S, lo=c-(dir<0?10:3), hi=c+(dir<0?3:10), i;
      for(i in s.bm){ if((i<lo-4||i>hi+4)&&s.bm[i]!==1){ if(s.bm[i].close) s.bm[i].close(); delete s.bm[i] } }
      for(i=Math.max(1,lo);i<=Math.min(s.n-1,hi);i++) if(s.ok[i]&&!s.bm[i]) (function(i){
        var v=s.src[i];
        if(!(v instanceof Blob)){ s.bm[i]=v; return }  /* yedek yol: görsel doğrudan çizilir */
        s.bm[i]=1;
        createImageBitmap(v).then(function(bm){ if(S!==s){bm.close(); return} s.bm[i]=bm; paint() },function(){ if(s.bm[i]===1) delete s.bm[i] });
      })(i);
    }
    function paint(){
      if(!S) return; var n=S.n, x=want*(n-1), j, d, t, dir=x<px?-1:1; px=x;
      if(x<1){ warm(1,1); if(key!=='p'){key='p'; cv.classList.remove('on')} return }  /* en başta net fotoğraf görünür */
      t=Math.min(n-1,Math.round(x)); warm(t,dir);
      for(j=-1,d=0;d<n;d++){ if(t-d>=1&&ready(t-d)){j=t-d;break} if(t+d<n&&ready(t+d)){j=t+d;break} }
      if(j<0||j===key) return; key=j;
      ctx.drawImage(S.bm[j],0,0,cv.width,cv.height); cv.classList.add('on');  /* her zaman tek ve net kare */
    }
    function loadSeq(){
      if(!ctx||lite) return; var k=mqm.matches?'m':'d'; if(S&&S.k===k) return;
      var c=SETS[k], s={k:k,n:c.n,src:[],ok:[],bm:{}}, order=[], seen={}, q=0, live=0, i, stp;
      function add(i){ if(i>0&&i<c.n&&!seen[i]){seen[i]=1; order.push(i)} }
      for(i=1;i<=16;i++) add(i);  /* önce açılışın ilk kareleri, sonra kabadan inceye tüm dizi */
      add(c.n-1); for(stp=32;stp>=1;stp>>=1) for(i=0;i<c.n;i+=stp) add(i);
      function next(){
        if(S!==s) return;
        while(live<6&&q<order.length){(function(ix){
          var url='img/seq/'+k+'-'+('00'+(ix+1)).slice(-3)+'.webp'; live++;
          function fin(v){ live--; if(S===s&&v){s.src[ix]=v; s.ok[ix]=1; paint()} next() }
          function img(){ var im=new Image(); im.onload=function(){ if(im.decode) im.decode().then(function(){fin(im)},function(){fin(im)}); else fin(im) }; im.onerror=function(){fin(null)}; im.src=url }
          if(viaImg) img(); else fetch(url).then(function(r){ if(!r.ok) throw 0; return r.blob() }).then(fin,function(){ viaImg=true; img() });
        })(order[q++])}
      }
      if(S) for(i in S.bm) if(S.bm[i]!==1&&S.bm[i].close) S.bm[i].close();
      cv.width=c.w; cv.height=c.h; key=''; cv.classList.remove('on'); S=s; next();
    }
    function enable(){hero.classList.add('is-pin'); stage.appendChild(media); stage.appendChild(frame); on=true}
    function disable(){hero.classList.remove('is-pin'); slot.appendChild(media); slot.appendChild(frame); [media,img,frame,copy,st,hint].forEach(function(n){if(n) n.removeAttribute('style')}); on=false; pS=-1}
    function measure(){
      if(mq.matches!==on){ if(mq.matches) enable(); else disable(); }
      if(!on) return;
      loadSeq();
      var s=stage.getBoundingClientRect(), r=slot.getBoundingClientRect();
      R={l:r.left-s.left,t:r.top-s.top,w:r.width,h:r.height,W:s.width,H:s.height};
      R.r=R.W-R.l-R.w; R.b=R.H-R.t-R.h; R.dx=R.l+R.w/2-R.W/2; R.dy=R.t+R.h/2-R.H/2;
      stick=parseFloat(getComputedStyle(stage).top)||0;
    }
    /* Kaydırma konumu hedeftir; sahne hedefe yumuşakça yaklaşır (tekerlek adımları akıcı görünür) */
    var pT=0, pS=-1, raf=0, last=0;
    function update(){
      if(!on||!R) return;
      var hr=hero.getBoundingClientRect(), total=Math.max(1,hr.height-R.H); pT=clamp((stick-hr.top)/total);
      if(pS<0) pS=pT;
      if(pS===pT) render(pS); else if(!raf){last=0; raf=requestAnimationFrame(tick)}
    }
    function tick(now){
      raf=0; if(!on||!R) return;
      var dt=last?Math.min(64,now-last):16, d=pT-pS, v=Math.max(Math.abs(d)*(1-Math.exp(-dt/140)),dt*.00009); last=now;
      if(v>=Math.abs(d)) pS=pT; else pS+=d<0?-v:v;  /* sona doğru sabit küçük hızla tamamlanır, kuyruk uzamaz */
      render(pS);
      if(pS!==pT) raf=requestAnimationFrame(tick);
    }
    function render(p){
      var e=ease(clamp(p/.8)), k=1-e;
      media.style.clipPath='inset('+(R.t*k)+'px '+(R.r*k)+'px '+(R.b*k)+'px '+(R.l*k)+'px)';
      img.style.transform='translate3d('+(R.dx*k)+'px,'+(R.dy*k)+'px,0) scale('+(1+.06*k)+')';
      frame.style.top=(R.t*k)+'px'; frame.style.right=(R.r*k)+'px'; frame.style.bottom=(R.b*k)+'px'; frame.style.left=(R.l*k)+'px';
      frame.style.opacity=1-clamp((e-.5)/.38);
      want=clamp((p-.03)/.7); paint();
      var c=clamp(p/.2); copy.style.opacity=1-c; copy.style.transform='translate3d(0,'+(-36*c)+'px,0)'; copy.style.visibility=c>=1?'hidden':'';
      if(hint) hint.style.opacity=1-clamp(p/.08);
      var o=clamp((p-.72)/.16); st.style.opacity=o; st.style.transform='translate3d(0,'+((1-o)*34)+'px,0)'; media.style.setProperty('--scrim',o);
    }
    measures.push(measure); scenes.push(update);
  })();

  /* Hakkımızda: metin kaydırdıkça dolar */
  (function(){
    var el=$('#statement'); if(!el||RM) return;
    var words=el.textContent.trim().split(/\s+/); el.textContent='';
    var spans=words.map(function(w,i){var s=document.createElement('span');s.className='w';s.textContent=w;el.appendChild(s);if(i<words.length-1)el.appendChild(document.createTextNode(' '));return s});
    var last=-1;
    scenes.push(function(){
      var r=el.getBoundingClientRect(), vh=window.innerHeight, p=clamp((vh*.86-r.top)/(r.height+vh*.42)), n=Math.round(p*spans.length);
      if(n===last) return; last=n; for(var i=0;i<spans.length;i++) spans[i].classList.toggle('on',i<n);
    });
  })();

  /* Ürünler: dikey kaydırma yatay raya döner */
  (function(){
    var sec=$('#urunler'); if(!sec) return;
    var stage=$('.p-stage',sec), vp=$('#p-viewport'), track=$('#p-track'), ruler=$('#p-ruler');
    var mq=window.matchMedia('(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)'), pin=false, dist=0, stick=0;
    var head=$('.p-head',sec), h2=$('h2',head);
    function measure(){
      /* Ray, başlıkla aynı hizadan başlar (kaydırma çubuğu genişliğinden bağımsız) */
      var hr=head.getBoundingClientRect(), pr=parseFloat(getComputedStyle(head).paddingRight)||0;
      sec.style.setProperty('--edge-l',h2.getBoundingClientRect().left+'px');
      sec.style.setProperty('--edge-r',Math.max(0,document.documentElement.clientWidth-hr.right+pr)+'px');
      pin=mq.matches; sec.classList.toggle('is-pin',pin);
      if(pin){ vp.scrollLeft=0; dist=Math.max(0,track.scrollWidth-vp.clientWidth); sec.style.height=(stage.offsetHeight+dist)+'px'; stick=parseFloat(getComputedStyle(stage).top)||0; }
      else{ sec.style.height=''; track.style.transform=''; }
    }
    function update(){
      if(!pin) return;
      var r=sec.getBoundingClientRect(), total=Math.max(1,r.height-stage.offsetHeight), p=clamp((stick-r.top)/total);
      track.style.transform='translate3d('+(-p*dist)+'px,0,0)'; ruler.style.setProperty('--p',p.toFixed(4));
    }
    vp.addEventListener('scroll',function(){ if(pin) return; var m=vp.scrollWidth-vp.clientWidth; ruler.style.setProperty('--p',m>0?(vp.scrollLeft/m).toFixed(4):0); },{passive:true});
    measures.push(measure); scenes.push(update);
  })();

  /* Biyoklimatik: düğmeler ve sürgüyle lamel açısı; güneş ya da yağmur */
  (function(){
    var fig=$('#louvre-fig'); if(!fig) return;
    var sec=$('#biyoklimatik'), NS='http://www.w3.org/2000/svg', MAX=60, RAD=Math.PI/180, S60=Math.sin(60*RAD);
    var blades=$$('.blade',fig), shade=$('#pg-shade'), range=$('#pg-range'), rainIn=$('#pg-rain-in'),
        stBtns=$$('[data-a]',sec), wBtns=$$('[data-w]',sec), stT=$('#pg-status b'), stD=$('#pg-status span');
    function mk(tag,parent,attrs){var n=document.createElementNS(NS,tag); for(var k in attrs) n.setAttribute(k,attrs[k]); parent.appendChild(n); return n}
    var beams=[], patches=[], i, x;
    for(i=0;i<9;i++){ beams.push(mk('polygon',$('#pg-beams'),{})); patches.push(mk('rect',$('#pg-patches'),{y:345,height:5})); mk('line',rainIn,{x1:122+40*i,y1:127,x2:120+40*i,y2:349}); }
    for(i=0,x=78;x<=486;x+=24,i++) mk('line',$('#pg-rain-out'),{x1:x+3,y1:14+(i*7)%18,x2:x,y2:91});
    [38,52,508,522].forEach(function(px,n){mk('line',$('#pg-rain-out'),{x1:px+9,y1:16+n*5,x2:px,y2:349})});
    var TXT={sun:[['Lameller kapalı','Güneş dışarıda kalır, altında gölge.'],['Lameller açılı','Gün ışığı süzülür, gölge sizde kalır.'],['Lameller açık','Güneş, hava ve gökyüzü içeride.']],
             rain:[['Lameller kapalı','Lameller birleşir, yağmurda korur.'],['Yağmur başladı','Bir dokunuşla lamelleri kapatın.'],['Yağmur başladı','Bir dokunuşla lamelleri kapatın.']]};
    var A=0, raf=0, weather='sun', touched=false, lastKey='';
    function render(){
      var a=A, f=a<2?0:clamp(1-38*Math.sin((MAX-a)*RAD)/(40*S60),0,.92), w=40*f, fr=a<2?0:clamp((1-.95*Math.cos(a*RAD))*1.7);
      blades.forEach(function(b){b.setAttribute('transform','rotate('+a.toFixed(2)+' '+(parseFloat(b.getAttribute('x'))+19)+' 120)')});
      for(var n=0;n<9;n++){
        var l=120+40*n-w/2, r=l+w;
        beams[n].setAttribute('points',l.toFixed(1)+',120 '+r.toFixed(1)+',120 '+(r+132.8).toFixed(1)+',350 '+(l+132.8).toFixed(1)+',350');
        patches[n].setAttribute('x',(l+130).toFixed(1)); patches[n].setAttribute('width',w.toFixed(1));
      }
      shade.setAttribute('opacity',(.1*(1-f)).toFixed(3)); rainIn.style.opacity=fr.toFixed(3);
      range.value=Math.round(a); range.style.setProperty('--p',(a/MAX).toFixed(4));
      var st=a<8?0:(a>52?2:1), key=weather+st; if(key===lastKey) return; lastKey=key;
      stBtns.forEach(function(b,n){b.setAttribute('aria-pressed',String(n===st)); b.classList.toggle('nudge',weather==='rain'&&st>0&&n===0)});
      wBtns.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-w')===weather))});
      stT.textContent=TXT[weather][st][0]; stD.textContent=TXT[weather][st][1];
    }
    function go(to,instant){
      cancelAnimationFrame(raf); to=clamp(to,0,MAX);
      if(RM||instant){A=to;render();return}
      var from=A, t0=performance.now(), dur=Math.max(380,Math.abs(to-from)/MAX*1300);
      (function step(t){var k=clamp((t-t0)/dur); A=from+(to-from)*ease(k); render(); if(k<1) raf=requestAnimationFrame(step)})(t0);
    }
    stBtns.forEach(function(b){b.addEventListener('click',function(){touched=true;go(parseFloat(b.getAttribute('data-a')))})});
    range.addEventListener('input',function(){touched=true;cancelAnimationFrame(raf);A=parseFloat(range.value);render()});
    wBtns.forEach(function(b){b.addEventListener('click',function(){touched=true;weather=b.getAttribute('data-w');fig.classList.toggle('is-rain',weather==='rain');render()})});
    render();
    /* İlk görünüşte lameller bir kez kendiliğinden açılır */
    if('IntersectionObserver' in window){
      var seen=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){seen.disconnect();setTimeout(function(){if(!touched) go(MAX)},400)}})},{threshold:.6});
      seen.observe(fig);
    } else go(MAX,true);
  })();

  /* Süreç: çizgi kaydırdıkça ilerler (yatay ya da dikey) */
  $$('[data-steps]').forEach(function(w){
    if(RM) return;
    var items=$$('li',w), vert=w.getAttribute('data-steps')==='v'; w.classList.add('js-steps');
    scenes.push(function(){
      var r=w.getBoundingClientRect(), vh=window.innerHeight, h=Math.max(1,r.height), p=vert?clamp((vh*.62-r.top)/h):clamp((vh*.82-r.top)/(r.height+vh*.22));
      w.style.setProperty('--p',p.toFixed(4));
      items.forEach(function(li,n){li.classList.toggle('on',vert?(li.offsetTop/h<=p+.01):(p>=n/items.length+.02))});
    });
  });

  /* Görsellerde hafif derinlik */
  (function(){
    if(RM) return; var els=$$('[data-parallax]');
    scenes.push(function(){
      var vh=window.innerHeight;
      els.forEach(function(el){var b=el.parentNode.getBoundingClientRect(); if(b.bottom<-100||b.top>vh+100) return; var f=parseFloat(el.getAttribute('data-parallax')), c=clamp((b.top+b.height/2)/vh,-.2,1.2); el.style.transform='translate3d(0,'+((c-.5)*f*b.height-(el.offsetHeight-b.height)/2)+'px,0)'});
    });
  })();

  /* Teklif formu → WhatsApp mesajı */
  (function(){
    var f=$('#quote'); if(!f) return; var a=$('#wa-send'), ad=$('#q-ad'), urun=$('#q-urun'), not=$('#q-not');
    function build(){
      var t='Merhaba, web sitenizden yazıyorum.'; var n=ad.value.trim(), u=urun.value, m=not.value.trim();
      if(n) t+='\nAdım: '+n; if(u) t+='\nİlgilendiğim ürün: '+u; if(m) t+='\n'+m;
      a.href='https://wa.me/905391084545?text='+encodeURIComponent(t);
    }
    f.addEventListener('input',build); f.addEventListener('change',build);
    /* Ürün sayfasından gelindiyse ürün seçili gelir */
    try{var q=new URLSearchParams(window.location.search).get('urun'); if(q){q=q.toLocaleLowerCase('tr'); for(var k=0;k<urun.options.length;k++){if(urun.options[k].text.toLocaleLowerCase('tr').indexOf(q)===0){urun.selectedIndex=k;break}} build()}}catch(err){}
    f.addEventListener('submit',function(e){e.preventDefault();build();a.focus()});
  })();

  /* Kaydırma döngüsü */
  var ticking=false;
  function frame(){ticking=false; hdr.classList.toggle('scrolled',window.scrollY>8); for(var i=0;i<scenes.length;i++) scenes[i]()}
  function req(){if(!ticking){ticking=true;requestAnimationFrame(frame)}}
  function relayout(){for(var i=0;i<measures.length;i++) measures[i](); req()}
  window.addEventListener('scroll',req,{passive:true});
  window.addEventListener('resize',relayout);
  window.addEventListener('load',relayout);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
})();
/* Yeni açılan sayfa en üstten başlar (geri/ileri ve yenilemede konum korunur) */
(function(){try{var n=performance.getEntriesByType('navigation')[0];if(n&&n.type!=='navigate')return}catch(e){}if(location.hash)return;var f=function(){if((window.pageYOffset||0)>0)window.scrollTo(0,0)};f();addEventListener('pageshow',function(e){if(!e.persisted)f()})})();

/* Açılış videosu */
(function(){var el=document.getElementById('intro');if(!el)return;var root=document.documentElement;
if(root.className.indexOf('intro-on')<0){el.parentNode.removeChild(el);return}
var v=el.querySelector('video'),done=false,t;
function end(){if(done)return;done=true;clearTimeout(t);try{sessionStorage.setItem('aluserIntro','1')}catch(e){}
el.className+=' out';setTimeout(function(){root.className=root.className.replace(' intro-on','');if(el.parentNode)el.parentNode.removeChild(el)},720)}
el.querySelector('.intro-skip').addEventListener('click',end);
v.addEventListener('ended',function(){setTimeout(end,500)});v.addEventListener('error',end);
v.addEventListener('playing',function(){clearTimeout(t);t=setTimeout(end,12000)});
t=setTimeout(end,4000);
var p=v.play();if(p&&p.catch)p.catch(end);
document.addEventListener('keydown',function(e){if(e.key==='Escape')end()});
})();
