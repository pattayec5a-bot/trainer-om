/* Тренажёр ОМ — версия для первого просмотра.
   Задачи берутся из window.BANK (собирает tools/build_content.py из Word-файлов курса).
   Прогресс хранится в браузере (localStorage); в рабочей версии он будет на сервере. */
(function () {
  'use strict';

  const BANK = window.BANK || { lessons: [] };
  const TW = window.Telegram && window.Telegram.WebApp;
  const tg = TW && TW.platform && TW.platform !== 'unknown' ? TW : null;
  const LOCAL = !!window.TRAINER_LOCAL;

  // Правила (CONDITIONS.md: У8, У9, У10)
  const INTRO_PASS = 4;            // вводное занятие пройдено: 4 задачи из 6
  const LEVEL_PASS = 5;            // уровень пройден: 5 задач из 8
  const HINT_WAIT = 5 * 60 * 1000; // пауза «подумай ещё» перед подсказкой, как в боте
  const BOT = 'ViroHofewBot';

  const BLOCKS = [
    { n: 1, title: 'Логика', lessons: ['Логические таблицы', 'Рыцари и лжецы', 'Доказательство от противного', 'Принцип Дирихле'] },
    { n: 2, title: 'Комбинаторика', lessons: ['Дерево вариантов', 'Сумма и произведение', 'Перестановки', 'Выбор без порядка'] },
    { n: 3, title: 'Чётность и инварианты', lessons: ['Чётность и нечётность', 'Шахматная раскраска', 'Инвариант', 'Принцип крайнего'] },
    { n: 4, title: 'Делимость', lessons: ['Признаки делимости', 'Простые числа и разложение', 'Остатки', 'Остатки и принцип Дирихле'] },
    { n: 5, title: 'Графы и игры', lessons: ['Графы и степени вершин', 'Путь одним росчерком', 'Симметричная стратегия', 'Выигрышные позиции'] },
    { n: 6, title: 'Оценка и пример', lessons: ['Взвешивания', 'Наибольшее и наименьшее', 'Оценка + пример', 'Процессы, которые заканчиваются'] }
  ];
  const LEVEL_NAMES = { 1: 'Разогрев', 2: 'Основной уровень', 3: 'Олимпиадный', 4: 'Усложнённые олимпиадные' };

  // ---------- Иконки ----------
  const I = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="currentColor" stroke="none"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.7-6.5-6.3 0-3.4 2.4-5.3 3.6-7.9.4 1.8 1.4 2.9 2.4 3.4.2-2.9 1.6-5.3 3.8-6.7-.3 2.8.8 4.6 2 6.2 1 1.4 1.7 2.9 1.7 4.9C19 18.3 16 21 12 21z" fill="currentColor" stroke="none"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    map: '<path d="M4 6.5l5-2.5 6 2.5 5-2.5v13.5l-5 2.5-6-2.5-5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4 21c1.3-4 4.3-6 8-6s6.7 2 8 6"/>',
    send: '<path d="M4 12l16-8-6 17-3-7z"/><path d="M11 14l9-10"/>',
    ask: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 20 12z"/><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.8c0 1.6-2.2 1.9-2.2 3.4"/><circle cx="12" cy="16.6" r=".6" fill="currentColor"/>',
    video: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none"/>',
    book: '<path d="M5 4.5h9a4 4 0 0 1 4 4v11H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h10"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9v11M4 13h16M12 9c-2-3-6-3-6-1s4 1 6 1c2 0 6 1 6-1s-4-2-6 1z"/>',
    medal: '<circle cx="12" cy="14" r="5.5"/><path d="M8.5 3.5L10.5 9M15.5 3.5L13.5 9"/><path d="M12 11.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" fill="currentColor" stroke="none"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  const AVATARS = [
    { color: '#4C7EF3', svg: '<circle cx="6" cy="7" r="2.6"/><circle cx="18" cy="7" r="2.6"/><circle cx="12" cy="18" r="2.6"/><path d="M8.3 8.2l2.4 7.4M15.7 8.2l-2.4 7.4M8.6 7h6.8"/>' },
    { color: '#1FA38F', svg: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/><circle cx="15" cy="15" r="1.4" fill="currentColor"/><circle cx="15" cy="9" r="1.4" fill="currentColor"/><circle cx="9" cy="15" r="1.4" fill="currentColor"/>' },
    { color: '#8A63E8', svg: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/><rect x="4" y="4" width="8" height="8" fill="currentColor"/><rect x="12" y="12" width="8" height="8" fill="currentColor"/>' },
    { color: '#E5605B', svg: '<path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8l-2.5 6h5zM19 8l-2.5 6h5z"/>' },
    { color: '#EF9A2D', svg: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>' },
    { color: '#2A9FD6', svg: '<path d="M12 4l8.5 15h-17z"/><path d="M12 10v4"/>' }
  ];
  const avatarHtml = (i, cls) => {
    const a = AVATARS[i] || AVATARS[0];
    return `<span class="avatar ${cls || ''}" style="background:${a.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${a.svg}</svg></span>`;
  };

  // ---------- Данные ----------
  const LESSONS = BANK.lessons.map((les) => Object.assign(les, { key: `b${les.block}-l${les.number}` }));
  const INTRO = LESSONS.filter((l) => l.block === 0);
  const TASKS = {};
  LESSONS.forEach((les) => les.levels.forEach((lv) => lv.tasks.forEach((t) => {
    TASKS[t.id] = Object.assign(t, { lesson: les, level: lv.level });
  })));
  const lessonByKey = (k) => LESSONS.find((l) => l.key === k);

  const KEY = 'trainerOM.preview.v1';
  const fresh = () => ({ profile: null, tasks: {}, days: {}, subs: [], qs: [], watched: {}, viewAll: false, best: 0, daily: null, invite: null });
  let S = fresh();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* без сохранения */ }
  // Прогресс: в браузере и, если тренажёр открыт в Telegram, в облаке Telegram (виден с любого устройства).
  const CLOUD = tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
  const CHUNK = 3500;
  let cloudTimer = null;
  function cloudSave() {
    if (!CLOUD) return;
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => {
      try {
        const text = JSON.stringify(S);
        const parts = [];
        for (let i = 0; i < text.length; i += CHUNK) parts.push(text.slice(i, i + CHUNK));
        parts.forEach((part, i) => CLOUD.setItem('st_' + i, part, () => {}));
        CLOUD.setItem('st_n', String(parts.length), () => {});
      } catch (e) { /* без облака */ }
    }, 1200);
  }
  function cloudLoad(done) {
    if (!CLOUD) { done(null); return; }
    try {
      CLOUD.getItem('st_n', (err, n) => {
        const count = Number(n) || 0;
        if (err || !count) { done(null); return; }
        const keys = []; for (let i = 0; i < count; i++) keys.push('st_' + i);
        CLOUD.getItems(keys, (err2, vals) => {
          if (err2 || !vals) { done(null); return; }
          try { done(JSON.parse(keys.map((k) => vals[k] || '').join(''))); } catch (e) { done(null); }
        });
      });
    } catch (e) { done(null); }
  }
  const save = () => {
    S.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* без сохранения */ }
    cloudSave();
  };

  const ts = (id) => (S.tasks[id] = S.tasks[id] || { hints: 0, wrong: 0 });
  const peek = (id) => S.tasks[id] || {};
  const counted = (id) => ['solved', 'review'].includes(peek(id).st);
  const hasHints = (t) => t.hints && t.hints.length > 0;

  // ---------- Даты и серия ----------
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => fmt(new Date());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekKey = (d) => fmt(addDays(d, -((d.getDay() + 6) % 7)));

  function streak() {
    const days = Object.keys(S.days).filter((k) => S.days[k] > 0).sort();
    if (!days.length) return 0;
    const first = days[0];
    let d = new Date();
    if (!S.days[fmt(d)]) d = addDays(d, -1);
    const used = {};
    let cur = 0;
    for (let i = 0; i < 800 && fmt(d) >= first; i++, d = addDays(d, -1)) {
      if (S.days[fmt(d)]) { cur++; continue; }
      const wk = weekKey(d);
      used[wk] = (used[wk] || 0) + 1;
      if (used[wk] > 2) break; // два «выходных» в неделю серию не прерывают
    }
    return cur;
  }
  function markActivity(id) {
    const d = today();
    S.days[d] = (S.days[d] || 0) + 1;
    ts(id).at = d;
    S.best = Math.max(S.best || 0, streak());
  }
  const totalStars = () => Object.values(S.tasks).reduce((s, x) => s + (x.stars || 0), 0);
  const totalSolved = () => Object.keys(S.tasks).filter(counted).length;

  // ---------- Прохождение ----------
  const need = (les, lvl) => Math.min(les.block === 0 ? INTRO_PASS : LEVEL_PASS, lvl.tasks.length);
  const levelObj = (les, n) => les.levels.find((l) => l.level === n);
  const doneCount = (lvl) => lvl.tasks.filter((t) => counted(t.id)).length;
  const levelDone = (les, n) => { const lv = levelObj(les, n); return !!lv && doneCount(lv) >= need(les, lv); };
  const lessonDone = (les) => (les.block === 0 ? levelDone(les, 1) : levelDone(les, 1) && levelDone(les, 2));
  function lessonOpen(les) {
    if (S.viewAll || les.block !== 0) return true; // занятие блока 1 — демо, открыто для просмотра
    const i = INTRO.indexOf(les);
    return i === 0 || lessonDone(INTRO[i - 1]);
  }
  function levelOpen(les, n) {
    if (S.viewAll || les.block === 0 || n === 1) return true;
    if (n === 2) return levelDone(les, 1);
    return levelDone(les, 1) && levelDone(les, 2);
  }

  function starsFor(t, st) {
    if (!hasHints(t)) return 0;
    if (st.shown) return 0;
    return st.hints > 0 ? 1 : 2;
  }

  // ---------- Задача дня и повторение ----------
  function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function openTasks() {
    const out = [];
    LESSONS.forEach((les) => {
      if (!lessonOpen(les)) return;
      les.levels.forEach((lv) => { if (levelOpen(les, lv.level)) lv.tasks.forEach((t) => out.push(t)); });
    });
    return out;
  }
  function dailyTask() {
    const d = today();
    if (S.daily && S.daily.date === d && TASKS[S.daily.id]) return TASKS[S.daily.id];
    let pool = openTasks().filter((t) => !counted(t.id));
    const intro = pool.filter((t) => t.lesson.block === 0);
    if (intro.length) pool = intro; // новичку — сначала задачи вводного курса
    if (!pool.length) return null;
    const t = pool[hash(d) % pool.length];
    S.daily = { date: d, id: t.id };
    save();
    return t;
  }
  function reviewTasks(exclude) {
    const pool = [];
    LESSONS.forEach((les) => { if (lessonDone(les)) les.levels.forEach((lv) => lv.tasks.forEach((t) => { if (!counted(t.id) && t.id !== exclude) pool.push(t); })); });
    const d = today();
    pool.sort((a, b) => hash(d + a.id) - hash(d + b.id));
    return pool.slice(0, 2);
  }

  // ---------- Проверка ответа ----------
  const WORDS = { 'ноль': 0, 'один': 1, 'одна': 1, 'два': 2, 'две': 2, 'три': 3, 'четыре': 4, 'пять': 5, 'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10, 'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19, 'двадцать': 20 };
  function parseNum(s) {
    if (s == null) return null;
    const t = String(s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    const m = t.replace(/(\d)\s+(?=\d)/g, '$1').match(/-?\d+/);
    if (m) return Number(m[0]);
    for (const w of t.split(/[^а-я]+/)) if (w in WORDS) return WORDS[w];
    return NaN;
  }
  const draft = {};
  const dr = (id) => (draft[id] = draft[id] || { multi: [], match: [], fields: [], table: [] });
  function evaluate(t) {
    const c = t.check, d = dr(t.id);
    switch (c.type) {
      case 'number': { const v = parseNum(d.num); if (v === null) return { empty: 'Введи ответ числом.' }; return { ok: v === c.value }; }
      case 'fields': {
        const vals = c.fields.map((f, i) => (c.bin ? d.fields[i] : parseNum(d.fields[i])));
        if (vals.some((v) => v === undefined || v === null)) return { empty: 'Заполни все поля.' };
        return { ok: vals.every((v, i) => v === c.fields[i].value) };
      }
      case 'choice': if (d.choice == null) return { empty: 'Выбери вариант ответа.' }; return { ok: d.choice === c.correct };
      case 'multi': {
        if (!d.multi.length) return { empty: 'Отметь хотя бы один вариант.' };
        const a = [...d.multi].sort().join(','), b = [...c.correct].sort().join(',');
        return { ok: a === b };
      }
      case 'match': if (c.rows.some((r, i) => d.match[i] == null)) return { empty: 'Выбери ответ для каждой строки.' }; return { ok: c.rows.every((r, i) => d.match[i] === c.correct[i]) };
      case 'table': if (c.rows.some((r, i) => d.table[i] == null)) return { empty: 'Заполни все строки таблицы.' }; return { ok: c.rows.every((r, i) => d.table[i] === c.correct[i]) };
      default: return { empty: '' };
    }
  }

  // ---------- Навигация ----------
  const root = document.getElementById('app');
  let stack = [];
  const ui = { fb: {}, wait: null, sheet: null };
  const cur = () => stack[stack.length - 1];
  function go(screen, params) { stack.push(Object.assign({ screen }, params || {})); ui.wait = null; render(true); }
  function tab(screen) { stack = [{ screen }]; render(true); }
  function back() { if (stack.length > 1) { stack.pop(); ui.wait = null; render(true); } }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const color = (block) => `var(--c${block})`;

  function toast(text) {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  function haptic(kind) { try { if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(kind); } catch (e) { /* нет */ } }

  // ---------- Экраны ----------
  function topbar() {
    const p = S.profile;
    return `<header class="topbar">
      <div class="who">${avatarHtml(p.avatar, 'sm')}<b>${esc(p.name)}</b></div>
      <div class="chips">
        <span class="chip streak" title="Серия дней">${icon('flame')}${streak()}</span>
        <span class="chip stars" title="Звёзды">${icon('star')}${totalStars()}</span>
      </div></header>`;
  }
  const backBtn = () => (tg ? '' : `<button class="back" data-act="back">${icon('left')}Назад</button>`);

  function screenOnboard() {
    const p = S.profile || {};
    const name = p.name || (tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.first_name : '');
    const st = ui.onb = ui.onb || { name, grade: p.grade || null, avatar: p.avatar != null ? p.avatar : 0 };
    return `<section class="onboard">
      <div class="hero">
        <span class="eyebrow">Олимпиадная математика · 5–8 класс</span>
        <h1 class="title">Привет! Это тренажёр курса</h1>
        <p class="muted">Здесь задачи, подсказки и разборы. Начнём с бесплатного вводного курса.</p>
      </div>
      <div><label class="lbl" for="obName">Как тебя зовут?</label>
        <input id="obName" class="text-input" data-input="obName" maxlength="24" autocomplete="off" placeholder="Имя или ник" value="${esc(st.name)}"></div>
      <div><span class="lbl">В каком ты классе?</span>
        <div class="grades">${[5, 6, 7, 8].map((g) => `<button type="button" data-act="obGrade" data-g="${g}" aria-pressed="${st.grade === g}">${g}</button>`).join('')}</div></div>
      <div><span class="lbl">Выбери значок</span>
        <div class="avatars">${AVATARS.map((a, i) => `<button type="button" data-act="obAvatar" data-i="${i}" aria-pressed="${st.avatar === i}" aria-label="Значок ${i + 1}" style="background:${a.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${a.svg}</svg></button>`).join('')}</div></div>
      <button class="btn wide" data-act="obDone" ${st.name.trim() && st.grade ? '' : 'disabled'}>Начать</button>
      <p class="demo-note">Это версия для первого просмотра. Прогресс сохраняется только в этом браузере.</p>
    </section>`;
  }

  function nodeHtml(les, idx, label, sub, state) {
    const ic = state === 'done' ? 'check' : state === 'locked' ? 'lock' : 'play';
    return `<div class="node ${state}">
      <button class="dot" style="--node:${color(les ? les.block : 1)}" data-act="${les ? 'openLesson' : 'soon'}" data-k="${les ? les.key : ''}" aria-label="${esc(label)}">${icon(ic)}</button>
      <div class="label"><b>${esc(label)}</b><span>${esc(sub)}</span></div></div>`;
  }

  function screenHome() {
    const dt = dailyTask();
    let html = topbar();
    if (dt) {
      html += `<section class="daily">
        <span class="eyebrow">Задача дня</span>
        <p>${esc(dt.text)}</p>
        <button class="btn" data-act="openTask" data-id="${dt.id}">Решить</button></section>`;
    }
    // Вводный курс
    let currentSet = false;
    const introNodes = INTRO.map((les, i) => {
      const done = lessonDone(les), open = lessonOpen(les);
      let state = done ? 'done' : open ? 'open' : 'locked';
      if (state === 'open' && !currentSet) { state = 'open current'; currentSet = true; }
      const lv = levelObj(les, 1);
      const sub = done ? 'Пройдено' : open ? `Решено ${doneCount(lv)} из ${lv.tasks.length}` : 'Откроется после прошлого занятия';
      return nodeHtml(les, i, `Занятие ${les.number}. ${les.title}`, sub, state);
    }).join('');
    html += `<div class="section-head"><span class="badge" style="background:${color(0)}">${icon('gift')}</span>
      <div><h2>Вводный курс</h2><p>Бесплатно · 4 занятия</p></div></div>
      <div class="path">${introNodes}</div>`;
    // Блок 1
    const b1 = BLOCKS[0];
    const b1nodes = b1.lessons.map((title, i) => {
      const les = lessonByKey(`b1-l${i + 1}`);
      if (les) {
        const done = lessonDone(les);
        const st = done ? 'done' : 'open' + (currentSet ? '' : ' current');
        if (!done) currentSet = true;
        return nodeHtml(les, i, `Занятие ${i + 1}. ${title}`, done ? 'Пройдено' : 'Демо: открыто для просмотра', st);
      }
      return nodeHtml(null, i, `Занятие ${i + 1}. ${title}`, 'В этой версии закрыто', 'locked');
    }).join('');
    html += `<div class="section-head"><span class="badge" style="background:${color(1)}">1</span>
      <div><h2>Блок 1. ${esc(b1.title)}</h2><p>4 занятия · лекции и задачи 4 уровней</p></div></div>
      <div class="path">${b1nodes}</div>`;
    // Блоки 2–6
    html += BLOCKS.slice(1).map((b) => `<button class="locked-block" data-act="access" data-b="${b.n}">
      <span class="section-head" style="margin:0"><span class="badge" style="background:${color(b.n)}">${b.n}</span>
      <span><h2>Блок ${b.n}. ${esc(b.title)}</h2><p>${esc(b.lessons.join(' · '))}</p></span></span>
      <span class="lock">${icon('lock')}</span></button>`).join('');
    return html;
  }

  function screenLesson(p) {
    const les = lessonByKey(p.k);
    const head = `${backBtn()}<section class="lesson-head" style="--node:${color(les.block)}">
      <span class="eyebrow">${les.block === 0 ? 'Вводный курс' : `Блок ${les.block}. ${esc(BLOCKS[les.block - 1].title)}`}</span>
      <h1 class="title">Занятие ${les.number}. ${esc(les.title)}</h1>
      ${les.about ? `<p>${esc(les.about)}</p>` : ''}</section>`;
    if (les.block === 0) return head + levelBody(les, 1);
    const stepLevel = (n) => {
      const lv = levelObj(les, n); const open = levelOpen(les, n); const done = levelDone(les, n);
      const c = doneCount(lv);
      const st = lv.tasks.reduce((s, t) => s + (peek(t.id).stars || 0), 0);
      const sub = !open ? (n === 2 ? 'Откроется после уровня 1' : 'Откроется после уровней 1–2') :
        `${c} из ${lv.tasks.length} · ${n <= 2 ? `нужно ${need(les, lv)}` : `звёзд: ${st}`}`;
      return `<button class="step ${done ? 'done' : ''} ${open ? '' : 'locked'}" data-act="${open ? 'openLevel' : 'lockedLevel'}" data-k="${les.key}" data-n="${n}">
        <span class="ic">${icon(done ? 'check' : open ? 'book' : 'lock')}</span>
        <span class="txt"><b>Уровень ${n} · ${LEVEL_NAMES[n]}</b><span>${sub}</span>
        <span class="meter"><i style="width:${Math.round((c / lv.tasks.length) * 100)}%"></i></span></span>
        <span class="go">${icon('right')}</span></button>`;
    };
    const stepVideo = (kind, name, len, openFlag) => {
      const w = S.watched[`${les.key}-${kind}`];
      return `<button class="step ${w ? 'done' : ''}" data-act="openVideo" data-k="${les.key}" data-v="${kind}">
        <span class="ic">${icon(w ? 'check' : 'video')}</span>
        <span class="txt"><b>Лекция «${name}»</b><span>${len}${openFlag ? '' : ' · лучше смотреть после уровней 1–2'}</span></span>
        <span class="go">${icon('right')}</span></button>`;
    };
    return head + `<div class="steps">
      ${stepVideo('osnova', 'Основа', 'около 3 минут', true)}
      ${stepLevel(1)}${stepLevel(2)}
      ${stepVideo('uglub', 'Углубление', 'около 2 минут', levelDone(les, 1) && levelDone(les, 2))}
      ${stepLevel(3)}${stepLevel(4)}</div>
      <p class="muted small">Следующее занятие открывается, когда пройдены уровни 1 и 2. Уровни 3–4 дают звёзды и не мешают идти дальше.</p>`;
  }

  function levelBody(les, n) {
    const lv = levelObj(les, n);
    const c = doneCount(lv), nd = need(les, lv);
    return `<div class="card">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <b>${les.block === 0 ? 'Задачи' : `Уровень ${n} · ${LEVEL_NAMES[n]}`}</b>
        <span class="muted small">Решено ${c} из ${lv.tasks.length} · нужно ${nd}</span></div>
      <div class="meter"><i style="width:${Math.round((c / lv.tasks.length) * 100)}%"></i></div>
      <div class="grid">${lv.tasks.map((t) => {
        const st = peek(t.id);
        const cls = st.st === 'solved' ? 'solved' : st.st === 'review' ? 'review' : '';
        const stars = st.stars ? `<span class="st">${icon('star').repeat(st.stars)}</span>` : (st.st === 'review' ? '<small>разобрана</small>' : '<small>&nbsp;</small>');
        return `<button class="tile ${cls}" data-act="openTask" data-id="${t.id}" aria-label="Задача ${t.n}">${t.n}${stars}</button>`;
      }).join('')}</div></div>`;
  }

  function screenLevel(p) {
    const les = lessonByKey(p.k);
    return `${backBtn()}<div><span class="eyebrow">Занятие ${les.number}. ${esc(les.title)}</span>
      <h1 class="title">Уровень ${p.n}</h1></div>${levelBody(les, p.n)}
      ${p.n <= 2 ? '<p class="muted small">К уровням 1–2 подсказок нет: если задача не выходит, пересмотри лекцию «Основа».</p>' : '<p class="muted small">За задачу без подсказок — 2 звезды, с подсказками — 1.</p>'}`;
  }

  function screenVideo(p) {
    const les = lessonByKey(p.k);
    const name = p.v === 'osnova' ? 'Основа' : 'Углубление';
    const player = LOCAL && les.videos && les.videos[p.v]
      ? `<div class="video"><video controls playsinline preload="metadata" src="/video/${les.key}/${p.v}.mp4" data-watch="${les.key}-${p.v}"></video></div>`
      : `<div class="video"><div>${icon('play')}<p><b>Лекция «${name}»</b></p><p class="small" style="opacity:.8">Здесь будет видео с YouTube, запасной вариант — VK Видео. В версии на ноутбуке видео уже играет из папки курса.</p></div></div>`;
    return `${backBtn()}<div><span class="eyebrow">Занятие ${les.number}. ${esc(les.title)}</span>
      <h1 class="title">Лекция «${name}»</h1></div>${player}
      <button class="btn wide" data-act="watched" data-w="${les.key}-${p.v}">${S.watched[`${les.key}-${p.v}`] ? 'Посмотрел(а) — к задачам' : 'Посмотрел(а)'}</button>`;
  }

  function answerWidget(t, locked) {
    const c = t.check, d = dr(t.id), dis = locked ? 'disabled' : '';
    const prompt = c.prompt ? `<p class="prompt">${esc(c.prompt)}</p>` : '';
    switch (c.type) {
      case 'number':
        return `<div class="numinput"><input type="text" inputmode="numeric" id="num-${t.id}" data-input="num" data-id="${t.id}" placeholder="Ответ" aria-label="Ответ" value="${esc(d.num || '')}" ${dis}></div>`;
      case 'choice':
        return prompt + `<div class="options" role="radiogroup">${c.options.map((o, i) => `<button class="opt radio" role="radio" data-act="choose" data-id="${t.id}" data-i="${i}" aria-checked="${d.choice === i}" aria-pressed="${d.choice === i}" ${dis}><span class="box">${d.choice === i ? icon('check') : ''}</span>${esc(o)}</button>`).join('')}</div>`;
      case 'multi':
        return prompt + `<div class="options">${c.options.map((o, i) => { const on = d.multi.includes(i); return `<button class="opt" data-act="toggle" data-id="${t.id}" data-i="${i}" aria-pressed="${on}" ${dis}><span class="box">${on ? icon('check') : ''}</span>${esc(o)}</button>`; }).join('')}</div>`;
      case 'match':
        return `<p class="prompt">Соедини пары:</p><div class="match">${c.rows.map((r, ri) => `<div class="match-row"><b>${esc(r)}</b><div class="pills">${c.options.map((o, oi) => `<button class="pill" data-act="match" data-id="${t.id}" data-r="${ri}" data-o="${oi}" aria-pressed="${d.match[ri] === oi}" ${dis}>${esc(o)}</button>`).join('')}</div></div>`).join('')}</div>`;
      case 'fields':
        return `<div class="fields">${c.fields.map((f, i) => c.bin
          ? `<div class="field"><span><b>${esc(f.label)}</b></span><div class="bin">${[0, 1].map((v) => `<button data-act="bin" data-id="${t.id}" data-i="${i}" data-v="${v}" aria-pressed="${d.fields[i] === v}" aria-label="${esc(f.label)} = ${v}" ${dis}>${v}</button>`).join('')}</div></div>`
          : `<div class="field"><label for="f-${t.id}-${i}">${esc(f.label)}</label><input id="f-${t.id}-${i}" type="text" inputmode="numeric" data-input="field" data-id="${t.id}" data-i="${i}" value="${esc(d.fields[i] == null ? '' : d.fields[i])}" ${dis}></div>`).join('')}</div>`;
      case 'table':
        return `<p class="prompt">Заполни столбец ответа — нажимай на клетки:</p><div class="ttable-wrap"><table class="ttable"><thead><tr>${c.vars.map((v) => `<th>${esc(v)}</th>`).join('')}<th>${esc(c.label)}</th></tr></thead><tbody>${c.rows.map((r, i) => `<tr>${r.split('').map((x) => `<td>${x}</td>`).join('')}<td class="res"><button data-act="cell" data-id="${t.id}" data-i="${i}" class="${d.table[i] == null ? '' : 'set'}" aria-label="Строка ${r}: ${d.table[i] == null ? 'пусто' : d.table[i]}" ${dis}>${d.table[i] == null ? '?' : d.table[i]}</button></td></tr>`).join('')}</tbody></table></div>`;
      default:
        return '<p class="muted">Реши задачу в тетради. Когда будешь готов — сверь свой ответ с решением.</p>';
    }
  }

  function solutionHtml(t) {
    const steps = t.solution || [];
    const body = steps.length > 1 ? `<ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : steps.length ? `<p>${esc(steps[0])}</p>` : '';
    return `<section class="solution" style="--node:${color(t.lesson.block)}">
      <h3>Ответ и решение</h3>
      ${t.answer ? `<p class="ans">Ответ: ${esc(t.answer)}</p>` : ''}
      ${t.idea ? `<p><b>Идея:</b> ${esc(t.idea)}</p>` : ''}
      ${body}
      ${t.teaches ? `<div class="lesson-line"><b>Чему учит задача</b>${esc(t.teaches)}</div>` : ''}
    </section>`;
  }

  function screenTask(p) {
    const t = TASKS[p.id], les = t.lesson, st = peek(p.id);
    ts(p.id); if (!S.tasks[p.id].t0) { S.tasks[p.id].t0 = Date.now(); save(); }
    const solved = counted(p.id);
    const isSelf = t.check.type === 'self';
    const hh = hasHints(t);
    const canShow = !solved && !st.shown && !isSelf && ((hh && (st.hints || 0) >= t.hints.length) || (!hh && (st.wrong || 0) >= 2));
    const fb = ui.fb[p.id];
    const where = les.block === 0 ? `Вводный курс · Занятие ${les.number}` : `Занятие ${les.number} · Уровень ${t.level}`;
    let html = `${backBtn()}<div><span class="eyebrow">${esc(where)}</span><h1 class="title">Задача ${t.n}</h1></div>
      <article class="card" id="taskCard">
        <p class="task-text">${esc(t.text)}</p>
        ${answerWidget(t, solved || st.st === 'tried')}`;
    if (!solved && !isSelf && st.st !== 'tried') html += `<button class="btn wide" data-act="check" data-id="${t.id}">Проверить</button>`;
    if (isSelf && !st.selfOpen && !solved) html += `<button class="btn wide" data-act="selfOpen" data-id="${t.id}">Сверить с ответом</button>`;
    if (fb) html += `<div class="feedback ${fb.ok ? 'ok' : 'bad'}" role="status">${icon(fb.ok ? 'check' : 'x')}<span>${esc(fb.text)}</span></div>`;
    else if (solved) html += `<div class="feedback ok">${icon('check')}<span>${st.st === 'review' ? 'Задача разобрана и засчитана без звезды.' : 'Задача решена' + (st.stars ? ` · звёзд: ${st.stars}` : '') + '.'}</span></div>`;
    // подсказки
    for (let i = 0; i < (st.hints || 0) && i < t.hints.length; i++) html += `<div class="hint"><b>Подсказка ${i + 1}.</b> ${esc(t.hints[i])}</div>`;
    if (ui.wait === t.id) {
      html += `<div class="feedback wait" role="status"><span><b>Подумай ещё немного.</b> Подсказка откроется через <span id="waitTime">…</span>.</span>
        <button class="linkbtn" data-act="hintNow" data-id="${t.id}">Я уже всё перепробовал(а) — открыть</button></div>`;
    }
    const showSol = solved || st.shown || (isSelf && st.selfOpen);
    if (hh && !solved && !showSol && (st.hints || 0) < t.hints.length && ui.wait !== t.id) {
      html += `<button class="btn soft wide" data-act="hint" data-id="${t.id}">Подсказка ${(st.hints || 0) + 1} из ${t.hints.length}</button>`;
    }
    if (canShow) html += `<button class="btn ghost wide" data-act="showSol" data-id="${t.id}">Показать ответ и решение</button>`;
    if (showSol) html += solutionHtml(t);
    if (isSelf && st.selfOpen && !solved && st.st !== 'tried') {
      html += `<p class="prompt">Сошлось с твоим решением?</p><div class="row">
        <button class="btn" data-act="selfOk" data-id="${t.id}">Сошлось</button>
        <button class="btn ghost" data-act="selfNo" data-id="${t.id}">Не сошлось</button></div>`;
    }
    html += `<div class="author">
        <button class="btn ghost" data-act="ask" data-id="${t.id}">${icon('ask')}Спросить автора</button>
        <button class="btn ghost" data-act="submit" data-id="${t.id}">${icon('send')}Отправить решение</button></div>`;
    const lv = levelObj(les, t.level);
    const idx = lv.tasks.indexOf(t);
    const next = lv.tasks[idx + 1];
    html += next ? `<button class="btn wide" data-act="openTaskReplace" data-id="${next.id}">Следующая задача ${icon('right')}</button>` : `<button class="btn wide" data-act="back">К списку задач</button>`;
    html += '</article>';
    return html;
  }

  function screenDaily() {
    const dt = dailyTask();
    const rev = reviewTasks(dt && dt.id);
    let html = `<div><span class="eyebrow">Каждый день</span><h1 class="title">Задача дня</h1></div>`;
    if (dt) {
      html += `<section class="daily"><span class="eyebrow">${esc(dt.lesson.block === 0 ? 'Вводный курс' : 'Блок ' + dt.lesson.block)} · ${esc(dt.lesson.title)}</span>
        <p>${esc(dt.text)}</p><button class="btn" data-act="openTask" data-id="${dt.id}">${counted(dt.id) ? 'Посмотреть' : 'Решить'}</button></section>`;
    } else html += '<div class="card"><p>Все открытые задачи решены. Новая задача дня появится, когда откроется следующее занятие.</p></div>';
    html += `<div class="card"><b>Повторение</b>`;
    html += rev.length ? `<p class="muted small">Задачи из пройденных занятий, которые ты ещё не решал(а).</p><div class="list">${rev.map((t) => `<button class="list-item review-item" data-act="openTask" data-id="${t.id}"><span class="txt"><b>${esc(t.lesson.title)} · задача ${t.n}</b><span class="muted small">${esc(t.text.slice(0, 90))}${t.text.length > 90 ? '…' : ''}</span></span>${icon('right')}</button>`).join('')}</div>`
      : '<p class="muted small">Появится, когда пройдёшь первое занятие: приложение будет возвращать задачи этой темы через 2 дня, неделю и месяц.</p>';
    html += '</div>';
    html += `<div class="card"><div class="row" style="align-items:center"><span class="chip streak">${icon('flame')}${streak()}</span><span>дней подряд · лучшая серия: ${Math.max(S.best || 0, streak())}</span></div>
      <p class="muted small">День засчитан, если решена хотя бы одна задача. Два пропуска в неделю серию не прерывают.</p></div>
      <p class="demo-note">В рабочей версии задача дня приходит в бот в 17:00 с кнопкой «Решить».</p>`;
    return html;
  }

  function badges() {
    const st = totalStars(), best = Math.max(S.best || 0, streak());
    const b1 = lessonByKey('b1-l1');
    return [
      { name: 'Первая задача', on: totalSolved() > 0 },
      { name: 'Вводный курс', on: INTRO.every(lessonDone) },
      { name: 'Серия 3 дня', on: best >= 3 },
      { name: 'Серия 7 дней', on: best >= 7 },
      { name: 'Логические таблицы', on: !!b1 && lessonDone(b1) },
      { name: '10 звёзд', on: st >= 10 }
    ];
  }

  function screenProfile() {
    const p = S.profile;
    const items = [...S.subs.map((s) => ({ ...s, kind: 'Решение' })), ...S.qs.map((q) => ({ ...q, kind: 'Вопрос' }))].sort((a, b) => b.ts - a.ts);
    return `<section class="profile-head">${avatarHtml(p.avatar)}<div><h1 class="title">${esc(p.name)}</h1><p class="muted">${p.grade} класс</p></div></section>
      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>дней подряд</span></div>
        <div class="stat"><b>${totalStars()}</b><span>звёзд</span></div>
        <div class="stat"><b>${totalSolved()}</b><span>задач решено</span></div></div>
      <div class="card"><b>Значки</b><div class="badges">${badges().map((b) => `<div class="badge-item ${b.on ? '' : 'off'}"><span class="medal">${icon('medal')}</span>${esc(b.name)}</div>`).join('')}</div></div>
      <div class="card"><b>Мои решения и вопросы</b>
        ${items.length ? `<div class="list">${items.map((x) => `<div class="list-item"><span class="txt"><b>${esc(x.kind)}: ${esc(x.title)}</b><span class="muted small">${esc(x.date)}</span></span><span class="status pending">на проверке</span></div>`).join('')}</div>` : '<p class="muted small">Здесь будут решения, которые ты отправил(а) автору, и ответы на твои вопросы.</p>'}
        <button class="btn wide" data-act="submit">${icon('send')}Отправить решение</button></div>
      <div class="card"><b>Для родителей</b>
        <p class="muted small">Родитель подключается по ссылке и видит прогресс, серию и вопросы автору. Раз в неделю ему приходит короткий отчёт.</p>
        <div class="row"><button class="btn ghost" data-act="invite">Пригласить родителя</button><button class="btn ghost" data-act="report">Отчёт (пример)</button></div></div>
      <div class="card"><b>Доступ к блокам</b><p class="muted small">Код доступа вида OM-ABC123 присылает автор после покупки.</p>
        <button class="btn ghost wide" data-act="access">Ввести код доступа</button></div>
      <div class="card">
        <label class="switch"><span><b>Открыть всё для просмотра</b><br><span class="muted small">Для автора: снимает замки внутри приложения</span></span><input type="checkbox" id="viewAll" data-act="viewAll" ${S.viewAll ? 'checked' : ''}></label>
        <button class="linkbtn" data-act="editProfile">Изменить имя, класс и значок</button>
        <div id="resetZone"><button class="linkbtn" data-act="reset" style="color:var(--bad)">Сбросить прогресс</button></div></div>`;
  }

  function tabbar() {
    const sc = stack[0] ? stack[0].screen : 'home';
    const b = (s, ic, label) => `<button data-act="tab" data-s="${s}" ${sc === s ? 'aria-current="page"' : ''}>${icon(ic)}${label}</button>`;
    return `<div class="tabbar"><nav aria-label="Разделы">${b('home', 'map', 'Путь')}${b('daily', 'sun', 'Задача дня')}${b('profile', 'user', 'Профиль')}</nav></div>`;
  }

  let waitTimer = null;
  function render(scrollTop) {
    if (waitTimer) { clearInterval(waitTimer); waitTimer = null; }
    let html;
    const onboarding = !S.profile || ui.onboarding;
    if (onboarding) html = screenOnboard();
    else {
      const s = cur();
      html = ({ home: screenHome, lesson: screenLesson, level: screenLevel, task: screenTask, daily: screenDaily, profile: screenProfile, video: screenVideo })[s.screen](s);
    }
    root.innerHTML = html;
    const tb = document.getElementById('tabbar');
    tb.innerHTML = onboarding ? '' : tabbar();
    if (scrollTop) window.scrollTo(0, 0);
    if (tg) {
      try { if (!onboarding && stack.length > 1) tg.BackButton.show(); else tg.BackButton.hide(); } catch (e) { /* нет */ }
    }
    const v = root.querySelector('video[data-watch]');
    if (v) v.addEventListener('ended', () => { S.watched[v.dataset.watch] = true; save(); });
    if (ui.wait) startWait();
  }

  function startWait() {
    const el = document.getElementById('waitTime');
    const st = peek(ui.wait);
    const from = (st.hints || 0) === 0 ? st.t0 : st.ht;
    const tick = () => {
      const left = Math.max(0, HINT_WAIT - (Date.now() - from));
      if (left <= 0) { openHint(ui.wait); return; }
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      if (el) el.textContent = `${m}:${String(s).padStart(2, '0')}`;
    };
    tick();
    waitTimer = setInterval(tick, 1000);
  }
  function openHint(id) {
    const st = ts(id);
    st.hints = (st.hints || 0) + 1; st.ht = Date.now();
    ui.wait = null; save(); render(false);
  }

  // ---------- Нижние панели ----------
  function sheet(html) {
    closeSheet();
    const back = document.createElement('div');
    back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });
    document.body.appendChild(back);
    const f = back.querySelector('textarea, input, select'); if (f) setTimeout(() => f.focus(), 50);
  }
  function closeSheet() { const s = document.querySelector('.sheet-back'); if (s) s.remove(); }
  const nowDate = () => new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const taskTitle = (t) => (t.lesson.block === 0 ? `Вводный курс, «${t.lesson.title}», задача ${t.n}` : `Блок ${t.lesson.block}, «${t.lesson.title}», уровень ${t.level}, задача ${t.n}`);

  function askSheet(id) {
    const t = id ? TASKS[id] : null;
    sheet(`<h2>Спросить автора</h2>
      ${t ? `<p class="muted small">${esc(taskTitle(t))}</p>` : ''}
      <label class="lbl" for="askText">Что непонятно?</label>
      <textarea id="askText" placeholder="Например: не понимаю, почему во второй подсказке пары именно такие"></textarea>
      <button class="btn wide" data-act="askSend" data-id="${id || ''}">Отправить</button>
      <button class="btn ghost wide" data-act="closeSheet">Отмена</button>
      <p class="demo-note">${tg ? 'После «Отправить» откроется чат с ботом — вставь туда вопрос, он придёт автору.' : 'В рабочей версии вопрос придёт автору в Telegram вместе с задачей, а ответ — сюда и в бот.'}</p>`);
  }
  function submitSheet(id) {
    const t = id ? TASKS[id] : null;
    const choose = t ? `<p class="muted small">${esc(taskTitle(t))}</p>` : `
      <label class="lbl" for="subWhat">К чему решение?</label>
      <select id="subWhat">${LESSONS.map((les) => `<optgroup label="${esc(les.block === 0 ? 'Вводный курс' : 'Блок ' + les.block)} — ${esc(les.title)}">${les.levels.map((lv) => lv.tasks.map((x) => `<option value="${x.id}">${les.block === 0 ? '' : `Уровень ${lv.level}, `}задача ${x.n}</option>`).join('')).join('')}</optgroup>`).join('')}<option value="">Другая работа</option></select>`;
    sheet(`<h2>Отправить решение</h2>${choose}
      <label class="lbl" for="subPhoto">Фото решения (до 4)</label>
      <input id="subPhoto" type="file" accept="image/*" multiple>
      <div class="thumbs" id="subThumbs"></div>
      <label class="lbl" for="subText">Или напиши решение текстом</label>
      <textarea id="subText" placeholder="Можно и фото, и текст"></textarea>
      <button class="btn wide" data-act="subSend" data-id="${id || ''}">Отправить автору</button>
      <button class="btn ghost wide" data-act="closeSheet">Отмена</button>
      <p class="demo-note">${tg ? 'После «Отправить автору» откроется чат с ботом — прикрепи туда фото и вставь подпись. Автор проверит решение.' : 'В рабочей версии решение придёт автору в Telegram: Claude подготовит проверку, а засчитает задачу автор.'}</p>`);
    const inp = document.getElementById('subPhoto');
    inp.addEventListener('change', () => {
      const box = document.getElementById('subThumbs'); box.innerHTML = '';
      [...inp.files].slice(0, 4).forEach((f) => { try { const img = document.createElement('img'); img.src = URL.createObjectURL(f); img.alt = 'Фото решения'; box.appendChild(img); } catch (e) { /* нет */ } });
    });
  }
  function accessSheet(b) {
    sheet(`<h2>Как получить доступ</h2>
      ${b ? `<p><b>Блок ${b}. ${esc(BLOCKS[b - 1].title)}</b></p>` : ''}
      <p>Курс состоит из 6 блоков по 4 занятия. Каждый блок покупается отдельно и остаётся открытым навсегда. В открытом блоке — лекции, задачи всех уровней с подсказками и проверкой решений.</p>
      <p>Чтобы купить, напиши автору «Хочу купить блок» и номер блока — он расскажет о цене и оплате и пришлёт код доступа.</p>
      <label class="lbl" for="codeInput">Код доступа</label>
      <input id="codeInput" class="text-input" placeholder="OM-ABC123" autocomplete="off">
      <button class="btn wide" data-act="codeSend">Открыть блоки</button>
      <button class="btn ghost wide" data-act="askFromAccess">Написать автору</button>`);
  }
  function inviteSheet() {
    if (!S.invite) { S.invite = 'parent_' + Math.random().toString(36).slice(2, 8).toUpperCase(); save(); }
    const link = `https://t.me/${BOT}?start=${S.invite}`;
    sheet(`<h2>Пригласить родителя</h2>
      <p>Отправь эту ссылку маме или папе. Родитель откроет её в Telegram, нажмёт «Start» — и будет видеть твой прогресс и раз в неделю получать отчёт.</p>
      <div class="copybox"><span id="inviteLink">${esc(link)}</span><button class="btn soft" data-act="copyInvite">Копировать</button></div>
      <p class="demo-note">Это пример ссылки: в версии для просмотра она ещё не работает.</p>
      <button class="btn ghost wide" data-act="closeSheet">Закрыть</button>`);
  }
  function reportSheet() {
    const last = []; for (let i = 0; i < 7; i++) last.push(fmt(addDays(new Date(), -i)));
    const active = last.filter((d) => S.days[d] > 0).length;
    const week = Object.entries(S.tasks).filter(([id, x]) => counted(id) && last.includes(x.at));
    const stars = week.reduce((s, [, x]) => s + (x.stars || 0), 0);
    const stuck = Object.entries(S.tasks).filter(([id, x]) => !counted(id) && ((x.wrong || 0) >= 2 || x.st === 'tried')).map(([id]) => TASKS[id]).filter(Boolean).slice(0, 3);
    const lessonsNow = LESSONS.filter((l) => !lessonDone(l) && l.levels.some((lv) => lv.tasks.some((t) => S.tasks[t.id]))).map((l) => `«${l.title}»`);
    const name = S.profile.name;
    const text = `Отчёт за неделю: ${name}\n\nЗанимался(ась) дней: ${active} из 7\nРешено задач: ${week.length}, звёзд: ${stars}\nСерия: ${streak()} дн.\n${lessonsNow.length ? 'Сейчас проходит: ' + lessonsNow.join(', ') + '\n' : ''}${stuck.length ? 'Стоит помочь: ' + stuck.map((t) => `${t.lesson.title}, задача ${t.n}`).join('; ') : 'Застрявших задач нет.'}`;
    sheet(`<h2>Отчёт родителю</h2><p class="muted small">Так он будет приходить родителю в бот по воскресеньям.</p>
      <div class="report">${esc(text)}</div><button class="btn ghost wide" data-act="closeSheet">Закрыть</button>`);
  }

  // ---------- Действия ----------
  const A = {
    back, tab: (d) => tab(d.s),
    closeSheet,
    obGrade: (d) => { ui.onb.grade = Number(d.g); render(false); },
    obAvatar: (d) => { ui.onb.avatar = Number(d.i); render(false); },
    obDone: () => {
      const o = ui.onb; if (!o.name.trim() || !o.grade) return;
      const first = !S.profile;
      S.profile = { name: o.name.trim(), grade: o.grade, avatar: o.avatar }; save(); ui.onb = null; ui.onboarding = false;
      stack = [{ screen: first ? 'home' : 'profile' }]; render(true);
      if (first) toast('Начнём с вводного курса — он бесплатный.');
    },
    editProfile: () => { ui.onb = { name: S.profile.name, grade: S.profile.grade, avatar: S.profile.avatar }; ui.onboarding = true; render(true); },
    openLesson: (d) => {
      const les = lessonByKey(d.k);
      if (!lessonOpen(les)) { toast('Это занятие откроется после прошлого.'); return; }
      go('lesson', { k: d.k });
    },
    soon: () => toast('В версии для просмотра открыто только первое занятие блока 1.'),
    openLevel: (d) => go('level', { k: d.k, n: Number(d.n) }),
    lockedLevel: (d) => toast(Number(d.n) === 2 ? 'Сначала пройди уровень 1.' : 'Уровни 3–4 открываются после уровней 1 и 2.'),
    openVideo: (d) => go('video', { k: d.k, v: d.v }),
    watched: (d) => { S.watched[d.w] = true; save(); back(); },
    openTask: (d) => go('task', { id: d.id }),
    openTaskReplace: (d) => { stack[stack.length - 1] = { screen: 'task', id: d.id }; ui.wait = null; render(true); },
    choose: (d) => { dr(d.id).choice = Number(d.i); delete ui.fb[d.id]; render(false); },
    toggle: (d) => { const m = dr(d.id).multi, i = Number(d.i); const k = m.indexOf(i); if (k >= 0) m.splice(k, 1); else m.push(i); delete ui.fb[d.id]; render(false); },
    match: (d) => { dr(d.id).match[Number(d.r)] = Number(d.o); delete ui.fb[d.id]; render(false); },
    bin: (d) => { dr(d.id).fields[Number(d.i)] = Number(d.v); delete ui.fb[d.id]; render(false); },
    cell: (d) => { const tb = dr(d.id).table, i = Number(d.i); tb[i] = tb[i] == null ? 0 : tb[i] === 0 ? 1 : 0; delete ui.fb[d.id]; render(false); },
    check: (d) => {
      const t = TASKS[d.id], r = evaluate(t), st = ts(d.id);
      if (r.empty) { ui.fb[d.id] = { ok: false, text: r.empty }; render(false); return; }
      if (r.ok) {
        st.st = st.shown ? 'review' : 'solved'; st.stars = starsFor(t, st); markActivity(d.id); save();
        const praise = ['Верно!', 'Точно!', 'Так и есть!'][hash(d.id) % 3];
        ui.fb[d.id] = { ok: true, text: praise + (st.stars ? ` +${st.stars} ${st.stars === 1 ? 'звезда' : 'звезды'}.` : ' Сверь ход мысли с решением ниже.') };
        haptic('success'); render(false);
        const c = document.getElementById('taskCard'); if (c) c.classList.add('pop');
      } else {
        st.wrong = (st.wrong || 0) + 1; save();
        const more = hasHints(t) ? ' Можно открыть подсказку.' : (t.lesson.block === 0 ? '' : ' Если не выходит — пересмотри лекцию «Основа».');
        ui.fb[d.id] = { ok: false, text: 'Пока не так. Перечитай условие ещё раз.' + more };
        haptic('error'); render(false);
        const c = document.getElementById('taskCard'); if (c) c.classList.add('shake');
      }
    },
    hint: (d) => {
      const st = ts(d.id);
      const from = (st.hints || 0) === 0 ? st.t0 : st.ht;
      if (Date.now() - (from || 0) < HINT_WAIT) { ui.wait = d.id; render(false); } else openHint(d.id);
    },
    hintNow: (d) => openHint(d.id),
    showSol: (d) => {
      const st = ts(d.id); st.shown = true;
      if (!counted(d.id)) { st.st = 'review'; st.stars = 0; markActivity(d.id); }
      save(); ui.fb[d.id] = { ok: true, text: 'Задача разобрана и засчитана без звезды. Похожая задача придёт в повторении.' }; render(false);
    },
    selfOpen: (d) => { ts(d.id).selfOpen = true; save(); render(false); },
    selfOk: (d) => { const t = TASKS[d.id], st = ts(d.id); st.st = 'solved'; st.stars = starsFor(t, st); markActivity(d.id); save(); ui.fb[d.id] = { ok: true, text: 'Отлично!' + (st.stars ? ` +${st.stars} ${st.stars === 1 ? 'звезда' : 'звезды'}.` : '') }; haptic('success'); render(false); },
    selfNo: (d) => { const st = ts(d.id); st.st = 'tried'; save(); ui.fb[d.id] = { ok: false, text: 'Ничего страшного: разбери решение, а к этой теме вернёмся в повторении. Можно спросить автора.' }; render(false); },
    ask: (d) => askSheet(d.id),
    askFromAccess: () => askSheet(null),
    askSend: (d) => {
      const v = document.getElementById('askText').value.trim();
      if (!v) { toast('Напиши, что непонятно.'); return; }
      const title = d.id ? taskTitle(TASKS[d.id]) : 'вопрос автору';
      S.qs.push({ title, text: v, date: nowDate(), ts: Date.now() }); save();
      closeSheet();
      if (tg) { toBot(`Вопрос: ${title}\n${v}`, 'Вопрос скопирован. Вставь его в чат с ботом и отправь.'); }
      else toast('Вопрос сохранён. В рабочей версии он сразу придёт автору.');
      render(false);
    },
    submit: (d) => submitSheet(d.id || null),
    subSend: (d) => {
      const id = d.id || (document.getElementById('subWhat') ? document.getElementById('subWhat').value : '');
      const photos = document.getElementById('subPhoto').files.length;
      const text = document.getElementById('subText').value.trim();
      if (!photos && !text) { toast('Добавь фото или текст решения.'); return; }
      const title = id ? taskTitle(TASKS[id]) : 'другая работа';
      S.subs.push({ title, photos, date: nowDate(), ts: Date.now() }); save();
      closeSheet();
      if (tg) { toBot(`Решение: ${title}${text ? '\n' + text : ''}`, photos ? 'Подпись скопирована. В чате с ботом прикрепи фото решения и вставь подпись.' : 'Решение скопировано. Вставь его в чат с ботом и отправь.'); }
      else toast('Решение сохранено. В рабочей версии оно уйдёт автору на проверку.');
      render(false);
    },
    access: (d) => accessSheet(d.b ? Number(d.b) : null),
    codeSend: () => {
      const v = document.getElementById('codeInput').value.trim().toUpperCase();
      toast(/^OM-[A-Z0-9]{6}$/.test(v) ? 'В рабочей версии этот код откроет блоки. Сейчас это просмотр.' : 'Код выглядит так: OM-ABC123.');
    },
    invite: inviteSheet,
    copyInvite: () => {
      const text = document.getElementById('inviteLink').textContent;
      const sel = () => { const r = document.createRange(); r.selectNodeContents(document.getElementById('inviteLink')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(text).then(() => toast('Ссылка скопирована.'), () => { sel(); toast('Выделил ссылку — скопируй её.'); }); } catch (e) { sel(); toast('Выделил ссылку — скопируй её.'); }
    },
    report: reportSheet,
    viewAll: (d, el) => { S.viewAll = el.checked; save(); toast(S.viewAll ? 'Все замки сняты для просмотра.' : 'Замки вернулись.'); },
    reset: () => {
      document.getElementById('resetZone').innerHTML = `<p><b>Стереть весь прогресс?</b></p><div class="row"><button class="btn" data-act="resetYes" style="background:var(--bad)">Да, стереть</button><button class="btn ghost" data-act="resetNo">Отмена</button></div>`;
    },
    resetYes: () => { const p = S.profile; S = fresh(); S.profile = p; save(); stack = [{ screen: 'home' }]; render(true); toast('Прогресс стёрт.'); },
    resetNo: () => render(false)
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.act];
    if (fn) { if (el.tagName !== 'INPUT') e.preventDefault(); fn(el.dataset, el, e); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target; const k = el.dataset && el.dataset.input; if (!k) return;
    if (k === 'obName') { ui.onb.name = el.value; const b = root.querySelector('[data-act="obDone"]'); if (b) b.disabled = !(el.value.trim() && ui.onb.grade); return; }
    if (k === 'num') dr(el.dataset.id).num = el.value;
    if (k === 'field') dr(el.dataset.id).fields[Number(el.dataset.i)] = el.value;
    delete ui.fb[el.dataset.id];
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset && (e.target.dataset.input === 'num' || e.target.dataset.input === 'field')) {
      A.check({ id: e.target.dataset.id });
    }
  });

  // В Telegram вопрос и решение уходят автору через чат с ботом: копируем текст и открываем чат.
  function toBot(text, hint) {
    const open = () => { try { tg.openTelegramLink(`https://t.me/${BOT}`); } catch (e) { /* нет */ } };
    try {
      navigator.clipboard.writeText(text).then(() => { toast(hint); setTimeout(open, 900); }, () => { toast('Открываю чат с ботом — напиши туда своё сообщение.'); setTimeout(open, 900); });
    } catch (e) { toast('Открываю чат с ботом — напиши туда своё сообщение.'); setTimeout(open, 900); }
  }

  // Telegram: развернуть, тема, кнопка «Назад»
  if (tg) {
    try {
      tg.ready(); tg.expand();
      if (tg.colorScheme) document.documentElement.dataset.theme = tg.colorScheme;
      tg.BackButton.onClick(() => back());
    } catch (e) { /* нет */ }
  }

  stack = [{ screen: 'home' }];
  render(true);
  // Если в облаке Telegram прогресс новее — берём его (например, ребёнок занимался на другом устройстве).
  cloudLoad((remote) => {
    if (remote && (remote.savedAt || 0) > (S.savedAt || 0)) {
      S = Object.assign(fresh(), remote);
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* нет */ }
      if (!ui.onboarding) { stack = [{ screen: 'home' }]; render(true); }
    } else if (S.profile) cloudSave();
  });
})();
