require('dotenv').config();

const config = {
  development: {
    database: {
      type: process.env.DB_TYPE || 'sqlite',
      sqlite: {
        filename: './database.sqlite'
      },
      postgresql: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'grassroots_hub',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    },
    server: {
      port: process.env.PORT || 3001,
      jwtSecret: process.env.JWT_SECRET || 'grassroots-hub-secret-key'
    },
    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD
    },
    maps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY
    }
  },

  production: {
    database: {
      type: 'postgresql',
      postgresql: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 30,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    },
    server: {
      port: process.env.PORT || 3001,
      jwtSecret: process.env.JWT_SECRET
    },
    email: {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD
    },
    maps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY
    }
  }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
