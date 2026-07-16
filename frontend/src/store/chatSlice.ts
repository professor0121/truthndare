import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  sender: {
    userId: string;
    username: string;
    avatar: string;
  };
  message: string;
  timestamp: string;
}

export interface EmojiReaction {
  id: string;
  sender: {
    userId: string;
    username: string;
  };
  emoji: string;
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  reactions: EmojiReaction[];
}

const initialState: ChatState = {
  messages: [],
  reactions: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      // Keep only last 100 messages to prevent excessive memory usage
      if (state.messages.length > 100) {
        state.messages.shift();
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    addReaction: (state, action: PayloadAction<EmojiReaction>) => {
      state.reactions.push(action.payload);
      // Keep only last 20 active reactions
      if (state.reactions.length > 20) {
        state.reactions.shift();
      }
    },
    clearReactions: (state) => {
      state.reactions = [];
    },
  },
});

export const { addMessage, clearMessages, addReaction, clearReactions } = chatSlice.actions;
export default chatSlice.reducer;
