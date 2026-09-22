'use strict';

const RS = RStartpage;
const COPY = {
  en: {
    back: '← Proxy', title: 'How proxy routing works', intro: 'A practical guide to profiles, exclusions and Smart Rules.', priorityTitle: 'Execution priority', priorityIntro: 'The first matching condition wins for every request.',
    priorityBypassTitle: 'All profile bypass lists', priorityBypassText: 'In Smart mode, matching addresses always connect directly.', priorityRulesTitle: 'First matching Smart Rule', priorityRulesText: 'Rules run from top to bottom and route through DIRECT or a selected profile.', priorityFallbackTitle: 'Active profile', priorityFallbackText: 'Everything else uses the enabled profile.',
    profilesTitle: 'Profiles', profilesText: 'Create one profile for each proxy endpoint. Enabling a profile makes it the fallback route. HTTP and HTTPS profiles may use a username and password; Chrome does not support credentials for SOCKS profiles.',
    bypassTitle: 'Bypass examples', bypassText: 'Put one entry per line. Bypass is evaluated before Smart Rules, so use it for local services and destinations that must never use a proxy.',
    rulesTitle: 'Smart Rule examples', rulesText: 'Rules are checked from top to bottom. Drag them to change priority. DIRECT bypasses the proxy; another profile sends only matching requests through that endpoint.',
    exampleRu: 'Route all .ru sites', exampleExact: 'Match one host', exampleIp: 'Match a private IP range', exampleUrl: 'Match a URL path',
    testingTitle: 'Testing and status', testingText: 'Testing temporarily applies the selected profile, makes a connectivity request, then restores the previous state.', testingOne: 'A successful test measures connection latency, not page rendering speed.', testingTwo: 'Some working proxies block test endpoints, so confirm questionable results with a real site.', testingThree: 'The toolbar icon and profile highlight show the current active state.',
    authTitle: 'Passwords and sync', authText: 'Profiles and rules sync through Chrome Sync. Passwords stay on this device unless you explicitly enable password sync.', authOne: 'Avoid password sync on shared Chrome profiles.', authTwo: 'Export and import are in Settings → Data and sections. Archives exclude passwords by default.', authThree: 'Treat an export with passwords as a secret file.',
    workflowTitle: 'Recommended setup', workflowOne: 'Add a profile and test it before enabling it.', workflowTwo: 'Add local networks and internal hosts to the profile bypass list.', workflowThree: 'Enable Smart Routing, then add specific rules above broad rules.', workflowFour: 'Keep a DIRECT rule near the top for destinations that must bypass the proxy.',
    open: 'Open proxy settings',
  },
  ru: {
    back: '← Прокси', title: 'Как работает маршрутизация прокси', intro: 'Практическая справка по профилям, исключениям и Smart Rules.', priorityTitle: 'Приоритет выполнения', priorityIntro: 'Для каждого запроса применяется первое подходящее условие.',
    priorityBypassTitle: 'Исключения всех профилей', priorityBypassText: 'В Smart-режиме совпавшие адреса всегда открываются напрямую.', priorityRulesTitle: 'Первое совпавшее Smart Rule', priorityRulesText: 'Правила идут сверху вниз и выбирают DIRECT либо указанный профиль.', priorityFallbackTitle: 'Активный профиль', priorityFallbackText: 'Все остальные запросы идут через включённый профиль.',
    profilesTitle: 'Профили', profilesText: 'Создайте отдельный профиль для каждого прокси-сервера. Включённый профиль становится маршрутом по умолчанию. Для HTTP и HTTPS доступны логин и пароль; Chrome не поддерживает авторизацию SOCKS.',
    bypassTitle: 'Примеры исключений', bypassText: 'Указывайте по одному значению в строке. Исключения проверяются раньше Smart Rules, поэтому сюда стоит добавить локальные сервисы и адреса, которые никогда не должны идти через прокси.',
    rulesTitle: 'Примеры Smart Rules', rulesText: 'Правила проверяются сверху вниз. Перетаскивайте их, чтобы менять приоритет. DIRECT открывает адрес напрямую, а выбранный профиль отправляет через него только совпавшие запросы.',
    exampleRu: 'Все сайты в зоне .ru', exampleExact: 'Один точный хост', exampleIp: 'Диапазон частных IP', exampleUrl: 'Путь внутри URL',
    testingTitle: 'Проверка и статус', testingText: 'При проверке профиль временно применяется, выполняется сетевой запрос, после чего прежнее состояние восстанавливается.', testingOne: 'Успешная проверка измеряет задержку соединения, а не скорость загрузки страницы.', testingTwo: 'Некоторые рабочие прокси блокируют тестовые адреса — сомнительный результат лучше проверить реальным сайтом.', testingThree: 'Иконка расширения и подсветка профиля показывают текущее активное состояние.',
    authTitle: 'Пароли и синхронизация', authText: 'Профили и правила синхронизируются через Chrome Sync. Пароли остаются на устройстве, пока вы явно не включите их синхронизацию.', authOne: 'Не синхронизируйте пароль в общем профиле Chrome.', authTwo: 'Экспорт и импорт находятся в настройках → «Данные и разделы». По умолчанию архив не содержит пароли.', authThree: 'Файл экспорта с паролями следует хранить как секретный.',
    workflowTitle: 'Рекомендуемый порядок', workflowOne: 'Добавьте профиль и проверьте его до включения.', workflowTwo: 'Добавьте локальные сети и внутренние хосты в исключения профиля.', workflowThree: 'Включите Smart Routing и располагайте точные правила выше общих.', workflowFour: 'Оставьте правило DIRECT ближе к началу для адресов, которым прокси не нужен.',
    open: 'Открыть настройки прокси',
  },
};

window.addEventListener('DOMContentLoaded', async () => {
  const settings = await RS.loadSettings(); const language = settings.language === 'ru' ? 'ru' : 'en'; const text = COPY[language];
  RS.applyPageSettings(settings, await RS.loadBackgroundImage(), document); RS.mountNavigation(document.querySelector('#appNavigation'), settings, { active: 'proxy' }); document.title = RS.pageTitle(language === 'ru' ? 'Справка по прокси' : 'Proxy help');
  const ids = ['helpTitle','helpIntro','priorityTitle','priorityIntro','priorityBypassTitle','priorityBypassText','priorityRulesTitle','priorityRulesText','priorityFallbackTitle','priorityFallbackText','profilesTitle','profilesText','bypassTitle','bypassText','rulesTitle','rulesText','exampleRu','exampleExact','exampleIp','exampleUrl','testingTitle','testingText','testingOne','testingTwo','testingThree','authTitle','authText','authOne','authTwo','authThree','workflowTitle','workflowOne','workflowTwo','workflowThree','workflowFour'];
  const keys = ['title','intro','priorityTitle','priorityIntro','priorityBypassTitle','priorityBypassText','priorityRulesTitle','priorityRulesText','priorityFallbackTitle','priorityFallbackText','profilesTitle','profilesText','bypassTitle','bypassText','rulesTitle','rulesText','exampleRu','exampleExact','exampleIp','exampleUrl','testingTitle','testingText','testingOne','testingTwo','testingThree','authTitle','authText','authOne','authTwo','authThree','workflowTitle','workflowOne','workflowTwo','workflowThree','workflowFour'];
  ids.forEach((id, index) => { document.querySelector(`#${id}`).textContent = text[keys[index]]; }); document.querySelector('#backToProxy').textContent = text.back; document.querySelector('#openProxyButton').textContent = text.open;
});
