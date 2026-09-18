'use strict';

const RS = RStartpage;
const ui = {};
let settings = { ...RS.DEFAULT_SETTINGS };
let backgroundImage = '';
let savedTimer = null;
let rangeSaveTimer = null;

const TXT = {
  en: {
    eyebrow: 'Workspace', title: 'Settings', intro: 'Customize the workspace, navigation and appearance.', saved: 'Saved',
    general: 'General', generalText: 'These preferences sync through Chrome.', productName: 'Application name', productNameHint: 'Used everywhere in the interface and browser-tab titles.', language: 'Language', theme: 'Theme', density: 'Density', layout: 'Group layout', cards: 'Cards',
    system: 'System', light: 'Light', dark: 'Dark', comfortable: 'Comfortable', compact: 'Compact', board: 'Board', list: 'List', cardsValue: 'Cards', minimal: 'Minimal', showHosts: 'Show domain under title', openNew: 'Open links in a new tab', showTabIcon: 'Show icon in browser tabs', showTabIconHint: 'Turn this off to use a transparent favicon on extension pages.',
    navigation: 'Top menu', navigationText: 'Home is always visible. Choose the other sections shown in the shared header.', proxy: 'Proxy', proxyHint: 'Profiles and Smart Proxy Rules', sessions: 'Sessions', sessionsHint: 'Saved browser windows', tools: 'Tools', toolsHint: 'Duplicate finder and link checker',
    appearance: 'Appearance', appearanceText: 'Accent and wallpaper settings apply to all full pages.', accent: 'Accent color', accentText: 'Used for buttons, focus rings and active states.', accentEnabled: 'Use custom accent color', accentDefault: 'Default accent', background: 'Background', backgroundText: 'A custom image stays only on this browser.', backgroundMode: 'Background style', aurora: 'Aurora', clean: 'Clean', custom: 'Custom image', chooseImage: 'Choose image', removeImage: 'Remove image', blur: 'Background blur', dim: 'Background dimming',
    destinations: 'Data and sections', destinationsText: 'Open a dedicated page for larger tasks.', data: 'Import & export', dataText: 'Bookmarks, interface settings and backups', proxyText: 'Profiles, routing rules and proxy JSON', sessionsText: 'Save and restore browser windows', toolsText: 'Duplicates and link diagnostics', imageType: 'Choose an image file.', imageSize: 'Image is too large. Maximum size is 25 MB.', imageFailed: 'Could not process the image.',
  },
  ru: {
    eyebrow: 'Рабочее пространство', title: 'Настройки', intro: 'Настройте рабочее пространство, меню и внешний вид.', saved: 'Сохранено',
    general: 'Основное', generalText: 'Эти параметры синхронизируются через Chrome.', productName: 'Название приложения', productNameHint: 'Используется во всём интерфейсе и заголовках вкладок.', language: 'Язык', theme: 'Тема', density: 'Плотность', layout: 'Расположение групп', cards: 'Карточки',
    system: 'Системная', light: 'Светлая', dark: 'Тёмная', comfortable: 'Обычная', compact: 'Компактная', board: 'Доска', list: 'Список', cardsValue: 'Карточки', minimal: 'Минимальные', showHosts: 'Показывать домен под названием', openNew: 'Открывать ссылки в новой вкладке', showTabIcon: 'Показывать иконку во вкладках', showTabIconHint: 'Отключите, чтобы страницы расширения использовали прозрачную иконку.',
    navigation: 'Верхнее меню', navigationText: 'Главная видна всегда. Выберите остальные разделы общей шапки.', proxy: 'Прокси', proxyHint: 'Профили и Smart Proxy Rules', sessions: 'Сессии', sessionsHint: 'Сохранённые окна браузера', tools: 'Инструменты', toolsHint: 'Дубликаты и проверка ссылок',
    appearance: 'Внешний вид', appearanceText: 'Акцент и фон применяются ко всем полноэкранным страницам.', accent: 'Акцентный цвет', accentText: 'Используется для кнопок, фокуса и активных состояний.', accentEnabled: 'Использовать свой акцентный цвет', accentDefault: 'Цвет по умолчанию', background: 'Фон', backgroundText: 'Своя картинка хранится только в этом браузере.', backgroundMode: 'Стиль фона', aurora: 'Aurora', clean: 'Чистый', custom: 'Своя картинка', chooseImage: 'Выбрать изображение', removeImage: 'Удалить изображение', blur: 'Размытие фона', dim: 'Затемнение фона',
    destinations: 'Данные и разделы', destinationsText: 'Для больших задач открывается отдельная страница.', data: 'Импорт и экспорт', dataText: 'Закладки, настройки интерфейса и резервные копии', proxyText: 'Профили, правила маршрутизации и JSON прокси', sessionsText: 'Сохранение и восстановление окон', toolsText: 'Дубликаты и диагностика ссылок', imageType: 'Выберите файл изображения.', imageSize: 'Изображение слишком большое. Максимум 25 МБ.', imageFailed: 'Не удалось обработать изображение.',
  },
};

function tr(key) {
  const language = settings.language === 'ru' ? 'ru' : 'en';
  return RS.productText(TXT[language]?.[key] ?? TXT.en[key] ?? key);
}

window.addEventListener('DOMContentLoaded', init);

async function init() {
  cache();
  settings = await RS.loadSettings();
  backgroundImage = await RS.loadBackgroundImage();
  applyPage();
  populate();
  bind();
  RS.enableScriptActions();
  ui.backgroundRemoveButton.disabled = !backgroundImage;
}

function cache() {
  document.querySelectorAll('[id]').forEach((node) => { ui[node.id] = node; });
}

function applyPage() {
  settings = RS.applyPageSettings(settings, backgroundImage, document);
  RS.mountNavigation(ui.appNavigation, settings, { active: 'settings' });
  document.title = RS.pageTitle(tr('title'));
  translate();
}

function translate() {
  const text = {
    settingsEyebrow:'eyebrow', settingsTitle:'title', settingsIntro:'intro', settingsSaved:'saved', generalTitle:'general', generalText:'generalText', productNameLabel:'productName', productNameHint:'productNameHint', languageLabel:'language', themeLabel:'theme', densityLabel:'density', layoutLabel:'layout', cardsLabel:'cards', showHostsLabel:'showHosts', openInNewTabLabel:'openNew', showTabIconLabel:'showTabIcon', showTabIconHint:'showTabIconHint', navigationTitle:'navigation', navigationText:'navigationText', showProxyNavLabel:'proxy', showProxyNavHint:'proxyHint', showSessionsNavLabel:'sessions', showSessionsNavHint:'sessionsHint', showToolsNavLabel:'tools', showToolsNavHint:'toolsHint', appearanceTitle:'appearance', appearanceText:'appearanceText', accentTitle:'accent', accentText:'accentText', accentEnabledLabel:'accentEnabled', accentResetButton:'accentDefault', backgroundTitle:'background', backgroundText:'backgroundText', backgroundModeLabel:'backgroundMode', backgroundUploadButton:'chooseImage', backgroundRemoveButton:'removeImage', backgroundBlurLabel:'blur', backgroundDimLabel:'dim', destinationsTitle:'destinations', destinationsText:'destinationsText', dataLinkTitle:'data', dataLinkText:'dataText', proxyLinkTitle:'proxy', proxyLinkText:'proxyText', sessionsLinkTitle:'sessions', sessionsLinkText:'sessionsText', toolsLinkTitle:'tools', toolsLinkText:'toolsText',
  };
  for (const [id, key] of Object.entries(text)) if (ui[id]) ui[id].textContent = tr(key);
  const options = {
    themeSelect: { system:'system', light:'light', dark:'dark' }, densitySelect: { comfortable:'comfortable', compact:'compact' }, layoutSelect: { board:'board', stack:'list' }, cardStyleSelect: { cards:'cardsValue', minimal:'minimal' }, backgroundModeSelect: { aurora:'aurora', clean:'clean', custom:'custom' },
  };
  for (const [selectId, values] of Object.entries(options)) {
    for (const option of ui[selectId]?.options || []) option.textContent = tr(values[option.value]);
  }
  ui.accentColorInput?.setAttribute('aria-label', tr('accent'));
}

function populate() {
  ui.productNameInput.value = RS.getProductName(settings);
  ui.languageSelect.value = settings.language;
  ui.themeSelect.value = settings.theme;
  ui.densitySelect.value = settings.density;
  ui.layoutSelect.value = settings.layout;
  ui.cardStyleSelect.value = settings.cardStyle;
  ui.showHostsInput.checked = !!settings.showHosts;
  ui.openInNewTabInput.checked = !!settings.openInNewTab;
  ui.showTabIconInput.checked = settings.showTabIcon !== false;
  ui.showProxyNavInput.checked = settings.showProxyNav !== false;
  ui.showSessionsNavInput.checked = settings.showSessionsNav !== false;
  ui.showToolsNavInput.checked = settings.showToolsNav !== false;
  ui.accentEnabledInput.checked = !!settings.useCustomAccent;
  ui.accentColorInput.value = RS.normalizeHexColor(settings.accentColor);
  ui.backgroundModeSelect.value = ['aurora','clean','custom'].includes(settings.backgroundMode) ? settings.backgroundMode : 'aurora';
  ui.backgroundBlurInput.value = String(Math.max(0, Math.min(24, Number(settings.backgroundBlur) || 0)));
  ui.backgroundDimInput.value = String(Math.max(0, Math.min(70, Number(settings.backgroundDim) || 0)));
  updateRangeLabels();
  ui.backgroundRemoveButton.disabled = !backgroundImage;
}

function bind() {
  ui.settingsForm.addEventListener('submit', (event) => event.preventDefault());
  const selectKeys = { languageSelect:'language', themeSelect:'theme', densitySelect:'density', layoutSelect:'layout', cardStyleSelect:'cardStyle', backgroundModeSelect:'backgroundMode' };
  for (const [id, key] of Object.entries(selectKeys)) ui[id].addEventListener('change', () => saveSetting(key, ui[id].value));
  const checkboxKeys = { showHostsInput:'showHosts', openInNewTabInput:'openInNewTab', showTabIconInput:'showTabIcon', showProxyNavInput:'showProxyNav', showSessionsNavInput:'showSessionsNav', showToolsNavInput:'showToolsNav', accentEnabledInput:'useCustomAccent' };
  for (const [id, key] of Object.entries(checkboxKeys)) ui[id].addEventListener('change', () => saveSetting(key, ui[id].checked));
  ui.productNameInput.addEventListener('change', async () => {
    const name = RS.normalizeProductName(ui.productNameInput.value);
    ui.productNameInput.value = name;
    await saveSetting('productName', name);
  });
  ui.accentColorInput.addEventListener('input', async () => {
    settings.accentColor = RS.normalizeHexColor(ui.accentColorInput.value);
    settings.useCustomAccent = true;
    ui.accentEnabledInput.checked = true;
    await persist(false);
  });
  ui.accentResetButton.addEventListener('click', async () => {
    settings.useCustomAccent = false;
    settings.accentColor = RS.DEFAULT_SETTINGS.accentColor;
    ui.accentEnabledInput.checked = false;
    ui.accentColorInput.value = settings.accentColor;
    await persist();
  });
  const queueRangeSave = () => {
    settings.backgroundBlur = Number(ui.backgroundBlurInput.value) || 0;
    settings.backgroundDim = Number(ui.backgroundDimInput.value) || 0;
    updateRangeLabels();
    RS.applyBackground(document.documentElement, settings, backgroundImage);
    clearTimeout(rangeSaveTimer);
    rangeSaveTimer = setTimeout(() => persist(), 180);
  };
  ui.backgroundBlurInput.addEventListener('input', queueRangeSave);
  ui.backgroundDimInput.addEventListener('input', queueRangeSave);
  ui.backgroundUploadButton.addEventListener('click', () => ui.backgroundFileInput.click());
  ui.backgroundFileInput.addEventListener('change', handleBackgroundFile);
  ui.backgroundRemoveButton.addEventListener('click', removeBackground);
}

async function saveSetting(key, value) {
  settings[key] = value;
  if (key === 'language' || key === 'productName' || key.startsWith('show') || key === 'theme' || key === 'density' || key === 'layout' || key === 'cardStyle' || key === 'backgroundMode' || key === 'useCustomAccent') {
    await persist();
  }
}

async function persist(showState = true) {
  settings = await RS.saveSettings(settings);
  applyPage();
  if (showState) showSaved();
}

function showSaved() {
  clearTimeout(savedTimer);
  ui.settingsSaved.classList.add('visible');
  savedTimer = setTimeout(() => ui.settingsSaved.classList.remove('visible'), 1800);
}

function updateRangeLabels() {
  ui.backgroundBlurValue.textContent = `${Number(ui.backgroundBlurInput.value) || 0} px`;
  ui.backgroundDimValue.textContent = `${Number(ui.backgroundDimInput.value) || 0}%`;
}

async function handleBackgroundFile() {
  const file = ui.backgroundFileInput.files?.[0];
  if (!file) return;
  ui.backgroundUploadButton.disabled = true;
  try {
    backgroundImage = await RS.saveBackgroundImage(await prepareBackgroundImage(file));
    settings.backgroundMode = 'custom';
    ui.backgroundModeSelect.value = 'custom';
    ui.backgroundRemoveButton.disabled = false;
    await persist();
  } catch (error) {
    RS.notify(error.message || tr('imageFailed'), { tone: 'error', duration: 6500 });
  } finally {
    ui.backgroundFileInput.value = '';
    ui.backgroundUploadButton.disabled = false;
  }
}

async function removeBackground() {
  backgroundImage = '';
  await RS.saveBackgroundImage('');
  if (settings.backgroundMode === 'custom') settings.backgroundMode = 'aurora';
  ui.backgroundModeSelect.value = settings.backgroundMode;
  ui.backgroundRemoveButton.disabled = true;
  await persist();
}

async function prepareBackgroundImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(tr('imageType'));
  if (file.size > 25 * 1024 * 1024) throw new Error(tr('imageSize'));
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2560 / bitmap.width, 1600 / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .88));
  if (!blob) throw new Error(tr('imageFailed'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error(tr('imageFailed')));
    reader.readAsDataURL(blob);
  });
}
