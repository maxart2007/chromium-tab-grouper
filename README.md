# Chromium Tab Grouper

A starter Chromium extension that will group browser tabs using AI suggestions.

## Features

- Browser action button groups the two rightmost tabs into a test group titled "Test" and shows a popup listing all open tabs as JSON with their IDs and titles.
- Popup can send the open tab list to Google's Gemini (using the `gemini-2.5-flash` model) and displays the AI response or any API error.
- Options page allows storing a Gemini API key for future AI integration.

## Development

1. Load the extension in developer mode in Chromium-based browsers.
2. Click the toolbar button to group the two rightmost tabs into a "Test" group.
3. Open the extension options to save your Gemini API key.

This is a placeholder scaffold; the AI grouping logic will be implemented later.
