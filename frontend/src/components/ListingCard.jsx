import { useState } from 'react'
import { X, Edit2, Trash2, ChevronDown, ChevronUp, Sparkles, Tag, Palette, Gift, Calendar, Heart } from 'lucide-react'
import SEOBadge from './SEOBadge'

function ListingCard({ listing, onUpdate, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: listing.title,
    description: listing.description,
    tags: listing.tags,
    price: listing.price || '',
    styles: listing.styles || [],
    listing_attributes: listing.listing_attributes || {}
  })
  const [newTag, setNewTag] = useState('')
  
  const handleSave = () => {
    onUpdate(listing.id, editData)
    setIsEditing(false)
  }
  
  const handleCancel = () => {
    setEditData({
      title: listing.title,
      description: listing.description,
      tags: listing.tags,
      price: listing.price || '',
      styles: listing.styles || [],
      listing_attributes: listing.listing_attributes || {}
    })
    setIsEditing(false)
  }
  
  const updateAttribute = (key, value) => {
    setEditData(d => ({
      ...d,
      listing_attributes: {
        ...d.listing_attributes,
        [key]: value || null
      }
    }))
  }
  
  const addTag = () => {
    if (newTag.trim() && editData.tags.length < 13) {
      setEditData(d => ({ ...d, tags: [...d.tags, newTag.trim()] }))
      setNewTag('')
    }
  }
  
  const removeTag = (index) => {
    setEditData(d => ({ ...d, tags: d.tags.filter((_, i) => i !== index) }))
  }
  
  const primaryImage = listing.images[0]
  
  return (
    <div className="listing-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      {/* Image Gallery */}
      <div className="relative">
        <div className="aspect-square bg-gray-100">
          {primaryImage && (
            <img
              src={primaryImage.preview}
              alt={listing.folderName}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Image count badge */}
        {listing.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
            +{listing.images.length - 1} images
          </div>
        )}
        
        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => onRemove(listing.id)}
            className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
        
        {/* SEO Badge */}
        <div className="absolute top-2 left-2">
          <SEOBadge score={listing.seoScore} />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData(d => ({ ...d, title: e.target.value }))}
                maxLength={140}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">{editData.title.length}/140 characters</p>
            </div>
            
            {/* Price */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price (USD)</label>
              <input
                type="number"
                value={editData.price}
                onChange={(e) => setEditData(d => ({ ...d, price: e.target.value }))}
                placeholder="49"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tags ({editData.tags.length}/13)
              </label>
              <div className="flex flex-wrap gap-1 mt-2">
                {editData.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button onClick={() => removeTag(index)} className="tag-remove">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {editData.tags.length < 13 && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            
            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))}
                rows={4}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>
            
            {/* Listing Attributes Section */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Etsy Attributes (Holiday, Occasion, etc.)
              </h4>
              <p className="text-xs text-gray-400 mb-3">
                These sync to Etsy as listing properties
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Holiday */}
                <div>
                  <label className="text-xs text-gray-500">Holiday</label>
                  <input
                    type="text"
                    value={editData.listing_attributes?.holiday || ''}
                    onChange={(e) => updateAttribute('holiday', e.target.value)}
                    placeholder="e.g. Christmas, Valentine's Day"
                    className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                
                {/* Occasion */}
                <div>
                  <label className="text-xs text-gray-500">Occasion</label>
                  <input
                    type="text"
                    value={editData.listing_attributes?.occasion || ''}
                    onChange={(e) => updateAttribute('occasion', e.target.value)}
                    placeholder="t.ex. Birthday, Wedding"
                    className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                
                {/* Recipient */}
                <div>
                  <label className="text-xs text-gray-500">Recipient</label>
                  <input
                    type="text"
                    value={editData.listing_attributes?.recipient || ''}
                    onChange={(e) => updateAttribute('recipient', e.target.value)}
                    placeholder="t.ex. For Her, For Mom"
                    className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                
                {/* Subject */}
                <div>
                  <label className="text-xs text-gray-500">Subject</label>
                  <input
                    type="text"
                    value={editData.listing_attributes?.subject || ''}
                    onChange={(e) => updateAttribute('subject', e.target.value)}
                    placeholder="t.ex. Nature, Animals, Abstract"
                    className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                
                {/* Primary Color */}
                <div>
                  <label className="text-xs text-gray-500">Primary Color</label>
                  <input
                    type="text"
                    value={editData.listing_attributes?.primary_color || ''}
                    onChange={(e) => updateAttribute('primary_color', e.target.value)}
                    placeholder="t.ex. Black, White, Blue"
                    className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                
                {/* Mood/Feeling */}
                <div>
                  <label className="text-xs text-gray-500">Mood/Feeling</label>
                  <input
                    type="text"
                    value={editData.listing_attributes?.mood || ''}
                    onChange={(e) => updateAttribute('mood', e.target.value)}
                    placeholder="t.ex. Joyful, Calm, Romantic"
                    className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Edit Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-3 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <>
            {/* Folder name */}
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{listing.folderName}</p>
            
            {/* Title */}
            <h3 className="font-medium text-gray-800 line-clamp-2 mb-2">{listing.title}</h3>
            
            {/* Price */}
            {listing.price && (
              <p className="text-lg font-semibold text-brand-primary mb-2">{listing.price} kr</p>
            )}
            
            {/* Tags preview */}
            <div className="flex flex-wrap gap-1 mb-3">
              {listing.tags.slice(0, 4).map((tag, index) => (
                <span key={index} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {tag}
                </span>
              ))}
              {listing.tags.length > 4 && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  +{listing.tags.length - 4}
                </span>
              )}
            </div>
            
            {/* Expand/Collapse Description */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-brand-primary hover:text-brand-dark"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide description
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show description
                </>
              )}
            </button>
            
            {isExpanded && (
              <div className="mt-3 space-y-3">
                {/* Description */}
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-line">
                  {listing.description}
                </div>
                
                {/* Listing Attributes Display */}
                {listing.listing_attributes && Object.keys(listing.listing_attributes).some(k => listing.listing_attributes[k]) && (
                  <div className="p-3 bg-rose-50 rounded-lg">
                    <h4 className="text-xs font-medium text-rose-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Etsy-attribut
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {listing.listing_attributes.holiday && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded-full border border-rose-200">
                          <Calendar className="w-3 h-3 text-rose-500" />
                          {listing.listing_attributes.holiday}
                        </span>
                      )}
                      {listing.listing_attributes.occasion && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded-full border border-rose-200">
                          <Gift className="w-3 h-3 text-rose-500" />
                          {listing.listing_attributes.occasion}
                        </span>
                      )}
                      {listing.listing_attributes.recipient && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded-full border border-rose-200">
                          <Heart className="w-3 h-3 text-rose-500" />
                          {listing.listing_attributes.recipient}
                        </span>
                      )}
                      {listing.listing_attributes.subject && (
                        <span className="text-xs px-2 py-1 bg-white rounded-full border border-rose-200">
                          📌 {listing.listing_attributes.subject}
                        </span>
                      )}
                      {listing.listing_attributes.primary_color && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded-full border border-rose-200">
                          <Palette className="w-3 h-3 text-rose-500" />
                          {listing.listing_attributes.primary_color}
                        </span>
                      )}
                      {listing.listing_attributes.mood && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded-full border border-rose-200">
                          <Sparkles className="w-3 h-3 text-rose-500" />
                          {listing.listing_attributes.mood}
                        </span>
                      )}
                      {listing.listing_attributes.style && Array.isArray(listing.listing_attributes.style) && listing.listing_attributes.style.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white rounded-full border border-rose-200">
                          🎨 {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ListingCard
