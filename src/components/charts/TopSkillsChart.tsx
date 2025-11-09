import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Skill {
  skill_name: string;
  confidence_score: number;
}

interface TopSkillsChartProps {
  skills: Skill[];
}

export const TopSkillsChart = ({ skills }: TopSkillsChartProps) => {
  const topSkills = [...skills]
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, 10)
    .reverse(); // Reverse for horizontal bar chart (highest at top)

  const data = topSkills.map(skill => ({
    name: skill.skill_name.length > 20 ? skill.skill_name.substring(0, 20) + '...' : skill.skill_name,
    fullName: skill.skill_name,
    confidence: skill.confidence_score * 100,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.payload.fullName}</p>
          <p className="text-sm text-muted-foreground">
            Confidence: {data.value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const getColor = (confidence: number) => {
    if (confidence >= 90) return "#22c55e"; // Green
    if (confidence >= 80) return "#3b82f6"; // Blue
    if (confidence >= 70) return "#a855f7"; // Purple
    return "#f97316"; // Orange
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Skills</CardTitle>
        <CardDescription>Highest confidence skills</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              label={{ value: 'Confidence (%)', position: 'insideBottom', offset: -5, style: { fill: '#9ca3af' } }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
            <Bar 
              dataKey="confidence" 
              radius={[0, 8, 8, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.confidence)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
