// checking valid user login session
async function checkAuthentication() {
    const sessionData = localStorage.getItem("TTMSFC_userSession");
    const loginTime = localStorage.getItem("TTMSFC_loginTimestamp");
    const currentTime = new Date().getTime();
    
    // Set login session expiry (HOURS * MINUTES * SECONDS * 1000ms)
    // Default: 2 hours expiry date
    const expiryDuration = 2 * 60 * 60 * 1000; 

    let isInvalid = false;

    // 1. Check if data exists
    if (!sessionData || !loginTime) {
        isInvalid = true;
    } 
    // 2. Check if the time has expired
    else if (currentTime - parseInt(loginTime) > expiryDuration) {
        alert("Your session has expired. Please login again.");
        isInvalid = true;
    }

    if (isInvalid) {
        // Clear anything left in storage to be safe
        localStorage.removeItem("TTMSFC_userSession");
        localStorage.removeItem("TTMSFC_loginTimestamp");
        
        // Use your working dynamic redirect logic
        await performDynamicRedirect();
    }
    else    {
        localStorage.setItem("TTMSFC_loginTimestamp", new Date().getTime().toString());
    }
}

async function performDynamicRedirect() {
    let pathParts = window.location.pathname.split('/');
    pathParts.pop(); 

    while (pathParts.length > 0) {
        let testPath = pathParts.join('/') + "/Login.html";
        try {
            let response = await fetch(testPath, { method: 'HEAD' });
            if (response.ok) {
                window.location.replace(testPath);
                return;
            }
        } catch (e) {
            // Fetch might fail on file:/// protocol, ignore and keep climbing
        }
        pathParts.pop();
    }
    
    window.location.replace("../Login.html");
}

// Run the check
checkAuthentication();