// src/services/userInfo.ts

interface UserInfoInput {
    ip: string;
    userAgent: string;
    latitude?: number;
    longitude?: number;
    timestamp: string;
    acceptLanguage?: string;
}

interface LocationInfo {
    latitude?: number;
    longitude?: number;
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    postalCode?: string;
    address?: string;        // full display_name from Nominatim
    continent?: string;
    timezone?: {
        id?: string;
        abbr?: string;
        offset?: number;
        isDST?: boolean;
    };
    currency?: {
        code?: string;
        name?: string;
        symbol?: string;
    };
}

interface ISPInfo {
    asn?: number;
    org?: string;
    isp?: string;
    domain?: string;
    provider?: string;
}

interface DeviceInfo {
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    deviceType?: string;
    device?: string;
}

interface UserInfo {
    ip: string;
    userAgent: string;
    acceptLanguage?: string;
    location: LocationInfo;
    isp: ISPInfo;
    device: DeviceInfo;
    timestamp: string;
}

// Enhanced IP information using ipwhois.app (free, more comprehensive)
async function getIPInfo(ip: string): Promise<any> {
    try {
        const response = await fetch(`https://ipwhois.app/json/${ip}?lang=en`);

        if (!response.ok) throw new Error('IPWHOIS lookup failed');
        const data = await response.json();

        if (data.success === false) {
            throw new Error(data.message || 'IPWHOIS lookup failed');
        }

        return data;
    } catch (error) {
        console.error('IPWHOIS error:', error);

        // Fallback to ip-api.com
        try {
            const fallbackResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);

            if (!fallbackResponse.ok) throw new Error('IP lookup failed');
            const fallbackData = await fallbackResponse.json();

            if (fallbackData.status === 'fail') {
                throw new Error(fallbackData.message);
            }

            // Map ip-api.com response to ipwhois.app format
            return {
                country: fallbackData.country,
                country_code: fallbackData.countryCode,
                region: fallbackData.regionName,
                city: fallbackData.city,
                postal: fallbackData.zip,
                latitude: fallbackData.lat,
                longitude: fallbackData.lon,
                timezone: {
                    id: fallbackData.timezone
                },
                isp: fallbackData.isp,
                org: fallbackData.org,
                asn: fallbackData.as
            };
        } catch (fallbackError) {
            console.error('Fallback IP lookup error:', fallbackError);
            return null;
        }
    }
}

// Enhanced reverse geocoding using OpenStreetMap Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<any> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'ExpenseAPI/1.0 (ping@nischal.pro)'
                }
            }
        );

        if (!response.ok) throw new Error('Geocoding failed');
        return await response.json();
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// Enhanced User Agent parsing
function parseUserAgent(userAgent: string): DeviceInfo {
    // Simple parsing - you can use a library like 'ua-parser-js' for better results
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
        userAgent.includes('Firefox') ? 'Firefox' :
            userAgent.includes('Safari') ? 'Safari' :
                userAgent.includes('Edge') ? 'Edge' :
                    userAgent.includes('Opera') ? 'Opera' : 'Unknown';

    const os = userAgent.includes('Windows') ? 'Windows' :
        userAgent.includes('Mac') ? 'macOS' :
            userAgent.includes('Linux') ? 'Linux' :
                userAgent.includes('Android') ? 'Android' :
                    userAgent.includes('iOS') ? 'iOS' : 'Unknown';

    const deviceType = userAgent.includes('Mobile') ? 'Mobile' :
        userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';

    // Extract versions (basic)
    let browserVersion = 'Unknown';
    let osVersion = 'Unknown';

    // Chrome version
    if (browser === 'Chrome') {
        const chromeMatch = userAgent.match(/Chrome\/([0-9.]+)/);
        if (chromeMatch) browserVersion = chromeMatch[1];
    }

    // Firefox version
    if (browser === 'Firefox') {
        const firefoxMatch = userAgent.match(/Firefox\/([0-9.]+)/);
        if (firefoxMatch) browserVersion = firefoxMatch[1];
    }

    // Safari version
    if (browser === 'Safari') {
        const safariMatch = userAgent.match(/Version\/([0-9.]+)/);
        if (safariMatch) browserVersion = safariMatch[1];
    }

    // Windows version
    if (os === 'Windows') {
        if (userAgent.includes('Windows NT 10.0')) osVersion = '10';
        else if (userAgent.includes('Windows NT 6.3')) osVersion = '8.1';
        else if (userAgent.includes('Windows NT 6.2')) osVersion = '8';
        else if (userAgent.includes('Windows NT 6.1')) osVersion = '7';
    }

    // macOS version
    if (os === 'macOS') {
        const macMatch = userAgent.match(/Mac OS X ([0-9_]+)/);
        if (macMatch) osVersion = macMatch[1].replace(/_/g, '.');
    }

    // Android version
    if (os === 'Android') {
        const androidMatch = userAgent.match(/Android ([0-9.]+)/);
        if (androidMatch) osVersion = androidMatch[1];
    }

    // iOS version
    if (os === 'iOS') {
        const iosMatch = userAgent.match(/OS ([0-9_]+)/);
        if (iosMatch) osVersion = iosMatch[1].replace(/_/g, '.');
    }

    return {
        browser,
        browserVersion,
        os,
        osVersion,
        deviceType,
        device: deviceType // Keep backward compatibility
    };
}

export async function getUserInfo(input: UserInfoInput): Promise<UserInfo> {
    const { ip, userAgent, latitude, longitude, timestamp, acceptLanguage } = input;

    // Get device info from User Agent
    const deviceInfo = parseUserAgent(userAgent);

    // Get IP-based information
    const ipInfo = await getIPInfo(ip);

    // Build base location from IP info
    const locationInfo: LocationInfo = {
        country: ipInfo?.country,
        countryCode: ipInfo?.country_code,
        region: ipInfo?.region,
        city: ipInfo?.city,
        latitude: ipInfo?.latitude,
        longitude: ipInfo?.longitude,
        postalCode: ipInfo?.postal,
        continent: ipInfo?.continent,
        timezone: {
            id: ipInfo?.timezone?.id || ipInfo?.timezone,
            abbr: ipInfo?.timezone?.abbr,
            offset: ipInfo?.timezone?.offset,
            isDST: ipInfo?.timezone?.is_dst
        },
        currency: {
            code: ipInfo?.currency?.code,
            name: ipInfo?.currency?.name,
            symbol: ipInfo?.currency?.symbol
        }
    };

    // If browser geolocation is available, use reverse geocoding for precise address
    if (typeof latitude === 'number' && typeof longitude === 'number') {
        const geoData = await reverseGeocode(latitude, longitude);
        if (geoData && geoData.address) {
            locationInfo.latitude = latitude;
            locationInfo.longitude = longitude;
            locationInfo.address = geoData.display_name;

            // Override with more precise data from Nominatim
            locationInfo.country = geoData.address.country || locationInfo.country;
            locationInfo.countryCode = geoData.address.country_code || locationInfo.countryCode;
            locationInfo.region = geoData.address.state || geoData.address.region || locationInfo.region;
            locationInfo.city = geoData.address.city || geoData.address.town || geoData.address.village || locationInfo.city;
            locationInfo.postalCode = geoData.address.postcode || locationInfo.postalCode;
        }
    }

    // ISP information
    const ispInfo: ISPInfo = {
        asn: ipInfo?.asn,
        org: ipInfo?.org,
        isp: ipInfo?.isp,
        domain: ipInfo?.domain,
        provider: ipInfo?.isp // Keep backward compatibility
    };

    return {
        ip,
        userAgent,
        acceptLanguage,
        location: locationInfo,
        isp: ispInfo,
        device: deviceInfo,
        timestamp
    };
}