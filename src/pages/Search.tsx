import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(20);

    setResults((data as Profile[]) || []);
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen">
        <header className="sticky top-0 z-10 glass border-b border-border p-4">
          <h1 className="text-xl font-bold mb-4">Search</h1>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </header>

        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            results.map((profile) => (
              <Link
                key={profile.id}
                to={`/user/${profile.username}`}
                className="flex items-center gap-3 p-4 hover:bg-card/50 transition-colors animate-fade-in"
              >
                <Avatar className="w-12 h-12 hover-lift">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-muted-foreground text-sm truncate">
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </Link>
            ))
          ) : hasSearched ? (
            <div className="p-8 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg mb-2">Find people on L_EFT</p>
              <p>Search by username or display name</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
