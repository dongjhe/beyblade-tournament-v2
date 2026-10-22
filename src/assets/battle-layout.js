(() => {
  const style=document.createElement('style');
  style.textContent=`
    .battle-modal{position:relative!important;background:radial-gradient(circle at 50% 34%,rgba(12,82,128,.22),transparent 36%),linear-gradient(145deg,#06111d 0%,#071a2a 52%,#06111c 100%)!important;border:1px solid #174b70!important;box-shadow:inset 0 0 45px rgba(0,113,190,.09),0 18px 50px rgba(0,0,0,.55)!important}.battle-head{display:none!important}.arena-corner{display:none!important}.battle-center{min-width:0!important}.battle-center>.countdown-btn{display:none!important}
    .battle-toolbar{width:100%;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) minmax(0,1fr) 48px;gap:10px;box-sizing:border-box;margin:0 0 12px}.battle-toolbar button{position:static!important;inset:auto!important;transform:none!important;width:100%!important;min-width:0!important;max-width:none!important;height:50px!important;margin:0!important;padding:6px 8px!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;border-radius:10px!important;font-size:12px!important;font-weight:900!important;line-height:1.05!important;white-space:nowrap!important;writing-mode:horizontal-tb!important;text-orientation:mixed!important;overflow:hidden!important;color:#fff!important;-webkit-text-fill-color:#fff!important;opacity:1!important;letter-spacing:.02em!important}.toolbar-countdown{grid-column:2!important;background:linear-gradient(135deg,#ffb000,#ff5a18 55%,#f62c3d)!important;border:2px solid #ffd13b!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 16px rgba(255,180,0,.45)!important;font-size:14px!important}.swap-side-btn{grid-column:1!important;background:linear-gradient(180deg,#128ff3,#0868bc)!important;border:2px solid #26c9ff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 12px rgba(0,169,255,.22)!important}.video-pause-btn{grid-column:3!important;background:linear-gradient(180deg,#1669bd,#0b447e)!important;border:2px solid #26bfff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)!important}.toolbar-close-btn{grid-column:4!important;background:linear-gradient(180deg,#183650,#0b2235)!important;border:2px solid #527b9c!important;font-size:27px!important;padding:0!important;line-height:1!important}
    .battle-footer{display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;min-height:62px!important;padding:10px 18px!important;border-top:2px solid #123f60!important;background:linear-gradient(180deg,#0a2438,#071a2a)!important;box-sizing:border-box!important}.next-match-label{font-size:12px!important;color:#819db2!important;white-space:nowrap!important}.next-match-names{font-size:18px!important;color:#fff!important;-webkit-text-fill-color:#fff!important;white-space:nowrap!important;font-weight:900!important}.next-match-btn{min-width:104px!important;padding:10px 18px!important;border-radius:9px!important;background:linear-gradient(180deg,#1498ff,#0769bf)!important;border:2px solid #2ed0ff!important;box-shadow:0 0 12px rgba(35,190,255,.25)!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:900!important}
    .battle-side{gap:8px!important}.battle-name{background:linear-gradient(180deg,#f8fbfd,#d7e0e7)!important;color:#071421!important;-webkit-text-fill-color:#071421!important;font-weight:950!important;text-shadow:0 1px 0 #fff!important;box-shadow:inset 0 -2px 0 rgba(0,0,0,.12)!important}.battle-side.player-a .battle-name,.battle-side.player-a .finish-btn{border-color:#19c8ff!important;box-shadow:inset 0 0 20px rgba(0,80,130,.08),0 0 10px rgba(25,200,255,.25)!important}.battle-side.player-b .battle-name,.battle-side.player-b .finish-btn{border-color:#ff3658!important;box-shadow:inset 0 0 20px rgba(120,0,30,.08),0 0 10px rgba(255,54,88,.25)!important}.finish-btn{background:linear-gradient(135deg,#071522,#081c2c)!important;border-width:2px!important;position:relative!important;overflow:hidden!important}.finish-btn:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,transparent 58%,rgba(255,255,255,.035) 58%,rgba(255,255,255,.035) 63%,transparent 63%)}.battle-side.player-a .finish-btn strong,.battle-side.player-a .finish-btn.xtreme b{color:#1ecbff!important}.battle-side.player-b .finish-btn strong,.battle-side.player-b .finish-btn.xtreme b{color:#ff526d!important}
    .battle-side .launch-fail-btn{margin-top:2px;min-height:60px;color:#fff!important;-webkit-text-fill-color:#fff!important;flex-direction:row!important;justify-content:center!important;gap:14px!important;font-weight:900!important}.battle-side.player-a .launch-fail-btn{background:linear-gradient(135deg,#092544,#0d4a78)!important;border:2px solid #20caff!important;box-shadow:inset 0 0 20px rgba(23,177,255,.12),0 0 12px rgba(32,202,255,.28)!important}.battle-side.player-b .launch-fail-btn{background:linear-gradient(135deg,#32101d,#761d35)!important;border:2px solid #ff3c5c!important;box-shadow:inset 0 0 20px rgba(255,55,91,.12),0 0 12px rgba(255,60,92,.28)!important}.battle-side .launch-fail-btn .fail-marks i{width:22px!important;height:22px!important;border-radius:50%!important;border:2px solid #d4dde4!important;background:linear-gradient(145deg,#56616b,#28323b)!important;box-shadow:inset 0 0 6px rgba(0,0,0,.8)!important}.battle-side .launch-fail-btn .fail-marks i.on{border-color:#ffd5d8!important;background:#ff243b!important;box-shadow:0 0 4px #fff,0 0 10px #ff243b,0 0 20px rgba(255,36,59,.9)!important}.battle-side .launch-fail-btn.has-fail{filter:brightness(1.08)!important}
    .score-versus .player-a-score{order:1}.score-versus>b{order:2;color:#fff!important;text-shadow:0 0 8px rgba(255,255,255,.25)!important}.score-versus .player-b-score{order:3}.score-versus.swapped .player-b-score{order:1}.score-versus.swapped .player-a-score{order:3}.big-score{background:linear-gradient(145deg,#0a1a29,#102a3f)!important;box-shadow:inset 0 0 25px rgba(0,0,0,.32)!important}.score-versus .player-a-score .big-score{border-color:#22c9ff!important;color:#20c8ff!important;box-shadow:inset 0 0 25px rgba(0,100,160,.18),0 0 14px rgba(34,201,255,.25)!important}.score-versus .player-b-score .big-score{border-color:#ff405e!important;color:#ff526d!important;box-shadow:inset 0 0 25px rgba(150,0,35,.18),0 0 14px rgba(255,64,94,.25)!important}.draw-btn{background:linear-gradient(180deg,#f6f8f9,#cbd5dd)!important;color:#0a1722!important;-webkit-text-fill-color:#0a1722!important;clip-path:polygon(8% 0,92% 0,100% 50%,92% 100%,8% 100%,0 50%)!important;border:0!important;font-weight:950!important}.reset-btn{background:linear-gradient(180deg,#e99400,#bb6200)!important;border:2px solid #ffb20d!important;box-shadow:0 0 12px rgba(255,151,0,.24)!important}.battle-round{font-weight:950!important;text-shadow:0 0 14px rgba(32,201,255,.16)!important}.battle-tools{grid-template-columns:1fr!important}.battle-tools>.launch-fail-btn{display:none!important}
    .battle-side.visual-left .battle-name{clip-path:polygon(0 0,88% 0,100% 35%,100% 100%,0 100%)!important}.battle-side.visual-right .battle-name{clip-path:polygon(12% 0,100% 0,100% 100%,0 100%,0 35%)!important}
    .battle-arena{display:grid!important;grid-template-columns:minmax(260px,1fr) minmax(360px,1.12fr) minmax(260px,1fr)!important;grid-template-areas:'toolbar toolbar toolbar' 'left center right'!important;align-items:start!important;gap:12px 18px!important;padding:18px 20px 16px!important;background:linear-gradient(90deg,rgba(0,110,190,.035),transparent 30%,transparent 70%,rgba(190,0,45,.035))!important}.battle-arena>.battle-toolbar{grid-area:toolbar!important}.battle-side.visual-left{grid-area:left!important;grid-column:1!important;grid-row:2!important}.battle-center{grid-area:center!important;grid-column:2!important;grid-row:2!important;width:100%!important}.battle-side.visual-right{grid-area:right!important;grid-column:3!important;grid-row:2!important}
    @media(max-width:760px) and (orientation:portrait){.battle-arena{grid-template-columns:1fr 1fr!important;grid-template-areas:'toolbar toolbar' 'center center' 'left right'!important;gap:10px 8px!important;padding:12px 10px 24px!important}.battle-arena>.battle-toolbar{grid-area:toolbar!important;grid-column:1/-1!important;grid-row:1!important}.battle-center{grid-area:center!important;grid-column:1/-1!important;grid-row:2!important}.battle-side.visual-left{grid-area:left!important;grid-column:1!important;grid-row:3!important}.battle-side.visual-right{grid-area:right!important;grid-column:2!important;grid-row:3!important}.battle-toolbar{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr) 42px!important;gap:6px!important}.battle-toolbar button{height:44px!important;font-size:9px!important}.battle-toolbar .toolbar-countdown{font-size:10px!important}.battle-toolbar .toolbar-close-btn{font-size:23px!important}.camera-preview,.replay-panel{width:min(340px,92vw)!important}.battle-footer{flex-wrap:wrap!important;gap:6px 10px!important}.next-match-label{width:100%!important;text-align:center!important}.next-match-names{font-size:15px!important}.next-match-btn{min-width:86px!important}}
    @media(orientation:landscape) and (max-height:700px){.battle-overlay{padding:0!important;align-items:flex-start!important;overflow-y:auto!important}.battle-modal{width:100vw!important;max-width:none!important;min-height:100dvh!important;max-height:none!important;border-radius:0!important}.battle-arena{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-areas:'toolbar toolbar toolbar' 'left center right'!important;column-gap:12px!important;row-gap:8px!important;padding:10px 16px 12px!important;width:100%!important;box-sizing:border-box!important}.battle-arena>.battle-toolbar{grid-area:toolbar!important;grid-column:1/-1!important;grid-row:1!important;width:100%!important;max-width:100%!important;margin:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) minmax(0,1fr) 46px!important;gap:10px!important}.battle-toolbar button{height:44px!important;font-size:11px!important;padding:4px 8px!important}.battle-toolbar .toolbar-countdown{font-size:12px!important}.battle-toolbar .toolbar-close-btn{font-size:25px!important;padding:0!important}.battle-side.visual-left{grid-area:left!important;grid-column:1!important;grid-row:2!important;min-width:0!important;width:100%!important}.battle-center{grid-area:center!important;grid-column:2!important;grid-row:2!important;min-width:0!important;width:100%!important;padding:0!important;overflow:hidden!important;align-items:stretch!important}.battle-side.visual-right{grid-area:right!important;grid-column:3!important;grid-row:2!important;min-width:0!important;width:100%!important}.battle-side{gap:5px!important;min-width:0!important}.battle-name{font-size:18px!important;padding:7px 5px!important}.finish-btn{min-height:52px!important;padding:6px 10px!important}.finish-btn b,.finish-btn.xtreme b{font-size:16px!important}.finish-btn strong{font-size:20px!important}.battle-side .launch-fail-btn{min-height:48px!important;margin-top:0!important}.battle-round{align-self:center!important;font-size:30px!important;margin:1px 0 2px!important}.battle-sub{display:none!important}.camera-preview,.replay-panel{position:static!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}.camera-preview,.replay-video{height:min(30vh,180px)!important;max-height:180px!important;width:100%!important;object-fit:contain!important;background:#000!important}.score-versus{width:100%!important;max-width:100%!important;margin:5px 0!important;grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr)!important;box-sizing:border-box!important}.big-score{height:62px!important;font-size:38px!important;border-radius:15px!important}.draw-btn,.battle-tools,.fail-note{width:100%!important;max-width:100%!important;box-sizing:border-box!important}.draw-btn{padding:8px!important}.reset-btn{padding:7px!important}.fail-note{display:none!important}.battle-footer{min-height:52px!important;padding:7px 16px calc(7px + env(safe-area-inset-bottom))!important;gap:12px!important}.next-match-label{font-size:11px!important}.next-match-names{font-size:15px!important}.next-match-btn{min-width:90px!important;padding:7px 14px!important}}

    /* Toolbar sits between header and arena, never inside the scoring grid. */
    .battle-modal>.battle-toolbar{position:relative!important;z-index:50!important;isolation:isolate!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;width:100%!important;margin:0!important;padding:10px 14px!important;background:#f2f5f0!important;box-sizing:border-box!important;pointer-events:auto!important}
    .battle-modal>.battle-toolbar button{position:relative!important;z-index:51!important;grid-column:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;width:100%!important;height:46px!important;padding:7px 6px!important;border:0!important;border-radius:10px!important;box-shadow:none!important;background-image:none!important;color:#24362c!important;-webkit-text-fill-color:#24362c!important;text-shadow:none!important;pointer-events:auto!important;cursor:pointer!important;white-space:normal!important;line-height:1.25!important;font-size:clamp(11px,2.4vw,15px)!important}
    .battle-modal>.battle-toolbar .swap-side-btn{background:#d7f1e9!important;color:#146c5c!important;-webkit-text-fill-color:#146c5c!important}
    .battle-modal>.battle-toolbar .toolbar-countdown{background:#c5f43a!important;color:#24351b!important;-webkit-text-fill-color:#24351b!important}
    .battle-modal>.battle-toolbar .video-pause-btn{background:#e8ddf5!important;color:#67418b!important;-webkit-text-fill-color:#67418b!important}
    .battle-modal>.battle-toolbar .battle-toolbar-actions{display:contents!important}
    .battle-modal>.battle-toolbar .toolbar-close-btn{display:none!important}
    .battle-modal>.battle-arena{grid-template-columns:minmax(0,1fr) minmax(260px,1.15fr) minmax(0,1fr)!important;grid-template-areas:'left center right'!important;grid-template-rows:auto!important;align-items:start!important;min-height:0!important}
    .battle-modal>.battle-arena>.battle-center{grid-area:center!important;grid-column:2!important;grid-row:1!important;position:relative!important;z-index:1!important}
    .battle-modal>.battle-arena>.battle-side.visual-left{grid-area:left!important;grid-column:1!important;grid-row:1!important}
    .battle-modal>.battle-arena>.battle-side.visual-right{grid-area:right!important;grid-column:3!important;grid-row:1!important}
    .battle-modal>.battle-head{display:flex!important;position:relative!important;z-index:60!important;justify-content:space-between!important}
    .battle-modal>.battle-head .battle-close{display:flex!important;align-items:center!important;justify-content:center!important;width:38px!important;height:34px!important;padding:0!important;font-size:27px!important;background:#e5eee5!important;color:#26372b!important;border:0!important;border-radius:8px!important;cursor:pointer!important}

    /* The header close is the only close control and stays above all HUD layers. */
    .battle-modal>.battle-head{display:flex!important;visibility:visible!important;opacity:1!important;min-height:52px!important;background:#fff!important;border-bottom:1px solid #dce5dd!important}
    .battle-modal>.battle-head .battle-close{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:100!important;pointer-events:auto!important;flex:0 0 40px!important;color:#21352e!important;-webkit-text-fill-color:#21352e!important}
    /* Three clearly distinct, accessible toolbar actions. */
    .battle-modal>.battle-toolbar .swap-side-btn{background:#087d70!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border:2px solid #087d70!important}
    .battle-modal>.battle-toolbar .toolbar-countdown{background:#c7f23e!important;color:#1b3526!important;-webkit-text-fill-color:#1b3526!important;border:2px solid #a7d92b!important}
    .battle-modal>.battle-toolbar .video-pause-btn{background:#6844a1!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border:2px solid #6844a1!important}
    .battle-modal>.battle-toolbar button:focus-visible,.battle-modal>.battle-head .battle-close:focus-visible{outline:3px solid #172c24!important;outline-offset:2px!important}
    /* Swap the actual player cards, names, controls and their identity colors together. */
    .battle-modal>.battle-arena.is-swapped>.battle-side.player-a{grid-area:right!important;grid-column:3!important}
    .battle-modal>.battle-arena.is-swapped>.battle-side.player-b{grid-area:left!important;grid-column:1!important}
    .battle-modal>.battle-arena.is-swapped .score-versus .player-a-score{order:3!important}
    .battle-modal>.battle-arena.is-swapped .score-versus .player-b-score{order:1!important}
    .battle-modal .battle-side.player-a .launch-fail-btn{color:#147b6d!important;-webkit-text-fill-color:#147b6d!important}
    .battle-modal .battle-side.player-b .launch-fail-btn{color:#7446a1!important;-webkit-text-fill-color:#7446a1!important}
    .battle-modal .battle-side .launch-fail-btn{font-weight:900!important;text-shadow:none!important}
    .battle-modal .battle-side.player-a .launch-fail-btn .fail-marks i{border-color:#168f7b!important}
    .battle-modal .battle-side.player-b .launch-fail-btn .fail-marks i{border-color:#8757b2!important}
    @media(max-width:760px) and (orientation:portrait){
      .battle-modal>.battle-toolbar{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;padding:8px 10px!important}
      .battle-modal>.battle-toolbar button{height:48px!important;font-size:clamp(10px,2.8vw,13px)!important;padding:6px 3px!important}
      .battle-modal>.battle-arena{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-areas:'center center' 'left right'!important;grid-template-rows:auto auto!important}
      .battle-modal>.battle-arena>.battle-center{grid-area:center!important;grid-column:1/-1!important;grid-row:1!important}
      .battle-modal>.battle-arena>.battle-side.visual-left{grid-area:left!important;grid-column:1!important;grid-row:2!important}
      .battle-modal>.battle-arena>.battle-side.visual-right{grid-area:right!important;grid-column:2!important;grid-row:2!important}
      .battle-modal>.battle-arena.is-swapped>.battle-side.player-a{grid-area:right!important;grid-column:2!important;grid-row:2!important}
      .battle-modal>.battle-arena.is-swapped>.battle-side.player-b{grid-area:left!important;grid-column:1!important;grid-row:2!important}
    }
    @media(orientation:landscape) and (max-height:700px){
      .battle-modal>.battle-arena{grid-template-columns:minmax(0,1fr) minmax(240px,1.08fr) minmax(0,1fr)!important;grid-template-areas:'left center right'!important;grid-template-rows:auto!important}
      .battle-modal>.battle-arena>.battle-center,.battle-modal>.battle-arena>.battle-side.visual-left,.battle-modal>.battle-arena>.battle-side.visual-right{grid-row:1!important}
    }
  `;document.head.appendChild(style);
  function setupBattle(modal){if(modal.dataset.layoutReady==='17')return;modal.dataset.layoutReady='17';let swapped=false;const arena=modal.querySelector('.battle-arena'),center=modal.querySelector('.battle-center'),sides=[...modal.querySelectorAll('.battle-side')],score=modal.querySelector('.score-versus'),tools=modal.querySelector('.battle-tools'),originalCountdown=modal.querySelector('.countdown-btn'),originalClose=modal.querySelector('.battle-close');if(!arena||!center||sides.length!==2||!score||!tools||!originalCountdown)return;const a=sides[0],b=sides[1];a.classList.add('player-a','visual-left');b.classList.add('player-b','visual-right');const boxes=[...score.children].filter(x=>x.tagName==='DIV');if(boxes[0])boxes[0].classList.add('player-a-score');if(boxes[1])boxes[1].classList.add('player-b-score');const fails=[...tools.querySelectorAll('.launch-fail-btn')];if(fails[0])a.appendChild(fails[0]);if(fails[1])b.appendChild(fails[1]);const bar=document.createElement('div');bar.className='battle-toolbar';modal.insertBefore(bar,arena);const swap=document.createElement('button');swap.type='button';swap.className='swap-side-btn';swap.textContent='⇄ 交換位置';bar.appendChild(swap);const go=document.createElement('button');go.type='button';go.className='toolbar-countdown';go.textContent='📹 3・2・1 GO SHOOT!';bar.appendChild(go);const stop=document.createElement('button');stop.type='button';stop.className='video-pause-btn';stop.textContent='⏸ 暫停';bar.appendChild(stop);go.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();originalCountdown.click()});stop.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const draw=modal.querySelector('.draw-btn');if(draw)draw.click()});swap.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();swapped=!swapped;arena.classList.toggle('is-swapped',swapped);score.classList.toggle('swapped',swapped);a.classList.toggle('visual-left',!swapped);a.classList.toggle('visual-right',swapped);b.classList.toggle('visual-left',swapped);b.classList.toggle('visual-right',!swapped)})}
  const observer=new MutationObserver(()=>document.querySelectorAll('.battle-modal').forEach(setupBattle));observer.observe(document.body,{childList:true,subtree:true});document.querySelectorAll('.battle-modal').forEach(setupBattle);
})();

// Keep the toolbar wording and recording overlay aligned with the current battle layout.
(() => {
  const syncToolbarLabels = () => {
    document.querySelectorAll('.toolbar-countdown').forEach(button => {
      if (button.dataset.labelInitialized) return;
      button.textContent = '📹 錄影模式';
      button.dataset.labelInitialized = '1';
    });
    document.querySelectorAll('.video-pause-btn').forEach(button => {
      if (button.dataset.labelInitialized) return;
      button.textContent = '📊 積分／晉級排行榜';
      button.dataset.labelInitialized = '1';
    });
  };

  const syncRecordingSideOrder = (overlay) => {
    const swapped = !!document.querySelector('.battle-modal .battle-side.visual-left.player-b');
    const desired = swapped ? 'swapped' : 'normal';
    if (overlay.dataset.sideOrder === desired) return;
    const shouldSwap = swapped !== (overlay.dataset.sideOrder === 'swapped');

    const leftPlayer = overlay.querySelector('.recording-player-a, .recording-player-b');
    const rightPlayer = overlay.querySelectorAll('.recording-player-a, .recording-player-b')[1];
    const leftName = overlay.querySelector('.recording-name-a');
    const rightName = overlay.querySelector('.recording-name-b');
    if (!leftPlayer || !rightPlayer || !leftName || !rightName) return;

    if (shouldSwap) {
      [leftName.textContent, rightName.textContent] = [rightName.textContent, leftName.textContent];
      leftPlayer.classList.toggle('recording-player-a', !leftPlayer.classList.contains('recording-player-a'));
      leftPlayer.classList.toggle('recording-player-b', !leftPlayer.classList.contains('recording-player-b'));
      rightPlayer.classList.toggle('recording-player-a', !rightPlayer.classList.contains('recording-player-a'));
      rightPlayer.classList.toggle('recording-player-b', !rightPlayer.classList.contains('recording-player-b'));
      overlay.querySelectorAll('[data-finish]').forEach(button => {
        const [side, type] = (button.dataset.finish || '').split(':');
        if (side && type) button.dataset.finish = `${side === 'a' ? 'b' : 'a'}:${type}`;
      });
      overlay.querySelectorAll('[data-fail]').forEach(button => {
        if (button.dataset.fail) button.dataset.fail = button.dataset.fail === 'a' ? 'b' : 'a';
      });
      const scoreA = overlay.querySelector('[data-score="a"]');
      const scoreB = overlay.querySelector('[data-score="b"]');
      const scoreTextA = scoreA?.textContent;
      const scoreTextB = scoreB?.textContent;
      scoreA?.setAttribute('data-score', 'b');
      scoreB?.setAttribute('data-score', 'a');
      if (scoreA) scoreA.textContent = scoreTextB || '0';
      if (scoreB) scoreB.textContent = scoreTextA || '0';
      const leftMarks = leftPlayer.querySelectorAll('.recording-fail i');
      const rightMarks = rightPlayer.querySelectorAll('.recording-fail i');
      const leftActive = [...leftMarks].map(mark => mark.classList.contains('active'));
      const rightActive = [...rightMarks].map(mark => mark.classList.contains('active'));
      leftMarks.forEach((mark, index) => {
        mark.classList.toggle('active', rightActive[index] || false);
      });
      rightMarks.forEach((mark, index) => {
        mark.classList.toggle('active', leftActive[index] || false);
      });
    }
    overlay.dataset.sideOrder = desired;
  };

  const syncRecordingVisibility = (overlay) => {
    const button = overlay.querySelector('.recording-go-btn');
    if (button?.textContent?.startsWith('📹 ')) button.textContent = button.textContent.slice(3);
    const label = button?.textContent || '';
    const live = /🔊|暫停/.test(label);
    const wasLive = overlay.classList.contains('recording-live');
    overlay.classList.toggle('recording-live', live);
    if (wasLive && !live) overlay.querySelector('.recording-preview')?.pause();
  };

  const sync = () => {
    syncToolbarLabels();
    document.querySelectorAll('.recording-mode-overlay').forEach(overlay => {
      syncRecordingSideOrder(overlay);
      syncRecordingVisibility(overlay);
    });
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.recording-go-btn');
    if (!button) return;
    const preview = button.closest('.recording-mode-overlay')?.querySelector('.recording-preview');
    if (preview) {
      preview.muted = true;
      preview.autoplay = true;
      preview.playsInline = true;
      preview.play?.().catch(() => {});
    }
  }, true);
  sync();
})();
