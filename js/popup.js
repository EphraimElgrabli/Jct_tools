//global data;
var homeworkWindow;
var wifiWindow;
var moodleWindow;
var levnetWindow;
var usefulSites;
var currentOpen;


$(document).ready(function () {
    DataAccess.Data(onStart);
})


function onStart(result) {

    if (result.Config != null && result.Config.style == "classic")
        classicTheme(result);
    else
        themeWithEvents(result);

    $("a[target='_blank']").click(function () {
        //	window.close();
    })

    if (result.Config != null)
    // In case the user want to updated when the button is touched
        if ((result.username && result.password) && result.Config.updateOnPopup != false)
            setTimeout(function () {
                chrome.runtime.sendMessage({updatedata: true});
            }, 20);

    chrome.runtime.sendMessage({setBadge: true});
}

function classicTheme(data) {
    $("#classic").show();
    $("#styleWithHW").remove();
    $("#loading").hide();
    // check if the extension is active
    if (data["enable"])
        $("#on").show();
    else
        $("#off").show();

    $("#disable").click(function () {
        change(false);
        setTimeout(function () {
            window.close();
        }, 1);
    });

    $("#enable").click(function () {
        change(true);
    });

    $("#settings").click(function () {
        //window.open("options.html", "nuevo", "directories=no, menubar=no, scrollbars=yes, statusbar=no, tittlebar=no, width=1100, height=900");
        chrome.runtime.openOptionsPage();
        setTimeout(function () {
            window.close();
        }, 1);
    });


}

function themeWithEvents(data) {
    $("#styleWithHW").show();
    $("#classic").remove();

    if (!data.enable) {
        $("#enable").show();
        $("#disable").hide();
    }
    else {
        $("#enable").hide();
        $("#disable").show();
    }

    $("#disable").click(function () {
        $("#enable").show();
        $(this).hide();
        change(false);
    });

    $("#enable").click(function () {
        $("#disable").show();
        $(this).hide();
        change(true);
    });

    $("#settings").click(function () {
        //	window.open("options.html", "nuevo", "directories=no, menubar=no, scrollbars=yes, statusbar=no, tittlebar=no, width=1100, height=900");
        chrome.runtime.openOptionsPage();

        setTimeout(function () {
            window.close();
        }, 1);
    });

    setGloblaVar();

    $("#version").text(chrome.runtime.getManifest().version_name);

    $("#wifiLogin").click(function () {
        DataAccess.Data(function () {
            if (data.anonymous != true)
                autoWifiLogin();
            else
                openInNewTab("http://captiveportal-login.jct.ac.il/auth/index.html/u");
        });
    });

    $("#moodleButton").click(function () {
        DataAccess.Data(showCourses);
    });

    $("#levnetButton").click(function () {
        chrome.runtime.sendMessage({levnetLogin: true});
        openWindow("L");
    });

    $(levnetWindow).find('div').each(function () {
        var that = this;
        $(this).find('a').each(function () {
            $(this).click(function () {
                var label = $(this).attr("label-target");
                if (label == null || label == "")
                    return true;
                console.log("div[label='" + label + "']");
                $(that).hide();
                $(levnetWindow).find("div[label='" + label + "']").show(500);
            });
        })
    });

    $("#usefulSitesButton").click(function () {
        openWindow('U');
    });
    insertEvents(data);

    // $("#version-paraph").click(function () {
    //     var emailUrl = "mailto:abenatha@jct.ac.il";
    //     chrome.tabs.create({url: emailUrl}, function (tab) {
    //         setTimeout(function () {
    //             chrome.tabs.remove(tab.id);
    //         }, 500);
    //     });
    // })


}

function setGloblaVar() {

    var content = $("#Content");

    homeworkWindow = $(content).find("#Homeworks");
    wifiWindow = $(content).find("#WifiConnect");
    moodleWindow = $(content).find("#MoodleCourse");
    levnetWindow = $(content).find("#levnetPages");
    usefulSites = $(content).find("#usefulSitesContent");
    currentOpen = 'H';

}

function change(flag) {
    DataAccess.setData("enable", flag);
    chrome.runtime.sendMessage({changeIcon: flag});

}

function insertEvents(data) {
    console.log("Inserting events:", data);
    $(".event").remove();
    var events = data.tasks || [];
    if (data.testsTasksDate) {
        events = events.concat(data.testsTasksDate);
    }
    events.sort((a, b) => new Date(a.deadLine) - new Date(b.deadLine));

    var now = new Date();
    var duplicate = {};

    events.forEach(event => {
        if (!event || new Date(event.deadLine) < now) return;

        if (data.Config) {
            if (data.Config.hiddeUE && event.type === "userEvent") return;
            if (data.Config.hwDays && new Date(event.deadLine) > new Date(now.getTime() + data.Config.hwDays * 24 * 60 * 60 * 1000)) return;
            if (event.type === "homework") {
                if (data.Config.hiddeNoSelectedCourseInWindows && !data.moodleCoursesTable[event.courseId]) return;
                if (!duplicate[event.courseId]) {
                    duplicate[event.courseId] = { lastDeadLine: event.deadLine, counter: 1 };
                } else {
                    if (data.Config.hiddeSameDay && event.deadLine === duplicate[event.courseId].lastDeadLine) return;
                    if (data.Config.limitedHw && duplicate[event.courseId].counter >= data.Config.limitedHwAmount) return;
                    duplicate[event.courseId].lastDeadLine = event.deadLine;
                    duplicate[event.courseId].counter++;
                }
            }
        }

        var checked = "";
        if (data.eventDone && data.eventDone[event.id]) {
            if (data.Config && data.Config.hiddeTasksDone !== false && data.eventDone[event.id].checked) return;
            checked = ((data.eventDone[event.id].checked || data.eventDone[event.id].done) ? "checked" : "") + 
                      ((data.eventDone[event.id].done) ? " disabled" : "");
        }

        var eventHtml = `<span class='event ${event.type === "test" ? "event-test" : ""}'>`;

        if (event.type === "homework") {
            eventHtml += `<input type='checkbox' class='done' courseId='${event.id}' ${checked} />`;
        } else {
            eventHtml += `<input type='checkbox' style='visibility: hidden;' />`;
        }

        if (event.type === "homework") {
            eventHtml += `<a href='https://moodle.jct.ac.il/mod/assign/view.php?id=${event.id}' target='_blank'>`;
        }
        eventHtml += `<span class='eventDetails'><p class='name'>`;
        
        if (event.type === "test") {
            eventHtml += `<a href='https://levnet.jct.ac.il/Student/TestRooms.aspx' target='_blank'>`;
        }
        eventHtml += `${event.name}`;
        if (event.type === "test") {
            eventHtml += `</a>`;
        }
        eventHtml += `</p>`;

        if (event.type === "homework") {
            if (data.courses && data.courses[event.courseId]) {
                eventHtml += `<p class='courseName'>${data.courses[event.courseId].name}</p>`;
            } else {
                console.warn(`Course not found for id: ${event.courseId}`);
                eventHtml += `<p class='courseName'>Unknown Course</p>`;
            }
        } else if (event.type === "test") {
            eventHtml += `<p class='courseName'>${event.courseName || 'Unknown Course'}</p>`;
        }

        eventHtml += `<p class='deadLine'>${getDate(new Date(event.deadLine))}</p></span>`;

        if (event.type === "homework") {
            eventHtml += `</a>`;
        }

        if (event.type !== "test") {
            var notificationSrc = (data.eventDone && data.eventDone[event.id] && data.eventDone[event.id].notifications === false) 
                ? "image/popup/timbreOff.png" : "image/popup/timbre.png";
            eventHtml += `<img src='${notificationSrc}' class='notifi' courseId='${event.id}'>`;
        }

        eventHtml += `</span>`;
        $("#homeworksContent").append(eventHtml);
    });

    $("#eventsTotal").text($(".event").length);
    $("#lastHwUpdate").text(formatDate(data.lastHWUpdate));

    $(".notifi").click(function() {
        var currentUrl = $(this).attr("src");
        var newUrl = currentUrl === "image/popup/timbre.png" ? "image/popup/timbreOff.png" : "image/popup/timbre.png";
        $(this).attr("src", newUrl);
        DataAccess.setObjectInObject("eventDone", $(this).attr("courseId"), "notifications", newUrl === "image/popup/timbre.png");
        setTimeout(() => chrome.runtime.sendMessage({setBadge: true}), 20);
    });

    $(".done").change(function() {
        DataAccess.setObjectInObject("eventDone", $(this).attr("courseId"), "checked", this.checked);
        setTimeout(() => chrome.runtime.sendMessage({setBadge: true}), 20);
    });
}


function onBackgroundEvent(eventType) {

    if (typeof eventType != "object")
        return;

    console.log("onBackgroundEvent:");
    console.log(eventType);

    switch (eventType.type) {
        case "updateData":
            DataAccess.Data(function (data) {
                insertEvents(data);
            });
            break;
        case "wifiLogin":
            autoWifiLogin(eventType.operationCompleted, eventType.error)
            break;
        default:

    }

}
function autoWifiLogin(status, error) {


    if (status == null) {
        openWindow("W");
        $(wifiWindow).find(".wificonected").hide();
        $(wifiWindow).find(".wifiNotConected").hide();
        $(wifiWindow).find(".wifiloader").show();
        $(wifiWindow).find("#wifimsg").show();

        chrome.runtime.sendMessage({wifiLogin: true});
    }
    else {
        if (status) {
            $(wifiWindow).find(".wifiloader").hide();
            $(wifiWindow).find(".wificonected").show();
            $(wifiWindow).find("#wifimsg").text("מחובר");
        }
        else {
            $(wifiWindow).find(".wifiloader").hide();
            $(wifiWindow).find(".wifiNotConected").show();
            $(wifiWindow).find("#wifimsg").text(error);
        }

        setTimeout(function () {

            $(wifiWindow).find(".wifiloader").hide();
            $(wifiWindow).find(".wifiNotConected").hide();
            $(wifiWindow).find("#wifimsg").hide();
            if (currentOpen == "W")
                openWindow("H");


        }, 5000);

    }

}


function showCourses(data) {

    openWindow("M");


    //Set var to courses div
    var MoodleCourseDiv = $("#MoodleCourse");

    //reset div
    $(MoodleCourseDiv).find(".options").remove();

    //Add a button to open moodle
    $(MoodleCourseDiv).append("<a href='https://moodle.jct.ac.il/' target='_blank' style='text-align: center'><span class='options main' >מודל</span></a>");

    //TODO: Check if the user didnt select any course


    //Get my courses in order
    var courses = orderCourses(data.moodleCoursesTable, data.coursesIndex);

    //Temp var
    var course = {};
    var courseSpan = "";

    //remove all the courses the user chose (the options to be hide are save in the local storage)
    for (var i = 0; i < courses.length; i++) {

        //Get course details
        course = data.courses[courses[i]];
        //Set span
        courseSpan = "<a href='https://moodle.jct.ac.il/course/view.php?id=" + course.moodleId + "' target='_blank'><span class='options navigator' >" + course.id + " - " + course.name + "</span></a>";
        //Add to the div
        $(MoodleCourseDiv).append(courseSpan);
    }

}

function orderCourses(courses, index) {

    if (courses == null || index == null)
        return [];

    var orderCourses = [];
    var j = 0;
    for (var i = 0; i < index.length; i++) {
        if (courses[index[i]] == true) {
            orderCourses[j++] = index[i];
        }
    }
    return orderCourses;
}


function openWindow(type) {


    switch (currentOpen) {
        case 'H':
            $(homeworkWindow).hide();
            break;
        case 'W':
            $(wifiWindow).hide();
            break;
        case 'M':
            $(moodleWindow).hide();
            break;
        case 'L':
            $(levnetWindow).hide();
            $(levnetWindow).find('div').hide();
            $(levnetWindow).find('div[label="main"]').show();
            break;
        case 'U':
            $(usefulSites).hide();
    }


    switch (type) {
        case currentOpen:
            $(homeworkWindow).show();
            currentOpen = "H";
            break;
        case "H":
            $(homeworkWindow).show();
            currentOpen = "H";
            break;
        case "W":
            $(wifiWindow).show();
            currentOpen = "W";
            break;
        case "M":
            $(moodleWindow).show();
            currentOpen = "M";
            break;
        case "L":
            $(levnetWindow).show();
            currentOpen = "L";
            break;
        case 'U':
            $(usefulSites).show();
            currentOpen = "U";
            break;
    }
}

function openInNewTab(url) {
    var win = window.open(url, '_blank');
    win.focus();
}

function formatDate(timespan){
    if(timespan == null || isNaN(timespan) || timespan <= 0){
        return "-"
    }
    let date = new Date(timespan)
    let dateStr = date.toLocaleString('en-GB',{hour12: false})
    let dateStrArr = dateStr.split(",")
    if(sameDay(date,new Date())) {
        return getTime(dateStrArr[1]);
    }else {
        return getTime(dateStrArr[1]) + " " + dateStrArr[0];
    }

}

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function getTime(time){
    let lastIndex = time.lastIndexOf(":");
    return lastIndex >= 0 ? time.substr(0,lastIndex) : time;
}
