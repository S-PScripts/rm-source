// Test spec for getting white list
describe("Get white list", function () {

    var _apiHelper = new apiHelper();
    // mock config/envconfig.json file
    var mockenvConfig = {
        "extensionName": "RM SafetyNet (CI)",
        "baseAPIURL": "https://device-int01-api.safetynet.rmlp.com",
        "sendHistoryInterval": 60000,
        "cacheCheckForExpiredInterval": 60000,
        "cacheExpiryTimeInMinutes": 10
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
        showErrorPage: function (tabId) { }
    }

    var showErrorPageSpy, errorMsgsSpy;

    var _whitelistManager = null;

    describe('localstorage setting', function () {

        beforeEach(function () {
            showErrorPageSpy = spyOn(mockErrorManager, 'showErrorPage');
            errorMsgsSpy = spyOn(mockErrorManager, 'errorMsgs');
            envConfig = mockenvConfig;
            // required to mock ajax requests
            jasmine.Ajax.install();

        })

        afterEach(function () {
            // required to mock ajax requests
            jasmine.Ajax.uninstall();

        });

        it('should save whitelist in local storage when whitelist localstorage is null', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return null;
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            // mock set item
            localStorage.setItem = function (key, value) {
                return key + 'sdsdd';
            }

            var _whitelistManager = new whitelistManager(null, mockErrorManager, mockenvConfig, _apiHelper);

            mockLocalSetItem = spyOn(localStorage, 'setItem');

            whitelistApiURI = envConfig.baseAPIURL + "/whitelist";

            var response = JSON.stringify(["sso.quail.unify.rmlp.com", "device-int01-api.safetynet.rmlp.com", "rmsftynetci01templates.blob.core.windows.net"]);

            // stub mock response
            jasmine.Ajax.stubRequest(whitelistApiURI).andReturn({
                "responseText": response
            });

            var status = _whitelistManager.getWhiteListURLs();

            expect(status).toEqual(undefined);

            expect(mockLocalGetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            expect(mockLocalSetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs', response);

        })

        it('should update whitelist in local storage when whitelist localstorage is missing a whitelist item', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return ["sso.quail.unify.rmlp.com", "device-int01-api.safetynet.rmlp.com", "rmsftynetci01templates.blob.core.windows.net"];
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            // mock set item
            localStorage.setItem = function (key, value) { }

            var _whitelistManager = new whitelistManager(null, mockErrorManager, mockenvConfig, _apiHelper);

            mockLocalSetItem = spyOn(localStorage, 'setItem');

            whitelistApiURI = envConfig.baseAPIURL + "/whitelist";

            var response = JSON.stringify(["sso.quail.unify.rmlp.com", "device-int01-api.safetynet.rmlp.com", "rmsftynetci01templates.blob.core.windows.net", "www.safetynet.com"]);

            // stub mock response
            jasmine.Ajax.stubRequest(whitelistApiURI).andReturn({
                "responseText": response
            });

            var status = _whitelistManager.getWhiteListURLs();

            expect(status).toEqual(undefined);

            expect(mockLocalGetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            expect(mockLocalSetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs', response);

        })

        it('should update whitelist in local storage when whitelist localstorage has an additional whitelist item', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return ["sso.quail.unify.rmlp.com", "device-int01-api.safetynet.rmlp.com", "rmsftynetci01templates.blob.core.windows.net", "www.safetynet.com"];
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            // mock set item
            localStorage.setItem = function (key, value) { }

            var _whitelistManager = new whitelistManager(null, mockErrorManager, mockenvConfig, _apiHelper);

            mockLocalSetItem = spyOn(localStorage, 'setItem');

            whitelistApiURI = envConfig.baseAPIURL + "/whitelist";

            var response = JSON.stringify(["sso.quail.unify.rmlp.com", "device-int01-api.safetynet.rmlp.com", "rmsftynetci01templates.blob.core.windows.net"]);

            // stub mock response
            jasmine.Ajax.stubRequest(whitelistApiURI).andReturn({
                "responseText": response
            });

            var status = _whitelistManager.getWhiteListURLs();

            expect(status).toEqual(undefined);

            expect(mockLocalGetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            expect(mockLocalSetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs', response);

        })

        it('shouldn\'t update whitelist if the API response is null', function () {

            // mock get item
            localStorage.getItem = function (key) {
                return ["sso.quail.unify.rmlp.com", "device-int01-api.safetynet.rmlp.com", "rmsftynetci01templates.blob.core.windows.net", "www.safetynet.com"];
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            // mock set item
            localStorage.setItem = function (key, value) { }

            var _whitelistManager = new whitelistManager(null, mockErrorManager, mockenvConfig, _apiHelper);

            mockLocalSetItem = spyOn(localStorage, 'setItem');

            whitelistApiURI = envConfig.baseAPIURL + "/whitelist";

            var response = null;

            // stub mock response
            jasmine.Ajax.stubRequest(whitelistApiURI).andReturn({
                "responseText": response
            });

            var status = _whitelistManager.getWhiteListURLs();

            expect(status).toEqual(undefined);

            expect(mockLocalGetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            expect(mockLocalSetItem).not.toHaveBeenCalled();

        })

    })

    describe('API request', function () {



        beforeEach(function () {
            showErrorPageSpy = spyOn(mockErrorManager, 'showErrorPage');
            errorMsgsSpy = spyOn(mockErrorManager, 'errorMsgs');
            envConfig = mockenvConfig;
            // required to mock ajax requests
            // use this individually uninstall got error if there is no stub
            // jasmine.Ajax.install();
        })

        afterEach(function () {
            // required to mock ajax requests
            //jasmine.Ajax.uninstall();

        });

        it('should call the error manager if the API returns 500', function () {
            jasmine.Ajax.install();
            whitelistApiURI = envConfig.baseAPIURL + "/whitelist";

            // stub mock response
            jasmine.Ajax.stubRequest(whitelistApiURI).andReturn({
                "status": 500
            });


            localStorage.getItem = function (key) {
                return null;
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();
            var _whitelistManager = new whitelistManager(null, mockErrorManager, mockenvConfig, _apiHelper);

            var status = _whitelistManager.getWhiteListURLs();
            expect(showErrorPageSpy).toHaveBeenCalled();
            expect(mockLocalGetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            jasmine.Ajax.uninstall();
        })

        it('should call the error manager if the API call fails and no tab ID is available', function () {


            localStorage.getItem = function (key) {
                return null;
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            var _whitelistManager = new whitelistManager(null, mockErrorManager, mockenvConfig, _apiHelper);

            var status = _whitelistManager.getWhiteListURLs();
            expect(mockLocalGetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            expect(showErrorPageSpy).toHaveBeenCalledWith(-1, mockErrorManager.errorMsgs.FAILEDWHITELISTCALL);

        })

        it('should call the error manager if the API call fails and a tab ID is available', function () {

            navigator.onLine = true;

            localStorage.getItem = function (key) {
                return null;
            }

            mockLocalGetItem = spyOn(localStorage, 'getItem').and.callThrough();

            var _whitelistManager = new whitelistManager(null, mockErrorManager, mockenvConfig, _apiHelper);

            var status = _whitelistManager.getWhiteListURLs(123);
            expect(mockLocalGetItem).toHaveBeenCalledWith('rmFilteringWhiteListURLs');
            expect(showErrorPageSpy).toHaveBeenCalledWith(123, mockErrorManager.errorMsgs.FAILEDWHITELISTCALL);

        })

    })

});


