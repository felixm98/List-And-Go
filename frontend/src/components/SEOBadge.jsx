import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function SEOBadge({ score }) {
  let colorClass, Icon, label
  
  if (score >= 80) {
    colorClass = 'seo-excellent'
    Icon = TrendingUp
    label = 'Excellent'
  } else if (score >= 60) {
    colorClass = 'seo-good'
    Icon = Minus
    label = 'Good'
  } else {
    colorClass = 'seo-poor'
    Icon = TrendingDown
    label = 'Improve'
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{score}</span>
      <span className="hidden sm:inline">- {label}</span>
    </div>
  )
}

export default SEOBadge
