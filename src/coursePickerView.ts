import type { Application } from "./app";
import type { Course } from "./courseInfo";

export class CoursePickerView {
    private parentApp: Application;
    private coursePicker: HTMLElement;

    constructor(parentApp: Application, containerEl: HTMLElement) {
        this.parentApp = parentApp;
        this.coursePicker = containerEl;

        const addCourseButton = document.getElementById("course-overview-add-course") as HTMLElement;
        const courseSearch = document.getElementById("overlay-course-picker-search") as HTMLElement;

        addCourseButton.addEventListener("click", () => courseSearch.classList.remove("hidden"));

        courseSearch.addEventListener("click", ev => {
            if (ev.target == courseSearch) {
                courseSearch.classList.add("hidden");
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
}
