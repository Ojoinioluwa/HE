import { createSlice } from '@reduxjs/toolkit';

const masterSlice = createSlice({
    name: "master",
    initialState: {
        masterSecret: null
    },
    reducers: {
        addSecrets: (state, action) => {
            state.masterSecret = action.payload.secrets
        },
        removeSecrets: (state) => {
            state.masterSecret = null
        }
    }
})


const masterReducer = masterSlice.reducer;
export default masterReducer;
export const { addSecrets, removeSecrets } = masterSlice.actions