import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Skill {
  is_explicit: boolean;
  source_documents: string[];
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
}

interface SkillSourcesChartProps {
  skills: Skill[];
  documents: Document[];
}

export const SkillSourcesChart = ({ skills, documents }: SkillSourcesChartProps) => {
  // Create a map of document ID to document name
  const docMap = documents.reduce((acc, doc) => {
    acc[doc.id] = doc.file_name.length > 20 
      ? doc.file_name.substring(0, 20) + '...' 
      : doc.file_name;
    return acc;
  }, {} as Record<string, string>);

  // Count skills by document and type
  const documentStats = documents.map(doc => {
    const explicitCount = skills.filter(s => 
      s.source_documents?.includes(doc.id) && s.is_explicit
    ).length;
    
    const inferredCount = skills.filter(s => 
      s.source_documents?.includes(doc.id) && !s.is_explicit
    ).length;

    return {
      name: docMap[doc.id],
      fullName: doc.file_name,
      explicit: explicitCount,
      inferred: inferredCount,
      total: explicitCount + inferredCount,
    };
  }).filter(stat => stat.total > 0) // Only show documents with skills
    .sort((a, b) => b.total - a.total) // Sort by total skills
    .slice(0, 5); // Top 5 documents

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{data.fullName}</p>
          <p className="text-sm text-blue-600">
            Explicit: {data.explicit} skills
          </p>
          <p className="text-sm text-purple-600">
            Inferred: {data.inferred} skills
          </p>
          <p className="text-sm font-semibold text-foreground mt-1">
            Total: {data.total} skills
          </p>
        </div>
      );
    }
    return null;
  };

  if (documentStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skill Sources</CardTitle>
          <CardDescription>Skills by document source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No document data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Sources</CardTitle>
        <CardDescription>Top documents by skill extraction (Explicit vs Inferred)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={documentStats}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af"
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              label={{ value: 'Number of Skills', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => (
                <span className="text-sm text-foreground capitalize">{value} Skills</span>
              )}
            />
            <Bar 
              dataKey="explicit" 
              stackId="a" 
              fill="#3b82f6" 
              radius={[0, 0, 0, 0]}
              name="explicit"
            />
            <Bar 
              dataKey="inferred" 
              stackId="a" 
              fill="#a855f7" 
              radius={[8, 8, 0, 0]}
              name="inferred"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
