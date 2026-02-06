import { useState, useEffect, useCallback } from 'react'
import { 
  RefreshCw, Search, ChevronLeft, ChevronRight, 
  Loader2, CheckSquare, Square, Edit, Eye, ExternalLink,
  Package, Image as ImageIcon, Tag, AlertCircle, Filter, Clock
} from 'lucide-react'
import { api } from '../services/api'
import BulkEditModal from '../components/BulkEditModal'

const STATUS_TABS = [
  { key: 'active', label: 'Active', color: 'text-green-600 bg-green-100' },
  { key: 'draft', label: 'Draft', color: 'text-gray-600 bg-gray-100' },
  { key: 'expired', label: 'Expired', color: 'text-amber-600 bg-amber-100' },
  { key: 'sold_out', label: 'Sold Out', color: 'text-red-600 bg-red-100' },
  { key: 'inactive', label: 'Inactive', color: 'text-gray-500 bg-gray-50' }
]

export default function ListingManagerPage() {
  // State
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [stateCounts, setStateCounts] = useState({})
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25
  
  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set())
  
  // Bulk edit modal
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  
  // Last sync time and cache freshness
  const [lastSync, setLastSync] = useState(null)
  const [cacheInfo, setCacheInfo] = useState(null)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  
  // Fetch listings
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.getShopListings({
        state: activeTab,
        page,
        perPage,
        search
      })
      
      setListings(result.listings || [])
      setTotal(result.total || 0)
      setTotalPages(result.total_pages || 1)
      setStateCounts(result.state_counts || {})
      setCacheInfo(result.cache_info || null)
      setNeedsRefresh(result.needs_refresh || false)
    } catch (error) {
      console.error('Failed to fetch listings:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, perPage, search])
  
  useEffect(() => {
    fetchListings()
  }, [fetchListings])
  
  // Sync from Etsy
  const handleSync = async () => {
    try {
      setSyncing(true)
      const result = await api.syncShopListings()
      setStateCounts(result.state_counts || {})
      setLastSync(new Date())
      await fetchListings()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
    setSelectedIds(new Set())
  }
  
  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(listings.map(l => l.etsy_listing_id)))
    }
  }
  
  const toggleSelect = (listingId) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(listingId)) {
      newSelected.delete(listingId)
    } else {
      newSelected.add(listingId)
    }
    setSelectedIds(newSelected)
  }
  
  // Get selected listings for bulk edit
  const getSelectedListings = () => {
    return listings.filter(l => selectedIds.has(l.etsy_listing_id))
  }
  
  // Handle bulk edit complete
  const handleBulkEditComplete = () => {
    setShowBulkEdit(false)
    setSelectedIds(new Set())
    fetchListings()
  }
  
  // Format price
  const formatPrice = (listing) => {
    if (listing.price === null || listing.price === undefined) return '-'
    return `$${listing.price.toFixed(2)}`
  }
  
  // Get primary image
  const getPrimaryImage = (listing) => {
    if (!listing.images || listing.images.length === 0) return null
    const primary = listing.images.find(img => img.rank === 1) || listing.images[0]
    return primary.url_170x170 || primary.url_75x75
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Shop Listings</h1>
          <p className="text-gray-600">
            View and edit your existing Etsy listings
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-sm text-gray-500">
              Last sync: {lastSync.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Refresh Shop'}
          </button>
        </div>
      </div>
      
      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? `${tab.color} ring-2 ring-offset-2 ring-${tab.color.split(' ')[0].replace('text-', '')}`
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.key ? 'bg-white/50' : 'bg-gray-200'
            }`}>
              {stateCounts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>
      
      {/* Cache Freshness Warning - Etsy API Terms Section 5 Compliance */}
      {needsRefresh && cacheInfo && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <Clock className="w-5 h-5" />
            <span className="text-sm">
              <strong>Data may be outdated:</strong> Last synced {cacheInfo.age_hours?.toFixed(1) || '?'} hours ago. 
              Etsy requires listing data to be refreshed every {cacheInfo.max_age_hours} hours.
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Refresh Now'}
          </button>
        </div>
      )}
      
      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </form>
        
        {/* Edit Selected Button */}
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkEdit(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            Edit Selected ({selectedIds.size})
          </button>
        )}
      </div>
      
      {/* Listings Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {search ? 'No listings match your search' : 'No listings found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {search 
                ? 'Try adjusting your search terms' 
                : 'Click "Refresh Shop" to sync your Etsy listings'
              }
            </p>
            {!search && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
              >
                Refresh Shop
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b font-medium text-sm text-gray-600">
              <div className="col-span-1 flex items-center">
                <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                  {selectedIds.size === listings.length ? (
                    <CheckSquare className="w-5 h-5 text-brand-primary" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="col-span-1">Image</div>
              <div className="col-span-4">Title</div>
              <div className="col-span-1">SKU</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-1 text-center">Images</div>
              <div className="col-span-1 text-center">Favs</div>
              <div className="col-span-1"></div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y">
              {listings.map(listing => (
                <div 
                  key={listing.etsy_listing_id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                    selectedIds.has(listing.etsy_listing_id) ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div className="col-span-1">
                    <button 
                      onClick={() => toggleSelect(listing.etsy_listing_id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {selectedIds.has(listing.etsy_listing_id) ? (
                        <CheckSquare className="w-5 h-5 text-brand-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  {/* Image */}
                  <div className="col-span-1">
                    {getPrimaryImage(listing) ? (
                      <img
                        src={getPrimaryImage(listing)}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Title */}
                  <div className="col-span-4">
                    <p className="font-medium text-gray-800 line-clamp-2 text-sm">
                      {listing.title}
                    </p>
                  </div>
                  
                  {/* SKU */}
                  <div className="col-span-1">
                    <span className="text-sm text-gray-500">
                      {listing.sku || '-'}
                    </span>
                  </div>
                  
                  {/* Quantity */}
                  <div className="col-span-1 text-center">
                    <span className="text-sm text-gray-700">
                      {listing.quantity}
                    </span>
                  </div>
                  
                  {/* Price */}
                  <div className="col-span-1 text-right">
                    <span className="font-medium text-gray-800">
                      {formatPrice(listing)}
                    </span>
                  </div>
                  
                  {/* Images Count */}
                  <div className="col-span-1 text-center">
                    <span className="text-sm text-gray-600">
                      {listing.images?.length || 0}
                    </span>
                  </div>
                  
                  {/* Favorites */}
                  <div className="col-span-1 text-center">
                    <span className="text-sm text-gray-600">
                      {listing.num_favorers || 0}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-1 flex justify-end gap-1">
                    {listing.url && (
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-brand-primary rounded-lg hover:bg-gray-100"
                        title="View on Etsy"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Showing {((page - 1) * perPage) + 1} - {Math.min(page * perPage, total)} of {total} listings
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      page === pageNum
                        ? 'bg-brand-primary text-white'
                        : 'border hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <BulkEditModal
          listings={getSelectedListings()}
          onClose={() => setShowBulkEdit(false)}
          onComplete={handleBulkEditComplete}
        />
      )}
    </div>
  )
}
