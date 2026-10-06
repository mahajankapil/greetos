import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, IndianRupee, TrendingUp, Receipt, Banknote, CreditCard,
  RotateCcw, Search, Download, FileText, Clock,
} from 'lucide-react';
import { api, apiError } from '../lib/api';

interface Stats {
  netRevenue: number;
  grossCollected: number;
  prepaidCollected: number;
  codCollected: number;
  codPending: number;
  codPendingOrders: number;
  refundedValue: number;
  refundedOrders: number;
  paidOrders: number;
  avgOrderValue: number;
  totalDiscount: number;
  reconcilableOrders: number;
}

interface MonthRow {
  month: string;
  label: string;
  orders: number;
  prepaid: number;
  cod: number;
  refunded: number;
  revenue: number;
}

interface Txn {
  id: string;
  orderNo: string;
  customer: string;
  total: number;
  discount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  paymentRef: string | null;
  invoiceNo: string | null;
  refunded: boolean;
}

interface Report {
  stats: Stats;
  monthly: MonthRow[];
  transactions: Txn[];
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const day = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

type Filter = 'all' | 'prepaid' | 'cod' | 'awaiting' | 'refunded';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'prepaid', label: 'Prepaid' },
  { key: 'cod', label: 'COD collected' },
  { key: 'awaiting', label: 'COD to collect' },
  { key: 'refunded', label: 'Refunded' },
];

export default function PaymentsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get<Report>('/admin/payments/report')
      .then((res) => active && setReport(res.data))
      .catch((e) => active && setError(apiError(e, 'Failed to load the payments report')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!report) return [];
    const byFilter = report.transactions.filter((t) => {
      if (filter === 'prepaid') return t.paymentStatus === 'paid' && t.paymentMethod !== 'cod';
      if (filter === 'cod') return t.paymentStatus === 'paid' && t.paymentMethod === 'cod';
      if (filter === 'awaiting') return t.paymentMethod === 'cod' && t.paymentStatus !== 'paid';
      if (filter === 'refunded') return t.refunded;
      return true;
    });
    const q = query.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter((t) =>
      [t.orderNo, t.customer, t.paymentRef ?? '', t.invoiceNo ?? ''].some((v) => v.toLowerCase().includes(q)),
    );
  }, [report, filter, query]);

  /**
   * The accountant's actual ask: the ledger as a spreadsheet. Built in the
   * browser from rows already loaded — no extra endpoint to keep in sync.
   */
  const exportCsv = () => {
    const head = ['Date', 'Order', 'Customer', 'Method', 'Payment status', 'Order status', 'Payment reference', 'Invoice', 'Discount', 'Amount'];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const body = rows.map((t) =>
      [
        new Date(t.createdAt).toLocaleDateString('en-IN'),
        t.orderNo,
        t.customer,
        t.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        t.paymentStatus === 'paid' ? 'Collected' : 'Not collected',
        t.refunded ? `${t.status} (refunded)` : t.status,
        t.paymentRef ?? '',
        t.invoiceNo ?? '',
        t.discount,
        t.total,
      ]
        .map(esc)
        .join(','),
    );
    const blob = new Blob([[head.map(esc).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rovique-payments-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxMonth = report ? Math.max(1, ...report.monthly.map((m) => m.prepaid + m.cod)) : 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Finance</p>
          <h2 className="text-2xl font-black text-[#111111]">Payments</h2>
        </div>
        {report && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-xs font-bold text-[#111111] hover:border-[#111111]"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : !report ? null : (
        <>
          {/* Money actually in hand vs money still owed — the distinction the
              old single "Total Revenue" card hid. */}
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<IndianRupee size={18} />}
              label="Net revenue"
              value={inr(report.stats.netRevenue)}
              hint={`${report.stats.paidOrders} paid order${report.stats.paidOrders === 1 ? '' : 's'}`}
              accent
            />
            <StatCard
              icon={<CreditCard size={18} />}
              label="Prepaid collected"
              value={inr(report.stats.prepaidCollected)}
              hint={`${report.stats.reconcilableOrders} with a gateway ref`}
            />
            <StatCard
              icon={<Banknote size={18} />}
              label="COD collected"
              value={inr(report.stats.codCollected)}
              hint="Cash received on delivery"
            />
            <StatCard
              icon={<Clock size={18} />}
              label="COD to collect"
              value={inr(report.stats.codPending)}
              hint={`${report.stats.codPendingOrders} order${report.stats.codPendingOrders === 1 ? '' : 's'} still out`}
              warn={report.stats.codPending > 0}
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-[20px] border border-[#e5e5e5] bg-white px-5 py-3 text-xs text-[#666666]">
            <Figure label="Gross collected" value={inr(report.stats.grossCollected)} />
            <Figure
              label="Refunded"
              value={`− ${inr(report.stats.refundedValue)}`}
              note={report.stats.refundedOrders ? `${report.stats.refundedOrders} accepted claim${report.stats.refundedOrders === 1 ? '' : 's'}` : undefined}
            />
            <Figure label="Discounts given" value={inr(report.stats.totalDiscount)} />
            <Figure label="Avg order value" value={inr(report.stats.avgOrderValue)} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
            {/* Monthly breakdown */}
            <section className="rounded-[24px] border border-[#e5e5e5] bg-white p-5">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#111111]">
                <TrendingUp size={15} /> Monthly
              </h3>
              <p className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-[#888888]">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#d4af37]" /> Prepaid</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#2c6b30]" /> COD</span>
              </p>
              {report.monthly.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#666666]">No money collected yet.</p>
              ) : (
                <div className="space-y-4">
                  {report.monthly.map((m) => (
                    <div key={m.month}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-[#111111]">{m.label}</span>
                        <span className="font-bold text-[#111111]">{inr(m.revenue)}</span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#f1f3ec]">
                        <div className="h-full bg-[#d4af37]" style={{ width: `${Math.round((m.prepaid / maxMonth) * 100)}%` }} />
                        <div className="h-full bg-[#2c6b30]" style={{ width: `${Math.round((m.cod / maxMonth) * 100)}%` }} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-[#666666]">
                        <span>{m.orders} order{m.orders === 1 ? '' : 's'}</span>
                        {m.refunded > 0 && <span className="text-[#b33131]">· {inr(m.refunded)} refunded</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Transaction ledger */}
            <section className="rounded-[24px] border border-[#e5e5e5] bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#111111]">
                <Receipt size={15} /> Transactions
              </h3>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                      filter === f.key ? 'bg-[#111111] text-white' : 'bg-[#f5f5f5] text-[#666666] hover:text-[#111111]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <label className="relative ml-auto min-w-[180px] flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Order, customer or payment ref"
                    className="w-full rounded-xl border border-[#e5e5e5] py-2 pl-8 pr-3 text-xs outline-none focus:border-[#d4af37]"
                  />
                </label>
              </div>

              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#666666]">Nothing matches that.</p>
              ) : (
                <div className="-mx-5 overflow-x-auto px-5">
                  <table className="w-full min-w-[640px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#e5e5e5] text-left text-[10px] uppercase tracking-wide text-[#888888]">
                        <th className="py-2 pr-3 font-bold">Date</th>
                        <th className="py-2 pr-3 font-bold">Order</th>
                        <th className="py-2 pr-3 font-bold">Method</th>
                        <th className="py-2 pr-3 font-bold">Payment reference</th>
                        <th className="py-2 pl-3 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((t) => {
                        const paid = t.paymentStatus === 'paid';
                        return (
                          <tr key={t.id} className="border-b border-[#f2f2f2] align-top">
                            <td className="whitespace-nowrap py-2.5 pr-3 text-[#666666]">{day(t.createdAt)}</td>
                            <td className="py-2.5 pr-3">
                              <p className="font-bold text-[#111111]">{t.orderNo}</p>
                              <p className="text-[#666666]">{t.customer}</p>
                              {t.refunded && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fff1f1] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b33131]">
                                  <RotateCcw size={9} /> Refunded
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                  t.paymentMethod === 'cod' ? 'bg-[#fdf8e9] text-[#7a6a2e]' : 'bg-[#eef4ff] text-[#2f4d8a]'
                                }`}
                              >
                                {t.paymentMethod === 'cod' ? <Banknote size={9} /> : <CreditCard size={9} />}
                                {t.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
                              </span>
                              <p className={`mt-1 font-semibold ${paid ? 'text-[#2c6b30]' : 'text-[#b8860b]'}`}>
                                {paid ? 'Collected' : 'Not collected'}
                              </p>
                            </td>
                            <td className="py-2.5 pr-3">
                              <p className="break-all font-mono text-[10px] text-[#444444]">{t.paymentRef ?? '—'}</p>
                              {t.invoiceNo ? (
                                <Link
                                  to={`/orders/${t.id}/invoice`}
                                  className="mt-1 inline-flex items-center gap-1 font-semibold text-[#666666] underline hover:text-[#111111]"
                                >
                                  <FileText size={10} /> {t.invoiceNo}
                                </Link>
                              ) : (
                                <p className="mt-1 text-[10px] text-[#aaaaaa]">No invoice</p>
                              )}
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <p className="font-bold tabular-nums text-[#111111]">{inr(t.total)}</p>
                              {t.discount > 0 && <p className="tabular-nums text-[#888888]">−{inr(t.discount)}</p>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="pt-3 text-[11px] text-[#888888]">
                    Showing {rows.length} of {report.transactions.length} orders. Cancelled orders are excluded.
                  </p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, hint, accent, warn,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-[20px] border bg-white p-4 ${accent ? 'border-[#d4af37]' : 'border-[#e5e5e5]'}`}>
      <div className={`flex items-center gap-2 ${warn ? 'text-[#b8860b]' : 'text-[#d4af37]'}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f5f5f5]">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-[#111111]">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[#888888]">{hint}</p>}
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#888888]">{label}</p>
      <p className="text-sm font-bold text-[#111111]">{value}</p>
      {note && <p className="text-[10px] text-[#888888]">{note}</p>}
    </div>
  );
}
