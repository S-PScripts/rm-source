/*
    Used to determine the type of request for the reporting platform.
    As this is required before the response headers are received, this is a best guess only.
*/
function requestTypeAnalyser() {

    this.getRequestType = function(details) {

		if(details.type === 'image') {
            return requestTypes.IMAGE;
        }
        else if(details.type === 'other' || details.type === 'main_frame' || details.type === 'sub_frame') {

            var fileExtension = details.url.substring(details.url.lastIndexOf('.') + 1, details.url.length);

            if(fileExtension.toLowerCase() === 'pdf') {
                return requestTypes.PDF;
            }
            else if(fileExtension) {
                for(var i = 0; i < videoFileExtensions.length; i++) {
                    if(fileExtension === videoFileExtensions[i]) {
                        return requestTypes.VIDEO;
                    }
                }

                for(var j = 0; j < audioFileExtensions.length; j++) {
                    if(fileExtension === audioFileExtensions[j]) {
                        return requestTypes.AUDIO;
                    }
                }
				if(details.type === 'main_frame' || details.type === 'sub_frame') {
					return requestTypes.HTML;
					}
                // Return null if any other type
                return null;
            }		 

        }
        
        // Return null if any other type
        return null;

    }

}

var requestTypes = Object.freeze({
    HTML: 'html',
    IMAGE: 'image',
    AUDIO: 'audio',
    VIDEO: 'video',
    PDF: 'pdf'
})

// Based on https://en.wikipedia.org/wiki/Video_file_format
var videoFileExtensions = ['webm', 'mkv', 'flv', 'vob', 'ogv', 'ogg', 'drc', 'mng', 'avi', 'mov', 'qt', 'wmv', 'rm', 'rmvb', 'amv', 'mp4', 'm4v', 'mpg', 'mp2', 'mpeg', 'mpe', 'mpv', 'm2v', 'm4v', 'svi', '3gp', '3g2', 'nsv', 'flv', 'f4v', 'f4p', 'f4a', 'f4b'];

// Based on https://en.wikipedia.org/wiki/Audio_file_format
var audioFileExtensions = ['3gp', 'aa', 'aac', 'aax', 'act', 'aiff', 'amr', 'ape', 'au', 'awb', 'dct', 'dss', 'dvf', 'flac', 'gsm','m4a', 'm4b', 'm4p', 'mp3', 'mpc', 'oga', 'mogg', 'opus', 'ra', 'raw', 'sln', 'tta', 'vox', 'wav', 'wma','wv','webm'];