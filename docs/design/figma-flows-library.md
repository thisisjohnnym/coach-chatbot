# Figma flows page — component library (agent guide)

Use this before any design sync on the Coach AI Gift Assistant **flows** page. Goal: reuse the page-only library, avoid raw frames when a component exists, and only create comps for real gaps.

## Source of truth

| Item | Value |
|------|--------|
| File | [Coach NA AI Gift Assistant](https://www.figma.com/design/SuiCDqhMJKC3wy4zFlDAeY/Coach-NA-AI-GIft-Assistant) (`SuiCDqhMJKC3wy4zFlDAeY`) |
| Flows page node | `2014:12341` |
| Library section | `Chat assistant • Component library` — `2236:11833` |
| Naming prefix | `Chat flows only / …` |
| Scope | **Page-only.** Editing these mains updates instances on this flows page. Other Figma pages keep their own comps. |

Code UI lives under `src/components/` + `src/data/catalog.ts`. Figma documents flows; it is not a published team library.

---

## Agent rules (do these in order)

1. **Inventory first.** Open / query section `2236:11833`. Match by name prefix before drawing anything.
2. **Instance, don’t redraw.** Prefer `createInstance()` + text/image overrides. Never rebuild User bubble, Header, Composer, etc. as loose frames.
3. **Create only gaps.** If nothing matches, add a main under the library section (`Main components` shelf for that category), name it `Chat flows only / Category / Name`, set a one-line `description`, then instance into flow screens.
4. **Edit the main, not every screen.** Visual fixes go on the component; screens inherit.
5. **Do not detach** unless the user explicitly asks.
6. **Shell clone ≠ content.** Cloning a chat screen brings Header / PLP / Composer instances. Thread body you add must still use message / product / prompt comps — not new raw bubbles.
7. **Out of default scope unless asked:** glass orb polish, Stories variant (`detectStoriesVariant` in `App.tsx`).

---

## Decision tree: instance vs new comp

```
Need a UI piece on a flow screen?
        │
        ▼
Does a Chat flows only / … name match? ──yes──► createInstance + overrides
        │
        no
        ▼
Can 2+ existing comps compose it? ──yes──► stack instances (e.g. label + bubble + card)
        │
        no
        ▼
Is it on the gap backlog below? ──yes──► create main in library section first, then instance
        │
        no
        ▼
Ask before inventing. Do not drop a raw frame “bubble/card/CTA” on a screen.
```

Quick tests:

| Situation | Action |
|-----------|--------|
| Same role as catalog row (bubble, typing, header control, rec card, compare CTA) | Instance that row |
| Same role, different copy/image | Instance + override text/fills |
| New role, no catalog row | Library main → then instance |
| Temporary layout scaffold | OK as auto-layout wrapper only — no styled one-off controls inside |

---

## Do not rebuild (blacklist)

Never recreate these as loose frames/groups on flow screens. Always instance from the library:

| Instead of raw… | Use |
|-----------------|-----|
| White user chat pill | `Messages / User bubble` (`2236:11895`) |
| White assistant text pill | `Messages / Assistant bubble` (`2236:11913`) |
| Coach AI + bubble (+ typing) | `Messages / Response content` or `Assistant response` |
| Loading dots | `Status / Typing` |
| Soft sheet header / New chat / X | `Header` set + `Controls / New chat` + `Controls / Close` |
| Follow-up field + disclaimer | `Composer / Input + disclaimer` |
| Product card in thread | `Products / Recommendation card` |
| Large prompt / starter card | `Prompts / Quick reply` |
| Stacked follow-ups | `Prompts / Suggestion list` |
| Content-spot interstitial | `Content Spot / Assistant ad` |
| Compare Add to bag / View details | `Compare / Add to bag`, `View details`, or `Conversion column` |
| Viewed pill on PLP | `Badges / Viewed` on a **Row/Product** wrapper |
| Action glyph (plus / edit / confirm / ai / …) | `Actions / Icon` set — never raw vectors in Slot / Selfie cards |

If a screen already has a raw stand-in for anything above, **replace it with an instance** rather than restyling the raw frame.

---

## Library catalog

Stable IDs for the flows page. Prefer these over recreating.

### Messages

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Messages / User bubble` | `2236:11895` | User prompts (override label text; optional icon instance) |
| `Chat flows only / Messages / Assistant bubble` | `2236:11913` | Plain assistant text pill |
| `Chat flows only / Messages / Response content` | `2236:11907` | Coach AI label + bubble stack |
| `Chat flows only / Messages / Assistant response` | `2236:11901` | Response + typing row |

### Status & feedback

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Status / Typing` | `2236:11918` | Loading dots |
| `Chat flows only / Feedback / Answer rating` | `2236:15331` | Thumbs / “How was my answer?” |

### Prompts

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Prompts / Suggestion list` | `2236:11926` | Stacked follow-up options |
| `Chat flows only / Prompts / Quick reply` (set) | `2236:11935` | Large prompt cards; variants `active=no` / `active=yes` |

### Products

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Products / Recommendation card` (set) | `2236:11963` | Product cards in thread; variants `show color=false` / `true` |

### Header & chrome

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Header` (set) | `2236:15495` | Soft sheet header. Prefer **Conversation** / **Compact** states that match code soft header (ghost New chat + divider + X, no white pill) |
| `Chat flows only / Controls / New chat / 1` | `2236:15204` | Ghost new-chat control |
| `Chat flows only / Controls / New chat / 2` | `2236:15303` | Alt / dark preview |
| `Chat flows only / Controls / Close / 1` | `2236:15095` | Close X |
| `Chat flows only / Controls / Close / 2` | `2236:15180` | Alt close |
| `Chat flows only / Controls / Entry button` | `2236:14984` | Entry CTA |
| `Chat flows only / Composer / Input + disclaimer` | `2236:11836` | Follow-up field + disclaimer |
| `Chat flows only / Identity / Assistant label / 1` | `2236:15034` | “Coach AI” label |
| `Chat flows only / Identity / Assistant label / 2` | `2236:15079` | Alt label |
| `Chat flows only / Entry / Recovery launcher` | `2236:12012` | Dismissed / recovery entry |
| `Chat flows only / Welcome / Assistant visual` | `2236:11945` | Welcome visual (not a full orb-flow rebuild) |

### Actions & badges

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Actions / Icon` (set) | `2236:11851` | `Icon=ai\|selfie\|compare\|chat\|find\|voice\|plus\|confirm\|edit` — always instance this set; never paste raw vectors |
| `Chat flows only / Badges / Viewed` | `2270:11470` | PLP “Viewed” pill — place on **Row/Product** wrappers; you cannot append into locked product instances |

### Content spot

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Content Spot / Assistant ad` (set) | `2262:11700` | Interstitial ad; `Mode=General` / `Mode=Compare` |

### Compare conversion

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Compare / Add to bag` | `2272:11505` | Primary white pill CTA |
| `Chat flows only / Compare / View details` | `2272:11510` | Underlined secondary |
| `Chat flows only / Compare / Conversion column` | `2272:11512` | Thumb + name/price + both CTAs (one side of footer) |
| `Chat flows only / Compare / Slot empty` | `2283:13332` | Dashed “Tap to pick” slot (`CompareFlowView` empty slot) |
| `Chat flows only / Compare / Slot filled` | `2283:13355` | Selected slot wrapper (embeds Recommendation card) |

### Outfit

| Component | Node ID | Use for |
|-----------|---------|---------|
| `Chat flows only / Outfit / Selfie empty` | `2281:13196` | Dashed “Pick a selfie” card |
| `Chat flows only / Outfit / Selfie picked` | `2281:13197` | “Your look” card with media + caption |

---

## Code ↔ Figma map

| Code | Figma comps / notes |
|------|---------------------|
| `ContentSpotAd.tsx` / `PromptCardsAdBody` | Content Spot / Assistant ad |
| `AssistantSheetShell` soft header | Header set + New chat / Close |
| `ChatThreadView.tsx` | User bubble, Assistant response, Typing, Suggestion list |
| `CompareFlowView.tsx` | Slot empty/filled, Quick reply confirm tiles, Recommendation card, Conversion column / Add to bag / View details, Answer rating |
| `ProductPickerModal.tsx` | **Gap** — no flows screen yet |
| `OutfitFlowView.tsx` | Messages + Outfit Selfie empty/picked + Recommendation card + Suggestion list |
| `PlpListing.tsx` | Mostly page chrome; Viewed badge on rows |
| `LiquidOrb` / `GlassOrb` | Out of default sync scope |
| Stories path in `App.tsx` | Out of default sync scope |
| Copy / bags | `src/data/catalog.ts` |

---

## Flow sections on this page

| Section | Node ID |
|---------|---------|
| Content Spot → Cold Start → Chat | `2014:12343` |
| Content Spot → Prompt → Chat | `2014:13270` |
| Content Spot → Cold Start → Compare | `2014:18298` |
| Content Spot → Cold Start → Outfit | `2272:11606` |
| Component library | `2236:11833` |
| Other / other scenarios | `2048:41897`, `2259:46224` |

Sheet scroll viewport inside chat shells is typically **~430×482** and clips a taller `Container`. Sticky “option pills” / mid-flow chips stay in the sheet; scrolling the container to show bottom CTAs can collide with them — hide only the sticky overlays for that scrolled state, or build a dedicated scrolled screen from instances.

---

## Gap backlog (tied to code)

Create library mains under `2236:11833` before using these on screens. Prefer composing from existing comps until a main exists.

| Status | Needed Figma main | Code owner | Interim (reuse) |
|--------|-------------------|------------|-----------------|
| Covered | `Chat flows only / Outfit / Selfie empty` (`2281:13196`) | `OutfitFlowView.tsx` + `OUTFIT_SELFIE_PREVIEW` | Instance this main |
| Covered | `Chat flows only / Outfit / Selfie picked` (`2281:13197`) | Same | Instance this main |
| Covered | Outfit follow-ups | `OutfitFlowView.tsx` / `OUTFIT_MATCH_REPLY` | `Prompts / Suggestion list` |
| Covered | Compare conversion CTAs | `CompareFlowView.tsx` | Compare / Add to bag, View details, Conversion column |
| Covered | Compare slot empty / filled | `CompareFlowView.tsx` `renderSlot` | Slot empty / Slot filled |
| Covered | Compare confirm tiles | `CompareFlowView.tsx` confirm actions | `Prompts / Quick reply` (`active=yes` / `no`) + “Pick an option to continue” |
| Open | Product picker modal | `ProductPickerModal.tsx` | No flows screen yet — add when documenting picker open state |
| Won’t-fix | Glass / liquid orb polish | `LiquidOrb.tsx`, `liquidOrb/GlassOrb.tsx` | Out of scope unless user asks |
| Won’t-fix | Stories variant screens | `App.tsx` (`detectStoriesVariant`), `STORIES_*` in `catalog.ts` | Out of scope unless user asks |

### Hug / clipping checklist

Same failure mode as the old selfie caption (FIXED parent + long text):

| Node | Expected |
|------|----------|
| `Outfit / Selfie picked` | `primaryAxisSizingMode: AUTO`; caption `textAutoResize: HEIGHT` |
| `Messages / User bubble` + `Assistant bubble` | Counter/primary hug so long copy isn’t clipped at 46px |
| `Compare / Slot empty` | Fixed min size OK (`~176×228`); label centered |
| Recommendation / Slot filled titles | Prefer truncate/HEIGHT — avoid FIXED caption frames for multi-line copy |

**Outfit screens:** thread content should be Messages + Outfit selfie + Recommendation card + Suggestion list instances. Layout wrappers (`selfie stage`, `outfit results`, `bag row`) may stay as plain auto-layout frames.

When a gap closes: add the catalog row, update the Code ↔ Figma map, set this row to Covered (or delete it).

---

## Figma Plugin API gotchas (from real syncs)

- **FILL / HUG:** Append into an auto-layout parent first, then set `layoutSizingHorizontal/Vertical` to `FILL` / `HUG`. `resize()` resets sizing to FIXED — set hug modes after.
- **Collapsed height:** If a card/footer is ~10–16px tall, parent `primaryAxisSizingMode` is often FIXED — set `AUTO` on vertical stacks (and `counterAxisSizingMode = AUTO` on horizontal stacks that should hug height).
- **Component sets:** Creating a set can squash variant height — verify ~430-wide sheet comps stay full height after `combineAsVariants` / set edits.
- **Instances are sealed:** Cannot `appendChild` into an instance. Badge overlays go on a wrapping frame (e.g. `Row/Product`).
- **Assets:** Upload via MCP `upload_assets`; match image hashes carefully (wrong lifestyle image has shipped before).
- **Text:** Load the node’s current fonts via `getStyledTextSegments(['fontName'])` before editing characters.
- **Contrast:** Product titles on dark sheet use light ink; summary frames must not keep white fills with white text.
- **Session:** Keep the same Figma `sessionId` for the file task; switch page with `await figma.setCurrentPageAsync` once per `use_figma` call.

---

## Suggested agent checklist (each design task)

1. Read this doc + confirm library section `2236:11833`.
2. List comps you will instance (IDs above).
3. List gaps → create mains in library only if needed.
4. Build / update flow screens with instances.
5. Screenshot the target screen(s); fix mains if contrast/layout fails.
6. Note any new comps or doc updates in the handoff.

---

## Maintaining this doc

When you add a `Chat flows only / …` main on the flows page:

1. Put it in the library section shelf for that category.
2. Add a one-line component `description`.
3. Append a row to the catalog tables above (name, node ID, use-for).
4. Update the Code ↔ Figma map if a `src/components/*` file owns it.
5. Mark or remove the matching row in **Gap backlog** if it closes one.
