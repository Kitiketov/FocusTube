<p align="center">
  <img src="./extension/icons/icon-128.png" alt="FocusTube icon" width="96" height="96" />
</p>

<h1 align="center">FocusTube</h1>

<p align="center">
  Расширение, которое возвращает YouTube в режим инструмента: поиск вместо шумной главной, лимиты Shorts и меньше отвлекающих рекомендаций.
</p>

<p align="center">
  <a href="./README.md">RU</a>
  ·
  <a href="./README.eu.md">EU</a>
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.2.2-black" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-YouTube-red" />
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-HTML%2FCSS%2FJS-orange" />
  <img alt="Browsers" src="https://img.shields.io/badge/browsers-Chrome%20%7C%20Edge%20%7C%20Firefox-blue" />
  <img alt="Status" src="https://img.shields.io/badge/status-active-green" />
</p>

## Содержание

- [О проекте](#о-проекте)
- [Возможности](#возможности)
- [Скачать](#скачать)
- [Установка](#установка)
- [Разработка](#разработка)
- [Технологии](#технологии)
- [Автор](#автор)

## О проекте

FocusTube помогает заходить на YouTube за конкретным видео, а не проваливаться в бесконечную ленту. Расширение убирает самые липкие точки интерфейса, но оставляет контроль пользователю: любую ключевую функцию можно включить или выключить в popup.

## Возможности

- Search-only главная YouTube с отдельной галочкой для возврата обычных рекомендаций.
- Три режима Shorts: отключены, лимит по времени или разрешены.
- Дневной лимит Shorts: 5, 10, 15, 30 или 60 минут.
- Автоблокировка Shorts до завтра или на выбранное количество часов.
- Блюр боковых рекомендаций на странице просмотра видео.
- Кнопка с глазиком для временного показа заблюренных рекомендаций.
- Управление раскрытием боковой панели YouTube.
- Переключение языка интерфейса расширения: RU / EU.
- Ссылка на обратную связь и кнопка поддержки разработчика.

## Скачать

Последний релиз:

https://github.com/Kitiketov/FocusTube/releases/tag/v0.2.2

Архивы:

- `focustube-0.2.2.zip` для Chrome и Microsoft Edge.
- `focustube-firefox-0.2.2.zip` для Firefox.

## Установка

### Chrome / Microsoft Edge

1. Скачай `focustube-0.2.2.zip`.
2. Распакуй архив.
3. Открой `chrome://extensions` или `edge://extensions`.
4. Включи Developer mode / Режим разработчика.
5. Нажми Load unpacked / Загрузить распакованное.
6. Выбери распакованную папку расширения.

### Firefox

1. Скачай `focustube-firefox-0.2.2.zip`.
2. Распакуй архив.
3. Открой `about:debugging#/runtime/this-firefox`.
4. Нажми Load Temporary Add-on.
5. Выбери `manifest.json` из распакованной папки.

## Разработка

```powershell
npm install
npm run dom-check
```

Сборка архивов:

```powershell
npm run package
npm run package:firefox
```

Готовые ZIP-файлы появляются в `output/release/`.

## Технологии

- Manifest V3 для Chrome и Microsoft Edge.
- Manifest V2-совместимая сборка для Firefox.
- Vanilla JavaScript, HTML и CSS.
- Chrome/Firefox WebExtensions APIs.
- Playwright для DOM и smoke-проверок.
- PowerShell scripts для упаковки релизов.

## Автор

Автор: [kitiketov](https://github.com/Kitiketov).

Обратная связь: https://forms.gle/RRq2P8Bh814HoqZ48

Поддержать разработчика можно из popup расширения.
