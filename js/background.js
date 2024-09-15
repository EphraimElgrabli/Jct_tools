/*****************************************************************
 *                           Created By
 *                        David Aben Athar
 *
 * Last update: 21/10/2018               email: abenatha@jct.ac.il
 ******************************************************************/
/*****************************************************************
 * FUNCTION
 *    chrome.runtime.onMessage.addListener
 *
 * RETURN VALUE
 *        This function will execute the function "onBackgroundEvent" in
 *     all view active
 *
 * PARAMETERS
 *   request - an object with contain:
 *             + updatedata  = (true/false/null)
 *             + changeIcon  = (true/false/null)
 *
 *   This function will get the request maded by anothers
 *  pages in the extension and execute backgroundEvent function
 *   In case the object received contain true in login
 *  then the function will login in moodle.jct.ac.il with
 *  the username and password into the object
 *   In case the object received contain true in updatedata
 *  then the function will update the course and task list
 *   In case the object received contain changeIcon
 *  the function will change the extension icon
 *
 * Check too:
 *    backgroundEvent
 **********************************************************************/
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
      if (details.url.includes('/theme/styles.php')) {
        return {redirectUrl: chrome.runtime.getURL('/js/customCSS.css')};
      }
    },
    {urls: ["*://*.jct.ac.il/*"]},
    ["blocking"]
  );
  
  console.log("JCTTools -> CSS redirection listener added");

chrome.runtime.onMessage.addListener(messageListener);
function messageListener(request, sender, sendResponse) {
    console.log("External request");
    console.log(request);

    //In case that the request is null or not an object return Invalid Parameter
    if (request == null || typeof request != "object") {
        backgroundEvent({
            type: "Format error",
            operationCompleted: false,
            error: "Invalid Parameter",
            request: request
        });
        return;
    }

    //In case that the request is to update the data
    if (request.updatedata)
        DataAccess.Data(loginAndUpdate);



    if (request.levnetLogin) {
        DataAccess.Data(function (data) {
            if (data.anonymous != true)
                LevNetLogin(data.username, window.atob(data.password));
        });
    }

    //In case that the request contains changeIcon.
    if (request.changeIcon != null)
        changeIcon(request.changeIcon);

    //setBadge
    if (request.setBadge != null)
        setBadge();

    if (typeof request.message == "string") {
        console.log("External message: " + request.message);
        backgroundEvent({type: "ExternalMessage", operationCompleted: true});
    }
}


/*****************************************************************
 * FUNCTION
 *    backgroundEvent
 *
 *
 * PARAMETERS
 *   eventType - an object with contain:
 *                            +    type = the event type
 *             + operationCompleted  = (true/false)
 *             + error  = string with the error
 *
 * MEANING
 *        When the background page run an operation (like update data)
 *  the function will check in all active views (page of the extension)
 *  if the function "onBackgroundEvent" exist and then run it (sending
 *  the eventType)
 *
 **********************************************************************/
function backgroundEvent(eventType) {
    // Look through all the pages in this extension to find one we can use.
    var views = chrome.extension.getViews();
    for (var i = 0; i < views.length; i++) {
        var view = views[i];
        // If this view has the right URL and hasn't been used yet...
        if (typeof view["onBackgroundEvent"] == "function") {
            // ...call one of its functions and set a property.
            view["onBackgroundEvent"](eventType);
        }
    }
}

/*****************************************************************
 * FUNCTION
 *    chrome.runtime.onInstalled
 *
 * MEANING
 *    When the extension install the function will run and set the default
 * settings
 **********************************************************************/
chrome.runtime.onInstalled.addListener(onInstalled);
function onInstalled(reason) {
    reason = reason["reason"];
    console.log("onInstalled(" + reason + ")");
    if (reason == "install") {
        DataAccess.setData({
            Config: {
                HWSecondAlarm: "0.5",
                HWfirstAlarm: "1",
                UESecondAlarm: "0.5",
                UEfirstAlarm: "1",
                checkLogin: true,
                hiddeModdelHelp: false,
                hiddeUE: false,
                hwChanges: true,
                hwDays: "30",
                hwUpdate: "1",
                style: "new",
                todaysHW: true,
                updateOnPopup: true
            },
            enable:true,
            mo: false, mz: false, wf: false,
            moodleCoursesTable: {}
        });

    }
    else {
        DataAccess.Data(function (data) {
            if (data.Config == null) {
                DataAccess.setData({
                    Config: {
                        HWSecondAlarm: "0.5",
                        HWfirstAlarm: "1",
                        UESecondAlarm: "0.5",
                        UEfirstAlarm: "1",
                        checkLogin: true,
                        hiddeModdelHelp: false,
                        hiddeUE: false,
                        hwChanges: true,
                        hwDays: "30",
                        hwUpdate: "1",
                        style: "new",
                        todaysHW: true,
                        updateOnPopup: true
                    },
                    mo: false, mz: false, wf: false,
                    moodleCoursesTable: {}
                });
            }
        })
    }

    DataAccess.Data(function (data) {
        if ((data["username"] == null) && (data["password"] == null))
            chrome.runtime.openOptionsPage();
    });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name != "updateData") {
        createEventNotification(alarm.name);
    }
    else {
        console.log("Alarm of updateData fired at: " + (new Date));
        DataAccess.Data(loginAndUpdate);
    }
});

chrome.notifications.onClicked.addListener(function (id) {
    chrome.notifications.clear(id);
    if (id.includes("event") || id.includes("updateData") || id.includes("update") || id.includes("todaysHW"))
        return;

    window.open("https://moodle.jct.ac.il/mod/assign/view.php?id=" + id);
});


/******************************************************
 * This function will execute when the chrome start
 ********************************************************/
chrome.alarms.clearAll();
DataAccess.Data(onStart);
/******************************************************/
function onStart(data) {

    chrome.alarms.clearAll();
    chrome.browserAction.setBadgeBackgroundColor({color: "#043D4E"});
    //Because firefox onInstalled doesn't work,
    //we check if the data.Config is defined,
    // in case are not the run onInstalled
    if (data.Config == null) {
        onInstalled("install");
        data.Config = {}
    }

    console.log("Starting background page");
    loginAndUpdate(data);

    //Set the icon of the extension status (active/inactive)
    changeIcon(data.enable);

    if (data.Config != null && data.Config.hwUpdate != null)
        chrome.alarms.create("updatedata", {when: (Date.now()), periodInMinutes: 60 * data.Config.hwUpdate});

    if (data.Config != null && data.Config.todaysHW)
        showTodayEvents(data.tasks, data.courses, data.eventDone, ((data.Config != null && data.Config.hiddeNoSelectedCourseInWindows == true) ? (data.moodleCoursesTable) : null));

    if (data.tasks != null && data.Config != null && data.Config.firstAlarm != false)
        setAlarms(data, true);

}


/**
 * Generate chrome notification list with all tasks (homework's) of the day
 * @param events (object): The tasks
 * @param courses (object) : The courses
 * @param eventDone (object): Check if the user mark as done
 * @param moodleCoursesTable (object): The user courses list
 */
function showTodayEvents(events, courses, eventDone, moodleCoursesTable) {
    if (events == null || events.length == 0 || courses == null || courses.length == 0)
        return;

    if (eventDone == null)
        eventDone = {};

    if (moodleCoursesTable != null && jQuery.isEmptyObject(moodleCoursesTable))
        moodleCoursesTable = null;

    var today = new Date();
    var deadline = new Date();
    var j = 0;
    var list = [];

    for (var i = 0; i < events.length; i++) {

        if (events[i].type == "userEvent")
            return;

        if (eventDone[events[i].id] != null && (eventDone[events[i].id].checked == true || eventDone[events[i].id].notifications == false))
            continue;

        //Check if the course is part of 'my courses' when the user request to show only homework from 'my courses' in the popup
        if (moodleCoursesTable != null && moodleCoursesTable[events[i].courseId] != true) {
            continue;
        }

        deadline = new Date(Date.parse(events[i].deadLine));

        if ((deadline.getDate() == today.getDate() || deadline.getDate() == (today.getDate() + 1) && deadline.getHours() < 2) && deadline.getMonth() == today.getMonth() && Date.parse(deadline) > Date.now())
            list[j++] = {
                title: events[i].name,
                message: ((events[i].type == "homework") ? courses[events[i].courseId].name : " אירוע")
            }
    }

    if (events == null || j == 0)
        return;

    chrome.notifications.create(
        'todaysHW', {
            type: "list",
            title: "ש\"ב להיום",
            iconUrl: chrome.extension.getURL('image/icons/today.jpg'),
            message: "",
            items: list
        });

}


/**
 * This function will set alarms for every course
 * @param data (object) : DB data
 * @param onstart (bool) : Is chrome just start?
 */
function setAlarms(data, onstart) {
    if (data.Config != null && data.Config.hwUpdate != null && !isNaN(data.Config.hwUpdate)) {
        chrome.alarms.create("updateData", {periodInMinutes: (data.Config.hwUpdate * 60)});
    }
    else
        console.log("data.Config.hwUpdate is not defined");

    console.log("Setting alarms")
    if (data.Config == null)
        return;
    var events = data.tasks;
    if (events == null)
        return;
    console.log("Total events: " + events.length);
    //Homework first alarm
    var hwFirstAlarm = parseFloat(data.Config.HWfirstAlarm);
    //User event second alarm
    var ueFirstAlarm = parseFloat(data.Config.UEfirstAlarm);

    console.log("Homework first alarm: " + hwFirstAlarm + ", event first alarm: " + hwFirstAlarm);
    //Homework first alarm
    var hwSecondAlarm = parseFloat(data.Config.HWSecondAlarm);
    //User event second alarm
    var ueSecondAlarm = parseFloat(data.Config.UESecondAlarm);
    console.log("Homework second alarm: " + hwSecondAlarm + ", event second alarm: " + ueSecondAlarm);
    var deadLine = Date.now();
    for (var i = 0; i < events.length; i++) {
        //events[i].type == "userEvent"
        if ((events[i].type == "homework" && isNaN(hwFirstAlarm)) || (events[i].type == "userEvent" && isNaN(ueFirstAlarm)))
            continue;
        if (data.eventDone != null && data.eventDone[events[i].id] != null && (!data.eventDone[events[i].id].notifications || data.eventDone[events[i].id].done || data.eventDone[events[i].id].checked))
            continue;

        if (events[i] == null || (Date.parse(events[i].deadLine) < Date.now()))
            continue;

        deadLine = Date.parse(events[i].deadLine) - ((events[i].type == "homework") ? hwFirstAlarm : ueFirstAlarm) * 60 * 60 * 1000;
        if (deadLine > Date.parse(new Date())) {
            chrome.alarms.create(events[i].id + "(1)", {when: deadLine});
        }
        if ((events[i].type == "homework" && isNaN(hwSecondAlarm)) || (events[i].type == "userEvent" && isNaN(ueSecondAlarm)))
            return;

        deadLine = Date.parse(events[i].deadLine) - ((events[i].type == "homework") ? hwSecondAlarm : ueSecondAlarm) * 60 * 60 * 1000;

        //In case of opening the chrome in a time between second alarm and this task dead line show a notification
        //Otherwise check if the second alarm already expired
        if (onstart || !onstart && deadLine > Date.parse(new Date())) {

            chrome.alarms.create(events[i].id + "(2)", {when: deadLine});
            //Note: in case that the [second alarm < date.now] chrome will fire the alarm
        }
    }
    setBadge();


}


/**
 * This function will generate a notification
 * This is used by the alarm
 * @param eventId (string|object) : The course id/object
 * @param change (bool) : Is a task (time) change?
 */
function createEventNotification(eventId, change) {


    console.log("Generate a notification for id: " + eventId);
    DataAccess.Data(function (data) {
        if (data.tasks == null)
            return;
        var event = null;

        eventId = ((change == true) ? eventId : eventId.substring(0, eventId.length - 3));

        if (change != true)
            for (var i = 0; i < data.tasks.length; i++) {
                if (data.tasks[i].id == eventId) {
                    event = data.tasks[i];

                    if (data.eventDone[event.id] != null && (data.eventDone[event.id].checked == true || data.eventDone[event.id].notifications == false))
                        return false;

                    break;
                }
            }
        else {
            //In case of change, the object 'eventId' is a course object
            event = eventId;
        }

        //To prevent bug
        if (event == null)
            return;

        //Check if the course is part of 'my courses' when the user request to show only homework from 'my courses' in the popup
        if (data.Config != null && data.Config.hiddeNoSelectedCourseInWindows == true && data.moodleCoursesTable != null && data.moodleCoursesTable[event.id] != true) {
            console.log("Homework " + event.name + " of course " + data.courses[event.courseId].name + " is not not in my course list");
            return;
        }


        if (change == true) {

            chrome.notifications.create(
                event.id, {
                    type: 'basic',
                    requireInteraction: (!(data.Config != null && data.Config.hiddeNofication == true)),
                    iconUrl: chrome.extension.getURL('image/icons/change.png'),
                    title: "שינוי בשיעורי בית",
                    message: ((event.name + "\n" + data.courses[event.courseId].name + "\n") + getDate(new Date(Date.parse(event.deadLine))))
                });

        } else {

            //in case that the alarm its late.
            if (Date.parse(event.deadLine) < Date.now())
                return;

            chrome.notifications.create(
                (event.type == "homework") ? eventId : "event " + eventId, {
                    type: 'basic',
                    requireInteraction: true,
                    iconUrl: chrome.extension.getURL('image/icons/reminder.png'),
                    title: ("תזכורת" + ((event.type == "homework") ? " על שיעורי בית" : " אירוע")),
                    message: (event.name + "\n" + ((event.type == "homework") ? data.courses[event.courseId].name + "\n" : "") + getDate(new Date(Date.parse(event.deadLine))))
                });

        }
    });
}

/*****************************************************************
 * FUNCTION
 *   login
 *
 * RETURN VALUE
 *   This function use the object ajaxAns to return the data
 *
 * PARAMETERS
 *   username  - The username to login
 *   password  - The password to login
 *   asyncType - True in case we want to use async
 *
 * MEANING
 *    This function will try to login to the moodle page by send it a
 *   post that contains the username and password (received)
 *
 **********************************************************************/
function login(username, password, anonymous) {


    const promise = new Promise(function (resolve, reject) {
        getLoginToken().then(function (logintoken){
            if(logintoken == null){
                onLogin(null);
                return;
            }
            var request = $.post("https://moodle.jct.ac.il/login/index.php",
                {username: username, password: password,logintoken:logintoken,anchor:""});

            request.done(onLogin);

            request.fail(onLoginFailed);
        });


        function onLogin(data) {
            // In case the username/password are wrong the moodle return an error that is requiered to
            // logout before login a new user
            if (data != null && $(data).find('#notice').length > 0) {
                console.log("wrong password");
                backgroundEvent({type: "login", operationCompleted: false, error: "שם המשתמש או הסיסמה שהזנת שגויים"});
                reject();
                return;
            }
            console.log("login status ok");
            resolve();
        }

        function onLoginFailed(xhr, status, error) {
            setBadge();
            console.log("login status failed, status: " + xhr.status);
            backgroundEvent({type: "login", operationCompleted: false, error: "אין חיבור למודל"});
            reject();
        }
    });





    return promise;
}

function getLoginToken(){
    return  new Promise(function (resolve, reject) {
        $.get("https://moodle.jct.ac.il/login/index.php", function (data) {
            var loginToken = $(data).find("input[name=logintoken]").val();
            console.log("loginToken: "+loginToken)
            resolve(loginToken)
        });
    });
}


/*****************************************************************
 * FUNCTION
 *   updateData
 *
 * RETURN VALUE
 *   This function use the object ajaxAns to return the data
 *
 * PARAMETERS
 *   asyncType - True in case we want to use async
 *
 * MEANING
 *    This function will update the courses and homework list in the
 *   database
 *
 **********************************************************************/
function updateData(asyncType) {
    console.log("Updating data");
    asyncType = asyncType || true;
    // async: false

    const promise = new Promise(function (resolve, reject) {
        var request = $.ajax({
            url: "https://moodle.jct.ac.il",
            type: 'GET',
            async: asyncType,

        });

        request.done(function (data) {
            console.log("request successfully completed");
            if (null == data || 0 == data.length) {
                console.log("Error:Data is null");
                backgroundEvent({
                    type: "updateData",
                    operationCompleted: false,
                    error: "Data is null",
                    request: request
                });
                reject();
                return;
            }

            // Get htm with div
            var html = jQuery('<div>').html(data);
            if (html.find(".courses").length == 0) {
                reject();
                console.log("No courses found");
                backgroundEvent({
                    type: "updateData",
                    operationCompleted: false,
                    error: "נדרש חיבור למודל",
                    request: request
                });
                return;
            }

            //  wrapAllAttributes(courses);
            var coursesObject = getAllCourses(html);
            getAllHomeWorksFromCalendar().then(function (homeworkObject) {

                checkChanges(homeworkObject).then(function () {
                    var data = {courses: coursesObject.data, coursesIndex: coursesObject.index, tasks: homeworkObject, lastHWUpdate: Date.now()};
                    console.log("New data:");
                    console.log(data);
                    DataAccess.setData(data)
                }).then(function () {
                    console.log("updateData setting new alarms");
                    DataAccess.Data(setAlarms);
                    backgroundEvent({type: "updateData", operationCompleted: true});
                    setBadge();
                    resolve();
                    // Reset the alarms
                });
            });

        });

        request.fail(function (data) {
            console.log("request failed");
            console.log(data);
            setBadge();
            backgroundEvent({type: "updateData", operationCompleted: false, error: data, request: request});
            reject()
        });
    });

    return promise;

}

/*****************************************************************
 * FUNCTION
 *   getAllCourses
 *
 * RETURN VALUE
 *    Return an object that contains the courses data (data) and the
 *  hash table order(index)
 *
 * PARAMETERS
 *   html - An html document
 *
 * MEANING
 *   This function will take the couse div in the moodle, then insert
 *   evey course in an object (with name, id, MoodleId)
 *
 *  ATTENTION
 *   This function help the updateData function
 *
 **********************************************************************/
function getAllCourses(html) {
    var data = {};
    var index = [];
    var i = 0;
    $(html).find(".courses .class-box-courseview").each(function () {
        // Find the url of the course (where is contain all data)
        var courseDetails = {};
        var courseLink = $(this).find('a.coursestyle2url');

        if (courseLink.length === 0)
            return true;

        // Find the course id
        courseDetails.Url = courseLink.attr('href');
        var id = getUrlParam('id',courseDetails.Url);

        // if there is an error just stop
        if(id == null || id.length === 0)
            return true;

        // copy the text of the url
        var text = $(this).find('h3').text();
        // Separe the data by id and name
        courseDetails.fullName = text;
        separateCoursesData(text, courseDetails);
        // Save the url
        // Save the moodle id
        courseDetails.moodleId = id;
        // Save the current place of the course in moodle
        index[i] = id;
        i++;
        // Make the id as the hash id and save the courses data
        data[id] = courseDetails;

    });
    return {data: data, index: index};
}
/***************************************
 * Separe data from courses
 * Example 120221.3.5776 - אלגברה לינארית ב
 *
 * The function will search for numbers and
 * save it as id and then take the rest
 * and save as name
 *****************************************/
function separateCoursesData(data, courseDetails) {
    var idNumber = "";
    var character;
    for (var i = 0; i < data.length; i++) {
        character = data.charAt(i);
        if (character == '.' || (character != ' ' && !isNaN(character)))
            idNumber += character;
        else
            break;

    }
    // check if is a course
    var name = data.substring((idNumber.length > 0) ? (idNumber.length + 3) : 0);

    courseDetails.id= idNumber;
    courseDetails.name= name;
}

function getAllHomeWorksFromCalendar() {
    const promise = new Promise(function (resolve, reject) {
       var request = $.ajax({
        url: "https://moodle.jct.ac.il/calendar/view.php?view=upcoming",
        type: 'GET'
       });
       request.done(function (html) {
           var hws = [];
           $(html).find(".eventlist .event").each(function () {
               try {
                   var event = {};
                   // Getting type by icon img alt attribute
                   var iconImg = $(this).find(".card-header .d-inline-block.mt-1 img");
                   if (iconImg.attr("alt") === "ארועי פעילויות") {
                       event["type"] = "homework";
                   } else if (iconImg.attr("alt") === "אירוע משתמש") {
                       event["type"] = "userEvent";
                   } else {
                       return; // Skip this event if it's not homework or user event
                   }
                   // Getting course id from attribute
                   event["courseId"] = $(this).attr("data-course-id");
                   // Getting date (timestamp) from <a>
                   let dateLink = $(this).find(".description a").first().attr("href");
                   let timestamp = dateLink.match(/time=(\d+)/)[1];
                   event["deadLine"] = (new Date(parseInt(timestamp) * 1000)).toString();
                   // Getting id from the submission link
                   let submissionLink = $(this).find(".card-footer a.card-link").attr("href");
                   let idMatch = submissionLink.match(/id=(\d+)/);
                   event["id"] = idMatch ? idMatch[1] : null;
                   // Getting name from title
                   let eventName = $(this).find("h3.name").text().trim();
                   if (eventName.startsWith("יש להגיש את")) {
                       eventName = eventName.match(/יש להגיש את [''](.+)['']$/)[1];
                   }
                   event["name"] = (eventName.length > 33) ? (eventName.substring(0, 30) + "...") : eventName;
                   hws.push(event);
               } catch (e) {
                   console.error(e);
               }
           });
           resolve(hws);
       });
       request.fail(function (data) {
           console.log("HomeWorksFromCalendar - request failed");
           console.log(data);
           reject();
       });
    });
    return promise;
   }

/***************************************
 * Separe data from homework div
 *
 *  The function will search for the name
 *  and the date then save it in an object
 *  with the type "userEvent"
 *****************************************/
function userEventData(usData) {
    var name = (($(usData).find("a"))[0]).text;
    var deadLine = stringToDate($(usData).find(".date").text());
    deadLine = deadLine.toString();
    return {type: "userEvent", name: name, deadLine: deadLine}
}
//
function separateHomeworkData(hwdata) {
    /**************************************
     * Search the homework id and name
     ***************************************/
    var datatemp = $(hwdata).find("a[data-type=event]");//($(hwdata).find("a"))[0];
    if (datatemp == null || datatemp.length == 0)
        return null;
    // Save the homework name
    var homeworkName = $(datatemp).text();
    if (homeworkName.length > 33)
        homeworkName = homeworkName.substring(0, 30) + "...";

    var homeworkId = $(datatemp).attr("data-event-id");//datatemp;

    /**************************************
     * Search the homework course id
     ***************************************/
        // Get course id from href (ex: https://moodle.jct.ac.il/calendar/view.php?view=day&amp;course=38721&amp;time=1537299000#event_176935)
    var courseId = new URLSearchParams((new URL($(datatemp).attr("href"))).search).get("course");

    /**************************************
     * Search the homework dead line
     ***************************************/
    datatemp = $(hwdata).find('.date');
    if (datatemp == null || datatemp.length == 0)
        return null;

    datatemp = $(datatemp).text();
    //For moodle tests
    if (datatemp.includes("»")) {
        datatemp = datatemp.substring(datatemp.indexOf("»") + 1, datatemp.length);
    }

    var homeworkDeadLine = stringToDate(datatemp);
    if (homeworkDeadLine == null)
        return null;
    homeworkDeadLine = homeworkDeadLine.toString();


    return {type: "homework", id: homeworkId, name: homeworkName, courseId: courseId, deadLine: homeworkDeadLine}
}

/********************************************
 * The function get an day in format DD/MM/YY
 * and a time in format HH:MM then return
 * a string with the date
 *************************************************/
function stringToDate(date) {

    var dayArray = new Array();
    if (date.includes("מחר")) {
        var tomorow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
        dayArray[0] = tomorow.getDate();
        dayArray[1] = tomorow.getMonth();
        dayArray[2] = tomorow.getFullYear();

    } else if (date.includes("היום")) {
        var today = new Date();
        dayArray[0] = today.getDate();
        dayArray[1] = today.getMonth();
        dayArray[2] = today.getFullYear();
    }
    else {
        dayArray = date.split("/");
        dayArray[1] = Number(dayArray[1]) - 1;
        if (dayArray[2] == null) {
            if (dayArray.includes(":"))
                return stringToDate("היום " + dayArray);

            return null;
        }
        dayArray[2] = dayArray[2].substring(0, 4);
    }


    var timeArray = date.split(":");

    if (timeArray[1] == null)
        return null;

    timeArray[0] = timeArray[0].substring(timeArray[0].length - 2);


    return new Date(dayArray[2], dayArray[1], dayArray[0], timeArray[0], timeArray[1], 0);

}

function checkChanges(newHomeworks) {
    return DataAccess.Data(function (data) {
        console.log("Check homeworks: " + (data.Config != null && data.Config.hwChanges != false))
        if (data.Config != null && data.Config.hwChanges == false)
            return;
        if (typeof newHomeworks != "object")
            return;
        if (data.tasks == null)
            return;
        console.log("Checking changes on homework");
        for (var i = 0; i < newHomeworks.length; i++) {
            if (newHomeworks[i].type != "homework")
                continue;
            for (var j = 0; j < data.tasks.length; j++) {
                if (data.tasks[j].type == "homework" && newHomeworks[i].id == data.tasks[j].id) {
                    //Check if the HW is already submited
                    if (Date.parse(data.tasks[j].deadLine) != Date.parse(newHomeworks[i].deadLine)) {
                        if (data.eventDone != null && data.eventDone[newHomeworks[i].id] != null && data.eventDone[newHomeworks[i].id]["checked"] == true)
                            if (data.Config != null && data.Config["showChangeAfterSubmit"] != true)
                                break;

                        createEventNotification(newHomeworks[i], true)
                        break;
                    }
                }
            }
        }
    });
}

//Login deprecated
function loginAndUpdate(data) {
    console.log("updating database");
    return updateData();
}

function setBadge() {//showBadge
    DataAccess.Data(function (data) {

        var counter = 0;
        var events = data.tasks;
        var event;
        var deadLine = new Date();
        var checked;
        var duplicate = {}
        if (events != null && data.Config != null && data.Config.showBadge != false)
            for (var i = 0; i <= events.length; i++) {

                // Check if the event already finish
                if (events[i] == null || Date.parse(events[i].deadLine) < Date.now())
                    continue;

                // Check if the user want to show user events
                if (data.Config != null) {

                    if (events[i].type == "userEvent")
                        continue;

                    if (data.Config.hwDays != null && Date.parse(events[i].deadLine) > (Date.now() + data.Config.hwDays * 24 * 60 * 60 * 1000))
                        continue;


                    if (events[i].type == "homework") {

                        if (data.Config.hiddeNoSelectedCourseInWindows == true && data.moodleCoursesTable[events[i].courseId] != true)
                            continue;


                        /*
                         * In this part the program will check if the user limited the total of homeworks
                         * Is important to remember that the homework are sorted by deadline
                         * in this case the program will save the last homework deadline to check with the next.
                         */

                        if (duplicate[events[i].courseId] == null) {
                            duplicate[events[i].courseId] = {};
                            duplicate[events[i].courseId].lastDeadLine = events[i].deadLine;
                            duplicate[events[i].courseId].counter = 1;
                        } else {

                            if (data.Config.hiddeSameDay && Date.parse(events[i].deadLine) == Date.parse(duplicate[events[i].courseId].lastDeadLine))
                                continue;

                            if (data.Config.limitedHw && duplicate[events[i].courseId].counter >= data.Config.limitedHwAmount)
                                continue;


                            duplicate[events[i].courseId].lastDeadLine = events[i].deadLine;
                            duplicate[events[i].courseId].counter++;
                        }

                    }
                }
                // Check if the user already did the homework
                if (data.eventDone != null && data.eventDone[events[i].id] != null && (data.eventDone[events[i].id]["checked"] || data.eventDone[events[i].id]["notifications"] == false ))
                    continue;


                counter++;
            }
        console.log("setBadge: Total outstanding tasks: " + counter);
        if (counter > 0)
            chrome.browserAction.setBadgeText({text: String(counter)});
        else
            chrome.browserAction.setBadgeText({text: ""});

    });

    backgroundEvent({type: "setBadge", operationCompleted: true})
}

/***********************************
 this function change the extension
 icon when the user active/desactive
 the extension
 ************************************/
function changeIcon(flag) {
    if (flag)
        chrome.browserAction.setIcon({path: "../image/icons/jct128.png"});
    else
        chrome.browserAction.setIcon({path: "../image/icons/jctDisable.png"});
}

function LevNetLogin(username, password) {

    const promise = new Promise(function (resolve, reject) {

        var request = $.ajax({
            url: "https://levnet.jct.ac.il//api/home/login.ashx?action=TryLogin",
            type: "POST",
            data: JSON.stringify({
                action: 'TryLogin',
                password: password,
                username: username
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function (response) {
                console.log("success");
            },
            error: function (response) {
                console.log("failed");
            }
        });

        request.done(function (data) {
            // In case the username/password are wrong the moodle return an error that is requiered to
            // logout before login a new user
            if ($("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_lErrorFailed").text().length > 0) {

                console.log("Levnet wrong password");
                backgroundEvent({
                    type: "mazakLogin",
                    operationCompleted: false,
                    error: "שם המשתמש או הסיסמה שהזנת שגויים"
                });
                reject();
                return;
            }
            chrome.runtime.sendMessage({message: "login status ok"});

            console.log("login status ok");
            // console.log(data);
            resolve("");
        });

        request.fail(function (xhr, status, error) {
            chrome.runtime.sendMessage({message: "login status failed, status: " + xhr.status});
            setBadge();
            console.log("login status failed, status: " + xhr.status);
            backgroundEvent({type: "login", operationCompleted: false, error: "אין חיבור למודל"});
            reject();
        });
    });

    return promise;
}



function testNotifications(type) {
    switch (type) {
        case 1:
            chrome.notifications.create(
                "0", {
                    type: 'basic',
                    requireInteraction: true,
                    iconUrl: chrome.extension.getURL('image/icons/reminder.png'),
                    title: ("תזכורת על שיעורי בית"),
                    message: (("Test" + "\n" + "Course test" + "\n") + new Date())
                });
            break;

        case 2:
            chrome.notifications.create(
                "0", {
                    type: 'basic',
                    requireInteraction: true,
                    iconUrl: chrome.extension.getURL('image/icons/change.png'),
                    title: "שינוי בשיעורי בית",
                    message: (("Test" + "\n" + "Course test" + "\n") + new Date())
                });
            break;

        case 3:
            var list = [{title: "Title 1", message: "Text 1"}, {title: "Title 1", message: "Text 1"}, {
                title: "Title 1",
                message: "Text 1"
            }];
            chrome.notifications.create(
                'todaysHW', {
                    type: "list",
                    title: "ש\"ב להיום",
                    iconUrl: chrome.extension.getURL('image/icons/today.jpg'),
                    message: "",
                    items: list
                });
    }
}


function getUrlParam( name, url ){
    if (!url) url = location.href;
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( url );
    return results == null ? null : results[1];
}
