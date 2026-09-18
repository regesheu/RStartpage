# Chrome Web Store submission — RStartpage 1.1.0

## Suggested category

Productivity

## Short description

A customizable Chrome start page for synced bookmarks, saved sessions, link tools and optional proxy routing.

## Detailed description — English

RStartpage replaces Chrome's New Tab page with a clean, customizable navigation workspace built around Chrome Bookmarks.

Organize your links into sections and groups, search instantly, reorder items with drag & drop, add descriptions, choose icons and colors, pin important links, customize the background, and keep your bookmark hierarchy as regular Chrome Bookmarks.

RStartpage also includes optional tools for people who want more control over their browser workspace:

- Session Manager for saving and restoring tab sets
- Sticky shared navigation and a full-page settings editor
- Duplicate Finder with inline editing and per-link or batch checks
- Link Checker with inline status on bookmark cards
- User-configured HTTP, HTTPS, SOCKS4 and SOCKS5 proxy profiles
- Quick proxy switching from the Chrome toolbar
- Proxy authentication where Chrome supports it
- Bypass lists and latency testing
- Smart Proxy Rules for routing matching domains or IPs through DIRECT or a selected proxy
- Proxy JSON import/export and a dedicated routing help page
- Quick Add Link form in the toolbar popup, prefilled from the active tab
- Portable JSON backup and restore

RStartpage is local-first. It has no separate account, no advertising, no analytics, no remotely hosted code, and no developer-operated cloud backend. Chrome Sync is used only through Chrome's own bookmark and extension-storage features when the user has synchronization enabled.

## Detailed description — Russian

RStartpage заменяет стандартную страницу новой вкладки Chrome на настраиваемое рабочее пространство для закладок.

Ссылки можно объединять в разделы и группы, искать, сортировать перетаскиванием, закреплять, дополнять описаниями, иконками и цветами. Закладки при этом остаются обычными Chrome Bookmarks и могут синхронизироваться средствами самого Chrome.

Дополнительные возможности:

- сохранение и восстановление наборов вкладок;
- общее sticky-меню и отдельная полноэкранная страница настроек;
- поиск дубликатов с редактированием и проверкой одной или всех ссылок;
- проверка доступности ссылок прямо на карточках;
- пользовательские HTTP, HTTPS, SOCKS4 и SOCKS5 proxy-профили;
- быстрое переключение proxy из панели Chrome;
- авторизация proxy там, где она поддерживается Chrome;
- списки исключений и тестирование задержки;
- Smart Proxy Rules для маршрутизации доменов/IP через DIRECT или выбранный proxy;
- отдельный импорт/экспорт proxy JSON и справка по приоритетам маршрутизации;
- быстрое добавление текущей вкладки в закладки из popup;
- экспорт и импорт резервной копии JSON.

RStartpage не использует рекламу, аналитику, удалённый исполняемый код или собственный облачный сервер.

## Single purpose statement

RStartpage is a customizable browser navigation workspace that centralizes the user's bookmarks, saved navigation sessions, bookmark maintenance tools, and optional user-configured routing controls on the Chrome New Tab page.

## Permission justifications

### bookmarks
Required to display, create, edit, reorder, move and delete the user's RStartpage bookmark folders and links.

### storage
Required to store and synchronize RStartpage preferences and presentation metadata, including layout, language, descriptions, colors, icons, proxy profile definitions and Smart Proxy Rules. Local storage is also used for device-specific state.

### favicon
Required to display website favicons using Chrome's built-in favicon API. RStartpage does not use an external favicon service.

### proxy
Required for the optional built-in proxy manager so a user can apply, switch and disable their own proxy profiles and Smart Proxy Rules.

### webRequest
Required to observe the proxy authentication flow needed by user-configured proxy profiles. RStartpage does not use it to collect page content.

### webRequestAuthProvider
Required to answer proxy authentication challenges for user-configured HTTP/HTTPS proxies when credentials were supplied by the user.

### tabs
Required for Session Manager to read the URL/title and relevant state of tabs only when the user explicitly saves or updates a session, and to restore saved sessions later.

### host access: <all_urls>
Required because user-initiated Link Checker may check any bookmark URL, proxy connectivity tests may access test endpoints through a selected proxy, and proxy authentication may occur while the user is visiting any site.

## Remote code

No. RStartpage does not execute remotely hosted JavaScript, WebAssembly, or other remote executable code.

## Data-use summary

- No sale of user data.
- No advertising or behavioral profiling.
- No analytics or tracking SDKs.
- No developer-controlled server receives bookmark, session, proxy, or browsing data.
- User-selected Link Checker requests go directly to the selected bookmark destinations.
- User-configured proxy traffic is sent through proxy servers chosen by the user.
- Chrome Sync, if enabled by the user, is provided by Chrome/Google.

## Support

Email: me@regesh.ru

Use the GitHub repository Issues page as the public support URL after the repository is created.
