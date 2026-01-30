import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, User, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';

type AppRole = 'admin' | 'moderator' | 'user';

interface UserWithRole extends Profile {
  role: AppRole;
}

export function RoleManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  const fetchUsersWithRoles = async () => {
    setLoading(true);
    
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    if (profilesRes.data) {
      const rolesMap = new Map<string, AppRole>();
      rolesRes.data?.forEach(r => {
        // Prioritize admin > moderator > user
        const currentRole = rolesMap.get(r.user_id);
        if (!currentRole || (r.role === 'admin') || (r.role === 'moderator' && currentRole === 'user')) {
          rolesMap.set(r.user_id, r.role as AppRole);
        }
      });

      const usersWithRoles: UserWithRole[] = profilesRes.data.map(profile => ({
        ...profile,
        role: rolesMap.get(profile.user_id) || 'user',
      }));

      setUsers(usersWithRoles);
    }
    
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, profileId: string, newRole: AppRole) => {
    setUpdating(profileId);

    // First, delete existing roles for this user
    await supabase.from('user_roles').delete().eq('user_id', userId);

    // If new role is not 'user', insert the role
    if (newRole !== 'user') {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: newRole,
      });

      if (error) {
        toast({ title: 'Failed to update role', variant: 'destructive' });
        setUpdating(null);
        return;
      }
    }

    // Update local state
    setUsers(users.map(u => 
      u.id === profileId ? { ...u, role: newRole } : u
    ));

    toast({ title: `Role updated to ${newRole}` });
    setUpdating(null);
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="destructive" className="gap-1">
            <Crown className="w-3 h-3" />
            Admin
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="secondary" className="gap-1 bg-blue-500/20 text-blue-500">
            <ShieldCheck className="w-3 h-3" />
            Moderator
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <User className="w-3 h-3" />
            User
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
        <Shield className="w-5 h-5 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          <strong>Roles:</strong> Admins have full access. Moderators can manage content. Users have standard access.
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.display_name || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getRoleBadge(user.role)}
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(value: AppRole) => handleRoleChange(user.user_id, user.id, value)}
                    disabled={updating === user.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
