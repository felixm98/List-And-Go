import { useState, useEffect } from 'react'
import { 
  X, Save, Loader2, Package, DollarSign, Tag, Truck, 
  RotateCcw, Sparkles, FileText, ChevronDown, ChevronUp,
  AlertCircle, FolderTree, Search
} from 'lucide-react'
import { api } from '../services/api'

// Etsy enum values
const WHO_MADE_OPTIONS = [
  { value: 'i_did', label: 'Jag gjorde det' },
  { value: 'someone_else', label: 'Någon annan gjorde det' },
  { value: 'collective', label: 'Ett kollektiv' }
]

const WHEN_MADE_OPTIONS = [
  { value: 'made_to_order', label: 'Made to order' },
  { value: '2020_2026', label: '2020-2026' },
  { value: '2010_2019', label: '2010-2019' },
  { value: '2007_2009', label: '2007-2009' },
  { value: 'before_2007', label: 'Före 2007' },
  { value: '2000_2006', label: '2000-2006' },
  { value: '1990s', label: '1990-talet' },
  { value: '1980s', label: '1980-talet' },
  { value: '1970s', label: '1970-talet' },
  { value: '1960s', label: '1960-talet' },
  { value: '1950s', label: '1950-talet' }
]

const LISTING_TYPE_OPTIONS = [
  { value: 'download', label: 'Digital nedladdning' },
  { value: 'physical', label: 'Fysisk produkt' },
  { value: 'both', label: 'Båda' }
]

const WEIGHT_UNITS = [
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' }
]

const DIMENSION_UNITS = [
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' }
]

const DESCRIPTION_SOURCES = [
  { value: 'ai', label: '🤖 AI-genererad', description: 'Genereras automatiskt baserat på bilden' },
  { value: 'template', label: '📝 Använd mall', description: 'Använd en av dina sparade mallar' },
  { value: 'manual', label: '✍️ Egen text', description: 'Skriv en fast description för denna preset' }
]

export default function PresetEditor({ preset, onSave, onClose }) {
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
    description_source: 'ai',
    description_template_id: null,
    manual_description: '',
    // New fields
    is_taxable: true,
    is_customizable: true,
    production_partner_ids: []
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Etsy data
  const [shippingProfiles, setShippingProfiles] = useState([])
  const [returnPolicies, setReturnPolicies] = useState([])
  const [shopSections, setShopSections] = useState([])
  const [descriptionTemplates, setDescriptionTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [productionPartners, setProductionPartners] = useState([])
  const [loadingEtsyData, setLoadingEtsyData] = useState(true)
  
  // Category search
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  
  // Tags/materials input
  const [tagInput, setTagInput] = useState('')
  const [materialInput, setMaterialInput] = useState('')

  useEffect(() => {
    if (preset) {
      setFormData({
        ...formData,
        ...preset,
        shipping_profile_id: preset.shipping_profile_id || '',
        return_policy_id: preset.return_policy_id || '',
        shop_section_id: preset.shop_section_id || ''
      })
    }
    loadEtsyData()
  }, [preset])

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
      if (!formData.materials.includes(materialInput.trim())) {
        handleChange('materials', [...formData.materials, materialInput.trim()])
      }
      setMaterialInput('')
    }
  }

  const handleRemoveMaterial = (material) => {
    handleChange('materials', formData.materials.filter(m => m !== material))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Presetnamn krävs')
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
      setError(err.message || 'Kunde inte spara preset')
    } finally {
      setSaving(false)
    }
  }

  const isPhysical = formData.listing_type === 'physical' || formData.listing_type === 'both'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-etsy-orange to-orange-500">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            {preset ? 'Redigera Preset' : 'Skapa ny Preset'}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presetnamn *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="t.ex. Digital Wall Art"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-etsy-orange/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Listningstyp *
                </label>
                <select
                  value={formData.listing_type}
                  onChange={(e) => handleChange('listing_type', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-etsy-orange/50"
                >
                  {LISTING_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category (Taxonomy) - REQUIRED */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-green-600" />
                Kategori (obligatoriskt för Etsy)
              </h3>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value)
                        setShowCategoryDropdown(true)
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      placeholder="Sök kategori..."
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/50"
                    />
                  </div>
                </div>
                
                {/* Selected category display */}
                {formData.taxonomy_path && (
                  <div className="mt-2 p-2 bg-green-100 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-green-800">
                      <strong>Vald:</strong> {formData.taxonomy_path}
                    </span>
                    <button
                      onClick={() => {
                        handleChange('taxonomy_id', null)
                        handleChange('taxonomy_path', '')
                      }}
                      className="text-green-600 hover:text-red-500 text-sm"
                    >
                      Rensa
                    </button>
                  </div>
                )}

                {/* Category dropdown */}
                {showCategoryDropdown && categorySearch && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {categories
                      .filter(cat => 
                        cat.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
                        cat.full_path_taxonomy_ids?.some(id => 
                          categories.find(c => c.id === id)?.name?.toLowerCase().includes(categorySearch.toLowerCase())
                        )
                      )
                      .slice(0, 50)
                      .map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            handleChange('taxonomy_id', cat.id)
                            handleChange('taxonomy_path', cat.name || `Category ${cat.id}`)
                            setCategorySearch('')
                            setShowCategoryDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b last:border-0"
                        >
                          <div className="font-medium">{cat.name}</div>
                          {cat.path && <div className="text-xs text-gray-500">{cat.path}</div>}
                        </button>
                      ))
                    }
                    {categories.filter(cat => 
                      cat.name?.toLowerCase().includes(categorySearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">Inga kategorier hittades</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Common digital categories quick select */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Snabbval för digitala produkter:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 2078, name: 'Digital Downloads', path: 'Craft Supplies & Tools > Digital' },
                    { id: 66, name: 'Art & Collectibles', path: 'Art & Collectibles' },
                    { id: 1, name: 'Accessories', path: 'Accessories' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        handleChange('taxonomy_id', cat.id)
                        handleChange('taxonomy_path', cat.path)
                      }}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        formData.taxonomy_id === cat.id
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Quantity */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Pris & Kvantitet
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Pris (USD)</label>
                  <input
                    type="number"
                    min="0.20"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Kvantitet</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleChange('quantity', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Vem gjorde</label>
                  <select
                    value={formData.who_made}
                    onChange={(e) => handleChange('who_made', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {WHO_MADE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">När gjord</label>
                  <select
                    value={formData.when_made}
                    onChange={(e) => handleChange('when_made', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {WHEN_MADE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_supply}
                    onChange={(e) => handleChange('is_supply', e.target.checked)}
                    className="w-4 h-4 rounded text-etsy-orange"
                  />
                  <span className="text-sm text-gray-600">Detta är ett material/supply</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.should_auto_renew}
                    onChange={(e) => handleChange('should_auto_renew', e.target.checked)}
                    className="w-4 h-4 rounded text-etsy-orange"
                  />
                  <span className="text-sm text-gray-600">Auto-förnya</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_taxable}
                    onChange={(e) => handleChange('is_taxable', e.target.checked)}
                    className="w-4 h-4 rounded text-etsy-orange"
                  />
                  <span className="text-sm text-gray-600">Momspliktigt</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_customizable}
                    onChange={(e) => handleChange('is_customizable', e.target.checked)}
                    className="w-4 h-4 rounded text-etsy-orange"
                  />
                  <span className="text-sm text-gray-600">Kan anpassas</span>
                </label>
              </div>
            </div>

            {/* Shipping & Returns (for physical) */}
            {isPhysical && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Frakt & Returer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Fraktprofil</label>
                    <select
                      value={formData.shipping_profile_id}
                      onChange={(e) => handleChange('shipping_profile_id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="">-- Välj fraktprofil --</option>
                      {shippingProfiles.map(p => (
                        <option key={p.shipping_profile_id} value={p.shipping_profile_id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Returpolicy</label>
                    <select
                      value={formData.return_policy_id}
                      onChange={(e) => handleChange('return_policy_id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="">-- Välj returpolicy --</option>
                      {returnPolicies.map(p => (
                        <option key={p.return_policy_id} value={p.return_policy_id}>
                          {p.accepts_returns ? `Accepterar returer (${p.return_deadline} dagar)` : 'Inga returer'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Shop Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Butikssektion (valfritt)
              </label>
              <select
                value={formData.shop_section_id}
                onChange={(e) => handleChange('shop_section_id', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Ingen sektion --</option>
                {shopSections.map(s => (
                  <option key={s.shop_section_id} value={s.shop_section_id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Source */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Description-källa
              </h3>
              <div className="space-y-2">
                {DESCRIPTION_SOURCES.map(source => (
                  <label 
                    key={source.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.description_source === source.value 
                        ? 'border-purple-400 bg-purple-100' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="description_source"
                      value={source.value}
                      checked={formData.description_source === source.value}
                      onChange={(e) => handleChange('description_source', e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{source.label}</div>
                      <div className="text-sm text-gray-500">{source.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {formData.description_source === 'template' && (
                <div className="mt-3">
                  <select
                    value={formData.description_template_id || ''}
                    onChange={(e) => handleChange('description_template_id', parseInt(e.target.value) || null)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="">-- Välj mall --</option>
                    {descriptionTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.description_source === 'manual' && (
                <div className="mt-3">
                  <textarea
                    value={formData.manual_description}
                    onChange={(e) => handleChange('manual_description', e.target.value)}
                    placeholder="Skriv din fasta description här..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Default Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard-taggar (tryck Enter för att lägga till, max 13)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Skriv en tagg..."
                className="w-full px-3 py-2 border rounded-lg"
              />
              {formData.default_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.default_tags.map(tag => (
                    <span 
                      key={tag}
                      className="px-2 py-1 bg-etsy-orange/10 text-etsy-orange rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button 
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced Section */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Avancerade inställningar
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-4 border-t">
                {/* Personalization */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-600" />
                    Personalisering
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.is_personalizable}
                      onChange={(e) => handleChange('is_personalizable', e.target.checked)}
                      className="w-4 h-4 rounded text-etsy-orange"
                    />
                    <span className="text-sm text-gray-700">Denna produkt kan personaliseras</span>
                  </label>
                  
                  {formData.is_personalizable && (
                    <div className="space-y-3 mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.personalization_is_required}
                          onChange={(e) => handleChange('personalization_is_required', e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-600">Personalisering krävs</span>
                      </label>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Max antal tecken</label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={formData.personalization_char_count_max}
                          onChange={(e) => handleChange('personalization_char_count_max', parseInt(e.target.value))}
                          className="w-32 px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Instruktioner till köpare</label>
                        <textarea
                          value={formData.personalization_instructions}
                          onChange={(e) => handleChange('personalization_instructions', e.target.value)}
                          placeholder="t.ex. Ange önskat namn"
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Physical dimensions */}
                {isPhysical && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Fysiska mått</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Vikt</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.item_weight || ''}
                            onChange={(e) => handleChange('item_weight', parseFloat(e.target.value) || null)}
                            className="w-full px-2 py-2 border rounded-lg"
                          />
                          <select
                            value={formData.item_weight_unit}
                            onChange={(e) => handleChange('item_weight_unit', e.target.value)}
                            className="px-2 py-2 border rounded-lg"
                          >
                            {WEIGHT_UNITS.map(u => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Längd</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.item_length || ''}
                          onChange={(e) => handleChange('item_length', parseFloat(e.target.value) || null)}
                          className="w-full px-2 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Bredd</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.item_width || ''}
                          onChange={(e) => handleChange('item_width', parseFloat(e.target.value) || null)}
                          className="w-full px-2 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Höjd</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.item_height || ''}
                          onChange={(e) => handleChange('item_height', parseFloat(e.target.value) || null)}
                          className="w-full px-2 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <select
                        value={formData.item_dimensions_unit}
                        onChange={(e) => handleChange('item_dimensions_unit', e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                      >
                        {DIMENSION_UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Materials */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material (tryck Enter för att lägga till)
                  </label>
                  <input
                    type="text"
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    onKeyDown={handleAddMaterial}
                    placeholder="t.ex. Canvas, Ink"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {formData.materials.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.materials.map(mat => (
                        <span 
                          key={mat}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-sm flex items-center gap-1"
                        >
                          {mat}
                          <button 
                            onClick={() => handleRemoveMaterial(mat)}
                            className="hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-etsy-orange text-white rounded-lg hover:bg-etsy-orange/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Sparar...' : 'Spara preset'}
          </button>
        </div>
      </div>
    </div>
  )
}
