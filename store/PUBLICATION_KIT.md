# Chrome Web Store publication kit — RStartpage 1.8.2

## Store listing

**Name:** RStartpage

**Category:** Productivity

**Primary language:** English

**Summary from package:**  
A customizable Chrome start page for bookmarks, notes, sessions, link tools and optional proxy routing.

### English description

RStartpage replaces Chrome's New Tab page with a local-first workspace built around your existing Chrome bookmarks.

Use it to keep everyday browsing organized without moving your data to a separate service.

Key features:
- Bookmark workspace with sections, groups, instant search, drag & drop, descriptions, icons, colors and multiple card sizes.
- One shared Quick Access area for pinned links from any section.
- Notes with groups, tags, search, source links and optional per-note Chrome Sync.
- Session Manager for saving and restoring tab sets with their order and pinned state.
- Bookmark maintenance tools for finding duplicate URLs and checking links for errors or timeouts.
- User-configured HTTP, HTTPS, SOCKS4 and SOCKS5 proxy profiles, bypass rules, latency tests and Smart Proxy Rules.
- Selective ZIP export, import preview, and merge or replace restore modes.
- Personalization with light, dark and system themes, accent colors, custom title, favicon and wallpaper.

Privacy:
RStartpage has no ads, analytics, remotely hosted executable code or developer-operated backend. Bookmarks remain Chrome Bookmarks. Notes, sessions, settings and proxy configuration are stored using Chrome extension storage. Network requests happen only for features you explicitly use, such as checking a bookmark URL or routing traffic through a proxy you configured.

### Russian description

RStartpage заменяет стандартную страницу новой вкладки Chrome на локальное рабочее пространство, построенное вокруг ваших обычных закладок Chrome.

Расширение помогает организовать повседневную работу в браузере без отдельного аккаунта и без переноса данных на сервер разработчика.

Основные возможности:
- Работа с закладками: разделы, группы, быстрый поиск, drag & drop, описания, иконки, цвета и несколько размеров карточек.
- Единый блок «Быстрый доступ» для закреплённых ссылок из любых разделов.
- Заметки с группами, тегами, поиском, ссылками на источник и выборочной синхронизацией через Chrome Sync.
- Менеджер сессий для сохранения и восстановления наборов вкладок с их порядком и закреплением.
- Инструменты обслуживания закладок: поиск дубликатов и проверка ссылок на ошибки и тайм-ауты.
- Пользовательские HTTP, HTTPS, SOCKS4 и SOCKS5 прокси, исключения, проверка задержки и Smart Proxy Rules.
- Выборочный экспорт в ZIP, предпросмотр импорта и режимы объединения или замены данных.
- Оформление: светлая, тёмная и системная темы, акцентный цвет, собственное название, favicon и фон.

Конфиденциальность:
RStartpage не содержит рекламы и аналитики, не загружает удалённый исполняемый код и не использует сервер разработчика. Закладки остаются обычными Chrome Bookmarks. Заметки, сессии, настройки и конфигурация прокси хранятся средствами Chrome. Сетевые запросы выполняются только для явно запущенных пользователем функций — например, проверки ссылки или работы через настроенный пользователем прокси.

## URLs and additional fields

- **Official URL:** leave **No** until the GitHub Pages site is verified in Google Search Console. After verification select `https://regesheu.github.io/RStartpage/`.
- **Homepage URL:** `https://regesheu.github.io/RStartpage/`
- **Support URL:** `https://regesheu.github.io/RStartpage/support.html`
- **Privacy policy:** `https://regesheu.github.io/RStartpage/privacy.html`
- **Global promo video:** leave blank.
- **Mature content:** No.
- **Distribution:** Public; use all intended countries/regions unless there is a legal or support reason to restrict distribution.

## Privacy practices

### Single purpose

RStartpage provides a local-first browser workspace on Chrome's New Tab page for organizing the user's bookmarks and closely related browsing workflow, including notes, saved tab sessions, bookmark maintenance, data portability and user-configured navigation routing.

### Remote code

No. RStartpage does not execute remotely hosted JavaScript, WebAssembly, or other remote executable code.

### Data categories

Disclose:
- **Authentication information** — proxy usernames/passwords may be entered by the user and are used only to authenticate to a proxy configured by that user. Passwords are local by default.
- **Web history / browsing activity** — URLs and titles from bookmarks, the active tab and saved tab sessions are handled only to provide bookmark, quick-add and session features.
- **Website content** — selected page text and source information are handled only when the user explicitly creates a note from a page selection.

Do not select unless the implementation changes:
- Personally identifiable information
- Health information
- Financial and payment information
- Personal communications
- Location
- User activity tracking/analytics

Certify that data is not sold, not used for personalized advertising, not used outside the extension's disclosed purpose, and not used for creditworthiness or lending.

## Permission justifications

### bookmarks
Required to display, create, edit, reorder, move and delete the user's RStartpage bookmark folders and links. Bookmarks remain normal Chrome Bookmarks.

### storage
Required to store RStartpage preferences and feature data, including notes, saved sessions, presentation metadata, proxy profile definitions, Smart Proxy Rules and device-specific state.

### favicon
Required to display website favicons through Chrome's built-in favicon API. RStartpage does not use an external favicon service.

### proxy
Required for the optional proxy manager so the user can apply, switch and disable proxy profiles and Smart Proxy Rules that they configure.

### webRequest
Required only for the proxy authentication flow used by user-configured proxy profiles. It is not used for analytics or to collect browsing activity for the developer.

### webRequestAuthProvider
Required to answer proxy authentication challenges for user-configured HTTP/HTTPS proxies when the user has supplied credentials.

### tabs
Required for Session Manager to read tab URLs, titles, order and pinned state when the user saves or updates a session, and to restore saved sessions. It is also used to prefill explicit quick-add actions from the active tab.

### contextMenus
Required to offer explicit note-creation actions for the current page or selected text. Page/selection data is handled only after the user invokes one of these actions.

### host access: <all_urls>
Required because the user-initiated Link Checker may need to contact any bookmark URL, and proxy authentication can occur while the user browses arbitrary sites. Host access is used only for user-facing features described in the listing.

## Screenshots

Use five 1280×800 screenshots from the actual release:
1. Main New Tab — search, groups and Global Quick Access.
2. Notes — harmless demo notes with groups/tags/search.
3. Sessions — demo tab sessions with public sites.
4. Proxy — demo profiles and Smart Proxy Rules using example.com-style hosts only.
5. Tools — Duplicate Finder and/or Link Checker results.

Use the same theme and accent in all shots. Do not show private bookmarks, internal hosts/IPs, proxy credentials, personal session URLs, email addresses or authentication data.
