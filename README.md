# comet.js - A JavaScript & HTML Canvas Comet animation

A lightweight JavaScript & HTML5 canvas demo that renders a glowing comet head with a particle‑based tail. The comet arcs across the screen, fades out before the edge, and respawns. A small control panel lets you tune emission, speed, arc height, particle lifetime, and more in real time.

## Features
- Glowing comet head with soft radial bloom
- Particle tail with randomized speed, spread, and lifetime
- Smooth arc trajectory across the viewport
- Head fade‑out before exiting the canvas
- Live control panel for quick tweaking

## Live Demo
- On CodePen: [https://codepen.io/melliatto/pen/VYjXjbV](https://codepen.io/melliatto/pen/VYjXjbV)
- You can also view a variation of this Comet integrated into the top Hero section of my [dev portfolio website](https://elliottprogrammer.com): [https://elliottprogrammer.com](https://elliottprogrammer.com)

### Screenshot/cast

![comet-js-demo](https://github.com/user-attachments/assets/a72d6dcf-cbc1-4f0d-bc39-93204e5f9396)

## Getting Started
1. Install Node.js 18 or newer
2. Put your DashScope key in `.env` as `QWEN_API_KEY`
3. Run `node server.cjs`
4. Open `http://localhost:3000`

The reply box uses the DashScope OpenAI-compatible API and defaults to `qwen-flash`.
Do not publish `.env` or put the API key in frontend JavaScript.

## Publish a public link

GitHub Pages can host the meteor page, but it cannot run `server.cjs`. Deploy
`server.cjs` to a Node.js service such as Render, Railway, or a VPS first.
For a typical Node.js service, use `node server.cjs` as the start command.
Set these environment variables on that service:

```text
QWEN_API_KEY=your-key
QWEN_MODEL=qwen-flash
ALLOWED_ORIGINS=https://your-name.github.io
```

Then edit `api-config.js` in the GitHub Pages copy:

```js
window.QWEN_API_BASE_URL = 'https://your-backend.example.com';
```

For GitHub Pages, put the contents of this folder in a repository, enable
**Settings > Pages > Deploy from a branch**, and select the branch/folder
containing `index.html`. Do not upload `.env`.

## Files
- `index.html` — full-screen canvas and script included
- `style.css` — canvas + control panel css styling
- `comet.js` — meteor animation and reply box logic
- `server.cjs` — local API proxy for Qwen replies

## Customize
Adjust the sliders in the control panel to change:
- Head speed (px/sec)
- Head radius (px)
- Head glow (px)
- Arc height (screen frac)
- Emission rate (particles/sec)
- Tail spread (radians)
- Particle radius min (px)
- Particle radius max (px)
- Particle life min (sec)
- Particle life max (sec)
- Head fade start (progress)

### Author

[Bryan Elliott, AKA @elliottprogrammer](https://elliottprogrammer.com)

## License
MIT

**! Important !** - If you found this useful, please git it a Github Star! ⭐️
