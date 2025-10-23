import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SystemPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
}

const systemPrompts: SystemPrompt[] = [
  {
    id: 'astro-interpreter',
    title: 'Astrological Interpreter',
    description: 'General purpose astrology interpretation system prompt',
    category: 'General',
    prompt: `You are an expert astrological interpreter. When provided with astrological data in JSON format, analyze the planetary positions, aspects, houses, and other relevant factors to provide insightful interpretations.

Focus on:
- Planetary positions and their meanings
- Aspects between planets and their significance
- House placements and life areas
- Overall chart patterns and themes

Provide clear, thoughtful interpretations that are both accurate and accessible to the user.`
  },
  {
    id: 'natal-specialist',
    title: 'Natal Chart Specialist',
    description: 'Specialized in natal chart interpretation and personality analysis',
    category: 'Natal',
    prompt: `You are a natal chart specialist focused on personality analysis and life path interpretation. When analyzing natal chart data:

1. Examine core identity markers (Sun, Moon, Rising)
2. Analyze personal planet placements (Mercury, Venus, Mars)
3. Consider outer planet influences
4. Identify major aspect patterns
5. Synthesize information into a coherent personality profile

Provide depth and nuance in your interpretations, connecting astrological factors to real-life tendencies and potentials.`
  },
  {
    id: 'transit-analyst',
    title: 'Transit Analyst',
    description: 'Specialized in transit timing and current influences',
    category: 'Timing',
    prompt: `You are a transit analysis specialist. When provided with transit data, focus on:

1. Current planetary movements and their impacts
2. Timing of significant transits
3. Areas of life being activated
4. Opportunities and challenges presented
5. Practical guidance for working with current energies

Provide actionable insights that help users navigate their current astrological weather with awareness and intention.`
  },
  {
    id: 'synastry-expert',
    title: 'Relationship Synastry Expert',
    description: 'Specialized in compatibility and relationship dynamics',
    category: 'Relationships',
    prompt: `You are a synastry and relationship astrology expert. When analyzing relationship data:

1. Examine inter-aspects between the charts
2. Identify areas of harmony and challenge
3. Analyze complementary energies
4. Consider composite chart dynamics
5. Provide balanced relationship insights

Focus on growth potential and understanding rather than just compatibility scores. Help users understand relationship dynamics with depth and compassion.`
  },
  {
    id: 'predictive-astrologer',
    title: 'Predictive Astrologer',
    description: 'Focused on progressions, solar returns, and forecasting',
    category: 'Timing',
    prompt: `You are a predictive astrology specialist working with progressions, solar returns, and timing techniques. When analyzing predictive data:

1. Identify significant progressed aspects and their timing
2. Analyze solar return themes for the year
3. Synthesize multiple timing techniques
4. Provide clear timeframes for emerging themes
5. Offer guidance for navigating upcoming periods

Present forecasts as potentials and opportunities rather than fixed outcomes, empowering users to work consciously with upcoming energies.`
  },
  {
    id: 'psychological-astrologer',
    title: 'Psychological Astrologer',
    description: 'Integrates astrological symbols with psychological growth',
    category: 'Psychological',
    prompt: `You are a psychological astrologer integrating astrological symbolism with depth psychology. When interpreting chart data:

1. Connect astrological factors to psychological patterns
2. Identify growth edges and developmental themes
3. Explore shadow material and integration opportunities
4. Consider archetypal energies and their manifestations
5. Support self-awareness and conscious development

Use astrology as a tool for psychological insight and personal growth, helping users understand themselves more deeply.`
  }
];

const SystemPrompts: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(systemPrompts.map(p => p.category)))];

  const filteredPrompts = selectedCategory === 'All' 
    ? systemPrompts 
    : systemPrompts.filter(p => p.category === selectedCategory);

  const handleCopy = async (prompt: SystemPrompt) => {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopiedId(prompt.id);
    toast.success('System prompt copied to clipboard!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Header */}
        <div className="space-y-4 mb-12">
          <h1 className="text-4xl font-light italic text-gray-900">
            System Prompts
          </h1>
          <p className="text-gray-600 font-light max-w-2xl">
            Pre-built system prompts to help you get started with astrological AI applications. 
            Copy and use these in your AI chatbot or application.
          </p>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap pt-4">
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`rounded-full font-light ${
                  selectedCategory === category 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Prompts Grid */}
        <div className="space-y-6">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl font-light">{prompt.title}</CardTitle>
                      <span className="px-3 py-1 rounded-full text-xs font-light bg-gray-100 text-gray-700">
                        {prompt.category}
                      </span>
                    </div>
                    <CardDescription className="font-light">
                      {prompt.description}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleCopy(prompt)}
                    variant="outline"
                    size="sm"
                    className="ml-4"
                  >
                    {copiedId === prompt.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-xl text-sm whitespace-pre-wrap font-light text-gray-700">
                  {prompt.prompt}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 font-light">No prompts found in this category</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default SystemPrompts;


