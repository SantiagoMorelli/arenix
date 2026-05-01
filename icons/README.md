# Volley Web — PWA icon set

Drop these into your real app to get the same logo as the prototype landing page.

## Files

- `icon.svg` — master vector (any-purpose, padded for OS rounding)
- `icon-maskable.svg` — full-bleed master for Android adaptive icons
- `favicon.svg` — simplified mono version for tabs (16/32 px)
- `icon-{192,256,384,512,1024}.png` — standard PWA sizes
- `icon-maskable-{192,384,512}.png` — Android maskable
- `apple-touch-icon-180.png` — iOS home screen
- `favicon-{16,32}.png` — browser tab fallback
- `manifest.webmanifest` — ready-to-ship manifest

## Install in your app

1. Copy the entire `icons/` folder into your app's `public/` (Next.js, Vite, CRA) or `static/` (SvelteKit, Nuxt).
2. Reference the manifest from your `<head>`:

```html
<link rel="manifest" href="/icons/manifest.webmanifest">
<meta name="theme-color" content="#F76C1B">

<!-- iOS -->
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Volley Web">

<!-- Browser tab -->
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png">
```

3. (Optional) If you want the manifest at the root rather than under `/icons/`, move `manifest.webmanifest` to `public/` and update the icon paths inside it from `/icons/...` to wherever you placed the PNGs.

## Notes

- **Brand color:** `#F5A623` (matches the app's default orange accent).
- **Background:** `#FFFFFF` (white).
- **Maskable safe zone:** logo is sized to 78% of canvas — survives aggressive circle/squircle masks on Android.
- Re-rasterize from the SVG masters if you change the brand color.
