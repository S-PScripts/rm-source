// Listen to events from contentFilter_worker.js
self.addEventListener('message', function(e) {

    //Read the message sent from the API
    var data = e.data;

    // Set the variables from the data
    var bannedWordsHashes = data.bannedWordsHashes;
    var websiteContent = data.websiteContent;
    var workerId = data.workerId;

    var q = 190011979;
    var primeBase = 16;

    var wordLengths = Object.keys(bannedWordsHashes);

    for (var k = 0; k < wordLengths.length; k++) {
        wordLengths[k] = parseInt(wordLengths[k]);
    }

    // Load in the scripts required for MD5 hashing.
    importScripts('../resources/md5.js', '../resources/enc-base64-min.js');

    function getPageScore() {

        // var t0 = performance.now();

        var score = 0;

        var hashTextParts = {};
        var primeToPowers = {};

        var initWordlength = -2;
        var currentHashtextpart = 0;
        var newhash = 0;

        for (var i = 0; i < wordLengths.length; i++) {

            primeToPowers[wordLengths[i]] = (Math.pow(primeBase, wordLengths[i] - 1) % q);
            hashTextParts[wordLengths[i]] = hashFromTo(websiteContent, 0, wordLengths[i]);
            initWordlength = wordLengths[i];

        }

        var maxIndexForPotentialMatch = (websiteContent.length > wordLengths[wordLengths.length - 1]) ? (websiteContent.length - wordLengths[0]) : websiteContent.length;

        var numberOfLoops = 0;

        for (var i = 1; i <= maxIndexForPotentialMatch; i++) {

            for (var j = 0; j < wordLengths.length; j++) {

                currentWordLength = wordLengths[j];

                currentHashtextpart = hashTextParts[currentWordLength];

                var currentbannedword = bannedWordsHashes[currentWordLength][currentHashtextpart];

                if (currentbannedword) {
                    if (matchesAtIndex((i - 1), websiteContent, currentbannedword)) {
                        score = score + currentbannedword.score;
                    }
                }

                hashTextParts[currentWordLength] = mod((primeBase * (currentHashtextpart - (websiteContent.charCodeAt(i - 1) * primeToPowers[currentWordLength]))) + (websiteContent.charCodeAt(i + currentWordLength - 1)));

                initWordlength = currentWordLength;

            }

        }

        // var t1 = performance.now();

        // console.log("WORKER-" + workerId + ": Took " + (t1 - t0) + " milliseconds (Approx " + (t1 - t0)/1000 + " seconds).");

        return score;
    }

    //Once the basic hash has been matched, use the MD5 hash to confirm this is the correct string.
    function matchesAtIndex(index, text, str) {
        var matches = false;

        var extractFromText = '';
        for (var i = index; i < index + str.originalLength; i++) {
            extractFromText += text[i];
        }

        if (CryptoJS.MD5(extractFromText).toString(CryptoJS.enc.Base64) == str.md5Hash) {
            matches = true;
        }

        return matches;
    }

    function hashFromTo(str, start, end) {

        var hash = 0;

        var j = end - 1;

        for (var i = start; i < end && i < str.length; i++) {
            var magnitude = Math.pow(primeBase, j - i, q);
            hash = mod(hash + str.charCodeAt(i) * magnitude, q);
        }

        return hash;

    }

    function mod(n) {
        return ((n % q) + q) % q
    }

    self.postMessage({
        'score': getPageScore(),
        'workerId': workerId
    });

}, false);
