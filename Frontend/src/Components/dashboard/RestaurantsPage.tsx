import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import apiClient from "../../Services/apiClient";
import { API_ENDPOINTS } from "../../config/api";
import { Utensils } from "lucide-react";
import { type RoleDefinition, type Restaurant, Card, Btn, Input, Label, Th, Td } from "./dashboardUI";
import { Skeleton } from "../ui/skeleton";
import LocationPickerMap from "./LocationPickerMap";

export function RestaurantsPage({ role }: { role: RoleDefinition }) {
  const formCardRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "", photo_url: "" });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  const fetchGeocode = async (query: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CraveKart-FoodDeliveryApp/1.0'
          }
        }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } catch (e) {
      console.warn("Geocode query failed for:", query, e);
    }
    return null;
  };

  const handleDetectCoordinates = async () => {
    const rawAddress = form.address.trim();
    if (!rawAddress) {
      toast.error("Please enter a location or address first");
      return;
    }
    setGeocodingLoading(true);

    try {
      let result = await fetchGeocode(rawAddress);

      if (!result) {
        const cleaned = rawAddress
          .replace(/\b(Opp|Opposite|Near|Behind|Beside|Facing|Above|Below)\b\.?/gi, '')
          .replace(/é/g, 'e')
          .trim();
        if (cleaned !== rawAddress) {
          result = await fetchGeocode(cleaned);
        }
      }

      if (!result) {
        const parts = rawAddress.split(',').map(p => p.trim()).filter(Boolean);
        for (let i = 1; i < parts.length - 1 && !result; i++) {
          const fallbackQuery = parts.slice(i).join(', ');
          result = await fetchGeocode(fallbackQuery);
        }
      }

      if (!result) {
        const pincodeMatch = rawAddress.match(/\b\d{6}\b/);
        const parts = rawAddress.split(',').map(p => p.trim()).filter(Boolean);
        const cityOrState = parts.length > 1 ? parts.slice(-2).join(' ') : rawAddress;
        const pincodeQuery = [cityOrState, pincodeMatch ? pincodeMatch[0] : ''].filter(Boolean).join(' ');
        if (pincodeQuery) {
          result = await fetchGeocode(pincodeQuery);
        }
      }

      if (result) {
        const { lat, lon, display_name } = result;
        setForm(p => ({
          ...p,
          latitude: String(parseFloat(lat).toFixed(6)),
          longitude: String(parseFloat(lon).toFixed(6)),
        }));
        const matchedName = display_name.split(',')[0];
        toast.success(`Coordinates detected (${matchedName})!`);
      } else {
        toast.error("Location not found. Try simplifying the address or including city/pincode.");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      toast.error("Failed to fetch coordinates from OpenStreetMap");
    } finally {
      setGeocodingLoading(false);
    }
  };

  useEffect(() => {
    const fetchRestaurants = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.GET_ALL_RESTAURANTS);
        setRestaurants(Array.isArray(data) ? data : (data.restaurants || []));
      } catch (err: any) {
        if (showLoading) toast.error(err.response?.data?.error || "Failed to load restaurants");
      } finally {
        if (showLoading) setLoading(false);
      }
    };
    fetchRestaurants(true);

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const sseUrl = `${import.meta.env.VITE_API_BASE_URL}/orders/events?token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "RESTAURANT_CREATED" ||
          data.type === "RESTAURANT_UPDATED" ||
          data.type === "RESTAURANT_DELETED"
        ) {
          fetchRestaurants(false);
          if (data.type === "RESTAURANT_CREATED" && data.restaurant?.name) {
            toast.success(`New partner restaurant added: "${data.restaurant.name}"`);
          } else if (data.type === "RESTAURANT_DELETED") {
            toast.error("A restaurant was removed from the network");
          }
        }
      } catch (err) {
        console.error("Error parsing SSE event in RestaurantsPage:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleEditClick = (r: Restaurant) => {
    setForm({
      name: r.name || "",
      address: r.address || r.location || "",
      latitude: r.latitude !== undefined && r.latitude !== null ? String(r.latitude) : "",
      longitude: r.longitude !== undefined && r.longitude !== null ? String(r.longitude) : "",
      photo_url: r.photo_url || "",
    });
    setEditingId(r.id);
    setShowForm(true);
    setTimeout(() => {
      if (formCardRef.current) {
        formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleUpdateRestaurant = async () => {
    if (editingId === null) return;
    if (!form.name || !form.address || !form.latitude || !form.longitude) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const url = API_ENDPOINTS.UPDATE_RESTAURANT.replace(':restaurantId', String(editingId));
      const { data } = await apiClient.put(url, {
        name: form.name,
        address: form.address,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        photo_url: form.photo_url || null,
      });

      setRestaurants(prev => prev.map(r => r.id === editingId ? {
        ...r,
        ...data.restaurant
      } : r));
      setForm({ name: "", address: "", latitude: "", longitude: "", photo_url: "" });
      setEditingId(null);
      setShowForm(false);
      toast.success("Restaurant updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update restaurant");
    }
  };

  const handleAddRestaurant = async () => {
    if (!form.name || !form.address || !form.latitude || !form.longitude) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.CREATE_RESTAURANT, {
        name: form.name,
        address: form.address,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        photo_url: form.photo_url || null,
      });
      setRestaurants(prev => [...prev, data.restaurant]);
      setForm({ name: "", address: "", latitude: "", longitude: "", photo_url: "" });
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create restaurant");
    }
  };

  const handleDeleteRestaurant = async (r: Restaurant) => {
    const targetId = r.id ?? r.place_id;
    if (!targetId) {
      toast.error("Cannot delete restaurant: Restaurant ID missing");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${r.name}"?`)) return;
    try {
      const url = API_ENDPOINTS.DELETE_RESTAURANT.replace(':restaurantId', String(targetId));
      await apiClient.delete(url);
      setRestaurants(prev => prev.filter(item => item.id !== r.id && item.place_id !== r.place_id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete restaurant");
    }
  };

  const filteredRestaurants = restaurants.filter(r =>
    (r.name).toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-5">
      {role.canAddRestaurant && (
        <div ref={formCardRef} className="scroll-mt-6">
          <Card className="!p-4 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                if (showForm && editingId !== null) {
                  setEditingId(null);
                  setForm({ name: "", address: "", latitude: "", longitude: "", photo_url: "" });
                }
                setShowForm(!showForm);
              }}
              className="w-full flex items-center justify-between cursor-pointer border-none bg-transparent text-left select-none group"
            >
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editingId !== null ? "Edit Restaurant" : "Add New Restaurant"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId !== null
                    ? "Updating details of selected restaurant."
                    : "Register a new partner to the CraveKart network."}
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 group-hover:text-orange-600 transition-transform duration-500 ${showForm ? "rotate-180 text-orange-600" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className={`grid transition-all duration-500 ease-in-out ${showForm ? "grid-rows-[1fr] opacity-100 mt-4 border-t border-gray-100 pt-4" : "grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-0"}`}>
              <div className="overflow-hidden min-h-0 p-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <Label>Restaurant Name</Label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter Restaurant Name" />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label>Location / Address</Label>
                      <button
                        type="button"
                        onClick={handleDetectCoordinates}
                        disabled={geocodingLoading || !form.address.trim()}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed border-none bg-transparent cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        {geocodingLoading ? (
                          <>
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full" />
                            Detecting GPS...
                          </>
                        ) : (
                          <>Auto-Detect Coordinates</>
                        )}
                      </button>
                    </div>
                    <Input
                      value={form.address}
                      onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Enter Address"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label>Latitude</Label>
                    <Input value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} placeholder="Enter Latitude" type="number" />
                  </div>
                  <div className="col-span-1">
                    <Label>Longitude</Label>
                    <Input value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} placeholder="Enter Longitude" type="number" />
                  </div>
                  <div className="col-span-1 sm:col-span-2 mt-1">
                    <LocationPickerMap
                      latitude={parseFloat(form.latitude) || 0}
                      longitude={parseFloat(form.longitude) || 0}
                      onPositionChange={(lat, lng) => {
                        setForm(p => ({
                          ...p,
                          latitude: String(lat.toFixed(6)),
                          longitude: String(lng.toFixed(6)),
                        }));
                      }}
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <Label>Photo URL</Label>
                    <Input value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))} placeholder="Enter Photo URL" />
                  </div>
                  <div className="col-span-1 sm:col-span-2 flex gap-2 pt-1">
                    <Btn onClick={editingId !== null ? handleUpdateRestaurant : handleAddRestaurant}>
                      {editingId !== null ? "Update Restaurant" : "+ Add Restaurant"}
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold">All Restaurants</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search restaurants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <span className="text-xs text-gray-400">{filteredRestaurants.length} total</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>
              <Th className="text-left">Name</Th>
              <Th className="text-left">Location</Th>
              {(role.canEditRestaurant || role.canDeleteRestaurant) && <Th className="text-center">Actions</Th>}
            </tr></thead>
            <tbody>
              {loading ? (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <tr key={i} className="border-b border-gray-100">
                      <Td>
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0" />
                          <Skeleton className="h-4 w-24 sm:w-36 rounded" />
                        </div>
                      </Td>
                      <Td>
                        <Skeleton className="h-4 w-28 sm:w-48 rounded" />
                      </Td>
                      {(role.canEditRestaurant || role.canDeleteRestaurant) && (
                        <Td className="text-center">
                          <div className="flex gap-1.5 sm:gap-2 justify-center">
                            <Skeleton className="h-7 w-10 sm:w-14 rounded-lg" />
                            <Skeleton className="h-7 w-12 sm:w-16 rounded-lg" />
                          </div>
                        </Td>
                      )}
                    </tr>
                  ))}
                </>
              ) : filteredRestaurants.length === 0 ? (
                <tr>
                  <Td colSpan={role.canEditRestaurant || role.canDeleteRestaurant ? 3 : 2} className="text-center text-gray-400 py-6">
                    {search.trim() ? `No restaurants matching "${search}"` : 'No restaurants registered yet.'}
                  </Td>
                </tr>
              ) : filteredRestaurants.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-medium max-w-[130px] sm:max-w-[260px]" title={r.name}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0" title={r.name}>
                      {r.photo_url ? (
                        <img src={r.photo_url} alt={r.name} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 shrink-0">
                          <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1" title={r.name}>
                        <p className="font-semibold text-xs sm:text-sm truncate" title={r.name}>{r.name}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-500 max-w-[120px] sm:max-w-[320px]" title={r.address || 'Location not specified'}>
                    <p className="truncate text-xs sm:text-sm" title={r.address || 'Location not specified'}>{r.address || '—'}</p>
                  </Td>
                  {(role.canEditRestaurant || role.canDeleteRestaurant) && (
                    <Td className="text-center">
                      <div className="flex gap-1.5 sm:gap-2 justify-center">
                        {role.canEditRestaurant && <Btn variant="ghost" size="sm" onClick={() => handleEditClick(r)}>Edit</Btn>}
                        {role.canDeleteRestaurant && <Btn variant="danger" size="sm" onClick={() => handleDeleteRestaurant(r)}>Delete</Btn>}
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default RestaurantsPage;
