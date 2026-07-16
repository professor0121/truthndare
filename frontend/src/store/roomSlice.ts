import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface RoomPlayer {
  userId: string;
  username: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isOnline: boolean;
  joinedAt: string;
}

export interface RoomDetails {
  code: string;
  hostId: string;
  maxPlayers: number;
  visibility: "public" | "private";
  status: "lobby" | "playing" | "finished";
  players: RoomPlayer[];
  game: {
    status: "lobby" | "playing" | "finished";
    currentRound: number;
    currentPlayerId: string;
    turnState: "selecting" | "choosing_type" | "answering" | "completed" | "skipped";
    selectedType: "truth" | "dare" | null;
    currentQuestion: {
      id: string | null;
      text: string | null;
      type: string | null;
    };
    winnerId: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface RoomState {
  activeRoom: RoomDetails | null;
  publicLobbies: RoomDetails[];
  loading: boolean;
  error: string | null;
}

const initialState: RoomState = {
  activeRoom: null,
  publicLobbies: [],
  loading: false,
  error: null,
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    setRoom: (state, action: PayloadAction<RoomDetails>) => {
      state.activeRoom = action.payload;
      state.error = null;
    },
    clearRoom: (state) => {
      state.activeRoom = null;
    },
    setPublicLobbies: (state, action: PayloadAction<RoomDetails[]>) => {
      state.publicLobbies = action.payload;
    },
    updatePlayersPresence: (state, action: PayloadAction<RoomPlayer[]>) => {
      if (state.activeRoom) {
        state.activeRoom.players = action.payload;
      }
    },
    setRoomLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setRoomError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setRoom,
  clearRoom,
  setPublicLobbies,
  updatePlayersPresence,
  setRoomLoading,
  setRoomError,
} = roomSlice.actions;
export default roomSlice.reducer;
