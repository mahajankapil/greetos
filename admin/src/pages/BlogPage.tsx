import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  ExternalLink,
  ImageIcon,
  ListPlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { api, apiError, resolveImage } from '../lib/api';
import type { BlogPost } from '../types';

/**
 * Admin → Blog. Write, edit, schedule and publish the journal articles shown at
 * /blogs/news and in the home page "Journal" section.
 *
 * The article body is structured (introduction, numbered sections with optional
 * bullet points, a takeaway) so the storefront keeps its layout and table of
 * contents; paragraphs are typed with a blank line between them.
 */

const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000').replace(/\/$/, '');
const DEFAULT_AUTHOR = 'GREETOS';
const CATEGORY_SUGGESTIONS = ['Kitchen know-how', 'Seasonal eating', 'Farm stories', 'Everyday inspiration', 'Organic farming news'];
const FOCUS_OPTIONS = [
  { label: 'Centre', value: '' },
  { label: 'Top', value: '50% 20%' },
  { label: 'Upper middle', value: '50% 35%' },
  { label: 'Lower middle', value: '50% 65%' },
  { label: 'Bottom', value: '50% 80%' },
];

interface SectionForm { key: string; title: string; body: string; bullets: string }
interface SourceForm { key: string; title: string; url: string }
interface FormState {
  id?: string;
  title: string;
  slug: string;
  slugEdited: boolean;
  cardTitle: string;
  excerpt: string;
  category: string;
  author: string;
  coverImage: string;
  coverAlt: string;
  coverPosition: string;
  photoCredit: string;
  photoCreditUrl: string;
  introduction: string;
  sections: SectionForm[];
  takeaway: string;
  sources: SourceForm[];
  published: boolean;
  publishedAt: string; // yyyy-mm-dd (IST)
}

let keySeq = 0;
const nextKey = () => `k${Date.now()}-${(keySeq += 1)}`;
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const toParagraphs = (text: string) =>
  text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
const toLines = (text: string) => text.split('\n').map((l) => l.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
const istDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : '';
const prettyDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

type Status = 'Published' | 'Scheduled' | 'Draft';
const statusOf = (p: { published: boolean; publishedAt: string | null }): Status =>
  !p.published ? 'Draft' : p.publishedAt && new Date(p.publishedAt) > new Date() ? 'Scheduled' : 'Published';
const STATUS_STYLE: Record<Status, string> = {
  Published: 'bg-emerald-100 text-emerald-700',
  Scheduled: 'bg-amber-100 text-amber-700',
  Draft: 'bg-gray-200 text-gray-600',
};

const emptyForm = (): FormState => ({
  title: '', slug: '', slugEdited: false, cardTitle: '', excerpt: '', category: '', author: DEFAULT_AUTHOR,
  coverImage: '', coverAlt: '', coverPosition: '', photoCredit: '', photoCreditUrl: '',
  introduction: '', sections: [{ key: nextKey(), title: '', body: '', bullets: '' }], takeaway: '', sources: [],
  published: false, publishedAt: istDate(new Date().toISOString()),
});

const formFromPost = (p: BlogPost): FormState => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  slugEdited: true,
  cardTitle: p.cardTitle ?? '',
  excerpt: p.excerpt,
  category: p.category ?? '',
  author: p.author ?? '',
  coverImage: p.coverImage ?? '',
  coverAlt: p.coverAlt ?? '',
  coverPosition: p.coverPosition ?? '',
  photoCredit: p.photoCredit ?? '',
  photoCreditUrl: p.photoCreditUrl ?? '',
  introduction: p.introduction.join('\n\n'),
  sections: (p.sections ?? []).map((s) => ({ key: nextKey(), title: s.title, body: (s.paragraphs ?? []).join('\n\n'), bullets: (s.bullets ?? []).join('\n') })),
  takeaway: p.takeaway ?? '',
  sources: (p.sources ?? []).map((s) => ({ key: nextKey(), title: s.title, url: s.url })),
  published: p.published,
  publishedAt: istDate(p.publishedAt),
});

const toPayload = (f: FormState) => ({
  title: f.title,
  slug: f.slug || undefined,
  cardTitle: f.cardTitle || null,
  excerpt: f.excerpt,
  category: f.category || null,
  author: f.author || null,
  coverImage: f.coverImage || null,
  coverAlt: f.coverAlt || null,
  coverPosition: f.coverPosition || null,
  photoCredit: f.photoCredit || null,
  photoCreditUrl: f.photoCreditUrl || null,
  introduction: toParagraphs(f.introduction),
  sections: f.sections
    .filter((s) => s.title.trim() || s.body.trim() || s.bullets.trim())
    .map((s) => ({ title: s.title.trim(), paragraphs: toParagraphs(s.body), bullets: toLines(s.bullets) })),
  takeaway: f.takeaway.trim() || null,
  sources: f.sources.filter((s) => s.title.trim() || s.url.trim()).map((s) => ({ title: s.title.trim(), url: s.url.trim() })),
  published: f.published,
  // Midnight IST, so a post dated today is live straight away.
  publishedAt: f.publishedAt ? `${f.publishedAt}T00:00:00+05:30` : null,
});

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black';
const labelCls = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5';
const hintCls = 'text-[11px] text-gray-500 mt-1';

/**
 * Cover photos are pasted links, never uploads (no pictures are stored on our
 * server). Same rule as the API: an https link, or a storefront path such as
 * /blog/…, and never a video, SVG or PDF.
 */
const NOT_A_PICTURE = /\.(svg|svgz|mp4|mov|webm|m4v|avi|pdf|heic|heif|tif|tiff|psd|zip)(\?|#|$)/i;
const linkProblem = (url: string): string | null => {
  const v = url.trim();
  if (!v) return null;
  if (!/^https:\/\/\S+$/i.test(v) && !/^\/(?!\/)\S*$/.test(v)) return 'Paste the full link — it should start with https://';
  if (NOT_A_PICTURE.test(v)) return 'That link is not a photo. Use a JPG, PNG, WebP, AVIF or GIF picture.';
  return null;
};

type PictureCheck = { state: 'empty' | 'checking' | 'ok' | 'failed'; width?: number; height?: number };

/** Loads the pasted link in the browser so the editor sees whether it really is a picture. */
function usePictureCheck(url: string): PictureCheck {
  const [check, setCheck] = useState<PictureCheck>({ state: 'empty' });
  useEffect(() => {
    const v = url.trim();
    if (!v || linkProblem(v)) {
      setCheck({ state: 'empty' });
      return;
    }
    setCheck({ state: 'checking' });
    let done = false;
    const img = new Image();
    const finish = (next: PictureCheck) => {
      if (done) return;
      done = true;
      setCheck(next);
    };
    // Wait for typing to stop, and give up on links that never answer.
    const start = window.setTimeout(() => {
      img.onload = () => finish(img.naturalWidth ? { state: 'ok', width: img.naturalWidth, height: img.naturalHeight } : { state: 'failed' });
      img.onerror = () => finish({ state: 'failed' });
      img.src = resolveImage(v);
    }, 400);
    const giveUp = window.setTimeout(() => finish({ state: 'failed' }), 15000);
    return () => {
      done = true;
      window.clearTimeout(start);
      window.clearTimeout(giveUp);
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);
  return check;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cover = usePictureCheck(form?.coverImage ?? '');
  const coverProblem = form ? linkProblem(form.coverImage) : null;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<BlogPost[]>('/blogs/admin/all');
      setPosts(res.data);
    } catch (err) {
      setError(apiError(err, 'Could not load blog posts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set([...CATEGORY_SUGGESTIONS, ...posts.map((p) => p.category).filter(Boolean) as string[]])),
    [posts],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const setTitle = (title: string) =>
    setForm((f) => (f ? { ...f, title, slug: f.slugEdited ? f.slug : slugify(title) } : f));
  const updateSection = (key: string, patch: Partial<SectionForm>) =>
    setForm((f) => (f ? { ...f, sections: f.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) } : f));
  const moveSection = (index: number, dir: -1 | 1) =>
    setForm((f) => {
      if (!f) return f;
      const target = index + dir;
      if (target < 0 || target >= f.sections.length) return f;
      const sections = [...f.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...f, sections };
    });

  const openNew = () => {
    setFormError(null);
    setNotice(null);
    setForm(emptyForm());
    window.scrollTo({ top: 0 });
  };
  const openEdit = (post: BlogPost) => {
    setFormError(null);
    setNotice(null);
    setForm(formFromPost(post));
    window.scrollTo({ top: 0 });
  };
  const close = () => {
    setForm(null);
    setFormError(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const coverBlock = coverProblem
      ? `Cover image: ${coverProblem}`
      : cover.state === 'failed'
        ? 'The cover image link does not open a picture. Fix the link or remove it before saving.'
        : cover.state === 'checking'
          ? 'Still checking the cover image link — try saving again in a moment.'
          : null;
    if (coverBlock) {
      setFormError(coverBlock);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = toPayload(form);
      const res = form.id ? await api.put<BlogPost>(`/blogs/${form.id}`, payload) : await api.post<BlogPost>('/blogs', payload);
      setForm(formFromPost(res.data));
      setNotice(`Saved — ${statusOf(res.data) === 'Published' ? 'live on the site' : statusOf(res.data) === 'Scheduled' ? `scheduled for ${prettyDate(res.data.publishedAt)}` : 'kept as a draft'}.`);
      load();
    } catch (err) {
      setFormError(apiError(err, 'Could not save the post'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/blogs/${post.id}`);
      if (form?.id === post.id) close();
      load();
    } catch (err) {
      setError(apiError(err, 'Could not delete the post'));
    }
  };

  // ── Editor ────────────────────────────────────────────────────────
  if (form) {
    const liveUrl = form.slug ? `${STOREFRONT_URL}/blogs/news/${form.slug}` : '';
    const status = statusOf({ published: form.published, publishedAt: form.publishedAt ? `${form.publishedAt}T00:00:00+05:30` : null });
    return (
      <form onSubmit={save} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={close} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black">
            <ArrowLeft size={18} /> All posts
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>{status}</span>
            {form.id && status !== 'Draft' && liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-black">
                View on site <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900">{form.id ? 'Edit blog post' : 'New blog post'}</h1>

        {formError && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">{formError}</div>}
        {notice && <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-100">{notice}</div>}

        {/* Basics */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Basics</h2>
          <div>
            <label htmlFor="blog-title" className={labelCls}>Title <span className="text-red-500">*</span></label>
            <input id="blog-title" className={inputCls} required minLength={3} maxLength={200} value={form.title} onChange={(e) => setTitle(e.target.value)} placeholder="A practical guide to storing fresh leafy greens" />
          </div>
          <div>
            <label htmlFor="blog-summary" className={labelCls}>Summary <span className="text-red-500">*</span></label>
            <textarea id="blog-summary" className={inputCls} required minLength={10} maxLength={400} rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="One or two sentences shown on the blog cards and under the title." />
            <p className={hintCls}>{form.excerpt.length}/400 · shown on cards, under the title, and in Google results.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="blog-category" className={labelCls}>Category</label>
              <input id="blog-category" className={inputCls} list="blog-categories" maxLength={60} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Kitchen know-how" />
              <datalist id="blog-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              <p className={hintCls}>Posts are filtered by category on the blog page.</p>
            </div>
            <div>
              <label htmlFor="blog-author" className={labelCls}>Author</label>
              <input id="blog-author" className={inputCls} maxLength={100} value={form.author} onChange={(e) => set('author', e.target.value)} placeholder={DEFAULT_AUTHOR} />
            </div>
          </div>
          <div>
            <label htmlFor="blog-card-title" className={labelCls}>Card headline (optional)</label>
            <input id="blog-card-title" className={inputCls} maxLength={200} value={form.cardTitle} onChange={(e) => set('cardTitle', e.target.value)} placeholder="A shorter headline for the blog cards — leave blank to use the title" />
          </div>
        </section>

        {/* Cover image */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Cover image</h2>
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
            <div className="aspect-[4/3] rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
              {cover.state === 'ok' ? (
                <img src={resolveImage(form.coverImage)} alt={form.coverAlt} className="w-full h-full object-cover" style={{ objectPosition: form.coverPosition || undefined }} />
              ) : cover.state === 'checking' ? (
                <div className="text-center text-gray-400 text-xs"><Loader2 className="mx-auto mb-1 animate-spin" size={28} />Checking the link…</div>
              ) : cover.state === 'failed' ? (
                <div className="text-center text-red-500 text-xs px-4"><AlertTriangle className="mx-auto mb-1" size={28} />No picture at this link</div>
              ) : (
                <div className="text-center text-gray-400 text-xs"><ImageIcon className="mx-auto mb-1" size={32} />No image yet</div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="blog-cover-url" className={labelCls}>Cover image link</label>
                <div className="flex gap-2">
                  <input
                    id="blog-cover-url"
                    className={inputCls}
                    inputMode="url"
                    maxLength={1000}
                    value={form.coverImage}
                    onChange={(e) => set('coverImage', e.target.value)}
                    placeholder="https://cdn.example.com/photos/spinach.jpg"
                    aria-describedby="blog-cover-status blog-cover-hint"
                    aria-invalid={Boolean(coverProblem) || cover.state === 'failed'}
                  />
                  {form.coverImage && (
                    <button type="button" onClick={() => set('coverImage', '')} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                      <X size={15} /> Remove
                    </button>
                  )}
                </div>
                <p id="blog-cover-status" className="text-xs mt-1.5 min-h-[1rem]" aria-live="polite">
                  {coverProblem ? (
                    <span className="text-red-600">{coverProblem}</span>
                  ) : cover.state === 'checking' ? (
                    <span className="text-gray-500">Checking the link…</span>
                  ) : cover.state === 'failed' ? (
                    <span className="text-red-600">Couldn&apos;t load a picture from this link. Open it in a new tab to check it shows the photo on its own and is public.</span>
                  ) : cover.state === 'ok' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={13} /> Picture found · {cover.width} × {cover.height}
                      {cover.width! < 1000 && <span className="text-amber-700"> — small; a wider photo (about 1600 px) looks sharper</span>}
                    </span>
                  ) : null}
                </p>
                <p id="blog-cover-hint" className={hintCls}>
                  Photos aren&apos;t uploaded here — paste the link to the photo on your image host or CDN. JPG, PNG, WebP, AVIF or GIF; a wide landscape photo (about 1600 × 900) works best.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="blog-cover-alt" className={labelCls}>Image description</label>
                  <input id="blog-cover-alt" className={inputCls} maxLength={300} value={form.coverAlt} onChange={(e) => set('coverAlt', e.target.value)} placeholder="Fresh spinach in a white colander" />
                  <p className={hintCls}>Read aloud by screen readers; also helps Google.</p>
                </div>
                <div>
                  <label htmlFor="blog-cover-focus" className={labelCls}>Image focus</label>
                  <select id="blog-cover-focus" className={inputCls} value={form.coverPosition} onChange={(e) => set('coverPosition', e.target.value)}>
                    {FOCUS_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                    {!FOCUS_OPTIONS.some((o) => o.value === form.coverPosition) && <option value={form.coverPosition}>Custom ({form.coverPosition})</option>}
                  </select>
                  <p className={hintCls}>Which part of the photo stays visible when it is cropped.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="blog-photo-credit" className={labelCls}>Photo credit</label>
                  <input id="blog-photo-credit" className={inputCls} maxLength={150} value={form.photoCredit} onChange={(e) => set('photoCredit', e.target.value)} placeholder="Photographer / Pexels" />
                </div>
                <div>
                  <label htmlFor="blog-photo-credit-url" className={labelCls}>Photo credit link</label>
                  <input id="blog-photo-credit-url" className={inputCls} type="url" maxLength={500} value={form.photoCreditUrl} onChange={(e) => set('photoCreditUrl', e.target.value)} placeholder="https://www.pexels.com/photo/…" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Article */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Article</h2>
            <p className="text-xs text-gray-500 mt-0.5">Leave a blank line between paragraphs. Sections appear numbered, with a contents list beside the article.</p>
          </div>
          <div>
            <label htmlFor="blog-introduction" className={labelCls}>Introduction</label>
            <textarea id="blog-introduction" className={inputCls} rows={5} value={form.introduction} onChange={(e) => set('introduction', e.target.value)} placeholder="The opening paragraphs, before the first section." />
          </div>

          <div className="space-y-4">
            {form.sections.map((section, index) => (
              <div key={section.key} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Section {String(index + 1).padStart(2, '0')}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" title="Move up" disabled={index === 0} onClick={() => moveSection(index, -1)} className="p-1.5 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30"><ChevronUp size={16} /></button>
                    <button type="button" title="Move down" disabled={index === form.sections.length - 1} onClick={() => moveSection(index, 1)} className="p-1.5 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30"><ChevronDown size={16} /></button>
                    <button type="button" title="Remove section" onClick={() => set('sections', form.sections.filter((s) => s.key !== section.key))} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                </div>
                <input className={inputCls} maxLength={200} value={section.title} onChange={(e) => updateSection(section.key, { title: e.target.value })} aria-label={`Section ${index + 1} heading`} placeholder="Section heading" />
                <textarea className={inputCls} rows={5} value={section.body} onChange={(e) => updateSection(section.key, { body: e.target.value })} aria-label={`Section ${index + 1} paragraphs`} placeholder="Section paragraphs — blank line between paragraphs." />
                <div>
                  <textarea className={inputCls} rows={3} value={section.bullets} onChange={(e) => updateSection(section.key, { bullets: e.target.value })} aria-label={`Section ${index + 1} bullet points`} placeholder="Optional bullet points — one per line." />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => set('sections', [...form.sections, { key: nextKey(), title: '', body: '', bullets: '' }])} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <ListPlus size={16} /> Add section
            </button>
          </div>

          <div>
            <label htmlFor="blog-takeaway" className={labelCls}>Takeaway</label>
            <textarea id="blog-takeaway" className={inputCls} rows={3} maxLength={1500} value={form.takeaway} onChange={(e) => set('takeaway', e.target.value)} placeholder="One short paragraph highlighted at the end of the article." />
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Further reading</label>
            {form.sources.map((source) => (
              <div key={source.key} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <input className={inputCls} maxLength={200} value={source.title} onChange={(e) => set('sources', form.sources.map((s) => (s.key === source.key ? { ...s, title: e.target.value } : s)))} aria-label="Further-reading link title" placeholder="Link title" />
                <input className={inputCls} type="url" aria-label="Further-reading link address" maxLength={500} value={source.url} onChange={(e) => set('sources', form.sources.map((s) => (s.key === source.key ? { ...s, url: e.target.value } : s)))} placeholder="https://…" />
                <button type="button" title="Remove link" onClick={() => set('sources', form.sources.filter((s) => s.key !== source.key))} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 justify-self-start"><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => set('sources', [...form.sources, { key: nextKey(), title: '', url: '' }])} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-black">
              <Plus size={15} /> Add link
            </button>
          </div>
        </section>

        {/* Publishing */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Publishing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className={labelCls}>Status</p>
              <div className="flex gap-2">
                {[false, true].map((value) => (
                  <button key={String(value)} type="button" onClick={() => set('published', value)} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border ${form.published === value ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                    {value ? 'Published' : 'Draft'}
                  </button>
                ))}
              </div>
              <p className={hintCls}>Drafts are only visible here.</p>
            </div>
            <div>
              <label htmlFor="blog-publish-date" className={labelCls}><CalendarClock size={12} className="inline -mt-0.5 mr-1" />Publish date</label>
              <input id="blog-publish-date" className={inputCls} type="date" value={form.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} />
              <p className={hintCls}>A future date schedules the post — it appears on the site that day.</p>
            </div>
          </div>
          <div>
            <label htmlFor="blog-slug" className={labelCls}>Web address</label>
            <div className="flex items-stretch rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-black">
              <span className="hidden sm:flex items-center px-3 bg-gray-50 text-xs text-gray-500 border-r border-gray-200 whitespace-nowrap">/blogs/news/</span>
              <input id="blog-slug" className="flex-1 px-3 py-2.5 text-sm focus:outline-none min-w-0" maxLength={100} value={form.slug} onChange={(e) => setForm((f) => (f ? { ...f, slug: slugify(e.target.value), slugEdited: true } : f))} placeholder="filled in from the title" />
            </div>
            <p className={hintCls}>Changing it on a live post breaks links that were already shared.</p>
          </div>
        </section>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-5 lg:-mx-8 bg-white/95 backdrop-blur border-t border-gray-200 px-4 sm:px-8 py-3 flex items-center justify-end gap-3">
          <button type="button" onClick={close} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-60">
            <Save size={16} /> {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create post'}
          </button>
        </div>
      </form>
    );
  }

  // ── List ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><BookOpen size={24} /> Blog</h1>
          <p className="text-sm text-gray-500 mt-1">Articles for the Blogs &amp; Organic Farming News page and the home page journal section.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800">
          <Plus size={18} /> New post
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-gray-800">No blog posts yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">Write your first article — it can stay a draft until you are ready to publish it.</p>
          <button onClick={openNew} className="mt-5 inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800"><Plus size={16} /> New post</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {posts.map((post) => {
            const status = statusOf(post);
            return (
              <div key={post.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/70">
                <div className="w-24 h-16 sm:w-28 sm:h-20 shrink-0 rounded-xl bg-gray-100 overflow-hidden">
                  {post.coverImage && <img src={resolveImage(post.coverImage)} alt="" className="w-full h-full object-cover" style={{ objectPosition: post.coverPosition || undefined }} />}
                </div>
                <button type="button" onClick={() => openEdit(post)} className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-gray-900 truncate">{post.title}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {post.category || 'No category'} · {prettyDate(post.publishedAt)} · {post.readingMinutes} min read
                  </p>
                </button>
                <span className={`hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>{status}</span>
                <div className="flex items-center gap-1">
                  {status === 'Published' && (
                    <a href={`${STOREFRONT_URL}/blogs/news/${post.slug}`} target="_blank" rel="noreferrer" title="View on site" className="p-2 text-gray-500 hover:text-black hover:bg-white rounded-lg"><ExternalLink size={16} /></a>
                  )}
                  <button onClick={() => openEdit(post)} title="Edit" className="p-2 text-gray-600 hover:text-black hover:bg-white rounded-lg"><Edit2 size={16} /></button>
                  <button onClick={() => remove(post)} title="Delete" className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
