import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/format'
import { Plus, Search, Edit2, Trash2, X, Check } from 'lucide-react'

export default function ProductsTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', price: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('products').select('*').order('name')
    if (search) query = query.ilike('name', `%${search}%`)
    const { data } = await query
    setProducts(data || [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', price: '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({ name: product.name, price: String(product.price) })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    const price = parseFloat(form.price)
    if (!form.name.trim()) return setFormError('Nama produk tidak boleh kosong.')
    if (isNaN(price) || price <= 0) return setFormError('Harga harus berupa angka positif.')

    setSaving(true)
    if (editing) {
      const { error } = await supabase
        .from('products')
        .update({ name: form.name.trim(), price })
        .eq('id', editing.id)
      if (error) { setSaving(false); return setFormError('Gagal: ' + error.message) }
    } else {
      const { error } = await supabase
        .from('products')
        .insert({ name: form.name.trim(), price })
      if (error) { setSaving(false); return setFormError('Gagal: ' + error.message) }
    }
    setSaving(false)
    setShowModal(false)
    fetchProducts()
  }

  const handleDelete = async (id) => {
    await supabase.from('products').delete().eq('id', id)
    setDeleteId(null)
    fetchProducts()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto"
        >
          <Plus size={15} />
          Tambah Produk
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">No</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Produk</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Harga</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">Memuat data...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                {search ? `Produk "${search}" tidak ditemukan.` : 'Belum ada produk.'}
              </td></tr>
            ) : products.map((p, i) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 text-sm text-gray-400">{i + 1}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{p.name}</td>
                <td className="px-5 py-3.5 text-sm text-gray-700">{formatRupiah(p.price)}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    {deleteId === p.id ? (
                      <div className="flex items-center gap-1 bg-red-50 rounded-md px-2 py-1">
                        <span className="text-xs text-red-600 mr-1">Hapus?</span>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 p-0.5"><Check size={14} /></button>
                        <button onClick={() => setDeleteId(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden divide-y divide-gray-100">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
        ) : products.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {search ? `Produk "${search}" tidak ditemukan.` : 'Belum ada produk.'}
          </div>
        ) : products.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-sm text-emerald-600 font-semibold mt-0.5">{formatRupiah(p.price)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openEdit(p)}
                className="p-2 text-blue-500 hover:text-blue-700 bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 size={15} />
              </button>
              {deleteId === p.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Check size={15} /></button>
                  <button onClick={() => setDeleteId(null)} className="p-2 text-gray-500 bg-gray-100 rounded-lg"><X size={15} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteId(p.id)}
                  className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{editing ? 'Edit Produk' : 'Tambah Produk'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Produk</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="contoh: Beras 5kg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Harga (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="contoh: 65000"
                  min="1"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 pt-1 pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-medium transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
