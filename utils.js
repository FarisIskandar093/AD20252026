// utils.js

function getSession() {
    const session = localStorage.getItem("TTMSFC_userSession");
    return session ? JSON.parse(session) : null;
}

const API_BASE_URL = "http://web.fc.utm.my/ttms/web_man_webservice_json.cgi";

async function fetchData(entity, params = {}) {
    let url = `${API_BASE_URL}?entity=${entity}`;
    for (const key in params) {
        if (params[key]) url += `&${key}=${encodeURIComponent(params[key])}`;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network error");
        return await response.json();
    } catch (err) {
        console.warn("API Error. Check CORS or connectivity.");
        return []; 
    }
}