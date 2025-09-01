import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatCurrency, formatDateShort } from '@/utils/formatters';

interface UsageData {
  created_at: string;
  total_cost_usd: number;
  endpoint: string;
}

interface UsageChartProps {
  data: UsageData[];
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  // Process data for daily aggregation
  const processedData = React.useMemo(() => {
    const dailyData = data.reduce((acc, item) => {
      const date = new Date(item.created_at).toDateString();
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          count: 0
        };
      }
      acc[date].total += item.total_cost_usd || 0;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { date: string; total: number; count: number }>);

    return Object.values(dailyData)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        date: formatDateShort(item.date),
        cost: item.total,
        requests: item.count
      }));
  }, [data]);

  const totalCost = data.reduce((sum, item) => sum + (item.total_cost_usd || 0), 0);
  const totalRequests = data.length;

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No usage data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-light">{formatCurrency(totalCost)}</p>
          <p className="text-sm text-muted-foreground">Total Cost</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-light">{totalRequests.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Requests</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-light">{formatCurrency(totalCost / Math.max(totalRequests, 1))}</p>
          <p className="text-sm text-muted-foreground">Avg Cost/Request</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-light">{processedData.length}</p>
          <p className="text-sm text-muted-foreground">Active Days</p>
        </div>
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Daily Usage Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="cost" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Requests Chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Daily Request Volume</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [Number(value).toLocaleString(), 'Requests']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="requests" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};