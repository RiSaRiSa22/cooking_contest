# Feature Landscape

**Domain:** Social cooking contest / friend group event webapp
**Project:** Fornelli in Gara
**Researched:** 2026-02-21
**Overall confidence:** MEDIUM — no direct competitor with identical scope found; findings synthesized from event voting apps, food competition apps (FoodFu), and photo-sharing event apps.

---

## Context: What the Spec Already Covers Well

The existing `FEATURES.md` / spec is comprehensive for a v1 friend-group cooking contest. The following research focuses on **gaps, patterns, and decisions not yet addressed** rather than repeating what's already specified.

---

## Table Stakes

Features users expect. Missing = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Spec Status | Notes |
|---------|--------------|------------|-------------|-------|
| Join by code without account | Standard in all event voting apps (Slido, VoxVote, Crowdpurr) — no install, frictionless | Low | Covered (nickname+PIN) | The current model is correct — no email/OAuth needed for this use case |
| Mobile-first layout | Participants join from phones at the dinner table | Low | Implied, not explicit | Needs explicit responsive design decisions |
| Dish photo with name overlay | Expected in any food gallery — photo without name feels incomplete | Low | Covered (grid with overlay) | |
| Single vote per participant | Core fairness rule for contests | Low | Covered | |
| Vote change allowed | Without it, fat-finger panic ruins the experience | Low | Covered | |
| Cannot vote own dish | Basic fairness, users assume this | Low | Covered | |
| Anonymized chef during voting | The "reveal" moment is the core fun mechanic | Low | Covered | |
| Phase transitions admin-only | Without this, voting chaos ensues | Low | Covered | |
| Leaderboard with medals | Expected in any competition — 1st/2nd/3rd visual hierarchy | Low | Covered | |
| Competition code display (copyable) | How participants actually share the link | Low | Covered | |

---

## Differentiators

Features that set the product apart. Not expected, but meaningfully improve the experience when present.

### QR Code Sharing

**Value:** Replaces "text me the link" friction. Participants scan a QR code displayed on a TV/phone/printed page and land directly on the join flow, pre-filled code. Standard in all event apps studied (Slido, GuestCam, Crowdpurr all center their onboarding on QR scanning).

**Recommended pattern:** Generate a QR code that encodes the direct URL `?code=ABC123&mode=join`. Display inline in the admin panel (Settings tab). Offer a "full screen" / print view for projecting or printing. No need for external QR service — browser-side libraries generate QR codes client-side with zero server cost.

**Complexity:** Low. Library `qrcode` or `qrcode.react` renders a QR in a `<canvas>` or `<svg>` from a URL string. No backend change needed.

**Confidence:** HIGH — confirmed pattern across multiple event apps.

---

### Guest Voter Role (Ospite Votante)

**Value:** Allows latecomers, partners who didn't cook, or children to participate in the fun without submitting a dish. Increases engagement and fairness perception.

**Recommended pattern (based on industry patterns):**
- Same join flow as participant: code + nickname + PIN
- Flag `is_guest: boolean` on the Participant record
- Guest cannot add a dish
- Guest can vote (counts in leaderboard totals)
- Admin panel shows guests separately from cooking participants with a distinct badge
- Guest's nickname appears in vote count but not in the dish list

**Data model change:** Add `is_guest` flag to `Participant`. The vote model is unchanged — guests vote exactly like participants.

**Complexity:** Low-Medium. Mostly flow routing (skip dish creation) and UI labeling. The constraint "cannot vote own dish" becomes a no-op for guests since they have no dish.

**Confidence:** MEDIUM — pattern synthesized from Slido/VoxVote guest-mode behavior and the spec's own backlog item.

---

### Live Vote Status for Admin (Real-Time)

**Value:** Admin can see "7 of 10 have voted" updating live and nudge stragglers without refreshing. Creates social pressure that shortens the voting phase.

**Recommended pattern:** Simple polling (every 5–10s) on the admin votes view is sufficient for friend-group scale. WebSocket is not required unless real-time feel is critical. A progress bar (`7/10 voted`) with participant names grayed out as they vote is the standard pattern.

**Complexity:** Low (polling) to Medium (WebSocket).

**Confidence:** MEDIUM.

---

### Reveal Moment UX

**Value:** The chef reveal at the end is the emotionally resonant peak of the experience. Apps that make this a "moment" (animation, countdown, drum roll text) are remembered vs apps that just show a table.

**Recommended pattern:** When admin toggles "Rivela cuochi" or when phase transitions to `finished`, use a brief staggered animation — cards flip or names fade in one by one. This is the differentiator nobody expects but everyone remembers.

**Complexity:** Low-Medium (CSS animation). No backend change.

**Confidence:** LOW (no direct source — synthesized from general UX principles and game show patterns).

---

### Photo Gallery: Film Roll Aesthetic

**Value:** The existing spec correctly defines a 3-column grid with square thumbnails. This pattern (identical to iOS Camera Roll / Instagram grid) is the most recognizable food photo display pattern. Users intuitively know how to interact with it.

**Recommendation:** Keep the 3-column uniform grid as specified. Do NOT use masonry/Pinterest layout — it adds complexity and breaks the "roll" mental model. The badge showing extra photo count (`+2`) is correct and expected.

**Detail sheet pattern:** Bottom sheet (modal drawer) rather than a new page. Swipe down to dismiss. This is the dominant mobile pattern for photo detail in gallery apps (Instagram, Google Photos) and avoids navigation stack complexity.

**Complexity:** Already designed correctly in spec.

**Confidence:** MEDIUM — confirmed by Mobbin gallery patterns research.

---

### Multi-Criteria Voting (Optional / Post-MVP)

**Value:** FoodFu (the closest competitor found) uses 4 criteria: plating, taste, creativity, use of featured ingredient — each rated independently. This is richer than single-vote but significantly more complex.

**Recommendation:** Do NOT build this for v1. Single-vote is sufficient for friends, and multi-criteria requires a scoring aggregation system, UI for rating sliders, and a more complex leaderboard. Defer unless user research shows demand.

**Complexity:** High (data model change, UI overhaul, scoring algorithm).

**Confidence:** MEDIUM.

---

### Countdown Timer for Voting Phase

**Value:** Creates urgency. Common in cooking competition formats. Listed in the spec's backlog.

**Recommendation:** Implement as a display-only timer on the participant screen. Admin sets a duration when transitioning to voting phase, or timer is optional/manual. Auto-close voting when timer hits zero is a separate (higher complexity) feature.

**Complexity:** Low (display only, no auto-close) to Medium (auto-close with server enforcement).

**Confidence:** LOW — synthesized; verify with users.

---

### Export / Share Leaderboard

**Value:** Screenshot-friendliness. People want to share "we won!" on WhatsApp. A well-formatted leaderboard card (OG image or PDF) that users can screenshot and share is viral marketing for the app.

**Recommendation:** A "screenshot-optimized" view (clean, full-screen, no nav chrome) is the minimum viable version. PDF export is higher complexity and lower value for friend groups. The spec's backlog lists this — keep it deferred.

**Complexity:** Low (share-view page) to High (server-side PDF generation).

**Confidence:** LOW.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Email/password auth | Overkill for a casual friend event; adds friction and requires password reset flows | Nickname + PIN is correct for this scope |
| Public competition discovery | "Browse all contests" creates privacy concerns and zero value for private friend groups | Keep competitions private by code only |
| Rating sliders (1–10 per category) | Overly complex for friends; causes decision fatigue and slows voting | Single vote is sufficient; preserve the simplicity |
| Comments / chat on dishes | Adds moderation surface, distracts from the contest, creates pre-vote bias | Photo + description is enough; discussion happens IRL |
| Notifications push (v1) | Requires notification permission flow, backend infrastructure, handling opt-out | Admin nudges participants verbally; real-time is a phase 2 concern |
| User profiles / history across competitions | Adds persistent identity concerns; friend groups don't need cross-competition stats | localStorage-based "recent competitions" is sufficient |
| Monetization / ads | Destroys trust for a tool used among friends | Keep it clean |

---

## Feature Dependencies

```
Phase model (preparation → voting → finished)
  └── Dish CRUD                        [requires: preparation phase]
  └── Guest voter role                 [requires: participant model with is_guest flag]
  └── Extra photo upload               [requires: voting phase]
  └── Anonymous voting                 [requires: voting phase]
      └── Vote status admin view       [requires: votes exist]
  └── Leaderboard reveal               [requires: finished phase]
      └── Chef name reveal animation   [requires: leaderboard]

QR code sharing
  └── Shareable URL with pre-filled code [already exists]
  └── QR generation library (client-side) [no backend dependency]

Guest voter role
  └── Participant model (is_guest flag)
  └── Join flow (branch: guest vs participant)
  └── Admin panel guest display
  └── Vote counting (includes guests)
```

---

## Gap Analysis: What the Spec Misses

Comparing the spec against common patterns in the domain, the following are **notable absences**:

### 1. QR Code — Specified in Backlog, Pattern Not Designed
The spec lists QR as a backlog item but does not define the UX. Recommendation:
- Display QR in the Settings tab of the admin panel
- Add a "Schermo intero QR" / fullscreen mode for projecting onto a TV
- QR encodes `?code=ABC123&mode=join` URL

### 2. Guest Voter: Role Defined but Flow Not Specified
The spec acknowledges the role but marks it "not yet implemented" without a flow. The join flow branch is simple:
- Join form: add a checkbox or separate button "Entra come ospite (senza piatto)"
- On join: create participant with `is_guest = true`, skip dish creation step
- Admin sees guests with "ospite" badge in the Participants tab

### 3. No Explicit Empty State Handling
What does the gallery look like before anyone adds dishes? What does the leaderboard show with 0 votes? These empty states need UX decisions — they're common sources of confusion in social event apps.

### 4. Re-authentication UX Not Fully Specified
The spec says "modal di verifica" for returning users. The exact flow for PIN entry (4 separate boxes vs single field) and error handling (wrong PIN: how many attempts? lockout?) is not specified. For friend group apps, a simple "try again" with no lockout is sufficient.

### 5. No Offline / Connectivity Handling
Friend dinners happen in homes with spotty WiFi. The spec does not address what happens if a participant loses connectivity during voting. Recommendation: optimistic UI with retry — vote is stored locally and submitted on reconnect. This is a phase 2 concern but worth flagging early in architecture.

---

## MVP Recommendation

For a working MVP that delivers the core experience:

**Must have (already in spec):**
1. Auth: nickname + PIN, no email required
2. Admin creates competition, gets 6-char code
3. 3-phase state machine (preparation → voting → finished)
4. Dish CRUD with photo upload (compressed)
5. Anonymous voting (1 vote, not own dish)
6. Leaderboard with chef reveal at end
7. Shareable URL with code pre-fill

**Add to MVP (backlog items worth including early):**
1. QR code generation in admin Settings tab — Low complexity, high impact on join friction
2. Guest voter role — Low-Medium complexity, enables non-cooking participants

**Defer to post-MVP:**
- Real-time sync / WebSocket (polling is sufficient for small groups)
- Multi-criteria voting (complexity vs value tradeoff is bad)
- Push notifications (requires permission infrastructure)
- Export / PDF leaderboard
- Timer with auto-close
- Competition deletion
- Participant limit per competition

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes (auth, phases, voting) | HIGH | Spec is well-aligned with industry patterns; no gaps |
| QR code pattern | HIGH | Confirmed across multiple event app sources |
| Guest voter role pattern | MEDIUM | Standard in event platforms; specific flow for cooking contest is interpolated |
| Photo gallery UX | MEDIUM | Confirmed 3-col grid is correct; film roll aesthetic verified |
| Anonymous voting UX | HIGH | Well-documented across voting platforms; spec's approach is correct |
| Leaderboard patterns | MEDIUM | Standard podium + progress bar; reveal animation is LOW confidence |
| Anti-features | MEDIUM | Derived from domain analysis; subjective for friend-group context |

---

## Sources

- [QR Codes in Mobile Apps: A Complete Guide For 2026](https://scanova.io/blog/qr-codes-in-mobile-apps/) — QR sharing patterns
- [How QR codes simplify event photo sharing](https://blog.joinmymoment.com/how-qr-codes-simplify-event-photo-sharing/) — event QR join flows
- [Slido — Audience Interaction Made Easy](https://www.slido.com/) — no-account guest voting pattern
- [Vevox — Live Voting App](https://www.vevox.com/live-voting-app) — anonymous voting UX best practices
- [5 Strategies for Effective Anonymous Voting](https://votem.com/5-strategies-for-effective-anonymous-voting-poll-implementation/) — bias reduction in live voting
- [Leaderboard design pattern](https://ui-patterns.com/patterns/leaderboard) — leaderboard UX patterns
- [Gallery UI Design — Mobbin](https://mobbin.com/glossary/gallery) — photo gallery UX patterns
- [FoodFu Cooking Competition App](http://www.foodfuapp.com/) — closest direct competitor; multi-criteria voting reference
- [Crowdpurr — Create Audience Polls](https://www.crowdpurr.com/poll) — guest voter / no-account join patterns
- [eBallot — Anonymous Voting System](https://www.eballot.com/anonymous-secret-voting-system) — anonymous voting confidence levels
