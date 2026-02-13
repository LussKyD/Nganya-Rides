/**
 * Realistic bus stops: shelter, sign, bench. Positions used by conductor for routes.
 */
import { ROAD_WIDTH, GROUND_LEVEL } from './roads.js';

// waitingPassengers is set when stop becomes a destination or on first visit (Phase 2).
export const BUS_STOPS = [
    { name: 'CBD', baseFare: 150, z: 80, id: 'cbd' },
    { name: 'Kibera', baseFare: 100, z: -60, id: 'kibera' },
    { name: 'Thika Road', baseFare: 200, z: 150, id: 'thika' },
    { name: 'Embakasi', baseFare: 120, z: -120, id: 'embakasi' },
    { name: 'Westlands', baseFare: 80, z: 30, id: 'westlands' },
    { name: 'Industrial', baseFare: 90, z: -30, id: 'industrial' }
];

const PULL_OVER_X = ROAD_WIDTH / 2 - 2; // meters from center (right side)

export function getStopPosition(stop) {
    return { x: PULL_OVER_X, z: stop.z };
}

export function createBusStopMeshes(scene) {
    const stops = [];
    const shelterColor = 0x4a90d9;
    const poleColor = 0x374151;
    const signColor = 0xffd700;

    BUS_STOPS.forEach((stop, i) => {
        const group = new THREE.Group();

        // Shelter roof (flat canopy)
        const roofGeo = new THREE.BoxGeometry(4, 0.15, 2.5);
        const roofMat = new THREE.MeshLambertMaterial({ color: shelterColor });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 2.5;
        group.add(roof);

        // Poles
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.7, 8);
        const poleMat = new THREE.MeshLambertMaterial({ color: poleColor });
        [-1, 1].forEach(s => {
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(s * 1.5, 1.35, 0);
            group.add(pole);
        });

        // Sign (bus stop name)
        const signGeo = new THREE.BoxGeometry(1.8, 0.4, 0.08);
        const signMat = new THREE.MeshLambertMaterial({ color: signColor });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 2.1, 0.6);
        group.add(sign);

        // Bench
        const benchGeo = new THREE.BoxGeometry(2, 0.15, 0.5);
        const benchMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const bench = new THREE.Mesh(benchGeo, benchMat);
        bench.position.set(0, 0.08, -0.4);
        group.add(bench);

        group.position.set(PULL_OVER_X + 2.5, GROUND_LEVEL, stop.z);
        scene.add(group);
        const stopData = { ...stop, mesh: group, position: { x: PULL_OVER_X, z: stop.z }, waitingPassengers: 0 };
        stops.push(stopData);
    });

    return stops;
}
