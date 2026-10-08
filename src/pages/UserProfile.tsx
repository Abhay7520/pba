import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Award, TrendingUp, CheckCircle, Target, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

/*
  Palette
  deep teal     #0B4F4A  (text, hero, strong surfaces)
  emerald-teal  #14A38B  (accents, progress, icons)
  warm off-white #FAF7F0 (page + card surfaces)
  pale mint     #DDF3EA  (soft fills, borders, highlights)
*/

interface UserStats {
  totalReports: number;
  resolvedReports: number;
  totalUpvotes: number;
  points: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// Get current user from localStorage
function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
}

// Calculate points based on user activity
function calculatePoints(userIssues: any[]): number {
  let points = 0;
  
  userIssues.forEach(issue => {
    // Base points for creating a report
    points += 10;
    
    // Points for upvotes (5 points per upvote)
    const upvotes = (issue.upvotes || []).length;
    points += upvotes * 5;
    
    // Bonus points for resolved issues
    if (issue.status === 'resolved') {
      points += 50;
    }
    
    // Bonus points for in-progress issues
    if (issue.status === 'in-progress') {
      points += 20;
    }
  });
  
  return points;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const { currentUser: authUser, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [stats, setStats] = useState<UserStats>({
    totalReports: 0,
    resolvedReports: 0,
    totalUpvotes: 0,
    points: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync auth user to localStorage and state
  useEffect(() => {
    if (authUser) {
      const userProfile = {
        id: authUser.uid || (authUser as typeof authUser & { id?: string }).id,
        email: authUser.email,
        displayName: authUser.displayName || 'Anonymous User',
        createdAt: authUser.metadata?.creationTime || new Date().toISOString(),
        photoURL: authUser.photoURL || null
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userProfile));
      setCurrentUser(userProfile);
      
      console.log('✅ Auth user synced:', userProfile);
    } else {
      // If no auth user, check localStorage
      const storedUser = getCurrentUser();
      if (!storedUser) {
        // No user at all, redirect to login
        navigate('/auth');
      } else {
        setCurrentUser(storedUser);
      }
    }
  }, [authUser, navigate]);

  // Fetch user stats from localStorage
  const fetchUserStats = () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        console.warn('⚠️ No user found');
        return;
      }

      console.log('📊 Fetching stats for user:', user.email);

      // Get all issues from localStorage
      const issuesStr = localStorage.getItem('issues');
      const allIssues = issuesStr ? JSON.parse(issuesStr) : [];
      
      console.log(`📋 Total issues in system: ${allIssues.length}`);

      // Filter issues created by current user (using EMAIL instead of ID)
      const userIssues = allIssues.filter(issue => 
        issue.userId === user.id || issue.userEmail === user.email
      );
      console.log(`👤 User's issues: ${userIssues.length}`);
      
      // Calculate user statistics
      let totalUpvotes = 0;
      let resolvedCount = 0;
      let inProgressCount = 0;
      
      userIssues.forEach(issue => {
        const upvoteCount = (issue.upvotes || []).length;
        totalUpvotes += upvoteCount;
        if (issue.status === 'resolved') resolvedCount++;
        if (issue.status === 'in-progress') inProgressCount++;
        
        console.log(`  - Issue: "${issue.title}" | Upvotes: ${upvoteCount} | Status: ${issue.status}`);
      });

      // Calculate points dynamically
      const calculatedPoints = calculatePoints(userIssues);

      // Store the calculated points for this user (using EMAIL as key)
      const userStatsData = {
        points: calculatedPoints,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`userStats_${user.email}`, JSON.stringify(userStatsData));

      const calculatedStats = {
        totalReports: userIssues.length,
        resolvedReports: resolvedCount,
        totalUpvotes,
        points: calculatedPoints,
      };

      console.log('✅ Calculated stats:', calculatedStats);
      console.log('💰 Points breakdown:');
      console.log(`   - Base (10 per report): ${userIssues.length * 10}`);
      console.log(`   - Upvotes (5 per upvote): ${totalUpvotes * 5}`);
      console.log(`   - Resolved (50 per issue): ${resolvedCount * 50}`);
      console.log(`   - In Progress (20 per issue): ${inProgressCount * 20}`);
      console.log(`   - TOTAL: ${calculatedPoints}`);

      setStats(calculatedStats);
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    if (currentUser) {
      fetchUserStats();
    }
  }, [currentUser]);

  // Auto-refresh every 5 seconds to catch updates
  useEffect(() => {
    if (!currentUser) return;
    
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refresh triggered');
      fetchUserStats();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Listen for storage changes (cross-tab sync and updates)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'issues' || e.key?.startsWith('userStats_')) {
        console.log('🔄 Storage changed, refreshing stats...');
        fetchUserStats();
      }
      if (e.key === 'currentUser') {
        console.log('👤 User changed, updating profile...');
        setCurrentUser(getCurrentUser());
      }
    };
    
    // Listen for custom events (same-tab updates)
    const handleCustomStorageUpdate = (e) => {
      const key = e.detail?.key;
      if (key === 'issues' || key?.startsWith('userStats_')) {
        console.log('🔄 Custom storage event received, refreshing stats...');
        fetchUserStats();
      }
      if (key === 'currentUser') {
        console.log('👤 User changed via custom event, updating profile...');
        setCurrentUser(getCurrentUser());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdated', handleCustomStorageUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleCustomStorageUpdate);
    };
  }, []);

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshing(true);
    console.log('🔄 Manual refresh triggered');
    setTimeout(() => {
      fetchUserStats();
    }, 500);
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('currentUser');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getBadges = (): Badge[] => {
    const badges: Badge[] = [];
    
    if (stats.totalReports >= 1) {
      badges.push({
        id: 'new_reporter',
        name: 'New Reporter',
        description: 'Submitted your first report',
        icon: '🌟',
        color: 'bg-[#DDF3EA] border-[#B5E3D2] text-[#0B4F4A]'
      });
    }
    
    if (stats.totalReports >= 5) {
      badges.push({
        id: 'active_citizen',
        name: 'Active Citizen',
        description: 'Submitted 5 reports',
        icon: '🏆',
        color: 'bg-[#CBEDE0] border-[#8FD3BA] text-[#0B4F4A]'
      });
    }
    
    if (stats.totalReports >= 10) {
      badges.push({
        id: 'top_contributor',
        name: 'Top Contributor',
        description: 'Submitted 10 reports',
        icon: '⭐',
        color: 'bg-[#FAF7F0] border-[#14A38B] text-[#0B4F4A]'
      });
    }
    
    if (stats.totalReports >= 25) {
      badges.push({
        id: 'civic_hero',
        name: 'Civic Hero',
        description: 'Submitted 25 reports',
        icon: '🦸',
        color: 'bg-[#14A38B]/15 border-[#14A38B] text-[#0B4F4A]'
      });
    }
    
    if (stats.totalReports >= 50) {
      badges.push({
        id: 'super_citizen',
        name: 'Super Citizen',
        description: 'Submitted 50 reports',
        icon: '💎',
        color: 'bg-[#0B4F4A] border-[#0B4F4A] text-[#DDF3EA]'
      });
    }
    
    if (stats.totalReports >= 100) {
      badges.push({
        id: 'legend',
        name: 'Community Legend',
        description: 'Submitted 100 reports',
        icon: '👑',
        color: 'bg-[#083B37] border-[#14A38B] text-[#FAF7F0]'
      });
    }
    
    if (stats.totalUpvotes >= 25) {
      badges.push({
        id: 'popular',
        name: 'Popular Reporter',
        description: 'Received 25 upvotes',
        icon: '👍',
        color: 'bg-[#E9F7F0] border-[#A6DCC8] text-[#0B4F4A]'
      });
    }
    
    if (stats.totalUpvotes >= 50) {
      badges.push({
        id: 'community_voice',
        name: 'Community Voice',
        description: 'Received 50 upvotes',
        icon: '📢',
        color: 'bg-[#FAF7F0] border-[#0B4F4A]/40 text-[#0B4F4A]'
      });
    }
    
    if (stats.totalUpvotes >= 100) {
      badges.push({
        id: 'influencer',
        name: 'Influencer',
        description: 'Received 100 upvotes',
        icon: '🎯',
        color: 'bg-[#14A38B] border-[#0E8A75] text-white'
      });
    }
    
    if (stats.resolvedReports >= 3) {
      badges.push({
        id: 'problem_solver',
        name: 'Problem Solver',
        description: '3 issues resolved',
        icon: '✅',
        color: 'bg-[#DDF3EA] border-[#14A38B] text-[#0B4F4A]'
      });
    }
    
    if (stats.resolvedReports >= 10) {
      badges.push({
        id: 'change_maker',
        name: 'Change Maker',
        description: '10 issues resolved',
        icon: '🔧',
        color: 'bg-[#0B4F4A] border-[#14A38B] text-[#DDF3EA]'
      });
    }
    
    return badges;
  };

  const userBadges = getBadges();

  // Calculate next milestone
  const getNextMilestone = () => {
    const milestones = [
      { reports: 1, name: 'First Report', points: 10 },
      { reports: 5, name: '5 Reports', points: 50 },
      { reports: 10, name: '10 Reports', points: 100 },
      { reports: 25, name: '25 Reports', points: 250 },
      { reports: 50, name: '50 Reports', points: 500 },
      { reports: 100, name: '100 Reports', points: 1000 },
    ];
    
    for (const milestone of milestones) {
      if (stats.totalReports < milestone.reports) {
        return {
          ...milestone,
          remaining: milestone.reports - stats.totalReports
        };
      }
    }
    
    return null;
  };

  const nextMilestone = getNextMilestone();

  // Shared surface style for quiet cards
  const surface = 'bg-[#FFFDF8] border border-[#DDF3EA] shadow-sm rounded-2xl';

  if (loading) {
    return (
      <div className="civic-page min-h-screen bg-[#FAF7F0] py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#14A38B] border-t-transparent mb-3"></div>
            <p className="text-[#0B4F4A]/70 font-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="civic-page min-h-screen bg-[#FAF7F0] pb-12">
      {/* Profile hero: the one bold surface on the page */}
      <div className="bg-[#0B4F4A] pt-12 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <Avatar className="h-24 w-24 bg-[#14A38B] ring-4 ring-[#DDF3EA]/30">
                {currentUser?.photoURL && <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName} />}
                <AvatarFallback className="text-3xl text-[#FAF7F0] font-bold bg-[#14A38B]">
                  {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#FAF7F0]">
                  {currentUser?.displayName || 'Anonymous User'}
                </h1>
                <p className="text-base text-[#DDF3EA]/80">{currentUser?.email || 'user@example.com'}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#DDF3EA] px-3 py-1">
                    <Star className="h-4 w-4 text-[#0E8A75] fill-[#14A38B]" />
                    <span className="font-semibold text-[#0B4F4A]">{stats.points} Points</span>
                  </span>
                </div>
                <p className="text-xs text-[#DDF3EA]/70 mt-2">
                  Member since: {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 rounded-xl bg-[#DDF3EA]/15 hover:bg-[#DDF3EA]/25 border border-[#DDF3EA]/30 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DDF3EA]"
                title="Refresh stats"
              >
                <RefreshCw className={`h-5 w-5 text-[#DDF3EA] ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="icon"
                className="p-3 rounded-xl bg-transparent border-[#DDF3EA]/30 hover:bg-[#DDF3EA]/15 hover:text-[#FAF7F0]"
                title="Logout"
              >
                <LogOut className="h-5 w-5 text-[#DDF3EA]" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl -mt-14">
        {/* Stats Grid (overlaps the hero) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className={`${surface} shadow-md`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#0B4F4A]/70">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3EA]">
                  <Trophy className="h-6 w-6 text-[#0B4F4A]" />
                </span>
                <span className="text-3xl font-bold text-[#0B4F4A]">{stats.totalReports}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`${surface} shadow-md`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#0B4F4A]/70">Resolved Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3EA]">
                  <CheckCircle className="h-6 w-6 text-[#14A38B]" />
                </span>
                <span className="text-3xl font-bold text-[#0B4F4A]">{stats.resolvedReports}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`${surface} shadow-md`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#0B4F4A]/70">Total Upvotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3EA]">
                  <TrendingUp className="h-6 w-6 text-[#0B4F4A]" />
                </span>
                <span className="text-3xl font-bold text-[#0B4F4A]">{stats.totalUpvotes}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Points Breakdown + Next Milestone side by side on desktop */}
        <div className={`grid grid-cols-1 gap-4 mb-6 ${nextMilestone ? 'md:grid-cols-2' : ''}`}>
          <Card className={surface}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[#14A38B]" />
                <CardTitle className="text-xl text-[#0B4F4A]">Points Breakdown</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#0B4F4A]/80">Reports Created (10 pts each):</span>
                  <span className="font-semibold text-[#0B4F4A]">{stats.totalReports * 10} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#0B4F4A]/80">Upvotes Received (5 pts each):</span>
                  <span className="font-semibold text-[#0B4F4A]">{stats.totalUpvotes * 5} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#0B4F4A]/80">Resolved Issues (50 pts each):</span>
                  <span className="font-semibold text-[#0B4F4A]">{stats.resolvedReports * 50} pts</span>
                </div>
                <div className="border-t border-[#DDF3EA] pt-3 mt-3 flex justify-between items-center">
                  <span className="text-[#0B4F4A] font-bold">Total Points:</span>
                  <span className="font-bold text-2xl text-[#14A38B]">{stats.points} pts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {nextMilestone && (
            <Card className="bg-[#DDF3EA] border border-[#B5E3D2] shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#0B4F4A]" />
                  <CardTitle className="text-xl text-[#0B4F4A]">Next Milestone</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[#0B4F4A]">
                      {nextMilestone.remaining} more {nextMilestone.remaining === 1 ? 'report' : 'reports'} to reach {nextMilestone.name}
                    </span>
                    <span className="text-sm font-semibold text-[#0B4F4A] whitespace-nowrap">+{nextMilestone.points} pts</span>
                  </div>
                  <div className="w-full bg-[#FAF7F0] rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-[#14A38B] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(stats.totalReports / nextMilestone.reports) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#0B4F4A]/70 text-center">
                    {stats.totalReports} / {nextMilestone.reports} reports
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Badges */}
        <Card className={surface}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-[#14A38B]" />
              <CardTitle className="text-2xl text-[#0B4F4A]">Achievements ({userBadges.length} earned)</CardTitle>
            </div>
            <CardDescription className="text-[#0B4F4A]/70">Badges you've earned for your civic contributions</CardDescription>
          </CardHeader>
          <CardContent>
            {userBadges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userBadges.map((badge) => (
                  <div 
                    key={badge.id}
                    className={`p-4 rounded-xl border ${badge.color} transition-shadow hover:shadow-md`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{badge.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{badge.name}</h4>
                        <p className="text-xs opacity-80 mt-1">{badge.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-[#0B4F4A] font-medium mb-2">No badges yet!</p>
                <p className="text-sm text-[#0B4F4A]/70 mb-4">
                  Start reporting issues to earn your first badge
                </p>
                <button
                  onClick={() => navigate('/report')}
                  className="px-6 py-2 bg-[#14A38B] text-white rounded-lg hover:bg-[#0E8A75] transition-colors font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F4A]"
                >
                  Report Your First Issue
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Badges */}
        {stats.totalReports > 0 && stats.totalReports < 100 && (
          <Card className="mt-6 bg-[#DDF3EA]/60 border border-[#DDF3EA] shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B4F4A]">🎯 Keep Going!</CardTitle>
              <CardDescription className="text-[#0B4F4A]/70">Upcoming badges to unlock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-[#0B4F4A]/80">
                {stats.totalReports < 5 && (
                  <p>• Submit {5 - stats.totalReports} more {5 - stats.totalReports === 1 ? 'report' : 'reports'} to earn "Active Citizen" 🏆</p>
                )}
                {stats.totalReports < 10 && (
                  <p>• Submit {10 - stats.totalReports} more {10 - stats.totalReports === 1 ? 'report' : 'reports'} to earn "Top Contributor" ⭐</p>
                )}
                {stats.totalReports < 25 && (
                  <p>• Submit {25 - stats.totalReports} more {25 - stats.totalReports === 1 ? 'report' : 'reports'} to earn "Civic Hero" 🦸</p>
                )}
                {stats.totalUpvotes < 50 && (
                  <p>• Get {50 - stats.totalUpvotes} more {50 - stats.totalUpvotes === 1 ? 'upvote' : 'upvotes'} to earn "Community Voice" 📢</p>
                )}
                {stats.resolvedReports < 3 && (
                  <p>• Get {3 - stats.resolvedReports} more {3 - stats.resolvedReports === 1 ? 'issue' : 'issues'} resolved to earn "Problem Solver" ✅</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info (can be removed in production) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-6 bg-[#FAF7F0] border border-dashed border-[#14A38B]/40 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm text-[#0B4F4A]/70">Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#0B4F4A]/70 space-y-1">
                <p>User Email (Key): {currentUser?.email}</p>
                <p>User ID: {currentUser?.id}</p>
                <p>Created: {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleString() : 'N/A'}</p>
                <p>Stats updated: {new Date().toLocaleString()}</p>
                <p>Auth User: {authUser ? 'Connected ✅' : 'Not connected ❌'}</p>
                <p>Photo URL: {currentUser?.photoURL ? 'Available' : 'None'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserProfile;