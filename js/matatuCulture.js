import { DRIVER } from './game.js';
import { isInIntersection } from './roads.js';

// GTA-style: we never force the player to slow or stop for red. Full freedom.
// Running the red only risks a police encounter (fine/bribe) when in intersection.
const TRAFFIC_LIGHT_CYCLE = 12000;
const VIOLATION_CHANCE = 0.45;
const BASE_FINE = 200;
const RED_LIGHT_SPEED_THRESHOLD = 0.5; // m/s - moving through intersection on red
const POLICE_COOLDOWN_MS = 50000;       // no new encounter for 50s after last one
const CASH_FLOOR = -2000;               // cash never goes below this (so you can recover)
const TOO_BROKE_FOR_FINE = -800;        // below this, officer waves you on — no modal, keep driving
const SPEEDING_FINE_BASE = 150;
const SPEEDING_THRESHOLD_SEC = 2;       // over limit for this long before possible fine

export class MatatuCulture {
    constructor(gameState, matatuMesh, uiManager) {
        this.gameState = gameState;
        this.matatuMesh = matatuMesh;
        this.uiManager = uiManager;
        this.lastPoliceEncounterTime = 0;
    }

    startTrafficLightCycle() {
        setInterval(() => {
            if (this.gameState.isModalOpen) return;
            if (this.gameState.trafficLightState === 'GREEN') this.gameState.trafficLightState = 'YELLOW';
            else if (this.gameState.trafficLightState === 'YELLOW') this.gameState.trafficLightState = 'RED';
            else this.gameState.trafficLightState = 'GREEN';
        }, TRAFFIC_LIGHT_CYCLE);
    }

    checkTrafficViolation() {
        if (this.gameState.role !== DRIVER || this.gameState.isModalOpen) return;
        if (this.gameState.trafficLightState !== 'RED') return;
        if (Date.now() - this.lastPoliceEncounterTime < POLICE_COOLDOWN_MS) return;
        if (this.gameState.cash < TOO_BROKE_FOR_FINE) {
            this.uiManager.showGameMessage("Officer waves you on — you're broke. Keep driving.", 2500);
            this.lastPoliceEncounterTime = Date.now();
            return;
        }
        const inIntersection = isInIntersection(this.matatuMesh.position.x, this.matatuMesh.position.z);
        if (inIntersection && this.gameState.speed > RED_LIGHT_SPEED_THRESHOLD) {
            if (Math.random() < VIOLATION_CHANCE) {
                this.triggerPoliceEncounter("Running a red light at the intersection.");
            }
        }
    }

    checkSpeedingViolation() {
        if (this.gameState.role !== DRIVER || this.gameState.isModalOpen) return;
        if (this.gameState.speedingAccumulator < SPEEDING_THRESHOLD_SEC) return;
        if (Date.now() - this.lastPoliceEncounterTime < POLICE_COOLDOWN_MS) return;
        if (this.gameState.cash < TOO_BROKE_FOR_FINE) {
            this.uiManager.showGameMessage("Officer waves you on — you're broke.", 2500);
            this.lastPoliceEncounterTime = Date.now();
            this.gameState.speedingAccumulator = 0;
            return;
        }
        if (Math.random() < VIOLATION_CHANCE) {
            this.gameState.speedingAccumulator = 0;
            this.triggerPoliceEncounter("Speeding.", SPEEDING_FINE_BASE);
        }
    }

    checkObstacleCollision(matatuMesh, obstacles) {
        if (this.gameState.isModalOpen) return;
        const matatuBox = new THREE.Box3().setFromObject(matatuMesh);
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (matatuBox.intersectsBox(obstacleBox)) {
                this.gameState.cash = Math.max(CASH_FLOOR, this.gameState.cash - 50);
                this.gameState.speed *= 0.3;
                this.uiManager.showGameMessage("Hit an obstacle! KSh 50 penalty.", 2000);
                return;
            }
        }
    }
    
    // ----------------------------------
    // --- POLICE ENCOUNTER (BRIBERY/EXTORTION) ---
    // ----------------------------------
    
    triggerPoliceEncounter(reason, fineBase) {
        if (this.gameState.isModalOpen) return;

        this.lastPoliceEncounterTime = Date.now();
        this.gameState.isModalOpen = true;

        const base = fineBase != null ? fineBase : BASE_FINE;
        const fine = base + Math.floor(Math.random() * 150);
        this.uiManager.showPoliceModal(fine, reason, this.handlePoliceDecision.bind(this));
    }

    handlePoliceDecision(action, fine) {
        this.gameState.isModalOpen = false;
        this.lastPoliceEncounterTime = Date.now();

        if (action === 'pay') {
            if (this.gameState.cash >= fine) {
                this.gameState.cash = Math.max(CASH_FLOOR, this.gameState.cash - fine);
                this.uiManager.showGameMessage(`Bribe paid (KSh ${fine}). Back on the road.`, 3000);
            } else {
                this.uiManager.showGameMessage("Not enough cash — risk it or drive away.", 3000);
                this.handleDeny(fine);
            }
        } else if (action === 'deny') {
            this.handleDeny(fine);
        }
        this.uiManager.updateUI();
    }

    handleDeny(fine) {
        if (Math.random() < 0.5) {
            this.uiManager.showGameMessage("You talked your way out! Drive safe.", 3000);
        } else {
            const detentionPenalty = fine * 2;
            this.gameState.cash = Math.max(CASH_FLOOR, this.gameState.cash - detentionPenalty);
            this.uiManager.showGameMessage(`Detained! KSh ${detentionPenalty} fine. Cash never below KSh ${CASH_FLOOR}.`, 5000);
        }
    }
}
