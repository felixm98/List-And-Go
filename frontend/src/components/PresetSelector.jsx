import { useState, useEffect } from 'react'
import { X, Package, Plus, ChevronRight, Loader2, Settings, CheckCircle } from 'lucide-react'
import { api } from '../services/api'
import PresetEditor from './PresetEditor'

/**
 * PresetSelector - Shows when files/folders are dropped
 * Allows user to select an existing preset or create a new one
 */
export default function PresetSelector({ isOpen, onClose, onConfirm, productCount }) {
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPresetId, setSelectedPresetId] = useState(null)
  const [showPresetEditor, setShowPresetEditor] = useState(false)
  
  const isDemoMode = localStorage.getItem('demoMode') === 'true' && !localStorage.getItem('accessToken')

  useEffect(() => {
    if (isOpen) {
      loadPresets()
    }
  }, [isOpen])

  const loadPresets = async () => {
    setLoading(true)
    try {
      if (isDemoMode) {
        // Demo presets
        setPresets([
          { 
            id: 1, 
            name: 'Digital Art Preset', 
            preset_type: 'digital', 
            price: 4.99,
            taxonomy_path: 'Art & Collectibles > Prints > Digital Prints',
            listing_type: 'download'
          },
          { 
            id: 2, 
            name: 'Print on Demand', 
            preset_type: 'physical', 
            price: 19.99,
            taxonomy_path: 'Clothing > Shirts',
            listing_type: 'physical'
          }
        ])
      } else {
        const data = await api.getPresets()
        setPresets(data)
      }
    } catch (err) {
      console.error('Failed to load presets:', err)
      setPresets([])
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    const selectedPreset = presets.find(p => p.id === selectedPresetId)
    onConfirm(selectedPreset)
  }

  const handlePresetCreated = () => {
    setShowPresetEditor(false)
    loadPresets()
  }

  if (!isOpen) return null

  // Show preset editor if creating new
  if (showPresetEditor) {
    return (
      <PresetEditor
        preset={null}
        onSave={handlePresetCreated}
        onClose={() => setShowPresetEditor(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Select a Preset
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {productCount} {productCount === 1 ? 'product' : 'products'} will be processed
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
          ) : presets.length === 0 ? (
            /* No presets - prompt to create */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No presets yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Create a preset to define how your listings should be configured on Etsy.
              </p>
              <button
                onClick={() => setShowPresetEditor(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800"
              >
                <Plus className="w-5 h-5" />
                Create Your First Preset
              </button>
            </div>
          ) : (
            /* Preset list */
            <div className="space-y-2">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        preset.listing_type === 'download' 
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{preset.name}</div>
                        <div className="text-sm text-gray-500">
                          {preset.listing_type === 'download' ? 'Digital' : 'Physical'} • ${preset.price}
                        </div>
                        {preset.taxonomy_path && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {preset.taxonomy_path}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedPresetId === preset.id && (
                      <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
              
              {/* Create new preset button */}
              <button
                onClick={() => setShowPresetEditor(true)}
                className="w-full text-left p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Plus className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Create New Preset</div>
                    <div className="text-sm text-gray-500">
                      Configure a new preset for your listings
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPresetId}
            className="px-6 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue with Preset
          </button>
        </div>
      </div>
    </div>
  )
}
