import { useState } from 'react'
import { Store, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Check for error in URL params
  useState(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      const errorMessages = {
        'missing_params': 'Inloggning avbruten - försök igen',
        'invalid_state': 'Ogiltigt tillstånd - försök igen',
        'no_shop': 'Du måste ha en Etsy-butik för att använda appen',
        'auth_failed': 'Autentiseringen misslyckades - försök igen'
      }
      setError(errorMessages[errorParam] || errorParam)
    }
  }, [])

  const handleLoginWithEtsy = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const authUrl = await api.loginWithEtsy()
      window.location.href = authUrl
    } catch (err) {
      setError(err.message || 'Kunde inte ansluta till Etsy')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-etsy-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            List-And-Go
          </h1>
          <p className="text-gray-500">
            Massuppladdning för Etsy
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLoginWithEtsy}
          disabled={loading}
          className="w-full py-4 bg-etsy-orange hover:bg-orange-600 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Ansluter till Etsy...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.559 3C6.226 3 4.5 5.226 4.5 8.559v6.882c0 3.333 1.726 5.559 4.059 5.559h6.882c3.333 0 5.559-1.726 5.559-4.059v-.882c0-.691-.559-1.25-1.25-1.25s-1.25.559-1.25 1.25v.882c0 .833-.676 1.559-3.059 1.559H8.559c-.833 0-1.559-.676-1.559-3.059V8.559c0-.833.676-1.559 3.059-1.559h6.882c.691 0 1.25-.559 1.25-1.25S17.632 4.5 16.941 4.5H8.559C5.226 4.5 3 6.726 3 10.059v6.882C3 20.274 5.226 22.5 8.559 22.5h6.882c3.333 0 5.559-2.226 5.559-5.559v-6.882C21 6.726 18.774 4.5 15.441 4.5"/>
              </svg>
              Logga in med Etsy
            </>
          )}
        </button>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Du kommer att dirigeras till Etsy för att auktorisera appen.
            <br />
            <span className="text-xs text-gray-400 mt-1 block">
              Din Etsy-butik används som inloggning.
            </span>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-gray-400">
            The term 'Etsy' is a trademark of Etsy, Inc.
            <br />
            This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
          </p>
        </div>
      </div>
    </div>
  )
}
