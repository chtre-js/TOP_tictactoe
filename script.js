function createPlayer(name, marker) {
    function getName() {
        return name;
    }

    function getMarker() {
        return marker;
    }

    return {getName, getMarker}
}

const gameboard = (function() {
    const board = new Array(9).fill(null);

    function getBoard() {
        return [...board];
    }
    
    function markCell(index, marker) {
        if (index >= 0 && index < 9 && board[index] === null) {
            board[index] = marker;
            return true;
        }
        return false;
    }

    function resetBoard() {
        board.fill(null);
    }

    return {getBoard, markCell, resetBoard}
})();

const gameController = (function(gameboard, createPlayer) {
  // Private Constants
  const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  // Private Closure State
  let players = [
    createPlayer("Player One", "X"),
    createPlayer("Player Two", "O")
  ];
  let activePlayerIndex = 0;
  let isOver = false;
  let winner = null;
  let isDraw = false;
  let winningLine = null;
  let scores = { X: 0, O: 0 };

  // Private Helper Methods
  const checkWin = (currentBoard) => {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const [a, b, c] = WINNING_COMBINATIONS[i];
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return WINNING_COMBINATIONS[i]; // Return winning triplet indices
      }
    }
    return null;
  };

  const switchPlayer = () => {
    activePlayerIndex = activePlayerIndex === 0 ? 1 : 0;
  };

  const getActivePlayer = () => players[activePlayerIndex];

  // Public Methods
  const initGame = (p1Name = "Player One", p2Name = "Player Two") => {
    players = [
      createPlayer(p1Name, "X"),
      createPlayer(p2Name, "O")
    ];
    scores = { X: 0, O: 0 }; // Reset scores on player configuration changes
    resetGame();
  };

  const resetGame = () => {
    gameboard.resetBoard();
    activePlayerIndex = 0;
    isOver = false;
    winner = null;
    isDraw = false;
    winningLine = null;
  };

  const playTurn = (cellIndex) => {
    if (isOver) {
      return {
        success: false,
        status: "GAME_OVER",
        message: "The game is already over. Please reset to play again."
      };
    }

    const currentMarker = getActivePlayer().getMarker();
    const markSuccessful = gameboard.markCell(cellIndex, currentMarker);

    if (!markSuccessful) {
      return {
        success: false,
        status: "INVALID_MOVE",
        message: "Cell is already occupied or invalid index."
      };
    }

    const currentBoard = gameboard.getBoard();
    const winningCombo = checkWin(currentBoard);

    if (winningCombo) {
      isOver = true;
      winner = getActivePlayer();
      winningLine = winningCombo;
      scores[winner.getMarker()]++;
      return {
        success: true,
        status: "WIN",
        activePlayer: { name: winner.getName(), marker: winner.getMarker() },
        winningLine,
        message: `${winner.getName()} wins!`
      };
    }

    if (currentBoard.every((cell) => cell !== null)) {
      isOver = true;
      isDraw = true;
      return {
        success: true,
        status: "DRAW",
        activePlayer: { name: getActivePlayer().getName(), marker: getActivePlayer().getMarker() },
        winningLine: null,
        message: "Match drawn."
      };
    }

    // Advance turn if no win/draw terminal state was reached
    switchPlayer();
    const nextPlayer = getActivePlayer();

    return {
      success: true,
      status: "CONTINUE",
      activePlayer: { name: nextPlayer.getName(), marker: nextPlayer.getMarker() },
      winningLine: null,
      message: `${nextPlayer.getName()}'s turn.`
    };
  };

  const getGameState = () => ({
    board: gameboard.getBoard(),
    activePlayer: {
      name: getActivePlayer() ? getActivePlayer().getName() : "Player One",
      marker: getActivePlayer() ? getActivePlayer().getMarker() : "X"
    },
    isOver,
    winner: winner ? { name: winner.getName(), marker: winner.getMarker() } : null,
    isDraw,
    winningLine: winningLine ? [...winningLine] : null,
    scores: { ...scores }
  });

  return {
    initGame,
    resetGame,
    playTurn,
    getGameState
  };
})(gameboard, createPlayer);

const DisplayController = (function(gameController) {
  // DOM Cache
  const form = document.querySelector('.block-setup form');
  const setupSection = document.querySelector('.block-setup');
  const workspace = document.getElementById('game-workspace');
  const boardContainer = document.getElementById('board');
  const cells = document.querySelectorAll('.block-square');
  const statusAnnouncer = document.querySelector('.block-status');
  const resetBtn = document.querySelector('[data-action="reset"]');
  const winModal = document.getElementById('win-modal');
  const winnerText = document.getElementById('winner-text');
  const modalBtn = document.getElementById('modal-cta-button');
  
  const scoreXCard = document.getElementById('score-x-card');
  const scoreOCard = document.getElementById('score-o-card');
  
  const scoreXLabel = scoreXCard ? scoreXCard.querySelector('.block-score-card-label') : null;
  const scoreOLabel = scoreOCard ? scoreOCard.querySelector('.block-score-card-label') : null;
  const scoreXVal = document.getElementById('score-x');
  const scoreOVal = document.getElementById('score-o');
  
  const indX = document.getElementById('turn-marker-x');
  const indO = document.getElementById('turn-marker-o');
  
  let previousActiveElement = null; // Track focused element before modal opens

  // Core Render & DOM Update Methods
  const renderBoard = () => {
    const gameState = gameController.getGameState();
    const board = gameState.board;
    
    cells.forEach((cell, index) => {
      const value = board[index];
      const markerX = cell.querySelector('.marker-x');
      const markerO = cell.querySelector('.marker-o');
      const row = Math.floor(index / 3) + 1;
      const col = (index % 3) + 1;

      // Update markers via custom visible attributes instead of innerHTML to retain button focus
      if (value === 'X') {
        if (markerX) markerX.setAttribute('data-visible', 'true');
        if (markerO) markerO.setAttribute('data-visible', 'false');
        cell.setAttribute('aria-label', `Row ${row}, Column ${col}: X`);
        cell.setAttribute('aria-disabled', 'true');
      } else if (value === 'O') {
        if (markerO) markerO.setAttribute('data-visible', 'true');
        if (markerX) markerX.setAttribute('data-visible', 'false');
        cell.setAttribute('aria-label', `Row ${row}, Column ${col}: O`);
        cell.setAttribute('aria-disabled', 'true');
      } else {
        if (markerX) markerX.setAttribute('data-visible', 'false');
        if (markerO) markerO.setAttribute('data-visible', 'false');
        cell.setAttribute('aria-label', `Row ${row}, Column ${col}: Empty`);
        cell.setAttribute('aria-disabled', 'false');
      }
    });
  };

  const updateStatus = (message) => {
    if (statusAnnouncer) {
      statusAnnouncer.textContent = message;
    }
  };

  // Event Handlers
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const p1Name = document.getElementById('p1-name').value.trim() || 'Player One';
    const p2Name = document.getElementById('p2-name').value.trim() || 'Player Two';
    
    gameController.initGame(p1Name, p2Name);
    
    // Update Scoreboard labels
    if (scoreXLabel) scoreXLabel.textContent = p1Name;
    if (scoreOLabel) scoreOLabel.textContent = p2Name;
    
    // Update visual text inside indicators to match custom names
    if (indX) {
      const span = indX.querySelector('span:not(.material-symbols-outlined)');
      if (span) span.textContent = p1Name;
    }
    if (indO) {
      const span = indO.querySelector('span:not(.material-symbols-outlined)');
      if (span) span.textContent = p2Name;
    }
    
    // Fade out form and activate game workspace
    if (setupSection) setupSection.setAttribute('data-state', 'inactive');
    if (workspace) workspace.setAttribute('data-state', 'active');
    
    updateStatus(`Match started. ${p1Name}'s turn.`);
    updateScores();
    renderBoard();
    
    // Reset visual indicators to X active
    const state = gameController.getGameState();
    updateTurnVisuals(state.activePlayer);
    
    // Focus first square for key nav accessibility
    if (cells.length > 0) cells[0].focus();
  };

  const handleBoardClick = (e) => {
    const cell = e.target.closest('.block-square');
    if (!cell) return;

    const index = parseInt(cell.dataset.index, 10);
    const stateBefore = gameController.getGameState();
    
    // Prevent clicking already marked cells or clicking when game is over
    if (stateBefore.isOver || stateBefore.board[index] !== null) return;

    const result = gameController.playTurn(index);
    if (!result.success) {
      updateStatus(result.message);
      return;
    }

    renderBoard();
    updateStatus(result.message);
    if (result.activePlayer) {
      updateTurnVisuals(result.activePlayer);
    }

    if (result.status === 'WIN') {
      updateScores();
      showWinnerModal(result.message, result.activePlayer.marker, result.winningLine);
    } else if (result.status === 'DRAW') {
      showWinnerModal("Match drawn.", null, null);
    }
  };

  const handleReset = () => {
    gameController.resetGame();
    renderBoard();
    
    // Read names from current states
    const state = gameController.getGameState();
    updateStatus(`Board reset. ${state.activePlayer.name}'s turn.`);
    
    // Clear modals and winning overlay SVG
    hideWinnerModal();
    
    // Reset visual indicator flags
    updateTurnVisuals(state.activePlayer);
  };

  // SVG Winner Path Drawer (coordinates mapped to layout)
  const drawWinningLine = (winningCombo) => {
    const svg = document.getElementById('winning-line-svg');
    const line = document.getElementById('winning-line');
    if (!svg || !line) return;

    if (!winningCombo) {
      svg.classList.add('opacity-0');
      svg.classList.remove('winning-active');
      return;
    }

    const coordinates = {
      '0,1,2': { x1: '5%', y1: '16.6%', x2: '95%', y2: '16.6%' },
      '3,4,5': { x1: '5%', y1: '50%', x2: '95%', y2: '50%' },
      '6,7,8': { x1: '5%', y1: '83.3%', x2: '95%', y2: '83.3%' },
      '0,3,6': { x1: '16.6%', y1: '5%', x2: '16.6%', y2: '95%' },
      '1,4,7': { x1: '50%', y1: '5%', x2: '50%', y2: '95%' },
      '2,5,8': { x1: '83.3%', y1: '5%', x2: '83.3%', y2: '95%' },
      '0,4,8': { x1: '5%', y1: '5%', x2: '95%', y2: '95%' },
      '2,4,6': { x1: '95%', y1: '5%', x2: '5%', y2: '95%' }
    };

    const key = winningCombo.join(',');
    const coords = coordinates[key];

    if (coords) {
      line.setAttribute('x1', coords.x1);
      line.setAttribute('y1', coords.y1);
      line.setAttribute('x2', coords.x2);
      line.setAttribute('y2', coords.y2);
      
      // Dynamic color matching the winning player marker
      const state = gameController.getGameState();
      if (state.winner && state.winner.marker === 'X') {
        line.setAttribute('class', 'text-primary drop-shadow-[0_0_10px_currentColor]');
      } else {
        line.setAttribute('class', 'text-secondary drop-shadow-[0_0_10px_currentColor]');
      }
      
      svg.classList.remove('opacity-0');
      // Trigger browser redraw to reset dash offset laser sweep animation
      void line.offsetWidth;
      svg.classList.add('winning-active');
    }
  };

  // Helper Visual Actions
  const updateTurnVisuals = (activePlayer) => {
    if (!indX || !indO || !scoreXCard || !scoreOCard) return;
    
    if (activePlayer.marker === 'X') {
      indX.setAttribute('data-active', 'true');
      indO.setAttribute('data-active', 'false');
      scoreXCard.setAttribute('data-active', 'true');
      scoreOCard.setAttribute('data-active', 'false');
    } else {
      indX.setAttribute('data-active', 'false');
      indO.setAttribute('data-active', 'true');
      scoreXCard.setAttribute('data-active', 'false');
      scoreOCard.setAttribute('data-active', 'true');
    }
  };

  const updateScores = () => {
    const state = gameController.getGameState();
    if (scoreXVal) scoreXVal.textContent = state.scores.X.toString().padStart(2, '0');
    if (scoreOVal) scoreOVal.textContent = state.scores.O.toString().padStart(2, '0');
  };

  const showWinnerModal = (message, winnerMarker, winningCombo) => {
    previousActiveElement = document.activeElement;
    if (winnerText) {
      winnerText.textContent = message;
      winnerText.className = `block-modal-title ${winnerMarker === 'X' ? 'text-primary' : winnerMarker === 'O' ? 'text-secondary' : 'text-on-surface'}`;
    }
    
    if (winningCombo) drawWinningLine(winningCombo);

    if (winModal) winModal.setAttribute('data-state', 'open');
    
    // Programmatically focus modal CTA button
    if (modalBtn) {
      setTimeout(() => modalBtn.focus(), 50);
    }
  };

  const hideWinnerModal = () => {
    if (winModal) winModal.setAttribute('data-state', 'closed');
    drawWinningLine(null); // Hide SVG line
    
    // Restore focus
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    } else if (resetBtn) {
      resetBtn.focus();
    }
  };

  const trapFocus = (e) => {
    if (e.key !== 'Tab') return;
    if (!winModal) return;
    const focusables = winModal.querySelectorAll('button, [tabindex="0"]');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  // Bind Events
  const initListeners = () => {
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (boardContainer) boardContainer.addEventListener('click', handleBoardClick);
    if (resetBtn) resetBtn.addEventListener('click', handleReset);
    if (winModal) winModal.addEventListener('keydown', trapFocus);
    
    if (modalBtn) {
      modalBtn.addEventListener('click', () => {
        hideWinnerModal();
        handleReset();
      });
    }
  };

  // Run initial event bindings
  initListeners();

  return { renderBoard };
})(gameController);