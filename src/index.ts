import { Hono } from 'hono'
import { getUserInfo } from './services/user_info'

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', (c) => c.json({ status: 'ok', time: new Date() }))


app.post('/user-info', async (c) => {
  try {
    console.log('=== API ENDPOINT HIT ===')

    const body = await c.req.json().catch(() => ({}))
    console.log('Request body:', body)

    // Get client IP (considering proxy)
    const clientIP =
      c.req.header('X-Real-IP') ||
      c.req.header('X-Forwarded-For') ||
      c.req.header('CF-Connecting-IP') ||
      '8.8.8.8' // fallback for testing

    const userAgent = c.req.header('User-Agent') || ''
    const acceptLanguage = c.req.header('Accept-Language') || ''

    console.log('Client IP:', clientIP)
    console.log('User Agent:', userAgent)
    console.log('Coordinates:', body.latitude, body.longitude)

    // Collect comprehensive user information
    const userInfo = await getUserInfo({
      ip: clientIP,
      userAgent,
      latitude: body.latitude,
      longitude: body.longitude,
      acceptLanguage,
      timestamp: new Date().toISOString()
    })

    console.log('=== USER INFO RESULT ===')
    console.log(JSON.stringify(userInfo, null, 2))

    return c.json({
      success: true,
      data: userInfo
    })

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