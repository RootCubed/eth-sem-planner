import type { Application } from "./app";

export class CourseSearchView {
    private parentApp: Application;
    private searchView: HTMLElement;
    private searchEl: HTMLInputElement;
    private listEl: HTMLElement;
    private masterButtonEl: HTMLElement;
    private showMsc: boolean;

    constructor(parentApp: Application, containerEl: HTMLElement) {
        this.parentApp = parentApp;
        this.searchView = containerEl;
        this.showMsc = false;

        const searchEl = containerEl.querySelector("input");
        const listEl = containerEl.querySelector(".course-picker-search-list");
        const masterEl = containerEl.querySelector(".course-picker-search-button");

        this.searchEl = searchEl as HTMLInputElement;
        this.listEl = listEl as HTMLElement;
        this.masterButtonEl = masterEl as HTMLElement;

        this.searchEl.addEventListener("input", () => this.renderSearchView());

        containerEl.addEventListener("click", ev => {
            if (ev.target == containerEl) {
                this.hide();
            }
            this.renderSearchView();
        });
    }

    renderSearchView() {
        let html = "";

        const searchQuery = this.searchEl.value.toLowerCase();
        const filteredCourses = [...this.parentApp.timetable.courses.values()].filter(course => {
            if (this.parentApp.hasCourse(course.courseID)) return false;
            if ((!this.showMsc && course.degree === "MSC") || (this.showMsc && course.degree === "BSC")) return false;
            return course.courseName.toLowerCase().includes(searchQuery);
        });

        this.masterButtonEl.innerHTML = this.showMsc ? "Show BSC courses": "Show MSC courses";
        this.masterButtonEl.onclick = () => this.showMsc = !this.showMsc;

        for (const course of filteredCourses) {
            html += course.overviewHTML(false, true);
        }
        this.listEl.innerHTML = html;

        for (const _courseOverview of this.listEl.getElementsByClassName("course-overview")) {
            const courseOverview = _courseOverview as HTMLElement;
            courseOverview.getElementsByClassName("course-overview-add")[0].addEventListener("click", () => {
                const courseID = courseOverview.dataset.id;
                if (!courseID) return;

                this.searchEl.value = "";
                this.searchEl.focus();
                this.parentApp.addCourse(courseID);
            });
        }
    }

    show() {
        this.searchView.classList.remove("hidden");
        this.searchEl.focus();
    }

    hide() {
        this.searchView.classList.add("hidden");
    }
}
