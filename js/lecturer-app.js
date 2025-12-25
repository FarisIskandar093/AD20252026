// Lecturer Dashboard Application Logic

const lecturerApp = Vue.createApp({
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
            
            // My Classes
            myClasses: [],
            loadingClasses: false,
            
            // Student List Modal
            showStudentModal: false,
            selectedClass: null,
            classStudents: [],
            
            // Search (UC4)
            filteredCourses: [],
            filterTerm: '',
            loadingSearch: false,
            
            // Notifications (UC7)
            notifications: [],
            loadingNotifications: false,
            unreadNotifications: 0
        }
    },
    
    computed: {
        // Add any computed properties
    },
    
    watch: {
        currentView(newView) {
            if (newView === 'my_schedule') {
                this.fetchMySchedule();
            } else if (newView === 'my_classes') {
                this.fetchMyClasses();
            } else if (newView === 'notifications') {
                this.fetchNotifications();
            }
        }
    },
    
    methods: {
        // UC2: Fetch lecturer's teaching schedule
        async fetchMySchedule() {
            this.loadingSchedule = true;
            const session = getSession();
            
            if (!session || !session.login_name) {
                alert("Session expired. Please log in again.");
                return;
            }
            
            try {
                // Fetch courses taught by this lecturer
                const url = `${API_BASE_URL}?entity=subjek_pensyarah&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
                const res = await fetch(url);
                const allAssignments = await res.json();
                
                // Filter for this lecturer
                const myAssignments = allAssignments.filter(a => 
                    a.no_pekerja === session.login_name || 
                    a.id_staf === session.login_name
                );
                
                // Build schedule list
                this.myScheduleList = myAssignments.map(assignment => ({
                    id: `${assignment.kod_subjek}-${assignment.seksyen}`,
                    kod_subjek: assignment.kod_subjek,
                    nama_subjek: assignment.nama_subjek || 'N/A',
                    seksyen: assignment.seksyen,
                    hari: 'TBA',
                    masa_mula: 'TBA',
                    masa_tamat: 'TBA',
                    bilik: 'TBA',
                    bil_pelajar: assignment.bil_pelajar || 0
                }));
                
            } catch (err) {
                console.error("Error fetching schedule:", err);
                this.myScheduleList = [];
            } finally {
                this.loadingSchedule = false;
            }
        },
        
        // Fetch lecturer's classes
        async fetchMyClasses() {
            this.loadingClasses = true;
            const session = getSession();
            
            try {
                const url = `${API_BASE_URL}?entity=subjek_pensyarah&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
                const res = await fetch(url);
                const allAssignments = await res.json();
                
                const myAssignments = allAssignments.filter(a => 
                    a.no_pekerja === session.login_name || 
                    a.id_staf === session.login_name
                );
                
                this.myClasses = myAssignments;
                
            } catch (err) {
                console.error("Error fetching classes:", err);
                this.myClasses = [];
            } finally {
                this.loadingClasses = false;
            }
        },
        
        // View student list for a class
        async viewStudentList(classItem) {
            this.selectedClass = classItem;
            this.showStudentModal = true;
            
            const session = getSession();
            const url = `${API_BASE_URL}?entity=subjek_pelajar&session_id=${session.session_id}&sesi=${this.currentSesi}&semester=${this.currentSemester}&kod_subjek=${classItem.kod_subjek}&seksyen=${classItem.seksyen}`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                this.classStudents = Array.isArray(data) ? data : [];
            } catch (err) {
                console.error("Error fetching students:", err);
                this.classStudents = [];
            }
        },
        
        viewClassSchedule(classItem) {
            alert(`Schedule for ${classItem.kod_subjek} Section ${classItem.seksyen}\n\nSchedule details would be displayed here.`);
        },
        
        viewClassDetails(schedule) {
            alert(`Class Details:\n${schedule.kod_subjek} - ${schedule.nama_subjek}\nSection: ${schedule.seksyen}\nTime: ${schedule.masa_mula} - ${schedule.masa_tamat}`);
        },
        
        // UC4: Search courses
        async searchCourses() {
            this.loadingSearch = true;
            
            const url = `${API_BASE_URL}?entity=subjek&sesi=${this.searchSesi}&semester=${this.searchSemester}`;
            
            try {
                const res = await fetch(url);
                const courses = await res.json();
                
                if (this.filterTerm) {
                    const term = this.filterTerm.toLowerCase();
                    this.filteredCourses = courses.filter(course => 
                        (course.kod_subjek && course.kod_subjek.toLowerCase().includes(term)) ||
                        (course.nama_subjek && course.nama_subjek.toLowerCase().includes(term))
                    );
                } else {
                    this.filteredCourses = courses;
                }
            } catch (err) {
                console.error("Error searching courses:", err);
                this.filteredCourses = [];
            } finally {
                this.loadingSearch = false;
            }
        },
        
        viewCourseDetails(course) {
            alert(`Course Details:\n${course.kod_subjek}\n${course.nama_subjek}\nSections: ${course.bil_seksyen}`);
        },
        
        // UC7: Fetch notifications
        async fetchNotifications() {
            this.loadingNotifications = true;
            
            // Simulated notifications - replace with actual API call
            setTimeout(() => {
                this.notifications = [
                    {
                        id: 1,
                        title: "Room Change",
                        message: "SCSJ1013 Section 1 room changed to FC-B1",
                        date: "2025-12-24",
                        read: false
                    },
                    {
                        id: 2,
                        title: "Student Enrollment Update",
                        message: "3 new students enrolled in SCSI1113 Section 2",
                        date: "2025-12-23",
                        read: false
                    }
                ];
                
                this.unreadNotifications = this.notifications.filter(n => !n.read).length;
                this.loadingNotifications = false;
            }, 500);
        },
        
        markAsRead(notification) {
            notification.read = true;
            this.unreadNotifications = this.notifications.filter(n => !n.read).length;
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
        this.fetchNotifications();
    }
});

lecturerApp.mount('#main-app');