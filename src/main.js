(function () {
  const cfg = PP.config;

  const refCanvas = document.getElementById('ref-canvas');
  const timerEl = document.getElementById('timer');
  const trayEl = document.getElementById('tray-info');
  const poolCanvas = document.getElementById('pool-canvas');
  const winEl = document.getElementById('win');
  const winTitleEl = document.getElementById('win-title');
  const winListEl = document.getElementById('win-list');

  const cardsEl = document.getElementById('cards');
  const referenceEl = document.getElementById('reference');

  const players = [];
  const bots = [];
  let human = null;
  let skills = null;
  let pool = null;
  let poolView = null;
  let template = null;
  let source = null;
  let artSeed = cfg.seed;
  let roundSeed = cfg.seed;
  let over = false;
  let started = false;
  let finishedCount = 0;
  let frame = 0;

  // Ağ oyunu. Tek kişilik oyunda net null kalır ve hiçbir ağ kodu çalışmaz.
  const audio = PP.Audio(cfg);

  let net = null;
  let lobby = null;
  let online = false;
  let mySeat = 0;
  const panelSeat = [0, 1, 2, 3];   // panel indeksi -> koltuk numarası
  let netMembers = [];
  let progressTimer = null;
  const lastSeen = {};        // koltuk -> son mesaj zamanı

  function seatOfPeer(id) {
    for (let i = 0; i < netMembers.length; i++) {
      if (netMembers[i].id === id) return netMembers[i].seat;
    }
    return -1;
  }

  const stageEl = document.getElementById('stage');
  const startEl = document.getElementById('start');
  const announceEl = document.getElementById('announce');

  const SKILL_SOUND = { deprem: 'deprem', ruzgar: 'ruzgar', karartma: 'darbe', sis: 'darbe' };

  // Kim kime ne attı — büyüler görünür olmazsa oyun rastgele hissettirir
  function announce(caster, skill, target) {
    const el = document.createElement('div');
    el.className = 'ann' + (target && target.state.isHuman ? ' hit' : '');
    const who = caster.state.isHuman ? 'Sen' : caster.state.name;
    const whom = !target ? 'herkese' : (target.state.isHuman ? 'sana' : target.state.name);
    el.innerHTML = who + ' → ' + whom + ' · <strong>' + skill.name + '</strong>';
    announceEl.appendChild(el);
    while (announceEl.children.length > 3) announceEl.removeChild(announceEl.firstChild);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, cfg.fx.announceMs);
  }

  function buildArtwork() {
    const w = cfg.puzzle.cols * cfg.puzzle.sourcePieceSize;
    const h = cfg.puzzle.rows * cfg.puzzle.sourcePieceSize;
    source = PP.artwork.create(w, h, PP.Rng(artSeed));

    const refW = 640;   // büyütülen madalyon bulanıklaşmasın diye yüksek çözünürlük
    refCanvas.width = refW;
    refCanvas.height = Math.round(refW * (h / w));
    refCanvas.getContext('2d').drawImage(source, 0, 0, refCanvas.width, refCanvas.height);

    for (let i = 0; i < players.length; i++) players[i].setSource(source);
    template = PP.slicer.slice(source, cfg.puzzle.cols, cfg.puzzle.rows);
    if (poolView) poolView.setSource(source, template);
  }

  function createPlayers() {
    const defs = [{ name: 'Sen', isHuman: true }].concat(cfg.bots);
    for (let i = 0; i < 4; i++) {
      const def = defs[i];
      const p = PP.Player({
        id: i,
        name: def.name,
        isHuman: !!def.isHuman,
        canvas: document.getElementById('canvas-' + i),
        config: cfg,
        audio: audio,
        overlayIds: i === 0 ? ['head-0', 'hint', 'reference'] : ['head-' + i, 'reference']
      });
      players.push(p);
      if (def.isHuman) {
        human = PP.Human(p, cfg);
        p.bus.on('niyet:tut', function () { audio.play('tut'); });
        p.bus.on('niyet:birak', function () { audio.play('birak'); });
      } else {
        const nameEl = document.getElementById('name-' + i);
        if (nameEl) nameEl.textContent = def.name;
        bots.push({ player: p, ctrl: null, def: def, index: i, active: true });
      }
    }
  }

  function makeBots() {
    for (let i = 0; i < bots.length; i++) {
      bots[i].ctrl = PP.Bot(
        bots[i].player, PP.Rng(roundSeed + 977 * (i + 1)), bots[i].def, skills, pool
      );
    }
  }

  function setPanelName(panel, text) {
    players[panel].state.name = text;
    const el = document.getElementById('name-' + panel);
    if (el) el.textContent = text;
  }

  // Ağ oyunu: koltuk numarası ile panel numarası ayrılır. Her oyuncu kendini
  // sol üstteki büyük panelde, diğerlerini küçük panellerde görür.
  function applySeating(members) {
    const others = [];
    for (let s = 0; s < 4; s++) if (s !== mySeat) others.push(s);
    panelSeat[0] = mySeat;
    for (let i = 0; i < 3; i++) panelSeat[i + 1] = others[i];

    const isHost = net.state.role === 'host';
    for (let panel = 0; panel < 4; panel++) {
      const seat = panelSeat[panel];
      const human = members.some(function (m) {
        return m.seat === seat && m.id !== net.state.selfId;
      });
      const st = players[panel].state;
      st.seat = seat;
      st.dropped = false;
      document.getElementById('panel-' + panel).classList.remove('dropped');
      // Botları oda sahibi simüle eder; misafirlerde kendisi dışındaki
      // her koltuk uzaktır. Yoksa botlar her makinede ayrı ayrı oynardı.
      st.remote = panel !== 0 && (human || !isHost);
      st.owned = !st.remote;
      setPanelName(panel, 'Oyuncu ' + (seat + 1));
      if (panel > 0) bots[panel - 1].active = !st.remote;
    }
  }

  function panelOfSeat(seat) {
    for (let i = 0; i < panelSeat.length; i++) if (panelSeat[i] === seat) return i;
    return -1;
  }

  function startNetworkRound(info) {
    online = true;
    started = true;
    mySeat = info.mySeat;
    cfg.mode = info.mode;
    roundSeed = info.seed >>> 0;
    netMembers = info.members || [];
    stageEl.classList.toggle('klasik', cfg.mode === 'klasik');
    applySeating(netMembers);
    resizeAll();
    restart();

    const now = Date.now();
    for (let s = 0; s < 4; s++) lastSeen[s] = now;

    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(function () {
      broadcastBoards();
      checkTimeouts();
    }, cfg.net.snapshotMs);
  }

  // Oyuncu düştü. Yerine kimse geçmez — tahtası son hâliyle donar, paneli
  // soluklaşır ve karanlık büyüler artık onu hedeflemez.
  function markDropped(seat) {
    const panel = panelOfSeat(seat);
    if (panel < 0) return;
    const st = players[panel].state;
    if (st.dropped) return;
    st.dropped = true;
    document.getElementById('panel-' + panel).classList.add('dropped');
    netMembers = netMembers.filter(function (m) { return m.seat !== seat; });
    if (net && net.state.role === 'host') net.send({ t: 'dustu', seat: seat });
    showDrop(seat);
  }

  function showDrop(seat) {
    const el = document.createElement('div');
    el.className = 'ann';
    el.textContent = 'Oyuncu ' + (seat + 1) + ' düştü';
    announceEl.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, cfg.fx.announceMs);
  }

  function checkTimeouts() {
    if (!online || !net || over) return;
    const now = Date.now();

    if (net.state.role === 'host') {
      for (let panel = 1; panel < 4; panel++) {
        const st = players[panel].state;
        if (!st.remote || st.dropped) continue;
        if (now - (lastSeen[st.seat] || now) > cfg.net.timeoutMs) markDropped(st.seat);
      }
      return;
    }

    // Misafir: oda sahibinden ses kesildiyse bağlantı kopmuştur
    let newest = 0;
    for (let panel = 1; panel < 4; panel++) {
      const seat = players[panel].state.seat;
      newest = Math.max(newest, lastSeen[seat] || 0);
    }
    if (newest && now - newest > cfg.net.timeoutMs) {
      over = true;
      started = false;
      winTitleEl.textContent = 'Bağlantı koptu';
      winListEl.innerHTML = '';
      document.getElementById('win-again').hidden = true;
      document.getElementById('win-mode').hidden = false;
      winEl.hidden = false;
    }
  }

  // Sahip olduğum her tahtanın özetini yayınla. Oda sahibi botlarınkini de
  // gönderir; misafirler sadece kendi tahtasını.
  function broadcastBoards() {
    if (!online || over) return;
    for (let panel = 0; panel < 4; panel++) {
      const st = players[panel].state;
      if (!st.owned) continue;
      net.send({ t: 'tahta', seat: st.seat, p: players[panel].table.snapshot() });
    }
  }

  function setupNet() {
    if (net) return;
    net = PP.Net(cfg);
    lobby = PP.Lobby(net, cfg, startNetworkRound);

    net.on('hata', function (info) {
      const msg = (info.error && info.error.message) || 'Bağlantı hatası.';
      const el = document.getElementById('net-error');
      el.textContent = msg;
      el.hidden = false;
      // Lobi açıkken başlangıç ekranındaki hata görünmüyor
      const lobbyPanel = document.getElementById('lobby');
      if (!lobbyPanel.hidden) document.getElementById('lobby-status').textContent = msg;
    });

    net.on('tahta', function (msg) {
      lastSeen[msg.seat] = Date.now();
      const panel = panelOfSeat(msg.seat);
      if (panel < 0 || !players[panel].state.remote) return;
      players[panel].table.applySnapshot(msg.p || []);
      players[panel].refreshProgress();
    });

    net.on('buyu', function (msg) {
      if (!skills) return;
      skills.remoteCast(msg.skill, msg.caster, msg.target);
    });

    net.on('bitti', function (msg) {
      const panel = panelOfSeat(msg.seat);
      if (panel < 0 || over) return;
      const p = players[panel];
      p.state.finished = true;
      p.state.finishedAt = msg.time || p.state.elapsed;
      document.getElementById('panel-' + panel).classList.add('done');
      endRound(p);
    });

    // Kopma bildirimi gelirse hemen işle; gelmezse zaman aşımı yakalar
    net.on('ayrildi', function (info) {
      if (net.state.role !== 'host' || !online) return;
      const seat = seatOfPeer(info.id);
      if (seat >= 0) markDropped(seat);
    });

    net.on('dustu', function (msg) { markDropped(msg.seat); });

    net.on('kopdu', function () {
      if (!online) return;
      over = true;
      started = false;
    });

    document.getElementById('lobby-start').addEventListener('click', lobby.start);
    document.getElementById('lobby-leave').addEventListener('click', function () {
      lobby.leave();
      goOffline();
    });
  }

  // Ağ oyunundan çıkınca her şey tek kişilik hâline döner
  function goOffline() {
    online = false;
    started = false;
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    netMembers = [];
    for (let panel = 0; panel < 4; panel++) {
      players[panel].state.remote = false;
      players[panel].state.owned = true;
      players[panel].state.seat = panel;
      panelSeat[panel] = panel;
      if (panel > 0) {
        bots[panel - 1].active = true;
        setPanelName(panel, bots[panel - 1].def.name);
      }
    }
  }

  // Havuzdan kapma: tıklanan parça o an kimindiyse onun olur
  function claimFromPool(x, y) {
    if (over) return;
    const slot = poolView.hit(x, y);
    if (slot < 0) return;
    const id = pool.state.slots[slot];
    if (id === null || !players[0].canClaim(id)) return;
    pool.take(slot);
    players[0].claim(id);
  }

  // --- Büyü arayüzü ---

  function showCards(offer) {
    if (!offer) { cardsEl.hidden = true; return; }
    const light = PP.skills[offer.light];
    const dark = PP.skills[offer.dark];
    document.getElementById('card-light-name').textContent = light.name;
    document.getElementById('card-light-desc').textContent = light.desc;
    document.getElementById('card-dark-name').textContent = dark.name;
    document.getElementById('card-dark-desc').textContent = dark.desc;
    cardsEl.hidden = false;
  }

  function renderWarnings() {
    for (let i = 0; i < players.length; i++) {
      const el = document.getElementById('warn-' + i);
      const w = players[i].state.warning;
      if (w) {
        el.textContent = w.text;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    }
    // Sis ortak referansı gizler
    referenceEl.classList.toggle('fogged', players[0].hasEffect('sis'));
  }


  function resizeAll() {
    for (let i = 0; i < players.length; i++) players[i].resize();
    if (poolView) poolView.resize();
  }

  function rebuild() {
    buildArtwork();
    for (let i = 0; i < players.length; i++) {
      players[i].setPieces(PP.slicer.slice(source, cfg.puzzle.cols, cfg.puzzle.rows));
    }
    resizeAll();
    restart();
  }

  function restart() {
    over = false;
    finishedCount = 0;
    winEl.hidden = true;
    cardsEl.hidden = true;
    announceEl.innerHTML = '';
    if (human) human.release();
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      document.getElementById('panel-' + i).classList.remove('done');
      // Saçılma her panelde farklı (boyutlar farklı), klasik moddaki geliş
      // sırası ise herkeste ortak — adalet bozulmasın diye
      p.restart(PP.Rng(roundSeed + 31 * (i + 1)), PP.Rng(roundSeed));
    }
    pool.reset(cfg.puzzle.cols * cfg.puzzle.rows);
    skills.reset();
    makeBots();
    renderWarnings();
    updateHud();
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function updateHud() {
    const total = cfg.puzzle.cols * cfg.puzzle.rows;
    let leader = -1;
    let leaderScore = -1;
    for (let i = 0; i < players.length; i++) {
      if (players[i].state.correct > leaderScore) {
        leaderScore = players[i].state.correct;
        leader = i;
      }
    }

    for (let i = 0; i < players.length; i++) {
      const st = players[i].state;
      const bar = document.getElementById('bar-' + i);
      const prog = document.getElementById('prog-' + i);
      if (bar) {
        bar.style.width = Math.round((st.correct / total) * 100) + '%';
        bar.classList.toggle('leader', i === leader && leaderScore > 0);
      }
      // Yalnız toplam ilerleme; hangi parçanın yanlış olduğu söylenmez
      if (prog) prog.textContent = st.correct + '/' + total;
    }

    const me = players[0];
    timerEl.textContent = formatTime(me.state.elapsed);
    if (me.state.blockedUntil > 0) {
      trayEl.textContent = 'akış kilitli';
    } else if (cfg.mode === 'havuz') {
      trayEl.textContent = 'tepsi ' + me.trayCount() + '/' + cfg.pool.trayLimit;
    } else {
      const left = me.nextPieceIn();
      trayEl.textContent = left < 0 ? 'tüm parçalar geldi' : 'sonraki ' + Math.ceil(left) + 's';
    }
  }

  function finish(player) {
    if (player.state.finished) return;
    player.state.finished = true;
    player.state.finishedAt = player.state.elapsed;
    finishedCount++;
    player.state.rank = finishedCount;
    const panel = players.indexOf(player);
    document.getElementById('panel-' + panel).classList.add('done');
    if (online && net && player.state.owned) {
      net.send({ t: 'bitti', seat: player.state.seat, time: player.state.finishedAt });
    }
    // Yarış modu: ilk bitiren turu kapatır
    if (!over) endRound(player);
  }

  function endRound(winner) {
    over = true;
    const total = cfg.puzzle.cols * cfg.puzzle.rows;
    winTitleEl.textContent = winner.state.isHuman ? 'Kazandın' : winner.state.name + ' kazandı';

    const ranked = players.slice().sort(function (a, b) {
      if (a.state.finished !== b.state.finished) return a.state.finished ? -1 : 1;
      if (a.state.finished) return a.state.finishedAt - b.state.finishedAt;
      return b.state.correct - a.state.correct;
    });

    winListEl.innerHTML = '';
    for (let i = 0; i < ranked.length; i++) {
      const st = ranked[i].state;
      const li = document.createElement('li');
      if (st.isHuman) li.className = 'me';
      const left = document.createElement('span');
      left.textContent = (i + 1) + '. ' + st.name;
      const right = document.createElement('span');
      right.textContent = st.finished
        ? formatTime(st.finishedAt)
        : st.correct + '/' + total;
      li.appendChild(left);
      li.appendChild(right);
      winListEl.appendChild(li);
    }
    // Ağ oyununda yeni turu sadece oda sahibi başlatabilir
    const canRestart = !online || (net && net.state.role === 'host');
    document.getElementById('win-again').hidden = !canRestart;
    document.getElementById('win-mode').hidden = online;
    winEl.hidden = false;
    audio.play(winner.state.isHuman ? 'kazandi' : 'kaybettin');
    if (human) human.release();
  }

  function update(dt) {
    if (over || !started) return;
    if (cfg.mode === 'havuz') pool.update(dt);
    skills.update(dt);
    for (let i = 0; i < bots.length; i++) {
      if (bots[i].active && bots[i].ctrl) bots[i].ctrl.update(dt, cfg.skills);
    }
    for (let i = 0; i < players.length; i++) {
      if (players[i].update(dt)) finish(players[i]);
    }
  }

  function render() {
    frame++;
    if (human) human.updateCursor();
    players[0].draw();
    if (cfg.mode === 'havuz') poolView.draw();
    // Seyirci panelleri daha seyrek çizilir
    if (frame % cfg.render.spectatorEveryN === 0) {
      for (let i = 1; i < players.length; i++) players[i].draw();
    }
  }

  const game = {
    rebuild: rebuild,
    restart: restart,
    // Test kolaylığı: sadece insana ihtiyacı olan parçaları verir
    revealAll: function () {
      const me = players[0];
      const n = cfg.puzzle.cols * cfg.puzzle.rows;
      for (let id = 0; id < n; id++) me.table.receive(id);
      me.refreshProgress();
      updateHud();
    },
    newArtwork: function () {
      artSeed = (artSeed * 1664525 + 1013904223) >>> 0;
      rebuild();
    },
    setBotSpeed: function (percent) {
      for (let i = 0; i < cfg.bots.length; i++) {
        const base = BOT_BASE[i];
        cfg.bots[i].thinkMs = base.thinkMs * (100 / percent);
        cfg.bots[i].jitterMs = base.jitterMs * (100 / percent);
      }
      makeBots();
    },
    setBotError: function (percent) {
      for (let i = 0; i < cfg.bots.length; i++) {
        cfg.bots[i].errorRate = (percent / 100) * BOT_BASE[i].errorScale;
      }
    }
  };

  // Bot kaydırıcıları oranla çalışsın diye başlangıç değerleri saklanır
  const BOT_BASE = cfg.bots.map(function (b, i) {
    return { thinkMs: b.thinkMs, jitterMs: b.jitterMs, errorScale: 1 + i * 0.5 };
  });

  // Havuz modunda karanlık büyü havuzuna Kilit de girer
  function setMode(mode) {
    goOffline();
    cfg.mode = mode;
    stageEl.classList.toggle('klasik', mode === 'klasik');
    startEl.hidden = true;
    started = true;
    resizeAll();
    restart();
  }

  function showModeSelect() {
    started = false;
    over = true;
    startEl.hidden = false;
    winEl.hidden = true;
  }

  // Tarayıcılar sesi ancak kullanıcı hareketinden sonra açıyor
  window.addEventListener('pointerdown', function once() {
    audio.unlock();
    window.removeEventListener('pointerdown', once);
  });

  const muteBtn = document.getElementById('mute');
  muteBtn.addEventListener('click', function () {
    muteBtn.textContent = audio.toggle() ? 'ses açık' : 'ses kapalı';
  });

  window.addEventListener('resize', resizeAll);
  document.getElementById('win-again').addEventListener('click', function () {
    // Ağ oyununda oda sahibi yeni turu herkese duyurur
    if (online && net && net.state.role === 'host') {
      const payload = {
        t: 'basla',
        seed: Math.floor(Math.random() * 0x7fffffff),
        mode: cfg.mode,
        members: netMembers
      };
      net.send(payload);
      startNetworkRound({
        seed: payload.seed, mode: payload.mode,
        members: netMembers, mySeat: mySeat
      });
      return;
    }
    restart();
  });
  document.getElementById('win-mode').addEventListener('click', showModeSelect);
  document.getElementById('mode-klasik').addEventListener('click', function () { setMode('klasik'); });
  document.getElementById('mode-havuz').addEventListener('click', function () { setMode('havuz'); });

  // Ağ kodu ancak buraya tıklanınca yüklenir
  document.getElementById('btn-host').addEventListener('click', function () {
    setupNet();
    lobby.host();
  });
  document.getElementById('btn-join').addEventListener('click', function () {
    setupNet();
    lobby.join();
  });
  document.getElementById('join-code').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { setupNet(); lobby.join(); }
  });

  document.getElementById('card-light').addEventListener('click', function () {
    skills.choose(players[0], 'light');
  });
  document.getElementById('card-dark').addEventListener('click', function () {
    skills.choose(players[0], 'dark');
  });

  // Kart seçimi klavyeden de yapılabilir
  window.addEventListener('keydown', function (e) {
    if (over || !players[0].state.pendingOffer) return;
    if (e.key === '1') skills.choose(players[0], 'light');
    else if (e.key === '2') skills.choose(players[0], 'dark');
  });

  setInterval(function () {
    if (!over) updateHud();
    renderWarnings();
  }, 120);

  createPlayers();

  pool = PP.Pool(cfg, PP.Rng(roundSeed ^ 0x2b17));
  poolView = PP.PoolView(poolCanvas, pool, cfg, players[0]);
  poolCanvas.addEventListener('pointerdown', function (e) {
    const r = poolCanvas.getBoundingClientRect();
    claimFromPool(e.clientX - r.left, e.clientY - r.top);
  });

  skills = PP.SkillSystem(players, cfg, PP.Rng(cfg.seed ^ 0x5f3a), pool, {
    onOffer: function (player, offer) {
      if (!player.state.isHuman) return;
      showCards(offer);
      audio.play('kart');
    },
    onChosen: function (player) {
      if (player.state.isHuman) showCards(null);
    },
    onWarn: function (player) {
      if (player.state.isHuman) audio.play('uyari');
    },
    onCast: function (caster, skill, target) {
      announce(caster, skill, target);
      // Sadece beni ilgilendiren büyüler duyulur; yoksa gürültü olur
      if (caster.state.isHuman) audio.play('buyu');
      else if (!target || target.state.isHuman) audio.play(SKILL_SOUND[skill.id] || 'darbe');
    },
    // Yerel bir büyü atıldığında hedefiyle birlikte ağa duyurulur
    onLocalCast: function (skillId, casterSeat, targetSeat) {
      if (!online || !net) return;
      net.send({ t: 'buyu', skill: skillId, caster: casterSeat, target: targetSeat });
    }
  });

  stageEl.classList.toggle('klasik', cfg.mode === 'klasik');
  rebuild();
  PP.Tuner(game, cfg);
  PP.Loop(cfg.sim.stepMs, update, render).start();

  PP.game = game;
  PP.players = players;
  PP.skills_ = skills;
  // Hata ayıklama: çizim döngüsü durduğunda simülasyonu elle adımlamak için
  PP.step = update;
  PP.netState = function () {
    if (!net) return null;
    const now = Date.now();
    const ages = {};
    for (const s in lastSeen) ages[s] = now - lastSeen[s];
    return {
      role: net.state.role, code: net.state.code, peers: net.peerCount(),
      online: online, over: over, ages: ages
    };
  };
})();
