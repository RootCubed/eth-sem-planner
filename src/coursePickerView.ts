import { Course } from "./courseInfo";

export class CoursePickerView {
    public courses: Map<string, Course> = new Map();
    private coursePicker = document.getElementById("panel-course-picker") as HTMLElement;

    renderCoursePicker() {
        let html = "";
        for (const [, course] of this.courses) {
            html += course.overviewHTML();
        }
        this.coursePicker.innerHTML = html;
    }
}
