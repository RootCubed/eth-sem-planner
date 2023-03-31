export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const NUM_DAYS = DAYS.length;
export const FIRST_HOUR = HOURS[0];
export const LAST_HOUR = HOURS[HOURS.length - 1];

export type CoursePeriodType = "V" | "G" | "U" | "S" | "K" | "P" | "A" | "D" | "R";

export class CoursePeriodTime {
    day: number;
    begin: number;
    end: number;

    constructor(day: number, begin: number, end: number) {
        this.day = day;
        this.begin = begin;
        this.end = end;
    }

    equals(timeString: string) {
        const obj = CoursePeriodTime.fromPeriodTimeString(timeString);
        return this.day == obj.day && this.begin == obj.begin && this.end == obj.end;
    }

    static fromPeriodTimeString(periodTimeString: string) {
        const day = DAYS.indexOf(periodTimeString.split("-")[0]);
        const beginHour = parseInt(periodTimeString.split("-")[1]);
        const periodLength = parseInt(periodTimeString.split("/")[1]);
        return new CoursePeriodTime(day, beginHour, beginHour + periodLength);
    }

    get normalFormat() {
        return `${DAYS[this.day]} ${this.begin}:15-${this.end}:00`;
    }

    get timeString() {
        return `${DAYS[this.day]}-${this.begin}/${this.duration}`;
    }

    get duration() {
        return this.end - this.begin;
    }
}

export class CoursePeriod {
    type: CoursePeriodType;
    room: string;
    time: CoursePeriodTime;
    parentCourse: Course;

    constructor(type: CoursePeriodType, room: string, time: CoursePeriodTime, parentCourse: Course) {
        this.type = type;
        this.room = room;
        this.time = time;
        this.parentCourse = parentCourse;
    }

    get uniqueID() {
        return this.time.timeString + "." + this.room;
    }
}

export class Course {
    courseID: string;
    courseName: string;
    ectsCredits: number;
    assignmentOptions: string[];
    periods: Map<CoursePeriodType, CoursePeriod[]>;
    hoursForPeriodType: Map<CoursePeriodType, number>;

    constructor(
        courseID: string, courseName: string, ectsCredits: number,
        assignmentOptions: string[],
        periods: Map<CoursePeriodType, CoursePeriod[]>,
        hoursForPeriodType: Map<CoursePeriodType, number>) {
        this.courseID = courseID;
        this.courseName = courseName;
        this.ectsCredits = ectsCredits;
        this.assignmentOptions = assignmentOptions;
        this.periods = periods;
        this.hoursForPeriodType = hoursForPeriodType;
    }

    overviewHTML() {
        let hourCountHTML = "";
        for (const [type, ] of this.periods) {
            hourCountHTML += `<span class="${type}">${this.hoursForPeriodType.get(type) + type}</span>`;
        }
        return `<div class="course-overview" data-id="${this.courseID}">
            <div class="course-overview-content">
                <span class="course-overview-header">${this.courseName}</span>
                <span class="course-overview-etcs">${this.ectsCredits} ECTS</span>
                <div class="course-overview-hour-count">${hourCountHTML}</div>
            </div>
            <div class="course-overview-btns">
                <button class="course-overview-remove">remove</button>
            </div>
        </div>`;
    }
}

// Format for JSON course database retrieved from server
export interface CourseData {
    [key: string]: {
        name: string,
        ectsCredits: number,
        assignmentOptions: string[]
        hours: {
            [key in CoursePeriodType]: {
                hourCount: number, hours: {
                    room: string,
                    time: string
                }[]
            }
        }
    }
}
