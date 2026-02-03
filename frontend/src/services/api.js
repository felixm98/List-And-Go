/**
 * API Service for Etsy Bulk Uploader
 * Handles all communication with the backend
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

class ApiService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken')
    this.refreshToken = localStorage.getItem('refreshToken')
  }

  // ============== Auth ==============

  setTokens(access, refresh) {
    this.accessToken = access
    this.refreshToken = refresh
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  }

  clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  isAuthenticated() {
    return !!this.accessToken
  }

  async getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    }

    if (includeAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    return headers
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const headers = await this.getHeaders(options.auth !== false)

    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)

      // Handle 401 - try to refresh token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`
          return fetch(url, config).then(r => r.json())
        } else {
          this.clearTokens()
          window.location.href = '/login'
          throw new Error('Session expired')
        }
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      return data
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.refreshToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        this.accessToken = data.access_token
        localStorage.setItem('accessToken', data.access_token)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Auth endpoints
  async register(email, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false
    })
    this.setTokens(data.access_token, data.refresh_token)
    return data
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false
    })
    this.setTokens(data.access_token, data.refresh_token)
    return data
  }

  async logout() {
    this.clearTokens()
  }

  async getCurrentUser() {
    return this.request('/api/auth/me')
  }

  // ============== Templates ==============
  async getTemplates() {
    return this.request('/api/templates')
  }

  async createTemplate(template) {
    return this.request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template)
    })
  }

  async deleteTemplate(templateId) {
    return this.request(`/api/templates/${templateId}`, {
      method: 'DELETE'
    })
  }

  // ============== Settings ==============
  async getSettings() {
    return this.request('/api/settings')
  }

  async saveSettings(settings) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    })
  }

  // ============== AI Generation ==============
  async generateContent(imageFile, folderName, imageCount, categoryHint) {
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('folder_name', folderName || '')
    formData.append('image_count', imageCount || 1)
    formData.append('category_hint', categoryHint || '')

    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Generation failed')
    }

    return response.json()
  }

  async regenerateField(imageFile, field, currentContent, instruction) {
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('field', field)
    formData.append('current_content', JSON.stringify(currentContent))
    formData.append('instruction', instruction || '')

    const response = await fetch(`${API_BASE}/api/regenerate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Regeneration failed')
    }

    return response.json()
  }

  async getSeoScore(title, description, tags) {
    return this.request('/api/seo-score', {
      method: 'POST',
      body: JSON.stringify({ title, description, tags })
    })
  }

  // ============== Etsy Connection ==============
  async getEtsyStatus() {
    return this.request('/api/etsy/status')
  }

  async connectEtsy() {
    const data = await this.request('/api/etsy/connect')
    return data.auth_url
  }

  async disconnectEtsy() {
    return this.request('/api/etsy/disconnect', { method: 'POST' })
  }

  async getShippingProfiles() {
    return this.request('/api/etsy/shipping-profiles')
  }

  async getCategories() {
    return this.request('/api/etsy/categories', { auth: false })
  }

  // ============== Uploads ==============
  async getUploads() {
    return this.request('/api/uploads')
  }

  async createUpload(title, listings, scheduledFor) {
    return this.request('/api/uploads', {
      method: 'POST',
      body: JSON.stringify({
        title,
        listings,
        scheduled_for: scheduledFor?.toISOString()
      })
    })
  }

  async publishUpload(uploadId) {
    return this.request(`/api/uploads/${uploadId}/publish`, {
      method: 'POST'
    })
  }

  async scheduleUpload(uploadId, scheduledFor) {
    return this.request(`/api/uploads/${uploadId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_for: scheduledFor.toISOString() })
    })
  }

  async cancelUpload(uploadId) {
    return this.request(`/api/uploads/${uploadId}/cancel`, {
      method: 'POST'
    })
  }

  async deleteUpload(uploadId) {
    return this.request(`/api/uploads/${uploadId}`, {
      method: 'DELETE'
    })
  }

  // ============== Health ==============
  async healthCheck() {
    return this.request('/api/health', { auth: false })
  }
}

// Export singleton instance
export const api = new ApiService()
export default api
