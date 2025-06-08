
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mail, Phone, MapPin, Calendar, Clock, Pencil, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Client } from '@/types/database';
import { formatDate } from '@/utils/dateFormatters';

interface ClientInfoCardProps {
  client: Client;
  isOpen: boolean;
  onEditClick: () => void;
  onDeleteClient: () => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  alwaysShowOnDesktop?: boolean;
  isMobile?: boolean;
}

export const ClientInfoCard: React.FC<ClientInfoCardProps> = ({
  client,
  isOpen,
  onEditClick,
  onDeleteClient,
  showDeleteDialog,
  setShowDeleteDialog,
  alwaysShowOnDesktop = false,
  isMobile = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // On mobile, use the original toggle behavior
  if (isMobile && !isOpen) return null;

  // On desktop with alwaysShowOnDesktop, always show but make it collapsible
  if (!isMobile && alwaysShowOnDesktop) {
    return (
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {client.full_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {client.full_name}? This action cannot be undone and will permanently remove all client data, including journal entries and reports.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={onDeleteClient}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Client
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {client.email && (
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-500 mb-1">Email</div>
                      <div className="font-medium break-words break-all">{client.email}</div>
                    </div>
                  </div>
                )}
                
                {client.phone && (
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-500 mb-1">Phone</div>
                      <div className="font-medium">{client.phone}</div>
                    </div>
                  </div>
                )}
                
                {client.birth_date && (
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-500 mb-1">Birth Date</div>
                      <div className="font-medium">{formatDate(client.birth_date)}</div>
                    </div>
                  </div>
                )}
                
                {client.birth_time && (
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-500 mb-1">Birth Time</div>
                      <div className="font-medium">{client.birth_time}</div>
                    </div>
                  </div>
                )}
                
                {client.birth_location && (
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-500 mb-1">Birth Location</div>
                      <div className="font-medium break-words">{client.birth_location}</div>
                    </div>
                  </div>
                )}
              </div>
              
              {client.notes && (
                <div className="mt-6 pt-6 border-t">
                  <div className="mb-2">
                    <h4 className="font-medium text-gray-900">Goals</h4>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed">{client.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  // Fallback to original behavior
  if (!isOpen) return null;

  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {client.full_name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onEditClick}
              className="h-8 w-8 p-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onEditClick}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Client</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {client.full_name}? This action cannot be undone and will permanently remove all client data, including journal entries and reports.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={onDeleteClient}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Client
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {client.email && (
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-500 mb-1">Email</div>
                <div className="font-medium break-words break-all">{client.email}</div>
              </div>
            </div>
          )}
          
          {client.phone && (
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-500 mb-1">Phone</div>
                <div className="font-medium">{client.phone}</div>
              </div>
            </div>
          )}
          
          {client.birth_date && (
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-500 mb-1">Birth Date</div>
                <div className="font-medium">{formatDate(client.birth_date)}</div>
              </div>
            </div>
          )}
          
          {client.birth_time && (
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-500 mb-1">Birth Time</div>
                <div className="font-medium">{client.birth_time}</div>
              </div>
            </div>
          )}
          
          {client.birth_location && (
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-500 mb-1">Birth Location</div>
                <div className="font-medium break-words">{client.birth_location}</div>
              </div>
            </div>
          )}
        </div>
        
        {client.notes && (
          <div className="mt-6 pt-6 border-t">
            <div className="mb-2">
              <h4 className="font-medium text-gray-900">Goals</h4>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{client.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
