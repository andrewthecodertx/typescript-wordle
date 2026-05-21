export type LetterState = 'correct' | 'present' | 'absent';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface GuessResult {
  word: string;
  states: LetterState[];
}

export interface GameState {
  solution: string;
  guesses: GuessResult[];
  currentRow: string;
  currentRowIdx: number;
  status: GameStatus;
  message: string;
}

export function computeStates(solution: string, guess: string): LetterState[] {
  const states: LetterState[] = new Array(5).fill('absent');
  const remaining: (string | null)[] = solution.split('');

  // First pass: mark correct positions
  for (let i = 0; i < 5; i++) {
    if (guess[i] === solution[i]) {
      states[i] = 'correct';
      remaining[i] = null;
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < 5; i++) {
    if (states[i] === 'correct') continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) {
      states[i] = 'present';
      remaining[idx] = null;
    }
  }

  return states;
}

export function createGame(solution: string): GameState {
  return {
    solution,
    guesses: [],
    currentRow: '',
    currentRowIdx: 0,
    status: 'playing',
    message: '',
  };
}

export function submitGuess(state: GameState, validWords: Set<string>): GameState {
  if (state.status !== 'playing') return state;
  if (state.currentRow.length !== 5) {
    return { ...state, message: 'Not enough letters' };
  }

  const guess = state.currentRow.toLowerCase();

  if (!validWords.has(guess)) {
    return { ...state, message: 'Not in word list' };
  }

  const states = computeStates(state.solution, guess);
  const result: GuessResult = { word: guess, states };
  const newGuesses = [...state.guesses, result];

  let status: GameStatus = 'playing';
  let message = '';

  if (guess === state.solution) {
    status = 'won';
    const messages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
    message = messages[Math.min(state.currentRowIdx, 5)];
  } else if (newGuesses.length >= 6) {
    status = 'lost';
    message = state.solution.toUpperCase();
  }

  return {
    solution: state.solution,
    guesses: newGuesses,
    currentRow: '',
    currentRowIdx: state.currentRowIdx + 1,
    status,
    message,
  };
}

export function addLetter(state: GameState, letter: string): GameState {
  if (state.status !== 'playing') return state;
  if (state.currentRow.length >= 5) return state;
  return { ...state, currentRow: state.currentRow + letter };
}

export function removeLetter(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  if (state.currentRow.length === 0) return state;
  return { ...state, currentRow: state.currentRow.slice(0, -1) };
}