(() => {
  'use strict';
  const STORAGE_KEY = 'little-geniuses-progress-v1';
  const AGE_KEY = 'little-geniuses-age-v1';
  const AGE_OPTIONS = [
    {id:'3-4', emoji:'🧸', name:'3–4 года', desc:'Цвета, формы, первые сравнения'},
    {id:'5-6', emoji:'🌈', name:'5–6 лет', desc:'Счёт, звуки, логика и открытия'},
    {id:'6-7', emoji:'🚀', name:'6–7 лет', desc:'Подготовка к школе через игру'}
  ];
  const app = document.querySelector('#main');
  const toast = document.querySelector('#toast');
  const storage = {
    get(k, fallback) { try { const raw = localStorage.getItem(k); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } },
    set(k, value) { try { localStorage.setItem(k, JSON.stringify(value)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); return true; } catch { return false; } }
  };
  let age = storage.get(AGE_KEY, null);
  if (!AGE_OPTIONS.some(a => a.id === age)) age = null;
  let results = storage.get(STORAGE_KEY, []);
  if (!Array.isArray(results)) results = [];
  results = results.filter(x => x && AGE_OPTIONS.some(a => a.id === x.age) && GENIUS_WORLDS.some(w => w.id === x.world));
  let screen = 'home';
  let session = null;
  let questionFeedback = null;
  let readyForOffline = false;
  let installPrompt = null;
  let toastTimer = null;

  const worldById = id => GENIUS_WORLDS.find(w => w.id === id);
  const ageLabel = id => AGE_OPTIONS.find(a => a.id === id)?.name || '';
  const fmtDate = value => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  };
  function notify(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 4000); }
  function changeScreen(view) {
    if (session && screen === 'game' && view !== 'game' && view !== 'complete' && !confirm('Выйти из игры? Незавершённые задания не сохранятся.')) return;
    if (view !== 'game' && view !== 'complete') session = null;
    screen = view;
    render();
  }
  function render() {
    if (screen === 'home') app.innerHTML = renderHome();
    else if (screen === 'worlds') app.innerHTML = renderWorlds();
    else if (screen === 'game') app.innerHTML = renderGame();
    else if (screen === 'complete') app.innerHTML = renderComplete();
    else if (screen === 'progress') app.innerHTML = renderProgress();
    else if (screen === 'parents') app.innerHTML = renderParents();
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === (screen === 'game' || screen === 'complete' || screen === 'worlds' ? 'home' : screen)));
    window.scrollTo({top:0,behavior:'instant'});
  }
  const btn = (label,action,secondary=false) => `<button class="btn ${secondary?'btn-light':'btn-primary'}" ${action}>${label}</button>`;
  function renderHome() {
    return `
    <section class="hero" aria-labelledby="heroTitle">
      <div class="hero-copy">
        <span class="hero-kicker">✨ АКАДЕМИЯ ГЕНИЕВ ПРЕДСТАВЛЯЕТ</span>
        <h1 id="heroTitle">Привет, маленький <span>гений!</span></h1>
        <p>Лисёнок Лео и Енотик ждут тебя в мире добрых игр. Тут можно пробовать, удивляться и узнавать новое каждый день!</p>
        <button class="btn btn-primary btn-big" data-scroll="ages">Начать приключение <span aria-hidden="true">→</span></button>
        <div class="hero-notes"><span>🎈 Для детей 3–7 лет</span><span>💛 Без оценок</span><span>📱 Игры без интернета</span></div>
      </div>
      <div class="hero-mascots" aria-hidden="true"><span class="hero-sparkle one">✦</span><span class="hero-sparkle two">✳</span><img class="leo" src="./assets/leo.png" alt=""><img class="enotik" src="./assets/enotik-scene.webp" alt=""></div>
    </section>
    <section id="ages" aria-labelledby="agesTitle"><div class="section-head"><div><h2 id="agesTitle">Сколько тебе лет?</h2><p>Выбирай свой возраст — игры подстроятся под тебя.</p></div><span class="mini-chip">🌱 Каждый растёт в своём темпе</span></div>
    <div class="age-grid">${renderAgeCards()}</div></section>
    <div class="note-strip"><span class="note-icon">💡</span><div><strong>Маленький секрет больших открытий</strong><small>Здесь не нужно спешить. Даже если что-то не получается с первого раза — это часть игры!</small></div></div>
    ${age ? `<div class="section-head"><div><h2>Продолжим путешествие?</h2><p>Для возраста ${ageLabel(age).toLowerCase()} уже ждут шесть игровых миров.</p></div>${btn('Выбрать игру →','data-go="worlds"')}</div>` : ''}`;
  }
  function renderAgeCards() {
    return AGE_OPTIONS.map(a => `<button class="age-card ${age===a.id?'is-selected':''}" data-age="${a.id}" aria-label="Выбрать возраст ${a.name}">
      <span class="age-sticker" aria-hidden="true">${a.emoji}</span><span class="age-label">${a.name}</span><span class="age-desc">${a.desc}</span><span class="age-arrow" aria-hidden="true">→</span>${age===a.id?'<span class="age-check">Выбрано ✓</span>':''}</button>`).join('');
  }
  function renderWorlds() {
    if (!age) return renderHome();
    const complete = new Set(results.filter(x => x.age === age).map(x => x.world));
    return `<div class="crumbs"><button data-go="home">← На главную</button><span>/</span><span>Игровые миры</span></div>
    <div class="page-heading"><div><div class="eyebrow">ПУТЕШЕСТВИЕ С ЛЕО И ЕНОТИКОМ</div><h2 style="margin-top:8px">Выбирай, во что поиграем!</h2><p>Шесть волшебных миров, много добрых открытий.</p></div><img class="tiny-mascot" src="./assets/leo-face.png" alt="Лисёнок Лео"></div>
    <div class="level-banner"><div><strong>Возраст: ${ageLabel(age)}</strong><p>Игры подобраны для этого возрастного этапа. Возраст — не оценка умений.</p></div><button class="btn btn-light btn-small select-age" data-go="home">Изменить возраст</button></div>
    <div class="world-grid">${GENIUS_WORLDS.map(w => `<button class="world-card" data-world="${w.id}" aria-label="Открыть игру ${w.title}"><span class="world-icon ${w.color}" aria-hidden="true">${w.icon}</span><span class="world-title">${w.title}</span><span class="world-desc">${w.subtitle} · 4 задания</span>${complete.has(w.id)?'<span class="world-done">Уже играли ✓</span>':''}<span class="world-arrow" aria-hidden="true">→</span></button>`).join('')}</div>
    <div class="bottom-support"><span>🌷</span><span>Совет: одно приключение занимает всего несколько минут. Для детей 3–4 лет лучше играть вместе со взрослым.</span></div>`;
  }
  function renderGame() {
    if (!session) return renderWorlds();
    const world = worldById(session.world);
    const lesson = GENIUS_LESSONS[session.age][session.world];
    const item = lesson[session.pos];
    const good = questionFeedback?.good;
    return `<div class="crumbs"><button data-back-worlds>← Все миры</button><span>/</span><span>${world.title}</span></div>
      <div class="game-layout"><section class="game-panel" aria-labelledby="questionTitle">
      <div class="game-top"><span class="game-tag">${world.icon} ${world.title}</span><span class="step-counter">Задание ${session.pos+1} из ${lesson.length}</span></div>
      <div class="step-dots" aria-hidden="true">${lesson.map((_,i)=>`<i class="${i<session.pos?'complete':i===session.pos?'current':''}"></i>`).join('')}</div>
      <h1 class="question-title" id="questionTitle">${item.prompt}</h1>
      <div class="question-visual" role="img" aria-label="${item.scene.replace(/</g,'&lt;')}">${item.scene}</div>
      <div class="answer-grid" role="group" aria-label="Варианты ответа">${item.choices.map((c,i)=>`<button class="answer ${good&&i===item.correct?'correct':questionFeedback&&!good&&questionFeedback.chosen===i?'try-again':''}" data-answer="${i}" ${good?'disabled':''}><span class="symbol" aria-hidden="true">${c.symbol}</span><span class="answer-label">${c.label}</span></button>`).join('')}</div>
      ${questionFeedback ? `<div class="feedback ${good?'success':''}" role="status"><span class="feedback-icon">${good?'🌟':'💛'}</span><span>${good ? `${questionFeedback.text}` : `${questionFeedback.text}`}</span></div>` : '<div class="onboarding-status">💜 Можно пробовать снова — здесь нет оценок.</div>'}
      <div class="game-actions"><button class="speech-btn" data-speak="question">🔊 Послушать задание</button>${good?btn(session.pos===lesson.length-1?'Закончить приключение ✨':'Дальше →','data-next'):''}</div>
      </section><aside class="side-pal"><img src="${session.pos%2?'./assets/enotik-scene.webp':'./assets/leo.png'}" alt="${session.pos%2?'Енотик':'Лисёнок Лео'}"><div class="side-text"><h3>${session.pos%2?'Енотик':'Лео'} рядом!</h3><p>${session.pos%2?'Попробуем найти ответ вместе?':'У тебя обязательно получится!'}</p><div class="speech-bubble">${questionFeedback?.good?'Ура! Здорово придумано! 🌟':'Выбирай ответ, не торопись 💫'}</div></div></aside></div>`;
  }
  function renderComplete() {
    if (!session) return renderWorlds();
    const world = worldById(session.world);
    return `<div class="complete-panel"><span class="eyebrow">МАЛЕНЬКОЕ ПРИКЛЮЧЕНИЕ ЗАВЕРШЕНО</span><div class="celebrate" aria-hidden="true">🏆 ✨</div><h1>Как здорово получилось!</h1><p>Ещё одно приключение позади! Все четыре задания мира «${world.title}» выполнены. Лео и Енотик очень рады твоим открытиям!</p><div class="sticker-row" aria-label="Коллекция звёздочек за участие"><span>🌟</span><span>💜</span><span>🦊</span><span>🦝</span></div><p>Здесь не бывает плохих результатов — важно пробовать, думать и играть.</p><div class="btns">${btn('Ещё один мир →','data-go="worlds"')}${btn('Поиграть ещё раз','data-replay',true)}${btn('Мои открытия','data-go="progress"',true)}</div></div>`;
  }
  function renderProgress() {
    const unique = new Set(results.map(r=>r.age+'-'+r.world));
    const last = results.slice(-12).reverse();
    return `<div class="page-heading"><div><div class="eyebrow">ЛИЧНАЯ КОЛЛЕКЦИЯ</div><h2 style="margin-top:8px">Мои открытия 🌟</h2><p>Здесь живут истории твоих маленьких побед — без оценок и сравнения с другими.</p></div><img class="tiny-mascot" src="./assets/enotik-portrait.webp" alt="Енотик"></div>
    <div class="progress-summary"><div class="stat"><div class="stat-number">${results.length}</div><div class="stat-name">игровых приключений</div></div><div class="stat"><div class="stat-number">${unique.size}</div><div class="stat-name">посещённых миров и возрастных уровней</div></div><div class="stat"><div class="stat-number">${results.length*4}</div><div class="stat-name">выполненных игровых шагов</div></div></div>
    <div class="section-head"><div><h2>История путешествий</h2><p>Все записи хранятся только на этом устройстве.</p></div></div>
    ${last.length ? `<div class="history">${last.map(x=>{const w=worldById(x.world);return `<div class="history-item"><div><strong>${w.icon} ${w.title}</strong><small>${fmtDate(x.date)} · ${ageLabel(x.age)}</small></div><span class="history-pill">Пройдено ✓</span></div>`}).join('')}</div>` : `<div class="empty-state"><div class="empty-emoji">🌱</div><h3>Все открытия впереди!</h3><p>Выбери возраст и отправляйся в свой первый игровой мир.</p>${btn('Играть с Лео и Енотиком','data-go="home"')}</div>`}
    <div class="bottom-support"><span>💛</span><span>Мы показываем только участие в играх. Это не педагогическая диагностика и не оценка развития ребёнка.</span></div>`;
  }
  function renderParents() {
    return `<div class="page-heading"><div><div class="eyebrow">ИНФОРМАЦИЯ ДЛЯ СЕМЬИ</div><h2 style="margin-top:8px">Для родителей 💛</h2><p>Как устроен «Мир маленьких гениев» и что важно знать.</p></div><img class="tiny-mascot" src="./assets/enotik-portrait.webp" alt="Енотик"></div>
    <div class="adult-box"><section class="adult-card"><h3>🌱 Развитие через игру</h3><p>Содержание первой версии подготовлено с опорой на принципы ФГОС дошкольного образования и направления ФОП ДО: познавательное, речевое и социально-коммуникативное развитие.</p><ul><li><strong>3–4 года:</strong> простое узнавание цветов, форм, животных, счёт небольших групп, знакомые бытовые ситуации.</li><li><strong>5–6 лет:</strong> сравнение, элементарная математика, рифма, первый звук, простые закономерности.</li><li><strong>6–7 лет:</strong> звуковые задачи, начальные вычисления, последовательности, рассуждения.</li></ul><p>Эта цифровая игра дополняет, но не заменяет движение, творчество, свободную игру, общение и занятия со взрослым. Перед использованием в детском учреждении потребуется экспертная проверка педагогом-дошкольником.</p></section>
    <section class="adult-card"><h3>🧸 Как заниматься бережно</h3><ul><li>Одна игровая мини-сессия — четыре задания без ограничения времени.</li><li>В 3–4 года взрослому лучше быть рядом: ребёнок не обязан читать инструкции.</li><li>Поощряйте поиск ответа и совместное обсуждение, не оценивайте скорость.</li><li>Прерывайте игру при усталости и чередуйте экран с движением.</li><li>Аудиоподсказки используют синтез речи устройства: доступность русского голоса, особенно офлайн, зависит от планшета.</li></ul><p>У приложения нет микрофона, аккаунтов, рекламы и отправки детских ответов на сервер.</p></section>
    <section class="adult-card"><h3>📱 Как установить на iPad и iPhone</h3><ol><li>Откройте опубликованный сайт в Safari с интернетом.</li><li>Дождитесь полной загрузки, затем нажмите «Поделиться».</li><li>Выберите «На экран Домой» и подтвердите добавление.</li><li>После первого сохранения файлов запустите приложение с иконки и проверьте работу в авиарежиме.</li></ol><div class="install-callout"><strong>Работа без интернета</strong><p style="margin-bottom:0">Страницы, задания и изображения кешируются после первого запуска. Для обновлений понадобится интернет. Устройство может очищать кеш при нехватке места.</p></div><div class="parent-actions"><button class="btn btn-light btn-small" data-install>📲 Установить приложение</button><span id="installNote" class="age-help"></span></div></section>
    <section class="adult-card"><h3>🔐 Прогресс и приватность</h3><p>История игр сохраняется в localStorage этого браузера. Она не переносится автоматически с iPad на iPhone и исчезнет при очистке данных браузера.</p><p>Настоящее имя ребёнка не запрашивается. Раздел с информацией для родителей не защищён паролем.</p><div class="parent-actions"><button class="btn btn-light btn-small" data-clear>🗑 Удалить историю игр</button></div><p style="font-size:12px;margin-top:14px">Нормативные документы: <a href="https://docs.edu.gov.ru/document/0e6ad380fc69dd72b6065672830540ac/" target="_blank" rel="noopener">ФОП ДО, приказ № 1028</a> и <a href="https://docs.edu.gov.ru/document/a72db92c851c9f9c33d52d482420b477/" target="_blank" rel="noopener">ФГОС ДО, приказ № 1155</a>.</p></section></div>`;
  }
  function startWorld(id) {
    if (!age) return notify('Сначала выбери возраст 💜');
    const world = worldById(id);
    if (!world || !GENIUS_LESSONS[age][id]) return;
    session = {age,world:id,pos:0,mistakes:0};
    questionFeedback = null;
    screen = 'game'; render();
  }
  function chooseAnswer(idx) {
    if (!session || questionFeedback?.good) return;
    const item = GENIUS_LESSONS[session.age][session.world][session.pos];
    if (idx < 0 || idx >= item.choices.length) return;
    if (idx === item.correct) questionFeedback = {good:true,chosen:idx,text:'Ура! '+item.why};
    else {session.mistakes++;questionFeedback={good:false,chosen:idx,text:'Хорошая попытка! '+item.hint};}
    renderGameInPlace();
  }
  function renderGameInPlace() {
    // Не сбрасываем прокрутку и фокус на каждом ответе.
    const scrollY = window.scrollY;
    app.innerHTML = renderGame();
    window.scrollTo({top:scrollY,behavior:'instant'});
    app.querySelector(questionFeedback?.good?'[data-next]':'[data-speak]')?.focus({preventScroll:true});
  }
  function nextStep() {
    if (!session || !questionFeedback?.good) return;
    const items = GENIUS_LESSONS[session.age][session.world];
    if (session.pos < items.length - 1) {session.pos++;questionFeedback=null;render();return;}
    results.push({id:(crypto.randomUUID?.() || String(Date.now())+Math.random()), age:session.age,world:session.world,date:new Date().toISOString()});
    if (results.length > 500) results = results.slice(-500);
    if (!storage.set(STORAGE_KEY, results)) notify('Не удалось сохранить прогресс на этом устройстве.');
    screen = 'complete';render();
  }
  function speak() {
    if (!session || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {notify('На этом устройстве озвучка недоступна. Попроси взрослого прочитать задание.');return;}
    try {
      const item = GENIUS_LESSONS[session.age][session.world][session.pos];
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.prompt + ' ' + item.choices.map((c,i)=> `${i+1}. ${c.label}`).join('. '));
      utterance.lang = 'ru-RU';utterance.rate=.82;utterance.pitch=1.08;
      const voices = speechSynthesis.getVoices();
      const russian = voices.find(v=>/^ru(-|$)/i.test(v.lang));if(russian) utterance.voice=russian;
      speechSynthesis.speak(utterance);
    } catch {notify('Озвучка сейчас недоступна — можно прочитать вместе со взрослым.');}
  }
  app.addEventListener('click', event => {
    const b = event.target.closest('button');if(!b)return;
    if (b.hasAttribute('data-age')) {age=b.dataset.age;storage.set(AGE_KEY,age);screen='worlds';render();return;}
    if (b.hasAttribute('data-world')) {startWorld(b.dataset.world);return;}
    if (b.hasAttribute('data-answer')) {chooseAnswer(Number(b.dataset.answer));return;}
    if (b.hasAttribute('data-next')) {nextStep();return;}
    if (b.hasAttribute('data-speak')) {speak();return;}
    if (b.hasAttribute('data-replay')) {if(session) startWorld(session.world);return;}
    if (b.hasAttribute('data-back-worlds')) {changeScreen('worlds');return;}
    if (b.hasAttribute('data-go')) {changeScreen(b.dataset.go);return;}
    if (b.hasAttribute('data-scroll')) {document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if (b.hasAttribute('data-clear')) {
      if(confirm('Удалить всю историю игр на этом устройстве? Отменить это действие нельзя.')) {
        results=[];storage.del(STORAGE_KEY);notify('История удалена');render();
      }
      return;
    }
    if(b.hasAttribute('data-install')) {
      if(installPrompt) {const p=installPrompt;installPrompt=null;p.prompt();p.userChoice.then(choice=>notify(choice.outcome==='accepted'?'Приложение добавлено!':'Можно установить приложение позже.'));}
      else notify('На iPad и iPhone: Safari → Поделиться → На экран Домой.');
    }
  });
  document.querySelector('.topbar').addEventListener('click', e => {const b=e.target.closest('[data-go]');if(b)changeScreen(b.dataset.go);});
  function networkUpdate() {
    const off=!navigator.onLine;
    const el=document.querySelector('#networkStatus');
    el.classList.toggle('offline',off);
    el.querySelector('.network-label').textContent=off?'Офлайн':readyForOffline?'Офлайн готов':'В сети';
    el.title=off?'Нет соединения. Сохранённые игры доступны офлайн.':readyForOffline?'Файлы сохранены для офлайн-работы':'Есть интернет';
  }
  addEventListener('online',networkUpdate);addEventListener('offline',networkUpdate);
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
  addEventListener('pagehide',()=>{try{speechSynthesis.cancel();}catch{}});
  networkUpdate();render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{readyForOffline=true;networkUpdate();}).catch(err=>console.warn('Офлайн-режим не активирован:',err)));
  }
})();
