function pageReader() {

    this.getPageContent = function() {

        document.getElementsByTagName('html')[0].style.visibility = "";

        let bodyContent = document.getElementsByTagName("body");
        let pageContent = "";

        if (bodyContent && bodyContent.length > 0)
        {
            pageContent = bodyContent[0].innerText.trim().replace(/\s/g, " ").toLowerCase();
        }

        document.getElementsByTagName('html')[0].style.visibility = "hidden";

        return pageContent;
    }

    this.getUpdatedPageContent = function() {

        return document.getElementsByTagName("body")[0].innerText.trim().replace(/\s/g, " ").toLowerCase();

    }

    this.showPage = function() {

        document.getElementsByTagName('html')[0].style.visibility = "";

    }

    this.getReadyState = function() {

        return document.readyState;

    }

}