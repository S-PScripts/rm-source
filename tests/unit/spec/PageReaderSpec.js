describe('Page Reader', function () {

	it('should return the text of the page while leaving the page hidden', function () {

		var _pageReader = new pageReader();

		var mockPageContent = _pageReader.getPageContent();

		expect(mockPageContent).toEqual(jasmine.any(String));
		expect(document.getElementsByTagName('html')[0].style.visibility).toEqual('hidden');

	});

	it('should return the text of the page while leaving the visible', function () {

		document.getElementsByTagName('html')[0].style.visibility = "";

		var _pageReader = new pageReader();

		var mockPageContent = _pageReader.getUpdatedPageContent();

		expect(mockPageContent).toEqual(jasmine.any(String));
		expect(document.getElementsByTagName('html')[0].style.visibility).toEqual('');

	});

	it('should make the page visible', function () {

		document.getElementsByTagName('html')[0].style.visibility = "hidden";

		var _pageReader = new pageReader();

		_pageReader.showPage();

		expect(document.getElementsByTagName('html')[0].style.visibility).toEqual('');

	});

	it('should return ready state', function () {

		var _pageReader = new pageReader();

		var readyState = _pageReader.getReadyState();

		expect(readyState).toEqual(jasmine.any(String));

	});

});