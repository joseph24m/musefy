module.exports = {
  apps: [
    {
      name: 'muse-server',
      script: 'src/index.ts',
      cwd: '/home/muse/muse/server',
      interpreter: 'tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/home/muse/logs/err.log',
      out_file: '/home/muse/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
