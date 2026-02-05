import { Clock, CheckCircle, AlertCircle, Upload, Calendar, ExternalLink } from 'lucide-react'

const STATUS_CONFIG = {
  draft: {
    icon: Upload,
    label: 'Draft',
    color: 'text-gray-600 bg-gray-100'
  },
  scheduled: {
    icon: Calendar,
    label: 'Scheduled',
    color: 'text-blue-600 bg-blue-100'
  },
  uploading: {
    icon: Clock,
    label: 'Uploading...',
    color: 'text-yellow-600 bg-yellow-100'
  },
  published: {
    icon: CheckCircle,
    label: 'Published',
    color: 'text-green-600 bg-green-100'
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    color: 'text-red-600 bg-red-100'
  }
}

function Dashboard({ uploads }) {
  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    )
  }
  
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (uploads.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No uploads yet</h3>
        <p className="text-gray-500">
          Your uploaded products will appear here.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800">{uploads.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-sm text-gray-500">Published</p>
          <p className="text-2xl font-bold text-green-600">
            {uploads.filter(u => u.status === 'published').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">
            {uploads.filter(u => u.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">
            {uploads.filter(u => u.status === 'failed').length}
          </p>
        </div>
      </div>
      
      {/* Upload List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">Upload History</h3>
        </div>
        
        <div className="divide-y">
          {uploads.map((upload) => (
            <div key={upload.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  {upload.thumbnail && (
                    <img
                      src={upload.thumbnail}
                      alt={upload.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-800">{upload.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">
                        {upload.imageCount} images
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(upload.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {getStatusBadge(upload.status)}
                  
                  {upload.etsyUrl && (
                    <a
                      href={upload.etsyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-brand-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              
              {/* Scheduled info */}
              {upload.status === 'scheduled' && upload.scheduledFor && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Publishes {formatDate(upload.scheduledFor)}
                </div>
              )}
              
              {/* Error info */}
              {upload.status === 'failed' && upload.error && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  {upload.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
