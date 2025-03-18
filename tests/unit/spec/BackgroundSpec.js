describe('Background task', function () {

	setInterval = function (callback, timeout) { }

	var onBeforeRequestCallbackUrlFilter, onBeforeRequestCallbackLogout, onErrorOccurredCallBack, getAllWindowsCallback, onInstalledCallback;

	chrome = {
		webRequest: {
			onBeforeRequest: {
				addListener: function (callback, filter, opt_extraInfoSpec) {
					if (filter.urls.length > 1) {
						onBeforeRequestCallbackUrlFilter = callback;
					}
					else {
						onBeforeRequestCallbackLogout = callback;
					}
				}
			},
			onHeadersReceived: {
				addListener: function (callback, filter, opt_extraInfoSpec) {

				}
			},
			onErrorOccurred: {
				addListener: function (callback, details, sender) {
					onErrorOccurredCallBack = callback;
				}
			}
		},
		runtime: {
			onMessage: {
				addListener: function (callback) { }
			},
			onInstalled: {
				addListener: function (callback) {
					onInstalledCallback = callback;
				}
			},
			getManifest: function () {
				return {
					version: '0.0.0'
				}
			}
		},
		tabs: {
			update: function (tabId, options) {

			},
			getSelected: function (windowId, callback) {

			}
		},
		extension: {
			getURL: function (url) {

			}
		},
		windows: {
			getAll: function (options, callback) {
				getAllWindowsCallback = callback;
			}
		}
	}

	var _apiHelper = new apiHelper();

	describe('start up checks', function () {

		var mockEnvConfig = {
			"extensionName": "RM SafetyNet (INT)",
			"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
			"sendHistoryInterval": 60000,
			"cacheCheckForExpiredInterval": 60000,
			"cacheExpiryTimeInMinutes": 10,
			"errorPageLocation": "content/device-filter-error.htm"
		}



		var spyMockLocalStorage;
		localStorage.clear = function () {
		}


		var windows = [
			{
				tabs: [
					{
						id: 1,
						url: 'http://www.safetynet.com'
					},
					{
						id: 2,
						url: 'http://www.safetynet2.com'
					},
					{
						id: 3,
						url: 'http://www.safetynet3.com'
					},
					{
						id: 4,
						url: 'http://www.safetynet4.com'
					},
				]
			},
			{
				tabs: [
					{
						id: 5,
						url: 'https://www.google.co.uk/search?q=rm+education&oq=rm+educa&aqs=chrome.0.69i59j69i60j0j69i60l2j69i57.1292j0j7&sourceid=chrome&es_sm=91&ie=UTF-8'
					},
					{
						id: 5,
						url: 'https://www.google.co.uk/search?q=rm+education&oq=rm+educa&aqs=chrome.0.69i59j69i60j0j69i60l2j69i57.1292j0j7&sourceid=chrome&es_sm=91&ie=UTF-8&safe=active'
					}
				]
			}
		]

		it('should check the URL filter status of all open tabs in all open windows if the user has an auth token', function () {

			var localStorageGetItemSpy, localStorageSetItemSpy;

			localStorage.getItem = function (key) {
				return 'test token';
			}

			localStorageGetItemSpy = spyOn(localStorage, 'getItem').and.callThrough();

			var mockURLFilter = {
				checkURL: function (details) {
					if (details.url === 'http://www.safetynet.com') {
						return {
							response: {
								redirectUrl: 'http://filterpage.com'
							},
							state: 'BLOCKED'
						}
					}
					else {
						return {
							state: 'ANYTHINGOTHERTHANBLOCKED'
						}
					}
				}
			}

			var spyUpdateTab = spyOn(chrome.tabs, 'update')

			var _background = new background(mockURLFilter, null, null, null, null, mockEnvConfig);

			getAllWindowsCallback(windows);

			expect(localStorageGetItemSpy).toHaveBeenCalledWith('RM-SafetyNet-Device-Token');
			expect(spyUpdateTab).toHaveBeenCalledWith(1, { url: 'http://filterpage.com' });
			expect(spyUpdateTab).toHaveBeenCalledWith(5, { url: 'https://www.google.co.uk/search?q=rm+education&oq=rm+educa&aqs=chrome.0.69i59j69i60j0j69i60l2j69i57.1292j0j7&sourceid=chrome&es_sm=91&ie=UTF-8&safe=active' });

		});

		it('shouldn\'t check the URL filter status of all open tabs in all open windows if the user has no an auth token', function () {

			var localStorageGetItemSpy, localStorageSetItemSpy;

			localStorage.getItem = function (key) {
				return null;
			}

			localStorageGetItemSpy = spyOn(localStorage, 'getItem').and.callThrough();

			var mockURLFilter = {
				checkURL: function () { }
			}

			var spyUpdateTab = spyOn(chrome.tabs, 'update')

			var _background = new background(mockURLFilter, null, null, null, null, mockEnvConfig);

			getAllWindowsCallback(windows);

			expect(localStorageGetItemSpy).toHaveBeenCalledWith('RM-SafetyNet-Device-Token');
			expect(spyUpdateTab).not.toHaveBeenCalled();

		});

		it('shouldn\'t clear cache on extension install', function () {

			var mockCacheManager = {
				wipeCache: function () { }
			}

			var mockContentFilterManager = {
				wipeInMemoryWordList: function () { }
			}
			spyMockLocalStorage = spyOn(localStorage, 'clear').and.callThrough();
			var spyMockCacheManager = spyOn(mockCacheManager, 'wipeCache').and.callThrough();
			var spyMockContentFilterManager = spyOn(mockContentFilterManager, 'wipeInMemoryWordList').and.callThrough();

			var _background = new background(null, mockCacheManager, null, mockContentFilterManager, null, mockEnvConfig);

			var reason = {
				reason: 'install'
			}

			onInstalledCallback(reason);

			expect(spyMockLocalStorage).not.toHaveBeenCalled();
			expect(spyMockCacheManager).not.toHaveBeenCalled();
			expect(spyMockContentFilterManager).not.toHaveBeenCalled();

		});

		it('should clear cache on extension update', function () {



			var mockCacheManager = {
				wipeCache: function () { }
			}

			var mockContentFilterManager = {
				wipeInMemoryWordList: function () { }
			}

			spyMockLocalStorage = spyOn(localStorage, 'clear').and.callThrough();

			var spyMockCacheManager = spyOn(mockCacheManager, 'wipeCache').and.callThrough();
			var spyMockContentFilterManager = spyOn(mockContentFilterManager, 'wipeInMemoryWordList').and.callThrough();

			var _background = new background(null, mockCacheManager, null, mockContentFilterManager, null, mockEnvConfig);

			var reason = {
				reason: 'update'
			}

			onInstalledCallback(reason);

			expect(spyMockLocalStorage).toHaveBeenCalled();
			expect(spyMockCacheManager).toHaveBeenCalled();
			expect(spyMockContentFilterManager).toHaveBeenCalled();

		});



	});

	describe('request event', function () {
		Tab = { id: 123 }
		chrome.tabs = {
			create: function (options) { },
			update: function (tabId, options) { },
			getSelected: function (tabid) {
				return Tab;
			}
		}
		beforeEach(function () {
			jasmine.Ajax.install();
		})

		afterEach(function () {
			jasmine.Ajax.uninstall();
		})

		it('should call the URL filter every time a request is made', function () {

			var mockEnvConfig = {
				"extensionName": "RM SafetyNet (INT)",
				"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
				"sendHistoryInterval": 60000,
				"cacheCheckForExpiredInterval": 60000,
				"cacheExpiryTimeInMinutes": 10,
				"errorPageLocation": "content/device-filter-error.htm"
			}

			var expectedResponse = {
				state: "ALLOWED",
				response: {
					cancel: false
				}
			}

			var mockURLFilter = {
				checkURL: function (details) {
					return expectedResponse
				}
			}

			var spyMockURLFilter = spyOn(mockURLFilter, 'checkURL').and.callThrough();

			var _background = new background(mockURLFilter, null, null, null, null, mockEnvConfig);

			var mockRequest = {
				frameId: 0,
				method: "GET",
				parentFrameId: -1,
				requestId: "54662",
				tabId: 1437,
				timeStamp: 1428919013037.7551,
				type: "main_frame",
				url: "http://www.rm.com/"
			}

			var responseToChrome = onBeforeRequestCallbackUrlFilter(mockRequest);

			expect(spyMockURLFilter).toHaveBeenCalledWith(mockRequest)
			expect(responseToChrome).toEqual(expectedResponse.response);

		});

		it('shouldn\'t call the URL filter if the request request safe search change', function () {

			var mockEnvConfig = {
				"extensionName": "RM SafetyNet (INT)",
				"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
				"sendHistoryInterval": 60000,
				"cacheCheckForExpiredInterval": 60000,
				"cacheExpiryTimeInMinutes": 10,
				"errorPageLocation": "content/device-filter-error.htm"
			}

			var expectedResponse = {
				state: "ALLOWED",
				response: {
					cancel: false
				}
			}

			var mockURLFilter = {
				checkURL: function (details) {
					return expectedResponse
				}
			}

			var spyMockURLFilter = spyOn(mockURLFilter, 'checkURL').and.callThrough();

			var _background = new background(mockURLFilter, null, null, null, null, mockEnvConfig);

			var mockRequest = {
				frameId: 0,
				method: "GET",
				parentFrameId: -1,
				requestId: "54662",
				tabId: 1437,
				timeStamp: 1428919013037.7551,
				type: "main_frame",
				url: "http://www.google.com/search?q=fakesearchurl"
			}

			var responseToChrome = onBeforeRequestCallbackUrlFilter(mockRequest);

			expect(spyMockURLFilter).not.toHaveBeenCalled()
			expect(responseToChrome.redirectUrl).toEqual(jasmine.any(String));

		});

		it('should redirect to offline filter page if filterpage server is down', function () {

			var getSelectedSpy = spyOn(chrome.tabs, 'getSelected').and.callThrough();
			var updateTabSpy = spyOn(chrome.tabs, 'update');
			var localStorageGetItemSpy, mockErrorManagerSpy;
			var mockEnvConfig = {
				"extensionName": "RM SafetyNet (INT)",
				"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
				"sendHistoryInterval": 60000,
				"cacheCheckForExpiredInterval": 60000,
				"cacheExpiryTimeInMinutes": 10,
				"errorPageLocation": "content/device-filter-error.htm",
				"filterPageLocation": "views/errors/default-filter-page.htm"
			}

			jasmine.Ajax.stubRequest('https://rmsftynetint01templates.blob.core.windows.net/filterpages/10865-62356.htm#f=0').andReturn({
				"status": 503
			});

			var expectedResponse = {
				state: "BLOCKED",
				response: {
					cancel: false,
					redirectUrl: 'https://rmsftynetint01templates.blob.core.windows.net/filterpages/10865-62356.htm#f=0'
				}

			}
			var _errorManager = new errorManager(mockEnvConfig);
			var mockErrorManager = {
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
				showFilterPage: function (tabId, filterPageUrl, estID) {
					return true;
				}
			}

			var mockURLFilter = {
				checkURL: function (details) {
					return expectedResponse
				}
			}

			//mockErrorManagerSpy = spyOn(mockErrorManager, 'showFilterPage');

			var spyMockURLFilter = spyOn(mockURLFilter, 'checkURL').and.callThrough();

			var _background = new background(mockURLFilter, null, null, null, _errorManager, mockEnvConfig);

			var mockRequest = {
				frameId: 0,
				method: "GET",
				parentFrameId: -1,
				requestId: "54662",
				tabId: 1437,
				timeStamp: 1428919013037.7551,
				type: "main_frame",
				url: "https://rmsftynetint01templates.blob.core.windows.net/filterpages/10865-62356.htm#f=0"
			}

			var responseToChrome = onErrorOccurredCallBack(mockRequest);
			expect(getSelectedSpy).toHaveBeenCalled();
			expect(updateTabSpy).toHaveBeenCalled();

			//expect(mockErrorManagerSpy).toHaveBeenCalledWith(1437, expectedResponse.response.redirectUrl, "10865");

		});
		it('should redirect to offline filter page if filterpage server is down and filterpage url is empty', function () {

			var getSelectedSpy = spyOn(chrome.tabs, 'getSelected').and.callThrough();
			var updateTabSpy = spyOn(chrome.tabs, 'update');
			var localStorageGetItemSpy, mockErrorManagerSpy;
			var mockEnvConfig = {
				"extensionName": "RM SafetyNet (INT)",
				"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
				"sendHistoryInterval": 60000,
				"cacheCheckForExpiredInterval": 60000,
				"cacheExpiryTimeInMinutes": 10,
				"errorPageLocation": "content/device-filter-error.htm",
				"filterPageLocation": "views/errors/default-filter-page.htm"
			}

			jasmine.Ajax.stubRequest('https://rmsftynetint01templates.blob.core.windows.net/filterpages/10865-62356.htm#f=0').andReturn({
				"status": 503
			});

			var expectedResponse = {
				state: "BLOCKED",
				response: {
					cancel: false,
					redirectUrl: ''
				}

			}
			var _errorManager = new errorManager(mockEnvConfig);
			var mockErrorManager = {
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
				showFilterPage: function (tabId, filterPageUrl, estID) {
					return true;
				}
			}

			var mockURLFilter = {
				checkURL: function (details) {
					return expectedResponse
				}
			}

			//mockErrorManagerSpy = spyOn(mockErrorManager, 'showFilterPage');

			var spyMockURLFilter = spyOn(mockURLFilter, 'checkURL').and.callThrough();

			var _background = new background(mockURLFilter, null, null, null, _errorManager, mockEnvConfig);

			var mockRequest = {
				frameId: 0,
				method: "GET",
				parentFrameId: -1,
				requestId: "54662",
				tabId: 1437,
				timeStamp: 1428919013037.7551,
				type: "main_frame",
				url: ""
			}

			var responseToChrome = onErrorOccurredCallBack(mockRequest);
			expect(getSelectedSpy).toHaveBeenCalled();
			expect(updateTabSpy).toHaveBeenCalled();

			//expect(mockErrorManagerSpy).toHaveBeenCalledWith(1437, expectedResponse.response.redirectUrl, "10865");

		});

	});

	// Test spec for setting auth token.
	describe("set authentication token", function () {

		var localStorageGetItemSpy, localStorageSetItemSpy;

		var mockCacheManager = {
			wipeCache: function () { }
		}

		var mockEnvConfig = {
			"extensionName": "RM SafetyNet (INT)",
			"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
			"sendHistoryInterval": 60000,
			"cacheCheckForExpiredInterval": 60000,
			"cacheExpiryTimeInMinutes": 10,
			"errorPageLocation": "content/device-filter-error.htm"
		}

		var mockErrorManager = {
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
			showErrorPage: function (tabId) {
				return true;
			}
		}

		var _background = new background(null, mockCacheManager, null, null, mockErrorManager, mockEnvConfig);

		it('should set device token when API returns token and there is no existing token', function () {

			localStorage.getItem = function (key) {
				return null;
			}

			localStorageGetItemSpy = spyOn(localStorage, 'getItem');

			localStorage.setItem = function (key, value) {
				return null;
			}

			localStorage.removeItem = function (key) { }

			localStorageRemoveItemSpy = spyOn(localStorage, 'removeItem');

			localStorageSetItemSpy = spyOn(localStorage, 'setItem');

			mockErrorManagerSpy = spyOn(mockErrorManager, 'showErrorPage');

			// mocked request 
			var mockRequest = {
				statusCode: 302,
				location: 'http://www.google.com',
				responseHeaders: [{ name: 'RM-SafetyNet-Device-Token', value: 'testtoken' }]
			}

			var status = _background.setAuthToken(mockRequest);

			expect(status).toEqual(undefined);
			expect(localStorageGetItemSpy).toHaveBeenCalledWith(mockRequest.responseHeaders[0].name);
			expect(localStorageSetItemSpy).toHaveBeenCalledWith(mockRequest.responseHeaders[0].name, mockRequest.responseHeaders[0].value)
			expect(localStorageRemoveItemSpy).not.toHaveBeenCalled();
			expect(mockErrorManagerSpy).not.toHaveBeenCalled();

		})

		it('should set device token when API returns token and there is an existing token', function () {

			localStorage.getItem = function (key) {
				return "existingtoken";
			}

			localStorageGetItemSpy = spyOn(localStorage, 'getItem').and.callThrough();

			localStorage.setItem = function (key, value) {
				return null;
			}

			localStorageSetItemSpy = spyOn(localStorage, 'setItem');

			localStorage.removeItem = function (key) { }

			localStorageRemoveItemSpy = spyOn(localStorage, 'removeItem');

			mockErrorManagerSpy = spyOn(mockErrorManager, 'showErrorPage');

			// mocked request 
			var mockRequest = {
				statusCode: 302,
				location: 'http://www.google.com',
				responseHeaders: [{ name: 'RM-SafetyNet-Device-Token', value: 'testtoken' }]
			}

			var status = _background.setAuthToken(mockRequest);

			expect(status).toEqual(undefined);
			expect(localStorageGetItemSpy).toHaveBeenCalledWith(mockRequest.responseHeaders[0].name);
			expect(localStorageSetItemSpy).toHaveBeenCalledWith(mockRequest.responseHeaders[0].name, mockRequest.responseHeaders[0].value)
			expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('RM-SafetyNet-Device-Token');
			expect(mockErrorManagerSpy).not.toHaveBeenCalled();

		})

		describe("error handling", function () {

			it('should update chrome tab when an error occured on the API', function () {

				var updateTabSpy = spyOn(chrome.tabs, 'update');

				mockErrorManagerSpy = spyOn(mockErrorManager, 'showErrorPage');
				mockErrorerrorMsgs = spyOn(mockErrorManager, 'errorMsgs');
				// mocked request 
				var mockRequest = {
					statusCode: 500,
					tabId: 123,
					location: 'http://www.google.com',
					responseHeaders: [{ name: 'RM-SafetyNet-Device-Token', value: 'testtoken' }]
				}

				var status = _background.setAuthToken(mockRequest);

				var expectedRedirectPath = "content/" + mockRequest.redirectUrl;

				expect(status).toEqual(undefined);
				expect(mockErrorManagerSpy).toHaveBeenCalledWith(mockRequest.tabId, mockErrorManager.errorMsgs.AUTH_FAILURE);
			});

		})

	});

	describe('clear local data on logout', function () {

		var mockEnvConfig = {
			"extensionName": "RM SafetyNet (INT)",
			"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
			"sendHistoryInterval": 60000,
			"cacheCheckForExpiredInterval": 60000,
			"cacheExpiryTimeInMinutes": 10,
			"errorPageLocation": "content/device-filter-error.htm",
			"policyCheckInterval": 600000,
		}

		var mockCacheManager = {
			wipeCache: function () {

			}
		}

		var mockContentFilterManager = {
			wipeInMemoryWordList: function () {

			}
		}

		var _background = new background(null, mockCacheManager, null, mockContentFilterManager, null, mockEnvConfig);

		it('should clear local data', function () {

			localStorage.clear = function () {

			}

			var spyWipeData = spyOn(mockCacheManager, 'wipeCache');
			var spyWipeWordListData = spyOn(mockContentFilterManager, 'wipeInMemoryWordList');
			var spyLocalStorageClear = spyOn(localStorage, 'clear');

			_background.clearData();

			expect(spyWipeData).toHaveBeenCalled();
			expect(spyWipeWordListData).toHaveBeenCalled();
			expect(spyLocalStorageClear).toHaveBeenCalled();

		});

	});

	describe("Force safe search on", function () {

		// Google - no safe search
		var details_no_safe_search = {
			url: "https://www.google.co.uk/search?q=hello",
			type: 'main_frame',
			tabId: 104
		}

		// Google - safe search enabled
		var details_safe_search = {
			url: "https://www.google.co.uk/search?q=hello",
			type: 'main_frame',
			tabId: 104
		}

		// Google - conflicting safe searches
		var details_duplicate_safe_search_on_google = {
			url: "https://www.google.co.in/search?q=hello&safe=active&safe=off",
			type: 'main_frame',
			tabId: 107
		}

		// Google - conflicting safe searches different tdl
		var details_duplicate_safe_search_different_tld = {
			url: "https://www.google.co.uk/search?q=hello&safe=active&safe=off",
			type: 'main_frame',
			tabId: 108
		}

		// Bing - safe search not on
		var details_safe_search_not_on_bing = {
			url: "http://www.bing.com/search?q=sachin&go=Submit&qs=n&form=QBLH&pq=sachin&sc=9-6&sp=-1&sk=&cvid=163CD1E5C05E4DED9CE55986D9328E82",
			type: 'main_frame',
			tabId: 106
		}

		// Bing - safe search enabled
		var details_safe_search_on_bing = {
			url: "http://www.bing.com/search?q=sachin&go=Submit&qs=n&form=QBLH&pq=sachin&sc=9-6&sp=-1&sk=&cvid=163CD1E5C05E4DED9CE55986D9328E82&adlt=strict",
			type: 'main_frame',
			tabId: 106
		}

		// Bing - conflicting safe searches
		var details_duplicate_safe_search_bing = {
			url: "http://www.bing.com/search?q=hello&adlt=strict&adlt=off",
			type: 'main_frame',
			tabId: 109
		}

		// Yahoo - safe search not on
		var details_safe_search_not_on_yahoo = {
			url: "https://in.search.yahoo.com/search?p=cricket&fr=yfp-t-704",
			type: 'main_frame',
			tabId: 105
		}

		// Yahoo - safe search enabled 
		var details_safe_search_on_yahoo = {
			url: "https://in.search.yahoo.com/search?p=cricket&fr=yfp-t-704&vm=r",
			type: 'main_frame',
			tabId: 105
		}

		// Yahoo - conflicting safe searches
		var details_duplicate_safe_search_yahoo = {
			url: "https://in.search.yahoo.com/search?p=hello&fr=yfp-t-100&vm=r&vm=p",
			type: 'main_frame',
			tabId: 110
		}

		// Yahoo - conflicting safe searches different tdl
		var details_duplicate_safe_search_yahoo_different_tld = {
			url: "https://uk.search.yahoo.com/search?p=hello&vm=r&vm=p",
			type: 'main_frame',
			tabId: 110
		}

		var mockEnvConfig = {
			"extensionName": "RM SafetyNet (INT)",
			"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
			"sendHistoryInterval": 60000,
			"cacheCheckForExpiredInterval": 60000,
			"cacheExpiryTimeInMinutes": 10,
			"errorPageLocation": "content/device-filter-error.htm"
		}

		var _background = new background(null, null, null, null, null, mockEnvConfig);

		describe("Google", function () {
			it("should return safe search url when passed a url without safe search", function () {
				var detls = _background.forceSafeSearch(details_no_safe_search);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('https://www.google.co.uk/search?q=hello&safe=active');
			});

			it("should return safe search url when passed a url with safe search aready enabled", function () {
				var detls = _background.forceSafeSearch(details_safe_search);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('https://www.google.co.uk/search?q=hello&safe=active');
			});

			it("should return safe search url when passed a url with multiple conflicting safe search params from co.in google", function () {
				var detls = _background.forceSafeSearch(details_duplicate_safe_search_on_google);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('https://www.google.co.in/search?q=hello&safe=active');
			});

			it("should return safe search url when passed a url with multiple conflicting safe search params from co.uk google", function () {
				var detls = _background.forceSafeSearch(details_duplicate_safe_search_different_tld);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('https://www.google.co.uk/search?q=hello&safe=active');
			});
		})

		describe("Bing", function () {
			it("should return safe search url when passed a url without safe search", function () {
				var detls = _background.forceSafeSearch(details_safe_search_not_on_bing);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('http://www.bing.com/search?q=sachin&go=Submit&qs=n&form=QBLH&pq=sachin&sc=9-6&sp=-1&sk=&cvid=163CD1E5C05E4DED9CE55986D9328E82&adlt=strict');
			});

			it("should return safe search url when passed a url with safe search already enabled", function () {
				var detls = _background.forceSafeSearch(details_safe_search_on_bing);
				expect(detls).toEqual(null);
			});

			it("should return safe search url when passed a url with multiple conflicting safe search params", function () {
				var detls = _background.forceSafeSearch(details_duplicate_safe_search_bing);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('http://www.bing.com/search?q=hello&adlt=strict');
			});
		})

		describe("Yahoo", function () {
			it("should return safe search url when passed a url without safe search", function () {
				var detls = _background.forceSafeSearch(details_safe_search_not_on_yahoo);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('https://in.search.yahoo.com/search?p=cricket&fr=yfp-t-704&vm=r');
			});

			it("should return safe search url when passed a url with safe search already enabled", function () {
				var detls = _background.forceSafeSearch(details_safe_search_on_yahoo);
				expect(detls).toEqual(null);
			});

			it("should return safe search url when passed a url with multiple conflicting safe search params from in subdomain", function () {
				var detls = _background.forceSafeSearch(details_duplicate_safe_search_yahoo);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('https://in.search.yahoo.com/search?p=hello&fr=yfp-t-100&vm=r');
			});

			it("should return safe search url when passed a url with multiple conflicting safe search params for uk subdomain", function () {
				var detls = _background.forceSafeSearch(details_duplicate_safe_search_yahoo_different_tld);
				expect(detls).toBeDefined();
				expect(detls.redirectUrl).toEqual('https://uk.search.yahoo.com/search?p=hello&vm=r');
			});
		})

	});

	describe("Get policy", function () {

		var localStorageGetItemSpy, localStorageSetItemSpy;

		beforeEach(function () {

			// required to mock ajax requests
			jasmine.Ajax.install();

		});

		afterEach(function () {

			// required to mock ajax requests
			jasmine.Ajax.uninstall();

		});

		var mockEnvConfig = {
			"extensionName": "RM SafetyNet (INT)",
			"baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
			"sendHistoryInterval": 60000,
			"cacheCheckForExpiredInterval": 60000,
			"cacheExpiryTimeInMinutes": 10,
			"errorPageLocation": "content/device-filter-error.htm",
			"policyCheckInterval": 600000,
		}

		var mockCacheManager = {
			wipeCache: function () {

			}
		}

		var mockContentFilterManager = {
			wipeInMemoryWordList: function () {

			}
		}

		var _background = new background(null, mockCacheManager, null, mockContentFilterManager, null, mockEnvConfig, _apiHelper);

		it("should update auth token", function () {

			var userGiud = '8a733185-abcb-4250-9f0d-16b82c95b6d4';

			localStorage.getItem = function (key) {
				return userGiud;
			}

			localStorage.setItem = function (key, value) {
				return null;
			}

			localStorageSetItemSpy = spyOn(localStorage, 'setItem');

			localStorageGetItemSpy = spyOn(localStorage, 'getItem').and.callThrough();


			var formatUrl = mockEnvConfig.baseAPIURL + '/api/policy/getPolicy';

			// generate mock response
			var response = '{"token":"test token","policyChanged":true}';

			// stub mock response
			jasmine.Ajax.stubRequest(formatUrl).andReturn({
				"responseText": response
			});

			var detls = _background.getPolicy();
			expect(localStorageSetItemSpy).toHaveBeenCalledWith('RM-SafetyNet-Device-Token', 'test token');
		});

		it("shouldn\'t update auth token", function () {

			var token = 'test token';

			localStorage.getItem = function (key) {
				return token;
			}

			localStorage.setItem = function (key, value) {
				return null;
			}

			localStorageSetItemSpy = spyOn(localStorage, 'setItem');

			localStorageGetItemSpy = spyOn(localStorage, 'getItem').and.callThrough();


			var formatUrl = mockEnvConfig.baseAPIURL + '/api/policy/getPolicy';

			// generate mock response
			var response = '{"token":"test token","policyChanged":false}';

			// stub mock response
			jasmine.Ajax.stubRequest(formatUrl).andReturn({
				"responseText": response
			});

			var detls = _background.getPolicy();
			expect(localStorageSetItemSpy).not.toHaveBeenCalled();
		});


	});
});	