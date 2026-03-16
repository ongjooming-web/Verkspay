# Blocked Skills Report

**System:** Windows 10 (DESKTOP-VEPL662)  
**Date:** March 16, 2026

---

## Blocked by Platform (macOS-only)

These skills are unavailable on Windows and require macOS:

| Skill | Reason | Fix |
|-------|--------|-----|
| apple-notes | Requires `memo` CLI (macOS only) | N/A — macOS only, skip on Windows |
| apple-reminders | Requires Apple Reminders API (macOS) | N/A — macOS only, skip on Windows |
| bear-notes | Requires Bear Notes app (macOS only) | N/A — macOS only, skip on Windows |
| imsg | Requires iMessage/macOS integration | N/A — macOS only, skip on Windows |
| model-usage | Requires macOS API calls | N/A — macOS only, skip on Windows |
| peekaboo | Requires macOS screen capture | N/A — macOS only, skip on Windows |
| sherpa-onnx-tts | Requires macOS build of ONNX | Consider: Use Bankr TTS instead |
| things-mac | Requires Things 3 app (macOS only) | N/A — macOS only, skip on Windows |

**Total:** 8 skills (acceptable — platform mismatch)

---

## Blocked by Missing Dependencies

These skills require CLI tools not installed on Windows:

| Skill | Requires | Status | Fix |
|-------|----------|--------|-----|
| tmux | tmux terminal multiplexer | ❌ Not installed | Install via `choco install tmux` or skip |
| wacli | WhatsApp CLI tool | ❌ Not available on Windows | Skip — no Windows build |
| xurl | URL expansion tool | ❌ Not installed | Install via npm or skip |

**Total:** 3 skills (low priority)

---

## Likely Functional (No Known Blockers)

Skills that should work on Windows:
- bankr ✓
- discord ✓
- github ✓
- healthcheck ✓
- node-connect ✓
- notion ✓
- skill-creator ✓
- weather ✓
- (45+ others)

---

## Recommendation

**No action needed** for macOS-only skills — they're expected on Windows.

**Consider removing or documenting:**
- `tmux`, `wacli`, `xurl` if you don't plan to use them
- Or install them if you need them

**Alternative:** Use Bankr TTS instead of `sherpa-onnx-tts` for voice generation.

---

## Checked Skills Count

- **Total skills in system:** 61
- **Platform-incompatible (expected):** 8
- **Missing dependencies:** 3
- **Likely functional:** 50+

No "broken" skills that need fixing — just platform mismatches.
