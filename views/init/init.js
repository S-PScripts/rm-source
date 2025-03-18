function pageLoded() {
    chrome.runtime.sendMessage({
        action: 'INIT_PAGE'
    });
}

//Load event has to be registerd in this format.
//See https://developer.chrome.com/extensions/tut_migration_to_manifest_v2#inline_scripts for details.
document.addEventListener('DOMContentLoaded', function() {
    pageLoded();
});