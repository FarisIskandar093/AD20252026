// Student Dashboard Application Logic

const studentApp = Vue.createApp({
    data() {
        return {
            currentView: 'my_schedule',
            
            // User info
            userName: '',
            userMatric: '',
            
            // Session/Semester
            currentSesi: '2025/2026',
            currentSemester: '1',
            searchSesi: '2025/2026',
            searchSemester: '1',
            
            // My Schedule (UC2)
            myScheduleList: [],
            loadingSchedule: false,
            
            // My Courses
            studentCourseList: [],
            loadingStudentCourses: false,
            
            // Search (UC4)
            filteredCourses: [],
            filterTerm: '',
            loadingSearch: false
        }
    },
    
    computed: {
        // Add any computed properties here
    },
    
    watch: {
        currentView(newView) {
            if (newView === 'my_schedule') {
                this.fetchMySchedule();
            } else if (newView === 'my_courses') {
                this.fetchStudentCourses();
            }
        }
    },
    
    methods: {
        // UC2: Fetch personalized schedule
        async fetchMySchedule() {
            this.loadingSchedule = true;
            const session = getSession();
            
            if (!session || !session.login_name) {
                alert("Session expired. Please log in again.");
                window.location.replace("login.html");
                return;
            }
            
            try {
                // Fetch student's registered courses
                const coursesUrl = `${API_BASE_URL}?entity=pelajar_subjek&no_matrik=${session.login_name}`;
                const coursesRes = await fetch(coursesUrl);
                const courses = await coursesRes.json();
                
                if (courses && courses.length > 0) {
                    // For each course, fetch the schedule details
                    const schedulePromises = courses.map(async (course) => {
                        // This would need to fetch actual schedule times from the timetable entity
                        // For now, we'll return the course info
                        return {
                            id: `${course.kod_subjek}-${course.seksyen}`,
                            kod_subjek: course.kod_subjek,
                            nama_subjek: course.nama_subjek,
                            seksyen: course.seksyen,
                            hari: 'TBA', // Would come from timetable entity
                            masa_mula: 'TBA',
                            masa_tamat: 'TBA',
                            bilik: 'TBA',
                            nama_pensyarah: 'TBA'
                        };
                    });
                    
                    this.myScheduleList = await Promise.all(schedulePromises);
                } else {
                    this.myScheduleList = [];
                }
            } catch (err) {
                console.error("Error fetching schedule:", err);
                alert("Failed to load schedule.");
            } finally {
                this.loadingSchedule = false;
            }
        },
        
        // Fetch student's registered courses
        async fetchStudentCourses() {
            this.loadingStudentCourses = true;
            const session = getSession();
            
            if (!session || !session.login_name) {
                alert("Session expired. Please log in again.");
                return;
            }
            
            const url = `${API_BASE_URL}?entity=pelajar_subjek&no_matrik=${session.login_name}&session_id=${session.session_id}`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                
                if (data && data.length > 0) {
                    this.studentCourseList = data;
                } else {
                    this.studentCourseList = [];
                }
            } catch (err) {
                console.error("Error fetching courses:", err);
                alert("Failed to load registered courses.");
            } finally {
                this.loadingStudentCourses = false;
            }
        },
        
        // UC4: Search courses
        async searchCourses() {
            this.loadingSearch = true;
            
            const url = `${API_BASE_URL}?entity=subjek&sesi=${this.searchSesi}&semester=${this.searchSemester}`;
            
            try {
                const res = await fetch(url);
                const courses = await res.json();
                
                if (courses && courses.length > 0) {
                    // Apply filter
                    if (this.filterTerm) {
                        const term = this.filterTerm.toLowerCase();
                        this.filteredCourses = courses.filter(course => 
                            (course.kod_subjek && course.kod_subjek.toLowerCase().includes(term)) ||
                            (course.nama_subjek && course.nama_subjek.toLowerCase().includes(term))
                        );
                    } else {
                        this.filteredCourses = courses;
                    }
                } else {
                    this.filteredCourses = [];
                }
            } catch (err) {
                console.error("Error searching courses:", err);
                alert("Failed to search courses.");
            } finally {
                this.loadingSearch = false;
            }
        },
        
        viewCourseDetails(course) {
            alert(`Course Details:\n${course.kod_subjek}\n${course.nama_subjek}\nSections: ${course.bil_seksyen}`);
        },
        
        logout() {
            if (confirm("Logout?")) {
                localStorage.removeItem("TTMSFC_userSession");
                window.location.replace("login.html");
            }
        }
    },
    
    mounted() {
        const session = getSession();
        if (!session) {
            window.location.replace("login.html");
            return;
        }
        
        this.userName = session.full_name || session.login_name;
        this.userMatric = session.login_name;
        
        // Load initial data
        this.fetchMySchedule();
    }
});

studentApp.mount('#main-app');