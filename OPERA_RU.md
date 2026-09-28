# RStartpage для Opera — 1.9.0

Отдельная ветка `opera-support`, основанная на `firefox-support` (aaf8998).
Версия совпадает с Firefox: **1.9.0**. В main ничего не переносится.
Сборка предназначена для актуальной настольной Opera / Opera GX, не Android.

## 1. Скачать и установить

1. Откройте https://github.com/regesheu/RStartpage/actions и выберите **Build Opera**.
2. Откройте успешный запуск для ветки **opera-support**.
3. Внизу, в **Artifacts**, скачайте **RStartpage-Opera**. Для скачивания войдите в GitHub.
4. Распакуйте скачанный артефакт. Внутри будет `RStartpage-Opera-1.9.0.zip`.
5. Распакуйте и этот ZIP в постоянную папку, например `RStartpage-Opera`.
   В выбранной папке должен лежать `manifest.json`.
6. В Opera откройте `opera://extensions`, включите **Режим разработчика**,
   нажмите **Загрузить распакованное расширение** и выберите эту папку.
7. Закрепите значок RStartpage. Нажмите его, затем кнопку с домиком — откроется рабочая страница.
8. Проверьте новую вкладку. Opera не использует стандартную замену новой вкладки Chrome:
   сборка перенаправляет известные стартовые страницы через API вкладок.
   Если ваша версия Opera не сообщает такой адрес расширению, открывайте страницу
   кнопкой с домиком. Проверка в настоящей Opera остаётся обязательной перед публикацией.
9. Разрешите доступ к сайтам в карточке расширения для проверки ссылок и прокси.

Папку распакованного расширения нельзя удалять или перемещать после установки.
Обновляйте файлы в той же папке и нажимайте **Обновить / Reload** в `opera://extensions`.
Не удаляйте расширение для обновления: это может удалить локальные данные.

## 2. Подготовить Google Cloud

Без OAuth Client ID расширение работает локально; подключение Google Drive отключено
с пояснением. В этой исходной сборке ID не задан.

1. Откройте https://console.cloud.google.com/ и выберите **тот же проект**,
   который используется RStartpage для Chrome и Firefox.
2. **APIs & Services → Library → Google Drive API → Enable**.
3. **Google Auth Platform → Branding**: проверьте название приложения,
   контактный email и ссылки. В **Data Access** добавьте область доступа:
   `https://www.googleapis.com/auth/drive.appdata`.
4. Если в **Audience** выбран режим **Testing**, добавьте свой Google-аккаунт в **Test users**.
   Если настройки согласия уже заполнены для Chrome/Firefox, используйте существующие.

## 3. Создать OAuth-клиент для Opera

1. **Google Auth Platform → Clients → Create client**.
2. Тип: **Web application**, имя: **RStartpage Opera**.
   Не выбирайте **Chrome Extension**. Chrome-клиент нельзя просто скопировать.
3. В **Authorized redirect URIs** добавьте точный адрес этой тестовой сборки:

   ```text
   https://mmmgbkaajcailpdmghnecgnkbpipkdfb.chromiumapp.org/
   ```

   Конечный `/` обязателен. Если Google просит **Authorized JavaScript origins**,
   укажите `https://mmmgbkaajcailpdmghnecgnkbpipkdfb.chromiumapp.org` без конечного `/`.
4. Нажмите **Create** и скопируйте **Client ID** вида `123…-….apps.googleusercontent.com`.
   **Client secret не нужен**: его нельзя встраивать в расширение или отправлять в чат.
5. Для проверки фактического адреса откройте `opera://extensions`, у RStartpage
   нажмите ссылку **service worker / Inspect** и выполните в консоли:

   ```js
   ROperaDriveAuth.getRedirectURL()
   ```

   Если фактический адрес отличается, добавьте именно его в Authorized redirect URIs.
   Публичный ключ в сборке стабилизирует ID распакованного расширения. Магазин может
   выдать другой ID: после первой магазинной установки повторите эту проверку.

## 4. Добавить Client ID в сборку без терминала

1. Репозиторий → **Settings → Secrets and variables → Actions**.
2. Нажмите **New repository secret**.
3. **Name:** `OPERA_DRIVE_CLIENT_ID`. **Secret:** скопированный Client ID.
4. Нажмите **Add secret**.
5. Откройте **Actions → Build Opera**, последний запуск для `opera-support`.
6. Нажмите **Re-run all jobs**. Либо **Run workflow**, если кнопка доступна,
   обязательно выбрав `opera-support`.
7. После успешной сборки скачайте новый **RStartpage-Opera**.
8. Распакуйте внутренний ZIP поверх файлов в той же папке расширения и нажмите **Reload**.
9. RStartpage → **Settings → Data → Connect Google Drive** → войдите в Google
   и разрешите доступ к данным приложения.

Secret используется только как настройка сборки: сам Client ID публичный и виден
в `opera-config.js`. Он не является паролем или OAuth client secret.

## 5. Проверить перед публикацией

1. Создайте тестовую заметку и проверьте статус синхронизации.
2. Создайте резервную копию в **Settings → Data**, скачайте её и проверьте содержимое.
3. Отключите сеть, измените заметку, восстановите сеть и проверьте отправку изменений.
4. Перезапустите Opera. Если требуется повторный вход, переподключите Google Drive.
5. Если нужна общая синхронизация с Chrome/Firefox, войдите в тот же аккаунт
   в сборках, чьи OAuth-клиенты относятся к тому же Google Cloud проекту,
   и проверьте передачу тестовой заметки в обе стороны. Один и тот же email
   без общей настройки OAuth-проекта не доказывает доступ к одним appData.
6. Проверьте закладки, все страницы, импорт/экспорт, новую вкладку,
   обычный прокси и Smart Proxy Rules в установленной Opera.

Вход использует поддерживаемый Google поток для клиентских приложений через
`launchWebAuthFlow`. Проверяются redirect, state, scope, тип и срок токена.
Токен хранится только в `storage.session`, не экспортируется и не синхронизируется.
Нет client secret и refresh token; фоновое продление зависит от Google-сессии,
после истечения или перезапуска может понадобиться повторное подключение.

## Отличия Opera

- Настройки, группы ссылок и профили прокси сохраняются локально. Автоматическая
  синхронизация расширений через Opera Sync не заявляется.
- Заметки без Google Drive локальные; переключатели Chrome Sync скрыты.
- Google Drive синхронизирует заметки/группы/теги/удаления, а полные резервные копии
  восстанавливаются вручную. Drive не делает все настройки непрерывно общими.
- Закладки остаются закладками браузера. Их собственная синхронизация Opera
  настраивается отдельно от RStartpage.
- Авторизация SOCKS5, добавленная для Firefox, недоступна в Chromium-ветке Opera.
- Используется Manifest V3 и service worker. Не устанавливайте Firefox ZIP в Opera.
- Код privacy.html в этой ветке обновлён. Публичная GitHub Pages страница из main
  сама не обновится; перед магазинной публикацией согласуйте её с поведением Opera.

## Перенести данные из Chrome/Firefox

В исходном браузере: **Settings → Data → Select all → Export**.
В Opera: **Settings → Data → Import**, выберите архив, проверьте разделы и режим.
**Merge** объединяет; **Replace** заменяет выбранные разделы. Пароли прокси
добавляйте только намеренно: архив не зашифрован. Пользовательский текст не переводится.

## Публикация в Opera Add-ons

1. Войдите в кабинет https://addons.opera.com/developer/.
2. Создайте карточку RStartpage, загрузите настроенный `RStartpage-Opera-1.9.0.zip`.
3. Заполните описание, категорию, скриншоты, поддержку и актуальную политику конфиденциальности.
   Укажите Drive как необязательную функцию. Объясните проверяющим обработчик новой вкладки,
   локальное хранение и назначение разрешений для прокси/закладок/сессий.
4. Пройдите валидацию и отправьте на проверку. GitHub Actions только собирает ZIP,
   он не публикует расширение в Opera Add-ons автоматически.
5. После установки версии из магазина проверьте OAuth redirect по инструкции выше
   и при необходимости добавьте новый адрес в OAuth-клиент. Повторите тест входа.
6. Следующие версии загружайте в ту же карточку для магазинных обновлений.

## Локальная сборка и проверки

```bash
git clone --branch opera-support https://github.com/regesheu/RStartpage.git
cd RStartpage
bash scripts/build.sh opera
node scripts/test-opera.mjs
```

Настроенная сборка:

```bash
OPERA_DRIVE_CLIENT_ID='YOUR_PUBLIC_CLIENT_ID.apps.googleusercontent.com' bash scripts/build.sh opera
```

Укажите настоящий ID вместо примера. Результат: `dist/opera` и
`dist/RStartpage-Opera-1.9.0.zip`. Номер берётся из `manifest.json`.

Автоматические тесты проверяют OAuth на подставных ответах и адаптеры API.
Они не подтверждают реальный вход в Google или поведение установленной Opera.

Официальные источники:
- https://help.opera.com/en/extensions/apis/
- https://help.opera.com/en/extensions/manifest/
- https://help.opera.com/en/extensions/tab-window/
- https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
