export class UIManager {
    constructor(gameState, touchControl) {
        this.gameState = gameState;
        this.touchControl = touchControl;
        
        // --- DOM Elements (Cached) ---
        this.roleDisplay = document.getElementById('roleDisplay');
        this.cashDisplay = document.getElementById('cashDisplay');
        this.fuelDisplay = document.getElementById('fuelDisplay');
        this.speedDisplay = document.getElementById('speedDisplay');
        this.switchRoleButton = document.getElementById('switchRoleButton');
        this.accelerateButton = document.getElementById('accelerateButton');
        this.turnLeftButton = document.getElementById('turnLeftButton');
        this.turnRightButton = document.getElementById('turnRightButton');
        this.pickUpButton = document.getElementById('pickUpButton');
        this.dropOffButton = document.getElementById('dropOffButton');
        this.conductorControls = document.getElementById('conductorControls');
        this.driverControls = document.getElementById('driverControls');
        this.driverControlsRight = document.getElementById('driverControlsRight');
        this.messageBox = document.getElementById('messageBox');
        this.refuelButton = document.getElementById('refuelButton');
        this.policeModal = document.getElementById('policeModal');
        this.payBribe = document.getElementById('payBribe');
        this.denyBribe = document.getElementById('denyBribe');
        this.fineAmountDisplay = document.getElementById('fineAmount');
        this.policeReasonDisplay = document.getElementById('policeReason');
        this.destinationDisplay = document.getElementById('destinationDisplay');
        this.passengerCountDisplay = document.getElementById('passengerCountDisplay');
        this.speedLimitDisplay = document.getElementById('speedLimitDisplay');
        this.goalProgress = document.getElementById('goalProgress');
        this.outOfFuelOverlay = document.getElementById('outOfFuelOverlay');
        this.goalReachedOverlay = document.getElementById('goalReachedOverlay');
        this.outOfFuelTitle = document.getElementById('outOfFuelTitle');
        this.outOfFuelText = document.getElementById('outOfFuelText');
        this.outOfFuelRefuelBtn = document.getElementById('outOfFuelRefuel');
        this.outOfFuelNewDayBtn = document.getElementById('outOfFuelNewDay');

        this.linkedActions = {};
    }
    
    // Links core functions from game.js
    linkActions(actions) {
        this.linkedActions = actions;
    }

    // CRITICAL FIX: Set up listeners ONLY when called from game.js AFTER actions are linked
    setupUI() {
        // Core Actions
        this.switchRoleButton.addEventListener('click', () => this.linkedActions.switchRole());
        this.refuelButton.addEventListener('click', () => this.linkedActions.handleRefuel());
        
        // Conductor Actions
        this.pickUpButton.addEventListener('click', () => this.linkedActions.handleConductorAction('pick_up'));
        this.dropOffButton.addEventListener('click', () => this.linkedActions.handleConductorAction('drop_off'));
        
        // Touch/Mouse Controls Setup
        const setupButton = (element, stateKey, startsRoute = false) => {
            const startFunc = () => { 
                element.classList.add('opacity-100'); 
                this.touchControl[stateKey] = true;
                if (startsRoute) this.linkedActions.startRoute(); 
            };
            const endFunc = () => { 
                element.classList.remove('opacity-100'); 
                this.touchControl[stateKey] = false;
            };
            
            element.addEventListener('touchstart', (e) => { e.preventDefault(); startFunc(); }, { passive: false });
            element.addEventListener('touchend', (e) => { e.preventDefault(); endFunc(); });
            element.addEventListener('mousedown', startFunc);
            element.addEventListener('mouseup', endFunc);
            element.addEventListener('mouseleave', endFunc); 
        };

        setupButton(this.accelerateButton, 'forward', true);
        setupButton(this.turnLeftButton, 'left');
        setupButton(this.turnRightButton, 'right');

        if (this.outOfFuelRefuelBtn) this.outOfFuelRefuelBtn.addEventListener('click', () => this.linkedActions.handleRefuel());
        if (this.outOfFuelNewDayBtn) this.outOfFuelNewDayBtn.addEventListener('click', () => this.linkedActions.newDay && this.linkedActions.newDay());
        const goalDismiss = document.getElementById('goalReachedDismiss');
        if (goalDismiss) goalDismiss.addEventListener('click', () => {
            this.goalReachedOverlay.classList.add('hidden');
        });
    }

    updateUI() {
        const { gameState, DRIVER } = this;
        // Update HUD
        this.roleDisplay.textContent = gameState.role;
        this.roleDisplay.className = gameState.role === DRIVER ? 'hud-role' : 'hud-role conductor';
        this.cashDisplay.textContent = `KSh ${Math.round(gameState.cash)}`;
        this.fuelDisplay.textContent = `${Math.round(gameState.fuel)}%`;
        // Speed in m/s -> km/h
        this.speedDisplay.textContent = `${(Math.abs(gameState.speed) * 3.6).toFixed(1)} km/h`;
        if (this.speedLimitDisplay) this.speedLimitDisplay.textContent = `Limit ${gameState.speedLimitKmh != null ? gameState.speedLimitKmh : 50}`;

        this.destinationDisplay.textContent = gameState.currentDestination ? gameState.currentDestination.name : 'N/A';
        this.passengerCountDisplay.textContent = `${gameState.passengers}/${gameState.maxPassengers}`;

        if (this.goalProgress) {
            const goal = gameState.goalCash != null ? gameState.goalCash : 5000;
            this.goalProgress.textContent = `KSh ${Math.round(gameState.cash).toLocaleString()} / ${goal.toLocaleString()}`;
        }
        if (!gameState.goalReached && gameState.cash >= (gameState.goalCash || 5000)) {
            gameState.goalReached = true;
            if (this.goalReachedOverlay) this.goalReachedOverlay.classList.remove('hidden');
        }
        if (this.outOfFuelOverlay) {
            if (gameState.fuel <= 0) {
                this.outOfFuelOverlay.classList.remove('hidden');
                const canRefuel = gameState.cash >= 500;
                if (this.outOfFuelTitle) this.outOfFuelTitle.textContent = canRefuel ? 'Out of fuel' : 'Out of fuel and out of cash';
                if (this.outOfFuelText) this.outOfFuelText.textContent = canRefuel ? 'Refuel to get back on the road.' : 'You need KSh 500 to refuel. Start a new day to try again.';
                if (this.outOfFuelRefuelBtn) this.outOfFuelRefuelBtn.classList.toggle('hidden', !canRefuel);
                if (this.outOfFuelNewDayBtn) this.outOfFuelNewDayBtn.classList.toggle('hidden', canRefuel);
            } else {
                this.outOfFuelOverlay.classList.add('hidden');
            }
        }

        // Update control visibility
        if (gameState.isModalOpen) {
            this.driverControls.style.display = 'none';
            this.driverControlsRight.style.display = 'none';
            this.conductorControls.style.display = 'none';
            this.refuelButton.style.display = 'none';
        } else {
            // Role-based controls
            if (gameState.role === DRIVER) {
                this.driverControls.style.display = 'flex';
                this.driverControlsRight.style.display = 'flex';
                this.conductorControls.style.display = 'none';
            } else {
                this.driverControls.style.display = 'none';
                this.driverControlsRight.style.display = 'none';
                this.conductorControls.style.display = gameState.isDriving ? 'flex' : 'none'; 
            }
            this.refuelButton.style.display = gameState.fuel < 100 && gameState.role === DRIVER ? 'block' : 'none';
        }
        
        // Update traffic light color
        if (gameState.trafficLightState) {
            const colors = { 'RED': '#ef4444', 'YELLOW': '#fcd34d', 'GREEN': '#10b981' };
            document.getElementById('trafficLightDisplay').style.backgroundColor = colors[gameState.trafficLightState] || '#333';
        }
    }

    updateConductorButtons(stopType) {
        this.pickUpButton.classList.add('hidden');
        this.dropOffButton.classList.add('hidden');

        if (stopType === 'pick_up') {
            this.pickUpButton.classList.remove('hidden');
        } else if (stopType === 'drop_off') {
            this.dropOffButton.classList.remove('hidden');
        }
    }


    showGameMessage(message, duration = 3000) {
        // Simple message box
        this.messageBox.textContent = message;
        this.messageBox.style.opacity = '1';
        clearTimeout(this.messageBox.timeout);
        this.messageBox.timeout = setTimeout(() => {
            this.messageBox.style.opacity = '0';
        }, duration);
    }
    
    showPoliceModal(fine, reason, callback) {
        this.policeReasonDisplay.textContent = reason;
        this.fineAmountDisplay.textContent = fine;
        this.policeModal.classList.remove('hidden');

        this.payBribe.onclick = () => {
            this.policeModal.classList.add('hidden');
            callback('pay', fine);
        };
        
        this.denyBribe.onclick = () => {
            this.policeModal.classList.add('hidden');
            callback('deny', fine);
        };
    }
}
