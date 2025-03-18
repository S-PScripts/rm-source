//Called click event of 'Clear cache' button.
function clearCache() {
    chrome.runtime.sendMessage({
        action: 'CLEARCACHE'
    });
    window.close();
}

//Click event has to be registerd in this format.
//See https://developer.chrome.com/extensions/tut_migration_to_manifest_v2#inline_scripts for details.
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("current-year").innerText = new Date().getFullYear();
    var button = document.getElementById("clear-cache-btn");
    button.addEventListener('click', clearCache);
});
