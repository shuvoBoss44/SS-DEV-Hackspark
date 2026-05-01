require("dotenv").config({ path: "../.env" });
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.get('/status', async (req, res) => {
    const services = [
        { name: 'user-service', url: 'http://user-service:8001/status' },
        { name: 'rental-service', url: 'http://rental-service:8002/status' },
        { name: 'analytics-service', url: 'http://analytics-service:8003/status' },
        { name: 'agentic-service', url: 'http://agentic-service:8004/status' }
    ];

    const statuses = await Promise.all(services.map(async (service) => {
        try {
            const response = await fetch(service.url, { signal: AbortSignal.timeout(2000) });
            return { [service.name]: response.ok ? 'up' : 'down' };
        } catch (e) {
            return { [service.name]: 'down' };
        }
    }));

    const aggregated = Object.assign({}, ...statuses);
    const allUp = Object.values(aggregated).every(status => status === 'up');

    res.status(allUp ? 200 : 207).json({
        gateway: 'up',
        services: aggregated
    });
});

// Set up proxy routing to backend microservices using pathFilter to preserve full paths
app.use(createProxyMiddleware({ pathFilter: '/rentals', target: 'http://rental-service:8002', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/users', target: 'http://user-service:8001', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/analytics', target: 'http://analytics-service:8003', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/intelligence', target: 'http://agentic-service:8004', changeOrigin: true }));

app.listen((process.env.PORT || process.env.GATEWAY_PORT || 3000), () => {
    console.log(`API Gateway is running on port ${(process.env.PORT || process.env.GATEWAY_PORT || 3000)}`);
});
