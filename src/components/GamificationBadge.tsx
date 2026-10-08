import { Award, Star, Trophy, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const BADGES: Record<string, BadgeData> = {
  'new_reporter': {
    id: 'new_reporter',
    name: 'New Reporter',
    description: 'Submitted your first report',
    icon: <Star className="h-4 w-4" />,
  },
  'top_contributor': {
    id: 'top_contributor',
    name: 'Top Contributor',
    description: 'Reported 10+ civic issues',
    icon: <Trophy className="h-4 w-4" />,
  },
  'super_citizen': {
    id: 'super_citizen',
    name: 'Super Citizen',
    description: 'Reported 50+ civic issues',
    icon: <Award className="h-4 w-4" />,
  },
  'community_voice': {
    id: 'community_voice',
    name: 'Community Voice',
    description: 'Received 100+ upvotes',
    icon: <Zap className="h-4 w-4" />,
  },
};

interface GamificationBadgeProps {
  badgeId: string;
  variant?: 'default' | 'outline';
}

const GamificationBadge = ({ badgeId, variant = 'default' }: GamificationBadgeProps) => {
  const badge = BADGES[badgeId];
  
  if (!badge) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={variant} className="gap-1">
            {badge.icon}
            {badge.name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GamificationBadge;
