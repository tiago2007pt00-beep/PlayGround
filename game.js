(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  const frame = $('sceneFrame');
  const state = {
    started: false, paused: false, ended: false, won: false,
    elapsed: 0, duration: 180, sleep: 24, panic: 8, threat: 0,
    eyeActive: false, eyeSide: 1, eyeUntil: 0, eyeClearedAt: 0,
    yaw: 0, targetYaw: 0, bob: 0, flashUntil: 0, flashlightCooldown: 0,
    coffee: 3, coffeeCooldown: 0, radioCooldown: 0, breatheCooldown: 0,
    sound: true, toastTimer: 0, eventIndex: 0, lastTime: performance.now(),
    survivors: ['MARTA','LUÍS','INES','RAFA','TOMÁS'], lostSurvivors: 0,
  };
  const totalNightMinutes = 313;
  let W = 1000, H = 600, dpr = 1, audioCtx = null;

  function resize() {
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(frame); window.addEventListener('resize', resize); resize();

  function polygon(points, fill, stroke, width=1) {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); if(fill){ctx.fillStyle=fill;ctx.fill()} if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke()}
  }
  function line(points, color, width=1) {ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
  function glow(x,y,r,color,alpha=1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color.replace('ALPHA',String(alpha)));g.addColorStop(1,color.replace('ALPHA','0'));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
  function drawRoom(t) {
    if (!W || !H) return;
    const w=W,h=H, cx=w/2 + state.yaw*w*.055, horizon=h*.48;
    ctx.clearRect(0,0,w,h);
    const wall=ctx.createLinearGradient(0,0,0,horizon);wall.addColorStop(0,'#262522');wall.addColorStop(1,'#38352f');ctx.fillStyle=wall;ctx.fillRect(0,0,w,horizon);
    polygon([[0,0],[w*.17,h*.13],[w*.17,h*.76],[0,h*.91]],'#252421');
    polygon([[w,0],[w*.83,h*.13],[w*.83,h*.76],[w,h*.91]],'#1b1b1a');
    polygon([[0,h*.91],[w*.17,h*.76],[w*.83,h*.76],[w,h*.91],[w,h],[0,h]],'#292824');
    // scuffed wallpaper, fine vertical seams
    for(let i=0;i<13;i++){const x=w*(.18+i*.055);line([[x,h*.05],[x,h*.75]],'rgba(202,180,143,.035)',1)}
    for(let i=0;i<8;i++){const x=w*(.03+i*.14), y=h*(.12+(i%3)*.17);ctx.fillStyle='rgba(12,13,13,.12)';ctx.beginPath();ctx.ellipse(x,y,10+(i%4)*4,4,0,0,Math.PI*2);ctx.fill()}
    // back wall trim and wood floor
    line([[w*.17,h*.76],[w*.83,h*.76]],'#655b4d',2);line([[w*.17,h*.13],[w*.83,h*.13]],'rgba(138,119,91,.38)',2);
    for(let i=1;i<10;i++){let p=i/10;line([[w*p,h*.91],[cx+(w*p-cx)*.44,h*.76]],'rgba(8,9,9,.36)',1)}
    for(let j=1;j<5;j++){const y=h*(.76+Math.pow(j/5,1.8)*.24);line([[0,y],[w,y]],'rgba(8,9,9,.29)',1)}
    // moon window on back wall
    const wx=cx-w*.17, wy=h*.22, ww=w*.31, wh=h*.36;
    glow(wx+ww*.62,wy+wh*.43,ww*.9,'rgba(108,133,153,ALPHA)',.28);
    ctx.fillStyle='#111719';ctx.fillRect(wx-5,wy-5,ww+10,wh+10);
    ctx.fillStyle='#53606a';ctx.fillRect(wx,wy,ww,wh);
    const moon=ctx.createRadialGradient(wx+ww*.65,wy+wh*.25,1,wx+ww*.65,wy+wh*.25,ww*.55);moon.addColorStop(0,'#a2a3a0');moon.addColorStop(.12,'#58636b');moon.addColorStop(1,'#151c21');ctx.fillStyle=moon;ctx.fillRect(wx,wy,ww,wh);
    // silhouette branches outside
    for(let b=0;b<5;b++){const bx=wx+ww*(.08+b*.19);line([[bx,wy+wh],[bx+(b-2)*12,wy+wh*.6],[bx+(b-2)*18,wy+wh*.42]],'rgba(9,12,13,.8)',2);line([[bx+(b-2)*12,wy+wh*.6],[bx+(b-2)*27,wy+wh*.5]],'rgba(9,12,13,.75)',1)}
    line([[wx+ww*.5,wy],[wx+ww*.5,wy+wh]],'#242727',4);line([[wx,wy+wh*.66],[wx+ww,wy+wh*.66]],'#242727',4);
    // curtains
    polygon([[wx-ww*.1,wy-10],[wx+ww*.14,wy+3],[wx+ww*.04,wy+wh*.98],[wx-ww*.05,wy+wh*.8]],'#2a2623');
    polygon([[wx+ww*.86,wy+2],[wx+ww*1.1,wy-10],[wx+ww*1.06,wy+wh*.83],[wx+ww*.94,wy+wh]],'#252220');
    for(let k=0;k<4;k++){line([[wx-ww*.04+k*3,wy],[wx-ww*.01+k*5,wy+wh*.83]],'rgba(165,141,108,.13)',2);line([[wx+ww*.96+k*3,wy],[wx+ww*.92+k*2,wy+wh*.85]],'rgba(165,141,108,.12)',2)}
    // wardrobe right, partly open
    const ax=w*.68-state.yaw*w*.024, ay=h*.29, aw=w*.205, ah=h*.48;
    polygon([[ax,ay],[ax+aw*.18,ay-h*.035],[ax+aw,ay],[ax+aw*.83,ay+ah]],'#2a2825','#4a443a');
    polygon([[ax,ay],[ax+aw*.85,ay+h*.02],[ax+aw*.83,ay+ah],[ax,ay+ah*.9]],'#211f1d','#554b3d');
    polygon([[ax+aw*.14,ay+h*.055],[ax+aw*.79,ay+h*.07],[ax+aw*.77,ay+ah*.86],[ax+aw*.16,ay+ah*.79]],'#0c0e0e','#3d382f');
    polygon([[ax+aw*.79,ay+h*.07],[ax+aw,ay],[ax+aw*.98,ay+ah*.87],[ax+aw*.77,ay+ah*.86]],'#39342d','#5f5242');
    line([[ax+aw*.94,ay+ah*.48],[ax+aw*.91,ay+ah*.51]],'#a88e66',3);
    // dresser left with dusty mirror and radio
    const dx=w*.18-state.yaw*w*.015, dy=h*.48, dw=w*.18, dh=h*.23;
    polygon([[dx,dy],[dx+dw*.12,dy-h*.025],[dx+dw,dy-h*.005],[dx+dw*.9,dy+dh]],'#3a332a','#544a3b');
    polygon([[dx,dy],[dx+dw,dy],[dx+dw*.9,dy+dh],[dx+dw*.03,dy+dh]],'#2c2823','#514636');
    line([[dx+dw*.05,dy+dh*.42],[dx+dw*.94,dy+dh*.4]],'#635541');line([[dx+dw*.04,dy+dh*.75],[dx+dw*.92,dy+dh*.72]],'#5c4d39');
    ctx.fillStyle='#796648';ctx.fillRect(dx+dw*.52,dy+dh*.22,3,3);ctx.fillRect(dx+dw*.5,dy+dh*.56,3,3);
    // small lamp, amber pool
    const lx=dx+dw*.54, ly=dy-h*.04;glow(lx,ly+h*.09,w*.16,'rgba(203,148,83,ALPHA)',.17);
    ctx.fillStyle='#c19a61';polygon([[lx-w*.026,ly],[lx+w*.025,ly],[lx+w*.04,ly+h*.055],[lx-w*.04,ly+h*.055]],'#b69a70');
    ctx.fillStyle='#6b5942';ctx.fillRect(lx-w*.005,ly+h*.05,w*.01,h*.05);ctx.fillRect(lx-w*.027,ly+h*.1,w*.055,h*.007);
    // bed foreground, quilt and messy folds
    polygon([[w*.29,h*.71],[w*.69,h*.7],[w*.91,h],[w*.08,h]],'#282723','#4b4438');
    polygon([[w*.34,h*.7],[w*.66,h*.7],[w*.84,h*.88],[w*.19,h*.88]],'#858072','#aaa08a');
    polygon([[w*.31,h*.78],[w*.69,h*.76],[w*.81,h],[w*.14,h]],'#625d52','#817763');
    polygon([[w*.34,h*.78],[w*.65,h*.76],[w*.8,h],[w*.19,h]],'#45443e');
    for(let f=0;f<6;f++){const fx=w*(.27+f*.08);line([[fx,h*.82],[fx+(f-2)*w*.015,h*.91],[fx+(f-2)*w*.023,h]],'rgba(185,171,145,.13)',2)}
    // foot of bed and exposed floor light
    polygon([[0,h*.91],[w*.13,h*.87],[w*.2,h],[0,h]],'#211f1c');polygon([[w*.86,h*.87],[w,h*.91],[w,h],[w*.8,h]],'#1c1b19');
    // faint light beam from window
    polygon([[wx+ww*.3,wy+wh],[wx+ww*.86,wy+wh],[w*.81,h*.82],[w*.38,h*.82]],'rgba(149,164,162,.025)');
    // frame scratches and subtle room details
    ctx.fillStyle='rgba(221,199,164,.34)';ctx.font=`${Math.max(7,w*.009)}px monospace`;ctx.fillText('03',w*.79,h*.24);
    // shifting shadow when presence close
    if(state.eyeActive){const intensity=Math.min(1,(state.eyeUntil-state.elapsed)/2);glow(state.eyeSide===1?w*.78:w*.23,h*.48,w*.32,`rgba(99,13,13,ALPHA)`,.38*intensity)}
    // flashlight cone, brighten center but narrow so distant figure is readable
    if(state.flashUntil>state.elapsed){const flare=ctx.createRadialGradient(cx,h*.44,2,cx,h*.44,w*.45);flare.addColorStop(0,'rgba(247,234,194,.29)');flare.addColorStop(.55,'rgba(211,199,166,.09)');flare.addColorStop(1,'rgba(211,199,166,0)');ctx.fillStyle=flare;ctx.fillRect(0,0,w,h)}
    // apparition: all-consuming silhouette with a pair of small red eyes
    if(state.eyeActive){
      const ex=state.eyeSide===1?w*.77:w*.24, ey=h*.39, scale=w/900;
      const wobble=Math.sin(t*.003)*3;ctx.save();ctx.translate(ex,ey+wobble);
      ctx.globalAlpha=.88;
      ctx.fillStyle='rgba(4,5,5,.9)';ctx.beginPath();ctx.moveTo(-w*.1,h*.45);ctx.quadraticCurveTo(-w*.08,h*.08,-w*.025,-h*.04);ctx.quadraticCurveTo(0,-h*.12,w*.025,-h*.04);ctx.quadraticCurveTo(w*.08,h*.08,w*.11,h*.45);ctx.closePath();ctx.fill();
      // head shape
      ctx.beginPath();ctx.ellipse(0,0,w*.04,h*.105,-.05,0,Math.PI*2);ctx.fill();
      // reflection only eyes; pulse in the dark
      const blink=(Math.sin(t*.006)+1)/2;
      if(blink>.12){glow(-w*.013,h*.004,w*.025,'rgba(211,35,27,ALPHA)',.74);glow(w*.013,h*.004,w*.025,'rgba(211,35,27,ALPHA)',.74);ctx.fillStyle='#ed3a30';ctx.fillRect(-w*.017,h*.001,w*.009,Math.max(1,scale*2));ctx.fillRect(w*.008,h*.001,w*.009,Math.max(1,scale*2))}
      ctx.restore();
    }
    // film grain and darkness ramps according to panic
    const darkness=Math.min(.29,state.panic/340);if(darkness>0){ctx.fillStyle=`rgba(4,5,6,${darkness})`;ctx.fillRect(0,0,w,h)}
    if(state.sleep>72){const blur=(state.sleep-72)*.045;ctx.fillStyle=`rgba(170,170,160,${blur/100})`;ctx.fillRect(0,0,w,h)}
  }

  function formatTime(s){const n=Math.max(0,Math.ceil(s));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
  function clockLabel(){const mins=Math.min(totalNightMinutes,Math.floor(state.elapsed/state.duration*totalNightMinutes));let all=47+mins;let h=Math.floor(all/60),m=all%60;const hour=h%12||12;return `${String(hour).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}
  function setToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),2100)}
  function updateHud(){
    const progress=Math.min(1,state.elapsed/state.duration);const sleep=Math.round(state.sleep),panic=Math.round(state.panic);
    $('sleepValue').textContent=`${String(sleep).padStart(2,'0')}%`;$('panicValue').textContent=`${String(panic).padStart(2,'0')}%`;
    $('sleepMeter').style.width=`${sleep}%`;$('panicMeter').style.width=`${panic}%`;
    $('sleepMeter').style.background=sleep>70?'#c84d43':'#d0a16b';$('panicMeter').style.background=panic>70?'#e34236':'#b94a40';
    $('sleepHint').textContent=sleep>75?'OLHOS A FECHAR...':sleep>50?'MANTÉM-TE EM MOVIMENTO':'SEGURA-TE ACORDADO';
    $('panicHint').textContent=panic>75?'ELE ESTÁ DENTRO DE TI':panic>50?'NÃO OLHES PARA ELE':'RESPIRA DEVAGAR';
    $('nightFill').style.width=`${progress*100}%`;$('nightFill').nextElementSibling.style.left=`${progress*100}%`;
    $('objectiveFill').style.width=`${progress*100}%`;$('objectivePercent').textContent=`${Math.floor(progress*100)}%`;
    $('timeLeft').textContent=formatTime(state.duration-state.elapsed);$('clock').textContent=clockLabel();
    $('threatLabel').textContent=state.eyeActive?'A OBSERVAR':state.threat>60?'MUITO PRÓXIMA':state.threat>25?'A APROXIMAR':'INDETERMINADA';
    $('eyeWarning').classList.toggle('visible',state.eyeActive);
    $('sceneFrame').classList.toggle('low-sleep',sleep>80);
    $('aliveCount').textContent=`${String(state.survivors.length).padStart(2,'0')} / 05`;
    const coffee=$('coffeeAction');coffee.disabled=state.coffee<=0||state.coffeeCooldown>0||!state.started||state.ended;
    $('flashAction').disabled=state.flashlightCooldown>0||!state.started||state.ended;
    $('radioAction').disabled=state.radioCooldown>0||!state.started||state.ended;
    $('breatheAction').disabled=state.breatheCooldown>0||!state.started||state.ended;
    $('inventoryCount').textContent=String(state.coffee).padStart(2,'0');
    $('locationText').innerHTML=`QUARTO 03 <i>•</i> ${state.eyeActive?'PRESENÇA DETETADA':'02:13'}`;
  }
  function startGame(){if(state.ended){resetGame()}state.started=true;state.paused=false;$('startOverlay').classList.add('dismissed');$('sessionLabel').textContent='VIGÍLIA EM CURSO';setToast('NOITE INICIADA · AGUENTA ATÉ ÀS 06:00');playTone(110,.2,.04);}
  function resetGame(){state.started=false;state.paused=false;state.ended=false;state.won=false;state.elapsed=0;state.sleep=24;state.panic=8;state.threat=0;state.eyeActive=false;state.eyeUntil=0;state.eyeClearedAt=0;state.coffee=3;state.coffeeCooldown=state.radioCooldown=state.breatheCooldown=state.flashlightCooldown=0;state.eventIndex=0;state.lostSurvivors=0;state.survivors=['MARTA','LUÍS','INES','RAFA','TOMÁS'];$('startOverlay').classList.remove('dismissed');$('startButton').querySelector('span').textContent='TENTAR OUTRA VEZ';$('sessionLabel').textContent='VIGÍLIA LOCAL';$('modal').classList.add('hidden');$('survivorList').innerHTML='<div class="survivor"><span class="avatar">M</span><span class="survivor-name">MARTA <small>tu</small></span><i class="status-self"></i></div><div class="survivor"><span class="avatar">L</span><span class="survivor-name">LUÍS</span><i class="status-dot"></i></div><div class="survivor"><span class="avatar">I</span><span class="survivor-name">INES</span><i class="status-dot"></i></div><div class="survivor"><span class="avatar">R</span><span class="survivor-name">RAFA</span><i class="status-dot"></i></div><div class="survivor"><span class="avatar">T</span><span class="survivor-name">TOMÁS</span><i class="status-dot"></i></div>';updateHud()}
  function action(kind){if(!state.started||state.paused||state.ended){if(!state.started&&!state.ended)startGame();return}
    if(kind==='coffee'){
      if(state.coffee<=0||state.coffeeCooldown>0)return;
      state.coffee--;state.sleep=Math.max(0,state.sleep-29);state.panic=Math.min(100,state.panic+2);state.coffeeCooldown=19;
      $('tipText').textContent='Um gole de cada vez. As mãos não param de tremer.';setToast('CAFÉ FRIO · SONOLÊNCIA REDUZIDA');playTone(320,.12,.025);setTimeout(()=>playTone(410,.16,.02),100);
    } else if(kind==='flash'){
      if(state.flashlightCooldown>0)return;
      state.flashlightCooldown=9;state.flashUntil=state.elapsed+1.15;
      $('flashOverlay').classList.remove('flash');void $('flashOverlay').offsetWidth;$('flashOverlay').classList.add('flash');
      if(state.eyeActive){state.eyeActive=false;state.eyeUntil=0;state.panic=Math.max(0,state.panic-17);state.threat=Math.max(0,state.threat-34);setToast('A PRESENÇA RECUOU PARA A ESCURIDÃO');playTone(75,.28,.05)}else{state.threat=Math.max(0,state.threat-12);setToast('O FEIXE TREME NA ESCURIDÃO');playTone(150,.12,.025)}
    } else if(kind==='radio'){
      if(state.radioCooldown>0)return;state.radioCooldown=13;state.panic=Math.max(0,state.panic-16);state.sleep=Math.max(0,state.sleep-6);setToast(Math.random()<.35?'O RÁDIO SUSSURRA O TEU NOME…':'ESTÁTICA. PELO MENOS NÃO ESTÁS SOZINHO.');$('tipText').textContent='A voz da estação está mais próxima do que devia.';playTone(180,.32,.022);
    } else if(kind==='breathe'){
      if(state.breatheCooldown>0)return;state.breatheCooldown=10;state.panic=Math.max(0,state.panic-19);state.sleep=Math.min(100,state.sleep+3);setToast('INSPIRA… EXPIRA… DEVAGAR.');playTone(95,.25,.018);
    }
    updateHud();
  }
  function spawnEye(){state.eyeActive=true;state.eyeSide=Math.random()>.5?1:-1;state.eyeUntil=state.elapsed+10;state.eyeClearedAt=0;state.threat=Math.min(100,state.threat+23);$('tipText').textContent='Não está no quarto. Está atrás dos teus olhos.';setToast('ALGO SE MOVEU NO CANTO DO QUARTO');if(state.sound)playTone(48,.75,.035);}
  function endGame(won){state.ended=true;state.won=won;state.paused=true;state.eyeActive=false;$('modalTitle').textContent=won?'AMANHECEU.':'ADORMECESTE.';$('modalBody').textContent=won?'A luz atravessa as cortinas. A casa está vazia, mas os outros sobreviveram contigo. Pelo menos… achas que sim.':'A presença encontrou-te no sonho. A vigília terminou, mas a noite não. Tenta outra vez — e não deixes a sonolência tomar conta.';$('modalPrimary').textContent=won?'JOGAR OUTRA NOITE':'TENTAR NOVAMENTE';$('modal').classList.remove('hidden');$('sessionLabel').textContent=won?'SOBREVIVENTE':'VIGÍLIA TERMINADA';if(won)playTone(440,.5,.04);else{frame.classList.add('shake');setTimeout(()=>frame.classList.remove('shake'),500);playTone(40,.9,.05)}}
  function tick(now){const dt=Math.min(.06,(now-state.lastTime)/1000);state.lastTime=now;state.bob+=dt*2.7;
    if(state.started&&!state.paused&&!state.ended){
      state.elapsed+=dt;state.sleep+=dt*(.31+(state.panic/100)*.06);state.panic=Math.max(0,state.panic-dt*.24);
      state.threat=Math.max(0,state.threat-dt*.25);
      if(state.eyeActive){state.panic+=dt*.82;state.sleep+=dt*.18;const facingAway=Math.abs(state.yaw)>0.42;if(facingAway){if(!state.eyeClearedAt)state.eyeClearedAt=state.elapsed;if(state.elapsed-state.eyeClearedAt>1.8){state.eyeActive=false;state.panic=Math.max(0,state.panic-9);state.threat=Math.max(0,state.threat-20);setToast('DESVIASTE O OLHAR. POR AGORA.')}}else state.eyeClearedAt=0;if(state.elapsed>state.eyeUntil&&state.eyeActive){state.eyeActive=false;state.panic+=9;state.sleep+=7;setToast('A PRESENÇA DESAPARECEU…') }}
      const nextEvent=[18,49,81,116,146][state.eventIndex];if(nextEvent!==undefined&&state.elapsed>=nextEvent){state.eventIndex++;spawnEye()}
      if(state.elapsed>65&&state.elapsed>state.eventIndex*30&&state.survivors.length>1&&Math.random()<dt*.0015){const dropped=state.survivors.pop();state.lostSurvivors++;const el=$('survivorList').querySelectorAll('.survivor');if(el.length>1)el[el.length-1].remove();setToast(`${dropped} ADORMECEU. RESTAM ${state.survivors.length} ACORDADOS.`);}
      state.coffeeCooldown=Math.max(0,state.coffeeCooldown-dt);state.flashlightCooldown=Math.max(0,state.flashlightCooldown-dt);state.radioCooldown=Math.max(0,state.radioCooldown-dt);state.breatheCooldown=Math.max(0,state.breatheCooldown-dt);
      if(state.sleep>=100||state.panic>=100)endGame(false);else if(state.elapsed>=state.duration)endGame(true);
      updateHud();
    }
    state.yaw+=(state.targetYaw-state.yaw)*Math.min(1,dt*4);drawRoom(now);requestAnimationFrame(tick)
  }

  function playTone(freq,duration,volume){if(!state.sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.72),audioCtx.currentTime+duration);gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration)}catch(_){}}
  $('startButton').addEventListener('click',startGame);$('coffeeAction').addEventListener('click',()=>action('coffee'));$('flashAction').addEventListener('click',()=>action('flash'));$('radioAction').addEventListener('click',()=>action('radio'));$('breatheAction').addEventListener('click',()=>action('breathe'));
  $('soundToggle').addEventListener('click',()=>{state.sound=!state.sound;$('soundState').textContent=state.sound?'ON':'OFF';$('footerSound').textContent=state.sound?'ATIVO':'MUDO';setToast(state.sound?'ÁUDIO ATIVADO':'ÁUDIO DESATIVADO');if(state.sound)playTone(260,.12,.02)});
  $('modalClose').addEventListener('click',()=>{if(!state.ended){state.paused=false;$('modal').classList.add('hidden')}});
  $('modalPrimary').addEventListener('click',()=>{if(state.ended)resetGame();else{state.paused=false;$('modal').classList.add('hidden')}});
  frame.addEventListener('pointermove',(e)=>{const r=frame.getBoundingClientRect();state.targetYaw=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2))});
  frame.addEventListener('pointerleave',()=>{state.targetYaw=0});
  window.addEventListener('keydown',(e)=>{if(e.repeat)return;const key=e.key.toLowerCase();if(key===' '){e.preventDefault();if(!state.started)startGame();else action('breathe')}if(key==='1')action('coffee');if(key==='2')action('flash');if(key==='3')action('radio');if(key==='q')action('breathe');if(key==='escape'&&state.started&&!state.ended){state.paused=!state.paused;$('modal').classList.toggle('hidden',!state.paused);$('modalTitle').textContent='PAUSA';$('modalBody').textContent='Respira. Ele ainda não te encontrou.';$('modalPrimary').textContent='RETOMAR'}if(key==='f1'){e.preventDefault();$('modalTitle').textContent='CONTROLOS';$('modalBody').textContent='1 — Beber café · 2 — Lanterna · 3 — Rádio · Q / Espaço — Respirar fundo. Move o rato para olhar em volta. Desvia o olhar quando a presença surgir ou usa a lanterna para a afastar.';$('modalPrimary').textContent=state.paused?'RETOMAR':'FECHAR';state.paused=true;$('modal').classList.remove('hidden')}});
  // Initial frame and HUD.
  updateHud();requestAnimationFrame(tick);
})();
