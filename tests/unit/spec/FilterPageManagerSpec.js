describe('Filter page manager', function () {

	describe('public getFilterPageURL function', function () {

		it('should return a filter page for the content filter', function () {

			var _filterPageManager = new filterPageManager();

			var mockRequest = {
				'url': 'http://www.google.com'
			}

			var filterpageExpected = 'http://rmsftynetci01templates.blob.core.windows.net/filterpages/29-53968.htm#f=3&c=23504&d=100&p=9889&t=2380923&u=http://www.google.com&ip=10.0.0.1';


			var localStorageGetItemSpy;

			localStorage.getItem = function (key) {
				return filterpageExpected;
			}

			var filterPage = _filterPageManager.getFilterPageURL(mockRequest);

			localStorageGetItemSpy = spyOn(localStorage, 'getItem');

			expect(filterPage).toEqual(filterpageExpected);

		})

	})

})