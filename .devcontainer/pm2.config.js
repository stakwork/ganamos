module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm run dev",
      cwd: "/workspaces/ganamos",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        INSTALL_COMMAND: "npm i next@latest",
        PORT: "3457"
      }
    }
  ],
};

// "GROQ_API_KEY":"",
// "X-CMC_PRO_API_KEY":"",
// "NODE_ENV":"",
// "LND_REST_URL":"",
// "LND_ADMIN_MACAROON":"",
// "NEXT_PUBLIC_SUPABASE_URL": "",
// "NEXT_PUBLIC_SUPABASE_ANON_KEY": "",
// "SUPABASE_SERVICE_ROLE_KEY": "",
// "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": "",
// "GOOGLE_MAPS_API_KEY": ""