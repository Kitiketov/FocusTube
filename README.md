# FocusTube

FocusTube is a small static Manifest V3 extension for keeping YouTube focused:
search-only home, Shorts limits, optional watch-page recommendation blur, and
sidebar controls.

## Features

- Search-only YouTube home page, with a popup toggle to restore recommendations.
- Shorts modes: blocked, daily time limit, or allowed.
- Watch-page side recommendation blur with an inline reveal button.
- Optional compact/locked YouTube sidebar behavior.
- Popup links for feedback, GitHub attribution, and developer support.

## Development

```powershell
npm install
npm run dom-check
```

The extension is static. Load the `extension` folder as an unpacked extension in
Chrome or Microsoft Edge.

## Packaging

```powershell
npm run package
npm run package:firefox
```

The Chrome/Edge and Firefox ZIPs are created in `output/release/`.
