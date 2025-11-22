'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function SettingsPage() {
  const { user, loading, isAuthenticated, isManager } = useAuth();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: '' });
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWarehouses();
    }
  }, [isAuthenticated]);

  const fetchWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      setMessage({ type: '', text: '' });
      const response = await axios.get('/api/warehouse');
      setWarehouses(response.data?.warehouses || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setMessage({ type: 'error', text: 'Failed to fetch warehouses' });
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    if (!newWarehouse.name.trim()) {
      setMessage({ type: 'error', text: 'Warehouse name is required' });
      return;
    }

    try {
      setLoadingWarehouses(true);
      const response = await axios.post('/api/warehouse', {
        name: newWarehouse.name.trim(),
      });
      
      setWarehouses([...warehouses, response.data?.warehouse || { id: Math.random(), name: newWarehouse.name }]);
      setNewWarehouse({ name: '' });
      setShowAddWarehouse(false);
      setMessage({ type: 'success', text: 'Warehouse created successfully' });
    } catch (error) {
      console.error('Error creating warehouse:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create warehouse' });
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleDeleteWarehouse = async (id) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) {
      return;
    }

    try {
      setLoadingWarehouses(true);
      await axios.delete(`/api/warehouse?id=${id}`);
      setWarehouses(warehouses.filter(w => w.id !== id));
      setMessage({ type: 'success', text: 'Warehouse deleted successfully' });
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete warehouse' });
    } finally {
      setLoadingWarehouses(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#24253A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#24253A] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage warehouses and system configuration</p>
        </div>

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

        <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Warehouses</h2>
            <button
              onClick={() => setShowAddWarehouse(!showAddWarehouse)}
              className="bg-gradient-to-r from-[#b976ff] to-[#7864EF] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Warehouse
            </button>
          </div>

          {showAddWarehouse && (
            <form onSubmit={handleAddWarehouse} className="mb-6 p-4 bg-[#24253A] rounded-lg border border-gray-700">
              <div className="mb-4">
                <label className="block text-gray-300 text-sm mb-2 font-medium">Warehouse Name</label>
                <input
                  type="text"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ name: e.target.value })}
                  placeholder="e.g., Main Warehouse, Distribution Center"
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[#b976ff] outline-none placeholder-gray-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loadingWarehouses}
                  className="flex-1 bg-gradient-to-r from-[#b976ff] to-[#7864EF] text-white font-bold py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {loadingWarehouses ? 'Creating...' : 'Create Warehouse'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddWarehouse(false);
                    setNewWarehouse({ name: '' });
                  }}
                  className="flex-1 bg-[#24253A] border border-gray-700 text-gray-300 font-bold py-2 rounded-lg hover:bg-[#2d2f3b] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loadingWarehouses && !showAddWarehouse ? (
            <div className="p-6 text-center text-gray-400">Loading warehouses...</div>
          ) : warehouses.length === 0 ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-2 opacity-50" />
              <p className="text-gray-400">No warehouses configured. Add one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warehouses.map(warehouse => (
                <div key={warehouse.id} className="bg-[#24253A] p-4 rounded-lg border border-gray-700 flex items-center justify-between hover:border-gray-600 transition-colors">
                  <div>
                    <h3 className="text-lg font-semibold">{warehouse.name}</h3>
                    <p className="text-xs text-gray-400">ID: {warehouse.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteWarehouse(warehouse.id)}
                      className="p-2 text-red-400 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-colors"
                      title="Delete warehouse"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">System Information</h2>
          <div className="space-y-4">
            <div className="bg-[#24253A] p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Your Role</p>
              <p className="text-xl font-semibold capitalize">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  isManager 
                    ? 'bg-[#b976ff] bg-opacity-20 text-[#b976ff]' 
                    : 'bg-green-500 bg-opacity-20 text-green-400'
                }`}>
                  {user?.role || 'Loading...'}
                </span>
              </p>
            </div>
            <div className="bg-[#24253A] p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Warehouses Count</p>
              <p className="text-xl font-semibold">{warehouses.length}</p>
            </div>
          </div>
        </div>

        {!isManager && (
          <div className="bg-yellow-500 bg-opacity-10 border border-yellow-600 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-400 mb-1">Limited Access</h3>
                <p className="text-yellow-300 text-sm">You have staff access. Some settings and management features are only available to managers.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
