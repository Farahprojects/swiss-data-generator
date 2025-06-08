
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, BookOpen, FileText, Lightbulb } from 'lucide-react';
import { Client } from '@/types/database';

interface ClientDetailHeaderProps {
  client: Client | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  journalCount: number;
  reportCount: number;
  isClientInfoOpen: boolean;
  setIsClientInfoOpen: (open: boolean) => void;
  onCreateJournal: () => void;
  onCreateReport: () => void;
  isMobile: boolean;
}

const getAbbreviatedName = (fullName: string) => {
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0];
  }
  const firstName = nameParts[0];
  const lastNameInitial = nameParts[nameParts.length - 1].charAt(0);
  return `${firstName} ${lastNameInitial}.`;
};

export const ClientDetailHeader: React.FC<ClientDetailHeaderProps> = ({
  client,
  activeTab,
  setActiveTab,
  journalCount,
  reportCount,
  isClientInfoOpen,
  setIsClientInfoOpen,
  onCreateJournal,
  onCreateReport,
  isMobile
}) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between py-3 px-4">
        {/* Desktop View */}
        <div className="hidden md:flex items-center gap-4 flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard/clients')}
                className="text-foreground hover:bg-primary/10 hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Clients</TooltipContent>
          </Tooltip>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsClientInfoOpen(!isClientInfoOpen)}
            className="text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary"
          >
            {client && client.full_name}
          </Button>
          
          <div className="flex items-center gap-2 flex-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setActiveTab('journal')}
              className={`text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'journal' ? 'bg-primary/10 text-primary' : ''}`}
            >
              Journals ({journalCount})
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setActiveTab('reports')}
              className={`text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'reports' ? 'bg-primary/10 text-primary' : ''}`}
            >
              Reports ({reportCount})
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setActiveTab('insights')}
              className={`text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'insights' ? 'bg-primary/10 text-primary' : ''}`}
            >
              Insights (0)
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onCreateJournal}
                  className="text-foreground hover:bg-primary/10 hover:text-primary"
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  Journal
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Journal Entry</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onCreateReport}
                  className="text-foreground hover:bg-primary/10 hover:text-primary"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Report
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate Report</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-foreground hover:bg-primary/10 hover:text-primary"
                >
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Insight
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Insight</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex items-center justify-between w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard/clients')}
                className="text-foreground hover:bg-primary/10 hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Clients</TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsClientInfoOpen(!isClientInfoOpen)}
            className="text-sm font-medium truncate flex-1 text-center px-2 hover:bg-primary/10 hover:text-primary"
          >
            {client && getAbbreviatedName(client.full_name)}
          </Button>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveTab('journal')}
                  className={`h-8 w-8 p-0 text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'journal' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  <BookOpen className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Journals ({journalCount})</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveTab('reports')}
                  className={`h-8 w-8 p-0 text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'reports' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reports ({reportCount})</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveTab('insights')}
                  className={`h-8 w-8 p-0 text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'insights' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  <Lightbulb className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insights (0)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
