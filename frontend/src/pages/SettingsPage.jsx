import { useState, useEffect } from 'react'
import { Settings, Key, Eye, EyeOff, Save, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../services/api'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    etsy_api_key: '',
    etsy_shared_secret: '',
    groq_api_key: '',
    default_price: 10.0,
    default_quantity: 999,
    auto_renew: true
  })
  
  const [showSecrets, setShowSecrets] = useState({
    etsy_api_key: false,
    etsy_shared_secret: false,
    groq_api_key: false
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [hasCredentials, setHasCredentials] = useState({
    etsy: false,
    groq: false
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.getSettings()
      setSettings(prev => ({
        ...prev,
        default_price: data.default_price || 10.0,
        default_quantity: data.default_quantity || 999,
        auto_renew: data.auto_renew ?? true
      }))
      setHasCredentials({
        etsy: data.has_etsy_credentials,
        groq: data.has_groq_key
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
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
      
      // Clear sensitive fields after save
      setSettings(prev => ({
        ...prev,
        etsy_api_key: '',
        etsy_shared_secret: '',
        groq_api_key: ''
      }))
      
      // Reload to get updated status
      await loadSettings()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte spara inställningar' })
    } finally {
      setSaving(false)
    }
  }

  const toggleShow = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
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
          Konfigurera dina API-nycklar och standardinställningar
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

      {/* Etsy API Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-etsy-orange/10 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-etsy-orange" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Etsy API</h2>
              <p className="text-sm text-gray-500">Krävs för att skapa listings på Etsy</p>
            </div>
          </div>
          {hasCredentials.etsy && (
            <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <CheckCircle className="w-4 h-4" />
              Konfigurerad
            </span>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Hur får du API-nycklar?</strong>
          </p>
          <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
            <li>Gå till <a href="https://www.etsy.com/developers/register" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Etsy Developer Portal</a></li>
            <li>Skapa ett nytt app (välj "Create a New App")</li>
            <li>Fyll i appnamn och beskrivning</li>
            <li>Kopiera din <strong>API Key (Keystring)</strong> och <strong>Shared Secret</strong></li>
          </ol>
          <a 
            href="https://www.etsy.com/developers/your-apps" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-3 font-medium"
          >
            Öppna Etsy Developer Portal
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key (Keystring)
            </label>
            <div className="relative">
              <input
                type={showSecrets.etsy_api_key ? 'text' : 'password'}
                value={settings.etsy_api_key}
                onChange={(e) => setSettings(prev => ({ ...prev, etsy_api_key: e.target.value }))}
                placeholder={hasCredentials.etsy ? '••••••••••••••••' : 'Klistra in din API Key'}
                className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-etsy-orange/50 focus:border-etsy-orange"
              />
              <button
                type="button"
                onClick={() => toggleShow('etsy_api_key')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecrets.etsy_api_key ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shared Secret
            </label>
            <div className="relative">
              <input
                type={showSecrets.etsy_shared_secret ? 'text' : 'password'}
                value={settings.etsy_shared_secret}
                onChange={(e) => setSettings(prev => ({ ...prev, etsy_shared_secret: e.target.value }))}
                placeholder={hasCredentials.etsy ? '••••••••••••••••' : 'Klistra in din Shared Secret'}
                className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-etsy-orange/50 focus:border-etsy-orange"
              />
              <button
                type="button"
                onClick={() => toggleShow('etsy_shared_secret')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecrets.etsy_shared_secret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Groq API Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Groq API (Valfritt)</h2>
              <p className="text-sm text-gray-500">AI-generering av listing-innehåll</p>
            </div>
          </div>
          {hasCredentials.groq && (
            <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <CheckCircle className="w-4 h-4" />
              Konfigurerad
            </span>
          )}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-purple-800">
            <strong>Valfritt:</strong> Om du inte anger en egen Groq API-nyckel används systemets standardnyckel.
          </p>
          <a 
            href="https://console.groq.com/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 mt-2 font-medium"
          >
            Skaffa en gratis Groq API-nyckel
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Groq API Key
          </label>
          <div className="relative">
            <input
              type={showSecrets.groq_api_key ? 'text' : 'password'}
              value={settings.groq_api_key}
              onChange={(e) => setSettings(prev => ({ ...prev, groq_api_key: e.target.value }))}
              placeholder={hasCredentials.groq ? '••••••••••••••••' : 'gsk_... (valfritt)'}
              className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => toggleShow('groq_api_key')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showSecrets.groq_api_key ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
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
    </div>
  )
}
