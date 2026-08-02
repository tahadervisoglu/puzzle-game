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

  ruzgar: {
    id: 'ruzgar',
    name: 'Rüzgar',
    type: 'dark',
    desc: 'Hedefin tek duran parçaları masaya savrulur',
    apply: function (ctx) {
      const t = ctx.target;
      const list = t.clusters.all();
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const first = t.table.byId(c.members[0]);
        if (first && first.held) continue;          // elde tutulan parça savrulmaz
        if (c.members.length > 1) continue;         // birleşmiş parçalar korunur
        if (ctx.scale < 1 && ctx.rng.next() < 0.5) continue;
        t.table.park(c, ctx.rng);
      }
      ctx.fx(t, 'ruzgar');
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

  deprem: {
    id: 'deprem',
    name: 'Deprem',
    type: 'dark',
    desc: 'Hedefin ızgarasından 3 parça sökülüp masaya savrulur',
    apply: function (ctx) {
      const t = ctx.target;
      const seated = t.table.seatedPieces();
      if (!seated.length) return;
      const n = Math.min(seated.length, ctx.scale < 1 ? 2 : 3);
      for (let i = 0; i < n; i++) {
        const id = seated.splice(Math.floor(ctx.rng.next() * seated.length), 1)[0];
        const p = t.table.byId(id);
        const px = p.x;
        const py = p.y;
        const c = t.table.liftFromBoard(p);
        t.table.park(c, ctx.rng);
        ctx.fx(t, 'deprem', { x: px, y: py });
      }
      t.refreshProgress();
    }
  },

  takas: {
    id: 'takas',
    name: 'Takas',
    type: 'dark',
    desc: 'Hedefin ızgarasında iki parçanın yeri değişir — nerede olduğunu bilmez',
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

  yapistir: {
    id: 'yapistir',
    name: 'Yapıştır',
    type: 'dark',
    desc: 'Hedefin masadaki parçaları tek yığına yapışır — sağ tıkla ayırması gerekir',
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
  darkMild: ['sis', 'karartma', 'kilit', 'yapistir', 'takas'],
  darkStrong: ['deprem', 'takas', 'ruzgar', 'hirsiz', 'yapistir', 'kilit']
};
