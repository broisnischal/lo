
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
    continentCode?: string;

    // State/Province/Region
    state?: string;
    region?: string;
    province?: string;

    // District/County
    district?: string;
    county?: string;

    // City/Town/Village hierarchy
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;

    // Detailed neighborhood info
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    cityDistrict?: string;

    // Street level details
    road?: string;
    street?: string;
    houseNumber?: string;
    houseName?: string;

    // Postal codes
    postalCode?: string;
    postcode?: string;

    // Points of interest
    amenity?: string;
    building?: string;
    shop?: string;

    // Full formatted addresses
    address?: string;
    displayName?: string;

    // Country details
    countryFlag?: string;
    countryCapital?: string;
    countryPhone?: string;
    countryNeighbours?: string;

    // Timezone information
    timezone?: {
        id?: string;
        name?: string;
        abbr?: string;
        offset?: number;
        gmtOffset?: number;
        dstOffset?: number;
        gmt?: string;
        isDST?: boolean;
    };

    // Currency information
    currency?: {
        code?: string;
        name?: string;
        symbol?: string;
        rates?: number;
        plural?: string;
    };
}

interface ISPInfo {
    asn?: string;
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

// Enhanced IP information using multiple sources
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
                timezone: fallbackData.timezone,
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

// Multiple geocoding attempts with different zoom levels
async function reverseGeocodeDetailed(lat: number, lng: number): Promise<any> {
    const zoomLevels = [18, 16, 14, 12];

    for (const zoom of zoomLevels) {
        try {
            console.log(`Trying reverse geocoding with zoom level ${zoom}`);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1&extratags=1&namedetails=1&accept-language=en`,
                {
                    headers: {
                        'User-Agent': 'ExpenseAPI/1.0 (ping@nischal.pro)',
                        'Accept-Language': 'en'
                    }
                }
            );

            if (!response.ok) {
                console.warn(`Zoom ${zoom} failed with status ${response.status}`);
                continue;
            }

            const data = await response.json();
            console.log(`Zoom ${zoom} response:`, JSON.stringify(data, null, 2));

            if (data && data.address) {
                return data;
            }
        } catch (error) {
            console.error(`Reverse geocoding error at zoom ${zoom}:`, error);
            continue;
        }

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return null;
}

// Enhanced address parsing with comprehensive merging
function parseDetailedAddress(geoData: any): Partial<DetailedLocationInfo> {
    console.log('Parsing address from:', JSON.stringify(geoData, null, 2));

    if (!geoData || !geoData.address) return {};

    const addr = geoData.address;

    const result = {
        // Administrative divisions
        country: addr.country,
        countryCode: addr.country_code?.toUpperCase(),

        // State/Province/Region - keep all variations
        state: addr.state,
        region: addr.region,
        province: addr.province,

        // District/County
        district: addr.district || addr.state_district,
        county: addr.county,

        // City/Town/Village hierarchy - keep all
        city: addr.city,
        town: addr.town,
        village: addr.village,
        municipality: addr.municipality,

        // Detailed neighborhood info
        suburb: addr.suburb,
        neighbourhood: addr.neighbourhood || addr.neighborhood,
        quarter: addr.quarter,
        cityDistrict: addr.city_district,

        // Street level details
        road: addr.road,
        street: addr.street,
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

    console.log('Parsed address result:', JSON.stringify(result, null, 2));
    return result;
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

    if (browser === 'Chrome') {
        const chromeMatch = userAgent.match(/Chrome\/([0-9.]+)/);
        if (chromeMatch) browserVersion = chromeMatch[1];
    }

    if (browser === 'Firefox') {
        const firefoxMatch = userAgent.match(/Firefox\/([0-9.]+)/);
        if (firefoxMatch) browserVersion = firefoxMatch[1];
    }

    if (browser === 'Safari') {
        const safariMatch = userAgent.match(/Version\/([0-9.]+)/);
        if (safariMatch) browserVersion = safariMatch[1];
    }

    if (os === 'Windows') {
        if (userAgent.includes('Windows NT 10.0')) osVersion = '10';
        else if (userAgent.includes('Windows NT 6.3')) osVersion = '8.1';
        else if (userAgent.includes('Windows NT 6.2')) osVersion = '8';
        else if (userAgent.includes('Windows NT 6.1')) osVersion = '7';
    }

    if (os === 'macOS') {
        const macMatch = userAgent.match(/Mac OS X ([0-9_]+)/);
        if (macMatch) osVersion = macMatch[1].replace(/_/g, '.');
    }

    if (os === 'Android') {
        const androidMatch = userAgent.match(/Android ([0-9.]+)/);
        if (androidMatch) osVersion = androidMatch[1];
    }

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

// Helper function to safely merge objects without overwriting
function safeMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
            // If target doesn't have this key, or target's value is empty/null, use source
            if (!result[key] || result[key] === '' || result[key] === null) {
                result[key] = source[key];
            }
            // If both exist and are objects, merge recursively
            else if (typeof result[key] === 'object' && typeof source[key] === 'object' && !Array.isArray(result[key])) {
                result[key] = safeMerge(result[key], source[key]);
            }
            // Otherwise keep the existing value (don't overwrite)
        }
    }

    return result;
}

export async function getUserInfo(input: UserInfoInput): Promise<UserInfo> {
    const { ip, userAgent, latitude, longitude, timestamp, acceptLanguage } = input;

    console.log('=== getUserInfo called ===');
    console.log('Input:', { ip, latitude, longitude });

    // Get device info from User Agent
    const deviceInfo = parseUserAgent(userAgent);

    // Get IP-based information
    const ipInfo = await getIPInfo(ip);
    console.log('IP Info:', ipInfo);

    // Build comprehensive location from IP info
    const locationInfo: DetailedLocationInfo = {
        // GPS from IP (will be overridden by browser GPS if available)
        latitude: ipInfo?.latitude,
        longitude: ipInfo?.longitude,

        // Administrative divisions
        country: ipInfo?.country,
        countryCode: ipInfo?.country_code?.toUpperCase(),
        continent: ipInfo?.continent,
        continentCode: ipInfo?.continent_code,

        // State/Region
        region: ipInfo?.region,
        state: ipInfo?.region, // Some APIs use different field names

        // City
        city: ipInfo?.city,

        // Postal
        postalCode: ipInfo?.postal,

        // Country details
        countryFlag: ipInfo?.country_flag,
        countryCapital: ipInfo?.country_capital,
        countryPhone: ipInfo?.country_phone,
        countryNeighbours: ipInfo?.country_neighbours,

        // Timezone information
        timezone: {
            id: ipInfo?.timezone,
            name: ipInfo?.timezone_name,
            abbr: ipInfo?.timezone_name,
            offset: ipInfo?.timezone_gmtOffset,
            gmtOffset: ipInfo?.timezone_gmtOffset,
            dstOffset: ipInfo?.timezone_dstOffset,
            gmt: ipInfo?.timezone_gmt,
            isDST: ipInfo?.timezone_dstOffset > 0
        },

        // Currency information
        currency: {
            code: ipInfo?.currency_code,
            name: ipInfo?.currency,
            symbol: ipInfo?.currency_symbol,
            rates: ipInfo?.currency_rates,
            plural: ipInfo?.currency_plural
        }
    };

    // If browser geolocation is available, get detailed address and merge
    if (typeof latitude === 'number' && typeof longitude === 'number') {
        console.log('=== Starting detailed geocoding ===');

        const geoData = await reverseGeocodeDetailed(latitude, longitude);

        if (geoData) {
            console.log('=== Geocoding successful ===');

            // Parse detailed address components
            const detailedAddress = parseDetailedAddress(geoData);

            // Override GPS coordinates with precise browser location
            locationInfo.latitude = latitude;
            locationInfo.longitude = longitude;

            // Safely merge detailed address info without overwriting existing data
            Object.assign(locationInfo, safeMerge(locationInfo, detailedAddress));
        } else {
            console.log('=== Geocoding failed, using IP-based location ===');
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

    const result = {
        ip,
        userAgent,
        acceptLanguage,
        location: locationInfo,
        isp: ispInfo,
        device: deviceInfo,
        timestamp
    };

    console.log('=== Final result ===');
    console.log(JSON.stringify(result, null, 2));

    return result;
}