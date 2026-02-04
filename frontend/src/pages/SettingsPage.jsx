import { useState, useEffect } from 'react'
import { Settings, Link2, Link2Off, Store, Save, CheckCircle, AlertCircle, Loader2, ExternalLink, Package, Plus, Pencil, Trash2, FileText, Eye } from 'lucide-react'
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
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  
  // Preset & Template state
  const [presets, setPresets] = useState([])
  const [descriptionTemplates, setDescriptionTemplates] = useState([])
  const [editingPreset, setEditingPreset] = useState(null)
  const [showPresetEditor, setShowPresetEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [previewPreset, setPreviewPreset] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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
    setSaving(true)
    setMessage(null)
    
    try {
      await api.saveSettings(settings)
      setMessage({ type: 'success', text: 'Inställningar sparade!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte spara inställningar' })
    } finally {
      setSaving(false)
    }
  }

  const handleConnectEtsy = async () => {
    setConnecting(true)
    try {
      const authUrl = await api.connectEtsy()
      window.location.href = authUrl
    } catch (error) {
      setMessage({ type: 'error', text: 'Kunde inte ansluta till Etsy: ' + error.message })
      setConnecting(false)
    }
  }

  const handleDisconnectEtsy = async () => {
    if (!confirm('Är du säker på att du vill koppla från ditt Etsy-konto?')) {
      return
    }
    
    setDisconnecting(true)
    try {
      await api.disconnectEtsy()
      setEtsyStatus({ connected: false, shop: null })
      setMessage({ type: 'success', text: 'Etsy-konto frånkopplat' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Kunde inte koppla från: ' + error.message })
    } finally {
      setDisconnecting(false)
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
        setMessage({ type: 'success', text: 'Preset uppdaterad!' })
      } else {
        await api.createPreset(presetData)
        setMessage({ type: 'success', text: 'Preset skapad!' })
      }
      setShowPresetEditor(false)
      const updatedPresets = await api.getPresets()
      setPresets(updatedPresets)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte spara preset' })
    }
  }

  const handleDeletePreset = async (presetId) => {
    if (!confirm('Är du säker på att du vill ta bort denna preset?')) return
    try {
      await api.deletePreset(presetId)
      setPresets(presets.filter(p => p.id !== presetId))
      setMessage({ type: 'success', text: 'Preset borttagen' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte ta bort preset' })
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
        setMessage({ type: 'success', text: 'Mall uppdaterad!' })
      } else {
        await api.createDescriptionTemplate(templateData)
        setMessage({ type: 'success', text: 'Mall skapad!' })
      }
      setShowTemplateEditor(false)
      const updatedTemplates = await api.getDescriptionTemplates()
      setDescriptionTemplates(updatedTemplates)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte spara mall' })
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Är du säker på att du vill ta bort denna mall?')) return
    try {
      await api.deleteDescriptionTemplate(templateId)
      setDescriptionTemplates(descriptionTemplates.filter(t => t.id !== templateId))
      setMessage({ type: 'success', text: 'Mall borttagen' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte ta bort mall' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-etsy-orange" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-etsy-orange" />
          Inställningar
        </h1>
        <p className="text-gray-600 mt-2">
          Hantera din Etsy-anslutning och standardinställningar
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
            <div className="w-10 h-10 bg-etsy-orange/10 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-etsy-orange" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Etsy-konto</h2>
              <p className="text-sm text-gray-500">Anslut ditt Etsy-konto för att ladda upp listings</p>
            </div>
          </div>
        </div>

        {etsyStatus.connected ? (
          <div className="space-y-4">
            {/* Connected State */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Ansluten till Etsy</p>
                    <p className="text-sm text-green-600">
                      {etsyStatus.shop?.shop_name || 'Din butik'}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://www.etsy.com/shop/${etsyStatus.shop?.shop_name || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900"
                >
                  Visa butik
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Shop Info */}
            {etsyStatus.shop && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Butiks-ID</p>
                  <p className="font-medium text-gray-900">{etsyStatus.shop.shop_id}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Token status</p>
                  <p className={`font-medium ${etsyStatus.shop.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                    {etsyStatus.shop.is_valid ? 'Giltig' : 'Utgången - Anslut igen'}
                  </p>
                </div>
              </div>
            )}

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnectEtsy}
              disabled={disconnecting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2Off className="w-4 h-4" />
              )}
              {disconnecting ? 'Kopplar från...' : 'Koppla från Etsy'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected State */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">Etsy ej anslutet</p>
                  <p className="text-sm text-orange-600 mt-1">
                    Du måste ansluta ditt Etsy-konto för att kunna ladda upp listings. 
                    Klicka på knappen nedan för att logga in med Etsy.
                  </p>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">Så här fungerar det:</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Klicka på "Anslut till Etsy" nedan</li>
                <li>Logga in på ditt Etsy-konto</li>
                <li>Godkänn att appen får hantera dina listings</li>
                <li>Du omdirigeras tillbaka hit automatiskt</li>
              </ol>
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnectEtsy}
              disabled={connecting}
              className="flex items-center gap-2 px-6 py-3 bg-etsy-orange text-white rounded-lg hover:bg-etsy-orange/90 transition-colors disabled:opacity-50 font-medium"
            >
              {connecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Link2 className="w-5 h-5" />
              )}
              {connecting ? 'Ansluter...' : 'Anslut till Etsy'}
            </button>
          </div>
        )}
      </div>

      {/* Default Settings Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Standardinställningar</h2>
            <p className="text-sm text-gray-500">Används som standard för nya listings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Standardpris (USD)
            </label>
            <input
              type="number"
              min="0.20"
              step="0.01"
              value={settings.default_price}
              onChange={(e) => setSettings(prev => ({ ...prev, default_price: parseFloat(e.target.value) }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-etsy-orange/50 focus:border-etsy-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Standardkvantitet
            </label>
            <input
              type="number"
              min="1"
              value={settings.default_quantity}
              onChange={(e) => setSettings(prev => ({ ...prev, default_quantity: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-etsy-orange/50 focus:border-etsy-orange"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_renew}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_renew: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-etsy-orange focus:ring-etsy-orange"
              />
              <span className="text-sm font-medium text-gray-700">
                Auto-förnya listings
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Listing Presets Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-etsy-orange/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-etsy-orange" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Listing-presets</h2>
              <p className="text-sm text-gray-500">Spara standardvärden för olika produkttyper</p>
            </div>
          </div>
          <button
            onClick={handleCreatePreset}
            className="flex items-center gap-2 px-4 py-2 bg-etsy-orange text-white rounded-lg hover:bg-etsy-orange/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Ny preset
          </button>
        </div>

        {presets.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Inga presets ännu</p>
            <p className="text-sm text-gray-400 mt-1">
              Skapa en preset för att snabbt applicera inställningar vid uppladdning
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
                    title="Förhandsgranska"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditPreset(preset)}
                    className="p-2 text-gray-400 hover:text-etsy-orange hover:bg-etsy-orange/10 rounded-lg transition-colors"
                    title="Redigera"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Ta bort"
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
              <h2 className="text-lg font-semibold text-gray-900">Description-mallar</h2>
              <p className="text-sm text-gray-500">Skapa återanvändbara beskrivningsmallar med variabler</p>
            </div>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Ny mall
          </button>
        </div>

        {descriptionTemplates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Inga mallar ännu</p>
            <p className="text-sm text-gray-400 mt-1">
              Skapa en mall för att använda istället för AI-genererade beskrivningar
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
                    title="Redigera"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Ta bort"
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
          className="flex items-center gap-2 px-6 py-3 bg-etsy-orange text-white rounded-lg hover:bg-etsy-orange/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Sparar...' : 'Spara inställningar'}
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
