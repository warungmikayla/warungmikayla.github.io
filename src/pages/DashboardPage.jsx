import { useState } from 'react'
import Navbar from '../components/Navbar'
import ProductsTab from '../components/ProductsTab'
import SalesTab from '../components/SalesTab'
import ReportTab from '../components/ReportTab'
import SalesModal from '../components/SalesModal'
import { Package, ClipboardList, BarChart2 } from 'lucide-react'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('products')
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [salesRefresh, setSalesRefresh] = useState(0)

  const tabs = [
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'sales', label: 'Riwayat', icon: ClipboardList },
    { id: 'report', label: 'Laporan', icon: BarChart2 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onNewSale={() => setShowSalesModal(true)} />

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 mb-4 sm:mb-6 w-full sm:w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
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
        {activeTab === 'report' && <ReportTab />}
      </main>

      {showSalesModal && (
        <SalesModal
          onClose={() => setShowSalesModal(false)}
          onComplete={() => setSalesRefresh(n => n + 1)}
        />
      )}
    </div>
  )
}
