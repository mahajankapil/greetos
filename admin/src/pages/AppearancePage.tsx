import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api';

interface Banner {
  id: string;
  desktop: string;
  mobile: string;
}

interface GalleryItem {
  id: string;
  title: string;
  image: string;
}

interface WelcomePopup {
  enabled: boolean;
  title: string;
  subtitle: string;
  buttonText: string;
  couponCode: string;
  image: string;
  delaySeconds: number;
}

interface FeatureBanner {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  images: string[];
}

interface CategoryItem {
  id: string;
  title: string;
  href: string;
  image: string;
}

export interface DirectorCard {
  id: string;
  name: string;
  role: string;
  image: string;
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  pinterest?: string;
}

export interface OurStoryState {
  enabled: boolean;
  title: string;
  subtitle: string;
  directors: DirectorCard[];
}

export default function AppearancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [homeCategories, setHomeCategories] = useState<CategoryItem[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [welcome, setWelcome] = useState<WelcomePopup>({
    enabled: false,
    title: '',
    subtitle: '',
    buttonText: '',
    couponCode: '',
    image: '',
    delaySeconds: 3,
  });
  const [featureBanner, setFeatureBanner] = useState<FeatureBanner>({
    title: '', subtitle: '', buttonText: '', buttonLink: '', images: []
  });
  const [ourStory, setOurStory] = useState<OurStoryState>({
    enabled: true,
    title: 'Board Of Directors',
    subtitle: 'Leadership & Vision Behind Old Spice Agro Fresh LLP',
    directors: [
      {
        id: 'dir-1',
        name: 'Sunny Ashok Dumbre',
        role: 'CEO',
        image: '/directors/sunny-ashok-dumbre.png',
        instagram: '#',
        whatsapp: '#',
      },
      {
        id: 'dir-2',
        name: 'Akash Dilip Dumbre',
        role: 'DIRECTOR',
        image: '/directors/akash-dilip-dumbre.png',
        facebook: '#',
        linkedin: '#',
        twitter: '#',
        pinterest: '#',
      },
      {
        id: 'dir-3',
        name: 'Anita Ashok Dumbre',
        role: 'DIRECTOR',
        image: '/directors/anita-ashok-dumbre.png',
        facebook: '#',
        linkedin: '#',
        twitter: '#',
        pinterest: '#',
      },
    ],
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        const settings = res.data || {};
        
        if (settings.announcement_text) {
          setAnnouncementText(settings.announcement_text);
        }

        if (settings.home_categories) {
          try {
            setHomeCategories(JSON.parse(settings.home_categories));
          } catch (e) {
            console.error("Failed to parse home_categories", e);
          }
        }

        if (settings.hero_banners) {
          try {
            setBanners(JSON.parse(settings.hero_banners));
          } catch (e) {
            console.error("Failed to parse hero_banners", e);
          }
        } else {
          // Fallback if they were using the old keys
          if (settings.hero_banner_desktop || settings.hero_banner_mobile) {
            setBanners([{
              id: Date.now().toString(),
              desktop: settings.hero_banner_desktop || '',
              mobile: settings.hero_banner_mobile || ''
            }]);
          }
        }

        if (settings.homepage_gallery) {
          try {
            setGallery(JSON.parse(settings.homepage_gallery));
          } catch (e) {
            console.error("Failed to parse homepage_gallery", e);
          }
        }

        if (settings.welcome_popup) {
          try {
            setWelcome((w) => ({ ...w, ...JSON.parse(settings.welcome_popup) }));
          } catch {
            /* malformed setting — keep the defaults */
          }
        }

        if (settings.homepage_feature_banner) {
          try {
            setFeatureBanner(JSON.parse(settings.homepage_feature_banner));
          } catch (e) {
            console.error("Failed to parse homepage_feature_banner", e);
          }
        }

        if (settings.our_story_section) {
          try {
            setOurStory((prev) => ({ ...prev, ...JSON.parse(settings.our_story_section) }));
          } catch (e) {
            console.error("Failed to parse our_story_section", e);
          }
        }

      } catch (e) {
        setError(apiError(e, 'Failed to load settings'));
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/admin/settings', {
        hero_banners: JSON.stringify(banners),
        home_categories: JSON.stringify(homeCategories),
        announcement_text: announcementText,
        homepage_gallery: JSON.stringify(gallery),
        homepage_feature_banner: JSON.stringify(featureBanner),
        our_story_section: JSON.stringify(ourStory),
        welcome_popup: JSON.stringify({
          ...welcome,
          couponCode: welcome.couponCode.trim().toUpperCase(),
          delaySeconds: Number(welcome.delaySeconds) || 0,
        }),
      });
      setSuccess('Appearance settings saved successfully.');
    } catch (e) {
      setError(apiError(e, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const addDirector = () => {
    const newDir: DirectorCard = {
      id: `dir-${Date.now()}`,
      name: 'Director Name',
      role: 'DIRECTOR',
      image: '/directors/sunny-ashok-dumbre.png',
    };
    setOurStory((prev) => ({
      ...prev,
      directors: [...(prev.directors || []), newDir],
    }));
  };

  const updateDirector = (id: string, field: keyof DirectorCard, value: string) => {
    setOurStory((prev) => ({
      ...prev,
      directors: (prev.directors || []).map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    }));
  };

  const removeDirector = (id: string) => {
    setOurStory((prev) => ({
      ...prev,
      directors: (prev.directors || []).filter((d) => d.id !== id),
    }));
  };

  const addCategory = () => {
    setHomeCategories([
      ...homeCategories,
      { id: Date.now().toString(), title: '', href: '/collections/all', image: '' }
    ]);
  };

  const updateCategory = (id: string, field: keyof CategoryItem, value: string) => {
    setHomeCategories(homeCategories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCategory = (id: string) => {
    setHomeCategories(homeCategories.filter(c => c.id !== id));
  };

  const addBanner = () => {
    setBanners([...banners, { id: Date.now().toString(), desktop: '', mobile: '' }]);
  };

  const updateBanner = (id: string, field: 'desktop' | 'mobile', value: string) => {
    setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const addGalleryItem = () => {
    setGallery([...gallery, { id: Date.now().toString(), title: '', image: '' }]);
  };

  const updateGalleryItem = (id: string, field: 'title' | 'image', value: string) => {
    setGallery(gallery.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const removeGalleryItem = (id: string) => {
    setGallery(gallery.filter(g => g.id !== id));
  };

  const addFeatureImage = () => {
    setFeatureBanner({ ...featureBanner, images: [...featureBanner.images, ''] });
  };
  const updateFeatureImage = (index: number, value: string) => {
    const newImages = [...featureBanner.images];
    newImages[index] = value;
    setFeatureBanner({ ...featureBanner, images: newImages });
  };
  const removeFeatureImage = (index: number) => {
    const newImages = [...featureBanner.images];
    newImages.splice(index, 1);
    setFeatureBanner({ ...featureBanner, images: newImages });
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Configuration</p>
        <h2 className="text-2xl font-black text-[#111111]">Hero Section</h2>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}
      {success && <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{success}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="max-w-4xl overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-[#111111] mb-2">Top Announcement Bar Messages</h3>
            <p className="text-xs text-[#666666] mb-4">
              Customize the scrolling ticker text displayed at the top of the storefront header.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Announcement Messages (Use | to separate multiple items)</span>
                <textarea
                  rows={3}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Free delivery on farm fresh orders above ₹499 | 100% Organic & Naturally Grown · Harvested Daily | Direct from local organic farms to your doorstep"
                  className="mt-1.5 w-full rounded-2xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
                />
                <p className="mt-1.5 text-[11px] text-[#888888]">
                  Tip: Separate multiple scrolling announcement messages using the pipe character (<code className="bg-gray-100 px-1 py-0.5 rounded font-mono">|</code>).
                </p>
              </label>
            </div>
          </div>

          <div className="max-w-4xl overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[#111111]">Hero Banners</h3>
            <button
              onClick={addBanner}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-4 py-2 text-sm font-bold text-[#111111] hover:bg-[#e5e5e5]"
            >
              <Plus size={16} /> Add Banner
            </button>
          </div>
          
          <div className="space-y-6">
            {banners.length === 0 && (
              <p className="text-sm text-[#666666]">No banners configured. Default fallback images will be shown on the storefront.</p>
            )}
            
            {banners.map((banner, index) => (
              <div key={banner.id} className="p-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="flex justify-between items-center mb-4 border-b border-[#e5e5e5] pb-2">
                  <h4 className="font-bold text-[#111111] text-sm uppercase">Banner {index + 1}</h4>
                  <button 
                    onClick={() => removeBanner(banner.id)}
                    className="text-[#b33131] hover:bg-[#fee3e3] p-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Desktop Banner URL</span>
                      <input
                        value={banner.desktop}
                        onChange={(e) => updateBanner(banner.id, 'desktop', e.target.value)}
                        placeholder="https://example.com/banner.png"
                        className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                      />
                      <p className="mt-1 text-[10px] text-[#666666]">Recommended: 1920x800</p>
                    </label>
                    {banner.desktop && (
                      <div className="rounded-xl overflow-hidden border border-[#e5e5e5] bg-white h-32 flex items-center justify-center relative">
                        <img src={banner.desktop} alt={`Desktop Preview ${index}`} className="absolute inset-0 h-full w-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Mobile Banner URL</span>
                      <input
                        value={banner.mobile}
                        onChange={(e) => updateBanner(banner.id, 'mobile', e.target.value)}
                        placeholder="https://example.com/mobile-banner.png"
                        className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                      />
                      <p className="mt-1 text-[10px] text-[#666666]">Recommended: 800x1200</p>
                    </label>
                    {banner.mobile && (
                      <div className="rounded-xl overflow-hidden border border-[#e5e5e5] bg-white h-32 flex items-center justify-center relative">
                        <img src={banner.mobile} alt={`Mobile Preview ${index}`} className="absolute inset-y-0 h-full w-auto object-cover max-w-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-[#111111]">Homepage Category Circles</h3>
                <p className="text-xs text-[#666666]">Customize the round category links displayed on the homepage below the hero slider.</p>
              </div>
              <button
                onClick={addCategory}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-4 py-2 text-sm font-bold text-[#111111] hover:bg-[#e5e5e5]"
              >
                <Plus size={16} /> Add Category Circle
              </button>
            </div>

            <div className="space-y-6">
              {homeCategories.length === 0 && (
                <p className="text-sm text-[#666666]">No category circles configured. Default fallback categories will be shown on the storefront.</p>
              )}

              {homeCategories.map((cat, index) => (
                <div key={cat.id} className="p-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                  <div className="flex justify-between items-center mb-4 border-b border-[#e5e5e5] pb-2">
                    <h4 className="font-bold text-[#111111] text-sm uppercase">Category Circle {index + 1}</h4>
                    <button
                      onClick={() => removeCategory(cat.id)}
                      className="text-[#b33131] hover:bg-[#fee3e3] p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Title</span>
                        <input
                          value={cat.title}
                          onChange={(e) => updateCategory(cat.id, 'title', e.target.value)}
                          placeholder="e.g. Leafy Greens"
                          className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Link URL</span>
                        <input
                          value={cat.href}
                          onChange={(e) => updateCategory(cat.id, 'href', e.target.value)}
                          placeholder="/collections/leafy-greens"
                          className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Image URL</span>
                        <div className="flex gap-2 items-center">
                          <input
                            value={cat.image}
                            onChange={(e) => updateCategory(cat.id, 'image', e.target.value)}
                            placeholder="https://example.com/leafy-greens.png"
                            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                          />
                          {cat.image && (
                            <img src={cat.image} alt={cat.title} className="mt-1 h-10 w-10 shrink-0 rounded-full border border-[#e5e5e5] object-cover" />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blog posts moved to their own section (admin → Blog). */}
          <div className="max-w-4xl overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-[#111111]">Blog posts</h3>
              <p className="text-xs text-[#666666]">Articles — and the four shown on the homepage — are written and published in the Blog section.</p>
            </div>
            <Link to="/blog" className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
              Open Blog
            </Link>
          </div>

          <div className="max-w-4xl overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[#111111]">Homepage Gallery</h3>
              <button
                onClick={addGalleryItem}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-4 py-2 text-sm font-bold text-[#111111] hover:bg-[#e5e5e5]"
              >
                <Plus size={16} /> Add Image
              </button>
            </div>
            
            <div className="space-y-6">
              {gallery.length === 0 && (
                <p className="text-sm text-[#666666]">No gallery images configured.</p>
              )}
              
              {gallery.map((item, index) => (
                <div key={item.id} className="p-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                  <div className="flex justify-between items-center mb-4 border-b border-[#e5e5e5] pb-2">
                    <h4 className="font-bold text-[#111111] text-sm uppercase">Gallery Item {index + 1}</h4>
                    <button 
                      onClick={() => removeGalleryItem(item.id)}
                      className="text-[#b33131] hover:bg-[#fee3e3] p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Title</span>
                        <input
                          value={item.title}
                          onChange={(e) => updateGalleryItem(item.id, 'title', e.target.value)}
                          placeholder="e.g. SCRUB TOPS"
                          className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Image URL</span>
                        <input
                          value={item.image}
                          onChange={(e) => updateGalleryItem(item.id, 'image', e.target.value)}
                          placeholder="https://example.com/image.png"
                          className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                        />
                      </label>
                    </div>
                    {item.image && (
                      <div className="rounded-xl overflow-hidden border border-[#e5e5e5] bg-white h-32 flex items-center justify-center relative">
                        <img src={item.image} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-4xl overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white p-6">
            <h3 className="text-lg font-black text-[#111111] mb-4">Homepage Feature Banner</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Title</span>
                <input
                  value={featureBanner.title}
                  onChange={(e) => setFeatureBanner({ ...featureBanner, title: e.target.value })}
                  placeholder="e.g. A+ NEW COLOURS"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Subtitle</span>
                <input
                  value={featureBanner.subtitle}
                  onChange={(e) => setFeatureBanner({ ...featureBanner, subtitle: e.target.value })}
                  placeholder="e.g. NEW Sienna, Harbour Grey..."
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Button Text</span>
                <input
                  value={featureBanner.buttonText}
                  onChange={(e) => setFeatureBanner({ ...featureBanner, buttonText: e.target.value })}
                  placeholder="e.g. SHOP NOW"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Button Link</span>
                <input
                  value={featureBanner.buttonLink}
                  onChange={(e) => setFeatureBanner({ ...featureBanner, buttonLink: e.target.value })}
                  placeholder="e.g. /collections/new"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
            </div>

            <div className="border-t border-[#e5e5e5] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#111111] text-sm uppercase">Banner Images</h4>
                <button
                  onClick={addFeatureImage}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-4 py-2 text-sm font-bold text-[#111111] hover:bg-[#e5e5e5]"
                >
                  <Plus size={16} /> Add Image
                </button>
              </div>

              <div className="space-y-4">
                {featureBanner.images.length === 0 && (
                  <p className="text-sm text-[#666666]">No images added. Slider will be hidden.</p>
                )}
                {featureBanner.images.map((img, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <input
                        value={img}
                        onChange={(e) => updateFeatureImage(index, e.target.value)}
                        placeholder="Image URL..."
                        className="w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                      />
                    </div>
                    {img && (
                      <img src={img} alt="Preview" className="h-10 w-10 rounded object-cover border border-[#e5e5e5]" />
                    )}
                    <button 
                      onClick={() => removeFeatureImage(index)}
                      className="text-[#b33131] hover:bg-[#fee3e3] p-2.5 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* ── First-visit welcome popup ───────────────────────────── */}
          <div className="mt-8 rounded-2xl border border-[#eee8dc] bg-[#fdfbf7] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#111111]">Welcome popup</h2>
                <p className="text-sm text-[#666666]">
                  Shown once to each new visitor. Leave a field blank to use the default wording.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-[#2a2a2a]">
                <input
                  type="checkbox"
                  checked={welcome.enabled}
                  onChange={(e) => setWelcome({ ...welcome, enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Heading</span>
                <input
                  value={welcome.title}
                  onChange={(e) => setWelcome({ ...welcome, title: e.target.value })}
                  placeholder="Your first piece, on us"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Button text</span>
                <input
                  value={welcome.buttonText}
                  onChange={(e) => setWelcome({ ...welcome, buttonText: e.target.value })}
                  placeholder="Get my code"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Subheading</span>
                <input
                  value={welcome.subtitle}
                  onChange={(e) => setWelcome({ ...welcome, subtitle: e.target.value })}
                  placeholder="Join the Old Spice Agro Fresh list and get a little something off your first order."
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Coupon code</span>
                <input
                  value={welcome.couponCode}
                  onChange={(e) => setWelcome({ ...welcome, couponCode: e.target.value })}
                  placeholder="WELCOME10"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm uppercase outline-none focus:border-[#d4af37]"
                />
                <span className="mt-1 block text-[11px] text-[#999999]">
                  Must be a live coupon from the Coupons page. If it does not exist or has expired,
                  the visitor is added to the list without a code rather than shown one that fails.
                </span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Delay (seconds)</span>
                <input
                  type="number"
                  min={0}
                  value={welcome.delaySeconds}
                  onChange={(e) => setWelcome({ ...welcome, delaySeconds: Number(e.target.value) })}
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Image URL</span>
                <div className="flex gap-3">
                  <input
                    value={welcome.image}
                    onChange={(e) => setWelcome({ ...welcome, image: e.target.value })}
                    placeholder="https://example.com/welcome-banner.jpg"
                    className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                  />
                  {welcome.image && (
                    <img src={welcome.image} alt="Preview" className="mt-1 h-10 w-10 shrink-0 rounded border border-[#e5e5e5] object-cover" />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Board Of Directors Section */}
          <div className="mt-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#111827]">👥 Board Of Directors Section</h3>
                <p className="text-xs text-[#666666]">Customize the Board of Directors cards displayed on the homepage right after Best Sellers.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ourStory.enabled}
                  onChange={(e) => setOurStory({ ...ourStory, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#0f5636] focus:ring-[#0f5636]"
                />
                <span className="text-xs font-bold text-[#111827]">Show on Homepage</span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Section Title</span>
                <input
                  value={ourStory.title || 'Board Of Directors'}
                  onChange={(e) => setOurStory({ ...ourStory, title: e.target.value })}
                  placeholder="Board Of Directors"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Subtitle / Subheading</span>
                <input
                  value={ourStory.subtitle || 'Leadership & Vision Behind Old Spice Agro Fresh LLP'}
                  onChange={(e) => setOurStory({ ...ourStory, subtitle: e.target.value })}
                  placeholder="Leadership & Vision Behind Old Spice Agro Fresh LLP"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
            </div>

            {/* Directors Cards List */}
            <div className="border-t border-[#e5e5e5] pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#111111] text-sm uppercase">Director Cards ({ourStory.directors?.length || 0})</h4>
                <button
                  onClick={addDirector}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-4 py-2 text-sm font-bold text-[#111111] hover:bg-[#e5e5e5]"
                >
                  <Plus size={16} /> Add Director
                </button>
              </div>

              <div className="space-y-6">
                {(!ourStory.directors || ourStory.directors.length === 0) && (
                  <p className="text-sm text-[#666666]">No director cards added.</p>
                )}

                {ourStory.directors?.map((dir, index) => (
                  <div key={dir.id} className="p-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                    <div className="flex justify-between items-center mb-4 border-b border-[#e5e5e5] pb-2">
                      <h5 className="font-bold text-[#111111] text-xs uppercase">Director {index + 1}: {dir.name}</h5>
                      <button
                        onClick={() => removeDirector(dir.id)}
                        className="text-[#b33131] hover:bg-[#fee3e3] p-1.5 rounded-lg transition-colors"
                        title="Remove Director"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Full Name</span>
                          <input
                            value={dir.name}
                            onChange={(e) => updateDirector(dir.id, 'name', e.target.value)}
                            placeholder="Sunny Ashok Dumbre"
                            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Role / Designation</span>
                          <input
                            value={dir.role}
                            onChange={(e) => updateDirector(dir.id, 'role', e.target.value)}
                            placeholder="CEO / DIRECTOR"
                            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                          />
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Image URL / Photo Path</span>
                          <div className="flex gap-3 items-center">
                            <input
                              value={dir.image}
                              onChange={(e) => updateDirector(dir.id, 'image', e.target.value)}
                              placeholder="/directors/sunny-ashok-dumbre.png"
                              className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                            />
                            {dir.image && (
                              <img src={dir.image} alt={dir.name} className="mt-1 h-12 w-12 shrink-0 rounded-full border border-[#e5e5e5] object-cover" />
                            )}
                          </div>
                        </label>
                      </div>

                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Instagram Link (Optional)</span>
                          <input
                            value={dir.instagram || ''}
                            onChange={(e) => updateDirector(dir.id, 'instagram', e.target.value)}
                            placeholder="#"
                            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">WhatsApp Link (Optional)</span>
                          <input
                            value={dir.whatsapp || ''}
                            onChange={(e) => updateDirector(dir.id, 'whatsapp', e.target.value)}
                            placeholder="#"
                            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Facebook Link (Optional)</span>
                          <input
                            value={dir.facebook || ''}
                            onChange={(e) => updateDirector(dir.id, 'facebook', e.target.value)}
                            placeholder="#"
                            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">LinkedIn Link (Optional)</span>
                          <input
                            value={dir.linkedin || ''}
                            onChange={(e) => updateDirector(dir.id, 'linkedin', e.target.value)}
                            placeholder="#"
                            className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-6 py-3 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
