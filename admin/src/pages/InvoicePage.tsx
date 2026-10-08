import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Printer, ArrowLeft, Phone } from 'lucide-react';
import { api, apiError } from '../lib/api';

const LOGO_ASSET = 'https://mkpillllll.sirv.com/stuff/logoo.png';

interface InvoiceItem {
  id: string;
  productTitle: string;
  optionName: string;
  price: number;
  quantity: number;
}

interface InvoiceData {
  invoice: {
    invoiceNo: string;
    sellerName: string;
    sellerAddress: string;
    sellerGstin: string;
    sellerFssai: string | null;
    sellerState: string;
    customerName: string;
    billingAddress: string;
    placeOfSupply: string;
    hsn: string;
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
    discount: number;
    paymentRef: string;
    createdAt: string;
  };
  order: {
    orderNo: string;
    createdAt: string;
    paymentMethod: string;
    customer?: string;
    phone?: string;
    total?: number;
    shippingCharge?: number;
    discount?: number;
    items: InvoiceItem[];
  };
}

export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    api
      .get<InvoiceData>(`/admin/orders/${orderId}/invoice`)
      .then((res) => setData(res.data))
      .catch((e) => setError(apiError(e, 'Could not load the invoice')));
  }, [orderId]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>
        <Link to="/orders" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-black">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-[#2a2a2a]">
        <Loader2 className="animate-spin" size={20} /> Loading invoice…
      </div>
    );
  }

  const { invoice: inv, order } = data;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const calculatedSubtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryCharge = order.shippingCharge || 0;
  const grandTotal = order.total || Math.round(inv.total / 100) || (calculatedSubtotal + deliveryCharge);

  return (
    <div className="mx-auto max-w-4xl py-6 px-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          body { background: white !important; }
          .invoice-paper { box-shadow: none !important; border: none !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Top Action Bar */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-black">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition-colors shadow-md"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* Main Invoice Sheet matching Reference Image 3 & 4 */}
      <div className="invoice-paper bg-white p-8 sm:p-12 shadow-xl border border-gray-100 rounded-2xl text-gray-900 font-sans max-w-3xl mx-auto">
        
        {/* Header Section */}
        <div className="flex items-start justify-between pb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-black uppercase">
              OLD SPICE<br />AGRO FRESH LLP
            </h1>
          </div>

          {/* Logo Card */}
          <div className="w-48 h-24 bg-[#f3efe6] rounded-lg p-2 flex items-center justify-center border border-[#e2dacb] shadow-xs">
            <img src={LOGO_ASSET} alt="Old Spice Agro Fresh LLP" className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Customer Info & Date / Invoice No */}
        <div className="grid grid-cols-2 gap-8 py-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-gray-900 mb-1">BILLED TO:</p>
            <p className="font-bold text-base text-gray-900">{inv.customerName || order.customer}</p>
            {order.phone && <p className="text-sm font-semibold text-gray-700 mt-0.5">{order.phone}</p>}
            {inv.billingAddress && <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-xs">{inv.billingAddress}</p>}
          </div>

          <div className="text-right space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-900">DATE :</p>
              <p className="font-bold text-sm text-gray-800">{formatDate(inv.createdAt || order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-900">INVOICE NO.</p>
              <p className="font-bold text-base text-gray-900 tracking-wide">{inv.invoiceNo || order.orderNo}</p>
            </div>
          </div>
        </div>

        {/* Description Table matching reference */}
        <div className="mt-4 overflow-hidden rounded-lg">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#111111] text-white font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-[45%]">DESCRIPTION</th>
                <th className="py-3 px-4 text-center">QUANTITY</th>
                <th className="py-3 px-4 text-right">PRICE</th>
                <th className="py-3 px-4 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, idx) => (
                <tr key={it.id} className={idx % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'}>
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {it.productTitle}
                    {it.optionName ? <span className="block text-xs font-normal text-gray-500">{it.optionName}</span> : null}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-gray-800">{it.quantity}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">₹{it.price}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{it.price * it.quantity}₹</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="mt-6 flex flex-col items-end space-y-1.5 text-xs sm:text-sm">
          <div className="w-64 flex justify-between px-2 text-gray-700">
            <span>Subtotal:</span>
            <span className="font-semibold">{calculatedSubtotal}₹</span>
          </div>

          <div className="w-64 flex justify-between px-2 text-gray-700">
            <span>Delivery Charges</span>
            <span className="font-semibold">{deliveryCharge}.0₹</span>
          </div>

          {/* Grand Total Bar */}
          <div className="w-64 bg-[#111111] text-white py-2.5 px-4 rounded flex justify-between items-center font-black text-sm sm:text-base mt-2">
            <span>Grand Total:</span>
            <span>{grandTotal}₹</span>
          </div>
        </div>

        {/* Footer Notes & Contact Info matching reference */}
        <div className="mt-12 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-700">
          {/* Notes Left Column */}
          <div className="space-y-3">
            <div>
              <p className="font-black text-xs uppercase tracking-wider text-black mb-1">NOTE:</p>
              <ol className="space-y-1 text-[11px] leading-snug text-gray-600 font-medium">
                <li>1] Any unforeseen circumstances arising thereafter shall remain outside the scope of the company's liability</li>
                <li>2] This is a computer generated invoice</li>
                <li>3] Goods once sold will not be taken back or replaced</li>
                <li>4] Received above detailed Product in good condition</li>
              </ol>
            </div>

            <div className="pt-2">
              <p className="font-black text-xs uppercase tracking-wider text-black mb-0.5">PAYMENT INFORMATION</p>
              <p className="text-xs font-semibold text-gray-800">
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}
              </p>
            </div>
          </div>

          {/* Enquiry Right Column */}
          <div className="flex flex-col justify-end text-right md:text-right space-y-1">
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mt-6 border-b border-gray-300 w-full" />
      </div>
    </div>
  );
}
