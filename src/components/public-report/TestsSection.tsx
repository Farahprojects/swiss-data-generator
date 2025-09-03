import React, { useState } from "react";
import { TestCard } from "@/components/TestCard";
import ReportCard from "./ReportCard";
import ReportGuideResponsive from "./ReportGuideResponsive";
import * as LucideIcons from "lucide-react";
import { normalizeStorageUrl } from "@/utils/storageUtils";
import {
  UserCircle,
  Users,
  Brain,
  Repeat,
  Target,
  CalendarDays,
} from 'lucide-react';
import { usePricing } from '@/contexts/PricingContext';

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

// Helper function to get live price for report type
const getReportPrice = (reportType: string, getPriceById: any): string => {
  let priceId = '';
  
  switch (reportType) {
    case 'TheSelf': priceId = 'essence_personal'; break;
    case 'Compatibility': priceId = 'sync_personal'; break;
    case 'AstroData': priceId = 'essence'; break;
    case 'SnapShot': priceId = 'focus'; break;
    default: priceId = 'essence_personal';
  }

  const priceData = getPriceById(priceId);
  return priceData ? `$${priceData.unit_price_usd}` : '$--';
};

const getTestDataWithPricing = (getPriceById: any): Test[] => [
  {
    id: "TheSelf",
    name: `The Self ${getReportPrice('TheSelf', getPriceById)}`,
    description: "Uncover insights",
    subDescriptions: [
      "Know yourself",
      "Personal – Professional – Relational"
    ],
    slug: "Essence",
    time: "5 min",
    color: "bg-blue-500",
    imageSrc: normalizeStorageUrl("https://auth.theraiastro.com/storage/v1/object/public/feature-images//waterfall.png")
  },
  {
    id: "Compatibility",
    name: `Compatibility ${getReportPrice('Compatibility', getPriceById)}`,
    description: "Discover synergies",
    subDescriptions: [
      "Connection guide",
      "Personal or Professional"
    ],
    slug: "relationships",
    time: "10 min",
    color: "bg-pink-500",
    imageSrc: normalizeStorageUrl("https://auth.theraiastro.com/storage/v1/object/public/feature-images//hand.png")
  },
  {
    id: "AstroData",
    name: `Astro Data ${getReportPrice('AstroData', getPriceById)}`,
    description: "Raw planetary data and alignments",
    subDescriptions: [
      "Pure facts",
      "The Self – Compatibility"
    ],
    slug: "life-shift",
    time: "10 min",
            color: "bg-gray-900",
    imageSrc: normalizeStorageUrl("https://auth.theraiastro.com/storage/v1/object/public/feature-images//focus.png")
  },
  {
    id: "SnapShot",
    name: `Monthly ${getReportPrice('SnapShot', getPriceById)}`,
    description: "Your personalized forecast and timing guidance",
    subDescriptions: [
      "Month ahead",
      "daily energy swings"
    ],
    slug: "Monthly",
    time: "12 min",
    color: "bg-orange-500",
    imageSrc: normalizeStorageUrl("https://auth.theraiastro.com/storage/v1/object/public/feature-images//month.png")
  },
];


export default function TestsSection() {
  const { getPriceById } = usePricing();
  const testData = getTestDataWithPricing(getPriceById);
  const [selectedTest, setSelectedTest] = useState(testData[0]);
  const [showReportGuide, setShowReportGuide] = useState(false);
  const [targetReportType, setTargetReportType] = useState<string | null>(null);

  // Helper function to get base price for a report type
  const getBasePrice = (reportType: string): string => {
    let priceId = '';
    
    switch (reportType) {
      case 'The Self': priceId = 'essence_personal'; break;
      case 'Compatibility': priceId = 'sync_personal'; break;
      case 'Astro Data': priceId = 'essence'; break;
      case 'SnapShot': priceId = 'focus'; break;
      default: priceId = 'essence_personal';
    }

    const priceData = getPriceById(priceId);
    return priceData ? `$${priceData.unit_price_usd}` : '$--';
  };

  const reportGuides = [
    {
      type: 'The Self',
      icon: <UserCircle className="h-5 w-5 text-primary inline-block mr-1" />,
      title: 'The Self Report',
      price: getBasePrice('The Self'),
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
      price: getBasePrice('Compatibility'),
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
      price: getBasePrice('Astro Data'),
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
      title: 'Monthly Report',
      price: getBasePrice('SnapShot'),
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
            <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-light text-gray-900 mb-6 tracking-tight md:mb-6 sm:mb-4 xs:mb-3">
              AI insights into your mind generated in seconds
            </h2>
            <p className="text-base xs:text-lg sm:text-lg md:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
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
                             alt="Monthly Report" 
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

          {/* Small screen layout - zigzag alternating pattern */}
          <div className="block md:hidden space-y-4">
            {testData.map((test, index) => {
              const isImageFirst = index % 2 === 1;
              return (
                <div key={test.id} className="w-full">
                  {isImageFirst ? (
                    // Image first, then text
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg shadow-lg">
                        <img 
                          src={test.imageSrc} 
                          alt={`${test.name} Report`} 
                          className="w-[110%] h-[110%] object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
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
                          mobileLayout="image-first"
                        />
                      </div>
                    </div>
                  ) : (
                    // Text first, then image
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
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
                          mobileLayout="text-first"
                        />
                      </div>
                      <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg shadow-lg">
                        <img 
                          src={test.imageSrc} 
                          alt={`${test.name} Report`} 
                          className="w-[110%] h-[110%] object-cover rounded-lg"
                        />
                      </div>
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
