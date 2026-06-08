import { forwardRef } from "react";
import type { Transaction, StoreSettings } from "@/lib/pos-store";
import { formatRupiah } from "@/lib/pos-store";

interface Props {
  trx: Transaction;
  settings: StoreSettings;
}

export const Receipt = forwardRef<HTMLDivElement, Props>(({ trx, settings }, ref) => {
  return (
    <div ref={ref} className="receipt-print mx-auto w-[280px] bg-white p-3 font-mono text-[12px] leading-tight text-black">
      <div className="text-center">
        <div className="text-base font-bold uppercase">{settings.name}</div>
        <div>{settings.address}</div>
        <div>Telp: {settings.phone}</div>
      </div>
      <div className="my-2 border-t border-dashed border-black" />
      <div className="flex justify-between">
        <span>No: {trx.id.slice(-6).toUpperCase()}</span>
        <span>{new Date(trx.date).toLocaleString("id-ID")}</span>
      </div>
      <div>Kasir: {trx.cashier ?? "-"}</div>
      <div className="my-2 border-t border-dashed border-black" />
      {trx.items.map((it) => (
        <div key={it.productId} className="mb-1">
          <div>{it.name}</div>
          <div className="flex justify-between">
            <span>
              {it.qty} x {formatRupiah(it.price)}
            </span>
            <span>{formatRupiah(it.price * it.qty)}</span>
          </div>
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <Row label="Subtotal" value={formatRupiah(trx.subtotal)} />
      {trx.discount > 0 && <Row label="Diskon" value={"-" + formatRupiah(trx.discount)} />}
      {trx.tax > 0 && <Row label="Pajak" value={formatRupiah(trx.tax)} />}
      <Row label="TOTAL" value={formatRupiah(trx.total)} bold />
      <Row label={`Bayar (${trx.method})`} value={formatRupiah(trx.paid)} />
      <Row label="Kembalian" value={formatRupiah(trx.change)} />
      <div className="my-2 border-t border-dashed border-black" />
      <div className="text-center">{settings.footer}</div>
    </div>
  );
});
Receipt.displayName = "Receipt";

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex justify-between " + (bold ? "font-bold" : "")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
