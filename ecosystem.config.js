module.exports = {
  apps: [
    {
      name: "msfd-tg-bot",
      script: "dist/index.js",
      watch: false,
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
