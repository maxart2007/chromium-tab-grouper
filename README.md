# Chromium Tab Grouper

A starter Chromium extension that groups browser tabs using AI suggestions.

## Features

- Popup lists all open tabs in JSON form.
- The tab list can be sent to Google's Gemini (`gemini-2.5-flash`), which returns grouping instructions containing only tab IDs. The response is validated to ensure every tab is present exactly once before the extension reorders and groups the tabs.
- Options page allows storing a Gemini API key and optional context.

## Development

1. Load the extension in developer mode in Chromium-based browsers.
2. Open the extension options to save your Gemini API key and context.
3. Use the popup to request tab grouping from the AI.
