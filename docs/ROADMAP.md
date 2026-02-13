# Nganya Rides — Product Roadmap

From prototype skeleton to full-fledged bus simulator. Phased, actionable.

---

## Phase 1 — Turn it into a real bus

**Goal:** Driving feels heavy, slow to accelerate, with real vehicle behaviour. Realism > arcade.

### Vehicle

- [x] Replace “cube” with proper bus 3D (current: composed mesh; later: GLTF or improved procedural).
- [x] **Wheel colliders / suspension feel** — Body roll when turning, pitch on brake/accel, wheel rotation visuals.
- [x] **Steering mechanics** — Bicycle model; heavier, slower response.
- [x] **Acceleration & braking curves** — accelCurve(speed); no constant linear accel.
- [x] Reverse gear (already in physics).
- [x] **Handbrake** — Space; strong decel, no throttle while held.
- [x] **Indicators** — Q/E left/right; 3D blink + gameState.
- [x] **Headlights** — L toggle; PointLights on bus.
- [x] **Horn** — H hold; Web Audio beep.

**Deliverable:** One cohesive VehicleController-style behaviour: heavy, slow to accelerate, slight body roll. All inputs (handbrake, indicators, lights, horn) wired.

---

## Phase 2 — Core simulator systems

**Goal:** From “driving demo” to “game” — passengers, traffic AI, economy.

### Passenger system

- [ ] Bus stops with **waiting passengers** (count or simple sprites).
- [ ] **Boarding animation** / timing (door open, delay, capacity check).
- [ ] **Fare collection** — Per passenger or per trip; link to distance/comfort later.
- [ ] **Max capacity** — Block boarding when full; show in UI.
- [ ] **Mood system** — Angry if late; affects tips or penalties (formula later).
- [ ] **Revenue** = f(passengers, distance, comfort).

### Traffic & AI

- [ ] **AI cars** — Already started in `traffic.js`; refine lane follow, lights, wrap.
- [ ] **Traffic lights** that actually control traffic (NPCs stop on red).
- [ ] **Random traffic events** — Breakdowns, jams, diversions (lightweight).
- [ ] **Police fines** — Already in `matatuCulture.js`; extend for violations.
- [ ] **Speed limits** — Per zone or road; display and enforce.
- [ ] **Penalties & license points** — Fines, points, game-over or suspension at max points.

### Fuel & economy

- [ ] **Fuel stations** — Locations; refuel only there (or pay premium elsewhere).
- [ ] **Fuel cost** — Variable price; show on HUD when at station.
- [ ] **Maintenance cost** — Periodic; deduct from cash.
- [ ] **Breakdowns** — Random chance or wear-based; stop until repaired.
- [ ] **Tire wear** — Optional; affects grip or triggers maintenance.
- [ ] **Upgrades** — Engine (accel/top speed), suspension (comfort), fuel efficiency. Unlock with cash.

**Deliverable:** Passengers generate revenue; traffic and police enforce rules; fuel and maintenance are meaningful.

---

## Phase 3 — Open world upgrade

**Goal:** City blocks, districts, real routes.

- [ ] **City blocks, buildings, sidewalks** — Procedural or tiled; performance budget.
- [ ] **Traffic density zones** — CBD high, residential lower, highway medium.
- [ ] **Districts** — CBD, Residential, Industrial, Highway; different speed limits and demand.
- [ ] **Named routes** — Route 1: CBD ↔ Estate; Route 2: Airport; Route 3: School route.
- [ ] **RouteSystem** — Waypoints, route selection, schedule (Phase 4).

**Deliverable:** Map feels like a transport network, not a single road.

---

## Phase 4 — Gameplay depth

- [ ] **Career mode** — Start small (one bus); earn; buy bigger buses; hire drivers; build company.
- [ ] **Role switching** — Driver, Conductor, **Fleet Manager** (assign routes, view finances).
- [ ] Progression and meta-goals (e.g. unlock routes, vehicles).

**Deliverable:** Long-term goals and role variety.

---

## Phase 5 — Visual polish

- [ ] **Skybox**, **shadows**, **better lighting**, **reflections**, **post-processing**.
- [ ] **Road textures**, **lane markings**.
- [ ] **Rain**, **night mode**, **fog**, **day/night cycle**.

**Deliverable:** Looks like a shipped game, not a block prototype.

---

## Phase 6 — Addictive systems

- [ ] **Daily income target** (already have goal cash); **loan system**; **vehicle insurance**.
- [ ] **Random events** — Fuel price spike, demand surge, breakdown.
- [ ] **Dynamic passenger demand** — Time of day, district, weather.

**Deliverable:** Strategy + skill + simulation loop.

---

## Commercial-level reference

- **Bus Simulator 21** — UI, physics feel, economy, map scale.
- **Euro Truck Simulator 2** — Career, upgrades, world design.
- **OMSI 2** — Realistic bus handling, systems depth.

---

## Kenyan / cultural IP (future)

- Matatu culture mode (music, graffiti, SACCO).
- Custom skins, route bidding, dynamic pricing.
- Cultural IP as differentiator.

---

## Implementation order (summary)

1. **Phase 1** — Real bus feel (physics curves, roll, handbrake, indicators, headlights, horn).
2. **Phase 2** — Passengers, traffic AI, fuel/economy (stops, fares, capacity, mood; speed limits, points; fuel stations, maintenance, upgrades).
3. **Phase 3** — Open world (districts, routes, buildings).
4. **Phase 4** — Career, Fleet Manager role.
5. **Phase 5** — Visuals (sky, shadows, weather, day/night).
6. **Phase 6** — Loans, insurance, events, demand.

Architecture: see **ARCHITECTURE.md**. Keep core systems modular so new features and multiplayer slot in cleanly.
