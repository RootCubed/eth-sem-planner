import type { Application } from "./app";
import type { Course } from "./courseInfo";

export class CoursePickerView {
    private parentApp: Application;
    private coursePicker = document.getElementById("course-picker-course-list") as HTMLElement;
    private addCourseButton = document.getElementById("course-overview-add-course") as HTMLElement;
    private courseSearch = document.getElementById("overlay-course-picker-search") as HTMLElement;
    private courseSearchList = document.getElementById("course-picker-search-list") as HTMLElement;

    constructor(parentApp: Application) {
        this.parentApp = parentApp;

        this.addCourseButton.addEventListener("click", () => this.showAddCourseModal());

        this.courseSearch.addEventListener("click", ev => {
            if (ev.target == this.courseSearch) {
                this.courseSearch.classList.add("hidden");
            }
        });
    }

    renderCoursePicker() {
        let html = "";
        const selectedCourses: Set<Course> = new Set();
        for (const period of this.parentApp.timetable.selectedPeriods) {
            selectedCourses.add(period.parentCourse);
        }
        for (const course of selectedCourses) {
            html += course.overviewHTML(true, false);
        }
        this.coursePicker.innerHTML = html;
    }

    showAddCourseModal() {
        this.courseSearch.classList.remove("hidden");
        let html = "";
        for (const [, course] of this.parentApp.timetable.courses) {
            html += course.overviewHTML(false, true);
        }
        this.courseSearchList.innerHTML = html;
    }
}
