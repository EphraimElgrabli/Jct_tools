var username;
var startCounter = 0;
$(document).ready(function () {
    DataAccess.Data(onStart);
});


function onStart(data) {

    // Check if the username and password is not empty
    username = data["username"];
    console.log("JCT Tools -> injection started");
    // Decrypting the password
    var password = "";
    if (data["password"] != null)
        password = window.atob(data["password"]);

    // Check current host
    switch (location.host) {
        case "moodle.jct.ac.il":
            moodle(password, data);
            checkAndUpdateHW(data);
            break;
        case "mazak.jct.ac.il":
        case "levnet.jct.ac.il":
            mazakConnect(data);
            retrieveDataFromLevNet()
            break;
        default: 
            moodle(password, data);
    }
}


function mazakConnect(data) {

    //Courses time as list page
    if (location.pathname.includes("/Student/ScheduleList.aspx")) {


        //In case that the user want to, remove the class 'right' from the table in order to fix the table
        if (data.Config.coursesOrder != undefined && data.Config.coursesOrder != false)
            $("td").removeClass('right');

        if (data.Config.coursesAddToCalendar == undefined || data.Config.coursesAddToCalendar)
            scheduleListPage();

        return;
    }

    //Grades page
    if (location.pathname.includes("Student/Grades.aspx")) {

        if (data.Config == null)
            data.Config = {};
        gradesButton(data);
        //customGrades();
        return;
    }

    if (!location.pathname.includes("Login.aspx") && (data.anonymous == true)) {
        chrome.runtime.sendMessage({levnetLoginAndUpdate: true});
        return;
    }

    //Fix bug in mazak (09.07.2017)
    //The error show the menubar but its not redirect the student to the main page.
    if (location.pathname.includes("Login.aspx") && $("ul[role=menubar]").length > 0) {// Check if the menubar, exist in the login page
        window.location.href = '/Student/Default.aspx';
        return;
    }
    //LOGIN PAGE
    if (data.anonymous == true)
        return;

    //Check if the user active the auto login
    if (data["mz"] != true || data.enable != true)
        return;

    //check if the username input exist (in order to prevent a bug)
    if ($("#username").length == 0) {
        if (location.pathname.includes("Login")) {
            console.log("JCT Tools-> User name field not found")

        }
        return;
    }

    //check if the password input exist (in order to prevent a bug)
    if ($("#password").length == 0) {
        if (location.pathname.includes("Login")) {
            console.log("JCT Tools-> password field not found");

        }
        return;
    }

    //This function is a little hack to replace the chrome autofill.
    $(":input").each(function () {
        if (this.name == "username")
            this.value = username;
        if (this.name == "password")
            this.value = window.atob(data["password"]);
    });

    $("#username").val(username);
    $("#password").val(window.atob(data["password"]));

    console.log("JCT Tools-> Starting levnet autologin ");
    //This 2 lines is not requiered, but they are in order to prevent a bug
    $("#username").attr("value", username);
    $("#password").attr("value", window.atob(data["password"]));

    //Submit the form - Angular functions
    location.href = "javascript:console.log('JCT Tools-> trying mazak login');"
        + "var $scope = angular.element('#username').scope();"
        + "$scope.model = {username:'" + username + "', password: '" + window.atob(data["password"]) + "'};"
        + "$scope.canLogin = function(){return true};"
        + "$scope.$apply();"
        + "$scope.tryLogin();";

    // $("#mainForm").submit();
}

/**
 * Ui Changes for the new moodle.
 */
//-----------------------------------------------------
function extractCourseInfo() {
    let courses = [];
    
    $('.coursevisible').each(function() {
      let fullName = $(this).find('.course-title h4').text().trim();
      let nameParts = fullName.split(' - ');
      
      let course = {
        name: nameParts.length > 1 ? nameParts[1] : fullName, // Use the part after the dash, or full name if no dash
        link: $(this).find('a').attr('href'),
        category: $(this).find('.coursecat a').text().trim(),
        imageUrl: $(this).find('.course-image-view').css('background-image').replace(/^url\(['"](.+)['"]\)/, '$1'),
        teachers: []
      };
      
      $(this).find('.teacherscourseview li').each(function() {
        course.teachers.push($(this).text().replace('מרצים:', '').trim());
      });
      
      courses.push(course);
    });
    
    return courses;
  }

  function extractUserName() {
    let loginInfo = $('.logininfo').text();
    let nameMatch = loginInfo.match(/את\/ה מחובר\/ת כ: (.+?) \(/);
    return nameMatch ? nameMatch[1] : 'משתמש';
}

function getGreeting(name) {
    let now = new Date();
    let hour = now.getHours();
    let month = now.getMonth(); // 0-11

    let timeGreeting;
    let emoji;

    if (hour >= 5 && hour < 12) {
        timeGreeting = 'בוקר טוב';
        emoji = '☕️';
    } else if (hour >= 12 && hour < 17) {
        timeGreeting = 'צהריים טובים';
        emoji = '🌞';
    } else if (hour >= 17 && hour < 20) {
        timeGreeting = 'כמעט ערב טוב';
        emoji = '🌅';
    } else if (hour >= 19 && hour < 22) {
        timeGreeting = 'ערב טוב';
        emoji = '🌙';
    } else {
        timeGreeting = 'לילה טוב';
        emoji = '🌠';
    }

    // Add seasonal emoji
    if (month >= 11 || month <= 1) { // Winter (December to February)
        emoji += '❄️';
    } else if (month >= 2 && month <= 4) { // Spring (March to May)
        emoji += '🌸';
    } else if (month >= 5 && month <= 7) { // Summer (June to August)
        emoji += '🏖️';
    } else { // Fall (September to November)
        emoji += '🍂';
    }

    return `${timeGreeting} ${name} ${emoji}`;
}

function injectDashboard() {
    let userName = extractUserName();
    let greeting = getGreeting(userName);

    let dashboardContainer = $('<div id="dashboard-container"></div>');
    let dashboardLabelContainer = $('<div id="dashboard-label-container"></div>');
    let homeworkContainer = $('<div id="dashboard-homework-container"></div>');
    
    dashboardLabelContainer.text(greeting);
    dashboardContainer.append(dashboardLabelContainer);
    dashboardContainer.append(homeworkContainer);

    // Insert the dashboard at the top of the body
    $('body').prepend(dashboardContainer);

    // Populate homework list
    DataAccess.Data(function(data) {
        populateHomeworkList(data, homeworkContainer);
    });
}

function populateHomeworkList(data, container) {
    let events = data.tasks || [];
    if (data.testsTasksDate) {
        events = events.concat(data.testsTasksDate);
    }
    events.sort((a, b) => new Date(a.deadLine) - new Date(b.deadLine));

    let now = new Date();
    let homeworkList = $('<ul id="dashboard-homework-list"></ul>');

    events.forEach(event => {
        if (!event || new Date(event.deadLine) < now) return;

        if (data.Config) {
            if (data.Config.hiddeUE && event.type === "userEvent") return;
            if (data.Config.hwDays && new Date(event.deadLine) > new Date(now.getTime() + data.Config.hwDays * 24 * 60 * 60 * 1000)) return;
            if (event.type === "homework" && data.Config.hiddeNoSelectedCourseInWindows && !data.moodleCoursesTable[event.courseId]) return;
        }

        let eventItem = $('<li class="dashboard-homework-item"></li>');
        
        let eventName = event.name;
        let courseName = event.type === "homework" && data.courses && data.courses[event.courseId] 
            ? data.courses[event.courseId].name 
            : (event.courseName || 'Unknown Course');
        let deadLine = getDate(new Date(event.deadLine));

        eventItem.append(`<strong>${eventName}</strong>`);
        eventItem.append(`<div class="course-name">${courseName}</div>`);
        eventItem.append(`<div class="deadline">${deadLine}</div>`);

        if (event.type === "homework") {
            eventItem.on('click', function() {
                window.open(`https://moodle.jct.ac.il/mod/assign/view.php?id=${event.id}`, '_blank');
            });
        } else if (event.type === "test") {
            eventItem.on('click', function() {
                window.open('https://levnet.jct.ac.il/Student/TestRooms.aspx', '_blank');
            });
        }

        homeworkList.append(eventItem);
    });

    container.empty().append(homeworkList);

    // Add horizontal scroll buttons if needed
    if (homeworkList[0].scrollWidth > container.width()) {
        let scrollLeftBtn = $('<button class="scroll-btn scroll-left">&lt;</button>');
        let scrollRightBtn = $('<button class="scroll-btn scroll-right">&gt;</button>');

        scrollLeftBtn.on('click', function() {
            container[0].scrollBy({ left: -200, behavior: 'smooth' });
        });

        scrollRightBtn.on('click', function() {
            container[0].scrollBy({ left: 200, behavior: 'smooth' });
        });

        container.before(scrollLeftBtn);
        container.after(scrollRightBtn);
    }
}


  function injectCategory(courseInfo) {
    // Function to sanitize category names for use in values and data attributes
    function sanitizeCategory(category) {
      return category.replace(/"/g, '');
    }
  
    // Get unique categories
    let categories = [...new Set(courseInfo.map(course => course.category))];
    
    // Create the main container
    let mainContainer = $('<div id="category-courses-container"></div>');
    
    // Create radio buttons for categories
    let radioContainer = $('<div id="category-radio-container"></div>');
    categories.forEach((category, index) => {
      let sanitizedCategory = sanitizeCategory(category);
      let radio = $(`<input type="radio" id="category-${index}" name="category" value="${sanitizedCategory}">`);
      let label = $(`<label for="category-${index}">${category}</label>`);
      radioContainer.append(radio).append(label);
    });
    mainContainer.append(radioContainer);
    
    // Create container for courses
    let coursesContainer = $('<div id="category-courses-list"></div>');
    categories.forEach(category => {
      let sanitizedCategory = sanitizeCategory(category);
      let categoryCoursesContainer = $(`<div class="category-courses" data-category="${sanitizedCategory}"></div>`);
      
      courseInfo.filter(course => course.category === category).forEach(course => {
        let courseElement = $(`
          <a href="${course.link}" class="course-item">
            <div class="course-image">
              <img src="${course.imageUrl}" alt="${course.name}">
            </div>
            <div class="course-info">
              <h3>${course.name}</h3>
              <p>Teachers: ${course.teachers.join(', ')}</p>
            </div>
          </a>
        `);
        categoryCoursesContainer.append(courseElement);
      });
      
      coursesContainer.append(categoryCoursesContainer);
    });
    mainContainer.append(coursesContainer);
    
    // Inject the container into the page
    $('body').prepend(mainContainer);
    
    // Add event listener for radio buttons
    $('input[type=radio][name=category]').change(function() {
      $('.category-courses').hide();
      $(`.category-courses[data-category="${this.value}"]`).show();
    });
    
    // Show the first category by default
    $('input[type=radio][name=category]:first').prop('checked', true).trigger('change');
  }
  
function removeCourseDescription() {
    if (window.location.href === "https://moodle.jct.ac.il/") {
        // Extract course info before removing elements
        let courseInfo = extractCourseInfo();
        console.log("Extracted course info:", courseInfo);
        
        // Store course info in local storage for later use
        localStorage.setItem('extractedCourseInfo', JSON.stringify(courseInfo));
        injectDashboard();
        injectCategory(courseInfo);
      }
    $(document).ready(function() {
        // Your existing removals
        $('div[data-for="sectioninfo"]').remove();
        $('#coursecontentcollapse1').remove();
        $('.course-content').remove();
        $('.box.py-3.d-flex.justify-content-center').remove();
        $('.page-context-header').remove();
        $('.drawer.drawer-left.drawer-primary.d-print-none').remove();
        $('.drawer.drawer-right.d-print-none').remove();
        $('.drawer.bg-white.hidden').remove();
        $('.drawers.drag-container').remove();
        $('widget-visible').remove();
        $('.ByrdhouseOverlay').remove();
        $('.toast-wrapper.mx-auto.py-0.fixed-top').remove();
        $('button.navbar-toggler.aabtn.d-block.d-md-none.px-1.my-1.border-0[data-toggler="drawers"][data-action="toggle"][data-target="theme_boost-drawers-primary"]').remove();
        $('div:has(> a.sr-only.sr-only-focusable[href="#maincontent"])').remove();
        $('.navbar-nav.d-none.d-md-flex.my-1.px-1').remove();

        // Function to remove the span
        function removeUserNotifications() {
            var userNotificationsSpan = document.body.querySelector(':scope > span#user-notifications');
            if (userNotificationsSpan) {
                userNotificationsSpan.remove();
                console.log('user-notifications span removed');
                return true;
            }
            console.log('user-notifications span not found');
            return false;
        }

        // Try to remove immediately
        removeUserNotifications();

        // Set up a mutation observer to watch for changes to the body
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    if (removeUserNotifications()) {
                        observer.disconnect(); // Stop observing once we've removed the span
                    }
                }
            });
        });

        // Configuration of the observer
        var config = { childList: true, subtree: true };

        // Start observing the body for changes
        observer.observe(document.body, config);

        // Also try to remove after a delay
        setTimeout(removeUserNotifications, 2000); // 2 second delay
    });
}

function replaceNavLinksWithIcons() {
    const iconMap = {
        'ראשי': 'fa-home',
        'עדכונים בקורסים שלי': 'fa-bell',
        'הקורסים שלי': 'fa-book',
        'המדריך': 'fa-question-circle',
        'אתרי המרכז האקדמי': 'fa-university',
        'קישורים שימושיים': 'fa-link',
        'דיווח תקלות': 'fa-exclamation-triangle',
        'אפשרויות נוספות': 'fa-chevron-down'
    };

    $('.nav-link').each(function() {
        const linkText = $(this).text().trim();
        if (iconMap[linkText]) {
            $(this).html(`<i class="fa ${iconMap[linkText]}" aria-hidden="true"></i>`);
            $(this).attr('title', linkText); // Add tooltip
            $(this).addClass('icon-only'); // Add class for potential CSS styling
        }
    });
}

function replaceLogo() {
    const logoImg = document.querySelector('img.logo[alt="לב"]');
    if (logoImg) {
        logoImg.src = chrome.runtime.getURL('image/ModernUi/Logo.svg');
        logoImg.srcset = ''; // Clear any srcset to ensure our image is always used
    }
}

function modifyPageHeader() {
    $(document).ready(function() {
        // Target the specific element
        var headerElement = $('.page-context-header .page-header-headings h1');

        if (headerElement.length) {

            // Center the text and add some styling
            headerElement.css({
                'text-align': 'center',
                'width': '100%',
                'display': 'block'
            });

            // Center the entire header div
            $('.page-context-header').css({
                'display': 'flex',
                'justify-content': 'center',
                'width': '100%'
            });
        }
    });
}

function darkModeInjector() {
    $(document).ready(function() {
        // Target the specific element
        var headerElement = $('.page-context-header .page-header-headings h1');

        if (headerElement.length) {

            // Center the text and add some styling
            headerElement.css({
                'text-align': 'center',
                'width': '100%',
                'display': 'block'
            });

            // Center the entire header div
            $('.page-context-header').css({
                'display': 'flex',
                'justify-content': 'center',
                'width': '100%'
            });
        }
    });
}

//-----------------------------------------------------

/**
 * This function will manager the grades page.
 */
function gradesButton(data) {
    console.log("JCT Tools-> gradesButton()");
    console.log("JCT Tools-> gradesButton() and customGrade are disabled for now :(");
    return;

    // $("header").append('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">');
    // $("td").removeClass('right');
    // $("th").css( "text-align", "center" );

    //First we check if the user wants this option then
    if (data.Config.customGrades != undefined && data.Config.customGrades != false) {

        if (data.Config.gradesOptions == undefined)
            data.Config.gradesOptions = {};


        // return;
        //Backup the line
        var dvGrades = $($("div[data-lev-course-legend]")[0]);
        //Check if the document is loaded
        if ($(dvGrades).find("label").length == 0)
            return setTimeout(function () {
                gradesButton(data)
            }, 300);

        //New content
        //Additional options
        $($(dvGrades).find('.text-warning')[0]).after('&nbsp;|<label><input id="couseWithoutPoints" type="checkbox" ' + ((data.Config.gradesOptions["couseWithoutPoints"] == true) ? "checked" : "") + '>&nbsp;קורס ללא נקודות זכות</label>&nbsp;|' +
            '<label><input id="couseWithoutGrade" type="checkbox" ' + ((data.Config.gradesOptions["couseWithoutGrade"] == true) ? "checked" : "") + '>&nbsp;קורס ללא ציון</label>');
        //After insert additional options, the program insert the checkbox
        var examples = $(dvGrades).find("label");
        $(examples[0]).prepend('<input id="courseNotPassed" type="checkbox" ' + ((data.Config.gradesOptions["courseNotPassed"] != false) ? "checked" : "") + '>&nbsp;');
        $(examples[1]).prepend('<input id="courseDroppedOutPurple" type="checkbox" ' + ((data.Config.gradesOptions["courseDroppedOutPurple"] == true) ? "checked" : "") + '>&nbsp;');
        $(examples[2]).prepend('<input id="courseNotConfirmed" type="checkbox" ' + ((data.Config.gradesOptions["courseNotConfirmed"] != false) ? "checked" : "") + '>&nbsp;');
        //Set the checkbox on click to run the function customGrades
        $(examples).find("input[type=checkbox]").on("click", customGrades);
        setTimeout(function () {
            setGradeTableDBClick(data)
        }, 1500);
        //Set double cell double click event
        $(".ui-paging").find("li").click(function () {
            console.log("JCT Tools ->  Table updated");
            setTimeout(function () {
                DataAccess.Data(setGradeTableDBClick);
            }, 1500);
        });
        //On page change, reset table preferences
        $("nav[data-on-page-change=pageChange]").click(function () {
            setTimeout(function () {
                customGrades();
                DataAccess.Data(setGradeTableDBClick);
            }, 1500);
        });
        //Add option to show all grades
        $($(".table-responsive").find(".ng-binding")[0]).prepend("<button id='showAllGrades' class='btn btn-default'>הראה כל הציונים</button>&nbsp;");
        $("#showAllGrades").click(function (e) {
            e.preventDefault();
            location.href = "javascript:var $scope = angular.element('.table-responsive').scope();"
                + "$scope.$$childTail.pageChange({pageSize:9999,current:1});"
            $(this).remove();
            setTimeout(function () {
                customGrades();
                setGradeTableDBClick(data);
            }, 1000);

        });
        //Run the function customGrades in order to refresh the table
        customGrades();
    }


    //In case the user wants to
    if (data.Config.showGrades != undefined && data.Config.showGrades != false) {

        //Create the last table line with the average
        var customTotal = '<tr id="customTotal" style="background-color:#004184;color:#fff;font-weight: bolder;">' +
            '<th></th>' +
            '<th> סה"כ קורסים:  </th> ' +
            '<th id="TCourses">0</td>' +
            '<th colspan="2">סכ"ה נ"ז:</th> ' +
            '<th id="TNZ">0</th> ' +
            '<th>ממוצע:</th> ' +
            '<th id="TG">-</th> ' +
            '<th colspan="2"></th>' +
            '</tr>';

        //append to the tabla
        $(".table-responsive").find("table").append(customTotal);

        //Run the function customGrades in order to set the average
        customGrades();

    }


}

function setGradeTableDBClick(data) {
    if (data.Config != null && data.Config.customAverage == true) {
        //Append instructions
        if ($("#changeGradeWarning").length == 0) {
            $($("div[data-lev-course-legend]")[0]).prepend("<div id='changeGradeWarning' class='filterBox' style='overflow:hidden;margin: 10px 0'><div  style='float:right;margin: 0;padding: 0;margin-left: 5px;'><span class='glyphicon glyphicon-info-sign'></span></div><div style='margin: 0;padding:0;'>ניתן לשנות את הציונים בתצוגה ( <b>בלבד  </b> ) לצורך חישוב הממוצע באמצעות לחיצה כפולה על הציון המבוקש</div></div>")
        }
        //This function will set the option of double click in a grade
        $(".table-responsive").find("tr").each(function () {
            $(this).dblclick(function () {

                var that = this;

                var td = $(this).find("td");

                var grade = $(td)[6];

                var min = $($(td)[5]).text().trim();

                if (isNaN(min)) min = 0;

                var gradeInput = $(grade).find(":input");

                if ($(gradeInput).length > 0) {
                    //Writing new grade
                    var value = $(gradeInput).val().trim();
                    $(grade).empty();
                    $(grade).append(value);
                    customGrades();


                    if (isNaN(value) || parseInt(value) >= parseInt(min)) {
                        if ($(this).hasClass("not-passed"))
                            $(this).removeClass("not-passed");
                    } else {
                        if (!$(this).hasClass("not-passed"))
                            $(this).addClass("not-passed");
                    }


                } else {
                    var tText = $(grade).text().trim();
                    if (isNaN(tText))
                        tText = "";
                    var inputGrade = "<input type='text' value='" + tText + "' style='width: 50px;text-align: center;font-size: 15px;height: 22px;'>";
                    $(grade).empty();
                    $(grade).append(inputGrade);
                    inputGrade = $(grade).find(":input");


                    $(inputGrade).keypress(function (e) {
                        if (e.which == 13) {
                            var gradeInput = $(grade).find(":input");
                            var value = $(gradeInput).val().trim();
                            $(grade).empty();
                            $(grade).append(value);

                            customGrades();

                            //Set new class
                            if (isNaN(value) || parseInt(value) >= parseInt(min)) {
                                if ($(that).hasClass("notPassed"))
                                    $(that).removeClass("notPassed ");
                            } else {
                                if (!isNaN(value))
                                    if (!$(that).hasClass("notPassed"))
                                        $(that).addClass("notPassed");
                            }
                        }
                    });


                }


            });
        });
    } else
        console.log("JCT Tools-> Double click option is off ");


}

/**
 * This function will:
 *    + Check with checkbox (from the first line) is checked and the reload the table
 *    + Calculate the average and the update the last line
 */
function customGrades() {


    var i = 0;
    var gradeTd = 0;
    var NZ = 0;
    var grade = 0;

    var sumNZ = 0;
    var sumGrade = 0;
    console.log("JCT Tools-> customGrades function called ");
    var customGradeDiv = $($("div[data-lev-course-legend]")[0]).find("label");


    var gradesOptions = {};
    gradesOptions["courseNotPassed"] = $(customGradeDiv).find("#courseNotPassed").is(":checked");
    gradesOptions["courseDroppedOutPurple"] = $(customGradeDiv).find("#courseDroppedOutPurple").is(":checked");
    gradesOptions["courseNotConfirmed"] = $(customGradeDiv).find("#courseNotConfirmed").is(":checked");
    gradesOptions["couseLineThrough"] = $(customGradeDiv).find("#couseLineThrough").is(":checked");
    gradesOptions["couseWithoutPoints"] = $(customGradeDiv).find("#couseWithoutPoints").is(":checked");
    gradesOptions["couseWithoutGrade"] = $(customGradeDiv).find("#couseWithoutGrade").is(":checked");
    DataAccess.setObject("Config", "gradesOptions", gradesOptions);

    //For every td in the grade table
    $(".table-responsive").find("table").find("tbody").find("tr").each(function () {


        //Check if this is not the last line (with the average)
        if ($(this).attr("id") == "customTotal")
            return;

        //Reset line background color
        /*  if ($(this).hasClass("alternateOdd"))
         $(this).removeClass("alternateOdd");

         if ($(this).hasClass("alternateEven"))
         $(this).removeClass("alternateEven");*/


        //Get all columns of this line
        gradeTd = $(this).find("td");

        //In order to prevent a bug
        if (gradeTd.length == 0) {
            return;
        }
        //Find the column where contains course gradde
        grade = $(gradeTd[6]).text().trim();

        //Find the column where contains course total points
        NZ = $(gradeTd[4]).text().trim();


        //This if will check with check box (on first line) is selected and then show/hide the line
        if (
            //For courses that the user didn't pass
            ($(this).hasClass("not-passed") && !gradesOptions["courseNotPassed"]) ||
            //For courses that are exclude
            ($(this).hasClass("dropped-out") && !gradesOptions["courseDroppedOutPurple"]) ||
            //For courses that is not confirmed
            ($(this).hasClass("not-confirmed") && !gradesOptions["courseNotConfirmed"]) ||
            //For courses that are not in the system
            ($(gradeTd[6]).hasClass("lineThrough") && !gradesOptions["couseLineThrough"]) ||
            // Check  if the total points are 0
            (NZ == 0 && !gradesOptions["couseWithoutPoints"]) ||
            //
            (isNaN(parseFloat(grade)) && !gradesOptions["couseWithoutGrade"] && (grade == "חסר" || grade == "עבר" || grade == "לא השלים"))
        ) {
            $(this).hide();

            return; //To stop and not calculate the average and i

        } else
            $(this).show();


        //Check if the grade is a number (in order to calculate the average
        if (!isNaN(parseFloat(grade)) && !isNaN(parseFloat(NZ))) {
            sumNZ += parseFloat(NZ);
            sumGrade += NZ * grade;
        }

        //With the  object 'i' it possible to check if this line is in even position and insert his class
        // (i % 2 != 0) ? $(this).addClass("alternateOdd") : $(this).addClass("alternateEven");

        i++;
    });

    //Get the average
    var average = (sumGrade / sumNZ).toFixed(3);
    //In case the table is not loaded
    if (isNaN(average)) {
        //To prevent a bug
        if (startCounter++ > 10)
            return;

        setTimeout(customGrades, 1000);
        return;
    }
    //Set total courses (by total of active lines)
    $("#TCourses").text((i - 1));
    //Set total of points
    $("#TNZ").text(sumNZ);
    //Set average
    $("#TG").text(average);


}

//Not in used
function customGradesTable() {
    var table = $("#dvGrades").find("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_grdGrades_itemPlaceholderContainer");


    if ($(table).length == 0) {
        console.log("JCT Tools-> table is empty");
        return;
    }
    var tr = $(table).find("tr");
    if ($(tr).length == 0) {
        console.log("JCT Tools-> tr is empty");
        return;
    }


    var customTr = "<table>";
    console.log("JCT Tools-> Fetching data");

    $(tr).each(function () {

        var i = 0;
        var customTd = "";
        $(this).find("td").each(function () {
            switch (i) {
                case 1:
                    customTd = "<td>" + $(this).text().trim() + "</td>";
                    break;

                case 2:
                    customTd += "<td>" + $(this).text().trim() + "</td>";
                    break;

                case 4:
                    customTd += "<td>" + $(this).text().trim() + "</td>";
                    break;
                case 6:
                    customTd += "<td>" + $(this).text().trim() + "</td>";
                    break;
            }

            i++;
        });
        customTr += "<tr>" + customTd + "</tr>";

    });
    console.log("JCT Tools ->", customTr);

    customTr += "</table>";

    return customTr;

    //allTests
}

//ScheduleList
function scheduleListPage() {
    $(".table-responsive").bind("DOMSubtreeModified", updateScheduleTable);
    updateScheduleTable();

}

function updateScheduleTable() {
    $(".table-responsive").find("tr").each(function () {
        if ($(this).find(".cal").length == 0)
            if ($(this).find("th").length == 0) {

                if ($(this).text().includes("{{")) // Angular processing variables
                    return;
                $(this).append("<td class='cal'>" + generateCourseCalendar(this) + "</td>");
            } else
                $(this).append("<th class='cal' style='min-width: 200px;'>הוספה ליומן</th>");
    })
}

function generateCourseCalendar(row) {

    var tds = $(row).find("td").map(function () {
        return $(this).text().trim();
    });
    var course = {};
    course["id"] = tds[1];
    course["name"] = tds[2];
    course["type"] = tds[3];
    course["teacher"] = tds[4];
    course["frequency"] = tds[5];
    course["details"] = tds[6];
    course["note"] = tds[7];

    //Get date
    course["room"] = course["details"].split(',')[1];
    course["time"] = course["details"].split(',')[0];
    course["date"] = getScheduleCourseFirstTime(course["time"]);
    jQuery.extend(course, getScheduleCourseDuration(course["date"], course["time"]));

    course["description"] = "מרצה: " + course["teacher"];
    if (course["note"].trim().length > 0)
        course["description"] += "<br/>" + course["note"];

    console.log("JCT Tools -> ", course);
    return $(createCalendar({
        options: {
            class: 'my-class',
            // You can pass an ID. If you don't, one will be generated for you
            id: null
        },
        data: {
            // Event title
            title: course["name"] + " - " + course["type"],  //'Get on the front page of HN',

            // Event start date
            start: course["start"], //new Date('June 15, 2013 19:00'),

            // Event duration (IN MINUTES)
            duration: course["duration"],//120,

            // You can also choose to set an end time
            // If an end time is set, this will take precedence over duration
            end: course["end"],//new Date('June 15, 2013 23:00'),

            // Event Address
            address: course["room"],//'The internet',

            // Event Description
            description: course["description"]
        }
    })).html();
}

function getScheduleCourseFirstTime(stringTime) {
    var hebrewDay = stringTime.split(':')[0].split(" ")[1].trim();
    var weekday;
    switch (hebrewDay) {
        case 'א' :
            weekday = 0;
            break;
        case 'ב' :
            weekday = 1;
            break;
        case 'ג' :
            weekday = 2;
            break;
        case 'ד' :
            weekday = 3;
            break;
        case 'ה' :
            weekday = 4;
            break;
        case 'ו' :
            weekday = 5;
            break;
        case 'ז' :
            weekday = 6;
            break;
    }
    //console.log("Hebrew date: " + hebrewDay + ", week day: " + weekday);
    var d = new Date();
    d.setDate(d.getDate() + (weekday + 7 - d.getDay()) % 7);
    return d;
}

function getScheduleCourseDuration(date, stringTime) {
    var hours = stringTime.substr(stringTime.indexOf(":") + 1).trim();
    var start = hours.split("-")[0];
    var end = hours.split("-")[1];

    var dateStart = new Date(date);
    dateStart.setHours(start.split(":")[0], start.split(":")[1], 0);

    var dateEnd = new Date(date);
    dateEnd.setHours(end.split(":")[0], end.split(":")[1], 0);


    return {start: dateStart, end: dateEnd, duration: Math.floor((Math.abs(dateEnd - dateStart) / 1000) / 60)}

}


function moodle(pass, data) {
    if (location.pathname.includes("assign")) {
        checkHW();
        return;
    }

    if (location.pathname.includes("course/view.php")) {
        if (data.Config != null && data.Config["testInCoursePage"] != false)
            addTestDate(data);

        return;
    }

    if (($("#login_username").length != 0 && $("#login_password").length != 0) && data.anonymous != true) {
        return;
    }
    console.log("JCT Tools-> Moodle hide user events: " + data.Config["MoodleHiddeUE"]);

    removeCourseDescription();
    console.log("JCT Tools-> Removed Unnecessary Ui Elements");

    //modifyPageHeader();
    console.log("JCT Tools-> Changed The Design Of the page header");

    replaceLogo();
    console.log("JCT Tools-> Replacing the logo with a modern one");

    replaceNavLinksWithIcons();
    console.log("JCT Tools-> Replacing the navbar titles to icons");

    let courseInfo = JSON.parse(localStorage.getItem('extractedCourseInfo'));
    console.log(courseInfo);

    if (undefined == data)
        data = {};

    if (data.Config == undefined)
        data.Config = {};

    hideCourses(data.moodleCoursesTable, data.Config.hiddeModdelHelp);

    var courseId;
    $(".event").each(function () {
        if ($(this).find("img").attr("alt") == "אירוע משתמש") {
            if (data.Config["MoodleHiddeUE"])
                $(this).remove();
        } else {
            if (data.Config.hiddeNoSelectedCourseInMoodle) {
                courseId = $(this).find('.course').find('a');
                if (courseId == undefined || courseId.length == 0)
                    return undefined;
                courseId = $(courseId).attr('href');
                courseId = courseId.substring(courseId.lastIndexOf("id") + 3);
                if (data.moodleCoursesTable[courseId] != true) {
                    console.log("JCT Tools->Homework with course id: " + courseId + " deleted");
                    $(this).next("hr").remove();
                    $(this).remove();
                }
            }
        }
    });

    if (data.Config["moodleTopic"])
        $(".sitetopic").remove();

    if (data.Config["eventsOnTop"] && data["mo"] && data.enable) {
        $("#inst121811").find(".block_action").remove();
        var eventsDiv = $("#inst121811");
        $("#inst121811").remove();
        $("#block-region-side-post").prepend(eventsDiv);
    }

    if (data.testsDate != undefined && data.Config.showTestDay != false) {
        var mycourses = Object.keys(data.moodleCoursesTable);
        var courseTest;
        var courseHtml;
        var li;

        for (var i = 0; i < mycourses.length; i++) {
            courseTest = data.courses[mycourses[i]];

            if (courseTest == undefined || courseTest.id == undefined)
                continue;

            console.log("JCT Tools-> Course id: " + courseTest.id);

            courseTest = data.testsDate[courseTest.id.split('.')[0]];
            if (courseTest == undefined)
                continue;

            courseHtml = getCourseSpan(courseTest);
            if (courseHtml == null)
                continue;

            li = $("[data-courseid=" + mycourses[i] + "]").find(".moreinfo");
            $(li).append(courseHtml);
            $(li).css({"text-align": "center", "color": "#0070a8", "font-weight": "bold", "margin-left": "15px"});
        }
    }

    function removeTawkContainer() {
        if ($('.tawk-min-container').length) {
            $('.tawk-min-container').remove();
            console.log("JCT Tools-> Tawk container removed");
        } else {
            setTimeout(removeTawkContainer, 500); // Check every 500ms
        }
    }

    removeTawkContainer();
}

function getCourseSpan(courseTest) {

    var testDateHtml = "";

    if (courseTest["moed1day"] == undefined || courseTest["moed1time"] == undefined) {
        return null;
    }


    var moed = stringDateToDateObject(courseTest["moed1day"], courseTest["moed1time"]);
    if (courseTest["registerToMoed3"] != true && Date.parse(moed) > Date.now()) {
        testDateHtml = "מועד א";
        testDateHtml += "<br/>";
        testDateHtml += courseTest["moed1day"] + " - " + courseTest["moed1time"];
    } else {

        if (courseTest["moed2day"] == undefined || courseTest["moed2time"] == undefined) {
            return null;
        }


        if (courseTest["registerToMoed3"] != true && courseTest["registerToMoedBet"] == true) {
            moed = stringDateToDateObject(courseTest["moed2day"], courseTest["moed2time"]);
            console.log("JCT Tools-> Moed 2: " + moed);
            if (Date.parse(moed) > Date.now()) {
                testDateHtml = "מועד ב";
                testDateHtml += "<br/>";
                testDateHtml += courseTest["moed2day"] + " - " + courseTest["moed2time"];
            }

        } else if (courseTest["registerToMoed3"] == true) {
            moed = stringDateToDateObject(courseTest["moed3day"], courseTest["moed3time"]);
            console.log("JCT Tools-> Moed 3: " + courseTest["moed3day"]);

            if (Date.parse(moed) > Date.now()) {
                testDateHtml = "מועד ג";
                testDateHtml += "<br/>";
                testDateHtml += courseTest["moed3day"] + " - " + courseTest["moed3time"];
            }
        } else
            return null;
    }
    return testDateHtml;

}

function checkHW() {
    console.log("JCT Tools->" + " Cheking homework status");

    var urlParam = location.search.replace('?', '').replace('&', '=').split('=');
    var urlCourseId = null;
    for (var i = 0; i < urlParam.length; i++) {
        if (urlParam[i] == "id") {
            urlCourseId = urlParam[i + 1];
            console.log("JCT Tools->" + " Homework id = " + urlCourseId);
            break;
        }
    }
    if (urlCourseId == null)
        return;

    if ($(".submissionstatussubmitted").length > 0 || $(".latesubmission").length > 0 || $(".earlysubmission").length > 0) {
        //setObjectInObject:function(objName,hash1, hash2, value = null,callBackFunction = null)
        DataAccess.setObjectInObject("eventDone", urlCourseId, "checked", true);
        console.log("JCT Tools->" + " Homework is done");

    }

}

function addTestDate(data) {

    console.log("JCT Tools->" + " Checking for tests");

    if (data == null)
        return;

    var urlParam = location.search.replace('?', '').replace('&', '=').split('=');
    var urlCourseId = null;
    for (var i = 0; i < urlParam.length; i++) {
        if (urlParam[i] == "id") {
            urlCourseId = urlParam[i + 1];
            console.log("JCT Tools->" + " Homework id = " + urlCourseId);
            break;
        }
    }

    var courseTest = data.courses[urlCourseId];
    if (courseTest == null) {
        console.log("JCT Tools->" + " The course isn't in the database" + urlCourseId);
        return;

    }

    var courseHtml = getCourseSpan(data.testsDate[courseTest.id.split('.')[0]]);

    if (courseHtml == null)
        return;

    var div = '<span style=" background-color: lightgoldenrodyellow;' +
        ' display: block; text-align: center; color: rgb(0, 112, 168);  font-weight: bold; ">' +
        courseHtml +
        '</span>'
    $("#user-notifications").append(div);
}

function checkAndUpdateHW(data) {
    let lastHWUpdate = data.lastHWUpdate || 0;
    if (Date.now() - lastHWUpdate > 300 * 1000) { // 5 minutes
        chrome.runtime.sendMessage({updatedata: true});
    } else {
        console.log("JCT Tools-> Hw are updated");

    }
}

//Retrieve LevNet Data

function retrieveDataFromLevNet() {
    DataAccess.Data(function (data) {
        updateTestDate(data, true)
    });
}

function updateTestDate(data, doIt) {

    //Do it only 1 time in 1
    if (data.testsDate != null && data.testsDate["Last update"] != null) {
        if (doIt != true && (data.testsDate["Last update"] + 86400000) > Date.now()) {
            console.log("JCT Tools -> Tests time are updated");
            return;
        }
    }

    getSemester().then(function (r) {
        getMazakCourses(r.selectedAcademicYear, r.selectedSemester);
    })
    getFromMazakTestData().then(function (MazakData) {
        DataAccess.setData("testsDate", MazakData);
    });

    getFromMazakTestDates().then(function (MazakData) {
        DataAccess.setData("testsTasksDate", MazakData);
    });


}

function getFromMazakTestData(mazak) {
    console.log("JCT Tools -> getFromMazakTestData()")
    return new Promise(function (resolve, reject) {
        getTestsFromApi().then(function (data) {
            var serverAllTest = data["items"];
            if (serverAllTest == null)
                return;
            var allTests = {};
            var test;
            var moed;
            var course;
            var testTime;
            for (var i = 0; i < serverAllTest.length; i++) {
                test = serverAllTest[i];
                //course id
                course = test["courseFullNumber"].split('.')[0];
                //Create object if not exist
                if (allTests[course] == null)
                    allTests[course] = {};

                //Save test id
                allTests[course]["server_id"] = test["id"];

                //moed Type
                if (test["testTimeTypeName"] == "מועד א")
                    moed = 1;
                if (test["testTimeTypeName"] == "מועד ב")
                    moed = 2;
                if (test["testTimeTypeName"] == "מועד ג")
                    moed = 3;

                //TODO: Implement this
                if (moed == 2)
                    allTests[course]["registerToMoedBet"] = true;

                //Set time
                testTime = Date.parse(test["startDate"]);
                testTime = new Date(testTime);
                allTests[course]["moed" + moed + "day"] = zeroIsRequiered(testTime.getDate()) + "/" + zeroIsRequiered((testTime.getMonth() + 1)) + "/" + zeroIsRequiered(testTime.getFullYear());
                allTests[course]["moed" + moed + "time"] = zeroIsRequiered(testTime.getHours()) + ":" + zeroIsRequiered(testTime.getMinutes());

            }
            allTests["Last update"] = Date.now();
            console.log("JCT Tools ->  Test updated", {allTests, retrieveData: data["items"]});

            resolve(allTests)
        })

    });

}

function getFromMazakTestDates() {
    console.log("JCT Tools -> getFromMazakTestData()")
    return new Promise(function (resolve, reject) {
        getTestsDatesFromApi().then(function (tests) {
            /**
             * courseId: "43389"
             deadLine: "Thu Feb 06 2020 23:55:00 GMT+0200 (hora estándar de Israel)"
             id: 393870
             name: "הגשת תרגיל מס' 8"
             type: "homework"
             */
            var tasks = []
            tests.forEach(function (test) {
                var testObj = {
                    type: "test",
                    deadLine: "" + (new Date(Date.parse(test["testDate"]))),
                    courseName: test["courseName"],
                    id: "test_" + test["id"]
                }
                if (test["roomName"] == null)
                    testObj["name"] = "מבחן";
                else
                    testObj["name"] = "מבחן - " + test["buildingName"] + " " + test["roomName"];
                /**
                 * courseName: "הנדסת תכנה"
                 studentTestTimeTypeName: "מועד א"
                 testDate: "2020-02-05T09:00:00+02:00"
                 roomName: "203"
                 buildingName: "ישראל"
                 buildingCampusName: "לב"
                 isCourseConfirmed: true
                 */
                tasks.push(testObj);
            });
            console.log("JCT Tools -> getFromMazakTestData()", {tests: tests, tasks: tasks});
            resolve(tasks);
        })
    });
}

function getTestsFromApi() {
    //Mazak inputs
    const promise = new Promise(function (resolve, reject) {
        var request = $.ajax({
            url: "/api/student/Tests.ashx?action=LoadTests",
            type: "POST",
            data: JSON.stringify({
                action: 'LoadFilters'
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function (response) {
                console.log("JCT Tools -> getTest(): request successfully completed", response);

                resolve(response);
            },
            error: function (response) {
                console.log("JCT Tools -> getTest(): error", response);
            }
        });
    });

    return promise;
}


function getTestsDatesFromApi() {


    //Mazak inputs
    const promise = new Promise(function (resolve, reject) {
        var request = $.ajax({
            url: "/api/student/TestReg.ashx?action=LoadFutureTestsForStudent",
            type: "POST",
            data: JSON.stringify({
                action: 'LoadFutureTestsForStudent'
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function (response) {
                console.log("JCT Tools -> getTestsDatesFromApi(): request successfully completed");

                resolve(response["tests"]);
            },
            error: function (response) {
                console.log("JCT Tools ->  getTest(): error", response);
            }
        });
    });

    return promise;
}


function getSemester() {
    const promise = new Promise(function (resolve, reject) {
        var request = $.ajax({
            url: "/api/student/schedule.ashx?action=LoadFilters",
            type: "POST",
            data: JSON.stringify({
                action: 'LoadFilters'
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function (response) {
                console.log("JCT Tools -> getSemester(): request successfully completed");
                DataAccess.setData("semesterData", response);
                resolve(response);
            },
            error: function (response) {
                console.log("JCT Tools -> getSemester(): error", response);
            }
        });
    });

    return promise;
}

function getMazakCourses(year, semester) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: "/api/student/schedule.ashx?action=LoadScheduleList&AcademicYearID=" + year + "&SemesterID=" + semester,
            type: "POST",
            data: JSON.stringify({
                action: 'LoadScheduleList',
                selectedAcademicYear: year,
                selectedSemester: semester
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function (response) {
                console.log("JCT Tools -> getMazakCourses(): request successfully completed");
                var courses = {};
                courses["byname"] = {};
                courses["bynumber"] = {};
                var temp;
                var item;
                try {
                    for (var i = 0; response["groupsWithMeetings"] != null && i < response["groupsWithMeetings"].length; i++) {
                        item = response["groupsWithMeetings"][i];
                        item["meeting"] = true;

                        courses["byname"][item["courseName"]] = item;
                        temp = item["groupFullNumber"];
                        temp = temp.split('.');
                        courses["bynumber"][temp[0]] = item;
                    }
                } catch (e) {
                }

                try {
                    for (var j = 0; response["groupsWithoutMeetings"] != null && j < response["groupsWithoutMeetings"].length; j++) {
                        item = response["groupsWithoutMeetings"][j];
                        item["meeting"] = true;

                        courses["byname"][item["courseName"]] = item;
                        temp = item["groupFullNumber"];
                        temp = temp.split('.');
                        courses["bynumber"][temp[0]] = item;
                    }
                } catch (e) {
                }

                DataAccess.setData("mazakCourses", courses);
                resolve(response);
            },
            error: function (response) {
                console.log("JCT Tools -> getMazakCourses(): error", response);
            }
        });
    });
}
