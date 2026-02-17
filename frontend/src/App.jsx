import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

import Navbar from './components/Navbar'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import ListingManagerPage from './pages/ListingManagerPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
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
  const [isDemoMode, setIsDemoMode] = useState(localStorage.getItem('demoMode') === 'true')

  // Listen for auth changes
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(api.isAuthenticated())
    }
    
    // Check on storage changes (for multi-tab support)
    window.addEventListener('storage', checkAuth)
    return () => window.removeEventListener('storage', checkAuth)
  }, [])

  const handleEnterDemo = () => {
    setIsDemoMode(true)
    localStorage.setItem('demoMode', 'true')
  }

  const handleExitDemo = () => {
    setIsDemoMode(false)
    localStorage.removeItem('demoMode')
  }

  const handleLogout = () => {
    api.logout()
    setIsAuthenticated(false)
    setIsDemoMode(false)
    setListings([])
    setUploads([])
    localStorage.removeItem('shopName')
    localStorage.removeItem('demoMode')
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

  // If not authenticated and not in demo mode, show login routes only
  if (!isAuthenticated && !isDemoMode) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onEnterDemo={handleEnterDemo} />} />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Demo Mode Banner */}
      {isDemoMode && !isAuthenticated && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 text-xs">
              <span className="font-medium">⚡ Demo Mode</span>
              <span className="opacity-75">– Exploring without login. Some features are limited.</span>
            </div>
            <button
              onClick={() => { handleExitDemo(); }}
              className="text-xs text-amber-700 underline hover:no-underline"
            >
              Back to login
            </button>
          </div>
        </div>
      )}
      
      <Navbar listingsCount={listings.length} onLogout={handleLogout} isDemoMode={isDemoMode && !isAuthenticated} />
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
            path="/shop-listings" 
            element={<ListingManagerPage />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsPage />} 
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth-callback" element={<AuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
        </Routes>
      </main>
      
      {/* Footer with legal disclaimer */}
      <footer className="mt-auto py-4 px-4 border-t bg-white">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-brand-primary hover:underline">Privacy Policy</a>
              <span className="text-gray-300">|</span>
              <a href="/terms" className="hover:text-brand-primary hover:underline">Terms of Service</a>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
