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
    
    // Process products using real AI API
    const processedProducts = await Promise.all(
      pendingProducts.map(async (product) => {
        try {
          // Get the first image file for AI analysis
          const imageFile = product.images?.[0]?.file
          
          if (imageFile) {
            // Call real AI generation API
            const aiResult = await api.generateContent(
              imageFile,
              product.folderName,
              product.images.length,
              settings.category || ''
            )
            
            // Extract styles from listing_attributes if available
            const styles = aiResult.listing_attributes?.style || []
            const styleString = styles.length > 0 ? styles[0] : ''
            
            return {
              ...product,
              title: aiResult.title || `${product.folderName} | Digital Download`,
              description: aiResult.description || '',
              tags: aiResult.tags || [],
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
              materials: aiResult.materials || settings.materials || '',
              style: styleString,
              styles: styles,
              listing_attributes: aiResult.listing_attributes || {},
              seoScore: aiResult.seo_score || 75,
              status: 'ready',
              videos: product.videos || []
            }
          } else {
            // Fallback if no image available
            return {
              ...product,
              title: `${product.folderName} | Digital Download`,
              description: 'Digital download product',
              tags: ['digital download'],
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
              materials: settings.materials || '',
              style: '',
              styles: [],
              listing_attributes: {},
              seoScore: 50,
              status: 'ready',
              videos: product.videos || []
            }
          }
        } catch (error) {
          console.error('AI generation failed for product:', product.folderName, error)
          // Return product with basic data on error
          return {
            ...product,
            title: `${product.folderName} | Digital Download`,
            description: 'Digital download product',
            tags: ['digital download'],
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
            materials: settings.materials || '',
            style: '',
            styles: [],
            listing_attributes: {},
            seoScore: 50,
            status: 'error',
            error: error.message,
            videos: product.videos || []
          }
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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Mockups</h1>
        <p className="text-gray-600">
          Drag and drop folders with mockup images. AI automatically generates titles, tags and descriptions.
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
          <span className="text-sm text-gray-600">Show settings before processing</span>
        </label>
      </div>
      
      {/* Drop Zone */}
      <DropZone
        onFilesProcessed={handleFilesProcessed}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        showPreProcessModal={showPreProcess}
      />
      
      {/* Step-by-step guide */}
      <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-etsy-orange text-white rounded-full flex items-center justify-center text-sm">?</span>
          How it works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-etsy-light text-etsy-orange rounded-full flex items-center justify-center font-bold mb-3">1</div>
            <h4 className="font-medium text-gray-800 mb-1">Upload</h4>
            <p className="text-sm text-gray-500">Drag and drop folders with your mockup images</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-etsy-light text-etsy-orange rounded-full flex items-center justify-center font-bold mb-3">2</div>
            <h4 className="font-medium text-gray-800 mb-1">AI Generation</h4>
            <p className="text-sm text-gray-500">AI creates titles, descriptions and tags automatically</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-etsy-light text-etsy-orange rounded-full flex items-center justify-center font-bold mb-3">3</div>
            <h4 className="font-medium text-gray-800 mb-1">Review & Edit</h4>
            <p className="text-sm text-gray-500">Adjust content and see SEO score in real-time</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-etsy-light text-etsy-orange rounded-full flex items-center justify-center font-bold mb-3">4</div>
            <h4 className="font-medium text-gray-800 mb-1">Publish</h4>
            <p className="text-sm text-gray-500">Upload as drafts to your Etsy shop</p>
          </div>
        </div>
      </div>
      
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
