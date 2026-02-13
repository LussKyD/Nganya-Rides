// REMOVED: import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
import { UIManager } from './uiManager.js';
import { Physics } from './physics.js?v=4';
import { MatatuCulture } from './matatuCulture.js';
import { createRoads, GROUND_LEVEL as ROAD_GROUND, wrapZ, getRoadBounds, ROAD_HALF, shortestDeltaZ } from './roads.js';
import { TrafficManager } from './traffic.js';
import { createBusStopMeshes } from './busStops.js';
// Note: ConductorRole imported later to break circular dependency

// --- GAME CONSTANTS ---
export const DRIVER = 'Driver';
export const CONDUCTOR = 'Conductor';
export const GROUND_LEVEL = ROAD_GROUND; 
export const MATATU_HEIGHT = 3;           // bus height meters
export const MATATU_LENGTH = 10;          // bus length meters
const MATATU_BODY_COLOR = 0x8800ff; 
const MATATU_ACCENT_COLOR = 0xffd700; 

// --- GLOBAL SHARED OBJECTS ---
export const GOAL_CASH = 5000;

export const gameState = {
    role: DRIVER,
    cash: 1000,
    fuel: 100,
    isDriving: false,
    speed: 0,
    maxSpeed: 15,
    acceleration: 2.5,
    rotationSpeed: 0.8,
    autopilotInterval: null,

    trafficLightState: 'GREEN',
    isModalOpen: false,

    passengers: 0,
    maxPassengers: 14,
    currentDestination: null,
    targetMarker: null,
    currentStop: null,

    goalReached: false,
    goalCash: GOAL_CASH,
    atFuelStation: false,
    speedLimitKmh: 50,
    speedingAccumulator: 0,
    maintenanceTicks: 0,

    // Phase 1 — vehicle systems
    handbrake: false,
    indicatorLeft: false,
    indicatorRight: false,
    headlightsOn: false,
    hornActive: false,
};

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, clock;
export let matatuMesh; 
export const keyState = {}; 
export const touchControl = { forward: false, left: false, right: false }; 

// --- MODULE INSTANCES ---
let uiManager;
let physics;
let matatuCulture;
let conductorRole;
let trafficManager;

// --- EXPORTS FOR OTHER MODULES ---
export const obstacles = [];
export const busStops = [];
let setTrafficLightState = () => {};

// ----------------------------------
// --- 3D SCENE INITIALIZATION ---
// ----------------------------------

function createMatatuBus() {
    const g = new THREE.Group();
    const w = 2.5;
    const h = MATATU_HEIGHT;
    const len = MATATU_LENGTH;

    // Main body (passenger section)
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.7, len * 0.75);
    const bodyMat = new THREE.MeshLambertMaterial({ color: MATATU_BODY_COLOR });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, h * 0.35, 0);
    g.add(body);

    // Window strip
    const winGeo = new THREE.BoxGeometry(w + 0.02, h * 0.35, len * 0.7);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.75 });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(0, h * 0.5, 0);
    g.add(win);

    // Cab (driver section) - front
    const cabGeo = new THREE.BoxGeometry(w * 0.95, h * 0.6, len * 0.25);
    const cabMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, h * 0.3, -len * 0.42);
    g.add(cab);

    // Windscreen
    const screenGeo = new THREE.BoxGeometry(w * 0.9, h * 0.4, 0.05);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.6 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, h * 0.35, -len * 0.48);
    g.add(screen);

    // Roof / canopy (matatu style)
    const roofGeo = new THREE.BoxGeometry(w + 0.1, h * 0.12, len * 0.85);
    const roofMat = new THREE.MeshLambertMaterial({ color: MATATU_ACCENT_COLOR });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, h * 0.85, 0);
    g.add(roof);

    // Door (side, sliding)
    const doorGeo = new THREE.BoxGeometry(0.08, h * 0.55, 1.2);
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(w / 2 + 0.05, h * 0.28, len * 0.15);
    g.add(door);

    // Headlights
    const lightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const lL = new THREE.Mesh(lightGeo, lightMat);
    lL.rotation.x = Math.PI / 2;
    lL.position.set(-0.6, h * 0.1, -len / 2 - 0.1);
    g.add(lL);
    const lR = lL.clone();
    lR.position.x = 0.6;
    g.add(lR);

    // Wheels (6 for minibus) — store refs for rotation animation
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x171717 });
    const wheelPositions = [
        [w/2 + 0.2, -h/2 + 0.35, -len/2 + 0.8], [-w/2 - 0.2, -h/2 + 0.35, -len/2 + 0.8],
        [w/2 + 0.2, -h/2 + 0.35, 0], [-w/2 - 0.2, -h/2 + 0.35, 0],
        [w/2 + 0.2, -h/2 + 0.35, len/2 - 0.8], [-w/2 - 0.2, -h/2 + 0.35, len/2 - 0.8]
    ];
    const wheelMeshes = [];
    wheelPositions.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        g.add(wheel);
        wheelMeshes.push(wheel);
    });
    g.userData.wheels = wheelMeshes;

    // Indicator lights (small quads left/right) — visibility toggled by blink
    const indMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const indGeo = new THREE.PlaneGeometry(0.2, 0.15);
    const indL = new THREE.Mesh(indGeo, indMat.clone());
    indL.position.set(-w/2 - 0.15, h * 0.25, -len/2 - 0.2);
    indL.rotation.y = Math.PI / 2;
    g.add(indL);
    const indR = new THREE.Mesh(indGeo, indMat.clone());
    indR.position.set(w/2 + 0.15, h * 0.25, -len/2 - 0.2);
    indR.rotation.y = -Math.PI / 2;
    g.add(indR);
    indL.visible = false;
    indR.visible = false;
    g.userData.indicatorLeft = indL;
    g.userData.indicatorRight = indR;

    // Headlight point lights (child lights, intensity set from gameState.headlightsOn)
    const headLightL = new THREE.PointLight(0xffeedd, 0, 22);
    headLightL.position.set(-0.6, h * 0.1, -len/2 - 0.2);
    g.add(headLightL);
    const headLightR = new THREE.PointLight(0xffeedd, 0, 22);
    headLightR.position.set(0.6, h * 0.1, -len/2 - 0.2);
    g.add(headLightR);
    g.userData.headLights = [headLightL, headLightR];

    return g;
}

function createEnvironment() {
    // Grass/terrain beyond road
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_LEVEL - 0.05;
    scene.add(ground);

    const roadResult = createRoads(scene);
    if (roadResult && roadResult.setTrafficLightState) setTrafficLightState = roadResult.setTrafficLightState;
    const stops = createBusStopMeshes(scene);
    busStops.length = 0;
    busStops.push(...stops);
    createFuelStations(scene);
}

const FUEL_STATION_POSITIONS = [{ z: -250 }, { z: 280 }];
const FUEL_STATION_RADIUS = 22;

function createFuelStations(scene) {
    const pumpGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.2, 12);
    const pumpMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    FUEL_STATION_POSITIONS.forEach(({ z }) => {
        const group = new THREE.Group();
        const pump = new THREE.Mesh(pumpGeo, pumpMat.clone());
        pump.position.y = 1.1;
        group.add(pump);
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0x171717 }));
        nozzle.rotation.z = Math.PI / 2;
        nozzle.position.set(0.5, 0.8, 0);
        group.add(nozzle);
        group.position.set(getRoadBounds().xMax - 4, GROUND_LEVEL, z);
        scene.add(group);
    });
}

// FIX: Initialize Three.js objects first.
export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvasContainer').appendChild(renderer.domElement);
    renderer.domElement.id = 'gameCanvas';

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.1);
    sun.position.set(80, 120, 50);
    scene.add(sun);

    clock = new THREE.Clock();
    createEnvironment();
    matatuMesh = createMatatuBus();
    matatuMesh.position.set(0, GROUND_LEVEL + MATATU_HEIGHT / 2, 0);
    scene.add(matatuMesh);

    window.addEventListener('resize', onWindowResize);

    initModules();
}

function hideLoadingShowGame() {
    const el = document.getElementById('loadingScreen');
    if (el) el.classList.add('hidden');
    const err = document.getElementById('loadingError');
    if (err) err.classList.add('hidden');
}

function showLoadingError() {
    const el = document.getElementById('loadingScreen');
    if (el) el.classList.add('hidden');
    const err = document.getElementById('loadingError');
    if (err) err.classList.remove('hidden');
}

function initModules() {
    import('./conductorRole.js')
        .then(({ ConductorRole }) => {
            uiManager = new UIManager(gameState, touchControl);
            physics = new Physics(gameState, matatuMesh, keyState, touchControl);
            matatuCulture = new MatatuCulture(gameState, matatuMesh, uiManager);
            trafficManager = new TrafficManager(scene, gameState);
            conductorRole = new ConductorRole(gameState, matatuMesh, scene, uiManager, busStops);

            uiManager.linkActions({
                switchRole: switchRole,
                handleRefuel: handleRefuel,
                newDay: newDay,
                handleConductorAction: conductorRole.handleConductorAction.bind(conductorRole),
                startRoute: startRoute,
                stopRoute: stopRoute,
            });

            uiManager.setupUI();
            matatuCulture.startTrafficLightCycle();

            animate();
            hideLoadingShowGame();
            uiManager.showGameMessage("Today's target: KSh 5,000. Drive or conduct — good luck!", 5000);
        })
        .catch((err) => {
            console.error('Game init failed', err);
            showLoadingError();
        });
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----------------------------------
// --- CORE GAME CONTROL FUNCTIONS ---
// ----------------------------------

export function startRoute() {
    if (!conductorRole) {
        console.error("ConductorRole not initialized yet.");
        return;
    }
    
    if (gameState.fuel <= 0) {
        if (!gameState.isDriving) uiManager.showGameMessage("Cannot start route. Fuel is empty!");
        return;
    }
    if (gameState.autopilotInterval !== null) return; 

    conductorRole.initRoute(); 
    gameState.autopilotInterval = setInterval(gameLoop, 500); 
    gameState.isDriving = true;
    uiManager.showGameMessage("Route started!", 2000);
}

export function stopRoute() {
    if (gameState.autopilotInterval === null) return; 

    clearInterval(gameState.autopilotInterval);
    gameState.autopilotInterval = null;
    gameState.speed = 0; 
    uiManager.showGameMessage("Route STOPPED.", 2000);
}

const REFUEL_COST = 500;
const REFUEL_AMOUNT = 100;

function handleRefuel() {
    if (gameState.fuel === 100) {
        uiManager.showGameMessage("Fuel is already full!", 2000);
        return;
    }
    if (gameState.cash >= REFUEL_COST) {
        gameState.cash -= REFUEL_COST;
        gameState.fuel = REFUEL_AMOUNT;
        uiManager.showGameMessage("Refueled! Back to 100%.", 2000);
        stopRoute();
    } else {
        uiManager.showGameMessage("Insufficient funds! KSh 500 needed to refuel.", 3000);
    }
    uiManager.updateUI();
}

function newDay() {
    stopRoute();
    gameState.cash = 1000;
    gameState.fuel = 100;
    gameState.goalReached = false;
    gameState.passengers = 0;
    gameState.currentDestination = null;
    gameState.targetMarker = null;
    gameState.currentStop = null;
    gameState.speedingAccumulator = 0;
    gameState.maintenanceTicks = 0;
    lastNpcCollisionTime = 0;
    if (conductorRole && conductorRole.targetMarkerMesh && scene) {
        scene.remove(conductorRole.targetMarkerMesh);
        conductorRole.targetMarkerMesh = null;
    }
    uiManager.showGameMessage("New day! Good luck.", 2500);
    uiManager.updateUI();
}

function switchRole() {
    if (gameState.isModalOpen) return;

    gameState.role = gameState.role === DRIVER ? CONDUCTOR : DRIVER;
    
    if (gameState.role === CONDUCTOR && !gameState.isDriving) {
         startRoute(); 
    }
    
    // Immediately stop driving when switching to conductor if the autopilot logic can take over
    if (gameState.role === CONDUCTOR) {
        uiManager.showGameMessage("Driver taking the wheel (Autopilot Active)!", 2000);
    }

    uiManager.showGameMessage(`Role switched to ${gameState.role}!`, 2000);
    uiManager.updateUI();
}

// ----------------------------------
// --- PASSIVE GAME LOOP (500ms) ---
// ----------------------------------

const MAINTENANCE_INTERVAL_TICKS = 120; // 60s at 500ms/tic
const MAINTENANCE_COST = 15;
const CASH_FLOOR = -2000;

function gameLoop() {
    if (!gameState.isDriving || gameState.isModalOpen) return;

    physics.consumeFuel();
    conductorRole.passiveRoleUpdate();

    if (gameState.role === DRIVER) {
        const speedKmh = Math.abs(gameState.speed) * 3.6;
        if (speedKmh > gameState.speedLimitKmh) gameState.speedingAccumulator += 0.5;
        else gameState.speedingAccumulator = 0;
        matatuCulture.checkSpeedingViolation();
    }

    gameState.maintenanceTicks++;
    if (gameState.maintenanceTicks >= MAINTENANCE_INTERVAL_TICKS) {
        gameState.maintenanceTicks = 0;
        gameState.cash = Math.max(CASH_FLOOR, gameState.cash - MAINTENANCE_COST);
    }

    uiManager.updateUI();
}

// ----------------------------------
// --- 3D ANIMATION LOOP (Request Frame) ---
// ----------------------------------

function updateCamera() {
    const dist = 18;
    const height = 8;
    const angle = matatuMesh.rotation.y;
    camera.position.x = matatuMesh.position.x - dist * Math.sin(angle);
    camera.position.z = matatuMesh.position.z + dist * Math.cos(angle);
    camera.position.y = matatuMesh.position.y + height;
    const look = matatuMesh.position.clone();
    look.y += 1.5;
    look.x += Math.sin(angle) * 6;
    look.z -= Math.cos(angle) * 6;
    camera.lookAt(look);
}

function updateFuelStationProximity() {
    const pos = matatuMesh.position;
    let near = false;
    for (const st of FUEL_STATION_POSITIONS) {
        const dz = Math.abs(shortestDeltaZ(pos.z, st.z));
        if (dz < FUEL_STATION_RADIUS) { near = true; break; }
    }
    gameState.atFuelStation = near;
}

function applyRoadWrapAndBounds() {
    const pos = matatuMesh.position;
    const margin = 30;
    if (pos.z > ROAD_HALF - margin) pos.z = -ROAD_HALF + margin;
    if (pos.z < -ROAD_HALF + margin) pos.z = ROAD_HALF - margin;
    const b = getRoadBounds();
    const edgeInset = 2;
    if (pos.x > b.xMax - edgeInset) { pos.x = b.xMax - edgeInset; if (gameState.speed > 0.5) gameState.speed *= 0.9; }
    if (pos.x < b.xMin + edgeInset) { pos.x = b.xMin + edgeInset; if (gameState.speed > 0.5) gameState.speed *= 0.9; }
}

const NPC_COLLISION_COOLDOWN_MS = 3000; // don't re-apply slowdown for 3s so speed can recover
let lastNpcCollisionTime = 0;

export function checkCollision() {
    matatuCulture.checkObstacleCollision(matatuMesh, obstacles);
    conductorRole.checkDestinationArrival(matatuMesh, scene);
    // NPC traffic: one-time slowdown per encounter so speed can rise again (no every-frame kill)
    if (trafficManager && gameState.role === DRIVER) {
        const now = Date.now();
        if (now - lastNpcCollisionTime < NPC_COLLISION_COOLDOWN_MS) return;
        const busBox = new THREE.Box3().setFromObject(matatuMesh);
        for (const v of trafficManager.getVehicles()) {
            const vBox = new THREE.Box3().setFromObject(v.mesh);
            if (busBox.intersectsBox(vBox)) {
                gameState.speed *= 0.6;
                if (gameState.speed < 0.5) gameState.speed = 0.5;
                lastNpcCollisionTime = now;
                uiManager.showGameMessage("Traffic! Slow down.", 1500);
                break;
            }
        }
    }
}

let indicatorBlinkPhase = 0;

function updateVehicleVisuals(deltaTime) {
    if (!matatuMesh || !matatuMesh.userData) return;
    const ud = matatuMesh.userData;

    // Wheel rotation (roll forward/back)
    if (ud.wheels && gameState.speed !== 0) {
        const roll = -gameState.speed * deltaTime * 0.8;
        ud.wheels.forEach(w => { w.rotation.x += roll; });
    }

    // Headlights
    if (ud.headLights) {
        const intensity = gameState.headlightsOn ? 0.85 : 0;
        ud.headLights.forEach(l => { l.intensity = intensity; });
    }

    // Indicator blink (~1 Hz)
    indicatorBlinkPhase += deltaTime;
    if (indicatorBlinkPhase > 0.5) indicatorBlinkPhase = 0;
    const blinkOn = indicatorBlinkPhase < 0.25;
    if (ud.indicatorLeft) ud.indicatorLeft.visible = gameState.indicatorLeft && blinkOn;
    if (ud.indicatorRight) ud.indicatorRight.visible = gameState.indicatorRight && blinkOn;
}

let hornAudioContext = null;
function initHorn() {
    if (hornAudioContext) return hornAudioContext;
    hornAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    return hornAudioContext;
}
function playHorn(on) {
    if (!on) {
        if (window.__hornOsc) {
            try { window.__hornOsc.stop(); } catch (_) {}
            window.__hornOsc = null;
        }
        return;
    }
    if (window.__hornOsc) return; // already playing
    const ctx = initHorn();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 220;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.__hornOsc = osc;
}

let animationStopped = false;
function animate() {
    if (animationStopped) return;
    try {
        const deltaTime = clock.getDelta();

        if (!gameState.isModalOpen) {
            physics.driveUpdate(gameState.role, deltaTime);
            updateVehicleVisuals(deltaTime);
            applyRoadWrapAndBounds();
            updateFuelStationProximity();
            matatuCulture.checkTrafficViolation();
            if (gameState.role === CONDUCTOR && gameState.autopilotInterval) {
                conductorRole.autopilotDrive(gameState.speed, deltaTime);
            }
            if (trafficManager) trafficManager.update(deltaTime, matatuMesh, gameState.speed);
            checkCollision();
        }

        playHorn(gameState.hornActive);

        setTrafficLightState(gameState.trafficLightState);
        updateCamera();
        uiManager.updateUI();

        renderer.render(scene, camera);
    } catch (e) {
        animationStopped = true;
        console.error("Critical error in animation loop, stopping game:", e);
        return;
    }
    requestAnimationFrame(animate);
}

// ----------------------------------
// --- ENTRY POINT ---
// ----------------------------------

window.onload = function() {
    document.addEventListener('keydown', (e) => {
        keyState[e.key] = true;
        if (e.key === ' ' || e.key === 'Space') e.preventDefault();
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') startRoute();
        // Phase 1 vehicle controls
        if (e.key === 'q' || e.key === 'Q') gameState.indicatorLeft = !gameState.indicatorLeft;
        if (e.key === 'e' || e.key === 'E') gameState.indicatorRight = !gameState.indicatorRight;
        if (e.key === 'l' || e.key === 'L') gameState.headlightsOn = !gameState.headlightsOn;
        if (e.key === 'h' || e.key === 'H') gameState.hornActive = true;
    });
    document.addEventListener('keyup', (e) => {
        keyState[e.key] = false;
        if (e.key === 'h' || e.key === 'H') gameState.hornActive = false;
    });

    try {
        initScene();
    } catch (e) {
        console.error('Scene init failed', e);
        showLoadingError();
    }
};
