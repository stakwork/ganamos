# Ganamos! 🌱

Ganamos! is a community-driven platform that incentivizes people to fix issues in their local communities using Bitcoin Lightning Network rewards.

![Ganamos App](public/images/community-fixing.jpg)

## 🚀 Overview

Ganamos! (meaning "We win!" in Spanish) connects people who want to improve their communities. Users can:
- Post issues that need fixing in their neighborhood
- Offer Bitcoin rewards for completed fixes
- Claim and fix issues to earn Bitcoin rewards
- Track community improvements over time

## ✨ Key Features

- **Community Issue Tracking**: Post and browse local issues that need fixing
- **Bitcoin Rewards**: Incentivize community action with Bitcoin Lightning rewards
- **Before/After Verification**: Visual proof of completed fixes
- **Bitcoin Lightning Wallet**: Built-in Lightning wallet for deposits and withdrawals
- **User Profiles**: Track your contributions and earnings
- **Location-Based Discovery**: Find issues near you

## 🛠️ Technologies

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Bitcoin Integration**: Lightning Network via Voltage LND node
- **Authentication**: Google OAuth, Email/Password
- **Styling**: shadcn/ui components

## ⚡ Bitcoin Lightning Integration

Ganamos! uses the Lightning Network for fast, low-fee Bitcoin transactions, powered by [Voltage](https://voltage.cloud):

- **Lightning Node**: Connects to a Voltage-hosted LND node
- **Invoice Generation**: Creates Lightning invoices for deposits
- **Payment Processing**: Processes Lightning payments for withdrawals
- **Balance Management**: Tracks user balances in satoshis (sats)

The integration uses LND REST API with macaroon authentication for secure communication with the Lightning node.

## 🏗️ Project Structure

```
ganamos/
├── app/                  # Next.js app router
│   ├── actions/          # Server actions
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Main dashboard
│   ├── post/             # Issue posting and details
│   ├── profile/          # User profile
│   └── wallet/           # Bitcoin wallet
├── components/           # React components
├── lib/                  # Utility functions
│   ├── lightning.ts      # Lightning Network integration
│   ├── supabase.ts       # Supabase client
│   └── types.ts          # TypeScript types
└── public/               # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Voltage account with LND node (for Lightning functionality)

### Environment Variables

Create a `.env.local` file with the following:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Lightning (Voltage)
LND_REST_URL=your_voltage_lnd_rest_url
LND_ADMIN_MACAROON=your_voltage_admin_macaroon_hex
```

### Installation

1. Clone the repository:
git clone [https://github.com/yourusername/ganamos.git](https://github.com/yourusername/ganamos.git)
cd ganamos
2. Install dependencies:
npm install
3. Run the development server:
npm run dev

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Database Setup

Run the following SQL in your Supabase SQL editor to set up the required tables:

```sql
-- Create profiles table
CREATE TABLE profiles (
id UUID REFERENCES auth.users(id) PRIMARY KEY,
name TEXT,
email TEXT,
balance INTEGER DEFAULT 0,
avatar TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
id UUID PRIMARY KEY,
user_id UUID REFERENCES profiles(id),
title TEXT NOT NULL,
description TEXT,
image_url TEXT,
location TEXT,
reward INTEGER DEFAULT 0,
claimed BOOLEAN DEFAULT FALSE,
claimed_by UUID REFERENCES profiles(id),
claimed_at TIMESTAMP WITH TIME ZONE,
fixed BOOLEAN DEFAULT FALSE,
fixed_at TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES profiles(id),
type TEXT NOT NULL,
amount INTEGER NOT NULL,
status TEXT NOT NULL,
r_hash_str TEXT,
payment_hash TEXT,
payment_request TEXT,
memo TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

## 🔌 Voltage Lightning Setup

1. Create an account on [Voltage](https://voltage.cloud)
2. Create a new LND node
3. Once your node is running:

1. Go to API Access
2. Copy the REST URL and Admin Macaroon (HEX)
3. Add these to your environment variables

## 📱 Features in Development

- QR code scanner for Lightning payments
- User achievements and badges
- Community leaderboards
- Issue categories and filtering
- Image comparison slider for before/after views
- Push notifications for issue updates


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Voltage](https://voltage.cloud) for Lightning Network infrastructure
- [Supabase](https://supabase.com) for backend services
- [Next.js](https://nextjs.org) for the React framework
- [shadcn/ui](https://ui.shadcn.com) for UI components
- [Tailwind CSS](https://tailwindcss.com) for styling
