import { useEffect, useState } from 'react';
import { Loader2, Send, Trash2, Tag, Info } from 'lucide-react';
import { api, apiError } from '../lib/api';

interface Notification {
  id: string;
  type: 'offer' | 'info';
  title: string;
  message: string;
  createdAt: string;
}

const TYPES = [
  { value: 'offer', label: 'Sale / Offer', icon: Tag },
  { value: 'info', label: 'Information', icon: Info },
] as const;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [type, setType] = useState<'offer' | 'info'>('offer');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>('/notifications');
      setNotifications(res.data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await api.post('/admin/notifications', { type, title: title.trim(), message: message.trim() });
      setTitle('');
      setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 2000);
      await load();
    } catch (e) {
      setError(apiError(e, 'Could not send the notification'));
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await api.delete(`/admin/notifications/${id}`);
      await load();
    } catch (e) {
      setError(apiError(e, 'Could not delete'));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Broadcast</p>
        <h2 className="text-2xl font-black text-[#111111]">Notifications</h2>
        <p className="mt-1 text-sm text-[#2a2a2a]">Send a notification to every customer's in-app bell.</p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {/* Compose */}
      <div className="rounded-[24px] border border-[#e5e5e5] bg-white p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Type</span>
        <div className="mt-2 grid max-w-md grid-cols-2 gap-2">
          {TYPES.map(({ value, label, icon: Icon }) => {
            const active = type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`flex items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-bold transition-colors ${
                  active ? 'border-[#d4af37] bg-[#f5f5f5] text-[#111111]' : 'border-[#e5e5e5] bg-white text-[#2a2a2a] hover:bg-gray-50'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={type === 'offer' ? 'e.g. Flat 15% OFF this weekend' : 'e.g. Delivery schedule update'}
            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Write the notification body…"
            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
          />
        </label>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={send}
            disabled={sending || !title.trim() || !message.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send notification
          </button>
          {sent && <span className="text-sm font-semibold text-[#2c6b30]">Sent!</span>}
        </div>
      </div>

      {/* Sent list */}
      <h3 className="mb-3 mt-8 text-sm font-black text-[#111111]">Sent notifications</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : notifications.length === 0 ? (
        <p className="rounded-[24px] border border-[#e5e5e5] bg-white px-6 py-8 text-center text-[#666666]">No notifications sent yet.</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-[20px] border border-[#e5e5e5] bg-white p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  n.type === 'offer' ? 'bg-[#fff7e6] text-[#b19542]' : 'bg-[#f5f5f5] text-[#d4af37]'
                }`}
              >
                {n.type === 'offer' ? <Tag size={18} /> : <Info size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      n.type === 'offer' ? 'bg-[#fff7e6] text-[#b19542]' : 'bg-[#f5f5f5] text-[#d4af37]'
                    }`}
                  >
                    {n.type === 'offer' ? 'Offer' : 'Info'}
                  </span>
                  <span className="text-xs text-[#666666]">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 font-bold text-[#111111]">{n.title}</p>
                <p className="text-sm text-[#2a2a2a]">{n.message}</p>
              </div>
              <button
                onClick={() => remove(n.id)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fff1f1] text-[#b33131] hover:bg-[#fee3e3]"
                aria-label="Delete notification"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
