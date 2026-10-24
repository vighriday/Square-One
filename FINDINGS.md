# Frozen frontend findings

The five frozen files are unchanged. Line numbers refer to those supplied files. Backend workarounds do not change their bytes.

| File and line | What happens | Suggested frontend fix / current workaround |
| --- | --- | --- |
| `public/sq-data.js:20`, `public/sq-game.js:57` | Sample room 1 offers `print("Asha")` and `Print("Asha")`. The exact validator compares answers case-insensitively and rejects the room. The sample still plays because preloaded sample content bypasses validation. | Change one distractor in a future frontend revision, or deliberately revise the validator's policy. No change made. The unit test asserts this exception and validates rooms 2–20. |
