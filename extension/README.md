# FocusTube

A small static Manifest V3 extension for keeping YouTube focused: search-first home, Shorts limits, and distraction controls.

## Behavior

- Removes the home feed, recommendations, topic chips, shelves, and Shorts surfaces from the YouTube home page.
- Keeps the YouTube account area in the masthead available.
- Adds a centered YouTube search form that opens `/results?search_query=...`.
- Locks scrolling on the home page.
- Hides Shorts entry points across YouTube.
- Redirects direct `/shorts/...` visits back to `/`.
- Leaves search results, watch pages, and channel pages outside search-only mode.
- Adds popup settings for toggling the search-only home, Shorts mode, a daily Shorts time limit, sidebar expansion, interface language, and watch-page recommendation blur.
- Supports three Shorts modes: always blocked, limited by daily watch time, or allowed.
- Keeps the watch-page compact guide hidden and adds an inline eye button for temporarily showing blurred side recommendations.
- Opens the YooMoney support flow directly from the popup button.
- Links to the feedback form from the popup.

## Load Locally

1. Open Edge or Chrome extensions.
2. Enable developer mode.
3. Choose "Load unpacked".
4. Select this `extension` folder.

No build step is required.
