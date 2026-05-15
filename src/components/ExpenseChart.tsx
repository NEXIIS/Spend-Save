import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as ChartIcon } from 'lucide-react';
import { Transaction } from '../types';

// Let's define the category type so TypeScript is happy
export type UserCategory = {
  id: string;
  name: string;
  color: string;
};

interface ExpenseChartProps {
  transactions: Transaction[];
  categories?: UserCategory[]; // We added this so the chart knows about your custom colors!
}

// Fallback colors just in case a category gets deleted
const FALLBACK_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function ExpenseChart({ transactions, categories = [] }: ExpenseChartProps) {
  const chartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');

    const grouped = expenses.reduce((acc, curr) => {
      // 1. Find the matching category using the new category_id
      const categoryMatch = categories.find(c => c.id === curr.category_id);
      
      // 2. Determine the name and color (with air-tight fallbacks to the old system)
      const categoryName = categoryMatch?.name || 'Uncategorized';
      const categoryColor = categoryMatch?.color;

      const existing = acc.find(item => item.name === categoryName);
      const amount = Math.abs(curr.amount);

      if (existing) {
        existing.value += amount;
      } else {
        // Now saving the color into the chart data!
        acc.push({ name: categoryName, value: amount, color: categoryColor });
      }
      return acc;
    }, [] as { name: string; value: number; color?: string }[]);

    return grouped.sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <ChartIcon className="text-blue-400" size={20} />
        <h2 className="text-lg font-bold text-white">Spending by Category</h2>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  // Use the database color, or a fallback if it's missing
                  fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {chartData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-300">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
            />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}