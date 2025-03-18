function background(urlFilter, cacheManager, filterPageManager, contentFilterManager, errorManager, envConfig, apiHelper) {

    //**********************
    // Define veriables
    //**********************

    var self = this;
    var policyApiUrl = envConfig.baseAPIURL + '/api/policy/getPolicy';
    const bingNewTabRedir = 'https://www.bing.com/newtabredir?url=';
    
    //**********************
    // End define veriables
    //**********************

    //**********************
    // Start up check
    //**********************

    /*

        This logic checks all open tabs. As a result, when the extension initialises
        then all open tabs will be URL filtered. 

        This also helps the scenario where a user uses task manager to kill the 
        extension. If the extension is correctly installed then it will instantly 
        restart and URL filter all open tabs.

    */

    chrome.windows.getAll({
        populate: true
    }, function(windows) {
        try {
            if (localStorage.getItem('RM-SafetyNet-Device-Token') != null) {
                for (var i = 0; i < windows.length; i++) {

                    var thisWindow = windows[i];

                    for (var j = 0; j < thisWindow.tabs.length; j++) {

                        var thisTab = thisWindow.tabs[j];

                        var details = {
                            url: thisTab.url,
                            type: 'main_frame',
                            tabId: thisTab.id,
                            method: 'GET'
                        }
                        var parser = document.createElement('a');
                        parser.href = thisTab.url;
                        if (parser.protocol != 'chrome:') {
                            var safeResponse = self.forceSafeSearch(details);

                            if (safeResponse) {
                                chrome.tabs.update(thisTab.id, {
                                    url: safeResponse.redirectUrl
                                })
                                details.url = safeResponse.redirectUrl;
                            }

                            var filter = urlFilter.checkURL(details);

                            if (filter.state === 'BLOCKED') {

                                // redirect to the filter page
                                chrome.tabs.update(thisTab.id, {
                                    url: filter.response.redirectUrl
                                })

                            }
                        }

                    }

                }
            }
        }
        catch {
            //ignore
        }
    });

    /*
        When the extension is updated the cache should be cleared. This is to help with
        compatibility issues between versions.
    */
    chrome.runtime.onInstalled.addListener(function(reason) {
        if (reason.reason === "update") {
            self.clearData();
        }
    })

    //**********************
    // End start up check
    //**********************

    //**********************
    // Chrome listeners 
    //**********************

    //URL filter
    //All filter specific logic in urlFilter.js
    chrome.webRequest.onBeforeRequest.addListener( function (details) {
      try {
        // safe search
        if (details.type == 'xmlhttprequest' || details.type === 'main_frame') {
            var safeResponse = self.forceSafeSearch(details);
            if (safeResponse) {
                return safeResponse;
            }
        }

        var url = urlFilter.checkURL(details);
        if (url) {
            return url.response;
        }
    }
    catch(err) {
      errorManager.showErrorPage(details.tabId, err);
      return {
        cancel : true
      };

    }

    }, {
        urls: ['http://*/*', 'https://*/*', 'ftp://*/*']
    }, ['blocking']);

    //Fix for youtube search unfiltered access issue in unblocked mode
    chrome.webRequest.onBeforeRequest.addListener( function (details) {
        try {
            if(details.method == 'POST' &&  details.url.indexOf("search?key") != -1 )
            {
                let requestBody = decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes)));
                requestBody = JSON.parse(requestBody);
                let originalUrl = requestBody.context.client.originalUrl;
                if(originalUrl.indexOf("?search_query=") !=-1){
                    chrome.tabs.update(details.tabId, {url: originalUrl});
                }
            }
        } 
        catch (error) {
            errorManager.logError(error);
        }
    }, {
            urls: ['*://*.youtube.com/*']
        }, ['blocking','requestBody']);

    chrome.webRequest.onErrorOccurred.addListener(
        function(details, sender) {
            // Logic to generate local filter page URL
            var estabID;
            var tempURL = details.url;
            estabID = tempURL.slice(tempURL.indexOf("/filterpages/") + 13, -(tempURL.length - tempURL.indexOf(".htm")));
            estabID = estabID.slice(0, -(estabID.length - estabID.indexOf("-")));
            chrome.tabs.update(details.tabId, {
                url: errorManager.showFilterPage(details.tabId, details.url, estabID)
            });

            errorManager.logError(details.error)
        }, {
            urls: [envConfig.filterPageServerURL],
            types: ["main_frame"]
        }
    );
    
    chrome.webRequest.onBeforeRedirect.addListener(
        (details)=> {    
            urlFilter.resetAuth();  

            if(details.tabId>0) {
                try {
                    let redirectUrl = urlFilter.getTabUrl();
                    if(redirectUrl.startsWith(bingNewTabRedir)) {
                        redirectUrl = decodeURIComponent(redirectUrl.split(bingNewTabRedir)[1]);
                    }
  
                   chrome.tabs.update(details.tabId, {
                        url: redirectUrl
                    });
                }
                catch(err) {
                    errorManager.logError(err);   
                }
            }  
                 
        }, {
            urls: [envConfig.baseAPIURL + '/auth/login/callback']
        }, ['responseHeaders']
    );

    chrome.webRequest.onHeadersReceived.addListener(
        function(details) {
            self.setAuthToken(details);
        }, {
            urls: [envConfig.baseAPIURL + '/auth/login/*']
        }, ['blocking', 'responseHeaders']
    );

    // Clears the autentication token and locally stored data on logout
	chrome.webRequest.onBeforeRequest.addListener(
        function(details) {
            self.clearData();
        }, {
            urls: [envConfig.baseAPIURL + '/auth/logout*']
        }
    );

    //**********************
    // End Chrome listeners 
    //**********************

    //**********************
    // Public functions
    //**********************

    // forcing safe search
    this.forceSafeSearch = function(details) {
        var parser = document.createElement('a');
        parser.href = details.url;
        var hostname = parser.hostname;

        // Google
        if (hostname.toLowerCase().indexOf('www.google') > -1) {
            if ((parser.pathname.indexOf("search") != -1 && details.url.indexOf("q=") != -1)) {

                if (details.url.indexOf("safe=active") == -1) {
                    return formatGoogleSearches(details.url, '&safe=active'); 
                } else {
                    // safe=active alreday there and check for duplicates like safe=off
                    return checkDuplicateSafeSearch('safe', 'active', details.url, parser);
                }
            }
        }
        // Bing
        else if (hostname.toLowerCase().indexOf('bing.com') > -1) {

            if (parser.pathname.indexOf("search") != -1 && details.url.indexOf("q=") != -1) {
                if (details.url.indexOf("&adlt=strict") == -1) {
                    return {
                        redirectUrl: details.url + '&adlt=strict'
                    }
                } else {
                    return checkDuplicateSafeSearch('adlt', 'strict', details.url, parser);
                }
            }
        }

        // Yahoo
        else if (hostname.toLowerCase().indexOf("yahoo.com") > -1) {

            if (parser.pathname.indexOf("search") != -1 && details.url.indexOf("p=") != -1) {
                if (details.url.indexOf("&vm=r") == -1) {
                    return {
                        redirectUrl: details.url + '&vm=r'
                    }
                } else {
                    return checkDuplicateSafeSearch('vm', 'r', details.url, parser);
                }
            }
        }

        return null;
    }
    
    // setting the auth token or showing error page 
    this.setAuthToken = function(details) {

        if (details.statusCode === 200 || details.statusCode == 302) {
            var tokenValue = null;

            for (var i = 0; i < details.responseHeaders.length; i++) {
                if (details.responseHeaders[i].name == 'RM-SafetyNet-Device-Token') {
                    tokenValue = details.responseHeaders[i].value;
                    cacheManager.wipeCache();
                    break;
                }
            }

            if (localStorage.getItem('RM-SafetyNet-Device-Token') != null) {
                localStorage.removeItem('RM-SafetyNet-Device-Token');
            }
            localStorage.setItem('RM-SafetyNet-Device-Token', tokenValue);
            
            //For unify
            urlFilter.resetAuth();

        }
        //error
        else if (details.statusCode != 401 && details.statusCode != 200 && details.tabId != -1) {
            errorManager.showErrorPage(details.tabId, errorManager.errorMsgs.AUTH_FAILURE, 'setAuthToken');
        }

    }

    // Clears the autentication token and locally stored data on logout
    this.clearData = function() {
        localStorage.clear();
        cacheManager.wipeCache();
        contentFilterManager.wipeInMemoryWordList();
    }

    // check for policy change in every n minute.
    this.getPolicy = function() {

        var requestHeader = [];
        requestHeader['Authorization'] = 'Bearer ' + localStorage.getItem('RM-SafetyNet-Device-Token');

        var options = {
            url: policyApiUrl,
            method: 'GET',
            async: true,
            retryCount: 3,
            headers: requestHeader,
            data: null
        }

        apiHelper.callAPI(options, function(xmlhttp) {
            if (xmlhttp.status == 200) {
                var response = JSON.parse(xmlhttp.responseText);
                if (response.policyChanged) {
                    cacheManager.wipeCache();
                    localStorage.setItem('RM-SafetyNet-Device-Token', response.token);
                }

            }
        });

    }


    //**********************
    // End public functions
    //**********************

    //**********************
    // Private functions
    //**********************

    // check for duplicate safe query string 
    // we can manually give safe query string, safe=off for example.
    function checkDuplicateSafeSearch(safeKey, safeValue, url, parser) {
        var count = (parser.search.match(new RegExp(safeKey + '=', 'g')) || []).length;
        if (count > 1) {
            var redirect = false;
            var redirectUrl = url;
            var vars = parser.search.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == safeKey && pair[1] != safeValue) {
                    redirectUrl = redirectUrl.replace('&' + vars[i], '');
                    redirect = true;
                }
            }
            if (redirect) {
                return {
                    redirectUrl: redirectUrl
                }
            }
        }

        return null;
    }

	/* this is to avoid the redirect of google search results to google home page on resubmiting 
    the url or on opening search url in seperate tab. Adding the safeykey after the anchor(#) in google search url was causing issue. 
    So if url contains an anchor to some element, just add the safekey before the anchor*/
	function formatGoogleSearches(url, safeKey)
	{
			var n=url.indexOf('#');
			if(n != -1)
			{
				url = [url.slice(0, n), safeKey, url.slice(n)].join('');
			}
			else{
				url = url + safeKey;
			}
		   return {
                    redirectUrl: url
           }
	}

    //**********************
    // End private functions
    //**********************

}
