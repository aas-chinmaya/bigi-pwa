"use client";
import { forwardRef } from "react";
import { fmtDate, inr } from "@/lib/utils";

const brandColor = "#12805c";
const brandTint = "#edf7f2";
const borderColor = "#d9e8e1";
const mutedColor = "#52645c";

export type SheetData = {
  number?: string | null;
  status?: string;
  invoice_date: string;
  due_date?: string | null;
  notes?: string | null;
  business: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    state?: string;
  };
  customer: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    state?: string;
  };
  items: {
    name: string;
    hsn_sac?: string;
    unit?: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    taxable: string | number;
    cgst: string | number;
    sgst: string | number;
    igst: string | number;
    line_total: string | number;
  }[];
  totals: {
    subtotal: string | number;
    cgst: string | number;
    sgst: string | number;
    igst: string | number;
    grand: string | number;
  };
  intra: boolean;
};

export const InvoiceSheet = forwardRef<HTMLDivElement, { data: SheetData }>(
  function InvoiceSheet({ data }, ref) {
    return (
      <div
        ref={ref}
        id="invoice-sheet"
        style={{
          width: "210mm",
          minHeight: "297mm",
          background: "#fff",
          color: "#111827",
          padding: "14mm",
          fontSize: 12,
          lineHeight: 1.45,
          boxSizing: "border-box",
        }}
        className="mx-auto shadow-md print:shadow-none"
      >
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${brandColor}`, paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: brandColor }}>{data.business.name}</div>
            <div style={{ whiteSpace: "pre-line", color: mutedColor }}>{data.business.address}</div>
            <div style={{ color: mutedColor }}>{[data.business.phone, data.business.email].filter(Boolean).join(" · ")}</div>
            {data.business.gstin && <div><b>GSTIN:</b> {data.business.gstin}</div>}
            {data.business.state && <div>State: {data.business.state}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: brandColor }}>TAX INVOICE</div>
            <div><b>{data.number || "DRAFT"}</b></div>
            <div>Date: {fmtDate(data.invoice_date)}</div>
            {data.due_date && <div>Due: {fmtDate(data.due_date)}</div>}
          </div>
        </div>

        <div style={{ margin: "12px 0", padding: 10, background: brandTint, borderRadius: 6, border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: 10, color: brandColor, fontWeight: 700, marginBottom: 4 }}>BILL TO</div>
          <div style={{ fontWeight: 600 }}>{data.customer.name}</div>
          <div style={{ whiteSpace: "pre-line", color: "#4B5563" }}>{data.customer.address}</div>
          {data.customer.gstin && <div>GSTIN: {data.customer.gstin}</div>}
          {data.customer.state && <div>State: {data.customer.state}</div>}
          <div style={{ color: mutedColor }}>{[data.customer.phone, data.customer.email].filter(Boolean).join(" · ")}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr style={{ background: brandColor, color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "8px 6px" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 6px" }}>Item</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>GST%</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                <td style={{ padding: "8px 6px" }}>
                  <div style={{ fontWeight: 500 }}>{it.name}</div>
                  {it.hsn_sac && <div style={{ fontSize: 10, color: mutedColor }}>HSN {it.hsn_sac}</div>}
                </td>
                <td style={{ textAlign: "right", padding: "8px 6px" }}>{it.quantity} {it.unit || ""}</td>
                <td style={{ textAlign: "right", padding: "8px 6px" }}>{inr(it.unit_price)}</td>
                <td style={{ textAlign: "right", padding: "8px 6px" }}>{it.gst_rate}%</td>
                <td style={{ textAlign: "right", padding: "8px 6px" }}>{inr(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 220 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>Subtotal</span><span>{inr(data.totals.subtotal)}</span>
            </div>
            {data.intra ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>CGST</span><span>{inr(data.totals.cgst)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>SGST</span><span>{inr(data.totals.sgst)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span>IGST</span><span>{inr(data.totals.igst)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `2px solid ${brandColor}`, color: brandColor, fontWeight: 700, fontSize: 14 }}>
              <span>Total</span><span>{inr(data.totals.grand)}</span>
            </div>
          </div>
        </div>

        {data.notes && (
          <div style={{ marginTop: 20, padding: 10, background: brandTint, borderRadius: 6, border: `1px solid ${borderColor}` }}>
            <b style={{ color: brandColor }}>Notes</b>
            <div style={{ whiteSpace: "pre-line", marginTop: 4 }}>{data.notes}</div>
          </div>
        )}
      </div>
    );
  }
);
