import Dashboard from '../components/Dashboard'

function DashboardPage({ uploads }) {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Överblick över dina uppladdningar och schemalagda publiceringar.
        </p>
      </div>
      
      {/* Dashboard Component */}
      <Dashboard uploads={uploads} />
    </div>
  )
}

export default DashboardPage
