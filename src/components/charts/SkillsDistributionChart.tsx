import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Skill {
  skill_category: string;
}

interface SkillsDistributionChartProps {
  skills: Skill[];
  onCategoryClick?: (category: string) => void;
}

const COLORS = {
  technical: "#3b82f6", // Blue
  tools: "#22c55e", // Green
  soft_skills: "#a855f7", // Purple
  domain: "#f97316", // Orange
};

const CATEGORY_LABELS = {
  technical: "Technical Skills",
  tools: "Tools & Technologies",
  soft_skills: "Soft Skills",
  domain: "Domain Expertise",
};

export const SkillsDistributionChart = ({ skills, onCategoryClick }: SkillsDistributionChartProps) => {
  const data = Object.entries(
    skills.reduce((acc, skill) => {
      acc[skill.skill_category] = (acc[skill.skill_category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, count]) => ({
    name: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
    value: count,
    category: category,
    color: COLORS[category as keyof typeof COLORS] || "#94a3b8",
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

  const handleClick = (data: any) => {
    if (onCategoryClick) {
      onCategoryClick(data.category);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills Distribution</CardTitle>
        <CardDescription>Breakdown by category - Click to filter</CardDescription>
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
              fill="#8884d8"
              dataKey="value"
              onClick={handleClick}
              className="cursor-pointer"
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
              formatter={(value, entry: any) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
