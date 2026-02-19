module.exports = {
  apps: [
    {
      name: "grassroots-dev",
      script: "npm",
      args: "run dev",
      watch: false,
      ignore_watch: ["node_modules", "dist", "build-output.txt"],
      max_memory_restart: "500M",
      error_file: "./logs/dev-error.log",
      out_file: "./logs/dev-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 5000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "development"
      }
    },
    {
      name: "grassroots-backend",
      cwd: "./backend",
      script: "server.js",
      watch: false,
      ignore_watch: ["node_modules", "../dist"],
      max_memory_restart: "300M",
      error_file: "../logs/backend-error.log",
      out_file: "../logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 5000,
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
