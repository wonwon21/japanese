'use strict';

// ── 정적 데이터 로드 (GitHub API·토큰 불필요) ──────────────────────────────
// 사이트는 읽기 전용. 방문자의 학습 기록은 각자 브라우저 localStorage에만 저장됨.

const VOCAB_FILES = [
  'data/vocab_m1.json', 'data/vocab_m2.json', 'data/vocab_m3.json',
  'data/vocab_m4.json', 'data/vocab_m5.json', 'data/vocab_m6.json',
];
const GRAMMAR_FILES = { n5: 'data/grammar_n5.json', n4: 'data/grammar_n4.json', n3: 'data/grammar_n3.json' };

const S = {
  madi: null,          // [{id,title,words}]
  grammar: {},         // {n5:{...},n4:{...},n3:{...}}
  gLevel: 'n5',
  // quiz session
  quizMadi: null, qq: [], qi: 0, qFlipped: false, qResults: [],
  // kana session
  kq: [], ki: 0, kFlipped: false,
};

async function fetchJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} 로드 실패 (${r.status})`);
  return r.json();
}

async function loadVocab() {
  if (!S.madi) S.madi = await Promise.all(VOCAB_FILES.map(fetchJSON));
  return S.madi;
}

async function loadGrammar(level) {
  if (!S.grammar[level]) S.grammar[level] = await fetchJSON(GRAMMAR_FILES[level]);
  return S.grammar[level];
}

// ── localStorage (방문자 개인 기록 — 사이트 내용과 무관) ────────────────────
function lsGet(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode 등 */ }
}

// ── 가나 데이터 (가타카나) ─────────────────────────────────────────────────
const KATAKANA = [
  {c:'ア',r:'a'},{c:'イ',r:'i'},{c:'ウ',r:'u'},{c:'エ',r:'e'},{c:'オ',r:'o'},
  {c:'カ',r:'ka'},{c:'キ',r:'ki'},{c:'ク',r:'ku'},{c:'ケ',r:'ke'},{c:'コ',r:'ko'},
  {c:'サ',r:'sa'},{c:'シ',r:'shi'},{c:'ス',r:'su'},{c:'セ',r:'se'},{c:'ソ',r:'so'},
  {c:'タ',r:'ta'},{c:'チ',r:'chi'},{c:'ツ',r:'tsu'},{c:'テ',r:'te'},{c:'ト',r:'to'},
  {c:'ナ',r:'na'},{c:'ニ',r:'ni'},{c:'ヌ',r:'nu'},{c:'ネ',r:'ne'},{c:'ノ',r:'no'},
  {c:'ハ',r:'ha'},{c:'ヒ',r:'hi'},{c:'フ',r:'fu'},{c:'ヘ',r:'he'},{c:'ホ',r:'ho'},
  {c:'マ',r:'ma'},{c:'ミ',r:'mi'},{c:'ム',r:'mu'},{c:'メ',r:'me'},{c:'モ',r:'mo'},
  {c:'ヤ',r:'ya'},{c:'ユ',r:'yu'},{c:'ヨ',r:'yo'},
  {c:'ラ',r:'ra'},{c:'リ',r:'ri'},{c:'ル',r:'ru'},{c:'レ',r:'re'},{c:'ロ',r:'ro'},
  {c:'ワ',r:'wa'},{c:'ヲ',r:'wo'},{c:'ン',r:'n'},
];

// ── Router ────────────────────────────────────────────────────────────────
function route() {
  const h = window.location.hash.slice(1);
  return h || '/';
}
function go(path) { window.location.hash = path; }
window.go = go;
window.addEventListener('hashchange', render);

async function render() {
  const r = route();
  setActiveNav(r);
  paint('<div class="loading">로딩 중...</div>');

  try {
    let html;
    if      (r === '/')             html = await homePage();
    else if (r === '/kana')         html = kanaStart();
    else if (r === '/vocab')        html = await vocabPage();
    else if (r.startsWith('/vocab/')) html = await madiPage(r.split('/')[2]);
    else if (r.startsWith('/quiz/'))  html = await quizStart(r.split('/')[2]);
    else if (r === '/grammar')      html = await grammarPage();
    else if (r === '/curriculum')   html = curriculumPage();
    else if (r === '/music')        html = musicPage();
    else                            html = '<p>페이지를 찾을 수 없습니다.</p>';
    paint(html);
    bind(r);
  } catch (e) {
    paint(`<div class="alert alert-error">오류: ${escHtml(e.message)}</div>`);
  }
}

function paint(html) { document.getElementById('content').innerHTML = html; }

function setActiveNav(r) {
  const top = '/' + (r.split('/')[1] || '');
  const map = { '/quiz': '/vocab' };
  const active = map[top] || (top === '/' ? '/' : top);
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === active || el.dataset.route === r);
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── 홈 ────────────────────────────────────────────────────────────────────
async function homePage() {
  const madi = await loadVocab();
  const totalWords = madi.reduce((s, m) => s + m.words.length, 0);

  const madiCards = madi.map(m => {
    const best = lsGet(`quiz_best_${m.id}`, null);
    return `
<div class="stat-card" style="cursor:pointer" onclick="go('/vocab/${m.id}')">
  <div class="stat-num" style="font-size:22px">${escHtml(m.title.split('—')[0].trim())}</div>
  <div class="stat-label">${escHtml(m.title.split('—')[1] ? m.title.split('—')[1].trim() : '')} · ${m.words.length}단어</div>
  ${best !== null ? `<div class="stat-label" style="color:var(--success)">최고 기록 ${best}%</div>` : ''}
</div>`;
  }).join('');

  return `
<h1 class="page-title">🏠 日本語 학습</h1>
<div class="alert alert-info" style="margin-bottom:24px">
  누구나 바로 이용할 수 있는 일본어 학습 사이트입니다. 로그인·설정 필요 없음.<br>
  퀴즈 기록은 <strong>내 브라우저에만</strong> 저장되고, 다른 사람에게 영향을 주지 않아요.
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-num">${totalWords}</div>
    <div class="stat-label">총 단어</div>
  </div>
  ${madiCards}
</div>

<div style="color:var(--dim);font-size:13px;margin-bottom:10px">빠른 이동</div>
<div class="quick-grid">
  <button class="btn btn-secondary" onclick="go('/kana')">ア 가나 워밍업</button>
  <button class="btn btn-secondary" onclick="go('/vocab')">📖 단어장</button>
  <button class="btn btn-secondary" onclick="go('/grammar')">📝 문법 (N5~N3)</button>
  <button class="btn btn-secondary" onclick="go('/curriculum')">📋 커리큘럼</button>
</div>`;
}

// ── 단어장: 마디 목록 ─────────────────────────────────────────────────────
async function vocabPage() {
  const madi = await loadVocab();
  return `
<h1 class="page-title">📖 단어장</h1>
<p style="color:var(--dim);margin-bottom:20px">마디를 선택하면 단어 목록과 퀴즈를 볼 수 있어요.</p>
<ul class="file-list">
  ${madi.map(m => `
    <li class="file-item" data-madi="${m.id}">
      <span class="file-name">${escHtml(m.title)} <span style="color:var(--dim);font-size:13px">· ${m.words.length}단어</span></span>
      <span class="file-arrow">→</span>
    </li>`).join('')}
</ul>`;
}

// ── 단어장: 마디 상세 ─────────────────────────────────────────────────────
async function madiPage(id) {
  const madi = await loadVocab();
  const m = madi.find(x => x.id === id);
  if (!m) return '<div class="alert alert-error">마디를 찾을 수 없습니다.</div>';

  const best = lsGet(`quiz_best_${m.id}`, null);

  return `
<button class="back-btn" onclick="go('/vocab')">← 단어장으로</button>
<h1 class="page-title">${escHtml(m.title)}</h1>
<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
  <button class="btn btn-primary" onclick="go('/quiz/${m.id}')">🃏 이 마디 퀴즈 (${m.words.length}문제)</button>
  ${best !== null ? `<span class="badge badge-ok">내 최고 기록 ${best}%</span>` : ''}
</div>
<input class="search-bar" id="vsearch" placeholder="검색 (한국어, 일본어, 로마자)…" autocomplete="off">
<div id="vtable">${wordTableHtml(m.words)}</div>`;
}

function wordTableHtml(words) {
  if (!words.length) return '<div class="alert alert-info">단어가 없습니다.</div>';
  return `
<table class="vocab-table">
  <thead><tr>
    <th>단어</th><th>읽기</th><th>발음</th><th>뜻</th><th></th>
  </tr></thead>
  <tbody>
  ${words.map((w, i) => `
    <tr class="word-row" data-i="${i}" style="cursor:pointer">
      <td class="kanji-cell">${escHtml(w.kanji || w.kana)}</td>
      <td class="kana-cell">${escHtml(w.kana)}</td>
      <td style="color:var(--accent);font-size:14px">${escHtml(w.romaji)}</td>
      <td>${escHtml(w.ko)}</td>
      <td style="color:var(--dim);font-size:12px">예문 ▾</td>
    </tr>
    <tr class="ex-row" data-ex="${i}" style="display:none">
      <td colspan="5" style="background:var(--surface2);padding:14px 18px">
        ${w.ex.map(e => `
          <div style="margin-bottom:8px">
            <div style="font-size:15px">${escHtml(e.jp)}</div>
            <div style="color:var(--dim);font-size:13px">${escHtml(e.ko)}</div>
          </div>`).join('')}
      </td>
    </tr>`).join('')}
  </tbody>
</table>`;
}

// ── 퀴즈 (마디별) ─────────────────────────────────────────────────────────
async function quizStart(id) {
  const madi = await loadVocab();
  const m = madi.find(x => x.id === id);
  if (!m) return '<div class="alert alert-error">마디를 찾을 수 없습니다.</div>';

  S.quizMadi = m;
  S.qq = [...m.words].sort(() => Math.random() - 0.5);
  S.qi = 0; S.qResults = []; S.qFlipped = false;
  return quizCardHtml();
}

function quizCardHtml() {
  const m = S.quizMadi;
  if (S.qi >= S.qq.length) return quizDoneHtml();

  const w   = S.qq[S.qi];
  const pct = Math.round(S.qi / S.qq.length * 100);

  return `
<button class="back-btn" onclick="go('/vocab/${m.id}')">← ${escHtml(m.title)}</button>
<h1 class="page-title">🃏 ${escHtml(m.title.split('—')[0].trim())} 퀴즈</h1>
<div class="progress-text">${S.qi + 1} / ${S.qq.length}</div>
<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>

<div class="flashcard-wrap">
  <div class="flashcard${S.qFlipped ? ' flipped' : ''}" id="fc">
    <div class="card-face">
      <div class="card-hint">뜻</div>
      <div class="card-meaning">${escHtml(w.ko)}</div>
      <div class="card-tap">카드를 클릭해서 뒤집기</div>
    </div>
    <div class="card-face card-back">
      <div class="card-word">${escHtml(w.kanji || w.kana)}</div>
      ${w.kanji ? `<div class="card-reading">${escHtml(w.kana)}</div>` : ''}
      <div style="color:var(--accent);font-size:16px;margin-top:4px">${escHtml(w.romaji)}</div>
      ${w.ex[0] ? `<div class="card-example">${escHtml(w.ex[0].jp)}<br>
        <span style="color:var(--dim)">${escHtml(w.ex[0].ko)}</span></div>` : ''}
    </div>
  </div>
</div>

${S.qFlipped ? `
<div class="review-btns">
  <button class="btn btn-wrong"   id="q-wrong">✗ 몰랐어</button>
  <button class="btn btn-correct" id="q-right">✓ 알았어</button>
</div>` : `
<div style="text-align:center">
  <button class="btn btn-secondary" id="q-flip" style="min-width:160px">뒤집기 👆</button>
</div>`}`;
}

function quizDoneHtml() {
  const m = S.quizMadi;
  const correct = S.qResults.filter(Boolean).length;
  const total   = S.qResults.length;
  const pct     = total ? Math.round(correct / total * 100) : 0;
  const emoji   = pct >= 80 ? '🎊' : pct >= 60 ? '👍' : '💪';

  // 최고 기록 갱신 (내 브라우저에만 저장)
  const prev = lsGet(`quiz_best_${m.id}`, 0);
  if (pct > prev) lsSet(`quiz_best_${m.id}`, pct);

  return `
<h1 class="page-title">🃏 퀴즈 완료</h1>
<div class="completion">
  <div class="completion-emoji">${emoji}</div>
  <div class="completion-title">${escHtml(m.title)}</div>
  <div class="completion-sub">${total}개 중 ${correct}개 정답 (${pct}%)${pct > prev ? ' · 최고 기록 갱신!' : ''}</div>
  <div class="completion-btns">
    <button class="btn btn-secondary" id="q-retrywrong">틀린 것만 다시</button>
    <button class="btn btn-secondary" onclick="go('/quiz/${m.id}')">처음부터 다시</button>
    <button class="btn btn-primary"   onclick="go('/vocab/${m.id}')">단어 목록으로</button>
  </div>
</div>`;
}

// ── 가나 워밍업 ───────────────────────────────────────────────────────────
function kanaStart() {
  const weakSet = new Set(lsGet('kana_weak', []));
  const weak = KATAKANA.filter(k => weakSet.has(k.c));
  const rest = KATAKANA.filter(k => !weakSet.has(k.c)).sort(() => Math.random() - 0.5);
  S.kq = [...weak, ...rest];
  S.ki = 0; S.kFlipped = false;
  return kanaCardHtml();
}

function kanaCardHtml() {
  if (S.ki >= S.kq.length) {
    return `
<h1 class="page-title">ア 가나 워밍업</h1>
<div class="completion">
  <div class="completion-emoji">✨</div>
  <div class="completion-title">워밍업 완료!</div>
  <div class="completion-sub">${S.kq.length}개 가나 연습했어요.</div>
  <div class="completion-btns">
    <button class="btn btn-secondary" id="k-restart">다시 하기</button>
    <button class="btn btn-primary"   onclick="go('/')">홈으로</button>
  </div>
</div>`;
  }

  const k   = S.kq[S.ki];
  const pct = Math.round(S.ki / S.kq.length * 100);

  return `
<h1 class="page-title">ア 가나 워밍업</h1>
<div class="progress-text">${S.ki + 1} / ${S.kq.length}</div>
<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>

<div class="flashcard-wrap">
  <div class="flashcard${S.kFlipped ? ' flipped' : ''}" id="kfc">
    <div class="card-face">
      <div class="card-hint">이 가나의 발음은?</div>
      <div class="card-word" style="font-size:90px;line-height:1">${k.c}</div>
      <div class="card-tap">클릭해서 확인</div>
    </div>
    <div class="card-face card-back">
      <div class="card-word" style="font-size:90px;line-height:1">${k.c}</div>
      <div class="card-reading" style="font-size:30px;margin-top:12px">${k.r}</div>
    </div>
  </div>
</div>

${S.kFlipped ? `
<div class="review-btns">
  <button class="btn btn-wrong"   id="k-wrong">✗ 헷갈렸어</button>
  <button class="btn btn-correct" id="k-right">✓ 알았어</button>
</div>` : `
<div style="text-align:center">
  <button class="btn btn-secondary" id="k-flip" style="min-width:160px">확인 👆</button>
</div>`}`;
}

// ── 문법 (N5 / N4 / N3) ──────────────────────────────────────────────────
async function grammarPage() {
  const g = await loadGrammar(S.gLevel);
  return `
<h1 class="page-title">📝 문법</h1>
<div class="mode-tabs" style="margin-bottom:20px">
  ${['n5','n4','n3'].map(lv => `
    <button class="mode-tab${S.gLevel===lv?' active':''}" data-glevel="${lv}">${lv.toUpperCase()}</button>
  `).join('')}
</div>
<p style="color:var(--dim);margin-bottom:20px">${escHtml(g.title)} · ${g.items.length}개 문형</p>
${g.items.map((c, i) => `
<div class="grammar-card">
  <div class="grammar-pattern">${i + 1}. ${escHtml(c.pattern)}</div>
  <div class="grammar-ko">${escHtml(c.ko)}</div>
  <div class="grammar-desc">접속: ${escHtml(c.conn)}</div>
  ${c.note ? `<div class="grammar-note">⚠️ ${escHtml(c.note)}</div>` : ''}
  <div class="grammar-examples">
    ${(c.ex || []).map(ex => `
      <div class="ex-jp">${escHtml(ex.jp)}</div>
      <div class="ex-ko">${escHtml(ex.ko)}</div>
    `).join('')}
  </div>
</div>`).join('')}`;
}

// ── 커리큘럼 ──────────────────────────────────────────────────────────────
function curriculumPage() {
  return `
<h1 class="page-title">📋 커리큘럼</h1>
<p style="color:var(--dim);margin-bottom:16px">
  2026년 7월 학습 계획표입니다.
  <a href="curriculum.pdf" target="_blank" style="color:var(--accent)">새 창에서 열기 ↗</a> ·
  <a href="curriculum.pdf" download style="color:var(--accent)">다운로드 ⬇</a>
</p>
<div style="background:var(--surface);border:1px solid var(--surface2);border-radius:12px;overflow:hidden">
  <iframe src="curriculum.pdf" style="width:100%;height:80vh;border:none;display:block"
          title="일본어 학습 커리큘럼 PDF"></iframe>
</div>
<div class="alert alert-info" style="margin-top:14px">
  모바일에서 PDF가 안 보이면 위의 '새 창에서 열기'를 눌러 주세요.
</div>`;
}

// ── 음악 추천 ─────────────────────────────────────────────────────────────
const SONGS = [
  { title:'さんぽ', artist:'井上あずみ (となりのトトロ)', level:'N5 완벽', youtube:'さんぽ となりのトトロ',
    why:'짧은 문장, 반복 구조. 歩こう(걷자)、元気(건강함) 등 기초 어휘. 발음 명확.' },
  { title:'となりのトトロ', artist:'井上あずみ', level:'N5', youtube:'となりのトトロ 主題歌',
    why:'毎日、家 등 기초 단어 등장. 반복 가사로 외우기 쉬움.' },
  { title:'犬のおまわりさん', artist:'童謡', level:'N5 완벽', youtube:'犬のおまわりさん 童謡',
    why:'名前、泣く 등 N5 어휘. 매우 느리고 발음 명확.' },
  { title:'アンパンマンのマーチ', artist:'ドリーミング', level:'N5', youtube:'アンパンマンのマーチ 歌詞',
    why:'何のために生まれて — 何(뭐) 등장. 의미 있는 가사, 발음 쉬움.' },
  { title:'ちょうちょ', artist:'童謡', level:'N5 완벽', youtube:'ちょうちょ 童謡',
    why:'가장 짧은 동요 중 하나. 小さい 등 N5 어휘.' },
  { title:'ぞうさん', artist:'童謡', level:'N5 완벽', youtube:'ぞうさん 童謡',
    why:'매우 단순한 구조. 誰(누구)、好き(좋아함) 반복.' },
  { title:'上を向いて歩こう (Sukiyaki)', artist:'坂本九', level:'N4~N5', youtube:'上を向いて歩こう 坂本九',
    why:'세계적으로 유명. 歩く(걷다) 핵심 동사. 멜로디로 먼저 익숙해지기 좋음.' },
  { title:'パプリカ', artist:'Foorin', level:'N4~N5', youtube:'パプリカ Foorin 歌詞',
    why:'현대 어린이 노래. 花が咲く — 花(꽃)、咲く(피다). 발음 정확하고 느림.' },
];

function musicPage() {
  return `
<h1 class="page-title">🎵 음악 추천</h1>
<div class="alert alert-info" style="margin-bottom:24px">
  곡명 아래 검색어를 클릭하면 복사됩니다. YouTube에서 검색해 보세요.
</div>
${SONGS.map(s => `
<div class="grammar-card">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
    <div>
      <div class="grammar-pattern">${escHtml(s.title)}</div>
      <div class="grammar-ko">${escHtml(s.artist)}</div>
    </div>
    <span class="badge ${s.level.includes('완벽') ? 'badge-ok' : 'badge-due'}">${escHtml(s.level)}</span>
  </div>
  <div class="grammar-desc">${escHtml(s.why)}</div>
  <div style="display:flex;align-items:center;gap:10px">
    <span style="font-size:12px;color:var(--dim)">YouTube 검색어:</span>
    <code style="background:var(--surface2);padding:4px 10px;border-radius:6px;font-size:13px;cursor:pointer;user-select:all"
          onclick="navigator.clipboard.writeText(this.dataset.q).then(()=>{const o=this.textContent;this.textContent='✓ 복사됨';setTimeout(()=>this.textContent=o,1500)}).catch(()=>{})"
          data-q="${escHtml(s.youtube)}">${escHtml(s.youtube)}</code>
  </div>
</div>`).join('')}`;
}

// ── Event binding ─────────────────────────────────────────────────────────
function bind(r) {
  if (r === '/kana')                 bindKana();
  if (r === '/vocab')                bindVocabList();
  if (r.startsWith('/vocab/'))       bindMadi();
  if (r.startsWith('/quiz/'))        bindQuiz();
  if (r === '/grammar')              bindGrammar();
}

function on(id, ev, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(ev, fn);
}

// 단어장 목록
function bindVocabList() {
  document.querySelectorAll('.file-item[data-madi]').forEach(el => {
    el.addEventListener('click', () => go('/vocab/' + el.dataset.madi));
  });
}

// 마디 상세: 예문 토글 + 검색
function bindMadi() {
  const attachRowToggle = () => {
    document.querySelectorAll('.word-row').forEach(row => {
      row.addEventListener('click', () => {
        const ex = document.querySelector(`.ex-row[data-ex="${row.dataset.i}"]`);
        if (ex) ex.style.display = ex.style.display === 'none' ? '' : 'none';
      });
    });
  };
  attachRowToggle();

  const inp = document.getElementById('vsearch');
  if (!inp) return;
  const id = route().split('/')[2];
  const m = S.madi.find(x => x.id === id);
  inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase();
    const words = q
      ? m.words.filter(w =>
          (w.kanji || '').toLowerCase().includes(q) ||
          w.kana.includes(q) ||
          w.romaji.toLowerCase().includes(q) ||
          w.ko.toLowerCase().includes(q))
      : m.words;
    document.getElementById('vtable').innerHTML = wordTableHtml(words);
    attachRowToggle();
  });
}

// 퀴즈
function bindQuiz() {
  const fc = document.getElementById('fc');

  const flip = () => {
    if (S.qFlipped) return;
    S.qFlipped = true;
    paint(quizCardHtml());
    bindQuiz();
  };

  if (fc) fc.addEventListener('click', flip);
  on('q-flip', 'click', flip);

  const answer = (correct) => {
    S.qResults.push(correct);
    S.qi++;
    S.qFlipped = false;
    paint(quizCardHtml());
    bindQuiz();
  };
  on('q-right', 'click', () => answer(true));
  on('q-wrong', 'click', () => answer(false));

  on('q-retrywrong', 'click', () => {
    const wrongs = S.qq.filter((_, i) => !S.qResults[i]);
    if (!wrongs.length) { go('/vocab/' + S.quizMadi.id); return; }
    S.qq = wrongs; S.qi = 0; S.qResults = []; S.qFlipped = false;
    paint(quizCardHtml());
    bindQuiz();
  });
}

// 가나
function bindKana() {
  const kfc = document.getElementById('kfc');

  const flip = () => {
    if (S.kFlipped) return;
    S.kFlipped = true;
    paint(kanaCardHtml());
    bindKana();
  };

  if (kfc) kfc.addEventListener('click', flip);
  on('k-flip',  'click', flip);

  const answer = (correct) => {
    const k = S.kq[S.ki];
    const weak = new Set(lsGet('kana_weak', []));
    if (correct) weak.delete(k.c); else weak.add(k.c);
    lsSet('kana_weak', [...weak]);
    S.ki++;
    S.kFlipped = false;
    paint(kanaCardHtml());
    bindKana();
  };
  on('k-right', 'click', () => answer(true));
  on('k-wrong', 'click', () => answer(false));

  on('k-restart', 'click', () => {
    paint(kanaStart());
    bindKana();
  });
}

// 문법 레벨 탭
function bindGrammar() {
  document.querySelectorAll('.mode-tab[data-glevel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      S.gLevel = btn.dataset.glevel;
      paint('<div class="loading">로딩 중...</div>');
      paint(await grammarPage());
      bindGrammar();
    });
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) window.location.hash = '/';
  render();
});
