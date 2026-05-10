/**
 * Game Controller - Main game logic with Web3 integration
 */

class GameController {
  constructor() {
    this.walletAdapter = new WEB3.WalletAdapter();
    this.depositSystem = null;
    this.swapService = null;
    this.connection = null;

    this.gameState = {
      publicKey: null,
      walletBalance: 0,
      inGameBalance: 0,
      currentBet: WEB3_CONFIG.GAME.defaultBet,
      isSpinning: false,
      freeSpinsLeft: 0,
      specialSymbol: null,
      isFreeSpinMode: false,
      isConnected: false,
      walletType: null,
      totalWins: 0,
      totalSpins: 0
    };

    this.reelState = {
      symbols: [],
      lastWin: null,
      paylines: []
    };
  }

  /**
   * Initialize the game
   */
  async init() {
    this.setupReels();
    this.updateUI();
    this.checkWalletConnection();
    this.logStatus('Ready to Play');
  }

  /**
   * Check for existing wallet connection
   */
  async checkWalletConnection() {
    const availableWallets = await this.walletAdapter.detectWallets();
    
    if (availableWallets.length === 0) {
      this.logStatus('⚠️ No Web3 wallet detected. Please install Phantom or MetaMask.');
      return;
    }

    // Auto-connect to first available wallet (prefer Phantom)
    const walletToConnect = availableWallets.includes('phantom') 
      ? 'phantom' 
      : availableWallets[0];
    
    if (this.walletAdapter.wallet?.isConnected) {
      const publicKey = this.walletAdapter.wallet.publicKey?.toString();
      if (publicKey) {
        await this.connectWallet(walletToConnect);
      }
    }
  }

  /**
   * Connect wallet
   */
  async connectWallet(walletName = 'phantom') {
    try {
      this.logStatus('Connecting wallet...');
      
      const result = await this.walletAdapter.connect(walletName);
      
      if (!result.success) {
        this.logStatus(`❌ Connection failed: ${result.error}`);
        return false;
      }

      this.gameState.publicKey = result.publicKey;
      this.gameState.isConnected = true;
      this.gameState.walletType = result.walletType;

      // Initialize Web3 services
      this.depositSystem = new CryptoDepositSystem(this.walletAdapter);
      this.depositSystem.initializeConnection();
      this.swapService = new SwapService(this.walletAdapter);

      // Update UI
      document.getElementById('connect-btn').innerHTML = '✅ Connected';
      document.getElementById('connect-btn').classList.add('connected');
      document.getElementById('wallet-address').innerHTML = 
        `${result.publicKey.slice(0, 6)}...${result.publicKey.slice(-4)}`;

      // Fetch balances
      await this.fetchBalances();
      
      this.logStatus('✅ Wallet connected!');
      return true;
    } catch (error) {
      console.error('Wallet connection error:', error);
      this.logStatus('❌ Connection failed');
      return false;
    }
  }

  /**
   * Fetch all token balances
   */
  async fetchBalances() {
    try {
      if (!this.depositSystem) return;

      // Fetch DAC balance
      const dacBalance = await this.depositSystem.getTokenBalance(
        this.gameState.publicKey,
        WEB3_CONFIG.TOKEN.mint
      );
      this.gameState.walletBalance = dacBalance;
      this.gameState.inGameBalance = dacBalance;

      this.updateUI();
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      this.logStatus('⚠️ Balance update failed');
    }
  }

  /**
   * Open deposit modal
   */
  openDepositModal() {
    if (!this.gameState.isConnected) {
      this.logStatus('❌ Please connect wallet first');
      return;
    }

    // Show deposit UI
    const modal = document.getElementById('deposit-modal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  /**
   * Process crypto deposit
   */
  async processDeposit(depositToken, depositAmount) {
    try {
      this.logStatus('Processing deposit...');

      // Validate
      const validation = this.depositSystem.validateDepositAmount(
        depositAmount,
        depositToken
      );

      if (!validation.valid) {
        this.logStatus(`❌ ${validation.error}`);
        return false;
      }

      // Calculate DAC amount
      const calc = await this.depositSystem.calculateDACAmount(
        depositAmount,
        depositToken
      );

      this.logStatus(
        `Converting ${depositAmount} ${depositToken} to ${calc.dacAmount} DAC...`
      );

      // Execute swap if token is not DAC
      if (depositToken !== 'DAC') {
        const tokenConfig = WEB3_CONFIG.DEPOSIT_TOKENS[depositToken];
        const result = await this.swapService.executeSwap(
          tokenConfig.mint,
          WEB3_CONFIG.TOKEN.mint,
          depositAmount,
          this.gameState.publicKey
        );

        if (result.success) {
          this.logStatus(
            `✅ Deposit successful! Received ${result.outputAmount} DAC`
          );
          await this.fetchBalances();
          return true;
        }
      }

      return true;
    } catch (error) {
      console.error('Deposit processing failed:', error);
      this.logStatus(`❌ Deposit failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle spin
   */
  async handleSpin() {
    if (!this.gameState.isConnected) {
      this.logStatus('❌ Connect wallet first');
      return;
    }

    if (this.gameState.inGameBalance < this.gameState.currentBet) {
      this.logStatus('❌ Insufficient balance');
      return;
    }

    if (this.gameState.isSpinning) {
      return;
    }

    this.gameState.isSpinning = true;
    this.gameState.totalSpins++;
    this.gameState.inGameBalance -= this.gameState.currentBet;

    // Spin reels
    await this.spinReels();

    // Check for wins
    const winResult = this.checkWins();
    
    if (winResult.amount > 0) {
      this.gameState.inGameBalance += winResult.amount;
      this.gameState.totalWins += winResult.amount;
      this.showWinAnimation(winResult);
    }

    if (winResult.freeSpins > 0) {
      this.gameState.freeSpinsLeft = winResult.freeSpins;
      this.showFreeSpinsAnimation(winResult);
    }

    this.updateUI();
    this.gameState.isSpinning = false;
  }

  /**
   * Adjust bet amount
   */
  adjustBet(amount) {
    const newBet = this.gameState.currentBet + amount;
    
    if (newBet < WEB3_CONFIG.GAME.minBet) {
      this.gameState.currentBet = WEB3_CONFIG.GAME.minBet;
    } else if (newBet > WEB3_CONFIG.GAME.maxBet) {
      this.gameState.currentBet = WEB3_CONFIG.GAME.maxBet;
    } else {
      this.gameState.currentBet = newBet;
    }

    this.updateUI();
  }

  /**
   * Update UI elements
   */
  updateUI() {
    // Update balance
    const balanceEl = document.getElementById('balance-aco');
    if (balanceEl) {
      balanceEl.textContent = Math.floor(this.gameState.inGameBalance);
    }

    // Update bet
    const betEl = document.getElementById('current-bet');
    if (betEl) {
      betEl.textContent = this.gameState.currentBet;
    }

    // Update spin button state
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) {
      spinBtn.disabled = this.gameState.isSpinning || 
                        this.gameState.inGameBalance < this.gameState.currentBet ||
                        !this.gameState.isConnected;
    }
  }

  /**
   * Log status message
   */
  logStatus(message) {
    const statusEl = document.getElementById('status-msg');
    if (statusEl) {
      statusEl.textContent = message;
    }
    console.log('[Game]', message);
  }

  // Placeholder methods for slot game logic
  setupReels() {
    // Initialize reels - implement slot game logic
  }

  async spinReels() {
    // Spin animation logic
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  checkWins() {
    // Check for winning combinations
    return { amount: 0, freeSpins: 0 };
  }

  showWinAnimation(result) {
    // Show win overlay
    const overlay = document.getElementById('win-overlay');
    if (overlay) {
      document.getElementById('win-amount').textContent = `+${result.amount} DAC`;
      overlay.classList.add('active');
    }
  }

  showFreeSpinsAnimation(result) {
    // Show free spins overlay
    const overlay = document.getElementById('fs-overlay');
    if (overlay) {
      document.getElementById('fs-count').textContent = result.freeSpins;
      overlay.classList.add('active');
    }
  }
}

// Export for use
window.GameController = GameController;