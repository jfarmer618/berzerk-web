# Berzerk Web Edition — v12 (Gamepad + PWA)

Based on v11, with optional Gamepad API controls. Existing keyboard, touch, gameplay, audio and PWA functionality are retained.

## SteelSeries Stratus XL controls (standard Gamepad mapping)

- Left stick or D-pad: move (8 directions)
- Right stick: aim and automatically fire while held away from center
- A button or right trigger: fire in the last right-stick aiming direction (otherwise the player’s facing direction)
- Start button: pause / resume

The right stick uses a 0.28 dead zone to reduce drift. These mappings assume the browser reports the controller using the standard Gamepad mapping. Older controllers can report nonstandard button/axis assignments. If controls behave unexpectedly, inspect the axes and button indices using a gamepad tester and adjust `gamepadInputs()` in `game.js`.

## Updating GitHub Pages

Upload the **contents** of this folder to the repository root, replacing existing files. Keep the `assets/sounds` folder. GitHub Pages should be configured for `main` and `/(root)`.

The service worker cache was bumped to `berzerk-web-v12`, and script/style query versions to `?v=12`. Once deployed, launch the app **online** and reload/relaunch to pick up updates; then test offline. iPad Home Screen PWAs may need a full close and reopen to activate the new service worker.

## Testing checklist

1. Confirm the SteelSeries controller is paired in iPad Settings → Bluetooth.
2. In Safari, open the GitHub Pages game and press a controller button, then test both sticks, D-pad, A and Start.
3. Test touch controls and keyboard to check for regressions.
4. Test the installed Home Screen PWA separately; Safari gamepad support does not guarantee identical PWA behavior on every iPadOS version.
5. After loading online, disable network and verify offline play.

This release was syntax-checked but has **not** been runtime-tested on an actual iPad or SteelSeries controller.

## v13: Touch control visibility
On an iPad, tap **TOUCH: OFF** (initially **TOUCH: ON**) to hide the on-screen movement and firing pads when using a Bluetooth controller. Tap again to restore them. The choice is saved on the device. Keyboard and gamepad input continue to work with either setting.
