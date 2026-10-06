import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, Tag, Loader2, AlertCircle, Pencil, Check, X } from 'lucide-react';

interface CategoryBar {
  id: string;
  name: string;
  createdAt: string;
}

export default function ProductCategoryBarPage() {
  const [bars, setBars] = useState<CategoryBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchBars();
  }, []);

  const fetchBars = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/product-category-bars');
      setBars(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch category bars');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    try {
      setSubmitting(true);
      setError('');
      await api.post('/admin/product-category-bars', { name: newName.trim() });
      setNewName('');
      fetchBars();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create category bar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await api.delete(`/admin/product-category-bars/${id}`);
      fetchBars();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete category bar');
    }
  };

  const handleEditSubmit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      await api.put(`/admin/product-category-bars/${id}`, { name: editName.trim() });
      setEditId(null);
      fetchBars();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update category bar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#111111]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Product Category Bar</h1>
      </div>
      
      <div className="text-sm text-gray-500 mb-6">
        Manage the product categories that appear on the Home Page filter bar. You can assign products to these categories in the Products page.
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Category Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Flours"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#111111] focus:border-[#111111] outline-none"
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || submitting}
              className="bg-[#111111] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              Add Category
            </button>
          </form>
        </div>

        <div className="divide-y divide-gray-100">
          {bars.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No categories found. Create one above to get started.
            </div>
          ) : (
            bars.map((bar) => (
              <div key={bar.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                {editId === bar.id ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#111111] focus:border-[#111111] outline-none"
                      disabled={submitting}
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditSubmit(bar.id)}
                      disabled={submitting}
                      className="p-1.5 text-[#111111] hover:bg-[#f5f5f5] rounded"
                      title="Save"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      disabled={submitting}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                      title="Cancel"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="bg-[#f5f5f5] text-[#111111] p-2 rounded-lg">
                        <Tag size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{bar.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditId(bar.id);
                          setEditName(bar.name);
                        }}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit Category"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(bar.id, bar.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
