/* 

Checks the cache for search term/url
Updates the cache to include search term/url

*/

function cacheManager(envConfig, apiHelper) {

    //**********************
    // Define veriables
    //**********************

    var self = this;
    var clearCacheTimeout = envConfig.cacheCheckForExpiredInterval;
    var cachedDataStorage = {};
    var logApiUrl = envConfig.baseAPIURL + '/api/history/logEntry';

    getCachedItems("cachedURLs", function(result) {
        if(result) {
           cachedDataStorage = result;
        }
        else
            cachedDataStorage = {};
    })

    //Enum of different URL filter states. Object.freeze prevents functions changing the value.
    var cachedStates = Object.freeze({
        BLOCKED: 'BLOCKED',
        ALLOWED: 'ALLOWED',
        UNKNOWN: 'UNKNOWN',
        NOTFOUND: 'NOTFOUND',
        UNAUTHENTICATED: 'UNAUTHENTICATED'
    });

    //**********************
    // End define veriables
    //**********************

    //**********************
    // Public functions
    //**********************

    //Check the cache
    this.checkCache = function(searchTermOrUrl) {
        var cachedData = {};
        var redirectUrl = null;
        var state;
        var contentFilterEnabled = 0;
        cachedData = cachedDataStorage;

        if (cachedData && cachedData[searchTermOrUrl]) {
            if (cachedData[searchTermOrUrl].state == cachedStates.BLOCKED) {
                redirectUrl = cachedData[searchTermOrUrl].filterpageURL;
                state = cachedStates.BLOCKED;
                contentFilterEnabled = cachedData[searchTermOrUrl].contentfilterEnabled;
            } else if (cachedData[searchTermOrUrl].state == cachedStates.ALLOWED) {
                state = cachedStates.ALLOWED;
                contentFilterEnabled = cachedData[searchTermOrUrl].contentfilterEnabled;
            } else {
                state = cachedStates.UNKNOWN;
                contentFilterEnabled = cachedData[searchTermOrUrl].contentfilterEnabled;
            }
            self.logCachedUrlAccess(searchTermOrUrl, cachedData[searchTermOrUrl]);
        } else {
            state = cachedStates.NOTFOUND;
        }

        return {
            redirectUrl: redirectUrl,
            state: state,
            contentFilterEnabled: contentFilterEnabled
        };

    }

    this.updateCache = function(searchTermOrUrl, state, filterpageURL, contentfilterRequired, flid, method, resourceType) {
        var objToStore = {};
        var cachedData = {};
        var timeStamp = new Date().getTime();
        var newCacheItem = {
            'state': state,
            'filterpageURL': filterpageURL,
            'timeStamp': timeStamp,
            'contentfilterEnabled': contentfilterRequired,
            'filterListID': flid,
            'method': method, 
            'resourceType': resourceType
        };
        //Store data to in memory variable for cache check.
        //this is to solve the issue of filtering with asynchronous API check.

        if(!cachedDataStorage) {
            cachedDataStorage = {};
        }
        cachedDataStorage[searchTermOrUrl] = newCacheItem;

        getCachedItems("cachedURLs", function(result) {
            if (result) {
                cachedData = result['cachedURLs'];
                if (typeof cachedData === "undefined") {
                    cachedData = {};
                }
                if (cachedData[searchTermOrUrl] == null) {
                    cachedData[searchTermOrUrl] = newCacheItem;
                    objToStore["cachedURLs"] = cachedData;
                    chrome.storage.local.set(objToStore);
                }
            }
        });
    }

    //this function is called every 1 minute to check the cache items expiry.
    //If cached entry is older than 10 minutes, it is removed.
    this.clearExpiredCache = function() {
        var cachedURLs = null;
        var objToStore = {};
        var cachedData;
        var MS_PER_MINUTE = 60000;
        var durationInMinutes = envConfig.cacheExpiryTimeInMinutes;
        var time = new Date().getTime();
        var expiryCheck = new Date(time - durationInMinutes * MS_PER_MINUTE).getTime();

        // To fix cache got cleared unexpectedly and there by having performance issue
        if(!cachedDataStorage){
            return;
        }
        
        cachedData = cachedDataStorage;
        cachedURLs = Object.keys(cachedData);
        var isMemoryCacheModified = false;
        cachedURLs.forEach(function(url) {
            if (cachedData[url]) {
                if (cachedData[url].timeStamp < expiryCheck) {
                    isMemoryCacheModified = true;
                    delete cachedData[url];
                }
            }
        });

        if (isMemoryCacheModified) {
            cachedDataStorage = cachedData;
            objToStore["cachedURLs"] = cachedData;
            chrome.storage.local.set(objToStore, function() {});
        }

    }

    // Wipes all local cache. Used when user logs out of RM Unify.
    this.wipeCache = function() {
        chrome.storage.local.clear(function() {
            var error = chrome.runtime.lastError;
            if (error) {
                console.error(error);
            }
        });

        cachedDataStorage = {};
    }

    //log the cached url access history and content filter history to user access log   
    this.logCachedUrlAccess = function(searchTermOrUrl, newLogItem) {

        var cachedUrl = searchTermOrUrl;
        var state = newLogItem.state;
        var flid = newLogItem.filterListID;
        var method = newLogItem.method;
        var resourceType = newLogItem.resourceType;

        if(!localStorage.getItem('RM-SafetyNet-Device-Token'))
        {
            return;
        }

        if (envConfig.baseAPIURL) {
            var params = JSON.stringify({
                cachedUrl: cachedUrl,
                state: state,
                flid: flid,
                method: method,
                resourceType: resourceType
            });

            var requestHeader = [];
            requestHeader['Authorization'] = 'Bearer ' + localStorage.getItem('RM-SafetyNet-Device-Token');
            requestHeader['Content-type'] = 'application/json; charset=utf-8';

            var options = {
                url: logApiUrl,
                method: 'POST',
                async: true,
                retryCount: 3,
                headers: requestHeader,
                data: params
            }

            apiHelper.callAPI(options);
        }
    }

    //**********************
    // End public functions
    //**********************

    //**********************
    // Private functions
    //**********************

    function getCachedItems(cacheKey, callback) {
        chrome.storage.local.get(cacheKey, function(result) {
            callback(result);
        });

    }

    //calls the clear cache function every n minutes to check for expired cache entries.
    setInterval(function() {
        self.clearExpiredCache();
    }, clearCacheTimeout);

    //**********************
    // End private functions
    //**********************

}
