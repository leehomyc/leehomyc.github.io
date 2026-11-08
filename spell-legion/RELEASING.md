# Release history

The version button before Contact opens `releases.json`. Versions use `0.1.N` with a monotonically increasing release number.

Before each publish, run `node spell-legion/tools/releases.mjs .` to retain all previous records. Add the next record to `spell-legion/releases.json` with a new version, `revision: null`, the exact planned commit subject, date, and concise `zh`, `en`, `ja`, `ko` notes. Traditional Chinese is converted from `zh`.

The Pages build fills in that record's revision and actual commit date. If a future app commit has no handwritten record, the build still records it automatically using its commit subject. Unrelated academic-site commits do not create game versions. Keep the checked-in history so builds from source archives or shallow checkouts preserve older records. The initial backfill covers November 7–8, 2026; it records changes as they were released, including behavior later superseded.
