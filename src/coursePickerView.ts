import type { Application } from "./app";
import type { Course } from "./courseInfo";

export class CoursePickerView {
    private parentApp: Application;
    private coursePicker = document.getElementById("course-picker-course-list") as HTMLElement;

    constructor(parentApp: Application) {
        this.parentApp = parentApp;
    }

    renderCoursePicker() {
        let html = "";
        const selectedCourses: Set<Course> = new Set();
        for (const period of this.parentApp.timetable.selectedPeriods) {
            selectedCourses.add(period.parentCourse);
        }
        for (const course of selectedCourses) {
            html += course.overviewHTML();
        }
        this.coursePicker.innerHTML = html;
    }
}
