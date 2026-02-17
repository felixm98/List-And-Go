import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../services/api'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const shopName = params.get('shop_name')

    if (accessToken && refreshToken) {
      // Save tokens
      api.setTokens(accessToken, refreshToken)
      
      // Store shop name for display
      if (shopName) {
        localStorage.setItem('shopName', shopName)
      }
      
      // Redirect to main app
      navigate('/', { replace: true })
    } else {
      // No tokens, redirect to login
      navigate('/login?error=auth_failed', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Logging in...
        </h2>
        <p className="text-gray-500">
          Please wait while we complete the login
        </p>
      </div>
    </div>
  )
}
