import { useEffect, useState, useCallback } from "react";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  method: "Tunai" | "QRIS" | "Debit" | "Transfer";
  cashier?: string;
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  footer: string;
  taxPercent: number;
  cashier: string;
}

const KEYS = {
  products: "pos.products",
  transactions: "pos.transactions",
  settings: "pos.settings",
};

const DEFAULT_SETTINGS: StoreSettings = {
  name: "Toko Saya",
  address: "Jl. Contoh No. 123",
  phone: "0812-3456-7890",
  footer: "Terima kasih telah berbelanja!",
  taxPercent: 0,
  cashier: "Admin",
};

const SAMPLE_PRODUCTS: Product[] = [
  { id: "p1", name: "Kopi Hitam", price: 8000, stock: 50, category: "Minuman" },
  { id: "p2", name: "Teh Manis", price: 5000, stock: 50, category: "Minuman" },
  { id: "p3", name: "Nasi Goreng", price: 18000, stock: 30, category: "Makanan" },
  { id: "p4", name: "Mie Ayam", price: 15000, stock: 30, category: "Makanan" },
  { id: "p5", name: "Roti Bakar", price: 12000, stock: 20, category: "Snack" },
  { id: "p6", name: "Air Mineral", price: 4000, stock: 100, category: "Minuman" },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("pos:update", { detail: key }));
}

function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(read(key, fallback));
    const handler = () => setValue(read(key, fallback));
    window.addEventListener("pos:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("pos:update", handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setter = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(read(key, fallback)) : next;
      write(key, resolved);
      setValue(resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, setter] as const;
}

export function useProducts() {
  const [products, setProducts] = useLocal<Product[]>(KEYS.products, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEYS.products)) write(KEYS.products, SAMPLE_PRODUCTS);
  }, []);
  return [products, setProducts] as const;
}

export function useTransactions() {
  return useLocal<Transaction[]>(KEYS.transactions, []);
}

export function useSettings() {
  const [settings, setSettings] = useLocal<StoreSettings>(KEYS.settings, DEFAULT_SETTINGS);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEYS.settings)) write(KEYS.settings, DEFAULT_SETTINGS);
  }, []);
  return [settings, setSettings] as const;
}

export const formatRupiah = (n: number) =>
  "Rp " + Math.round(n).toLocaleString("id-ID");

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
