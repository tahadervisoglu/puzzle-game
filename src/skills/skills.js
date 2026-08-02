window.PP = window.PP || {};

// Büyü tanımları. Yeni büyü eklemek tek bir nesne yazmaktan ibaret olsun diye
// her büyü kendi etkisini apply() içinde uygular; oyun mantığının büyülerden,
// büyülerin de birbirinden haberi yoktur.
//
// ctx = { self, target, players, scale, rng }
//   scale: aynı hedefe kısa sürede tekrarlanan büyüde 0.5 (spam freni)
PP.skills = {

  cifte: {
    id: 'cifte',
    name: 'Çifte teslimat',
    type: 'light',
    desc: 'Anında 2 parça alırsın',
    // Tüm parçalar geldiyse bu kartın hiçbir anlamı kalmaz
    useful: function (self) {
      return PP.config.mode === 'havuz' ? true : !self.table.allArrived();
    },
    apply: function (ctx) {
      const n = ctx.scale < 1 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        if (ctx.mode === 'havuz') {
          const slot = ctx.pool.findSlot(function (id) { return !ctx.self.table.has(id); });
          if (slot < 0) break;
          const id = ctx.pool.take(slot);
          if (id >= 0) ctx.self.table.receive(id);
        } else {
          ctx.self.table.dripNext();
        }
      }
      ctx.self.refreshProgress();
      ctx.fx(ctx.self, 'isik');
    }
  },

  kontrol: {
    id: 'kontrol',
    name: 'Kontrol',
    type: 'light',
    desc: 'Yanlış oturan parçalar 3 sn kırmızı yanar',
    visual: true,
    apply: function (ctx) {
      ctx.self.addEffect('kontrol', 3 * ctx.scale);
      ctx.fx(ctx.self, 'isik');
    }
  },

  // Ortadaki madalyon küçük kalıyor; bu büyü tam resmi ızgaranın üstüne
  // soluk olarak bindirir, böylece hangi parçanın nereye gittiği net görünür.
  poster: {
    id: 'poster',
    name: 'Poster',
    type: 'light',
    desc: 'Tam resim 5 sn ızgaranın üstünde belirir, sonra söner',
    visual: true,
    apply: function (ctx) {
      ctx.self.addEffect('poster', 5 * ctx.scale);
      ctx.fx(ctx.self, 'isik');
    }
  },

  sis: {
    id: 'sis',
    name: 'Sis',
    type: 'dark',
    desc: 'Referans resim 5 sn gizlenir — atan hariç herkese',
    hitsEveryone: true,
    visual: true,
    apply: function (ctx) {
      for (let i = 0; i < ctx.players.length; i++) {
        const p = ctx.players[i];
        if (p === ctx.self || p.state.finished) continue;
        p.addEffect('sis', 5 * ctx.scale);
        ctx.fx(p, 'sis');
      }
    }
  },

  // Rüzgar masanın üstünden eser — tek kişiyi seçmez, atan hariç herkesi vurur
  ruzgar: {
    id: 'ruzgar',
    name: 'Rüzgar',
    type: 'dark',
    desc: 'Atan hariç herkesin tek duran parçaları savrulur',
    hitsEveryone: true,
    useful: function (self, rivals) {
      return rivals.some(function (r) { return r.table.loosePieces().length > 0; });
    },
    apply: function (ctx) {
      for (let i = 0; i < ctx.players.length; i++) {
        const t = ctx.players[i];
        if (t === ctx.self || t.state.finished || t.state.dropped) continue;
        ctx.fx(t, 'ruzgar');
        if (!ctx.owns(t)) continue;      // uzaktaki tahtayı sahibi savurur
        const list = t.clusters.all();
        for (let j = 0; j < list.length; j++) {
          const c = list[j];
          const first = t.table.byId(c.members[0]);
          if (first && first.held) continue;        // elde tutulan parça savrulmaz
          if (c.members.length > 1) continue;       // birleşmiş parçalar korunur
          if (ctx.scale < 1 && ctx.rng.next() < 0.5) continue;
          t.table.park(c, ctx.rng);
        }
      }
    }
  },

  karartma: {
    id: 'karartma',
    name: 'Karartma',
    type: 'dark',
    desc: 'Hedefin paneli 6 sn kararır',
    visual: true,
    apply: function (ctx) {
      ctx.target.addEffect('karartma', 6 * ctx.scale);
      ctx.fx(ctx.target, 'karartma');
    }
  },

  hirsiz: {
    id: 'hirsiz',
    name: 'Hırsız',
    type: 'dark',
    desc: 'Hedefin masasındaki bir parçayı çalarsın',
    useful: function (self, rivals) {
      return rivals.some(function (r) { return r.table.loosePieces().length > 0; });
    },
    apply: function (ctx) {
      const loose = ctx.target.table.loosePieces();
      if (!loose.length) return;
      const n = ctx.scale < 1 ? 1 : 2;
      for (let i = 0; i < n && loose.length; i++) {
        const id = loose.splice(Math.floor(ctx.rng.next() * loose.length), 1)[0];
        if (!ctx.target.table.removePiece(id)) continue;
        if (ctx.mode === 'havuz') {
          // Zaten elindeyse havuza döner — zarar yine de verilmiş olur
          if (!ctx.self.table.receive(id)) ctx.pool.give(id);
        } else {
          // Klasikte parça hedefe geri gelir, atan ise tempo kazanır
          ctx.target.table.requeue(id);
          ctx.self.table.dripNext();
        }
      }
      ctx.target.refreshProgress();
      ctx.self.refreshProgress();
      ctx.fx(ctx.target, 'hirsiz');
    }
  },

  kilit: {
    id: 'kilit',
    name: 'Kilit',
    type: 'dark',
    desc: 'Hedefin parça akışı 5 sn durur',
    apply: function (ctx) {
      ctx.target.state.blockedUntil = Math.max(ctx.target.state.blockedUntil, 5 * ctx.scale);
      ctx.fx(ctx.target, 'kilit');
    }
  },

  // --- Izgarayı bozan büyüler: kazanılmış ilerlemeyi geri alırlar ---

  // Deprem odayı sarsar — atan hariç herkesin ızgarası bozulur. Üç kişiyi
  // birden vurduğu için parça sayısı 3'ten 2'ye düşürüldü.
  deprem: {
    id: 'deprem',
    name: 'Deprem',
    type: 'dark',
    desc: 'Atan hariç herkesin ızgarası sarsılır, 2 parça sökülür',
    hitsEveryone: true,
    useful: function (self, rivals) {
      return rivals.some(function (r) { return r.table.seatedPieces().length > 0; });
    },
    apply: function (ctx) {
      for (let i = 0; i < ctx.players.length; i++) {
        const t = ctx.players[i];
        if (t === ctx.self || t.state.finished || t.state.dropped) continue;
        t.addEffect('sarsinti', PP.config.fx.quakeSec);
        if (!ctx.owns(t)) { ctx.fx(t, 'deprem'); continue; }

        const seated = t.table.seatedPieces();
        if (!seated.length) { ctx.fx(t, 'deprem'); continue; }
        const n = Math.min(seated.length, ctx.scale < 1 ? 1 : 2);
        for (let j = 0; j < n; j++) {
          const id = seated.splice(Math.floor(ctx.rng.next() * seated.length), 1)[0];
          const p = t.table.byId(id);
          const px = p.x;
          const py = p.y;
          t.table.park(t.table.liftFromBoard(p), ctx.rng);
          ctx.fx(t, 'deprem', { x: px, y: py });
        }
        t.refreshProgress();
      }
    }
  },

  takas: {
    id: 'takas',
    name: 'Takas',
    type: 'dark',
    desc: 'Hedefin ızgarasında iki parçanın yeri değişir — nerede olduğunu bilmez',
    useful: function (self, rivals) {
      return rivals.some(function (r) { return r.table.seatedPieces().length >= 2; });
    },
    apply: function (ctx) {
      const t = ctx.target;
      const n = ctx.scale < 1 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const seated = t.table.seatedPieces();
        if (seated.length < 2) break;
        const a = seated.splice(Math.floor(ctx.rng.next() * seated.length), 1)[0];
        const b = seated[Math.floor(ctx.rng.next() * seated.length)];
        t.table.swapCells(a, b);
      }
      t.refreshProgress();
      ctx.fx(t, 'takas');
    }
  },

  sahte: {
    id: 'sahte',
    name: 'Sahte parça',
    type: 'dark',
    desc: 'Hedefin masasına hiçbir yere oturmayan 2 parça karışır',
    apply: function (ctx) {
      if (!ctx.owns(ctx.target)) { ctx.fx(ctx.target, 'hirsiz'); return; }
      const n = ctx.scale < 1 ? 1 : PP.config.fake.count;
      ctx.target.table.addFakes(n, ctx.rng);
      ctx.fx(ctx.target, 'hirsiz');
    }
  },

  yapistir: {
    id: 'yapistir',
    name: 'Yapıştır',
    type: 'dark',
    desc: 'Hedefin masadaki parçaları tek yığına yapışır — sağ tıkla ayırması gerekir',
    useful: function (self, rivals) {
      return rivals.some(function (r) { return r.table.loosePieces().length >= 2; });
    },
    apply: function (ctx) {
      const n = ctx.target.table.clumpLoose();
      if (n) ctx.fx(ctx.target, 'yapistir');
    }
  }
};

// Kart havuzları. Geride kalan oyuncuya daha sert karanlık büyüler çıkar —
// tasarımdaki yetişme mekaniği.
PP.skillPools = {
  light: ['cifte', 'kontrol', 'poster'],
  // Ortam olayları (sis, deprem, rüzgar) herkesi vurduğu için güçlüdür;
  // cerrahi olanlar lidere gider ve yetişme mekaniğini korur.
  darkMild: ['sis', 'karartma', 'kilit', 'yapistir', 'takas', 'sahte'],
  darkStrong: ['deprem', 'takas', 'ruzgar', 'hirsiz', 'sahte', 'yapistir', 'kilit']
};
