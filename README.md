# 일본어 학습 프로젝트

Claude Code로 운영하는 일일 30분 일본어 학습 루틴.

## 시작 방법

```bash
cd ~/japanese
git pull        # 다른 PC에서 한 학습 내용 받아오기
claude          # Claude Code 실행
```

세션을 시작하면 Claude가 자동으로 `CLAUDE.md`를 읽고 오늘의 학습을 진행합니다.

사용자가 할 일: **"오늘 학습 시작"** 한 마디만 입력.

## 폴더 구조

```
japanese/
├── CLAUDE.md              # Claude가 매 세션 읽는 규칙·프로필·학습 관점
├── progress.md            # 누적 진도 로그
├── README.md              # 이 파일
├── .gitignore
├── srs/                   # 간격 반복 학습 데이터
│   ├── vocab.json
│   ├── grammar.json
│   └── kana_weak.json
├── lessons/               # 일일 세션 기록
│   ├── _template.md
│   └── YYYY-MM-DD.md
└── reference/
    ├── n5_grammar_list.md       # N5 문법 학습 순서
    ├── n5_vocab_topics.md       # N5 단어 주제 순서
    └── sound_correspondence.md  # 한국어↔일본어 한자음 대응 패턴
```

## 일일 30분 구조

| 시간 | 내용 |
|------|------|
| 2분 | 가나 워밍업 (헷갈리는 글자 플래시) |
| 8분 | 어제 단어 SRS 복습 |
| 15분 | 신규 단어 7개 + 문법 1개 |
| 5분 | 짧은 작문/회화 |

## Git 동기화 (두 PC 오갈 때)

### 최초 1회 — PC-A (이 폴더가 있는 곳)
GitHub에 **private** 저장소 생성 후:
```bash
cd ~/japanese
git init
git add -A
git commit -m "Initial setup"
git branch -M main
git remote add origin <GitHub repo URL>
git push -u origin main
```

### 최초 1회 — PC-B (다른 PC)
```bash
cd ~
git clone <GitHub repo URL> japanese
```

### 매번
- 학습 **시작 전**: `git pull`
- 학습 **종료 후**: `git add -A && git commit -m "Day N" && git push`

> 규칙 하나: 한 번에 한 PC에서만 학습. (양쪽 동시 작업 시 충돌)

## 데이터 백업 (선택)

`srs/vocab.json`은 매 세션 Claude가 자동 수정하는 파일입니다.
세션 종료 시 Claude에게 **"srs 폴더 백업해줘"**라고 하면
`srs/backup/YYYY-MM-DD/`에 그날 상태를 복사합니다.
(이 backup 폴더는 .gitignore로 git 추적에서 제외됨 — 로컬 전용 안전망)

## 예상 진도

- N5 문법 약 50개 → 약 50일 (10주)
- N5 단어 약 800개 / 일 7개 → 약 115일 (16주)
- 합산 기준 **약 5~6개월 후 N5 수준** 도달 예상
- 이후 N4 단계 (문법 약 80개 + 단어 약 1500개)로 전환

## 학습 관점 (CLAUDE.md에 반영됨)

1. **한국어의 먼 사투리로 인식** — 어순·조사·존댓말 1:1 대응 활용
2. **음운 대응 법칙** — 한자어는 외우지 말고 받침→가나 변환 규칙으로 추론
3. **어간+어미 매핑** — 동사 활용을 한국어 활용표와 나란히 학습
