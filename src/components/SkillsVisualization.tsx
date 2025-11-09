import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { useMemo } from "react";

interface SkillsVisualizationProps {
  skills: any[];
}

const PROFICIENCY_COLORS = {
  beginner: "hsl(var(--accent-light))",
  intermediate: "hsl(var(--primary-light))",
  advanced: "hsl(var(--primary))",
  expert: "hsl(var(--accent-dark))",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--primary-light))",
  "hsl(var(--accent-light))",
  "hsl(var(--primary-dark))",
  "hsl(var(--accent-dark))",
];

export const SkillsVisualization = ({ skills }: SkillsVisualizationProps) => {
  // Calculate proficiency distribution
  const proficiencyData = useMemo(() => {
    const distribution: Record<string, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0,
    };

    skills.forEach((skill) => {
      const level = skill.proficiency_level || "beginner";
      distribution[level] = (distribution[level] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([level, count]) => ({
        name: level.charAt(0).toUpperCase() + level.slice(1),
        value: count,
        fill: PROFICIENCY_COLORS[level as keyof typeof PROFICIENCY_COLORS],
      }))
      .filter((item) => item.value > 0);
  }, [skills]);

  // Calculate confidence score distribution
  const confidenceData = useMemo(() => {
    const ranges = [
      { name: "0-20%", min: 0, max: 0.2, count: 0 },
      { name: "21-40%", min: 0.2, max: 0.4, count: 0 },
      { name: "41-60%", min: 0.4, max: 0.6, count: 0 },
      { name: "61-80%", min: 0.6, max: 0.8, count: 0 },
      { name: "81-100%", min: 0.8, max: 1.0, count: 0 },
    ];

    skills.forEach((skill) => {
      const score = skill.confidence_score || 0;
      const range = ranges.find((r) => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    return ranges.filter((r) => r.count > 0);
  }, [skills]);

  // Extract categories from skill names (you might want to enhance this based on your data structure)
  const categoryData = useMemo(() => {
    // This is a simplified categorization - you might want to use skill_taxonomy for better results
    const categories: Record<string, number> = {};

    skills.forEach((skill) => {
      // Simple heuristic: check if skill name contains certain keywords
      const name = skill.skill_name.toLowerCase();
      let category = "Other";

      if (name.includes("javascript") || name.includes("typescript") || name.includes("react") || name.includes("vue") || name.includes("angular")) {
        category = "Frontend";
      } else if (name.includes("python") || name.includes("java") || name.includes("node") || name.includes("backend") || name.includes("api")) {
        category = "Backend";
      } else if (name.includes("design") || name.includes("ui") || name.includes("ux") || name.includes("figma")) {
        category = "Design";
      } else if (name.includes("data") || name.includes("sql") || name.includes("database") || name.includes("analytics")) {
        category = "Data";
      } else if (name.includes("devops") || name.includes("cloud") || name.includes("aws") || name.includes("docker") || name.includes("kubernetes")) {
        category = "DevOps";
      }

      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [skills]);

  if (skills.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Proficiency Level Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Skills by Proficiency Level</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={proficiencyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {proficiencyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Confidence Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Confidence Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Skills by Category */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Skills by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
