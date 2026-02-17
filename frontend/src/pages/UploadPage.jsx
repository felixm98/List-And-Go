import { useState } from 'react'
import DropZone from '../components/DropZone'
import PresetSelector from '../components/PresetSelector'
import ListingGrid from '../components/ListingGrid'
import api from '../services/api'

function UploadPage({ listings, addListings, updateListing, removeListing, clearListings, addUpload }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingProducts, setPendingProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  
  const handleFilesProcessed = async (products, shouldShowModal) => {
    if (shouldShowModal) {
      setPendingProducts(products)
      setShowModal(true)
    } else {
      addListings(products)
    }
  }
  
  const handlePresetSelected = async (preset) => {
    if (!preset) {
      setShowModal(false)
      return
    }
    
    setIsProcessing(true)
    setShowModal(false)
    
    // Apply preset settings directly to all products (no AI)
    const processedProducts = pendingProducts.map((product) => {
      return {
        ...product,
        title: `${product.folderName} | Digital Download`,
        description: preset.manual_description || preset.description || '',
        tags: preset.default_tags || preset.tags?.split(',').map(t => t.trim()) || [],
        category: preset.taxonomy_path,
        categoryId: preset.taxonomy_id,
        price: preset.price || '',
        shippingProfile: preset.shipping_profile_name,
        shippingProfileId: preset.shipping_profile_id,
        returnPolicy: preset.return_policy_name,
        returnPolicyId: preset.return_policy_id,
        quantity: preset.quantity || 999,
        materials: preset.materials || '',
        style: '',
        styles: [],
        listing_attributes: {},
        status: 'ready',
        videos: product.videos || [],
        presetId: preset.id,
        presetName: preset.name
      }
    })
    
    addListings(processedProducts)
    setPendingProducts([])
    setIsProcessing(false)
  }
  
  const handleUpload = async (listingsToUpload, scheduleDate) => {
    // Store original File objects for image upload after publishing
    // Map by folderName for robust matching
    const imageFilesMap = new Map()
    const videoFilesMap = new Map()
    
    listingsToUpload.forEach(l => {
      const key = l.folderName || l.id
      if (l.images && l.images.length > 0) {
        imageFilesMap.set(key, l.images.filter(img => img.file).map(img => img.file))
      }
      if (l.videos && l.videos.length > 0) {
        videoFilesMap.set(key, l.videos.filter(vid => vid.file).map(vid => vid.file))
      }
    })
    
    // Prepare listings for backend (convert images/videos to metadata, not File objects)
    const listingsPayload = listingsToUpload.map(l => ({
      ...l,
      images: l.images ? l.images.map(img => ({ name: img.name || img.file?.name })) : [],
      videos: l.videos ? l.videos.map(vid => ({ name: vid.name || vid.file?.name })) : []
    }))

    // Send upload to backend
    try {
      const uploadResp = await api.createUpload(
        listingsToUpload.length === 1 ? listingsToUpload[0].title : `${listingsToUpload.length} produkter`,
        listingsPayload,
        scheduleDate
      )
      
      // If not scheduled, publish immediately and upload images
      if (!scheduleDate && uploadResp.id) {
        // Publish to Etsy to create draft listings
        const publishResp = await api.publishUpload(uploadResp.id)
        
        // Now upload images to each listing
        if (publishResp.listings) {
          let imageUploadCount = 0
          let imageErrorCount = 0
          
          for (const listing of publishResp.listings) {
            // Match listing to original files by folder_name
            const key = listing.folder_name || listing.id
            const imageFiles = imageFilesMap.get(key) || []
            const videoFiles = videoFilesMap.get(key) || []
            
            // Only upload if listing was successfully created on Etsy
            if (!listing.etsy_listing_id) {
              console.warn(`Skipping image upload for listing ${listing.id} - no Etsy listing ID`)
              continue
            }
            
            // Upload images (rank 1 is primary)
            for (let rank = 0; rank < imageFiles.length; rank++) {
              try {
                await api.uploadImageToListing(
                  uploadResp.id,
                  listing.id,
                  imageFiles[rank],
                  rank + 1  // Etsy ranks are 1-based
                )
                imageUploadCount++
              } catch (imgErr) {
                console.error(`Failed to upload image ${rank + 1} for listing ${listing.id}:`, imgErr)
                imageErrorCount++
              }
            }
            
            // Upload videos
            for (const videoFile of videoFiles) {
              try {
                await api.uploadVideoToListing(uploadResp.id, listing.id, videoFile)
              } catch (vidErr) {
                console.error(`Failed to upload video for listing ${listing.id}:`, vidErr)
              }
            }
          }
          
          if (imageUploadCount > 0) {
            console.log(`Successfully uploaded ${imageUploadCount} images`)
          }
          if (imageErrorCount > 0) {
            console.warn(`Failed to upload ${imageErrorCount} images`)
          }
        }
        
        // Update the upload response for the UI
        addUpload(publishResp)
      } else {
        addUpload(uploadResp)
      }

      listingsToUpload.forEach(l => removeListing(l.id))
      alert(scheduleDate 
        ? `${listingsToUpload.length} products scheduled for publishing!`
        : `${listingsToUpload.length} products uploaded to Etsy as drafts!`
      )
    } catch (err) {
      alert('Upload error: ' + (err.message || err))
    }
  }
  
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Products</h1>
        <p className="text-gray-600">
          Drag and drop folders with product images. Select a preset to apply settings automatically.
        </p>
      </div>
      
      {/* Drop Zone */}
      <DropZone
        onFilesProcessed={handleFilesProcessed}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        showPreProcessModal={true}
      />
      
      {/* Step-by-step guide */}
      <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm">?</span>
          How it works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold mb-3">1</div>
            <h4 className="font-medium text-gray-800 mb-1">Create Preset</h4>
            <p className="text-sm text-gray-500">Set up price, category, shipping once — reuse for all listings</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold mb-3">2</div>
            <h4 className="font-medium text-gray-800 mb-1">Upload</h4>
            <p className="text-sm text-gray-500">Drag folders and select a preset to apply settings</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold mb-3">3</div>
            <h4 className="font-medium text-gray-800 mb-1">Review & Edit</h4>
            <p className="text-sm text-gray-500">Adjust titles, descriptions, tags and prices before publishing</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold mb-3">4</div>
            <h4 className="font-medium text-gray-800 mb-1">Publish</h4>
            <p className="text-sm text-gray-500">Upload as drafts to your Etsy shop or schedule them</p>
          </div>
        </div>
      </div>
      
      {/* Preset Selector Modal */}
      <PresetSelector
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setPendingProducts([])
        }}
        onConfirm={handlePresetSelected}
        productCount={pendingProducts.length}
      />
      
      {/* Listings Grid */}
      <ListingGrid
        listings={listings}
        onUpdate={updateListing}
        onRemove={removeListing}
        onUpload={handleUpload}
        onClear={clearListings}
      />
    </div>
  )
}

export default UploadPage
