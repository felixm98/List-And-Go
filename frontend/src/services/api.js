/**
 * API Service for List-And-Go
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

  // ============== Etsy OAuth Login ==============
  async loginWithEtsy() {
    const response = await fetch(`${API_BASE}/api/etsy/login`)
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Could not start login')
    }
    
    return data.auth_url
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // Ignore errors during logout
    }
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

  // ============== Etsy Connection ==============
  async getEtsyStatus() {
    return this.request('/api/etsy/status')
  }

  // connectEtsy is now loginWithEtsy - kept for backwards compatibility in settings
  async connectEtsy() {
    return this.loginWithEtsy()
  }

  async disconnectEtsy() {
    return this.request('/api/etsy/disconnect', { method: 'POST' })
  }

  async getShippingProfiles() {
    return this.request('/api/etsy/shipping-profiles')
  }

  async getReturnPolicies() {
    return this.request('/api/etsy/return-policies')
  }

  async getCategories() {
    return this.request('/api/etsy/categories', { auth: false })
  }

  async getCategoryProperties(taxonomyId) {
    return this.request(`/api/etsy/categories/${taxonomyId}/properties`, { auth: false })
  }

  async getShopSections() {
    return this.request('/api/etsy/shop-sections')
  }

  // ============== Listing Presets ==============
  async getPresets() {
    return this.request('/api/presets')
  }

  async getPreset(presetId) {
    return this.request(`/api/presets/${presetId}`)
  }

  async createPreset(preset) {
    return this.request('/api/presets', {
      method: 'POST',
      body: JSON.stringify(preset)
    })
  }

  async updatePreset(presetId, preset) {
    return this.request(`/api/presets/${presetId}`, {
      method: 'PUT',
      body: JSON.stringify(preset)
    })
  }

  async deletePreset(presetId) {
    return this.request(`/api/presets/${presetId}`, {
      method: 'DELETE'
    })
  }

  // ============== Description Templates ==============
  async getDescriptionTemplates() {
    return this.request('/api/description-templates')
  }

  async getDescriptionTemplate(templateId) {
    return this.request(`/api/description-templates/${templateId}`)
  }

  async createDescriptionTemplate(template) {
    return this.request('/api/description-templates', {
      method: 'POST',
      body: JSON.stringify(template)
    })
  }

  async updateDescriptionTemplate(templateId, template) {
    return this.request(`/api/description-templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(template)
    })
  }

  async deleteDescriptionTemplate(templateId) {
    return this.request(`/api/description-templates/${templateId}`, {
      method: 'DELETE'
    })
  }

  async previewDescriptionTemplate(templateId, variables) {
    return this.request(`/api/description-templates/${templateId}/preview`, {
      method: 'POST',
      body: JSON.stringify({ variables })
    })
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

  async uploadVideoToListing(uploadId, listingId, videoFile) {
    const formData = new FormData()
    formData.append('video', videoFile)

    const response = await fetch(`${API_BASE}/api/uploads/${uploadId}/listings/${listingId}/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Video upload failed')
    }

    return response.json()
  }

  async uploadImageToListing(uploadId, listingId, imageFile, rank = 1, altText = '') {
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('rank', rank)
    if (altText) {
      formData.append('alt_text', altText)
    }

    const response = await fetch(`${API_BASE}/api/uploads/${uploadId}/listings/${listingId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Image upload failed')
    }

    return response.json()
  }

  // ============== Listing Manager ==============
  
  /**
   * Sync listings from Etsy to local cache
   * @param {string[]} states - States to sync (active, draft, expired, inactive, sold_out)
   */
  async syncShopListings(states = null) {
    return this.request('/api/shop/sync', {
      method: 'POST',
      body: JSON.stringify({ states })
    })
  }

  /**
   * Get cached listings with pagination
   * @param {Object} params - Query parameters
   */
  async getShopListings(params = {}) {
    const query = new URLSearchParams({
      state: params.state || 'active',
      page: params.page || 1,
      per_page: params.perPage || 25,
      ...(params.search && { search: params.search }),
      ...(params.sortBy && { sort_by: params.sortBy }),
      ...(params.sortOrder && { sort_order: params.sortOrder })
    })
    return this.request(`/api/shop/listings?${query}`)
  }

  /**
   * Get a single listing with full details
   * @param {string} listingId - Etsy listing ID
   */
  async getShopListing(listingId) {
    return this.request(`/api/shop/listings/${listingId}`)
  }

  /**
   * Update a single listing
   * @param {string} listingId - Etsy listing ID
   * @param {Object} updates - Fields to update (title, description, tags, price, quantity)
   */
  async updateShopListing(listingId, updates) {
    return this.request(`/api/shop/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  /**
   * Bulk update multiple listings
   * @param {string[]} listingIds - Array of listing IDs
   * @param {Object} updates - Updates to apply (can be per-listing or global)
   */
  async bulkUpdateListings(listingIds, updates) {
    return this.request('/api/shop/listings/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ listing_ids: listingIds, updates })
    })
  }

  /**
   * Upload an image to a listing
   * @param {string} listingId - Etsy listing ID
   * @param {File} imageFile - Image file
   * @param {number} rank - Position/rank of the image (1-10)
   */
  async uploadListingImage(listingId, imageFile, rank = 1) {
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('rank', rank)

    const response = await fetch(`${API_BASE}/api/shop/listings/${listingId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Image upload failed')
    }

    return response.json()
  }

  /**
   * Delete an image from a listing
   * @param {string} listingId - Etsy listing ID
   * @param {string} imageId - Image ID to delete
   */
  async deleteListingImage(listingId, imageId) {
    return this.request(`/api/shop/listings/${listingId}/images/${imageId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Reorder images for a listing
   * @param {string} listingId - Etsy listing ID
   * @param {string[]} imageIds - Image IDs in new order
   */
  async reorderListingImages(listingId, imageIds) {
    return this.request(`/api/shop/listings/${listingId}/images/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ image_ids: imageIds })
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
