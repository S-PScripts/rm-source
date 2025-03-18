/*

    e2e test helper - This file is for all logic required for e2e testing, such as clearing
    local storage and populating mock data in the cache. 

    IMPORTANT: This file won't be available in live so do not put any functionality required
    for the extension to work in here!

*/

//Listener to clear the storage data
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    if (request.action === "clear"){

        console.log("Hi I am Abhilash. I am here");

        if(localStorage.getItem('RM-SafetyNet-Device-Token') != null){
                localStorage.removeItem('RM-SafetyNet-Device-Token');
        }
        if(localStorage.getItem('rmFilteringBannedWords') != null){
                localStorage.removeItem('rmFilteringBannedWords');
        }
       
        sendResponse({acknowledge: "Clearing process completed"});
    }
});
