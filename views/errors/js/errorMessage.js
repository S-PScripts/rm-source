var params1 = document.body.getElementsByTagName('script');
var errorMsg = "";
if (params1) {
    var params = (window.location.hash.substr(1)).split("&");
    for (i = 0; i < params.length; i++) {

        var a = params[i].split("=");
        if (a[0] == "msg") {
            errorMsg = decodeURIComponent(a[1]);
        }
    }
    if(errorMsg.length>0)
    document.getElementById("errorMsgSpn").innerHTML = atob(errorMsg);
}