setTimeout(showDiv, 3000);
function showDiv() {
    document.getElementById("header").className = "header show"; document.getElementById("footer").className = "footer show";
}
document.getElementById("current-year").innerText = new Date().getFullYear();