describe('Content filter', function () {
    var _apiHelper = new apiHelper();
    describe('content script', function () {

        var mockEnvConfig = {
            contentFilter: {
                enablePageObservations: true,
                pageOvservationsDebounce: 2000
            }
        }

        it('should allow the page when the content manager returns ALLOWED for the URL state', function () {

            chrome.runtime.sendMessage = function (options, callback) {
                if (options.action === 'CHECKURL') {
                    callback('ALLOW');
                }
            }

            chrome.runtime.onMessage = {
                addListener: function (callback) { }
            }

            var mockPageReader = {
                showPage: function () {

                }
            }

            var spySendMessage = spyOn(chrome.runtime, 'sendMessage').and.callThrough();
            var spyShowPage = spyOn(mockPageReader, 'showPage');

            var _contentFilter = new contentFilter(mockPageReader, mockEnvConfig);

            _contentFilter.initiateContentFilter("test", true);

            var sendMsgArgOne = spySendMessage.calls.mostRecent().args[0];
            expect(sendMsgArgOne.action).toEqual('CHECKURL');
            expect(spyShowPage).toHaveBeenCalled();

        });

        it('should request content filter for the page when the content manager returns anything other than ALLOWED for the URL state', function () {

            chrome.runtime.sendMessage = function (options, callback) {
                if (options.action === 'CHECKURL') {
                    callback('CHECK');
                }
            }

            chrome.runtime.onMessage = {
                addListener: function (callback) { }
            }

            var mockPageReader = {
                showPage: function () {

                }
            }

            var spySendMessage = spyOn(chrome.runtime, 'sendMessage').and.callThrough();
            var spyShowPage = spyOn(mockPageReader, 'showPage');

            var _contentFilter = new contentFilter(mockPageReader, mockEnvConfig);

            _contentFilter.initiateContentFilter("test", true);

            var sendMsgArgOne = spySendMessage.calls.mostRecent().args[0];
            expect(sendMsgArgOne.action).toEqual('CONTENTFILTER');
            expect(spyShowPage).not.toHaveBeenCalled();

        });

        it('should show the page when the content manager returns SHOW for the content', function () {

            MutationObserver = function (callback) {

                this.observe = function (document, options) { }

            }

            chrome.runtime.sendMessage = function (options, callback) {
                if (options.action === 'CHECKURL') {
                    callback('CHECK');
                }
                else if (options.action === 'CONTENTFILTER') {
                    callback('SHOW');
                }
            }

            chrome.runtime.onMessage = {
                addListener: function (callback) { }
            }

            var mockPageReader = {
                showPage: function () {

                }
            }

            var spySendMessage = spyOn(chrome.runtime, 'sendMessage').and.callThrough();
            var spyShowPage = spyOn(mockPageReader, 'showPage');

            var _contentFilter = new contentFilter(mockPageReader, mockEnvConfig);

            _contentFilter.initiateContentFilter("test", true);

            var sendMsgArgOne = spySendMessage.calls.mostRecent().args[0];
            expect(sendMsgArgOne.action).toEqual('CONTENTFILTER');
            expect(spyShowPage).toHaveBeenCalled();

        });

        it('should request a page is content filtered again is it\'s content changes', function (done) {

            mockEnvConfig = {
                contentFilter: {
                    enablePageObservations: true,
                    pageOvservationsDebounce: 0
                }
            }

            var mutationObserverCallback;

            MutationObserver = function (callback) {

                mutationObserverCallback = callback;

                this.observe = function (document, options) { }
                this.disconnect = function () { }

            }

            chrome.runtime.sendMessage = function (options, callback) {
                if (options.action === 'CHECKURL') {
                    callback('CHECK');
                }
                else if (options.action === 'CONTENTFILTER') {
                    callback('SHOW');
                }
            }

            chrome.runtime.onMessage = {
                addListener: function (callback) { }
            }

            var spySendMessage = spyOn(chrome.runtime, 'sendMessage').and.callThrough();

            var mockPageReader = {
                getUpdatedPageContent: function () {
                    return "more test content";
                },
                showPage: function () {
                    var sendMsgArgOne = spySendMessage.calls.mostRecent().args[0];

                    expect(sendMsgArgOne.action).toEqual('CONTENTFILTER');
                    expect(spyShowPage).toHaveBeenCalled();

                    done();
                }
            }

            var spyShowPage = spyOn(mockPageReader, 'showPage').and.callThrough();

            var _contentFilter = new contentFilter(mockPageReader, mockEnvConfig);

            _contentFilter.observeFurtherPageChanges("test", true);

            mutationObserverCallback();

        });

        it('should clear the cache', function () {

            var localStorageGetItemSpy, localStorageSetItemSpy;

            MutationObserver = function (callback) {

                this.observe = function (document, options) { }

            }

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }


            var sendResponse = function (response) {
                expect(response).toEqual(mockEnvConfig);
            }

            var mockErrorManager = {
                showErrorPage: function (tabId, error) {

                },
                errorMsgs: {
                    INVALIDWORDLIST: 'custom error message'
                }
            }

            var mockCacheManager = {
                wipeCache: function () {

                },
                logCachedUrlAccess: function (url, state) {
                    var formatUrl = envConfig.baseAPIURL + '/api/history/logEntry';
                    jasmine.Ajax.stubRequest(formatUrl).andReturn({
                        status: 200,
                        "responseText": 'OK'
                    });
                }
            }

            var spyShowErrorPage = spyOn(mockErrorManager, 'showErrorPage');

            localStorage.setItem = function (key, value) {
                return 'test';
            }

            localStorage.getItem = function (key) {
                if (key === "rmFilteringBannedWords") {
                    return JSON.stringify([]);
                }
                else {
                    return 'test';
                }
            }

            localStorageGetItemSpy = spyOn(localStorage, 'getItem').and.callThrough();

            localStorage.removeItem = function (key) {
            }

            localStorageRemoveItemSpy = spyOn(localStorage, 'removeItem');

            localStorageSetItemSpy = spyOn(localStorage, 'setItem');

            var request = {
                action: 'CLEARCACHE'
            }

            var sender = {
                tab: {
                    id: 123
                }
            }

            var _contentFilterManager = new contentFilterManager(null, mockCacheManager, mockErrorManager, mockEnvConfig, _apiHelper);

            chromeMessageCallback(request, sender, null)

            expect(localStorageGetItemSpy).toHaveBeenCalledWith('rmFilteringContentFilterURL');
            expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('rmFilteringContentFilterURL');
            expect(localStorageGetItemSpy).toHaveBeenCalledWith('rmFilteringBannedWords');
            expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('rmFilteringBannedWords');
            expect(localStorageGetItemSpy).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            /*	 
				When the extension starts, it will filter all pages if the user has a valid token.
				Therefore, to prevent the user being able to bypass the filter by clearing their cache
				and then killing the extension process, the 'Clear cache' option shouldn't remove the auth
				token. Hence the two below checks.
		    */
            expect(localStorageGetItemSpy).not.toHaveBeenCalledWith('RM-SafetyNet-Device-Token');
            expect(localStorageRemoveItemSpy).not.toHaveBeenCalledWith('RM-SafetyNet-Device-Token');

        });

    });

    describe('background worker', function () {

        /*

			The worker tests use custom events rather than spawning a new worker. This is because
			the code coverage report can't see the worker being called and therefore exludes 
			any coverage of it from it's report.

		*/

        // Mocks the importScripts function. The scripts required within the worker are loaded
        // through the Jasmine Grunt task or in the <head> of SpecRunner.html
        importScripts = function (scripts) { };

        it('should calculate the score of a page with short content containing words in the word list', function (done) {

            var wordList = {
                "12": {
                    "84639147": {
                        "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                        "simpleHash": 84639147,
                        "originalLength": 12,
                        "score": 1000
                    },
                    "169674795": {
                        "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                        "simpleHash": 169674795,
                        "originalLength": 12,
                        "score": 1000
                    }
                }
            }

            var workerData = {
                workerId: 1,
                websiteContent: 'test yoursneaky test',
                bannedWordsHashes: wordList
            }

            var mockWorkerEvent = new Event('message');

            mockWorkerEvent.data = workerData;

            self.postMessage = function (response) {
                expect(response.score).toEqual(1000);
                done();
            }

            self.dispatchEvent(mockWorkerEvent);

        });

        it('should calculate the score of a page with short content containing no words in the word list', function (done) {

            var wordList = {
                "12": {
                    "84639147": {
                        "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                        "simpleHash": 84639147,
                        "originalLength": 12,
                        "score": 1000
                    },
                    "169674795": {
                        "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                        "simpleHash": 169674795,
                        "originalLength": 12,
                        "score": 1000
                    }
                }
            }

            var workerData = {
                workerId: 1,
                websiteContent: 'this is a test page containing no words from the wordlist',
                bannedWordsHashes: wordList
            }

            var mockWorkerEvent = new Event('message');

            mockWorkerEvent.data = workerData;

            self.postMessage = function (response) {
                expect(response.score).toEqual(0);
                done();
            }

            self.dispatchEvent(mockWorkerEvent);

        });

        it('should calculate the score of a page with long content containing words in the word list', function (done) {

            var wordList = {
                "12": {
                    "84639147": {
                        "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                        "simpleHash": 84639147,
                        "originalLength": 12,
                        "score": 1000
                    },
                    "169674795": {
                        "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                        "simpleHash": 169674795,
                        "originalLength": 12,
                        "score": 1000
                    }
                }
            }

            var workerData = {
                workerId: 1,
                websiteContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi yoursneaky ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                bannedWordsHashes: wordList
            }

            var mockWorkerEvent = new Event('message');

            mockWorkerEvent.data = workerData;

            self.postMessage = function (response) {
                expect(response.score).toEqual(1000);
                done();
            }

            self.dispatchEvent(mockWorkerEvent);

        });

        it('should calculate the score of a page with long content containing no words in the word list', function (done) {

            var wordList = {
                "12": {
                    "84639147": {
                        "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                        "simpleHash": 84639147,
                        "originalLength": 12,
                        "score": 1000
                    },
                    "169674795": {
                        "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                        "simpleHash": 169674795,
                        "originalLength": 12,
                        "score": 1000
                    }
                }
            }

            var workerData = {
                workerId: 1,
                websiteContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                bannedWordsHashes: wordList
            }

            var mockWorkerEvent = new Event('message');

            mockWorkerEvent.data = workerData;

            self.postMessage = function (response) {
                expect(response.score).toEqual(0);
                done();
            }

            self.dispatchEvent(mockWorkerEvent);

        });

    });

    describe('background manager', function () {

        var wordList = {
            "12": {
                "84639147": {
                    "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                    "simpleHash": 84639147,
                    "originalLength": 12,
                    "score": 1000
                },
                "169674795": {
                    "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                    "simpleHash": 169674795,
                    "originalLength": 12,
                    "score": 1000
                }
            }
        }

        var mockEnvConfig = {
            "baseAPIURL": "https://device-dlindley-api.safetynet.rmlp.com",
            "contentFilter": {
                "banThreshold": 100,
                "maxNumberOfWorkers": 4,
                "enablePageObservations": true,
                "pageOvservationsDebounce": 2000
            }
        }



        var mockCacheManager = {
            wipeCache: function () {

            },
            logCachedUrlAccess: function (url, state) {
                var formatUrl = mockEnvConfig.baseAPIURL + '/api/history/logEntry';
                jasmine.Ajax.stubRequest(formatUrl).andReturn({
                    status: 200,
                    "responseText": 'OK'
                });
            }
        }

        beforeEach(function () {

        })

        afterEach(function () {

        })

        it('Successful API call should write banned word list to localstorage', function () {
            jasmine.Ajax.install();
            var formatUrl = mockEnvConfig.baseAPIURL + '/api/content';

            var fakeReply = {
                words: {
                    "12": {
                        "84639147": {
                            "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                            "simpleHash": 84639147,
                            "originalLength": 12,
                            "score": 1000
                        },
                        "169674795": {
                            "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                            "simpleHash": 169674795,
                            "originalLength": 12,
                            "score": 1000
                        }
                    }
                },
                filterpageUrl: 'http://myfilterpage.com'
            }

            // stub mock response
            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                "responseText": JSON.stringify(fakeReply)
            });

            localStorage.getItem = function (key) {
                if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
                else if (key === 'RM-SafetyNet-Device-Token') {
                    return 'mock key';
                }
            }

            localStorage.setItem = function (key) {

            }

            var spySetLocalStorage = spyOn(localStorage, 'setItem').and.callThrough();

            var _contentFilterManager = new contentFilterManager(null, null, null, mockEnvConfig, _apiHelper)

            _contentFilterManager.getBannedWordsList();

            expect(spySetLocalStorage).toHaveBeenCalled();
            jasmine.Ajax.uninstall();

        });

        it('Unsuccessful API call should show error page when API returns 500', function () {
            jasmine.Ajax.install();
            var formatUrl = mockEnvConfig.baseAPIURL + '/api/content';

            // stub mock response
            jasmine.Ajax.stubRequest(formatUrl).andReturn({
                "status": 500
            });

            localStorage.getItem = function (key) {
                if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
            }

            var mockErrorManager = {
                showErrorPage: function (tabId, error) {

                },
                errorMsgs: {
                    INVALIDWORDLISTSTATUS: 'custom error message',
                    FAILEDWORDLISTCALL: 'another customer error message'
                }
            }

            var spyErrorManager = spyOn(mockErrorManager, 'showErrorPage');

            var _contentFilterManager = new contentFilterManager(null, null, mockErrorManager, mockEnvConfig, _apiHelper)

            _contentFilterManager.getBannedWordsList();

            expect(spyErrorManager).toHaveBeenCalledWith(-1, 'custom error message');
            jasmine.Ajax.uninstall();

        });

        it('Unsuccessful API call should show error page when requests can\'t be made', function () {



            localStorage.getItem = function (key) {
                if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
            }

            var mockErrorManager = {
                showErrorPage: function (tabId, error) {

                },
                errorMsgs: {
                    INVALIDWORDLISTSTATUS: 'custom error message',
                    FAILEDWORDLISTCALL: 'another customer error message'
                }
            }

            var spyErrorManager = spyOn(mockErrorManager, 'showErrorPage');

            var _contentFilterManager = new contentFilterManager(null, null, mockErrorManager, mockEnvConfig, _apiHelper)

            _contentFilterManager.getBannedWordsList();

            expect(spyErrorManager).toHaveBeenCalledWith(-1, 'another customer error message');

        });

        it('shouldn\'t throw an exception when clearing the in memory word list', function () {

            var _contentFilterManager = new contentFilterManager(null, null, null, mockEnvConfig, _apiHelper)

            expect(_contentFilterManager.wipeInMemoryWordList).not.toThrow();

        });

        var chromeMessageCallback = null;

        it('should send env config when requestsed', function () {

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }


            var _contentFilterManager = new contentFilterManager(null, null, null, mockEnvConfig, _apiHelper)

            var request = {
                action: 'GETCONFIG'
            }

            var sendResponse = function (response) {
                expect(response).toEqual(mockEnvConfig);
            }

            chromeMessageCallback(request, null, sendResponse)

        });

        it('should show error page when requested and an auth token is in local storage', function () {

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }

            chrome.tabs.update = function (tabId, options) { }

            var mockErrorManager = {
                showErrorPage: function (tabId, error) {

                },
                errorMsgs: {
                    INVALIDWORDLIST: 'custom error message'
                }
            }

            var spyShowErrorPage = spyOn(mockErrorManager, 'showErrorPage');

            var _contentFilterManager = new contentFilterManager(null, null, mockErrorManager, mockEnvConfig, _apiHelper)

            localStorage.getItem = function (key) {
                if (key === 'RM-SafetyNet-Device-Token') {
                    return 'authkey';
                }
            }

            var request = {
                action: 'SHOWERRORPAGE'
            }

            var sender = {
                tab: {
                    id: 123
                }
            }

            chromeMessageCallback(request, sender, null)

            expect(spyShowErrorPage).toHaveBeenCalledWith(-1, 'custom error message');

        });

        it('should\'t show error page when requested and an auth token is in local storage', function () {

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }

            chrome.tabs.update = function (tabId, options) { }

            var mockErrorManager = {
                showErrorPage: function (tabId, error) {

                },
                errorMsgs: {
                    INVALIDWORDLIST: 'custom error message'
                }
            }

            var spyShowErrorPage = spyOn(mockErrorManager, 'showErrorPage');

            localStorage.getItem = function (key) {
                if (key === 'RM-SafetyNet-Device-Token') {
                    return null;
                }
                else if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
            }

            var _contentFilterManager = new contentFilterManager(null, null, mockErrorManager, mockEnvConfig, _apiHelper)

            var request = {
                action: 'SHOWERRORPAGE'
            }

            chromeMessageCallback(request, null, null)

            expect(spyShowErrorPage).not.toHaveBeenCalled();

        });

        it('should return CHECK if the URL isn\'t in the whitelist or cached as allowed', function () {

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }

            localStorage.getItem = function (key) {
                if (key === 'rmFilteringWhiteListURLs') {
                    return JSON.stringify([]);;
                }
                else if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
            }

            var mockCacheManager = {
                checkCache: function (url) {
                    return {
                        state: 'UNKNOWN',
                        contentFilterEnabled: 1
                    }
                },
                logCachedUrlAccess: function (url, state) {
                    var formatUrl = envConfig.baseAPIURL + '/api/history/logEntry';
                    jasmine.Ajax.stubRequest(formatUrl).andReturn({
                        status: 200,
                        "responseText": 'OK'
                    });
                }
            }

            var _contentFilterManager = new contentFilterManager(null, mockCacheManager, null, mockEnvConfig, _apiHelper)

            var request = {
                action: 'CHECKURL'
            }

            var sender = {
                url: 'https://fakeurl.com'
            }

            var sendResponse = function (response) {
                expect(response).toEqual('CHECK');
            }

            chromeMessageCallback(request, sender, sendResponse)

        });

        it('should return ALLOW if the URL is in the whitelist', function () {

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }

            localStorage.getItem = function (key) {
                if (key === 'rmFilteringWhiteListURLs') {
                    return JSON.stringify(['fakeurl.com']);;
                }
                else if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
            }

            var mockCacheManager = {
                checkCache: function (url) {
                    return {
                        state: 'UNKNOWN',
                        contentFilterEnabled: 1
                    }
                },
                logCachedUrlAccess: function (url, state) {
                    var formatUrl = envConfig.baseAPIURL + '/api/history/logEntry';
                    jasmine.Ajax.stubRequest(formatUrl).andReturn({
                        status: 200,
                        "responseText": 'OK'
                    });
                }
            }

            var _contentFilterManager = new contentFilterManager(null, mockCacheManager, null, mockEnvConfig, _apiHelper)

            var request = {
                action: 'CHECKURL'
            }

            var sender = {
                url: 'https://fakeurl.com'
            }

            var sendResponse = function (response) {
                expect(response).toEqual('ALLOW');
            }

            chromeMessageCallback(request, sender, sendResponse)

        });

        it('should return ALLOW if the URL is ALLOWED in cache', function () {

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }

            localStorage.getItem = function (key) {
                if (key === 'rmFilteringWhiteListURLs') {
                    return JSON.stringify([]);;
                }
                else if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
            }

            var mockCacheManager = {
                checkCache: function (url) {
                    return {
                        state: 'ALLOWED',
                        contentFilterEnabled: 1
                    }
                },
                logCachedUrlAccess: function (url, state) {
                    var formatUrl = envConfig.baseAPIURL + '/api/history/logEntry';
                    jasmine.Ajax.stubRequest(formatUrl).andReturn({
                        status: 200,
                        "responseText": 'OK'
                    });
                }
            }

            var _contentFilterManager = new contentFilterManager(null, mockCacheManager, null, mockEnvConfig, _apiHelper)

            var request = {
                action: 'CHECKURL'
            }

            var sender = {
                url: 'https://fakeurl.com'
            }

            var sendResponse = function (response) {
                expect(response).toEqual('ALLOW');
            }

            chromeMessageCallback(request, sender, sendResponse)

        });

        it('should return ALLOW if content filtering is disabled for the URL', function () {

            chrome.runtime.onMessage = {
                addListener: function (cb) {
                    chromeMessageCallback = cb;
                }
            }

            localStorage.getItem = function (key) {
                if (key === 'rmFilteringWhiteListURLs') {
                    return JSON.stringify([]);;
                }
                else if (key === 'rmFilteringBannedWords') {
                    return JSON.stringify(wordList);
                }
            }

            var mockCacheManager = {
                checkCache: function (url) {
                    return {
                        state: 'UNKNOWN',
                        contentFilterEnabled: 0
                    }
                },
                logCachedUrlAccess: function (url, state) {
                    var formatUrl = envConfig.baseAPIURL + '/api/history/logEntry';
                    jasmine.Ajax.stubRequest(formatUrl).andReturn({
                        status: 200,
                        "responseText": 'OK'
                    });
                }
            }

            var _contentFilterManager = new contentFilterManager(null, mockCacheManager, null, mockEnvConfig, _apiHelper)

            var request = {
                action: 'CHECKURL'
            }

            var sender = {
                url: 'https://fakeurl.com'
            }

            var sendResponse = function (response) {
                expect(response).toEqual('ALLOW');
            }

            chromeMessageCallback(request, sender, sendResponse)

        });

        describe('web worker management', function () {

            it('should download the wordlist, continue to content filter and redirect to the filter page if the content exceeds the ban thresold', function () {
                jasmine.Ajax.install();
                var formatUrl = mockEnvConfig.baseAPIURL + '/api/content';

                var wordList = {
                    "12": {
                        "84639147": {
                            "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                            "simpleHash": 84639147,
                            "originalLength": 12,
                            "score": 1000
                        },
                        "169674795": {
                            "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                            "simpleHash": 169674795,
                            "originalLength": 12,
                            "score": 1000
                        }
                    }
                }

                var fakeReply = {
                    words: {
                        "12": {
                            "84639147": {
                                "md5Hash": "AKotsjlfVisUMGcrCc4FTA==",
                                "simpleHash": 84639147,
                                "originalLength": 12,
                                "score": 1000
                            },
                            "169674795": {
                                "md5Hash": "awbhG42+VHYbpUnorCS9ag==",
                                "simpleHash": 169674795,
                                "originalLength": 12,
                                "score": 1000
                            }
                        }
                    },
                    filterpageUrl: 'http://myfilterpage.com'
                }

                // stub mock response
                jasmine.Ajax.stubRequest(formatUrl).andReturn({
                    "responseText": JSON.stringify(fakeReply)
                });

                chrome.runtime.onMessage = {
                    addListener: function (cb) {
                        chromeMessageCallback = cb;
                    }
                }

                chrome.runtime.getURL = function (file) {
                    return 'chrome-extension://mychromeextension/worker.js'
                }

                chrome.tabs.update = function (tabId, options) { }

                var spyUpdateTab = spyOn(chrome.tabs, 'update');

                localStorage.getItem = function (key) {
                    if (key === 'rmFilteringBannedWords') {
                        return null;
                    }
                }

                localStorage.setItem = function (key, data) {

                }

                var spySetLocalStorage = spyOn(localStorage, 'setItem');

                var request = {
                    action: 'CONTENTFILTER',
                    pageContent: 'This is some fake page content',
                    firstTime: true
                }

                var sender = {
                    tab: {
                        id: 123
                    }
                }

                var listenerCallback = null;

                Worker = function (uri) {

                    return {
                        addEventListener: function (type, cb) {
                            listenerCallback = cb;
                        },
                        postMessage: function (message) {

                            var response = {
                                data: {
                                    score: 2000,
                                    workerId: 1
                                }
                            }

                            listenerCallback(response);
                        },
                        terminate: function () {

                        }
                    }

                }

                var mockFilterPageManager = {
                    getFilterPageURL: function (tab) {
                        return 'http://www.rmfilterpage.com'
                    }
                }

                var _contentFilterManager = new contentFilterManager(mockFilterPageManager, mockCacheManager, null, mockEnvConfig, _apiHelper)

                chromeMessageCallback(request, sender, null);

                expect(spySetLocalStorage).toHaveBeenCalledWith('rmFilteringBannedWords', JSON.stringify(wordList));
                expect(spyUpdateTab).toHaveBeenCalled();
                jasmine.Ajax.uninstall();
            });

            it('should redirect to the filter page if page exceeds the ban thresold', function () {

                chrome.runtime.onMessage = {
                    addListener: function (cb) {
                        chromeMessageCallback = cb;
                    }
                }

                chrome.runtime.getURL = function (file) {
                    return 'chrome-extension://mychromeextension/worker.js'
                }

                chrome.tabs = {
                    update: function (tabId, options) {

                    }
                }

                var spyUpdateTab = spyOn(chrome.tabs, 'update');

                localStorage.getItem = function (key) {
                    if (key === 'rmFilteringBannedWords') {
                        return JSON.stringify(wordList);
                    }
                }

                var request = {
                    action: 'CONTENTFILTER',
                    pageContent: 'This is some fake page content',
                    firstTime: true
                }

                var sender = {
                    tab: {
                        id: 123
                    }
                }

                var listenerCallback = null;

                Worker = function (uri) {

                    return {
                        addEventListener: function (type, cb) {
                            listenerCallback = cb;
                        },
                        postMessage: function (message) {

                            var response = {
                                data: {
                                    score: 2000,
                                    workerId: 1
                                }
                            }

                            listenerCallback(response);
                        },
                        terminate: function () {

                        }
                    }

                }

                var mockFilterPageManager = {
                    getFilterPageURL: function (tab) {
                        return 'http://www.rmfilterpage.com'
                    }
                }

                var _contentFilterManager = new contentFilterManager(mockFilterPageManager, mockCacheManager, null, mockEnvConfig, _apiHelper)

                chromeMessageCallback(request, sender, null);

                expect(spyUpdateTab).toHaveBeenCalled();

            });

            it('should show the page if page doesn\'t exceed the ban thresold', function () {

                chrome.runtime.onMessage = {
                    addListener: function (cb) {
                        chromeMessageCallback = cb;
                    }
                }

                chrome.runtime.getURL = function (file) {
                    return 'chrome-extension://mychromeextension/worker.js'
                }

                chrome.tabs = {
                    update: function (tabId, options) {

                    }
                }

                var spyUpdateTab = spyOn(chrome.tabs, 'update');

                localStorage.getItem = function (key) {
                    if (key === 'rmFilteringBannedWords') {
                        return JSON.stringify(wordList);
                    }
                }

                var request = {
                    action: 'CONTENTFILTER',
                    pageContent: 'This is some fake page content',
                    firstTime: true
                }

                var sender = {
                    tab: {
                        id: 123
                    }
                }

                var sendResponse = function (response) {
                    expect(response).toEqual('SHOW');
                }

                var listenerCallback = null;

                Worker = function (uri) {

                    return {
                        addEventListener: function (type, cb) {
                            listenerCallback = cb;
                        },
                        postMessage: function (message) {

                            var response = {
                                data: {
                                    score: 1,
                                    workerId: 1
                                }
                            }

                            listenerCallback(response);
                        },
                        terminate: function () {

                        }
                    }

                }

                var mockFilterPageManager = {
                    getFilterPageURL: function (tab) {
                        return 'http://www.rmfilterpage.com'
                    }
                }

                var _contentFilterManager = new contentFilterManager(mockFilterPageManager, null, null, mockEnvConfig, _apiHelper)

                chromeMessageCallback(request, sender, sendResponse);

                expect(spyUpdateTab).not.toHaveBeenCalled();

            });

            it('should use a single worker for pages with short content on first filter', function () {

                var numberOfWorkers = 0;

                chrome.runtime.onMessage = {
                    addListener: function (cb) {
                        chromeMessageCallback = cb;
                    }
                }

                chrome.runtime.getURL = function (file) {
                    return 'chrome-extension://mychromeextension/worker.js'
                }

                chrome.tabs = {
                    update: function (tabId, options) {

                    }
                }

                var spyUpdateTab = spyOn(chrome.tabs, 'update');

                localStorage.getItem = function (key) {
                    if (key === 'rmFilteringBannedWords') {
                        return JSON.stringify(wordList);
                    }
                }

                var request = {
                    action: 'CONTENTFILTER',
                    pageContent: 'This is some fake page content',
                    firstTime: true
                }

                var sender = {
                    tab: {
                        id: 123
                    }
                }

                var sendResponse = function (response) {
                    expect(response).toEqual('SHOW');
                }

                var listenerCallback = null;

                Worker = function (uri) {

                    numberOfWorkers++;

                    return {
                        addEventListener: function (type, cb) {
                            listenerCallback = cb;
                        },
                        postMessage: function (message) {

                            var response = {
                                data: {
                                    score: 101,
                                    workerId: 1
                                }
                            }

                            listenerCallback(response);
                        },
                        terminate: function () {

                        }
                    }

                }

                var mockFilterPageManager = {
                    getFilterPageURL: function (tab) {
                        return 'http://www.rmfilterpage.com'
                    }
                }

                var _contentFilterManager = new contentFilterManager(mockFilterPageManager, mockCacheManager, null, mockEnvConfig, _apiHelper)

                chromeMessageCallback(request, sender, sendResponse);

                expect(numberOfWorkers).toEqual(1);
                expect(spyUpdateTab).toHaveBeenCalled();

            });

            it('should use a single worker for pages with short content on subsequent filters', function () {

                var numberOfWorkers = 0;

                chrome.runtime.onMessage = {
                    addListener: function (cb) {
                        chromeMessageCallback = cb;
                    }
                }

                chrome.runtime.getURL = function (file) {
                    return 'chrome-extension://mychromeextension/worker.js'
                }

                chrome.tabs = {
                    update: function (tabId, options) {

                    }
                }

                var spyUpdateTab = spyOn(chrome.tabs, 'update');

                localStorage.getItem = function (key) {
                    if (key === 'rmFilteringBannedWords') {
                        return JSON.stringify(wordList);
                    }
                }

                var request = {
                    action: 'CONTENTFILTER',
                    pageContent: 'This is some fake page content',
                    firstTime: false
                }

                var sender = {
                    tab: {
                        id: 123
                    }
                }

                var sendResponse = function (response) {
                    expect(response).toEqual('SHOW');
                }

                var listenerCallback = null;

                Worker = function (uri) {

                    numberOfWorkers++;

                    return {
                        addEventListener: function (type, cb) {
                            listenerCallback = cb;
                        },
                        postMessage: function (message) {

                            var response = {
                                data: {
                                    score: 101,
                                    workerId: 1
                                }
                            }

                            listenerCallback(response);
                        },
                        terminate: function () {

                        }
                    }

                }

                var mockFilterPageManager = {
                    getFilterPageURL: function (tab) {
                        return 'http://www.rmfilterpage.com'
                    }
                }

                var _contentFilterManager = new contentFilterManager(mockFilterPageManager, mockCacheManager, null, mockEnvConfig, _apiHelper)

                chromeMessageCallback(request, sender, sendResponse);

                expect(numberOfWorkers).toEqual(1);
                expect(spyUpdateTab).toHaveBeenCalled();

            });

            it('should use multiple workers for pages with long content on first filter', function () {

                var numberOfWorkers = 0;

                chrome.runtime.onMessage = {
                    addListener: function (cb) {
                        chromeMessageCallback = cb;
                    }
                }

                chrome.runtime.getURL = function (file) {
                    return 'chrome-extension://mychromeextension/worker.js'
                }

                chrome.tabs = {
                    update: function (tabId, options) {

                    }
                }

                var spyUpdateTab = spyOn(chrome.tabs, 'update');

                localStorage.getItem = function (key) {
                    if (key === 'rmFilteringBannedWords') {
                        return JSON.stringify(wordList);
                    }
                }

                var request = {
                    action: 'CONTENTFILTER',
                    pageContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.',
                    firstTime: true
                }

                var sender = {
                    tab: {
                        id: 123
                    }
                }

                var sendResponse = function (response) {
                    expect(response).toEqual('SHOW');
                }

                var listenerCallback = null;

                Worker = function (uri) {

                    numberOfWorkers++;

                    return {
                        addEventListener: function (type, cb) {
                            listenerCallback = cb;
                        },
                        postMessage: function (message) {

                            var response = {
                                data: {
                                    score: 101,
                                    workerId: numberOfWorkers - 1
                                }
                            }

                            listenerCallback(response);
                        },
                        terminate: function () {

                        }
                    }

                }

                var mockFilterPageManager = {
                    getFilterPageURL: function (tab) {
                        return 'http://www.rmfilterpage.com'
                    }
                }

                var _contentFilterManager = new contentFilterManager(mockFilterPageManager, mockCacheManager, null, mockEnvConfig, _apiHelper)

                chromeMessageCallback(request, sender, sendResponse);

                expect(numberOfWorkers).toBeGreaterThan(1);
                expect(spyUpdateTab).toHaveBeenCalled();

            });

            it('should use a single worker for pages with long content on subsequent filters', function () {

                var numberOfWorkers = 0;

                chrome.runtime.onMessage = {
                    addListener: function (cb) {
                        chromeMessageCallback = cb;
                    }
                }
                chrome.runtime.getURL = function (file) {
                    return 'chrome-extension://mychromeextension/worker.js'
                }

                chrome.tabs = {
                    update: function (tabId, options) {

                    }
                }

                var spyUpdateTab = spyOn(chrome.tabs, 'update');

                localStorage.getItem = function (key) {
                    if (key === 'rmFilteringBannedWords') {
                        return JSON.stringify(wordList);
                    }
                }

                var request = {
                    action: 'CONTENTFILTER',
                    pageContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante. Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo. Sed pretium blandit orci. Ut eu diam at pede suscipit sodales. Aenean lectus elit, fermentum non, convallis id, sagittis at, neque. Nullam mauris orci, aliquet et, iaculis et, viverra vitae, ligula. Nulla ut felis in purus aliquam imperdiet. Maecenas aliquet mollis lectus. Vivamus consectetuer risus et tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla. Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum. Morbi in ipsum si.',
                    firstTime: false
                }

                var sender = {
                    tab: {
                        id: 123
                    }
                }

                var sendResponse = function (response) {
                    expect(response).toEqual('SHOW');
                }

                var listenerCallback = null;

                Worker = function (uri) {

                    numberOfWorkers++;

                    return {
                        addEventListener: function (type, cb) {
                            listenerCallback = cb;
                        },
                        postMessage: function (message) {

                            var response = {
                                data: {
                                    score: 101,
                                    workerId: numberOfWorkers - 1
                                }
                            }

                            listenerCallback(response);
                        },
                        terminate: function () {

                        }
                    }

                }

                var mockFilterPageManager = {
                    getFilterPageURL: function (tab) {
                        return 'http://www.rmfilterpage.com'
                    }
                }

                var _contentFilterManager = new contentFilterManager(mockFilterPageManager, mockCacheManager, null, mockEnvConfig, _apiHelper)

                chromeMessageCallback(request, sender, sendResponse);

                expect(numberOfWorkers).toEqual(1);
                expect(spyUpdateTab).toHaveBeenCalled();

            });

        });

    });

});