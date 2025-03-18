POCChromeFilter

POC for a Google Chrome extension that provies URL and content filtering

To load the extension into your browser you need to do the following:

1)	Open Chrome
2)	Click the ≡ button, expand More tools and click Extensions
3)	In the top right hand corner tick the Developer mode check box
4)	Click Load unpacked extension… 
5)	Navigate to the cloned repository and click OK

The URL filter blocks www.rm.com and the content filter is the full content filter list but the word trello has been given a very high score so trello.com should be blocked.

To debug the extension you can access dev tools for the extension from the extensions window.

To debug the content filter you can access it by going to any URL, opening dev tools for that tab and finding the contentFilter.js file in the page source.
