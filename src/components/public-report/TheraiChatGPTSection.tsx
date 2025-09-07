import React from 'react';
import { ExternalLink } from 'lucide-react';
import { normalizeStorageUrl } from '@/utils/storageUtils';

const TheraiChatGPTSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50/30">
      <div className="w-full md:px-4 md:container md:mx-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image on the left */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white p-8">
                <img 
                  src={normalizeStorageUrl("https://wrvqqvqvwqmfdqvqmaar.supabase.co/storage/v1/object/public/feature-images/phone.png")}
                  alt="Therai Phone Interface"
                  className="w-full h-auto rounded-xl"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Content on the right */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
                  Insights with 
                  <span className="block text-gray-700">Therai</span>
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  Your insights, brought to life — an intelligent conversation that moves with you and stays focused on what matters most.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <h3 className="text-xl font-medium text-gray-900">Instant Deep Analysis</h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <h3 className="text-xl font-medium text-gray-900">Personalized Guidance</h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <h3 className="text-xl font-medium text-gray-900">Works with All Reports</h3>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TheraiChatGPTSection;