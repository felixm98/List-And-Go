import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FolderOpen, Image, Loader2 } from 'lucide-react'

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
    
    // Add image files
    if (file.type.startsWith('image/')) {
      products.get(productName).images.push({
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      })
    }
    // Add video files
    if (file.type.startsWith('video/')) {
      if (!products.get(productName).videos) products.get(productName).videos = [];
      products.get(productName).videos.push({
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
      alert('No images found in the uploaded folders.')
      return
    }
    
    // Show pre-process modal if enabled, otherwise add directly
    if (showPreProcessModal) {
      onFilesProcessed(products, true) // true = show modal
      return
    }
    
    // Add products directly with basic data
    const processedProducts = products.map(product => ({
      ...product,
      title: `${product.folderName} | Digital Download`,
      description: '',
      tags: [],
      status: 'ready'
    }))
    
    onFilesProcessed(processedProducts, false)
  }, [onFilesProcessed, showPreProcessModal])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov']
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
          ? 'border-brand-primary bg-brand-light scale-[1.02] shadow-lg' 
          : 'border-gray-300 hover:border-brand-primary hover:bg-brand-light/50'
        }
        ${isProcessing ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input {...getInputProps()} webkitdirectory="" directory="" multiple />
      
      {isProcessing ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 text-brand-primary animate-spin mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Processing files...
          </h3>
          <p className="text-gray-500">
            Preparing your products for upload
          </p>
        </div>
      ) : (
        <>
          <div className={`
            flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full
            transition-all duration-300
            ${isDragActive ? 'bg-brand-primary text-white scale-110' : 'bg-gray-100 text-gray-400'}
          `}>
            {isDragActive ? (
              <FolderOpen className="w-10 h-10" />
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {isDragActive ? 'Drop folders here!' : 'Drag and drop product folders'}
          </h3>
          
          <p className="text-gray-500 mb-4">
            or <span className="text-brand-primary font-medium">click to select folders</span>
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span>One folder = One product</span>
            </div>
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span>PNG, JPG, WebP</span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>Tip:</strong> If you drag in a folder with subfolders, each subfolder will become a separate product.
          </div>
        </>
      )}
    </div>
  )
}

export default DropZone
