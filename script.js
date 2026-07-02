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
    let activeTeacher = null;
    let activeTeacherIndex = null;

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
    // DEVICE ID (معرف فريد لكل جهاز)
    // =============================================
    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'DEV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    const userDeviceId = getDeviceId();

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
    // نظام الأكواد والصلاحيات
    // =============================================

    function hasAccessToTeacher(teacher) {
        if (!teacher || !teacher.codes) return false;
        
        const savedAccess = localStorage.getItem('teacherAccess_' + teacher.name);
        if (savedAccess === 'true') {
            return true;
        }
        
        const hasAccess = teacher.codes.some(c => c.used && c.deviceId === userDeviceId);
        if (hasAccess) {
            localStorage.setItem('teacherAccess_' + teacher.name, 'true');
        }
        return hasAccess;
    }

    function verifyCode(teacher, code) {
        if (!teacher.codes || teacher.codes.length === 0) {
            return { valid: false, message: 'لا توجد أكواد لهذا المدرس' };
        }

        const codeData = teacher.codes.find(c => c.code === code);

        if (!codeData) {
            return { valid: false, message: 'الكود غير صحيح' };
        }

        if (codeData.used) {
            if (codeData.deviceId === userDeviceId) {
                return { valid: true, message: '✅ الكود مفعل على جهازك' };
            } else {
                return { valid: false, message: '❌ هذا الكود مستخدم من جهاز آخر' };
            }
        }

        codeData.used = true;
        codeData.deviceId = userDeviceId;
        codeData.usedAt = new Date().toISOString();

        localStorage.setItem('teacherAccess_' + teacher.name, 'true');
        saveData();
        return { valid: true, message: '✅ تم التفعيل بنجاح - جميع محاضرات المدرس مفتوحة' };
    }

    function generateCode(teacherName, length = 8) {
        const prefix = teacherName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let random = '';
        for (let i = 0; i < length; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${prefix}-${random}`;
    }

    function addNewCodes(teacher, count = 5) {
        if (!teacher.codes) teacher.codes = [];
        const newCodes = [];
        for (let i = 0; i < count; i++) {
            const newCode = generateCode(teacher.name);
            teacher.codes.push({
                code: newCode,
                used: false,
                deviceId: null
            });
            newCodes.push(newCode);
        }
        saveData();
        pendingChanges++;
        updatePendingChanges();
        return newCodes;
    }

    // ===== إضافة كود يدوي =====
    window.addManualCode = function() {
        const select = document.getElementById('codeTeacherSelect');
        const selectedOption = select.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(select.value);
        const codeInput = document.getElementById('manualCodeInput');
        const codeMessage = document.getElementById('manualCodeMessage');
        const code = codeInput.value.trim().toUpperCase();

        if (deptIndex === -1 || isNaN(teacherIndex)) {
            codeMessage.innerHTML = '⚠️ يرجى اختيار مدرس أولاً';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        if (!code) {
            codeMessage.innerHTML = '⚠️ يرجى إدخال الكود';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        if (code.length < 4) {
            codeMessage.innerHTML = '⚠️ الكود قصير جداً (يجب أن يكون 4 أحرف على الأقل)';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        if (code.includes(' ')) {
            codeMessage.innerHTML = '⚠️ الكود لا يجب أن يحتوي على مسافات';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            codeMessage.innerHTML = '❌ المدرس غير موجود';
            codeMessage.style.color = '#ef4444';
            return;
        }

        if (!teacher.codes) teacher.codes = [];
        const exists = teacher.codes.some(c => c.code === code);
        if (exists) {
            codeMessage.innerHTML = '⚠️ هذا الكود موجود بالفعل';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        teacher.codes.push({
            code: code,
            used: false,
            deviceId: null
        });

        saveData();
        pendingChanges++;
        updatePendingChanges();
        updateCodesManagement();
        codeInput.value = '';
        codeMessage.innerHTML = `✅ تم إضافة الكود: ${code}`;
        codeMessage.style.color = '#22c55e';
        showToast('success', `✅ تم إضافة الكود: ${code}`);
        updateAdminSelects();
    };

    function deleteCode(teacher, codeToDelete) {
        if (!teacher.codes) return false;
        const index = teacher.codes.findIndex(c => c.code === codeToDelete);
        if (index === -1) return false;
        if (teacher.codes[index].used) {
            showToast('warning', '⚠️ لا يمكن حذف كود مستخدم');
            return false;
        }
        teacher.codes.splice(index, 1);
        saveData();
        pendingChanges++;
        updatePendingChanges();
        return true;
    }

    function getCodesStatus(teacher) {
        if (!teacher.codes) return { total: 0, used: 0, available: 0 };
        const total = teacher.codes.length;
        const used = teacher.codes.filter(c => c.used).length;
        return { total, used, available: total - used };
    }

    // =============================================
    // دوال حذف المدرس والفصل والمحاضرة (نسخة مصححة)
    // =============================================

    // ===== حذف المدرس =====
    window.deleteSelectedTeacher = function() {
        const select = document.getElementById('codeTeacherSelect');
        const selectedOption = select.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(select.value);

        if (deptIndex === -1 || isNaN(teacherIndex)) {
            showToast('warning', '⚠️ يرجى اختيار مدرس أولاً');
            return;
        }

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '❌ المدرس غير موجود');
            return;
        }

        if (teacher.semesters && teacher.semesters.length > 0) {
            if (!confirm(`⚠️ المدرس "${teacher.name}" لديه ${teacher.semesters.length} فصول. هل أنت متأكد من حذفه وجميع محتوياته؟`)) {
                return;
            }
        } else {
            if (!confirm(`⚠️ هل أنت متأكد من حذف المدرس "${teacher.name}"؟`)) {
                return;
            }
        }

        data.departments[deptIndex].teachers.splice(teacherIndex, 1);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        showToast('success', `✅ تم حذف المدرس "${teacher.name}" بنجاح`);
    };

    // ===== حذف الفصل =====
    window.deleteSelectedSemester = function() {
        const teacherSelect = document.getElementById('deleteSemesterTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterIndex = parseInt(document.getElementById('deleteSemesterSelect').value);

        if (deptIndex === -1 || isNaN(teacherIndex) || isNaN(semesterIndex)) {
            showToast('warning', '⚠️ يرجى اختيار المدرس والفصل');
            return;
        }

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '❌ المدرس غير موجود');
            return;
        }

        const semester = teacher.semesters[semesterIndex];
        if (!semester) {
            showToast('error', '❌ الفصل غير موجود');
            return;
        }

        if (!confirm(`⚠️ هل أنت متأكد من حذف الفصل ${semester.number} "${semester.description || ''}"؟`)) {
            return;
        }

        teacher.semesters.splice(semesterIndex, 1);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        showToast('success', `✅ تم حذف الفصل ${semester.number} بنجاح`);
    };

    // ===== تحديث قائمة الفصول في حذف محاضرة =====
    function updateDeleteLectureSemesters() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('deleteLectureSemester');

        // مسح القائمة وإضافة الخيار الافتراضي
        semesterSelect.innerHTML = '<option value="">اختر الفصل...</option>';

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
            return;
        }

        const teacher = data.departments[deptIndex]?.teachers[teacherIndex];
        if (!teacher) {
            return;
        }

        // إضافة الفصول
        teacher.semesters.forEach((s, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `الفصل ${s.number} - ${s.description || ''}`;
            semesterSelect.appendChild(option);
        });

        // إعادة تعيين قائمة المحاضرات
        document.getElementById('deleteLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';
    }

    // ===== تحديث قائمة المحاضرات في حذف محاضرة =====
    function updateDeleteLectureLectures() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('deleteLectureSemester');
        const semesterIndex = parseInt(semesterSelect.value);
        const lectureSelect = document.getElementById('deleteLectureSelect');

        // مسح القائمة وإضافة الخيار الافتراضي
        lectureSelect.innerHTML = '<option value="">اختر المحاضرة...</option>';

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex === '') {
            return;
        }

        const teacher = data.departments[deptIndex]?.teachers[teacherIndex];
        if (!teacher) {
            return;
        }

        const semester = teacher.semesters[semesterIndex];
        if (!semester) {
            return;
        }

        // إضافة المحاضرات
        semester.lectures.forEach((l, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `#${l.number} - ${l.title}`;
            lectureSelect.appendChild(option);
        });
    }

    // ===== ربط الأحداث بشكل صحيح =====
    function setupDeleteLectureEvents() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const semesterSelect = document.getElementById('deleteLectureSemester');

        if (teacherSelect) {
            teacherSelect.removeEventListener('change', onTeacherChange);
            teacherSelect.addEventListener('change', onTeacherChange);
        }

        if (semesterSelect) {
            semesterSelect.removeEventListener('change', onSemesterChange);
            semesterSelect.addEventListener('change', onSemesterChange);
        }
    }

    function onTeacherChange() {
        updateDeleteLectureSemesters();
    }

    function onSemesterChange() {
        updateDeleteLectureLectures();
    }

    // استدعاء عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        setupDeleteLectureEvents();
    });

    // ===== حذف المحاضرة =====
    window.deleteSelectedLecture = function() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterIndex = parseInt(document.getElementById('deleteLectureSemester').value);
        const lectureIndex = parseInt(document.getElementById('deleteLectureSelect').value);

        // التحقق من صحة الإدخالات
        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
            showToast('warning', '⚠️ يرجى اختيار المدرس');
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex === '') {
            showToast('warning', '⚠️ يرجى اختيار الفصل');
            return;
        }

        if (isNaN(lectureIndex) || lectureIndex === '') {
            showToast('warning', '⚠️ يرجى اختيار المحاضرة');
            return;
        }

        const teacher = data.departments[deptIndex]?.teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '❌ المدرس غير موجود');
            return;
        }

        const semester = teacher.semesters[semesterIndex];
        if (!semester) {
            showToast('error', '❌ الفصل غير موجود');
            return;
        }

        const lecture = semester.lectures[lectureIndex];
        if (!lecture) {
            showToast('error', '❌ المحاضرة غير موجودة');
            return;
        }

        if (!confirm(`⚠️ هل أنت متأكد من حذف المحاضرة "${lecture.title}"؟`)) {
            return;
        }

        semester.lectures.splice(lectureIndex, 1);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();

        // تحديث القوائم
        updateDeleteLectureSemesters();
        document.getElementById('deleteLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';

        showToast('success', `✅ تم حذف المحاضرة "${lecture.title}" بنجاح`);
    };

    // ===== تحديث قائمة الفصول في حذف فصل =====
    function updateDeleteSemesterSelects() {
        const teacherSelect = document.getElementById('deleteSemesterTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('deleteSemesterSelect');

        let options = '<option value="">اختر الفصل...</option>';
        if (deptIndex !== -1 && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
    }

    // ===== تحديث دوال التحديث =====
    function updateAdminSelects() {
        const deptSelect = document.getElementById('teacherDepartment');
        let options = '<option value="">اختر القسم...</option>';
        data.departments.forEach((d, i) => {
            options += `<option value="${i}">${d.emoji || '📚'} ${d.name}</option>`;
        });
        deptSelect.innerHTML = options;

        updateTeacherSelects();
        updateCodeTeacherSelect();
        updateDeleteTeacherSelects();
    }

    function updateDeleteTeacherSelects() {
        const deleteSemesterTeacher = document.getElementById('deleteSemesterTeacher');
        const deleteLectureTeacher = document.getElementById('deleteLectureTeacher');
        
        let options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach((dept, di) => {
            dept.teachers.forEach((t, ti) => {
                options += `<option value="${ti}" data-dept="${di}">${t.name}</option>`;
            });
        });
        
        if (deleteSemesterTeacher) deleteSemesterTeacher.innerHTML = options;
        if (deleteLectureTeacher) deleteLectureTeacher.innerHTML = options;
        
        // تحديث القوائم المرتبطة
        updateDeleteSemesterSelects();
        updateDeleteLectureSemesters();
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
                data.departments.forEach(dept => {
                    dept.teachers.forEach(teacher => {
                        if (!teacher.codes) teacher.codes = [];
                    });
                });
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
    // SAVE DATA
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
                const hasAccess = hasAccessToTeacher(teacher);
                
                html += `
                    <div class="teacher-item" onclick="openTeacher(${index}, ${idx})">
                        <div class="teacher-avatar">
                            <img src="${teacher.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(teacher.name) + '&size=100&background=2563eb&color=ffffff'}" 
                                 alt="${teacher.name}" 
                                 onerror="this.style.display='none'; this.parentElement.textContent='${teacher.emoji || '👨‍🏫'}'">
                        </div>
                        <div class="teacher-info">
                            <div class="teacher-name">${teacher.name} ${hasAccess ? '✅' : ''}</div>
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

        activeTeacher = teacher;
        activeTeacherIndex = teacherIndex;
        const hasAccess = hasAccessToTeacher(teacher);
        modalTeacherTitle.textContent = `👨‍🏫 ${teacher.name}`;

        let html = '';
        teacher.semesters.forEach((semester, idx) => {
            const hasFreeLecture = semester.lectures.some(l => l.isFree === true);
            const isLocked = !hasAccess && !hasFreeLecture;
            
            html += `
                <div class="semester-item ${isLocked ? 'locked' : ''}" 
                     onclick="${isLocked ? '' : `openLectures(${deptIndex}, ${teacherIndex}, ${idx})`}">
                    <div>
                        <div class="semester-number">📖 الفصل ${semester.number}</div>
                        <div class="semester-desc">${semester.description || ''} (${semester.lectures.length} محاضرة)</div>
                    </div>
                    <div class="semester-status">
                        ${isLocked ? '🔒 مغلق' : (hasAccess ? '✅ مفتوح' : '🆓 جزئياً')}
                        <i class="fas fa-chevron-left"></i>
                    </div>
                </div>
            `;
        });
        
        const isActivated = hasAccessToTeacher(teacher);
        html += `
            <div class="codes-info">
                <div class="access-status ${isActivated ? 'active' : 'inactive'}">
                    ${isActivated ? '✅ تم التفعيل - جميع المحاضرات مفتوحة' : '🔒 بعض المحاضرات مقفلة - أدخل كود التفعيل'}
                </div>
                ${!isActivated ? `
                    <div class="code-box-mini">
                        <p>🔑 أدخل كود التفعيل لفتح جميع المحاضرات</p>
                        <div style="display:flex;gap:0.5rem;">
                            <input type="password" id="codeInputTeacher" placeholder="أدخل الكود..." maxlength="20" style="flex:1;padding:0.5rem 0.8rem;border:2px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text);font-size:0.9rem;outline:none;text-align:center;letter-spacing:2px;font-weight:700;font-family:monospace;" />
                            <button onclick="activateCodeFromTeacher()" style="padding:0.5rem 1.2rem;background:var(--primary);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">تفعيل</button>
                        </div>
                        <div id="codeMessageTeacher"></div>
                    </div>
                ` : ''}
            </div>
        `;

        semestersList.innerHTML = html;
        semestersModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // ===== ACTIVATE CODE FROM TEACHER =====
    window.activateCodeFromTeacher = function() {
        const codeInput = document.getElementById('codeInputTeacher');
        const codeMessage = document.getElementById('codeMessageTeacher');
        const code = codeInput.value.trim().toUpperCase();
        
        if (!code) {
            codeMessage.innerHTML = '⚠️ يرجى إدخال الكود';
            codeMessage.style.color = '#f59e0b';
            return;
        }
        
        if (!activeTeacher) {
            codeMessage.innerHTML = '⚠️ يرجى اختيار مدرس أولاً';
            codeMessage.style.color = '#f59e0b';
            return;
        }
        
        const result = verifyCode(activeTeacher, code);
        codeMessage.innerHTML = result.message;
        codeMessage.style.color = result.valid ? '#22c55e' : '#ef4444';
        
        if (result.valid) {
            showToast('success', '✅ تم التفعيل بنجاح! جميع محاضرات المدرس مفتوحة');
            setTimeout(() => {
                const deptIndex = data.departments.findIndex(d => d.teachers.includes(activeTeacher));
                const teacherIndex = activeTeacherIndex;
                if (deptIndex !== -1 && teacherIndex !== null) {
                    openTeacher(deptIndex, teacherIndex);
                }
            }, 1500);
        } else {
            showToast('error', '❌ ' + result.message);
        }
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

        const hasAccess = hasAccessToTeacher(teacher);
        modalSemesterTitle.textContent = `📖 الفصل ${semester.number} - ${teacher.name}`;

        let html = '';
        semester.lectures.forEach((lecture) => {
            const isFree = lecture.isFree === true;
            const canWatch = isFree || hasAccess;
            
            html += `
                <div class="lecture-item ${canWatch ? '' : 'locked'}" 
                     onclick="${canWatch ? `playVideo('${lecture.youtubeUrl}', '${lecture.title}')` : ''}">
                    <div class="lecture-number">#${lecture.number}</div>
                    <div class="lecture-title">${lecture.title}</div>
                    <div class="lecture-status">
                        ${isFree ? '<span class="free-badge">🆓 مجانية</span>' : ''}
                        ${canWatch ? '<i class="fas fa-play-circle" style="color:var(--primary);"></i>' : '<i class="fas fa-lock" style="color:#ef4444;"></i>'}
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
            if (this.dataset.tab === 'manage-codes') {
                updateCodesManagement();
            }
        });
    });

    // ===== UPDATE ADMIN SELECTS =====
    function updateTeacherSelects() {
        const semesterTeacher = document.getElementById('semesterTeacher');
        const lectureTeacher = document.getElementById('lectureTeacher');
        
        let options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach((dept, di) => {
            dept.teachers.forEach((t, ti) => {
                options += `<option value="${ti}" data-dept="${di}">${t.name}</option>`;
            });
        });
        semesterTeacher.innerHTML = options;
        lectureTeacher.innerHTML = options;

        updateSemesterSelects();
    }

    function updateSemesterSelects() {
        const lectureSemester = document.getElementById('lectureSemester');
        const teacherSelect = document.getElementById('lectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);

        let options = '<option value="">اختر الفصل...</option>';
        if (deptIndex !== -1 && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        lectureSemester.innerHTML = options;
    }

    function updateCodeTeacherSelect() {
        const select = document.getElementById('codeTeacherSelect');
        let options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach((dept, di) => {
            dept.teachers.forEach((t, ti) => {
                options += `<option value="${ti}" data-dept="${di}">${t.name}</option>`;
            });
        });
        select.innerHTML = options;
    }

    document.getElementById('lectureTeacher').addEventListener('change', updateSemesterSelects);
    document.getElementById('codeTeacherSelect').addEventListener('change', updateCodesManagement);

    // ===== CODES MANAGEMENT =====
    function updateCodesManagement() {
        const select = document.getElementById('codeTeacherSelect');
        const container = document.getElementById('codesListContainer');
        const selectedOption = select.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(select.value);

        if (deptIndex === -1 || isNaN(teacherIndex)) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem 0;">اختر مدرساً لعرض الأكواد</p>';
            return;
        }

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem 0;">المدرس غير موجود</p>';
            return;
        }

        const status = getCodesStatus(teacher);
        let html = `
            <div class="codes-stats">
                <span>📊 المجموع: ${status.total}</span>
                <span>✅ المستخدمة: ${status.used}</span>
                <span>🟢 المتاحة: ${status.available}</span>
            </div>
            <table class="codes-table">
                <tr>
                    <th>#</th>
                    <th>الكود</th>
                    <th>الحالة</th>
                    <th>حذف</th>
                </tr>
        `;

        if (teacher.codes && teacher.codes.length > 0) {
            teacher.codes.forEach((c, index) => {
                const isUsed = c.used;
                const isMyDevice = c.deviceId === userDeviceId;
                const statusText = isUsed ? (isMyDevice ? '✅ جهازك' : '❌ جهاز آخر') : '🟢 متاح';
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code style="font-weight:700;color:${isUsed ? '#ef4444' : '#22c55e'};">${c.code}</code></td>
                        <td>${statusText}</td>
                        <td>
                            ${!isUsed ? `<button onclick="deleteThisCode(${deptIndex}, ${teacherIndex}, '${c.code}')" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;">🗑️</button>` : '—'}
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:1rem 0;">لا توجد أكواد</td></tr>`;
        }

        html += `</table>`;
        container.innerHTML = html;
    }

    // ===== GENERATE CODES =====
    window.generateCodes = function(count = 5) {
        const select = document.getElementById('codeTeacherSelect');
        const selectedOption = select.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(select.value);

        if (deptIndex === -1 || isNaN(teacherIndex)) {
            showToast('warning', '⚠️ يرجى اختيار مدرس أولاً');
            return;
        }

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '❌ المدرس غير موجود');
            return;
        }

        const newCodes = addNewCodes(teacher, count);
        showToast('success', `✅ تم إنشاء ${newCodes.length} أكواد جديدة`);
        updateCodesManagement();
        updateAdminSelects();
    };

    // ===== DELETE CODE =====
    window.deleteThisCode = function(deptIndex, teacherIndex, code) {
        if (!confirm(`⚠️ هل أنت متأكد من حذف الكود: ${code}؟`)) return;

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '❌ المدرس غير موجود');
            return;
        }

        if (deleteCode(teacher, code)) {
            showToast('success', `✅ تم حذف الكود: ${code}`);
            updateCodesManagement();
            updateAdminSelects();
        }
    };

    // =============================================
    // ADD TEACHER
    // =============================================
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
            codes: [],
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

    // =============================================
    // ADD SEMESTER
    // =============================================
    addSemesterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const teacherSelect = document.getElementById('semesterTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
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

    // =============================================
    // ADD LECTURE
    // =============================================
    addLectureForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const teacherSelect = document.getElementById('lectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
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

        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const message = document.getElementById('publishMessage');
        message.textContent = `✅ تم نشر ${pendingChanges} تغيير بنجاح!`;
        message.style.color = '#22c55e';
        
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
        console.log('📱 معرف الجهاز:', userDeviceId);
    });

})();