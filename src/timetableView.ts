import { Application } from "./app";
import {
    DAYS, HOURS, NUM_DAYS, FIRST_HOUR, LAST_HOUR,
    CoursePeriodTime, CoursePeriod
} from "./courseInfo";

interface HTMLOutputConfig {
    periodHTML: (period: CoursePeriod) => string,
    periodClass: string,
    skipEmpty: boolean
}

class TimetablePeriodGroup {
    private periods: CoursePeriod[] = [];
    private position: CoursePeriodTime;

    constructor(day: number, begin: number) {
        this.position = new CoursePeriodTime(day, begin, begin);
    }

    isEmpty() {
        return this.periods.length == 0;
    }

    setPositionForEmpty(periodTime: CoursePeriodTime) {
        this.position = periodTime;
    }

    get day() {
        return this.position.day;
    }

    get begin() {
        return this.position.begin;
    }

    set end(end: number) {
        this.position.end = end;
    }

    get end() {
        return this.position.end;
    }

    get duration() {
        return this.position.duration;
    }

    addPeriod(period: CoursePeriod) {
        this.periods.push(period);
        this.position.begin = Math.min(...this.periods.map(p => p.time.begin));
        this.position.end = Math.max(...this.periods.map(p => p.time.end));
    }

    private _html(config: HTMLOutputConfig) {
        const occupied: Set<string> = new Set();
        const periodPositions: [number, number][] = [];

        for (const period of this.periods) {
            const row = period.time.begin - this.begin;

            let col = 0;
            while (occupied.has(row + "," + col)) col++;

            for (let x = 0; x < period.time.duration; x++) {
                occupied.add(row + x + "," + col);
            }

            periodPositions.push([row, col]);
        }

        let html = "";
        let numCols = 1;

        for (let i = 0; i < this.periods.length; i++) {
            const period = this.periods[i];
            const pPos = periodPositions[i];

            numCols = Math.max(numCols, pPos[1] + 1);

            const innerHTML = config.periodHTML(period);

            const style = `grid-column: ${pPos[1] + 1}; grid-row: ${pPos[0] + 1} / ${pPos[0] + period.time.duration + 1}`;
            html += `<div class="${config.periodClass} ${period.type}" style="${style}" data-id="${period.uniqueID}">${innerHTML}</div>`;
        }

        if (!config.skipEmpty) {
            for (let c = 0; c < numCols; c++) {
                for (let r = 0; r < this.duration; r++) {
                    const startRow = r;
                    while (r < this.duration && !occupied.has(r + "," + c)) {
                        r++;
                    }
                    if (startRow == r) continue;
                    const style = `grid-column: ${c + 1} / ${c + 1}; grid-row: ${startRow + 1} / ${r + 1}`;
                    html += `<div class="timetable-entry entry-empty" style="${style}"></div>`;
                }
            }
        }

        const style = `grid-column: ${this.day + 1} / ${this.day + 1}; grid-row: ${this.begin - 8 + 1} / ${this.end - 8 + 1}`;
        const cls = numCols > 3 ? "narrow" : "";
        return `<div class="timetable-entry-group ${cls}" style="${style}">${html}</div>`;
    }

    html() {
        return this._html({
            periodHTML: period => `
            <span class="entry-title">${period.parentCourse.courseName}</span>
            <span class="entry-room">${period.room}</span>
            `,
            periodClass: "timetable-entry",
            skipEmpty: false
        });
    }

    hintHtml() {
        return this._html({
            periodHTML: period => `
            <span class="entry-room">${period.room}</span>
            `,
            periodClass: "timetable-entry timetable-drag-hint",
            skipEmpty: true
        });
    }

    static buildGroups(periods: Set<CoursePeriod>) {
        const groups: TimetablePeriodGroup[] = [];

        for (let day = 0; day < NUM_DAYS; day++) {
            const periodsOnDay = [...periods]
                .filter(p => p.time.day == day)
                .sort((a, b) => a.time.begin - b.time.begin);

            let currGroup = new TimetablePeriodGroup(day, FIRST_HOUR);
            for (const period of periodsOnDay) {
                if (period.time.begin >= currGroup.end) {
                    // Commit the group and an empty filler if needed
                    if (currGroup.duration > 0) {
                        groups.push(currGroup);
                    }
                    if (period.time.begin >= currGroup.end) {
                        const fillerGroup = new TimetablePeriodGroup(day, currGroup.end);
                        fillerGroup.end = period.time.begin;
                        groups.push(fillerGroup);
                    }
                    currGroup = new TimetablePeriodGroup(day, period.time.begin);
                }
                currGroup.addPeriod(period);
            }
            if (currGroup.duration > 0) {
                groups.push(currGroup);
            }
            if (currGroup.end < LAST_HOUR) {
                const finalGroup = new TimetablePeriodGroup(day, currGroup.end);
                finalGroup.end = LAST_HOUR + 1;
                groups.push(finalGroup);
            }
        }

        return groups;
    }
}

export class TimetableView {
    private parentApp: Application;
    public selectedPeriods: Set<CoursePeriod> = new Set();
    public dragHints: Set<CoursePeriod> = new Set();

    private timetableElement = document.getElementById("timetable") as HTMLElement;

    constructor(parentApp: Application) {
        this.parentApp = parentApp;
        const dh = new DragHandler(this);
        dh.init();
    }

    private getTimetableHeaderHTML() {
        const els: string[] = [];

        for (let i = 0; i < DAYS.length; i++) {
            const style = `grid-column: ${i + 2}; grid-row: 1`;
            els.push(`<span class="timetable-date" style="${style}">${DAYS[i]}</span>`);
        }
        for (let i = 0; i < HOURS.length; i++) {
            const style = `grid-column: 1; grid-row: ${i + 2}`;
            els.push(`<span class="timetable-time" style="${style}">${HOURS[i]}</span>`);
        }

        return els.join("");
    }

    private getTimetableHTML() {
        const periodGroups = TimetablePeriodGroup.buildGroups(this.selectedPeriods);

        let html = "";
        for (const group of periodGroups) {
            html += group.html();
        }

        const dragHintGroups = TimetablePeriodGroup.buildGroups(this.dragHints);
        for (const group of dragHintGroups) {
            if (group.isEmpty()) continue;
            const tmpHTML = group.hintHtml();
            html += tmpHTML;
        }

        return html;
    }

    renderTimetable() {
        this.timetableElement.innerHTML = `
            ${this.getTimetableHeaderHTML()}
            <div id="timetable-data">${this.getTimetableHTML()}</div>
        `;
    }

    get courses() {
        return this.parentApp.courses;
    }
}

class DragHandler {
    parentView: TimetableView;
    grabbedPeriod: {
        period: CoursePeriod,
        width: number,
        height: number
    } | null = null;

    dummyDragEl = document.getElementById("dummy-drag-el") as HTMLElement;

    constructor(parentApp: TimetableView) {
        this.parentView = parentApp;
    }

    init() {
        document.addEventListener("mousedown", (ev => this.dragStart(ev)));
        document.addEventListener("touchstart", (ev => this.dragStart(ev)));
        document.addEventListener("dragstart", (ev => this.dragStart(ev)));

        document.addEventListener("mousemove", (ev => this.dragUpdate(ev)));

        document.addEventListener("mouseup", (ev => this.dragEnd(ev)));
    }

    static getPos(ev: MouseEvent | TouchEvent) {
        if (ev instanceof MouseEvent) {
            return { x: ev.clientX, y: ev.clientY };
        } else {
            const targetTouches = [...ev.changedTouches].filter(e => e.target == ev.target);
            if (targetTouches.length != 1) {
                console.error("Getting strange touch events", ev);
            } else {
                return { x: targetTouches[0].clientX, y: targetTouches[0].clientY };
            }
        }
        return { x: 0, y: 0 };
    }

    dragStart(ev: MouseEvent | TouchEvent) {
        if (!(ev.target instanceof Element)) return;

        const closest = ev.target.closest(".timetable-entry") as HTMLElement | null;
        const closestID = closest?.dataset.id;
        if (closest && closest.classList.contains("U") && closestID) {
            ev.preventDefault();
            const periodObj = [...this.parentView.selectedPeriods].find(p => p.uniqueID == closestID);
            if (!periodObj) return;

            this.grabbedPeriod = {
                period: periodObj,
                width: closest.clientWidth,
                height: closest.clientHeight
            };
            this.parentView.selectedPeriods.delete(periodObj);

            const pos = DragHandler.getPos(ev);
            this.dummyDragEl.innerHTML = closest.outerHTML;
            this.dummyDragEl.style.display = "";
            this.dummyDragEl.style.position = "absolute";
            this.dummyDragEl.style.width = this.grabbedPeriod.width + "px";
            this.dummyDragEl.style.height = this.grabbedPeriod.height + "px";
            this.dummyDragEl.style.left = (pos.x - this.grabbedPeriod.width / 2) + "px";
            this.dummyDragEl.style.top = (pos.y - this.grabbedPeriod.height / 2) + "px";

            const courseForGrabbedPeriod = this.parentView.courses.get(periodObj.parentCourse.courseID);
            const courseExercisePeriods = courseForGrabbedPeriod?.periods.get(periodObj.type);
            const dragHints: Set<CoursePeriod> = new Set(courseExercisePeriods);
            this.parentView.dragHints = dragHints;

            this.parentView.renderTimetable();

            document.body.style.cursor = "grabbing";

            // These must be added after any DOM change, or else touch event get lost
            // TODO: Remove these after drag has ended
            ev.target.addEventListener("touchmove", (ev => this.dragUpdate(ev as TouchEvent)));
            ev.target.addEventListener("touchend", (ev => this.dragEnd(ev as TouchEvent)));
            ev.target.addEventListener("touchcancel", (ev => this.dragEnd(ev as TouchEvent)));
        }
    }

    dragUpdate(ev: MouseEvent | TouchEvent) {
        if (this.grabbedPeriod) {
            ev.preventDefault();
            const pos = DragHandler.getPos(ev);
            this.dummyDragEl.style.left = (pos.x - this.grabbedPeriod.width / 2) + "px";
            this.dummyDragEl.style.top = (pos.y - this.grabbedPeriod.height / 2) + "px";

            // TODO: detect nearest element and highlight it
        }
    }

    dragEnd(ev: MouseEvent | TouchEvent) {
        if (this.grabbedPeriod) {
            this.dummyDragEl.style.display = "none";
            document.body.style.cursor = "";

            const pos = DragHandler.getPos(ev);

            const els = document.elementsFromPoint(pos.x, pos.y).filter(e => e.classList.contains("timetable-drag-hint")) as [HTMLElement];
            if (els.length > 0) {
                const closest = els[0].closest(".timetable-entry") as HTMLElement | null;
                const closestID = closest?.dataset.id;
                const periodObj = [...this.parentView.dragHints].find(p => p.uniqueID == closestID);
                if (periodObj != undefined) {
                    this.parentView.selectedPeriods.add(periodObj);
                } else {
                    this.parentView.selectedPeriods.add(this.grabbedPeriod.period);
                }
            } else {
                this.parentView.selectedPeriods.add(this.grabbedPeriod.period);
            }

            this.parentView.dragHints.clear();
            this.grabbedPeriod = null;

            this.parentView.renderTimetable();
        }
    }
}
