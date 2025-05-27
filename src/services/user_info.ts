// src/services/userInfo.ts

interface UserInfoInput {
    ip: string;
    userAgent: string;
    latitude?: number;
    longitude?: number;
    timestamp: string;
    acceptLanguage?: string;
}

interface DetailedLocationInfo {
    // GPS Coordinates
    latitude?: number;
    longitude?: number;

    // Administrative divisions
    country?: string;
    countryCode?: string;
    continent?: string;
    state?: string;
    region?: string;
    district?: string;
    county?: string;

    // City/Town/Village
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;

    // Detailed address components
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    cityDistrict?: string;

    // Street level
    road?: string;
    street?: string;
    houseNumber?: string;
    houseName?: string;

    // Postal
    postalCode?: string;
    postcode?: string;

    // Points of interest
    amenity?: string;
    building?: string;
    shop?: string;

    // Full formatted address
    address?: string;
    displayName?: string;

    // Timezone and currency
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
    location: DetailedLocationInfo;
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

// Enhanced reverse geocoding with detailed address parsing
async function reverseGeocode(lat: number, lng: number): Promise<any> {
    try {
        // Request with maximum detail level
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
            {
                headers: {
                    'User-Agent': 'ExpenseAPI/1.0 (ping@nischal.pro)',
                    'Accept-Language': 'en'
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

// Parse detailed address components from Nominatim response
function parseDetailedAddress(geoData: any): Partial<DetailedLocationInfo> {
    if (!geoData || !geoData.address) return {};

    const addr = geoData.address;

    return {
        // Administrative divisions
        country: addr.country,
        countryCode: addr.country_code?.toUpperCase(),
        state: addr.state || addr.province,
        region: addr.region || addr.state_district,
        district: addr.district || addr.state_district,
        county: addr.county,

        // City/Town/Village hierarchy
        city: addr.city || addr.town || addr.village || addr.municipality,
        town: addr.town,
        village: addr.village,
        municipality: addr.municipality,

        // Detailed neighborhood info
        suburb: addr.suburb,
        neighbourhood: addr.neighbourhood || addr.neighborhood,
        quarter: addr.quarter,
        cityDistrict: addr.city_district,

        // Street level details
        road: addr.road || addr.street,
        street: addr.street || addr.road,
        houseNumber: addr.house_number,
        houseName: addr.house_name,

        // Postal codes
        postalCode: addr.postcode || addr.postal_code,
        postcode: addr.postcode,

        // Points of interest
        amenity: addr.amenity,
        building: addr.building,
        shop: addr.shop,

        // Full address
        address: geoData.display_name,
        displayName: geoData.display_name
    };
}

// Enhanced User Agent parsing
function parseUserAgent(userAgent: string): DeviceInfo {
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

    // Extract versions
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
        device: deviceType
    };
}

export async function getUserInfo(input: UserInfoInput): Promise<UserInfo> {
    const { ip, userAgent, latitude, longitude, timestamp, acceptLanguage } = input;

    // Get device info from User Agent
    const deviceInfo = parseUserAgent(userAgent);

    // Get IP-based information
    const ipInfo = await getIPInfo(ip);

    // Build base location from IP info
    const locationInfo: DetailedLocationInfo = {
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

    // If browser geolocation is available, get detailed address
    if (typeof latitude === 'number' && typeof longitude === 'number') {
        const geoData = await reverseGeocode(latitude, longitude);
        if (geoData) {
            // Parse detailed address components
            const detailedAddress = parseDetailedAddress(geoData);

            // Override with precise GPS coordinates
            locationInfo.latitude = latitude;
            locationInfo.longitude = longitude;

            // Merge detailed address info
            Object.assign(locationInfo, detailedAddress);
        }
    }

    // ISP information
    const ispInfo: ISPInfo = {
        asn: ipInfo?.asn,
        org: ipInfo?.org,
        isp: ipInfo?.isp,
        domain: ipInfo?.domain,
        provider: ipInfo?.isp
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