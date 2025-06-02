
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Grid, List, Mail, Phone } from 'lucide-react';
import { mockClients } from '@/data/mockClients';
import { Client } from '@/types/clients';

const ClientsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.tags && client.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return `${Math.floor(diffInHours / 168)}w ago`;
    }
  };

  const ClientCard = ({ client }: { client: Client }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <Link to={`/dashboard/clients/${client.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              {client.avatar ? (
                <img src={client.avatar} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                client.name.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{client.name}</CardTitle>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Mail className="w-3 h-3 mr-1" />
                {client.email}
              </div>
              {client.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-3 h-3 mr-1" />
                  {client.phone}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Reports</span>
              <span className="font-medium">{client.reportsCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Activity</span>
              <span className="font-medium">{formatLastActivity(client.lastActivity)}</span>
            </div>
            {client.tags && client.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {client.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {client.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{client.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client relationships and their journeys</p>
        </div>
        <Button 
          onClick={() => setShowNewClientModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Client
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search clients by name, email, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Client Count */}
      <div className="text-sm text-gray-600">
        {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
      </div>

      {/* Clients Grid */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
        : "space-y-4"
      }>
        {filteredClients.map(client => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No clients found</div>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first client'}
          </p>
          <Button onClick={() => setShowNewClientModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Client
          </Button>
        </div>
      )}

      {/* New Client Modal Placeholder */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">New Client</h3>
            <p className="text-gray-600 mb-4">New client form will be implemented here</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewClientModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowNewClientModal(false)}>
                Save Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
