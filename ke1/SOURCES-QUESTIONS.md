# Sources & Attribution

This document records the full provenance of everything in this repository, in the interest of
transparency and proper credit.

## 1. Questions, answers, and Chinese explanations

The original 2,545-question bank is derived from the public repository
[`LiuMashiro/Exam-Question-Bank-for-Chinese-Driving-Test-Subject-1-Subject-4`](https://github.com/LiuMashiro/Exam-Question-Bank-for-Chinese-Driving-Test-Subject-1-Subject-4),
revision dated **2026-07-28**. Its README says the data was corrected against the 2025-01-01
公安部令第172号 changes and contains both answer explanations and new-rule markers.

From that source we:
1. Kept `subject == 1` only; the original bank contains 2,545 questions and no subject-4 questions.
2. Normalized question text, options, answer, explanation, difficulty, error rate, and the 2026 new-rule flag.
3. Kept all 787 matching local question images.

The source repository is an unofficial community-maintained dataset. Its current `main` revision
was checked on **2026-09-20** (commit `281087d3`) and still reports the 2026-07-28 correction
date. It is not an official government question-bank release, and that date is not a guarantee
that every question is active in every local examination system.

## 1.1 Latest-source audit (2026-09-20)

The Ministry of Public Security does not publish a downloadable complete live Subject 1 question
bank. The current official references we verified are:

- [公安部令第172号（自2025-01-01施行）](https://www.beijing.gov.cn/zhengce/zhengcefagui/qtwj/202412/t20241231_3978134.html)
- [GA 1026-2022《机动车驾驶人考试内容和方法》](https://ywtb.mps.gov.cn/gabzh/portal/stdDetail/309760)
- [公安标准化信息服务平台](https://ywtb.mps.gov.cn/gabzh/portal/xxcx/std?pageNo=2&pageSize=20)

We also checked current public practice sites. One commercial site advertises a 2026-09-19
小车题库 containing 2,125 Subject 1 questions, but it is not an openly licensed downloadable
source. We therefore did not copy or redistribute its content. The 2,545-question bank here is
larger than that advertised count, but remains an unofficial broad study set rather than a claim
to contain the live examination questions.

## 1.2 Supplemental questions added 2026-09-20

The first supplemental batch brought the bank to **2,776 questions**, including **231 additional text-only practice
questions** from the Subject 1 documents in
[TRLLM-Traffic-Rules-Assistant](https://github.com/lindsey-chang/TRLLM-Traffic-Rules-Assistant/tree/2c10e9d1d4051b283cbdfba2b086d2aaa9fe37ed/dataset/md).
That repository carries an MIT licence; its copyright and permission notice is retained in
[licenses/TRLLM-MIT.txt](licenses/TRLLM-MIT.txt). Source revision:
`2c10e9d1d4051b283cbdfba2b086d2aaa9fe37ed` (2024-06-03).

Each added record retains its source question number, pinned source URL, source date, and
addition date. The app labels it **补充练习**. The 2026 addition date does not turn the
underlying 2024 material into an official 2026 examination release.

Import screening:

- Preserved all original records, IDs, and ordering; appended the additions at questions
  **2546–2776**, so existing saved answers and question positions retain their meaning.
- Removed exact normalized-stem duplicates and close wording matches (92% character-sequence
  similarity after candidate retrieval). This does not guarantee unique concepts.
- Required a complete stem, two or four distinct choices, one valid answer, and an explanation.
- Excluded image-dependent questions because the referenced figures were unavailable in the
  source repository; no figures were guessed or substituted.
- Excluded age-rule questions, malformed extractions, and manually identified ambiguous items,
  including electronic-document qualifications and the ON-position ignition statement.
- Checked the relevant points/penalty provisions against
  [公安部令第163号](https://www.beijing.gov.cn/zhengce/zhengcefagui/202204/t20220401_2645851.html),
  driving-licence provisions against
  [公安部令第172号](https://www.beijing.gov.cn/zhengce/zhengcefagui/qtwj/202412/t20241231_3978134.html),
  registration provisions against
  [公安部令第164号](https://jtgl.beijing.gov.cn/jgj/jgxx/flfg/gabgz/11186809/index.html),
  and road-use provisions against the
  [道路交通安全法实施条例](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_92d27a3736be4585af2357930349374c.html).
  Screening is not official validation of every question or confirmation that it appears in
  the current exam pool.

The earlier discovery count of 2,382 represented candidate **wordings**, including older
variants, incomplete image questions, and sources reserving rights to their question content.
It was not a count of ready-to-publish questions. Those other collections were not imported.
Import counts and explicit manual exclusions are recorded in
[data/supplement-import-audit.json](data/supplement-import-audit.json).

## 1.3 Reviewed answer-only additions, 2026-09-20

The second supplemental batch brought the bank to **2,849 questions**, including **304 supplemental questions**.
This second batch adds **73 edited text-only practice questions** at positions
**2777–2849**, preserving all previous records, IDs, and positions.
These questions remain available by jumping to question 2777.

We reviewed all **176 distinct unmatched stems** from TRLLM's
[answer-only Subject 1 JSON](https://github.com/lindsey-chang/TRLLM-Traffic-Rules-Assistant/blob/2c10e9d1d4051b283cbdfba2b086d2aaa9fe37ed/dataset/json/struc_json/course1_without_exp.json).
The same retained MIT notice applies. These are **edited supplemental practice**,
not verbatim exam questions or a certified current exam pool.

- Repaired broken sentences, OCR mistakes, choice labels, and obsolete terminology.
- Authored an explanation for every retained question; the upstream collection had no useful explanations.
- Corrected applicable age, licence, electronic inspection-certificate, and traffic-point rules
  against the official sources above. Added vehicle/road/injury scope where needed.
- Converted suitable multiple-answer questions into unambiguous single-choice or judgment questions.
- Excluded **103** candidates: duplicates/near-duplicates after correction, missing-image questions,
  and ambiguous, vehicle-specific, legacy, or otherwise insufficiently supported items.
- Applied normalized exact and 92% near-stem duplicate screening; shared learning concepts can remain.
- Recorded pinned source URL, source row, review date, adaptation flag, and relevant official
  reference URLs on each added record. General driving explanations are editorial guidance;
  not every practical statement has an independent official reference.

Additional references include the
[2021 Road Traffic Safety Law](https://jtgl.beijing.gov.cn/jgj/jgxx/flfg/fl/205308/index.html),
[electronic inspection certificates](https://www.cac.gov.cn/2020-04/23/c_1589192367815895.htm),
[mortgaged-vehicle transfer guidance](https://jtgl.beijing.gov.cn/jgj/93950/jwgk/jdcgl/120170/index.html),
and [wet-road rear-wheel skid guidance](https://jtgl.beijing.gov.cn/jgj/jgxx/94246/95332/162081/index.html).
The complete 176-candidate disposition log, including corrections and duplicate matches, is in
[data/answer-only-import-audit.json](data/answer-only-import-audit.json).
This review covers the new batch; it does not constitute a fresh audit of the existing bank.

## 1.4 Original coverage practice, 2026-09-20

The bank now contains **2,909 questions**, including **364 supplemental questions**.
This batch adds **60 independently authored practice questions** at positions
**2850–2909**, with answers, explanations, topic tags, official reference URLs and
article-level legal bases. Earlier records and question positions are unchanged.
In the deduplicated practice interface, jump to **2848** to start this batch; its displayed range is **2848–2907**.

These questions were written from public legal rules and official guidance. No
proprietary question collection was used as drafting input or bulk paraphrased.
They are labelled **原创练习**, not represented as official examination questions.

Coverage includes:

| Topic | Added questions |
| --- | ---: |
| Updated age limits and licence extensions | 8 |
| Electronic credentials and paper-document exceptions | 6 |
| Points, reductions, and full-points procedures | 12 |
| Examinations and driving qualifications | 12 |
| Junctions, meeting traffic, and right of way | 9 |
| Highway scenarios and emergencies | 8 |
| Parking, lighting, and driver attention | 5 |

The existing bank had no explicit 63-year age-rule or electronic-driving-licence
questions. Other additions apply existing rules to scenarios or distinguish commonly
confused exceptions; shared concepts are intentional. Exact normalized duplicates and
close wording matches were screened, but this is not a claim that all concepts are new.

Sources are the licence, points, Road Traffic Safety Law and implementing-regulation
links above, plus the official
[electronic driving licence guidance, 2026-08-14](https://jtgl.beijing.gov.cn/jgj/qaknowledge/325750668/325750918/325731300/744095129/index.html).
The [coverage audit](data/original-coverage-audit.json) lists the topic and legal basis
for each question. This expands practice coverage; it does not guarantee complete
coverage of the current official exam pool or revalidate all earlier questions.

## 2. Images

The dataset references each image question by a URL on its image CDN
(`app.static.public.chetailian.com`). The 787 Subject 1 images were retrieved from those URLs and
are stored here under `images/`, named by their question `id`. They are the original exam figures
(traffic signs, signal scenes, and illustrated road situations).

## 3. App behavior

The local app displays the Chinese question, options, answer, explanation, and any local image.
It does not claim that the question wording is an official live exam dump.

## 4. Background references (not redistributed here)

General facts about the exam format (100 questions, 45 minutes, 90/100 pass mark, multi-language
terminal support) were cross-checked against publicly available guides, including:

- Wikipedia: "Chinese driving test"
- chinesedrivingtest.com (an existing English practice site)

No content from those references is copied into this repository.

## 5. Official status

There is **no officially published government question bank**. The Ministry of Public Security
maintains the exam centrally but does not release the list. Consequently:

- No one, including this project, can authoritatively separate "currently active" questions from
  retired ones.
- This set should be treated as a **broad superset for study**, not as the exact live exam.

## 6. Disclaimer

This repository is an independent, unofficial, educational resource. It is not affiliated with,
endorsed by, or verified by the Ministry of Public Security (公安部), any Vehicle Management Office
(车管所), 驾考宝典, or any other authority or commercial entity. Use it to learn the rules; confirm
specifics against a current official-partnered source before your exam.

## Practice display and saved-progress compatibility (2026-09-20)

The raw bank now contains 2,909 records; all earlier 2,849 records are preserved. The practice interface groups exact matches of
question text, options, image and answer: original positions 546/1446 and 1424/1763.
It therefore displays 2,907 distinct practice questions, including all 364 supplemental
exercises. Every original question ID remains mapped to its displayed question so that
existing answer history and old saved positions can be migrated without deleting records.
