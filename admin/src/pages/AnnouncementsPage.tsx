import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { api, apiError } from '../lib/api';

export default function AnnouncementsPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<string[]>('/announcements')
      .then((res) => setText(res.data.join('\n')))
      .catch((e) => setError(apiError(e, 'Failed to load announcements')))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const messages = text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.put('/admin/announcements', { messages });
      setSaved(true);
    } catch (e) {
      setError(apiError(e, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Storefront</p>
        <h2 className="text-2xl font-black text-[#111111]">Announcement bar</h2>
        <p className="mt-1 text-sm text-[#2a2a2a]">One message per line. These scroll across the top of the store.</p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : (
        <div className="rounded-[24px] border border-[#e5e5e5] bg-white p-5">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            rows={8}
            className="w-full rounded-2xl border border-[#e5e5e5] p-4 text-sm outline-none focus:border-[#d4af37]"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
            {saved && <span className="text-sm font-semibold text-[#2c6b30]">Saved!</span>}
          </div>
        </div>
      )}
    </div>
  );
}
