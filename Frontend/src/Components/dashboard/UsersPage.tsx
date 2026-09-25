import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import apiClient from "../../Services/apiClient";
import { API_ENDPOINTS } from "../../config/api";
import { type RoleKey, type AppUser, type Restaurant, Badge, Card, Btn, Label, Th, Td } from "./dashboardUI";
import { Skeleton } from "../ui/skeleton";

export function UsersPage({ currentRole, currentUserId }: {
  currentRole: RoleKey; currentUserId: number;
}) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedUserForOwner, setSelectedUserForOwner] = useState<AppUser | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await apiClient.get('/auth/users');
        const normalized = (data.users || []).map((u: any) => ({
          ...u,
          name: u.name || (u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username || u.email),
          role: u.role === "restaurant_owner" ? "owner" : u.role
        }));
        setUsers(normalized);
      } catch (err: any) {
        toast.error("Failed to load users list");
      } finally {
        setLoading(false);
      }
    };
    const fetchRestaurants = async () => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.GET_ALL_RESTAURANTS);
        setRestaurants(Array.isArray(data) ? data : (data.restaurants || []));
      } catch (err) {
        console.error("Failed to fetch restaurants", err);
      }
    };
    fetchUsers();
    fetchRestaurants();
  }, []);

  const promoteUser = async (id: number) => {
    try {
      await apiClient.post(API_ENDPOINTS.ASSIGN_ADMIN, { userId: id });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: "admin" } : u));
      toast.success("User promoted to Admin");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to promote user");
    }
  };

  const demoteAdmin = async (id: number) => {
    try {
      await apiClient.post(API_ENDPOINTS.REMOVE_ADMIN, { userId: id });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: "user" } : u));
      toast.success("Admin demoted to regular User");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to demote admin");
    }
  };

  const assignOwner = async () => {
    if (!selectedUserForOwner || !selectedRestaurantId) {
      toast.error("Please select a restaurant");
      return;
    }
    try {
      const resId = Number(selectedRestaurantId);
      const targetRestaurant = restaurants.find(r => r.id === resId);

      await apiClient.post(API_ENDPOINTS.ASSIGN_RESTAURANT_OWNER, {
        userId: selectedUserForOwner.id,
        restaurantId: resId
      });

      setUsers(prev => prev.map(u => {
        if (u.id === selectedUserForOwner.id) {
          const currentOwned = u.owned_restaurants || [];
          const alreadyOwned = currentOwned.some(or => or.id === resId);
          const nextOwned = alreadyOwned ? currentOwned : [...currentOwned, { id: resId, name: targetRestaurant?.name || "" }];
          return { ...u, role: "owner" as RoleKey, owned_restaurants: nextOwned };
        }
        return u;
      }));

      toast.success(`Assigned as owner of ${targetRestaurant?.name || 'restaurant'}`);
      setSelectedUserForOwner(null);
      setSelectedRestaurantId("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to assign restaurant owner");
    }
  };

  const removeOwner = async (userId: number, restaurantId: number, restaurantName: string) => {
    if (!window.confirm(`Are you sure you want to remove ownership of ${restaurantName}?`)) return;
    try {
      await apiClient.post(API_ENDPOINTS.REMOVE_RESTAURANT_OWNER, {
        userId,
        restaurantId
      });

      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          const nextOwned = (u.owned_restaurants || []).filter(or => or.id !== restaurantId);
          const nextRole = nextOwned.length === 0 ? ("user" as RoleKey) : u.role;
          return { ...u, role: nextRole, owned_restaurants: nextOwned };
        }
        return u;
      }));
      toast.success(`Removed ownership of ${restaurantName}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to remove restaurant owner");
    }
  };

  const removeUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this account?")) return;
    try {
      await apiClient.delete(`${API_ENDPOINTS.DELETE_USER}?id=${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("User account deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete user");
    }
  };

  const assignDeliveryPartner = async (id: number) => {
    try {
      await apiClient.post(API_ENDPOINTS.ASSIGN_DELIVERY_PARTNER, { userId: id });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: "delivery_partner" as RoleKey } : u));
      toast.success("User assigned as Delivery Partner");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to assign delivery partner");
    }
  };

  const removeDeliveryPartner = async (id: number) => {
    try {
      await apiClient.post(API_ENDPOINTS.REMOVE_DELIVERY_PARTNER, { userId: id });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: "user" as RoleKey } : u));
      toast.success("Delivery partner role removed");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to remove delivery partner");
    }
  };

  const canActOn = (targetRole: RoleKey) =>
    currentRole === "super_admin" ||
    (currentRole === "admin" && (targetRole === "user" || targetRole === "owner" || targetRole === "delivery_partner"));

  const filteredUsers = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const nameStr = (u.name || (u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username || '')).toLowerCase();

    return nameStr.includes(q)
  });

  return (
    <Card>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-bold">Users & Roles</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <span className="text-xs text-gray-400">{filteredUsers.length} total</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[850px]">
          <thead><tr><Th>Name</Th><Th>Email</Th><Th className="text-center">Role</Th><Th className="text-center">Owned Restaurants</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {loading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td className="font-semibold">
                      <Skeleton className="h-4 w-28 rounded" />
                    </Td>
                    <Td>
                      <Skeleton className="h-4 w-40 rounded" />
                    </Td>
                    <Td className="text-center">
                      <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                    </Td>
                    <Td className="text-center">
                      <Skeleton className="h-4 w-10 rounded mx-auto" />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-20 rounded-lg" />
                        <Skeleton className="h-6 w-24 rounded-lg" />
                      </div>
                    </Td>
                  </tr>
                ))}
              </>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <Td colSpan={5} className="text-center text-gray-400 py-6">
                  {search.trim() ? `No users matching "${search}"` : 'No users found.'}
                </Td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const isSelf = u.id === currentUserId;
                const isUntouchable = u.role === "super_admin" || (u.role === "admin" && currentRole === "admin");
                const showActions = !isSelf && !isUntouchable && canActOn(u.role);
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isSelf ? "opacity-60" : ""}`}>
                    <Td className="font-semibold">
                      {(u.first_name ? `${u.first_name}`.trim() : u.username || u.email)}
                      {isSelf && <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 rounded px-1.5 py-0.5">you</span>}
                    </Td>
                    <Td className="text-gray-500">{u.email}</Td>
                    <Td className="text-center">
                      <Badge status={u.role} />
                    </Td>
                    <Td className="text-center">
                      {u.owned_restaurants && u.owned_restaurants.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1.5 max-w-[300px] mx-auto">
                          {u.owned_restaurants.map(or => (
                            <span
                              key={or.id}
                              className="flex items-center justify-between w-[140px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100"
                              title={or.name}
                            >
                              <span className="truncate flex items-center gap-1 min-w-0">
                                <span className="truncate">{or.name}</span>
                              </span>
                              {showActions && (
                                <button
                                  onClick={() => removeOwner(u.id, or.id, or.name)}
                                  className="text-blue-400 hover:text-red-600 font-bold ml-1 cursor-pointer border-none bg-transparent leading-none shrink-0"
                                  title={`Revoke ownership of ${or.name}`}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {showActions ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          {u.role === "admin" && currentRole === "super_admin" && (
                            <Btn variant="ghost" size="sm" onClick={() => demoteAdmin(u.id)}>Demote to User</Btn>
                          )}
                          {u.role === "user" && (
                            <>
                              <Btn variant="ghost" size="sm" onClick={() => promoteUser(u.id)} disabled={currentRole === "admin"}>Promote to Admin</Btn>
                              <Btn variant="ghost" size="sm" onClick={() => setSelectedUserForOwner(u)}>Assign Owner</Btn>
                              <Btn variant="ghost" size="sm" onClick={() => assignDeliveryPartner(u.id)}>Assign Delivery Partner</Btn>
                            </>
                          )}
                          {u.role === "owner" && (
                            <Btn variant="ghost" size="sm" onClick={() => setSelectedUserForOwner(u)}>Assign Owner</Btn>
                          )}
                          {u.role === "delivery_partner" && (
                            <Btn variant="ghost" size="sm" onClick={() => removeDeliveryPartner(u.id)}>Remove Delivery Partner</Btn>
                          )}
                          <Btn variant="danger" title="Remove User" size="sm" onClick={() => removeUser(u.id)}>Remove</Btn>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{isSelf ? "—" : isUntouchable ? "No access" : "—"}</span>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedUserForOwner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setSelectedUserForOwner(null);
                setSelectedRestaurantId("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold border-none bg-transparent cursor-pointer"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-1 text-gray-900 font-sans">Assign Restaurant Owner</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select a restaurant to assign to <strong>{selectedUserForOwner.name}</strong>.
            </p>
            <div className="space-y-4">
              <div>
                <Label>Select Restaurant</Label>
                <select
                  value={selectedRestaurantId}
                  onChange={e => setSelectedRestaurantId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 mt-1"
                >
                  <option value="">-- Choose a Restaurant --</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.address ? `(${r.address})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Btn variant="ghost" onClick={() => {
                  setSelectedUserForOwner(null);
                  setSelectedRestaurantId("");
                }}>
                  Cancel
                </Btn>
                <Btn onClick={assignOwner} disabled={!selectedRestaurantId}>
                  Assign Owner
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}

export default UsersPage;
