// --- GAME STATE ---
const gameState = {
    // Player State
    coins: 50,
    cloverTickets: 0,
    depositedMoney: 0,
    principal: 0, 
    luckyCharms: {}, 

    // Game State
    round: 1,
    roundsRemaining: 3, 
    currentLocation: 'main', 
    currentSpinOption: { cost: 0, spinsLeft: 0, tickets: 0, initialCost: 0, initialSpins: 0 }, 
    controlsDisabled: false, // Control lock for animations

    // ATM State
    currentQuota: 20,
    quotaDeposit: 0,
};

// Slot Machine Constants
const ROWS = 4;
const COLS = 5;

// Slot Machine Symbols (Weights/Multipliers remain the same)
const NEW_SLOT_SYMBOLS = {
    'CHRY': { weight: 194, multiplier: 2, name: 'Cherry', display: '🍒' }, 
    'LMON': { weight: 194, multiplier: 2, name: 'Lemon',  display: '🍋' },  
    'CLVR': { weight: 149, multiplier: 3, name: 'Clover', display: '🍀' }, 
    'BELL': { weight: 149, multiplier: 3, name: 'Bell',   display: '🔔' },   
    'DIAM': { weight: 119, multiplier: 5, name: 'Diamond',display: '♦️' },
    'COIN': { weight: 119, multiplier: 5, name: 'Coin',   display: '🪙' },   
    'SEVN': { weight: 75,  multiplier: 7, name: 'Seven',  display: '7️⃣' },  
};
const NEW_TOTAL_WEIGHT = 1000;
const INTEREST_RATE = 0.04; 
const PENALTY_CHANCE = 0.04; 

// Win Patterns (4 Rows x 5 Columns. 1 = required symbol, 0 = ignore, -1 = must be different symbol)
const WIN_PATTERNS = [
    { type: 'width', multiplier: 1.0, pattern: [[0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]] }, 
    { type: 'length', multiplier: 1.0, pattern: [[0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0]] }, 
    { type: 'diagonal', multiplier: 1.0, pattern: [[0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [1, 0, 0, 0, 0], [0, 0, 0, 0, 0]] }, 
    { type: 'Horizontal -L', multiplier: 2.0, pattern: [[0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]] }, 
    { type: 'Horizontal -XL', multiplier: 3.0, pattern: [[0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]] }, 
    { type: 'now', multiplier: 4.0, pattern: [[0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [1, 1, 1, 0, 0], [0, 0, 0, 0, 0]] }, 
    { type: 'Zag', multiplier: 4.0, pattern: [[1, 1, 1, 0, 0], [0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [0, 0, 0, 0, 0]] }, 
    { type: 'stomach', multiplier: 7.0, pattern: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]] }, 
    { type: 'eye', multiplier: 8.0, pattern: [[1, 1, 1, 1, 1], [1, 0, 1, 0, 1], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0]] }, 
    { type: 'jackpot', multiplier: 10.0, pattern: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] }, 
];

// --- CORE FUNCTIONS ---

function updateHUD() {
    document.getElementById('stat-coins').textContent = gameState.coins;
    document.getElementById('stat-clover').textContent = gameState.cloverTickets;
    document.getElementById('stat-round').textContent = gameState.round;
    document.getElementById('stat-rounds-rem').textContent = gameState.roundsRemaining;
    document.getElementById('stat-deposit').textContent = gameState.depositedMoney.toFixed(2);
    document.getElementById('stat-quota').textContent = gameState.currentQuota;
    
    // Update Casino specific UI
    const spinButton = document.getElementById('spin-button');
    const optionDisplay = document.getElementById('selected-option-display');
    const spinsLeftDisplay = document.getElementById('spins-left-display');
    const option7Button = document.getElementById('option-7-button');
    const option3Button = document.getElementById('option-3-button');

    // Control lock check
    const canSpin = gameState.currentSpinOption.spinsLeft > 0 && !gameState.controlsDisabled;
    const canSelect = !gameState.controlsDisabled;
    
    // Casino button logic
    spinButton.disabled = !canSpin;
    spinsLeftDisplay.textContent = gameState.currentSpinOption.spinsLeft;
    option7Button.disabled = !canSelect || gameState.currentSpinOption.spinsLeft > 0 || gameState.coins < 7;
    option3Button.disabled = !canSelect || gameState.currentSpinOption.spinsLeft > 0 || gameState.coins < 3;

    if (gameState.currentSpinOption.spinsLeft > 0) {
        optionDisplay.textContent = `Current option: ${gameState.currentSpinOption.initialCost} Coins / ${gameState.currentSpinOption.initialSpins} Spins. ${gameState.currentSpinOption.spinsLeft} Spins Remaining.`;
    } else {
        optionDisplay.textContent = "Select a spin option below to begin a round.";
    }

    // Movement lock
    document.getElementById('arrow-left').disabled = gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0;
    document.getElementById('arrow-right').disabled = gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0;
    
    if (document.getElementById('atm-quota-display')) {
        document.getElementById('atm-quota-display').textContent = gameState.currentQuota;
    }

    // Bankruptcy Check
    if (gameState.coins < 3 && gameState.roundsRemaining > 0) {
        gameOver("You are bankrupt and cannot continue playing the slots to meet the quota.");
    }
}

function postFeedback(message) {
    document.getElementById('feedback-panel').innerHTML = `<p>${message}</p>`;
}

function renderScreen(location) {
    if (gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0 && location !== 'casino') return; 

    const screens = document.querySelectorAll('.game-screen');
    screens.forEach(screen => screen.classList.remove('active'));
    screens.forEach(screen => screen.classList.add('hidden'));

    const targetScreen = document.getElementById(`${location}-screen`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        setTimeout(() => targetScreen.classList.add('active'), 50);
    }
    
    gameState.currentLocation = location;
    updateHUD();
}

// --- MOVEMENT ---
function moveLeft() {
    if (gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0) {
        postFeedback("Finish your current spins or quit the Casino first!");
        return;
    }
    if (gameState.currentLocation === 'main') {
        renderScreen('casino');
        postFeedback("You approach the menacing Slot Machine. Select your bet.");
    } else if (gameState.currentLocation === 'atm') {
        renderScreen('main');
        postFeedback("You walk back to the Hallway.");
    }
}

function moveRight() {
    if (gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0) {
        postFeedback("Finish your current spins or quit the Casino first!");
        return;
    }
    if (gameState.currentLocation === 'main') {
        renderScreen('atm');
        postFeedback("You approach the digital maw of the ATM.");
    } else if (gameState.currentLocation === 'casino') {
        renderScreen('main');
        postFeedback("You walk back to the Hallway.");
    }
}

// --- ANIMATION FUNCTIONS ---

/**
 * Creates a visual animation of floating coins in the feedback panel.
 */
function animateCoinGain(gain, loss) {
    const feedbackPanel = document.getElementById('feedback-panel');
    feedbackPanel.innerHTML = ''; // Clear existing text

    // Animate loss
    if (loss > 0) {
        const lossCoin = document.createElement('span');
        lossCoin.textContent = `-${loss}🪙`;
        lossCoin.className = 'floating-coin';
        lossCoin.style.left = '50%';
        lossCoin.style.top = '50%';
        lossCoin.style.color = '#f00';
        feedbackPanel.appendChild(lossCoin);
        setTimeout(() => feedbackPanel.removeChild(lossCoin), 1500);
    }

    // Animate gain
    if (gain > 0) {
        for (let i = 0; i < Math.min(gain, 5); i++) { // Animate max 5 coins
            setTimeout(() => {
                const coin = document.createElement('span');
                coin.textContent = '🪙';
                coin.className = 'floating-coin';
                // Randomize position within the panel
                const x = Math.random() * 80 + 10;
                const y = Math.random() * 50 + 25;
                coin.style.left = `${x}%`;
                coin.style.top = `${y}%`;
                feedbackPanel.appendChild(coin);
                setTimeout(() => feedbackPanel.removeChild(coin), 1500);
            }, i * 150 + (loss > 0 ? 500 : 0));
        }
    }
    
    const netChange = gain - loss;
    // Set a very temporary message, which will be overwritten by HUD updates
    postFeedback(netChange > 0 ? `+${netChange} Coins` : (netChange < 0 ? `${netChange} Coins` : "No Change."));
}

// --- SLOT MACHINE MECHANICS ---

function getRandomSymbolNew() {
    let totalRarity = NEW_TOTAL_WEIGHT;
    let rand = Math.random() * totalRarity;
    let current = 0;

    for (const [key, symbol] of Object.entries(NEW_SLOT_SYMBOLS)) {
        current += symbol.weight;
        if (rand < current) {
            return key;
        }
    }
    return 'CHRY'; 
}

/**
 * Checks the generated grid for any winning patterns and returns the total multiplier and winning cells.
 */
function checkPatterns(grid) {
    let totalMultiplier = 0;
    let winningCells = [];
    let feedback = "";

    const allSymbols = Object.keys(NEW_SLOT_SYMBOLS);
    
    // Check all possible symbol types
    for (const mainSymbol of allSymbols) {
        let symbolMultiplier = 0;
        let symbolWinningCells = [];

        // Check each pattern against the grid for this specific mainSymbol
        for (const patternData of WIN_PATTERNS) {
            let matches = true;
            let currentPatternCells = [];
            
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const patternVal = patternData.pattern[r][c];
                    
                    if (patternVal === 1) { // Must be the main symbol
                        if (grid[r][c] !== mainSymbol) {
                            matches = false;
                            break;
                        }
                        currentPatternCells.push(r * COLS + c);
                    }
                    // Ignoring patternVal === 0 (ignore) and patternVal === -1 (must be different)
                }
                if (!matches) break;
            }

            if (matches) {
                // Winning pattern found for this symbol!
                symbolMultiplier += patternData.multiplier * NEW_SLOT_SYMBOLS[mainSymbol].multiplier;
                symbolWinningCells.push(...currentPatternCells);
                feedback += ` | ${mainSymbol} ${patternData.type} x${patternData.multiplier} win!`;
            }
        }
        
        // Add the symbol's total wins to the grand total
        if (symbolMultiplier > 0) {
            totalMultiplier += symbolMultiplier;
            winningCells.push(...symbolWinningCells);
        }
    }

    return {
        multiplier: totalMultiplier, 
        cells: [...new Set(winningCells)], // Unique winning cell indices
        feedback: feedback
    };
}


/**
 * Runs one logical spin and returns the results and the final grid.
 */
function calculateOneSpin() {
    let grid = [];
    for (let r = 0; r < ROWS; r++) { // 4 Rows
        let row = [];
        for (let c = 0; c < COLS; c++) { // 5 Cols
            row.push(getRandomSymbolNew());
        }
        grid.push(row);
    }
    
    let totalCoinsGained = 0;
    let totalCoinsLost = 0;

    // 1. Check for Win Patterns
    const { multiplier, cells, feedback } = checkPatterns(grid);
    
    // Base payout is the rounded multiplier value
    totalCoinsGained = Math.round(multiplier); 
    
    // 2. Apply '6' (Loss) Symbol Modifier
    let lossFeedback = "";
    if (Math.random() < PENALTY_CHANCE) {
        let penaltyAmount = Math.max(1, Math.round(gameState.coins * 0.1));
        totalCoinsLost += penaltyAmount;
        lossFeedback = ` | The '6' curse strikes! -${penaltyAmount} Coins.`;
    }
    
    return { 
        totalCoinsGained, 
        totalCoinsLost, 
        grid, 
        winningSymbols: cells,
        feedback: `Payout: ${totalCoinsGained} Coins. Multiplier: x${multiplier.toFixed(1)}` + feedback + lossFeedback
    };
}


/**
 * Updates the visual grid with the provided symbol keys (final or random for spin).
 */
function updateVisualGrid(grid, winningIndices = []) {
    const gridEl = document.getElementById('slot-machine-grid');
    gridEl.innerHTML = ''; 
    let flatIndex = 0;
    
    grid.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'slot-row';
        row.forEach(key => {
            const symbolEl = document.createElement('div');
            symbolEl.className = 'slot-symbol';
            
            const symbolData = NEW_SLOT_SYMBOLS[key];
            
            if (symbolData) {
                symbolEl.textContent = symbolData.display;
                if (winningIndices.includes(flatIndex)) {
                    symbolEl.classList.add('win-flash'); 
                } else {
                    symbolEl.classList.remove('win-flash'); 
                }
            } else {
                symbolEl.textContent = key; // Use the key for the random characters during spin
            }
            
            rowEl.appendChild(symbolEl);
            flatIndex++;
        });
        gridEl.appendChild(rowEl);
    });
}

// --- ANIMATION SEQUENCE ---

function animateSpinSequence(results) {
    gameState.controlsDisabled = true;
    updateHUD();
    
    const spinDuration = 500; 
    let startTime = Date.now();
    let interval;
    
    const allSymbolDisplays = Object.values(NEW_SLOT_SYMBOLS).map(s => s.display);
    
    // 1. Start Spin Animation (Rapidly change symbols)
    interval = setInterval(() => {
        if (Date.now() - startTime > spinDuration) {
            clearInterval(interval);
            stopSpinAndCalculate(results);
            return;
        }
        
        let randomGrid = [];
        for (let r = 0; r < ROWS; r++) { // 4 Rows
            let row = [];
            for (let c = 0; c < COLS; c++) { // 5 Cols
                row.push(allSymbolDisplays[Math.floor(Math.random() * allSymbolDisplays.length)]);
            }
            randomGrid.push(row);
        }
        updateVisualGrid(randomGrid);
    }, 50); 
}

function stopSpinAndCalculate(results) {
    // 2. Stop Spin and Display Final Grid
    updateVisualGrid(results.grid, results.winningSymbols);

    // 3. Apply Payout and Animate Coin Gain
    setTimeout(() => {
        
        // Apply changes to game state
        gameState.coins += results.totalCoinsGained;
        gameState.coins = Math.max(0, gameState.coins - results.totalCoinsLost); 
        
        // Visual Coin Animation
        animateCoinGain(results.totalCoinsGained, results.totalCoinsLost);
        
        console.log(results.feedback); 
        
        // 4. Check for End of Spins / Round Events
        if (gameState.currentSpinOption.spinsLeft <= 0) {
            endRoundEventsCheck();
        } else {
            // Re-enable controls for the next spin
            gameState.controlsDisabled = false;
        }
        updateHUD();

    }, 1000); // 1 second delay for win-flash animation
}

// --- CASINO MECHANICS ---

/**
 * Selects the option, pays the cost, grants tickets, and enables spins. CONSUMES one round.
 */
function selectSpinOption(cost, spins, tickets) {
    if (gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0) {
        postFeedback(gameState.currentSpinOption.spinsLeft > 0 ? "You must use your remaining spins first." : "Wait for the spin to finish.");
        return;
    }
    
    if (gameState.coins < cost) {
        postFeedback("Insufficient coins to afford this option. You need to earn more.");
        return;
    }
    
    // 1. Consume Round
    gameState.roundsRemaining--;

    // 2. Game State Update
    gameState.coins -= cost;
    gameState.cloverTickets += tickets;
    gameState.currentSpinOption = { 
        spinsLeft: spins, 
        initialCost: cost,
        initialSpins: spins,
        ticketsGranted: tickets,
    };
    
    if (gameState.roundsRemaining <= 0) {
        endRoundEvents(); 
        return;
    }
    
    postFeedback(`Choice made! Paid ${cost} coins. You have ${spins} spins remaining.`);
    updateHUD();
}

/**
 * Executes one spin from the remaining allowance. DOES NOT consume a round.
 */
function executeSpin() {
    if (gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft <= 0) {
        postFeedback(gameState.currentSpinOption.spinsLeft <= 0 ? "Select a spin option to start a new round!" : "Wait for the spin to complete!");
        return;
    }

    // 1. Decrement Spin Counter
    gameState.currentSpinOption.spinsLeft--;

    // 2. Calculate ONE Spin
    const results = calculateOneSpin();
    
    // 3. Animate
    animateSpinSequence(results);
}


// --- ATM MECHANICS ---
function depositMoney() {
    if (gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0) {
        postFeedback("Finish your current spins or quit the Casino first!");
        return;
    }
    const input = document.getElementById('deposit-input');
    const amount = parseInt(input.value);

    if (isNaN(amount) || amount <= 0 || gameState.coins < amount) {
        postFeedback(gameState.coins < amount ? "You don't have that many coins to deposit." : "Invalid deposit amount.");
        updateHUD();
        return;
    }

    gameState.coins -= amount;
    gameState.depositedMoney += amount;
    gameState.principal += amount; 
    gameState.quotaDeposit += amount;

    postFeedback(`[FREE ACTION] Successfully deposited ${amount} coins. Quota progress: ${gameState.quotaDeposit}/${gameState.currentQuota}.`);

    input.value = 1;
    updateHUD();
}

function withdrawInterest() {
    if (gameState.controlsDisabled || gameState.currentSpinOption.spinsLeft > 0) {
        postFeedback("Finish your current spins or quit the Casino first!");
        return;
    }
    if (gameState.depositedMoney < 0.01) {
        postFeedback("[FREE ACTION] No money deposited to earn interest.");
        return;
    }

    let interestEarned = gameState.depositedMoney - gameState.principal;
    
    if (interestEarned < 0.01) {
        postFeedback("[FREE ACTION] No significant interest has been earned yet (or it was all withdrawn).");
        return;
    }
    
    let amountToWithdraw = Math.floor(interestEarned);
    
    if (amountToWithdraw < 1) {
        postFeedback("[FREE ACTION] Interest earned is less than 1 coin.");
        return;
    }
    
    gameState.depositedMoney -= amountToWithdraw; 
    gameState.principal = gameState.depositedMoney; 
    gameState.coins += amountToWithdraw;
    
    postFeedback(`[FREE ACTION] Withdrew ${amountToWithdraw} coins of interest! Deposit is now ${gameState.depositedMoney.toFixed(2)}.`);
    updateHUD();
}


// --- GAME LOOP & ROUND MANAGEMENT ---

function endRoundEventsCheck() {
    setTimeout(() => {
        if (gameState.roundsRemaining <= 0) {
            endRoundEvents();
        } else {
            gameState.currentSpinOption.initialSpins = 0;
            gameState.currentSpinOption.spinsLeft = 0;
            gameState.controlsDisabled = false;
            updateHUD();
            postFeedback("Spins exhausted. Select a new option or check the ATM.");
        }
    }, 100);
}

function endRoundEvents() {
    let feedback = "--- END OF ROUND EVENTS ---";
    
    if (gameState.quotaDeposit < gameState.currentQuota) {
        gameOver(`Quota FAILED! You only deposited ${gameState.quotaDeposit} of the required ${gameState.currentQuota} coins.`);
        return; 
    } 
    
    gameState.currentQuota = Math.round(gameState.currentQuota * 1.5); 
    feedback += ` | Quota SUCCESS! New Quota: ${gameState.currentQuota}.`;

    const interest = gameState.depositedMoney * INTEREST_RATE;
    gameState.depositedMoney = gameState.depositedMoney * (1 + INTEREST_RATE);
    feedback += ` | Earned ${interest.toFixed(2)} interest on deposit.`;

    gameState.round++;
    gameState.roundsRemaining = 3;
    gameState.quotaDeposit = 0;
    
    gameState.currentSpinOption.initialSpins = 0;
    gameState.currentSpinOption.spinsLeft = 0;
    
    gameState.controlsDisabled = false;
    postFeedback(feedback);
    
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
    postFeedback("Welcome. Meet the Quota within 3 Casino actions. ATM deposits are free.");
    
    // Initial Casino Grid Setup 
    updateVisualGrid(Array(ROWS).fill(Array(COLS).fill(' ')));
};
