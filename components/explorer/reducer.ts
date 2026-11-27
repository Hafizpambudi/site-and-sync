export type ExplorerState = {
  /** How many questions exist; the reducer needs it to know where the list ends. */
  count: number;
  /** -1 means the run has not started. */
  current: number;
  asked: number[];
  playing: boolean;
  phase: "typing" | "answer";
  done: boolean;
};

export type ExplorerAction =
  | { type: "start" }
  | { type: "reveal" }
  | { type: "advance" }
  | { type: "jump"; index: number }
  | { type: "pause" }
  | { type: "play" }
  | { type: "restart" };

export function initialState(count: number): ExplorerState {
  return { count, current: -1, asked: [], playing: true, phase: "typing", done: false };
}

export function reducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "start":
      if (state.current !== -1) return state;
      return { ...state, current: 0, phase: "typing", playing: true, done: false };

    case "reveal":
      if (state.current < 0) return state;
      return {
        ...state,
        phase: "answer",
        asked: state.asked.includes(state.current)
          ? state.asked
          : [...state.asked, state.current],
      };

    case "advance":
      if (state.current < 0) return state;
      if (state.current >= state.count - 1) {
        return { ...state, phase: "answer", done: true, playing: false };
      }
      return { ...state, current: state.current + 1, phase: "typing", done: false };

    case "jump":
      return { ...state, current: action.index, phase: "typing", playing: true, done: false };

    case "pause":
      return { ...state, playing: false };

    case "play":
      return { ...state, playing: true };

    case "restart":
      return { ...initialState(state.count), current: 0 };

    default:
      return state;
  }
}
