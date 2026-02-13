/**
 * Realistic road system: asphalt, lanes, markings, intersection, traffic light position.
 * Units: 1 = 1 meter.
 */
export const ROAD_WIDTH = 14;           // Total width (2 lanes + shoulders)
export const ROAD_LENGTH = 1200;        // Main stretch
export const ROAD_HALF = ROAD_LENGTH / 2;
export const LANE_WIDTH = 3.5;
export const GROUND_LEVEL = 0;
export const INTERSECTION_Z = 0;        // Where crossing road is
export const INTERSECTION_WIDTH = 12;   // Crossing road width

/** Wrap z so the road loops: when you pass one end you appear at the other */
export function wrapZ(z) {
    let out = z;
    while (out > ROAD_HALF) out -= ROAD_LENGTH;
    while (out < -ROAD_HALF) out += ROAD_LENGTH;
    return out;
}

/** Shortest signed delta Z for pathfinding (handles wrap) */
export function shortestDeltaZ(fromZ, toZ) {
    let d = toZ - fromZ;
    if (d > ROAD_HALF) d -= ROAD_LENGTH;
    if (d < -ROAD_HALF) d += ROAD_LENGTH;
    return d;
}

/** Squared distance to target using shortest path (for arrival check) */
export function shortestDistSq(busX, busZ, targetX, targetZ) {
    const dx = targetX - busX;
    const dz = shortestDeltaZ(busZ, targetZ);
    return dx * dx + dz * dz;
}

export function getRoadBounds() {
    return { xMin: -ROAD_WIDTH / 2, xMax: ROAD_WIDTH / 2, zMin: -ROAD_HALF, zMax: ROAD_HALF };
}

// Traffic light position (at intersection, so NPCs know where to stop)
export function getTrafficLightPosition() {
    return { x: 0, z: INTERSECTION_Z };
}

export function getIntersectionBounds() {
    return {
        xMin: -INTERSECTION_WIDTH / 2,
        xMax: INTERSECTION_WIDTH / 2,
        zMin: INTERSECTION_Z - INTERSECTION_WIDTH / 2,
        zMax: INTERSECTION_Z + INTERSECTION_WIDTH / 2
    };
}

// Is position inside intersection (for red-light check)?
export function isInIntersection(x, z) {
    const b = getIntersectionBounds();
    return x >= b.xMin && x <= b.xMax && z >= b.zMin && z <= b.zMax;
}

export function createRoads(scene) {
    const asphaltColor = 0x2d2d2d;
    const lineColor = 0xffffff;
    const curbColor = 0x4a4a4a;
    const y = GROUND_LEVEL;

    // --- Main road (long strip along Z) ---
    const mainRoadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const mainRoadMat = new THREE.MeshLambertMaterial({ color: asphaltColor });
    const mainRoad = new THREE.Mesh(mainRoadGeo, mainRoadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, y - 0.02, 0);
    scene.add(mainRoad);

    // Lane markings: dashed center line
    const dashLength = 3;
    const dashGap = 4;
    const dashWidth = 0.15;
    const dashGeo = new THREE.PlaneGeometry(dashWidth, dashLength);
    const dashMat = new THREE.MeshBasicMaterial({ color: lineColor });
    for (let z = -ROAD_LENGTH / 2; z < ROAD_LENGTH / 2; z += dashLength + dashGap) {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, y + 0.01, z);
        scene.add(dash);
    }

    // Edge lines (solid) - left and right of main road
    const edgeLineGeo = new THREE.PlaneGeometry(0.2, ROAD_LENGTH);
    const edgeLineMat = new THREE.MeshBasicMaterial({ color: lineColor });
    const leftEdge = new THREE.Mesh(edgeLineGeo, edgeLineMat);
    leftEdge.rotation.x = -Math.PI / 2;
    leftEdge.position.set(-ROAD_WIDTH / 2, y + 0.01, 0);
    scene.add(leftEdge);
    const rightEdge = new THREE.Mesh(edgeLineGeo, edgeLineMat);
    rightEdge.rotation.x = -Math.PI / 2;
    rightEdge.position.set(ROAD_WIDTH / 2, y + 0.01, 0);
    scene.add(rightEdge);

    // Curbs (low walls along edges)
    const curbHeight = 0.15;
    const curbDepth = 0.3;
    const curbGeo = new THREE.BoxGeometry(ROAD_WIDTH + curbDepth * 2, curbHeight, ROAD_LENGTH + 2);
    const curbMat = new THREE.MeshLambertMaterial({ color: curbColor });
    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-ROAD_WIDTH / 2 - curbDepth, y + curbHeight / 2, 0);
    scene.add(leftCurb);
    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(ROAD_WIDTH / 2 + curbDepth, y + curbHeight / 2, 0);
    scene.add(rightCurb);

    // --- Crossing road at intersection ---
    const crossRoadGeo = new THREE.PlaneGeometry(INTERSECTION_WIDTH + 4, ROAD_WIDTH);
    const crossRoad = new THREE.Mesh(crossRoadGeo, mainRoadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(0, y - 0.015, INTERSECTION_Z);
    scene.add(crossRoad);

    // Crossing road center line (short dash)
    const crossDash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, INTERSECTION_WIDTH), dashMat);
    crossDash.rotation.x = -Math.PI / 2;
    crossDash.position.set(0, y + 0.01, INTERSECTION_Z);
    scene.add(crossDash);

    // 3D Traffic light at intersection (pole + three lights)
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 5, 8);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const lightPole = new THREE.Mesh(poleGeo, poleMat);
    lightPole.position.set(ROAD_WIDTH / 2 + 1.5, y + 2.5, INTERSECTION_Z);
    scene.add(lightPole);
    const boxGeo = new THREE.BoxGeometry(0.6, 1.2, 0.25);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const redLight = new THREE.Mesh(boxGeo, redMat);
    redLight.position.y = 0.4;
    const yellowLight = new THREE.Mesh(boxGeo, yellowMat);
    const greenLight = new THREE.Mesh(boxGeo, greenMat);
    greenLight.position.y = -0.4;
    const lightBox = new THREE.Group();
    lightBox.add(redLight);
    lightBox.add(yellowLight);
    lightBox.add(greenLight);
    lightBox.position.set(ROAD_WIDTH / 2 + 1.5, y + 5, INTERSECTION_Z);
    scene.add(lightBox);
    function setTrafficLightState(state) {
        redMat.color.setHex(state === 'RED' ? 0xef4444 : 0x3f0f0f);
        yellowMat.color.setHex(state === 'YELLOW' ? 0xeab308 : 0x554008);
        greenMat.color.setHex(state === 'GREEN' ? 0x22c55e : 0x0f3d1f);
    }

    return { mainRoad, crossRoad, setTrafficLightState };
}
