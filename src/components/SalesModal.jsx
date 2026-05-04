import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/format'
import jsPDF from 'jspdf'
import {
  X, Search, Plus, Minus, Trash2,
  ArrowRight, CheckCircle, Printer, Download, ShoppingCart,
} from 'lucide-react'

export default function SalesModal({ onClose, onComplete }) {
  const [step, setStep] = useState('select')
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [paymentInput, setPaymentInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [transaction, setTransaction] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [search])

  const fetchProducts = async () => {
    let query = supabase.from('products').select('*').order('name')
    if (search) query = query.ilike('name', `%${search}%`)
    const { data } = await query
    setProducts(data || [])
  }

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.product.id === product.id)
      if (exists) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQty = (productId, delta) => {
    setCart(prev =>
      prev.flatMap(i => {
        if (i.product.id !== productId) return [i]
        const qty = i.quantity + delta
        return qty <= 0 ? [] : [{ ...i, quantity: qty }]
      })
    )
  }

  const removeItem = (productId) =>
    setCart(prev => prev.filter(i => i.product.id !== productId))

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const payment = parseFloat(paymentInput) || 0
  const change = payment - total

  const handleCompleteSale = async () => {
    if (payment < total) return
    setProcessing(true)

    const { data: txData, error } = await supabase
      .from('transactions')
      .insert({ total_amount: total, payment_amount: payment, change_amount: change })
      .select()
      .single()

    if (error || !txData) {
      alert('Gagal menyimpan transaksi. Coba lagi.')
      setProcessing(false)
      return
    }

    await supabase.from('transaction_items').insert(
      cart.map(i => ({
        transaction_id: txData.id,
        product_id: i.product.id,
        product_name: i.product.name,
        product_price: i.product.price,
        quantity: i.quantity,
        subtotal: i.product.price * i.quantity,
      }))
    )

    setTransaction({ ...txData, items: cart })
    setProcessing(false)
    setStep('receipt')
    onComplete()
  }

  const handlePrint = () => window.print()

  const handleDownloadPDF = () => {
    if (!transaction) return
    const itemsCount = transaction.items.length
    const pageHeight = Math.max(120, 55 + itemsCount * 10)
    const doc = new jsPDF({ unit: 'mm', format: [80, pageHeight] })

    let y = 8
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('WARUNG MIKAYLA', 40, y, { align: 'center' })
    y += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Jl. Contoh No. 1, Kota Anda', 40, y, { align: 'center' })
    y += 8

    doc.setFontSize(8)
    doc.text(`No: #${transaction.id.slice(0, 8).toUpperCase()}`, 5, y)
    y += 4
    doc.text(`Tgl: ${new Date(transaction.created_at).toLocaleString('id-ID')}`, 5, y)
    y += 5

    doc.setLineDashPattern([1, 1], 0)
    doc.line(5, y, 75, y)
    y += 4

    transaction.items.forEach(({ product, quantity }) => {
      doc.setFont('helvetica', 'normal')
      doc.text(product.name, 5, y)
      y += 4
      const subtotalStr = formatRupiah(product.price * quantity)
      doc.text(`  ${quantity} x ${formatRupiah(product.price)}`, 5, y)
      doc.text(subtotalStr, 75, y, { align: 'right' })
      y += 5
    })

    doc.line(5, y, 75, y)
    y += 4

    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', 5, y)
    doc.text(formatRupiah(total), 75, y, { align: 'right' })
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.text('BAYAR', 5, y)
    doc.text(formatRupiah(transaction.payment_amount), 75, y, { align: 'right' })
    y += 5

    doc.setFont('helvetica', 'bold')
    doc.text('KEMBALI', 5, y)
    doc.text(formatRupiah(transaction.change_amount), 75, y, { align: 'right' })
    y += 8

    doc.setLineDashPattern([1, 1], 0)
    doc.line(5, y, 75, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Terima kasih telah berbelanja!', 40, y, { align: 'center' })

    doc.save(`struk-${transaction.id.slice(0, 8)}.pdf`)
  }

  const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000]

  return (
    <>
      {/* Printable receipt — tersembunyi di layar, muncul saat print */}
      <div id="receipt-printable">
        {transaction && (
          <div style={{ fontFamily: 'monospace', fontSize: '11px', width: '76mm' }}>
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold' }}>WARUNG MIKAYLA</div>
              <div>Jl. Contoh No. 1, Kota Anda</div>
            </div>
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ marginBottom: '4px' }}>
              <div>No: #{transaction.id.slice(0, 8).toUpperCase()}</div>
              <div>Tgl: {new Date(transaction.created_at).toLocaleString('id-ID')}</div>
            </div>
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            {transaction.items.map(({ product, quantity }) => (
              <div key={product.id} style={{ marginBottom: '3px' }}>
                <div>{product.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{quantity} x {formatRupiah(product.price)}</span>
                  <span>{formatRupiah(product.price * quantity)}</span>
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>TOTAL</span><span>{formatRupiah(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>BAYAR</span><span>{formatRupiah(transaction.payment_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>KEMBALI</span><span>{formatRupiah(transaction.change_amount)}</span>
            </div>
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0 4px' }} />
            <div style={{ textAlign: 'center' }}>
              Terima kasih telah berbelanja!<br />
              *** Warung Mikayla ***
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="font-semibold text-gray-800 text-lg">
                {step === 'select' && 'Pilih Produk'}
                {step === 'payment' && 'Pembayaran'}
                {step === 'receipt' && 'Transaksi Selesai'}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                {['Pilih Produk', 'Pembayaran', 'Struk'].map((label, i) => {
                  const stepMap = ['select', 'payment', 'receipt']
                  const current = stepMap.indexOf(step)
                  return (
                    <div key={label} className="flex items-center gap-1.5">
                      {i > 0 && <div className="h-px w-5 bg-gray-200" />}
                      <div className={`flex items-center gap-1 text-xs ${current >= i ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          current > i ? 'bg-emerald-600 text-white' :
                          current === i ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' :
                          'bg-gray-100 text-gray-400'
                        }`}>{i + 1}</div>
                        <span className="hidden sm:block">{label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">

            {/* ── STEP 1: Pilih Produk ── */}
            {step === 'select' && (
              <div className="flex h-full" style={{ minHeight: 400 }}>
                {/* Daftar Produk */}
                <div className="flex-1 flex flex-col border-r border-gray-100 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari produk..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {products.length === 0 ? (
                      <p className="p-6 text-center text-sm text-gray-400">Tidak ada produk ditemukan.</p>
                    ) : products.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{product.name}</p>
                          <p className="text-xs text-emerald-600 mt-0.5">{formatRupiah(product.price)}</p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors flex-shrink-0">
                          <Plus size={14} className="text-emerald-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keranjang */}
                <div className="w-72 flex flex-col bg-gray-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-2">
                    <ShoppingCart size={15} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Keranjang</span>
                    {cart.length > 0 && (
                      <span className="ml-auto text-xs bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        {cart.length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {cart.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 pt-8">Klik produk untuk menambahkan ke keranjang</p>
                    ) : cart.map(({ product, quantity }) => (
                      <div key={product.id} className="bg-white rounded-xl p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <p className="text-xs font-medium text-gray-800 leading-snug">{product.name}</p>
                          <button
                            onClick={() => removeItem(product.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(product.id, -1)}
                              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="text-sm font-bold w-5 text-center">{quantity}</span>
                            <button
                              onClick={() => updateQty(product.id, 1)}
                              className="w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                            >
                              <Plus size={11} className="text-emerald-600" />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-emerald-700">
                            {formatRupiah(product.price * quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="text-base font-bold text-gray-800">{formatRupiah(total)}</span>
                    </div>
                    <button
                      onClick={() => setStep('payment')}
                      disabled={cart.length === 0}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      Lanjut Pembayaran
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Pembayaran ── */}
            {step === 'payment' && (
              <div className="overflow-y-auto h-full">
                <div className="p-6 max-w-md mx-auto">
                  {/* Rincian */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rincian Belanja</p>
                    {cart.map(({ product, quantity }) => (
                      <div key={product.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700">{product.name} <span className="text-gray-400">× {quantity}</span></span>
                        <span className="font-medium">{formatRupiah(product.price * quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-800">Total</span>
                      <span className="text-xl font-bold text-gray-900">{formatRupiah(total)}</span>
                    </div>
                  </div>

                  {/* Input Uang */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Uang yang Dibayarkan (Rp)
                    </label>
                    <input
                      type="number"
                      value={paymentInput}
                      onChange={(e) => setPaymentInput(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-emerald-500 rounded-xl text-xl font-bold text-right focus:outline-none transition-colors"
                      placeholder="0"
                      min={total}
                      autoFocus
                    />
                  </div>

                  {/* Nominal Cepat */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Nominal cepat:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_AMOUNTS.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setPaymentInput(String(amt))}
                          className={`py-2 text-xs border rounded-xl font-medium transition-colors ${
                            amt >= total
                              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Rp {(amt / 1000).toFixed(0)}k
                        </button>
                      ))}
                      <button
                        onClick={() => setPaymentInput(String(total))}
                        className="py-2 text-xs border-2 border-emerald-500 text-emerald-600 bg-emerald-50 rounded-xl font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        Uang Pas
                      </button>
                    </div>
                  </div>

                  {/* Kembalian */}
                  {paymentInput !== '' && (
                    <div className={`rounded-xl p-4 mb-4 ${change >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Kembalian</span>
                        <span className={`text-2xl font-bold ${change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {change >= 0 ? formatRupiah(change) : 'Uang kurang!'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('select')}
                      className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleCompleteSale}
                      disabled={payment < total || processing}
                      className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl text-sm font-medium transition-colors"
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Selesaikan Transaksi
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Struk ── */}
            {step === 'receipt' && transaction && (
              <div className="overflow-y-auto h-full">
                <div className="p-6">
                  <div className="flex flex-col items-center mb-5">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle className="text-emerald-600" size={30} />
                    </div>
                    <p className="font-semibold text-gray-800">Transaksi Berhasil!</p>
                    <p className="text-sm text-gray-500 mt-0.5">#{transaction.id.slice(0, 8).toUpperCase()}</p>
                  </div>

                  {/* Preview struk */}
                  <div className="max-w-[280px] mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden font-mono text-xs mb-5">
                    <div className="bg-gray-50 px-4 pt-5 pb-3 text-center">
                      <p className="font-bold text-sm">WARUNG MIKAYLA</p>
                      <p className="text-gray-500 text-xs">Jl. Contoh No. 1, Kota Anda</p>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      <p className="text-gray-500">No: #{transaction.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-gray-500">{new Date(transaction.created_at).toLocaleString('id-ID')}</p>
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      {transaction.items.map(({ product, quantity }) => (
                        <div key={product.id} className="mb-1.5">
                          <p className="text-gray-800">{product.name}</p>
                          <div className="flex justify-between text-gray-600">
                            <span>{quantity} × {formatRupiah(product.price)}</span>
                            <span>{formatRupiah(product.price * quantity)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>TOTAL</span><span>{formatRupiah(transaction.total_amount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>BAYAR</span><span>{formatRupiah(transaction.payment_amount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>KEMBALI</span><span>{formatRupiah(transaction.change_amount)}</span>
                      </div>
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      <p className="text-center text-gray-500">Terima kasih telah berbelanja!</p>
                    </div>
                  </div>

                  {/* Tombol aksi */}
                  <div className="flex gap-3 max-w-[280px] mx-auto">
                    <button
                      onClick={handlePrint}
                      className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Printer size={15} />
                      Cetak
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Download size={15} />
                      PDF
                    </button>
                  </div>
                  <button
                    onClick={onClose}
                    className="block w-full max-w-[280px] mx-auto mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
