# AlphaTrack Mobile App Setup Guide

Your AlphaTrack trading journal is now a **Progressive Web App (PWA)** that works as a mobile app on Android and iOS devices!

## What's New

✅ **Offline Support** - Work without internet and sync when reconnected  
✅ **Install as App** - Add to home screen like a native mobile app  
✅ **App Shortcuts** - Quick access to Add Trade and Journal directly from home screen  
✅ **Improved Caching** - Better performance with optimized asset loading  
✅ **Service Worker** - Handles offline functionality and background sync  

## How to Install on Mobile

### Android (Chrome/Edge)

1. Open the app URL (http://127.0.0.1:5500 or your server URL) on your Android device
2. Open the app in **Google Chrome** or **Microsoft Edge**
3. You'll see an **"Install"** prompt at the bottom of the screen
4. Tap **"Install"**
5. The app will be added to your home screen as a standalone app

**Alternative Method:**
- Tap the menu (⋮) → **"Install app"**
- Or tap menu → **"Add to Home screen"**

### iOS (Safari)

1. Open the app URL in **Safari** on your iPhone/iPad
2. Tap the **Share** button at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Enter the app name (or use "AlphaTrack")
5. Tap **"Add"**
6. The app will appear on your home screen

## Features

### Offline Trading
- Add trades, journal entries, and tasks while offline
- Data syncs automatically when you reconnect to the internet
- All your data is stored locally on your device

### App Shortcuts (Long-press home screen icon)
- **Add Trade** - Quickly log a new trade
- **Journal** - Write a journal entry

### Installation Methods

**Web Server Running:**
```bash
npx http-server ./
# Visit: http://localhost:8080
```

**Python Alternative:**
```bash
python -m http.server 8000
# Visit: http://localhost:8000
```

**VS Code Live Server:**
1. Install the Live Server extension
2. Right-click index.html → "Open with Live Server"
3. Your browser opens at http://127.0.0.1:5500

## Storage & Data

- **Local Storage**: Your data is stored locally on your device
- **IndexedDB**: Larger amounts of data (trades, journal entries)
- **Service Worker Cache**: Caches app assets for faster loading
- **Firebase**: Cloud sync when authenticated

## Troubleshooting

### "Install" button not showing
- Ensure you're accessing via HTTPS or localhost
- Check that you're using a compatible browser (Chrome, Edge, Safari)
- Clear browser cache and reload

### App not caching assets
- Check browser DevTools → Storage → Cache Storage
- Ensure all assets load successfully
- Service Worker may need a hard refresh (Ctrl+Shift+R)

### Offline features not working
- Verify Service Worker is installed: DevTools → Application → Service Workers
- Check that you have enough storage space on your device
- Some Firebase operations may not work fully offline

## For Development

**Cache Management:**
- Service Worker caches assets in `alpha-track-static-v2` (static files)
- Dynamic content in `alpha-track-dynamic-v2` (API responses)
- Clear cache by going to DevTools → Application → Storage → Clear site data

**Update Service Worker:**
- Close all app instances
- Hard refresh the page (Ctrl+Shift+R)
- New Service Worker will activate

## Performance Tips

1. **Keep app updated** - Service Worker checks for updates automatically
2. **Use mobile-optimized features** - Bottom navigation for easy thumb access
3. **Save offline** - Add trades offline, they'll sync when connected
4. **Manage storage** - Device storage varies; clear cache if needed

## Need Help?

Check browser console (F12) for any errors. The Service Worker logs information about caching and sync operations.

---

**Version**: 1.0.0 PWA  
**Supported Browsers**: Chrome 40+, Firefox 44+, Safari 11.1+, Edge 15+  
**Minimum Storage**: ~50MB for full cache
