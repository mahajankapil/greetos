import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Video, Link as LinkIcon, ShoppingBag, Sparkles, X, Check } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { Reel } from '../types';

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [productLink, setProductLink] = useState('');
  const [productName, setProductName] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);

  const fetchReels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Reel[]>('/reels/admin');
      setReels(res.data);
    } catch (err) {
      setError(apiError(err, 'Failed to fetch reels'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const openAddModal = () => {
    setEditingReel(null);
    setTitle('');
    setVideoUrl('');
    setThumbnailUrl('');
    setCaption('');
    setHashtags('');
    setInstagramUrl('https://www.instagram.com/roviqueherbal/');
    setProductLink('/collections/all-products');
    setProductName('');
    setSortOrder(reels.length + 1);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (reel: Reel) => {
    setEditingReel(reel);
    setTitle(reel.title || '');
    setVideoUrl(reel.videoUrl || '');
    setThumbnailUrl(reel.thumbnailUrl || '');
    setCaption(reel.caption || '');
    setHashtags(Array.isArray(reel.hashtags) ? reel.hashtags.join(', ') : '');
    setInstagramUrl(reel.instagramUrl || '');
    setProductLink(reel.productLink || '');
    setProductName(reel.productName || '');
    setSortOrder(reel.sortOrder || 0);
    setIsActive(reel.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      alert('Video URL is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim() || null,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || null,
        caption: caption.trim() || null,
        hashtags: hashtags ? hashtags.split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean) : [],
        instagramUrl: instagramUrl.trim() || null,
        productLink: productLink.trim() || null,
        productName: productName.trim() || null,
        sortOrder: Number(sortOrder),
        isActive,
      };

      if (editingReel) {
        await api.put(`/reels/${editingReel.id}`, payload);
      } else {
        await api.post('/reels', payload);
      }

      setModalOpen(false);
      fetchReels();
    } catch (err) {
      alert(apiError(err, 'Failed to save reel'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (reel: Reel) => {
    try {
      await api.put(`/reels/${reel.id}`, { isActive: !reel.isActive });
      setReels((prev) =>
        prev.map((r) => (r.id === reel.id ? { ...r, isActive: !r.isActive } : r)),
      );
    } catch (err) {
      alert(apiError(err, 'Failed to update status'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reel?')) return;
    try {
      await api.delete(`/reels/${id}`);
      setReels((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(apiError(err, 'Failed to delete reel'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <Video className="text-[#d4af37]" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">Instagram Reels</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage video reels displayed on the storefront homepage slider & popup.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Add New Reel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      ) : reels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Video className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-gray-800">No reels added yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
            Click the "Add New Reel" button above to publish your first Instagram reel to the homepage.
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800"
          >
            <Plus size={16} /> Add Reel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg flex flex-col ${
                reel.isActive ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'
              }`}
            >
              {/* Card Video/Image Preview Container */}
              <div className="relative aspect-[9/16] bg-black group overflow-hidden">
                <video
                  src={reel.videoUrl}
                  poster={reel.thumbnailUrl || undefined}
                  muted
                  playsInline
                  loop
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20">
                    Order: #{reel.sortOrder}
                  </span>
                  <button
                    onClick={() => handleToggleActive(reel)}
                    title={reel.isActive ? 'Deactivate' : 'Activate'}
                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                      reel.isActive
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-gray-800/80 text-gray-300'
                    }`}
                  >
                    {reel.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 text-white">
                  <p className="font-bold text-sm line-clamp-1">
                    {reel.title || 'Untitled Reel'}
                  </p>
                  {reel.productName && (
                    <div className="flex items-center gap-1.5 text-xs text-[#d4af37] mt-1 font-medium">
                      <ShoppingBag size={12} />
                      <span className="truncate">{reel.productName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Bottom Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-gray-50/50">
                <p className="text-xs text-gray-600 line-clamp-2">
                  {reel.caption || 'No caption text provided.'}
                </p>

                {reel.hashtags && reel.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reel.hashtags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                        #{tag}
                      </span>
                    ))}
                    {reel.hashtags.length > 3 && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        +{reel.hashtags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      reel.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {reel.isActive ? 'Active' : 'Inactive'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(reel)}
                      className="p-2 text-gray-600 hover:text-black hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                      title="Edit Reel"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(reel.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Reel"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-black text-[#d4af37] rounded-xl">
                  <Video size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingReel ? 'Edit Instagram Reel' : 'Add New Instagram Reel'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Video MP4 URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Direct link to MP4 video asset (e.g. Sirv, Cloudinary, AWS S3)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Reel Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rovique Herbal Deep Cleansing Facewash"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Cover / Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/cover.jpg (Optional)"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Caption / Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter full reel caption, Marathi or English description..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Hashtags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="RoviqueHerbal, SkincareHacks, NaturalBeauty"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Instagram Post Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.instagram.com/roviqueherbal/"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Linked Product Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deep Cleansing Facewash"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Linked Product Link / Path
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /collections/all-products or /products/deep-cleansing-facewash"
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="flex items-center gap-3 pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <span className="text-sm font-semibold text-gray-800">
                    {isActive ? 'Published & Active' : 'Draft / Hidden'}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white text-sm font-semibold shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check size={16} /> Save Reel
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
