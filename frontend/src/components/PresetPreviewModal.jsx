import { X, Package, DollarSign, Truck, RotateCcw, Sparkles, FileText, Tag, Clock } from 'lucide-react'

const WHO_MADE_LABELS = {
  'i_did': 'I did',
  'someone_else': 'Someone else',
  'collective': 'A collective'
}

const WHEN_MADE_LABELS = {
  'made_to_order': 'Made to order',
  '2020_2026': '2020-2026',
  '2010_2019': '2010-2019',
  '2007_2009': '2007-2009',
  'before_2007': 'Before 2007'
}

const TYPE_LABELS = {
  'download': 'Digital download',
  'physical': 'Physical product',
  'both': 'Both (digital + physical)'
}

export default function PresetPreviewModal({ preset, onClose, onEdit }) {
  if (!preset) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-brand-primary to-brand-dark">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            {preset.name}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                preset.listing_type === 'download' 
                  ? 'bg-blue-100 text-blue-700' 
                  : preset.listing_type === 'physical'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {TYPE_LABELS[preset.listing_type] || preset.listing_type}
              </span>
            </div>

            {/* Price & Quantity */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Price & Quantity</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Price</span>
                  <p className="font-semibold text-gray-900">${preset.price?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Quantity</span>
                  <p className="font-semibold text-gray-900">{preset.quantity}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Who made</span>
                  <p className="font-medium">{WHO_MADE_LABELS[preset.who_made] || preset.who_made}</p>
                </div>
                <div>
                  <span className="text-gray-500">When made</span>
                  <p className="font-medium">{WHEN_MADE_LABELS[preset.when_made] || preset.when_made}</p>
                </div>
                <div>
                  <span className="text-gray-500">Is supply</span>
                  <p className="font-medium">{preset.is_supply ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Auto-renew</span>
                  <p className="font-medium">{preset.should_auto_renew ? '✓ Yes' : '✗ No'}</p>
                </div>
              </div>
            </div>

            {/* Shipping & Returns (for physical) */}
            {(preset.listing_type === 'physical' || preset.listing_type === 'both') && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Shipping & Returns</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Shipping profile</span>
                    <p className="font-medium">{preset.shipping_profile_id || 'Not selected'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Return policy</span>
                    <p className="font-medium">{preset.return_policy_id || 'Not selected'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Description Source */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900">Description</span>
              </div>
              <div className="text-sm">
                {preset.description_source === 'ai' && (
                  <p className="text-purple-700">🤖 AI-generated per image</p>
                )}
                {preset.description_source === 'template' && (
                  <p className="text-purple-700">📝 Template: {preset.description_template_name || 'Not selected'}</p>
                )}
                {preset.description_source === 'manual' && (
                  <div>
                    <p className="text-purple-700 mb-1">✍️ Fixed text:</p>
                    <p className="text-gray-600 text-xs bg-white rounded p-2 max-h-20 overflow-y-auto">
                      {preset.manual_description || 'No text'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Personalization */}
            {preset.is_personalizable && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-gray-900">Personalization</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">Required:</span>{' '}
                    <span className="font-medium">{preset.personalization_is_required ? 'Yes' : 'No'}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Max characters:</span>{' '}
                    <span className="font-medium">{preset.personalization_char_count_max}</span>
                  </p>
                  {preset.personalization_instructions && (
                    <p>
                      <span className="text-gray-500">Instructions:</span>{' '}
                      <span className="font-medium">{preset.personalization_instructions}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Default Tags */}
            {preset.default_tags?.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700">Default tags:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {preset.default_tags.map(tag => (
                    <span 
                      key={tag}
                      className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Info about AI fields */}
            <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>Title, Tags and Description (if AI selected) are automatically generated per image during upload</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose()
                onEdit(preset)
              }}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
            >
              Edit preset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
