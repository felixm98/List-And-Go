import { useState, useCallback, useRef } from 'react'
import { 
  Upload, Trash2, GripVertical, Plus, X, Loader2, 
  Image as ImageIcon, AlertTriangle, Check, ArrowRight
} from 'lucide-react'
import { api } from '../services/api'

const MAX_IMAGES = 10

export default function ImageManager({ listings }) {
  // State
  const [operation, setOperation] = useState('upload') // 'upload' or 'remove'
  const [selectedFiles, setSelectedFiles] = useState([])
  const [insertPosition, setInsertPosition] = useState(1) // 1-10
  const [insertBehavior, setInsertBehavior] = useState('shift') // 'shift' or 'replace'
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState({ success: [], failed: [] })
  
  // For remove operation
  const [removePosition, setRemovePosition] = useState(1)
  
  // File input ref
  const fileInputRef = useRef(null)
  
  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB max
      return isImage && isValidSize
    })
    
    setSelectedFiles(prev => [...prev, ...validFiles])
  }
  
  // Handle drag and drop
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024
      return isImage && isValidSize
    })
    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [])
  
  const handleDragOver = (e) => {
    e.preventDefault()
  }
  
  // Remove selected file
  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }
  
  // Apply upload operation
  const handleApplyUpload = async () => {
    if (selectedFiles.length === 0) return
    
    setProcessing(true)
    const newResults = { success: [], failed: [] }
    
    for (const listing of listings) {
      try {
        // Upload each file to each listing at the specified position
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          const rank = insertPosition + i
          
          if (rank > MAX_IMAGES) continue
          
          // If replacing, delete existing image at this position first
          if (insertBehavior === 'replace' && listing.images) {
            const existingImage = listing.images.find(img => img.rank === rank)
            if (existingImage) {
              try {
                await api.deleteListingImage(listing.etsy_listing_id, existingImage.listing_image_id)
              } catch (e) {
                console.error('Failed to delete existing image:', e)
              }
            }
          }
          
          // Upload new image
          await api.uploadListingImage(listing.etsy_listing_id, file, rank)
        }
        
        newResults.success.push(listing.etsy_listing_id)
      } catch (error) {
        console.error(`Failed to upload to ${listing.etsy_listing_id}:`, error)
        newResults.failed.push({
          listing_id: listing.etsy_listing_id,
          error: error.message
        })
      }
    }
    
    setResults(newResults)
    setProcessing(false)
    setSelectedFiles([])
  }
  
  // Apply remove operation
  const handleApplyRemove = async () => {
    setProcessing(true)
    const newResults = { success: [], failed: [] }
    
    for (const listing of listings) {
      try {
        // Find image at the specified position
        const imageToRemove = listing.images?.find(img => img.rank === removePosition)
        
        if (imageToRemove) {
          await api.deleteListingImage(listing.etsy_listing_id, imageToRemove.listing_image_id)
          newResults.success.push(listing.etsy_listing_id)
        } else {
          // No image at this position, consider it success
          newResults.success.push(listing.etsy_listing_id)
        }
      } catch (error) {
        console.error(`Failed to remove from ${listing.etsy_listing_id}:`, error)
        newResults.failed.push({
          listing_id: listing.etsy_listing_id,
          error: error.message
        })
      }
    }
    
    setResults(newResults)
    setProcessing(false)
  }
  
  return (
    <div className="space-y-6">
      {/* Operation Selection */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="operation"
            value="upload"
            checked={operation === 'upload'}
            onChange={(e) => setOperation(e.target.value)}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <span className="font-medium">Upload & Add</span>
            <p className="text-sm text-gray-500">Add images to listings</p>
          </div>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="operation"
            value="remove"
            checked={operation === 'remove'}
            onChange={(e) => setOperation(e.target.value)}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <span className="font-medium">Remove</span>
            <p className="text-sm text-gray-500">Remove by position</p>
          </div>
        </label>
      </div>
      
      {/* Upload Operation UI */}
      {operation === 'upload' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Upload Zone */}
          <div className="col-span-1">
            <h4 className="font-medium text-gray-700 mb-3">Select Images to Upload</h4>
            
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Plus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700">Select Images to Upload</p>
              <p className="text-sm text-gray-500 mt-1">Drag & drop or click to browse</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFiles.length} file(s) selected
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <button
                        onClick={() => removeSelectedFile(index)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Configure Location */}
          <div className="col-span-1">
            <h4 className="font-medium text-gray-700 mb-3">Configure Location</h4>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm text-gray-600 mb-2">
                Insert at position
              </label>
              <select
                value={insertPosition}
                onChange={(e) => setInsertPosition(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={n}>Position {n}</option>
                ))}
              </select>
              
              <p className="text-sm text-gray-500 mt-3">
                Select an uploaded image to configure where it should be placed
              </p>
            </div>
          </div>
          
          {/* Configure Behavior */}
          <div className="col-span-1">
            <h4 className="font-medium text-gray-700 mb-3">Configure Behavior</h4>
            
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="behavior"
                  value="shift"
                  checked={insertBehavior === 'shift'}
                  onChange={(e) => setInsertBehavior(e.target.value)}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div>
                  <span className="font-medium">Shift existing</span>
                  <p className="text-sm text-gray-500">
                    Move existing images to make room
                  </p>
                </div>
              </label>
              
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="behavior"
                  value="replace"
                  checked={insertBehavior === 'replace'}
                  onChange={(e) => setInsertBehavior(e.target.value)}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div>
                  <span className="font-medium">Replace existing</span>
                  <p className="text-sm text-gray-500">
                    Delete image at position first
                  </p>
                </div>
              </label>
              
              <p className="text-sm text-gray-500 mt-3">
                Choose how the new image affects existing images
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Remove Operation UI */}
      {operation === 'remove' && (
        <div className="max-w-md">
          <h4 className="font-medium text-gray-700 mb-3">Remove Image by Position</h4>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm text-gray-600 mb-2">
              Remove image at position
            </label>
            <select
              value={removePosition}
              onChange={(e) => setRemovePosition(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>Position {n}</option>
              ))}
            </select>
            
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  This will remove the image at position {removePosition} from all {listings.length} selected listings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Listings Preview */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">
          All Listings ({listings.length})
        </h4>
        
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {listings.map(listing => (
            <div key={listing.etsy_listing_id} className="border rounded-lg p-3">
              <p className="font-medium text-sm text-gray-800 mb-2 truncate">
                {listing.title}
              </p>
              
              {/* Image slots */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: MAX_IMAGES }).map((_, index) => {
                  const rank = index + 1
                  const image = listing.images?.find(img => img.rank === rank)
                  const isTargetPosition = operation === 'upload' 
                    ? rank >= insertPosition && rank < insertPosition + selectedFiles.length
                    : rank === removePosition
                  
                  return (
                    <div 
                      key={rank}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        isTargetPosition 
                          ? operation === 'upload' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {image ? (
                        <img
                          src={image.url_75x75 || image.url_170x170}
                          alt=""
                          className={`w-full h-full object-cover ${
                            isTargetPosition && operation === 'remove' ? 'opacity-50' : ''
                          }`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <ImageIcon className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      
                      {/* Position number */}
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 text-xs flex items-center justify-center rounded ${
                        image ? 'bg-black/50 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {rank}
                      </span>
                      
                      {/* Target indicator */}
                      {isTargetPosition && (
                        <div className={`absolute inset-0 flex items-center justify-center ${
                          operation === 'upload' ? 'bg-blue-500/20' : 'bg-red-500/20'
                        }`}>
                          {operation === 'upload' ? (
                            <Plus className="w-6 h-6 text-blue-600" />
                          ) : (
                            <Trash2 className="w-6 h-6 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Apply Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        {/* Results */}
        <div className="flex items-center gap-4">
          {results.success.length > 0 && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              {results.success.length} succeeded
            </span>
          )}
          {results.failed.length > 0 && (
            <span className="flex items-center gap-1 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {results.failed.length} failed
            </span>
          )}
        </div>
        
        <button
          onClick={operation === 'upload' ? handleApplyUpload : handleApplyRemove}
          disabled={processing || (operation === 'upload' && selectedFiles.length === 0)}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white disabled:opacity-50 ${
            operation === 'upload' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : operation === 'upload' ? (
            <Upload className="w-4 h-4" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {processing 
            ? 'Processing...' 
            : operation === 'upload' 
              ? `Upload to ${listings.length} Listings`
              : `Remove from ${listings.length} Listings`
          }
        </button>
      </div>
    </div>
  )
}
