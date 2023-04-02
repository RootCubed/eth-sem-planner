import type { Application } from "./app";

export class CourseSearchView {
    private parentApp: Application;
    private searchEl: HTMLElement;
    private listEl: HTMLElement;

    constructor(parentApp: Application, containerEl: HTMLElement) {
        this.parentApp = parentApp;
        const searchEl = containerEl.querySelector("input");
        const listEl = containerEl.querySelector(".course-picker-search-list");

        this.searchEl = searchEl as HTMLElement;
        this.listEl = listEl as HTMLElement;
    }

    renderSearchView() {
        let html = "";
        for (const [, course] of this.parentApp.timetable.courses) {
            html += course.overviewHTML(false, true);
        }
        this.listEl.innerHTML = html;

        for (const _courseOverview of this.listEl.getElementsByClassName("course-overview")) {
            const courseOverview = _courseOverview as HTMLElement;
            courseOverview.getElementsByClassName("course-overview-add")[0].addEventListener("click", () => {
                const courseID = courseOverview.dataset.id;
                if (!courseID) return;

                this.parentApp.addCourse(courseID);
            });
        }
    }
}
