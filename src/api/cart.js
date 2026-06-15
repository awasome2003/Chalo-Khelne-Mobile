import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "store_cart_v1";

const read = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = async (items) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  return items;
};

export const getCart = read;

export const addToCart = async (item) => {
  const cart = await read();
  if (cart.find((i) => i.listingId === item.listingId)) return cart;
  return write([...cart, { ...item, qty: item.qty || 1 }]);
};

export const removeFromCart = async (listingId) => {
  const cart = await read();
  return write(cart.filter((i) => i.listingId !== listingId));
};

export const updateQty = async (listingId, qty) => {
  const cart = await read();
  const next = cart.map((i) =>
    i.listingId === listingId ? { ...i, qty: Math.max(1, qty) } : i
  );
  return write(next);
};

export const clearCart = async () => write([]);

export const isInCart = async (listingId) => {
  const cart = await read();
  return !!cart.find((i) => i.listingId === listingId);
};
