import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'

import Navbar from './components/Navbar'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const [listings, setListings] = useState([])
  const [uploads, setUploads] = useState([])

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar listingsCount={listings.length} />
      <main className="container mx-auto px-4 py-6">
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
        </Routes>
      </main>
    </div>
  )
}

export default App
