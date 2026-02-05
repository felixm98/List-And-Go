import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

import Navbar from './components/Navbar'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import { api } from './services/api'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const isAuthenticated = api.isAuthenticated()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const [listings, setListings] = useState([])
  const [uploads, setUploads] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated())

  // Listen for auth changes
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(api.isAuthenticated())
    }
    
    // Check on storage changes (for multi-tab support)
    window.addEventListener('storage', checkAuth)
    return () => window.removeEventListener('storage', checkAuth)
  }, [])

  const handleLogout = () => {
    api.logout()
    setIsAuthenticated(false)
    setListings([])
    setUploads([])
    localStorage.removeItem('shopName')
  }

  const addListings = (newListings) => {
    setListings(prev => [...prev, ...newListings])
  }

  const updateListing = (id, updates) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  const removeListing = (id) => {
    setListings(prev => prev.filter(l => l.id !== id))
  }

  const addUpload = (upload) => {
    setUploads(prev => [upload, ...prev])
  }

  const clearListings = () => {
    setListings([])
  }

  // If not authenticated, show login routes only
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar listingsCount={listings.length} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-6 flex-grow">
        <Routes>
          <Route 
            path="/" 
            element={
              <UploadPage 
                listings={listings}
                addListings={addListings}
                updateListing={updateListing}
                removeListing={removeListing}
                clearListings={clearListings}
                addUpload={addUpload}
              />
            } 
          />
          <Route 
            path="/dashboard" 
            element={<DashboardPage uploads={uploads} />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsPage />} 
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth-callback" element={<AuthCallbackPage />} />
        </Routes>
      </main>
      
      {/* Footer with legal disclaimer */}
      <footer className="mt-auto py-4 px-4 border-t bg-white">
        <p className="text-center text-xs text-gray-500">
          The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
        </p>
      </footer>
    </div>
  )
}

export default App
