# Nganya Rides — Nairobi Matatu Simulator

A browser-based 3D matatu (minibus) simulator: drive on a looping road, switch to conductor mode with road-following autopilot, pick up and drop off passengers at bus stops, and deal with traffic and the occasional police stop.

## How to run

Serve the project over HTTP (required for ES modules):

```bash
npx serve
# or: python -m http.server 8000
```

Then open `http://localhost:3000` (or the port shown) in your browser.

## How to play

- **Driver:** **W** / ↑ accelerate, **S** / ↓ brake, **A** / **D** turn. Stay on the road and obey the traffic light at the intersection.
- **Conductor:** Click **Switch Role**. Autopilot drives along the road. At **green rings** (bus stops), use **Pick up** or **Drop off** to earn fares.
- The **road loops** — drive past one end to reappear at the other. Refuel when needed (KSh 500).

## Tech

- Vanilla JS (ES modules), Three.js r128, Tailwind CSS. No build step; run with any static file server.

## License

MIT
