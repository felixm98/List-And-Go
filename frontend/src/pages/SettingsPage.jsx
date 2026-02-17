import { useState, useEffect } from 'react'
import { Settings, Store, Save, CheckCircle, AlertCircle, Loader2, ExternalLink, Package, Plus, Pencil, Trash2, FileText, Eye } from 'lucide-react'
import { api } from '../services/api'
import PresetEditor from '../components/PresetEditor'
import DescriptionTemplateEditor from '../components/DescriptionTemplateEditor'
import PresetPreviewModal from '../components/PresetPreviewModal'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    default_price: 10.0,
    default_quantity: 999,
    auto_renew: true
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [etsyStatus, setEtsyStatus] = useState({ connected: false, shop: null })
  
  // Preset & Template state
  const [presets, setPresets] = useState([])
  const [descriptionTemplates, setDescriptionTemplates] = useState([])
  const [editingPreset, setEditingPreset] = useState(null)
  const [showPresetEditor, setShowPresetEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [previewPreset, setPreviewPreset] = useState(null)

  const isDemoMode = localStorage.getItem('demoMode') === 'true' && !localStorage.getItem('accessToken')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // In demo mode, use mock data
    if (isDemoMode) {
      setSettings({
        default_price: 9.99,
        default_quantity: 999,
        auto_renew: true
      })
      setEtsyStatus({ connected: true, shop: { shop_name: 'Demo Shop', shop_id: '12345', is_valid: true } })
      setPresets([
        { id: 1, name: 'Digital Art Preset', preset_type: 'digital', price: 4.99 },
        { id: 2, name: 'Print on Demand', preset_type: 'physical', price: 19.99 }
      ])
      setDescriptionTemplates([
        { id: 1, name: 'Standard Description' }
      ])
      setLoading(false)
      return
    }

    try {
      const [settingsData, etsyData, presetsData, templatesData] = await Promise.all([
        api.getSettings(),
        api.getEtsyStatus(),
        api.getPresets(),
        api.getDescriptionTemplates()
      ])
      
      setSettings({
        default_price: settingsData.default_price || 10.0,
        default_quantity: settingsData.default_quantity || 999,
        auto_renew: settingsData.auto_renew ?? true
      })
      
      setEtsyStatus(etsyData)
      setPresets(presetsData)
      setDescriptionTemplates(templatesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (isDemoMode) {
      setMessage({ type: 'success', text: 'Demo: Settings would be saved here!' })
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      await api.saveSettings(settings)
      setMessage({ type: 'success', text: 'Settings saved!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not save settings' })
    } finally {
      setSaving(false)
    }
  }

  // Preset handlers
  const handleCreatePreset = () => {
    setEditingPreset(null)
    setShowPresetEditor(true)
  }

  const handleEditPreset = (preset) => {
    setEditingPreset(preset)
    setShowPresetEditor(true)
  }

  const handleSavePreset = async (presetData) => {
    try {
      if (editingPreset) {
        await api.updatePreset(editingPreset.id, presetData)
        setMessage({ type: 'success', text: 'Preset updated!' })
      } else {
        await api.createPreset(presetData)
        setMessage({ type: 'success', text: 'Preset created!' })
      }
      setShowPresetEditor(false)
      const updatedPresets = await api.getPresets()
      setPresets(updatedPresets)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not save preset' })
    }
  }

  const handleDeletePreset = async (presetId) => {
    if (!confirm('Are you sure you want to delete this preset?')) return
    try {
      await api.deletePreset(presetId)
      setPresets(presets.filter(p => p.id !== presetId))
      setMessage({ type: 'success', text: 'Preset deleted' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not delete preset' })
    }
  }

  // Template handlers
  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setShowTemplateEditor(true)
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
    setShowTemplateEditor(true)
  }

  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await api.updateDescriptionTemplate(editingTemplate.id, templateData)
        setMessage({ type: 'success', text: 'Template updated!' })
      } else {
        await api.createDescriptionTemplate(templateData)
        setMessage({ type: 'success', text: 'Template created!' })
      }
      setShowTemplateEditor(false)
      const updatedTemplates = await api.getDescriptionTemplates()
      setDescriptionTemplates(updatedTemplates)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not save template' })
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      await api.deleteDescriptionTemplate(templateId)
      setDescriptionTemplates(descriptionTemplates.filter(t => t.id !== templateId))
      setMessage({ type: 'success', text: 'Template deleted' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not delete template' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-brand-primary" />
          Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your Etsy connection and default settings
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' 
            ? <CheckCircle className="w-5 h-5" /> 
            : <AlertCircle className="w-5 h-5" />
          }
          {message.text}
        </div>
      )}

      {/* Etsy Connection Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Etsy Account</h2>
              <p className="text-sm text-gray-500">Your connected Etsy account</p>
            </div>
          </div>
        </div>

        {/* Connected State */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Connected to Etsy</p>
                <p className="text-sm text-green-600">
                  {etsyStatus.shop?.shop_name || 'Your shop'}
                </p>
              </div>
            </div>
            {etsyStatus.shop?.shop_name && (
              <a
                href={`https://www.etsy.com/shop/${etsyStatus.shop.shop_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900"
              >
                View shop
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Shop Info */}
        {etsyStatus.shop && (
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Shop ID</p>
              <p className="font-medium text-gray-900">{etsyStatus.shop.shop_id}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Token status</p>
              <p className={`font-medium ${etsyStatus.shop.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                {etsyStatus.shop.is_valid ? 'Valid' : 'Expired - Log in again'}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          To switch Etsy account, log out and log in with a different Etsy account.
        </p>
      </div>

      {/* Listing Presets Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Listing Presets</h2>
              <p className="text-sm text-gray-500">Save default values for different product types</p>
            </div>
          </div>
          <button
            onClick={handleCreatePreset}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Preset
          </button>
        </div>

        {presets.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No presets yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a preset to quickly apply settings during upload
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {presets.map(preset => (
              <div 
                key={preset.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    preset.listing_type === 'download' ? 'bg-blue-500' :
                    preset.listing_type === 'physical' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`} />
                  <div>
                    <h3 className="font-medium text-gray-900">{preset.name}</h3>
                    <p className="text-sm text-gray-500">
                      ${preset.price?.toFixed(2)} • {preset.listing_type} • {preset.who_made}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewPreset(preset)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditPreset(preset)}
                    className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description Templates Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Description Templates</h2>
              <p className="text-sm text-gray-500">Create reusable description templates with variables</p>
            </div>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {descriptionTemplates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No templates yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a template for reusable product descriptions
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {descriptionTemplates.map(template => (
              <div 
                key={template.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 truncate max-w-md">
                    {template.content?.substring(0, 80)}...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Modals */}
      {showPresetEditor && (
        <PresetEditor
          preset={editingPreset}
          descriptionTemplates={descriptionTemplates}
          onSave={handleSavePreset}
          onClose={() => setShowPresetEditor(false)}
        />
      )}

      {showTemplateEditor && (
        <DescriptionTemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setShowTemplateEditor(false)}
        />
      )}

      {previewPreset && (
        <PresetPreviewModal
          preset={previewPreset}
          onClose={() => setPreviewPreset(null)}
          onEdit={handleEditPreset}
        />
      )}
    </div>
  )
}
