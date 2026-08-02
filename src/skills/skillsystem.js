window.PP = window.PP || {};

// Kart dağıtımı, cep, hedefleme ve saldırıların gecikmeli uygulanması.
// Büyülerin kendisi PP.skills içinde; burası sadece ne zaman kime gideceğini bilir.
PP.SkillSystem = function (players, config, rng, pool, hooks) {
  const cfg = config.skills;
  const lastHit = {};      // 'hedefId:buyuId' -> zaman
  const pending = [];      // gecikmeli saldırılar (uyarı süresi dolunca uygulanır)
  let clock = 0;

  function total() { return config.puzzle.cols * config.puzzle.rows; }

  function thresholdStep() {
    const shrink = Math.floor(clock / cfg.shrinkEverySec) * cfg.shrinkStep;
    return Math.max(cfg.thresholdMin, cfg.thresholdStart - shrink);
  }

  function ranking() {
    return players.slice().sort(function (a, b) { return b.state.correct - a.state.correct; });
  }

  function isLastPlace(player) {
    const r = ranking();
    return r[r.length - 1] === player && r[0].state.correct > player.state.correct;
  }

  // Karanlık büyüler varsayılan olarak lidere gider — aynı PC'de hedef seçme
  // derdini kaldırır ve doğal bir yetişme mekaniği olur.
  function pickTarget(caster) {
    let best = null;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p === caster || p.state.finished || p.state.dropped) continue;
      if (!best || p.state.correct > best.state.correct) best = p;
    }
    return best;
  }

  function pick(pool) { return pool[Math.floor(rng.next() * pool.length)]; }

  function makeOffer(player) {
    const behind = isLastPlace(player);
    return {
      light: pick(PP.skillPools.light),
      dark: pick(behind ? PP.skillPools.darkStrong : PP.skillPools.darkMild)
    };
  }

  function grant(player) {
    const st = player.state;
    if (st.pendingOffer || st.owed <= 0) return;
    st.owed--;
    st.pendingOffer = makeOffer(player);
    if (hooks.onOffer) hooks.onOffer(player, st.pendingOffer);
  }

  // Kart seçmek büyüyü doğrudan uygular — cep yok, bekletme yok.
  function choose(player, which) {
    const st = player.state;
    if (!st.pendingOffer) return null;
    const id = which === 'dark' ? st.pendingOffer.dark : st.pendingOffer.light;
    st.pendingOffer = null;
    if (hooks.onChosen) hooks.onChosen(player);
    castById(player, id);
    return id;
  }

  function scaleFor(targetId, skillId) {
    const key = targetId + ':' + skillId;
    const last = lastHit[key];
    lastHit[key] = clock;
    if (last !== undefined && clock - last < cfg.spamWindowSec) return cfg.spamScale;
    return 1;
  }

  function bySeat(seat) {
    for (let i = 0; i < players.length; i++) {
      if (players[i].state.seat === seat) return players[i];
    }
    return null;
  }

  function fire(entry) {
    const skill = PP.skills[entry.skillId];
    const affected = entry.target || entry.caster;

    // Ağ oyununda her istemci sadece kendi simüle ettiği oyuncuların durumunu
    // değiştirir; başkasının tahtası zaten karşı taraftan gelir. Görsel etkiler
    // (sis, karartma, kontrol) herkeste oynatılabilir, oyunu bozmazlar.
    if (!skill.visual && affected && !affected.state.owned) {
      PP.fxFor(affected, skill.id);
      if (hooks.onCast) hooks.onCast(entry.caster, skill, entry.target);
      return;
    }

    skill.apply({
      self: entry.caster,
      target: entry.target,
      players: players,
      pool: pool,
      mode: config.mode,
      scale: entry.scale,
      rng: rng,
      fx: PP.fxFor,
      owns: function (p) { return p.state.owned; }
    });
    if (hooks.onCast) hooks.onCast(entry.caster, skill, entry.target);
  }

  function warn(player, skill, caster) {
    player.state.warning = { text: skill.name + ' geliyor!', remaining: cfg.warningSec };
    if (hooks.onWarn) hooks.onWarn(player, skill, caster);
  }

  function castById(caster, skillId) {
    if (caster.state.finished) return false;
    const skill = PP.skills[skillId];
    if (!skill) return false;

    let target = null;
    if (skill.type === 'dark' && !skill.hitsEveryone) {
      target = pickTarget(caster);
      if (!target) return false;
    }

    // Hedefi atan belirler ve açıkça bildirir; yoksa gecikme yüzünden herkes
    // farklı lider görüp farklı hedefe uygulayabilir.
    if (hooks.onLocalCast) {
      hooks.onLocalCast(skillId, caster.state.seat, target ? target.state.seat : -1);
    }
    perform(skillId, caster, target);
    return true;
  }

  function perform(skillId, caster, target) {
    const skill = PP.skills[skillId];

    if (skill.type === 'light') {
      // Kendi büyün: telegraf gerekmez
      fire({ skillId: skillId, caster: caster, target: caster, scale: scaleFor(caster.state.id, skillId) });
      return;
    }

    // Saldırılar önce uyarı verir — Tricky Towers'ı adil hissettiren şey bu
    const scale = scaleFor(target ? target.state.id : 'all', skillId);
    if (skill.hitsEveryone) {
      for (let i = 0; i < players.length; i++) {
        if (players[i] !== caster && !players[i].state.finished) warn(players[i], skill, caster);
      }
    } else if (target) {
      warn(target, skill, caster);
    }
    pending.push({
      skillId: skillId, caster: caster, target: target,
      scale: scale, at: clock + cfg.warningSec
    });
  }

  // Ağdan gelen büyü: yeniden yayınlamadan aynı yoldan işlenir
  function remoteCast(skillId, casterSeat, targetSeat) {
    if (!PP.skills[skillId]) return;
    const caster = bySeat(casterSeat);
    if (!caster) return;
    perform(skillId, caster, targetSeat >= 0 ? bySeat(targetSeat) : null);
  }

  return {
    reset: function () {
      clock = 0;
      pending.length = 0;
      for (const k in lastHit) delete lastHit[k];
      for (let i = 0; i < players.length; i++) {
        const st = players[i].state;
        st.pendingOffer = null;
        st.owed = 0;
        st.nextThreshold = cfg.thresholdStart;
        st.warning = null;
        st.effects = {};
      }
    },

    update: function (dt) {
      clock += dt;

      for (let i = pending.length - 1; i >= 0; i--) {
        if (clock >= pending[i].at) {
          const entry = pending[i];
          pending.splice(i, 1);
          if (!entry.caster.state.finished) fire(entry);
        }
      }

      const t = total();
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const st = player.state;
        if (st.finished) continue;

        const ratio = st.correct / t;
        while (ratio >= st.nextThreshold - 1e-6 && st.nextThreshold <= 1.0001) {
          st.owed++;
          const step = thresholdStep() * (isLastPlace(player) ? cfg.lastPlaceBonus : 1);
          st.nextThreshold += step;
        }
        grant(player);
      }
    },

    choose: choose,
    castById: castById,
    remoteCast: remoteCast,
    bySeat: bySeat,
    pickTarget: pickTarget,
    thresholdStep: thresholdStep
  };
};
