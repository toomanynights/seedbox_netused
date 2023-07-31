// ==UserScript==
// @name         Seedbox dashboard improvement
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Add daily progress to dashboard
// @author       toomanynights
// @match        https://9.lw.itsby.design/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=itsby.design
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    (async function() {
        let response = await fetch("https://9.lw.itsby.design/stats/network", {
            "credentials": "include",
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
                "Accept": "*/*",
                "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
                "X-Requested-With": "XMLHttpRequest",
                "Authorization": "Basic dG9vbWFueW5pZ2h0czptbDYzQ2xDNWRyTlFCNFhN",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin"
            },
            "referrer": "https://9.lw.itsby.design/",
            "method": "GET",
            "mode": "cors"
        }).then(response => response.json());
        await console.log(response.netused);
    })()


    // -- CALCULATION LOGIC --

    // finding out where we are in current period and its dates
    const currDate = new Date();
    const currDay = currDate.getDate();
    const cutoffDay = 14;
    let periodStart = "";
    let periodEnd = "";

    if (currDay >= cutoffDay) {
        console.log("Cutoff date is behind")
        periodStart = new Date(currDate.getFullYear(), currDate.getMonth(), cutoffDay);
        periodEnd = new Date(currDate.getFullYear(), currDate.getMonth() + 1, cutoffDay);

    } else {
        console.log("Cutoff date is coming")
        periodStart = new Date(currDate.getFullYear(), currDate.getMonth() - 1, cutoffDay);
        periodEnd = new Date(currDate.getFullYear(), currDate.getMonth(), cutoffDay)
    }

    console.log("Start date: " + periodStart)
    console.log("End date: " + periodEnd)
    const periodLength = (periodEnd - periodStart) / (1000 * 3600 * 24);
    const daysGone = (currDate - periodStart) / (1000 * 3600 * 24);

    // dates have been figured out, now to the limits

    const periodLimit = 10000;
    const dailyLimit = (periodLimit / periodLength);
    const currentUsedExact = daysGone * dailyLimit;
    const currentUsedMin = currentUsedExact - dailyLimit;
    const currentUsedMax = currentUsedExact + dailyLimit;
    const currentUsed = document.getElementById("netused");
    let currentState = "";


    // -- A BIT OF UI PAL --

    // finding the required card
    const network_card = document.querySelector('.card-columns').lastElementChild.querySelector('.card-body');

    // creating parent div, adding properties
    const newParDiv = document.createElement("div");
    newParDiv.style.cssText = "display: flex; flex-flow: row; justify-content: space-around; margin-bottom: .5rem;"
    newParDiv.classList.add("dailyLimits");

    const workaroundButton = document.createElement("button");
    workaroundButton.innerHTML = "Calculate daily limits";
    workaroundButton.classList.add("btn", "btn-secondary");

    newParDiv.appendChild(workaroundButton);
    network_card.appendChild(newParDiv);

    workaroundButton.addEventListener("click", (event) => {

       const currentUsedClean = currentUsed.innerText.replace(" TB", "");
       const currentUsedFinal = Number(currentUsedClean) * 1000;
        if (currentUsedMin > currentUsedFinal) {
            currentState = "good";
        } else if (currentUsedMin <= currentUsedFinal && currentUsedFinal < currentUsedMax) {
            currentState = "normal";
        } else if (currentUsedFinal >= currentUsedMax) {
            currentState = "bad";
        } else {
            currentState = "error";
        }

        console.log("Currently used: " + currentUsedFinal);
        console.log("Supposed to be used: " + currentUsedExact);
        console.log("Minimum threshold: " + currentUsedMin)
        console.log("Maximum threshold: " + currentUsedMax)

        workaroundButton.remove();

        // div #1: daily limit
        const childDiv1 = document.createElement("div");
        const childDiv1HeaderCont = document.createElement("h5");
        childDiv1HeaderCont.classList.add("text-center");
        const childDiv1HeaderText = document.createTextNode("Daily limit");
        const childDiv1BodyCont = document.createElement("span");
        childDiv1BodyCont.classList.add("text-center");
        const childDiv1BodyText = document.createTextNode(Math.round(dailyLimit) + " Gb");

        childDiv1HeaderCont.appendChild(childDiv1HeaderText);
        childDiv1BodyCont.appendChild(childDiv1BodyText);
        childDiv1.appendChild(childDiv1HeaderCont);
        childDiv1.appendChild(childDiv1BodyCont);
        newParDiv.appendChild(childDiv1);

        // div #2: threshold
        const childDiv2 = document.createElement("div");
        const childDiv2HeaderCont = document.createElement("h5");
        childDiv2HeaderCont.classList.add("text-center");
        const childDiv2HeaderText = document.createTextNode("Threshold");
        const childDiv2BodyCont = document.createElement("span");
        childDiv2BodyCont.classList.add("text-center");
        const childDiv2BodyText = document.createTextNode(Math.round(currentUsedExact) + " Gb");

        childDiv2HeaderCont.appendChild(childDiv2HeaderText);
        childDiv2BodyCont.appendChild(childDiv2BodyText);
        childDiv2.appendChild(childDiv2HeaderCont);
        childDiv2.appendChild(childDiv2BodyCont);
        newParDiv.appendChild(childDiv2);
        let childDiv3BodyText = "";

        // div #3: summary
        const childDiv3 = document.createElement("div");
        childDiv3.style.cssText = "align-self: start; margin-top: auto; margin-bottom: auto;";
        if (currentState == "good") {
            childDiv3.classList.add("alert","alert-success");
            childDiv3BodyText = document.createTextNode("Crank that upload speed up!");
        } else if (currentState == "normal") {
            childDiv3.classList.add("alert","alert-warning");
            childDiv3BodyText = document.createTextNode("You are about fine");
        } else if (currentState == "bad") {
            childDiv3.classList.add("alert","alert-danger");
            childDiv3BodyText = document.createTextNode("Slow down there pal!");
        } else {
            childDiv3.classList.add("alert","alert-danger");
            childDiv3BodyText = document.createTextNode("ERROR!");
        }
        childDiv3.appendChild(childDiv3BodyText);
        newParDiv.appendChild(childDiv3);

        // div #4: recommended speed
        const speedAllowance = 0.1;
        const recomSpeed = Math.round(((periodLimit * 1000 * 1000) / periodLength / 24 / 60 / 60) * (1 + speedAllowance));

        const childDiv4 = document.createElement("div");
        childDiv4.style.cssText = "display: flex; justify-content: center; font-size: 90%;"
        const childDiv4BodyText = document.createTextNode("Recommended upload speed: " + recomSpeed + " KB/s");
        childDiv4.appendChild(childDiv4BodyText);
        network_card.appendChild(childDiv4);

    });

})();