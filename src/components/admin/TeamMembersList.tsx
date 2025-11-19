import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Mail, Loader2 } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TeamMembersListProps {
  agencyId: string;
}

export function TeamMembersList({ agencyId }: TeamMembersListProps) {
  const { members, loading } = useTeamMembers(agencyId);
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Membros da Equipe</CardTitle>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/admin/membros-equipe')}
        >
          Gerenciar
        </Button>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="mb-2">Nenhum membro cadastrado</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin/membros-equipe')}
            >
              Adicionar Primeiro Membro
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div 
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
