import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/format'
import { BarChart2 } from 'lucide-react'

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
  { id: 'custom', label: 'Custom' },
]

export default function ReportTab() {
  const [preset, setPreset] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (preset === 'custom' && (!customStart || !customEnd)) {
        setLoading(false)
        return
      }
      setLoading(true)
      let start, end
      if (preset === 'custom') {
        start = new Date(customStart)
        end = new Date(customEnd)
        end.setHours(23, 59, 59, 999)
      } else {
        const range = getRange(preset)
        start = range.start
        end = range.end
      }
      const { data } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
      setTransactions(data || [])
      setLoading(false)
    }
    run()
  }, [preset, customStart, customEnd])

  const totalRevenue = transactions.reduce((s, tx) => s + tx.total_amount, 0)
  const totalTx = transactions.length
  const avgTx = totalTx > 0 ? Math.round(totalRevenue / totalTx) : 0

  const productMap = {}
  transactions.forEach(tx => {
    tx.transaction_items?.forEach(item => {
      if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, revenue: 0 }
      productMap[item.product_name].qty += item.quantity
      productMap[item.product_name].revenue += item.subtotal
    })
  })
  const topProducts = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
  const maxQty = topProducts[0]?.qty || 1

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

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Memuat laporan...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 bg-emerald-600 text-white rounded-xl p-4 sm:p-5">
              <p className="text-emerald-100 text-xs sm:text-sm">Total Penjualan</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{formatRupiah(totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-gray-500 text-xs">Jumlah Transaksi</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{totalTx}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-gray-500 text-xs">Rata-rata / Transaksi</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{formatRupiah(avgTx)}</p>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <BarChart2 size={16} className="text-emerald-600" />
              <h2 className="font-semibold text-gray-800 text-sm sm:text-base">Produk Terlaris</h2>
            </div>
            {topProducts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Tidak ada data untuk periode ini.</div>
            ) : (
              <div className="divide-y divide-gray-100 px-4 sm:px-5 py-1">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 mr-3">
                        <span className={`text-xs font-bold flex-shrink-0 w-5 text-center ${
                          i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'
                        }`}>
                          #{i + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-bold text-gray-800">{p.qty} pcs</span>
                        <span className="text-xs text-gray-400 ml-2">{formatRupiah(p.revenue)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 flex-shrink-0" />
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(p.qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
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
