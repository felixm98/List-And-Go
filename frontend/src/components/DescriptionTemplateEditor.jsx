import { useState, useEffect } from 'react'
import { X, Save, Loader2, FileText, Eye, AlertCircle, Info } from 'lucide-react'
import { api } from '../services/api'

const AVAILABLE_VARIABLES = [
  { name: 'title', description: 'The listing title' },
  { name: 'filename', description: 'The image filename' },
  { name: 'preset_name', description: 'Name of selected preset' },
  { name: 'date', description: 'Today\'s date' },
  { name: 'price', description: 'Product price' }
]

export default function DescriptionTemplateEditor({ template, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    content: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState('')

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        content: template.content
      })
    }
  }, [template])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const insertVariable = (varName) => {
    const textarea = document.getElementById('template-content')
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.content
    const variable = `{{${varName}}}`
    
    const newContent = text.substring(0, start) + variable + text.substring(end)
    handleChange('content', newContent)
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const handlePreview = () => {
    // Render preview with example values
    let preview = formData.content
    const exampleValues = {
      title: 'Beautiful Mountain Sunset Art Print',
      filename: 'mountain_sunset_01.jpg',
      preset_name: 'Digital Wall Art',
      date: new Date().toLocaleDateString('sv-SE'),
      price: '$4.99'
    }
    
    for (const [key, value] of Object.entries(exampleValues)) {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    
    setPreviewContent(preview)
    setShowPreview(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Template name is required')
      return
    }
    if (!formData.content.trim()) {
      setError('Template content is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (template?.id) {
        await api.updateDescriptionTemplate(template.id, formData)
      } else {
        await api.createDescriptionTemplate(formData)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Could not save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-purple-600">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {template ? 'Edit Description Template' : 'Create New Description Template'}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. POD Standard Template"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* Variables */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Available Variables</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map(v => (
                  <button
                    key={v.name}
                    onClick={() => insertVariable(v.name)}
                    className="px-3 py-1 bg-white border border-blue-200 rounded-full text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                    title={v.description}
                  >
                    {`{{${v.name}}}`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Click on a variable to insert it at cursor position
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Content *
              </label>
              <textarea
                id="template-content"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder={`Welcome to my shop! 🎨

This beautiful {{title}} is perfect for adding style to any room.

✨ DETAILS:
• Premium quality
• Instant digital download
• Multiple sizes included

📦 WHAT YOU'LL GET:
• High-resolution files
• Easy to print at home or at a print shop

Thank you for visiting!`}
                rows={12}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
              />
            </div>

            {/* Preview Button */}
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            {/* Preview Modal */}
            {showPreview && (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Preview</span>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-white rounded border p-4 whitespace-pre-wrap text-sm text-gray-800">
                  {previewContent}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Variables have been replaced with example values
                </p>
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
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
