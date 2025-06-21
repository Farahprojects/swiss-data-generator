
import React, { useState } from "react";
import { TestCard } from "@/components/TestCard";
import ReportCard from "./ReportCard";
import * as LucideIcons from "lucide-react";
import {
  UserCircle,
  Users,
  Brain,
  Repeat,
  Target,
  CalendarDays,
} from 'lucide-react';

interface Test {
  id: string;
  name: string;
  description: string;
  slug: string;
  time: string;
  color: string;
  imageSrc: string;
}

const testData: Test[] = [
  {
    id: "Essence",
    name: "Essence",
    description: "Understand your core thought patterns",
    slug: "Essence",
    time: "5 min",
    color: "bg-blue-500",
    imageSrc: "/lovable-uploads/aa1bc8da-b181-46c3-92ce-7058a107633f.png"
  },
  {
    id: "Sync",
    name: "Sync",
    description: "Understand your interpersonal dynamics",
    slug: "relationships",
    time: "10 min",
    color: "bg-pink-500",
    imageSrc: "/lovable-uploads/71cede7b-0de9-4397-897f-29009a07c012.png"
  },
  {
    id: "Flow",
    name: "Flow",
    description: "Align your career with your cosmic blueprint",
    slug: "Flow",
    time: "15 min",
    color: "bg-green-500",
    imageSrc: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "Monthly",
    name: "Monthly",
    description: "Discover your natural professional approach",
    slug: "Monthly ",
    time: "12 min",
    color: "bg-orange-500",
    imageSrc: "/lovable-uploads/ac6e8a17-1dbf-41da-ba3f-534f993947d4.png"
  },
  {
    id: "Mindset",
    name: "Mindset",
    description: "Optimize your health and wellness approach",
    slug: "well-being",
    time: "8 min",
    color: "bg-teal-500",
    imageSrc: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "Focus",
    name: "Focus",
    description: "Discover what the next 12 months may hold for you",
    slug: "life-shift",
    time: "10 min",
    color: "bg-purple-500",
    imageSrc: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop"
  },
];

const reportGuides = [
  {
    type: 'Essence',
    icon: <UserCircle className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Essence Report',
    price: '$25',
    bestFor: 'Self-understanding',
    description: 'A deep snapshot of who you are and what life\'s asking from you right now.',
    details: 'Discover your core personality traits, natural gifts, and current life themes. Perfect for self-reflection and understanding your authentic self.',
    subTypes: [
      'Personal – Self-awareness, emotional behavior, inner wiring',
      'Professional – How you operate at work: decision-making, productivity, and team dynamics. Useful for hiring, coaching, or leadership insight.', 
      'Relational – How you show up in relationships (patterns, openness, tension)'
    ]
  },
  {
    type: 'Sync',
    icon: <Users className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Sync Report',
    price: '$25',
    bestFor: 'Compatibility',
    description: 'How your energy aligns with someone - connection, tension, and flow.',
    details: 'Analyze relationship dynamics, compatibility factors, and areas of harmony or challenge between you and another person.',
    subTypes: [
      'Personal Sync – Romantic, emotional, or close social connection',
      'Professional Sync – Team dynamics, leadership compatibility, working styles'
    ]
  },
  {
    type: 'Flow',
    icon: <Repeat className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Flow Report',
    price: '$3',
    bestFor: 'Emotional rhythm',
    description: 'Creative/emotional openness over 7 days',
    details: 'Track your creative and emotional rhythms throughout the week to optimize your creative output and emotional well-being.'
  },
  {
    type: 'Monthly',
    icon: <CalendarDays className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Monthly Report',
    price: '$3',
    bestFor: 'Monthly planning',
    description: 'Your personalized forecast for the current month',
    details: 'Get monthly themes, key opportunities, and timing guidance for important decisions and activities.'
  },
  {
    type: 'Mindset',
    icon: <Brain className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Mindset Report',
    price: '$3',
    bestFor: 'Mental clarity',
    description: 'Mood + mental clarity snapshot',
    details: 'Get insights into your current mental state, thought patterns, and cognitive strengths for better decision-making.'
  },
  {
    type: 'Focus',
    icon: <Target className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Focus Report',
    price: '$3',
    bestFor: 'Productivity',
    description: 'Best hours today for deep work or rest',
    details: 'Identify your optimal times for concentration, productivity, and rest based on your personal energy cycles.'
  }
];

export default function TestsSection() {
  const [selectedTest, setSelectedTest] = useState(testData[0]);
  
  const getReportGuide = (testId: string) => {
    return reportGuides.find(guide => guide.type === testId) || reportGuides[0];
  };
  
  return (
    <div id="tests" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-bold text-neutral-800 mb-4">Where Do You Want Growth Right Now?</h2>
            <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
              Unlock the deeper patterns behind how you think, lead, and evolve
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-6">
              <div className="space-y-0">
                {testData.map((test) => (
                  <TestCard
                    key={test.id}
                    title={test.name}
                    description=""
                    path={test.slug}
                    isActive={selectedTest.id === test.id}
                    onHover={() => setSelectedTest(test)}
                    icon={LucideIcons.Sparkles}
                  />
                ))}
              </div>
            </div>
            
            <div className="md:col-span-6">
              <div className="w-full overflow-hidden rounded-2xl relative shadow-lg" style={{ height: "400px" }}>
                {testData.map((test) => {
                  return (
                    <div 
                      key={test.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${selectedTest.id === test.id ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {test.id === 'Essence' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                          <img 
                            src={test.imageSrc} 
                            alt="Essence Report" 
                            className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                          />
                        </div>
                      ) : test.id === 'Sync' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
                          <img 
                            src={test.imageSrc} 
                            alt="Sync Report" 
                            className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                          />
                        </div>
                      ) : (
                        <ReportCard
                          type={getReportGuide(test.id).type}
                          icon={getReportGuide(test.id).icon}
                          title={getReportGuide(test.id).title}
                          price={getReportGuide(test.id).price}
                          bestFor={getReportGuide(test.id).bestFor}
                          description={getReportGuide(test.id).description}
                          details={getReportGuide(test.id).details}
                          subTypes={getReportGuide(test.id).subTypes}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
