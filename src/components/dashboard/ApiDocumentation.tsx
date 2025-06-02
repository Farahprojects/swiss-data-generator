
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="relative mt-2 mb-4 w-full min-w-0 overflow-hidden">
      {title && <h5 className="text-sm font-medium text-gray-700 mb-1">{title}</h5>}
      <div className="bg-gray-900 rounded-t-md py-2 px-4 text-xs text-gray-300 flex justify-between items-center">
        <span>{language.toUpperCase()}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(code, id)}
          className="h-6 px-2 text-gray-400 hover:text-white flex-shrink-0"
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
      <div className="bg-gray-900 text-gray-100 p-4 rounded-b-md overflow-x-auto min-w-0">
        <pre className="text-sm whitespace-pre min-w-0">
          <code className="break-all">{code}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 w-full min-w-0 overflow-hidden">
      <div className="prose max-w-none w-full min-w-0">
        <h1 className="text-3xl font-bold mb-6">Theria Astrology API Documentation</h1>
        
        <p className="mb-6">
          Welcome to the <strong>Theria Astrology API</strong>, designed to provide accurate astrological data effortlessly. 
          This documentation clearly explains each endpoint with straightforward examples to help you get started quickly.
        </p>
        
        <hr className="my-6" />
        
        <h3 className="text-xl font-semibold mb-4">General Information</h3>
        
        <div className="space-y-2 mb-4">
          <p><strong>Base URL</strong>: <code className="bg-gray-100 px-1 rounded break-all">https://api.theriaapi.com/api</code></p>
          <p><strong>Request Format</strong>: JSON</p>
          <p><strong>Response Format</strong>: JSON</p>
        </div>
        
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
        <div className="bg-gray-100 p-2 rounded mb-3 overflow-x-auto min-w-0">
          <code className="text-sm break-all">{`POST https://api.theriaapi.com/swiss/natal`}</code>
        </div>
        
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
  "location": "Perth, Australia",
  "bearer": "yourtheriaapikeyhere"
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
  "bearer": "yourtheriaapikeyhere",
  "settings": {
    "house_system": "W",
    "orb_degrees": { "planets": 5 }
  }
}`}
        />
        
        <div className="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-gray-50">
          <h5 className="text-lg font-semibold text-gray-900 mb-3">House System Codes Reference</h5>
          <p className="text-gray-700 mb-4">
            Use a single uppercase letter code in the <code className="bg-gray-200 px-2 py-1 rounded text-sm">house_system</code> field. 
            Default is <code className="bg-gray-200 px-2 py-1 rounded text-sm">P</code> (Placidus) if omitted.
          </p>
          
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="w-16 font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">House System</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold">Notes / Synonyms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">P</TableCell>
                  <TableCell>Placidus</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">default in most Western software</TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">K</TableCell>
                  <TableCell>Koch</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">O</TableCell>
                  <TableCell>Porphyry</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">R</TableCell>
                  <TableCell>Regiomontanus</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">C</TableCell>
                  <TableCell>Campanus</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">A/E</TableCell>
                  <TableCell>Equal (cusp 1 = Ascendant)</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">interchangeable letters</TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">W</TableCell>
                  <TableCell>Whole-sign</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">30° signs; cusp 1 = Asc sign</TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">B</TableCell>
                  <TableCell>Alcabitius</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">V</TableCell>
                  <TableCell>Vehlow (equal)</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">Asc on cusp 1</TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">T</TableCell>
                  <TableCell>Polich/Page ("Topocentric")</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">M</TableCell>
                  <TableCell>Morinus</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">S</TableCell>
                  <TableCell>Sripati</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">Topocentric variant</TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">G</TableCell>
                  <TableCell>Gauquelin sectors</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">U</TableCell>
                  <TableCell>Krusinski-Pisa-Goelzer</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">Meridian-based</TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">X</TableCell>
                  <TableCell>Axial rotation / Meridian / Zariel</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">H</TableCell>
                  <TableCell>Horizontal / Azimuthal</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">F</TableCell>
                  <TableCell>Carter "Poli-Equatorial"</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">D</TableCell>
                  <TableCell>Equal-MC (cusp 10 = MC)</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">N</TableCell>
                  <TableCell>Equal, house 1 = 0° Aries</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">L</TableCell>
                  <TableCell>Pullen SD (Sinusoidal Δ)</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">ex Neo-Porphyry</TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">Q</TableCell>
                  <TableCell>Pullen SR (Sinusoidal Ratio)</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">Y</TableCell>
                  <TableCell>APC ("Ram" school)</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600"></TableCell>
                </TableRow>
                <TableRow className="border-gray-100">
                  <TableCell className="font-mono bg-gray-100">I/i</TableCell>
                  <TableCell>Sunshine (Makransky)</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">two numerical variants</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        
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
  "location": "Perth, Australia",
  "bearer": "yourtheriaapikeyhere"
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
  "location": "Perth, Australia",
  "bearer": "yourtheriaapikeyhere"
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
  "bearer": "yourtheriaapikeyhere",
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
    </div>
  );
};
