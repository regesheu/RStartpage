---
version: alpha
name: "RStartpage"
description: "A local-first Chrome workspace with an Alpine Glass browser-shell interface."
colors:
  primary: "#58DEC0"
  primary-dark: "#83EAD2"
  background: "#07111A"
  surface: "#142332"
  surface-muted: "#1C3042"
  text: "#EDF4FA"
  text-muted: "#A4B8CA"
  border: "#385165"
  danger: "#FFAAA5"
typography:
  sans:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "14px"
    lineHeight: "1.45"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
rounded:
  sm: "0.5625rem"
  DEFAULT: "0.75rem"
  md: "0.875rem"
  lg: "1.125rem"
spacing:
  control-height: "2.5rem"
  card-gap: "0.875rem"
  section-gap: "1.5rem"
  page-max: "97.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.sans}"
    rounded: "{rounded.DEFAULT}"
    height: "{spacing.control-height}"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
  navigation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "{spacing.card-gap}"
  navigation-active:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.primary}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.section-gap}"
    width: "{spacing.page-max}"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
  dialog:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    typography: "{typography.sans}"
    rounded: "{rounded.sm}"
    height: "{spacing.control-height}"
  code:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    typography: "{typography.mono}"
  toast:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
    rounded: "{rounded.DEFAULT}"
---

# RStartpage Design System

## Overview

### Creative North Star

RStartpage should feel like a browser workspace floating over an alpine night scene: compact, immediately legible, and softly separated from the wallpaper. The visual signature is the glass route rail and emerald-teal active state; home keeps the user's original section/group/bookmark model visible and task-first.

### Product context and register

- **Audience and primary job:** people who use Chrome as a daily workspace and need fast access to bookmarks, sessions, diagnostics, and optional proxy routing.
- **Target market(s) and evidence:** general international use; the repository ships English and Russian interfaces and does not declare a country-specific market.
- **Locale(s) and language policy:** English and Russian. New owned copy must be present in both; English is the fallback.
- **Usage scene:** desktop Chrome, frequent short interactions, high information density, keyboard and pointer input.
- **Register:** product. Task clarity and reliable state take priority over brand expression.
- **Memorable signature:** the centered glass route rail over the alpine wallpaper, with a teal active marker and compact bookmark surfaces.
- **Restraint:** forms, proxy controls, diagnostics, confirmations, and dense lists remain flat and utilitarian.
- **Anti-references:** not a marketing dashboard, neon cyberpunk proxy client, newspaper layout, or card-heavy generic SaaS template.
- **Token ownership/runtime mapping:** the established CSS custom properties in `styles.css` remain canonical. This file mirrors their accepted values and intent. Shared page styles and components consume those variables directly; `DESIGN.md` lint plus the premium static audit are the drift gates.

## Colors

`primary` is the only expressive action color and is used for current navigation, safe primary actions, focus rings, and healthy status. `danger` is reserved for irreversible deletion and errors. Surfaces use `background`, `surface`, and `surface-muted`; borders carry most hierarchy. Dark and system themes remap the same semantic roles in `styles.css` without changing emphasis.

## Typography

The browser-native system sans stack is canonical because the extension is a compact desktop utility and must render quickly without remote fonts. Page titles use tighter letter spacing and stronger weight; controls share one font size and weight system. URLs and endpoints use the documented monospace stack. Interface labels use sentence case.

## Layout

Full pages share one sticky navigation shell. Page content owns normal document scrolling; long forms are never trapped inside a viewport-height page shell. The primary content maximum is `page-max`, while task-focused pages use narrower local maxima. Controls follow `control-height`; cards and sections use the documented gaps. The desktop route rail stays within one row without a horizontal scrollbar; at narrow widths labels collapse to named icon controls.

## Elevation & Depth

Translucent backgrounds and one-pixel borders establish depth. Static content is shadow-free. Floating menus, dialogs, and toasts may use the existing floating shadow. Sticky navigation uses backdrop blur and an opaque-enough surface to preserve contrast over custom wallpapers.

## Shapes

Controls use `sm` or `DEFAULT` radii, cards use `md` or `lg`, and compact status indicators may be pills. Circular geometry is reserved for icon-only actions and status dots. Borders remain one pixel; thick decorative outlines are not used.

## Components

### Foundational visual states

Every control has default, hover, focus-visible, active/current, disabled, and busy treatment. Focus uses a two-pixel primary outline with offset. Busy controls preserve width. Success, warning, and error always include text or an icon in addition to color. Loading uses a compact app-owned spinner or stable progress row; skeletons are not part of this product.

### Buttons and actions

Buttons combine emphasis (solid, outline, ghost) with intent (brand, neutral, warning, danger). Header navigation items use one shared height, font, radius, and padding. Destructive actions are separated from routine actions and become high-emphasis only inside a confirmation dialog.

### Navigation and data display

The shared route rail owns product branding, Home, optional Proxy/Sessions/Tools links, and Settings. It stays sticky on every full page and marks the current route. Bookmark section tabs remain a second, page-specific row. Diagnostic results use bordered rows with visible per-item actions and status text; narrow layouts stack records without removing actions.

### Forms and overlays

Native selects are intentional: this is a Chrome-only extension and platform-owned select popup geometry is accepted. Forms use explicit labels, app-owned validation, `novalidate`, stable error regions, and non-resizable textareas. Shared confirmation dialogs use `<dialog>`, restore focus, support Escape, and remain within the visual viewport. Toasts use one bottom-center live region.

### Iconography

Inline outline SVG icons use rounded strokes at 16–20 px. Text remains beside non-universal navigation icons. Icon-only Home, Settings, close, and reveal controls always have localized accessible names.

### Motion

Motion is limited to 120–220 ms state transitions, progress, and dialog appearance. It communicates selection or pending work, never decoration. `prefers-reduced-motion: reduce` removes transforms and shortens transitions.

### Content and data visualization

Copy is direct and task-oriented. Button verbs describe the outcome: “Import proxies”, “Check all”, “Save link”. Technical routes, URLs, proxy directives, and priorities use concise examples and monospace where helpful.

## Do's and Don'ts

- **Do:** preserve the shared route rail, control sizing, semantic tokens, and English/Russian parity across pages.
- **Do:** keep dense functional pages quiet and let status/action hierarchy carry the interface.
- **Don't:** add per-page header variants, raw accent colors, or decorative cards that compete with the task.
- **Don't:** hide important controls on hover, clip long forms, or rely on color alone for routing and link-health states.
