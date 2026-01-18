// userSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  User: null,
};

const userSlice = createSlice({
  name: "userInfo",
  initialState,
  reducers: {
    detailsUser: (state, action) => {
      state.User = action.payload;
    },
    logoutUser: (state) => {
      state.User = null;
    },
  },
});

export const { detailsUser, logoutUser } = userSlice.actions;
export const selectUser = (state) => state.userInfo.User;
export default userSlice.reducer;
