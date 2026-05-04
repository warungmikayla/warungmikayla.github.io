import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah, formatTanggal } from '../lib/format'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function SalesTab({ refresh }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchTransactions()
  }, [refresh])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .order('created_at', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  const totalToday = transactions
    .filter(tx => {
      const txDate = new Date(tx.created_at).toDateString()
      return txDate === new Date().toDateString()
    })
    .reduce((sum, tx) => sum + tx.total_amount, 0)

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-emerald-600 text-white rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-emerald-100 text-sm">Total Penjualan Hari Ini</p>
          <p className="text-2xl font-bold mt-1">{formatRupiah(totalToday)}</p>
        </div>
        <div className="text-right">
          <p className="text-emerald-100 text-sm">Jumlah Transaksi</p>
          <p className="text-2xl font-bold mt-1">
            {transactions.filter(tx => new Date(tx.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Semua Transaksi</h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
        ) : transactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">Belum ada transaksi.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id}>
                <button
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      #{tx.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatTanggal(tx.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{formatRupiah(tx.total_amount)}</p>
                      <p className="text-xs text-gray-400">{tx.transaction_items?.length} item</p>
                    </div>
                    {expanded === tx.id
                      ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                      : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    }
                  </div>
                </button>

                {expanded === tx.id && (
                  <div className="px-5 pb-4 bg-gray-50">
                    <table className="w-full text-sm mb-3">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="text-left py-2 font-medium">Produk</th>
                          <th className="text-center py-2 font-medium w-12">Qty</th>
                          <th className="text-right py-2 font-medium">Harga</th>
                          <th className="text-right py-2 font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tx.transaction_items?.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-1.5 text-gray-700">{item.product_name}</td>
                            <td className="py-1.5 text-center text-gray-500">{item.quantity}</td>
                            <td className="py-1.5 text-right text-gray-500">{formatRupiah(item.product_price)}</td>
                            <td className="py-1.5 text-right font-medium text-gray-800">{formatRupiah(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="space-y-1 text-sm border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total</span>
                        <span className="font-semibold">{formatRupiah(tx.total_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bayar</span>
                        <span>{formatRupiah(tx.payment_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Kembalian</span>
                        <span className="text-emerald-600 font-semibold">{formatRupiah(tx.change_amount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
