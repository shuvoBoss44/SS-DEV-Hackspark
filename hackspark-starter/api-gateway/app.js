require("dotenv").config({ path: "../.env" });
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

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
            return { [service.name]: response.ok ? 'OK' : 'UNREACHABLE' };
        } catch (e) {
            return { [service.name]: 'UNREACHABLE' };
        }
    }));

    const downstream = Object.assign({}, ...statuses);
    const allUp = Object.values(downstream).every(status => status === 'OK');

    res.status(allUp ? 200 : 207).json({
        service: 'api-gateway',
        status: 'OK',
        downstream
    });
});

// Set up proxy routing to backend microservices using pathFilter to preserve full paths
app.use(createProxyMiddleware({ pathFilter: '/rentals', target: 'http://rental-service:8002', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/users', target: 'http://user-service:8001', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/analytics', target: 'http://analytics-service:8003', changeOrigin: true }));
const longProxyOptions = {
    proxyTimeout: 65000,
    timeout: 65000
};

app.use(createProxyMiddleware({ 
    pathFilter: '/intelligence', 
    target: 'http://agentic-service:8004', 
    changeOrigin: true,
    pathRewrite: { '^/intelligence': '' },
    ...longProxyOptions
}));
app.use(createProxyMiddleware({ pathFilter: '/chat', target: 'http://agentic-service:8004', changeOrigin: true, ...longProxyOptions }));

app.listen((process.env.PORT || process.env.GATEWAY_PORT || 3000), () => {
    console.log(`API Gateway is running on port ${(process.env.PORT || process.env.GATEWAY_PORT || 3000)}`);
});
