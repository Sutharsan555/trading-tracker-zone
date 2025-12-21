# Local Web Server Guide

To use the full functionality of AlphaTrack, including **Social Login (Google/Facebook)**, you must run the application on a local web server rather than opening the `.html` files directly.

## Option 1: VS Code Live Server (Easiest)
1. Open the project folder in **VS Code**.
2. Click the **"Go Live"** button in the bottom status bar.
3. Your browser will open the app at `http://127.0.0.1:5500`.

## Option 2: Python (No installation needed)
If you have Python installed, run this in your terminal inside the project folder:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

## Option 3: Node.js (http-server)
If you have Node.js installed, run:
```bash
npx http-server ./
```
Then visit `http://localhost:8080`.

## Why is this required?
Social login providers (like Google) require a secure, valid origin for redirects. The `file://` protocol is not considered a valid origin for these security-sensitive operations.
