import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import apiClient from '../../Services/apiClient';
import { API_ENDPOINTS } from '../../config/api';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  name: string;
  price: number | string;
  quantity: number;
  restaurant_name: string;
}

interface DeliveryOrder {
  id: number;
  customer_name: string;
  customer_username?: string;
  phone_number?: string;
  address: string;
  total_price: number | string;
  status: string;
  created_at: string;
  picked_at?: string;
  delivered_at?: string;
  items: OrderItem[];
}

type TabType = 'available' | 'my-deliveries';


function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text?: string; label: string; icon: React.ReactNode }> = {
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

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 bg-white rounded-xl border border-gray-200">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center">
        {icon}
      </div>
      <p className="font-bold text-gray-700 text-sm">{title}</p>
      <p className="text-xs text-gray-400 text-center max-w-[220px]">{subtitle}</p>
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  action,
}: {
  order: DeliveryOrder;
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
            <p className="text-xs text-gray-500 mt-0.5 truncate">
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
            <div className="text-xs text-gray-700 flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-gray-200">
              <div className="flex items-start gap-2 min-w-0">
                <span className="font-bold text-gray-400 uppercase tracking-wide text-[10px] shrink-0 pt-0.5">
                  Deliver To:
                </span>
                <span className="truncate">{order.address}</span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md transition-colors shrink-0"
              >
                <span>Google Maps</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {order.phone_number && (
            <div className="text-xs text-gray-700 flex items-center justify-between gap-2 p-2.5 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-500 uppercase tracking-wide text-[10px]">
                  Customer Phone:
                </span>
                <span className="font-bold text-gray-900 font-mono text-xs">{order.phone_number}</span>
              </div>
              <a
                href={`tel:${order.phone_number}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold text-xs transition-colors decoration-none shadow-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call Customer
              </a>
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

          <div className="pt-1 space-y-1">
            {order.picked_at && (
              <p className="text-[10px] text-gray-400">
                Picked up:{' '}
                {new Date(order.picked_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            {order.delivered_at && (
              <p className="text-[10px] text-green-600 font-semibold">
                ✅ Delivered:{' '}
                {new Date(order.delivered_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryOrdersPage() {
  const [tab, setTab] = useState<TabType>('available');
  const [available, setAvailable] = useState<DeliveryOrder[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState<number | null>(null);
  const [delivering, setDelivering] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [availRes, myRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.GET_AVAILABLE_ORDERS),
        apiClient.get(API_ENDPOINTS.GET_MY_DELIVERIES),
      ]);
      setAvailable(availRes.data.orders || []);
      setMyDeliveries(myRes.data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

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
          if (['ORDER_STATUS_UPDATED', 'ORDER_CREATED', 'DELIVERY_UPDATED'].includes(data.type)) {
            fetchData(false);
          }
        } catch (err) {
          console.error('Error parsing SSE event', err);
        }
      },
      onerror(err) {
        console.warn('SSE delivery connection error:', err);
      }
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('SSE delivery connection error:', err);
      }
    });

    return () => controller.abort();
  }, []);

  const toggleExpand = (id: number) =>
    setExpanded(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handlePick = async (orderId: number) => {
    setPicking(orderId);
    try {
      const url = API_ENDPOINTS.PICK_ORDER.replace(':id', String(orderId));
      const { data } = await apiClient.patch(url);
      setAvailable(prev => prev.filter(o => o.id !== orderId));
      setMyDeliveries(prev => [data.order, ...prev]);
      toast.success(`Order #${orderId} picked up! 🚴`);
      setTab('my-deliveries');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Order no longer available');
    } finally {
      setPicking(null);
    }
  };

  const handleDeliver = async (orderId: number) => {
    setDelivering(orderId);
    try {
      const url = API_ENDPOINTS.DELIVER_ORDER.replace(':id', String(orderId));
      const { data } = await apiClient.patch(url);
      setMyDeliveries(prev =>
        prev.map(o => o.id === orderId ? { ...o, ...data.order } : o)
      );
      toast.success(`Order #${orderId} delivered! ✅`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to mark as delivered');
    } finally {
      setDelivering(null);
    }
  };

  const activeDeliveries = myDeliveries.filter(o => o.status === 'out_for_delivery');
  const completedDeliveries = myDeliveries.filter(o => o.status === 'delivered');

  const tabs: { id: TabType; label: string; badge: number }[] = [
    { id: 'available', label: 'Available Orders', badge: available.length },
    { id: 'my-deliveries', label: 'My Deliveries', badge: activeDeliveries.length },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            label: 'Active Deliveries',
            value: activeDeliveries.length,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            icon: (
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M10 6H6.83L5 9h5V6z" /><path d="M20 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /></svg>
              </div>
            )
          },
          {
            label: 'Total Delivered',
            value: completedDeliveries.length,
            color: 'text-green-600',
            bg: 'bg-green-50',
            icon: (
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
            )
          },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-gray-100 p-4 flex items-center gap-4`}>
            {s.icon}
            <div>
              <p className={`text-2xl font-extrabold ${s.color}`}>
                {loading ? '…' : s.value}
              </p>
              <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border-none ${tab === t.id
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-600'
                }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[72px] bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>

      ) : tab === 'available' ? (
        available.length === 0 ? (
          <EmptyState
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>}
            title="No orders available right now"
            subtitle="All orders are currently assigned. Check back soon."
          />
        ) : (
          <div className="space-y-3">
            {available.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expanded.includes(order.id)}
                onToggle={() => toggleExpand(order.id)}
                action={
                  <button
                    onClick={() => handlePick(order.id)}
                    disabled={picking === order.id}
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer border-none whitespace-nowrap"
                  >
                    {picking === order.id
                      ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M10 6H6.83L5 9h5V6z" /><path d="M20 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /></svg>
                    }
                    {picking === order.id ? 'Picking…' : 'Pick Up'}
                  </button>
                }
              />
            ))}
          </div>
        )

      ) : (
        <div className="space-y-6">

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Active — Out for Delivery ({activeDeliveries.length})
            </p>
            {activeDeliveries.length === 0 ? (
              <EmptyState
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M10 6H6.83L5 9h5V6z" /><path d="M20 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /></svg>}
                title="No active deliveries"
                subtitle="Pick up an order from Available Orders tab to start."
              />
            ) : (
              <div className="space-y-3">
                {activeDeliveries.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expanded.includes(order.id)}
                    onToggle={() => toggleExpand(order.id)}
                    action={
                      <button
                        onClick={() => handleDeliver(order.id)}
                        disabled={delivering === order.id}
                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer border-none whitespace-nowrap"
                      >
                        {delivering === order.id
                          ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        }
                        {delivering === order.id ? 'Delivering…' : 'Mark Delivered'}
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {completedDeliveries.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Delivered History ({completedDeliveries.length})
              </p>
              <div className="space-y-3">
                {completedDeliveries.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expanded.includes(order.id)}
                    onToggle={() => toggleExpand(order.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {myDeliveries.length === 0 && (
            <EmptyState
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
              title="No deliveries yet"
              subtitle="Your picked and delivered orders will appear here."
            />
          )}
        </div>
      )}
    </div>
  );
}
