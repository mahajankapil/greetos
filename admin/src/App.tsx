import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, homePathFor } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import ConcernsPage from './pages/ConcernsPage';
import OrdersPage from './pages/OrdersPage';
import PaymentsPage from './pages/PaymentsPage';
import CouponsPage from './pages/CouponsPage';
import UsersPage from './pages/UsersPage';
import NotificationsPage from './pages/NotificationsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ProductCategoryBarPage from './pages/ProductCategoryBarPage';
import ReturnsPage from './pages/ReturnsPage';
import AppearancePage from './pages/AppearancePage';
import LegalPages from './pages/LegalPages';
import ReferralsPage from './pages/ReferralsPage';
import BusinessSettingsPage from './pages/BusinessSettingsPage';
import DeliveryPage from './pages/DeliveryPage';
import ReviewsPage from './pages/ReviewsPage';
import MerchandisingPage from './pages/MerchandisingPage';
import InvoicePage from './pages/InvoicePage';
import ReelsPage from './pages/ReelsPage';
import BlogPage from './pages/BlogPage';

/**
 * Sends an unknown URL to whichever home the signed-in role actually has —
 * a partner has no Products page, so the old hardcoded redirect would have
 * bounced them into a loop.
 */
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Layout>
                <ProductsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <Layout>
                <CategoriesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/concerns"
          element={
            <ProtectedRoute>
              <Layout>
                <ConcernsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Layout>
                <OrdersPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/product-category-bars"
          element={
            <ProtectedRoute>
              <Layout>
                <ProductCategoryBarPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Layout>
                <PaymentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/coupons"
          element={
            <ProtectedRoute>
              <Layout>
                <CouponsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout>
                <UsersPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <NotificationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <Layout>
                <AnnouncementsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <ProtectedRoute>
              <Layout>
                <ReturnsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/appearance"
          element={
            <ProtectedRoute>
              <Layout>
                <AppearancePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/legal-pages"
          element={
            <ProtectedRoute>
              <Layout>
                <LegalPages />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <Layout>
                <ReferralsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/business-settings"
          element={
            <ProtectedRoute>
              <Layout>
                <BusinessSettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchandising"
          element={
            <ProtectedRoute>
              <Layout>
                <MerchandisingPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reels"
          element={
            <ProtectedRoute>
              <Layout>
                <ReelsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/blog"
          element={
            <ProtectedRoute>
              <Layout>
                <BlogPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <ProtectedRoute>
              <Layout>
                <ReviewsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedRoute>
              <Layout>
                <DeliveryPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId/invoice"
          element={
            <ProtectedRoute>
              <Layout>
                <InvoicePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
