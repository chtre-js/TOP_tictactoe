## 1. Project Overview & Scope

* **Core Objective:** Build a lightweight, fully accessible Tic-Tac-Toe web application. The architectural primary focus is a deep dive into the internal structure of the `GameController` IIFE module, demonstrating how it orchestrates data flow, turns, rules, closures, and UI signals without polluting the global scope or storing state inside the DOM.
* **Target Tech Stack:** Vanilla HTML5, CUBE CSS (utility-first, fluid layout via `clamp()`), and Vanilla ES6 JavaScript (IIFE Module Pattern + Factory Functions).
* **Architecture Overview:**
* **Data Layer (`Gameboard` IIFE):** Manages internal state (`Array(9)` filled with `null`, `'X'`, or `'O'`).
* **Factory Layer (`createPlayer` Factory):** Constructs player objects with private state via closure getters.
* **Logic Layer (`GameController` IIFE):** Holds match state, turn progression, win/draw checking rules, move validation, and game loop orchestration.
* **View Layer (`DisplayController` IIFE):** Handles DOM event delegation, reactive visual updates, keyboard navigation focus, and ARIA live notifications.



```
       +-----------------------+
       |   DisplayController   |
       |  (DOM View / Events)  |
       +-----------+-----------+
                   |
     invokes turns / resets
                   |
                   v
       +-----------------------+
       |    GameController     | <--- orchestrates match logic
       +-----+-----------+-----+
             |           |
    fetches board      reads/validates
             |           |
             v           v
      +-----------+ +---------+
      | Gameboard | | Player  |
      +-----------+ +---------+

```

---

## 2. Functional & Technical Requirements

### Data Models & Method Signatures

* **Player Factory (`createPlayer`):**
* **Closure State:** `name` (string), `marker` (`'X'` | `'O'`).
* **Exposed API:** `{ getName: () => string, getMarker: () => 'X' | 'O' }`.


* **Gameboard Module (`Gameboard`):**
* **Internal State:** `board` (Array of length 9, initialized to `null`).
* **Exposed API:**
* `getBoard()`: Returns a shallow copy `[...board]` to maintain immutability.
* `markCell(index: number, marker: string)`: Writes marker if `index` is valid and `null`. Returns `boolean`.
* `resetBoard()`: Clears the array to `9` `null` values.




* **GameController Module (`GameController`):**
* **Internal State:**
* `players`: Array `[player1, player2]` initialized via `createPlayer`.
* `activePlayerIndex`: `0` | `1`.
* `isOver`: `boolean`.
* `winner`: `Player` | `null`.
* `isDraw`: `boolean`.
* `winningLine`: Array of indices `[number, number, number]` | `null`.


* **Exposed API:**
* `initGame(player1Name?: string, player2Name?: string): void`
* `playTurn(cellIndex: number): TurnResult`
* `resetGame(): void`
* `getGameState(): GameStateSnapshot`





```typescript
// Architectural Types & Method Signatures

interface TurnResult {
  success: boolean;
  status: 'CONTINUE' | 'WIN' | 'DRAW' | 'INVALID_MOVE' | 'GAME_OVER';
  activePlayer: { name: string; marker: string };
  winningLine: number[] | null;
  message: string;
}

interface GameStateSnapshot {
  board: Array<string | null>;
  activePlayer: { name: string; marker: string };
  isOver: boolean;
  winner: { name: string; marker: string } | null;
  isDraw: boolean;
  winningLine: number[] | null;
}

```

### Business Logic & Win Algorithms

* **Win Index Combinations (8 Vectors):**

$$[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]$$


* **Turn Evaluation Algorithm:**
1. If `isOver === true` $\rightarrow$ Return `{ success: false, status: 'GAME_OVER' }`.
2. Validate input cell index ($0 \le \text{index} \le 8$). If cell in `Gameboard` is not `null` $\rightarrow$ Return `{ success: false, status: 'INVALID_MOVE' }`.
3. Execute `Gameboard.markCell(index, activePlayer.getMarker())`.
4. Evaluate Win Matrix against current board array.
* **If Win Detected:** Set `isOver = true`, `winner = activePlayer`, store matching combination in `winningLine`. Return `{ success: true, status: 'WIN' }`.


5. Check for Draw (`board.every(cell => cell !== null)`).
* **If Draw Detected:** Set `isOver = true`, `isDraw = true`. Return `{ success: true, status: 'DRAW' }`.


6. **If Game Continues:** Toggle active player index (`activePlayerIndex = activePlayerIndex === 0 ? 1 : 0`). Return `{ success: true, status: 'CONTINUE' }`.



---

## 3. UI/UX Component Blueprint

### View Hierarchy

```text
main.region-game
├── section.block-setup (Player Form Configuration)
│   └── form.composition-cluster
│       ├── label / input#p1-name
│       ├── label / input#p2-name
│       └── button.block-button[type="submit"]
├── div.block-status[aria-live="polite"][aria-atomic="true"] (Live Notifications)
├── section.composition-grid.block-board[role="region"][aria-label="Tic Tac Toe Board"]
│   └── button.block-square[data-index="0..8"] (× 9 Grid Tiles)
└── button.block-button[data-action="reset"] (Reset / Restart Game)

```

### Key Component Specs & Accessibility Highlights

* **Board Buttons (`.block-square`):**
* Native `<button>` elements with `data-index="0"` to `"8"`.
* Dynamic `aria-label` maintained by `DisplayController` (e.g., `"Row 1, Column 2: Marked as X"` or `"Row 1, Column 2: Empty"`).
* Explicit high-contrast focus rings using `:focus-visible` to satisfy WCAG 2.2 AA standards:
```css
.block-square:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: -3px;
}

```




* **Status Announcer (`.block-status`):**
* Implements `aria-live="polite"` and `aria-atomic="true"`.
* Formatted string messages generated by `GameController` turn outcomes (e.g., `"Alice placed X on square 1. Bob's turn."`).



---

## 4. GameController Structure & Implementation Plan

### Detailed Breakdown of the `GameController` Module Internal Code Structure

Below is the pseudocode blueprint and structural layout of the `GameController` IIFE module.

```javascript
const GameController = (function(boardModule, playerFactory) {
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
})(Gameboard, createPlayer);

```

### Sequential Phase Blueprint

#### Phase 1: Pure Logic Execution (GameController Implementation)

* **Objective:** Construct `createPlayer`, `Gameboard`, and `GameController` completely decoupled from HTML/DOM manipulation.
* **Implementation Detail:** Build closure state and evaluation engines as detailed in the code block above.
* **Verification Criteria:** Execute minimal self-checking assertions in console.

#### Phase 2: CUBE CSS Engine & Fluid Structure

* **Objective:** Write zero-breakpoint layout and element declarations.
* **Implementation Detail:** Set fluid custom properties (`clamp()`) for spacing/font sizes. Apply explicit focus-visible styles.
* **Verification Criteria:** Zoom page to 200%; confirm layout expands fluidly without horizontal scrollbars or missing text.

#### Phase 3: Display Controller & DOM Event Delegation

* **Objective:** Bind `DisplayController` to `GameController` API via event listeners.
* **Implementation Detail:** Attach delegated `click` handler on `.block-board`. Call `GameController.playTurn(index)` on valid tile selection, then update text, accessibility labels, and live region message based on returned `TurnResult`.
* **Verification Criteria:** Perform dynamic turns using keyboard (Tab + Space). Verify live announcements and tile state updates.

---

## 5. Potential Pitfalls & Edge Cases

1. **State Mutation Bugs via Board Array Leakage:**
* *Gotcha:* If `Gameboard.getBoard()` returns direct private array references, external code could modify game state.
* *Prevention:* `Gameboard.getBoard()` must return a shallow copy: `() => [...board]`.


2. **DOM Focus Loss During Dynamic Updates:**
* *Gotcha:* Wiping out grid elements with `.innerHTML = ...` resets focus to `<body>`, breaking keyboard accessibility.
* *Prevention:* Update single attribute nodes in place (`button.textContent = marker; button.setAttribute('aria-label', ...)`).


3. **Event Delegation Target Drift:**
* *Gotcha:* Clicking child elements (e.g., icons inside buttons) can set `event.target` to non-button elements without dataset properties.
* *Prevention:* Always use `.closest('[data-index]')` to target the parent button wrapper cleanly.


4. **Multiple Game Over Actions:**
* *Gotcha:* User clicks grid squares after game has ended, firing extra processing loops.
* *Prevention:* `GameController.playTurn` immediately exits when `isOver === true`, returning `{ success: false, status: 'GAME_OVER' }`.
