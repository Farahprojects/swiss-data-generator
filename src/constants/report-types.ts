
import { ReportTypeOption } from '@/types/public-report';
import { User, Heart, Target, Calendar, Brain, Briefcase } from 'lucide-react';

export const reportTypes: ReportTypeOption[] = [
  { value: 'sync', label: 'Compatibility Report' },
  { value: 'essence', label: 'The Self Report' },
  { value: 'flow', label: 'Flow Report' },
  { value: 'mindset', label: 'Mindset Report' },
  { value: 'monthly', label: 'Energy Month Report' },
  { value: 'focus', label: 'Focus Report' },
];

export const relationshipTypes: ReportTypeOption[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
];

export const essenceTypes: ReportTypeOption[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
  { value: 'relational', label: 'Relational' },
];

// Main report categories - shared between mobile and desktop
export const reportCategories = [
  {
    value: 'the-self',
    title: 'The Self',
    description: 'Unlock your authentic self and discover your hidden potential',
    icon: User,
    reportType: 'essence',
  },
  {
    value: 'compatibility',
    title: 'Compatibility',
    description: 'Discover relationship dynamics and unlock deeper connections',
    icon: Heart,
    reportType: 'sync',
  },
  {
    value: 'snapshot',
    title: 'Snapshot',
    description: 'Perfect timing insights for your current life chapter',
    icon: Target,
    reportType: 'focus',
  },
];

// Snapshot subcategories
export const snapshotSubCategories = [
  {
    value: 'focus',
    title: 'Focus',
    description: 'Optimal timing insights for peak productivity and clarity',
    icon: Target,
    reportType: 'focus',
  },
  {
    value: 'monthly',
    title: 'Monthly Energy',
    description: 'Your personal energy forecast and monthly momentum guide',
    icon: Calendar,
    reportType: 'monthly',
  },
  {
    value: 'mindset',
    title: 'Mindset',
    description: 'Mental clarity insights and unlock your cognitive patterns',
    icon: Brain,
    reportType: 'mindset',
  },
];

// Detailed essence types with icons and descriptions
export const detailedEssenceTypes = [
  {
    value: 'personal',
    title: 'Personal',
    description: 'Deep self-awareness and unlock your authentic potential',
    icon: User,
  },
  {
    value: 'professional',
    title: 'Professional',
    description: 'Career mastery and unlock your professional strengths',
    icon: Briefcase,
  },
  {
    value: 'relational',
    title: 'Relational',
    description: 'Master connections and deepen your relationship',
    icon: Heart,
  },
];

// Detailed relationship types with icons and descriptions
export const detailedRelationshipTypes = [
  {
    value: 'personal',
    title: 'Personal',
    description: 'Romantic chemistry and build deeper personal bonds',
    icon: Heart,
  },
  {
    value: 'professional',
    title: 'Professional',
    description: 'Unlock powerful collaboration dynamics with a team',
    icon: Briefcase,
  },
];
