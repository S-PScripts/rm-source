describe('Request type analyser', function() {

    var _requestTypeAnalyser;

    beforeEach(function() {
        _requestTypeAnalyser = new requestTypeAnalyser();
    })

    it('Should return html for main_frame request', function() {

        var mockDetails = {
            type: "main_frame",
            url: "http://www.rm.com/"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toEqual('html');

    })

    it('Should return html for sub_frame request', function() {

        var mockDetails = {
            type: "sub_frame",
            url: "http://www.rm.com/"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toEqual('html');

    })

    it('Should return image for image request', function() {

        var mockDetails = {
            type: "image",
            url: "http://www.rm.com/"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toEqual('image');

    })

    it('Should return pdf for pdf request', function() {

        var mockDetails = {
            type: "other",
            url: "http://www.rm.com/mock.pdf"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toEqual('pdf');

    })

    it('Should return video for wmv request', function() {

        var mockDetails = {
            type: "other",
            url: "http://www.rm.com/mock.wmv"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toEqual('video');

    })

    it('Should return audio for mp3 request', function() {

        var mockDetails = {
            type: "other",
            url: "http://www.rm.com/mock.mp3"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toEqual('audio');

    })

    it('Should return null for request with unknown file extension', function() {

        var mockDetails = {
            type: "other",
            url: "http://www.rm.com/mock.abc"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toBeNull();

    })

    it('Should return null for request with a resource type other than main_frame, sub_frame, image or other', function() {

        var mockDetails = {
            type: "stylesheet",
            url: "http://www.rm.com/mock"
        }

        var requestType = _requestTypeAnalyser.getRequestType(mockDetails);

        expect(requestType).toBeNull();

    })

})