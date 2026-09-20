# Sources & Attribution

This document records the full provenance of everything in this repository, in the interest of
transparency and proper credit.

## 1. Questions, answers, and Chinese explanations

The current local bank is derived from the public repository
[`LiuMashiro/Exam-Question-Bank-for-Chinese-Driving-Test-Subject-1-Subject-4`](https://github.com/LiuMashiro/Exam-Question-Bank-for-Chinese-Driving-Test-Subject-1-Subject-4),
revision dated **2026-07-28**. Its README says the data was corrected against the 2025-01-01
公安部令第172号 changes and contains both answer explanations and new-rule markers.

From that source we:
1. Kept `subject == 1` only; the local bank contains 2,545 questions and no subject-4 questions.
2. Normalized question text, options, answer, explanation, difficulty, error rate, and the 2026 new-rule flag.
3. Kept all 787 matching local question images.

The source repository is an unofficial community-maintained dataset. It is not an official
government question-bank release, and “2026-07-28” is the source revision date, not a guarantee
that every question is active in every local examination system.

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
