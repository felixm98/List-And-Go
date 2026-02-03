import { useState } from 'react'
import DropZone from '../components/DropZone'
import PreProcessModal from '../components/PreProcessModal'
import ListingGrid from '../components/ListingGrid'

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
          price: settings.defaultPrice || '',
          shippingProfile: settings.shippingProfile,
          returnPolicy: settings.returnPolicy,
          style: style,
          seoScore: Math.floor(70 + Math.random() * 25),
          status: 'ready'
        }
      })
    )
    
    addListings(processedProducts)
    setPendingProducts([])
    setIsProcessing(false)
  }
  
  const handleUpload = (listingsToUpload, scheduleDate) => {
    // Create upload record
    const upload = {
      id: Date.now().toString(),
      title: listingsToUpload.length === 1 
        ? listingsToUpload[0].title 
        : `${listingsToUpload.length} produkter`,
      imageCount: listingsToUpload.reduce((sum, l) => sum + l.images.length, 0),
      thumbnail: listingsToUpload[0]?.images[0]?.preview,
      status: scheduleDate ? 'scheduled' : 'uploading',
      scheduledFor: scheduleDate,
      createdAt: new Date(),
      listings: listingsToUpload.map(l => l.id)
    }
    
    addUpload(upload)
    
    // Clear uploaded listings from grid
    listingsToUpload.forEach(l => removeListing(l.id))
    
    // Simulate upload completion
    if (!scheduleDate) {
      setTimeout(() => {
        // In real app, this would update the upload status via backend
        console.log('Upload complete:', upload.id)
      }, 3000)
    }
    
    // Show success message
    alert(scheduleDate 
      ? `${listingsToUpload.length} produkter schemalagda för publicering!`
      : `${listingsToUpload.length} produkter laddas upp till Etsy som drafts...`
    )
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
