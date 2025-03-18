function filterPageManager() {

    //**********************
    // Public functions
    //**********************

    //Generates the filter page URL based on the blocked URL
    this.getFilterPageURL = function (details) {
        var filterPageURL = localStorage.getItem('rmFilteringContentFilterURL');
        return filterPageURL;
    }

    //**********************
    // End public functions
    //**********************

}
