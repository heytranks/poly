import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, truncateAddress } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';

interface ProfileHeaderProps {
  profile: UserProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={profile.pfp} alt={profile.username} />
        <AvatarFallback className="text-xl">
          {profile.username?.[0]?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          {profile.proTrader && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              Pro
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {truncateAddress(profile.address)}
        </p>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span>Portfolio: <strong className="text-foreground">{formatCurrency(profile.portfolioValue)}</strong></span>
          <span>$ Volume: <strong className="text-foreground">{formatCurrency(profile.dollarVolume)}</strong></span>
          <span>Shares: <strong className="text-foreground">{profile.sharesVolume.toLocaleString()}</strong></span>
          <span>Markets: <strong className="text-foreground">{profile.markets}</strong></span>
        </div>
        {profile.dataCoverage && (
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>
              Data: {profile.dataCoverage.tradeCount.toLocaleString()} trades
              {profile.dataCoverage.oldestTradeDate && profile.dataCoverage.newestTradeDate && (
                <> ({profile.dataCoverage.oldestTradeDate} ~ {profile.dataCoverage.newestTradeDate})</>
              )}
            </span>
            <span className="text-muted-foreground/50">|</span>
            <span>
              {profile.dataCoverage.closedPositionCount.toLocaleString()} closed positions
              {profile.dataCoverage.oldestClosedDate && profile.dataCoverage.newestClosedDate && (
                <> ({profile.dataCoverage.oldestClosedDate} ~ {profile.dataCoverage.newestClosedDate})</>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
