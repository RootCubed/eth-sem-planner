import { TimetableView } from "./timetableView";
import { CoursePickerView } from "./coursePickerView";
import { Course, CoursePeriod, CoursePeriodTime } from "./courseInfo";
import type { CourseData, CoursePeriodType } from "./courseInfo";

class Application {
    public courses: Map<string, Course> = new Map();

    public timetable: TimetableView = new TimetableView();
    public coursePickerView: CoursePickerView = new CoursePickerView();
    
    parseCourses(resourceObject: CourseData) {
        this.courses.clear();
        for (const courseID in resourceObject) {
            const courseName = resourceObject[courseID].name;
            const courseHours: Map<CoursePeriodType, CoursePeriod[]> = new Map();
            const courseHoursReq: Map<CoursePeriodType, number> = new Map();
            const course = new Course(courseID, courseName, courseHours, courseHoursReq);
            this.courses.set(courseID, course);
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
        }
        this.timetable.courses = this.courses;
        this.coursePickerView.courses = this.courses;
    }

    render() {
        this.timetable.renderTimetable();
        this.coursePickerView.renderCoursePicker();
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
                if (initialCourseSelection.includes(period.uniqueID)) {
                    courseSelection.add(period);
                }
            }
        }
    }

    app.timetable.selectedPeriods = courseSelection;
    app.render();
});
