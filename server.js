require("dotenv").config();

const app = require("./src/app");
const prisma = require("./src/config/prisma");
const { startMonitorJob } = require("./src/jobs/monitor.job");
const { startCleanupJob } = require("./src/jobs/cleanup.job");
const redis= require("./src/config/redis.js");


const PORT = process.env.PORT || 8000;

const BACKEND_URL = process.env.BACKEND_URL;
const PING_INTERVAL = 30 * 1000; // 30 seconds

// to keep render prevented from sleep
function startKeepAlive() {
    if (process.env.NODE_ENV !== "production" || !BACKEND_URL) return;

    setInterval(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/health`);
            console.log(`[keep-alive] Ping successful: ${res.status}`);
        } catch (err) {
            console.error("[keep-alive] Ping failed:", err.message);
        }
    }, PING_INTERVAL);

    console.log("[keep-alive] Started (30s interval)");
}

async function startServer() {
    try {
        await prisma.$connect();

        console.log(" Database Connected");

        startMonitorJob();
        startCleanupJob();

        app.listen(PORT, () => {
            console.log(`Server running on http://0.0.0.0:${PORT}`);

            Start keep-alive after server starts
            startKeepAlive();
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

async function testRedis() {
  await redis.set("test", "Hello Redis");
  const value = await redis.get("test");

  console.log("Redis Test:", value);
}

testRedis();

startServer();
