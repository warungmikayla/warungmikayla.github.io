import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah, formatTanggal } from '../lib/format'
import { downloadReceiptPDF } from '../lib/receipt'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'

function getRange(preset) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (preset === 'today') return { start: todayStart, end: now }
  if (preset === 'week') {
    const day = todayStart.getDay()
    const monday = new Date(todayStart)
    monday.setDate(todayStart.getDate() - (day === 0 ? 6 : day - 1))
    return { start: monday, end: now }
  }
  if (preset === 'month') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
  return null
}

const PRESETS = [
  { id: 'today', label: 'Hari Ini' },
  { id: 'week', label: 'Minggu Ini' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'all', label: 'Semua' },
  { id: 'custom', label: 'Custom' },
]

const SUMMARY_LABEL = {
  today: 'Total Penjualan Hari Ini',
  week: 'Total Penjualan Minggu Ini',
  month: 'Total Penjualan Bulan Ini',
  all: 'Total Seluruh Penjualan',
  custom: 'Total Penjualan Periode Ini',
}

export default function SalesTab({ refresh }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [preset, setPreset] = useState('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    const run = async () => {
      if (preset === 'custom' && (!customStart || !customEnd)) {
        setLoading(false)
        return
      }
      setLoading(true)
      let query = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false })

      if (preset !== 'all') {
        if (preset === 'custom') {
          const end = new Date(customEnd)
          end.setHours(23, 59, 59, 999)
          query = query
            .gte('created_at', new Date(customStart).toISOString())
            .lte('created_at', end.toISOString())
        } else {
          const range = getRange(preset)
          query = query
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString())
        }
      }

      const { data } = await query
      setTransactions(data || [])
      setLoading(false)
    }
    run()
  }, [refresh, preset, customStart, customEnd])

  const totalFiltered = transactions.reduce((s, tx) => s + tx.total_amount, 0)
  const showContent = preset !== 'custom' || (customStart && customEnd)

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap mb-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === p.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-gray-400 text-sm flex-shrink-0">s/d</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Summary + List */}
      {!showContent ? (
        <div className="py-10 text-center text-sm text-gray-400">Pilih rentang tanggal untuk menampilkan data.</div>
      ) : (
        <>
          <div className="bg-emerald-600 text-white rounded-xl p-4 sm:p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm">{SUMMARY_LABEL[preset]}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatRupiah(totalFiltered)}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-xs sm:text-sm">Jumlah Transaksi</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{transactions.length}</p>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm sm:text-base">Daftar Transaksi</h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
        ) : transactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">Belum ada transaksi untuk periode ini.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id}>
                <button
                  className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      #{tx.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatTanggal(tx.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{formatRupiah(tx.total_amount)}</p>
                      <p className="text-xs text-gray-400">{tx.transaction_items?.length} item</p>
                    </div>
                    {expanded === tx.id
                      ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                      : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                  </div>
                </button>

                {expanded === tx.id && (
                  <div className="px-4 sm:px-5 pb-4 bg-gray-50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[280px]">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b border-gray-200">
                            <th className="text-left py-2 font-medium">Produk</th>
                            <th className="text-center py-2 font-medium w-10">Qty</th>
                            <th className="text-right py-2 font-medium hidden sm:table-cell">Harga</th>
                            <th className="text-right py-2 font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tx.transaction_items?.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 last:border-0">
                              <td className="py-1.5 text-gray-700">{item.product_name}</td>
                              <td className="py-1.5 text-center text-gray-500">{item.quantity}</td>
                              <td className="py-1.5 text-right text-gray-500 hidden sm:table-cell">{formatRupiah(item.product_price)}</td>
                              <td className="py-1.5 text-right font-medium text-gray-800">{formatRupiah(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-1 text-sm border-t border-gray-200 pt-2 mt-2">
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
                    <button
                      onClick={() => downloadReceiptPDF(tx)}
                      className="mt-3 w-full flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Download size={14} />
                      Unduh Struk PDF
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
          </div>
        </>
      )}
    </div>
  )
}
