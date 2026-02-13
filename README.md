# Nganya Rides — Nairobi Matatu Simulator

A browser-based 3D matatu (minibus) simulator: drive on a looping road, switch to conductor mode with road-following autopilot, pick up and drop off passengers at bus stops, and deal with traffic and the occasional police stop.

## How to run

**No install:** Open the game on **GitHub Pages** (once the repo has Pages enabled):  
`https://<your-username>.github.io/Nganya-Rides/`  
That’s the intended environment — no Node or npm needed.

**Optional local:** Don’t open `index.html` by double‑clicking (file:// won’t work). From this folder run a local server, then open the URL it gives you:

```bash
npx serve
# or (if you have Python): python -m http.server 8000
```
Then open `http://localhost:3000` (or the port from the command).

## How to play

- **Driver:** **W** / ↑ accelerate, **S** / ↓ brake, **A** / **D** turn. **Space** handbrake. **Q** / **E** indicators, **L** headlights, **H** horn. Stay on the road and obey the traffic light.
- **Conductor:** Click **Switch Role**. Autopilot drives along the road. At **green rings** (bus stops), use **Pick up** or **Drop off** to earn fares.
- **Today’s target:** Earn KSh 5,000. Out of fuel and out of cash? Use **Start new day** to reset.
- The **road loops** — drive past one end to reappear at the other. Refuel when needed (KSh 500).

## Tech

- Vanilla JS (ES modules), Three.js r128, Tailwind CSS. No build step; run with any static file server.

## License

MIT
