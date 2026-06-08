import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ShoppingCart,
  Package,
  History,
  Settings as SettingsIcon,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useProducts,
  useTransactions,
  useSettings,
  formatRupiah,
  newId,
  type CartItem,
  type Product,
  type Transaction,
} from "@/lib/pos-store";
import { Receipt } from "@/components/pos/Receipt";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kasir Pro — Aplikasi Kasir Lengkap" },
      {
        name: "description",
        content:
          "Aplikasi kasir lengkap: jual, kelola produk, cetak struk, riwayat transaksi.",
      },
    ],
  }),
  component: PosApp,
});

function PosApp() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Kasir Pro</h1>
              <p className="text-xs text-muted-foreground">Aplikasi kasir lengkap</p>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="kasir" className="mx-auto max-w-6xl px-4 pb-24 pt-4">
        <TabsContent value="kasir">
          <KasirView />
        </TabsContent>
        <TabsContent value="produk">
          <ProdukView />
        </TabsContent>
        <TabsContent value="riwayat">
          <RiwayatView />
        </TabsContent>
        <TabsContent value="pengaturan">
          <PengaturanView />
        </TabsContent>

        <TabsList className="fixed bottom-0 left-0 right-0 z-40 grid h-16 w-full grid-cols-4 rounded-none border-t bg-card p-0">
          <BottomTab value="kasir" icon={<ShoppingCart className="h-5 w-5" />} label="Kasir" />
          <BottomTab value="produk" icon={<Package className="h-5 w-5" />} label="Produk" />
          <BottomTab value="riwayat" icon={<History className="h-5 w-5" />} label="Riwayat" />
          <BottomTab
            value="pengaturan"
            icon={<SettingsIcon className="h-5 w-5" />}
            label="Atur"
          />
        </TabsList>
      </Tabs>
    </div>
  );
}

function BottomTab({
  value,
  icon,
  label,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="flex h-full flex-col items-center justify-center gap-1 rounded-none data-[state=active]:bg-accent data-[state=active]:text-primary"
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </TabsTrigger>
  );
}

/* ------------------------------- KASIR ------------------------------- */

function KasirView() {
  const [products, setProducts] = useProducts();
  const [transactions, setTransactions] = useTransactions();
  const [settings] = useSettings();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Semua");
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState<string>("");
  const [method, setMethod] = useState<Transaction["method"]>("Tunai");
  const [payOpen, setPayOpen] = useState(false);
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(["Semua"]);
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "Semua" || p.category === category) &&
          p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search, category],
  );

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxAmount = Math.round(((subtotal - discount) * settings.taxPercent) / 100);
  const total = Math.max(0, subtotal - discount + taxAmount);
  const paidNum = Number(paid) || 0;
  const change = Math.max(0, paidNum - total);

  function addToCart(p: Product) {
    if (p.stock <= 0) {
      toast.error("Stok habis");
      return;
    }
    setCart((c) => {
      const ex = c.find((i) => i.productId === p.id);
      if (ex) {
        if (ex.qty >= p.stock) {
          toast.error("Melebihi stok");
          return c;
        }
        return c.map((i) =>
          i.productId === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...c, { productId: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((c) =>
      c
        .map((i) => {
          if (i.productId !== id) return i;
          const product = products.find((p) => p.id === id);
          const nextQty = i.qty + delta;
          if (product && nextQty > product.stock) {
            toast.error("Melebihi stok");
            return i;
          }
          return { ...i, qty: nextQty };
        })
        .filter((i) => i.qty > 0),
    );
  }

  function removeItem(id: string) {
    setCart((c) => c.filter((i) => i.productId !== id));
  }

  function openPayment() {
    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    setPaid(String(total));
    setPayOpen(true);
  }

  function processPayment() {
    if (paidNum < total) {
      toast.error("Pembayaran kurang");
      return;
    }
    const trx: Transaction = {
      id: newId(),
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      discount,
      tax: taxAmount,
      total,
      paid: paidNum,
      change,
      method,
      cashier: settings.cashier,
    };
    setTransactions([trx, ...transactions]);
    setProducts(
      products.map((p) => {
        const it = cart.find((c) => c.productId === p.id);
        return it ? { ...p, stock: p.stock - it.qty } : p;
      }),
    );
    setCart([]);
    setDiscount(0);
    setPaid("");
    setPayOpen(false);
    setReceiptTrx(trx);
    toast.success("Transaksi berhasil");
  }

  function printReceipt() {
    if (!receiptRef.current) return;
    const html = receiptRef.current.innerHTML;
    const w = window.open("", "_blank", "width=320,height=600");
    if (!w) {
      toast.error("Popup diblokir browser");
      return;
    }
    w.document.write(`
      <html><head><title>Struk</title>
      <style>
        @page { size: 58mm auto; margin: 4mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color:#000; margin:0; padding:8px; }
        .row { display:flex; justify-content:space-between; }
        .center { text-align:center; }
        .bold { font-weight:bold; }
        .dashed { border-top: 1px dashed #000; margin: 6px 0; }
      </style>
      </head><body>${html}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}<\/script></body></html>
    `);
    w.document.close();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* Products */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="group flex flex-col rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-16 items-center justify-center rounded bg-accent text-accent-foreground">
                <Package className="h-7 w-7" />
              </div>
              <div className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</div>
              <div className="mt-1 text-sm font-bold text-primary">{formatRupiah(p.price)}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Stok: {p.stock}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Tidak ada produk
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <Card className="lg:sticky lg:top-20 lg:h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Keranjang</span>
            <Badge variant="secondary">{cart.length} item</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScrollArea className="h-64 pr-3">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Belum ada item
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((i) => (
                  <div key={i.productId} className="rounded-md border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{i.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatRupiah(i.price)}
                        </div>
                      </div>
                      <button onClick={() => removeItem(i.productId)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => changeQty(i.productId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => changeQty(i.productId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm font-bold">{formatRupiah(i.price * i.qty)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="space-y-2 border-t pt-3 text-sm">
            <Row label="Subtotal" value={formatRupiah(subtotal)} />
            <div className="flex items-center justify-between">
              <Label className="text-sm">Diskon</Label>
              <Input
                type="number"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-8 w-28 text-right"
                placeholder="0"
              />
            </div>
            {settings.taxPercent > 0 && (
              <Row label={`Pajak (${settings.taxPercent}%)`} value={formatRupiah(taxAmount)} />
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatRupiah(total)}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={openPayment} disabled={cart.length === 0}>
            Bayar
          </Button>
          {cart.length > 0 && (
            <Button variant="ghost" className="w-full" onClick={() => setCart([])}>
              Kosongkan
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-accent p-4 text-center">
              <div className="text-xs text-muted-foreground">Total Tagihan</div>
              <div className="text-2xl font-bold text-primary">{formatRupiah(total)}</div>
            </div>
            <div>
              <Label>Metode</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Transaction["method"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunai">Tunai</SelectItem>
                  <SelectItem value="QRIS">QRIS</SelectItem>
                  <SelectItem value="Debit">Debit</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jumlah Bayar</Label>
              <Input
                type="number"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                className="text-lg"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {[total, 50000, 100000, 200000].map((v, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPaid(String(v))}
                  >
                    {formatRupiah(v)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-between rounded-md bg-secondary p-3 text-sm font-semibold">
              <span>Kembalian</span>
              <span>{formatRupiah(change)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Batal</Button>
            <Button onClick={processPayment}>Proses</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receiptTrx} onOpenChange={(o) => !o && setReceiptTrx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Struk Pembelian</DialogTitle>
          </DialogHeader>
          {receiptTrx && (
            <div className="max-h-[60vh] overflow-auto rounded-md border bg-white p-2">
              <Receipt ref={receiptRef} trx={receiptTrx} settings={settings} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setReceiptTrx(null)}>Tutup</Button>
            <Button onClick={printReceipt}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/* ------------------------------- PRODUK ------------------------------- */

function ProdukView() {
  const [products, setProducts] = useProducts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>({
    name: "",
    price: 0,
    stock: 0,
    category: "",
  });

  function startNew() {
    setEditing(null);
    setForm({ name: "", price: 0, stock: 0, category: "" });
    setOpen(true);
  }

  function startEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, price: p.price, stock: p.stock, category: p.category ?? "" });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (editing) {
      setProducts(products.map((p) => (p.id === editing.id ? { ...editing, ...form } : p)));
      toast.success("Produk diperbarui");
    } else {
      setProducts([{ id: newId(), ...form }, ...products]);
      toast.success("Produk ditambahkan");
    }
    setOpen(false);
  }

  function remove(id: string) {
    setProducts(products.filter((p) => p.id !== id));
    toast.success("Produk dihapus");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Daftar Produk ({products.length})</h2>
        <Button onClick={startNew}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                {p.category || "Tanpa kategori"} • Stok {p.stock}
              </div>
              <div className="text-sm font-bold text-primary">{formatRupiah(p.price)}</div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada produk
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Tambah"} Produk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Kategori</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Mis. Makanan" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Harga</Label>
                <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Stok</Label>
                <Input type="number" value={form.stock || ""} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------- RIWAYAT ------------------------------- */

function RiwayatView() {
  const [transactions, setTransactions] = useTransactions();
  const [settings] = useSettings();
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const today = new Date().toDateString();
  const todayTrx = transactions.filter((t) => new Date(t.date).toDateString() === today);
  const omzetHari = todayTrx.reduce((s, t) => s + t.total, 0);
  const omzetTotal = transactions.reduce((s, t) => s + t.total, 0);

  function printReceipt() {
    if (!receiptRef.current) return;
    const html = receiptRef.current.innerHTML;
    const w = window.open("", "_blank", "width=320,height=600");
    if (!w) return;
    w.document.write(`<html><head><title>Struk</title><style>
      @page{size:58mm auto;margin:4mm}body{font-family:'Courier New',monospace;font-size:12px;margin:0;padding:8px;color:#000}
    </style></head><body>${html}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}<\/script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Trx Hari Ini" value={String(todayTrx.length)} />
        <StatCard label="Omzet Hari Ini" value={formatRupiah(omzetHari)} />
        <StatCard label="Omzet Total" value={formatRupiah(omzetTotal)} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Riwayat ({transactions.length})</h2>
        {transactions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Hapus semua riwayat?")) setTransactions([]);
            }}
          >
            Hapus Semua
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {transactions.map((t) => (
          <button
            key={t.id}
            onClick={() => setViewing(t)}
            className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-left hover:border-primary"
          >
            <div>
              <div className="font-medium">#{t.id.slice(-6).toUpperCase()}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(t.date).toLocaleString("id-ID")} • {t.items.length} item • {t.method}
              </div>
            </div>
            <div className="font-bold text-primary">{formatRupiah(t.total)}</div>
          </button>
        ))}
        {transactions.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada transaksi
          </div>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Struk</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="max-h-[60vh] overflow-auto rounded-md border bg-white p-2">
              <Receipt ref={receiptRef} trx={viewing} settings={settings} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Tutup</Button>
            <Button onClick={printReceipt}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold sm:text-base">{value}</div>
    </div>
  );
}

/* ----------------------------- PENGATURAN ----------------------------- */

function PengaturanView() {
  const [settings, setSettings] = useSettings();
  const [form, setForm] = useState(settings);

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h2 className="text-lg font-semibold">Pengaturan Toko</h2>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <Label>Nama Toko</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Alamat</Label>
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>No. Telp</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Pajak (%)</Label>
            <Input type="number" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value) || 0 })} />
          </div>
        </div>
        <div>
          <Label>Nama Kasir</Label>
          <Input value={form.cashier} onChange={(e) => setForm({ ...form, cashier: e.target.value })} />
        </div>
        <div>
          <Label>Footer Struk</Label>
          <Textarea value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
        </div>
        <Button
          className="w-full"
          onClick={() => {
            setSettings(form);
            toast.success("Pengaturan disimpan");
          }}
        >
          Simpan
        </Button>
      </div>
    </div>
  );
}
