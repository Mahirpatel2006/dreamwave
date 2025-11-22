'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Filter, X } from 'lucide-react';
import axios from 'axios';

export default function MovesPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [filters, setFilters] = useState({
    documentType: 'all',
    status: 'all',
    category: 'all',
    fromDate: '',
    toDate: '',
    warehouse: 'all',
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  const fetchAllData = async () => {
    try {
      setLoadingHistory(true);
      setMessage({ type: '', text: '' });

      let receiptsData = [];
      let deliveriesData = [];
      let transfersData = [];
      let productsData = [];
      let warehousesData = [];

      try {
        const receiptsRes = await axios.get('/api/receipt');
        receiptsData = receiptsRes.data?.receipts || [];
      } catch (error) {
        console.error('Error fetching receipts:', error);
      }

      try {
        const deliveriesRes = await axios.get('/api/delivery');
        deliveriesData = deliveriesRes.data?.deliveries || [];
      } catch (error) {
        console.error('Error fetching deliveries:', error);
      }

      try {
        const transfersRes = await axios.get('/api/transfer');
        transfersData = transfersRes.data?.transfers || [];
      } catch (error) {
        console.error('Error fetching transfers:', error);
      }

      try {
        const productsRes = await axios.get('/api/product');
        productsData = productsRes.data?.products || [];
      } catch (error) {
        console.error('Error fetching products:', error);
      }

      try {
        const warehousesRes = await axios.get('/api/warehouse');
        warehousesData = warehousesRes.data?.warehouses || [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
      }

      setWarehouses(warehousesData);

      const cats = new Set();
      productsData.forEach(p => {
        if (p.category?.name) {
          cats.add(p.category.name);
        }
      });
      setCategories(Array.from(cats).sort());

      const combined = [];

      receiptsData.forEach(receipt => {
        if (receipt.items && Array.isArray(receipt.items)) {
          receipt.items.forEach(item => {
            combined.push({
              id: `receipt-${receipt.id}-${item.id}`,
              documentType: 'receipt',
              documentId: receipt.id,
              supplier: receipt.supplier || '-',
              date: new Date(receipt.receiptDate || receipt.createdAt),
              status: receipt.status || 'draft',
              productName: item.product?.name || '-',
              productSku: item.product?.sku || '-',
              category: item.product?.category?.name || '-',
              quantity: item.quantity || 0,
              warehouse: receipt.warehouse?.name || '-',
              warehouseId: receipt.warehouseId || 0,
              type: 'Incoming',
            });
          });
        }
      });

      deliveriesData.forEach(delivery => {
        if (delivery.items && Array.isArray(delivery.items)) {
          delivery.items.forEach(item => {
            combined.push({
              id: `delivery-${delivery.id}-${item.id}`,
              documentType: 'delivery',
              documentId: delivery.id,
              customer: delivery.customer || '-',
              date: new Date(delivery.createdAt),
              status: delivery.status || 'draft',
              productName: item.product?.name || '-',
              productSku: item.product?.sku || '-',
              category: item.product?.category?.name || '-',
              quantity: item.quantity || 0,
              warehouse: '-',
              warehouseId: item.warehouseId || 0,
              type: 'Outgoing',
            });
          });
        }
      });

      transfersData.forEach(transfer => {
        if (transfer.items && Array.isArray(transfer.items)) {
          transfer.items.forEach(item => {
            combined.push({
              id: `transfer-${transfer.id}-${item.id}`,
              documentType: 'transfer',
              documentId: transfer.id,
              supplier: `${transfer.fromWarehouse?.name || 'Unknown'} → ${transfer.toWarehouse?.name || 'Unknown'}`,
              date: new Date(transfer.createdAt),
              status: transfer.status || 'draft',
              productName: item.product?.name || '-',
              productSku: item.product?.sku || '-',
              category: item.product?.category?.name || '-',
              quantity: item.quantity || 0,
              warehouse: transfer.fromWarehouse?.name || '-',
              warehouseId: transfer.fromWarehouseId || 0,
              type: 'Transfer',
            });
          });
        }
      });

      combined.sort((a, b) => b.date - a.date);
      setTransactions(combined);
    } catch (error) {
      console.error('Error in fetchAllData:', error);
      setMessage({ type: 'error', text: 'Failed to fetch history: ' + (error.message || 'Unknown error') });
    } finally {
      setLoadingHistory(false);
    }
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      if (filters.documentType !== 'all' && t.documentType !== filters.documentType) {
        return false;
      }

      if (filters.status !== 'all' && t.status !== filters.status) {
        return false;
      }

      if (filters.category !== 'all' && t.category !== filters.category) {
        return false;
      }

      if (filters.warehouse !== 'all' && t.warehouseId !== Number(filters.warehouse)) {
        return false;
      }

      if (filters.fromDate) {
        const fromDate = new Date(filters.fromDate);
        fromDate.setHours(0, 0, 0, 0);
        if (t.date < fromDate) {
          return false;
        }
      }

      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        if (t.date > toDate) {
          return false;
        }
      }

      return true;
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      documentType: 'all',
      status: 'all',
      category: 'all',
      fromDate: '',
      toDate: '',
      warehouse: 'all',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-yellow-500 bg-opacity-20 text-yellow-400',
      validated: 'bg-green-500 bg-opacity-20 text-green-400',
      completed: 'bg-green-500 bg-opacity-20 text-green-400',
    };
    return badges[status] || 'bg-gray-500 bg-opacity-20 text-gray-400';
  };

  const getTypeBadge = (type) => {
    const badges = {
      'Incoming': 'bg-blue-500 bg-opacity-20 text-blue-400',
      'Outgoing': 'bg-red-500 bg-opacity-20 text-red-400',
      'Transfer': 'bg-purple-500 bg-opacity-20 text-purple-400',
    };
    return badges[type] || 'bg-gray-500 bg-opacity-20 text-gray-400';
  };

  const activeFiltersCount = [
    filters.documentType !== 'all',
    filters.status !== 'all',
    filters.category !== 'all',
    filters.warehouse !== 'all',
    filters.fromDate !== '',
    filters.toDate !== '',
  ].filter(Boolean).length;

  const filteredData = getFilteredTransactions();

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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Move History</h1>
          <p className="text-gray-400">View all receipts, deliveries, and warehouse transfers</p>
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

        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gradient-to-r from-[#b976ff] to-[#7864EF] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters {activeFiltersCount > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="bg-[#292b3b] rounded-lg border border-gray-800 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">Document Type</label>
                <select
                  name="documentType"
                  value={filters.documentType}
                  onChange={handleFilterChange}
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#b976ff] outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="receipt">Receipts (Incoming)</option>
                  <option value="delivery">Deliveries (Outgoing)</option>
                  <option value="transfer">Transfers</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">Status</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#b976ff] outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="validated">Validated</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">Category</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#b976ff] outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">Warehouse</label>
                <select
                  name="warehouse"
                  value={filters.warehouse}
                  onChange={handleFilterChange}
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#b976ff] outline-none"
                >
                  <option value="all">All Warehouses</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">From Date</label>
                <input
                  type="date"
                  name="fromDate"
                  value={filters.fromDate}
                  onChange={handleFilterChange}
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#b976ff] outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">To Date</label>
                <input
                  type="date"
                  name="toDate"
                  value={filters.toDate}
                  onChange={handleFilterChange}
                  className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#b976ff] outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetFilters}
                className="flex-1 bg-[#24253A] border border-gray-700 text-gray-300 font-bold py-2 rounded-lg hover:bg-[#2d2f3b] transition-all"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 bg-gradient-to-r from-[#b976ff] to-[#7864EF] text-white font-bold py-2 rounded-lg hover:opacity-90 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        <div className="bg-[#292b3b] rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold">
              Results ({filteredData.length})
            </h2>
          </div>

          {loadingHistory ? (
            <div className="p-6 text-center text-gray-400">Loading history...</div>
          ) : filteredData.length === 0 ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-2 opacity-50" />
              <p className="text-gray-400">No transactions found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#24253A] border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-300">Type</th>
                    <th className="px-6 py-3 font-semibold text-gray-300">Document</th>
                    <th className="px-6 py-3 font-semibold text-gray-300">Product</th>
                    <th className="px-6 py-3 font-semibold text-gray-300">Category</th>
                    <th className="px-6 py-3 font-semibold text-gray-300">Quantity</th>
                    <th className="px-6 py-3 font-semibold text-gray-300">Reference</th>
                    <th className="px-6 py-3 font-semibold text-gray-300">Date</th>
                    <th className="px-6 py-3 font-semibold text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(transaction => (
                    <tr key={transaction.id} className="border-b border-gray-800 hover:bg-[#24253A] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadge(transaction.type)}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400">
                          {transaction.documentType === 'receipt' && `Receipt #${transaction.documentId}`}
                          {transaction.documentType === 'delivery' && `Delivery #${transaction.documentId}`}
                          {transaction.documentType === 'transfer' && `Transfer #${transaction.documentId}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{transaction.productName}</p>
                          <p className="text-xs text-gray-400">{transaction.productSku}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{transaction.category}</td>
                      <td className="px-6 py-4 font-medium">{transaction.quantity}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {transaction.documentType === 'receipt' && transaction.supplier}
                        {transaction.documentType === 'delivery' && transaction.customer}
                        {transaction.documentType === 'transfer' && transaction.supplier}
                      </td>
                      <td className="px-6 py-4 text-sm">{transaction.date.toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(transaction.status)}`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-[#292b3b] rounded-lg border border-gray-800 p-6">
          <h3 className="text-lg font-bold mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#24253A] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Total Transactions</p>
              <p className="text-3xl font-bold text-[#b976ff]">{filteredData.length}</p>
            </div>
            <div className="bg-[#24253A] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Total Quantity</p>
              <p className="text-3xl font-bold text-blue-400">{filteredData.reduce((sum, t) => sum + t.quantity, 0)}</p>
            </div>
            <div className="bg-[#24253A] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Incoming</p>
              <p className="text-3xl font-bold text-blue-400">{filteredData.filter(t => t.type === 'Incoming').length}</p>
            </div>
            <div className="bg-[#24253A] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Outgoing</p>
              <p className="text-3xl font-bold text-red-400">{filteredData.filter(t => t.type === 'Outgoing').length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
