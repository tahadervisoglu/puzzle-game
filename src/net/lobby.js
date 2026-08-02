window.PP = window.PP || {};

// Lobi: oda kurma/katılma akışı, kimlerin geldiği ve koltuk dağıtımı.
// Koltukları oda sahibi dağıtır, tek doğru liste onda durur.
PP.Lobby = function (net, config, onStart) {
  const el = {
    panel: document.getElementById('lobby'),
    code: document.getElementById('lobby-code'),
    list: document.getElementById('lobby-list'),
    status: document.getElementById('lobby-status'),
    start: document.getElementById('lobby-start'),
    leave: document.getElementById('lobby-leave'),
    joinCode: document.getElementById('join-code'),
    netError: document.getElementById('net-error'),
    modes: document.getElementById('lobby-modes'),
    modeLabel: document.getElementById('lobby-mode-label'),
    invite: document.getElementById('invite'),
    inviteLink: document.getElementById('invite-link'),
    inviteCopy: document.getElementById('invite-copy')
  };

  // Davet linki: kodu elle yazdırmak yerine tıklanabilir adres
  function inviteUrl(code) {
    return location.origin + location.pathname + '?oda=' + code;
  }

  const MODE_NAMES = { klasik: 'Klasik', teketek: 'Teke tek', havuz: 'Ortak havuz' };

  // [{ id, seat }] — id null ise o koltuk bot
  let members = [];
  let mySeat = 0;
  let busy = false;
  let mode = config.mode;

  // Teke tekte sadece iki koltuk vardır
  function maxSeats() { return mode === 'teketek' ? 2 : 4; }

  function setError(msg) {
    el.netError.textContent = msg || '';
    el.netError.hidden = !msg;
  }

  function open() {
    el.panel.hidden = false;
    document.getElementById('start').hidden = true;
  }

  function close() {
    el.panel.hidden = true;
  }

  function freeSeat() {
    for (let s = 0; s < maxSeats(); s++) {
      if (!members.some(function (m) { return m.seat === s; })) return s;
    }
    return -1;
  }

  function renderModes() {
    const isHost = net.state.role === 'host';
    el.modes.hidden = !isHost;
    el.modeLabel.textContent = 'Mod: ' + (MODE_NAMES[mode] || mode) +
      (mode === 'teketek' ? ' · 2 kişilik' : ' · 4 kişilik');
    if (!isHost) return;
    const buttons = el.modes.querySelectorAll('.lmode');
    for (let i = 0; i < buttons.length; i++) {
      const m = buttons[i].dataset.mode;
      buttons[i].classList.toggle('on', m === mode);
      // Bağlı oyuncu sayısı sığmıyorsa o mod seçilemez
      buttons[i].disabled = m === 'teketek' && members.length > 2;
    }
  }

  function render() {
    el.code.textContent = net.state.code || '----';
    if (net.state.code) {
      el.invite.hidden = false;
      el.inviteLink.value = inviteUrl(net.state.code);
    } else {
      el.invite.hidden = true;
    }
    renderModes();
    el.list.innerHTML = '';
    for (let s = 0; s < maxSeats(); s++) {
      const m = members.find(function (x) { return x.seat === s; });
      const li = document.createElement('li');
      const isMe = m && m.id === net.state.selfId;
      if (isMe) li.className = 'me';
      const name = document.createElement('span');
      name.textContent = 'Oyuncu ' + (s + 1);
      const tag = document.createElement('span');
      tag.className = 'seat-tag';
      tag.textContent = !m ? 'bot' : (isMe ? 'sen' : 'bağlı');
      li.appendChild(name);
      li.appendChild(tag);
      el.list.appendChild(li);
    }
    const humans = members.length;
    el.status.textContent = net.state.role === 'host'
      ? humans + ' oyuncu bağlı · boş koltukları bot doldurur'
      : 'Oda sahibinin başlatması bekleniyor…';
    el.start.hidden = net.state.role !== 'host';
  }

  // Oda sahibi listeyi ve seçili modu dağıtır
  function publish() {
    net.send({ t: 'lobi', members: members, mode: mode });
  }

  function setMode(next) {
    if (net.state.role !== 'host') return;
    if (next === 'teketek' && members.length > 2) return;   // sığmıyor
    mode = next;
    config.mode = next;
    render();
    publish();
  }

  net.on('katildi', function (info) {
    if (net.state.role !== 'host') return;
    const seat = freeSeat();
    if (seat < 0) return;                       // oda dolu
    members.push({ id: info.id, seat: seat });
    render();
    publish();
  });

  net.on('ayrildi', function (info) {
    if (net.state.role !== 'host') return;
    members = members.filter(function (m) { return m.id !== info.id; });
    render();
    publish();
  });

  net.on('lobi', function (msg) {
    members = msg.members || [];
    if (msg.mode) { mode = msg.mode; config.mode = msg.mode; }
    const mine = members.find(function (m) { return m.id === net.state.selfId; });
    if (mine) mySeat = mine.seat;
    render();
  });

  net.on('basla', function (msg) {
    close();
    onStart({
      seed: msg.seed,
      mode: msg.mode,
      members: msg.members,
      mySeat: mySeat
    });
  });

  net.on('kopdu', function () {
    setError('Oda sahibiyle bağlantı koptu.');
    open();
  });

  return {
    host: function () {
      if (busy) return;
      busy = true;
      setError('Oda kuruluyor…');
      net.host().then(function () {
        busy = false;
        setError('');
        members = [{ id: net.state.selfId, seat: 0 }];
        mySeat = 0;
        mode = config.mode;
        open();
        render();
      }).catch(function (err) {
        busy = false;
        setError(err.message || 'Oda kurulamadı.');
      });
    },

    join: function () {
      if (busy) return;
      const code = el.joinCode.value;
      busy = true;
      setError('Bağlanılıyor…');
      net.join(code).then(function () {
        busy = false;
        setError('');
        open();
        render();
      }).catch(function (err) {
        busy = false;
        setError(err.message || 'Bağlanılamadı.');
      });
    },

    // Oda sahibi: herkese aynı seed ve koltuk listesini yollar
    start: function () {
      if (net.state.role !== 'host') return;
      const payload = {
        t: 'basla',
        seed: Math.floor(Math.random() * 0x7fffffff),
        mode: mode,
        members: members
      };
      net.send(payload);
      close();
      onStart({
        seed: payload.seed,
        mode: payload.mode,
        members: members,
        mySeat: mySeat
      });
    },

    leave: function () {
      net.close();
      members = [];
      close();
      setError('');
      document.getElementById('start').hidden = false;
    },

    setMode: setMode,

    // Adresteki ?oda=KOD ile gelen kişi doğrudan bağlanır
    joinFromUrl: function () {
      const m = /[?&]oda=([A-Za-z0-9]{4})/.exec(location.search);
      if (!m) return false;
      el.joinCode.value = m[1].toUpperCase();
      this.join();
      return true;
    },

    copyInvite: function () {
      el.inviteLink.select();
      const done = function () {
        el.inviteCopy.textContent = 'kopyalandı';
        setTimeout(function () { el.inviteCopy.textContent = 'kopyala'; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(el.inviteLink.value).then(done, function () {});
      } else {
        try { document.execCommand('copy'); done(); } catch (e) { /* yoksay */ }
      }
    },

    mySeat: function () { return mySeat; }
  };
};
