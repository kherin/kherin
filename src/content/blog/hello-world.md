---
title: "Hello World — Building a Personal Site with Astro, Three.js & Docker"
description: "A walkthrough of how I built this site using Astro, Three.js for the F1-inspired hero, Keystatic CMS, and Docker — and the decisions behind every choice."
publishedAt: "2026-03-03"
tags: ["Astro", "Three.js", "Docker", "Web Dev"]
draft: false
---

# Hello World

Welcome to **kherin.com** — my corner of the internet where I write about code, data science, trail running, and whatever else keeps me up at night.

## Why Astro?

I've been a fan of [Astro](https://astro.build) since it landed on the scene. It hits the sweet spot between full static site generators (fast but rigid) and full SPA frameworks (powerful but heavy). With Astro I get:

- **Zero JavaScript by default** — pages are fast out of the box
- **Islands architecture** — I can drop in React/Vue components only where I need interactivity
- **Content Collections** — type-safe markdown with zod schemas
- **View Transitions API** — smooth page transitions without a client-side router

## The F1 Design Language

Formula 1 has one of the most instantly recognisable visual identities in sport:

- Carbon fibre textures and ultra-dark backgrounds
- Aggressive red/black/white palette
- Condensed, uppercase typography
- Speed lines and sector markers as decorative elements
- Telemetry-style data displays

I translated these directly into the CSS design tokens — `#E10600` red, `Bebas Neue` for display text, thin racing stripes dividing sections, and speed-line animations throughout.

## Three.js for the Hero

The hero section runs a live Three.js scene in the browser — 500 speed-streak planes moving left at varying depths and speeds, all using `THREE.AdditiveBlending` for a natural glow without needing a full bloom post-processing pipeline. Mouse position tilts the camera slightly for parallax depth.

```typescript
const material = new THREE.MeshBasicMaterial({
  color: 0xE10600,
  transparent: true,
  opacity: 0.3,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
```

## Keystatic CMS

Blog content is managed through [Keystatic](https://keystatic.com), a file-based CMS that stores everything as markdown in the repository. In local mode (the Docker deployment), the admin panel runs at `/keystatic` — no external service required.

## Docker in Production

The site runs as a multi-stage Docker build:

1. **Builder stage** — `node:20-alpine`, installs deps, runs `astro build`
2. **Production stage** — slim Node image, runs the standalone server at port 4321
3. **Nginx** — reverse proxy handling SSL termination and `www` → `kherin.com` redirect

```yaml
services:
  web:
    build: .
    restart: unless-stopped
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
```

That's the stack. Let me know what you think on [GitHub](https://github.com/kherin) or wherever you found this.

---

*Kherin Bundhoo — Mauritius 🇲🇺*
