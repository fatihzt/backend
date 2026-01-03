import axios from 'axios';

export class GeoService {
    /**
     * Tries to get lat/lng for a given location and city.
     * Uses OpenStreetMap Nominatim (Free, but slow/rate-limited).
     */
    static async geocode(location: string, city: string): Promise<{ lat: number, lng: number } | null> {
        // Basic throttle/delay could be added here if needed
        try {
            const query = `${location}, ${city}, Turkey`;
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

            // Respect Nominatim's user-agent policy
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'AntigravityEventApp/1.0'
                }
            });

            if (response.data && response.data.length > 0) {
                return {
                    lat: parseFloat(response.data[0].lat),
                    lng: parseFloat(response.data[0].lon)
                };
            }
            return null;
        } catch (err) {
            console.error('📍 [GEO] Failed to geocode:', location, err);
            return null;
        }
    }
}
