module.exports = {
  apps: [
    {
      name: 'srcbot',
      script: './dist/index.js',
      watch: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
