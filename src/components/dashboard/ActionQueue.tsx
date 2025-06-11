
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare, AlertCircle, FileText } from "lucide-react";
import { ActionItem } from "@/services/dashboard";
import { useNavigate } from "react-router-dom";

interface ActionQueueProps {
  actionItems: ActionItem[];
  loading: boolean;
  onActionClick: (item: ActionItem) => void;
}

export const ActionQueue = ({ actionItems, loading, onActionClick }: ActionQueueProps) => {
  const navigate = useNavigate();

  const getItemIcon = (type: ActionItem['type']) => {
    switch (type) {
      case 'new_journal':
        return Brain;
      case 'quiet_client':
        return MessageSquare;
      case 'overdue_report':
        return FileText;
      case 'pending_insight':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/dashboard/clients/${clientId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Action Queue</CardTitle>
          <CardDescription>Loading your priority actions...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                  <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Action Queue
        </CardTitle>
        <CardDescription>
          Priority actions that need your attention - {actionItems.length} item{actionItems.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actionItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No pending actions at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.map((item) => {
              const Icon = getItemIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                          {item.priority}
                        </Badge>
                        {item.daysAgo && (
                          <span className="text-xs text-gray-500">
                            {item.daysAgo} day{item.daysAgo !== 1 ? 's' : ''} ago
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Client: {item.clientName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClient(item.clientId)}
                    >
                      View Client
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onActionClick(item)}
                    >
                      {item.actionLabel}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
