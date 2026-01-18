import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  ColOrder: {},
  DetailsOrder: {},
};

const detailOrdSlice = createSlice({
  initialState,
  name: "ColOrder",
  reducers: {
    detailsOrder: (state, action) => {
      console.log(action.payload);
      state.ColOrder = action.payload;
    },
    loadDetailsOrder: (state, action) => {
      console.log(action.payload);
      state.DetailsOrder = action.payload;
    },
  },
});

export const { detailsOrder, loadDetailsOrder } = detailOrdSlice.actions;

export const ColOrder = (state) => state.Order.ColOrder;
export const DetailsOrder = (state) => state.Order.DetailsOrder;

export default detailOrdSlice.reducer;
