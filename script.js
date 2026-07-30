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

const gameController = (function(boardModule, playerFactory) {
  // Private Constants
  const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  // Private Closure State
  let players = [];
  let activePlayerIndex = 0;
  let isOver = false;
  let winner = null;
  let isDraw = false;
  let winningLine = null;

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
  const initGame = (p1Name = "Player 1", p2Name = "Player 2") => {
    players = [
      playerFactory(p1Name, "X"),
      playerFactory(p2Name, "O")
    ];
    resetGame();
  };

  const resetGame = () => {
    boardModule.resetBoard();
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
    const markSuccessful = boardModule.markCell(cellIndex, currentMarker);

    if (!markSuccessful) {
      return {
        success: false,
        status: "INVALID_MOVE",
        message: "Cell is already occupied or invalid index."
      };
    }

    const currentBoard = boardModule.getBoard();
    const winningCombo = checkWin(currentBoard);

    if (winningCombo) {
      isOver = true;
      winner = getActivePlayer();
      winningLine = winningCombo;
      return {
        success: true,
        status: "WIN",
        activePlayer: { name: winner.getName(), marker: winner.getMarker() },
        winningLine,
        message: `${winner.getName()} (${winner.getMarker()}) wins!`
      };
    }

    if (currentBoard.every((cell) => cell !== null)) {
      isOver = true;
      isDraw = true;
      return {
        success: true,
        status: "DRAW",
        winningLine: null,
        message: "It's a tie!"
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
      message: `${nextPlayer.getName()}'s turn (${nextPlayer.getMarker()}).`
    };
  };

  const getGameState = () => ({
    board: boardModule.getBoard(),
    activePlayer: {
      name: getActivePlayer().getName(),
      marker: getActivePlayer().getMarker()
    },
    isOver,
    winner: winner ? { name: winner.getName(), marker: winner.getMarker() } : null,
    isDraw,
    winningLine: winningLine ? [...winningLine] : null
  });

  // Export public API
  return {
    initGame,
    resetGame,
    playTurn,
    getGameState
  };
})(gameboard, createPlayer);

// Example test run
gameController.initGame("Chérif", "Ilel");