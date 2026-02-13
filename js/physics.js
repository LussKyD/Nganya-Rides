/**
 * Realistic vehicle physics: bicycle model, steering, drag, braking curves.
 * Heavy bus feel: slow to accelerate, body roll/pitch. All units: m, s, m/s.
 */
import { gameState, DRIVER, CONDUCTOR, matatuMesh, keyState, touchControl, GROUND_LEVEL, MATATU_HEIGHT, stopRoute } from './game.js';

// Vehicle dynamics — heavy minibus (realism > arcade)
const WHEELBASE = 5;
const MAX_STEER_ANGLE = 0.5;
const STEER_RATE = 1.6;              // slower steering
const STEER_RETURN = 0.88;            // slower centering
const ACCEL_BASE = 1.4;               // m/s² at low speed (heavy)
const BRAKE_DECEL = 6;
const HANDBRAKE_DECEL = 9;
const MAX_SPEED_MS = 14;              // ~50 km/h
const REVERSE_MAX = 2.5;
const DRAG_COEFF = 0.42;
const ROLLING_FRICTION = 0.025;
const MIN_SPEED = 0.01;

// Acceleration curve: less effective at high speed (no constant linear)
function accelCurve(speed) {
    const t = Math.min(1, speed / MAX_SPEED_MS);
    return 1 - t * 0.65; // 35% accel at top speed
}

const FUEL_CONSUMPTION_RATE = 0.03;

// Body roll/pitch (rad) — exported for visuals
export let bodyRoll = 0;
export let bodyPitch = 0;
const ROLL_SMOOTH = 0.12;
const PITCH_SMOOTH = 0.1;
const MAX_ROLL = 0.08;
const MAX_PITCH = 0.04;

export class Physics {
    constructor(gameState, matatuMesh, keyState, touchControl) {
        this.gameState = gameState;
        this.matatuMesh = matatuMesh;
        this.keyState = keyState;
        this.touchControl = touchControl;
        this.steeringAngle = 0;
    }

    consumeFuel() {
        const rate = FUEL_CONSUMPTION_RATE * (1 + Math.abs(this.gameState.speed) / MAX_SPEED_MS);
        this.gameState.fuel = Math.max(0, this.gameState.fuel - rate);
        if (this.gameState.fuel <= 0 && this.gameState.isDriving) stopRoute();
    }

    driveUpdate(currentRole, deltaTime) {
        if (this.gameState.fuel <= 0 || this.gameState.isModalOpen) {
            this.gameState.speed = 0;
            this.steeringAngle = 0;
            bodyRoll *= 0.9;
            bodyPitch *= 0.9;
            if (this.gameState.fuel <= 0) stopRoute();
            return;
        }

        const dt = Math.min(deltaTime, 0.1);
        let speed = this.gameState.speed;
        const handbrake = !!(this.keyState[' '] || this.keyState['Space']);
        this.gameState.handbrake = handbrake;
        const isAccelerating = this.keyState['w'] || this.keyState['W'] || this.keyState['ArrowUp'] || this.touchControl.forward;
        const isBraking = this.keyState['s'] || this.keyState['S'] || this.keyState['ArrowDown'];

        // --- 1. Steering (slower, heavier) ---
        const isTurningLeft = this.keyState['a'] || this.keyState['A'] || this.keyState['ArrowLeft'] || this.touchControl.left;
        const isTurningRight = this.keyState['d'] || this.keyState['D'] || this.keyState['ArrowRight'] || this.touchControl.right;
        if (currentRole === DRIVER) {
            if (isTurningLeft) this.steeringAngle = Math.max(-MAX_STEER_ANGLE, this.steeringAngle - STEER_RATE * dt);
            else if (isTurningRight) this.steeringAngle = Math.min(MAX_STEER_ANGLE, this.steeringAngle + STEER_RATE * dt);
            else this.steeringAngle *= STEER_RETURN;
        }

        // --- 2. Acceleration / Brake / Handbrake (driver only) ---
        if (currentRole === DRIVER) {
            if (handbrake) {
                const decel = HANDBRAKE_DECEL * dt;
                if (speed > 0) speed = Math.max(0, speed - decel);
                else if (speed < 0) speed = Math.min(0, speed + decel);
                else speed = 0;
            } else if (isBraking) {
                if (speed > 0) speed = Math.max(0, speed - BRAKE_DECEL * dt);
                else if (speed < 0) speed = Math.min(0, speed + BRAKE_DECEL * dt);
                else speed = Math.max(-REVERSE_MAX, speed - ACCEL_BASE * 0.4 * dt);
            } else if (isAccelerating) {
                const curve = accelCurve(speed >= 0 ? speed : 0);
                if (speed >= 0) speed = Math.min(MAX_SPEED_MS, speed + ACCEL_BASE * curve * dt);
                else speed = Math.min(0, speed + BRAKE_DECEL * dt);
            } else {
                const drag = DRAG_COEFF * speed * speed * 0.012;
                const roll = ROLLING_FRICTION * (speed > 0 ? 1 : -1);
                speed -= (drag + roll) * dt;
                if (Math.abs(speed) < MIN_SPEED) speed = 0;
            }
        }

        this.gameState.speed = speed;

        // --- 3. Body roll (target from steering + speed) ---
        const absSpeed = Math.abs(speed);
        const targetRoll = -this.steeringAngle * Math.min(1, absSpeed * 0.15) * 0.4;
        bodyRoll += (targetRoll - bodyRoll) * ROLL_SMOOTH;
        bodyRoll = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, bodyRoll));

        // --- 4. Body pitch (brake = nose down, accel = nose up) ---
        let targetPitch = 0;
        if (currentRole === DRIVER && !handbrake) {
            if (isBraking && speed > 0) targetPitch = -MAX_PITCH;
            else if (isAccelerating && speed >= 0 && speed < MAX_SPEED_MS * 0.9) targetPitch = MAX_PITCH * 0.6;
        }
        bodyPitch += (targetPitch - bodyPitch) * PITCH_SMOOTH;
        bodyPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, bodyPitch));

        // --- 5. Turning (bicycle model) ---
        if (absSpeed > MIN_SPEED) {
            const turnRate = (speed / WHEELBASE) * Math.tan(this.steeringAngle);
            this.matatuMesh.rotation.y -= turnRate * dt;
        }

        // --- 6. Position ---
        if (absSpeed > MIN_SPEED) {
            const dir = new THREE.Vector3(0, 0, -1);
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.matatuMesh.rotation.y);
            this.matatuMesh.position.x += dir.x * speed * dt;
            this.matatuMesh.position.z += dir.z * speed * dt;
        }

        this.matatuMesh.position.y = GROUND_LEVEL + MATATU_HEIGHT / 2;
        this.matatuMesh.rotation.x = bodyPitch;
        this.matatuMesh.rotation.z = bodyRoll;
        this.gameState.isDriving = absSpeed > MIN_SPEED;
    }
}
