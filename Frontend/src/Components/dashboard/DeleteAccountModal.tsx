import React, { useState } from "react";
import toast from "react-hot-toast";
import { authService } from "../../Services/authService";
import { useAppDispatch } from "../Hooks/hooks";
import { clearCartLocal } from "../Redux/Slices/cartSlice";
import { useNavigate } from "react-router-dom";

export interface DeleteAccountModalProps {
  onClose: () => void;
}

export function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isConfirmed = confirmText.trim().toLowerCase() === "delete";

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setDeleting(true);
    try {
      await authService.deleteAccount();
      dispatch(clearCartLocal());
      toast.success("Account deleted successfully.");
      onClose();
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-gray-100 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Delete Account</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer border-none bg-transparent text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleDelete} className="space-y-3.5">
          <p className="text-xs text-gray-600 leading-relaxed">
            This action cannot be undone. To permanently delete your account, type <span className="font-bold text-gray-900">delete</span> below.
          </p>

          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type "delete"'
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
            autoFocus
          />

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || deleting}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              {deleting && (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeleteAccountModal;
