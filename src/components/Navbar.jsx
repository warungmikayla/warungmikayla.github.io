import { useAuth } from '../contexts/AuthContext'
import { ShoppingBag, Plus, LogOut } from 'lucide-react'

export default function Navbar({ onNewSale }) {
  const { user, signOut } = useAuth()

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ShoppingBag className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="font-bold text-gray-800 leading-tight text-sm">Warung Mikayla</p>
            <p className="text-xs text-gray-400">Sistem Kasir</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewSale}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Penjualan Baru
          </button>

          <div className="h-6 w-px bg-gray-200" />

          <span className="text-xs text-gray-500 hidden sm:block max-w-[140px] truncate">
            {user?.email}
          </span>

          <button
            onClick={signOut}
            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            title="Keluar"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </nav>
  )
}
