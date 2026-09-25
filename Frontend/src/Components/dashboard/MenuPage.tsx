import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import apiClient from "../../Services/apiClient";
import { API_ENDPOINTS } from "../../config/api";
import { type RoleDefinition, type MenuItem, Card, Btn, Input, Label, Th, Td } from "./dashboardUI";
import { Skeleton } from "../ui/skeleton";

export function MenuPage({ role }: { role: RoleDefinition }) {
  const [ownerRestaurant, setOwnerRestaurant] = useState<{ id: number; name: string } | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', description: '', veg: false, discount: '0', discountAllItems: false });
  const [search, setSearch] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const aiPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAiPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (aiPanelRef.current && !aiPanelRef.current.contains(e.target as Node)) {
        setShowAiPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAiPanel]);

  useEffect(() => {
    const fetchMyRestaurant = async () => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.MY_RESTAURANTS);
        const first = (data.restaurants || [])[0] ?? null;
        setOwnerRestaurant(first ? { id: first.id, name: first.name } : null);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load your restaurant');
      } finally {
        setLoadingRestaurant(false);
      }
    };
    fetchMyRestaurant();
  }, []);

  useEffect(() => {
    if (!ownerRestaurant) return;
    const fetchMenu = async (showLoading = true) => {
      if (showLoading) setLoadingMenu(true);
      try {
        const url = API_ENDPOINTS.MENU.replace(':restaurantName', encodeURIComponent(ownerRestaurant.name));
        const { data } = await apiClient.get(url);
        setMenu(Array.isArray(data) ? data : (data.items || []));
      } catch (err: any) {
        if (showLoading) toast.error('Failed to load menu items');
      } finally {
        if (showLoading) setLoadingMenu(false);
      }
    };
    fetchMenu(true);

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const sseUrl = `${import.meta.env.VITE_API_BASE_URL}/orders/events?token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.restaurantId === ownerRestaurant.id &&
          [
            'MENU_ITEM_ADDED',
            'MENU_ITEM_UPDATED',
            'MENU_ITEM_DELETED',
            'MENU_ITEMS_BULK_UPDATED',
          ].includes(data.type)
        ) {
          fetchMenu(false);
        }
      } catch (err) {
        console.error('Error parsing SSE event in MenuPage:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [ownerRestaurant]);

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: String(item.price),
      description: item.description || '',
      veg: Boolean(item.veg),
      discount: String(item.discount || 0),
      discountAllItems: false,
    });
    setShowAiPanel(false);
    setAiSuggestions([]);
    setShowForm(true);
  };

  const handleSaveMenuItem = async () => {
    if (!ownerRestaurant) return;
    const discountNum = Math.min(100, Math.max(0, parseInt(form.discount || '0', 10)));

    if (form.discountAllItems) {
      if (!window.confirm(`Apply ${discountNum}% discount to ALL ${menu.length} menu items?`)) return;
      setSaving(true);
      try {
        const url = API_ENDPOINTS.BULK_DISCOUNT_MENU.replace(':restaurantId', String(ownerRestaurant.id));
        await apiClient.patch(url, { discount: discountNum });
        setMenu(prev => prev.map(i => ({ ...i, discount: discountNum })));
        toast.success(`${discountNum}% discount applied to all menu items!`);
        setForm({ name: '', price: '', description: '', veg: false, discount: '0', discountAllItems: false });
        setEditingItem(null);
        setShowAiPanel(false);
        setAiSuggestions([]);
        setShowForm(false);
        localStorage.removeItem('menuCache');

      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to apply bulk discount');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.name || !form.price) {
      toast.error('Item name and price are required');
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        const url = API_ENDPOINTS.UPDATE_MENU_ITEM
          .replace(':restaurantId', String(ownerRestaurant.id))
          .replace(':itemId', String(editingItem.id));
        const { data } = await apiClient.put(url, {
          name: form.name,
          price: parseFloat(form.price),
          description: form.description,
          veg: form.veg,
          discount: discountNum,
        });
        const updatedItem = data.menuItem || {
          ...editingItem,
          name: form.name,
          price: parseFloat(form.price),
          description: form.description,
          veg: form.veg,
          discount: discountNum,
          is_available: editingItem.is_available,
        };
        setMenu(prev => prev.map(i => i.id === editingItem.id ? updatedItem : i));
        localStorage.removeItem('menuCache');
        toast.success('Menu item updated!');
      } else {
        const url = API_ENDPOINTS.ADD_MENU_ITEM.replace(':restaurantId', String(ownerRestaurant.id));
        const { data } = await apiClient.post(url, {
          name: form.name,
          price: parseFloat(form.price),
          description: form.description,
          veg: form.veg,
          discount: discountNum,
        });
        setMenu(prev => [...prev, data.menuItem]);
        toast.success('Menu item added!');
      }
      setForm({ name: '', price: '', description: '', veg: false, discount: '0', discountAllItems: false });
      setEditingItem(null);
      setShowAiPanel(false);
      setAiSuggestions([]);
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || (editingItem ? 'Failed to update menu item' : 'Failed to add menu item'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: number) => {
    if (!ownerRestaurant) return;
    if (!window.confirm('Remove this menu item?')) return;
    try {
      const url = API_ENDPOINTS.DELETE_MENU_ITEM
        .replace(':restaurantId', String(ownerRestaurant.id))
        .replace(':itemId', String(itemId));
      await apiClient.delete(url);
      setMenu(prev => prev.filter(i => i.id !== itemId));
      localStorage.removeItem('menuCache');
      toast.success('Item removed');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove menu item');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    if (!ownerRestaurant) return;
    try {
      const url = API_ENDPOINTS.TOGGLE_MENU_ITEM_AVAILABILITY
        .replace(':restaurantId', String(ownerRestaurant.id))
        .replace(':itemId', String(item.id));
      console.log('[Toggle Availability] PATCH', url, 'item:', item.id, 'current is_available:', item.is_available);
      const res = await apiClient.patch(url);
      console.log('[Toggle Availability] Response:', res.data);
      const updated = res.data.menuItem;
      setMenu(prev => prev.map(i => i.id === item.id ? { ...i, is_available: updated.is_available } : i));
      toast.success(updated.is_available ? `${item.name} is now in stock` : `${item.name} marked as out of stock`);
    } catch (err: any) {
      console.error('[Toggle Availability] Error:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.error || 'Failed to update availability');
    }
  };

  const isLoading = loadingRestaurant || loadingMenu;

  const filteredMenu = menu.filter(item =>
    item.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSuggestDescriptions = async () => {
    if (!form.name.trim()) {
      toast.error('Enter the item name first.');
      return;
    }
    if (!ownerRestaurant?.name) {
      toast.error('Restaurant not found.');
      return;
    }
    setAiLoading(true);
    setShowAiPanel(true);
    setAiSuggestions([]);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.SUGGEST_ITEM_DESCRIPTION, {
        name: form.name,
        veg: form.veg,
        restaurantName: ownerRestaurant.name,
      });
      setAiSuggestions(data.descriptions || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate descriptions.');
      setShowAiPanel(false);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {!role.canAddMenuItem && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700 font-semibold">
          👁 You can browse the menu but cannot add or remove items.
        </div>
      )}

      <Card>
        <div className="flex justify-between items-center mb-1 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold">Menu Items</h2>
            {ownerRestaurant && (
              <p className="text-xs text-orange-500 font-semibold mt-0.5">{ownerRestaurant.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            {role.canAddMenuItem && ownerRestaurant && (
              <Btn onClick={() => {
                setEditingItem(null);
                setForm({ name: '', price: '', description: '', veg: false, discount: '0', discountAllItems: false });
                setShowAiPanel(false);
                setAiSuggestions([]);
                setShowForm(true);
              }}>
                + Add Menu Item
              </Btn>
            )}
          </div>
        </div>

        {!loadingRestaurant && !ownerRestaurant && (
          <div className="text-sm text-gray-500 py-4 text-center">
            No restaurant is assigned to your account yet. Please contact an admin.
          </div>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse">
            <thead><tr>
              <Th className="min-w-[180px]">Item</Th>
              <Th className="min-w-[110px] text-center">Price</Th>
              <Th className="min-w-[240px]">Description</Th>
              <Th className="min-w-[120px] text-center">Type</Th>
              <Th className="min-w-[160px] text-center">Stock</Th>
              {role.canDeleteMenuItem && <Th className="min-w-[160px] text-center">Actions</Th>}
            </tr></thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b border-gray-100">
                      <Td>
                        <Skeleton className="h-4 w-32 rounded" />
                      </Td>
                      <Td className="text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <Skeleton className="h-4 w-16 rounded" />
                          <Skeleton className="h-3 w-12 rounded-full" />
                        </div>
                      </Td>
                      <Td>
                        <Skeleton className="h-4 w-44 rounded" />
                      </Td>
                      <Td className="text-center">
                        <Skeleton className="h-4 w-14 rounded-full mx-auto" />
                      </Td>
                      <Td className="text-center">
                        <Skeleton className="h-7 w-28 rounded-full mx-auto" />
                      </Td>
                      {role.canDeleteMenuItem && (
                        <Td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Skeleton className="h-6 w-12 rounded" />
                            <Skeleton className="h-6 w-16 rounded" />
                          </div>
                        </Td>
                      )}
                    </tr>
                  ))}
                </>
              ) : filteredMenu.length === 0 ? (
                <tr>
                  <Td colSpan={role.canDeleteMenuItem ? 6 : 5} className="text-center text-gray-400 py-6">
                    {search.trim() ? `No menu items matching "${search}"` : 'No menu items yet. Add your first item!'}
                  </Td>
                </tr>
              ) : [...filteredMenu].sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0)).map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <Td className="font-semibold max-w-[180px]">
                    <div className="truncate" title={item.name}>
                      {item.name}
                    </div>
                  </Td>
                  <Td className="font-bold text-center">
                    <div>₹{Number(item.price).toFixed(2)}</div>
                    {item.discount && item.discount > 0 ? (
                      <span className="inline-block text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-extrabold px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                        {item.discount}% OFF
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-gray-500 max-w-[260px]">
                    <p className="line-clamp-2 text-xs leading-relaxed" title={item.description || ''}>
                      {item.description || '—'}
                    </p>
                  </Td>
                  <Td className="text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold ${item.veg
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                      }`}>
                      <span
                        className={`w-2 h-2 shrink-0 ${item.veg ? 'rounded-full bg-emerald-600' : 'bg-rose-700'}`}
                        style={item.veg ? {} : { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                      />
                      {item.veg ? 'Veg' : 'Non-Veg'}
                    </span>
                  </Td>
                  <Td className="text-center">
                    {role.canDeleteMenuItem ? (
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`inline-flex items-center justify-center gap-2 w-28 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${item.is_available === false
                          ? 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/70 dark:border-rose-800 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/80'
                          : 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/80'
                          }`}
                        title="Click to toggle stock status"
                      >
                        {item.is_available === false ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-700 dark:text-rose-400">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shadow-xs shrink-0" />
                        )}
                        <span>{item.is_available === false ? 'Out of Stock' : 'In Stock'}</span>
                      </button>
                    ) : (
                      <span className={`inline-flex items-center justify-center gap-2 w-28 py-1.5 rounded-full text-xs font-bold border ${item.is_available === false
                        ? 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/70 dark:border-rose-800 dark:text-rose-300'
                        : 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-300'
                        }`}>
                        {item.is_available === false ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-700 dark:text-rose-400">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shadow-xs shrink-0" />
                        )}
                        <span>{item.is_available === false ? 'Out of Stock' : 'In Stock'}</span>
                      </span>
                    )}
                  </Td>
                  {role.canDeleteMenuItem && (
                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded font-semibold transition cursor-pointer"
                          onClick={() => handleEditClick(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded font-semibold transition cursor-pointer"
                          onClick={() => handleDeleteMenuItem(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingItem(null);
                setShowAiPanel(false);
                setAiSuggestions([]);
                setForm({ name: '', price: '', description: '', veg: false, discount: '0', discountAllItems: false });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold border-none bg-transparent cursor-pointer"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-5 text-gray-900">{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h3>
            <div className="space-y-4">
              <div>
                <Label>Item Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Enter the name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (₹) *</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Enter the price"
                  />
                </div>
                <div>
                  <Label>Discount (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.discount}
                    onChange={e => setForm(p => ({ ...p, discount: e.target.value.replace(/\D/g, '') }))}
                    placeholder="e.g. 10"
                  />
                  {menu.length > 0 && (
                    <label className="mt-2 flex items-center gap-2 cursor-pointer select-none group">
                      <span
                        role="checkbox"
                        aria-checked={form.discountAllItems}
                        onClick={() => setForm(p => ({ ...p, discountAllItems: !p.discountAllItems }))}
                        className={`relative flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-150 ${form.discountAllItems
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-white border-gray-300 group-hover:border-orange-400'
                          }`}
                      >
                        {form.discountAllItems && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-xs font-semibold transition-colors ${form.discountAllItems ? 'text-orange-600' : 'text-gray-500 group-hover:text-gray-700'
                        }`}>
                        Apply this discount to all {menu.length} menu items
                      </span>
                    </label>
                  )}
                </div>
              </div>
              {!editingItem && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={form.veg}
                    onClick={() => setForm(p => ({ ...p, veg: !p.veg }))}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer border-0 ${form.veg ? 'bg-green-500' : 'bg-red-500'
                      }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${form.veg ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                  <span className={`text-sm font-semibold ${form.veg ? 'text-green-600' : 'text-red-500'}`}>
                    {form.veg ? 'Veg' : 'Non-Veg'}
                  </span>
                </div>
              )}
              <div className="relative" ref={aiPanelRef}>
                <div className="flex items-center justify-between mb-1">
                  <Label>Description</Label>
                  <button
                    type="button"
                    onClick={handleSuggestDescriptions}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed border-none bg-transparent cursor-pointer transition-colors"
                  >
                    {aiLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>

                        Recommender
                      </>
                    )}
                  </button>
                </div>

                <Input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Enter the description"
                />

                {showAiPanel && (
                  <div
                    className="absolute z-50 left-0 right-0 bottom-full mb-2 rounded-2xl border border-orange-200 bg-white overflow-hidden"
                    style={{ boxShadow: '0 -4px 32px 0 rgba(234,88,12,0.12), 0 2px 16px 0 rgba(0,0,0,0.08)' }}
                  >
                    <div className="flex items-start gap-2 px-4 py-2.5 bg-orange-600 border-b border-orange-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-white/90">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <p className="text-[11px] text-white/90 leading-snug">
                        AI may mention ingredients you don't use — <strong className="text-white">always verify</strong> before saving.
                      </p>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto">
                      {aiLoading ? (
                        <div className="py-8 flex flex-col items-center gap-2 text-xs text-gray-400">
                          <span className="w-5 h-5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                          Crafting descriptions...
                        </div>
                      ) : (
                        aiSuggestions.map((desc, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setForm(p => ({ ...p, description: desc }));
                              setShowAiPanel(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-start gap-3 cursor-pointer border-none border-b border-gray-100 bg-white"
                          >
                            <span className="flex-1 leading-relaxed">{desc}</span>
                            {i === 0 && (
                              <span className="shrink-0 self-start mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 whitespace-nowrap">
                                Best pick
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>



              <div className="flex gap-2 justify-end pt-2">
                <Btn variant="ghost" onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                  setShowAiPanel(false);
                  setAiSuggestions([]);
                  setForm({ name: '', price: '', description: '', veg: false, discount: '0', discountAllItems: false });
                }}>Cancel</Btn>
                <Btn onClick={handleSaveMenuItem} disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MenuPage;
