window.PP = window.PP || {};

// Kumar destesi. Mevcut büyü sisteminden bilinçli olarak ayrıdır:
//   büyüler  → ilerlemeye bağlı, iki karttan seçersin, anında çalışır (beceri)
//   kumar    → zamana bağlı, kör gelir, elinde birikir, sen kullanırsın (şans)
//
// Kartlar elde biriktiği için rakip kaç kartın olduğunu görür ama hangileri
// olduğunu göremez — blöf ve baskı bundan doğar.

// --- Yardımcılar ---

function gRandom(rng, arr) {
  return arr[Math.floor(rng.next() * arr.length)];
}

// Oyuncuya n parça kazandırır (mod farkını gizler)
function gGain(ctx, player, n) {
  for (let i = 0; i < n; i++) {
    if (ctx.mode === 'havuz') {
      const slot = ctx.pool.findSlot(function (id) { return !player.table.has(id); });
      if (slot < 0) break;
      const id = ctx.pool.take(slot);
      if (id >= 0) player.table.receive(id);
    } else {
      player.table.dripNext();
    }
  }
  player.refreshProgress();
}

// Izgaradan n parça söküp masaya savurur
function gKnock(ctx, player, n) {
  const seated = player.table.seatedPieces();
  let done = 0;
  for (let i = 0; i < n && seated.length; i++) {
    const id = seated.splice(Math.floor(ctx.rng.next() * seated.length), 1)[0];
    const p = player.table.byId(id);
    if (!p) continue;
    const px = p.x;
    const py = p.y;
    player.table.park(player.table.liftFromBoard(p), ctx.rng);
    ctx.fx(player, 'deprem', { x: px, y: py });
    done++;
  }
  if (done) player.refreshProgress();
  return done;
}

// n parçayı doğru hücresine oturtur
function gSeatCorrect(ctx, player, n) {
  const cols = player.board.state.cols;
  const pieces = player.table.state.pieces;
  const cands = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (!p.arrived) continue;
    const correct = p.row * cols + p.col;
    if (p.cell === correct) continue;
    if (!player.board.isFree(correct, p.id)) continue;
    cands.push(p);
  }
  ctx.rng.shuffle(cands);
  let done = 0;
  for (let i = 0; i < cands.length && done < n; i++) {
    if (player.table.seatPieceAt(cands[i].id, cands[i].row * cols + cands[i].col)) done++;
  }
  if (done) player.refreshProgress();
  return done;
}

function gOthers(ctx, includeSelf) {
  const out = [];
  for (let i = 0; i < ctx.players.length; i++) {
    const p = ctx.players[i];
    if (!p.state.active || p.state.finished || p.state.dropped) continue;
    if (!includeSelf && p === ctx.self) continue;
    out.push(p);
  }
  return out;
}

function gLeader(ctx) {
  let best = null;
  const list = gOthers(ctx, false);
  for (let i = 0; i < list.length; i++) {
    if (!best || list[i].state.correct > best.state.correct) best = list[i];
  }
  return best;
}

// --- Kartlar ---

PP.gambleCards = {

  eldegistir: {
    id: 'eldegistir',
    name: 'El değiştir',
    desc: 'Tahtanı RASTGELE bir rakiple değiştirirsin — kim olduğunu bilmezsin',
    risk: 'high',
    // Teke tekte rastgelelik kalmaz, düz bir tahta takasına döner ve
    // maçı tek kartla çevirir; o yüzden 3+ oyuncu ister.
    minPlayers: 3,
    apply: function (ctx) {
      const rivals = gOthers(ctx, false);
      if (!rivals.length) return;
      const other = gRandom(ctx.rng, rivals);
      // Hedef önce belirlenir, animasyon sadece onu açığa çıkarır — yoksa
      // ağda iki taraf farklı sonuca varabilirdi.
      ctx.reveal('secim', { target: other }, function () {
        // Karşılıklı anlık görüntü takası: her istemci kendi tahtasını
        // diğerinin son bilinen hâline çevirir, ikisi de aynı sonuca varır.
        const mine = ctx.self.table.snapshot();
        const theirs = other.table.snapshot();
        if (ctx.owns(ctx.self)) ctx.self.table.applySnapshot(theirs);
        if (ctx.owns(other)) other.table.applySnapshot(mine);
        ctx.self.refreshProgress();
        other.refreshProgress();
        ctx.fx(ctx.self, 'takas');
        ctx.fx(other, 'takas');
      });
    }
  },

  cifteyadahic: {
    id: 'cifteyadahic',
    name: 'Çifte ya da hiç',
    desc: 'Yazı tura: ya 2 parçan ızgaradan sökülür ya da 2 parçan doğru yerine oturur',
    risk: 'high',
    apply: function (ctx) {
      if (!ctx.owns(ctx.self)) return;
      // Sonuç önce atılır, rulet onu açığa çıkarır
      const win = ctx.rng.next() >= 0.5;
      ctx.reveal('rulet', { win: win }, function () {
        if (!win) {
          gKnock(ctx, ctx.self, 2);
          ctx.fx(ctx.self, 'hirsiz');
        } else {
          // Oturtacak uygun parça kalmadıysa kart boşa gitmesin, parça versin
          const seated = gSeatCorrect(ctx, ctx.self, 2);
          if (seated < 2) gGain(ctx, ctx.self, 2 - seated);
          ctx.fx(ctx.self, 'isik');
        }
      });
    }
  },

  rulet: {
    id: 'rulet',
    name: 'Rulet',
    desc: 'Rastgele birine deprem düşer — sen de dahilsin',
    risk: 'high',
    apply: function (ctx) {
      const all = gOthers(ctx, true);
      if (!all.length) return;
      const victim = gRandom(ctx.rng, all);
      ctx.fx(victim, 'deprem');
      if (ctx.owns(victim)) gKnock(ctx, victim, 2);
    }
  },

  atescemberi: {
    id: 'atescemberi',
    name: 'Ateş çemberi',
    desc: 'Atan hariç herkesin ızgarasından 1 parça sökülür',
    risk: 'mid',
    apply: function (ctx) {
      const rivals = gOthers(ctx, false);
      for (let i = 0; i < rivals.length; i++) {
        ctx.fx(rivals[i], 'deprem');
        if (ctx.owns(rivals[i])) gKnock(ctx, rivals[i], 1);
      }
    }
  },

  yagma: {
    id: 'yagma',
    name: 'Yağma',
    desc: 'Liderin ızgarasından 3 parça sökülür, sen 2 parça alırsın',
    risk: 'low',
    apply: function (ctx) {
      const leader = gLeader(ctx);
      if (leader) {
        ctx.fx(leader, 'hirsiz');
        if (ctx.owns(leader)) gKnock(ctx, leader, 3);
      }
      if (ctx.owns(ctx.self)) gGain(ctx, ctx.self, 2);
    }
  },

  dondur: {
    id: 'dondur',
    name: 'Dondur',
    desc: 'Herkes 4 sn donar, sen oynamaya devam edersin',
    risk: 'low',
    apply: function (ctx) {
      const rivals = gOthers(ctx, false);
      for (let i = 0; i < rivals.length; i++) {
        rivals[i].addEffect('donuk', 4);
        ctx.fx(rivals[i], 'kilit');
      }
    }
  }
};

// --- Tek deste ---
// Büyüler ve kumar kartları artık aynı desteden geliyor. Riskli olanlar
// daha nadir; sert olanlar geride kalana daha sık çıkar (bkz. draw).
PP.deck = {
  normal: [
    'cifte', 'cifte',
    'kontrol', 'kontrol',
    'sis',
    'karartma',
    'kilit',
    'yapistir',
    'takas', 'takas',
    'sahte',
    'yagma', 'yagma',
    'atescemberi',
    'cifteyadahic', 'cifteyadahic',
    'dondur'
  ],
  // Geride kalanın destesine ekstra konan sert kartlar
  strong: ['deprem', 'ruzgar', 'hirsiz', 'rulet', 'eldegistir']
};

// --- Sistem ---

// Bir kartın bilgisi hangi tabloda olursa olsun aynı biçimde döner
PP.cardInfo = function (id) {
  const g = PP.gambleCards[id];
  if (g) return { id: id, name: g.name, desc: g.desc, kind: 'kumar' };
  const s = PP.skills[id];
  if (s) return { id: id, name: s.name, desc: s.desc, kind: s.type };
  return null;
};

PP.Gamble = function (players, config, rng, hooks) {
  const cfg = config.gamble;
  let acc = 0;
  let skills = null;

  function activeCount() {
    let n = 0;
    for (let i = 0; i < players.length; i++) if (players[i].state.active) n++;
    return n;
  }

  function allowed(id) {
    const card = PP.gambleCards[id];
    if (card && card.minPlayers && activeCount() < card.minPlayers) return false;
    return !!(card || PP.skills[id]);
  }

  // Geride kalan oyuncunun destesine sert kartlar eklenir — yetişme mekaniği
  // artık burada yaşıyor.
  function deckFor(player) {
    let best = -1;
    for (let i = 0; i < players.length; i++) {
      const st = players[i].state;
      if (st.active && st.correct > best) best = st.correct;
    }
    const behind = best - player.state.correct >= 2;
    const deck = PP.deck.normal.concat(behind ? PP.deck.strong : []);
    return deck.filter(allowed);
  }

  function draw(player) {
    const st = player.state;
    if (st.hand.length >= cfg.handSize) return;
    const deck = deckFor(player);
    if (!deck.length) return;
    st.hand.push(gRandom(rng, deck));
    if (hooks.onHandChange) hooks.onHandChange(player);
  }

  function makeCtx(player) {
    return {
      self: player,
      players: players,
      pool: hooks.pool && hooks.pool(),
      mode: config.mode,
      rng: rng,
      fx: PP.fxFor,
      owns: function (p) { return p.state.owned; },

      // Sonucu açığa çıkaran animasyon. Sadece kartı oynayan insan görür;
      // bot ya da uzak oyuncuda etki anında uygulanır.
      reveal: function (kind, data, done) {
        if (hooks.onReveal && player.state.isHuman) hooks.onReveal(kind, data, done);
        else done();
      }
    };
  }

  // Kart iki tabloda da olabilir: büyüler telegraf/hedefleme/ağ senkronu için
  // büyü sisteminden geçer, kumar kartları doğrudan uygulanır.
  function resolve(player, id) {
    if (PP.skills[id]) {
      if (skills) skills.castById(player, id);
      return;
    }
    const card = PP.gambleCards[id];
    if (card) card.apply(makeCtx(player));
  }

  function play(player, index) {
    const st = player.state;
    if (st.finished || player.hasEffect('donuk')) return false;
    const id = st.hand[index];
    if (!id) return false;

    st.hand.splice(index, 1);
    if (hooks.onHandChange) hooks.onHandChange(player);
    // Büyüler kendi sisteminde zaten ağa duyuruluyor; kumar kartları burada
    if (!PP.skills[id] && hooks.onLocalPlay) hooks.onLocalPlay(id, st.seat);
    resolve(player, id);
    if (hooks.onPlayed) hooks.onPlayed(player, PP.cardInfo(id));
    return true;
  }

  // Ağdan gelen kumar kartı: yeniden yayınlamadan uygulanır
  function remotePlay(cardId, seat) {
    const card = PP.gambleCards[cardId];
    if (!card) return;
    let player = null;
    for (let i = 0; i < players.length; i++) {
      if (players[i].state.seat === seat) player = players[i];
    }
    if (!player) return;
    card.apply(makeCtx(player));
    if (hooks.onPlayed) hooks.onPlayed(player, PP.cardInfo(cardId));
  }

  return {
    setSkills: function (s) { skills = s; },

    reset: function () {
      acc = 0;
      for (let i = 0; i < players.length; i++) {
        players[i].state.hand = [];
        if (hooks.onHandChange) hooks.onHandChange(players[i]);
      }
    },

    update: function (dt) {
      acc += dt * 1000;
      while (acc >= cfg.drawMs) {
        acc -= cfg.drawMs;
        for (let i = 0; i < players.length; i++) {
          const st = players[i].state;
          if (!st.active || st.finished || st.dropped) continue;
          if (st.owned) draw(players[i]);
        }
      }

    },

    play: play,
    remotePlay: remotePlay,
    nextDrawIn: function () { return Math.max(0, cfg.drawMs - acc) / 1000; }
  };
};
