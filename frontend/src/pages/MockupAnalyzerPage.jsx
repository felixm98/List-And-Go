import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, Upload, Clipboard, Loader2, Copy, Check, Image as ImageIcon, X, ChevronDown, ChevronUp, Sparkles, Star, ExternalLink, RefreshCw, Wand2, Eye } from 'lucide-react'
import api from '../services/api'

// ─── JSON Prompt Viewer with copy ───────────────────────────────────────────
function PromptViewer({ data, label }) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const jsonStr = JSON.stringify(data, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-sm text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); handleCopy() }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-brand-primary text-white rounded-lg hover:bg-brand-dark transition-colors"
            title="Kopiera JSON"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Kopierat!' : 'Kopiera'}
          </button>
          {collapsed ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
        </div>
      </button>
      {!collapsed && (
        <pre className="p-4 text-xs bg-gray-900 text-green-400 overflow-x-auto max-h-[500px] overflow-y-auto font-mono leading-relaxed">
          {jsonStr}
        </pre>
      )}
    </div>
  )
}

// ─── Generation Prompt Card ─────────────────────────────────────────────────
function GenerationPromptCard({ prompt, negative }) {
  const [copiedMain, setCopiedMain] = useState(false)
  const [copiedNeg, setCopiedNeg] = useState(false)

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="space-y-3">
      {prompt && (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
            <span className="font-semibold text-sm text-emerald-800 flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> Generations-prompt (klistra in direkt)
            </span>
            <button
              onClick={() => copy(prompt, setCopiedMain)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {copiedMain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedMain ? 'Kopierat!' : 'Kopiera'}
            </button>
          </div>
          <p className="p-4 text-sm text-gray-700 leading-relaxed">{prompt}</p>
        </div>
      )}
      {negative && (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-red-50">
            <span className="font-semibold text-sm text-red-800">Negativ prompt (undvik dessa)</span>
            <button
              onClick={() => copy(negative, setCopiedNeg)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {copiedNeg ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedNeg ? 'Kopierat!' : 'Kopiera'}
            </button>
          </div>
          <p className="p-4 text-sm text-gray-600">{negative}</p>
        </div>
      )}
    </div>
  )
}

// ─── Style Tags ─────────────────────────────────────────────────────────────
function StyleTags({ tags }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => (
        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
          {tag}
        </span>
      ))}
    </div>
  )
}

// ─── Analysis Result Card ───────────────────────────────────────────────────
function AnalysisResult({ result, imageUrl, imagePreview }) {
  if (!result) return null
  const analysis = result.analysis || result

  return (
    <div className="space-y-4 border-t pt-6">
      {/* Image preview + quick info */}
      <div className="flex gap-4 items-start">
        {(imageUrl || imagePreview) && (
          <img
            src={imageUrl || imagePreview}
            alt="Analyzed"
            className="w-32 h-32 object-cover rounded-xl border shadow-sm flex-shrink-0"
          />
        )}
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Analysresultat
          </h3>
          {analysis.nano_banano_prompt?.scene_description && (
            <p className="text-sm text-gray-600">{analysis.nano_banano_prompt.scene_description}</p>
          )}
          {analysis.nano_banano_prompt?.product_type && (
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              {analysis.nano_banano_prompt.product_type}
            </span>
          )}
          {analysis.difficulty_to_recreate && (
            <span className={`inline-block ml-2 px-3 py-1 text-xs rounded-full font-medium ${
              analysis.difficulty_to_recreate === 'easy' ? 'bg-green-100 text-green-800' :
              analysis.difficulty_to_recreate === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              analysis.difficulty_to_recreate === 'hard' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              Svårighetsgrad: {analysis.difficulty_to_recreate}
            </span>
          )}
        </div>
      </div>

      {/* Style Tags */}
      {analysis.style_tags && <StyleTags tags={analysis.style_tags} />}

      {/* Generation prompt - the main output */}
      <GenerationPromptCard
        prompt={analysis.generation_prompt}
        negative={analysis.negative_prompt}
      />

      {/* Tips */}
      {analysis.tips && analysis.tips.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-semibold text-sm text-amber-800 mb-2">💡 Tips för bästa resultat</h4>
          <ul className="space-y-1">
            {analysis.tips.map((tip, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full JSON Prompt - collapsible */}
      <PromptViewer data={analysis.nano_banano_prompt || analysis} label="Fullständig Nano Banano Pro JSON-prompt" />
    </div>
  )
}

// ─── Drop Zone Component ────────────────────────────────────────────────────
function ImageDropZone({ onImage, analyzing }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      onImage(e.target.result, file)
    }
    reader.readAsDataURL(file)
  }, [onImage])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        handleFile(file)
        break
      }
    }
  }, [handleFile])

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const clearPreview = () => {
    setPreview(null)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !analyzing && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver
            ? 'border-brand-primary bg-brand-light/50 scale-[1.01]'
            : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
          }
          ${analyzing ? 'opacity-60 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img src={preview} alt="Preview" className="max-h-48 rounded-xl border shadow-sm" />
              {!analyzing && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearPreview() }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {analyzing ? (
              <div className="flex items-center gap-2 text-brand-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Analyserar bild...</span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Klicka eller dra en ny bild för att byta</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Dra & släpp en bild här</p>
              <p className="text-sm text-gray-500 mt-1">eller klicka för att välja fil</p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clipboard className="w-3 h-3" />
                Ctrl+V för att klistra in skärmdump
              </div>
              <div className="text-xs text-gray-400">PNG, JPG, WEBP</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Etsy Bestseller Grid ───────────────────────────────────────────────────
function BestsellerGrid({ results, onAnalyze, analyzingId }) {
  if (!results || results.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-500" />
        Sökresultat ({results.length} produkter)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((item, idx) => (
          <div
            key={item.listing_id || idx}
            className="border rounded-xl overflow-hidden bg-white hover:shadow-lg transition-shadow group"
          >
            {/* Image */}
            {item.images?.[0]?.url_570xN && (
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                  src={item.images[0].url_570xN}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Overlay button */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => onAnalyze(item)}
                    disabled={analyzingId === item.listing_id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-white text-brand-primary rounded-xl font-semibold text-sm shadow-lg hover:bg-brand-primary hover:text-white disabled:opacity-50 flex items-center gap-2"
                  >
                    {analyzingId === item.listing_id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyserar...</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Analysera</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-3 space-y-2">
              <h4 className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">
                {item.title}
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand-primary">
                  {item.price} {item.currency}
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {item.num_favorers > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {item.num_favorers}
                    </span>
                  )}
                  {item.views > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views}
                    </span>
                  )}
                </div>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-brand-primary flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Visa på Etsy
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MockupAnalyzerPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [analysisError, setAnalysisError] = useState('')
  const [analysisImageUrl, setAnalysisImageUrl] = useState(null)
  const [analysisImagePreview, setAnalysisImagePreview] = useState(null)

  // History
  const [history, setHistory] = useState([])

  // ── Search Etsy ──
  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    setSearchError('')
    setSearchResults([])

    try {
      const data = await api.searchBestsellers(searchQuery.trim(), { limit: 24 })
      setSearchResults(data.results || [])
      if ((data.results || []).length === 0) {
        setSearchError('Inga resultat hittades. Prova ett annat sökord.')
      }
    } catch (err) {
      setSearchError(err.message || 'Sökningen misslyckades')
    } finally {
      setSearching(false)
    }
  }

  // ── Analyze from Etsy result ──
  const handleAnalyzeFromEtsy = async (item) => {
    const imageUrl = item.images?.[0]?.url_570xN
    if (!imageUrl) return

    setAnalyzingId(item.listing_id)
    setAnalyzing(true)
    setAnalysisError('')
    setAnalysisResult(null)
    setAnalysisImageUrl(imageUrl)
    setAnalysisImagePreview(null)

    try {
      const data = await api.analyzeImageUrl(imageUrl, item.title)
      setAnalysisResult(data)
      setHistory(prev => [{
        timestamp: new Date().toISOString(),
        title: item.title,
        imageUrl,
        result: data
      }, ...prev].slice(0, 20))
    } catch (err) {
      setAnalysisError(err.message || 'Analysen misslyckades')
    } finally {
      setAnalyzing(false)
      setAnalyzingId(null)
    }
  }

  // ── Analyze from upload/paste ──
  const handleAnalyzeFromUpload = async (dataUrl, file) => {
    setAnalyzing(true)
    setAnalysisError('')
    setAnalysisResult(null)
    setAnalysisImageUrl(null)
    setAnalysisImagePreview(dataUrl)

    try {
      const data = await api.analyzeImageUpload(dataUrl, file?.name || 'uploaded image')
      setAnalysisResult(data)
      setHistory(prev => [{
        timestamp: new Date().toISOString(),
        title: file?.name || 'Uppladdad bild',
        imageUrl: dataUrl,
        result: data
      }, ...prev].slice(0, 20))
    } catch (err) {
      setAnalysisError(err.message || 'Analysen misslyckades')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Load from history ──
  const loadFromHistory = (entry) => {
    setAnalysisResult(entry.result)
    setAnalysisImageUrl(entry.imageUrl)
    setAnalysisImagePreview(null)
    setAnalysisError('')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-brand-primary" />
          Mockup Analyzer
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Analysera bästsäljande Etsy-produktbilder eller ladda upp egna bilder för att generera
          professionella JSON-prompts för <strong>Nano Banano Pro</strong>.
        </p>
      </div>

      {/* Two-column layout: Search + Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Etsy Search */}
        <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Search className="w-5 h-5 text-brand-primary" />
            Sök Etsy-bästsäljare
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="t.ex. 't-shirt mockup', 'mug mockup', 'poster frame'..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-sm"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-medium text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Sök
            </button>
          </form>

          {/* Quick search suggestions */}
          <div className="flex flex-wrap gap-2">
            {['t-shirt mockup', 'mug mockup', 'poster frame mockup', 'tote bag mockup', 'phone case mockup', 'pillow mockup'].map(q => (
              <button
                key={q}
                onClick={() => { setSearchQuery(q); }}
                className="px-3 py-1 bg-gray-100 hover:bg-brand-light text-gray-700 hover:text-brand-primary text-xs rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {searchError && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{searchError}</div>
          )}
        </div>

        {/* Right: Upload / Paste */}
        <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand-primary" />
            Ladda upp eller klistra in bild
          </h2>
          <ImageDropZone onImage={handleAnalyzeFromUpload} analyzing={analyzing} />
        </div>
      </div>

      {/* Bestseller search results */}
      {searchResults.length > 0 && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <BestsellerGrid
            results={searchResults}
            onAnalyze={handleAnalyzeFromEtsy}
            analyzingId={analyzingId}
          />
        </div>
      )}

      {/* Analysis progress */}
      {analyzing && !analysisResult && (
        <div className="bg-white border rounded-2xl p-8 shadow-sm text-center">
          <Loader2 className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
          <p className="mt-4 text-gray-700 font-medium">Analyserar bild med AI...</p>
          <p className="text-sm text-gray-500 mt-1">
            Identifierar komposition, ljussättning, stil och skapar din Nano Banano Pro prompt
          </p>
        </div>
      )}

      {/* Analysis error */}
      {analysisError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          <p className="font-medium">Analys misslyckades</p>
          <p className="text-sm mt-1">{analysisError}</p>
        </div>
      )}

      {/* Analysis result */}
      {analysisResult && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <AnalysisResult
            result={analysisResult}
            imageUrl={analysisImageUrl}
            imagePreview={analysisImagePreview}
          />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-gray-500" />
            Analyshistorik ({history.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {history.map((entry, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(entry)}
                className="group relative aspect-square rounded-xl overflow-hidden border hover:border-brand-primary hover:shadow-md transition-all"
              >
                <img
                  src={entry.imageUrl}
                  alt={entry.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                  <span className="w-full px-2 py-1.5 bg-black/60 text-white text-[10px] text-center truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {entry.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
