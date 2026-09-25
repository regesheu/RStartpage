# UX Contract

## Product context

- Audience: desktop Chrome users managing a personal browser workspace.
- Primary jobs: open and organize links, restore sessions, diagnose bookmarks, and control proxy routing.
- Target market(s): international; no market-specific business rules are declared.
- Active locales: English and Russian. English is the clean-install default and fallback, regardless of browser language; Russian requires an explicit saved choice.
- Language/content register and native-review policy: concise product language; every owned UI string ships in both locales.
- Timezone/calendar policy: selected application locale and browser timezone for timestamps and generated session names; no business calendar.
- Accessibility target: WCAG 2.2 AA baseline.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Permission model | `manifest.json`, `PRIVACY.md` | Extension contract / privacy policy | 2026-09-18 |
| Data lifecycle | `README.md`, `PRIVACY.md` | Product / privacy policy | 2026-09-18 |
| Deletion / retention | `PRIVACY.md` and Chrome Bookmarks APIs used by `shared.js` | Privacy policy / platform API | 2026-09-18 |
| Security and proxy secrets | `SECURITY.md`, `PRIVACY.md` | Security / privacy policy | 2026-09-18 |
| Billing / payment | Not applicable | — | 2026-09-18 |
| Legal / regulatory copy | Not applicable | — | 2026-09-18 |
| Market / content conventions | `README.md`, existing English/Russian dictionaries | Product evidence | 2026-09-18 |

## Visual contract

- Project `DESIGN.md`: `DESIGN.md`.
- Token ownership model: existing runtime canonical.
- Runtime design-system/token source: semantic CSS custom properties in `styles.css`; popup-local equivalents in `popup.css`.
- Mapping/export/adapters: shared selectors and `RStartpage.applyAccent` / `applyBackground`.
- Token drift gate: DESIGN.md lint, strict premium audit, source grep, and representative browser screenshots.
- Supported themes: system, light, dark, optional custom accent and wallpaper.
- Design-context owner/review policy: durable changes update `DESIGN.md` and runtime tokens together.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native Chrome `<select>` | `DESIGN.md` + this contract | native | keyboard + open-popup smoke check |
| Form | Labeled native controls + page validator | this contract | create / edit / import | validation workflow test |
| Scrollbar | Global rules in `styles.css` / `popup.css` | `DESIGN.md` | stable-gutter geometry exception | computed style + browser check |
| Toast | `RStartpage.notify` | this contract | success / warning / info / error | live-region test |
| CRUD | Chrome Bookmarks/Storage functions plus owning page | this contract + platform API | stay-inline / refresh-owning-list | full-flow smoke test |

Table selection and date controls are not used.

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | semantic token | surface shift | primary outline | pressed surface | dim, no handler | stable label slot | explicit text/status |
| Icon button | named control | surface shift | primary outline | pressed surface | dim | stable geometry | status text nearby |
| Input | bordered surface | unchanged | single muted border | n/a | dim | read-only/disabled | inline message + `aria-invalid` |
| Secret input | masked | unchanged | single muted border | reveal toggle | dim | n/a | inline message |
| Search | local immediate filter + clear | unchanged | single muted border | n/a | n/a | n/a | stable empty state |
| Textarea | resize none | unchanged | single muted border | n/a | dim | n/a | inline message |
| Table/list | bordered rows | surface shift | action focus | selected/current marker | n/a | stable progress row | persistent retry/status |

## Dataset navigation

- Admin tables: not used.
- Exploratory lists: render all local user-owned records; no remote paging contract exists.
- URL state: quick diagnostic scope/action is stored in URL parameters; local search is transient by design.
- Page size: not applicable.
- Empty/no-results/error/loading treatment: distinct stable states with a direct next action or retry.
- Back/scroll restoration: normal multipage browser history; route rail remains available.
- Selection scope: not applicable; “Check all” explicitly means every duplicate occurrence in the current result set.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create link | Add link | stable disabled/busy action | owning list or popup form | shared status | form remains with values | created list context / form error | Chrome Bookmarks API |
| Edit link | Save changes | stable busy action | stay inline then refresh diagnostics | shared status | inline editor remains | edited result or refreshed heading | Chrome Bookmarks API |
| Delete | Delete | confirmation action busy | refreshed owning list | shared status | dialog remains/retry | next logical result | `PRIVACY.md` |
| Search | Search field | local immediate render | same page | result count | clear button | input/results | product implementation |
| Bulk action | Check all / Remove extras | button busy + progress | same result set | summary/status | retry without losing results | originating action | product implementation |
| Upload/background job | Import JSON | validation then busy action | same page | imported/skipped counts | selected file and error remain | notice/import action | storage contracts |
| Cancel/back | Cancel / route link | none | originating context | none | unsaved editor stays until cancel | trigger/route heading | this contract |
| Hard-delete (irreversible) | Delete | app-owned danger confirmation | refreshed owning list | shared status | dialog error/retry | next logical item | Chrome Bookmarks/Storage API |

## Navigation and responsive behavior

- Route document title policy: `{Page} — {custom product name}`; the Home tab uses the custom product name alone.
- Route error / 403 page behavior: no permission-gated routes exist; page-level failures keep shared navigation and show retryable status.
- Breadcrumb/tab/route-state policy: top-level destinations are real links in one shared sticky route rail. Bookmark workspaces are in-page tabs.
- Sidebar/drawer/bottom-sheet transformation: not used; the route rail scrolls horizontally on narrow widths.
- Responsive table strategy: diagnostic rows stack while preserving every action.
- Truncation/full-value access: URLs may ellipsize visually but remain available in links and edit fields.
- Focus restoration and sticky-obstruction policy: `scroll-padding-top` accounts for the sticky rail; dialogs restore trigger focus.

## Overlays and feedback

- Dialog primitive: native `<dialog>` styled and orchestrated by shared/page code.
- Destructive confirmation levels: warning for replace-window; danger for bookmark/profile/session deletion and replace imports.
- Toast placement/duration/deduplication: one bottom-center `RStartpage.notify` live region, latest duplicate replaces previous, 4 seconds by default; errors persist longer.
- Alert/banner scope and persistence: page notices hold actionable import/test errors; transient completion uses toast.
- Tooltip delay/dismissal: native titles only supplement compact icon controls; essential instructions stay visible.
- Unsaved-changes behavior: inline editors cancel explicitly; long settings auto-save immediately.
- Layer/z-index contract: dropdown 200, sticky 400, backdrop 500, dialog 600, toast 900.

## Async and resilience

- Mutation default: pessimistic for deletion, imports, proxy changes, and bookmark edits.
- Idempotency and duplicate-submit policy: disable the initiating control until completion.
- Auto-save/draft recovery: settings save on change; no drafts are persisted.
- Offline/read-stale/write behavior: local Chrome storage remains readable; URL checks report network errors per item.
- Retry/backoff/timeout behavior: URL checks use a finite timeout and explicit recheck; no infinite retry.
- Version conflict and multi-tab behavior: Chrome storage/bookmark change listeners refresh visible data.
- Session expiry/re-authentication: not applicable.
- Long-running progress and return path: link checks show determinate progress and remain on the tools page.
- Stale-request cancellation/invalidation and pending-state ownership: link-check runs are scoped by run id; controls own their pending state.
- Dialog/form preservation and retry after mutation failure: dialog stays open with entered non-secret values and inline error.

## Validation

- Schema/validation layer: explicit page validators plus `RStartpage`/`ProxyStore` normalization.
- Trigger timing: submit/import, then correction on the next attempt.
- Error summary/inline policy: field/form error for editable data; page notice for file and network operations.
- Server error mapping: Chrome API and fetch failures are converted to user-facing messages, never raw stack traces.
- Sensitive-value handling: proxy passwords are masked, reveal is explicit, and exports exclude passwords unless opted in.
- All product forms use `novalidate`, focus the first invalid control, prevent duplicate submission, and preserve recoverable input.

## Permission and clipboard

- Permission UI strategy: features use declared extension permissions; no role model exists.
- Clipboard copy policy: not used.
- Disabled-state explanation: nearby status/help text or a localized accessible name explains the state.

## Migration status

- Migration ledger location: this contract and `CHANGELOG.md` for the 1.1 navigation/settings consolidation.
- Canonical primitives and owners: shared route rail, toast, confirmation dialog, semantic CSS tokens.
- Current risk-prioritized slices: settings/import, proxy secrets/import, destructive bookmark/session operations.
- Legacy import/token enforcement: legacy modal settings and per-page headers are removed as touched.
- Rollout/rollback and removal gates: source bundle, syntax/tests, unpacked build smoke test, and release ZIP.

## Verification

### Data settings (1.8.1)

- Canonical entry: `settings.html#data`. Module shortcuts add a `module` query parameter; `data.html` redirects here.
- The Settings label is Data / Данные. Home, Proxy, Sessions and Notes expose the same icon-only Export / Import shortcut beside a matching Help control; Tools intentionally has no transfer shortcut.
- One ZIP format contains selected sections; legacy per-module JSON is accepted. Settings include wallpaper. Proxy passwords require opt-in; Google credentials and connection tokens never enter an archive.
- Smart Proxy Rules are included with Proxy. The sensitive Proxy passwords choice is nested beneath Proxy, remains off by default and is disabled when Proxy is not selected.
- Restore shows the archive name, selectable sections and merge/replace mode, then confirms the affected sections. Schema, note capacity and sync quota are checked before writes. Runtime storage failures can leave partial writes and are reported explicitly.
- Note restore preserves IDs, timestamps and sync choices; repeat merge does not create duplicate notes. Unselected sections are untouched.
- Google Drive follows local transfer controls. Unconfigured OAuth shows an explanation and disabled actions. Connected state exposes creation, refresh, download, restore preview and confirmed deletion. API requests have a timeout and list pagination.
- Busy state prevents duplicate mutations. Disabled controls explain unavailable connection through adjacent copy; local archives remain usable offline.
- The settings sidebar uses real hash links and `aria-current`. It wraps below 680 px. All pages share the same version footer and SVG settings icon.
- The default wallpaper is a fully decodable 1536 × 1024 PNG. Static validation checks its chunks, CRCs, image properties and complete decompressed scanline payload.
- Quick Access is one global block, built from pinned bookmarks across all bookmark sections and capped at six items.

- Required static commands: `scripts/check.sh`, strict premium audit, DESIGN.md lint, and release build.
- Browser/device/locale/theme matrix: desktop and narrow Chrome-sized viewport; English/Russian; light/dark; reduced motion.
- Accessibility checks: keyboard route navigation, dialog Escape/focus, form labels/errors, visible focus.
- Native-language/domain review and target-user evidence: Russian copy follows the existing project vocabulary; no external research claim.
- Component-state/visual regression coverage: representative Home, Proxy, Sessions, Tools, Settings, Help, and popup screenshots when browser tooling is available.
- Canonical sibling flow used for comparison: shared full-page shell and existing bookmark editor.
- Project audit command/result: recorded in task completion.
- CRUD full-flow evidence: recorded in task completion.
- Failure-path evidence: invalid JSON, invalid proxy import, failed URL check, and validation failures.
