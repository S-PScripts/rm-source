/// api helper that will handle get post etc with sync and async also retry of 3 times
function apiHelper() {


    //**********************
    // Define veriables
    //**********************
    var self = this;
    var cacheManager;
    var version = chrome.runtime.getManifest().version;
    //**********************
    // End define veriables
    //**********************


    //**********************
    // Public functions
    //**********************

    this.setCacheManager = function(manager) {
        cacheManager = manager;
    };

    /*options = {
            url: whitelistApiURI,
            method: 'GET',
            async: requestAsync,
            retryCount: 3,
            headers: null,
            data: null
        }*/

    //Async and Synchronous call 
    this.callAPI = function(options, callback) {

        if (!options.url) {
            throw "url parameter shouldn't be null";
        }
        if (!options.method) {
            throw "method parameter shouldn't be null";
        }
        if (typeof options.retryCount !== 'number') {
            options.retryCount = 3;
        }

        options.retryCount--;
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(options.method, options.url, options.async);

        //default headers
        xmlhttp.setRequestHeader('SafetyNet-Client', 'safetynet-chrome-v' + version);
        //header will be an associative array [ [key]=value ]
        if (options.headers) {
            for (key in options.headers) {
                xmlhttp.setRequestHeader(key, options.headers[key]);
            }
        }

        xmlhttp.onload = function(e) {

            if (xmlhttp.status == 200) {
                xmlhttp.isError = false;
                typeof callback === 'function' && callback(xmlhttp);
            }
            else if (xmlhttp.status == 401) {
                xmlhttp.isError = true;
                typeof callback === 'function' && callback(xmlhttp);
            }
            else {
                xmlhttp.isError = true;

                if (options.retryCount < 1) {
                    xmlhttp.isInvalidRequest = true;
                    typeof callback === 'function' && callback(xmlhttp);
                }
                else {
                    self.callAPI(options, callback);
                }
            }

        };

        xmlhttp.onerror = function(error) {
            xmlhttp.isError = true;

            if (options.retryCount < 1) {
                typeof callback === 'function' && callback(xmlhttp);
            }
            else {
                self.callAPI(options, callback);
            }
        };

        try {
            xmlhttp.send(options.data);
        }
        catch (exception) {
            xmlhttp.isError = true;
            if (options.retryCount < 1) {
                typeof callback === 'function' && callback(xmlhttp);
            }
            else {
                self.callAPI(options, callback);
            }
        }
    }


    this.invokeAuthAPI = function(options, callback) {
        if (typeof options.retryCount !== 'number') {
            options.retryCount = 1;
        }

        options.retryCount--;
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(options.method, options.url, false);
        //header will be an associative array [ [key]=value ]
        if (options.headers) {
            for (key in options.headers) {
                xmlhttp.setRequestHeader(key, options.headers[key]);
            }
        }

        xmlhttp.onreadystatechange  = function() {

            //HEADERS_RECEIVED
            if (xmlhttp.readyState == 2) {
                setAuthToken(xmlhttp);
                return;
            }

            //DONE
            if (xmlhttp.readyState == 4) {

                if (xmlhttp.status == 200) {
                    setAuthToken(xmlhttp);
                    xmlhttp.isError = false;
                    typeof callback === 'function' && callback(xmlhttp);
                }
                else if (xmlhttp.status == 401) {
                    xmlhttp.isError = true;
                    typeof callback === 'function' && callback(xmlhttp);
                }
                else {
                    xmlhttp.isError = true;
    
                    if (options.retryCount < 1) {
                        xmlhttp.isInvalidRequest = true;
                        typeof callback === 'function' && callback(xmlhttp);
                    }
                    else {
                        self.invokeAuthAPI(options, callback);
                    }
                }
            }
        };

        xmlhttp.onerror = function(error) {
            xmlhttp.isError = true;
            if (options.retryCount < 1) {
                typeof callback === 'function' && callback(xmlhttp);
            }
            else {
                self.invokeAuthAPI(options, callback);
            }
        };

        try {
            xmlhttp.send(options.data);
        }
        catch (exception) {
            xmlhttp.isError = true;
            if (options.retryCount < 1) {
                typeof callback === 'function' && callback(xmlhttp);
            }
            else {
                self.invokeAuthAPI(options, callback);
            }
        }
    }

    //**********************
    // End public functions
    //**********************

    function setAuthToken(xmlhttp) {
        let authToken = xmlhttp.getResponseHeader("RM-SafetyNet-Device-Token");
        if (authToken) {
            cacheManager.wipeCache();
            localStorage.setItem('RM-SafetyNet-Device-Token', authToken);
        }
    }

}