# Berzerk Web Edition — v11 PWA

This is the approved v10 game with PWA installation and offline caching enabled. The gameplay and responsive layout have not been changed.

## Publish on GitHub Pages

1. Upload the **contents** of this folder (not the enclosing folder) to the root of your public `berzerk-web` repository, including `assets/sounds/`.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, branch **main**, folder **/(root)**, and **Save**.
4. Wait for deployment and open `https://YOUR-USERNAME.github.io/berzerk-web/`.
5. On the iPad in Safari, visit the site online and let it finish loading. Use **Share → Add to Home Screen** (and **Open as Web App** if offered).
6. Launch from the Home Screen once while online. Then turn on Airplane Mode and launch again to test offline playback.

## Important

- The first visit needs an internet connection. The offline cache is populated by the service worker after the initial page load.
- GitHub Pages is public; anyone with the URL can access the game.
- For future releases, bump the `CACHE` version in `sw.js` and the `?v=` suffixes in `index.html`.
- The game requires HTTPS for service worker installation, except for local `localhost` testing.
- The installed app may need an online relaunch to pick up a newer version.
