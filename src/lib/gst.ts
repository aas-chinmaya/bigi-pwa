import Decimal from "decimal.js";
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function calcInvoice(
  items: { quantity: number; unitPrice: number; gstRate: number }[],
  sellerState: string,
  buyerState: string
) {
  const intra = !!(sellerState && buyerState && sellerState === buyerState);
  let sub = new Decimal(0), cgst = new Decimal(0), sgst = new Decimal(0), igst = new Decimal(0);
  const lines = items.map((it) => {
    const taxable = new Decimal(it.quantity || 0).mul(it.unitPrice || 0);
    const tax = taxable.mul(new Decimal(it.gstRate || 0).div(100));
    const half = tax.div(2);
    const line = {
      taxable: taxable.toFixed(2),
      cgst: (intra ? half : new Decimal(0)).toFixed(2),
      sgst: (intra ? half : new Decimal(0)).toFixed(2),
      igst: (intra ? new Decimal(0) : tax).toFixed(2),
      lineTotal: taxable.plus(tax).toFixed(2),
    };
    sub = sub.plus(line.taxable);
    cgst = cgst.plus(line.cgst);
    sgst = sgst.plus(line.sgst);
    igst = igst.plus(line.igst);
    return line;
  });
  return {
    intra,
    lines,
    subtotal: sub.toFixed(2),
    cgst: cgst.toFixed(2),
    sgst: sgst.toFixed(2),
    igst: igst.toFixed(2),
    grandTotal: sub.plus(cgst).plus(sgst).plus(igst).toFixed(2),
  };
}
