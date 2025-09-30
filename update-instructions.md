// Update instructions for CalendarView.tsx and WeekView.tsx

// In CalendarView.tsx, replace the KPI fetching logic:

// OLD:
promises.push(
  api.getDailyKPI(ownerId, dateStr).then(kpi => {
    if (kpi) monthData[dateStr] = kpi
  })
)

// NEW:
promises.push(
  api.getDailyKPIEnhanced(ownerId, dateStr, 30).then(kpi => {
    if (kpi) monthData[dateStr] = kpi
  })
)

// And update the display section:

// OLD:
<span className={`text-xs px-1 py-0.5 rounded ${
  kpi.food_cost_percentage > 35 ? 'bg-red-100 text-red-700' : 
  kpi.food_cost_percentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
  'bg-green-100 text-green-700'
}`}>
  {kpi.food_cost_percentage.toFixed(1)}%
</span>

// NEW:
<span className={`text-xs px-1 py-0.5 rounded ${
  kpi.rolling_cmv_percentage > 35 ? 'bg-red-100 text-red-700' : 
  kpi.rolling_cmv_percentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
  'bg-green-100 text-green-700'
}`}>
  {kpi.is_purchase_day && '📦'}
  {kpi.rolling_cmv_percentage.toFixed(1)}%
</span>
