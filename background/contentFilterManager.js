function contentFilterManager(filterPageManager, cacheManager, errorManager, envConfig, apiHelper, urlFilter) {

    var self = this;

    var banthreshold = envConfig.contentFilter.banThreshold;
    var wordListAPIURL = envConfig.baseAPIURL + "/api/content";
    var bannedWordsHashes = JSON.parse(localStorage.getItem('rmFilteringBannedWords'));

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            
            if (request.action == 'GETCONFIG') {
                sendResponse(envConfig);
            } else if (request.action == 'CHECKURL') {

                var parser = document.createElement('a');
                var response = 'CHECK'
                parser.href = sender.url;
                var hostname = parser.hostname;

                var whiteURLs = JSON.parse(localStorage.getItem('rmFilteringWhiteListURLs'));

                if(whiteURLs) {
                    for (var i = 0; i < whiteURLs.length; i++) {

                        if (RegExp(whiteURLs[i]).test(hostname)) {
                            response = 'ALLOW';
                        }
                    }
                }

                if (response === 'CHECK') {
                    var cacheReturn = cacheManager.checkCache(sender.url);

                    if (cacheReturn.state === "NOTFOUND" && localStorage.getItem('RM-SafetyNet-Device-Token')) {
                        // call api
                        resp = urlFilter.checkAPI({
                            url: sender.url,
                            method: "GET"
                        });

                        cacheReturn = cacheManager.checkCache(sender.url);
                    }

                    if (cacheReturn.state == 'ALLOWED' || cacheReturn.contentFilterEnabled == 0) {
                        response = 'ALLOW';
                    }
                }

                sendResponse(response);
            } else if (request.action == "CONTENTFILTER") {

                // Fixed the issue where page shows blank when there is a delay/error in getting banned words
                if (!bannedWordsHashes) {
                    self.getBannedWordsList();

                    sendResponse('SHOW');
                }
                else{
                    evaluatePageContent(request.pageContent, request.firstTime, function(action) {
                        if (action == 'BLOCK') {
                            var newLogItem = {
                                'state': 'DENIED',
                                'filterListID': '0',
                                'method': 'GET'
                            };
                            cacheManager.logCachedUrlAccess(sender.url, newLogItem);
                            chrome.tabs.update(sender.tab.id, {
                                url: filterPageManager.getFilterPageURL(sender.tab)
                            });
                        } else {
                            sendResponse('SHOW');
                        }
                    });
                }

                // Keeps the channel open https://developer.chrome.com/extensions/runtime#event-onMessage
                return true;
            } else if (request.action == 'SHOWERRORPAGE' && (localStorage.getItem('RM-SafetyNet-Device-Token') != null)) {
                chrome.tabs.update(sender.tab.id, {
                    url: errorManager.showErrorPage(-1, errorManager.errorMsgs.INVALIDWORDLIST)
                });
            } else if (request.action == 'CLEARCACHE') {
                urlFilter.resetAuth();
                self.wipeLocalStorageItems();
                cacheManager.wipeCache();
                self.wipeInMemoryWordList();
            }
        }
    )

    //Calls the API to get the banned word list
    this.getBannedWordsList = function() {

        var requestHeader = [];
        requestHeader['Authorization'] = 'Bearer ' + localStorage.getItem('RM-SafetyNet-Device-Token');

        var options = {
            url: wordListAPIURL,
            method: 'GET',
            async: false,
            retryCount: 3,
            headers: requestHeader,
            data: null
        }

        //sync request 
        apiHelper.callAPI(options, function(xmlhttp) {
            if (xmlhttp.status == 200) {
                var bannedWordList = JSON.parse(xmlhttp.responseText);
                bannedWordsHashes = bannedWordList.words;
                localStorage.setItem('rmFilteringBannedWords', JSON.stringify(bannedWordList.words));
                localStorage.setItem('rmFilteringContentFilterURL', bannedWordList.filterpageUrl);
            }
            // Don't show error page if user isn't authenticated
            else if (xmlhttp.status !== 401) {
                if (xmlhttp.isInvalidRequest) {
                    errorManager.showErrorPage(-1, errorManager.errorMsgs.INVALIDWORDLISTSTATUS);
                }
                else {
                    errorManager.showErrorPage(-1, errorManager.errorMsgs.FAILEDWORDLISTCALL);
                }
            }
        });
    }

    // Clear in memory word list
    this.wipeInMemoryWordList = function() {
        bannedWordsHashes = null;
    }

    //clears the local storage item 
    //explicitly clearing items as we don't need to remove token and GUID from local storage
    this.wipeLocalStorageItems = function() {
        if (localStorage.getItem('rmFilteringBannedWords') != null) {
            localStorage.removeItem('rmFilteringBannedWords');
        }
        if (localStorage.getItem('rmFilteringContentFilterURL') != null) {
            localStorage.removeItem('rmFilteringContentFilterURL');
        }
        if (localStorage.getItem('rmFilteringWhiteListURLs') != null) {
            localStorage.removeItem('rmFilteringWhiteListURLs');
        }
    }

    function evaluatePageContent(websiteContent, firstTime, cb) {

        // var t0 = performance.now();

        websiteContentlength = 0;

        var actualContentLength = 0;

        actualContentLength = websiteContent.length;

        var score = 0;

        // Some sites won't give any content on first load.
        if (websiteContentlength < actualContentLength) {

            var wordLengths = Object.keys(bannedWordsHashes);

            // Object containing the worker farm
            var workers = {};

            var contentChunksCalculated = 0;

            var groupedWordLength = {};

            // Splits string into 20,000 char chunks
            var websiteContentChunks = websiteContent.match(/[\s\S]{1,20000}/g) || [];

            var currentContentChunkIndex = 0;

            /* 

                Create a farm of workers.

                The content filtering is split over these works. Each worker processes 20,000 characters at a time. The number of works
                impacts the performance. More workers doesn't always mean quicker filtering! The maximum number of workers is controller
                in the extension config.
            
            */

            // By default create a single worker
            var numberOfWorkers = 1;

            // If this is the first time this page is being content filtered then create more
            // workers to speed up the time taken to show the page
            if (firstTime) {

                // Set maximum number of workers as set in config
                numberOfWorkers = envConfig.contentFilter.maxNumberOfWorkers;

                // If the content of the site is small then only create as many workers as
                // required. Don't create workers that won't be used.
                if (websiteContentChunks.length < numberOfWorkers) {
                    numberOfWorkers = websiteContentChunks.length;
                }

            }

            var earlyPageShowTriggered = false;

            for (var i = 0; i < numberOfWorkers; i++) {

                workers["worker" + i] = new Worker(chrome.runtime.getURL('content/worker.js'));

                // Add event listener to get the response from the worker
                workers["worker" + i].addEventListener('message', function(e) {

                    contentChunksCalculated++;

                    score = score + e.data.score;

                    var workerId = e.data.workerId;

                    if (score < banthreshold && !earlyPageShowTriggered) {

                        earlyPageShowTriggered = true;

                        // console.log('EARLY SHOW');

                        // var t1 = performance.now();
                        // console.log("Page show triggered after " + (t1 - t0) + " milliseconds. Approx " + parseInt((t1 - t0)/1000) + " seconds");

                        cb('SHOW');

                    }

                    // Check if any other word lengths need checking
                    if (contentChunksCalculated >= websiteContentChunks.length) {

                        // Terminate all the workers if no more work needs to be done.
                        for (var j = 0; j < Object.keys(workers).length; j++) {
                            workers["worker" + j].terminate();
                        }

                        websiteContentlength = actualContentLength;

                        // Capture end time to log final performance
                        // var t1 = performance.now();
                        // console.log("Full content filter took " + (t1 - t0) + " milliseconds. Approx " + parseInt((t1 - t0)/1000) + " seconds");

                        // Check the final score from all workers
                        if (score >= banthreshold) {

                            // console.log('BLOCKED');

                            cb('BLOCK');
                        }
                        // Show the page if not blocked
                        else {

                            // console.log('SHOW');

                            cb('SHOW');

                        }

                    }
                    // Get the next word length
                    else {

                        if (currentContentChunkIndex < websiteContentChunks.length) {

                            // Gather the data required for the worker
                            var workerData = {
                                workerId: workerId,
                                websiteContent: websiteContentChunks[currentContentChunkIndex],
                                bannedWordsHashes: bannedWordsHashes
                            }

                            // Send data to the worker to start work
                            workers["worker" + workerId].postMessage(workerData);

                            currentContentChunkIndex++;

                        }

                    }

                });

                /*  

                    Initialise all the workers.

                    This logic is only ever called once for each worker. After this the above logic in the response event sends
                    the next content chunk back to itself.

                */
                if (currentContentChunkIndex < websiteContentChunks.length) {

                    // Gather the data required for the worker
                    var workerData = {
                        workerId: i,
                        websiteContent: websiteContentChunks[currentContentChunkIndex],
                        bannedWordsHashes: bannedWordsHashes
                    }

                    // Send data to the worker to start work
                    workers["worker" + i].postMessage(workerData);

                    currentContentChunkIndex++;

                }

            }

        }
    }

}
