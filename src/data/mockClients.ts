
import { Client, ClientReport, JournalEntry, ClientInsight } from '@/types/clients';

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Sarah Williams',
    email: 'sarah.williams@email.com',
    phone: '+1 (555) 123-4567',
    birthDate: '1990-03-15',
    birthTime: '14:30',
    birthLocation: 'New York, NY, USA',
    notes: 'Interested in career transition and personal growth',
    tags: ['career', 'leadership', 'growth'],
    reportsCount: 12,
    lastActivity: '2024-01-15T10:30:00Z',
    createdAt: '2023-08-20T09:00:00Z',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b6d7?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 987-6543',
    birthDate: '1985-07-22',
    birthTime: '08:45',
    birthLocation: 'San Francisco, CA, USA',
    notes: 'Executive coaching focus, stress management',
    tags: ['executive', 'stress', 'productivity'],
    reportsCount: 8,
    lastActivity: '2024-01-12T15:45:00Z',
    createdAt: '2023-10-05T11:20:00Z',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@email.com',
    birthDate: '1992-11-08',
    birthTime: '19:20',
    birthLocation: 'Austin, TX, USA',
    notes: 'Creative blocks and artistic expression',
    tags: ['creativity', 'art', 'inspiration'],
    reportsCount: 6,
    lastActivity: '2024-01-10T12:15:00Z',
    createdAt: '2023-11-12T14:30:00Z',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: '4',
    name: 'David Thompson',
    email: 'david.thompson@email.com',
    phone: '+1 (555) 456-7890',
    birthDate: '1988-05-14',
    birthTime: '11:10',
    birthLocation: 'Chicago, IL, USA',
    notes: 'Relationship coaching and communication skills',
    tags: ['relationships', 'communication', 'growth'],
    reportsCount: 15,
    lastActivity: '2024-01-14T16:20:00Z',
    createdAt: '2023-07-15T10:45:00Z',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: '5',
    name: 'Lisa Park',
    email: 'lisa.park@email.com',
    birthDate: '1995-09-30',
    birthLocation: 'Seattle, WA, USA',
    notes: 'Recent graduate, career direction unclear',
    tags: ['career', 'young-professional', 'direction'],
    reportsCount: 3,
    lastActivity: '2024-01-08T09:30:00Z',
    createdAt: '2024-01-01T13:15:00Z',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face'
  }
];

export const mockClientReports: ClientReport[] = [
  {
    id: 'r1',
    clientId: '1',
    title: 'Career Transition Analysis',
    type: 'Professional Development',
    createdAt: '2024-01-15T10:30:00Z',
    status: 'completed'
  },
  {
    id: 'r2',
    clientId: '1',
    title: 'Leadership Potential Assessment',
    type: 'Leadership',
    createdAt: '2024-01-10T14:20:00Z',
    status: 'completed'
  },
  {
    id: 'r3',
    clientId: '2',
    title: 'Executive Stress Management',
    type: 'Wellness',
    createdAt: '2024-01-12T15:45:00Z',
    status: 'completed'
  },
  {
    id: 'r4',
    clientId: '3',
    title: 'Creative Expression Analysis',
    type: 'Creativity',
    createdAt: '2024-01-10T12:15:00Z',
    status: 'completed'
  }
];

export const mockJournalEntries: JournalEntry[] = [
  {
    id: 'j1',
    clientId: '1',
    title: 'Breakthrough in confidence',
    content: 'Sarah mentioned feeling much more confident in team meetings after our last session. She spoke up three times in the executive meeting yesterday.',
    tags: ['breakthrough', 'confidence'],
    linkedReportId: 'r2',
    createdAt: '2024-01-16T09:15:00Z'
  },
  {
    id: 'j2',
    clientId: '2',
    title: 'Stress management techniques working',
    content: 'Michael reported that the breathing exercises from our session are helping him manage pressure during board presentations.',
    tags: ['progress', 'stress-management'],
    linkedReportId: 'r3',
    createdAt: '2024-01-13T11:30:00Z'
  },
  {
    id: 'j3',
    clientId: '1',
    title: 'Career direction clarity',
    content: 'After reviewing the career transition report, Sarah is leaning towards the product management role rather than staying in engineering.',
    tags: ['career', 'decision'],
    linkedReportId: 'r1',
    createdAt: '2024-01-15T16:45:00Z'
  }
];

export const mockClientInsights: ClientInsight[] = [
  {
    id: 'i1',
    clientId: '1',
    type: 'opportunity',
    title: 'Leadership Readiness Peak',
    description: 'Based on recent reports and journal entries, Sarah shows strong indicators for leadership roles. Current confidence levels suggest optimal timing for promotion discussions.',
    confidence: 85,
    createdAt: '2024-01-16T10:00:00Z'
  },
  {
    id: 'i2',
    clientId: '2',
    type: 'recommendation',
    title: 'Stress Pattern Intervention',
    description: 'Michael\'s stress levels peak during Q-end periods. Recommend proactive stress management sessions before Q2 ends.',
    confidence: 78,
    createdAt: '2024-01-14T14:20:00Z'
  },
  {
    id: 'i3',
    clientId: '3',
    type: 'pattern',
    title: 'Creative Cycle Recognition',
    description: 'Emily\'s creative output shows a 3-week cycle. Current data suggests she\'s entering a high-creativity phase.',
    confidence: 72,
    createdAt: '2024-01-11T16:30:00Z'
  }
];
