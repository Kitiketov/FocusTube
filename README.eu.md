<p align="center">
  <img src="./extension/icons/icon-128.png" alt="FocusTube icon" width="96" height="96" />
</p>

<h1 align="center">FocusTube</h1>

<p align="center">
  A lightweight browser extension that turns YouTube back into a focused tool: search-first home, Shorts limits, and fewer recommendation traps.
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

## Contents

- [About](#about)
- [Features](#features)
- [Download](#download)
- [Installation](#installation)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Author](#author)

## About

FocusTube helps you open YouTube for a specific video instead of falling into an endless feed. It removes the stickiest parts of the interface while keeping control in your hands: every key feature can be enabled or disabled from the popup.

## Features

- Search-only YouTube home page, with a toggle to restore the normal recommendation feed.
- Three Shorts modes: blocked, time-limited, or allowed.
- Daily Shorts limits: 5, 10, 15, 30, or 60 minutes.
- Automatic Shorts lockout until tomorrow or for a selected number of hours.
- Watch-page side recommendation blur.
- Inline eye button to temporarily reveal blurred recommendations.
- YouTube sidebar expansion control.
- Feedback link and developer support button.

## Download

Latest release:

https://github.com/Kitiketov/FocusTube/releases/tag/v0.2.2

Packages:

- `focustube-0.2.2.zip` for Chrome and Microsoft Edge.
- `focustube-firefox-0.2.2.zip` for Firefox.

## Installation

### Chrome / Microsoft Edge

1. Download `focustube-0.2.2.zip`.
2. Extract the archive.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the extracted extension folder.

### Firefox

1. Download `focustube-firefox-0.2.2.zip`.
2. Extract the archive.
3. Open `about:debugging#/runtime/this-firefox`.
4. Click Load Temporary Add-on.
5. Select `manifest.json` from the extracted folder.

## Development

```powershell
npm install
npm run dom-check
```

Build release packages:

```powershell
npm run package
npm run package:firefox
```

Generated ZIP files are written to `output/release/`.

## Tech Stack

- Manifest V3 for Chrome and Microsoft Edge.
- Manifest V2-compatible package for Firefox.
- Vanilla JavaScript, HTML, and CSS.
- Chrome/Firefox WebExtensions APIs.
- Playwright for DOM and smoke checks.
- PowerShell scripts for release packaging.

## Author

Created by [kitiketov](https://github.com/Kitiketov).

Feedback: https://forms.gle/RRq2P8Bh814HoqZ48

Developer support is available from the extension popup.
