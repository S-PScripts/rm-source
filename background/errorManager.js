function errorManager(envConfig, apiHelper) {

	var self = this;
	var logErrorApiUrl = envConfig.baseAPIURL + '/log/error';
	var lastError;

	//Enum of different Errors that might occur. Object.freeze prevents functions changing the value.
	this.errorMsgs = Object.freeze({
		AUTH_FAILURE: 'E100',
		INVALIDWORDLISTSTATUS: 'E101',
		FAILEDAPICHECK: 'E102',
		INVALIDAPISTATUS: 'E103',
		INVALIDWHITELISTSTATUS: 'E104',
		INVALIDWORDLIST: 'E105',
		FAILEDWORDLISTCALL: 'E106',
		FAILEDWHITELISTCALL: 'E107'
	});
	
	this.showInitPage = function(tabId ){
		chrome.tabs.update(tabId, { url: chrome.extension.getURL(envConfig.initPageLocation) });
	}

	this.showErrorPage = function (tabId, errorCode, errorMsg) {
		try {
			self.logError(errorCode + (errorMsg ? (', details: ' + errorMsg) : '' ));

			if (errorCode != this.errorMsgs.FAILEDAPICHECK) {
				if (navigator.onLine) {
					let errCode = errorCode;
					if(!Object.values(this.errorMsgs).includes(errorCode)) {
						errCode = 'UNDEFINED';
					}
					var errorPageUrl = formatErrorPageUrl(errCode);

					// Show error page in the tab where the request was made from
					if (tabId != -1) {
						chrome.tabs.update(tabId, { url: errorPageUrl });
					}
					// If tab ID is null then open a new tab with the error page
					else {
						chrome.tabs.getSelected(null, function (tab) {
							var parser = document.createElement('a');
							parser.href = tab.url;
							//// used for showing chrome extension page and history pages 
							if (parser.protocol != 'chrome:') {
								chrome.tabs.update(tab.id, { url: errorPageUrl });
							}
						});

					}
				}
			}
		}
		catch {
			console.log(errorCode + (errorMsg ? (', details: ' + errorMsg) : '' ));
		}
	}

	this.showFilterPage = function (tabId, filterPageUrl, estID) {

		if (filterPageUrl == '') {
			chrome.tabs.getSelected(null, function (tab) {
				chrome.tabs.update(tab.id, { url: chrome.extension.getURL(envConfig.filterPageLocation) });
			});
		}
		else {
			formatFilterPageUrl(filterPageUrl, estID, function (callback) {
				if (navigator.onLine) {
					chrome.tabs.getSelected(null, function (tab) {
						chrome.tabs.update(tab.id, { url: callback });
					});
				}
			});
		}
	}

	//Logging clientside error to application log
    this.logError = function (err){
        let requestHeader = [];
		let errorMsg = err.stack ? err.stack : err;
		
		console.log(errorMsg); //move?
		if(errorMsg == lastError) {
			return;
		}

		let version = chrome.runtime.getManifest().version;
		errorMsg = 'Version : ' + version + ', message: ' + errorMsg;

		lastError = errorMsg;
        requestHeader['Content-type'] = 'application/json; charset=utf-8';
        let params = JSON.stringify({ error : errorMsg});
        let options = {
            url: logErrorApiUrl,
            data: params,
            async: true,
            headers: requestHeader,
            method: 'POST'
        };

        apiHelper.callAPI(options); 
    }


	function formatFilterPageUrl(filterPageUrl, estID, cb) {
		var n = filterPageUrl.indexOf(".htm#");
		var queryString = filterPageUrl.substr(n + 4, filterPageUrl.length);
		filterPageUrl = chrome.extension.getURL(envConfig.filterPageLocation) + queryString + '&est=' + estID
		cb(filterPageUrl);
	}

	function formatErrorPageUrl(msg) {
		return chrome.extension.getURL(envConfig.errorPageLocation) + '#msg=' + btoa(msg);
	}
}