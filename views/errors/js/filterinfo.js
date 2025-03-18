window.addEventListener("load", setParam);
function setParam() {
    var filterListId = "";
    var requestUrl = "";
    var ipAddress = "";
    var policyId = "";
    var estID = "";
    var datacentreID = "";
    var timestamp = "";
    var SupportRef = "";
    if (window.location.hash) {
        var params = (window.location.hash.substr(1)).split("&");
        for (i = 0; i < params.length; i++) {
            var a = params[i].split("=");
            if (a[0] == "f") {
                filterListId = decodeURIComponent(a[1]);
            }
            if (a[0] == "u") {
                requestUrl = decodeURIComponent(a[1]);
            }
            if (a[0] == "ip") {
                ipAddress = decodeURIComponent(a[1]);
            }
            if (a[0] == "d") {
                datacentreID = decodeURIComponent(a[1]);
            }
            if (a[0] == "p") {
                policyId = decodeURIComponent(a[1]);
            }
            if (a[0] == "t") {
                timestamp = decodeURIComponent(a[1]);
            }
            if (a[0] == "est") {
                estID = decodeURIComponent(a[1]);
            }
        }
        SupportRef = "Support reference: E" + estID + "-IP" + ipAddress + "-F" + filterListId + "-D" + datacentreID + "-P" + policyId + "-T" + timestamp;
        document.getElementById("SupportRef").innerHTML = SupportRef;
    }

    var filterpolicyurl = document.getElementById("filterPolicyUrlId");


    if (filterListId == "") {
        document.getElementById("filterListNameId").innerHTML = "";
        document.getElementById("filterPolicyUrlId").style.display = 'none';
    }

    if (requestUrl == "") {
        document.getElementById("filterListNameId").innerHTML = "";
        document.getElementById("requestUrl").innerHTML = "";
    }
    else {
        document.getElementById("requestUrl").innerHTML = requestUrl;
    }
}