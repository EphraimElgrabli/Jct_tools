//======================================================
//	JCT - Moodle++ | Hide Courses
//------------------------------------------------------
//	Original Author: Yossef Itzchak Kuszer
//	E-Mail: yossefkuszer@gmail.com
//	Date:   17/07/2016
//======================================================

function hideCourses(data, hiddeModdelHelp) {

    console.log("JCT Tools-> hideCourses");

    //check if this web page is the main page
    if ($("#frontpage-course-list").length == 0)
        return;

    if ($(".hide_button").length > 0)
        console.log("jct moodle ++");

    let coursesList = Object.keys(data);

    addButtons(hiddeModdelHelp);

    //check if open the page "current" or "all courses"
    // if the user does not have any course that he wants to hide,
    // the page, "all courses" will be open, else the page "current"

    //if there is no hide course, the page with the option to chose to hide/unhide will be open
    if (coursesList.length == 0)
        openAllCourses();
    else
        openMyCourses(coursesList);

    //when the button is click , open the page "all courses"
    $("#allCourses").click(function () {
        openAllCourses();
    });

    //when the button is click , open the page "current courses"
    $("#currentCourses").click(function () {
        openMyCourses(coursesList);
    });

};


//add the two buttons in the page, that will let to transist between the page with all selected courses, and the page with the option to hide/unhide courses
function addButtons(hiddeModdelHelp) {


    var buttons = '<div><button id="currentCourses" class="btn btn-outline-primary" style="width:49%;height:50px" disabled>קורסים שלי</button>' +
        '<button id="allCourses" class="btn btn-outline-primary" style="width:49%;height:50px" >כל הקורסים</button></div>';
    //remove the title "My Courses" and add a custom one
    $("#frontpage-course-list").children("h2").hide();
    $("#frontpage-course-list").prepend(buttons);


    //Check if moodle jct++ is installed
    if ($(".hide_button").length > 0) {
        $(".hide_button").remove();
        $(".unhide_button").remove();
        $("#show_current").remove();
        $("#show_all").remove();
        var confict = "<div style='background:red;color: white; text-align: center;font-size: 20px;font-weight: bolder;'><p>אזהרה: Jct moodle++ מותקן.<br/>תוסף זה יכול להוביל לקונפליקט ולכן חלק השבתנו.<p>";
        $("#frontpage-course-list").prepend(confict);

    }

    if (hiddeModdelHelp)
        return;
    //var text = "<div style='text-align: center;'><h4>ניתן להגדיר הקורסים שלי <a href='chrome-extension://" + chrome.runtime.id + "/options.html' target='_blank'> בהגדרות</a></h4></div>";
    //$("#frontpage-course-list").prepend(text);

}


//open the page with all the couses, and show the hide/unhide button
function openAllCourses() {

    //block and unblock the button, so the only button the user can chose is the button to change the page
    $("#frontpage-course-list").find("#currentCourses").removeAttr("disabled");
    $("#frontpage-course-list").find("#allCourses").attr("disabled", true);
    $("#category-course-list").find(".row > div").show(); //show all courses
}

//open the page only with the courses the user chose to show
function openMyCourses(coursesList) {

    let courses = $("#category-course-list")
    //block and unblock the button, so the only button the user can chose is the button to change the page
    $("#frontpage-course-list").find("#allCourses").removeAttr("disabled");
    $("#frontpage-course-list").find("#currentCourses").attr("disabled", true);

    let coursesRows = $(courses).find(".row > div");
    //For some reason, this has to bee in a for loop (and not using jquery each)
    for (let i = 0; i < coursesRows.length; i++) {
        let course = coursesRows[i];
        let courseId = getCourseId(course);
        if (courseId == null || !coursesList.includes(courseId)) {
            $(course).hide();
        } else {
            $(course).show();
        }
    }
}


function getCourseId(html) {
    let courseLink = $(html).find('a.coursestyle2url');

    if (courseLink.length === 0)
        return null;

    // Find the course id
    let url = courseLink.attr('href');
    return getUrlParam('id', url);
}

function getUrlParam(name, url) {
    if (!url) url = location.href;
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    return results == null ? null : results[1];
}
