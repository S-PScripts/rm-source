function contentFilter(_pageReader, envConfig) {

    var self = this;

    this.initiateContentFilter = function (pageContent, firstTime) {

        //Determine if content filter is enabled or is page is already allowed
        chrome.runtime.sendMessage({
            action: 'CHECKURL'
        }, function(response) {
            if (response == 'ALLOW') {
                _pageReader.showPage();
            }
            //Start content filter
            else {
                chrome.runtime.sendMessage({
                    action: 'CONTENTFILTER',
                    pageContent: pageContent,
                    firstTime: firstTime
                }, function(response) {
                    if (response == 'SHOW') {
                        _pageReader.showPage();
                    }

                    if (envConfig.contentFilter.enablePageObservations) {
                        self.observeFurtherPageChanges();
                    }
                })
            }
        });
    }

    //**********************************
    // Monitor further page changes
    //**********************************

    this.observeFurtherPageChanges = function() {

        var observer = new MutationObserver(function(mutations) {
            observer.disconnect();
            checkPageContent();
        });

        //Determines what DOM changes should be observed
        observer.observe(document.getElementsByTagName("body")[0], {
            attributes: false,
            childList: true,
            characterData: false,
            subtree: true,
        });

        var checkPageContent = debounce(function() {

            var pageContent = _pageReader.getUpdatedPageContent();

            if (pageContent.length > 0) {
                self.initiateContentFilter(pageContent, false);
            }

        }, envConfig.contentFilter.pageOvservationsDebounce);
    }

    //**********************************
    // END Monitor further page changes
    //**********************************

    //**********************************
    // Helpers
    //**********************************

    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this,
                args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    //**********************************
    // End helpers
    //**********************************

}

chrome.runtime.sendMessage({
    action: 'GETEXTENSIONSTATE'
}, function(isEnabled) {
    if(isEnabled) {

        document.getElementsByTagName('html')[0].style.visibility = "hidden";
        
        var _pageReader = new pageReader();

        var pageReaderInterval = setInterval(function() {

            var pageContent = _pageReader.getPageContent();

            if(pageContent.length > 0) {

                clearInterval(pageReaderInterval);

                chrome.runtime.sendMessage({
                    action: 'GETCONFIG'
                }, function(response) {
                    var envConfig = response;
                    var _contentFilter = new contentFilter(_pageReader, envConfig);
                    _contentFilter.initiateContentFilter(pageContent, true);
                })

            }
            else if(_pageReader.getReadyState() === 'complete') {

                clearInterval(pageReaderInterval);
                _pageReader.showPage();

                chrome.runtime.sendMessage({
                    action: 'GETCONFIG'
                }, function(response) {
                    var envConfig = response;
                    var _contentFilter = new contentFilter(_pageReader, envConfig);
                    _contentFilter.observeFurtherPageChanges();
                })

            }

        }, 100);
    }
})