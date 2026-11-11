export type InvoiceCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  state: string;
};

export type InvoiceItem = {
  name: string;
  unit_price: string;
  gst_rate: string;
  hsn_sac: string;
  unit: string;
};

type CustomerRow = Partial<InvoiceCustomer> & {
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_gstin?: string | null;
  customer_state?: string | null;
};

type ItemRow = Partial<InvoiceItem> & {
  name?: string | null;
  unit_price?: string | number | null;
  gst_rate?: string | number | null;
};

export const SAMPLE_ITEMS: InvoiceItem[] = [
  { name: "Business consulting", unit_price: "2500", gst_rate: "18", hsn_sac: "998311", unit: "HRS" },
  { name: "Website design and development", unit_price: "35000", gst_rate: "18", hsn_sac: "998314", unit: "NOS" },
  { name: "Monthly software support", unit_price: "8000", gst_rate: "18", hsn_sac: "998313", unit: "MON" },
  { name: "Product photography", unit_price: "12000", gst_rate: "18", hsn_sac: "998397", unit: "DAY" },
  { name: "Social media management", unit_price: "18000", gst_rate: "18", hsn_sac: "998361", unit: "MON" },
  { name: "Office chair", unit_price: "6500", gst_rate: "18", hsn_sac: "940130", unit: "NOS" },
  { name: "Branded packaging box", unit_price: "85", gst_rate: "18", hsn_sac: "481910", unit: "NOS" },
  { name: "Local delivery service", unit_price: "750", gst_rate: "18", hsn_sac: "996812", unit: "TRIP" },
];

export const SAMPLE_CUSTOMERS: InvoiceCustomer[] = [
  { name: "Acme Retail (sample)", email: "accounts@acme.example", phone: "00000 00001", address: "12 Market Road, Andheri East", state: "Maharashtra", gstin: "" },
  { name: "Greenleaf Organics (sample)", email: "billing@greenleaf.example", phone: "00000 00002", address: "48 Park Street", state: "West Bengal", gstin: "" },
  { name: "Bluebird Technologies (sample)", email: "finance@bluebird.example", phone: "00000 00003", address: "7 Residency Road", state: "Karnataka", gstin: "" },
  { name: "Sunrise Foods (sample)", email: "accounts@sunrisefoods.example", phone: "00000 00004", address: "21 FC Road", state: "Maharashtra", gstin: "" },
  { name: "Cedar & Co. (sample)", email: "office@cedarco.example", phone: "00000 00005", address: "33 Banjara Hills", state: "Telangana", gstin: "" },
  { name: "Northstar Studio (sample)", email: "hello@northstar.example", phone: "00000 00006", address: "5 Civil Lines", state: "Delhi", gstin: "" },
  { name: "Riverstone Traders (sample)", email: "billing@riverstone.example", phone: "00000 00007", address: "19 MG Road", state: "Tamil Nadu", gstin: "" },
  { name: "Meadow Works (sample)", email: "accounts@meadowworks.example", phone: "00000 00008", address: "62 Alkapuri", state: "Gujarat", gstin: "" },
];

export function getCustomerOptions(rows: CustomerRow[] = []): InvoiceCustomer[] {
  const saved = rows.map((row) => ({
    name: row.customer_name || row.name,
    email: row.customer_email || row.email || "",
    phone: row.customer_phone || row.phone || "",
    address: row.customer_address || row.address || "",
    gstin: row.customer_gstin || row.gstin || "",
    state: row.customer_state || row.state || "",
  })).filter((customer): customer is InvoiceCustomer => Boolean(customer.name));
  const options = [...SAMPLE_CUSTOMERS, ...saved];
  return Array.from(new Map(options.map((customer) => [customer.name.toLowerCase(), customer])).values());
}

export function getItemOptions(rows: ItemRow[] = []): InvoiceItem[] {
  const saved = rows.map((row) => ({
    name: row.name || "",
    unit_price: String(row.unit_price ?? "0"),
    gst_rate: String(row.gst_rate ?? "18"),
    hsn_sac: row.hsn_sac || "",
    unit: row.unit || "NOS",
  })).filter((item) => item.name);
  const options = [...SAMPLE_ITEMS, ...saved];
  return Array.from(new Map(options.map((item) => [item.name.toLowerCase(), item])).values());
}
