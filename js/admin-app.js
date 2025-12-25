// Admin Dashboard Application Logic

const adminApp = Vue.createApp({
    data() {
        return {
            currentView: 'analytics',
            
            // User info
            userName: '',
            
            // Session/Semester
            currentSesi: '2025/2026',
            currentSemester: '1',
            
            // Analytics (UC3)
            totalStudents: 0,
            totalCourses: 0,
            totalLecturers: 0,
            
            // Courses (UC4)
            courseList: [],
            filteredCourses: [],
            filterTerm: '',
            loadingCourses: false,
            
            // Sessions (UC5)
            sessions: [],
            loadingSessions: false,
            
            // Students
            students: [],
            loadingStudents: false,
            studentLimit: 50,
            studentOffset: 0,
            
            // Lecturers
            lecturers: [],
            filteredLecturers: [],
            lecturerSearch: '',
            loadingLecturers: false,
            
            // Modals
            showSectionsModal: false,
            selectedCourse: null,
            courseSections: []
        }
    },
    
    computed: {
        // Filter courses based on search term
        courseListFiltered() {
            if (!this.filterTerm) return this.courseList;
            
            const term = this.filterTerm.toLowerCase();
            return this.courseList.filter(course => 
                (course.kod_subjek && course.kod_subjek.toLowerCase().includes(term)) ||
                (course.nama_subjek && course.nama_subjek.toLowerCase().includes(term))
            );
        }
    },
    
    watch: {
        currentView(newView) {
            if (newView === 'analytics') {
                this.loadAnalytics();
            } else if (newView === 'visualizations') {
                this.loadVisualizations();
            } else if (newView === 'courses' && this.courseList.length === 0) {
                this.fetchCourses();
            } else if (newView === 'sessions' && this.sessions.length === 0) {
                this.fetchSessions();
            } else if (newView === 'students' && this.students.length === 0) {
                this.fetchStudents();
            } else if (newView === 'lecturers' && this.lecturers.length === 0) {
                this.fetchLecturers();
            }
        },
        
        filterTerm() {
            this.filteredCourses = this.courseListFiltered;
        },
        
        lecturerSearch() {
            if (!this.lecturerSearch) {
                this.filteredLecturers = this.lecturers;
            } else {
                const term = this.lecturerSearch.toLowerCase();
                this.filteredLecturers = this.lecturers.filter(l => 
                    l.nama && l.nama.toLowerCase().includes(term)
                );
            }
        }
    },
    
    methods: {
        // UC3: Load analytics data
        async loadAnalytics() {
            try {
                // Fetch analytics data
                const studentsUrl = `${API_BASE_URL}?entity=pelajar&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
                const coursesUrl = `${API_BASE_URL}?entity=subjek&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
                
                const [studentsRes, coursesRes] = await Promise.all([
                    fetch(studentsUrl),
                    fetch(coursesUrl)
                ]);
                
                const students = await studentsRes.json();
                const courses = await coursesRes.json();
                
                this.totalStudents = Array.isArray(students) ? students.length : 0;
                this.totalCourses = Array.isArray(courses) ? courses.length : 0;
                this.totalLecturers = 45; // Placeholder
                
                // Draw charts
                this.drawVenueChart();
                this.drawCourseChart();
                
            } catch (err) {
                console.error("Error loading analytics:", err);
            }
        },
        
        // Draw venue utilization chart
        drawVenueChart() {
            google.charts.load('current', {'packages':['corechart']});
            google.charts.setOnLoadCallback(() => {
                const data = google.visualization.arrayToDataTable([
                    ['Status', 'Hours'],
                    ['Scheduled', 75],
                    ['Available', 25]
                ]);
                
                const options = {
                    title: 'Venue Utilization',
                    is3D: true,
                    colors: ['#38761d', '#93c47d'],
                    pieHole: 0.4
                };
                
                const chart = new google.visualization.PieChart(document.getElementById('venue_chart'));
                chart.draw(data, options);
            });
        },
        
        // Draw course distribution chart
        drawCourseChart() {
            google.charts.load('current', {'packages':['corechart']});
            google.charts.setOnLoadCallback(() => {
                const data = google.visualization.arrayToDataTable([
                    ['Department', 'Courses'],
                    ['Computer Science', 35],
                    ['Information Systems', 28],
                    ['Software Engineering', 22],
                    ['Computer Networks', 18]
                ]);
                
                const options = {
                    title: 'Courses by Department',
                    colors: ['#1a73e8', '#34a853', '#fbbc04', '#ea4335']
                };
                
                const chart = new google.visualization.BarChart(document.getElementById('course_chart'));
                chart.draw(data, options);
            });
        },
        
        // UC6: Load visualizations
        loadVisualizations() {
            setTimeout(() => {
                this.drawWorkloadChart();
            }, 100);
        },
        
        drawWorkloadChart() {
            google.charts.load('current', {'packages':['corechart']});
            google.charts.setOnLoadCallback(() => {
                const data = google.visualization.arrayToDataTable([
                    ['Lecturer', 'Contact Hours'],
                    ['Dr. Ahmad', 12],
                    ['Dr. Siti', 15],
                    ['Dr. Kumar', 10],
                    ['Dr. Lee', 14],
                    ['Dr. Wong', 11]
                ]);
                
                const options = {
                    title: 'Lecturer Workload (Contact Hours)',
                    hAxis: { title: 'Contact Hours' },
                    vAxis: { title: 'Lecturer' },
                    colors: ['#1a73e8']
                };
                
                const chart = new google.visualization.ColumnChart(document.getElementById('workload_chart'));
                chart.draw(data, options);
            });
        },
        
        // UC4: Fetch courses
        async fetchCourses() {
            this.loadingCourses = true;
            
            const url = `${API_BASE_URL}?entity=subjek&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                
                if (data && data.length > 0) {
                    this.courseList = data;
                    this.filteredCourses = data;
                } else {
                    this.courseList = [];
                    this.filteredCourses = [];
                }
            } catch (err) {
                console.error("Error fetching courses:", err);
                this.courseList = [];
            } finally {
                this.loadingCourses = false;
            }
        },
        
        // View course sections
        async viewCourseSections(course) {
            this.selectedCourse = course;
            this.showSectionsModal = true;
            
            const url = `${API_BASE_URL}?entity=subjek_seksyen&kod_subjek=${course.kod_subjek}&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    const courseData = data.find(item => item.kod_subjek === course.kod_subjek);
                    if (courseData && courseData.seksyen_list) {
                        this.courseSections = courseData.seksyen_list;
                    }
                }
            } catch (err) {
                console.error("Error fetching sections:", err);
                this.courseSections = [];
            }
        },
        
        viewSectionStudents(section) {
            alert(`Viewing students for Section ${section.seksyen}`);
        },
        
        // UC5: Fetch sessions
        async fetchSessions() {
            this.loadingSessions = true;
            
            const url = `${API_BASE_URL}?entity=sesisemester`;
            
            try {
                const res = await fetch(url);
                this.sessions = await res.json();
            } catch (err) {
                console.error("Error fetching sessions:", err);
                this.sessions = [];
            } finally {
                this.loadingSessions = false;
            }
        },
        
        viewSessionCourses(session) {
            this.currentSesi = session.sesi;
            this.currentSemester = session.semester;
            this.currentView = 'courses';
            this.fetchCourses();
        },
        
        // Fetch students
        async fetchStudents(direction = null) {
            this.loadingStudents = true;
            
            const session = getSession();
            if (!session || !session.session_id) {
                alert("Authentication required.");
                this.loadingStudents = false;
                return;
            }
            
            if (direction === 'prev') {
                this.studentOffset = Math.max(0, this.studentOffset - this.studentLimit);
            } else if (direction === 'next') {
                if (this.students.length === this.studentLimit) {
                    this.studentOffset += this.studentLimit;
                }
            } else {
                this.studentOffset = 0;
            }
            
            const url = `${API_BASE_URL}?entity=pelajar&session_id=${session.session_id}&sesi=${this.currentSesi}&semester=${this.currentSemester}&limit=${this.studentLimit}&offset=${this.studentOffset}`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                this.students = Array.isArray(data) ? data : [];
            } catch (err) {
                console.error("Error fetching students:", err);
                this.students = [];
            } finally {
                this.loadingStudents = false;
            }
        },
        
        hasNextPage() {
            return this.students.length === this.studentLimit;
        },
        
        hasPreviousPage() {
            return this.studentOffset > 0;
        },
        
        // Fetch lecturers
        async fetchLecturers() {
            this.loadingLecturers = true;
            
            try {
                const coursesUrl = `${API_BASE_URL}?entity=subjek&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
                const coursesRes = await fetch(coursesUrl);
                const courses = await coursesRes.json();
                
                const lecturerMap = new Map();
                
                for (const course of courses.slice(0, 10)) { // Limit for performance
                    const url = `${API_BASE_URL}?entity=subjek_pensyarah&kod_subjek=${course.kod_subjek}&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
                    
                    try {
                        const res = await fetch(url);
                        const data = await res.json();
                        
                        if (data && data.length > 0) {
                            data.forEach(item => {
                                const name = item.nama || item.name;
                                if (name && name !== "-") {
                                    if (!lecturerMap.has(name)) {
                                        lecturerMap.set(name, {
                                            nama: name,
                                            id_staf: item.no_pekerja || item.id_staf || "N/A",
                                            subjek: course.kod_subjek,
                                            jabatan: item.jabatan || "FAKULTI SAINS KOMPUTER"
                                        });
                                    } else {
                                        lecturerMap.get(name).subjek += `, ${course.kod_subjek}`;
                                    }
                                }
                            });
                        }
                    } catch (err) {
                        console.error(`Error fetching lecturer for ${course.kod_subjek}:`, err);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                this.lecturers = Array.from(lecturerMap.values());
                this.filteredLecturers = this.lecturers;
                
            } catch (err) {
                console.error("Error fetching lecturers:", err);
                this.lecturers = [];
            } finally {
                this.loadingLecturers = false;
            }
        },
        
        viewLecturerDetails(lecturer) {
            alert(`Lecturer Details:\n${lecturer.nama}\nStaff ID: ${lecturer.id_staf}\nDepartment: ${lecturer.jabatan}\nCourses: ${lecturer.subjek}`);
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
        
        // Load analytics on mount
        this.loadAnalytics();
    }
});

adminApp.mount('#main-app');