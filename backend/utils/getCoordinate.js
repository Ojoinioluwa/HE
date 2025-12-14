/**
 * Fetches geographical coordinates (latitude and longitude) for a given city and state
 * using the OpenCage Geocoding API.
 *
 * @param {string} city - The name of the city (e.g., "Ado Ekiti").
 * @param {string} state - The name of the state (e.g., "Ekiti").
 * @param {string} apiKey - Your OpenCage Geocoding API key.
 * @param {string} [country='Nigeria'] - The country to narrow down the search (defaults to 'Nigeria').
 * @returns {Promise<{latitude: number, longitude: number}|null>} A Promise that resolves with
 * an object containing `latitude` and `longitude` if coordinates are found,
 * or `null` if the location cannot be geocoded.
 * @throws {Error} Throws an error if the API request fails or returns an error status.
 */
async function getCoordinates(address, city, state, apiKey, country = 'Nigeria') {
    if (!city || !state || !apiKey) {
        throw new Error('City, state, and API key are required.');
    }

    const encodedAddress = encodeURIComponent(address.trim());
    const encodedCity = encodeURIComponent(city.trim());
    const encodedState = encodeURIComponent(state.trim());
    const encodedCountry = encodeURIComponent(country.trim());

    // Construct the query string for OpenCage
    const query = `${encodedAddress}, ${encodedCity}, ${encodedState}, ${encodedCountry}`;
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=${apiKey}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            // Attempt to parse error message from API response
            let errorMessage = `Geocoding API error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.status && errorData.status.message) {
                    errorMessage += ` - ${errorData.status.message}`;
                }
            } catch (parseError) {
                // Ignore if JSON parsing fails, use default error message
                console.warn('Could not parse error response from OpenCage:', parseError);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // OpenCage response structure: results array, each with a geometry object
        if (data.results && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry;
            return { latitude: lat, longitude: lng };
        } else {
            // No results found for the given query
            return null;
        }
    } catch (error) {
        console.error("Error in getCoordinatesFromOpenCage:", error);
        throw error; // Re-throw the error for the calling component to handle
    }
}

module.exports = getCoordinates