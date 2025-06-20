
import React, { useState, useEffect } from "react";
import { TestCard } from "@/components/TestCard";
import { Sparkles } from "lucide-react";

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
    name: "Mindset",
    description: "Understand your core thought patterns",
    slug: "Essence",
    time: "5 min",
    color: "bg-blue-500",
    imageSrc: "/lovable-uploads/ecb5f430-fb5b-4d15-b6ea-fb2735892778.png"
  },
  {
    id: "Sync",
    name: "Sync",
    description: "Understand your interpersonal dynamics",
    slug: "relationships",
    time: "10 min",
    color: "bg-pink-500",
    imageSrc: "/lovable-uploads/d84112e3-9253-4951-b3f0-fb8b2d5920a4.png"
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
    name: "Monthly ",
    description: "Discover your natural professional approach",
    slug: "Monthly ",
    time: "12 min",
    color: "bg-orange-500",
    imageSrc: "/lovable-uploads/ac6e8a17-1dbf-41da-ba3f-534f993947d4.png"
  },
  {
    id: "well-being",
    name: "Well Being",
    description: "Optimize your health and wellness approach",
    slug: "well-being",
    time: "8 min",
    color: "bg-teal-500",
    imageSrc: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "life-shifts",
    name: "Life Shifts",
    description: "Discover what the next 12 months may hold for you",
    slug: "life-shift",
    time: "10 min",
    color: "bg-purple-500",
    imageSrc: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop"
  },
];

export default function TestsSection() {
  const [selectedTest, setSelectedTest] = useState(testData[0]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  useEffect(() => {
    const imagePromises = testData.map((test) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = test.imageSrc;
        img.onload = resolve;
        img.onerror = reject;
      });
    });
    
    Promise.all(imagePromises)
      .then(() => setImagesLoaded(true))
      .catch((err) => console.error("Error preloading images:", err));
  }, []);
  
  return (
    <div id="tests" className="py-16 scroll-snap-center">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-bold text-neutral-800 mb-4">Where Do You Want Growth Right Now?</h2>
            <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
              Unlock the deeper patterns behind how you think, lead, and evolve
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-6 flex flex-col justify-between">
              <div className="space-y-2">
                {testData.map((test) => (
                  <TestCard
                    key={test.id}
                    title={test.name}
                    description=""
                    path={test.slug}
                    isActive={selectedTest.id === test.id}
                    onHover={() => setSelectedTest(test)}
                    icon={Sparkles}
                  />
                ))}
              </div>
            </div>
            
            <div className="md:col-span-6 flex">
              <div className="w-full overflow-hidden rounded-2xl relative shadow-lg" style={{ height: "360px" }}>
                {testData.map((test) => (
                  <img 
                    key={test.id}
                    src={test.imageSrc} 
                    alt={test.name}
                    className={`w-full h-full object-cover absolute transition-opacity duration-500 ${selectedTest.id === test.id ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: "center" }}
                    loading="eager"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
