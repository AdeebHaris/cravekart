import { useState } from "react";
import toast from "react-hot-toast";
import apiClient from "../../Services/apiClient";
import { API_ENDPOINTS } from "../../config/api";
import { Card, Label, Input, Btn } from "./dashboardUI";

export function ProfilePage({ user }: { user: any }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await apiClient.put(API_ENDPOINTS.PROFILE, form);

      const updatedUser = { ...user, ...data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <h2 className="text-lg font-bold mb-1">Edit Profile</h2>
      <p className="text-sm text-gray-500 mb-5">Update your personal details.</p>

      <div className="space-y-4">
        <div>
          <Label>First Name</Label>
          <Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Btn>
        </div>
      </div>
    </Card>
  );
}

export default ProfilePage;
