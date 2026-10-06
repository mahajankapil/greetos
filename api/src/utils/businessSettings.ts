import { prisma } from '../config/prisma';

/**
 * The business's legal/GST identity, entered by the admin in the panel.
 *
 * Deliberately NOTHING here has a hard-coded default: the client's brief is
 * explicit that GST/HSN details must come from them, not be guessed by code.
 * Invoicing stays locked until every required field is filled in.
 */

export interface BusinessSettings {
  legalName: string;
  address: string;
  gstin: string;
  fssai: string;
  /** The state the business supplies from — decides CGST/SGST vs IGST. */
  state: string;
  hsn: string;
  /** GST rate in percent, e.g. 18. */
  gstRate: number;
  /** Invoice number prefix, e.g. "SCH". */
  invoicePrefix: string;
}

export const BUSINESS_SETTING_KEYS = {
  legalName: 'biz_legal_name',
  address: 'biz_address',
  gstin: 'biz_gstin',
  fssai: 'biz_fssai',
  state: 'biz_state',
  hsn: 'biz_hsn',
  gstRate: 'biz_gst_rate',
  invoicePrefix: 'biz_invoice_prefix',
} as const;

/** Fields an invoice cannot legally be issued without. FSSAI is display-only. */
const REQUIRED: (keyof BusinessSettings)[] = ['legalName', 'address', 'gstin', 'state', 'hsn', 'gstRate'];

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(BUSINESS_SETTING_KEYS) } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    legalName: map[BUSINESS_SETTING_KEYS.legalName] ?? '',
    address: map[BUSINESS_SETTING_KEYS.address] ?? '',
    gstin: map[BUSINESS_SETTING_KEYS.gstin] ?? '',
    fssai: map[BUSINESS_SETTING_KEYS.fssai] ?? '',
    state: map[BUSINESS_SETTING_KEYS.state] ?? '',
    hsn: map[BUSINESS_SETTING_KEYS.hsn] ?? '',
    gstRate: Number.parseFloat(map[BUSINESS_SETTING_KEYS.gstRate] ?? '') || 0,
    invoicePrefix: map[BUSINESS_SETTING_KEYS.invoicePrefix] ?? 'INV',
  };
}

/** Which required fields are still empty — [] means invoicing is unlocked. */
export function missingBusinessFields(s: BusinessSettings): string[] {
  return REQUIRED.filter((k) => {
    const v = s[k];
    return typeof v === 'number' ? v <= 0 : !String(v).trim();
  });
}

export interface GstBreakdown {
  /** All paise. taxable + cgst + sgst + igst === total, exactly. */
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

/**
 * Back-calculates GST from a tax-INCLUSIVE rupee total (the storefront prices
 * "incl. all taxes"). Same state as the seller → CGST+SGST split; different
 * state → IGST. Rounding: taxable is rounded, tax takes the exact remainder,
 * and any odd paisa in a split lands on CGST — so the parts always re-add to
 * the charged total and the invoice can never disagree with the payment.
 */
export function computeGst(totalRupees: number, gstRate: number, sameState: boolean): GstBreakdown {
  const total = Math.round(totalRupees * 100);
  const taxableValue = Math.round(total / (1 + gstRate / 100));
  const tax = total - taxableValue;

  if (sameState) {
    const cgst = Math.ceil(tax / 2);
    return { taxableValue, cgst, sgst: tax - cgst, igst: 0, total };
  }
  return { taxableValue, cgst: 0, sgst: 0, igst: tax, total };
}
