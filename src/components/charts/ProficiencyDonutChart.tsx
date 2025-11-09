import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Skill {
  proficiency_level: string;
}

interface ProficiencyDonutChartProps {
  skills: Skill[];
}

const COLORS = {
  expert: "#a855f7", // Purple
  advanced: "#3b82f6", // Blue
  intermediate: "#22c55e", // Green
  beginner: "#f97316", // Orange
};

const LABELS = {
  expert: "Expert",
  advanced: "Advanced",
  intermediate: "Intermediate",
  beginner: "Beginner",
};

export const ProficiencyDonutChart = ({ skills }: ProficiencyDonutChartProps) => {
  const proficiencyCounts = skills.reduce((acc, skill) => {
    acc[skill.proficiency_level] = (acc[skill.proficiency_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(proficiencyCounts).map(([level, count]) => ({
    name: LABELS[level as keyof typeof LABELS] || level,
    value: count,
    color: COLORS[level as keyof typeof COLORS] || "#94a3b8",
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} skills ({((data.value / skills.length) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate total for center label
  const total = skills.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proficiency Breakdown</CardTitle>
        <CardDescription>Skill level distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              innerRadius={50}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
            <text 
              x="50%" 
              y="50%" 
              textAnchor="middle" 
              dominantBaseline="middle"
              className="fill-foreground font-bold text-2xl"
            >
              {total}
            </text>
            <text 
              x="50%" 
              y="55%" 
              textAnchor="middle" 
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs"
            >
              Total Skills
            </text>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
