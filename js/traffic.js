/**
 * NPC traffic: cars that follow the road, obey traffic lights, and react to the player.
 */
import { ROAD_WIDTH, ROAD_LENGTH, ROAD_HALF, GROUND_LEVEL, getIntersectionBounds, getTrafficLightPosition } from './roads.js';

const CAR_LENGTH = 4;
const CAR_WIDTH = 1.8;
const CAR_HEIGHT = 1.4;
const NPC_SPEED = 8;           // m/s
const NPC_BRAKE_DISTANCE = 15; // stop this far from intersection when red
const SPAWN_INTERVAL = 4000;   // ms between spawns
const LANE_OFFSET = 2.5;       // meters from center (left/right lane)

export class TrafficManager {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.vehicles = [];
        this.lastSpawn = 0;
    }

    spawnVehicle() {
        // Spawn at north or south end, drive toward the other end
        const direction = Math.random() > 0.5 ? 1 : -1;
        const z = direction > 0 ? -ROAD_LENGTH / 2 - 10 : ROAD_LENGTH / 2 + 10;
        const lane = (Math.random() > 0.5 ? 1 : -1) * LANE_OFFSET;
        const mesh = this.createCarMesh();
        mesh.position.set(lane, GROUND_LEVEL + CAR_HEIGHT / 2, z);
        mesh.rotation.y = direction > 0 ? 0 : Math.PI;
        this.vehicles.push({
            mesh,
            speed: 0,
            targetSpeed: NPC_SPEED * (0.7 + Math.random() * 0.3),
            direction,
            lane,
            length: CAR_LENGTH,
            width: CAR_WIDTH
        });
        this.scene.add(mesh);
    }

    createCarMesh() {
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(CAR_WIDTH, CAR_HEIGHT * 0.6, CAR_LENGTH * 0.9);
        const bodyMat = new THREE.MeshLambertMaterial({
            color: Math.random() > 0.5 ? 0x2563eb : 0xdc2626
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.1;
        group.add(body);
        // Cabin
        const cabinGeo = new THREE.BoxGeometry(CAR_WIDTH * 0.95, CAR_HEIGHT * 0.5, CAR_LENGTH * 0.4);
        const cabinMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.z = 0.2;
        cabin.position.y = 0.35;
        group.add(cabin);
        // Wheels (simple dark boxes)
        const wheelGeo = new THREE.BoxGeometry(0.3, 0.2, 0.6);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x171717 });
        const positions = [[CAR_WIDTH/2 - 0.2, -0.25, CAR_LENGTH/2 - 0.5], [CAR_WIDTH/2 - 0.2, -0.25, -CAR_LENGTH/2 + 0.5], [-CAR_WIDTH/2 + 0.2, -0.25, CAR_LENGTH/2 - 0.5], [-CAR_WIDTH/2 + 0.2, -0.25, -CAR_LENGTH/2 + 0.5]];
        positions.forEach(([x, y, z]) => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(x, y, z);
            group.add(w);
        });
        return group;
    }

    update(deltaTime, playerMesh, playerSpeed) {
        const now = Date.now();
        if (now - this.lastSpawn > SPAWN_INTERVAL) {
            this.spawnVehicle();
            this.lastSpawn = now;
        }

        const lightPos = getTrafficLightPosition();
        const bounds = getIntersectionBounds();
        const red = this.gameState.trafficLightState === 'RED';

        for (const v of this.vehicles) {
            // Distance to intersection (in direction of travel)
            const distToIntersection = v.direction > 0 ? lightPos.z - v.mesh.position.z : v.mesh.position.z - lightPos.z;

            // Slow or stop for red light
            if (red && distToIntersection > 0 && distToIntersection < NPC_BRAKE_DISTANCE + 5) {
                const brake = Math.min(1, distToIntersection / NPC_BRAKE_DISTANCE);
                v.speed = v.targetSpeed * brake * 0.3;
            } else {
                v.speed += (v.targetSpeed - v.speed) * Math.min(1, deltaTime * 2);
            }

            // Move
            const move = v.speed * deltaTime * v.direction;
            v.mesh.position.z += move;

            // Loop: wrap at road ends so traffic never disappears
            if (v.mesh.position.z > ROAD_HALF + 25) v.mesh.position.z = -ROAD_HALF + 25;
            if (v.mesh.position.z < -ROAD_HALF - 25) v.mesh.position.z = ROAD_HALF - 25;
        }
    }

    getVehicles() {
        return this.vehicles;
    }
}
