// checking valid user login session
async function dynamicRedirect() {
    if (!localStorage.getItem("TTMSFC_userSession")) {
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
            }
            pathParts.pop();
        }
        
        window.location.replace("../Login.html");
    }
}

dynamicRedirect();