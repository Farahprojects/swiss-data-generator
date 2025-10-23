# Swiss Data Generator

A streamlined astrology data generation app that provides raw astrological data output in JSON format for AI applications.

## Features

- **Swiss Ephemeris Data Generation**: Generate accurate astrological data using Swiss Ephemeris
- **Simple Form Interface**: Clean, minimal form for data input
- **JSON Output**: Raw astro data in JSON format - ready to copy/paste into your AI app
- **System Prompt Library**: Pre-built system prompts to get started quickly
- **Annual Subscription**: $30/year for unlimited data generation
- **User Authentication**: Secure sign-in and account management
- **Modern UI**: Elegant, minimal Apple-style interface

## What This App Does

1. **Sign In** - Simple authentication system
2. **Generate Data** - Fill in birth details (date, time, location)
3. **Get JSON** - Receive raw Swiss ephemeris data in JSON format
4. **Copy & Use** - Paste the data directly into your AI application

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (minimal, Apple-style aesthetic)
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Payments**: Stripe ($30/year subscription)
- **Astro Engine**: Swiss Ephemeris via translator-edge function

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (`.env.local`)
4. Run development server: `npm run dev`

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Core Edge Functions

- `translator-edge` - Swiss ephemeris translator and data processor
- `swiss` - API gateway with authentication
- Stripe subscription handlers

## License

Private project - All rights reserved.
