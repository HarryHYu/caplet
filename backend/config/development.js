module.exports = {
  database: {
    url: 'sqlite://caplet.db'
  },
  jwt: {
    secret: 'caplet-super-secret-jwt-key-for-development'
  },
  server: {
    port: 5000,
    env: 'development'
  },
  frontend: {
    url: 'http://localhost:5173'
  }
};
