import { useState, useEffect } from 'react'
import { 
  X, Save, Loader2, Package, DollarSign, Tag, Truck, ChevronLeft,
  RotateCcw, FileText, ChevronDown, ChevronUp, ChevronRight,
  AlertCircle, FolderTree, Search, Palette, Monitor, Box, User, Users,
  Building2, CheckCircle, Clock, Plus, Star, Info, Settings, Layers,
  Ruler, Hash, RefreshCw
} from 'lucide-react'
import { api } from '../services/api'

// Etsy enum values
const WHO_MADE_OPTIONS = [
  { value: 'i_did', label: 'I did', icon: User },
  { value: 'collective', label: 'A member of my shop', icon: Users },
  { value: 'someone_else', label: 'Another company or person', icon: Building2 }
]

const WHEN_MADE_OPTIONS = [
  { value: 'made_to_order', label: 'Made to order' },
  { value: '2020_2026', label: '2020-2026' },
  { value: '2010_2019', label: '2010-2019' },
  { value: '2007_2009', label: '2007-2009' },
  { value: 'before_2007', label: 'Before 2007' },
  { value: '2000_2006', label: '2000-2006' },
  { value: '1990s', label: '1990s' },
  { value: '1980s', label: '1980s' },
  { value: '1970s', label: '1970s' },
  { value: '1960s', label: '1960s' },
  { value: '1950s', label: '1950s' }
]

const WEIGHT_UNITS = [
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' }
]

const DIMENSION_UNITS = [
  { value: 'in', label: 'inches' },
  { value: 'ft', label: 'feet' },
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' }
]

const DESCRIPTION_SOURCES = [
  { value: 'template', label: '📝 Use template', description: 'Use one of your saved templates' },
  { value: 'manual', label: '✍️ Custom text', description: 'Write a fixed description for this preset' }
]

// Main tabs for Step 3
const EDITOR_TABS = [
  { id: 'about', label: 'About' },
  { id: 'price', label: 'Price & Inventory' },
  { id: 'variations', label: 'Variations' },
  { id: 'details', label: 'Details' },
  { id: 'shipping', label: 'Processing & Shipping' }
]

export default function PresetEditor({ preset, onSave, onClose }) {
  // Wizard step (1 = Category, 2 = Listing Details, 3 = Main Editor)
  const [currentStep, setCurrentStep] = useState(preset ? 3 : 1)
  const [activeTab, setActiveTab] = useState('about')
  
  const [formData, setFormData] = useState({
    name: '',
    preset_type: 'digital',
    price: 4.99,
    quantity: 999,
    who_made: 'i_did',
    when_made: 'made_to_order',
    is_supply: false,
    taxonomy_id: null,
    taxonomy_path: '',
    listing_type: 'download',
    shipping_profile_id: '',
    return_policy_id: '',
    shop_section_id: '',
    should_auto_renew: true,
    is_personalizable: false,
    personalization_is_required: false,
    personalization_char_count_max: 256,
    personalization_instructions: '',
    item_weight: null,
    item_weight_unit: 'oz',
    item_length: null,
    item_width: null,
    item_height: null,
    item_dimensions_unit: 'in',
    processing_min: null,
    processing_max: null,
    materials: [],
    styles: [],
    default_tags: [],
    description_source: 'template',
    description_template_id: null,
    manual_description: '',
    is_taxable: true,
    is_customizable: true,
    production_partner_ids: [],
    category_properties: {},
    // New fields for Etsy parity
    sku: '',
    primary_color: '',
    secondary_color: '',
    is_featured: false,
    note_to_buyers: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showCategoryAttributes, setShowCategoryAttributes] = useState(true)
  
  // Etsy data
  const [shippingProfiles, setShippingProfiles] = useState([])
  const [returnPolicies, setReturnPolicies] = useState([])
  const [shopSections, setShopSections] = useState([])
  const [descriptionTemplates, setDescriptionTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [productionPartners, setProductionPartners] = useState([])
  const [loadingEtsyData, setLoadingEtsyData] = useState(true)
  
  // Category properties (dynamic attributes)
  const [categoryProperties, setCategoryProperties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  
  // Category search
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  
  // Check if in demo mode
  const isDemoMode = localStorage.getItem('demoMode') === 'true' && !localStorage.getItem('accessToken')
  
  // Tags/materials input
  const [tagInput, setTagInput] = useState('')
  const [materialInput, setMaterialInput] = useState('')
  const [propertiesError, setPropertiesError] = useState(null)

  // Mock category properties for demo mode
  const getMockCategoryProperties = (taxonomyId) => {
    return [
      {
        property_id: 513,
        name: 'Primary color',
        display_name: 'Primary color',
        possible_values: [
          { value_id: 1, value: 'Black' },
          { value_id: 2, value: 'White' },
          { value_id: 3, value: 'Blue' },
          { value_id: 4, value: 'Red' },
          { value_id: 5, value: 'Green' },
          { value_id: 6, value: 'Yellow' },
          { value_id: 7, value: 'Purple' },
          { value_id: 8, value: 'Pink' },
          { value_id: 9, value: 'Orange' },
          { value_id: 10, value: 'Brown' },
          { value_id: 11, value: 'Gray' },
          { value_id: 12, value: 'Beige' }
        ],
        is_required: false,
        supports_attributes: true,
        is_multivalued: false
      },
      {
        property_id: 514,
        name: 'Secondary color',
        display_name: 'Secondary color',
        possible_values: [
          { value_id: 1, value: 'Black' },
          { value_id: 2, value: 'White' },
          { value_id: 3, value: 'Blue' },
          { value_id: 4, value: 'Red' },
          { value_id: 5, value: 'Green' },
          { value_id: 6, value: 'Yellow' },
          { value_id: 7, value: 'Purple' },
          { value_id: 8, value: 'Pink' }
        ],
        is_required: false,
        supports_attributes: true,
        is_multivalued: false
      },
      {
        property_id: 100,
        name: 'Holiday',
        display_name: 'Holiday',
        possible_values: [
          { value_id: 1, value: 'Christmas' },
          { value_id: 2, value: 'Halloween' },
          { value_id: 3, value: 'Easter' },
          { value_id: 4, value: "Valentine's Day" },
          { value_id: 5, value: 'Thanksgiving' }
        ],
        is_required: false,
        supports_attributes: true,
        is_multivalued: true
      }
    ]
  }

  // Popular categories for quick selection
  const popularCategories = [
    { id: 2078, name: 'Digital Downloads', path: 'Craft Supplies & Tools > Digital' },
    { id: 1983, name: 'Digital Prints', path: 'Art & Collectibles > Prints > Digital Prints' },
    { id: 66, name: 'Art & Collectibles', path: 'Art & Collectibles' },
    { id: 68, name: 'Home & Living', path: 'Home & Living' },
    { id: 69, name: 'Clothing', path: 'Clothing' },
    { id: 70, name: 'Jewelry', path: 'Jewelry' },
    { id: 65, name: 'Craft Supplies', path: 'Craft Supplies & Tools' },
    { id: 1, name: 'Accessories', path: 'Accessories' }
  ]

  // Load preset data if editing
  useEffect(() => {
    if (preset) {
      setFormData({
        ...formData,
        ...preset,
        default_tags: preset.default_tags || [],
        materials: preset.materials || [],
        styles: preset.styles || [],
        production_partner_ids: preset.production_partner_ids || [],
        category_properties: preset.category_properties || {}
      })
      if (preset.taxonomy_id) {
        loadCategoryProperties(preset.taxonomy_id)
      }
    }
    loadEtsyData()
  }, [preset])

  // Load category properties when taxonomy changes
  useEffect(() => {
    if (formData.taxonomy_id && currentStep === 3) {
      loadCategoryProperties(formData.taxonomy_id)
    }
  }, [formData.taxonomy_id])

  const loadCategoryProperties = async (taxonomyId) => {
    setLoadingProperties(true)
    setPropertiesError(null)
    
    if (isDemoMode) {
      setCategoryProperties(getMockCategoryProperties(taxonomyId))
      setLoadingProperties(false)
      return
    }
    
    try {
      const data = await api.getCategoryProperties(taxonomyId)
      setCategoryProperties(data.properties || [])
      if (!data.properties || data.properties.length === 0) {
        setPropertiesError('no_properties')
      }
    } catch (err) {
      console.error('Failed to load category properties:', err)
      setCategoryProperties([])
      if (err.message?.includes('API') || err.message?.includes('401') || err.message?.includes('403')) {
        setPropertiesError('api_key')
      } else {
        setPropertiesError('fetch_error')
      }
    } finally {
      setLoadingProperties(false)
    }
  }

  const loadEtsyData = async () => {
    setLoadingEtsyData(true)
    try {
      const [profiles, policies, sections, templates, cats] = await Promise.all([
        api.getShippingProfiles().catch(() => []),
        api.getReturnPolicies().catch(() => []),
        api.getShopSections().catch(() => []),
        api.getDescriptionTemplates().catch(() => []),
        api.getCategories().catch(() => [])
      ])
      setShippingProfiles(profiles)
      setReturnPolicies(policies)
      setShopSections(sections)
      setDescriptionTemplates(templates)
      setCategories(cats)
    } catch (err) {
      console.error('Failed to load Etsy data:', err)
    } finally {
      setLoadingEtsyData(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (formData.default_tags.length < 13 && !formData.default_tags.includes(tagInput.trim())) {
        handleChange('default_tags', [...formData.default_tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag) => {
    handleChange('default_tags', formData.default_tags.filter(t => t !== tag))
  }

  const handleAddMaterial = (e) => {
    if (e.key === 'Enter' && materialInput.trim()) {
      e.preventDefault()
      if (formData.materials.length < 13 && !formData.materials.includes(materialInput.trim())) {
        handleChange('materials', [...formData.materials, materialInput.trim()])
      }
      setMaterialInput('')
    }
  }

  const handleRemoveMaterial = (material) => {
    handleChange('materials', formData.materials.filter(m => m !== material))
  }

  const handlePropertyChange = (propertyId, value, isMultiple = false) => {
    setFormData(prev => ({
      ...prev,
      category_properties: {
        ...prev.category_properties,
        [propertyId]: isMultiple ? value : (value || null)
      }
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Preset name is required')
      setActiveTab('about')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const dataToSave = {
        ...formData,
        shipping_profile_id: formData.shipping_profile_id || null,
        return_policy_id: formData.return_policy_id || null,
        shop_section_id: formData.shop_section_id || null,
        description_template_id: formData.description_source === 'template' ? formData.description_template_id : null,
        taxonomy_id: formData.taxonomy_id || null,
        production_partner_ids: formData.production_partner_ids?.length > 0 ? formData.production_partner_ids : null
      }

      if (preset?.id) {
        await api.updatePreset(preset.id, dataToSave)
      } else {
        await api.createPreset(dataToSave)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Could not save preset')
    } finally {
      setSaving(false)
    }
  }

  const selectCategory = (cat) => {
    handleChange('taxonomy_id', cat.id)
    handleChange('taxonomy_path', cat.path || cat.name)
    setCategorySearch('')
    setShowCategoryDropdown(false)
  }

  const isPhysical = formData.listing_type === 'physical' || formData.listing_type === 'both'
  const isDigital = formData.listing_type === 'download' || formData.listing_type === 'both'

  // Get filtered categories based on search
  const filteredCategories = categorySearch
    ? categories.filter(cat => 
        cat.name?.toLowerCase().includes(categorySearch.toLowerCase())
      ).slice(0, 20)
    : []

  // ============================================================
  // STEP 1: Category Selection
  // ============================================================
  const renderStep1 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            What kind of item is it?
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            It's best to be specific—we'll tag your item in all the broader categories it fits under, too.
          </p>

          {/* Category Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value)
                  setShowCategoryDropdown(true)
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                placeholder="Search for a category, e.g. Hats, Rings, Pillows, etc."
                className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
              />
              {categorySearch && (
                <button 
                  onClick={() => setCategorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showCategoryDropdown && categorySearch && (
              <div className="absolute z-10 mt-1 w-full max-w-lg bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => selectCategory(cat)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                    >
                      <div className="font-medium text-gray-900">{cat.name}</div>
                      {cat.path && (
                        <div className="text-xs text-gray-500 mt-0.5">{cat.path}</div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">No categories found</div>
                )}
              </div>
            )}
          </div>

          {/* Selected Category Display */}
          {formData.taxonomy_path && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {formData.taxonomy_path.split(' > ').pop()}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    {formData.taxonomy_path.split(' > ').map((part, i, arr) => (
                      <span key={i} className="flex items-center">
                        {part}
                        {i < arr.length - 1 && <ChevronRight className="w-3 h-3 mx-1" />}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    This listing will appear in related categories.
                  </p>
                </div>
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Popular Categories */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Your top categories</p>
            <div className="space-y-1">
              {popularCategories.slice(0, 5).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    formData.taxonomy_id === cat.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{cat.name}</div>
                  <div className="text-xs text-gray-500">{cat.path}</div>
                </button>
              ))}
            </div>
          </div>
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
            onClick={() => setCurrentStep(2)}
            disabled={!formData.taxonomy_id}
            className="px-6 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )

  // ============================================================
  // STEP 2: Listing Details (Physical/Digital, Who made, etc.)
  // ============================================================
  const renderStep2 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Next, tell us about your listing
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Physical vs Digital */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              What type of item is it? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange('listing_type', 'physical')}
                className={`relative p-4 border-2 rounded-lg text-left transition-colors ${
                  formData.listing_type === 'physical'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {formData.listing_type === 'physical' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
                <Box className="w-10 h-10 text-gray-600 mb-2" />
                <div className="font-medium text-gray-900">Physical item</div>
                <p className="text-xs text-gray-500 mt-1">A tangible item that you will ship to buyers.</p>
              </button>
              <button
                type="button"
                onClick={() => handleChange('listing_type', 'download')}
                className={`relative p-4 border-2 rounded-lg text-left transition-colors ${
                  formData.listing_type === 'download'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {formData.listing_type === 'download' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
                <Monitor className="w-10 h-10 text-gray-600 mb-2" />
                <div className="font-medium text-gray-900">Digital files</div>
                <p className="text-xs text-gray-500 mt-1">A digital file that buyers will download.</p>
              </button>
            </div>
          </div>

          {/* Who made it? */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Who made it? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {WHO_MADE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.who_made === opt.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="who_made"
                    value={opt.value}
                    checked={formData.who_made === opt.value}
                    onChange={(e) => handleChange('who_made', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.who_made === opt.value ? 'border-gray-900' : 'border-gray-300'
                  }`}>
                    {formData.who_made === opt.value && (
                      <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
                    )}
                  </div>
                  <span className="text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* What is it? */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              What is it? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  !formData.is_supply
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="is_supply"
                  checked={!formData.is_supply}
                  onChange={() => handleChange('is_supply', false)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  !formData.is_supply ? 'border-gray-900' : 'border-gray-300'
                }`}>
                  {!formData.is_supply && (
                    <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
                  )}
                </div>
                <span className="text-gray-900">A finished product</span>
              </label>
              <label
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.is_supply
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="is_supply"
                  checked={formData.is_supply}
                  onChange={() => handleChange('is_supply', true)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  formData.is_supply ? 'border-gray-900' : 'border-gray-300'
                }`}>
                  {formData.is_supply && (
                    <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
                  )}
                </div>
                <span className="text-gray-900">A supply or tool to make things</span>
              </label>
            </div>
          </div>

          {/* When was it made? */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              When was it made? <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.when_made}
              onChange={(e) => handleChange('when_made', e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-400 appearance-none bg-white"
            >
              <option value="" disabled>When did you make it?</option>
              {WHEN_MADE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Production Partners - Show for physical items when "someone else" is selected */}
          {formData.who_made === 'someone_else' && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-1">Production partners for this listing</h4>
              <p className="text-sm text-gray-600 mb-3">
                A production partner is anyone who's not a part of your Etsy shop who helps you physically produce your items.
              </p>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add production partners
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
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ============================================================
  // STEP 3: Main Editor with Tabs
  // ============================================================
  const renderStep3 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header with Preset Name */}
        <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => preset ? onClose() : setCurrentStep(2)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Preset name (e.g., Digital Wall Art)"
                className="text-lg font-semibold text-gray-900 border-none focus:ring-0 p-0 w-80 placeholder:text-gray-400"
              />
              <p className="text-sm text-gray-500">
                {formData.taxonomy_path || 'No category selected'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b bg-white shrink-0 px-4 overflow-x-auto">
          <div className="flex gap-1">
            {EDITOR_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 shrink-0">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'about' && renderAboutTab()}
          {activeTab === 'price' && renderPriceTab()}
          {activeTab === 'variations' && renderVariationsTab()}
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'shipping' && renderShippingTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  // ============================================================
  // Tab Content: About
  // ============================================================
  const renderAboutTab = () => (
    <div className="space-y-6 max-w-2xl">
      {/* Note to buyers for digital items */}
      {isDigital && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-2">
            Note to buyers for digital items
            <Info className="w-4 h-4 text-gray-400" />
          </h3>
          <textarea
            value={formData.note_to_buyers}
            onChange={(e) => handleChange('note_to_buyers', e.target.value)}
            placeholder="Thank you so much for your order! You can access your downloads by visiting your Etsy Profile > Purchases..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200 resize-none h-20"
          />
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-gray-500 mb-2">
          What makes your item special? Buyers will only see the first few lines unless they expand the description.
        </p>
        
        {/* Description Source Selection */}
        <div className="flex gap-2 mb-3">
          {DESCRIPTION_SOURCES.map(src => (
            <button
              key={src.value}
              type="button"
              onClick={() => handleChange('description_source', src.value)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                formData.description_source === src.value
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        {formData.description_source === 'template' && (
          <select
            value={formData.description_template_id || ''}
            onChange={(e) => handleChange('description_template_id', e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Select a template...</option>
            {descriptionTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {formData.description_source === 'manual' && (
          <textarea
            value={formData.manual_description}
            onChange={(e) => handleChange('manual_description', e.target.value)}
            placeholder="Describe your item..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200 resize-none h-32"
          />
        )}
      </div>

      {/* Personalization */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Personalization</h3>
            <p className="text-sm text-gray-500">Make it easier for buyers to add the info you need to personalize their item.</p>
          </div>
          <button
            type="button"
            onClick={() => handleChange('is_personalizable', !formData.is_personalizable)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              formData.is_personalizable ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-700 hover:bg-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            {formData.is_personalizable ? 'Enabled' : 'Add personalization'}
          </button>
        </div>

        {formData.is_personalizable && (
          <div className="space-y-3 pt-3 border-t mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions for buyers
              </label>
              <textarea
                value={formData.personalization_instructions}
                onChange={(e) => handleChange('personalization_instructions', e.target.value)}
                placeholder="E.g., Please provide the name and date for personalization..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200 resize-none h-20"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max characters
                </label>
                <input
                  type="number"
                  value={formData.personalization_char_count_max}
                  onChange={(e) => handleChange('personalization_char_count_max', Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.personalization_is_required}
                    onChange={(e) => handleChange('personalization_is_required', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ============================================================
  // Tab Content: Price & Inventory
  // ============================================================
  const renderPriceTab = () => (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-gray-50 rounded-lg p-6 border">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Price & Inventory</h3>
        <p className="text-sm text-gray-500 mb-4">Set a price for your item and indicate how many are available for sale.</p>

        {/* Price */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-gray-200"
            />
            <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-lg text-gray-600">
              USD
            </span>
          </div>
        </div>

        {/* Quantity */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
            className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
          />
        </div>

        {/* SKU */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            SKU (optional)
          </label>
          <button
            type="button"
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add SKU
          </button>
          {formData.sku && (
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              placeholder="Your SKU"
              className="mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
            />
          )}
        </div>
      </div>
    </div>
  )

  // ============================================================
  // Tab Content: Variations
  // ============================================================
  const renderVariationsTab = () => (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-gray-100 rounded-lg p-6 border">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <p className="text-gray-700">
              {isDigital 
                ? 'Variations are unavailable for digital items.'
                : 'Variations allow you to offer different options like size, color, etc. This feature is available for physical items.'}
            </p>
            {!isDigital && (
              <p className="text-sm text-gray-500 mt-2">
                Note: Variations require Etsy API access. Connect your Etsy account to use this feature.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ============================================================
  // Tab Content: Details
  // ============================================================
  const renderDetailsTab = () => (
    <div className="space-y-6 max-w-2xl">
      {/* Core Details Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Details</h3>
        <p className="text-sm text-gray-500 mb-4">
          Share a few more specifics about your item to make it easier to find in search.
        </p>

        {/* Core details card */}
        <div className="p-4 border rounded-lg bg-white mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Core details <span className="text-red-500">*</span></h4>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              {isDigital ? <Monitor className="w-8 h-8 text-gray-400" /> : <Box className="w-8 h-8 text-gray-400" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {isDigital ? 'Digital files' : 'Physical item'}
              </div>
              <div className="text-sm text-gray-500">
                {isDigital ? 'Instant download' : 'Ships to buyer'}
              </div>
              <div className="text-sm text-gray-500">
                {WHO_MADE_OPTIONS.find(o => o.value === formData.who_made)?.label} • 
                {formData.is_supply ? ' A supply' : ' A finished product'} • 
                {WHEN_MADE_OPTIONS.find(o => o.value === formData.when_made)?.label}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Category */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        {formData.taxonomy_path ? (
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {formData.taxonomy_path.split(' > ').pop()}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  {formData.taxonomy_path}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="w-full p-4 border-2 border-dashed rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            Select a category
          </button>
        )}
      </div>

      {/* Attributes (Category Properties) */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
          Attributes
          <Info className="w-4 h-4 text-gray-400" />
        </h3>

        {/* Materials */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Materials
          </label>
          <p className="text-xs text-gray-500 mb-2">Select up to 5</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.materials.map((material, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded-full text-sm"
              >
                {material}
                <button
                  type="button"
                  onClick={() => handleRemoveMaterial(material)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={materialInput}
            onChange={(e) => setMaterialInput(e.target.value)}
            onKeyDown={handleAddMaterial}
            placeholder="Type to search..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
          />
        </div>

        {/* Primary Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary color
          </label>
          <select
            value={formData.primary_color}
            onChange={(e) => handleChange('primary_color', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Type to search...</option>
            <option value="black">Black</option>
            <option value="white">White</option>
            <option value="blue">Blue</option>
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="purple">Purple</option>
            <option value="pink">Pink</option>
            <option value="orange">Orange</option>
            <option value="brown">Brown</option>
            <option value="gray">Gray</option>
            <option value="beige">Beige</option>
          </select>
        </div>

        {/* Secondary Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secondary color
          </label>
          <select
            value={formData.secondary_color}
            onChange={(e) => handleChange('secondary_color', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Type to search...</option>
            <option value="black">Black</option>
            <option value="white">White</option>
            <option value="blue">Blue</option>
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="purple">Purple</option>
            <option value="pink">Pink</option>
          </select>
        </div>

        {/* Width & Height for digital */}
        {isDigital && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.item_width || ''}
                  onChange={(e) => handleChange('item_width', e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                  placeholder=""
                />
                <select
                  value={formData.item_dimensions_unit}
                  onChange={(e) => handleChange('item_dimensions_unit', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                >
                  {DIMENSION_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.item_height || ''}
                  onChange={(e) => handleChange('item_height', e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                  placeholder=""
                />
                <select
                  value={formData.item_dimensions_unit}
                  onChange={(e) => handleChange('item_dimensions_unit', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                >
                  {DIMENSION_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Show All Attributes Button */}
        <button
          type="button"
          onClick={() => setShowCategoryAttributes(!showCategoryAttributes)}
          className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          {showCategoryAttributes ? 'Hide' : 'Show'} all attributes
        </button>

        {/* Dynamic Category Properties */}
        {showCategoryAttributes && categoryProperties.length > 0 && (
          <div className="mt-4 space-y-4 pt-4 border-t">
            {categoryProperties.map(prop => (
              <div key={prop.property_id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {prop.display_name || prop.name}
                  {prop.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {prop.is_multivalued ? (
                  <div className="flex flex-wrap gap-2">
                    {prop.possible_values?.slice(0, 8).map(val => (
                      <label
                        key={val.value_id}
                        className={`px-3 py-1 border rounded-full text-sm cursor-pointer transition-colors ${
                          formData.category_properties[prop.property_id]?.includes(val.value_id)
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.category_properties[prop.property_id]?.includes(val.value_id) || false}
                          onChange={(e) => {
                            const current = formData.category_properties[prop.property_id] || []
                            const newValue = e.target.checked
                              ? [...current, val.value_id]
                              : current.filter(id => id !== val.value_id)
                            handlePropertyChange(prop.property_id, newValue, true)
                          }}
                        />
                        {val.value}
                      </label>
                    ))}
                  </div>
                ) : (
                  <select
                    value={formData.category_properties[prop.property_id] || ''}
                    onChange={(e) => handlePropertyChange(prop.property_id, e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="">Select...</option>
                    {prop.possible_values?.map(val => (
                      <option key={val.value_id} value={val.value_id}>{val.value}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Tags
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Add up to 13 tags to help people search for your listings.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.default_tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Shape, color, style, function, etc."
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
          />
          <button
            type="button"
            onClick={() => {
              if (tagInput.trim() && formData.default_tags.length < 13) {
                handleChange('default_tags', [...formData.default_tags, tagInput.trim()])
                setTagInput('')
              }
            }}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">{13 - formData.default_tags.length} left</p>
      </div>
    </div>
  )

  // ============================================================
  // Tab Content: Processing & Shipping
  // ============================================================
  const renderShippingTab = () => (
    <div className="space-y-6 max-w-2xl">
      {isDigital ? (
        <div className="bg-gray-100 rounded-lg p-6 border">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-500 mt-0.5" />
            <p className="text-gray-700">
              Buyers will download your uploaded files immediately after purchase.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Processing Time */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Processing time</h3>
            <p className="text-sm text-gray-500 mb-4">
              How long does it take you to make and ship the item?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.processing_min || ''}
                  onChange={(e) => handleChange('processing_min', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.processing_max || ''}
                  onChange={(e) => handleChange('processing_max', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Shipping Profile */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Shipping</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select a shipping profile for this preset.
            </p>
            <select
              value={formData.shipping_profile_id || ''}
              onChange={(e) => handleChange('shipping_profile_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
            >
              <option value="">Select a shipping profile...</option>
              {shippingProfiles.map(p => (
                <option key={p.shipping_profile_id} value={p.shipping_profile_id}>
                  {p.title}
                </option>
              ))}
            </select>
            {shippingProfiles.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No shipping profiles found. Connect your Etsy account to load shipping profiles.
              </p>
            )}
          </div>

          {/* Item Weight & Dimensions for Physical */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Item weight & size</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={formData.item_weight || ''}
                  onChange={(e) => handleChange('item_weight', e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                />
                <select
                  value={formData.item_weight_unit}
                  onChange={(e) => handleChange('item_weight_unit', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                >
                  {WEIGHT_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.item_length || ''}
                  onChange={(e) => handleChange('item_length', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.item_width || ''}
                  onChange={(e) => handleChange('item_width', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.item_height || ''}
                  onChange={(e) => handleChange('item_height', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>
            <div className="mt-2">
              <select
                value={formData.item_dimensions_unit}
                onChange={(e) => handleChange('item_dimensions_unit', e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
              >
                {DIMENSION_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  )

  // ============================================================
  // Tab Content: Settings
  // ============================================================
  const renderSettingsTab = () => (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-gray-50 rounded-lg p-6 border">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Settings</h3>
        <p className="text-sm text-gray-500 mb-4">
          Choose how this listing will display in your shop and how it will renew.
        </p>

        {/* Returns and Exchanges */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Returns and exchanges <span className="text-red-500">*</span>
          </label>
          {isDigital ? (
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                Digital items aren't eligible for returns or exchanges on Etsy because of the nature of these items.
              </p>
            </div>
          ) : (
            <select
              value={formData.return_policy_id || ''}
              onChange={(e) => handleChange('return_policy_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
            >
              <option value="">Select a return policy...</option>
              {returnPolicies.map(p => (
                <option key={p.return_policy_id} value={p.return_policy_id}>
                  {p.accepts_returns ? 'Accepts returns' : 'No returns'} - {p.accepts_exchanges ? 'Accepts exchanges' : 'No exchanges'}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Shop Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Shop section
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Use shop sections to organize your products into groups shoppers can explore.
          </p>
          <select
            value={formData.shop_section_id || ''}
            onChange={(e) => handleChange('shop_section_id', e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-200"
          >
            <option value="">None</option>
            {shopSections.map(s => (
              <option key={s.shop_section_id} value={s.shop_section_id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Feature this listing */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Feature this listing
              </label>
              <p className="text-xs text-gray-500">
                Showcase this listing at the top of your shop's homepage to make it stand out.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('is_featured', !formData.is_featured)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.is_featured ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.is_featured ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Renewal Options */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Renewal options <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Each renewal lasts for four months or until the listing sells out.
          </p>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.should_auto_renew
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="renewal"
                checked={formData.should_auto_renew}
                onChange={() => handleChange('should_auto_renew', true)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                formData.should_auto_renew ? 'border-gray-900' : 'border-gray-300'
              }`}>
                {formData.should_auto_renew && (
                  <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">Automatic</div>
                <p className="text-sm text-gray-500">This listing will renew as it expires for $0.20 USD each time (recommended).</p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                !formData.should_auto_renew
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="renewal"
                checked={!formData.should_auto_renew}
                onChange={() => handleChange('should_auto_renew', false)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                !formData.should_auto_renew ? 'border-gray-900' : 'border-gray-300'
              }`}>
                {!formData.should_auto_renew && (
                  <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">Manual</div>
                <p className="text-sm text-gray-500">I'll renew expired listings myself.</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  // ============================================================
  // Main Render
  // ============================================================
  if (currentStep === 1) return renderStep1()
  if (currentStep === 2) return renderStep2()
  return renderStep3()
}
