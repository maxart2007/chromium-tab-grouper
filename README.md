# Chromium Tab Grouper

A starter Chromium extension that groups browser tabs using AI suggestions.

## Features

- The extension adds two action menu items:
  - **Group my tabs magically** – sends open tabs to Google's Gemini (`gemini-2.5-flash`), validates the response and groups tabs accordingly. The previous order is saved before each request.
  - **Restore old order** – restores tabs to the order saved before the last grouping, including their original groups.
- Options page allows storing a Gemini API key and optional context.

## Development

1. Load the extension in developer mode in Chromium-based browsers.
2. Open the extension options to save your Gemini API key and context.
3. Click the extension icon and choose the desired action from the menu.
