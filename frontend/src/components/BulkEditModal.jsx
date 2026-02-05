import { useState, useCallback } from 'react'
import { 
  X, Type, Tag, Image as ImageIcon, Sparkles, Loader2, Save, 
  CheckCircle, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import { api } from '../services/api'
import ImageManager from './ImageManager'

const TABS = [
  { key: 'titles', label: 'Titles', icon: Type },
  { key: 'tags', label: 'Tags', icon: Tag },
  { key: 'images', label: 'Images', icon: ImageIcon }
]

export default function BulkEditModal({ listings, onClose, onComplete }) {
  const [activeTab, setActiveTab] = useState('titles')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  
  // AI options
  const [imageRank, setImageRank] = useState(1)
  const [aiGuidance, setAiGuidance] = useState('')
  
  // Edits state - tracks changes per listing
  const [edits, setEdits] = useState(() => {
    const initial = {}
    listings.forEach(listing => {
      initial[listing.etsy_listing_id] = {
        title: listing.title,
        tags: listing.tags?.join(', ') || '',
        selected: true
      }
    })
    return initial
  })
  
  // Track which listings have been modified
  const [modified, setModified] = useState(new Set())
  
  // Success/error tracking
  const [results, setResults] = useState({ success: [], failed: [] })
  
  // Update edit for a listing
  const updateEdit = (listingId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        [field]: value
      }
    }))
    setModified(prev => new Set([...prev, listingId]))
  }
  
  // Toggle selection for a listing
  const toggleListingSelection = (listingId) => {
    setEdits(prev => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        selected: !prev[listingId]?.selected
      }
    }))
  }
  
  // Select/deselect all
  const toggleSelectAll = () => {
    const allSelected = Object.values(edits).every(e => e.selected)
    setEdits(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], selected: !allSelected }
      })
      return updated
    })
  }
  
  // Get selected listing IDs
  const getSelectedIds = () => {
    return Object.entries(edits)
      .filter(([_, data]) => data.selected)
      .map(([id]) => id)
  }
  
  // Regenerate AI content for selected listings
  const handleRegenerateAll = async () => {
    const selectedIds = getSelectedIds()
    if (selectedIds.length === 0) return
    
    setRegenerating(true)
    const field = activeTab === 'titles' ? 'title' : 'tags'
    
    for (const listingId of selectedIds) {
      try {
        const result = await api.regenerateListingContent(
          listingId, 
          field, 
          aiGuidance, 
          imageRank
        )
        
        if (field === 'title') {
          updateEdit(listingId, 'title', result.value)
        } else {
          // Tags come back as array
          const tagsStr = Array.isArray(result.value) 
            ? result.value.join(', ') 
            : result.value
          updateEdit(listingId, 'tags', tagsStr)
        }
      } catch (error) {
        console.error(`Failed to regenerate for ${listingId}:`, error)
      }
    }
    
    setRegenerating(false)
  }
  
  // Save changes
  const handleSave = async () => {
    const selectedIds = getSelectedIds()
    const modifiedAndSelected = selectedIds.filter(id => modified.has(id))
    
    if (modifiedAndSelected.length === 0) {
      onComplete()
      return
    }
    
    setSaving(true)
    const newResults = { success: [], failed: [] }
    
    // Build updates object
    const updates = {}
    modifiedAndSelected.forEach(listingId => {
      const edit = edits[listingId]
      updates[listingId] = {}
      
      // Check what fields were modified
      const original = listings.find(l => l.etsy_listing_id === listingId)
      
      if (edit.title !== original?.title) {
        updates[listingId].title = edit.title
      }
      
      const originalTags = original?.tags?.join(', ') || ''
      if (edit.tags !== originalTags) {
        updates[listingId].tags = edit.tags
      }
    })
    
    try {
      const result = await api.bulkUpdateListings(modifiedAndSelected, updates)
      newResults.success = result.results?.success || []
      newResults.failed = result.results?.failed || []
    } catch (error) {
      console.error('Bulk update failed:', error)
      newResults.failed = modifiedAndSelected.map(id => ({ listing_id: id, error: error.message }))
    }
    
    setResults(newResults)
    setSaving(false)
    
    // If all succeeded, close modal
    if (newResults.failed.length === 0) {
      onComplete()
    }
  }
  
  // Get listing by ID
  const getListingById = (id) => listings.find(l => l.etsy_listing_id === id)
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Bulk Edit: {listings.length} Listings
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex h-[calc(100vh-250px)] min-h-[500px]">
          {/* Left Sidebar - Tabs */}
          <div className="w-48 border-r bg-gray-50 p-4">
            <nav className="space-y-2">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Content Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {activeTab === 'titles' && 'Edit Titles'}
                    {activeTab === 'tags' && 'Edit Tags'}
                    {activeTab === 'images' && 'Manage Images'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'titles' && 'Edit listing titles individually or use AI to regenerate them'}
                    {activeTab === 'tags' && 'Edit listing tags individually or use AI to regenerate them (max 13 per listing)'}
                    {activeTab === 'images' && 'Upload images and configure where they\'ll be inserted across your listings'}
                  </p>
                </div>
                
                {/* AI Regenerate Options (for titles and tags) */}
                {(activeTab === 'titles' || activeTab === 'tags') && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Reference Image Rank</label>
                      <select
                        value={imageRank}
                        onChange={(e) => setImageRank(parseInt(e.target.value))}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    
                    <input
                      type="text"
                      value={aiGuidance}
                      onChange={(e) => setAiGuidance(e.target.value)}
                      placeholder="AI Guidance Note (Optional)"
                      className="px-3 py-1.5 border rounded-lg text-sm w-64"
                    />
                    
                    <button
                      onClick={handleRegenerateAll}
                      disabled={regenerating || getSelectedIds().length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {regenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Regenerate All Selected
                    </button>
                  </div>
                )}
              </div>
              
              {/* Select All */}
              {(activeTab === 'titles' || activeTab === 'tags') && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={Object.values(edits).every(e => e.selected)}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-brand-primary rounded"
                  />
                  <label htmlFor="selectAll" className="text-sm text-gray-600">
                    Select All
                  </label>
                  <span className="text-sm text-gray-400">
                    ({getSelectedIds().length} selected)
                  </span>
                </div>
              )}
            </div>
            
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Titles Tab */}
              {activeTab === 'titles' && (
                <div className="space-y-4">
                  {listings.map(listing => (
                    <div 
                      key={listing.etsy_listing_id}
                      className={`p-4 border rounded-lg ${
                        edits[listing.etsy_listing_id]?.selected 
                          ? 'border-blue-200 bg-blue-50/50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={edits[listing.etsy_listing_id]?.selected || false}
                          onChange={() => toggleListingSelection(listing.etsy_listing_id)}
                          className="w-5 h-5 mt-1 text-brand-primary rounded"
                        />
                        
                        {/* Image */}
                        {listing.images?.[0] && (
                          <div className="relative flex-shrink-0">
                            <img
                              src={listing.images[0].url_170x170 || listing.images[0].url_75x75}
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                              1
                            </span>
                          </div>
                        )}
                        
                        {/* Title Input */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-500">Title</span>
                            <span className={`text-xs ${
                              (edits[listing.etsy_listing_id]?.title?.length || 0) > 140 
                                ? 'text-red-500' 
                                : 'text-gray-400'
                            }`}>
                              {edits[listing.etsy_listing_id]?.title?.length || 0}/140 characters
                            </span>
                          </div>
                          <input
                            type="text"
                            value={edits[listing.etsy_listing_id]?.title || ''}
                            onChange={(e) => updateEdit(listing.etsy_listing_id, 'title', e.target.value)}
                            maxLength={140}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Tags Tab */}
              {activeTab === 'tags' && (
                <div className="space-y-4">
                  {listings.map(listing => {
                    const tagsArray = edits[listing.etsy_listing_id]?.tags
                      ?.split(',')
                      .map(t => t.trim())
                      .filter(t => t) || []
                    
                    return (
                      <div 
                        key={listing.etsy_listing_id}
                        className={`p-4 border rounded-lg ${
                          edits[listing.etsy_listing_id]?.selected 
                            ? 'border-blue-200 bg-blue-50/50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={edits[listing.etsy_listing_id]?.selected || false}
                            onChange={() => toggleListingSelection(listing.etsy_listing_id)}
                            className="w-5 h-5 mt-1 text-brand-primary rounded"
                          />
                          
                          {/* Image */}
                          {listing.images?.[0] && (
                            <div className="relative flex-shrink-0">
                              <img
                                src={listing.images[0].url_170x170 || listing.images[0].url_75x75}
                                alt=""
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                                1
                              </span>
                            </div>
                          )}
                          
                          {/* Tags Input */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-500">
                                Tags (comma-separated)
                              </span>
                              <span className={`text-xs ${
                                tagsArray.length > 13 ? 'text-red-500' : 'text-gray-400'
                              }`}>
                                {tagsArray.length}/13 tags
                              </span>
                            </div>
                            <textarea
                              value={edits[listing.etsy_listing_id]?.tags || ''}
                              onChange={(e) => updateEdit(listing.etsy_listing_id, 'tags', e.target.value)}
                              rows={2}
                              placeholder="tag1, tag2, tag3..."
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {/* Images Tab */}
              {activeTab === 'images' && (
                <ImageManager listings={listings} />
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          {/* Results summary */}
          <div>
            {results.success.length > 0 && (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                {results.success.length} updated
              </span>
            )}
            {results.failed.length > 0 && (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {results.failed.length} failed
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || modified.size === 0}
              className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
