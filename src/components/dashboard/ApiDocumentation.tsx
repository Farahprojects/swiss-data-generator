
import React from "react";
import { Card } from "@/components/ui/card";

export const ApiDocumentation: React.FC = () => {
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
        
        <p className="mb-2"><strong>Base URL</strong>: Your API base URL</p>
        <p className="mb-2"><strong>Request Format</strong>: JSON</p>
        <p className="mb-2"><strong>Response Format</strong>: JSON</p>
        
        <p className="mb-4">Include these headers in each request:</p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`Content-Type: application/json
Accept: application/json`}
          </code>
        </pre>
        
        <hr className="my-6" />
        
        <h3 className="text-2xl font-semibold mb-4">API Endpoints</h3>
        
        <h4 className="text-xl font-semibold mb-3">1. Natal Chart</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /natal`}</p>
        
        <p className="mb-4">Get birth chart details including planets, houses, aspects, and angles.</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code>
{`{
  "birth_date": "1977-07-25",
  "birth_time": "11:30",
  "location": "Perth, Australia"
}`}
          </code>
        </pre>
        
        <p className="mb-2"><strong>Advanced (coordinates & sidereal):</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code>
{`{
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
          </code>
        </pre>
        
        <p className="mb-2"><strong>Vedic Natal Chart</strong> ({`POST /natal/vedic`})</p>
        
        <p className="mb-2">You can also use the explicitly sidereal (Vedic Astrology) endpoint:</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia"
}`}
          </code>
        </pre>
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">2. Current Transits</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /transits`}</p>
        
        <p className="mb-4">Returns current planetary transits and their aspects to the natal chart.</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code>
{`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia"
}`}
          </code>
        </pre>
        
        <p className="mb-2"><strong>Advanced (custom datetime & sidereal):</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`{
  "birth_date": "1977-07-25",
  "lat": -31.95,
  "lon": 115.86,
  "sidereal": true,
  "transit_date": "2025-04-30",
  "transit_time": "10:00"
}`}
          </code>
        </pre>
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">3. Secondary Progressions</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /progressions`}</p>
        
        <p className="mb-4">Calculate progressed chart positions and their aspects.</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code>
{`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia"
}`}
          </code>
        </pre>
        
        <p className="mb-2"><strong>Advanced (chosen date & sidereal):</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`{
  "birth_date": "1977-07-25",
  "lat": -31.95,
  "lon": 115.86,
  "sidereal": true,
  "progressed_date": "2025-04-30"
}`}
          </code>
        </pre>
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">4. Synastry (Relationship Compatibility)</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /synastry`}</p>
        
        <p className="mb-4">Analyze relationship compatibility through synastry aspects and composite charts.</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code>
{`{
  "person_a": {
    "birth_date": "1977-07-25",
    "location": "Perth, Australia"
  },
  "person_b": {
    "birth_date": "1985-02-14",
    "location": "London, UK"
  }
}`}
          </code>
        </pre>
        
        <p className="mb-2"><strong>Advanced (coordinates & sidereal):</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`{
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
          </code>
        </pre>
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">5. Real-Time Planetary Positions</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`GET /positions`}</p>
        
        <p className="mb-4">Get precise planetary positions at a given UTC time.</p>
        
        <p className="mb-2"><strong>Request Examples:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`/positions?utc=2025-04-30T00:00:00Z
/positions?utc=2025-04-30T00:00:00Z&sidereal=true`}
          </code>
        </pre>
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">6. Moon Phases</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`GET /moonphases`}</p>
        
        <p className="mb-4">Retrieve all moon phases (new, quarter, full) for the selected year.</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`/moonphases?year=2025`}
          </code>
        </pre>
        
        <hr className="my-6" />
        
        <h4 className="text-xl font-semibold mb-3">7. Planetary Return Charts</h4>
        <p className="mb-3 font-mono bg-gray-100 p-1 inline-block">{`POST /return`}</p>
        
        <p className="mb-4">Calculate exact return time for Solar, Lunar, Saturn, or Jupiter returns.</p>
        
        <p className="mb-2"><strong>Request Example:</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code>
{`{
  "birth_date": "1977-07-25",
  "location": "Perth, Australia",
  "type": "solar"
}`}
          </code>
        </pre>
        
        <p className="mb-2"><strong>Advanced (coordinates, year, sidereal):</strong></p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <code>
{`{
  "birth_date": "1977-07-25",
  "lat": -31.95,
  "lon": 115.86,
  "sidereal": true,
  "type": "lunar",
  "year": 2026
}`}
          </code>
        </pre>
        
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
