import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Skill {
  confidence_score: number;
}

interface ConfidenceDistributionChartProps {
  skills: Skill[];
}

export const ConfidenceDistributionChart = ({ skills }: ConfidenceDistributionChartProps) => {
  const ranges = [
    { name: "Low\n(0-30%)", min: 0, max: 0.3, color: "#ef4444" },
    { name: "Medium-Low\n(30-60%)", min: 0.3, max: 0.6, color: "#f59e0b" },
    { name: "Medium-High\n(60-80%)", min: 0.6, max: 0.8, color: "#eab308" },
    { name: "High\n(80-100%)", min: 0.8, max: 1.0, color: "#22c55e" },
  ];

  const data = ranges.map(range => ({
    name: range.name,
    count: skills.filter(s => s.confidence_score >= range.min && s.confidence_score < range.max).length,
    color: range.color,
  }));

  // Add skills with perfect 1.0 to the highest range
  if (data.length > 0) {
    data[data.length - 1].count += skills.filter(s => s.confidence_score === 1.0).length;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.payload.name.replace('\n', ' ')}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} skills ({((data.value / skills.length) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confidence Score Distribution</CardTitle>
        <CardDescription>How confident are we in each skill?</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              label={{ value: 'Number of Skills', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
            <Bar 
              dataKey="count" 
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
