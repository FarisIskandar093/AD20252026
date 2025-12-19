// This file assumes global libraries (Vue, Google Charts) and utils.js are loaded before it.

const mainApp = Vue.createApp({
    data() {
        return {
            currentView: 'dashboard',
            isSideNavOpen: false, // Core state for responsive sync
            navLinks: [
                { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
                { id: 'timetable_filter', label: 'Courses', icon: 'fas fa-search' },
                { id: 'master_data', label: 'Sessions', icon: 'fas fa-database' },
                { id: 'profile', label: 'Profile', icon: 'fas fa-graduation-cap' },
                { id: 'student_list', label: 'Students', icon: 'fas fa-users' }
            ], 
            sessemList: [],
            courseList: [],
            filterTerm: '', 
            loadingSession: false,
            loadingTimetable: false,

            // DEFAULT to 2025/2026-1 for initial load
            currentSesi: '2025/2026',
            currentSemester: '1',

            selectedCourse: null,
            sectionList: [],
            loadingSections: false,
            
            // STATE for lecturers and loading
            lecturerList: [], 
            loadingLecturers: false, 
            lecturerSearch: '',
            lecturerSesi: '2025/2026',  // Add for session filter
            lecturerSemester: '1',       // Add for semester filter

              // FILTERS
            filterCourse: '',
            filterDepartment: '',
            
            // NEW STATE: For Section Student Modal
            selectedSection: null, // Holds the section object when a section is clicked
            sectionStudentList: [], // Holds the list of students for the selected section
            loadingSectionStudents: false,
            isStudentModalOpen: false, // Controls the visibility of the modal

            // State for student courses (personal)
            studentCourseList: [],
            loadingStudentCourses: false,

            // NEW STATE: For the 'pelajar' entity (General Student List)
            studentList: [],
            loadingStudentList: false,
            // Pagination controls for the 'pelajar' entity
            studentListLimit: 50,
            studentListOffset: 0,
        }
    },
    computed: {
        userName() {
            // Uses the global getSession() function from utils.js
            const session = getSession();
            return session ? session.full_name || session.login_name : 'Guest';
        },
        userRole() {
            const session = getSession();
            // Assuming role is stored under 'description' or defaults to 'Admin'
            return session ? session.description || 'Admin' : 'Unknown';
        },
        userMatric() {
            const session = getSession();
            // Assuming matric/staff ID is stored under 'login_name'
            return session ? session.login_name : 'N/A';
        },
        lecturerListFiltered() {
            const term = this.lecturerSearch.toLowerCase();
            if (!term) return this.lecturerList;
            return this.lecturerList.filter(l => 
            l.nama && l.nama.toLowerCase().includes(term)
         );
},
        currentViewDisplay() {
            switch (this.currentView) {
                case 'dashboard': return 'Dashboard (Analytics)';
                case 'timetable_filter': return 'Courses Lookup';
                case 'master_data': return 'Sessions';
                case 'section_list': return 'Course Sections Detail'; 
                case 'profile': return 'My Profile'; 
                case 'student_list': return 'Student List (Admin)';
                default: return 'Loading...';
            }
        },

        filteredLecturers() {
        return this.lecturerList.filter(l => {
            const courseMatch =
                !this.filterCourse ||
                l.courses.includes(this.filterCourse);

            const deptMatch =
                !this.filterDepartment ||
                l.jabatan === this.filterDepartment;

            return courseMatch && deptMatch;
        });
    },
        // Client-side filtering logic for the Timetable View
        courseListFiltered() {
            if (!this.loadingTimetable && !this.filterTerm) {
                return this.courseList;
            }
            const term = this.filterTerm.toLowerCase();
            return this.courseList.filter(course => 
                (course.kod_subjek && course.kod_subjek.toLowerCase().includes(term)) ||
                (course.nama_subjek && course.nama_subjek.toLowerCase().includes(term))
            );
        },
        
        // Combine section data with lecturer data and ensure NUMERICAL sorting
        sectionListWithLecturers() {
            // Wait until both data sources have finished loading
            if (this.loadingSections || this.loadingLecturers) return [];
            
            // Map lecturers to their section number for easy lookup
            const lecturerMap = this.sectionLecturerList.reduce((acc, entry) => {
                const sectionKey = entry.seksyen ? entry.seksyen.toString() : '0'; 
                if (!acc[sectionKey]) {
                    acc[sectionKey] = [];
                }
                // Use 'nama' key as confirmed by API debug
                if (entry.nama) {
                    acc[sectionKey].push(entry.nama); 
                }
                return acc;
            }, {});

            

            // Merge section data with lecturer names
            const mergedList = this.sectionList.map(section => {
                const sectionKey = section.seksyen ? section.seksyen.toString() : '0';
                const lecturers = lecturerMap[sectionKey] || ['Unassigned'];
                
                return {
                    ...section,
                    // Join multiple lecturers with comma for single cell display
                    lecturerNames: lecturers.join(', ') 
                };
            });
            
            // Apply numerical sorting based on the 'seksyen' property
            return mergedList.sort((a, b) => {
                // Safely parse 'seksyen' to integer for numerical comparison
                const secA = parseInt(a.seksyen, 10);
                const secB = parseInt(b.seksyen, 10);
                
                // Handle non-numeric or missing values gracefully
                if (isNaN(secA) && isNaN(secB)) return 0;
                if (isNaN(secA)) return 1; 
                if (isNaN(secB)) return -1; 
                
                return secA - secB;
            });
        }
    },
    watch: {
        currentView(newView, oldView) {
            // Data fetching logic
            if (newView === 'master_data' && this.sessemList.length === 0) {
                this.fetchSessionData();
            } else if (newView === 'dashboard') {
                this.drawInitialChart();
            } 
            
            // Initial Course Load
            else if (newView === 'timetable_filter' && this.courseList.length === 0) {
                this.fetchCourseData();
            }
            
            // Student Course Load (Personal)
            else if (newView === 'profile' && this.studentCourseList.length === 0) {
                this.fetchStudentCourses();
            }
            
            // NEW: Student List Load (Admin)
            else if (newView === 'student_list' && this.studentList.length === 0) {
                this.fetchStudentList();
            }

            else if (newView === 'lecturer_list' && this.lecturerList.length === 0) {
                this.fetchLecturerData();
            }
            
            // Cleanup logic
            if (oldView === 'timetable_filter' && newView !== 'section_list') {
                this.courseList = [];
            }
            // Cleanup lecturer list
            if (oldView === 'section_list') {
                this.selectedCourse = null;
                this.sectionList = [];
                this.sectionLecturerList = []; 
                this.closeStudentModal(); // Close modal if open
            }
            if (newView !== 'timetable_filter') {
                this.filterTerm = ''; 
            }
            // Cleanup student list when navigating away
            if (oldView === 'student_list') {
                this.studentList = [];
                this.studentListOffset = 0; // Reset pagination
            }
        },
        // These watchers ensure course data reloads when a new session is selected
        currentSesi: 'fetchCourseData',
        currentSemester: 'fetchCourseData',

        lecturerSesi: 'refreshLecturerData',
        lecturerSemester: 'refreshLecturerData',
        currentSesi: 'refreshLecturerData',
        currentSemester: 'refreshLecturerData',
        
        // WATCHER: Reload student list on pagination change
        studentListLimit: 'fetchStudentList',
        studentListOffset: 'fetchStudentList',
    },
    methods: {
        setView(viewId) {
            this.currentView = viewId;
            this.isSideNavOpen = false; // Auto-close sidebar on mobile after selection
        },
        logout() {
            if (confirm("Logout of TTMS Console?")) {
                localStorage.removeItem("TTMSFC_userSession");
                window.location.replace("login.html");
            }
        },
        // AJAX PROOF 1: Fetch Master Data (UC5)
        // Sessions list
        async fetchSessionData() {
            this.loadingSession = true;
            const url = `${API_BASE_URL}?entity=sesisemester`;
            try {
                const res = await fetch(url);
                this.sessemList = await res.json();
            } catch (err) {
                console.error("Error fetching session data:", err);
                alert("Failed to load session data. Check API service.");
            } finally {
                this.loadingSession = false;
            }
        },
        viewCourses(sesi, semester) {
            this.currentSesi = sesi;
            this.currentSemester = semester;
            this.filterTerm = '';
            this.courseList = []; // Clear list
            this.currentView = 'timetable_filter';
            // Data fetch is triggered by the watchers on currentSesi/currentSemester
        },
        // AJAX PROOF 2: Fetch Course List Data (UC4/UC2 Proof) - entity=subjek
        // Courses List
        async fetchCourseData() {
            this.loadingTimetable = true;
            
            const url = `${API_BASE_URL}?entity=subjek&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
            
            try {
                const res = await fetch(url);
                const jsonInst = await res.json();
                
                if (jsonInst && jsonInst.length > 0) {
                    this.courseList = jsonInst;
                    console.log(`Successfully loaded ${this.courseList.length} courses for ${this.currentSesi}-${this.currentSemester}.`);
                } else {
                    this.courseList = [];
                    console.log(`No courses found for ${this.currentSesi}-${this.currentSemester}.`);
                }
            } catch (err) {
                console.error("Error fetching course data:", err);
                alert(`Failed to load course list for ${this.currentSesi}-${this.currentSemester}.`);
            } finally {
                this.loadingTimetable = false;
            }
        },
        // Fetch Courses Registered by the Logged-in Student (entity=pelajar_subjek)
        // My Courses (when logged in as student)
        async fetchStudentCourses() {
            this.loadingStudentCourses = true;
            this.studentCourseList = [];
            
            const session = getSession(); 
            
            if (!session || !session.login_name || !session.session_id) { 
                alert("Error: Cannot retrieve session details (ID or Matric). Please log in again.");
                this.loadingStudentCourses = false;
                return;
            }

            const studentMatric = session.login_name;   
            
            // URL with session_id as required by the documentation
            const url = `${API_BASE_URL}?entity=pelajar_subjek&no_matrik=${studentMatric}`;

            console.log("Fetching student courses for:", studentMatric, "URL:", url);

            try {
                const res = await fetch(url);
                const responseText = await res.text();
                
                if (!responseText.trim()) {
                    console.warn("Response was empty. No registered courses found.");
                    return; 
                }

                const jsonInst = JSON.parse(responseText); 
                
                if (jsonInst && jsonInst.length > 0) {
                    this.studentCourseList = jsonInst;
                    console.log(`Successfully loaded ${this.studentCourseList.length} registered courses.`);
                } else {
                    this.studentCourseList = [];
                    console.log("No registered course data found for student."); 
                }

            } catch (err) {
                console.error("Error fetching student course data:", err);
                
                if (err instanceof SyntaxError) { 
                    console.error("Non-JSON Response Detail:", responseText);
                    alert("Failed to load student course data. The server returned an invalid response.");
                } else {
                    alert("Failed to load student course data due to a network error."); 
                }
            } finally {
                this.loadingStudentCourses = false;
            }
        },
        
        // Fetch General Student List (entity=pelajar)
        async fetchStudentList(direction = null) {
            this.loadingStudentList = true;
            
            const session = getSession();
            if (!session || !session.session_id) {
                alert("Error: Authentication required to view the Student List. Please log in.");
                this.loadingStudentList = false;
                return;
            }
            const sessionId = session.session_id;

            // Handle pagination direction
            if (direction === 'prev') {
                this.studentListOffset = Math.max(0, this.studentListOffset - this.studentListLimit);
            } else if (direction === 'next') {
                // If we fetched less than the limit on the previous load, don't increment
                if (this.studentList.length === this.studentListLimit) {
                    this.studentListOffset += this.studentListLimit;
                }
            } else {
                // Reset offset for initial/limit change load
                this.studentListOffset = 0;
            }

            // Construct the authenticated URL with Sesi, Semester, Limit, and Offset
            const url = `${API_BASE_URL}?entity=pelajar&session_id=${sessionId}&sesi=${this.currentSesi}&semester=${this.currentSemester}&limit=${this.studentListLimit}&offset=${this.studentListOffset}`;

            console.log("Fetching student list:", url);

            try {
                const res = await fetch(url);
                const responseText = await res.text();
                
                if (!responseText.trim()) {
                    this.studentList = [];
                    console.warn("Response was empty. No students found.");
                    return; 
                }

                const jsonInst = JSON.parse(responseText); 
                
                if (jsonInst && jsonInst.length > 0) {
                    this.studentList = jsonInst;
                    console.log(`Successfully loaded ${this.studentList.length} students.`);
                } else {
                    this.studentList = [];
                    // Ensure the offset doesn't get stuck if 'next' goes past the end
                    if (direction === 'next' && this.studentListOffset > 0) {
                        this.studentListOffset -= this.studentListLimit; 
                    }
                    console.log("No student data found for the current session/offset."); 
                }

            } catch (err) {
                console.error("Error fetching student list:", err);
                alert("Failed to load student list due to a network or authentication error.");
            } finally {
                this.loadingStudentList = false;
            }
        },
        // Helper: For navigating to student list view, resetting pagination
        viewStudentList() {
            this.currentView = 'student_list';
            // Watcher will trigger fetchStudentList
        },
        
        // Helper: Pagination controls
        hasNextPage() {
            // Assumes if the list size equals the limit, there might be more data
            return this.studentList.length === this.studentListLimit;
        },
        hasPreviousPage() {
            return this.studentListOffset > 0;
        },

        // Fetches Lecturer Assignments (entity=subjek_pensyarah)
        async fetchSectionLecturers(courseEntry) {
            this.loadingLecturers = true;
            this.sectionLecturerList = [];
            let responseText = ''; 

            const url = `${API_BASE_URL}?entity=subjek_pensyarah&kod_subjek=${courseEntry.kod_subjek}&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
            
            try {
                const res = await fetch(url);
                responseText = await res.text(); 
                
                if (!responseText.trim()) {
                    console.log("API returned empty response for lecturers.");
                    return; 
                }

                const jsonInst = JSON.parse(responseText); 
                
                if (jsonInst && jsonInst.length > 0) {
                    this.sectionLecturerList = jsonInst;
                    console.log(`Successfully loaded ${this.sectionLecturerList.length} lecturer assignments.`);
                } else {
                    console.log("No lecturer assignment data found.");
                }
            } catch (err) {
                console.error("Error fetching lecturer data:", err);
                if (err instanceof SyntaxError) { 
                    console.error("Non-JSON Response Detail (Lecturer):", responseText); 
                }
            } finally {
                this.loadingLecturers = false;
            }
        }, 
        
        // Handle Course Click and Fetch Sections (UC6)
        async viewSections(courseEntry) {
            this.selectedCourse = courseEntry; 
            this.loadingSections = true;
            this.sectionList = [];
            this.sectionLecturerList = []; // Clear lecturer data
            this.currentView = 'section_list';
            
            // PERFORM CONCURRENT FETCH OF SECTION AND LECTURER DATA
            const sectionPromise = this._fetchSections(courseEntry);
            const lecturerPromise = this.fetchSectionLecturers(courseEntry);
            
            await Promise.all([sectionPromise, lecturerPromise]);
        },

        // Helper function to fetch section list
        async _fetchSections(courseEntry) {
            const sectionsUrl = `${API_BASE_URL}?entity=subjek_seksyen&kod_subjek=${courseEntry.kod_subjek}&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
            let responseText = ''; 
            
            try {
                const res = await fetch(sectionsUrl);
                responseText = await res.text(); 
                
                if (!responseText.trim()) {
                     console.log(`API returned empty response for sections: ${courseEntry.kod_subjek}`);
                     return; 
                }

                const jsonInst = JSON.parse(responseText); 
                
                if (jsonInst && Array.isArray(jsonInst)) { 
                    const courseDetail = jsonInst.find(item => item.kod_subjek === courseEntry.kod_subjek);
                    
                    if (courseDetail && courseDetail.seksyen_list && Array.isArray(courseDetail.seksyen_list) && courseDetail.seksyen_list.length > 0) {
                        this.sectionList = courseDetail.seksyen_list;
                        console.log(`(Fixed/Nested) Successfully loaded ${this.sectionList.length} sections for ${courseEntry.kod_subjek}.`);
                    } else if (courseDetail && Array.isArray(jsonInst) && jsonInst.some(item => item.seksyen !== undefined)) {
                        const flatSectionList = jsonInst.filter(item => item.seksyen !== undefined && item.kod_subjek === courseEntry.kod_subjek);
                        if (flatSectionList.length > 0) {
                            this.sectionList = flatSectionList;
                            console.warn(`(Fixed/Flat) Loaded ${this.sectionList.length} sections by assuming a flat array structure.`);
                        } else {
                            this.sectionList = [];
                            console.log(`No section data found for ${courseEntry.kod_subjek} in seksyen_list or as a flat array.`);
                        }
                    } else {
                        this.sectionList = [];
                        console.log(`No section data found for ${courseEntry.kod_subjek}.`);
                    }
                } else {
                    this.sectionList = [];
                    console.log(`API response was not a valid array of course data for ${courseEntry.kod_subjek}.`);
                }

            } catch (err) {
                console.error("Error fetching section data:", err);
                if (err instanceof SyntaxError) { 
                    console.error("Non-JSON Response Detail (Section):", responseText); 
                    alert("Failed to load section data. The server returned an invalid response. Check browser console for details.");
                } else {
                    alert("Failed to load section data. Check API service.");
                }
            } finally {
                this.loadingSections = false;
            }
        },

        backToCourseList() {
            this.currentView = 'timetable_filter';
        },
        
async fetchLecturerData() {
    this.loadingLecturers = true;
    
    try {
        console.log("🔍 Starting lecturer fetch for ALL courses...");
        
        // 1. Fetch ALL courses for current session/semester
        const coursesUrl = `${API_BASE_URL}?entity=subjek&sesi=${this.currentSesi}&semester=${this.currentSemester}`;
        const coursesRes = await fetch(coursesUrl);
        const allCourses = await coursesRes.json();
        
        if (!allCourses || allCourses.length === 0) {
            this.lecturerList = [];
            console.log("No courses found for this session/semester.");
            return;
        }
        
        console.log(`📚 Found ${allCourses.length} courses`);
        
        const lecturerMap = new Map();
        let processedCourses = 0;
        
        // 2. Fetch lecturers for EACH course - with better error handling
        for (const course of allCourses) {
            const courseCode = course.kod_subjek;
            const url = `${API_BASE_URL}?entity=subjek_pensyarah&kod_subjek=${courseCode}&sesi=${this.currentSesi}&semester=${this.currentSemester}`;

            try {
                const response = await fetch(url);
                // Check if response is valid
                if (!response.ok) {
                    console.warn(`⚠️ Failed to fetch for ${courseCode}: ${response.status}`);
                    continue;
                }
                
                const responseText = await response.text();
                
                // Handle empty responses
                if (!responseText.trim()) {
                    console.log(`No data returned for ${courseCode}`);
                    continue;
                }
                
                const data = JSON.parse(responseText);
                
                if (data && data.length > 0) {
                    data.forEach(item => {
                        // Extract lecturer name from multiple possible fields
                        const lecturerName = item.nama || item.name || item.nama_pensyarah || item.pensyarah;
                        
                        if (!lecturerName || lecturerName === "-" || lecturerName === "TBA") {
                            return; // Skip invalid names
                        }

                        // Extract staff ID from multiple possible fields
                        const staffId = item.no_pekerja || item.id_staf || item.staff_id || item.no_kakitangan;
                        
                        // Extract department from multiple possible fields
                        const jabatan = item.jabatan || item.department || 
                                      this.getDepartmentFromCourse(courseCode) || 
                                      "FAKULTI SAINS KOMPUTER";

                        if (!lecturerMap.has(lecturerName)) {
                            lecturerMap.set(lecturerName, {
                                nama: lecturerName,
                                id_staf: staffId || "Not available",
                                courses: new Set([courseCode]),
                                department: jabatan,
                                fullInfo: item // Store full API response for debugging
                            });
                        } else {
                            // Add course to existing lecturer
                            lecturerMap.get(lecturerName).courses.add(courseCode);
                            
                            // Update staff ID if we found a better one
                            if (staffId && lecturerMap.get(lecturerName).id_staf === "Not available") {
                                lecturerMap.get(lecturerName).id_staf = staffId;
                            }
                            
                            // Update department if we have more specific info
                            if (jabatan && jabatan !== "FAKULTI SAINS KOMPUTER") {
                                lecturerMap.get(lecturerName).department = jabatan;
                            }
                        }
                    });
                    processedCourses++;
                }
            } catch (courseError) {
                console.error(`Error processing ${courseCode}:`, courseError);
            }

            // Small delay to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 30));
        }

        console.log(`✅ Processed ${processedCourses}/${allCourses.length} courses successfully`);
        
        // Convert Map to array for display
        this.lecturerList = Array.from(lecturerMap.values()).map(lecturer => ({
            nama: lecturer.nama,
            id_staf: lecturer.id_staf,
            subjek: Array.from(lecturer.courses).join(", "),
            jabatan: lecturer.department,
            courses: Array.from(lecturer.courses),
            showDetails: false
        }));

        // Sort alphabetically
        this.lecturerList.sort((a, b) => a.nama.localeCompare(b.nama));

        console.log(`📊 Total lecturers found: ${this.lecturerList.length}`);
        
        // DEBUG: Log first few lecturers to check
        if (this.lecturerList.length > 0) {
            console.log("Sample lecturers:", this.lecturerList.slice(0, 5));
        }
        
    } catch (error) {
        console.error("❌ Critical error in fetchLecturerData:", error);
        this.lecturerList = [];
    } finally {
        this.loadingLecturers = false;
    }
},

refreshLecturerData() {
    this.lecturerList = [];
    this.fetchLecturerData();
},


// Simple click handler - NO popup
toggleLecturerDetails(lecturer) {
    lecturer.showDetails = !lecturer.showDetails;
    
    // If showing details and no staff ID, try to fetch it
    if (lecturer.showDetails && lecturer.id_staf === "Not available") {
        this.tryFetchStaffId(lecturer);
    }
},

// Try to fetch staff ID (simplified)
async tryFetchStaffId(lecturer) {
    try {
        // Simple approach: check if any course has the staff ID
        for (const course of lecturer.courses) {
            const url = `${API_BASE_URL}?entity=subjek_pensyarah&kod_subjek=${course}`;
            const response = await fetch(url);
            const data = await response.json();
            
            const found = data.find(item => 
                item.nama === lecturer.nama && item.no_pekerja
            );
            
            if (found && found.no_pekerja) {
                lecturer.id_staf = found.no_pekerja;
                console.log(`✅ Found staff ID for ${lecturer.nama}: ${found.no_pekerja}`);
                break;
            }
        }
    } catch (error) {
        console.error(`Error fetching staff ID:`, error);
    }
},

getDepartmentFromCourse(courseCode) {
    if (courseCode.startsWith('SCSJ')) return 'JABATAN SAINS KOMPUTER';
    if (courseCode.startsWith('SCSI')) return 'JABATAN SISTEM MAKLUMAT';
    if (courseCode.startsWith('SCSR')) return 'JABATAN RANGKAIAN KOMPUTER';
    if (courseCode.startsWith('SCSK')) return 'JABATAN KEJURUTERAAN PERISIAN';
    return 'FAKULTI SAINS KOMPUTER';
},
        
        // NEW METHOD: Fetch Students for a Specific Section
        // FINAL CODE: Uses confirmed correct entity and parameters.
        async viewStudentsInSection(section, course) {
            this.selectedSection = section;
            this.sectionStudentList = [];
            this.loadingSectionStudents = true;
            this.isStudentModalOpen = true; // Show modal immediately

            const session = getSession();
            if (!session || !session.session_id) {
                alert("Error: Authentication required. Please log in again.");
                this.loadingSectionStudents = false;
                return;
            }
            const sessionId = session.session_id;

            // Use the documented entity and parameters: subjek_pelajar and kod_subjek
            const encodedSesi = encodeURIComponent(this.currentSesi);
            const encodedKodSubjek = encodeURIComponent(course.kod_subjek);
            
            // Construct the final, correct URL
            const url = `${API_BASE_URL}?entity=subjek_pelajar&session_id=${sessionId}&sesi=${encodedSesi}&semester=${this.currentSemester}&kod_subjek=${encodedKodSubjek}&seksyen=${section.seksyen}`;

            console.log("Fetching section student list (FINAL ATTEMPT - kod_subjek confirmed):", url);
            let responseText = '';

            try {
                const res = await fetch(url);
                responseText = await res.text();
                
                // --- Robust Check for non-JSON Response (Handles documentation page) ---
                if (!responseText.trim() || responseText.startsWith('The most simple')) {
                    this.sectionStudentList = [];
                    console.error(`API returned non-data or empty response. Response text starts with: ${responseText.substring(0, 30)}`);
                    if (responseText.startsWith('The most simple')) {
                        alert("Fetch failed. Please log out and log in again to refresh your session ID.");
                    } else {
                        console.log("No data returned, assuming empty section or API error.");
                    }
                    return;
                }
                
                const jsonInst = JSON.parse(responseText);
                console.log("DEBUG: Raw JSON Response for Students:", jsonInst);

                // --- Handle Nested Data Structure ---
                let studentData = [];
                if (Array.isArray(jsonInst)) {
                    studentData = jsonInst; // Case A: Direct Array
                } else if (jsonInst && Array.isArray(jsonInst.subjek_pelajar)) {
                    studentData = jsonInst.subjek_pelajar; // Case B: Nested under 'subjek_pelajar'
                } else if (jsonInst && Array.isArray(jsonInst.data)) {
                    studentData = jsonInst.data; // Case C: Nested under generic 'data'
                }
                
                if (studentData && studentData.length > 0) {
                    this.sectionStudentList = studentData;
                    console.log(`SUCCESS: Loaded ${this.sectionStudentList.length} students.`);
                } else {
                    this.sectionStudentList = [];
                    console.log(`NOTICE: No student data returned for this section.`);
                }

            } catch (err) {
                console.error("ERROR fetching section student list:", err);
                if (err instanceof SyntaxError) {
                    console.error("Non-JSON Response Detail:", responseText.substring(0, 100) + '...');
                    alert("Failed to load student list. Invalid data received. (Check your session ID!)");
                } else {
                    alert("Failed to load student list for this section due to a network error.");
                }
            } finally {
                this.loadingSectionStudents = false;
            }
        },
        
        // NEW METHOD: Close the Student Modal
        closeStudentModal() {
            this.isStudentModalOpen = false;
            this.selectedSection = null;
            this.sectionStudentList = [];
        },
        
        // VISUALIZATION PROOF (SD2 - Google Charts)
        drawInitialChart() {
            if (this.currentView !== 'dashboard') return;

            google.charts.load('current', {'packages':['corechart']});
            google.charts.setOnLoadCallback(() => {
                const data = google.visualization.arrayToDataTable([
                    ['Metric', 'Scheduled vs Available'],
                    ['Scheduled Hours', 75],
                    ['Available Hours', 25]
                ]);
                const options = { 
                    title: 'Total Venue Hours Utilization (75% Scheduled)',
                    is3D: true,
                    colors: ['#38761d', '#93c47d'], 
                    pieHole: 0.4,
                    legend: { position: 'bottom' }
                };
                const chart = new google.visualization.PieChart(document.getElementById('chart_div'));
                chart.draw(data, options);
                console.log("SUCCESS: Google Charts PoC rendered.");
            });
        },
    },

    async fetchLecturerData() {
    this.loadingLecturers = true;
    
    try {
        console.log("🔍 Starting lecturer fetch...");
        
        const courses = ["SCSJ1013", "SCSI1113", "SCSR2043"];
        const lecturerMap = new Map();
        
        for (const course of courses) {
           const url = `${API_BASE_URL}?entity=subjek_pensyarah&kod_subjek=${course}&sesi=${this.currentSesi}&semester=${this.currentSemester}`;

            console.log(`📡 Fetching: ${course}`);
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data && data.length > 0) {
                    data.forEach(item => {
                        const lecturerName = item.nama || item.name || item.nama_pensyarah;
                        if (!lecturerName || lecturerName === "-") return;

                        const staffId = item.no_pekerja || item.id_staf || item.staff_id;

                        if (!lecturerMap.has(lecturerName)) {
                            lecturerMap.set(lecturerName, {
                                courses: new Set([course]),
                                department: this.getDepartmentFromCourse(course),
                                staffId: staffId || "Not available"
                            });
                        } else {
                            lecturerMap.get(lecturerName).courses.add(course);
                            if (staffId && lecturerMap.get(lecturerName).staffId === "Not available") {
                                lecturerMap.get(lecturerName).staffId = staffId;
                            }
                        }
                    });
                }
            } catch (courseError) {
                console.error(`Error fetching ${course}:`, courseError);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.lecturerList = Array.from(lecturerMap.entries()).map(([name, info]) => ({
            nama: name,
            id_staf: info.staffId,
            subjek: Array.from(info.courses).join(", "),
            jabatan: info.department,
            courses: Array.from(info.courses),
            showDetails: false
        }));

        this.lecturerList.sort((a, b) => a.nama.localeCompare(b.nama));

        console.log(`✅ Found ${this.lecturerList.length} lecturers`);
        
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        this.loadingLecturers = false;
    }
},

    mounted() {
        const session = getSession();
        if (!session) {
            // Instead of redirecting to login.html and getting stuck...
            // Set a dummy session automatically for them!
            localStorage.setItem("TTMSFC_userSession", JSON.stringify({login_name: "GUEST", session_id: "demo"}));
            // Now the page won't redirect, and they can see your dashboard.
        }
        this.drawInitialChart();
    }
});

mainApp.mount('#main-app');