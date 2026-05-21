import { GameState, addLetter, removeLetter, submitGuess } from './engine';
import { getAllValidWords, pickSolution } from './words';

const MAX_ROWS = 6;
const WORD_LENGTH = 5;

const validWords = getAllValidWords();

// --- Color scheme (terminal aesthetic) ---
const COLORS = {
  correct: { bg: '#22c55e', border: '#16a34a', text: '#000000' },   // terminal-green
  present: { bg: '#eab308', border: '#ca8a04', text: '#000000' },    // amber/yellow
  absent:  { bg: '#3f3f46', border: '#52525b', text: '#a1a1aa' },    // zinc-700 / zinc text
  empty:   { bg: 'transparent', border: '#52525b', text: '#e4e4e7' },// default border
  active:  { bg: 'transparent', border: '#22c55e', text: '#e4e4e7' }, // active row
  keyDefault: { bg: '#27272a', border: '#3f3f46', text: '#e4e4e7' },
};

const KEYBOARD_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['enter','z','x','c','v','b','n','m','⌫'],
];

let state: GameState;

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function createBoard(): void {
  const board = $('wordle-board');
  board.innerHTML = '';
  for (let r = 0; r < MAX_ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    for (let c = 0; c < WORD_LENGTH; c++) {
      const cell = document.createElement('div');
      cell.className = 'wordle-cell';
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      row.appendChild(cell);
    }
    board.appendChild(row);
  }
}

function createKeyboard(): void {
  const kb = $('wordle-keyboard');
  kb.innerHTML = '';
  KEYBOARD_ROWS.forEach((row, ri) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-kb-row';
    if (ri === 1) rowEl.classList.add('wordle-kb-row-offset');

    row.forEach((key) => {
      const btn = document.createElement('button');
      btn.className = 'wordle-key';
      btn.dataset.key = key;
      if (key === 'enter' || key === '⌫') {
        btn.classList.add('wordle-key-wide');
      }
      btn.textContent = key === 'enter' ? '↵' : key.toUpperCase();
      btn.addEventListener('click', () => handleInput(key));
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });
}

function getCell(row: number, col: number): HTMLElement {
  return $(`wordle-board`).children[row].children[col] as HTMLElement;
}

function getKeyButton(letter: string): HTMLElement | null {
  return $(`wordle-keyboard`).querySelector(`[data-key="${letter}"]`);
}

function computeKeyStates(): Record<string, string> {
  // Priority: correct > present > absent
  const keyMap: Record<string, string> = {};
  for (const guess of state.guesses) {
    for (let i = 0; i < 5; i++) {
      const letter = guess.word[i];
      const st = guess.states[i];
      const current = keyMap[letter];
      if (st === 'correct') {
        keyMap[letter] = 'correct';
      } else if (st === 'present' && current !== 'correct') {
        keyMap[letter] = 'present';
      } else if (st === 'absent' && !current) {
        keyMap[letter] = 'absent';
      }
    }
  }
  return keyMap;
}

function render(): void {
  // Render completed guesses
  for (let r = 0; r < state.guesses.length; r++) {
    const guess = state.guesses[r];
    for (let c = 0; c < 5; c++) {
      const cell = getCell(r, c);
      cell.textContent = guess.word[c].toUpperCase();
      cell.dataset.state = guess.states[c];
      cell.style.backgroundColor = COLORS[guess.states[c]].bg;
      cell.style.borderColor = COLORS[guess.states[c]].border;
      cell.style.color = COLORS[guess.states[c]].text;
      cell.classList.add('wordle-cell-flip');
      cell.style.animationDelay = `${c * 100}ms`;
    }
  }

  // Render current row
  const currentRowIdx = state.guesses.length;
  if (state.status === 'playing') {
    for (let c = 0; c < 5; c++) {
      const cell = getCell(currentRowIdx, c);
      if (c < state.currentRow.length) {
        cell.textContent = state.currentRow[c].toUpperCase();
        cell.dataset.state = 'typed';
        cell.style.backgroundColor = COLORS.empty.bg;
        cell.style.borderColor = COLORS.active.border;
        cell.style.color = COLORS.empty.text;
        cell.classList.add('wordle-cell-pop');
      } else {
        cell.textContent = '';
        cell.dataset.state = 'empty';
        cell.style.backgroundColor = COLORS.empty.bg;
        cell.style.borderColor = COLORS.empty.border;
        cell.style.color = COLORS.empty.text;
        cell.classList.remove('wordle-cell-pop');
      }
    }
  }

  // Clear remaining rows
  for (let r = state.guesses.length + (state.status === 'playing' ? 1 : 0); r < MAX_ROWS; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = getCell(r, c);
      cell.textContent = '';
      cell.dataset.state = 'empty';
      cell.style.backgroundColor = COLORS.empty.bg;
      cell.style.borderColor = COLORS.empty.border;
      cell.style.color = COLORS.empty.text;
    }
  }

  // Render keyboard
  const keyStates = computeKeyStates();
  KEYBOARD_ROWS.flat().forEach((key) => {
    const btn = getKeyButton(key);
    if (!btn) return;
    const letter = key.length === 1 ? key : '';
    const st = letter ? keyStates[letter] : undefined;
    if (st === 'correct') {
      btn.style.backgroundColor = COLORS.correct.bg;
      btn.style.borderColor = COLORS.correct.border;
      btn.style.color = COLORS.correct.text;
    } else if (st === 'present') {
      btn.style.backgroundColor = COLORS.present.bg;
      btn.style.borderColor = COLORS.present.border;
      btn.style.color = COLORS.present.text;
    } else if (st === 'absent') {
      btn.style.backgroundColor = COLORS.absent.bg;
      btn.style.borderColor = COLORS.absent.border;
      btn.style.color = COLORS.absent.text;
    } else {
      btn.style.backgroundColor = COLORS.keyDefault.bg;
      btn.style.borderColor = COLORS.keyDefault.border;
      btn.style.color = COLORS.keyDefault.text;
    }
  });

  // Message
  const msgEl = $('wordle-message');
  if (state.message) {
    msgEl.textContent = state.message;
    msgEl.classList.add('wordle-message-show');
    if (state.status !== 'playing') {
      msgEl.classList.add('wordle-message-persistent');
    } else {
      setTimeout(() => {
        msgEl.classList.remove('wordle-message-show');
        state = { ...state, message: '' };
      }, 1500);
    }
  } else {
    msgEl.classList.remove('wordle-message-show', 'wordle-message-persistent');
  }

  // New game button
  const newGameBtn = $('wordle-new-game');
  if (state.status !== 'playing') {
    newGameBtn.style.display = 'inline-block';
  } else {
    newGameBtn.style.display = 'none';
  }
}

function shakeCurrentRow(): void {
  const rowIdx = state.guesses.length;
  const row = $('wordle-board').children[rowIdx] as HTMLElement;
  row.classList.add('wordle-row-shake');
  setTimeout(() => row.classList.remove('wordle-row-shake'), 600);
}

function handleInput(key: string): void {
  if (state.status !== 'playing') return;

  if (key === 'enter') {
    const newState = submitGuess(state, validWords);
    if (newState.message === 'Not enough letters' || newState.message === 'Not in word list') {
      shakeCurrentRow();
    }
    state = newState;
  } else if (key === '⌫') {
    state = removeLetter(state);
  } else if (/^[a-z]$/.test(key)) {
    state = addLetter(state, key);
  }
  render();
}

function initGame(): void {
  state = { solution: pickSolution(), guesses: [], currentRow: '', currentRowIdx: 0, status: 'playing', message: '' };
  createBoard();
  createKeyboard();
  render();
}

// Inject styles (idempotent — won't duplicate if called again)
function injectStyles(): void {
  if (document.getElementById('wordle-styles')) return;
  const style = document.createElement('style');
  style.id = 'wordle-styles';
  style.textContent = `
    .wordle-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 16px 0;
      max-width: 500px;
      margin: 0 auto;
      user-select: none;
    }
    .wordle-board {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .wordle-row {
      display: flex;
      gap: 6px;
    }
    .wordle-cell {
      width: 58px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
      border: 2px solid #52525b;
      text-transform: uppercase;
      transition: background-color 0.3s, border-color 0.3s;
    }
    @media (max-width: 400px) {
      .wordle-cell {
        width: 48px;
        height: 48px;
        font-size: 1.5rem;
      }
    }
    .wordle-cell-pop {
      animation: pop 100ms ease;
    }
    @keyframes pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    .wordle-cell-flip {
      animation: flip 500ms ease forwards;
    }
    @keyframes flip {
      0% { transform: rotateX(0deg); }
      50% { transform: rotateX(90deg); }
      100% { transform: rotateX(0deg); }
    }
    .wordle-row-shake {
      animation: shake 600ms ease;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
    .wordle-message {
      height: 2rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #e4e4e7;
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s;
      padding: 4px 12px;
      border-radius: 4px;
      background: #18181b;
      border: 1px solid #52525b;
    }
    .wordle-message-show {
      opacity: 1;
    }
    .wordle-message-persistent {
      background: #22c55e;
      color: #000;
      border-color: #16a34a;
    }
    .wordle-kb {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      max-width: 500px;
    }
    .wordle-kb-row {
      display: flex;
      gap: 5px;
      justify-content: center;
    }
    .wordle-kb-row-offset {
      padding-left: 24px;
    }
    .wordle-key {
      height: 52px;
      min-width: 34px;
      padding: 0 8px;
      border: 1px solid #3f3f46;
      background: #27272a;
      color: #e4e4e7;
      font-family: monospace;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      border-radius: 4px;
      transition: background-color 0.2s, border-color 0.2s, color 0.2s;
    }
    .wordle-key:hover {
      background: #3f3f46;
    }
    .wordle-key-wide {
      min-width: 56px;
      font-size: 0.75rem;
    }
    .wordle-new-game {
      display: none;
      border: 1px solid #22c55e;
      background: transparent;
      color: #22c55e;
      font-family: monospace;
      font-size: 0.875rem;
      padding: 8px 20px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.2s, color 0.2s;
      text-transform: lowercase;
    }
    .wordle-new-game:hover {
      background: #22c55e;
      color: #000;
    }
  `;
  document.head.appendChild(style);
}

// Keyboard handler — stored on window so removeEventListener works across IIFE re-executions
// (Astro View Transitions re-runs the script as a new IIFE, creating new function references)
const _onKeydown = (e: KeyboardEvent): void => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter') {
    handleInput('enter');
  } else if (e.key === 'Backspace') {
    handleInput('⌫');
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    handleInput(e.key.toLowerCase());
  }
};

function boot(): void {
  // Remove any previous keyboard listener from a prior boot (Astro client-side navigation)
  const prevHandler = (window as any).__wordleKeydown;
  if (prevHandler) {
    document.removeEventListener('keydown', prevHandler);
  }
  document.addEventListener('keydown', _onKeydown);
  (window as any).__wordleKeydown = _onKeydown;

  injectStyles();
  initGame();

  // New game button
  $('wordle-new-game').addEventListener('click', () => {
    initGame();
  });
}

// Support both initial page load and client-side navigation (e.g. Astro View Transitions).
// DOMContentLoaded fires only on hard page loads; when navigating via client-side routing,
// the DOM is already ready by the time the script executes.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}