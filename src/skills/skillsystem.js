window.PP = window.PP || {};

// Kart dağıtımı, cep, hedefleme ve saldırıların gecikmeli uygulanması.
// Büyülerin kendisi PP.skills içinde; burası sadece ne zaman kime gideceğini bilir.
PP.SkillSystem = function (players, config, rng, pool, hooks) {
  const cfg = config.skills;
  const lastHit = {};      // 'hedefId:buyuId' -> zaman
  const pending = [];      // gecikmeli saldırılar (uyarı süresi dolunca uygulanır)
  let clock = 0;

  // Karanlık büyüler varsayılan olarak lidere gider — aynı PC'de hedef seçme
  // derdini kaldırır ve doğal bir yetişme mekaniği olur.
  function pickTarget(caster) {
    let best = null;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p === caster || p.state.finished || p.state.dropped || !p.state.active) continue;
      if (!best || p.state.correct > best.state.correct) best = p;
    }
    return best;
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
    //
    // Herkesi vuran büyüler bu kapıdan geçmez: atan uzakta olsa bile benim
    // tahtamı vurmaları gerekir, o yüzden sahiplik kontrolünü kendi içlerinde
    // ctx.owns ile oyuncu bazında yaparlar.
    if (!skill.visual && !skill.hitsEveryone && affected && !affected.state.owned) {
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
        st.warning = null;
        st.effects = {};
      }
    },

    // Artık kart dağıtmıyor; sadece atılan büyünün telegrafını, hedefini,
    // spam frenini ve ağ senkronunu yönetiyor. Kartlar tek destede (PP.deck).
    update: function (dt) {
      clock += dt;
      for (let i = pending.length - 1; i >= 0; i--) {
        if (clock >= pending[i].at) {
          const entry = pending[i];
          pending.splice(i, 1);
          if (!entry.caster.state.finished) fire(entry);
        }
      }
    },

    castById: castById,
    remoteCast: remoteCast,
    bySeat: bySeat,
    pickTarget: pickTarget
  };
};
