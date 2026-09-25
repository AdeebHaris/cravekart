import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../../Services/apiClient';
import { API_ENDPOINTS } from '../../config/api';
import toast from 'react-hot-toast';
import { Skeleton } from '../ui/skeleton';

interface OrderItem {
  id: number;
  name: string;
  price: number | string;
  quantity: number;
  restaurant_name: string;
}

interface OwnerOrder {
  id: number;
  customer_name: string;
  customer_username?: string;
  address: string;
  total_price: number | string;
  status: string;
  created_at: string;
  picked_at?: string;
  delivered_at?: string;
  restaurant_name?: string;
  items: OrderItem[];
}

type TabType = 'all' | 'preparing' | 'ready_to_deliver' | 'out_for_delivery' | 'delivered';

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    preparing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Preparing', icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    ready_to_deliver: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Ready for Pickup', icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg> },
    out_for_delivery: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Out for Delivery', icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M10 6H6.83L5 9h5V6z" /><path d="M20 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /></svg> },
    delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Delivered', icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled', icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> },
  };
  const s = map[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status, icon: '•' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>
      {s.icon} {s.label}
    </span>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  action,
}: {
  order: OwnerOrder;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
}) {
  const date = new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left cursor-pointer bg-transparent border-none min-w-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-gray-900">Order #{order.id}</span>
              <StatusPill status={order.status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {date} · {order.customer_name}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-bold text-gray-900 text-sm">
              ₹{Number(order.total_price).toFixed(2)}
            </span>
            <div className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </button>

        {action && <div className="shrink-0 ml-1">{action}</div>}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-3">
          {order.address && (
            <div className="text-xs text-gray-700 flex items-start gap-2">
              <span className="font-bold text-gray-400 uppercase tracking-wide text-[10px] shrink-0 pt-0.5">
                Deliver To
              </span>
              <span>{order.address}</span>
            </div>
          )}

          {order.items && order.items.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-800">
                    <strong className="text-orange-600 mr-1.5">{item.quantity}×</strong>
                    {item.name}
                  </span>
                  <span className="font-semibold text-gray-700">
                    ₹{(Number(item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OwnerOrdersPage() {
  const [tab, setTab] = useState<TabType>('all');
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);

  const fetchOrders = async (showLoading = true) => {

    if (showLoading) setLoading(true)
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.GET_OWNER_ORDERS);
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {

    fetchOrders(true);

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const sseUrl = `${import.meta.env.VITE_API_BASE_URL}/orders/events?token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ORDER_STATUS_UPDATED' || data.type === 'ORDER_CREATED') {
          fetchOrders(false);
        }
      } catch (err) {
        console.error('Eror parsing SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection interrupted, retrying connection...');
    };

    return () => {
      eventSource.close();
    }
  }, []);

  const toggleExpand = (id: number) =>
    setExpanded(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleMarkReady = async (orderId: number) => {
    setUpdating(orderId);
    try {
      const url = API_ENDPOINTS.UPDATE_ORDER_STATUS.replace(':id', String(orderId));
      const { data } = await apiClient.patch(url, { status: 'ready_to_deliver' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: data.order.status } : o));
      toast.success(`Order #${orderId} marked as Ready to Deliver! 📦`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = tab === 'all' ? orders : orders.filter(o => o.status === tab);

  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready_to_deliver').length;
  const outCount = orders.filter(o => o.status === 'out_for_delivery').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'all', label: 'All Orders', count: orders.length },
    { id: 'preparing', label: 'Preparing', count: preparingCount },
    { id: 'ready_to_deliver', label: 'Ready for Pickup', count: readyCount },
    { id: 'out_for_delivery', label: 'Out for Delivery', count: outCount },
    { id: 'delivered', label: 'Delivered', count: deliveredCount },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border-none ${tab === t.id
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            {t.label}
            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Skeleton className="h-4 w-14 rounded" />
                  <Skeleton className="w-6 h-6 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 bg-white rounded-xl border border-gray-200">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          </div>
          <p className="font-bold text-gray-700 text-sm">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expanded.includes(order.id)}
              onToggle={() => toggleExpand(order.id)}
              action={
                order.status === 'preparing' ? (
                  <button
                    onClick={() => handleMarkReady(order.id)}
                    disabled={updating === order.id}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer border-none whitespace-nowrap"
                  >
                    {updating === order.id
                      ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                    }
                    {updating === order.id ? 'Updating…' : 'Mark Ready'}
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
