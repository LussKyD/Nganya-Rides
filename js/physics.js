/**
 * Realistic vehicle physics: bicycle model, steering angle, drag, proper braking.
 * All units: meters, seconds, m/s. gameState.speed = forward velocity (m/s).
 */
import { gameState, DRIVER, CONDUCTOR, matatuMesh, keyState, touchControl, GROUND_LEVEL, MATATU_HEIGHT, stopRoute } from './game.js';

// Vehicle dynamics (realistic minibus)
const WHEELBASE = 5;              // meters (distance between axles)
const MAX_STEER_ANGLE = 0.55;     // rad ~31°
const STEER_RATE = 2.2;           // rad/s (how fast steering wheel turns)
const ACCELERATION = 2.8;         // m/s²
const BRAKE_DECEL = 7;            // m/s²
const MAX_SPEED_MS = 15;          // ~54 km/h
const REVERSE_MAX = 3;            // m/s reverse
const DRAG_COEFF = 0.35;          // air resistance factor
const ROLLING_FRICTION = 0.02;   // constant decel when no throttle
const MIN_SPEED = 0.01;

const FUEL_CONSUMPTION_RATE = 0.03;

export class Physics {
    constructor(gameState, matatuMesh, keyState, touchControl) {
        this.gameState = gameState;
        this.matatuMesh = matatuMesh;
        this.keyState = keyState;
        this.touchControl = touchControl;
        // Steering angle in radians (current wheel angle)
        this.steeringAngle = 0;
    }

    consumeFuel() {
        const rate = FUEL_CONSUMPTION_RATE * (1 + Math.abs(this.gameState.speed) / MAX_SPEED_MS);
        this.gameState.fuel = Math.max(0, this.gameState.fuel - rate);
        if (this.gameState.fuel <= 0 && this.gameState.isDriving) {
            stopRoute();
        }
    }

    driveUpdate(currentRole, deltaTime) {
        if (this.gameState.fuel <= 0 || this.gameState.isModalOpen) {
            this.gameState.speed = 0;
            this.steeringAngle = 0;
            if (this.gameState.fuel <= 0) stopRoute();
            return;
        }

        const dt = Math.min(deltaTime, 0.1);
        let speed = this.gameState.speed;

        // --- 1. Steering input (accumulate steering angle) ---
        const isTurningLeft = this.keyState['a'] || this.keyState['A'] || this.keyState['ArrowLeft'] || this.touchControl.left;
        const isTurningRight = this.keyState['d'] || this.keyState['D'] || this.keyState['ArrowRight'] || this.touchControl.right;
        if (currentRole === DRIVER) {
            if (isTurningLeft) this.steeringAngle = Math.max(-MAX_STEER_ANGLE, this.steeringAngle - STEER_RATE * dt);
            else if (isTurningRight) this.steeringAngle = Math.min(MAX_STEER_ANGLE, this.steeringAngle + STEER_RATE * dt);
            else this.steeringAngle *= 0.92; // return to center
        }

        // --- 2. Acceleration / Brake (only when driver) ---
        if (currentRole === DRIVER) {
            const isAccelerating = this.keyState['w'] || this.keyState['W'] || this.keyState['ArrowUp'] || this.touchControl.forward;
            const isBraking = this.keyState['s'] || this.keyState['S'] || this.keyState['ArrowDown'];

            if (isBraking) {
                if (speed > 0) speed = Math.max(0, speed - BRAKE_DECEL * dt);
                else if (speed < 0) speed = Math.min(0, speed + BRAKE_DECEL * dt);
                else speed = Math.max(-REVERSE_MAX, speed - ACCELERATION * 0.5 * dt);
            } else if (isAccelerating) {
                if (speed >= 0) speed = Math.min(MAX_SPEED_MS, speed + ACCELERATION * dt);
                else speed = Math.min(0, speed + BRAKE_DECEL * dt); // brake out of reverse
            } else {
                // Rolling friction + drag
                const drag = DRAG_COEFF * speed * speed * 0.01;
                const roll = ROLLING_FRICTION * (speed > 0 ? 1 : -1);
                speed -= (drag + roll) * dt;
                if (Math.abs(speed) < MIN_SPEED) speed = 0;
            }
        }

        this.gameState.speed = speed;

        // --- 3. Apply turning (bicycle model: omega = v * tan(steer) / L) ---
        const absSpeed = Math.abs(speed);
        if (absSpeed > MIN_SPEED) {
            const turnRate = (speed / WHEELBASE) * Math.tan(this.steeringAngle);
            this.matatuMesh.rotation.y -= turnRate * dt;
        }

        // --- 4. Move forward along heading (bus front is -Z in model space, so forward = -Z) ---
        if (absSpeed > MIN_SPEED) {
            const dir = new THREE.Vector3(0, 0, -1);
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.matatuMesh.rotation.y);
            this.matatuMesh.position.x += dir.x * speed * dt;
            this.matatuMesh.position.z += dir.z * speed * dt;
        }

        this.matatuMesh.position.y = GROUND_LEVEL + MATATU_HEIGHT / 2;
        this.gameState.isDriving = absSpeed > MIN_SPEED;
    }
}
