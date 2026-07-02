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

// ── 가나 데이터 ───────────────────────────────────────────────────────────
const HIRAGANA = [
  {c:'あ',r:'a'},{c:'い',r:'i'},{c:'う',r:'u'},{c:'え',r:'e'},{c:'お',r:'o'},
  {c:'か',r:'ka'},{c:'き',r:'ki'},{c:'く',r:'ku'},{c:'け',r:'ke'},{c:'こ',r:'ko'},
  {c:'さ',r:'sa'},{c:'し',r:'shi'},{c:'す',r:'su'},{c:'せ',r:'se'},{c:'そ',r:'so'},
  {c:'た',r:'ta'},{c:'ち',r:'chi'},{c:'つ',r:'tsu'},{c:'て',r:'te'},{c:'と',r:'to'},
  {c:'な',r:'na'},{c:'に',r:'ni'},{c:'ぬ',r:'nu'},{c:'ね',r:'ne'},{c:'の',r:'no'},
  {c:'は',r:'ha'},{c:'ひ',r:'hi'},{c:'ふ',r:'fu'},{c:'へ',r:'he'},{c:'ほ',r:'ho'},
  {c:'ま',r:'ma'},{c:'み',r:'mi'},{c:'む',r:'mu'},{c:'め',r:'me'},{c:'も',r:'mo'},
  {c:'や',r:'ya'},{c:'ゆ',r:'yu'},{c:'よ',r:'yo'},
  {c:'ら',r:'ra'},{c:'り',r:'ri'},{c:'る',r:'ru'},{c:'れ',r:'re'},{c:'ろ',r:'ro'},
  {c:'わ',r:'wa'},{c:'を',r:'wo'},{c:'ん',r:'n'},
];
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
const KANA_SETS = {
  hira: { name: 'ひらがな', data: HIRAGANA, lsKey: 'kana_weak_hira' },
  kata: { name: 'カタカナ', data: KATAKANA, lsKey: 'kana_weak_kata' },
};

// 각 글자로 시작하는 쉬운 단어 2개 (퀴즈 정답 카드에 표시)
const KANA_WORDS = {
  // ひらがな
  'あ': [{w:'雨(あめ)',ko:'비'},{w:'朝(あさ)',ko:'아침'}],
  'い': [{w:'犬(いぬ)',ko:'개'},{w:'家(いえ)',ko:'집'}],
  'う': [{w:'海(うみ)',ko:'바다'},{w:'歌(うた)',ko:'노래'}],
  'え': [{w:'駅(えき)',ko:'역'},{w:'映画(えいが)',ko:'영화'}],
  'お': [{w:'お金(おかね)',ko:'돈'},{w:'お茶(おちゃ)',ko:'차'}],
  'か': [{w:'傘(かさ)',ko:'우산'},{w:'かばん',ko:'가방'}],
  'き': [{w:'昨日(きのう)',ko:'어제'},{w:'切符(きっぷ)',ko:'표'}],
  'く': [{w:'靴(くつ)',ko:'신발'},{w:'雲(くも)',ko:'구름'}],
  'け': [{w:'今朝(けさ)',ko:'오늘 아침'},{w:'消しゴム(けしゴム)',ko:'지우개'}],
  'こ': [{w:'子供(こども)',ko:'아이'},{w:'言葉(ことば)',ko:'말'}],
  'さ': [{w:'魚(さかな)',ko:'생선'},{w:'桜(さくら)',ko:'벚꽃'}],
  'し': [{w:'新聞(しんぶん)',ko:'신문'},{w:'仕事(しごと)',ko:'일'}],
  'す': [{w:'寿司(すし)',ko:'초밥'},{w:'すいか',ko:'수박'}],
  'せ': [{w:'先生(せんせい)',ko:'선생님'},{w:'世界(せかい)',ko:'세계'}],
  'そ': [{w:'空(そら)',ko:'하늘'},{w:'そば',ko:'메밀국수'}],
  'た': [{w:'卵(たまご)',ko:'달걀'},{w:'食べ物(たべもの)',ko:'음식'}],
  'ち': [{w:'地図(ちず)',ko:'지도'},{w:'父(ちち)',ko:'아버지'}],
  'つ': [{w:'机(つくえ)',ko:'책상'},{w:'月(つき)',ko:'달'}],
  'て': [{w:'手(て)',ko:'손'},{w:'手紙(てがみ)',ko:'편지'}],
  'と': [{w:'時計(とけい)',ko:'시계'},{w:'友達(ともだち)',ko:'친구'}],
  'な': [{w:'夏(なつ)',ko:'여름'},{w:'名前(なまえ)',ko:'이름'}],
  'に': [{w:'肉(にく)',ko:'고기'},{w:'庭(にわ)',ko:'마당'}],
  'ぬ': [{w:'布(ぬの)',ko:'천'},{w:'ぬいぐるみ',ko:'봉제인형'}],
  'ね': [{w:'猫(ねこ)',ko:'고양이'},{w:'値段(ねだん)',ko:'가격'}],
  'の': [{w:'飲み物(のみもの)',ko:'음료'},{w:'のり',ko:'김'}],
  'は': [{w:'花(はな)',ko:'꽃'},{w:'箸(はし)',ko:'젓가락'}],
  'ひ': [{w:'人(ひと)',ko:'사람'},{w:'昼(ひる)',ko:'낮'}],
  'ふ': [{w:'冬(ふゆ)',ko:'겨울'},{w:'船(ふね)',ko:'배'}],
  'へ': [{w:'部屋(へや)',ko:'방'},{w:'下手(へた)',ko:'서투름'}],
  'ほ': [{w:'本(ほん)',ko:'책'},{w:'星(ほし)',ko:'별'}],
  'ま': [{w:'窓(まど)',ko:'창문'},{w:'町(まち)',ko:'동네'}],
  'み': [{w:'水(みず)',ko:'물'},{w:'耳(みみ)',ko:'귀'}],
  'む': [{w:'虫(むし)',ko:'벌레'},{w:'村(むら)',ko:'마을'}],
  'め': [{w:'目(め)',ko:'눈'},{w:'眼鏡(めがね)',ko:'안경'}],
  'も': [{w:'森(もり)',ko:'숲'},{w:'桃(もも)',ko:'복숭아'}],
  'や': [{w:'山(やま)',ko:'산'},{w:'野菜(やさい)',ko:'채소'}],
  'ゆ': [{w:'雪(ゆき)',ko:'눈(雪)'},{w:'夢(ゆめ)',ko:'꿈'}],
  'よ': [{w:'夜(よる)',ko:'밤'},{w:'洋服(ようふく)',ko:'옷'}],
  'ら': [{w:'来年(らいねん)',ko:'내년'},{w:'楽(らく)',ko:'편함'}],
  'り': [{w:'りんご',ko:'사과'},{w:'旅行(りょこう)',ko:'여행'}],
  'る': [{w:'留守(るす)',ko:'부재중'},{w:'留守番(るすばん)',ko:'집 보기'}],
  'れ': [{w:'歴史(れきし)',ko:'역사'},{w:'冷蔵庫(れいぞうこ)',ko:'냉장고'}],
  'ろ': [{w:'廊下(ろうか)',ko:'복도'},{w:'六(ろく)',ko:'6, 여섯'}],
  'わ': [{w:'私(わたし)',ko:'나, 저'},{w:'忘れ物(わすれもの)',ko:'분실물'}],
  'を': [{w:'本を読む(ほんをよむ)',ko:'책을 읽다 — 조사로만 사용'}],
  'ん': [{w:'本(ほん)',ko:'책'},{w:'みかん',ko:'귤'}],
  // カタカナ
  'ア': [{w:'アイス',ko:'아이스크림'},{w:'アニメ',ko:'애니메이션'}],
  'イ': [{w:'インターネット',ko:'인터넷'},{w:'イタリア',ko:'이탈리아'}],
  'ウ': [{w:'ウイルス',ko:'바이러스'},{w:'ウール',ko:'울(양모)'}],
  'エ': [{w:'エアコン',ko:'에어컨'},{w:'エレベーター',ko:'엘리베이터'}],
  'オ': [{w:'オレンジ',ko:'오렌지'},{w:'オートバイ',ko:'오토바이'}],
  'カ': [{w:'カメラ',ko:'카메라'},{w:'カレー',ko:'카레'}],
  'キ': [{w:'キムチ',ko:'김치'},{w:'キッチン',ko:'키친'}],
  'ク': [{w:'クラス',ko:'클래스'},{w:'クリスマス',ko:'크리스마스'}],
  'ケ': [{w:'ケーキ',ko:'케이크'},{w:'ケータイ',ko:'휴대폰'}],
  'コ': [{w:'コーヒー',ko:'커피'},{w:'コンビニ',ko:'편의점'}],
  'サ': [{w:'サッカー',ko:'축구'},{w:'サラダ',ko:'샐러드'}],
  'シ': [{w:'シャワー',ko:'샤워'},{w:'シャツ',ko:'셔츠'}],
  'ス': [{w:'スーパー',ko:'슈퍼'},{w:'スポーツ',ko:'스포츠'}],
  'セ': [{w:'セーター',ko:'스웨터'},{w:'セール',ko:'세일'}],
  'ソ': [{w:'ソファ',ko:'소파'},{w:'ソース',ko:'소스'}],
  'タ': [{w:'タクシー',ko:'택시'},{w:'タオル',ko:'수건'}],
  'チ': [{w:'チーズ',ko:'치즈'},{w:'チケット',ko:'티켓'}],
  'ツ': [{w:'ツアー',ko:'투어'},{w:'ツナ',ko:'참치'}],
  'テ': [{w:'テレビ',ko:'텔레비전'},{w:'テスト',ko:'테스트'}],
  'ト': [{w:'トイレ',ko:'화장실'},{w:'トマト',ko:'토마토'}],
  'ナ': [{w:'ナイフ',ko:'나이프'},{w:'ナンバー',ko:'넘버'}],
  'ニ': [{w:'ニュース',ko:'뉴스'},{w:'ニックネーム',ko:'닉네임'}],
  'ヌ': [{w:'ヌードル',ko:'누들'},{w:'ヌガー',ko:'누가(과자)'}],
  'ネ': [{w:'ネクタイ',ko:'넥타이'},{w:'ネット',ko:'넷, 인터넷'}],
  'ノ': [{w:'ノート',ko:'노트'},{w:'ノック',ko:'노크'}],
  'ハ': [{w:'ハンバーガー',ko:'햄버거'},{w:'ハート',ko:'하트'}],
  'ヒ': [{w:'ヒーター',ko:'히터'},{w:'ヒント',ko:'힌트'}],
  'フ': [{w:'フォーク',ko:'포크'},{w:'フランス',ko:'프랑스'}],
  'ヘ': [{w:'ヘリコプター',ko:'헬리콥터'},{w:'ヘアスタイル',ko:'헤어스타일'}],
  'ホ': [{w:'ホテル',ko:'호텔'},{w:'ホッチキス',ko:'스테이플러'}],
  'マ': [{w:'マスク',ko:'마스크'},{w:'マンション',ko:'맨션'}],
  'ミ': [{w:'ミルク',ko:'밀크'},{w:'ミス',ko:'실수'}],
  'ム': [{w:'ムード',ko:'무드'},{w:'ムービー',ko:'무비'}],
  'メ': [{w:'メール',ko:'메일'},{w:'メニュー',ko:'메뉴'}],
  'モ': [{w:'モデル',ko:'모델'},{w:'モニター',ko:'모니터'}],
  'ヤ': [{w:'ヤクルト',ko:'야쿠르트'},{w:'ヤード',ko:'야드'}],
  'ユ': [{w:'ユーチューブ',ko:'유튜브'},{w:'ユニフォーム',ko:'유니폼'}],
  'ヨ': [{w:'ヨーグルト',ko:'요구르트'},{w:'ヨーロッパ',ko:'유럽'}],
  'ラ': [{w:'ラーメン',ko:'라멘'},{w:'ラジオ',ko:'라디오'}],
  'リ': [{w:'リモコン',ko:'리모컨'},{w:'リボン',ko:'리본'}],
  'ル': [{w:'ルール',ko:'룰, 규칙'},{w:'ルビー',ko:'루비'}],
  'レ': [{w:'レストラン',ko:'레스토랑'},{w:'レモン',ko:'레몬'}],
  'ロ': [{w:'ロボット',ko:'로봇'},{w:'ロシア',ko:'러시아'}],
  'ワ': [{w:'ワイン',ko:'와인'},{w:'ワイシャツ',ko:'와이셔츠'}],
  'ヲ': [{w:'(거의 쓰이지 않음)',ko:'조사 を의 가타카나형'}],
  'ン': [{w:'パン',ko:'빵'},{w:'ラーメン',ko:'라멘'}],
};
const KANA_NO_START = new Set(['ん','ン','を','ヲ']); // 이 글자로 시작하는 단어가 없거나 특수한 경우

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
    else if (r === '/kana')         html = kanaChartPage();
    else if (r === '/kana-quiz')    html = kanaQuizHome();
    else if (r.startsWith('/kana-quiz/')) html = kanaStart(r.split('/')[2]);
    else if (r === '/vocab')        html = await vocabPage();
    else if (r.startsWith('/vocab/')) html = await madiPage(r.split('/')[2]);
    else if (r.startsWith('/quiz/'))  html = await quizStart(r.split('/')[2]);
    else if (r === '/grammar')      html = await grammarPage();
    else if (r === '/curriculum')   html = curriculumPage();
    else if (r === '/music')        html = await musicPage();
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

// ── 오늘의 학습 (2026년 7월 커리큘럼 규칙) ─────────────────────────────────
// N일: 단어 N마디 + 문법 (2N-1)~2N마디 / 29·30일: 문법 복습 / 31일: 전체복습
function todayPlan() {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth() + 1, d = now.getDate();
  const dateStr = `${mo}월 ${d}일 (${'일월화수목금토'[now.getDay()]})`;
  if (y !== 2026 || mo !== 7) return { dateStr, items: null };
  if (d === 31) return { dateStr, items: [{ label: '전체복습 — 단어 + 문법 총정리', link: null }] };
  const items = [];
  items.push({ label: `단어 ${d}마디`, link: d <= 6 ? `/vocab/m${d}` : null, note: d > 6 ? '(사이트 준비 중 — 책으로 학습)' : '' });
  if (d <= 28) items.push({ label: `문법 ${d * 2 - 1}-${d * 2}마디`, link: '/grammar' });
  else items.push({ label: '문법 복습', link: '/grammar' });
  return { dateStr, items };
}

// ── 홈 ────────────────────────────────────────────────────────────────────
async function homePage() {
  const madi = await loadVocab();
  const totalWords = madi.reduce((s, m) => s + m.words.length, 0);
  const plan = todayPlan();

  const madiCards = madi.map(m => {
    const best = lsGet(`quiz_best_${m.id}`, null);
    return `
<div class="stat-card" style="cursor:pointer" onclick="go('/vocab/${m.id}')">
  <div class="stat-num" style="font-size:22px">${escHtml(m.title.split('—')[0].trim())}</div>
  <div class="stat-label">${escHtml(m.title.split('—')[1] ? m.title.split('—')[1].trim() : '')} · ${m.words.length}단어</div>
  ${best !== null ? `<div class="stat-label" style="color:var(--success)">최고 기록 ${best}%</div>` : ''}
</div>`;
  }).join('');

  const planHtml = plan.items ? `
<div style="background:var(--surface);border:2px solid var(--accent);border-radius:12px;padding:20px 24px;margin-bottom:24px">
  <div style="font-weight:700;font-size:16px;margin-bottom:4px">📅 오늘의 학습 — ${plan.dateStr}</div>
  <div style="color:var(--dim);font-size:12px;margin-bottom:12px">7월 N5→N4 완성 플랜 · <a href="#/curriculum" style="color:var(--accent)">전체 달력 보기</a></div>
  ${plan.items.map(it => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:15px">
      <span>✅</span>
      ${it.link ? `<a href="#${it.link}" style="color:var(--accent);font-weight:600">${escHtml(it.label)} →</a>` : `<span style="font-weight:600">${escHtml(it.label)}</span>`}
      ${it.note ? `<span style="color:var(--dim);font-size:12px">${escHtml(it.note)}</span>` : ''}
    </div>`).join('')}
</div>` : `
<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 24px;margin-bottom:24px;color:var(--dim);font-size:14px">
  📅 ${plan.dateStr} — 7월 커리큘럼 기간이 아니에요. <a href="#/curriculum" style="color:var(--accent)">커리큘럼 보기</a>
</div>`;

  return `
<h1 class="page-title">🏠 日本語 학습</h1>
${planHtml}

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-num">${totalWords}</div>
    <div class="stat-label">총 단어</div>
  </div>
  ${madiCards}
</div>

<div style="color:var(--dim);font-size:13px;margin-bottom:10px">빠른 이동</div>
<div class="quick-grid">
  <button class="btn btn-secondary" onclick="go('/kana')">あ 가나 표</button>
  <button class="btn btn-secondary" onclick="go('/kana-quiz')">🃏 가나 퀴즈</button>
  <button class="btn btn-secondary" onclick="go('/vocab')">📖 단어장</button>
  <button class="btn btn-secondary" onclick="go('/grammar')">📝 문법 (N5~N3)</button>
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
        ${w.tip ? `<div style="font-size:13px;color:var(--success);margin-bottom:10px">💡 ${escHtml(w.tip)}</div>` : ''}
        ${w.ex.map(e => `
          <div style="margin-bottom:10px">
            <div style="font-size:15px">${escHtml(e.jp)}</div>
            ${e.rom ? `<div style="color:var(--accent);font-size:12px;font-style:italic">${escHtml(e.rom)}</div>` : ''}
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
      ${w.tip ? `<div style="font-size:12px;color:var(--success);margin-top:6px">💡 ${escHtml(w.tip)}</div>` : ''}
      ${w.ex[0] ? `<div class="card-example">${escHtml(w.ex[0].jp)}${w.ex[0].rom ? `<br><span style="color:var(--accent);font-style:italic;font-size:12px">${escHtml(w.ex[0].rom)}</span>` : ''}<br>
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
function kanaChartHtml(data) {
  // 오십음도 배치: [행 시작 index, 열 위치 목록]
  const layout = [
    { start: 0,  cols: [0,1,2,3,4] },   // あ행
    { start: 5,  cols: [0,1,2,3,4] },   // か행
    { start: 10, cols: [0,1,2,3,4] },   // さ행
    { start: 15, cols: [0,1,2,3,4] },   // た행
    { start: 20, cols: [0,1,2,3,4] },   // な행
    { start: 25, cols: [0,1,2,3,4] },   // は행
    { start: 30, cols: [0,1,2,3,4] },   // ま행
    { start: 35, cols: [0,2,4] },       // や행
    { start: 38, cols: [0,1,2,3,4] },   // ら행
    { start: 43, cols: [0,4] },         // わ행 (わ·を)
    { start: 45, cols: [0] },           // ん
  ];
  const rows = layout.map(row => {
    const cells = Array(5).fill('<td></td>');
    row.cols.forEach((col, i) => {
      const k = data[row.start + i];
      cells[col] = `<td style="text-align:center;padding:8px 4px">
        <div style="font-size:26px">${k.c}</div>
        <div style="font-size:11px;color:var(--dim)">${k.r}</div>
      </td>`;
    });
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
  return `<table class="vocab-table" style="max-width:420px"><tbody>${rows}</tbody></table>`;
}

function kanaChartPage() {
  return `
<h1 class="page-title">あ 가나 표</h1>
<p style="color:var(--dim);margin-bottom:20px">히라가나·가타카나 오십음도입니다. 외웠다 싶으면 <a href="#/kana-quiz" style="color:var(--accent)">가나 퀴즈</a>로 확인해 보세요.</p>

<div style="display:flex;gap:40px;flex-wrap:wrap">
  <div>
    <h2 style="font-size:18px;margin-bottom:10px">ひらがな 히라가나</h2>
    ${kanaChartHtml(HIRAGANA)}
  </div>
  <div>
    <h2 style="font-size:18px;margin-bottom:10px">カタカナ 가타카나</h2>
    ${kanaChartHtml(KATAKANA)}
  </div>
</div>`;
}

function kanaQuizHome() {
  const weakH = lsGet('kana_weak_hira', []).length;
  const weakK = lsGet('kana_weak_kata', []).length;
  return `
<h1 class="page-title">🃏 가나 퀴즈</h1>
<p style="color:var(--dim);margin-bottom:24px">글자를 보고 발음을 맞혀 보세요. 정답 카드에는 그 글자로 시작하는 쉬운 단어 2개가 함께 나와요.<br>헷갈린 글자는 다음 퀴즈에서 먼저 나옵니다.</p>

<div class="stats-grid" style="max-width:560px">
  <div class="stat-card" style="cursor:pointer" onclick="go('/kana-quiz/hira')">
    <div class="stat-num" style="font-size:40px">あ</div>
    <div class="stat-label" style="font-size:14px;margin-top:10px">히라가나 퀴즈 (46자)</div>
    ${weakH ? `<div class="stat-label" style="color:var(--danger)">헷갈린 글자 ${weakH}개</div>` : ''}
  </div>
  <div class="stat-card" style="cursor:pointer" onclick="go('/kana-quiz/kata')">
    <div class="stat-num" style="font-size:40px">ア</div>
    <div class="stat-label" style="font-size:14px;margin-top:10px">가타카나 퀴즈 (46자)</div>
    ${weakK ? `<div class="stat-label" style="color:var(--danger)">헷갈린 글자 ${weakK}개</div>` : ''}
  </div>
</div>
<p style="color:var(--dim);font-size:13px;margin-top:8px">가나가 처음이라면 <a href="#/kana" style="color:var(--accent)">가나 표</a>부터 보는 것을 추천!</p>`;
}

function kanaStart(type) {
  const set = KANA_SETS[type];
  if (!set) return '<div class="alert alert-error">잘못된 경로입니다.</div>';
  S.kanaType = type;
  const weakSet = new Set(lsGet(set.lsKey, []));
  const weak = set.data.filter(k => weakSet.has(k.c));
  const rest = set.data.filter(k => !weakSet.has(k.c)).sort(() => Math.random() - 0.5);
  S.kq = [...weak, ...rest];
  S.ki = 0; S.kFlipped = false;
  return kanaCardHtml();
}

function kanaCardHtml() {
  const set = KANA_SETS[S.kanaType];
  if (S.ki >= S.kq.length) {
    return `
<h1 class="page-title">${set.name} 퀴즈</h1>
<div class="completion">
  <div class="completion-emoji">✨</div>
  <div class="completion-title">퀴즈 완료!</div>
  <div class="completion-sub">${S.kq.length}개 가나 연습했어요.</div>
  <div class="completion-btns">
    <button class="btn btn-secondary" id="k-restart">다시 하기</button>
    <button class="btn btn-secondary" onclick="go('/kana')">가나 표로</button>
    <button class="btn btn-primary"   onclick="go('/kana-quiz')">퀴즈 선택으로</button>
  </div>
</div>`;
  }

  const k   = S.kq[S.ki];
  const pct = Math.round(S.ki / S.kq.length * 100);
  const words = KANA_WORDS[k.c] || [];
  const noStart = KANA_NO_START.has(k.c);

  return `
<button class="back-btn" onclick="go('/kana-quiz')">← 퀴즈 선택으로</button>
<h1 class="page-title">${set.name} 퀴즈</h1>
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
      <div class="card-word" style="font-size:56px;line-height:1">${k.c}</div>
      <div class="card-reading" style="font-size:26px;margin:8px 0 12px">${k.r}</div>
      ${words.length ? `
      <div style="font-size:12px;color:var(--dim);margin-bottom:6px">${noStart ? '이 글자가 들어가는 표현' : '이 글자로 시작하는 단어'}</div>
      ${words.map(w => `<div style="font-size:15px;line-height:1.6">${escHtml(w.w)} — <span style="color:var(--dim)">${escHtml(w.ko)}</span></div>`).join('')}
      ${k.c === 'ん' ? '<div style="font-size:11px;color:var(--dim);margin-top:6px">※ ん으로 시작하는 일본어 단어는 없어요 (시리토리 규칙!)</div>' : ''}
      ` : ''}
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
      ${ex.rom ? `<div style="color:var(--accent);font-size:12px;font-style:italic;margin-bottom:2px">${escHtml(ex.rom)}</div>` : ''}
      <div class="ex-ko">${escHtml(ex.ko)}</div>
    `).join('')}
  </div>
</div>`).join('')}`;
}

// ── 커리큘럼 ──────────────────────────────────────────────────────────────
function curriculumPage() {
  const plan = todayPlan();
  return `
<h1 class="page-title">📋 커리큘럼</h1>
<p style="color:var(--dim);margin-bottom:16px">
  2026년 7월 학습 계획표 · 오늘은 <strong style="color:var(--accent)">${escHtml(plan.dateStr)}</strong>${plan.items ? ` — ${plan.items.map(i => escHtml(i.label)).join(' + ')}` : ''}
  · <a href="curriculum.pdf" download style="color:var(--accent)">PDF 다운로드 ⬇</a>
</p>
<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px">
  <img src="curriculum/page1.png" alt="7월 학습 달력" style="width:100%;display:block">
</div>
<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden">
  <img src="curriculum/page2.png" alt="7월 학습 체크리스트" style="width:100%;display:block">
</div>`;
}

// ── 음악 추천 ─────────────────────────────────────────────────────────────
// vocab: 단어장(6마디)에 실제로 있는 단어 중 가사에 등장하는 것
const SONGS = [
  { title:'家族になろうよ', artist:'福山雅治', level:'N4~N5',
    vocab:['家族','お母さん','お父さん','おじいさん','おばあさん'],
    why:'가족 호칭이 가사에 총출동하는 결혼식 단골 명곡. 1마디(사람·인간관계) 복습에 최적. 느리고 발음 또렷.' },
  { title:'未来へ', artist:'Kiroro', level:'N5',
    vocab:['母','道'],
    why:'"ほら 見て見なさい これがあなたの歩む道" — 母·道가 반복되는 국민 발라드. 한국에서도 리메이크된 명곡(거위의 꿈 아님, 미래로!).' },
  { title:'なごり雪', artist:'イルカ', level:'N4',
    vocab:['駅','君','時計'],
    why:'"汽車を待つ君の横で" — 역·기차 풍경의 전설적 포크 명곡. 5마디(교통) 단어와 딱.' },
  { title:'川の流れのように', artist:'美空ひばり', level:'N4',
    vocab:['道','時代'],
    why:'일본 가요 역사상 최고 명곡 중 하나. "細く長いこの道" — 인생을 길에 비유. 천천히 또박또박.' },
  { title:'世界に一つだけの花', artist:'SMAP', level:'N4~N5',
    vocab:['人','店'],
    why:'"花屋の店先に並んだ" — 店·人 반복. 2000년대 일본 최대 히트곡, 가사 쉽고 메시지 좋음.' },
  { title:'贈る言葉', artist:'海援隊', level:'N4',
    vocab:['言葉'],
    why:'졸업식 국민 명곡. 言葉(3마디 학교)가 제목이자 후렴. 또박또박한 창법.' },
  { title:'TRAIN-TRAIN', artist:'THE BLUE HEARTS', level:'N4',
    vocab:['乗る','走る'],
    why:'"栄光に向かって走る あの列車に乗って行こう" — 5마디(교통) 동사가 후렴에. 일본 록 최고 명곡.' },
  { title:'さんぽ', artist:'井上あずみ (となりのトトロ)', level:'N5 완벽',
    vocab:['道','坂'],
    why:'"坂道 トンネル 草っぱら" — 道·坂 등장. 짧은 문장, 반복 구조, 발음 명확. 입문 1순위.' },
  { title:'上を向いて歩こう (Sukiyaki)', artist:'坂本九', level:'N4~N5',
    vocab:['人'],
    why:'"一人ぼっちの夜" — 빌보드 1위에 오른 유일한 일본어 곡. 세계적 명곡.' },
  { title:'ハナミズキ', artist:'一青窈', level:'N4',
    vocab:['君','人'],
    why:'"君と好きな人が 百年続きますように" — 君·人·好き 반복. 2000년대 대표 발라드 명곡.' },
];

function ytMusicUrl(s) {
  return 'https://music.youtube.com/search?q=' + encodeURIComponent(s.title + ' ' + s.artist);
}

async function musicPage() {
  const madi = await loadVocab();
  const known = new Set();
  madi.forEach(m => m.words.forEach(w => { if (w.kanji) known.add(w.kanji); known.add(w.kana); }));

  return `
<h1 class="page-title">🎵 음악 추천</h1>
<div class="alert alert-info" style="margin-bottom:24px">
  단어장(1~6마디)에 있는 단어가 가사에 나오는 명곡 위주로 골랐어요.<br>
  ▶ 버튼을 누르면 YouTube Music에서 바로 열립니다.
</div>
${SONGS.map(s => {
  const matched = s.vocab.filter(v => known.has(v));
  return `
<div class="grammar-card">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
    <div>
      <div class="grammar-pattern">${escHtml(s.title)}</div>
      <div class="grammar-ko">${escHtml(s.artist)}</div>
    </div>
    <span class="badge ${s.level.includes('완벽') ? 'badge-ok' : 'badge-due'}">${escHtml(s.level)}</span>
  </div>
  <div class="grammar-desc">${escHtml(s.why)}</div>
  ${matched.length ? `<div style="font-size:13px;color:var(--success);margin-bottom:10px">✓ 단어장에 있는 단어: ${matched.map(escHtml).join('、')}</div>` : ''}
  <a class="btn btn-primary" style="text-decoration:none;display:inline-block"
     href="${ytMusicUrl(s)}" target="_blank" rel="noopener">▶ YouTube Music에서 듣기</a>
</div>`;
}).join('')}`;
}

// ── Event binding ─────────────────────────────────────────────────────────
function bind(r) {
  if (r.startsWith('/kana-quiz/'))   bindKana();
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
    const lsKey = KANA_SETS[S.kanaType].lsKey;
    const weak = new Set(lsGet(lsKey, []));
    if (correct) weak.delete(k.c); else weak.add(k.c);
    lsSet(lsKey, [...weak]);
    S.ki++;
    S.kFlipped = false;
    paint(kanaCardHtml());
    bindKana();
  };
  on('k-right', 'click', () => answer(true));
  on('k-wrong', 'click', () => answer(false));

  on('k-restart', 'click', () => {
    paint(kanaStart(S.kanaType));
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
