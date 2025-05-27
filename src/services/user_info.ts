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

// Multiple geocoding attempts with different zoom levels
async function reverseGeocodeDetailed(lat: number, lng: number): Promise<any> {
    const zoomLevels = [18, 16, 14, 12]; // Try different zoom levels for more detail

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

// Alternative geocoding using different services
async function getAlternativeGeocode(lat: number, lng: number): Promise<any> {
    try {
        // Try BigDataCloud (free tier)
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );

        if (response.ok) {
            const data = await response.json();
            console.log('BigDataCloud response:', JSON.stringify(data, null, 2));

            // Map BigDataCloud response to our format
            return {
                address: {
                    country: data.countryName,
                    country_code: data.countryCode,
                    state: data.principalSubdivision,
                    city: data.city || data.locality,
                    postcode: data.postcode,
                    road: data.street,
                    house_number: data.streetNumber
                },
                display_name: `${data.streetNumber || ''} ${data.street || ''}, ${data.city || ''}, ${data.principalSubdivision || ''}, ${data.countryName || ''}`.replace(/,\s*,/g, ',').trim()
            };
        }
    } catch (error) {
        console.error('Alternative geocoding error:', error);
    }

    return null;
}

// Enhanced address parsing with more fallbacks
function parseDetailedAddress(geoData: any, alternativeData: any = null): Partial<DetailedLocationInfo> {
    console.log('Parsing address from:', JSON.stringify(geoData, null, 2));

    if (!geoData) {
        if (alternativeData) {
            console.log('Using alternative data:', JSON.stringify(alternativeData, null, 2));
            geoData = alternativeData;
        } else {
            return {};
        }
    }

    const addr = geoData.address || {};

    // Extract all possible address components
    const result = {
        // Administrative divisions
        country: addr.country || addr.countryName,
        countryCode: (addr.country_code || addr.countryCode)?.toUpperCase(),
        state: addr.state || addr.province || addr.principalSubdivision || addr.state_district,
        region: addr.region || addr.state_district || addr.administrative_area_level_1,
        district: addr.district || addr.state_district || addr.administrative_area_level_2,
        county: addr.county || addr.administrative_area_level_3,

        // City/Town/Village hierarchy
        city: addr.city || addr.town || addr.village || addr.municipality || addr.locality,
        town: addr.town,
        village: addr.village,
        municipality: addr.municipality,

        // Detailed neighborhood info
        suburb: addr.suburb || addr.sublocality || addr.sublocality_level_1,
        neighbourhood: addr.neighbourhood || addr.neighborhood || addr.sublocality_level_2,
        quarter: addr.quarter,
        cityDistrict: addr.city_district || addr.city_block,

        // Street level details
        road: addr.road || addr.street || addr.route,
        street: addr.street || addr.road || addr.route,
        houseNumber: addr.house_number || addr.streetNumber || addr.street_number,
        houseName: addr.house_name,

        // Postal codes
        postalCode: addr.postcode || addr.postal_code || addr.zip,
        postcode: addr.postcode || addr.postal_code,

        // Points of interest
        amenity: addr.amenity,
        building: addr.building,
        shop: addr.shop,

        // Full address
        address: geoData.display_name || geoData.formatted_address,
        displayName: geoData.display_name || geoData.formatted_address
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

export async function getUserInfo(input: UserInfoInput): Promise<UserInfo> {
    const { ip, userAgent, latitude, longitude, timestamp, acceptLanguage } = input;

    console.log('=== getUserInfo called ===');
    console.log('Input:', { ip, latitude, longitude });

    // Get device info from User Agent
    const deviceInfo = parseUserAgent(userAgent);

    // Get IP-based information
    const ipInfo = await getIPInfo(ip);
    console.log('IP Info:', ipInfo);

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
        console.log('=== Starting detailed geocoding ===');

        // Try primary geocoding service
        const geoData = await reverseGeocodeDetailed(latitude, longitude);

        // Try alternative service if primary fails
        const alternativeData = !geoData ? await getAlternativeGeocode(latitude, longitude) : null;

        if (geoData || alternativeData) {
            console.log('=== Geocoding successful ===');

            // Parse detailed address components
            const detailedAddress = parseDetailedAddress(geoData, alternativeData);

            // Override with precise GPS coordinates
            locationInfo.latitude = latitude;
            locationInfo.longitude = longitude;

            // Merge detailed address info, keeping existing values as fallback
            Object.keys(detailedAddress).forEach(key => {
                const typedKey = key as keyof DetailedLocationInfo;
                const value = detailedAddress[typedKey];
                if (value !== undefined && value !== null && value !== '') {
                    (locationInfo[typedKey] as any) = value;
                }
            });
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