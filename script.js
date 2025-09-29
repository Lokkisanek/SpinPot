
// --- GAME STATE ---
const gameState = {
    // Player State
    health: 10,
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
    'S': { rarity: 30, name: 'Skull' },     // Uncommon, minor health penalty
    'H': { rarity: 15, name: 'Heart' },     // Rare, grants health
    'W': { rarity: 5, name: 'Wild Card' },  // Very Rare, acts as any symbol
};

// --- CORE FUNCTIONS ---

function updateHUD() {
    document.getElementById('stat-health').textContent = gameState.health;
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

    if (gameState.health <= 0 || gameState.coins < 3 && gameState.roundsRemaining > 0) {
        gameOver(gameState.health <= 0 ? "You died from the horrors." : "You are bankrupt.");
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
    let totalCoins = 0;
    let totalHealthChange = 0;
    
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
        
        // **Simplified Winning Logic:** Check how many 'Skull' symbols appeared in the whole grid.
        let skullCount = grid.flat().filter(s => s === 'S').length;
        let coinCount = grid.flat().filter(s => s === 'C').length;
        
        if (skullCount >= 8) {
            totalHealthChange -= 1;
            feedback += " | The slots flash RED! -1 Health! ";
        } else if (skullCount >= 5) {
            totalHealthChange -= 0.5;
            feedback += " | A chill runs down your spine. -0.5 Health. ";
        }
        
        totalCoins += Math.floor(coinCount / 4) + 1; // Base coin win
    }
    
    gameState.coins += totalCoins;
    gameState.health += totalHealthChange;
    
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
    
    postFeedback(`Spins complete. Gained ${totalCoins} Coins. Health Change: ${totalHealthChange}. ${feedback}`);
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
    
    // 1. Quota Check
    if (gameState.quotaDeposit >= gameState.currentQuota) {
        // Success
        gameState.currentQuota = Math.round(gameState.currentQuota * 1.5); // Progressive challenge
        feedback += ` | Quota SUCCESS! New Quota: ${gameState.currentQuota}.`;
    } else {
        // Failure - Penalty
        const penalty = Math.max(1, Math.round(gameState.currentQuota * 0.1));
        
        // Penalty: lose health (primary penalty) and some coins (secondary)
        gameState.health = Math.max(0, gameState.health - 1);
        gameState.coins = Math.max(0, gameState.coins - penalty);
        
        feedback += ` | Quota FAILED! Lost 1 Health and ${penalty} Coins.`;
    }

    // 2. Apply Interest
    const interest = gameState.depositedMoney * 0.04;
    gameState.depositedMoney = gameState.depositedMoney * 1.04;
    feedback += ` | Earned ${interest.toFixed(2)} interest on deposit.`;

    // 3. Reset and Increment
    gameState.round++;
    gameState.roundsRemaining = 3;
    gameState.quotaDeposit = 0;
    
    postFeedback(feedback);
    
    // Check for game over again after penalties
    if (gameState.health <= 0) {
        gameOver("You died from the accumulated pressure and penalties.");
    }
    
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
    postFeedback("Welcome. Meet the Quota. Survive the Slots.");
    
    // Initial Casino Grid Setup (a simple display)
    generateSpinResults(1); 
};
