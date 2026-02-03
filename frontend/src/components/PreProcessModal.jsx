import { useState } from 'react'
import { X, Settings, DollarSign, Tag, Truck, RotateCcw } from 'lucide-react'

const CATEGORIES = [
  'Digital Downloads > Graphics > Mockups',
  'Digital Downloads > Graphics > Clipart',
  'Digital Downloads > Templates',
  'Craft Supplies & Tools > Patterns & How To',
  'Art & Collectibles > Prints > Digital Prints'
]

const SHIPPING_PROFILES = [
  { id: 'digital', name: 'Digital nedladdning (ingen frakt)' },
  { id: 'standard', name: 'Standardfrakt Sverige' },
  { id: 'international', name: 'Internationell frakt' }
]

function PreProcessModal({ isOpen, onClose, onConfirm, productCount }) {
  const [settings, setSettings] = useState({
    defaultPrice: '',
    category: CATEGORIES[0],
    shippingProfile: 'digital',
    returnPolicy: 'no_returns',
    autoPublish: false,
    saveAsTemplate: false,
    templateName: ''
  })
  
  if (!isOpen) return null
  
  const handleConfirm = () => {
    onConfirm(settings)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-etsy-light rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-etsy-orange" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Standardinställningar</h2>
              <p className="text-sm text-gray-500">{productCount} produkter kommer att bearbetas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4" />
              Standardpris (SEK)
            </label>
            <input
              type="number"
              value={settings.defaultPrice}
              onChange={(e) => setSettings(s => ({ ...s, defaultPrice: e.target.value }))}
              placeholder="T.ex. 49"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Lämna tomt för att ställa in per produkt</p>
          </div>
          
          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4" />
              Kategori
            </label>
            <select
              value={settings.category}
              onChange={(e) => setSettings(s => ({ ...s, category: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {/* Shipping Profile */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Truck className="w-4 h-4" />
              Fraktprofil
            </label>
            <select
              value={settings.shippingProfile}
              onChange={(e) => setSettings(s => ({ ...s, shippingProfile: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
            >
              {SHIPPING_PROFILES.map(profile => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>
          
          {/* Return Policy */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <RotateCcw className="w-4 h-4" />
              Returpolicy
            </label>
            <select
              value={settings.returnPolicy}
              onChange={(e) => setSettings(s => ({ ...s, returnPolicy: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
            >
              <option value="no_returns">Inga returer (digitala produkter)</option>
              <option value="14_days">14 dagars returrätt</option>
              <option value="30_days">30 dagars returrätt</option>
            </select>
          </div>
          
          {/* Save as Template */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saveAsTemplate}
                onChange={(e) => setSettings(s => ({ ...s, saveAsTemplate: e.target.checked }))}
                className="w-5 h-5 text-etsy-orange rounded focus:ring-etsy-orange"
              />
              <span className="text-sm font-medium text-gray-700">Spara som mall för framtida uppladdningar</span>
            </label>
            
            {settings.saveAsTemplate && (
              <input
                type="text"
                value={settings.templateName}
                onChange={(e) => setSettings(s => ({ ...s, templateName: e.target.value }))}
                placeholder="Mallnamn, t.ex. 'Mockup Standard'"
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
              />
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Hoppa över
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-etsy-orange text-white rounded-lg font-medium hover:bg-etsy-orange-dark transition-colors"
          >
            Tillämpa & Fortsätt
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreProcessModal
