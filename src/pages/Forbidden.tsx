import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-display font-bold text-foreground mb-3">
          Access Denied
        </h1>
        
        <p className="text-muted-foreground mb-8">
          You don't have permission to access this page. This area is restricted to administrators only.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/feed">
            <NeonButton variant="filled">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Feed
            </NeonButton>
          </Link>
          <Link to="/auth">
            <NeonButton variant="cyan">
              Sign In
            </NeonButton>
          </Link>
        </div>
      </div>
    </div>
  );
}