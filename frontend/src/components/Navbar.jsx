import { Link, useLocation } from 'react-router-dom'
import { Upload, LayoutDashboard, Settings, LogOut, Store, Monitor, List, Layers } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../services/api'

function Navbar({ listingsCount, onLogout, isDemoMode = false }) {
  const location = useLocation()
  const [etsyStatus, setEtsyStatus] = useState({ connected: false, shop: null })
  const [loading, setLoading] = useState(true)
  const [shopName, setShopName] = useState(localStorage.getItem('shopName') || null)

  useEffect(() => {
    if (!isDemoMode) {
      checkEtsyStatus()
    } else {
      setLoading(false)
    }
  }, [isDemoMode])

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
    if (confirm('Are you sure you want to log out?')) {
      onLogout()
    }
  }

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/', icon: Upload, label: 'Upload', badge: listingsCount },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/shop-listings', icon: List, label: 'Shop Listings' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <nav className="bg-brand-black sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          {/* Left side: Logo + Nav links */}
          <div className="flex items-center gap-6 flex-1">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 mr-4">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-teal-400 rounded-md flex items-center justify-center">
                <Layers className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-semibold text-[15px] text-white tracking-tight">
                List-And-Go
              </span>
            </Link>

            {/* Divider */}
            <div className="w-px h-6 bg-white/15" />

            {/* Navigation Links */}
            <div className="flex items-center gap-0.5">
              {navLinks.map(({ to, icon: Icon, label, badge }) => (
                <Link
                  key={to}
                  to={to}
                  className={`
                    relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                    ${isActive(to)
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {badge > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 bg-brand-primary text-white text-[10px] font-bold rounded-full leading-none">
                      {badge}
                    </span>
                  )}
                  {isActive(to) && (
                    <span className="absolute -bottom-[11px] left-3 right-3 h-0.5 bg-brand-primary rounded-full" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - Status + Logout */}
          <div className="flex items-center gap-2">
            {isDemoMode ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-md text-xs font-medium">
                <Monitor className="w-3.5 h-3.5" />
                Demo
              </div>
            ) : loading ? (
              <div className="px-2.5 py-1 bg-white/10 text-white/50 rounded-md text-xs">
                Loading...
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-md text-xs font-medium">
                <Store className="w-3.5 h-3.5" />
                {shopName || etsyStatus.shop?.shop_name || 'My Shop'}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1 text-white/50 hover:text-red-400 hover:bg-red-500/15 rounded-md transition-colors text-xs"
              title={isDemoMode ? "Exit demo" : "Log out"}
            >
              <LogOut className="w-3.5 h-3.5" />
              {isDemoMode ? "Exit" : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
