import { DRIVER } from './game.js';
import { isInIntersection } from './roads.js';

// GTA-style: we never force the player to slow or stop for red. Full freedom.
// Running the red only risks a police encounter (fine/bribe) when in intersection.
const TRAFFIC_LIGHT_CYCLE = 12000;
const VIOLATION_CHANCE = 0.45;
const BASE_FINE = 200;
const RED_LIGHT_SPEED_THRESHOLD = 0.5; // m/s - moving through intersection on red

export class MatatuCulture {
    constructor(gameState, matatuMesh, uiManager) {
        this.gameState = gameState;
        this.matatuMesh = matatuMesh;
        this.uiManager = uiManager;
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
        const inIntersection = isInIntersection(this.matatuMesh.position.x, this.matatuMesh.position.z);
        if (inIntersection && this.gameState.speed > RED_LIGHT_SPEED_THRESHOLD) {
            if (Math.random() < VIOLATION_CHANCE) {
                this.triggerPoliceEncounter("Running a red light at the intersection.");
            }
        }
    }

    checkObstacleCollision(matatuMesh, obstacles) {
        if (this.gameState.isModalOpen) return;
        const matatuBox = new THREE.Box3().setFromObject(matatuMesh);
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (matatuBox.intersectsBox(obstacleBox)) {
                this.gameState.cash -= 50;
                this.gameState.speed *= 0.3;
                this.uiManager.showGameMessage("Hit an obstacle! KSh 50 penalty.", 2000);
                return;
            }
        }
    }
    
    // ----------------------------------
    // --- POLICE ENCOUNTER (BRIBERY/EXTORTION) ---
    // ----------------------------------
    
    triggerPoliceEncounter(reason) {
        if (this.gameState.isModalOpen) return;
        
        this.gameState.isModalOpen = true;
        
        const fine = BASE_FINE + Math.floor(Math.random() * 200);
        this.uiManager.showPoliceModal(fine, reason, this.handlePoliceDecision.bind(this));
    }
    
    handlePoliceDecision(action, fine) {
        this.gameState.isModalOpen = false;
        
        if (action === 'pay') {
            if (this.gameState.cash >= fine) {
                this.gameState.cash -= fine;
                this.uiManager.showGameMessage(`Bribe paid (KSh ${fine}). Matatu is back on the road.`, 3000);
            } else {
                // Not enough cash to bribe
                this.uiManager.showGameMessage("Not enough cash! Detention risk increases...", 3000);
                this.handleDeny(fine); 
            }
        } else if (action === 'deny') {
            this.handleDeny(fine);
        }
        this.uiManager.updateUI();
    }
    
    handleDeny(fine) {
        // 50% chance of getting away, 50% chance of detention
        if (Math.random() < 0.5) {
            this.uiManager.showGameMessage("You talked your way out! Drive safe.", 3000);
        } else {
            const detentionPenalty = fine * 2;
            this.gameState.cash -= detentionPenalty;
            this.uiManager.showGameMessage(`Detained! Paid KSh ${detentionPenalty} official fine. Lose time & money.`, 5000);
        }
    }
}
