import { Hono } from 'hono'
import { getUserInfo } from './services/user_info'

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', (c) => c.json({ status: 'ok', time: new Date() }))


app.post('/user-info', async (c) => {
  try {
    const body = await c.req.json();

    const { lat, long } = body;

    const clientIP = c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For') ||
      c.req.header('X-Real-IP') ||
      'unknown';

    const userAgent = c.req.header('User-Agent') || '';

    const userInfo = await getUserInfo({
      ip: clientIP,
      userAgent,
      latitude: lat,
      longitude: long,
      timestamp: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: userInfo
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get user info'
    }, 500);
  }
})

export default {
  port: process.env.PORT || 4000,
  fetch: app.fetch,
} 