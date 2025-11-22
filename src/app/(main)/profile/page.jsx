'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User, Lock, Mail, Shield, AlertCircle, Check } from 'lucide-react';
import axios from 'axios';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.email) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
      });
    }
  }, [user]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill all password fields' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.patch('/api/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to change password';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#24253A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#24253A] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-[#b976ff] border-b-2 border-[#b976ff]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </div>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-[#b976ff] border-b-2 border-[#b976ff]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </div>
          </button>
        </div>

        {/* Profile Information Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#b976ff] to-[#7864EF] rounded-full flex items-center justify-center mb-4">
                    <User className="w-10 h-10" />
                  </div>
                  <p className="font-semibold text-lg">{user.email}</p>
                  <span className={`mt-3 px-4 py-2 rounded-full text-sm font-semibold ${
                    user.role === 'manager'
                      ? 'bg-[#b976ff] bg-opacity-20 text-[#b976ff]'
                      : 'bg-green-500 bg-opacity-20 text-green-400'
                  }`}>
                    {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                  </span>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Shield className="w-5 h-5 text-[#b976ff]" />
                    <span className="text-sm">Account verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm">2-Factor Auth: Disabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2 bg-[#292b3b] rounded-lg border border-gray-800 p-6">
              <h2 className="text-2xl font-bold mb-6">Account Details</h2>
              
              {message.text && (
                <div
                  className={`mb-6 p-4 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-[#402040] border-[#b976ff] text-[#ff297a]'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm mb-2 font-medium">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 bg-[#24253A] border border-gray-700 rounded-lg px-4 py-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="flex-1 bg-transparent text-gray-300 outline-none cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2 font-medium">
                    User Role
                  </label>
                  <div className="flex items-center gap-3 bg-[#24253A] border border-gray-700 rounded-lg px-4 py-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Loading...'}
                      disabled
                      className="flex-1 bg-transparent text-gray-300 outline-none cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Role is managed by administrators</p>
                </div>

                <div className="pt-4">
                  <p className="text-xs text-gray-400">
                    Need to update your information? Contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Change Password
            </h2>

            {message.text && (
              <div
                className={`mb-6 p-4 rounded-lg border ${
                  message.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-[#402040] border-[#b976ff] text-[#ff297a]'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#b976ff] outline-none transition-all"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#b976ff] outline-none transition-all"
                  placeholder="Enter your new password"
                />
                <p className="text-xs text-gray-400 mt-2">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#b976ff] outline-none transition-all"
                  placeholder="Confirm your new password"
                />
              </div>

              <div className="bg-[#24253A] border border-gray-700 rounded-lg p-4 mt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium mb-1">Password Requirements:</p>
                    <ul className="text-xs space-y-1 text-gray-400">
                      <li>• At least 6 characters long</li>
                      <li>• Should be unique and hard to guess</li>
                      <li>• You will need to log in again after changing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[#b976ff] to-[#7864EF] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setMessage({ type: '', text: '' });
                  }}
                  className="flex-1 bg-[#24253A] border border-gray-700 text-gray-300 font-bold py-3 rounded-lg hover:bg-[#2d2f3b] transition-all"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
