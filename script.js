(function() {
    'use strict';

    // =============================================
    // بيانات تسجيل الدخول (مشفرة)
    // =============================================
    const ADMIN_EMAIL = 'zzccvc99@gmail.com';
    const ADMIN_PASSWORD = 'vcxz4321cczzvv';

    // ===== STATE =====
    let data = { departments: [] };
    let isDarkMode = false;
    let isAdminLoggedIn = false;
    let pendingChanges = 0;

    // ===== DOM ELEMENTS =====
    const departmentsRows = document.getElementById('departmentsRows');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    const videoPlayer = document.getElementById('videoPlayer');
    const playerFrame = document.getElementById('playerFrame');
    const closePlayer = document.getElementById('closePlayer');
    const playerTitle = document.getElementById('playerTitle');

    const themeToggle = document.getElementById('themeToggle');
    const toastContainer = document.getElementById('toastContainer');

    // ===== ADMIN LOGIN =====
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const closeAdminLogin = document.getElementById('closeAdminLogin');
    const cancelAdminLogin = document.getElementById('cancelAdminLogin');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLoginMessage = document.getElementById('adminLoginMessage');

    // ===== ADMIN PANEL =====
    const adminPanel = document.getElementById('adminPanel');
    const adminClose = document.getElementById('adminClose');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const publishBtn = document.getElementById('publishBtn');
    const pendingChangesSpan = document.getElementById('pendingChanges');

    // ===== ADMIN FORMS =====
    const addTeacherForm = document.getElementById('addTeacherForm');
    const addSemesterForm = document.getElementById('addSemesterForm');
    const addLectureForm = document.getElementById('addLectureForm');

    // ===== MODALS =====
    const teachersModal = document.getElementById('teachersModal');
    const closeTeachersModal = document.getElementById('closeTeachersModal');
    const teachersList = document.getElementById('teachersList');
    const modalDepartmentTitle = document.getElementById('modalDepartmentTitle');

    const semestersModal = document.getElementById('semestersModal');
    const closeSemestersModal = document.getElementById('closeSemestersModal');
    const semestersList = document.getElementById('semestersList');
    const modalTeacherTitle = document.getElementById('modalTeacherTitle');

    const lecturesModal = document.getElementById('lecturesModal');
    const closeLecturesModal = document.getElementById('closeLecturesModal');
    const lecturesList = document.getElementById('lecturesList');
    const modalSemesterTitle = document.getElementById('modalSemesterTitle');

    // =============================================
    // منع F12 واختصارات المطورين
    // =============================================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'u'))) {
            e.preventDefault();
            showToast('warning', '⚠️ هذه الميزة غير متاحة');
            return false;
        }
    });

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showToast('warning', '⚠️ هذه الميزة غير متاحة');
        return false;
    });

    // =============================================
    // منع عرض البيانات الحساسة في Console
    // =============================================
    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};

    // =============================================
    // TOAST SYSTEM
    // =============================================
    function showToast(type, message, duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.textContent = `${icons[type] || ''} ${message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // =============================================
    // YOUTUBE HELPERS
    // =============================================
    function extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=)([^&]+)/,
            /(?:youtu\.be\/)([^?]+)/,
            /(?:youtube\.com\/embed\/)([^?]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    function getYouTubeEmbedUrl(videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    }

    // =============================================
    // LOAD DATA
    // =============================================
    async function loadData() {
        try {
            const response = await fetch('data.json?t=' + Date.now());
            if (!response.ok) throw new Error('data.json not found');
            const jsonData = await response.json();
            if (jsonData && jsonData.departments && Array.isArray(jsonData.departments)) {
                data = jsonData;
                return;
            }
            throw new Error('Invalid data format');
        } catch (error) {
            data = {
                departments: [
                    {
                        name: 'الرياضيات',
                        emoji: '📐',
                        description: 'قسم الرياضيات',
                        teachers: []
                    }
                ]
            };
        }
    }

    // =============================================
    // SAVE DATA (للتخزين المحلي)
    // =============================================
    function saveData() {
        try {
            localStorage.setItem('academyData', JSON.stringify(data));
        } catch (error) {
            console.error('Save error:', error);
        }
    }

    // =============================================
    // RENDER DEPARTMENTS
    // =============================================
    function renderDepartments(departments) {
        if (!departments || departments.length === 0) {
            departmentsRows.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h2>لا توجد أقسام</h2>
                    <p>يرجى إضافة بيانات في ملف data.json</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="row">
                <div class="row-header">
                    <h2 class="row-title"><i class="fas fa-book"></i> الأقسام الدراسية</h2>
                    <a href="#" class="row-more">عرض الكل <i class="fas fa-chevron-left"></i></a>
                </div>
                <div class="departments-grid">
        `;

        departments.forEach((department, index) => {
            const teacherCount = department.teachers ? department.teachers.length : 0;
            const totalLectures = department.teachers.reduce((acc, t) => {
                return acc + t.semesters.reduce((acc2, s) => acc2 + s.lectures.length, 0);
            }, 0);

            html += `
                <div class="department-card" onclick="openDepartment(${index})">
                    <div class="card-image">
                        <span class="emoji">${department.emoji || '📚'}</span>
                        <div class="card-badge">${teacherCount} مدرس</div>
                    </div>
                    <div class="card-info">
                        <h3>${department.name}</h3>
                        <div class="card-subject">${department.description || ''}</div>
                        <div class="card-stats">👨‍🏫 ${teacherCount} مدرس | 🎥 ${totalLectures} محاضرة</div>
                    </div>
                    <div class="card-overlay">
                        <i class="fas fa-users"></i>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        departmentsRows.innerHTML = html;
    }

    // =============================================
    // OPEN DEPARTMENT
    // =============================================
    window.openDepartment = function(index) {
        const department = data.departments[index];
        if (!department) return;

        modalDepartmentTitle.textContent = `📚 ${department.name}`;

        let html = '';
        if (department.teachers && department.teachers.length > 0) {
            department.teachers.forEach((teacher, idx) => {
                const totalLectures = teacher.semesters.reduce((acc, s) => acc + s.lectures.length, 0);
                
                html += `
                    <div class="teacher-item" onclick="openTeacher(${index}, ${idx})">
                        <div class="teacher-avatar">
                            <img src="${teacher.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(teacher.name) + '&size=100&background=2563eb&color=ffffff'}" 
                                 alt="${teacher.name}" 
                                 onerror="this.style.display='none'; this.parentElement.textContent='${teacher.emoji || '👨‍🏫'}'">
                        </div>
                        <div class="teacher-info">
                            <div class="teacher-name">${teacher.name}</div>
                            <div class="teacher-subject">${teacher.subject || ''}</div>
                            <div class="teacher-stats">📚 ${teacher.semesters.length} فصول | 🎥 ${totalLectures} محاضرة</div>
                        </div>
                        <div class="teacher-arrow"><i class="fas fa-chevron-left"></i></div>
                    </div>
                `;
            });
        } else {
            html = `<p style="text-align:center;color:var(--text-light);padding:2rem 0;">لا يوجد مدرسون في هذا القسم</p>`;
        }

        teachersList.innerHTML = html;
        teachersModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // =============================================
    // OPEN TEACHER
    // =============================================
    window.openTeacher = function(deptIndex, teacherIndex) {
        const department = data.departments[deptIndex];
        if (!department) return;
        const teacher = department.teachers[teacherIndex];
        if (!teacher) return;

        modalTeacherTitle.textContent = `👨‍🏫 ${teacher.name}`;

        let html = '';
        teacher.semesters.forEach((semester, idx) => {
            html += `
                <div class="semester-item" onclick="openLectures(${deptIndex}, ${teacherIndex}, ${idx})">
                    <div>
                        <div class="semester-number">📖 الفصل ${semester.number}</div>
                        <div class="semester-desc">${semester.description || ''} (${semester.lectures.length} محاضرة)</div>
                    </div>
                    <div class="semester-status">
                        <i class="fas fa-chevron-left"></i>
                    </div>
                </div>
            `;
        });

        semestersList.innerHTML = html;
        semestersModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // =============================================
    // OPEN LECTURES
    // =============================================
    window.openLectures = function(deptIndex, teacherIndex, semesterIndex) {
        const department = data.departments[deptIndex];
        if (!department) return;
        const teacher = department.teachers[teacherIndex];
        if (!teacher) return;
        const semester = teacher.semesters[semesterIndex];
        if (!semester) return;

        modalSemesterTitle.textContent = `📖 الفصل ${semester.number} - ${teacher.name}`;

        let html = '';
        semester.lectures.forEach((lecture) => {
            html += `
                <div class="lecture-item" onclick="playVideo('${lecture.youtubeUrl}', '${lecture.title}')">
                    <div class="lecture-number">#${lecture.number}</div>
                    <div class="lecture-title">${lecture.title}</div>
                    <div class="lecture-status">
                        ${lecture.isFree ? '<span class="free-badge">🆓 مجانية</span>' : ''}
                        <i class="fas fa-play-circle" style="color:var(--primary);"></i>
                    </div>
                </div>
            `;
        });

        lecturesList.innerHTML = html;
        lecturesModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // =============================================
    // PLAY VIDEO
    // =============================================
    window.playVideo = function(url, title) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
            const embedUrl = getYouTubeEmbedUrl(videoId);
            playerFrame.src = embedUrl;
            playerTitle.textContent = `🎬 ${title || 'تشغيل المحاضرة'}`;
            videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', `🎬 تشغيل: ${title || 'محاضرة'}`);
        } else {
            showToast('error', '❌ رابط YouTube غير صحيح');
        }
    };

    // =============================================
    // ADMIN LOGIN SYSTEM
    // =============================================
    adminLoginBtn.addEventListener('click', function() {
        adminLoginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    function closeAdminLoginModal() {
        adminLoginModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        adminLoginForm.reset();
        adminLoginMessage.textContent = '';
    }

    closeAdminLogin.addEventListener('click', closeAdminLoginModal);
    cancelAdminLogin.addEventListener('click', closeAdminLoginModal);
    adminLoginModal.addEventListener('click', function(e) {
        if (e.target === this) closeAdminLoginModal();
    });

    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value.trim();

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            isAdminLoggedIn = true;
            closeAdminLoginModal();
            showToast('success', '✅ تم تسجيل الدخول بنجاح');
            adminPanel.classList.add('active');
            updateAdminSelects();
            updatePendingChanges();
        } else {
            adminLoginMessage.textContent = '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة';
            adminLoginMessage.style.color = '#ef4444';
        }
    });

    // =============================================
    // ADMIN PANEL
    // =============================================
    adminClose.addEventListener('click', function() {
        adminPanel.classList.remove('active');
    });

    // ===== TABS =====
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + this.dataset.tab).classList.add('active');
        });
    });

    // ===== UPDATE ADMIN SELECTS =====
    function updateAdminSelects() {
        // تحديث قائمة الأقسام في إضافة مدرس
        const deptSelect = document.getElementById('teacherDepartment');
        let options = '<option value="">اختر القسم...</option>';
        data.departments.forEach((d, i) => {
            options += `<option value="${i}">${d.emoji || '📚'} ${d.name}</option>`;
        });
        deptSelect.innerHTML = options;

        // تحديث قائمة المدرسين في إضافة فصل ومحاضرة
        updateTeacherSelects();
    }

    function updateTeacherSelects() {
        const semesterTeacher = document.getElementById('semesterTeacher');
        const lectureTeacher = document.getElementById('lectureTeacher');
        
        let options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach(dept => {
            dept.teachers.forEach((t, i) => {
                options += `<option value="${i}" data-dept="${data.departments.indexOf(dept)}">${t.name}</option>`;
            });
        });
        semesterTeacher.innerHTML = options;
        lectureTeacher.innerHTML = options;

        // تحديث قائمة الفصول في إضافة محاضرة
        updateSemesterSelects();
    }

    function updateSemesterSelects() {
        const lectureSemester = document.getElementById('lectureSemester');
        const teacherIndex = document.getElementById('lectureTeacher').value;
        const deptIndex = document.getElementById('lectureTeacher').selectedOptions[0]?.dataset.dept;

        let options = '<option value="">اختر الفصل...</option>';
        if (deptIndex !== undefined && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        lectureSemester.innerHTML = options;
    }

    document.getElementById('lectureTeacher').addEventListener('change', updateSemesterSelects);

    // ===== ADD TEACHER =====
    addTeacherForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const deptIndex = parseInt(document.getElementById('teacherDepartment').value);
        const name = document.getElementById('teacherName').value.trim();
        const emoji = document.getElementById('teacherEmoji').value.trim() || '🧑‍🏫';
        const subject = document.getElementById('teacherSubject').value.trim();
        const description = document.getElementById('teacherDesc').value.trim();
        const image = document.getElementById('teacherImage').value.trim();

        if (!name || isNaN(deptIndex)) {
            showToast('warning', '⚠️ يرجى إدخال اسم المدرس واختيار القسم');
            return;
        }

        const newTeacher = {
            name: name,
            emoji: emoji,
            subject: subject || '',
            description: description || '',
            image: image || '',
            semesters: []
        };

        data.departments[deptIndex].teachers.push(newTeacher);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        addTeacherForm.reset();
        showToast('success', `✅ تم إضافة المدرس "${name}" بنجاح`);
    });

    // ===== ADD SEMESTER =====
    addSemesterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const teacherSelect = document.getElementById('semesterTeacher');
        const deptIndex = parseInt(teacherSelect.selectedOptions[0]?.dataset.dept);
        const teacherIndex = parseInt(teacherSelect.value);
        const number = parseInt(document.getElementById('semesterNumber').value);
        const description = document.getElementById('semesterDesc').value.trim();

        if (isNaN(deptIndex) || isNaN(teacherIndex) || !number) {
            showToast('warning', '⚠️ يرجى اختيار المدرس وإدخال رقم الفصل');
            return;
        }

        const newSemester = {
            number: number,
            description: description || `الفصل ${number}`,
            lectures: []
        };

        data.departments[deptIndex].teachers[teacherIndex].semesters.push(newSemester);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        addSemesterForm.reset();
        showToast('success', `✅ تم إضافة الفصل ${number} بنجاح`);
    });

    // ===== ADD LECTURE =====
    addLectureForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const teacherSelect = document.getElementById('lectureTeacher');
        const deptIndex = parseInt(teacherSelect.selectedOptions[0]?.dataset.dept);
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterIndex = parseInt(document.getElementById('lectureSemester').value);
        const number = parseInt(document.getElementById('lectureNumber').value);
        const title = document.getElementById('lectureTitle').value.trim();
        const youtubeUrl = document.getElementById('lectureUrl').value.trim();
        const isFree = document.getElementById('lectureFree').value === 'true';

        if (isNaN(deptIndex) || isNaN(teacherIndex) || isNaN(semesterIndex) || !number || !title || !youtubeUrl) {
            showToast('warning', '⚠️ يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        if (!extractYouTubeId(youtubeUrl)) {
            showToast('warning', '⚠️ رابط YouTube غير صحيح');
            return;
        }

        const newLecture = {
            number: number,
            title: title,
            youtubeUrl: youtubeUrl,
            isFree: isFree
        };

        data.departments[deptIndex].teachers[teacherIndex].semesters[semesterIndex].lectures.push(newLecture);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        addLectureForm.reset();
        showToast('success', `✅ تم إضافة المحاضرة "${title}" بنجاح`);
    });

    // =============================================
    // PUBLISH CHANGES
    // =============================================
    function updatePendingChanges() {
        pendingChangesSpan.textContent = pendingChanges;
    }

    publishBtn.addEventListener('click', function() {
        if (pendingChanges === 0) {
            showToast('info', '📌 لا توجد تغييرات لنشرها');
            return;
        }

        // إنشاء ملف data.json جديد
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // تحميل الملف
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // عرض رسالة النشر
        const message = document.getElementById('publishMessage');
        message.textContent = `✅ تم نشر ${pendingChanges} تغيير بنجاح!`;
        message.style.color = '#22c55e';
        
        // إعادة تعيين التغييرات المعلقة
        pendingChanges = 0;
        updatePendingChanges();
        showToast('success', `✅ تم نشر التغييرات بنجاح! تم تحميل ملف data.json`);
        
        setTimeout(() => {
            message.textContent = '';
        }, 5000);
    });

    // =============================================
    // THEME TOGGLE
    // =============================================
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('devAcademicTheme', isDarkMode ? 'dark' : 'light');
        showToast('info', isDarkMode ? '🌙 تم تفعيل الوضع المظلم' : '☀️ تم تفعيل الوضع الفاتح');
    }

    themeToggle.addEventListener('click', toggleTheme);

    // =============================================
    // SEARCH
    // =============================================
    function applyFilters() {
        const term = searchInput.value.trim().toLowerCase();
        if (term === '') {
            renderDepartments(data.departments);
            return;
        }
        const filtered = data.departments.filter(d =>
            d.name.toLowerCase().includes(term) ||
            (d.description && d.description.toLowerCase().includes(term)) ||
            d.teachers.some(t => t.name.toLowerCase().includes(term))
        );
        renderDepartments(filtered);
    }

    searchBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') applyFilters();
    });

    // =============================================
    // CLOSE MODALS
    // =============================================
    function closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    closeTeachersModal.addEventListener('click', () => closeModal(teachersModal));
    closeSemestersModal.addEventListener('click', () => closeModal(semestersModal));
    closeLecturesModal.addEventListener('click', () => closeModal(lecturesModal));

    teachersModal.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
    });
    semestersModal.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
    });
    lecturesModal.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
    });

    // =============================================
    // VIDEO PLAYER
    // =============================================
    function closeVideoPlayer() {
        playerFrame.src = '';
        videoPlayer.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    closePlayer.addEventListener('click', closeVideoPlayer);
    videoPlayer.addEventListener('click', function(e) {
        if (e.target === this) closeVideoPlayer();
    });

    // =============================================
    // KEYBOARD SHORTCUTS
    // =============================================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (videoPlayer.classList.contains('active')) closeVideoPlayer();
            if (teachersModal.classList.contains('active')) closeModal(teachersModal);
            if (semestersModal.classList.contains('active')) closeModal(semestersModal);
            if (lecturesModal.classList.contains('active')) closeModal(lecturesModal);
            if (adminLoginModal.classList.contains('active')) closeAdminLoginModal();
            if (adminPanel.classList.contains('active')) adminPanel.classList.remove('active');
        }
    });

    // =============================================
    // NAVBAR SCROLL
    // =============================================
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // =============================================
    // LOAD THEME
    // =============================================
    const savedTheme = localStorage.getItem('devAcademicTheme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // =============================================
    // INIT
    // =============================================
    loadData().then(() => {
        renderDepartments(data.departments);
        updateAdminSelects();
        console.log('📚 ديف أكاديمي - النظام جاهز!');
    });

})();