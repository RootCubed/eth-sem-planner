import type { Application } from "./app";
import type { Course } from "./courseInfo";

export class CoursePickerView {
    private parentApp: Application;
    private coursePicker: HTMLElement;

    constructor(parentApp: Application, containerEl: HTMLElement) {
        this.parentApp = parentApp;
        this.coursePicker = containerEl;

        const addCourseButton = document.getElementById("course-overview-add-course") as HTMLElement;

        addCourseButton.addEventListener("click", () => {
            parentApp.courseSearchView.show();
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

        for (const _courseOverview of this.coursePicker.getElementsByClassName("course-overview")) {
            const courseOverview = _courseOverview as HTMLElement;
            courseOverview.getElementsByClassName("course-overview-remove")[0].addEventListener("click", () => {
                const courseID = courseOverview.dataset.id;
                if (!courseID) return;
                this.parentApp.removeCourse(courseID);
            });
        }
    }
}
