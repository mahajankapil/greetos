import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sparkles, Package, ShoppingBag, Megaphone, LogOut, Shirt, FolderTree, HeartPulse, Users, CreditCard, Bell, Ticket, Tag, Truck, Star, RefreshCw, Palette, Gift, Building2, Menu, X, Video, FileText, BookOpen, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Brand mark. Hosted remotely, same asset the storefront header uses, so the
// admin cannot drift from the storefront's logo.
const BRAND_MARK = 'https://mkpillllll.sirv.com/stuff/logoo.png';

// `roles` decides who sees each link. Only admins use this panel now — the
// panel but only ever see their own earnings.
const nav = [
  { to: '/products', label: 'Products', icon: Package, roles: ['admin'] },
  { to: '/categories', label: 'Categories', icon: FolderTree, roles: ['admin'] },
  { to: '/product-category-bars', label: 'Home Categories', icon: Tag, roles: ['admin'] },
  { to: '/merchandising', label: 'Featured & Bestsellers', icon: Star, roles: ['admin'] },
  { to: '/reels', label: 'Instagram Reels', icon: Video, roles: ['admin'] },
  { to: '/blog', label: 'Blog', icon: BookOpen, roles: ['admin'] },
  { to: '/weekly-planner', label: 'Weekly Planner', icon: CalendarDays, roles: ['admin'] },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, roles: ['admin'] },
  { to: '/returns', label: 'Returns', icon: RefreshCw, roles: ['admin'] },
  { to: '/reviews', label: 'Reviews', icon: Star, roles: ['admin'] },
  { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin'] },
  { to: '/coupons', label: 'Coupons', icon: Ticket, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin'] },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['admin'] },
  { to: '/appearance', label: 'Appearance', icon: Palette, roles: ['admin'] },
  { to: '/legal-pages', label: 'Legal Pages', icon: FileText, roles: ['admin'] },
  { to: '/referrals', label: 'Referrals', icon: Gift, roles: ['admin'] },
  { to: '/delivery', label: 'Delivery', icon: Truck, roles: ['admin'] },
  { to: '/business-settings', label: 'Business & GST', icon: Building2, roles: ['admin'] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNav = nav.filter((n) => user && n.roles.includes(user.role));
  const isPartner = user?.role === 'creator';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-black px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center">
            <img src={BRAND_MARK} alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#d4af37]">Old Spice Agro Fresh</p>
            <h1 className="text-base font-black text-white">{isPartner ? 'Partner' : 'Admin'}</h1>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar / Mobile Menu */}
      <aside className={`bg-black p-5 lg:min-h-screen flex flex-col fixed lg:sticky inset-0 z-40 transition-transform duration-300 lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:w-auto w-[280px]`}>
        <div className="hidden lg:flex items-center gap-3 pb-6">
          <div className="flex h-12 w-12 items-center justify-center">
            {/* Old Spice Agro Fresh mark — the same artwork the storefront header uses. */}
            <img src={BRAND_MARK} alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#d4af37]">Old Spice Agro Fresh</p>
            <h1 className="text-lg font-black text-white">{isPartner ? 'Partner' : 'Admin'}</h1>
          </div>
        </div>

        <nav className="space-y-1 overflow-y-auto flex-1">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#d4af37] text-black'
                    : 'text-[#a0a0a0] hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <p className="px-4 text-xs text-[#a0a0a0]">{user?.email ?? user?.name}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#a0a0a0] hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="p-4 sm:p-5 lg:p-8 pt-16 lg:pt-5">{children}</main>
    </div>
  );
}
