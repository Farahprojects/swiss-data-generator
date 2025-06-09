
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock,
  FileText,
  Plus,
  BookOpen,
  Lightbulb,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useClientData } from '@/hooks/useClientData';

const ClientDashboard = () => {
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { client, journalEntries, clientReports, insightEntries, loading } = useClientData(clientId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading client data...</div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Client not found</h2>
        <Link to="/dashboard/clients">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'milestone': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'recommendation': return <Lightbulb className="w-4 h-4 text-blue-600" />;
      case 'pattern': return <Lightbulb className="w-4 h-4 text-purple-600" />;
      default: return <Lightbulb className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
            {client.avatar_url ? (
              <img src={client.avatar_url} alt={client.full_name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              client.full_name.split(' ').map(n => n[0]).join('')
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.full_name}</h1>
            <div className="flex items-center gap-4 text-gray-600 mt-1">
              {client.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </div>
              )}
            </div>
          </div>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {client.birth_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">Birth Date</div>
                  <div className="font-medium">{formatDate(client.birth_date)}</div>
                </div>
              </div>
            )}
            {client.birth_time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">Birth Time</div>
                  <div className="font-medium">{client.birth_time}</div>
                </div>
              </div>
            )}
            {client.birth_location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">Birth Location</div>
                  <div className="font-medium">{client.birth_location}</div>
                </div>
              </div>
            )}
          </div>
          {client.notes && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Goals</div>
              <p className="text-gray-800">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Total Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{clientReports.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Journal Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{journalEntries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Active Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{insightEntries.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {journalEntries.slice(0, 3).map(entry => (
                  <div key={entry.id} className="border-l-2 border-blue-200 pl-3">
                    <div className="font-medium">{entry.title || 'Journal Entry'}</div>
                    <div className="text-sm text-gray-600">{formatDate(entry.created_at)}</div>
                  </div>
                ))}
                {journalEntries.length === 0 && (
                  <div className="text-gray-500 text-sm">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Client Reports</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate New Report
            </Button>
          </div>
          <div className="grid gap-4">
            {clientReports.map(report => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{report.report_name || report.request_type}</h4>
                      <p className="text-sm text-gray-600">{report.request_type}</p>
                      <p className="text-sm text-gray-500">{formatDate(report.created_at)}</p>
                    </div>
                    <Badge variant={report.response_status === 200 ? 'default' : 'secondary'}>
                      {report.response_status === 200 ? 'completed' : 'processing'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {clientReports.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No reports generated yet
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="journal" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Journal Entries</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </div>
          <div className="space-y-4">
            {journalEntries.map(entry => (
              <Card key={entry.id}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{entry.title || 'Journal Entry'}</h4>
                      <span className="text-sm text-gray-500">{formatDate(entry.created_at)}</span>
                    </div>
                    <p className="text-gray-700">{entry.entry_text}</p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-2">
                        {entry.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {journalEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No journal entries yet
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <h3 className="text-lg font-semibold">AI-Generated Insights</h3>
          <div className="space-y-4">
            {insightEntries.map(insight => (
              <Card key={insight.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getInsightIcon(insight.type)}
                        <h4 className="font-semibold">{insight.title || 'Insight'}</h4>
                      </div>
                      {insight.confidence_score && (
                        <Badge variant="secondary">{insight.confidence_score}% confidence</Badge>
                      )}
                    </div>
                    <p className="text-gray-700">{insight.content}</p>
                    <div className="text-sm text-gray-500">{formatDate(insight.created_at)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {insightEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No insights generated yet
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDashboard;
