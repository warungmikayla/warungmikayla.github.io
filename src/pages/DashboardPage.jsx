import { useState } from 'react'
import Navbar from '../components/Navbar'
import ProductsTab from '../components/ProductsTab'
import SalesTab from '../components/SalesTab'
import SalesModal from '../components/SalesModal'
import { Package, ClipboardList } from 'lucide-react'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('products')
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [salesRefresh, setSalesRefresh] = useState(0)

  const handleSaleComplete = () => {
    setSalesRefresh(n => n + 1)
  }

  const tabs = [
    { id: 'products', label: 'Daftar Produk', icon: Package },
    { id: 'sales', label: 'Riwayat Transaksi', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onNewSale={() => setShowSalesModal(true)} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'sales' && <SalesTab refresh={salesRefresh} />}
      </main>

      {showSalesModal && (
        <SalesModal
          onClose={() => setShowSalesModal(false)}
          onComplete={handleSaleComplete}
        />
      )}
    </div>
  )
}
