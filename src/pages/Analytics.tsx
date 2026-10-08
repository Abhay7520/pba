import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, MapPin, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Issue {
  id: string;
  category: string;
  status: string;
  createdAt: any;
}

const COLORS = {
  Road: '#3b82f6',
  Garbage: '#22c55e',
  Water: '#06b6d4',
  Streetlight: '#eab308',
  Other: '#6b7280'
};

const STATUS_COLORS = {
  open: '#ef4444',
  'in-progress': '#eab308',
  resolved: '#22c55e'
};

const Analytics = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    console.log('Setting up Firestore listener...');
    
    try {
      const q = query(collection(db, 'issues'));
      
      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          console.log('Snapshot received:', snapshot.docs.length, 'documents');
          const issuesData = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Document:', doc.id, data);
            return {
              id: doc.id,
              ...data
            };
          }) as Issue[];
          
          setIssues(issuesData);
          setLoading(false);
          setLastUpdate(new Date());
          setError(null);
        },
        (err) => {
          console.error('Firestore error:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => {
        console.log('Cleaning up Firestore listener');
        unsubscribe();
      };
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Calculate stats
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter(i => i.status === 'resolved').length;
  const pendingIssues = issues.filter(i => i.status !== 'resolved').length;
  const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

  // Issues by category
  const categoryData = Object.entries(
    issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Status distribution
  const statusData = Object.entries(
    issues.reduce((acc, issue) => {
      const status = issue.status || 'open';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ 
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '), 
    value 
  }));

  // Issues over time (last 30 days)
  const getLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const timelineData = getLast30Days().map(date => {
    const count = issues.filter(issue => {
      if (!issue.createdAt) return false;
      const issueDate = new Date(issue.createdAt.toMillis()).toISOString().split('T')[0];
      return issueDate === date;
    }).length;
    
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count
    };
  });

  if (loading) {
    return (
      <div className="civic-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="civic-page min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <p className="text-sm">Please check:</p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>Firebase configuration in @/lib/firebase</li>
              <li>Firestore rules allow read access</li>
              <li>Network connection is stable</li>
            </ul>
            <Button onClick={() => window.location.reload()} className="mt-4 w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="civic-page min-h-screen bg-gradient-to-br from-background to-primary/5 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">City Analytics</h1>
            <p className="text-muted-foreground">Track civic issue trends and resolution rates</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Last updated</div>
            <div className="text-sm font-medium">{lastUpdate.toLocaleTimeString()}</div>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Updates Active
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{totalIssues}</div>
                  <div className="text-sm text-muted-foreground">Total Issues</div>
                </div>
                <MapPin className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600">{resolvedIssues}</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-yellow-600">{pendingIssues}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <AlertCircle className="h-10 w-10 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-primary">{resolutionRate}%</div>
                  <div className="text-sm text-muted-foreground">Resolution Rate</div>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Issues by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Issues by Category</CardTitle>
              <CardDescription>Distribution of reported issues across categories</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Current status of all reported issues</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.name.toLowerCase().replace(' ', '-') as keyof typeof STATUS_COLORS] || '#6b7280'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Reports Over Time</CardTitle>
            <CardDescription>Number of issues reported in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Issues Reported"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="mt-6 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 font-mono">
              <div>Total Issues in State: {issues.length}</div>
              <div>Last Update: {lastUpdate.toISOString()}</div>
              <div>Listener Status: Active ✓</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;