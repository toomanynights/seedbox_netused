// ==UserScript==
// @name         Seedbox dashboard improvement
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  Add daily progress to dashboard
// @author       toomanynights
// @match        https://*.itsby.design/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=itsby.design
// @grant GM_setValue
// @grant GM_getValue
//
// ==/UserScript==


(function() {
    'use strict';

    // -- USER VALUES --

    const cutoffDay = 14; // Billing day of month
    const speedAllowance = 0.1; // What % of speed is allowed on top of maximum, calculated with presumption of 100% load. Default = 0.1 (10%)
    const usedMinAllowance = 1; // How many days worth of traffic consumption you need to have in store for the script to consider you "going too slow". Default = 1
    const usedMaxAllowance = 1; // How many days worth of traffic consumption you need to lack, so the script would consider you "going too fast". Default = 1

    // -- USER VALUES END - DON'T EDIT BELOW THIS POINT --


    // helper function to clean data
    function numberClean(num) {
        const numClean = num.replace(" TB", "");
        const numFinal = Number(numClean) * 1000;
        return numFinal;
    }

    // function to get network data in async mode
    async function getNetUsed() {
        let response = await fetch("https://9.lw.itsby.design/stats/network").then(response => response.json());
        return response;

    };

    let netUsed = ""; // root level value for comparison

    // function to refresh data in UI
    async function refreshCalc() {

        // checking if it needs to be fired
        const currentUsed = (await getNetUsed()).netused;
        if (currentUsed == netUsed) {
            return;
        } else {
            netUsed = currentUsed;
        }

        // -- CALCULATION LOGIC --

        // finding out where we are in current period and its dates
        const currDate = new Date();
        const currDay = currDate.getDate();
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

        const periodLength = (periodEnd - periodStart) / (1000 * 3600 * 24);
        const daysGone = (currDate - periodStart) / (1000 * 3600 * 24);

        // dates have been figured out, now to the limits

        const periodLimitRaw = (await getNetUsed()).nettotal;
        const periodLimit = numberClean(periodLimitRaw);
        const dailyLimit = (periodLimit / periodLength);
        const currentUsedExact = daysGone * dailyLimit;
        const currentUsedMin = currentUsedExact - (usedMinAllowance * dailyLimit);
        const currentUsedMax = currentUsedExact + (usedMaxAllowance * dailyLimit);
        const currentUsedFinal = numberClean(netUsed);
        const recomSpeed = Math.round(((periodLimit * 1000 * 1000) / periodLength / 24 / 60 / 60) * (1 + speedAllowance));
        const usedPercent = (await getNetUsed()).perutil;


        // printing debug info to console
        console.log("Current date: " + currDate);
        console.log("Start date: " + periodStart)
        console.log("End date: " + periodEnd)
        console.log("Currently used: " + currentUsedFinal);
        console.log("Supposed to be used: " + currentUsedExact);
        console.log("Minimum threshold: " + currentUsedMin)
        console.log("Maximum threshold: " + currentUsedMax)


        // replacing values
        childDiv1BodyText.nodeValue = Math.round(dailyLimit) + " Gb";
        childDiv2BodyText.nodeValue = Math.round(currentUsedExact) + " Gb";
        childDiv3.className = "";

        if (usedPercent >= 69.00 && usedPercent < 70.00) {
            childDiv3.classList.add("alert","alert-info");
            childDiv3BodyText.nodeValue = "69% - nice 😏";
        } else if (currentUsedMin > currentUsedFinal) {
            childDiv3.classList.add("alert","alert-success");
            childDiv3BodyText.nodeValue = "Crank that upload speed up!";
        } else if (currentUsedMin <= currentUsedFinal && currentUsedFinal < currentUsedMax) {
            childDiv3.classList.add("alert","alert-warning");
            childDiv3BodyText.nodeValue = "You are about fine";
        } else if (currentUsedFinal >= currentUsedMax) {
            childDiv3.classList.add("alert","alert-danger");
            childDiv3BodyText.nodeValue = "Slow down there pal!";
        } else {
            childDiv3.classList.add("alert","alert-danger");
            childDiv3BodyText.nodeValue = "ERROR!";
        }
        childDiv4BodyText.nodeValue = "Recommended upload speed: " + recomSpeed + " KB/s";

    }

    // -- A BIT OF UI PAL --

    // finding the required card
    const network_card = document.querySelector('.card-columns').lastElementChild.querySelector('.card-body');

    // creating parent div, adding properties
    const newParDiv = document.createElement("div");
    newParDiv.style.cssText = "display: flex; flex-flow: row; justify-content: space-around; margin-bottom: .5rem;"
    newParDiv.classList.add("dailyLimits");
    network_card.appendChild(newParDiv);

    // div #1: daily limit
    const childDiv1 = document.createElement("div");
    childDiv1.classList.add("text-center");
    const childDiv1HeaderCont = document.createElement("h5");
    const childDiv1HeaderText = document.createTextNode("Daily limit");
    const childDiv1BodyCont = document.createElement("span");
    const childDiv1BodyText = document.createTextNode("");

    childDiv1HeaderCont.appendChild(childDiv1HeaderText);
    childDiv1BodyCont.appendChild(childDiv1BodyText);
    childDiv1.appendChild(childDiv1HeaderCont);
    childDiv1.appendChild(childDiv1BodyCont);
    newParDiv.appendChild(childDiv1);

    // div #2: threshold
    const childDiv2 = document.createElement("div");
    childDiv2.classList.add("text-center");
    const childDiv2HeaderCont = document.createElement("h5");
    const childDiv2HeaderText = document.createTextNode("Threshold");
    const childDiv2BodyCont = document.createElement("span");
    const childDiv2BodyText = document.createTextNode("");

    childDiv2HeaderCont.appendChild(childDiv2HeaderText);
    childDiv2BodyCont.appendChild(childDiv2BodyText);
    childDiv2.appendChild(childDiv2HeaderCont);
    childDiv2.appendChild(childDiv2BodyCont);
    newParDiv.appendChild(childDiv2);

    // div #3: summary
    const childDiv3 = document.createElement("div");
    childDiv3.style.cssText = "align-self: start; margin-top: auto; margin-bottom: auto;";
    childDiv3.classList.add("alert");
    const childDiv3BodyText = document.createTextNode("");

    childDiv3.appendChild(childDiv3BodyText);
    newParDiv.appendChild(childDiv3);

    // div #4: recommended speed
    const childDiv4 = document.createElement("div");
    childDiv4.style.cssText = "display: flex; justify-content: center; font-size: 90%;"
    const childDiv4BodyText = document.createTextNode("");
    childDiv4.appendChild(childDiv4BodyText);
    network_card.appendChild(childDiv4);


    // fire once for page load
    refreshCalc();
    // and then every minute
    setInterval(refreshCalc, 60 * 1000); // 60 * 1000 milsec


})();