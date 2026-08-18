import dotenv from 'dotenv';

dotenv.config();

export default {
  port: Number(process.env.PORT || 4000),
  app: {
    deepLinkScheme: process.env.APP_DEEP_LINK_SCHEME || 'emploiplus://',
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  auth: {
    hmacSecret: process.env.MOBILE_TOKEN_SECRET || 'emploiplus-mobile-dev-secret',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'EmploiPlus <noreply@emploiplus-group.com>',
  },
};
