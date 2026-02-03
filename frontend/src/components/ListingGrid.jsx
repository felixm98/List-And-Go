import { useState } from 'react'
import { Grid, List, Upload, Calendar, Trash2, CheckCircle } from 'lucide-react'
import ListingCard from './ListingCard'
import SchedulePicker from './SchedulePicker'

function ListingGrid({ listings, onUpdate, onRemove, onUpload, onClear }) {
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedListings, setSelectedListings] = useState(new Set())
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(null)
  
  const toggleSelect = (id) => {
    setSelectedListings(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  const selectAll = () => {
    if (selectedListings.size === listings.length) {
      setSelectedListings(new Set())
    } else {
      setSelectedListings(new Set(listings.map(l => l.id)))
    }
  }
  
  const handleUpload = () => {
    const listingsToUpload = selectedListings.size > 0 
      ? listings.filter(l => selectedListings.has(l.id))
      : listings
    
    onUpload(listingsToUpload, scheduleDate)
    setShowScheduler(false)
    setScheduleDate(null)
  }
  
  const averageSeoScore = Math.round(
    listings.reduce((sum, l) => sum + l.seoScore, 0) / listings.length
  )
  
  const getSeoColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  if (listings.length === 0) return null
  
  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {listings.length} {listings.length === 1 ? 'produkt' : 'produkter'} redo
          </h2>
          <p className="text-sm text-gray-500">
            Genomsnittlig SEO-poäng: <span className={`font-semibold ${getSeoColor(averageSeoScore)}`}>{averageSeoScore}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          {/* Select All */}
          <button
            onClick={selectAll}
            className="btn-secondary text-sm"
          >
            {selectedListings.size === listings.length ? 'Avmarkera alla' : 'Välj alla'}
          </button>
        </div>
      </div>
      
      {/* Listings Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'space-y-4'
      }>
        {listings.map(listing => (
          <div key={listing.id} className="relative">
            {/* Selection checkbox */}
            <div 
              className={`
                absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full border-2 cursor-pointer
                flex items-center justify-center transition-all
                ${selectedListings.has(listing.id) 
                  ? 'bg-etsy-orange border-etsy-orange' 
                  : 'bg-white border-gray-300 hover:border-etsy-orange'
                }
              `}
              onClick={() => toggleSelect(listing.id)}
            >
              {selectedListings.has(listing.id) && (
                <CheckCircle className="w-4 h-4 text-white" />
              )}
            </div>
            
            <ListingCard
              listing={listing}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          </div>
        ))}
      </div>
      
      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            {selectedListings.size > 0 
              ? `${selectedListings.size} av ${listings.length} valda`
              : `${listings.length} produkter`
            }
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClear}
              className="btn-secondary flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Rensa alla
            </button>
            
            <button
              onClick={() => setShowScheduler(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Schemalägg
            </button>
            
            <button
              onClick={() => handleUpload()}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Ladda upp till Etsy
            </button>
          </div>
        </div>
      </div>
      
      {/* Schedule Modal */}
      {showScheduler && (
        <SchedulePicker
          isOpen={showScheduler}
          onClose={() => setShowScheduler(false)}
          onConfirm={(date) => {
            setScheduleDate(date)
            handleUpload()
          }}
          listingCount={selectedListings.size > 0 ? selectedListings.size : listings.length}
        />
      )}
      
      {/* Spacer for fixed action bar */}
      <div className="h-24" />
    </div>
  )
}

export default ListingGrid
