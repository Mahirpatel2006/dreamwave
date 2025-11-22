'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Plus, Package, AlertCircle, Check, X } from 'lucide-react';
import axios from 'axios';

export default function TransfersPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    quantity: '',
  });

  const [validationData, setValidationData] = useState({});

  // Only show success messages — never errors
  const [toast, setToast] = useState({ show: false, message: '' });

  const showSuccess = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try { const res = await axios.get('/api/transfer'); setTransfers(res.data.transfers || []); } catch (e) { console.log('Transfers load failed'); }
    try { const res = await axios.get('/api/product'); setProducts(res.data.products || []); } catch (e) {}
    try { const res = await axios.get('/api/warehouse'); setWarehouses(res.data.warehouses || []); } catch (e) {}
    try {
      const res = await axios.get('/api/product');
      const all = [];
      res.data.products?.forEach(p => {
        p.stocks?.forEach(s => all.push({ ...s, productId: p.id, productName: p.name, productSku: p.sku }));
      });
      setStocks(all);
    } catch (e) {}
  };

  const fetchTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const res = await axios.get('/api/transfer');
      setTransfers(res.data.transfers || []);
    } catch (e) {
      console.log('Could not refresh transfers');
    } finally {
      setLoadingTransfers(false);
    }
  };

  const getAvailableStock = () => {
    if (!currentItem.productId || !formData.fromWarehouseId) return 0;
    const stock = stocks.find(
      s => s.productId === Number(currentItem.productId) && s.warehouseId === Number(formData.fromWarehouseId)
    );
    return stock?.quantity || 0;
  };

  const addItemToTransfer = () => {
    if (!currentItem.productId || !currentItem.quantity || Number(currentItem.quantity) <= 0) return;
    if (!formData.fromWarehouseId || !formData.toWarehouseId) return;

    const available = getAvailableStock();
    if (Number(currentItem.quantity) > available) return;

    const product = products.find(p => p.id === Number(currentItem.productId));
    if (!product) return;

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: Number(currentItem.productId),
        productName: product.name,
        productSku: product.sku,
        quantity: Number(currentItem.quantity),
      }],
    }));
    setCurrentItem({ productId: '', quantity: '' });
  };

  const removeItemFromTransfer = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fromWarehouseId || !formData.toWarehouseId || formData.items.length === 0) return;
    if (formData.fromWarehouseId === formData.toWarehouseId) return;

    try {
      await axios.post('/api/transfer', {
        fromWarehouseId: Number(formData.fromWarehouseId),
        toWarehouseId: Number(formData.toWarehouseId),
        items: formData.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });

      showSuccess('Transfer created successfully');
      setFormData({ fromWarehouseId: '', toWarehouseId: '', items: [] });
      setShowForm(false);
      fetchTransfers();
    } catch (e) {
      console.log('Create transfer failed:', e);
      // No error shown to user
    }
  };

  const handleCompleteTransfer = (transfer) => {
    setSelectedTransfer(transfer);
    const init = {};
    transfer.items.forEach(item => { init[item.id] = item.transferredQty || 0; });
    setValidationData(init);
    setShowDetailsModal(true);
  };

  const submitCompletion = async () => {
    if (!selectedTransfer) return;

    try {
      const items = selectedTransfer.items.map(item => ({
        transferItemId: item.id,
        transferredQty: validationData[item.id] || 0,
      }));

      await axios.patch('/api/transfer', {
        transferId: selectedTransfer.id,
        status: 'completed',
        items,
      });

      showSuccess('Transfer completed successfully');
      setShowDetailsModal(false);
      setSelectedTransfer(null);
      setValidationData({});
      fetchTransfers();
      loadData(); // refresh stock
    } catch (e) {
      console.log('Complete transfer failed:', e);
      // No error shown
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#24253A] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#24253A] text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Success Toast Only */}
        {toast.show && (
          <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-medium animate-pulse">
            {toast.message}
          </div>
        )}

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Internal Transfers</h1>
            <p className="text-gray-400">Move products between warehouses</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#b976ff] to-[#7864EF] hover:opacity-90 font-bold py-3 px-6 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Transfer
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-[#292b3b] rounded-xl border border-gray-800 p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">New Transfer</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Warehouse</label>
                  <select
                    value={formData.fromWarehouseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromWarehouseId: e.target.value }))}
                    className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#b976ff] outline-none"
                  >
                    <option value="">Select source...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">To Warehouse</label>
                  <select
                    value={formData.toWarehouseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, toWarehouseId: e.target.value }))}
                    className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#b976ff] outline-none"
                  >
                    <option value="">Select destination...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold mb-4">Add Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-sm text-gray-300">Product</label>
                    <select
                      value={currentItem.productId}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, productId: e.target.value }))}
                      className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2"
                    >
                      <option value="">Select...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Available</label>
                    <div className="bg-[#1f2529] border border-gray-700 rounded-lg px-3 py-2 text-gray-400">
                      {getAvailableStock()} units
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Qty</label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: e.target.value }))}
                      min="1"
                      className="w-full bg-[#24253A] border border-gray-700 rounded-lg px-3 py-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addItemToTransfer}
                    className="bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium"
                  >
                    Add
                  </button>
                </div>

                {formData.items.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {formData.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-[#24253A] p-4 rounded-lg">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-400">{item.productSku} × {item.quantity}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItemFromTransfer(i)}
                          className="text-red-400 hover:bg-red-900/30 p-2 rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#b976ff] to-[#7864EF] py-3 rounded-lg font-bold hover:opacity-90"
                >
                  Create Transfer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ fromWarehouseId: '', toWarehouseId: '', items: [] });
                    setCurrentItem({ productId: '', quantity: '' });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transfers List */}
        <div className="bg-[#292b3b] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Package className="w-7 h-7" />
              Transfers
            </h2>
          </div>

          {loadingTransfers ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400">No transfers yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#24253A] border-b border-gray-700">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-300">From</th>
                    <th className="text-left p-4 font-medium text-gray-300">To</th>
                    <th className="text-left p-4 font-medium text-gray-300">Items</th>
                    <th className="text-left p-4 font-medium text-gray-300">Date</th>
                    <th className="text-left p-4 font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 font-medium text-gray-300"></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(transfer => (
                    <tr key={transfer.id} className="border-b border-gray-800 hover:bg-[#24253A]/50">
                      <td className>{transfer.fromWarehouse?.name || '-'}</td>
                      <td className="p-4">{transfer.toWarehouse?.name || '-'}</td>
                      <td className="p-4">{transfer.items?.length || 0}</td>
                      <td className="p-4">{new Date(transfer.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transfer.status === 'completed'
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {transfer.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {transfer.status === 'draft' && (
                          <button
                            onClick={() => handleCompleteTransfer(transfer)}
                            className="text-green-400 hover:bg-green-900/30 p-2 rounded-lg"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Complete Modal */}
        {showDetailsModal && selectedTransfer && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-[#292b3b] rounded-xl border border-gray-800 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-6">Complete Transfer</h3>
              <div className="space-y-6">
                {selectedTransfer.items.map(item => (
                  <div key={item.id} className="bg-[#24253A] p-4 rounded-lg">
                    <div className="flex justify-between mb-3">
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className className="text-sm text-gray-400">{item.product?.sku}</p>
                      </div>
                      <p className="text-sm text-gray-400">Req: {item.quantity}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={validationData[item.id] || 0}
                      onChange={(e) => setValidationData(prev => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                      className="w-full bg-[#1f2529] border border-gray-700 rounded px-3 py-2"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={submitCompletion}
                  className="flex-1 bg-gradient-to-r from-[#b976ff] to-[#7864EF] py-3 rounded-lg font-bold hover:opacity-90"
                >
                  Complete Transfer
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedTransfer(null);
                    setValidationData({});
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}