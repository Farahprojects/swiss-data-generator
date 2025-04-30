
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ApiDocumentation: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CodeBlock = ({ 
    code, 
    id, 
    title, 
    language = "json" 
  }: { 
    code: string; 
    id: string; 
    title?: string; 
    language?: string;
  }) => (
    <div className="relative mt-2 mb-4">
      {title && <h5 className="text-sm font-medium text-gray-700 mb-1">{title}</h5>}
      <div className="bg-gray-900 rounded-t-md py-2 px-4 text-xs text-gray-300 flex justify-between items-center">
        <span>{language.toUpperCase()}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(code, id)}
          className="h-6 px-2 text-gray-400 hover:text-white"
        >
          {copiedSection === id ? (
            <span className="flex items-center">
              <Check className="h-3 w-3 mr-1" /> Copied!
            </span>
          ) : (
            <span className="flex items-center">
              <Copy className="h-3 w-3 mr-1" /> Copy
            </span>
          )}
        </Button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-md overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="prose max-w-none">
        <h1 className="text-3xl font-bold mb-6">Theria Astrology API Documentation</h1>
        
        <p className="mb-6">
          Welcome to the <strong>Theria Astrology API</strong>, designed to provide accurate astrological data effortlessly. 
          This documentation clearly explains each endpoint with straightforward examples to help you get started quickly.
        </p>
        
        <hr className="my-6" />
        
        <h3 className="text-xl font-semibold mb-4">General Information</h3>
        
        <p className="mb-2"><strong>Base URL</strong>: https://api.theriaapi.com/api</p>
        <p className="mb-2"><strong>Request Format</strong>: JSON</p>
        <p className="mb-2"><strong>Response Format</strong>: JSON</p>
        
        <p className="mb-4">Include these headers in each request:</p>
        <CodeBlock 
          id="headers" 
          code={`Content-Type: application/json
Accept: application/json
Authorization: Bearer yourtheriaapikeyhere`}
          language="bash"
        />
        
        <hr className="my-6" />
        
        <h3 className="text-2xl font-semibold mb-4">API Endpoints</h3>
        
        <h4 className="text-xl font-semibold mb-3">1. Natal Chart</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /natal`}</p>
        
        <p className="mb-4">Get birth chart details including planets, houses, aspects, and angles.</p>
        
        <CodeBlock
          id="natal-request"
          title="Request Headers"
          code={`{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer yourtheriaapikeyhere"
}`}
        />
        
        <CodeBlock
          id="natal-body"
          title="Request Body"
          code={`{
  "birth_date": "1977-07-25",
  "birth_time": "11:30",
  "location": "Perth, Australia"
}`}
        />
        
        <CodeBlock
          id="natal-advanced"
          title="Advanced (coordinates & sidereal)"
          code={`{
  "birth_date": "1977-07-25",
  "birth_time": "11:30",
  "lat": -31.95,
  "lon": 115.86,
  "sidereal": true,
  "settings": {
    "house_system": "W",
    "orb_degrees": { "planets": 5 }
  }
}`}
        />
        
        <p className="mb-2"><strong>Vedic Natal Chart</strong> ({`POST /natal/vedic`})</p>
        
        <p className="mb-2">You can also use the explicitly sidereal (Vedic Astrology) endpoint:</p>
        
        <CodeBlock
          id="vedic-request"
          title="Request Headers"
          code={`{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer yourtheriaapikeyhere"
}`}
        />
        
        <CodeBlock
          id="vedic-body"
          title="Request Body"
          code={`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia"
}`}
        />
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">2. Current Transits</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /transits`}</p>
        
        <p className="mb-4">Returns current planetary transits and their aspects to the natal chart.</p>
        
        <CodeBlock
          id="transits-request"
          title="Request Headers"
          code={`{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer yourtheriaapikeyhere"
}`}
        />
        
        <CodeBlock
          id="transits-body"
          title="Request Body"
          code={`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia"
}`}
        />
        
        <CodeBlock
          id="transits-advanced"
          title="Advanced (custom datetime & sidereal)"
          code={`{
  "birth_date": "1977-07-25",
  "lat": -31.95,
  "lon": 115.86,
  "sidereal": true,
  "transit_date": "2025-04-30",
  "transit_time": "10:00"
}`}
        />
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">3. Secondary Progressions</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /progressions`}</p>
        
        <p className="mb-4">Calculate progressed chart positions and their aspects.</p>
        
        <CodeBlock
          id="progressions-request"
          title="Request Headers"
          code={`{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer yourtheriaapikeyhere"
}`}
        />
        
        <CodeBlock
          id="progressions-body"
          title="Request Body"
          code={`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia"
}`}
        />
        
        <CodeBlock
          id="progressions-advanced"
          title="Advanced (chosen date & sidereal)"
          code={`{
  "birth_date": "1977-07-25",
  "lat": -31.95,
  "lon": 115.86,
  "sidereal": true,
  "progressed_date": "2025-04-30"
}`}
        />
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">4. Synastry (Relationship Compatibility)</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /synastry`}</p>
        
        <p className="mb-4">Analyze relationship compatibility through synastry aspects and composite charts.</p>
        
        <CodeBlock
          id="synastry-request"
          title="Request Headers"
          code={`{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer yourtheriaapikeyhere"
}`}
        />
        
        <CodeBlock
          id="synastry-body"
          title="Request Body"
          code={`{
  "person_a": {
    "birth_date": "1977-07-25",
    "location": "Perth, Australia"
  },
  "person_b": {
    "birth_date": "1985-02-14",
    "location": "London, UK"
  }
}`}
        />
        
        <CodeBlock
          id="synastry-advanced"
          title="Advanced (coordinates & sidereal)"
          code={`{
  "person_a": {
    "birth_date": "1977-07-25",
    "lat": -31.95,
    "lon": 115.86,
    "sidereal": true
  },
  "person_b": {
    "birth_date": "1985-02-14",
    "lat": 51.51,
    "lon": -0.13,
    "sidereal": true
  }
}`}
        />
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">5. Real-Time Planetary Positions</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`GET /positions`}</p>
        
        <p className="mb-4">Get precise planetary positions at a given UTC time.</p>
        
        <p className="mb-2"><strong>Request Examples:</strong></p>
        <CodeBlock
          id="positions-example"
          code={`// Example 1
GET https://api.theriaapi.com/api/positions?utc=2025-04-30T00:00:00Z
Authorization: Bearer yourtheriaapikeyhere

// Example 2
GET https://api.theriaapi.com/api/positions?utc=2025-04-30T00:00:00Z&sidereal=true
Authorization: Bearer yourtheriaapikeyhere`}
          language="bash"
        />
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">6. Moon Phases</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`GET /moonphases`}</p>
        
        <p className="mb-4">Retrieve all moon phases (new, quarter, full) for the selected year.</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <CodeBlock
          id="moonphases-example"
          code={`GET https://api.theriaapi.com/api/moonphases?year=2025
Authorization: Bearer yourtheriaapikeyhere`}
          language="bash"
        />
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">7. Planetary Return Charts</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /return`}</p>
        
        <p className="mb-4">Calculate exact return time for Solar, Lunar, Saturn, or Jupiter returns.</p>
        
        <CodeBlock
          id="return-request"
          title="Request Headers"
          code={`{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer yourtheriaapikeyhere"
}`}
        />
        
        <CodeBlock
          id="return-body"
          title="Request Body"
          code={`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia",
  "type": "solar"
}`}
        />
        
        <CodeBlock
          id="return-advanced"
          title="Advanced (coordinates, year, sidereal)"
          code={`{
  "birth_date": "1977-07-25",
  "lat": -31.95,
  "lon": 115.86,
  "sidereal": true,
  "type": "lunar",
  "year": 2026
}`}
        />
        
        <hr className="my-6" />
        
        <h3 className="text-xl font-semibold mb-4">Further Information</h3>
        
        <p className="mb-4">
          This document serves as the definitive guide for integrating Theria API into your applications, 
          SDKs, or Postman collections.
        </p>
        
        <p className="mb-4">
          For further assistance or clarification, please contact our support team directly.
        </p>
      </div>
    </Card>
  );
};
