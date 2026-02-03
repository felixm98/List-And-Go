import { useState } from 'react'
import { X, Calendar, Clock, Zap } from 'lucide-react'

function SchedulePicker({ isOpen, onClose, onConfirm, listingCount }) {
  const [scheduleType, setScheduleType] = useState('now') // 'now' or 'scheduled'
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  
  if (!isOpen) return null
  
  const handleConfirm = () => {
    if (scheduleType === 'now') {
      onConfirm(null)
    } else {
      if (!date) {
        alert('Välj ett datum')
        return
      }
      const scheduledDate = new Date(`${date}T${time}`)
      onConfirm(scheduledDate)
    }
  }
  
  // Get min date (today)
  const today = new Date().toISOString().split('T')[0]
  
  // Suggested times for best visibility
  const suggestedTimes = [
    { time: '09:00', label: 'Morgon (09:00)', description: 'Bra för europeisk publik' },
    { time: '15:00', label: 'Eftermiddag (15:00)', description: 'USA vaknar' },
    { time: '18:00', label: 'Kväll (18:00)', description: 'Högtrafik, rekommenderad' },
    { time: '21:00', label: 'Sen kväll (21:00)', description: 'Bra för USA västkust' }
  ]
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Schemalägg publicering</h2>
              <p className="text-sm text-gray-500">{listingCount} produkter</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Schedule Type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setScheduleType('now')}
              className={`
                p-4 rounded-xl border-2 text-left transition-all
                ${scheduleType === 'now' 
                  ? 'border-etsy-orange bg-etsy-light' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Zap className={`w-5 h-5 mb-2 ${scheduleType === 'now' ? 'text-etsy-orange' : 'text-gray-400'}`} />
              <p className="font-medium text-gray-800">Ladda upp nu</p>
              <p className="text-xs text-gray-500 mt-1">Skapar drafts direkt</p>
            </button>
            
            <button
              onClick={() => setScheduleType('scheduled')}
              className={`
                p-4 rounded-xl border-2 text-left transition-all
                ${scheduleType === 'scheduled' 
                  ? 'border-etsy-orange bg-etsy-light' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Clock className={`w-5 h-5 mb-2 ${scheduleType === 'scheduled' ? 'text-etsy-orange' : 'text-gray-400'}`} />
              <p className="font-medium text-gray-800">Schemalägg</p>
              <p className="text-xs text-gray-500 mt-1">Välj datum & tid</p>
            </button>
          </div>
          
          {/* Date & Time Picker */}
          {scheduleType === 'scheduled' && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              {/* Date */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Datum</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={today}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
              
              {/* Time suggestions */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tid</label>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedTimes.map(({ time: t, label, description }) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={`
                        p-3 rounded-lg border text-left transition-all
                        ${time === t 
                          ? 'border-etsy-orange bg-etsy-light' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <p className="font-medium text-sm text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500">{description}</p>
                    </button>
                  ))}
                </div>
                
                {/* Custom time */}
                <div className="mt-3">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              {/* Preview */}
              {date && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Publiceras:</strong>{' '}
                    {new Date(`${date}T${time}`).toLocaleString('sv-SE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-etsy-orange text-white rounded-lg font-medium hover:bg-etsy-orange-dark transition-colors"
          >
            {scheduleType === 'now' ? 'Ladda upp nu' : 'Schemalägg'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SchedulePicker
