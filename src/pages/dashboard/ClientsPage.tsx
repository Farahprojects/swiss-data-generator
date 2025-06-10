
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Calendar, Grid, List, MoreHorizontal } from 'lucide-react';
import { clientsService } from '@/services/clients';
import { Client } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { TheraLoader } from '@/components/ui/TheraLoader';
import ClientForm from '@/components/clients/ClientForm';

type ViewMode = 'grid' | 'list';

const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientsService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = () => {
    loadClients();
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const ClientCard = ({ client }: { client: Client }) => (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-border/50 hover:border-primary/20">
      <Link to={`/dashboard/clients/${client.id}`}>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
              {client.avatar_url ? (
                <img src={client.avatar_url} alt={client.full_name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                client.full_name.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-foreground leading-tight">
                {client.full_name}
              </CardTitle>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Added {formatDate(client.created_at)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="space-y-2">
            {client.email && (
              <div className="text-sm text-muted-foreground truncate">
                {client.email}
              </div>
            )}
            <div className="flex items-center justify-between">
              {client.birth_location && (
                <div className="text-xs text-muted-foreground">
                  {client.birth_location}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {client.birth_date && `Born ${formatDate(client.birth_date)}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  const ClientTableRow = ({ client }: { client: Client }) => (
    <TableRow className="hover:bg-muted/50 cursor-pointer">
      <TableCell className="font-medium">
        <Link to={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 hover:text-primary">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
            {client.avatar_url ? (
              <img src={client.avatar_url} alt={client.full_name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              client.full_name.split(' ').map(n => n[0]).join('')
            )}
          </div>
          <span>{client.full_name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.email || '-'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.birth_date ? formatDate(client.birth_date) : '-'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.birth_location || '-'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(client.created_at)}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return <TheraLoader message="Loading clients..." size="lg" />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mt-8 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        </div>
        
        {/* Subtitle */}
        <p className="text-muted-foreground -mt-1">Manage your client relationships and their journeys</p>
        
        {/* Controls Row - Search, View Toggle and Button */}
        <div className="flex items-center gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Client
          </Button>
        </div>
        
        {/* Search Results Count */}
        {searchTerm && (
          <div className="text-sm text-muted-foreground">
            {filteredClients.length} result{filteredClients.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'grid' ? (
        /* Clients Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredClients.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        /* Clients Table */
        <div className="bg-background border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">🧠 Name</TableHead>
                <TableHead className="font-semibold">📧 Email</TableHead>
                <TableHead className="font-semibold">🗓️ DOB</TableHead>
                <TableHead className="font-semibold">🌍 Location</TableHead>
                <TableHead className="font-semibold">🔮 Last Insight</TableHead>
                <TableHead className="font-semibold">⚡ Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map(client => (
                <ClientTableRow key={client.id} client={client} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">No clients found</div>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first client'}
          </p>
          <Button onClick={() => setShowNewClientModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Client
          </Button>
        </div>
      )}

      {/* Client Form Modal */}
      <ClientForm
        open={showNewClientModal}
        onOpenChange={setShowNewClientModal}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
};

export default ClientsPage;
