# Nganya Rides — Architecture

Product-grade bus simulator. Modular, scalable, clean.

---

## Core systems (target structure)

```
Core Systems
 ├── VehicleController   — Bus model, physics, steering, lights, horn, suspension feel
 ├── PassengerSystem     — Stops, waiting pax, boarding, fares, capacity, mood
 ├── EconomySystem       — Cash, fuel, maintenance, upgrades, loans, insurance
 ├── TrafficSystem       — AI cars, lights, events, police, speed limits, penalties
 ├── RouteSystem         — Routes, waypoints, districts, open world
 ├── WeatherSystem       — Rain, fog, day/night, skybox
```

---

## Current codebase mapping

| System | Current module(s) | Notes |
|--------|--------------------|--------|
| **VehicleController** | `physics.js`, bus creation in `game.js` | Phase 1: consolidate feel, lights, horn, body roll. Later: extract to `js/core/VehicleController.js`. |
| **PassengerSystem** | `conductorRole.js`, `busStops.js` | Stops + conductor pick/drop. Expand to waiting pax, boarding, mood, revenue formula. |
| **EconomySystem** | `gameState` (cash, fuel), refuel in `game.js` | Add fuel stations, maintenance, breakdowns, upgrades. |
| **TrafficSystem** | `traffic.js`, `roads.js` (lights), `matatuCulture.js` (police) | Lights control flow; add speed limits, points, random events. |
| **RouteSystem** | `conductorRole.js` (autopilot, stops) | Phase 3: routes (CBD, Estate, Airport), districts. |
| **WeatherSystem** | — | Phase 5: skybox, rain, fog, day/night. |
| **UI** | `uiManager.js` | HUD, overlays, controls. Add indicators, gear, headlights. |

---

## Principles

- **Single responsibility** — Each system owns one domain. Game loop only orchestrates.
- **Shared state** — `gameState` is the main contract; systems read/write defined fields. No random globals.
- **Events over coupling** — Systems react to state (e.g. `fuel <= 0`) or explicit events; avoid direct cross-imports where possible.
- **Future-proof** — Structure so multiplayer or new roles (Fleet Manager) can plug in without rewriting core.

---

## Data flow (high level)

1. **Input** → keyState / touchControl.
2. **VehicleController / Physics** → speed, steering, position, roll/pitch.
3. **TrafficSystem** → NPCs, light state, penalties.
4. **PassengerSystem** → passengers, fares, boarding at stops.
5. **EconomySystem** → cash, fuel, costs, upgrades.
6. **gameState** → single source of truth for UI and other systems.
7. **UI** → reads gameState, shows HUD, overlays, messages.

---

## File layout (current → target)

- `js/game.js` — Scene, init, game loop, camera. Thin orchestrator; no business logic.
- `js/physics.js` — Vehicle dynamics (curves, roll, handbrake). May be absorbed by VehicleController.
- `js/core/VehicleController.js` — (Phase 1+) Bus mesh, lights, horn, wheel visuals; uses physics output.
- `js/conductorRole.js` — Conductor + autopilot + stop logic. Feeds into PassengerSystem later.
- `js/busStops.js` — Stop positions and meshes. PassengerSystem will own waiting pax.
- `js/traffic.js` — NPC traffic. Part of TrafficSystem.
- `js/roads.js` — Road geometry, bounds, wrap. Shared by Vehicle + Traffic + Route.
- `js/matatuCulture.js` — Police, traffic light checks. Part of TrafficSystem.
- `js/uiManager.js` — All UI. Add vehicle HUD (indicators, lights, gear).

---

## Next steps

See **ROADMAP.md** for phased plan. Phase 1 focuses on turning the bus into a real-feel vehicle (physics, lights, horn, handbrake, indicators) without yet moving files; Phase 2+ add passengers, economy, traffic depth, then open world and polish.
