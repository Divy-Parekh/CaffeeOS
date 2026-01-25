import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentSession: null,
    currentShop: null,
    isSessionActive: false,
};

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        setSession: (state, action) => {
            state.currentSession = action.payload;
            state.isSessionActive = action.payload?.status === 'OPEN';
        },
        setShop: (state, action) => {
            state.currentShop = action.payload;
        },
        clearSession: (state) => {
            state.currentSession = null;
            state.currentShop = null;
            state.isSessionActive = false;
        },
        updateSessionStats: (state, action) => {
            if (state.currentSession) {
                state.currentSession.totalRevenue = action.payload.totalRevenue;
                state.currentSession.totalOrders = action.payload.totalOrders;
            }
        },
    },
});

export const { setSession, setShop, clearSession, updateSessionStats } = sessionSlice.actions;
export default sessionSlice.reducer;
