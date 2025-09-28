// Enhanced API types for better CMV tracking
import { DailyKPI, api } from './api'
import { supabase } from '@/lib/supabase'

export interface EnhancedDailyKPI extends DailyKPI {
  // Original daily data
  actual_purchases?: number  // What was actually purchased this day
  
  // Rolling average data (more accurate)
  rolling_cmv_percentage: number  // 30-day rolling average
  rolling_period_days: number  // Number of days in the rolling period
  
  // Theoretical values based on rolling average
  theoretical_food_cost: number  // What the food cost should be based on sales
  
  // Indicators
  is_purchase_day: boolean  // True if purchases were made this day
  cmv_variance?: number  // Difference between actual and theoretical
}

// Add this to the api object in api.ts:
export const enhancedApi = {
  // Get daily KPI with rolling CMV calculation
  getDailyKPIWithRolling: async (
    ownerId: string, 
    date: string,
    rollingDays: number = 30
  ): Promise<EnhancedDailyKPI | null> => {
    // First get the regular daily KPI
    const basicKPI = await api.getDailyKPI(ownerId, date)
    
    if (!basicKPI) return null
    
    // Get rolling CMV data
    const { data: rollingData, error } = await supabase
      .rpc('get_rolling_cmv', {
        p_owner_id: ownerId,
        p_date: date,
        p_days: rollingDays
      })
    
    if (error) {
      console.error('Error fetching rolling CMV:', error)
      return basicKPI as EnhancedDailyKPI
    }
    
    const rolling = rollingData?.[0]
    
    return {
      ...basicKPI,
      actual_purchases: rolling?.daily_purchases || 0,
      rolling_cmv_percentage: rolling?.rolling_cmv_percentage || basicKPI.food_cost_percentage,
      rolling_period_days: rollingDays,
      theoretical_food_cost: rolling?.theoretical_daily_food_cost || basicKPI.food_cost,
      is_purchase_day: (rolling?.daily_purchases || 0) > 0,
      cmv_variance: rolling ? 
        (rolling.daily_purchases - rolling.theoretical_daily_food_cost) : 
        undefined
    }
  },
  
  // Get CMV trend over time
  getCMVTrend: async (
    ownerId: string,
    endDate: string,
    days: number = 30
  ) => {
    const dates = []
    const currentDate = new Date(endDate)
    
    for (let i = 0; i < days; i++) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    const promises = dates.map(date => 
      supabase.rpc('get_rolling_cmv', {
        p_owner_id: ownerId,
        p_date: date,
        p_days: 30
      })
    )
    
    const results = await Promise.all(promises)
    
    return dates.map((date, index) => ({
      date,
      rolling_cmv: results[index].data?.[0]?.rolling_cmv_percentage || 0
    })).reverse()
  }
}
