import type { ReactNode } from 'react';

export type RoleKey = "super_admin" | "admin" | "owner" | "user" | "delivery_partner";
export type NavId = "dashboard" | "restaurants" | "orders" | "menu" | "users" | "profile";
export type BadgeStatus = "active" | "pending" | "inactive" | "delivering" | "preparing" | "delivered" | "cancelled" | RoleKey;
export type BtnVariant = "primary" | "ghost" | "danger";
export type BtnSize = "md" | "sm";

export interface RoleDefinition {
  label: string;
  nav: NavId[];
  canDemoteAdmin: boolean;
  canManageAllUsers: boolean;
  canAddRestaurant: boolean;
  canDeleteRestaurant: boolean;
  canEditRestaurant: boolean;
  canAddMenuItem: boolean;
  canDeleteMenuItem: boolean;
  canViewOrders: boolean;
  avatarColor: string;
  badgeClass: string;
}

export interface Restaurant {
  id: number;
  name: string;
  cuisine?: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  img?: string;
  photo_url?: string;
  place_id?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  restaurant?: string;
  category?: string;
  price: string | number;
  description?: string;
  veg?: boolean;
  is_available?: boolean;
  discount?: number;
  restaurant_id?: number;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: RoleKey;
  username?: string;
  first_name?: string;
  last_name?: string;
  owned_restaurants?: { id: number; name: string }[];
}

export const ROLES: Record<RoleKey, RoleDefinition> = {
  super_admin: {
    label: "Super Admin", avatarColor: "bg-purple-600", badgeClass: "bg-purple-100 text-purple-700",
    nav: ["dashboard", "restaurants", "users"],
    canDemoteAdmin: true, canManageAllUsers: true,
    canAddRestaurant: true, canDeleteRestaurant: true, canEditRestaurant: true,
    canAddMenuItem: false, canDeleteMenuItem: false, canViewOrders: true,
  },
  admin: {
    label: "Admin", avatarColor: "bg-orange-500", badgeClass: "bg-orange-100 text-orange-700",
    nav: ["dashboard", "restaurants", "users"],
    canDemoteAdmin: false, canManageAllUsers: true,
    canAddRestaurant: true, canDeleteRestaurant: true, canEditRestaurant: true,
    canAddMenuItem: false, canDeleteMenuItem: false, canViewOrders: true,
  },
  owner: {
    label: "Restaurant Owner", avatarColor: "bg-blue-600", badgeClass: "bg-blue-100 text-blue-700",
    nav: ["dashboard", "menu", "orders"],
    canDemoteAdmin: false, canManageAllUsers: false,
    canAddRestaurant: false, canDeleteRestaurant: false, canEditRestaurant: true,
    canAddMenuItem: true, canDeleteMenuItem: true, canViewOrders: true,
  },
  user: {
    label: "User", avatarColor: "bg-green-600", badgeClass: "bg-green-100 text-green-700",
    nav: ["dashboard", "profile"],
    canDemoteAdmin: false, canManageAllUsers: false,
    canAddRestaurant: false, canDeleteRestaurant: false, canEditRestaurant: false,
    canAddMenuItem: false, canDeleteMenuItem: false, canViewOrders: true,
  },
  delivery_partner: {
    label: "Delivery Partner", avatarColor: "bg-teal-600", badgeClass: "bg-teal-100 text-teal-700",
    nav: ["dashboard", "orders"],
    canDemoteAdmin: false, canManageAllUsers: false,
    canAddRestaurant: false, canDeleteRestaurant: false, canEditRestaurant: false,
    canAddMenuItem: false, canDeleteMenuItem: false, canViewOrders: true,
  },
};

export const NAV: { id: NavId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { id: "restaurants", label: "Restaurants", icon: <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg> },
  { id: "menu", label: "Menu", icon: <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
  { id: "orders", label: "Orders", icon: <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg> },
  { id: "users", label: "Users & Roles", icon: <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { id: "profile", label: "My Profile", icon: <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
];

export function Badge({ status }: { status: BadgeStatus | string }) {
  const cls: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700",
    admin: "bg-orange-100 text-orange-700",
    owner: "bg-blue-100 text-blue-700",
    restaurant_owner: "bg-blue-100 text-blue-700",
    user: "bg-green-100 text-green-700",
    delivery_partner: "bg-teal-100 text-teal-700",
  };
  const labels: Record<string, string> = {
    super_admin: "Super Admin", admin: "Admin", owner: "Owner",
    restaurant_owner: "Owner", user: "User", delivery_partner: "Delivery Partner",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${cls[status] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  const hasAlign = className.includes('text-center') || className.includes('text-right') || className.includes('text-left');
  return (
    <th className={`${hasAlign ? '' : 'text-left'} text-[11px] font-bold text-gray-500 tracking-wide uppercase px-3.5 py-2.5 border-b border-gray-200 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "", colSpan, title }: { children: ReactNode; className?: string; colSpan?: number; title?: string }) {
  return (
    <td title={title} colSpan={colSpan} className={`px-3.5 py-3 text-[13px] border-b border-gray-100 ${className}`}>
      {children}
    </td>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", size = "md", disabled, className = "", title }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const base = "font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = { md: "px-4 py-2 text-[13px]", sm: "px-3 py-1.5 text-[12px]" };
  const variants = {
    primary: "bg-orange-500 text-white border-none hover:bg-orange-600 shadow-sm rounded-lg",
    ghost: "bg-transparent border border-gray-200 text-gray-800 hover:bg-gray-50 rounded-lg",
    danger: "bg-red-600 text-white border-none hover:bg-red-700 shadow-sm rounded-md",
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Input({ value, onChange, placeholder, type = "text", min, max }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; min?: string | number; max?: string | number;
}) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">{children}</label>;
}
