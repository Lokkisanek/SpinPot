// --- GAME STATE ---
const gameState = {
    // Player State
    // health: 10, // REMOVED
    coins: 50,
    cloverTickets: 0,
    depositedMoney: 0,
    luckyCharms: {}, // Key-value store for purchased upgrades

    // Game State
    round: 1,
    roundsRemaining: 3, // Actions until quota check
    currentLocation: 'main', // 'main', 'casino', 'atm'

    // ATM State
    currentQuota: 20,
    quotaDeposit: 0,
};

// Slot Machine Configuration
const SLOT_SYMBOLS = {
    'C': { rarity: 50, name: 'Coin' },      // Common, grants coins
    'S': { rarity: 30, name: 'Skull' },     // Uncommon, **Coin penalty**
    'L': { rarity: 15, name: 'Lover' },     // Rare, grants Clover ticket bonus
    'W': { rarity: 5, name: 'Wild Card' },  // Very Rare, acts as any symbol
};

// --- CORE FUNCTIONS ---

function updateHUD() {
    // document.getElementById('stat-health').textContent = gameState.health; // REMOVED
    document.getElementById('stat-coins').textContent = gameState.coins;
    document.getElementById('stat-clover').textContent = gameState.cloverTickets;
    document.getElementById('stat-round').textContent = gameState.round;
    document.getElementById('stat-rounds-rem').textContent = gameState.roundsRemaining;
    document.getElementById('stat-deposit').textContent = gameState.depositedMoney.toFixed(2);
    document.getElementById('stat-quota').textContent = gameState.currentQuota;
    
    // Update ATM screen text
    if (document.getElementById('atm-quota-display')) {
        document.getElementById('atm-quota-display').textContent = gameState.currentQuota;
    }

    // New Bankruptcy Check (only check if the player can't afford the cheapest option)
    if (gameState.coins < 3 && gameState.roundsRemaining > 0) {
        gameOver("You are bankrupt and cannot continue playing the slots to meet the quota.");
    }
}

function postFeedback(message) {
    document.getElementById('feedback-panel').innerHTML = `<p>${message}</p>`;
}

function renderScreen(location) {
    const screens = document.querySelectorAll('.game-screen');
    screens.forEach(screen => screen.classList.remove('active'));
    screens.forEach(screen => screen.classList.add('hidden'));

    const targetScreen = document.getElementById(`${location}-screen`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        setTimeout(() => targetScreen.classList.add('active'), 50); // Small delay for CSS transition
    }
    
    gameState.currentLocation = location;
}

// --- MOVEMENT ---
function moveLeft() {
    if (gameState.currentLocation === 'main') {
        renderScreen('casino');
        postFeedback("You approach the menacing Slot Machine.");
    } else if (gameState.currentLocation === 'atm') {
        renderScreen('main');
        postFeedback("You walk back to the Hallway.");
    }
}

function moveRight() {
    if (gameState.currentLocation === 'main') {
        renderScreen('atm');
        postFeedback("You approach the digital maw of the ATM.");
    } else if (gameState.currentLocation === 'casino') {
        renderScreen('main');
        postFeedback("You walk back to the Hallway.");
    }
}


// --- SLOT MACHINE MECHANICS ---
function getRandomSymbol() {
    let totalRarity = Object.values(SLOT_SYMBOLS).reduce((sum, s) => sum + s.rarity, 0);
    let rand = Math.random() * totalRarity;
    let current = 0;

    for (const [key, symbol] of Object.entries(SLOT_SYMBOLS)) {
        current += symbol.rarity;
        if (rand < current) {
            return key;
        }
    }
    return 'C'; // Default fallback
}

function generateSpinResults(spins) {
    let results = [];
    let feedback = "";
    let totalCoinsGained = 0;
    let totalCoinsLost = 0;
    let cloverBonus = 0;
    
    // Simplification: In a full game, this would populate the 5x4 grid.
    // For the prototype, we generate 'spins' worth of 5x4 grids and check a simple win.
    for (let s = 0; s < spins; s++) {
        let grid = [];
        for (let r = 0; r < 5; r++) {
            let row = [];
            for (let l = 0; l < 4; l++) {
                row.push(getRandomSymbol());
            }
            grid.push(row);
        }
        results.push(grid);
        
        // --- SYMBOL EFFECT LOGIC ---
        let flatGrid = grid.flat();
        let skullCount = flatGrid.filter(s => s === 'S').length;
        let coinCount = flatGrid.filter(s => s === 'C').length;
        let cloverCount = flatGrid.filter(s => s === 'L').length;
        
        // Skull Penalty (Coin Loss)
        if (skullCount >= 8) {
            totalCoinsLost += 5;
            feedback += " | The slots flash RED! -5 Coins! ";
        } else if (skullCount >= 5) {
            totalCoinsLost += 2;
            feedback += " | A chill runs down your spine. -2 Coins. ";
        }
        
        // Coin Gain
        totalCoinsGained += Math.floor(coinCount / 4) + 1; // Base coin win
        
        // Lover Bonus (Clover Ticket Bonus)
        if (cloverCount >= 4) {
            cloverBonus += 1;
            feedback += " | A lucky charm appears! +1 Clover Ticket! ";
        }
    }
    
    gameState.coins += totalCoinsGained;
    gameState.coins = Math.max(0, gameState.coins - totalCoinsLost); // Apply loss, minimum 0
    gameState.cloverTickets += cloverBonus;
    
    // Update the visual grid (only showing the last spin for simplicity)
    const gridEl = document.getElementById('slot-machine-grid');
    gridEl.innerHTML = ''; // Clear previous
    results[results.length - 1].forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'slot-row';
        row.forEach(symbol => {
            const symbolEl = document.createElement('div');
            symbolEl.className = 'slot-symbol';
            symbolEl.textContent = symbol;
            rowEl.appendChild(symbolEl);
        });
        gridEl.appendChild(rowEl);
    });
    
    postFeedback(`Spins complete. Gained ${totalCoinsGained} Coins, Lost ${totalCoinsLost} Coins. Bonus Clover Tickets: ${cloverBonus}. ${feedback}`);
}

function spinSlot(cost, spins, tickets) {
    if (gameState.coins < cost) {
        postFeedback("Insufficient coins to play this option!");
        return;
    }

    gameState.coins -= cost;
    gameState.cloverTickets += tickets;

    generateSpinResults(spins);
    
    endTurn();
}


// --- ATM MECHANICS ---
function depositMoney() {
    const input = document.getElementById('deposit-input');
    const amount = parseInt(input.value);

    if (isNaN(amount) || amount <= 0) {
        postFeedback("Invalid deposit amount.");
        return;
    }

    if (gameState.coins < amount) {
        postFeedback("You don't have that many coins to deposit.");
        return;
    }

    gameState.coins -= amount;
    gameState.depositedMoney += amount;
    gameState.quotaDeposit += amount;

    postFeedback(`Successfully deposited ${amount} coins. Quota progress: ${gameState.quotaDeposit}/${gameState.currentQuota}.`);

    input.value = 1; // Reset input
    
    endTurn();
}

// --- GAME LOOP & ROUND MANAGEMENT ---

function endTurn() {
    gameState.roundsRemaining--;

    if (gameState.roundsRemaining <= 0) {
        endRoundEvents();
    }
    
    updateHUD();
}

function endRoundEvents() {
    let feedback = "--- END OF ROUND EVENTS ---";
    
    // 1. Quota Check - FAILURE IS NOW GAME OVER
    if (gameState.quotaDeposit < gameState.currentQuota) {
        // Failure - Terminal Condition
        gameOver(`Quota FAILED! You only deposited ${gameState.quotaDeposit} of the required ${gameState.currentQuota} coins.`);
        return; // Stop the round if failed
    } 
    
    // Success
    gameState.currentQuota = Math.round(gameState.currentQuota * 1.5); // Progressive challenge
    feedback += ` | Quota SUCCESS! New Quota: ${gameState.currentQuota}.`;

    // 2. Apply Interest
    const interestRate = 0.04; // 4%
    const interest = gameState.depositedMoney * interestRate;
    gameState.depositedMoney = gameState.depositedMoney * (1 + interestRate);
    feedback += ` | Earned ${interest.toFixed(2)} interest on deposit.`;

    // 3. Reset and Increment
    gameState.round++;
    gameState.roundsRemaining = 3;
    gameState.quotaDeposit = 0;
    
    postFeedback(feedback);
    
    // Ensure the player is back on the main screen after the round resets
    renderScreen('main');
}

function gameOver(reason) {
    document.getElementById('game-container').innerHTML = `
        <div id="game-over-screen">
            <h1>GAME OVER</h1>
            <p>${reason}</p>
            <p>You survived ${gameState.round} rounds.</p>
            <p>Total Deposit: ${gameState.depositedMoney.toFixed(2)}</p>
            <button onclick="window.location.reload()">RETRY</button>
        </div>
        <style>
            #game-over-screen {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.95);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                font-size: 20px;
                z-index: 100;
            }
            #game-over-screen h1 { color: red; }
        </style>
    `;
}

// --- INITIALIZATION ---
window.onload = () => {
    updateHUD();
    renderScreen('main');
    postFeedback("Welcome. Meet the Quota within 3 actions. Failure is final.");
    
    // Initial Casino Grid Setup (a simple display)
    generateSpinResults(1); 
};
