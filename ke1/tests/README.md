# Practice regression checks

No test creates a real account, sends email, or writes to production Firestore.

Run the deterministic bank/migration/merge checks with Node:

```sh
node --test ke1/tests/progress.test.cjs
```

Serve the repository locally, then run the browser regression runner in another terminal:

```sh
python3 -m http.server 8769 --bind 127.0.0.1
python3 ke1/tests/browser-regression.py
```

The browser runner uses Playwright CLI through `npx` (Node/npm required), with a separate
`ke1-regression` browser session. `PWCLI` can point to an installed wrapper; `KE1_TEST_URL`
and `KE1_TEST_OUTPUT` override the local URL and artifact directory. It intercepts the
Firebase SDK with `firebase-fixture.js`: account events, server reads, incremental
transaction writes and snapshot updates happen only in memory. It also exercises blocked
SDK/image requests, local-storage failure, slow reads, failed writes, verification retry,
review, keyboard navigation and responsive layouts.

This is a contract regression suite, not a substitute for Firebase emulator tests or
production end-to-end testing with verified test accounts. Live rules, mail delivery and
real multi-device behavior still require a separate authenticated acceptance check.
