
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { clientsService } from '@/services/clients';
import { journalEntriesService } from '@/services/journalEntries';
import { Client, JournalEntry } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import EditClientForm from '@/components/clients/EditClientForm';

const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [client, setClient] = useState<Client | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  const loadClientData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [clientData, journalData] = await Promise.all([
        clientsService.getClient(id),
        journalEntriesService.getJournalEntries(id)
      ]);
      
      setClient(clientData);
      setJournalEntries(journalData);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: "Error",
        description: "Failed to load client data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    
    if (confirm(`Are you sure you want to delete ${client.full_name}? This action cannot be undone.`)) {
      try {
        await clientsService.deleteClient(client.id);
        toast({
          title: "Success",
          description: "Client deleted successfully.",
        });
        navigate('/dashboard/clients');
      } catch (error) {
        console.error('Error deleting client:', error);
        toast({
          title: "Error",
          description: "Failed to delete client. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading client details...</div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Client not found</div>
          <p className="text-gray-600 mb-4">The client you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/dashboard/clients')}>
            Return to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.full_name}</h1>
            <p className="text-gray-600">Client Details & Journal</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Client
            </Button>
            <Button variant="outline" onClick={handleDeleteClient}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Client Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {client.email && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{client.email}</div>
                </div>
              </div>
            )}
            
            {client.phone && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="font-medium">{client.phone}</div>
                </div>
              </div>
            )}
            
            {client.birth_date && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Birth Date</div>
                  <div className="font-medium">{formatDate(client.birth_date)}</div>
                </div>
              </div>
            )}
            
            {client.birth_time && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Birth Time</div>
                  <div className="font-medium">{client.birth_time}</div>
                </div>
              </div>
            )}
            
            {client.birth_location && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Birth Location</div>
                  <div className="font-medium">{client.birth_location}</div>
                </div>
              </div>
            )}
          </div>
          
          {client.notes && (
            <div className="mt-6 pt-6 border-t">
              <div className="mb-2">
                <h4 className="font-medium text-gray-900">Notes</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{client.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="journal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journal">Journal Entries ({journalEntries.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports (0)</TabsTrigger>
          <TabsTrigger value="insights">Insights (0)</TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Journal Entries</h3>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </div>

          {journalEntries.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="text-gray-400 text-lg mb-2">No journal entries yet</div>
                  <p className="text-gray-600 mb-4">Start documenting your sessions and insights</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {journalEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        {entry.title && (
                          <CardTitle className="text-lg">{entry.title}</CardTitle>
                        )}
                        <p className="text-sm text-gray-600">
                          {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{entry.entry_text}</p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1 mt-3 pt-3 border-t">
                        {entry.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2">No reports generated yet</div>
                <p className="text-gray-600 mb-4">Generate astrological reports for this client</p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2">No insights available</div>
                <p className="text-gray-600 mb-4">AI insights will appear here based on client data and patterns</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Client Modal */}
      {client && (
        <EditClientForm
          client={client}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onClientUpdated={loadClientData}
        />
      )}
    </div>
  );
};

export default ClientDetailPage;
