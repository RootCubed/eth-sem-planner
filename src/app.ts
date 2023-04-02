import { TimetableView } from "./timetableView";
import { CoursePickerView } from "./coursePickerView";
import { CourseSearchView } from "./courseSearchView";
import { Course, CoursePeriod, CoursePeriodTime } from "./courseInfo";
import type { CourseData, CoursePeriodType } from "./courseInfo";

export class Application {
    public courses: Map<string, Course> = new Map();

    public timetable: TimetableView;
    public coursePickerView: CoursePickerView;
    public courseSearchView: CourseSearchView;

    constructor() {
        this.timetable = new TimetableView(this);
        const coursePickerEl = document.getElementById("course-picker-course-list");
        const courseSearchEl = document.getElementById("overlay-course-picker-search");
        this.coursePickerView = new CoursePickerView(this, coursePickerEl as HTMLElement);
        this.courseSearchView = new CourseSearchView(this, courseSearchEl as HTMLElement);
    }

    parseCourses(resourceObject: CourseData) {
        this.courses.clear();
        for (const courseID in resourceObject) {
            const courseName = resourceObject[courseID].name;
            const courseCredits = resourceObject[courseID].ectsCredits;
            const courseVvzLink = resourceObject[courseID].vvzLink;
            const courseAssignmentOptions = resourceObject[courseID].assignmentOptions;

            const courseHours: Map<CoursePeriodType, CoursePeriod[]> = new Map();
            const courseHoursReq: Map<CoursePeriodType, number> = new Map();

            const course = new Course(
                courseID, courseName, courseCredits, courseVvzLink,
                courseAssignmentOptions, courseHours, courseHoursReq
            );

            for (const _hourType in resourceObject[courseID].hours) {
                const hourType = _hourType as CoursePeriodType;

                const el = resourceObject[courseID].hours[hourType];
                courseHoursReq.set(hourType, el.hourCount);

                const periods: CoursePeriod[] = el.hours.map(h => {
                    const time = CoursePeriodTime.fromPeriodTimeString(h.time);
                    return new CoursePeriod(hourType, h.room, time, course);
                });
                courseHours.set(hourType, periods);
            }

            this.courses.set(courseID, course);
        }
    }

    addCourse(courseID: string) {
        const courseObject = this.courses.get(courseID);
        if (!courseObject) return;
        for (const [type, periods] of courseObject.periods) {
            if (type == "U") {
                this.timetable.selectedPeriods.add(periods[0]);
            } else {
                const addedTimes = new Set();
                for (const p of periods) {
                    if (addedTimes.has(p.time.timeString)) continue;
                    this.timetable.selectedPeriods.add(p);
                    addedTimes.add(p.time.timeString);
                }
            }
        }
        this.render();
    }

    render() {
        this.timetable.renderTimetable();
        this.coursePickerView.renderCoursePicker();
        this.courseSearchView.renderSearchView();
    }
}

const app = new Application();

fetch("/resources/FS23").then(res => res.json()).then((courseData: CourseData) => {
    app.parseCourses(courseData);

    // Hardcoded for now
    const initialCourseSelection = [
        "Tuesday-10/2.HG E 7", "Thursday-10/2.HG E 7", "Wednesday-10/2.HG E 33.5",
        "Wednesday-8/2.ML D 28", "Tuesday-14/2.CHN D 44",
        "Thursday-14/2.HG E 7", "Friday-14/2.HG E 7", "Wednesday-16/3.HG D 7.2",
        "Monday-14/2.HG E 7", "Friday-10/2.HG F 1", "Tuesday-16/2.ML H 44",
        "Wednesday-14/2.ML D 28", "Friday-8/2.ML D 28", "Friday-14/2.CHN C 14",
    ];

    const courseSelection: Set<CoursePeriod> = new Set();
    for (const [, course] of app.courses) {
        for (const [, hours] of course.periods) {
            for (const period of hours) {
                if (initialCourseSelection.indexOf(period.uniqueID) > -1) {
                    courseSelection.add(period);
                }
            }
        }
    }

    app.timetable.selectedPeriods = courseSelection;
    app.render();
});

const editCourseBtn = document.getElementById("timetable-edit-courses");
if (editCourseBtn) {
    editCourseBtn.addEventListener("click", () => {
        document.getElementById("timetable")?.classList.toggle("backside");
        document.getElementById("course-picker-cont")?.classList.toggle("backside");
        if (editCourseBtn.innerText == "Add/remove courses") {
            editCourseBtn.innerText = "Back to timetable";
        } else {
            editCourseBtn.innerText = "Add/remove courses";
        }
    });
}
