
var browserPlatform = "";
function detectPlatformType() {
	if (window.navigator.userAgent.indexOf("Edg") != -1) {
		console.log("edge chromium");
		browserPlatform = "edge"
	}
	else {
		console.log("chrome")
		browserPlatform = "chrome"
	}
}
detectPlatformType();

/*
	Most customer only want the extension to run on Chromebooks. Therefore, the following code
	checks the OS type and disables the extension on other platforms, unless config has been 
	added to the extension to say otherwise.
*/
function detectStartType() {
	// for edge, simply run it.
	if (browserPlatform === "edge") {
		runExtension();
		return;
	}

	// Get OS type i.e. Windows, Chrome OS, etc.
	chrome.runtime.getPlatformInfo(function (info) {
		// Run the extension if it's Chrome OS, meaning Chromebook
		if (info.os === "cros") {
			runExtension();
		}
		// Check user config to detect whether extension should be enabled on other platforms, Chrome browser
		else {
			chrome.storage.managed.get("ChromeOSOnly", function (policy) {

				if (policy && policy.ChromeOSOnly === false) {
					// start the extension
					runExtension();
				} else {
					// stop the extension
					stopExtension();
				}

			});
		}
	});
}

// Detect managed config changes and restart the extension if they've changed
chrome.storage.onChanged.addListener(function (change, areaName) {
	if (areaName === "managed") {
		chrome.runtime.reload();
	}
})

function runExtension() {

	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			if (request.action == 'GETEXTENSIONSTATE') {
				sendResponse(true);
			}
		}
	)

	// Replace icons with standard icons
	// runtime.reload() doesn't do this automatically however it does
	// reload the browser action popup and icon title automatically
	chrome.browserAction.setIcon({
		path: {
			"16": "resources/icons/icon16.png",
			"19": "resources/icons/icon19.png",
			"32": "resources/icons/icon32.png",
			"38": "resources/icons/icon38.png",
		}
	});

	// Read the current environment config from JSON config file
	var envConfig = null

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', 'config/envconfig.json', false);
	xmlhttp.onreadystatechange = function () {
		if (xmlhttp.readyState == 4) {
			if (xmlhttp.status == 200) {
				envConfig = JSON.parse(xmlhttp.responseText);
			}
		}
	};
	xmlhttp.send(null);

	var _apiHelper = new apiHelper();
	var _errorManager = new errorManager(envConfig, _apiHelper);
	var _cacheManager = new cacheManager(envConfig, _apiHelper);
	_apiHelper.setCacheManager(_cacheManager);
	var _whitelistManager = new whitelistManager(_cacheManager, _errorManager, envConfig, _apiHelper);

	_whitelistManager.getWhiteListURLs();

	// Call whitelist every n minutes to get any changes
	setInterval(function () {
		_whitelistManager.getWhiteListURLs();
	}, envConfig.whitelistUpdateInterval)

	var _requestTypeAnalyser = new requestTypeAnalyser();
	var _filterPageManager = new filterPageManager();

	let userEmail;
	chrome.identity.getProfileUserInfo((userInfo)=> {
		userEmail = userInfo.email
		console.log(userEmail);
		var _urlFilter = new urlFilter(_cacheManager, _whitelistManager, _errorManager, envConfig, _apiHelper, _requestTypeAnalyser, userEmail);
		var _contentFilterManager = new contentFilterManager(_filterPageManager, _cacheManager, _errorManager, envConfig, _apiHelper, _urlFilter);
		new background(_urlFilter, _cacheManager, _filterPageManager, _contentFilterManager, _errorManager, envConfig, _apiHelper);
	});
}

function stopExtension() {

	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			if (request.action == 'GETEXTENSIONSTATE') {
				sendResponse(false);
			}
		}
	)

	// Remove the browser action
	chrome.browserAction.setPopup({ popup: "" });
	// Replace icon with grayed out icon
	chrome.browserAction.setIcon({
		path: {
			"16": "resources/icons/icon16_disabled.png",
			"19": "resources/icons/icon19_disabled.png",
			"32": "resources/icons/icon32_disabled.png",
			"38": "resources/icons/icon38_disabled.png",
		}
	});
	// Change tooltip text
	chrome.browserAction.setTitle({ title: 'RM SafetyNet Go is disabled on this device' });
}

detectStartType();