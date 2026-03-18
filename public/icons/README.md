# PWA Icons

Generate all icon sizes from your master icon file.

## Quick generate (run from project root)

Install sharp-cli:
```bash
npm install -g sharp-cli
```

Generate all sizes from a single 512x512 source PNG:
```bash
sharp -i src/assets/icon.png -o public/icons/icon-72x72.png resize 72 72
sharp -i src/assets/icon.png -o public/icons/icon-96x96.png resize 96 96
sharp -i src/assets/icon.png -o public/icons/icon-128x128.png resize 128 128
sharp -i src/assets/icon.png -o public/icons/icon-144x144.png resize 144 144
sharp -i src/assets/icon.png -o public/icons/icon-152x152.png resize 152 152
sharp -i src/assets/icon.png -o public/icons/icon-192x192.png resize 192 192
sharp -i src/assets/icon.png -o public/icons/icon-384x384.png resize 384 384
sharp -i src/assets/icon.png -o public/icons/icon-512x512.png resize 512 512
```

## Required sizes
| Size    | Usage                          |
|---------|--------------------------------|
| 72x72   | Android legacy                 |
| 96x96   | Android / shortcuts            |
| 128x128 | Chrome Web Store               |
| 144x144 | Windows tile / IE              |
| 152x152 | iOS Safari bookmark            |
| 192x192 | Android home screen (maskable) |
| 384x384 | Android splash                 |
| 512x512 | Android home screen (maskable) |

## Apple touch icons (add to public/)
Also generate:
- apple-touch-icon.png (180x180) — iOS Safari "Add to Home Screen"
- apple-touch-icon-precomposed.png (180x180) — legacy iOS

```bash
sharp -i src/assets/icon.png -o public/apple-touch-icon.png resize 180 180
```
