import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FolderOpen, Image, Loader2 } from 'lucide-react'
import api from '../services/api'

// Mock AI generation - fallback when API is not available
const mockGenerateContent = async (folderName, images) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
  
  const productTypes = ['T-shirt Mockup', 'Hoodie Mockup', 'Mug Mockup', 'Tote Bag Mockup', 'Poster Mockup']
  const styles = ['Minimalist', 'Vintage', 'Modern', 'Boho', 'Rustic', 'Elegant']
  const colors = ['White', 'Black', 'Navy', 'Heather Gray', 'Natural']
  
  const type = productTypes[Math.floor(Math.random() * productTypes.length)]
  const style = styles[Math.floor(Math.random() * styles.length)]
  const color = colors[Math.floor(Math.random() * colors.length)]
  
  return {
    title: `${style} ${type} | ${color} | High Quality Digital Download | Commercial Use`,
    description: `✨ PROFESSIONAL ${type.toUpperCase()} ✨

This stunning ${style.toLowerCase()} ${type.toLowerCase()} is perfect for showcasing your designs with elegance and sophistication.

📦 WHAT YOU GET:
• ${images.length} high-resolution mockup variations
• PNG format with transparent background
• 300 DPI print-ready quality
• Instant digital download

💼 COMMERCIAL LICENSE INCLUDED
Use for your Etsy shop, print-on-demand, social media, and more!

🎨 PERFECT FOR:
• T-shirt designers
• Print on demand sellers
• Social media marketers
• Brand presentations

📧 Need help? Message us anytime!`,
    tags: [
      type.toLowerCase().replace(' ', ''),
      'mockup',
      'digital download',
      style.toLowerCase(),
      'commercial use',
      'png mockup',
      't-shirt mockup',
      'apparel mockup',
      'product mockup',
      'design template',
      'instant download',
      'print on demand',
      'etsy seller'
    ].slice(0, 13),
    category: 'Digital Downloads > Graphics > Mockups',
    style: style,
    seoScore: Math.floor(70 + Math.random() * 25)
  }
}

// Process files to detect folder structure
const processFiles = (files) => {
  const products = new Map()
  
  files.forEach(file => {
    // Get folder path - handle both drag & drop and file input
    const path = file.webkitRelativePath || file.path || file.name
    const parts = path.split('/')
    
    // If file is in a subfolder, use that as product name
    // Otherwise use the parent folder or filename without extension
    let productName
    if (parts.length > 2) {
      // e.g., "MainFolder/Product1/image.jpg" -> "Product1"
      productName = parts[parts.length - 2]
    } else if (parts.length === 2) {
      // e.g., "Product1/image.jpg" -> "Product1"
      productName = parts[0]
    } else {
      // Single file, use filename without extension
      productName = file.name.replace(/\.[^/.]+$/, '')
    }
    
    if (!products.has(productName)) {
      products.set(productName, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folderName: productName,
        images: [],
        status: 'pending'
      })
    }
    
    // Only add image files
    if (file.type.startsWith('image/')) {
      products.get(productName).images.push({
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      })
    }
  })
  
  // Filter out products with no images
  return Array.from(products.values()).filter(p => p.images.length > 0)
}

function DropZone({ onFilesProcessed, isProcessing, setIsProcessing, showPreProcessModal }) {
  const [dragCount, setDragCount] = useState(0)
  
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return
    
    // Process files into products
    const products = processFiles(acceptedFiles)
    
    if (products.length === 0) {
      alert('Inga bilder hittades i de uppladdade mapparna.')
      return
    }
    
    // Show pre-process modal if enabled
    if (showPreProcessModal) {
      onFilesProcessed(products, true) // true = show modal
      return
    }
    
    // Process immediately with AI
    setIsProcessing(true)
    
    try {
      const processedProducts = []
      
      for (const product of products) {
        try {
          // Try real API first
          let aiContent
          try {
            aiContent = await api.generateContent(
              product.images[0].file,
              product.folderName,
              product.images.length,
              ''
            )
          } catch (apiError) {
            // Fallback to mock when API unavailable
            console.log('API unavailable, using mock:', apiError.message)
            aiContent = await mockGenerateContent(product.folderName, product.images)
          }
          
          processedProducts.push({
            ...product,
            ...aiContent,
            seoScore: aiContent.seo_score || aiContent.seoScore || 75,
            status: 'ready'
          })
        } catch (err) {
          console.error(`Failed to process ${product.folderName}:`, err)
          processedProducts.push({
            ...product,
            title: `${product.folderName} - Processing failed`,
            description: 'Could not generate content. Please edit manually.',
            tags: ['mockup', 'digital download'],
            seoScore: 30,
            status: 'error'
          })
        }
      }
      
      onFilesProcessed(processedProducts, false)
    } catch (error) {
      console.error('Error processing files:', error)
      alert('Ett fel uppstod vid bearbetning av filerna.')
    } finally {
      setIsProcessing(false)
    }
  }, [onFilesProcessed, setIsProcessing, showPreProcessModal])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    noClick: false,
    multiple: true
  })
  
  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-300 ease-out
        ${isDragActive 
          ? 'border-etsy-orange bg-etsy-light scale-[1.02] shadow-lg' 
          : 'border-gray-300 hover:border-etsy-orange hover:bg-orange-50'
        }
        ${isProcessing ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input {...getInputProps()} webkitdirectory="" directory="" multiple />
      
      {isProcessing ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 text-etsy-orange animate-spin mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Analyserar mockups med AI...
          </h3>
          <p className="text-gray-500">
            Genererar titlar, tags och beskrivningar
          </p>
        </div>
      ) : (
        <>
          <div className={`
            flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full
            transition-all duration-300
            ${isDragActive ? 'bg-etsy-orange text-white scale-110' : 'bg-gray-100 text-gray-400'}
          `}>
            {isDragActive ? (
              <FolderOpen className="w-10 h-10" />
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {isDragActive ? 'Släpp mapparna här!' : 'Dra och släpp mockup-mappar'}
          </h3>
          
          <p className="text-gray-500 mb-4">
            eller <span className="text-etsy-orange font-medium">klicka för att välja mappar</span>
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span>En mapp = En produkt</span>
            </div>
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span>PNG, JPG, WebP</span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>Tips:</strong> Om du drar in en mapp med undermappar kommer varje undermapp att bli en separat produkt.
          </div>
        </>
      )}
    </div>
  )
}

export default DropZone
