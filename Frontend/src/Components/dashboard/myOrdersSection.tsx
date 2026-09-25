import { useState, useEffect } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import apiClient from "../../Services/apiClient";
import { API_ENDPOINTS } from "../../config/api";
import toast from "react-hot-toast";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  restaurant_name: string;
}

interface Order {
  id: number;
  customer_name: string;
  address: string;
  total_price: number;
  status: string;
  payment_status: string;
  payment_id: string;
  created_at: string;
  items: OrderItem[];
  restaurant_name?: string;
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    preparing: { bg: "bg-amber-100", text: "text-amber-700", label: "Preparing", icon: <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg> },
    delivering: { bg: "bg-blue-100", text: "text-blue-700", label: "Delivering", icon: <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M10 6H6.83L5 9h5V6z" /><path d="M20 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /></svg> },
    out_for_delivery: { bg: "bg-blue-100", text: "text-blue-700", label: "Out for Delivery", icon: <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M10 6H6.83L5 9h5V6z" /><path d="M20 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /></svg> },
    delivered: { bg: "bg-green-100", text: "text-green-700", label: "Delivered", icon: <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled", icon: <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> },
    pending: { bg: "bg-gray-100", text: "text-gray-600", label: "Pending", icon: <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export function MyOrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.GET_MY_ORDERS);
      setOrders(data.orders || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load orders");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const controller = new AbortController();
    const sseUrl = `${import.meta.env.VITE_API_BASE_URL}/orders/events`;

    fetchEventSource(sseUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      openWhenHidden: true,
      async onopen(response) {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          return;
        }
      },
      signal: controller.signal,
      onmessage(event) {
        if (!event.data || event.data.startsWith(':')) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ORDER_STATUS_UPDATED' || data.type === 'ORDER_CREATED') {
            fetchOrders(false);
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      },
      onerror(err) {
        console.warn('SSE customer orders connection error:', err);
      }
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('SSE customer orders connection error:', err);
      }
    });

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 mt-2">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <p className="text-gray-500 font-semibold text-sm">No orders yet</p>
        <p className="text-gray-400 text-xs text-center max-w-[200px]">Your placed orders will appear here once you checkout.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2 max-h-[520px] overflow-y-auto scrollbar-hide pr-1">
      {orders.map(order => {
        const isExpanded = expandedOrders.includes(order.id);
        const date = new Date(order.created_at).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        const hotelName = order.restaurant_name || order.items?.[0]?.restaurant_name;

        const itemsSubtotal = (order.items || []).reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity), 0
        );
        const tax = itemsSubtotal * 0.05;
        const deliveryFee = itemsSubtotal >= 300 ? 0 : 40;

        return (
          <div
            key={order.id}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200"
          >
            <button
              onClick={() => toggleOrder(order.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer text-left gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5 truncate">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 shrink-0">
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                      <path d="M7 2v20" />
                      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                    </svg>
                    {hotelName || `Order #${order.id}`}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">{date}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <OrderStatusBadge status={order.status} />
                {!isExpanded && (
                  <span className="font-bold text-gray-900 text-sm">₹{Number(order.total_price).toFixed(2)}</span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-orange-500' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-3">
                {hotelName && (
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                  </div>
                )}

                {/* {order.address && (
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="font-bold text-gray-500 uppercase tracking-wide text-[10px]">Deliver To:</span>
                    <span className="truncate">{order.address}</span>
                  </div>
                )} */}

                {order.items && order.items.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-800">
                          <strong className="text-orange-600 mr-1.5">{item.quantity}x</strong>
                          {item.name}
                        </span>
                        <span className="font-semibold text-gray-700">₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-200/80 pt-2.5 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{itemsSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes & Fees</span>
                    <span>₹{(tax + deliveryFee).toFixed(2)} {deliveryFee === 0 ? '(Free Delivery)' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 font-extrabold text-sm text-gray-900">
                    <span>Total Paid</span>
                    <span className="text-orange-600">₹{Number(order.total_price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MyOrdersSection;
