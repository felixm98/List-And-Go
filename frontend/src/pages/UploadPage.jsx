import { useState } from 'react'
import DropZone from '../components/DropZone'
import PresetSelector from '../components/PresetSelector'
import ListingGrid from '../components/ListingGrid'
import api from '../services/api'

// Demo mode AI mock generator - creates realistic listing content based on folder name
function generateDemoAIContent(folderName) {
  const name = folderName.toLowerCase()
  
  // Detect product type from folder name
  let productType = 'digital art'
  let tags = []
  let attributes = {}
  let description = ''
  
  // Gaming/Tech themed
  if (name.includes('gaming') || name.includes('gamer') || name.includes('setup') || name.includes('rgb')) {
    productType = 'gaming wall art'
    tags = ['gaming room decor', 'gamer wall art', 'gaming poster', 'game room art', 'gaming setup', 'neon gaming art', 'esports decor', 'streamer room', 'gaming gift', 'gamer gift for him', 'gaming aesthetic', 'RGB gaming', 'digital download']
    attributes = { subject: 'Gaming', primary_color: 'Purple', mood: 'Energetic', occasion: 'Birthday', recipient: 'For Him' }
    description = `🎮 GAMING ROOM WALL ART - INSTANT DIGITAL DOWNLOAD 🎮\n\nTransform your gaming setup with this stunning ${folderName} digital art print!\n\n✨ WHAT YOU GET:\n• High-resolution digital file (300 DPI)\n• Multiple sizes included (8x10, 11x14, 16x20, 18x24)\n• Instant download after purchase\n• Print at home or at any print shop\n\n🖨️ PRINTING TIPS:\n• Use high-quality photo paper or cardstock\n• Matte or glossy finish both look amazing\n• Frame not included\n\n💝 PERFECT FOR:\n• Gaming room decor\n• Streamer setup backgrounds\n• Gifts for gamers\n• Man cave decoration\n\n⚡ INSTANT DOWNLOAD - No waiting, no shipping!\n\nNote: Colors may vary slightly due to monitor settings and printer calibration.`
  }
  // Space/Cosmic themed
  else if (name.includes('space') || name.includes('cosmic') || name.includes('galaxy') || name.includes('nebula') || name.includes('star')) {
    productType = 'cosmic wall art'
    tags = ['space wall art', 'galaxy print', 'cosmic decor', 'nebula poster', 'astronomy art', 'space room decor', 'celestial art', 'universe print', 'sci-fi art', 'space gift', 'astronomy gift', 'outer space', 'digital download']
    attributes = { subject: 'Outer Space', primary_color: 'Blue', mood: 'Dreamy', occasion: 'Any Occasion', recipient: 'For Him' }
    description = `🌌 COSMIC SPACE ART - INSTANT DIGITAL DOWNLOAD 🌌\n\nBring the wonder of the universe into your home with this stunning ${folderName} wall art!\n\n✨ WHAT YOU GET:\n• High-resolution digital file (300 DPI)\n• Multiple sizes included\n• Instant download\n• Printable at home or any print shop\n\n🚀 PERFECT FOR:\n• Space enthusiasts\n• Kids bedrooms\n• Office decor\n• Science lovers\n\n⚡ INSTANT DOWNLOAD - Print today!`
  }
  // Nature themed
  else if (name.includes('nature') || name.includes('forest') || name.includes('mountain') || name.includes('ocean') || name.includes('landscape')) {
    productType = 'nature wall art'
    tags = ['nature wall art', 'landscape print', 'forest decor', 'mountain art', 'nature photography', 'scenic poster', 'outdoor art', 'wilderness print', 'nature lover gift', 'cabin decor', 'rustic wall art', 'peaceful art', 'digital download']
    attributes = { subject: 'Nature', primary_color: 'Green', mood: 'Peaceful', occasion: 'Housewarming', recipient: 'Unisex Adults' }
    description = `🌲 NATURE WALL ART - INSTANT DIGITAL DOWNLOAD 🌲\n\nBring the beauty of nature indoors with this stunning ${folderName} art print!\n\n✨ INCLUDED:\n• High-resolution files (300 DPI)\n• Multiple print sizes\n• Instant download\n\n🏡 PERFECT FOR:\n• Living room decor\n• Office walls\n• Cabin and rustic homes\n• Nature lovers\n\n⚡ INSTANT DOWNLOAD!`
  }
  // Abstract/Modern
  else if (name.includes('abstract') || name.includes('modern') || name.includes('minimalist') || name.includes('geometric')) {
    productType = 'abstract wall art'
    tags = ['abstract wall art', 'modern art print', 'minimalist decor', 'geometric poster', 'contemporary art', 'abstract print', 'modern home decor', 'gallery wall art', 'trendy wall art', 'living room art', 'office decor', 'abstract digital', 'printable art']
    attributes = { subject: 'Abstract', primary_color: 'Neutral', mood: 'Modern', occasion: 'Housewarming', recipient: 'Unisex Adults' }
    description = `🎨 ABSTRACT MODERN ART - INSTANT DIGITAL DOWNLOAD 🎨\n\nElevate your space with this contemporary ${folderName} art print!\n\n✨ WHAT'S INCLUDED:\n• High-resolution digital files\n• Multiple sizes for any space\n• Instant download\n\n🏠 PERFECT FOR:\n• Modern homes\n• Gallery walls\n• Office spaces\n• Minimalist decor\n\n⚡ DOWNLOAD & PRINT TODAY!`
  }
  // Default/Generic
  else {
    productType = 'digital wall art'
    tags = ['digital download', 'wall art print', 'printable art', 'home decor', 'instant download', 'digital art', 'poster print', 'room decor', 'art print', 'downloadable art', 'modern wall art', 'gallery wall', 'gift idea']
    attributes = { subject: 'Art', primary_color: 'Multi', mood: 'Vibrant', occasion: 'Any Occasion', recipient: 'Unisex Adults' }
    description = `🎨 DIGITAL WALL ART - INSTANT DOWNLOAD 🎨\n\nBeautiful ${folderName} art for your home!\n\n✨ INCLUDED:\n• High-resolution digital files (300 DPI)\n• Multiple print sizes\n• Instant download after purchase\n\n🖨️ Easy to print at home or any print shop!\n\n⚡ INSTANT DOWNLOAD - No waiting!`
  }
  
  // Generate title with folder name
  const title = `${folderName} | ${productType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} | Digital Download | Printable Wall Art`
  
  return {
    title: title.substring(0, 140),
    description,
    tags: tags.slice(0, 13),
    listing_attributes: attributes,
    seo_score: Math.floor(Math.random() * 20) + 70 // 70-90 score
  }
}

function UploadPage({ listings, addListings, updateListing, removeListing, clearListings, addUpload }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingProducts, setPendingProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  
  // Check if in demo mode
  const isDemoMode = localStorage.getItem('demoMode') === 'true' && !localStorage.getItem('accessToken')
  
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
    
    // Process products using AI with preset settings
    const processedProducts = await Promise.all(
      pendingProducts.map(async (product) => {
        try {
          // Get the first image file for AI analysis
          const imageFile = product.images?.[0]?.file
          
          let aiResult
          
          // In demo mode, use mock AI generation
          if (isDemoMode) {
            aiResult = generateDemoAIContent(product.folderName)
          } else if (imageFile) {
            // Call real AI generation API
            aiResult = await api.generateContent(
              imageFile,
              product.folderName,
              product.images.length,
              preset.taxonomy_path || ''
            )
          }
          
          if (aiResult) {
            // Extract styles from listing_attributes if available
            const styles = aiResult.listing_attributes?.style || []
            const styleString = styles.length > 0 ? styles[0] : ''
            
            return {
              ...product,
              title: aiResult.title || `${product.folderName} | Digital Download`,
              description: aiResult.description || preset.description || '',
              tags: aiResult.tags || preset.tags?.split(',').map(t => t.trim()) || [],
              category: preset.taxonomy_path,
              categoryId: preset.taxonomy_id,
              price: preset.price || '',
              shippingProfile: preset.shipping_profile_name,
              shippingProfileId: preset.shipping_profile_id,
              returnPolicy: preset.return_policy_name,
              returnPolicyId: preset.return_policy_id,
              quantity: preset.quantity || 999,
              materials: aiResult.materials || preset.materials || '',
              style: styleString,
              styles: styles,
              listing_attributes: aiResult.listing_attributes || {},
              seoScore: aiResult.seo_score || 75,
              status: 'ready',
              videos: product.videos || [],
              presetId: preset.id,
              presetName: preset.name
            }
          } else {
            // Fallback if no image available and not in demo mode
            return {
              ...product,
              title: `${product.folderName} | Digital Download`,
              description: preset.description || 'Digital download product',
              tags: preset.tags?.split(',').map(t => t.trim()) || ['digital download'],
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
              seoScore: 50,
              status: 'ready',
              videos: product.videos || [],
              presetId: preset.id,
              presetName: preset.name
            }
          }
        } catch (error) {
          console.error('AI generation failed for product:', product.folderName, error)
          // Return product with basic data on error
          return {
            ...product,
            title: `${product.folderName} | Digital Download`,
            description: preset.description || 'Digital download product',
            tags: preset.tags?.split(',').map(t => t.trim()) || ['digital download'],
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
            seoScore: 50,
            status: 'error',
            error: error.message,
            videos: product.videos || [],
            presetId: preset.id,
            presetName: preset.name
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <h4 className="font-medium text-gray-800 mb-1">AI Generation</h4>
            <p className="text-sm text-gray-500">AI creates titles, descriptions and tags automatically</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold mb-3">4</div>
            <h4 className="font-medium text-gray-800 mb-1">Review & Edit</h4>
            <p className="text-sm text-gray-500">Adjust content and see SEO score in real-time</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold mb-3">5</div>
            <h4 className="font-medium text-gray-800 mb-1">Publish</h4>
            <p className="text-sm text-gray-500">Upload as drafts to your Etsy shop</p>
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
