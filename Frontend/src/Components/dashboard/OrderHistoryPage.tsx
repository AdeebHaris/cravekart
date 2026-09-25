import { useState, useEffect, useMemo } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import apiClient from "../../Services/apiClient";
import { API_ENDPOINTS } from "../../config/api";
import toast from "react-hot-toast";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  restaurant_name?: string;
}

interface Order {
  id: number;
  customer_name: string;
  address: string;
  total_price: number;
  status: string;
  payment_status?: string;
  payment_id?: string;
  created_at: string;
  items: OrderItem[];
  restaurant_name?: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
    preparing: {
      bg: "bg-amber-100/90 text-amber-800 border-amber-200",
      label: "Preparing",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    delivering: {
      bg: "bg-blue-100/90 text-blue-800 border-blue-200",
      label: "Delivering",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    out_for_delivery: {
      bg: "bg-blue-100/90 text-blue-800 border-blue-200",
      label: "Out for Delivery",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    delivered: {
      bg: "bg-emerald-100/90 text-emerald-800 border-emerald-200",
      label: "Delivered",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    cancelled: {
      bg: "bg-rose-100/90 text-rose-800 border-rose-200",
      label: "Cancelled",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    pending: {
      bg: "bg-gray-100 text-gray-700 border-gray-200",
      label: "Pending",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  };

  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${s.bg}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.GET_MY_ORDERS);
      setOrders(data.orders || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load order history");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const controller = new AbortController();
    const sseUrl = `${import.meta.env.VITE_API_BASE_URL}/orders/events`;

    fetchEventSource(sseUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      openWhenHidden: true,
      async onopen(response) {
        if (response.ok && response.headers.get("content-type")?.includes("text/event-stream")) {
          return;
        }
      },
      signal: controller.signal,
      onmessage(event) {
        if (!event.data || event.data.startsWith(":")) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ORDER_STATUS_UPDATED" || data.type === "ORDER_CREATED") {
            fetchOrders(false);
          }
        } catch (err) {
          console.error("Error parsing SSE event in OrderHistoryPage:", err);
        }
      },
      onerror(err) {
        console.warn("SSE order history connection error:", err);
      }
    }).catch((err) => {
      if (err.name !== "AbortError") {
        console.error("SSE order history connection error:", err);
      }
    });

    return () => controller.abort();
  }, []);

  const toggleOrder = (id: number) => {
    setExpandedOrders((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && ["preparing", "delivering", "out_for_delivery", "pending"].includes(order.status)) ||
        order.status === selectedStatus;

      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesStatus;

      const orderIdMatch = String(order.id).includes(query);
      const restaurantMatch = (order.restaurant_name || order.items?.[0]?.restaurant_name || "")
        .toLowerCase()
        .includes(query);
      const itemMatch = order.items?.some((item) =>
        item.name.toLowerCase().includes(query)
      );

      return matchesStatus && (orderIdMatch || restaurantMatch || itemMatch);
    });
  }, [orders, selectedStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const active = orders.filter((o) =>
      ["preparing", "delivering", "out_for_delivery", "pending"].includes(o.status)
    ).length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    return { total, delivered, active, totalSpent };
  }, [orders]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">My Order History</h1>
            <p className="text-orange-100 text-sm mt-1">
              Track and review all your past food orders & deliveries
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center gap-6">
            <div>
              <p className="text-xs text-orange-100 font-medium">Total Spent</p>
              <p className="text-xl font-black">₹{stats.totalSpent.toFixed(2)}</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-xs text-orange-100 font-medium">Total Orders</p>
              <p className="text-xl font-black">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <p className="text-xs text-gray-500 font-medium">All Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <p className="text-xs text-emerald-600 font-medium">Delivered</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.delivered}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <p className="text-xs text-amber-600 font-medium">Active / In Progress</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <p className="text-xs text-orange-600 font-medium">Average Order Value</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">
            ₹{stats.total > 0 ? (stats.totalSpent / stats.total).toFixed(2) : "0.00"}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-full md:w-auto">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "delivered", label: "Delivered" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                selectedStatus === tab.id
                  ? "bg-orange-500 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by Order ID, restaurant, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-800 text-base">No orders found</h3>
          <p className="text-gray-400 text-xs max-w-sm">
            {searchQuery || selectedStatus !== "all"
              ? "Try adjusting your search query or status filter."
              : "You haven't placed any food orders yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.includes(order.id);
            const dateStr = new Date(order.created_at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const restaurantName = order.restaurant_name || order.items?.[0]?.restaurant_name || "Restaurant";

            const itemsSubtotal = (order.items || []).reduce(
              (sum, item) => sum + Number(item.price) * Number(item.quantity),
              0
            );
            const tax = itemsSubtotal * 0.05;
            const deliveryFee = itemsSubtotal >= 300 ? 0 : 40;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
              >
                <div
                  onClick={() => toggleOrder(order.id)}
                  className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100/70 text-orange-600 flex items-center justify-center font-bold text-lg shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-gray-900">{restaurantName}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono">
                          #{order.id}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{dateStr}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <StatusBadge status={order.status} />
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total Paid</p>
                      <p className="text-base font-extrabold text-orange-600">
                        ₹{Number(order.total_price).toFixed(2)}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-orange-500" : ""}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/70 p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Ordered Items
                      </h4>
                      <div className="bg-white rounded-xl border border-gray-200/80 divide-y divide-gray-100">
                        {order.items?.map((item) => (
                          <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs">
                                {item.quantity}x
                              </span>
                              <span className="font-medium text-gray-900">{item.name}</span>
                            </div>
                            <span className="font-bold text-gray-800">
                              ₹{(Number(item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {order.address && (
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 text-xs">
                          <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">
                            Delivery Address
                          </p>
                          <p className="text-gray-800 font-medium leading-relaxed">{order.address}</p>
                        </div>
                      )}

                      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 text-xs space-y-1.5">
                        <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">
                          Payment Details
                        </p>
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span>₹{itemsSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Taxes & Delivery</span>
                          <span>₹{(tax + deliveryFee).toFixed(2)}</span>
                        </div>
                        {order.payment_id && (
                          <div className="flex justify-between text-gray-500 text-[11px] pt-1 border-t border-gray-100">
                            <span>Payment ID:</span>
                            <span className="font-mono text-gray-700">{order.payment_id}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm font-extrabold text-gray-900 pt-1 border-t border-gray-200">
                          <span>Total Amount</span>
                          <span className="text-orange-600">₹{Number(order.total_price).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
