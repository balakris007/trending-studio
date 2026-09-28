import { create } from 'zustand';
import { ICustomer, IUser } from '@trending-studio/shared-types';

export interface CartItem {
  id: string;
  itemType: 'PRODUCT' | 'PHOTO_PRINT' | 'FRAME' | 'STUDIO_SERVICE';
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  gstRate: number;
  metadata?: any;
}

interface AppState {
  user: IUser | null;
  syncStatus: 'ONLINE' | 'SYNCING' | 'OFFLINE' | 'SYNC_ERROR';
  syncMessage: string;
  cart: CartItem[];
  selectedCustomer: ICustomer | null;
  overallDiscount: number;

  setUser: (user: IUser | null) => void;
  setSyncStatus: (status: 'ONLINE' | 'SYNCING' | 'OFFLINE' | 'SYNC_ERROR', message?: string) => void;
  setSelectedCustomer: (customer: ICustomer | null) => void;
  addToCart: (item: CartItem) => void;
  updateCartQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setOverallDiscount: (discount: number) => void;
}

export const useAppStore = create<AppState>((set: any) => ({
  user: null,
  syncStatus: 'OFFLINE',
  syncMessage: 'Offline Mode (Local SQLite)',
  cart: [],
  selectedCustomer: null,
  overallDiscount: 0,

  setUser: (user: IUser | null) => set({ user }),
  setSyncStatus: (syncStatus: 'ONLINE' | 'SYNCING' | 'OFFLINE' | 'SYNC_ERROR', syncMessage: string = '') =>
    set({ syncStatus, syncMessage }),
  setSelectedCustomer: (selectedCustomer: ICustomer | null) => set({ selectedCustomer }),

  addToCart: (item: CartItem) =>
    set((state: AppState) => {
      const idx = state.cart.findIndex((c: CartItem) => c.productId && c.productId === item.productId);
      if (idx >= 0) {
        const next = [...state.cart];
        next[idx].quantity += item.quantity;
        return { cart: next };
      }
      return { cart: [...state.cart, item] };
    }),

  updateCartQty: (id: string, delta: number) =>
    set((state: AppState) => {
      const next = state.cart
        .map((item: CartItem) => {
          if (item.id === id) {
            const q = item.quantity + delta;
            return q > 0 ? { ...item, quantity: q } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      return { cart: next };
    }),

  removeFromCart: (id: string) =>
    set((state: AppState) => ({ cart: state.cart.filter((c: CartItem) => c.id !== id) })),

  clearCart: () => set({ cart: [], overallDiscount: 0 }),
  setOverallDiscount: (overallDiscount: number) => set({ overallDiscount }),
}));

