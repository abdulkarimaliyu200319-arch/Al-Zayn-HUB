import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/profile', { name, phone, avatar: avatarPreview });
      setUser(res.data.user);
      localStorage.setItem('alzayn_user', JSON.stringify(res.data.user));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return toast.error('Fill in both password fields');
    setSavingPassword(true);
    try {
      const res = await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6">Profile Settings</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={saveProfile} className="card space-y-4">
          <h3 className="font-semibold">Personal Information</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-2xl">
              {avatarPreview ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" /> : '👤'}
            </div>
            <label className="btn-outline !py-2 !px-3 text-xs cursor-pointer">
              Upload Avatar
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <label className="label">Full Name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input-field bg-gray-50" value={user?.email} disabled />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary w-full">{savingProfile ? 'Saving...' : 'Save Changes'}</button>
        </form>

        <form onSubmit={changePassword} className="card space-y-4">
          <h3 className="font-semibold">Change Password</h3>
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary w-full">{savingPassword ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}
