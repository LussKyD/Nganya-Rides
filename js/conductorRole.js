import { DRIVER, CONDUCTOR, stopRoute } from './game.js';

const AUTOPILOT_FARE_RATE = 5;
const STOP_RADIUS = 10;           // meters - arrive at bus stop
const AUTOPILOT_ACCEL = 1.8;     // m/s²
const AUTOPILOT_MAX_TURN = 0.6;  // rad/s

export class ConductorRole {
    constructor(gameState, matatuMesh, scene, uiManager, busStops = []) {
        this.gameState = gameState;
        this.matatuMesh = matatuMesh;
        this.scene = scene;
        this.uiManager = uiManager;
        this.busStops = busStops.length ? busStops : [
            { name: 'CBD', baseFare: 150, position: { x: 5, z: 80 } },
            { name: 'Kibera', baseFare: 100, position: { x: 5, z: -60 } },
            { name: 'Thika Road', baseFare: 200, position: { x: 5, z: 150 } },
            { name: 'Embakasi', baseFare: 120, position: { x: 5, z: -120 } }
        ];
        this.targetMarkerMesh = null;
    }

    initRoute() {
        if (!this.gameState.currentDestination) {
            this.setNextDestination();
        }
    }

    setNextDestination() {
        const currentName = this.gameState.currentDestination ? this.gameState.currentDestination.name : '';
        const choices = this.busStops.filter(s => s.name !== currentName);
        if (!choices.length) return;
        const next = choices[Math.floor(Math.random() * choices.length)];
        this.gameState.currentDestination = next;
        this.createDestinationMarker(next);
    }

    createDestinationMarker(destination) {
        if (this.targetMarkerMesh) {
            this.scene.remove(this.targetMarkerMesh);
        }
        const pos = destination.position || { x: 5, z: destination.z };
        const geometry = new THREE.TorusGeometry(4, 0.6, 16, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.7 });
        this.targetMarkerMesh = new THREE.Mesh(geometry, material);
        this.targetMarkerMesh.rotation.x = Math.PI / 2;
        this.targetMarkerMesh.position.set(pos.x, 0.15, pos.z);
        this.scene.add(this.targetMarkerMesh);
        this.gameState.targetMarker = new THREE.Vector3(pos.x, 0, pos.z);
    }

    passiveRoleUpdate() {
        if (this.gameState.role === CONDUCTOR) {
            const autoFare = Math.floor(Math.random() * 5) + AUTOPILOT_FARE_RATE;
            this.gameState.cash += autoFare;
        }
    }

    handleConductorAction(actionType) {
        if (!this.gameState.isDriving) {
            this.uiManager.showGameMessage("The matatu must be moving for business!", 3000);
            return;
        }
        if (this.gameState.role !== CONDUCTOR) return;

        if (actionType === 'pick_up' && this.gameState.currentStop === 'pick_up') {
            const passengersGained = Math.min(Math.floor(Math.random() * 5) + 3, this.gameState.maxPassengers - this.gameState.passengers);
            if (passengersGained > 0) {
                this.gameState.passengers += passengersGained;
                const fare = passengersGained * 50;
                this.gameState.cash += fare;
                this.uiManager.showGameMessage(`Wacha tupande! Picked up ${passengersGained} passengers. KSh ${fare}.`, 2000);
                this.setNextDestination();
            } else {
                this.uiManager.showGameMessage("Matatu is full! Get going!", 2000);
            }
            this.gameState.currentStop = null;
            this.uiManager.updateConductorButtons(null);
        } else if (actionType === 'drop_off' && this.gameState.currentStop === 'drop_off') {
            const totalFare = this.gameState.passengers * this.gameState.currentDestination.baseFare;
            this.gameState.cash += totalFare;
            this.gameState.passengers = 0;
            this.uiManager.showGameMessage(`Tushukishe! Dropped off all passengers. KSh ${totalFare} total profit!`, 3000);
            this.setNextDestination();
            this.gameState.currentStop = null;
            this.uiManager.updateConductorButtons(null);
        } else {
            this.uiManager.showGameMessage("Wait for the right stop/destination.", 2000);
        }
        this.uiManager.updateUI();
    }

    checkDestinationArrival(matatuMesh, scene) {
        if (!this.gameState.targetMarker) return;

        const dist = matatuMesh.position.distanceTo(this.gameState.targetMarker);
        if (dist >= STOP_RADIUS) return;

        const dest = this.gameState.currentDestination;
        const isTerminal = dest && (dest.baseFare > 0 && this.gameState.passengers > 0);

        if (isTerminal) {
            this.gameState.currentStop = 'drop_off';
            this.uiManager.showGameMessage(`Arrived at ${dest.name}. Drop off passengers!`, 3000);
            this.uiManager.updateConductorButtons('drop_off');
        } else {
            this.gameState.currentStop = 'pick_up';
            this.uiManager.showGameMessage("Bus stop! Pick up passengers.", 3000);
            this.uiManager.updateConductorButtons('pick_up');
        }

        scene.remove(this.targetMarkerMesh);
        this.targetMarkerMesh = null;
        this.gameState.targetMarker = null;
    }

    autopilotDrive(currentSpeedAbs, deltaTime) {
        const dt = Math.min(deltaTime || 0.016, 0.05);
        if (!this.gameState.targetMarker) {
            const cruisingSpeed = this.gameState.maxSpeed * 0.6;
            if (this.gameState.speed < cruisingSpeed) {
                this.gameState.speed = Math.min(cruisingSpeed, this.gameState.speed + AUTOPILOT_ACCEL * dt);
            }
            if (Math.random() < 0.008) {
                this.matatuMesh.rotation.y += (Math.random() - 0.5) * 0.02;
            }
            return;
        }

        const target = this.gameState.targetMarker;
        const targetAngle = Math.atan2(target.x - this.matatuMesh.position.x, target.z - this.matatuMesh.position.z);
        let angleDiff = targetAngle - this.matatuMesh.rotation.y;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const maxTurn = AUTOPILOT_MAX_TURN * dt;
        this.matatuMesh.rotation.y += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);

        const dist = this.matatuMesh.position.distanceTo(target);
        if (dist > STOP_RADIUS * 2) {
            this.gameState.speed = Math.min(this.gameState.maxSpeed, this.gameState.speed + AUTOPILOT_ACCEL * dt);
        } else {
            this.gameState.speed = Math.max(0, this.gameState.speed - AUTOPILOT_ACCEL * 2 * dt);
        }
        if (dist < STOP_RADIUS) {
            this.gameState.speed = 0;
        }
    }
}
