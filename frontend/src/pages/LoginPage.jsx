import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Loader2, AlertCircle, ChevronDown, ChevronUp, Upload, Clock, CheckCircle, Eye, Rocket, Package } from 'lucide-react'
import { api } from '../services/api'

export default function LoginPage({ onEnterDemo }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const navigate = useNavigate()

  // Check for error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      const errorMessages = {
        'missing_params': 'Login cancelled - please try again',
        'invalid_state': 'Invalid state - please try again',
        'no_shop': 'You need an Etsy shop to use this app',
        'auth_failed': 'Authentication failed - please try again'
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
      setError(err.message || 'Could not connect to Etsy')
      setLoading(false)
    }
  }

  const handleEnterDemo = () => {
    if (onEnterDemo) {
      onEnterDemo()
    }
    navigate('/')
  }

  const steps = [
    {
      icon: Package,
      title: 'Create a preset',
      description: 'Set up price, category, shipping and more once. Reuse for all future listings.'
    },
    {
      icon: Upload,
      title: 'Upload folders',
      description: 'Drag and drop folders with product images. Select a preset to apply settings automatically.'
    },
    {
      icon: Clock,
      title: 'Schedule or publish',
      description: 'Choose to publish immediately or schedule for optimal timing.'
    },
    {
      icon: CheckCircle,
      title: 'Done!',
      description: 'Your listings are automatically created on Etsy as drafts or published.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-white to-slate-100">
      <div className="container mx-auto px-4 py-8 flex flex-col items-center">
        
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mb-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              List-And-Go
            </h1>
            <p className="text-gray-500">
              Bulk Upload for Etsy
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
            className="w-full py-4 bg-brand-primary hover:bg-brand-dark text-white rounded-xl font-semibold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting to Etsy...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.559 3C6.226 3 4.5 5.226 4.5 8.559v6.882c0 3.333 1.726 5.559 4.059 5.559h6.882c3.333 0 5.559-1.726 5.559-4.059v-.882c0-.691-.559-1.25-1.25-1.25s-1.25.559-1.25 1.25v.882c0 .833-.676 1.559-3.059 1.559H8.559c-.833 0-1.559-.676-1.559-3.059V8.559c0-.833.676-1.559 3.059-1.559h6.882c.691 0 1.25-.559 1.25-1.25S17.632 4.5 16.941 4.5H8.559C5.226 4.5 3 6.726 3 10.059v6.882C3 20.274 5.226 22.5 8.559 22.5h6.882c3.333 0 5.559-2.226 5.559-5.559v-6.882C21 6.726 18.774 4.5 15.441 4.5"/>
                </svg>
                Login with Etsy
              </>
            )}
          </button>

          {/* Info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              You will be redirected to Etsy to authorize the app.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Demo Button */}
          <button
            onClick={handleEnterDemo}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Explore the app without logging in
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            View the interface and features in demo mode
          </p>
        </div>

        {/* How It Works - Expandable */}
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl overflow-hidden">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center">
                <Rocket className="w-5 h-5 text-brand-primary" />
              </div>
              <span className="text-lg font-semibold text-gray-900">How does it work?</span>
            </div>
            {showHowItWorks ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Expandable Content */}
          <div className={`overflow-hidden transition-all duration-300 ${showHowItWorks ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-6 pb-6 pt-2">
              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                        index === steps.length - 1 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-brand-light text-brand-primary'
                      }`}>
                        <step.icon className="w-6 h-6" />
                      </div>
                      {index < steps.length - 1 && (
                        <div className="absolute left-1/2 top-12 w-0.5 h-4 bg-brand-primary/20 -translate-x-1/2"></div>
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Features highlight */}
              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <h4 className="font-medium text-purple-900 mb-1">📋 Listing Presets</h4>
                  <p className="text-xs text-purple-700">Save and reuse settings for different product types</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <h4 className="font-medium text-blue-900 mb-1">📁 Bulk Upload</h4>
                  <p className="text-xs text-blue-700">Upload hundreds of products in minutes</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <h4 className="font-medium text-green-900 mb-1">⏰ Scheduling</h4>
                  <p className="text-xs text-green-700">Publish at optimal times</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                  <h4 className="font-medium text-amber-900 mb-1">📝 Templates</h4>
                  <p className="text-xs text-amber-700">Reusable description templates with variables</p>
                </div>
                <div className="col-span-2 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4">
                  <h4 className="font-medium text-teal-900 mb-1">⚡ Reusable Presets</h4>
                  <p className="text-xs text-teal-700">Save your settings once and apply them to all listings automatically</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-sm">
            <a href="/privacy" className="text-brand-primary hover:text-brand-dark hover:underline">
              Privacy Policy
            </a>
            <span className="text-gray-300">|</span>
            <a href="/terms" className="text-brand-primary hover:text-brand-dark hover:underline">
              Terms of Service
            </a>
          </div>
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
