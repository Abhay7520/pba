import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, Filter } from 'lucide-react';
import { updateUserPoints, POINTS, createNotification } from '@/lib/gamification';

interface Issue {
  id: string;
  title: string;
  category: string;
  status: 'open' | 'in-progress' | 'resolved';
  userId: string;
  userEmail: string;
  createdAt: any;
  upvotes: string[];
}

const AdminDashboard = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'issues'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Issue[];
      
      // Sort by creation date (newest first)
      issuesData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });
      
      setIssues(issuesData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = issues;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(issue => issue.category === categoryFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(issue => 
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredIssues(filtered);
  }, [issues, categoryFilter, statusFilter, searchTerm]);

  const handleStatusUpdate = async (issueId: string, newStatus: string) => {
    try {
      const issueRef = doc(db, 'issues', issueId);
      const issueDoc = await getDoc(issueRef);
      const issueData = issueDoc.data();
      
      await updateDoc(issueRef, {
        status: newStatus
      });

      // Create notification for the user
      if (issueData?.userId && issueData?.title) {
        let message = '';
        if (newStatus === 'in-progress') {
          message = 'Your issue is now being addressed';
        } else if (newStatus === 'resolved') {
          message = 'Your issue has been resolved! +25 points';
          // Award points for resolved issue
          await updateUserPoints(issueData.userId, POINTS.ISSUE_RESOLVED);
        } else {
          message = `Status updated to ${newStatus}`;
        }
        
        await createNotification(
          issueData.userId,
          issueId,
          issueData.title,
          message
        );
      }
      
      toast({
        title: 'Status Updated',
        description: `Issue status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: 'There was an error updating the status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in-progress': return 'default';
      case 'resolved': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toMillis()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // ProtectedRoute already handles admin check, this is redundant but kept as backup
  if (userProfile?.role !== 'admin') {
    return (
      <div className="civic-page min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="civic-page min-h-screen bg-gradient-to-br from-background to-primary/5 py-12">
      <div className="container mx-auto px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{issues.length}</div>
              <div className="text-sm text-muted-foreground">Total Issues</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">
                {issues.filter(i => i.status === 'open').length}
              </div>
              <div className="text-sm text-muted-foreground">Open</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {issues.filter(i => i.status === 'in-progress').length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-secondary">
                {issues.filter(i => i.status === 'resolved').length}
              </div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Input
                placeholder="Search by title or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                  <SelectItem value="Garbage">Garbage</SelectItem>
                  <SelectItem value="Water">Water</SelectItem>
                  <SelectItem value="Streetlight">Streetlight</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Showing {filteredIssues.length} of {issues.length} issues
            </div>
          </CardContent>
        </Card>

        {/* Issues Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Upvotes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{issue.userEmail || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{formatDate(issue.createdAt)}</TableCell>
                      <TableCell>{issue.upvotes?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(issue.status)}>
                          {issue.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={issue.status}
                          onValueChange={(value) => handleStatusUpdate(issue.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredIssues.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No issues found matching your filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
