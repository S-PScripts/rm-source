/* 

URL filter

Checks URLs against local cache or API.

*/
function urlFilter(cacheManager, whitelistManager, errorManager, envConfig, apiHelper, requestTypeAnalyser, userEmail) {

    //**********************
    // Define veriables
    //**********************
    var self = this;
    var userEmailId = userEmail;
    var urlApiURI = envConfig.baseAPIURL + '/api/url?url=';
    var buzzFilteringEnabledTypes = envConfig.BuzzFilteringEnabledTypes;    
    var loginTimer;
    var loginTimeout = 5000; // 5 sec
    var authTimer;
    var tabUrl;
    var homePageUrl;
    var authInProgress = false;
    var authTimeout = 120000;
    var _cacheManager = cacheManager;
    var _errorManager = errorManager;
    
    //Enum of different URL filter states. Object.freeze prevents functions changing the value.
    var urlStates = Object.freeze({
        BLOCKED: 'BLOCKED',
        ALLOWED: 'ALLOWED',
        UNKNOWN: 'UNKNOWN',
        NOTFOUND: 'NOTFOUND',
        UNAUTHENTICATED: 'UNAUTHENTICATED',
        AUTHENTICATED: 'AUTHENTICATED'
    });

    //**********************
    // End define veriables
    //**********************

    //**********************
    // Public functions
    //**********************
    this.getTabUrl = function () {               
        return tabUrl ? tabUrl : envConfig.homePage;
    },

    this.resetAuth = function () {               
        authInProgress = false;
    },

    //Entry point for URL filtering.
    this.checkURL = function (details) {

        var redirectUrl = null;
        var state = null;
                
        var whitelistReponse = checkWhitelist(details.url);
        if (whitelistReponse) {
            //bypass history logging api call for avoiding looping
            logCachedUrlAccess(details);
            return whitelistReponse;
        }

        //Check the cached filter list version.
        let cacheReturn = _cacheManager.checkCache(details.url);
        state = cacheReturn.state;
        redirectUrl = cacheReturn.redirectUrl;

        if (state == urlStates.UNAUTHENTICATED || state == urlStates.NOTFOUND) {

            whitelistReponse = checkWhitelist(details.initiator);

            if (whitelistReponse) {
                return whitelistReponse;
            }

            //to enforce buzz api check for url to minimize the buzz api call based on certain types to enhance performance load
            let callBuzzApi = shouldCallBuzzApi(details);
           
            if(!callBuzzApi)  {  
                return createResponse(urlStates.ALLOWED);
            }

           if(authInProgress) {
                _errorManager.logError('authInProgress = true received for :' + JSON.stringify(details));
                return createResponse(urlStates.UNAUTHENTICATED);
            }
           
            //Call api/url?url=details.url	
            let apiResponse = this.checkAPI(details);

            //The user isn't authenticated, therefore redirect them to the Unify login page for unify users
            //For gafe users authenticate and redirect to details.url 
            if (apiResponse.state === urlStates.UNAUTHENTICATED) {     
                
                getUserEmail(); // In case if email not found

                //check timeout?
                authResponse = authenticate(apiResponse.RedirectURL, details);
                if(authResponse.err) {
                    fallback(details, authResponse.err);
                    return;
                }

                //Unify authentication                    
                if(authResponse.isAuthUrl) {                   
                    unifyLogin(details.tabId, authResponse.redirectURL);                      
                    return createResponse(urlStates.UNAUTHENTICATED);
                }  

                //GAFE - resume processing
                authInProgress = false;
                apiResponse = this.checkAPI(details); 
            }               
            
            let stateResponse = checkURlState(apiResponse);
            redirectUrl = stateResponse.redirectUrl;
            state = stateResponse.state;
        }

        return createResponse(state, redirectUrl);
    },
   
    //Calls the API to check whether a URL can be accessed or not for that user.
    this.checkAPI = function (details) {

        //Default response 
        var response = urlStates.NOTFOUND;
        var requestHeader = [];
        requestHeader['Authorization'] = 'Bearer ' + localStorage.getItem('RM-SafetyNet-Device-Token');
        //Get request resource type
        var requestType = requestTypeAnalyser.getRequestType(details);

        //Call the API
        var options = {
            url: formatUrlFilterUrl(details, requestType),
            method: 'GET',
            async: false,
            retryCount: 3,
            headers: requestHeader,
            data: null
        }

        apiHelper.callAPI(options, function (xmlhttp) {

            if (xmlhttp.status == 200) {

                var decision = JSON.parse(xmlhttp.responseText);
                //Check the state
                if (decision[0] == urlStates.BLOCKED) {
                    response = {
                        'state': urlStates.BLOCKED,
                        'filterpageURL': decision[1]
                    };
                    _cacheManager.updateCache(details.url, urlStates.BLOCKED, decision[1], decision[3], decision[2], details.method, requestType);
                } else if (decision[0] == urlStates.ALLOWED) {
                    response = {
                        'state': urlStates.ALLOWED,
                        'filterpageURL': decision[1]
                    };
                    _cacheManager.updateCache(details.url, urlStates.ALLOWED, decision[1], decision[3], decision[2], details.method, requestType);
                } else {
                    response = {
                        'state': urlStates.UNKNOWN,
                        'filterpageURL': decision[1]
                    };
                    _cacheManager.updateCache(details.url, urlStates.UNKNOWN, decision[1], decision[3], decision[2], details.method, requestType);
                }
            } else if (xmlhttp.status == 401) {

                var data = JSON.parse(xmlhttp.responseText);
                let loginURL = browserPlatform === "edge" ? data.azureV2Login : data.loginURL;
                response = {
                    'state': urlStates.UNAUTHENTICATED,
                    'loginURL': loginURL,
                    'googleAuthURL' : data.googleAuthURL,
                    'RedirectURL': data.RedirectURL,
                    'fallBackDecision': data.fallBackDecision,
                    'fallBackToken': data.fallBackToken
                }
                homePageUrl = data.homePageURL ? data.homePageURL : homePageUrl;
            }
            // If the error is OK or unauthenticated, show the error page in this tab. 
            else if (xmlhttp.isInvalidRequest) {
                errorManager.showErrorPage(details.tabId, errorManager.errorMsgs.INVALIDAPISTATUS);
            }
            else if(xmlhttp.isError){
                errorManager.showErrorPage(details.tabId, errorManager.errorMsgs.INVALIDAPISTATUS);
            }
        });

        return response;
    }  

    function shouldCallBuzzApi(details){
        if (buzzFilteringEnabledTypes.includes(details.type) && details.url.startsWith("http")) {
            return true;
        }

        // To fix the youtube walled garden issue, where user can see non allowed videos.
        if (details.initiator === "https://www.youtube.com" && details.type === "xmlhttprequest") {
            return true;;
        }

        return false;
    }

    function findHostname(url) {
        var parser = document.createElement('a');
        parser.href = url;
        var hostname = parser.hostname;
        return hostname;
    }

    function logCachedUrlAccess(details) {
        if (details.url.indexOf(envConfig.baseAPIURL) != 0) {
            if (localStorage.getItem('RM-SafetyNet-Device-Token')) {
                var newLogItem = {
                    'state': 'WHITELISTED',
                    'filterListID': '-',
                    'method': 'GET',
                    'resourceType': requestTypeAnalyser.getRequestType(details)
                };
                _cacheManager.logCachedUrlAccess(details.url, newLogItem);
            }
        }
    }

    function setFallbackToken(fallBackToken) {
        localStorage.setItem('RM-SafetyNet-Device-Token', fallBackToken);
    }

    //**********************
    // END public functions
    //**********************

    //**********************
    // Private functions
    //**********************

    function createResponse(state, redirectUrl){
        
        if (state === urlStates.BLOCKED) {
            return {
                response: {
                    redirectUrl: redirectUrl
                },
                state: urlStates.BLOCKED
            };
        }
        else if (state === urlStates.UNAUTHENTICATED) {
            return {
                response: {
                    cancel: true
                },
                state: state
            }
        }
        else {
            return {
                response: {
                    cancel: false
                },
                state: state
            }
        };
    }

    function unifyLogin(tabId, loginUrl) { 
        
        let activeTab = null;
        let retry = 0;
        let retryCount = 3;
        let authUrl = loginUrl;
        tabUrl = homePageUrl;
        authInProgress = true;

        function createTabAndShowLogin() {
            tabUrl = homePageUrl;
            chrome.tabs.create({ url: authUrl });
        }
        
        function showLoginInFirstTab(){
            _errorManager.logError('tryUnifyLogin failed after retries: ' + retryCount);
            findActiveTab(false, tab=> { 
                let anyTab = tab; 
                showLogin(anyTab ? anyTab.id : -1, authUrl, ()=> {
                    createTabAndShowLogin();
                });
            });
        }

        function tryUnifyLogin() {
            retry++;

            if (activeTab) {
                return;
            }

            if (retry >= retryCount) {
                showLoginInFirstTab();
                return;
            }

            findActiveTab(true, tab => {
               activeTab = tab;

                if(activeTab) {
                    tabUrl = activeTab.pendingUrl ? activeTab.pendingUrl : activeTab.url;
                    showLogin(activeTab.id, authUrl, ()=> {
                       
                        //retry
                        setTimeout(()=> {
                            tryUnifyLogin();
                        }, 10);
                       
                    });

                    return; // from findActiveTab
                }
                
                // findActiveTab  failed, so retry
                setTimeout(()=> {
                    tryUnifyLogin();
                }, 100);
            });
        }
       
        // Try login. 
        // Retry may be required due to async nature of Chrome.
        tryUnifyLogin();

        if(loginTimer) {
            clearTimeout(loginTimer);
        }

        loginTimer = setTimeout(()=> {
            loginTimer = null;       
            authInProgress = false;
        }, loginTimeout);

    }

    function findActiveTab(active, calback) {
       let index;
       cb = calback;
       
        chrome.tabs.query({currentWindow: true, active: active},
            tabs => {

                if(tabs) {
                    for (index = 0; index < tabs.length; index++) {                  
                        if(tabs[index].id > -1) {
                            cb(tabs[index]);
                            return;
                        }   
                    }
                }
                
                cb(null);
            }
        );
    }

    function showLogin(tabId, authUrl, callback) {

        if(tabId == -1) {
            callback();
            return; 
        }

        try {
            chrome.tabs.update(tabId, {url: authUrl}, 
                tab=> { 
                    if(!tab) {   
                        _errorManager.logError('showLogin() chrome.tabs.update failed');                        
                        callback();                            
                    }
                }
            );
        }
        catch(err) {
            _errorManager.logError(err);
            callback();  
        }
    }

    function getUserEmail() {
        if (!userEmailId) {
            chrome.identity.getProfileUserInfo((userInfo)=> {
                userEmailId = userInfo.email;
            });
        }
    }

    function checkURlState(apiResponse) {

        let redirectUrl;
        let state;

        if (apiResponse.state == urlStates.UNAUTHENTICATED) {
            state = urlStates.UNAUTHENTICATED;
        }
        else if (apiResponse.state === urlStates.BLOCKED) {
            redirectUrl = apiResponse.filterpageURL;
            state = urlStates.BLOCKED;
        }
        //If the page is allowed then continue
        else if (apiResponse.state === urlStates.ALLOWED) {
            state = urlStates.ALLOWED;
        } else if (apiResponse.state === urlStates.UNKNOWN) {
            state = urlStates.UNKNOWN;
        }

        var urlState = {
            'redirectUrl': redirectUrl,
            'state': state,
            'fallBackToken': apiResponse.fallBackToken
        }

        return urlState;
    }

    function checkWhitelist(url, tabId) {
        let whiteURLs;
        let hostname = findHostname(url);
        /* Check for white list urls in local storage.
        if match happens, bypass api/cache check for the url*/
        if (!localStorage.getItem('rmFilteringWhiteListURLs')) {
            whitelistManager.getWhiteListURLs(tabId);
        }

        try {
            whiteURLs = JSON.parse(localStorage.getItem('rmFilteringWhiteListURLs'));
        }
        catch (error) {
            _errorManager.logError(error);
            return;
        }
        
        if (whiteURLs) {
            
            for (var i = 0; i < whiteURLs.length; i++) {

                if (RegExp(whiteURLs[i]).test(hostname)) {
                    return {
                        response: {
                            cancel: false
                        },
                        state: urlStates.ALLOWED
                    }
                }
    
            }    
        }
    }

    function formatUrlFilterUrl(details, requestType) {

        // API is only interested in certain types, so query not always needed
        let requestTypeQuery = '';

        if (requestType) {
            requestTypeQuery = '&reqType=' + requestType;
        }

        let url = details.url;

        try {
            url = encodeURIComponent(details.url);
        }
        catch (err) {
           errorManager.logError(err);
        }

        return urlApiURI + url + '&method=' + details.method + requestTypeQuery;
    }

    function authenticateUser(redirectUrl) {
        let isEdge = browserPlatform === "edge" ? true : false;

        if(userEmailId) {

            let response = getUserPolicy(userEmailId, redirectUrl, isEdge);

             if (response.err) {
                response =  getFallbackPolicy(redirectUrl,'authenticateUser: Failed due to: ' + response.err);
             }

             return response;
        }
         
        let errMessage =  chrome.runtime.lastError ? chrome.runtime.lastError.message : ' ';
        return getFallbackPolicy(redirectUrl,'authenticateUser: Failed to retrieve email in the extension due to: ' + errMessage);
    }

    function getUserPolicy(email, redirectUrl, edge) {
        let requestHeader = [];
        requestHeader['Content-type'] = 'application/json';
        let params = { email: email, url : redirectUrl };
        let policyURL;
        let response = {};

        if(edge) {
            policyURL = envConfig.baseAPIURL + '/auth/login/v3/azure';
        }
        else {
            policyURL = envConfig.baseAPIURL + '/auth/login/gafe'
        }

        let options = {
            url: policyURL,
            data: JSON.stringify(params),
            headers: requestHeader,
            method: 'POST'
         };

        apiHelper.invokeAuthAPI(options,(http)=>{
            if (http.status == 401) {
                let data = JSON.parse(http.responseText);
                response = {
                    'status': urlStates.UNAUTHENTICATED,
                    'redirectURL': data.loginURL ? data.loginURL : undefined,
                    'isAuthUrl' : true
                };
            }
            else if (http.status === 200) {          
            // if auth token received
                response = {
                    'status': urlStates.AUTHENTICATED,
                    'redirectURL': redirectUrl,
                    'isAuthUrl' : false,
                };
            }
            else {
                response = {
                    err : policyURL + ' failed: http status ' + http.status + ' response: ' + http.response
                }
            }
        });

        return response;
    }
       
    function getFallbackPolicy(redirectUrl, error) {
        let requestHeader = [];
        requestHeader['Content-type'] = 'application/json';
        let params = { url : redirectUrl, error : error };
        let fallbackURL = envConfig.baseAPIURL + '/auth/login/v2/fallback';  
        let options = {
            url: fallbackURL,
            data: JSON.stringify(params),
            headers: requestHeader,
            method: 'POST'
        };
        let response = {};

        apiHelper.invokeAuthAPI(options,(http)=>{
            if (http.status === 200) {
                response = {
                    'status': urlStates.AUTHENTICATED,
                    'redirectURL': redirectUrl,
                };
            }
            else {
                response = {
                err : fallbackURL + ' failed: http status ' + http.status + ' response: ' + http.response
                }
            }
        });

        return response;
    }

    function authenticate(redirectUrl, details) {
    
        setAuthTimeout(details);

        return authenticateUser(redirectUrl);
    }

    function setAuthTimeout(details) {
        if(authTimer) {
            clearTimeout(authTimer);
        }

        authTimer = setTimeout(()=> {
            authTimer = null; 
            fallback(details, 'setAuthTimeout triggered');
        }, authTimeout);
    }

    function fallback(details, err) {
        authInProgress = false;
        let apiResponse = self.checkAPI(details);

        if (apiResponse.state === urlStates.UNAUTHENTICATED) {
            getFallbackPolicy(details.url, 'Fallback invoked due to: ' + err);
        }
    }

    //**********************
    // END private functions
    //**********************
}
