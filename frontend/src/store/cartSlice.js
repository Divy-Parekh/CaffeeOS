import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    items: [],
    customerId: undefined,
    customerName: undefined,
    customerEmail: undefined,
    tableId: undefined,
    tableName: undefined,
    notes: undefined,
    discount: 0,
    discountType: 'fixed',
    tip: 0,
    orderId: undefined, // Store order ID after sending to kitchen
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addItem: (state, action) => {
            const existingIndex = state.items.findIndex(
                (item) => item.productId === action.payload.productId
            );

            if (existingIndex >= 0) {
                state.items[existingIndex].quantity += action.payload.quantity;
            } else {
                state.items.push(action.payload);
            }
        },

        updateItemQuantity: (state, action) => {
            const item = state.items.find((i) => i.productId === action.payload.productId);
            if (item) {
                item.quantity = Math.max(0, action.payload.quantity);
                if (item.quantity === 0) {
                    state.items = state.items.filter((i) => i.productId !== action.payload.productId);
                }
            }
        },

        incrementItem: (state, action) => {
            const item = state.items.find((i) => i.productId === action.payload);
            if (item) {
                item.quantity += 1;
            }
        },

        decrementItem: (state, action) => {
            const item = state.items.find((i) => i.productId === action.payload);
            if (item) {
                item.quantity -= 1;
                if (item.quantity <= 0) {
                    state.items = state.items.filter((i) => i.productId !== action.payload);
                }
            }
        },

        removeItem: (state, action) => {
            state.items = state.items.filter((item) => item.productId !== action.payload);
        },

        updateItemVariants: (state, action) => {
            const item = state.items.find((i) => i.productId === action.payload.productId);
            if (item) {
                item.variants = action.payload.variants;
            }
        },

        setCustomer: (state, action) => {
            if (action.payload) {
                state.customerId = action.payload.id;
                state.customerName = action.payload.name;
                state.customerEmail = action.payload.email;
            } else {
                state.customerId = undefined;
                state.customerName = undefined;
                state.customerEmail = undefined;
            }
        },

        setTable: (state, action) => {
            if (action.payload) {
                state.tableId = action.payload.id;
                state.tableName = action.payload.name;
            } else {
                state.tableId = undefined;
                state.tableName = undefined;
            }
        },

        setNotes: (state, action) => {
            state.notes = action.payload;
        },

        setDiscount: (state, action) => {
            state.discount = action.payload.amount;
            state.discountType = action.payload.type;
        },

        setTip: (state, action) => {
            state.tip = action.payload;
        },

        setOrderId: (state, action) => {
            state.orderId = action.payload;
        },

        clearCart: () => initialState,
    },
});

// Selectors
export const selectCartItems = (state) => state.cart.items || [];

export const selectCartSubtotal = (state) =>
    (state.cart.items || []).reduce((sum, item) => {
        const variantExtra = item.variants?.reduce((v, variant) => v + (parseFloat(variant.extraPrice) || 0), 0) || 0;
        return sum + ((parseFloat(item.unitPrice) || 0) + variantExtra) * (parseFloat(item.quantity) || 0);
    }, 0);

export const selectCartTax = (state) =>
    (state.cart.items || []).reduce((sum, item) => {
        const variantExtra = item.variants?.reduce((v, variant) => v + (parseFloat(variant.extraPrice) || 0), 0) || 0;
        const itemTotal = ((parseFloat(item.unitPrice) || 0) + variantExtra) * (parseFloat(item.quantity) || 0);
        const taxPercent = parseFloat(item.taxPercent) || 0;
        return sum + (itemTotal * taxPercent) / 100;
    }, 0);

export const selectCartDiscount = (state) => {
    const subtotal = selectCartSubtotal(state);
    const discount = parseFloat(state.cart.discount) || 0;
    if (state.cart.discountType === 'percent') {
        return (subtotal * discount) / 100;
    }
    return discount;
};

export const selectCartTip = (state) => parseFloat(state.cart.tip) || 0;

export const selectCartTotal = (state) => {
    const subtotal = selectCartSubtotal(state);
    const tax = selectCartTax(state);
    const discount = selectCartDiscount(state);
    const tip = selectCartTip(state);
    const total = subtotal + tax - discount + tip;
    return Math.max(0, total); // Ensure total is never negative
};

export const selectCartItemCount = (state) =>
    (state.cart.items || []).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

export const {
    addItem,
    updateItemQuantity,
    incrementItem,
    decrementItem,
    removeItem,
    updateItemVariants,
    setCustomer,
    setTable,
    setNotes,
    setDiscount,
    setTip,
    setOrderId,
    clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
