import { Link, useLocation } from 'react-router-dom'
import { Upload, LayoutDashboard, Settings, User, Link2, Link2Off } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../services/api'

function Navbar({ listingsCount }) {
  const location = useLocation()
  const [etsyStatus, setEtsyStatus] = useState({ connected: false, shop: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkEtsyStatus()
  }, [])

  const checkEtsyStatus = async () => {
    try {
      const status = await api.getEtsyStatus()
      setEtsyStatus(status)
    } catch (err) {
      setEtsyStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectEtsy = async () => {
    try {
      const authUrl = await api.connectEtsy()
      window.location.href = authUrl
    } catch (err) {
      alert('Kunde inte ansluta till Etsy: ' + err.message)
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

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Etsy Connection Status */}
            {loading ? (
              <div className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-sm">
                Laddar...
              </div>
            ) : etsyStatus.connected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {etsyStatus.shop?.shop_name || 'Etsy ansluten'}
              </div>
            ) : (
              <button
                onClick={handleConnectEtsy}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-etsy-orange rounded-full text-sm hover:bg-orange-100 transition-colors"
              >
                <Link2Off className="w-4 h-4" />
                Anslut Etsy
              </button>
            )}

            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
