import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../Services/authService';
import apiClient from '../Services/apiClient';
import { API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';
import { useAppDispatch } from './Hooks/hooks';
import { clearCartLocal } from './Redux/Slices/cartSlice';
import OwnerOrdersPage from './dashboard/OwnerOrdersPage';
import DeliveryOrdersPage from './dashboard/DeliveryOrdersPage';
import RestaurantsPage from './dashboard/RestaurantsPage';
import MenuPage from './dashboard/MenuPage';
import UsersPage from './dashboard/UsersPage';
import UpdateProfileModal from './dashboard/UpdateProfileModal';
import DeleteAccountModal from './dashboard/DeleteAccountModal';
import ProfilePage from './dashboard/ProfilePage';
import DashboardPage from './dashboard/DashboardHomePage';
import { ROLES, NAV, type NavId, type RoleKey, type Restaurant } from './dashboard/dashboardUI';
export * from './dashboard/dashboardUI';


export default function FoodDashAdmin() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState<NavId>(() => {
    return (localStorage.getItem('ck_dashboard_page') as NavId) ?? 'dashboard';
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  useEffect(() => {
    localStorage.setItem('ck_dashboard_page', page);
  }, [page]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [updateProfileOpen, setUpdateProfileOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(authService.getCurrentUser());
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    dispatch(clearCartLocal());
    await authService.logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.GET_ALL_RESTAURANTS);
        setRestaurants(Array.isArray(data) ? data : (data.restaurants || []));
      } catch (err) {
        console.error("Failed to load restaurants for dashboard stats", err);
      } finally {
        setLoadingRestaurants(false);
      }
    };
    fetchRestaurants();
  }, []);

  const rawRole = currentUserData?.role ?? "user";
  const roleKey: RoleKey = (rawRole === "restaurant_owner" ? "owner" : rawRole) as RoleKey;

  const role = ROLES[roleKey];
  const displayUserName: string = currentUserData?.first_name
    ? `${currentUserData.first_name} ${currentUserData.last_name || ''}`.trim()
    : currentUserData?.username ?? "Guest";
  const userId: number = currentUserData?.id ?? 0;

  const activePage: NavId = role.nav.includes(page) ? page : role.nav[0];

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return (
        <DashboardPage
          role={roleKey}
          userName={displayUserName}
          restaurantCount={loadingRestaurants ? "..." : String(restaurants.length)}
          onNavigateRestaurants={() => setPage("restaurants")}
        />
      );
      case "orders":
        return roleKey === "owner" ? <OwnerOrdersPage /> : <DeliveryOrdersPage />;
      case "restaurants": return <RestaurantsPage role={role} />;
      case "menu": return <MenuPage role={role} />;
      case "users": return <UsersPage currentRole={roleKey} currentUserId={userId} />;
      case "profile": return <ProfilePage user={currentUserData} />;
    }
  };

  const pageTitle: Record<NavId, string> = {
    dashboard: "Dashboard",
    restaurants: "Restaurants",
    orders: "Orders",
    menu: "Menu",
    users: "Users & Roles",
    profile: "My Profile",
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 font-sans text-sm overflow-hidden">

      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        style={{
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease-in-out',
        }}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[230px] bg-gray-900 flex flex-col flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        style={{
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
        }}
      >
        <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-2.5">
          <Link to="/">
            <img src="src/assets/2f15426f-6ef2-41a6-937d-49013145f964-removebg-preview.png" alt="Logo" className="w-12" />
          </Link>
          <span className="text-white font-extrabold text-sm flex-1">CraveKart</span>
          <button
            className="md:hidden text-gray-400 hover:text-white border-none bg-transparent cursor-pointer text-lg p-1 leading-none"
            onClick={() => setSidebarOpen(false)}
          >✕</button>
        </div>

        <nav className="flex-1 p-2.5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-[13px] text-left cursor-pointer mb-2 text-gray-400 hover:text-white hover:bg-gray-800 font-medium transition-colors border-b border-gray-800/80 pb-2.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </button>
          {NAV.filter(n => role.nav.includes(n.id)).map(n => {
            const active = activePage === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); }}
                className={`flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-[13px] text-left cursor-pointer mb-0.5 transition-colors
                  ${active ? "bg-orange-500 text-white font-bold" : "text-gray-400 hover:text-white hover:bg-gray-800 font-normal"}`}
              >
                <span className="text-base">{n.icon}</span> {n.label}
              </button>
            );
          })}
        </nav>

        <div className="relative px-3.5 py-3 border-t border-gray-800" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-xl cursor-pointer border-none bg-transparent text-left group"
            title="User Settings"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 ${role.avatarColor}`}>
                {displayUserName[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-[13px] truncate">{displayUserName}</p>
                <p className="text-gray-500 text-[11px]">{role.label}</p>
              </div>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-3.5 right-3.5 mb-2 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-1.5 z-50 animate-in fade-in-0 zoom-in-95">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setUpdateProfileOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700/50 rounded-lg cursor-pointer text-left border-none bg-transparent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Update Profile
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setDeleteAccountOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700/50 rounded-lg cursor-pointer text-left border-none bg-transparent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Delete Account
              </button>

              <div className="my-1 border-t border-gray-700/60" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:bg-gray-700/50 rounded-lg cursor-pointer text-left border-none bg-transparent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-2xs flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition border-none bg-transparent cursor-pointer flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="text-lg md:text-xl font-extrabold text-gray-900 truncate">{pageTitle[activePage]}</h1>
          </div>
        </div>

        <main className="flex-1 overflow-auto scrollbar-hide p-4 md:p-6">
          {renderPage()}
        </main>
      </div>

      {updateProfileOpen && (
        <UpdateProfileModal
          user={currentUserData}
          onClose={() => setUpdateProfileOpen(false)}
          onSuccess={(updatedUser) => setCurrentUserData(updatedUser)}
        />
      )}

      {deleteAccountOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteAccountOpen(false)}
        />
      )}
    </div>
  );
}