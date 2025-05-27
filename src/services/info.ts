// interface UserInfoInput {
//     ip: string;
//     userAgent: string;
//     latitude?: number;
//     longitude?: number;
//     timestamp: string;
// }

// interface UserInfo {
//     ip: string;
//     userAgent: string;
//     location: {
//         latitude?: number;
//         longitude?: number;
//         country?: string;
//         region?: string;
//         city?: string;
//         address?: string;
//     };
//     isp: {
//         provider?: string;
//         org?: string;
//         asn?: string;
//     };
//     device: {
//         browser?: string;
//         os?: string;
//         device?: string;
//     };
//     timestamp: string;
// }

// // Free geocoding using OpenStreetMap Nominatim
// async function reverseGeocode(lat: number, lng: number): Promise<any> {
//     try {
//         const response = await fetch(
//             `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
//             {
//                 headers: {
//                     'User-Agent': 'ExpenseAPI/1.0 (ping@nischal.pro)'
//                 }
//             }
//         );

//         if (!response.ok) throw new Error('Geocoding failed');
//         return await response.json();
//     } catch (error) {
//         console.error('Reverse geocoding error:', error);
//         return null;
//     }
// }

// // Free IP information using ip-api.com
// async function getIPInfo(ip: string): Promise<any> {
//     try {
//         const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org,as,query`);

//         if (!response.ok) throw new Error('IP lookup failed');
//         const data = await response.json();

//         if (data.status === 'fail') {
//             throw new Error(data.message);
//         }

//         return data;
//     } catch (error) {
//         console.error('IP lookup error:', error);
//         return null;
//     }
// }

// // Parse User Agent
// function parseUserAgent(userAgent: string) {
//     // Simple parsing - you can use a library like 'ua-parser-js' for better results
//     const browser = userAgent.includes('Chrome') ? 'Chrome' :
//         userAgent.includes('Firefox') ? 'Firefox' :
//             userAgent.includes('Safari') ? 'Safari' : 'Unknown';

//     const os = userAgent.includes('Windows') ? 'Windows' :
//         userAgent.includes('Mac') ? 'macOS' :
//             userAgent.includes('Linux') ? 'Linux' :
//                 userAgent.includes('Android') ? 'Android' :
//                     userAgent.includes('iOS') ? 'iOS' : 'Unknown';

//     const device = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';

//     return { browser, os, device };
// }

// export async function getUserInfo(input: UserInfoInput): Promise<UserInfo> {
//     const { ip, userAgent, latitude, longitude, timestamp } = input;

//     // Get device info from User Agent
//     const deviceInfo = parseUserAgent(userAgent);

//     // Get IP-based information
//     const ipInfo = await getIPInfo(ip);

//     // Get location information
//     let locationInfo: any = {};

//     if (latitude && longitude) {
//         // Use provided coordinates for reverse geocoding
//         const geoData = await reverseGeocode(latitude, longitude);
//         if (geoData && geoData.address) {
//             locationInfo = {
//                 latitude,
//                 longitude,
//                 country: geoData.address.country,
//                 region: geoData.address.state || geoData.address.region,
//                 city: geoData.address.city || geoData.address.town || geoData.address.village,
//                 address: geoData.display_name
//             };
//         }
//     } else if (ipInfo) {
//         // Fallback to IP-based location
//         locationInfo = {
//             country: ipInfo.country,
//             region: ipInfo.regionName,
//             city: ipInfo.city
//         };
//     }

//     return {
//         ip,
//         userAgent,
//         location: locationInfo,
//         isp: {
//             provider: ipInfo?.isp,
//             org: ipInfo?.org,
//             asn: ipInfo?.as
//         },
//         device: deviceInfo,
//         timestamp
//     };
// }