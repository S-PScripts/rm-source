describe('Error manager', function () {

	var _errorManager;

	var mockEnvConfig = {
		"errorPageLocation": "content/device-filter-error.htm"
	}

	beforeEach(function () {
		_errorManager = new errorManager(mockEnvConfig);

		Tab = { id: 123 }

		chrome.tabs = {
			create: function (options) { },
			update: function (tabId, options) { },
			getSelected: function (tabid) {
				return Tab;
			}
		}
		chrome.extension = {
			getURL: function (url) {
				return "chrome-extension://guid/" + url
			}
		}

		navigator.onLine = true;
	})

	it('should update tab with error page when tab ID is passed as an argument and navigator is online', function () {

		var updateTabSpy = spyOn(chrome.tabs, 'update');
		var createTabSpy = spyOn(chrome.tabs, 'create');
		var getExtensionURLSpy = spyOn(chrome.extension, 'getURL').and.callThrough();

		_errorManager.showErrorPage(123);

		expect(getExtensionURLSpy).toHaveBeenCalledWith(mockEnvConfig.errorPageLocation);
		//{ url: 'chrome-extension://guid/content/device-filter-error.htm#msg=dW5kZWZpbmVk' }
		expect(updateTabSpy).toHaveBeenCalledWith(123, { url: "chrome-extension://guid/" + mockEnvConfig.errorPageLocation + '#msg=dW5kZWZpbmVk' });
		expect(createTabSpy).not.toHaveBeenCalled();

	})

	it('should create a new tab with error page when no tab ID is passed as an argument and navigator is online', function () {

		var updateTabSpy = spyOn(chrome.tabs, 'update');
		var createTabSpy = spyOn(chrome.tabs, 'create');
		var getSelectedSpy = spyOn(chrome.tabs, 'getSelected').and.callThrough();
		var getExtensionURLSpy = spyOn(chrome.extension, 'getURL').and.callThrough();

		_errorManager.showErrorPage(-1);

		expect(getExtensionURLSpy).toHaveBeenCalledWith(mockEnvConfig.errorPageLocation);
		expect(getSelectedSpy).toHaveBeenCalled();

	})

	it('shouldn\'t show error page when navigator is offline', function () {

		var updateTabSpy = spyOn(chrome.tabs, 'update');
		var createTabSpy = spyOn(chrome.tabs, 'create');
		var getSelectedSpy = spyOn(chrome.tabs, 'getSelected').and.callThrough();
		var getExtensionURLSpy = spyOn(chrome.extension, 'getURL').and.callThrough();

		_errorManager.showErrorPage(-1);

		expect(updateTabSpy).not.toHaveBeenCalled();
		expect(createTabSpy).not.toHaveBeenCalled();

	})

})