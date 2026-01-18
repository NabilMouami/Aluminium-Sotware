// src/store/store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage

import DetailsSlice from "../slices/detailsElement";
import UserInfo from "../slices/userInfo";
import DetailsOrder from "../slices/order";

const rootReducer = combineReducers({
  Load: DetailsSlice,
  userInfo: UserInfo,
  Order: DetailsOrder,
});

const persistConfig = {
  key: "root-assoussi",
  storage,
  whitelist: ["userInfo"], // persist only userInfo
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Important: ignore redux-persist lifecycle actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
