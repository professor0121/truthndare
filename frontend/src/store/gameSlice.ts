import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface GameState {
  secondsLeft: number;
  timerActive: boolean;
  spinning: boolean;
  selectedSpinnerPlayerId: string | null;
}

const initialState: GameState = {
  secondsLeft: 0,
  timerActive: false,
  spinning: false,
  selectedSpinnerPlayerId: null,
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setSecondsLeft: (state, action: PayloadAction<number>) => {
      state.secondsLeft = action.payload;
      state.timerActive = action.payload > 0;
    },
    stopTimer: (state) => {
      state.secondsLeft = 0;
      state.timerActive = false;
    },
    setSpinning: (state, action: PayloadAction<boolean>) => {
      state.spinning = action.payload;
    },
    setSelectedSpinnerPlayerId: (state, action: PayloadAction<string | null>) => {
      state.selectedSpinnerPlayerId = action.payload;
    },
    resetGameLocal: (state) => {
      state.secondsLeft = 0;
      state.timerActive = false;
      state.spinning = false;
      state.selectedSpinnerPlayerId = null;
    },
  },
});

export const {
  setSecondsLeft,
  stopTimer,
  setSpinning,
  setSelectedSpinnerPlayerId,
  resetGameLocal,
} = gameSlice.actions;
export default gameSlice.reducer;
