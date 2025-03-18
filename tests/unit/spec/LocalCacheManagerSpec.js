describe('Local URL cache', function () {

	describe('public checkCache function', function () {

		var mockEnvConfig = {
			'cacheCheckForExpiredInterval': 60000,
			'cacheExpiryTimeInMinutes': 10
		}

		it('should return allowed for cached allowed domain', function () {

			chrome.storage = {
				local: {
					get: function (cacheKey, callback) {
						var localCache = {
							'www.google.com': {
								'state': 'ALLOWED',
								'filterpageURL': 'ALLOWED'
							}
						}

						callback(localCache);
					}
				}
			}

			var mockGetChromeStorage = spyOn(chrome.storage.local, 'get').and.callThrough();

			var _cacheManager = new cacheManager(mockEnvConfig);

			var cacheState = _cacheManager.checkCache('www.google.com');

			expect(cacheState.state).toEqual('ALLOWED');
			expect(cacheState.redirectUrl).toEqual(null);
			expect(mockGetChromeStorage).toHaveBeenCalled();

		})

		it('should return blocked for cached blocked domain', function () {

			chrome.storage = {
				local: {
					get: function (cacheKey, callback) {
						var localCache = {
							'www.google.com': {
								'state': 'BLOCKED',
								'filterpageURL': 'http://www.filterpage.com'
							}
						}

						callback(localCache);
					}
				}
			}

			var mockGetChromeStorage = spyOn(chrome.storage.local, 'get').and.callThrough();

			var _cacheManager = new cacheManager(mockEnvConfig);

			var cacheState = _cacheManager.checkCache('www.google.com');

			expect(cacheState.state).toEqual('BLOCKED');
			expect(cacheState.redirectUrl).toEqual('http://www.filterpage.com');
			expect(mockGetChromeStorage).toHaveBeenCalled();

		})

		it('should return unknown for cached unknown domain', function () {

			chrome.storage = {
				local: {
					get: function (cacheKey, callback) {
						var localCache = {
							'www.google.com': {
								'state': 'UNKNOWN',
								'filterpageURL': 'UNKNOWN'
							}
						}

						callback(localCache);
					}
				}
			}

			var mockGetChromeStorage = spyOn(chrome.storage.local, 'get').and.callThrough();

			var _cacheManager = new cacheManager(mockEnvConfig);

			var cacheState = _cacheManager.checkCache('www.google.com');

			expect(cacheState.state).toEqual('UNKNOWN');
			expect(cacheState.redirectUrl).toEqual(null);
			expect(mockGetChromeStorage).toHaveBeenCalled();

		})

		it('should return not found for an uncached domain', function () {

			chrome.storage = {
				local: {
					get: function (cacheKey, callback) {
						callback({});
					}
				}
			}

			var mockGetChromeStorage = spyOn(chrome.storage.local, 'get').and.callThrough();

			var _cacheManager = new cacheManager(mockEnvConfig);

			var cacheState = _cacheManager.checkCache('www.google.com');

			expect(cacheState.state).toEqual('NOTFOUND');
			expect(cacheState.redirectUrl).toEqual(null);
			expect(mockGetChromeStorage).toHaveBeenCalled();

		})

	})

	describe('public updateCache function', function () {

		var mockEnvConfig = {
			'cacheCheckForExpiredInterval': 60000,
			'cacheExpiryTimeInMinutes': 10
		}

		it('should update an empty chrome.storage.local cache with a new url to cache', function () {

			chrome.storage = {
				local: {
					get: function (cacheKey, callback) {
						callback({});
					},
					set: function (newCacheItem) {

					}
				}
			}

			var mockGetChromeStorage = spyOn(chrome.storage.local, 'get').and.callThrough();
			var mockSetChromeStorage = spyOn(chrome.storage.local, 'set').and.callThrough();

			var _cacheManager = new cacheManager(mockEnvConfig);

			_cacheManager.updateCache('http://www.google.com', 'ALLOWED', 'ALLOWED', 1, '100', 'GET');

			expect(mockGetChromeStorage).toHaveBeenCalled();

			var calledWithNewCacheItem = mockSetChromeStorage.calls.mostRecent().args[0].cachedURLs['http://www.google.com']

			var calledWithState = calledWithNewCacheItem.state;
			var calledWithFilterpageUrl = calledWithNewCacheItem.filterpageURL;
			var calledWithTimestamp = calledWithNewCacheItem.timeStamp;

			expect(calledWithState).toEqual('ALLOWED');
			expect(calledWithFilterpageUrl).toEqual('ALLOWED');
			expect(calledWithTimestamp).toEqual(jasmine.any(Number));

		})

		it('should update an existing chrome.storage.local cache with a new url to cache', function () {

			chrome.storage = {
				local: {
					get: function (cacheKey, callback) {

						var mockCache = {
							'cachedURLs': {
								'http://www.google.com': {
									'state': 'ALLOWED',
									'filterpageURL': 'ALLOWED',
									'timeStamp': 123456
								}
							}
						}

						callback(mockCache);
					},
					set: function (newCacheItem) {

					}
				}
			}

			var mockGetChromeStorage = spyOn(chrome.storage.local, 'get').and.callThrough();
			var mockSetChromeStorage = spyOn(chrome.storage.local, 'set').and.callThrough();

			var _cacheManager = new cacheManager(mockEnvConfig);

			_cacheManager.updateCache('http://www.bing.com', 'BLOCKED', 'http://www.filterpage.com');

			expect(mockGetChromeStorage).toHaveBeenCalled();

			var calledWithNewCacheItemBing = mockSetChromeStorage.calls.mostRecent().args[0].cachedURLs['http://www.bing.com']

			var calledWithStateBing = calledWithNewCacheItemBing.state;
			var calledWithFilterpageUrlBing = calledWithNewCacheItemBing.filterpageURL;
			var calledWithTimestampBing = calledWithNewCacheItemBing.timeStamp;

			var calledWithNewCacheItemGoogle = mockSetChromeStorage.calls.mostRecent().args[0].cachedURLs['http://www.google.com']

			var calledWithStateGoogle = calledWithNewCacheItemGoogle.state;
			var calledWithFilterpageUrlGoogle = calledWithNewCacheItemGoogle.filterpageURL;
			var calledWithTimestampGoogle = calledWithNewCacheItemGoogle.timeStamp;

			expect(calledWithStateBing).toEqual('BLOCKED');
			expect(calledWithFilterpageUrlBing).toEqual('http://www.filterpage.com');
			expect(calledWithTimestampBing).toEqual(jasmine.any(Number));

			expect(calledWithStateGoogle).toEqual('ALLOWED');
			expect(calledWithFilterpageUrlGoogle).toEqual('ALLOWED');
			expect(calledWithTimestampGoogle).toEqual(123456);

		})

	})

//jasmine check for clearExpiredCache needs to be modified if needed 
	// describe('public clearExpiredCache function', function () {

	// 	var mockEnvConfig = {
	// 		'cacheCheckForExpiredInterval': 60000,
	// 		'cacheExpiryTimeInMinutes': 10
	// 	}

	// 	it('should clear expire cache items when called manually', function () {

	// 		chrome.storage = {
	// 			local: {
	// 				get: function (cacheKey, callback) {

	// 					var mockCache = {
	// 						'cachedURLs': {
	// 							'http://www.google.com': {
	// 								'state': 'ALLOWED',
	// 								'filterpageURL': 'ALLOWED',
	// 								'timeStamp': Number.MIN_VALUE
	// 							},
	// 							'http://www.bing.com': {
	// 								'state': 'BLOCKED',
	// 								'filterpageURL': 'http://www.filterpage.com',
	// 								'timeStamp': Number.MAX_VALUE
	// 							}
	// 						}
	// 					}

	// 					callback(mockCache);
	// 				},
	// 				set: function (newCacheItem, callback) {
	// 					callback();
	// 				}
	// 			}
	// 		}

	// 		var mockGetChromeStorage = spyOn(chrome.storage.local, 'get').and.callThrough();
	// 		var mockSetChromeStorage = spyOn(chrome.storage.local, 'set').and.callThrough();

	// 		var _cacheManager = new cacheManager(mockEnvConfig);

	// 		_cacheManager.clearExpiredCache()

	// 		expect(mockGetChromeStorage).toHaveBeenCalled();

	// 		var calledWithNewCacheItemBing = mockSetChromeStorage.calls.mostRecent().args[0].cachedURLs['http://www.bing.com']

	// 		var calledWithStateBing = calledWithNewCacheItemBing.state;
	// 		var calledWithFilterpageUrlBing = calledWithNewCacheItemBing.filterpageURL;
	// 		var calledWithTimestampBing = calledWithNewCacheItemBing.timeStamp;

	// 		var calledWithNewCacheItemGoogle = mockSetChromeStorage.calls.mostRecent().args[0].cachedURLs['http://www.google.com']

	// 		expect(calledWithStateBing).toEqual('BLOCKED');
	// 		expect(calledWithFilterpageUrlBing).toEqual('http://www.filterpage.com');
	// 		expect(calledWithTimestampBing).toEqual(jasmine.any(Number));

	// 		expect(calledWithNewCacheItemGoogle).toEqual(undefined);

	// 	})

	// })

	describe('public wipeCache function', function () {

		var mockEnvConfig = {
			'cacheCheckForExpiredInterval': 60000,
			'cacheExpiryTimeInMinutes': 10
		}

		it('should clear all cached items when called manually', function () {

			chrome.storage = {
				local: {
					get: function (cacheKey, callback) {

						var mockCache = {
							'cachedURLs': {
								'http://www.google.com': {
									'state': 'ALLOWED',
									'filterpageURL': 'ALLOWED',
									'timeStamp': Number.MIN_VALUE
								},
								'http://www.bing.com': {
									'state': 'BLOCKED',
									'filterpageURL': 'http://www.filterpage.com',
									'timeStamp': Number.MAX_VALUE
								}
							}
						}

						callback(mockCache);
					},
					clear: function (callback) {
						chrome.runtim = {
							lastError: null
						}

						callback();
					}
				}
			}

			var mockClearChromeStorage = spyOn(chrome.storage.local, 'clear').and.callThrough();

			var _cacheManager = new cacheManager(mockEnvConfig);

			_cacheManager.wipeCache()

			expect(mockClearChromeStorage).toHaveBeenCalled();

		})

	})

})