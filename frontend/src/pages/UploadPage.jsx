import { useState } from 'react'
import DropZone from '../components/DropZone'
import PreProcessModal from '../components/PreProcessModal'
import ListingGrid from '../components/ListingGrid'
import api from '../services/api'

function UploadPage({ listings, addListings, updateListing, removeListing, clearListings, addUpload }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreProcess, setShowPreProcess] = useState(true) // Toggle for showing pre-process modal
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
  
  const handlePreProcessConfirm = async (settings) => {
    setIsProcessing(true)
    setShowModal(false)
    
    // Simulate AI processing with settings applied
        const processedProducts = await Promise.all(
          pendingProducts.map(async (product) => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800))
            
            // Mock AI generation
            const styles = ['Minimalist', 'Vintage', 'Modern', 'Boho', 'Rustic', 'Elegant']
            const style = styles[Math.floor(Math.random() * styles.length)]
            
            return {
              ...product,
              title: `${style} ${product.folderName} Mockup | High Quality Digital Download | Commercial Use`,
              description: `✨ PROFESSIONAL MOCKUP ✨\n\nThis stunning ${style.toLowerCase()} mockup is perfect for showcasing your designs.\n\n📦 WHAT YOU GET:\n• ${product.images.length} high-resolution mockup variations\n• PNG format\n• 300 DPI print-ready quality\n• Instant digital download\n\n💼 COMMERCIAL LICENSE INCLUDED`,
              tags: [
                'mockup', 'digital download', style.toLowerCase(), 'commercial use',
                'png mockup', 'product mockup', 'design template', 'instant download',
                'print on demand', 'etsy seller', product.folderName.toLowerCase(),
                'professional mockup', 'high quality'
              ].slice(0, 13),
              category: settings.category,
              categoryId: settings.categoryId,
              price: settings.defaultPrice || '',
              shippingProfile: settings.shippingProfile,
              shippingProfileId: settings.shippingProfileId,
              shippingCost: settings.shippingCost,
              shippingTime: settings.shippingTime,
              returnPolicy: settings.returnPolicy,
              returnPolicyId: settings.returnPolicyId,
              quantity: settings.quantity || 999,
              materials: settings.materials,
              style: style,
              seoScore: Math.floor(70 + Math.random() * 25),
              status: 'ready',
              videos: product.videos || []
            }
          })
        )
    
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
        ? `${listingsToUpload.length} produkter schemalagda för publicering!`
        : `${listingsToUpload.length} produkter har laddats upp till Etsy som drafts!`
      )
    } catch (err) {
      alert('Fel vid uppladdning: ' + (err.message || err))
    }
  }
  
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Ladda upp Mockups</h1>
        <p className="text-gray-600">
          Dra och släpp mappar med mockup-bilder. AI genererar automatiskt titlar, taggar och beskrivningar.
        </p>
      </div>
      
      {/* Pre-process toggle */}
      <div className="flex items-center justify-end mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPreProcess}
            onChange={(e) => setShowPreProcess(e.target.checked)}
            className="w-4 h-4 text-etsy-orange rounded focus:ring-etsy-orange"
          />
          <span className="text-sm text-gray-600">Visa inställningar före bearbetning</span>
        </label>
      </div>
      
      {/* Drop Zone */}
      <DropZone
        onFilesProcessed={handleFilesProcessed}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        showPreProcessModal={showPreProcess}
      />
      
      {/* Pre-Process Modal */}
      <PreProcessModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          // Process without settings
          handlePreProcessConfirm({
            defaultPrice: '',
            category: 'Digital Downloads > Graphics > Mockups',
            shippingProfile: 'digital',
            returnPolicy: 'no_returns'
          })
        }}
        onConfirm={handlePreProcessConfirm}
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
