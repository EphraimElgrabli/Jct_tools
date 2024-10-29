let username;
let startCounter = 0;

$(document).ready(function () {
    DataAccess.Data(onStart);
});

function onStart(data) {
    username = data["username"];
    console.log("JCT Tools -> injection started");

    // Decrypting the password (if needed)
    let password = data["password"] ? window.atob(data["password"]) : "";

    // Get theme choice and apply theme
    getThemeChoice(function (themeChoice) {
        applyTheme(themeChoice);
    });

    // Listen for theme updates
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.action === 'updateTheme') {
                applyTheme(request.themeChoice);
            }
        });
    }

    // Check current host
    switch (location.host) {
        case "moodle.jct.ac.il":
            moodle(password, data);
            checkAndUpdateHW(data);
            break;
    }
}

/**
 * Retrieves the theme choice from storage
 * @param {function} callback - The callback function to execute with the theme choice
 */
function getThemeChoice(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['themeChoice'], function (data) {
            let themeChoice = data.themeChoice || 'light';
            callback(themeChoice);
        });
    } else {
        let themeChoice = localStorage.getItem('themeChoice') || 'light';
        callback(themeChoice);
    }
}

/**
 * Applies the selected theme to the page
 * @param {string} themeChoice - The selected theme ('light', 'dark', 'auto')
 */
function applyTheme(themeChoice) {
    if (themeChoice === 'auto') {
        const hour = new Date().getHours();
        themeChoice = (hour >= 7 && hour < 19) ? 'light' : 'dark';
    }

    if (themeChoice === 'dark') {
        document.documentElement.classList.add('dark-mode');
        replaceLogo('dark');
    } else {
        document.documentElement.classList.remove('dark-mode');
        replaceLogo('light');
    }
}

/**
 * Replaces the logo based on the theme
 * @param {string} theme - The current theme ('light' or 'dark')
 */
function replaceLogo(theme) {
    const logoImg = document.querySelector('img.logo[alt="לב"]');
    if (logoImg) {
        if (theme === 'dark') {
            logoImg.src = chrome.runtime.getURL('/assets/ModernUi/darkLogo.svg');
        } else {
            logoImg.src = chrome.runtime.getURL('assets/ModernUi/Logo.svg');
        }
        logoImg.srcset = ''; // Clear any srcset to ensure our image is always used
    }
}


if (document.head) {
    observer.observe(document.head, { childList: true, subtree: true });
} else {
    console.error("document.head is not available.");
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
    } else if (hour >= 12 && hour < 15) {
        timeGreeting = 'צהריים טובים';
        emoji = '🌞';
    } else if (hour >= 15 && hour < 17) {
        timeGreeting = 'כמעט ערב טוב';
        emoji = '🌅';
    } else if (hour >= 17 && hour < 22) {
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
  

  function retrieveDataFromLevNet() {
    // Send a message to the background script to fetch LevNet data
    chrome.runtime.sendMessage({ action: 'fetchLevNetData' }, function(response) {
        if (chrome.runtime.lastError) {
            console.error("Failed to retrieve LevNet data:", chrome.runtime.lastError.message);
            return;
        }
        if (response && response.success) {
            // Use the schedule data to inject into the page
            injectWeeklySchedule(response.scheduleData.meetings);
        } else {
            console.error("Failed to retrieve LevNet data:", response.error);
        }
    });
}


// Function to inject the weekly schedule into the page
function injectWeeklySchedule(meetings) {
    // Clear any existing schedule
    $('#weekly-schedule-container').remove();

    // Create the main container
    let scheduleContainer = $('<div id="weekly-schedule-container"></div>');
    let scheduleLabel = $('<h3>לו"ז שבועי📆</h3>'); // "Weekly Schedule" in Hebrew

    // Add a table for the weekly schedule
    let scheduleTable = $('<table id="weekly-schedule"></table>');
    
    // Create table headers for days of the week (Hebrew)
    let daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
    let tableHeader = '<tr><th>שעה</th>';
    daysOfWeek.forEach(day => {
        tableHeader += `<th>${day}</th>`;
    });
    tableHeader += '</tr>';
    scheduleTable.append(tableHeader);

    // Define time slots (from 8:00 to 20:30)
    let timeSlots = [];
    for (let hour = 8; hour <= 20; hour++) {
        // 8:00 to 8:30
        timeSlots.push({
            display: `${hour}:00`,
            startMinutes: hour * 60,
            endMinutes: hour * 60 + 30
        });
        // 8:30 to 9:00
        if (hour < 20) { // Prevents adding 20:30 slot if 20:00 is the last time
            timeSlots.push({
                display: `${hour}:30`,
                startMinutes: hour * 60 + 30,
                endMinutes: (hour + 1) * 60
            });
        }
    }

    // Create rows for each time slot
    timeSlots.forEach(slot => {
        let row = `<tr><td>${slot.display}</td>`;
        for (let day = 0; day < 6; day++) {
            // Adjust cell IDs to avoid special characters
            let cellId = `cell-day${day}-time${slot.display.replace(':', '_')}`;
            row += `<td id="${cellId}" class="schedule-cell"></td>`;
        }
        row += '</tr>';
        scheduleTable.append(row);
    });

    // Append everything to the container
    scheduleContainer.append(scheduleLabel);
    scheduleContainer.append(scheduleTable);

    // Inject the schedule after the category container or wherever appropriate
    $('#category-courses-container').after(scheduleContainer);

    // Now populate the table with the meetings
    meetings.forEach(meeting => {
        let dayIndex = meeting.dayId - 1; // Adjust day index to match table columns (0-based)
        let startTime = meeting.startTime; // "HH:MM:SS"
        let endTime = meeting.endTime;     // "HH:MM:SS"

        // Convert start and end times to minutes since midnight
        let startParts = startTime.split(':');
        let endParts = endTime.split(':');
        let startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
        let endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

        // For each time slot, check if it overlaps with the meeting
        timeSlots.forEach(slot => {
            if (slot.startMinutes < endMinutes && slot.endMinutes > startMinutes) {
                // The time slot overlaps with the meeting
                let cellId = `cell-day${dayIndex}-time${slot.display.replace(':', '_')}`;
                let cell = document.getElementById(cellId);

                if (cell) {
                    // Check if cell is already populated
                    if (cell.innerHTML) {
                        // If so, append the meeting info
                        cell.innerHTML += `
                            <div class="meeting-info">
                                <strong>${meeting.compactView[0]}</strong><br>
                                ${meeting.startTime.substring(0,5)} - ${meeting.endTime.substring(0,5)}<br>
                                ${meeting.fullView[3]} <!-- Room or additional info -->
                            </div>
                        `;
                    } else {
                        // Otherwise, set the meeting info
                        cell.innerHTML = `
                            <div class="meeting-info">
                                <strong>${meeting.compactView[0]}</strong><br>
                                ${meeting.startTime.substring(0,5)} - ${meeting.endTime.substring(0,5)}<br>
                                ${meeting.fullView[3]} <!-- Room or additional info -->
                            </div>
                        `;
                    }
                    cell.classList.add('scheduled');
                } else {
                    console.warn(`Cell not found: ${cellId}`);
                }
            }
        });
    });
}



// Helper function to parse time from HH:MM:SS to {hour, minute}
function parseTime(timeStr) {
    let [hour, minute] = timeStr.split(':');
    return { hour: parseInt(hour), minute: parseInt(minute) };
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
        retrieveDataFromLevNet();
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


//-----------------------------------------------------

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

function checkAndUpdateHW(data) {
    let lastHWUpdate = data.lastHWUpdate || 0;
    if (Date.now() - lastHWUpdate > 300 * 1000) { // 5 minutes
        chrome.runtime.sendMessage({updatedata: true});
    } else {
        console.log("JCT Tools-> Hw are updated");

    }
}

