describe('URL filter', function () {

    // mock config/envconfig.json file
    var envConfig = {
        "extensionName": "RM SafetyNet (CI)",
        "baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
        "baseUnifySTSURL": "https://sso.quail.unify.rmlp.com",
        "sendHistoryInterval": 60000,
        "cacheCheckForExpiredInterval": 60000,
        "cacheExpiryTimeInMinutes": 10
    }

    // mocked block request example
    var blockedWebRequest = {
        frameId: 0,
        method: "GET",
        parentFrameId: -1,
        requestId: "54662",
        tabId: 1437,
        timeStamp: 1428919013037.7551,
        type: "main_frame",
        url: "http://www.rm.com/"
    }

    // mocked block request example
    var blockedWebRequest_xhr = {
        frameId: 0,
        method: "GET",
        parentFrameId: -1,
        requestId: "54662",
        tabId: 1437,
        timeStamp: 1428919013037.7551,
        type: "xmlhttprequest",
        url: "http://www.rm.com/"
    }

    // mocked allowed request example
    var allowedWebRequest = {
        frameId: 0,
        method: "GET",
        parentFrameId: -1,
        requestId: "54662",
        tabId: 1437,
        timeStamp: 1428919013037.7551,
        type: "main_frame",
        url: "http://www.safetynet.rm.com/"
    }

    // mocked unknown request example
    var unknownWebRequest = {
        frameId: 0,
        method: "GET",
        parentFrameId: -1,
        requestId: "54662",
        tabId: 1437,
        timeStamp: 1428919013037.7551,
        type: "main_frame",
        url: "http://www.tts-group.com/"
    }

    // mocked whitelist request example
    var whitelistedWebRequest = {
        frameId: 0,
        method: "GET",
        parentFrameId: -1,
        requestId: "54662",
        tabId: 1437,
        timeStamp: 1428919013037.7551,
        type: "main_frame",
        url: "http://www.rmunify.com/"
    }

    // mocked chrome-extension request example
    var chromeExtensionWebRequest = {
        frameId: 0,
        method: "GET",
        parentFrameId: -1,
        requestId: "54662",
        tabId: 1437,
        timeStamp: 1428919013037.7551,
        type: "main_frame",
        url: "chrome-extension://kjngkoadcabocnkacachliadicloljan/content/device-filter-error.htm"
    }

    var _urlFilter = null;
    var _apiHelper = new apiHelper();
    var mockRequestTypeAnalyser = {
        getRequestType: function(details) {
            if(details.type === 'main_frame') {
                return 'html';
            }
            return null;
        }
    }
    // tests the requests which would call through to the API
    describe('uncached requests', function () {

        var checkCacheSpy, updateCacheSpy, showErrorPageSpy, errorMsgsSpy, mockErrorManager;

        beforeEach(function () {

            // mock cache manager. Always returns not found to force API to be called.
            var mockCacheManager = {
                checkCache: function (url) {
                    var urlStates = {
                        state: "NOTFOUND"
                    }
                    return urlStates
                },
                updateCache: function (searchTermOrUrl, state, filterpageURL, contentfilterRequired) { }
            }

            mockErrorManager = {
                errorMsgs: {
                    AUTH_FAILURE: 'Unable to set unify Authentication Token',
                    INVALIDWORDLISTSTATUS: 'Unable to get WordList from SafetyNet Server, server returned invalid HTTP status',
                    FAILEDAPICHECK: 'Unable to connect to SafetyNet Server, web request failed',
                    INVALIDAPISTATUS: 'Unable to connect to SafetyNet Server, server returned invalid HTTP status',
                    INVALIDWHITELISTSTATUS: 'Unable to get WhiteList from SafetyNet Server, server returned invalid HTTP status',
                    INVALIDWORDLIST: 'Invalid response from server, unable to read WordList from response',
                    FAILEDWORDLISTCALL: 'Unable to get WordList from SafetyNet Server, web request failed',
                    FAILEDWHITELISTCALL: 'Unable to get WhiteList from SafetyNet Server, web request failed',
                },
                showErrorPage: function (tabId) { }
            }

            var mockWhitelistManager = {
                getWhiteListURLs: function (tabId) { }
            }

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(['http://fdgkjdfhgd.com']);
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            // spies to help monitor when functions are or aren't called
            checkCacheSpy = spyOn(mockCacheManager, 'checkCache').and.callThrough();
            updateCacheSpy = spyOn(mockCacheManager, 'updateCache').and.callThrough();
            showErrorPageSpy = spyOn(mockErrorManager, 'showErrorPage').and.callThrough();
            errorMsgsSpy = spyOn(mockErrorManager, 'errorMsgs');
            // initialise new url filter with mock cache manager and mock env config
            _urlFilter = new urlFilter(mockCacheManager, mockWhitelistManager, mockErrorManager, envConfig, _apiHelper, mockRequestTypeAnalyser);

            // required to mock ajax requests
            jasmine.Ajax.install();
        })

        afterEach(function () {

            // required to mock ajax requests
            jasmine.Ajax.uninstall();

        });

        it('should return filter page redirect for blocked URL and update the cache with the response', function () {

            // generate what the API request URL should be
            var formatUrl = envConfig.baseAPIURL + '/api/url?url=' + encodeURIComponent(blockedWebRequest.url) + '&method=' + blockedWebRequest.method + '&reqType=html';

            // generate mock response
            var response = JSON.stringify(["BLOCKED", "http://www.filterpage.com", "100", 1]);

            // stub mock response
            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                "responseText": response
            });

            // call url filter to check URL
            var urlState = _urlFilter.checkURL(blockedWebRequest);

            // expected results
            expect(urlState.state).toEqual("BLOCKED");
            expect(urlState.response.redirectUrl).toEqual("http://www.filterpage.com");
            expect(checkCacheSpy).toHaveBeenCalledWith(blockedWebRequest.url);
            expect(updateCacheSpy).toHaveBeenCalledWith(blockedWebRequest.url, "BLOCKED", "http://www.filterpage.com", 1, "100", "GET", "html");
        })

        it('should allow allowed URL request to be made and update the cache with the response', function () {

            // generate what the API request URL should be
            var formatUrl = envConfig.baseAPIURL + '/api/url?url=' + encodeURIComponent(allowedWebRequest.url) + '&method=' + allowedWebRequest.method + '&reqType=html';

            // generate mock response
            var response = JSON.stringify(["ALLOWED", "UNKNOWN", "100", 1]);

            // stub mock response
            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                "responseText": response
            });

            // call url filter to check URL
            var urlState = _urlFilter.checkURL(allowedWebRequest);

            // expected results
            expect(urlState.state).toEqual("ALLOWED");
            expect(urlState.response.cancel).toEqual(false);
            expect(checkCacheSpy).toHaveBeenCalledWith(allowedWebRequest.url);
            expect(updateCacheSpy).toHaveBeenCalledWith(allowedWebRequest.url, "ALLOWED", "UNKNOWN", 1, "100", "GET", "html");
        })

        it('should allow unknown URL request to be made and update the cache with the response', function () {

            // generate what the API request URL should be
            var formatUrl = envConfig.baseAPIURL + '/api/url?url=' + encodeURIComponent(unknownWebRequest.url) + '&method=' + unknownWebRequest.method + '&reqType=html';

            // generate mock response
            var response = JSON.stringify(["UNKNOWN", "UNKNOWN", "100", 1]);

            // stub mock response
            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                "responseText": response
            });

            // call url filter to check URL
            var urlState = _urlFilter.checkURL(unknownWebRequest);

            // expected results
            expect(urlState.state).toEqual("UNKNOWN");
            expect(urlState.response.cancel).toEqual(false);
            expect(checkCacheSpy).toHaveBeenCalledWith(unknownWebRequest.url);
            expect(updateCacheSpy).toHaveBeenCalledWith(unknownWebRequest.url, "UNKNOWN", "UNKNOWN", 1, "100", "GET", "html");
        })

        it('should call error manager if API returns a status code of 500', function () {

            // generate what the API request URL should be
            var formatUrl = envConfig.baseAPIURL + '/api/url?url=' + encodeURIComponent(unknownWebRequest.url) + '&method=' + unknownWebRequest.method + '&reqType=html';

            // stub mock response
            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                "status": 500
            });

            // call url filter to check URL
            var urlState = _urlFilter.checkURL(unknownWebRequest);

            expect(showErrorPageSpy).toHaveBeenCalledWith(unknownWebRequest.tabId, mockErrorManager.errorMsgs.INVALIDAPISTATUS);

        })

    })

    describe('cached requests', function () {

        beforeEach(function () {

            // more conprehensive mock cache manager that returns depending on URL
            var mockCacheManager = {
                checkCache: function (url) {

                    var urlState = null;

                    if (url == blockedWebRequest.url) {
                        urlState = {
                            state: "BLOCKED",
                            redirectUrl: "http://www.filterpage.com"
                        }
                    }
                    else if (url == allowedWebRequest.url) {
                        urlState = {
                            state: "ALLOWED"
                        }
                    }
                    else if (url == unknownWebRequest.url) {
                        urlState = {
                            state: "UNKNOWN"
                        }
                    }

                    return urlState
                }
            }

            var mockErrorManager = {
                showErrorPage: function (tabId) { }
            }

            var mockWhitelistManager = {
                getWhiteListURLs: function (tabId) { }
            }

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(['http://fdgkjdfhgd.com']);
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            checkCacheSpy = spyOn(mockCacheManager, 'checkCache').and.callThrough();

            _urlFilter = new urlFilter(mockCacheManager, mockWhitelistManager, mockErrorManager, envConfig, _apiHelper, mockRequestTypeAnalyser);

            jasmine.Ajax.install();

        })

        afterEach(function () {

            jasmine.Ajax.uninstall();

        });

        it('should block a blocked cached URL', function () {

            var urlState = _urlFilter.checkURL(blockedWebRequest);

            expect(checkCacheSpy).toHaveBeenCalledWith(blockedWebRequest.url);
            expect(urlState.state).toEqual("BLOCKED");
            expect(urlState.response.redirectUrl).toEqual("http://www.filterpage.com");

        })

        it('should allow an allowed cached URL', function () {

            var urlState = _urlFilter.checkURL(allowedWebRequest);

            expect(checkCacheSpy).toHaveBeenCalledWith(allowedWebRequest.url);
            expect(urlState.state).toEqual("ALLOWED");
            expect(urlState.response.cancel).toEqual(false);

        })

        it('should allow an unknown cached URL', function () {

            var urlState = _urlFilter.checkURL(unknownWebRequest);

            expect(checkCacheSpy).toHaveBeenCalledWith(unknownWebRequest.url);
            expect(urlState.state).toEqual("UNKNOWN");
            expect(urlState.response.cancel).toEqual(false);

        })

    })

    describe('unauthenticated requests', function () {

        var updateCacheSpy, checkCacheSpy, chromeTabSpy;
        var googleToken = 'ya29.CjMsA6_F9Xgfco9lQJIcD9votd2DCSUx5eIwtiAGt3wg-3MRs-cTkUcilQRoCEwyrk2gj4I';
        beforeEach(function () {
            chrome.tabs = {
                update: function (tabid) { }
            }

            chrome.identity = {

            }
            chrome.identity = {
                removeCachedAuthToken: function (key) {

                },
                getAuthToken: function (key, callback) {
                    callback(googleToken);
                }
            }



            var mockCacheManager = {
                checkCache: function (url) {
                    var urlStates = {
                        state: "NOTFOUND"
                    }
                    return urlStates
                },
                updateCache: function () { }
            }



            var mockErrorManager = {
                showErrorPage: function (tabId) { }
            }

            var mockWhitelistManager = {
                getWhiteListURLs: function (tabId) { }
            }

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(['http://fdgkjdfhgd.com']);
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            checkCacheSpy = spyOn(mockCacheManager, 'checkCache').and.callThrough();
            updateCacheSpy = spyOn(mockCacheManager, 'updateCache').and.callThrough();
            chromeTabSpy = spyOn(chrome.tabs, 'update');
            _urlFilter = new urlFilter(mockCacheManager, mockWhitelistManager, mockErrorManager, envConfig, _apiHelper, mockRequestTypeAnalyser);

            jasmine.Ajax.install();
        })

        afterEach(function () {
            jasmine.Ajax.uninstall();
        });

        it('should return a redirect to the Unify authentication URL if the request was unautheticated with google token and type main_frame', function () {


            //var getTokenSpy = spyOn(chrome.identity, 'getAuthToken').and.callThrough();
            var googleUrl = envConfig.baseAPIURL + '/api/auth/login/google?' + 'token=' + googleToken + '&url=' + 'https://sso.quail.unify.rmlp.com/issue/saml/?binding=redirect&SAMLRequest=faketoken';
            var authURL = envConfig.baseUnifySTSURL + '/issue/saml/?binding=redirect&SAMLRequest=faketoken'

            jasmine.Ajax.stubRequest(googleUrl).andReturn({
                status: 401,
                "responseText": JSON.stringify({
                    'state': 'UNAUTHENTICATED',
                    'loginURL': authURL,
                    'RedirectURL': blockedWebRequest.url
                })

            });
            var formatUrl = envConfig.baseAPIURL + '/api/url?url=' + encodeURIComponent(blockedWebRequest.url) + '&method=' + blockedWebRequest.method + '&reqType=html';

            // generate unify login URL usually generate by the API

            var response = JSON.stringify({ "loginURL": authURL });

            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                status: 401,
                "responseText": JSON.stringify({
                    'state': 'UNAUTHENTICATED',
                    'loginURL': envConfig.baseAPIURL + '/api/auth/login/google',
                    'RedirectURL': 'https://sso.quail.unify.rmlp.com/issue/saml/?binding=redirect&SAMLRequest=faketoken'
                })

            });

            var urlState = _urlFilter.checkURL(blockedWebRequest);

            expect(checkCacheSpy).toHaveBeenCalledWith(blockedWebRequest.url);
            // expect(urlState.state).toEqual("ALLOWED");
            //expect(urlState.response.redirectUrl).toEqual(authURL);
            expect(updateCacheSpy).not.toHaveBeenCalled();
            expect(chromeTabSpy).toHaveBeenCalledWith(blockedWebRequest.tabId, { url: authURL });
        })

        it('should authenticate with google token if the request was type main_frame', function () {

            /*chrome.identity = {};
            var googleToken = 'ya29.CjMsA6_F9Xgfco9lQJIcD9votd2DCSUx5eIwtiAGt3wg-3MRs-cTkUcilQRoCEwyrk2gj4I';
            chrome.identity.getAuthToken = function (key, callback) {
                callback(googleToken);
            }*/
            //var getTokenSpy = spyOn(chrome.identity, 'getAuthToken').and.callThrough();
            var googleUrl = envConfig.baseAPIURL + '/api/auth/login/google?' + 'token=' + googleToken + '&url=' + blockedWebRequest.url;
            var getTokenSpy = spyOn(chrome.identity, 'getAuthToken').and.callThrough();
            var formatUrl = envConfig.baseAPIURL + '/api/url?url=' + encodeURIComponent(blockedWebRequest.url) + '&method=' + blockedWebRequest.method + '&reqType=html';


            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                status: 401,
                "responseText": JSON.stringify({
                    'state': 'UNAUTHENTICATED',
                    'loginURL': envConfig.baseAPIURL + '/api/auth/login/google',
                    'RedirectURL': blockedWebRequest.url
                })

            });

            jasmine.Ajax.stubRequest(googleUrl).andReturn({
                status: 200,
                "responseText": JSON.stringify({
                    'state': 'ALLOWED',
                    'loginURL': envConfig.baseAPIURL + '/api/auth/login/google',
                    'RedirectURL': 'wwww.google.com'
                })

            });

            var urlState = _urlFilter.checkURL(blockedWebRequest);

            expect(checkCacheSpy).toHaveBeenCalledWith(blockedWebRequest.url);
            expect(urlState.response.cancel).toEqual(true);
            expect(updateCacheSpy).not.toHaveBeenCalled();
            expect(getTokenSpy).toHaveBeenCalled();
        })

        it('should be cancelled if the request was type xmlhttprequest', function () {

            var formatUrl = envConfig.baseAPIURL + '/api/url?url=' + encodeURIComponent(blockedWebRequest_xhr.url) + '&method=' + blockedWebRequest.method;

            var googleUrl = envConfig.baseAPIURL + '/api/auth/login/google?' + 'token=' + googleToken + '&url=' + blockedWebRequest.url;

            jasmine.Ajax.stubRequest(googleUrl).andReturn({
                status: 200,
                "responseText": JSON.stringify({
                    'state': 'ALLOWED',
                    'loginURL': envConfig.baseAPIURL + '/api/auth/login/google',
                    'RedirectURL': 'wwww.google.com'
                })

            });


            // generate unify login URL usually generate by the API
            var authURL = envConfig.baseUnifySTSURL + '/issue/saml/?binding=redirect&SAMLRequest=faketoken'

            var response = JSON.stringify(
                {
                    "loginURL": googleUrl,
                    "RedirectURL": blockedWebRequest.url
                });

            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                status: 401,
                'RedirectURL': envConfig.baseAPIURL + 'www.goole.com',
                "responseText": response
            });

            var urlState = _urlFilter.checkURL(blockedWebRequest_xhr);

            expect(checkCacheSpy).toHaveBeenCalledWith(blockedWebRequest_xhr.url);
            expect(urlState.state).toEqual(undefined);
            expect(urlState.response.cancel).toEqual(true);
            expect(updateCacheSpy).not.toHaveBeenCalled();
            expect(chromeTabSpy).not.toHaveBeenCalled();
        })

    })

    describe('whitelisted request', function () {

        beforeEach(function () {
            var newLogItem = {
                'state': 'DENIED',
                'filterListID': '0',
                'method': 'GET'
            };
            var mockCacheManager = {
                checkCache: function (url) {
                    var urlStates = {
                        state: "NOTFOUND"
                    }
                    return urlStates
                },
                logCachedUrlAccess: function (url, newLogItem) {
                    var params = JSON.stringify({ cachedUrl: url, state: newLogItem.state, flid: newLogItem.flid, method: newLogItem.method });
                    var formatUrl = envConfig.baseAPIURL + '/api/history/logEntry';
                    jasmine.Ajax.stubRequest(formatUrl).andReturn({
                        status: 200,
                        "responseText": 'OK'
                    });
                }
            }

            var mockErrorManager = {
                showErrorPage: function (tabId) { }
            }

            var mockWhitelistManager = {
                getWhiteListURLs: function (tabId) { }
            }

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(['http://rmunify.com']);
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();
            checkCacheSpy = spyOn(mockCacheManager, 'checkCache').and.callThrough();
            getWhitelistSpy = spyOn(mockWhitelistManager, 'getWhiteListURLs').and.callThrough();;

            _urlFilter = new urlFilter(mockCacheManager, mockWhitelistManager, mockErrorManager, envConfig, _apiHelper, mockRequestTypeAnalyser);

            jasmine.Ajax.install();

        })

        afterEach(function () {

            jasmine.Ajax.uninstall();

        });

        it('should automatically allow a whitelisted page if page is in cached whitelist and whitelist contains exact string match regex', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(["^www.rmunify.com$"]);
            }

            var urlState = _urlFilter.checkURL(whitelistedWebRequest);

            expect(urlState.state).toEqual("ALLOWED");
            expect(mockLocalGetItem).not.toHaveBeenCalled();
            expect(getWhitelistSpy).not.toHaveBeenCalled();

        })

        it('should automatically allow a whitelisted page if page is in cached whitelist and whitelist contains wildcard string match regex', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(["[^.\s]+\.rmunify\.com"]);
            }

            var urlState = _urlFilter.checkURL(whitelistedWebRequest);

            expect(urlState.state).toEqual("ALLOWED");
            expect(mockLocalGetItem).not.toHaveBeenCalled();
            expect(getWhitelistSpy).not.toHaveBeenCalled();

        })

        it('shouldn\'t allow a URL through which doesn\'t match the regex in hostname but does in the path', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(["[^.\s]+\.google\.com/rmunify.com"]);
            }

            var urlState = _urlFilter.checkURL(whitelistedWebRequest);

            expect(urlState).toBeUndefined();
            expect(mockLocalGetItem).not.toHaveBeenCalled();
            expect(getWhitelistSpy).not.toHaveBeenCalled();

        })

        it('shouldn\'t allow a URL through which doesn\'t match the regex in hostname', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return JSON.stringify(["[^.\s]+\.rmuunify\.com"]);
            }

            var urlState = _urlFilter.checkURL(whitelistedWebRequest);

            expect(urlState).toBeUndefined();
            expect(mockLocalGetItem).not.toHaveBeenCalled();
            expect(getWhitelistSpy).not.toHaveBeenCalled();

        })

        it('should call white list manager if whitelist is empty', function () {

            var localStorageCallCount = 0;

            // mock get item
            localStorage.getItem = function (key) {

                localStorageCallCount++;

                if (localStorageCallCount == 1) {
                    return null;
                }
                else {
                    return JSON.stringify(["www.rmunify.com"]);
                }
            }

            var urlState = _urlFilter.checkURL(whitelistedWebRequest);

            expect(urlState.state).toEqual("ALLOWED");
            expect(mockLocalGetItem).not.toHaveBeenCalled();
            expect(getWhitelistSpy).toHaveBeenCalled();

        })


    })

})