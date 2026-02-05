import { Link, useLocation } from 'react-router-dom'
import { Upload, LayoutDashboard, Settings, LogOut, Store } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../services/api'

function Navbar({ listingsCount, onLogout }) {
  const location = useLocation()
  const [etsyStatus, setEtsyStatus] = useState({ connected: false, shop: null })
  const [loading, setLoading] = useState(true)
  const [shopName, setShopName] = useState(localStorage.getItem('shopName') || null)

  useEffect(() => {
    checkEtsyStatus()
  }, [])

  const checkEtsyStatus = async () => {
    try {
      const status = await api.getEtsyStatus()
      setEtsyStatus(status)
      if (status.shop?.shop_name) {
        setShopName(status.shop.shop_name)
        localStorage.setItem('shopName', status.shop.shop_name)
      }
    } catch (err) {
      setEtsyStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    if (confirm('Är du säker på att du vill logga ut?')) {
      onLogout()
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-etsy-orange rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-etsy-black">
              List-And-Go
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isActive('/')
                  ? 'bg-etsy-light text-etsy-orange'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Upload className="w-4 h-4" />
              Ladda upp
              {listingsCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-etsy-orange text-white text-xs rounded-full">
                  {listingsCount}
                </span>
              )}
            </Link>

            <Link
              to="/dashboard"
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isActive('/dashboard')
                  ? 'bg-etsy-light text-etsy-orange'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            <Link
              to="/settings"
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isActive('/settings')
                  ? 'bg-etsy-light text-etsy-orange'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Settings className="w-4 h-4" />
              Inställningar
            </Link>
          </div>

          {/* Right side - Shop info and logout */}
          <div className="flex items-center gap-3">
            {/* Shop Name Display */}
            {loading ? (
              <div className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-sm">
                Laddar...
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                <Store className="w-4 h-4" />
                <span className="font-medium">{shopName || etsyStatus.shop?.shop_name || 'Min butik'}</span>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logga ut"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logga ut</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
