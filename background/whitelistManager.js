function whitelistManager(cacheManager, errorManager, envConfig, apiHelper) {

    var _cacheManager = cacheManager;
    var self = this;
    this.getWhiteListURLs = function(tabId) {

        var whitelistApiURI = envConfig.baseAPIURL + "/whitelist";

        var requestAsync = true;
        // If this is the initial whitelist request, then the API request should be 
        // synchronous. If it's just an update to the whitelist then it should be
        //asynchronous
        if (localStorage.getItem('rmFilteringWhiteListURLs') === null) {
            requestAsync = false;
        }

        var options = {
            url: whitelistApiURI,
            method: 'GET',
            async: requestAsync,
            retryCount: 3,
            headers: null,
            data: null
        }

        apiHelper.callAPI(options, function(xmlhttp) {
            if (xmlhttp.status == 200) {
                // The whitelist should never be null and therefore this condition
                // should always be met. Added as a fail safe.
                if (xmlhttp.responseText !== "") {
                    if (xmlhttp.responseText.length > 0) {
                        var whiteList = JSON.parse(xmlhttp.responseText);
                        localStorage.setItem('rmFilteringWhiteListURLs', JSON.stringify(whiteList));
                    }
                }
            }
            else if (!requestAsync && xmlhttp.isError) {
                var tempTabId = tabId ? tabId : -1;
                if (xmlhttp.isInvalidRequest) {
                    errorManager.showErrorPage(tempTabId, errorManager.errorMsgs.INVALIDWHITELISTSTATUS);
                }
                else {
                    errorManager.showErrorPage(tempTabId, errorManager.errorMsgs.FAILEDWHITELISTCALL);
                }
            }
        }
        );
    }

}
