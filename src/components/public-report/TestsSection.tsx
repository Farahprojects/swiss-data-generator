import React, { useState } from "react";
import { TestCard } from "@/components/TestCard";
import ReportCard from "./ReportCard";
import ReportGuideResponsive from "./ReportGuideResponsive";
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
  subDescriptions: string[];
  slug: string;
  time: string;
  color: string;
  imageSrc: string;
}

const testData: Test[] = [
  {
    id: "TheSelf",
    name: "The Self",
    description: "Discover your authentic self across all areas of life",
    subDescriptions: [
      "Personal – Discover insights about your identity, emotions, and natural strengths.",
      "Professional – Understand your career path, purpose, and ambition patterns.",
      "Relational – Explore how you connect, love, and grow with others."
    ],
    slug: "Essence",
    time: "5 min",
    color: "bg-blue-500",
    imageSrc: "/lovable-uploads/f2552227-155d-477d-9c93-ac4eb72b5ddf.png"
  },
  {
    id: "Compatibility",
    name: "Compatibility",
    description: "Understand how your energy aligns with others",
    subDescriptions: [
      "Personal – Compare your chart with a partner or friend to explore chemistry and differences.",
      "Professional – Map out collaboration dynamics and working relationships."
    ],
    slug: "relationships",
    time: "10 min",
    color: "bg-pink-500",
    imageSrc: "/lovable-uploads/71cede7b-0de9-4397-897f-29009a07c012.png"
  },
  {
    id: "AstroData",
    name: "Astro Data",
    description: "Raw planetary data and alignments",
    subDescriptions: [
      "The Self – Raw planetary data and alignments tailored to you.",
      "Compatibility – Synastry and composite charts with no interpretation."
    ],
    slug: "life-shift",
    time: "10 min",
    color: "bg-purple-500",
    imageSrc: "/lovable-uploads/410f6d32-9a00-4def-9f98-9b76bceff492.png"
  },
  {
    id: "SnapShot",
    name: "SnapShot",
    description: "Your personalized forecast and timing guidance",
    subDescriptions: [
      "Focus – A quick energetic check-in on where your attention naturally flows.",
      "Mindset – See how your thinking patterns are currently influenced.",
      "Monthly – A real-time look at how the stars are shaping your month."
    ],
    slug: "Monthly",
    time: "12 min",
    color: "bg-orange-500",
    imageSrc: "/lovable-uploads/62526a29-1fcb-4df9-a3fe-398ec868e224.png"
  },
];

const reportGuides = [
  {
    type: 'The Self',
    icon: <UserCircle className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'The Self Report',
    price: '$10',
    bestFor: 'Self-understanding',
    description: 'A deep snapshot of who you are and what life\'s asking from you right now.',
    details: 'Discover your core personality traits, natural gifts, and current life themes. Perfect for self-reflection and understanding your authentic self.',
    subTypes: [
      'Personal – Discover insights about your identity, emotions, and natural strengths.',
      'Professional – Understand your career path, purpose, and ambition patterns.',
      'Relational – Explore how you connect, love, and grow with others.'
    ]
  },
  {
    type: 'Compatibility',
    icon: <Users className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Compatibility Report',
    price: '$10',
    bestFor: 'Compatibility',
    description: 'How your energy aligns with someone - connection, tension, and flow.',
    details: 'Analyze relationship dynamics, compatibility factors, and areas of harmony or challenge between you and another person.',
    subTypes: [
      'Personal – Compare your chart with a partner or friend to explore chemistry and differences.',
      'Professional – Map out collaboration dynamics and working relationships.'
    ]
  },
  {
    type: 'Astro Data',
    icon: <Target className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'Astro Data Report',
    price: '$3',
    bestFor: 'Raw Data',
    description: 'Raw planetary data and alignments with no interpretation',
    details: 'Get the pure astronomical data and chart information without analysis or commentary.',
    subTypes: [
      'The Self – Raw planetary data and alignments tailored to you.',
      'Compatibility – Synastry and composite charts with no interpretation.'
    ]
  },
  {
    type: 'SnapShot',
    icon: <CalendarDays className="h-5 w-5 text-primary inline-block mr-1" />,
    title: 'SnapShot Report',
    price: '$3',
    bestFor: 'Timing insights',
    description: 'Your personalized forecast and timing guidance',
    details: 'Get focused insights on current energies, mental patterns, and monthly themes.',
    subTypes: [
      'Focus – A quick energetic check-in on where your attention naturally flows.',
      'Mindset – See how your thinking patterns are currently influenced.',
      'Monthly – A real-time look at how the stars are shaping your month.'
    ]
  }
];

export default function TestsSection() {
  const [selectedTest, setSelectedTest] = useState(testData[0]);
  const [showReportGuide, setShowReportGuide] = useState(false);
  const [targetReportType, setTargetReportType] = useState<string | null>(null);
  
  const getReportGuide = (testId: string) => {
    return reportGuides.find(guide => guide.type === testId) || reportGuides[0];
  };

  const handleExploreClick = (testName: string) => {
    setTargetReportType(testName);
    setShowReportGuide(true);
  };

  const handleCloseReportGuide = () => {
    setShowReportGuide(false);
    setTargetReportType(null);
  };
  
  return (
    <div id="tests" className="py-24 bg-gradient-to-b from-gray-50/30 to-white">
      <div className="w-full md:px-4 md:container md:mx-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">AI insights into your mind generated in 2 min</h2>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
              Unlock the deeper patterns behind how you think, lead, and evolve
            </p>
          </div>
          
          {/* Desktop layout - side by side */}
          <div className="hidden md:grid md:grid-cols-12 gap-8 md:items-stretch">
            <div className="md:col-span-6 flex flex-col justify-between">
              <div className="flex flex-col justify-between h-[480px]">
                 {testData.map((test) => (
                   <TestCard
                     key={test.id}
                     title={test.name}
                     description={test.description}
                     subDescriptions={test.subDescriptions}
                     path={test.slug}
                     isActive={selectedTest.id === test.id}
                     onHover={() => setSelectedTest(test)}
                     onExplore={() => handleExploreClick(test.name)}
                     icon={LucideIcons.Sparkles}
                   />
                 ))}
              </div>
            </div>
            
            <div className="md:col-span-6">
              <div className="w-full overflow-hidden rounded-2xl relative shadow-lg h-[480px] mt-4">
                {testData.map((test) => {
                  return (
                    <div 
                      key={test.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${selectedTest.id === test.id ? 'opacity-100' : 'opacity-0'}`}
                    >
                       {test.id === 'TheSelf' ? (
                         <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                           <img 
                             src={test.imageSrc} 
                             alt="The Self Report" 
                             className="w-full h-full object-cover rounded-xl"
                           />
                         </div>
                       ) : test.id === 'Compatibility' ? (
                         <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                           <img 
                             src={test.imageSrc} 
                             alt="Compatibility Report" 
                             className="w-full h-full object-cover rounded-xl"
                           />
                         </div>
                       ) : test.id === 'SnapShot' ? (
                         <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                           <img 
                             src={test.imageSrc} 
                             alt="SnapShot Report" 
                             className="w-full h-full object-cover rounded-xl"
                           />
                         </div>
                       ) : test.id === 'AstroData' ? (
                         <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                           <img 
                             src={test.imageSrc} 
                             alt="Astro Data Report" 
                             className="w-full h-full object-cover rounded-xl"
                           />
                         </div>
                       ) : (
                         <div className="w-full h-full flex items-center justify-center p-4">
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
                         </div>
                       )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile layout - test cards within container */}
          <div className="block md:hidden">
            <div className="space-y-0">
               {testData.map((test) => (
                 <TestCard
                   key={test.id}
                   title={test.name}
                   description={test.description}
                   subDescriptions={test.subDescriptions}
                   path={test.slug}
                   isActive={selectedTest.id === test.id}
                   onHover={() => setSelectedTest(test)}
                   onExplore={() => handleExploreClick(test.name)}
                   icon={LucideIcons.Sparkles}
                 />
               ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile full-width image section - outside containers */}
      <div className="block md:hidden mt-8">
        <div className="w-screen relative -mx-4">
          <div className="w-full overflow-hidden relative shadow-lg h-64">
            {testData.map((test) => {
              return (
                <div 
                  key={test.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${selectedTest.id === test.id ? 'opacity-100' : 'opacity-0'}`}
                >
                   {test.id === 'TheSelf' ? (
                     <div className="w-full h-full bg-white">
                       <img 
                         src={test.imageSrc} 
                         alt="The Self Report" 
                         className="w-full h-full object-cover rounded-r-xl"
                       />
                     </div>
                   ) : test.id === 'Compatibility' ? (
                     <div className="w-full h-full bg-white">
                       <img 
                         src={test.imageSrc} 
                         alt="Compatibility Report" 
                         className="w-full h-full object-cover rounded-r-xl"
                       />
                     </div>
                   ) : test.id === 'SnapShot' ? (
                     <div className="w-full h-full bg-white">
                       <img 
                         src={test.imageSrc} 
                         alt="SnapShot Report" 
                         className="w-full h-full object-cover rounded-r-xl"
                       />
                     </div>
                   ) : test.id === 'AstroData' ? (
                     <div className="w-full h-full bg-white">
                       <img 
                         src={test.imageSrc} 
                         alt="Astro Data Report" 
                         className="w-full h-full object-cover rounded-r-xl"
                       />
                     </div>
                   ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
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
                      </div>
                   )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <ReportGuideResponsive 
        isOpen={showReportGuide} 
        onClose={handleCloseReportGuide}
        targetReportType={targetReportType}
      />
    </div>
  );
}
