'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { BarChart3, Package, AlertCircle, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const { user, loading, isManager } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    scheduledTransfers: 0,
  });
  const [loadingData, setLoadingData] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);

      const [productsRes, receiptsRes, deliveriesRes, transfersRes] = await Promise.all([
        axios.get('/api/product').catch(err => {
          console.error('Product API error:', err);
          return { data: { products: [] } };
        }),
        axios.get('/api/receipt').catch(err => {
          console.error('Receipt API error:', err);
          return { data: { receipts: [] } };
        }),
        axios.get('/api/delivery').catch(err => {
          console.error('Delivery API error:', err);
          return { data: { deliveries: [] } };
        }),
        axios.get('/api/transfer').catch(err => {
          console.error('Transfer API error:', err);
          return { data: { transfers: [] } };
        }),
      ]);

      const products = (productsRes?.data?.products) || [];
      const receipts = (receiptsRes?.data?.receipts) || [];
      const deliveries = (deliveriesRes?.data?.deliveries) || [];
      const transfers = (transfersRes?.data?.transfers) || [];

      console.log('Dashboard data fetched:', {
        productsCount: products.length,
        receiptsCount: receipts.length,
        deliveriesCount: deliveries.length,
        transfersCount: transfers.length,
      });

      // Calculate KPIs
      const totalProducts = products.length;

      // Low stock items (less than 10 units in any warehouse)
      const lowStockItems = products.filter(product => {
        const totalStock = product.stocks?.reduce((sum, stock) => sum + stock.quantity, 0) || 0;
        return totalStock < 10;
      }).length;

      // Pending receipts (draft status)
      const pendingReceipts = receipts.filter(r => r.status === 'draft').length;

      // Pending deliveries (draft status)
      const pendingDeliveries = deliveries.filter(d => d.status === 'draft').length;

      // Scheduled transfers (draft status)
      const scheduledTransfers = transfers.filter(t => t.status === 'draft').length;

      setDashboardData({
        totalProducts,
        lowStockItems,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
      });

      // Build recent activity from all operations
      const activities = [];

      receipts.slice(0, 3).forEach(r => {
        activities.push({
          id: `receipt-${r.id}`,
          type: 'Receipt',
          description: `Receipt from ${r.supplier}`,
          status: r.status,
          date: new Date(r.receiptDate),
        });
      });

      deliveries.slice(0, 3).forEach(d => {
        activities.push({
          id: `delivery-${d.id}`,
          type: 'Delivery',
          description: `Delivery to ${d.customer || 'Customer'}`,
          status: d.status,
          date: new Date(d.createdAt),
        });
      });

      transfers.slice(0, 3).forEach(t => {
        activities.push({
          id: `transfer-${t.id}`,
          type: 'Transfer',
          description: `Transfer from ${t.fromWarehouse?.name} to ${t.toWarehouse?.name}`,
          status: t.status,
          date: new Date(t.createdAt),
        });
      });

      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 5));
      setLoadingData(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoadingData(false);
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">
            {isManager ? 'Welcome back, Manager! Here is your inventory overview.' : 'Welcome back! Here is your inventory overview.'}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 hover:border-purple-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Products</p>
                <p className="text-4xl font-bold mt-3 text-white">{dashboardData.totalProducts}</p>
              </div>
              <Package className="w-12 h-12 text-[#b976ff] opacity-30" />
            </div>
          </div>

          <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 hover:border-orange-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Low Stock Items</p>
                <p className="text-4xl font-bold mt-3 text-white">{dashboardData.lowStockItems}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-500 opacity-30" />
            </div>
          </div>

          <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 hover:border-green-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Pending Receipts</p>
                <p className="text-4xl font-bold mt-3 text-white">{dashboardData.pendingReceipts}</p>
              </div>
              <ArrowDownToLine className="w-12 h-12 text-green-500 opacity-30" />
            </div>
          </div>

          <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 hover:border-blue-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Pending Deliveries</p>
                <p className="text-4xl font-bold mt-3 text-white">{dashboardData.pendingDeliveries}</p>
              </div>
              <ArrowUpFromLine className="w-12 h-12 text-blue-500 opacity-30" />
            </div>
          </div>

          <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 hover:border-cyan-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Scheduled Transfers</p>
                <p className="text-4xl font-bold mt-3 text-white">{dashboardData.scheduledTransfers}</p>
              </div>
              <Shuffle className="w-12 h-12 text-cyan-500 opacity-30" />
            </div>
          </div>
        </div>

        {/* Recent Activity & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-[#292b3b] rounded-lg border border-gray-800 p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Recent Activity
            </h2>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-[#24253A] rounded-lg hover:bg-[#2d2f3b] transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{activity.type}: {activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.date.toLocaleDateString()} {activity.date.toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      activity.status === 'validated' || activity.status === 'completed'
                        ? 'bg-green-500 bg-opacity-20 text-green-400'
                        : 'bg-yellow-500 bg-opacity-20 text-yellow-400'
                    }`}>
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="bg-gradient-to-br from-[#292b3b] to-[#24253A] rounded-lg border border-gray-800 p-6">
            <h2 className="text-2xl font-bold mb-6">Account Info</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">Email</p>
                <p className="font-semibold break-all">{user?.email || 'Loading...'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Role</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  isManager 
                    ? 'bg-[#b976ff] bg-opacity-20 text-[#b976ff]' 
                    : 'bg-green-500 bg-opacity-20 text-green-400'
                }`}>
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Loading...'}
                </span>
              </div>
              {isManager && (
                <div className="pt-4 border-t border-gray-700 mt-6">
                  <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Manager Access</p>
                  <ul className="text-xs space-y-2 text-gray-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#b976ff] rounded-full"></span>
                      Product Management
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#b976ff] rounded-full"></span>
                      All Operations
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#b976ff] rounded-full"></span>
                      Settings & Reports
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
