// Alternative compact calendar cell design using icons
// This can replace the current design if you prefer even more compact cells

const renderCompactCalendarCell = (day: number, kpi: EnhancedDailyKPI | undefined, isSelected: boolean, isToday: boolean, onDateSelect: () => void) => {
  return (
    <button
      key={day}
      onClick={onDateSelect}
      className={`
        h-20 p-1 border rounded-lg transition-all relative overflow-hidden
        ${isSelected 
          ? 'border-emerald-500 bg-emerald-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
        ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Day header with number and purchase indicator */}
        <div className="flex items-start justify-between">
          <span className="text-sm font-bold text-gray-900">{day}</span>
          {kpi?.is_purchase_day && (
            <span className="text-xs" title="Dia de compras">📦</span>
          )}
        </div>
        
        {kpi ? (
          <div className="flex-1 flex flex-col justify-end space-y-0.5">
            {/* Sales - abbreviated */}
            <div className="text-xs font-medium text-gray-700 truncate">
              R$ {(kpi.sales / 1000).toFixed(1)}k
            </div>
            
            {/* Compact KPI indicators */}
            <div className="flex items-center justify-between text-xs">
              {/* CMV indicator */}
              <div className="flex items-center gap-0.5">
                <div className={`w-2 h-2 rounded-full ${
                  kpi.rolling_cmv_percentage > 35 ? 'bg-red-500' : 
                  kpi.rolling_cmv_percentage > 30 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`} />
                <span className="font-medium text-gray-700">
                  {kpi.rolling_cmv_percentage.toFixed(0)}%
                </span>
              </div>
              
              {/* Labor indicator */}
              <div className="flex items-center gap-0.5">
                <div className={`w-2 h-2 rounded-full ${
                  kpi.labor_cost_percentage > 30 ? 'bg-red-500' : 
                  kpi.labor_cost_percentage > 25 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`} />
                <span className="font-medium text-gray-700">
                  {kpi.labor_cost_percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-gray-400">-</span>
          </div>
        )}
      </div>
    </button>
  )
}

// Ultra-compact version with just dots and no percentages
const renderUltraCompactCalendarCell = (day: number, kpi: EnhancedDailyKPI | undefined, isSelected: boolean, isToday: boolean, onDateSelect: () => void) => {
  return (
    <button
      key={day}
      onClick={onDateSelect}
      className={`
        h-16 p-1 border rounded-lg transition-all relative
        ${isSelected 
          ? 'border-emerald-500 bg-emerald-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
        ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
      `}
    >
      {/* Day number */}
      <div className="text-sm font-bold text-gray-900">{day}</div>
      
      {kpi && (
        <>
          {/* Sales amount */}
          <div className="text-xs text-gray-600 truncate">
            {(kpi.sales / 1000).toFixed(1)}k
          </div>
          
          {/* Status indicators */}
          <div className="flex justify-center gap-1 mt-1">
            {/* CMV dot */}
            <div 
              className={`w-2.5 h-2.5 rounded-full ${
                kpi.rolling_cmv_percentage > 35 ? 'bg-red-500' : 
                kpi.rolling_cmv_percentage > 30 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              title={`CMV: ${kpi.rolling_cmv_percentage.toFixed(1)}%`}
            />
            
            {/* Labor dot */}
            <div 
              className={`w-2.5 h-2.5 rounded-full ${
                kpi.labor_cost_percentage > 30 ? 'bg-red-500' : 
                kpi.labor_cost_percentage > 25 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              title={`M.O.: ${kpi.labor_cost_percentage.toFixed(1)}%`}
            />
            
            {/* Purchase indicator */}
            {kpi.is_purchase_day && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" 
                   title="Dia de compras" />
            )}
          </div>
        </>
      )}
    </button>
  )
}
