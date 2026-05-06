import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/format'
import jsPDF from 'jspdf'
import {
  X, Search, Plus, Minus, Trash2,
  ArrowRight, CheckCircle, Printer, Download,
  ShoppingCart, ArrowLeft,
} from 'lucide-react'

export default function SalesModal({ onClose, onComplete }) {
  const [step, setStep] = useState('select')
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [mobileView, setMobileView] = useState('products') // 'products' | 'cart'
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
      if (exists) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
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
      .select().single()

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
    const pageHeight = Math.max(120, 60 + transaction.items.length * 10)
    const doc = new jsPDF({ unit: 'mm', format: [80, pageHeight] })
    let y = 8

    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text('WARUNG MIKAYLA', 40, y, { align: 'center' }); y += 5
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('Kp. Lebaksiuh No.152, RT.05/RW.01', 40, y, { align: 'center' }); y += 5
    doc.text('WA: 0831-1253-7506', 40, y, { align: 'center' }); y += 6

    doc.text(`No: #${transaction.id.slice(0, 8).toUpperCase()}`, 5, y); y += 4
    doc.text(`Tgl: ${new Date(transaction.created_at).toLocaleString('id-ID')}`, 5, y); y += 5

    doc.setLineDashPattern([1, 1], 0); doc.line(5, y, 75, y); y += 4

    transaction.items.forEach(({ product, quantity }) => {
      doc.text(product.name, 5, y); y += 4
      doc.text(`  ${quantity} x ${formatRupiah(product.price)}`, 5, y)
      doc.text(formatRupiah(product.price * quantity), 75, y, { align: 'right' }); y += 5
    })

    doc.line(5, y, 75, y); y += 4
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', 5, y); doc.text(formatRupiah(total), 75, y, { align: 'right' }); y += 5
    doc.setFont('helvetica', 'normal')
    doc.text('BAYAR', 5, y); doc.text(formatRupiah(transaction.payment_amount), 75, y, { align: 'right' }); y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('KEMBALI', 5, y); doc.text(formatRupiah(transaction.change_amount), 75, y, { align: 'right' }); y += 8
    doc.setLineDashPattern([1, 1], 0); doc.line(5, y, 75, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text('Terima kasih telah berbelanja!', 40, y, { align: 'center' })

    doc.save(`struk-${transaction.id.slice(0, 8)}.pdf`)
  }

  const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000]

  return (
    <>
      {/* Printable receipt */}
      <div id="receipt-printable">
        {transaction && (
          <div style={{ fontFamily: 'monospace', fontSize: '11px', width: '76mm' }}>
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold' }}>WARUNG MIKAYLA</div>
              <div>Kp. Lebaksiuh No.152, RT.05/RW.01</div>
              <div>WA: 0831-1253-7506</div>
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
            <div style={{ textAlign: 'center' }}>Terima kasih telah berbelanja!<br />*** Warung Mikayla ***</div>
          </div>
        )}
      </div>

      {/* Modal — bottom sheet di mobile, centered di desktop */}
      <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl flex flex-col"
          style={{ height: '95dvh', maxHeight: '95dvh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Back button untuk mobile di step payment */}
              {step === 'payment' && (
                <button onClick={() => setStep('select')} className="sm:hidden text-gray-500 p-1 -ml-1">
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <h2 className="font-semibold text-gray-800">
                  {step === 'select' && 'Penjualan Baru'}
                  {step === 'payment' && 'Pembayaran'}
                  {step === 'receipt' && 'Transaksi Selesai'}
                </h2>
                {/* Step indicator — desktop only */}
                <div className="hidden sm:flex items-center gap-1.5 mt-1">
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
                          <span>{label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* ── STEP 1: Pilih Produk ── */}
            {step === 'select' && (
              <div className="flex flex-col flex-1 overflow-hidden">

                {/* Mobile tab bar */}
                <div className="flex sm:hidden border-b border-gray-100 flex-shrink-0 bg-gray-50">
                  <button
                    onClick={() => setMobileView('products')}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      mobileView === 'products'
                        ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                        : 'text-gray-500'
                    }`}
                  >
                    Produk
                  </button>
                  <button
                    onClick={() => setMobileView('cart')}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                      mobileView === 'cart'
                        ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                        : 'text-gray-500'
                    }`}
                  >
                    Keranjang
                    {cart.length > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-emerald-600 text-white rounded-full">
                        {cart.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Layout: tabs on mobile, side-by-side on desktop */}
                <div className="flex flex-1 overflow-hidden">

                  {/* Panel Produk */}
                  <div className={`${mobileView === 'products' ? 'flex' : 'hidden'} sm:flex flex-1 flex-col border-r-0 sm:border-r border-gray-100 overflow-hidden`}>
                    <div className="p-3 border-b border-gray-100 flex-shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Cari produk..."
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {products.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-400">Tidak ada produk.</p>
                      ) : products.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 active:bg-emerald-100 border-b border-gray-50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{product.name}</p>
                            <p className="text-xs text-emerald-600 mt-0.5">{formatRupiah(product.price)}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 ml-2">
                            <Plus size={15} className="text-emerald-600" />
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Mobile: Floating bar saat keranjang ada isi */}
                    {cart.length > 0 && mobileView === 'products' && (
                      <div className="sm:hidden flex-shrink-0 p-3 bg-white border-t border-gray-100">
                        <button
                          onClick={() => setMobileView('cart')}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-between px-4"
                        >
                          <span className="flex items-center gap-2">
                            <ShoppingCart size={16} />
                            {cart.length} item
                          </span>
                          <span>{formatRupiah(total)}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Panel Keranjang */}
                  <div className={`${mobileView === 'cart' ? 'flex' : 'hidden'} sm:flex flex-col bg-gray-50 overflow-hidden w-full sm:w-72`}>
                    <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 hidden sm:flex items-center gap-2">
                      <ShoppingCart size={15} className="text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Keranjang</span>
                      {cart.length > 0 && (
                        <span className="ml-auto text-xs bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center">{cart.length}</span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {cart.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 pt-8">Klik produk untuk menambahkan</p>
                      ) : cart.map(({ product, quantity }) => (
                        <div key={product.id} className="bg-white rounded-xl p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <p className="text-xs font-medium text-gray-800 leading-snug">{product.name}</p>
                            <button onClick={() => removeItem(product.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5 p-0.5">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQty(product.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 active:bg-gray-200 flex items-center justify-center">
                                <Minus size={12} />
                              </button>
                              <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                              <button onClick={() => updateQty(product.id, 1)} className="w-7 h-7 rounded-full bg-emerald-100 active:bg-emerald-200 flex items-center justify-center">
                                <Plus size={12} className="text-emerald-600" />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-emerald-700">{formatRupiah(product.price * quantity)}</span>
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
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                      >
                        Lanjut Pembayaran
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Pembayaran ── */}
            {step === 'payment' && (
              <div className="overflow-y-auto flex-1">
                <div className="p-4 sm:p-6 max-w-md mx-auto">
                  {/* Rincian */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rincian Belanja</p>
                    {cart.map(({ product, quantity }) => (
                      <div key={product.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700 truncate mr-2">{product.name} <span className="text-gray-400">×{quantity}</span></span>
                        <span className="font-medium flex-shrink-0">{formatRupiah(product.price * quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-800">Total</span>
                      <span className="text-xl font-bold text-gray-900">{formatRupiah(total)}</span>
                    </div>
                  </div>

                  {/* Input uang */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Uang yang Dibayarkan (Rp)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={paymentInput}
                      onChange={(e) => setPaymentInput(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-gray-200 focus:border-emerald-500 rounded-xl text-2xl font-bold text-right focus:outline-none transition-colors"
                      placeholder="0"
                      autoFocus
                    />
                  </div>

                  {/* Nominal cepat */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Nominal cepat:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_AMOUNTS.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setPaymentInput(String(amt))}
                          className={`py-2.5 text-xs border rounded-xl font-medium transition-colors active:scale-95 ${
                            amt >= total ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Rp {(amt / 1000).toFixed(0)}k
                        </button>
                      ))}
                      <button
                        onClick={() => setPaymentInput(String(total))}
                        className="py-2.5 text-xs border-2 border-emerald-500 text-emerald-600 bg-emerald-50 rounded-xl font-semibold hover:bg-emerald-100 active:scale-95 transition-all"
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
                      className="hidden sm:block flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleCompleteSale}
                      disabled={payment < total || processing}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {processing ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Memproses...</>
                      ) : (
                        <><CheckCircle size={16} /> Selesaikan Transaksi</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Struk ── */}
            {step === 'receipt' && transaction && (
              <div className="overflow-y-auto flex-1">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col items-center mb-5">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle className="text-emerald-600" size={30} />
                    </div>
                    <p className="font-semibold text-gray-800">Transaksi Berhasil!</p>
                    <p className="text-sm text-gray-500 mt-0.5">#{transaction.id.slice(0, 8).toUpperCase()}</p>
                  </div>

                  {/* Preview struk */}
                  <div className="max-w-[260px] mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden font-mono text-xs mb-5">
                    <div className="bg-gray-50 px-4 pt-4 pb-2 text-center">
                      <p className="font-bold text-sm">WARUNG MIKAYLA</p>
                      <p className="text-gray-500 text-xs">Kp. Lebaksiuh No.152, RT.05/RW.01</p>
                      <p className="text-gray-500 text-xs">WA: 0831-1253-7506</p>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      <p className="text-gray-500">No: #{transaction.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-gray-500">{new Date(transaction.created_at).toLocaleString('id-ID')}</p>
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      {transaction.items.map(({ product, quantity }) => (
                        <div key={product.id} className="mb-1.5">
                          <p className="text-gray-800 truncate">{product.name}</p>
                          <div className="flex justify-between text-gray-600">
                            <span>{quantity}×{formatRupiah(product.price)}</span>
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
                      <p className="text-center text-gray-500">Terima kasih!</p>
                    </div>
                  </div>

                  <div className="flex gap-3 max-w-[260px] mx-auto">
                    <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors">
                      <Printer size={15} />Cetak
                    </button>
                    <button onClick={handleDownloadPDF} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3 rounded-xl text-sm font-medium transition-colors">
                      <Download size={15} />PDF
                    </button>
                  </div>
                  <button onClick={onClose} className="block w-full max-w-[260px] mx-auto mt-2 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
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
