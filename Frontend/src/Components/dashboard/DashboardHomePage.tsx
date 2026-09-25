import { Card, ROLES, type RoleKey } from "./dashboardUI";
import MyOrdersSection from "./myOrdersSection";

export function DashboardPage({ role, userName, restaurantCount, onNavigateRestaurants }: {
  role: RoleKey;
  userName: string;
  restaurantCount: string;
  onNavigateRestaurants?: () => void;
}) {
  const roleDef = ROLES[role];
  const isAdmin = role === "super_admin" || role === "admin";

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md">
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1">Welcome back</p>
        <p className="text-2xl font-extrabold">{userName}</p>
        <p className="text-sm opacity-80 mt-0.5">Logged in as <strong>{roleDef.label}</strong></p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="!p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partner Restaurants</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{restaurantCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Active Network
              </span>
              {onNavigateRestaurants && (
                <button
                  onClick={onNavigateRestaurants}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer border-none bg-transparent transition-colors"
                >
                  Manage Partners
                </button>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="w-full lg:w-1/2 max-w-2xl mx-auto">
        <Card>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-bold">My Orders</h2>
              <p className="text-xs text-gray-400 mt-0.5">Your order history</p>
            </div>
          </div>
          <MyOrdersSection />
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
