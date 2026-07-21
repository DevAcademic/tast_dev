(function() {
    'use strict';

    // ===== حماية =====
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
            (e.ctrlKey && (e.key === 'S' || e.key === 's'))) {
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

    document.addEventListener('selectstart', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    // ===== Supabase =====
    const SUPABASE_URL = 'https://mgcljgrkxhyjjmxqjkti.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_TE4fMQARKZb0XcjhAnEJhA_ws6AUxoi';
    let supabaseClient = null;
    if (window.supabase) {
        if (!window._supabaseClient) {
            window._supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        supabaseClient = window._supabaseClient;
    }

    let currentUser = null;
    let data = { sections: [] };
    let isDarkMode = false;
    let pendingChanges = 0;
    let activeTeacher = null;
    let activeTeacherIndex = null;
    let activeSectionIndex = null;
    let currentFilter = 'all';

    // ===== الأقسام الافتراضية =====
    const defaultSections = [
        { id: 'first-intermediate', name: 'أول متوسط', teachers: [] },
        { id: 'second-intermediate', name: 'ثاني متوسط', teachers: [] },
        { id: 'third-intermediate', name: 'ثالث متوسط', teachers: [] },
        { id: 'fourth-scientific', name: 'رابع علمي', teachers: [] },
        { id: 'fourth-literary', name: 'رابع أدبي', teachers: [] },
        { id: 'fifth-scientific', name: 'خامس علمي', teachers: [] },
        { id: 'fifth-literary', name: 'خامس أدبي', teachers: [] },
        { id: 'sixth-scientific', name: 'سادس علمي', teachers: [] },
        { id: 'sixth-literary', name: 'سادس أدبي', teachers: [] }
    ];

    // ===== DOM =====
    const loadingScreen = document.getElementById('loadingScreen');
    const topBar = document.getElementById('topBar');
    const bottomNav = document.getElementById('bottomNav');
    const footer = document.getElementById('footer');
    const teachersGridContainer = document.getElementById('teachersGridContainer');
    const teachersGridContainer2 = document.getElementById('teachersGridContainer2');
    const sectionFilter = document.getElementById('sectionFilter');
    const sectionFilter2 = document.getElementById('sectionFilter2');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const videoPlayer = document.getElementById('videoPlayer');
    const closePlayer = document.getElementById('closePlayer');
    const videoWrapper = document.getElementById('videoWrapper');
    const themeToggle = document.getElementById('themeToggle');
    const toastContainer = document.getElementById('toastContainer');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');

    // ===== Admin =====
    const adminPanel = document.getElementById('adminPanel');
    const adminClose = document.getElementById('adminClose');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const publishBtn = document.getElementById('publishBtn');
    const pendingChangesSpan = document.getElementById('pendingChanges');

    // ===== Forms =====
    const addSectionForm = document.getElementById('addSectionForm');
    const addTeacherForm = document.getElementById('addTeacherForm');
    const addSemesterForm = document.getElementById('addSemesterForm');
    const addLectureForm = document.getElementById('addLectureForm');
    const editTeacherForm = document.getElementById('editTeacherForm');

    // ===== Modals =====
    const teachersModal = document.getElementById('teachersModal');
    const closeTeachersModal = document.getElementById('closeTeachersModal');
    const teachersList = document.getElementById('teachersList');
    const semestersModal = document.getElementById('semestersModal');
    const closeSemestersModal = document.getElementById('closeSemestersModal');
    const semestersList = document.getElementById('semestersList');
    const modalTeacherTitle = document.getElementById('modalTeacherTitle');
    const lecturesModal = document.getElementById('lecturesModal');
    const closeLecturesModal = document.getElementById('closeLecturesModal');
    const lecturesList = document.getElementById('lecturesList');
    const modalSemesterTitle = document.getElementById('modalSemesterTitle');

    // ===== Bottom Nav =====
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');

    // ===== Account =====
    const accountName = document.getElementById('accountName');
    const accountEmail = document.getElementById('accountEmail');
    const accountAvatar = document.getElementById('accountAvatar');
    const accountPhone = document.getElementById('accountPhone');
    const accountRegistered = document.getElementById('accountRegistered');
    const accountCourses = document.getElementById('accountCourses');
    const accountCodes = document.getElementById('accountCodes');
    const accountTeachersCount = document.getElementById('accountTeachersCount');
    const logoutAccountBtn = document.getElementById('logoutAccountBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const coursesBadge = document.getElementById('coursesBadge');

    // ===== Edit Lecture =====
    const editLectureModal = document.getElementById('editLectureModal');
    const closeEditLecture = document.getElementById('closeEditLecture');
    const cancelEditLecture = document.getElementById('cancelEditLecture');
    const editLectureForm = document.getElementById('editLectureForm');
    const editLectureTitle = document.getElementById('editLectureTitle');
    const editLectureUrl = document.getElementById('editLectureUrl');
    const editLectureIsFree = document.getElementById('editLectureIsFree');
    const editLectureMessage = document.getElementById('editLectureMessage');

    let editTarget = { sectionIndex: -1, teacherIndex: -1, semesterIndex: -1, lectureIndex: -1 };

    // ============================================================
    // TOAST
    // ============================================================
    function showToast(type, message, duration = 3000) {
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

    // ============================================================
    // DEVICE ID
    // ============================================================
    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'DEV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }
    const userDeviceId = getDeviceId();

    // ============================================================
    // ACCESS
    // ============================================================
    function hasAccessToTeacher(teacher) {
        if (!teacher || !teacher.codes) return false;
        if (!currentUser) return false;
        return teacher.codes.some(c => c.used && c.userEmail === currentUser.email && !c.locked);
    }

    // ============================================================
    // ADMIN
    // ============================================================
    async function isUserAdmin(email) {
        if (!supabaseClient || !email) return false;
        try {
            const { data, error } = await supabaseClient
                .from('admins')
                .select('email')
                .eq('email', email)
                .maybeSingle();
            if (error) return false;
            return !!data;
        } catch (e) { return false; }
    }

    // ============================================================
    // CODE
    // ============================================================
    async function verifyCode(teacher, code) {
        if (!teacher.codes || teacher.codes.length === 0) {
            return { valid: false, message: 'لا توجد أكواد لهذا المدرس' };
        }
        if (!currentUser) {
            return { valid: false, message: '⚠️ يجب تسجيل الدخول أولاً' };
        }
        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) {
            return { valid: false, message: '❌ الكود غير صحيح' };
        }
        if (codeData.locked === true) {
            return { valid: false, message: '🔒 هذا الكود مقفل' };
        }
        if (codeData.used) {
            if (codeData.userEmail === currentUser.email) {
                return { valid: true, message: '✅ الكود مفعل على حسابك' };
            } else {
                const usedAt = codeData.usedAt ? new Date(codeData.usedAt).toLocaleString('ar') : 'وقت غير معروف';
                return { valid: false, message: `❌ هذا الكود مستخدم من قبل شخص آخر\n⏱️ ${usedAt}` };
            }
        }
        codeData.used = true;
        codeData.deviceId = userDeviceId;
        codeData.userId = currentUser.id;
        codeData.userEmail = currentUser.email;
        codeData.userName = currentUser.user_metadata?.full_name || null;
        codeData.userPhone = currentUser.user_metadata?.phone || null;
        codeData.usedAt = new Date().toISOString();
        saveData();

        // محاولة حفظ في Supabase
        if (supabaseClient) {
            try {
                await saveCodeToSupabase(teacher, codeData);
            } catch (e) {
                console.warn('⚠️ فشل حفظ الكود في Supabase:', e);
            }
        }

        await addCodeToUserCodes(currentUser.id, codeData.code);
        updateUserCodesStorage();
        renderAllData();
        renderMyCourses();
        renderAccount();
        updateBadge();

        return { valid: true, message: '✅ تم التفعيل بنجاح' };
    }

    async function saveCodeToSupabase(teacher, codeData) {
        if (!supabaseClient) return;
        try {
            const record = {
                code: codeData.code,
                teacher_id: teacher._id || null,
                teacher_name: teacher.name,
                is_used: true,
                is_locked: codeData.locked || false,
                user_id: currentUser.id,
                user_email: currentUser.email,
                user_name: currentUser.user_metadata?.full_name || null,
                user_phone: currentUser.user_metadata?.phone || null,
                device_id: userDeviceId,
                used_at: codeData.usedAt || new Date().toISOString()
            };
            
            const { error } = await supabaseClient
                .from('codes')
                .upsert(record, { onConflict: 'code' });
                
            if (error) {
                console.warn('⚠️ فشل حفظ الكود في Supabase:', error);
            } else {
                console.log('✅ تم حفظ الكود في Supabase:', codeData.code);
            }
        } catch (error) {
            console.warn('⚠️ خطأ في حفظ الكود:', error);
        }
    }

    async function addCodeToUserCodes(userId, code) {
        if (!supabaseClient) return;
        try {
            const { data: codeRecord, error: codeError } = await supabaseClient
                .from('codes').select('id').eq('code', code).single();
            if (codeError) return;
            const { data: existing, error: checkError } = await supabaseClient
                .from('user_codes').select('id').eq('user_id', userId).eq('code_id', codeRecord.id).maybeSingle();
            if (existing) return;
            await supabaseClient.from('user_codes').insert({
                user_id: userId,
                code_id: codeRecord.id,
                used_at: new Date().toISOString()
            });
        } catch (error) {}
    }

    function updateUserCodesStorage() {
        if (!currentUser) return;
        const userCodes = [];
        data.sections.forEach(section => {
            section.teachers.forEach(teacher => {
                if (teacher.codes) {
                    teacher.codes.forEach(code => {
                        if (code.used && code.userEmail === currentUser.email) {
                            userCodes.push({
                                code: code.code,
                                teacherName: teacher.name,
                                sectionName: section.name,
                                usedAt: code.usedAt
                            });
                        }
                    });
                }
            });
        });
        localStorage.setItem('userCodes_' + currentUser.email, JSON.stringify(userCodes));
    }

    // ============================================================
    // DATA - تحميل من Supabase أولاً
    // ============================================================
    function normalizeDataStructure(courseData) {
        if (!courseData || !Array.isArray(courseData.sections)) {
            courseData.sections = [];
        }
        courseData.sections.forEach(section => {
            if (!Array.isArray(section.teachers)) { section.teachers = []; }
            section.teachers.forEach(teacher => {
                if (!Array.isArray(teacher.codes)) { teacher.codes = []; }
                if (!Array.isArray(teacher.semesters)) { teacher.semesters = []; }
                teacher.codes.forEach(c => {
                    if (c.used === undefined) c.used = false;
                    if (c.locked === undefined) c.locked = false;
                    if (!('deviceId' in c)) c.deviceId = null;
                    if (!('usedAt' in c)) c.usedAt = null;
                    if (!('userId' in c)) c.userId = null;
                    if (!('userEmail' in c)) c.userEmail = null;
                    if (!('userName' in c)) c.userName = null;
                    if (!('userPhone' in c)) c.userPhone = null;
                });
                teacher.semesters.forEach(semester => {
                    if (!Array.isArray(semester.lectures)) { semester.lectures = []; }
                    semester.lectures.forEach(lecture => {
                        if (lecture.isFree === undefined) lecture.isFree = false;
                        if (!('youtubeUrl' in lecture)) lecture.youtubeUrl = '';
                        if (!('title' in lecture)) lecture.title = '';
                        if (lecture.number === undefined) lecture.number = 0;
                    });
                });
            });
        });
    }

    async function loadData() {
        try {
            // محاولة جلب البيانات من localStorage أولاً (أسرع)
            const savedData = localStorage.getItem('academyData');
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    if (parsed && parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
                        data = parsed;
                        normalizeDataStructure(data);
                        console.log('✅ تم تحميل البيانات من localStorage:', data.sections.length, 'أقسام');
                        
                        // جلب من Supabase في الخلفية
                        if (supabaseClient) {
                            loadFromSupabase();
                        }
                        return;
                    }
                } catch (e) {
                    console.warn('⚠️ بيانات localStorage فاسدة');
                }
            }

            // محاولة جلب من Supabase
            await loadFromSupabase();

        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            data = { sections: JSON.parse(JSON.stringify(defaultSections)) };
            normalizeDataStructure(data);
            localStorage.setItem('academyData', JSON.stringify(data));
        }
    }

    async function loadFromSupabase() {
        if (!supabaseClient) return;
        try {
            const remoteData = await getSupabaseAcademyData();
            if (remoteData && remoteData.sections && Array.isArray(remoteData.sections) && remoteData.sections.length > 0) {
                data = remoteData;
                normalizeDataStructure(data);
                localStorage.setItem('academyData', JSON.stringify(data));
                console.log('✅ تم تحميل البيانات من Supabase:', data.sections.length, 'أقسام');
                renderAllData();
                renderMyCourses();
                renderAccount();
                return true;
            }
        } catch (error) {
            console.warn('⚠️ فشل تحميل البيانات من Supabase:', error);
        }
        return false;
    }

    function saveData() {
        try {
            localStorage.setItem('academyData', JSON.stringify(data));
        } catch (error) {
            console.warn('⚠️ فشل حفظ البيانات محلياً');
        }
    }

    async function getSupabaseAcademyData() {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient
                .from('academy_data')
                .select('content')
                .eq('id', 'main')
                .maybeSingle();
            if (error) {
                console.warn('⚠️ فشل جلب البيانات من Supabase:', error);
                return null;
            }
            return data?.content || null;
        } catch (error) {
            console.warn('⚠️ خطأ في جلب البيانات:', error);
            return null;
        }
    }

    async function saveSupabaseAcademyData() {
        if (!supabaseClient) return { success: false };
        try {
            const record = {
                id: 'main',
                content: data,
                updated_at: new Date().toISOString()
            };
            const { error } = await supabaseClient
                .from('academy_data')
                .upsert(record, { onConflict: 'id' });
            if (error) {
                console.warn('⚠️ فشل حفظ البيانات في Supabase:', error);
                return { success: false };
            }
            console.log('✅ تم حفظ البيانات في Supabase');
            return { success: true };
        } catch (error) {
            console.warn('⚠️ خطأ في حفظ البيانات:', error);
            return { success: false };
        }
    }

    // ============================================================
    // TEACHERS
    // ============================================================
    function getAllTeachers() {
        const teachers = [];
        data.sections.forEach((section, sectionIndex) => {
            section.teachers.forEach((teacher, teacherIndex) => {
                teachers.push({
                    ...teacher,
                    _sectionIndex: sectionIndex,
                    _teacherIndex: teacherIndex,
                    _sectionName: section.name,
                    _sectionId: section.id
                });
            });
        });
        return teachers;
    }

    function getTeachersBySection(sectionId) {
        const section = data.sections.find(s => s.id === sectionId);
        if (!section) return [];
        return section.teachers.map((teacher, index) => ({
            ...teacher,
            _sectionIndex: data.sections.indexOf(section),
            _teacherIndex: index,
            _sectionName: section.name,
            _sectionId: section.id
        }));
    }

    function getFilteredTeachers() {
        if (currentFilter === 'all') return getAllTeachers();
        return getTeachersBySection(currentFilter);
    }

    function buildFilterButtons(container) {
        if (!container) return;
        let html = `<button class="filter-btn active" data-section="all" onclick="setFilter('all')">
            <span class="btn-icon">🏫</span> الكل
            <span class="btn-count">${getAllTeachers().length}</span>
        </button>`;
        data.sections.forEach(section => {
            const teacherCount = section.teachers ? section.teachers.length : 0;
            const isActive = currentFilter === section.id;
            html += `<button class="filter-btn ${isActive ? 'active' : ''}" data-section="${section.id}" onclick="setFilter('${section.id}')">
                <span class="btn-icon">📚</span> ${section.name}
                <span class="btn-count">${teacherCount}</span>
            </button>`;
        });
        container.innerHTML = html;
    }

    window.setFilter = function(sectionId) {
        currentFilter = sectionId;
        renderAllData();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionId);
        });
        const select = document.getElementById('classFilterSelect');
        if (select) select.value = sectionId;
    };

    function renderTeachers(teachers, container) {
        if (!container) return;
        if (!teachers || teachers.length === 0) {
            container.innerHTML = `
                <div class="empty-teachers">
                    <span class="empty-icon">👨‍🏫</span>
                    <h3>لا يوجد مدرسون</h3>
                    <p>${currentFilter === 'all' ? 'قم بإضافة مدرسين من لوحة التحكم' : 'لا يوجد مدرسون في هذا القسم'}</p>
                </div>
            `;
            return;
        }
        let html = `<div class="teachers-grid">`;
        teachers.forEach((teacher) => {
            const hasAccess = hasAccessToTeacher(teacher);
            const imageUrl = teacher.image || '';
            const emoji = teacher.emoji || '👨‍🏫';
            const name = teacher.name || 'مدرس';
            const subject = teacher.subject || '';
            const semestersCount = Array.isArray(teacher.semesters) ? teacher.semesters.length : 0;
            const sectionName = teacher._sectionName || '';
            html += `
                <div class="teacher-card" onclick="openTeacher(${teacher._sectionIndex}, ${teacher._teacherIndex})">
                    <div class="teacher-section-badge">${sectionName}</div>
                    <div class="teacher-card-image">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${name}" onerror="this.style.display='none'; this.parentElement.querySelector('.teacher-emoji').style.display='block';">` : ''}
                        <span class="teacher-emoji" style="${imageUrl ? 'display:none;' : 'display:block;'}">${emoji}</span>
                        ${hasAccess ? '<div class="teacher-badge">✅</div>' : ''}
                    </div>
                    <div class="teacher-card-info">
                        <h3>${name}</h3>
                        ${subject ? `<div class="teacher-subject">${subject}</div>` : ''}
                        <div class="teacher-stats">📚 ${semestersCount} فصول</div>
                    </div>
                    <div class="teacher-card-overlay">
                        <i class="fas fa-chevron-left"></i>
                        <span>عرض</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    function renderAllData() {
        const filteredTeachers = getFilteredTeachers();
        renderTeachers(filteredTeachers, teachersGridContainer);
        renderTeachers(filteredTeachers, teachersGridContainer2);
        buildFilterButtons(sectionFilter);
        buildFilterButtons(sectionFilter2);
        updateClassFilter();
    }

    // ============================================================
    // UPDATE CLASS FILTER
    // ============================================================
    function updateClassFilter() {
        var classFilterSelect = document.getElementById('classFilterSelect');
        if (!classFilterSelect) return;
        var currentValue = classFilterSelect.value;
        var options = '<option value="all" class="all-classes">🎯 جميع الصفوف</option>';
        if (data && data.sections) {
            data.sections.forEach(function(section) {
                var teacherCount = section.teachers ? section.teachers.length : 0;
                options += '<option value="' + section.id + '">📚 ' + section.name + ' (' + teacherCount + ')</option>';
            });
        }
        classFilterSelect.innerHTML = options;
        if (currentValue && data.sections.find(function(s) { return s.id === currentValue; })) {
            classFilterSelect.value = currentValue;
        }
    }

    window.filterByClass = function() {
        var select = document.getElementById('classFilterSelect');
        if (!select) return;
        currentFilter = select.value;
        renderAllData();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === currentFilter);
        });
    };

    // ============================================================
    // OPEN TEACHER
    // ============================================================
    window.openTeacher = function(sectionIndex, teacherIndex) {
        const section = data.sections[sectionIndex];
        if (!section) return;
        const teacher = section.teachers[teacherIndex];
        if (!teacher) return;

        activeTeacher = teacher;
        activeTeacherIndex = teacherIndex;
        activeSectionIndex = sectionIndex;

        const hasAccess = hasAccessToTeacher(teacher);
        modalTeacherTitle.textContent = `👨‍🏫 ${teacher.name} (${section.name})`;

        const semesters = Array.isArray(teacher.semesters) ? teacher.semesters : [];
        let html = '';

        semesters.forEach((semester, idx) => {
            const lectures = Array.isArray(semester.lectures) ? semester.lectures : [];
            const hasFreeLecture = lectures.some(l => l.isFree === true);
            const isLocked = !hasAccess && !hasFreeLecture;

            html += `
                <div class="semester-item ${isLocked ? 'locked' : ''}" 
                     onclick="${isLocked ? '' : `openLectures(${sectionIndex}, ${teacherIndex}, ${idx})`}">
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
                    <div class="code-box-mini" style="margin-top:0.8rem;background:var(--bg);padding:0.8rem;border-radius:var(--radius-sm);">
                        <p style="font-size:0.85rem;margin-bottom:0.3rem;">🔑 أدخل كود التفعيل لفتح جميع المحاضرات</p>
                        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                            <input type="password" id="codeInputTeacher" placeholder="أدخل الكود..." maxlength="20" style="flex:1;min-width:120px;padding:0.5rem 0.8rem;border:2px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text);font-size:0.9rem;outline:none;text-align:center;letter-spacing:2px;font-weight:700;font-family:monospace;" />
                            <button onclick="activateCodeFromTeacher()" style="padding:0.5rem 1.2rem;background:var(--primary-gradient);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">تفعيل</button>
                        </div>
                        <div id="codeMessageTeacher" style="margin-top:0.3rem;font-size:0.85rem;"></div>
                    </div>
                ` : ''}
            </div>
        `;

        semestersList.innerHTML = html;
        semestersModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.activateCodeFromTeacher = async function() {
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
        if (!currentUser) {
            codeMessage.innerHTML = '⚠️ يجب تسجيل الدخول أولاً';
            codeMessage.style.color = '#ef4444';
            showToast('error', '⚠️ يجب تسجيل الدخول أولاً');
            return;
        }

        const result = await verifyCode(activeTeacher, code);
        codeMessage.innerHTML = result.message;
        codeMessage.style.color = result.valid ? '#22c55e' : '#ef4444';

        if (result.valid) {
            showToast('success', '✅ تم التفعيل بنجاح!');
            renderAllData();
            renderMyCourses();
            renderAccount();
            updateBadge();
            updateUserCodesStorage();
            setTimeout(() => {
                if (activeSectionIndex !== null && activeTeacherIndex !== null) {
                    openTeacher(activeSectionIndex, activeTeacherIndex);
                }
            }, 1500);
        } else {
            showToast('error', '❌ ' + result.message);
        }
    };

    window.openLectures = function(sectionIndex, teacherIndex, semesterIndex) {
        const section = data.sections[sectionIndex];
        if (!section) return;
        const teacher = section.teachers[teacherIndex];
        if (!teacher) return;
        const semester = teacher.semesters[semesterIndex];
        if (!semester) return;

        const hasAccess = hasAccessToTeacher(teacher);
        modalSemesterTitle.textContent = `📖 الفصل ${semester.number} - ${teacher.name}`;

        let html = '';
        const lectures = Array.isArray(semester.lectures) ? semester.lectures : [];

        lectures.forEach((lecture) => {
            const isFree = lecture.isFree === true;
            const canWatch = isFree || hasAccess;
            const videoUrl = lecture.youtubeUrl || '';
            const isMediaDelivery = videoUrl.includes('mediadelivery');
            const videoIcon = isMediaDelivery ? 'fa-video' : 'fa-play-circle';

            html += `
                <div class="lecture-item ${canWatch ? '' : 'locked'}" 
                     onclick="${canWatch ? `playVideo('${videoUrl}', '${lecture.title}')` : ''}">
                    <div class="lecture-number">#${lecture.number}</div>
                    <div class="lecture-title">${lecture.title}</div>
                    <div class="lecture-status">
                        ${isFree ? '<span class="free-badge">🆓 مجانية</span>' : ''}
                        ${isMediaDelivery ? '<span style="font-size:0.6rem;color:var(--primary);margin-left:0.3rem;">📹</span>' : ''}
                        ${canWatch ? `<i class="fas ${videoIcon}" style="color:var(--primary);"></i>` : '<i class="fas fa-lock" style="color:#ef4444;"></i>'}
                    </div>
                </div>
            `;
        });

        lecturesList.innerHTML = html;
        lecturesModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // ============================================================
    // VIDEO PLAYER
    // ============================================================
    function extractVideoUrl(url) {
        if (!url) return '';
        if (url.includes('player.mediadelivery.net/play/')) return url;
        if (url.includes('player.mediadelivery.net/embed/')) return url;
        if (url.includes('mediadelivery.net')) return url;
        if (url.includes('<iframe')) {
            const match = url.match(/src=["']([^"']+)["']/);
            if (match) return match[1];
        }
        return url;
    }

    window.playVideo = function(url, title) {
        if (!url) {
            showToast('error', '❌ رابط الفيديو غير موجود');
            return;
        }

        let videoUrl = extractVideoUrl(url);

        if (videoUrl.includes('mediadelivery')) {
            if (!videoUrl.includes('autoplay')) {
                const separator = videoUrl.includes('?') ? '&' : '?';
                videoUrl = videoUrl + separator + 'autoplay=true&loop=false&muted=false&preload=true&responsive=true&controls=true';
            }
            videoWrapper.innerHTML = `
                <iframe src="${videoUrl}" 
                        style="border:0;position:absolute;top:0;left:0;height:100%;width:100%;" 
                        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen;"
                        allowfullscreen="true">
                </iframe>
            `;
            videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', `🎬 تشغيل: ${title || 'محاضرة'}`);
            return;
        }

        const videoId = extractYouTubeId(videoUrl);
        if (videoId) {
            const embedUrl = getYouTubeEmbedUrl(videoId);
            videoWrapper.innerHTML = `
                <iframe src="${embedUrl}" 
                        style="border:0;position:absolute;top:0;left:0;height:100%;width:100%;" 
                        allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen"
                        allowfullscreen>
                </iframe>
            `;
            videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', `🎬 تشغيل: ${title || 'محاضرة'}`);
            return;
        }

        showToast('error', '❌ رابط الفيديو غير صحيح');
    };

    function closeVideoPlayer() {
        if (videoWrapper) videoWrapper.innerHTML = '';
        if (videoPlayer) videoPlayer.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function extractYouTubeId(url) {
        if (!url) return null;
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

    // ============================================================
    // MY COURSES
    // ============================================================
    function getMyCourses() {
        if (!currentUser) return [];
        const courses = [];
        data.sections.forEach(section => {
            section.teachers.forEach((teacher, teacherIndex) => {
                if (teacher.codes) {
                    const hasAccess = teacher.codes.some(c => c.used && c.userEmail === currentUser.email && !c.locked);
                    if (hasAccess) {
                        courses.push({
                            teacherName: teacher.name,
                            teacherEmoji: teacher.emoji || '👨‍🏫',
                            teacherImage: teacher.image || '',
                            sectionName: section.name,
                            sectionIndex: data.sections.indexOf(section),
                            teacherIndex: teacherIndex,
                            codes: teacher.codes.filter(c => c.used && c.userEmail === currentUser.email)
                        });
                    }
                }
            });
        });
        return courses;
    }

    function renderMyCourses() {
        const container = document.getElementById('myCoursesContainer');
        const countSpan = document.getElementById('myCoursesCount');
        if (!container) return;

        const courses = getMyCourses();
        if (countSpan) countSpan.textContent = courses.length + ' دورة';

        if (courses.length === 0) {
            container.innerHTML = `
                <div class="empty-courses">
                    <span class="empty-icon">📚</span>
                    <h3>لم تشترك في أي دورة بعد</h3>
                    <p>استخدم كود التفعيل للاشتراك في دورات المدرسين</p>
                    <button class="btn-primary" onclick="navigateTo('teachers')">
                        <i class="fas fa-search"></i> استعراض المدرسين
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="my-courses-grid">';
        courses.forEach(course => {
            html += `
                <div class="course-card-mini" onclick="openTeacher(${course.sectionIndex}, ${course.teacherIndex})">
                    <div class="course-avatar">
                        ${course.teacherImage ? `<img src="${course.teacherImage}" />` : course.teacherEmoji}
                    </div>
                    <div class="course-name">${course.teacherName}</div>
                    <div class="course-meta">${course.sectionName} | ${course.codes.length} كود</div>
                    <div class="course-badge">✅ مشترك</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // ============================================================
    // ACCOUNT
    // ============================================================
    function renderAccount() {
        if (!currentUser) {
            accountName.textContent = 'غير مسجل';
            accountEmail.textContent = 'يرجى تسجيل الدخول';
            accountAvatar.textContent = '👤';
            if (accountPhone) accountPhone.style.display = 'none';
            accountRegistered.textContent = '--';
            accountCourses.textContent = '0';
            accountCodes.textContent = '0';
            if (accountTeachersCount) accountTeachersCount.textContent = '0';
            adminPanelBtn.style.display = 'none';
            return;
        }

        const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'مستخدم';
        const phone = currentUser.user_metadata?.phone || getUserPhone() || 'غير مسجل';
        accountName.textContent = name;
        accountEmail.textContent = currentUser.email;
        accountAvatar.textContent = name.charAt(0).toUpperCase();

        if (accountPhone) {
            accountPhone.textContent = '📱 ' + phone;
            accountPhone.style.display = 'block';
        }

        const registered = currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString('ar') : 'غير معروف';
        accountRegistered.textContent = 'مسجل منذ: ' + registered;

        const courses = getMyCourses();
        accountCourses.textContent = courses.length;

        let codesCount = 0;
        data.sections.forEach(section => {
            section.teachers.forEach(teacher => {
                if (teacher.codes) {
                    codesCount += teacher.codes.filter(c => c.used && c.userEmail === currentUser.email).length;
                }
            });
        });
        accountCodes.textContent = codesCount;

        const teachersCount = getUserTeachersCount();
        if (accountTeachersCount) accountTeachersCount.textContent = teachersCount;

        isUserAdmin(currentUser.email).then(isAdmin => {
            if (isAdmin) {
                adminPanelBtn.style.display = 'flex';
            } else {
                adminPanelBtn.style.display = 'none';
            }
        });
    }

    function getUserPhone() {
        const userData = localStorage.getItem('devAcademicUser');
        if (!userData) return null;
        try {
            const parsed = JSON.parse(userData);
            return parsed.phone || null;
        } catch (e) { return null; }
    }

    function getUserTeachersCount() {
        if (!currentUser) return 0;
        let count = 0;
        data.sections.forEach(section => {
            section.teachers.forEach(teacher => {
                if (teacher.codes) {
                    const hasAccess = teacher.codes.some(c => c.used && c.userEmail === currentUser.email && !c.locked);
                    if (hasAccess) count++;
                }
            });
        });
        return count;
    }

    function updateBadge() {
        const courses = getMyCourses();
        if (courses.length > 0) {
            coursesBadge.style.display = 'inline';
            coursesBadge.textContent = courses.length;
        } else {
            coursesBadge.style.display = 'none';
        }
    }

    // ============================================================
    // STUDENTS MANAGEMENT
    // ============================================================
    function getAllStudents() {
        const studentsMap = new Map();

        data.sections.forEach(section => {
            section.teachers.forEach(teacher => {
                if (teacher.codes) {
                    teacher.codes.forEach(c => {
                        if (c.used && c.userEmail) {
                            if (!studentsMap.has(c.userEmail)) {
                                studentsMap.set(c.userEmail, {
                                    email: c.userEmail,
                                    userId: c.userId || 'غير معروف',
                                    name: c.userName || 'غير معروف',
                                    phone: c.userPhone || 'غير مسجل',
                                    teachers: [],
                                    registeredAt: c.usedAt || new Date().toISOString()
                                });
                            }
                            if (!studentsMap.get(c.userEmail).teachers.includes(teacher.name)) {
                                studentsMap.get(c.userEmail).teachers.push(teacher.name);
                            }
                            if (c.userName && !studentsMap.get(c.userEmail).name) {
                                studentsMap.get(c.userEmail).name = c.userName;
                            }
                            if (c.userPhone && !studentsMap.get(c.userEmail).phone) {
                                studentsMap.get(c.userEmail).phone = c.userPhone;
                            }
                        }
                    });
                }
            });
        });

        return studentsMap;
    }

    function renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const students = getAllStudents();

        if (students.size === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;color:var(--text-light);padding:1.5rem 0;">
                        🧑‍🎓 لا يوجد طلاب مسجلين حتى الآن
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        let index = 1;

        students.forEach((student, email) => {
            const teachersCount = student.teachers.length;
            const registeredDate = student.registeredAt ? new Date(student.registeredAt).toLocaleDateString('ar') : 'غير معروف';

            html += `
                <tr>
                    <td>${index++}</td>
                    <td><strong>${student.name}</strong></td>
                    <td style="font-size:0.8rem;color:var(--text-light);">${email}</td>
                    <td dir="ltr" style="font-size:0.8rem;color:var(--text-light);">${student.phone}</td>
                    <td><span class="badge" style="background:var(--primary);color:white;padding:0.1rem 0.6rem;border-radius:20px;font-size:0.7rem;">${teachersCount}</span></td>
                    <td style="font-size:0.7rem;color:var(--text-light);">${registeredDate}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // ============================================================
    // NOTIFICATIONS
    // ============================================================
    async function loadNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        if (!supabaseClient || !currentUser) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;">⚠️ يرجى تسجيل الدخول</p>';
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p style="color:var(--text-light);text-align:center;">🔔 لا توجد إشعارات</p>';
                return;
            }

            let html = '';
            data.forEach(notif => {
                const isRead = notif.read ? '✅ مقروء' : '🆕 غير مقروء';
                const date = new Date(notif.created_at).toLocaleString('ar');
                html += `
                    <div class="notification-item" style="background:${notif.read ? 'var(--bg)' : 'var(--bg-hover)'};border-radius:8px;padding:0.5rem;margin-bottom:0.4rem;border:1px solid var(--border);">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="font-size:0.8rem;">${notif.title}</strong>
                            <span style="font-size:0.6rem;color:var(--text-light);">${date}</span>
                        </div>
                        <p style="font-size:0.75rem;color:var(--text-light);margin:0.2rem 0;">${notif.message}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.2rem;">
                            <span style="font-size:0.6rem;color:${notif.read ? '#22c55e' : '#f59e0b'};">${isRead}</span>
                            ${!notif.read ? `<button onclick="markNotificationRead('${notif.id}')" style="background:var(--primary);color:white;border:none;border-radius:4px;padding:0.1rem 0.5rem;font-size:0.6rem;cursor:pointer;">تحديد كمقروء</button>` : ''}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (error) {
            console.warn('⚠️ فشل تحميل الإشعارات:', error);
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;">❌ فشل تحميل الإشعارات</p>';
        }
    }

    window.markNotificationRead = async function(notificationId) {
        if (!supabaseClient) return;
        try {
            const { error } = await supabaseClient
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);
            if (error) throw error;
            showToast('success', '✅ تم تحديث الإشعار');
            loadNotifications();
        } catch (error) {
            showToast('error', '❌ فشل تحديث الإشعار');
        }
    };

    // ============================================================
    // AUTH - تسجيل الخروج
    // ============================================================
    async function signOut() {
        try {
            showToast('info', '⏳ جاري تسجيل الخروج...');
            
            localStorage.removeItem('devAcademicUser');
            localStorage.removeItem('academyData');
            
            if (supabaseClient) {
                try {
                    await supabaseClient.auth.signOut();
                } catch (e) {
                    console.warn('Supabase signOut error:', e);
                }
            }
            
            currentUser = null;
            activeTeacher = null;
            activeTeacherIndex = null;
            activeSectionIndex = null;
            
            if (adminPanel) adminPanel.classList.remove('active');
            if (semestersModal) semestersModal.classList.remove('active');
            if (lecturesModal) lecturesModal.classList.remove('active');
            if (teachersModal) teachersModal.classList.remove('active');
            if (editLectureModal) editLectureModal.classList.remove('active');
            
            showToast('success', '✅ تم تسجيل الخروج بنجاح');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 600);
            
        } catch (error) {
            console.error('SignOut error:', error);
            showToast('error', '❌ حدث خطأ أثناء تسجيل الخروج');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }

    // ============================================================
    // UPDATE UI
    // ============================================================
    function updateUI() {
        if (currentUser) {
            const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'مستخدم';
            userNameDisplay.textContent = name;
            userAvatar.textContent = name.charAt(0).toUpperCase();
        } else {
            userNameDisplay.textContent = 'غير مسجل';
            userAvatar.textContent = '👤';
        }
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    window.navigateTo = function(page) {
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
        const targetPage = document.getElementById('page-' + page);
        if (targetPage) targetPage.style.display = 'block';

        bottomNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        if (page === 'my-courses') {
            renderMyCourses();
            updateBadge();
        }
        if (page === 'account') {
            renderAccount();
        }
        if (page === 'teachers' || page === 'home') {
            renderAllData();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        var bannerSection = document.getElementById('bannerSection');
        if (bannerSection) {
            if (page === 'home') {
                bannerSection.style.display = 'block';
            } else {
                bannerSection.style.display = 'none';
            }
        }
    };

    // ============================================================
    // EVENTS
    // ============================================================
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(this.dataset.page);
        });
    });

    bottomNavItems.forEach(item => {
        item.addEventListener('click', function() {
            navigateTo(this.dataset.page);
        });
    });

    document.getElementById('userProfileBtn')?.addEventListener('click', function() {
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        navigateTo('account');
    });

    logoutAccountBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        signOut();
    });

    adminPanelBtn?.addEventListener('click', function() {
        if (!currentUser) {
            showToast('warning', '⚠️ يرجى تسجيل الدخول أولاً');
            return;
        }
        isUserAdmin(currentUser.email).then(isAdmin => {
            if (isAdmin) {
                adminPanel.classList.add('active');
                updateAllAdminSelects();
                updatePendingChanges();
                loadAdminsList();
                updateBannerPreview();
                loadNotifications();
                showToast('success', '🔓 مرحباً بك في لوحة التحكم');
            } else {
                showToast('error', '❌ غير مصرح لك بالدخول');
            }
        });
    });

    adminClose?.addEventListener('click', function() {
        adminPanel.classList.remove('active');
    });

    // ============================================================
    // THEME
    // ============================================================
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('devAcademicTheme', isDarkMode ? 'dark' : 'light');
        showToast('info', isDarkMode ? '🌙 تم تفعيل الوضع المظلم' : '☀️ تم تفعيل الوضع الفاتح');
    }
    themeToggle.addEventListener('click', toggleTheme);

    // ============================================================
    // SEARCH
    // ============================================================
    function applyFilters() {
        const term = searchInput.value.trim().toLowerCase();
        if (term === '') { renderAllData(); return; }
        const allTeachers = getAllTeachers();
        const filtered = allTeachers.filter(t =>
            t.name.toLowerCase().includes(term) ||
            (t.subject && t.subject.toLowerCase().includes(term)) ||
            (t.description && t.description.toLowerCase().includes(term)) ||
            (t._sectionName && t._sectionName.toLowerCase().includes(term))
        );
        renderTeachers(filtered, teachersGridContainer);
        renderTeachers(filtered, teachersGridContainer2);
    }
    searchBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') applyFilters();
    });

    // ============================================================
    // MODALS
    // ============================================================
    function closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    closeTeachersModal?.addEventListener('click', () => closeModal(teachersModal));
    closeSemestersModal?.addEventListener('click', () => closeModal(semestersModal));
    closeLecturesModal?.addEventListener('click', () => closeModal(lecturesModal));

    teachersModal?.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
    });
    semestersModal?.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
    });
    lecturesModal?.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
    });

    closePlayer.addEventListener('click', closeVideoPlayer);
    videoPlayer.addEventListener('click', function(e) {
        if (e.target === this) closeVideoPlayer();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (videoPlayer.classList.contains('active')) closeVideoPlayer();
            if (teachersModal.classList.contains('active')) closeModal(teachersModal);
            if (semestersModal.classList.contains('active')) closeModal(semestersModal);
            if (lecturesModal.classList.contains('active')) closeModal(lecturesModal);
            if (editLectureModal.classList.contains('active')) closeEditLectureModal();
            if (adminPanel.classList.contains('active')) adminPanel.classList.remove('active');
        }
    });

    // ============================================================
    // ADMIN FUNCTIONS
    // ============================================================
    function updateAllAdminSelects() {
        const selectIds = [
            'teacherSection', 'semesterSection', 'lectureSection',
            'codeSection', 'editTeacherSection', 'editLectureSection',
            'deleteSection', 'deleteTeacherSection', 'deleteSemesterSection',
            'deleteLectureSection'
        ];
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const currentValue = select.value;
            let options = '<option value="">اختر القسم...</option>';
            data.sections.forEach((s, i) => {
                options += `<option value="${i}">${s.name}</option>`;
            });
            select.innerHTML = options;
            if (currentValue && data.sections[parseInt(currentValue)]) {
                select.value = currentValue;
            }
        });

        updateTeacherSelects();
        updateSemesterSelects();
        updateLectureSelects();
        updateCodesManagement();
    }

    function updateTeacherSelects() {
        const teacherSelects = [
            { selectId: 'semesterTeacher', sectionId: 'semesterSection' },
            { selectId: 'lectureTeacher', sectionId: 'lectureSection' },
            { selectId: 'editTeacherSelect', sectionId: 'editTeacherSection' },
            { selectId: 'editLectureTeacher', sectionId: 'editLectureSection' },
            { selectId: 'deleteTeacherSelect', sectionId: 'deleteTeacherSection' },
            { selectId: 'deleteSemesterTeacher', sectionId: 'deleteSemesterSection' },
            { selectId: 'deleteLectureTeacher', sectionId: 'deleteLectureSection' },
            { selectId: 'codeTeacherSelect', sectionId: 'codeSection' }
        ];
        teacherSelects.forEach(({ selectId, sectionId }) => {
            const select = document.getElementById(selectId);
            const sectionSelect = document.getElementById(sectionId);
            if (!select || !sectionSelect) return;
            const sectionIndex = parseInt(sectionSelect.value);
            const currentValue = select.value;
            let options = '<option value="">اختر المدرس...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
                data.sections[sectionIndex].teachers.forEach((t, i) => {
                    options += `<option value="${i}">${t.name}</option>`;
                });
            }
            select.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
                select.value = currentValue;
            }
        });
    }

    function updateSemesterSelects() {
        const semesterSelects = [
            { selectId: 'lectureSemester', teacherId: 'lectureTeacher', sectionId: 'lectureSection' },
            { selectId: 'deleteSemesterSelect', teacherId: 'deleteSemesterTeacher', sectionId: 'deleteSemesterSection' },
            { selectId: 'deleteLectureSemester', teacherId: 'deleteLectureTeacher', sectionId: 'deleteLectureSection' },
            { selectId: 'editLectureSemester', teacherId: 'editLectureTeacher', sectionId: 'editLectureSection' }
        ];
        semesterSelects.forEach(({ selectId, teacherId, sectionId }) => {
            const select = document.getElementById(selectId);
            const teacherSelect = document.getElementById(teacherId);
            const sectionSelect = document.getElementById(sectionId);
            if (!select || !teacherSelect || !sectionSelect) return;
            const sectionIndex = parseInt(sectionSelect.value);
            const teacherIndex = parseInt(teacherSelect.value);
            const currentValue = select.value;
            let options = '<option value="">اختر الفصل...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 &&
                !isNaN(teacherIndex) && teacherIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[teacherIndex]) {
                const teacher = data.sections[sectionIndex].teachers[teacherIndex];
                if (teacher.semesters) {
                    teacher.semesters.forEach((s, i) => {
                        options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                    });
                }
            }
            select.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                !isNaN(teacherIndex) && teacherIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[parseInt(currentValue)]) {
                select.value = currentValue;
            }
        });
    }

    function updateLectureSelects() {
        const lectureSelects = [
            { selectId: 'editLectureSelect', semesterId: 'editLectureSemester', sectionId: 'editLectureSection', teacherId: 'editLectureTeacher' },
            { selectId: 'deleteLectureSelect', semesterId: 'deleteLectureSemester', sectionId: 'deleteLectureSection', teacherId: 'deleteLectureTeacher' }
        ];
        lectureSelects.forEach(({ selectId, semesterId, sectionId, teacherId }) => {
            const select = document.getElementById(selectId);
            const semesterSelect = document.getElementById(semesterId);
            const sectionSelect = document.getElementById(sectionId);
            const teacherSelect = document.getElementById(teacherId);
            if (!select || !semesterSelect || !sectionSelect || !teacherSelect) return;
            const sectionIndex = parseInt(sectionSelect.value);
            const teacherIndex = parseInt(teacherSelect.value);
            const semesterIndex = parseInt(semesterSelect.value);
            const currentValue = select.value;
            let options = '<option value="">اختر المحاضرة...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 &&
                !isNaN(teacherIndex) && teacherIndex >= 0 &&
                !isNaN(semesterIndex) && semesterIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures) {
                const lectures = data.sections[sectionIndex].teachers[teacherIndex].semesters[semesterIndex].lectures;
                lectures.forEach((l, i) => {
                    options += `<option value="${i}">#${l.number} - ${l.title}</option>`;
                });
            }
            select.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                !isNaN(teacherIndex) && teacherIndex >= 0 &&
                !isNaN(semesterIndex) && semesterIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures[parseInt(currentValue)]) {
                select.value = currentValue;
            }
        });
    }

    // ============================================================
    // CODES MANAGEMENT
    // ============================================================
    window.addManualCode = function() {
        const sectionSelect = document.getElementById('codeSection');
        const teacherSelect = document.getElementById('codeTeacherSelect');
        const codeInput = document.getElementById('manualCodeInput');
        const codeMessage = document.getElementById('manualCodeMessage');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const code = codeInput?.value.trim().toUpperCase();
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            codeMessage.innerHTML = '⚠️ يرجى اختيار القسم أولاً';
            codeMessage.style.color = '#f59e0b';
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            codeMessage.innerHTML = '⚠️ يرجى اختيار المدرس أولاً';
            codeMessage.style.color = '#f59e0b';
            return;
        }
        if (!code) {
            codeMessage.innerHTML = '⚠️ يرجى إدخال الكود';
            codeMessage.style.color = '#f59e0b';
            return;
        }
        if (code.length < 4) {
            codeMessage.innerHTML = '⚠️ الكود قصير جداً';
            codeMessage.style.color = '#f59e0b';
            return;
        }
        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
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
            locked: false,
            deviceId: null,
            userId: null,
            userEmail: null,
            userName: null,
            userPhone: null,
            usedAt: null
        });
        saveData();
        addChange();
        updateCodesManagement();
        if (codeInput) codeInput.value = '';
        codeMessage.innerHTML = `✅ تم إضافة الكود: ${code}`;
        codeMessage.style.color = '#22c55e';
        showToast('success', `✅ تم إضافة الكود: ${code}`);
        updateAllAdminSelects();
    };

    window.generateCodes = function(count = 5) {
        const sectionSelect = document.getElementById('codeSection');
        const teacherSelect = document.getElementById('codeTeacherSelect');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار القسم أولاً');
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار المدرس أولاً');
            return;
        }
        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        if (!teacher) { showToast('error', '❌ المدرس غير موجود'); return; }
        if (!teacher.codes) teacher.codes = [];
        const newCodes = [];
        for (let i = 0; i < count; i++) {
            const prefix = teacher.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let random = '';
            for (let j = 0; j < 8; j++) {
                random += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const newCode = `${prefix}-${random}`;
            teacher.codes.push({
                code: newCode,
                used: false,
                locked: false,
                deviceId: null,
                userId: null,
                userEmail: null,
                userName: null,
                userPhone: null,
                usedAt: null
            });
            newCodes.push(newCode);
        }
        saveData();
        addChange();
        updateCodesManagement();
        showToast('success', `✅ تم إنشاء ${newCodes.length} أكواد جديدة`);
        updateAllAdminSelects();
    };

    function updateCodesManagement() {
        const sectionSelect = document.getElementById('codeSection');
        const teacherSelect = document.getElementById('codeTeacherSelect');
        const container = document.getElementById('codesListContainer');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem 0;">اختر القسم أولاً</p>';
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem 0;">اختر المدرس أولاً</p>';
            return;
        }
        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
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
                <span>🔒 المقفلة: ${status.locked}</span>
            </div>
            <div class="codes-table-wrapper">
                <table class="codes-table">
                    <thead><tr><th>#</th><th>الكود</th><th>الحالة</th><th>المستخدم</th><th>تاريخ الاستخدام</th><th>الإجراءات</th></tr></thead>
                    <tbody>
        `;
        if (teacher.codes && teacher.codes.length > 0) {
            teacher.codes.forEach((c, index) => {
                const isUsed = c.used;
                const isLocked = c.locked || false;
                let statusText = '', statusColor = '#22c55e', usedAtDisplay = '—', userDisplay = '—';
                if (isLocked) { statusText = '🔒 مقفل';
                    statusColor = '#f59e0b'; } else if (isUsed) {
                    statusText = '✅ مستخدم';
                    statusColor = '#22c55e';
                    userDisplay = c.userName || c.userEmail || 'غير معروف';
                    usedAtDisplay = c.usedAt ? new Date(c.usedAt).toLocaleString('ar') : 'غير معروف';
                } else { statusText = '🟢 متاح';
                    statusColor = '#22c55e'; }
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code style="font-weight:700;color:${statusColor};">${c.code}</code></td>
                        <td><span style="color:${statusColor};">${statusText}</span></td>
                        <td style="font-size:0.7rem;color:var(--text-light);">${userDisplay}</td>
                        <td style="font-size:0.7rem;color:var(--text-light);">${usedAtDisplay}</td>
                        <td>
                            <button onclick="toggleCodeLock('${sectionIndex}', '${teacherIndex}', '${c.code}')" style="background:${isLocked ? '#22c55e' : '#f59e0b'};color:white;border:none;border-radius:4px;padding:0.15rem 0.5rem;cursor:pointer;font-size:0.7rem;">
                                ${isLocked ? '🔓 فتح' : '🔒 قفل'}
                            </button>
                            ${!isUsed && !isLocked ? `<button onclick="deleteCodeAction('${sectionIndex}', '${teacherIndex}', '${c.code}')" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.15rem 0.5rem;cursor:pointer;font-size:0.7rem;">🗑️</button>` : ''}
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:1rem 0;">لا توجد أكواد</td></tr>`;
        }
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }

    function getCodesStatus(teacher) {
        if (!teacher.codes) return { total: 0, used: 0, available: 0, locked: 0 };
        const total = teacher.codes.length;
        const used = teacher.codes.filter(c => c.used).length;
        const locked = teacher.codes.filter(c => c.locked).length;
        return { total, used, available: total - used, locked };
    }

    window.toggleCodeLock = function(sectionIndex, teacherIndex, code) {
        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) { showToast('error', '❌ المدرس غير موجود'); return; }
        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) { showToast('error', '❌ الكود غير موجود'); return; }
        codeData.locked = !codeData.locked;
        saveData();
        addChange();
        updateCodesManagement();
        showToast('success', `✅ تم ${codeData.locked ? 'قفل' : 'فتح'} الكود ${code}`);
    };

    window.deleteCodeAction = function(sectionIndex, teacherIndex, code) {
        if (!confirm(`⚠️ هل أنت متأكد من حذف الكود: ${code}؟`)) return;
        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) { showToast('error', '❌ المدرس غير موجود'); return; }
        const index = teacher.codes.findIndex(c => c.code === code);
        if (index === -1) { showToast('error', '❌ الكود غير موجود'); return; }
        if (teacher.codes[index].used) {
            showToast('warning', '⚠️ لا يمكن حذف كود مستخدم');
            return;
        }
        teacher.codes.splice(index, 1);
        saveData();
        addChange();
        updateCodesManagement();
        showToast('success', `✅ تم حذف الكود: ${code}`);
    };

    // ============================================================
    // EDIT TEACHER
    // ============================================================
    document.getElementById('editTeacherSection')?.addEventListener('change', function() {
        updateAllAdminSelects();
    });

    document.getElementById('editTeacherSelect')?.addEventListener('change', function() {
        updateEditTeacherData();
    });

    editTeacherForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const sectionSelect = document.getElementById('editTeacherSection');
        const teacherSelect = document.getElementById('editTeacherSelect');
        const messageEl = document.getElementById('editTeacherMessage');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            messageEl.innerHTML = '⚠️ يرجى اختيار القسم';
            messageEl.style.color = '#f59e0b';
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            messageEl.innerHTML = '⚠️ يرجى اختيار المدرس';
            messageEl.style.color = '#f59e0b';
            return;
        }
        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        if (!teacher) {
            messageEl.innerHTML = '❌ المدرس غير موجود';
            messageEl.style.color = '#ef4444';
            return;
        }
        const newName = document.getElementById('editTeacherName').value.trim();
        const newSubject = document.getElementById('editTeacherSubject').value.trim();
        const newDesc = document.getElementById('editTeacherDesc').value.trim();
        const newImage = document.getElementById('editTeacherImage').value.trim();
        if (!newName) {
            messageEl.innerHTML = '⚠️ يرجى إدخال اسم المدرس';
            messageEl.style.color = '#f59e0b';
            return;
        }
        teacher.name = newName;
        teacher.subject = newSubject || 'مدرس';
        teacher.description = newDesc || '';
        teacher.image = newImage || '';
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();
        messageEl.innerHTML = `✅ تم تعديل بيانات المدرس "${newName}" بنجاح!`;
        messageEl.style.color = '#22c55e';
        showToast('success', `✅ تم تعديل بيانات المدرس "${newName}"`);
    });

    // ============================================================
    // DELETE FUNCTIONS
    // ============================================================
    window.deleteSelectedSection = function() {
        const select = document.getElementById('deleteSection');
        const sectionIndex = parseInt(select?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار القسم');
            return;
        }
        const section = data.sections[sectionIndex];
        if (!section) { showToast('error', '❌ القسم غير موجود'); return; }
        if (!confirm(`⚠️ هل أنت متأكد من حذف القسم "${section.name}" وجميع محتوياته؟`)) return;
        data.sections.splice(sectionIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();
        const msg = document.getElementById('deleteSectionMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف القسم "${section.name}" بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف القسم "${section.name}"`);
    };

    window.deleteSelectedTeacherFromTab = function() {
        const sectionSelect = document.getElementById('deleteTeacherSection');
        const teacherSelect = document.getElementById('deleteTeacherSelect');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار القسم');
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار المدرس');
            return;
        }
        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        if (!teacher) { showToast('error', '❌ المدرس غير موجود'); return; }
        if (!confirm(`⚠️ هل أنت متأكد من حذف المدرس "${teacher.name}"؟`)) return;
        data.sections[sectionIndex].teachers.splice(teacherIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();
        const msg = document.getElementById('deleteTeacherMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف المدرس "${teacher.name}" بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف المدرس "${teacher.name}"`);
    };

    window.deleteSelectedSemesterFromTab = function() {
        const sectionSelect = document.getElementById('deleteSemesterSection');
        const teacherSelect = document.getElementById('deleteSemesterTeacher');
        const semesterSelect = document.getElementById('deleteSemesterSelect');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار القسم');
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار المدرس');
            return;
        }
        if (isNaN(semesterIndex) || semesterIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار الفصل');
            return;
        }
        const semester = data.sections[sectionIndex].teachers[teacherIndex]?.semesters[semesterIndex];
        if (!semester) { showToast('error', '❌ الفصل غير موجود'); return; }
        if (!confirm(`⚠️ هل أنت متأكد من حذف الفصل ${semester.number}؟`)) return;
        data.sections[sectionIndex].teachers[teacherIndex].semesters.splice(semesterIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();
        const msg = document.getElementById('deleteSemesterMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف الفصل ${semester.number} بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف الفصل ${semester.number}`);
        updateAllAdminSelects();
    };

    window.deleteSelectedLectureFromTab = function() {
        const sectionSelect = document.getElementById('deleteLectureSection');
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const semesterSelect = document.getElementById('deleteLectureSemester');
        const lectureSelect = document.getElementById('deleteLectureSelect');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        const lectureIndex = parseInt(lectureSelect?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار القسم');
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار المدرس');
            return;
        }
        if (isNaN(semesterIndex) || semesterIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار الفصل');
            return;
        }
        if (isNaN(lectureIndex) || lectureIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار المحاضرة');
            return;
        }
        const lecture = data.sections[sectionIndex].teachers[teacherIndex]?.semesters[semesterIndex]?.lectures[lectureIndex];
        if (!lecture) { showToast('error', '❌ المحاضرة غير موجودة'); return; }
        if (!confirm(`⚠️ هل أنت متأكد من حذف المحاضرة "${lecture.title}"؟`)) return;
        data.sections[sectionIndex].teachers[teacherIndex].semesters[semesterIndex].lectures.splice(lectureIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();
        const msg = document.getElementById('deleteLectureMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف المحاضرة "${lecture.title}" بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف المحاضرة "${lecture.title}"`);
        updateAllAdminSelects();
    };

    // ============================================================
    // EDIT LECTURE
    // ============================================================
    function openEditLecture(sectionIndex, teacherIndex, semesterIndex, lectureIndex) {
        const section = data.sections[sectionIndex];
        if (!section) return;
        const teacher = section.teachers[teacherIndex];
        if (!teacher) return;
        const semester = teacher.semesters[semesterIndex];
        if (!semester) return;
        const lecture = semester.lectures[lectureIndex];
        if (!lecture) return;
        editTarget = { sectionIndex, teacherIndex, semesterIndex, lectureIndex };
        editLectureTitle.value = lecture.title || '';
        editLectureUrl.value = lecture.youtubeUrl || '';
        editLectureIsFree.value = lecture.isFree ? 'true' : 'false';
        document.querySelector('#editLectureModal h2').textContent = `✏️ تعديل المحاضرة #${lecture.number}`;
        const infoSpan = document.getElementById('editLectureInfo');
        infoSpan.textContent = `📚 ${section.name} | 👨‍🏫 ${teacher.name} | 📖 الفصل ${semester.number}`;
        editLectureMessage.innerHTML = '';
        editLectureModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    window.openEditLectureFromAdmin = function() {
        const sectionSelect = document.getElementById('editLectureSection');
        const teacherSelect = document.getElementById('editLectureTeacher');
        const semesterSelect = document.getElementById('editLectureSemester');
        const lectureSelect = document.getElementById('editLectureSelect');
        const messageEl = document.getElementById('editLectureAdminMessage');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        const lectureIndex = parseInt(lectureSelect?.value);
        if (isNaN(sectionIndex) || sectionIndex < 0) {
            messageEl.innerHTML = '⚠️ يرجى اختيار القسم';
            messageEl.style.color = '#f59e0b';
            return;
        }
        if (isNaN(teacherIndex) || teacherIndex < 0) {
            messageEl.innerHTML = '⚠️ يرجى اختيار المدرس';
            messageEl.style.color = '#f59e0b';
            return;
        }
        if (isNaN(semesterIndex) || semesterIndex < 0) {
            messageEl.innerHTML = '⚠️ يرجى اختيار الفصل';
            messageEl.style.color = '#f59e0b';
            return;
        }
        if (isNaN(lectureIndex) || lectureIndex < 0) {
            messageEl.innerHTML = '⚠️ يرجى اختيار المحاضرة';
            messageEl.style.color = '#f59e0b';
            return;
        }
        const lecture = data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures[lectureIndex];
        if (!lecture) {
            messageEl.innerHTML = '❌ المحاضرة غير موجودة';
            messageEl.style.color = '#ef4444';
            return;
        }
        messageEl.innerHTML = '';
        openEditLecture(sectionIndex, teacherIndex, semesterIndex, lectureIndex);
    };

    editLectureForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const { sectionIndex, teacherIndex, semesterIndex, lectureIndex } = editTarget;
        if (sectionIndex === -1 || teacherIndex === -1 || semesterIndex === -1 || lectureIndex === -1) {
            editLectureMessage.innerHTML = '⚠️ لم يتم تحديد المحاضرة بشكل صحيح';
            editLectureMessage.style.color = '#f59e0b';
            return;
        }
        const newTitle = editLectureTitle.value.trim();
        const newUrl = editLectureUrl.value.trim();
        const newIsFree = editLectureIsFree.value === 'true';
        if (!newTitle) {
            editLectureMessage.innerHTML = '⚠️ يرجى إدخال عنوان المحاضرة';
            editLectureMessage.style.color = '#f59e0b';
            return;
        }
        if (!newUrl) {
            editLectureMessage.innerHTML = '⚠️ يرجى إدخال رابط الفيديو';
            editLectureMessage.style.color = '#f59e0b';
            return;
        }
        const isValidUrl = newUrl.includes('mediadelivery') ||
            newUrl.includes('youtube') ||
            newUrl.includes('youtu.be') ||
            newUrl.includes('player.') ||
            newUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i);
        if (!isValidUrl) {
            editLectureMessage.innerHTML = '⚠️ رابط الفيديو غير صحيح';
            editLectureMessage.style.color = '#f59e0b';
            return;
        }
        const lecture = data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures[lectureIndex];
        if (!lecture) {
            editLectureMessage.innerHTML = '❌ المحاضرة غير موجودة';
            editLectureMessage.style.color = '#ef4444';
            return;
        }
        lecture.title = newTitle;
        lecture.youtubeUrl = newUrl;
        lecture.isFree = newIsFree;
        saveData();
        renderAllData();
        addChange();
        editLectureMessage.innerHTML = '✅ تم تعديل المحاضرة بنجاح!';
        editLectureMessage.style.color = '#22c55e';
        showToast('success', `✅ تم تعديل المحاضرة "${newTitle}" بنجاح`);
        setTimeout(() => { closeEditLectureModal(); }, 1200);
    });

    function closeEditLectureModal() {
        editLectureModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        editTarget = { sectionIndex: -1, teacherIndex: -1, semesterIndex: -1, lectureIndex: -1 };
        if (editLectureMessage) editLectureMessage.innerHTML = '';
    }

    closeEditLecture?.addEventListener('click', closeEditLectureModal);
    cancelEditLecture?.addEventListener('click', closeEditLectureModal);
    editLectureModal?.addEventListener('click', function(e) {
        if (e.target === this) closeEditLectureModal();
    });

    // ============================================================
    // ADMIN MANAGEMENT
    // ============================================================
    window.addNewAdmin = async function() {
        const emailInput = document.getElementById('adminEmailInput');
        const messageEl = document.getElementById('addAdminMessage');
        const email = emailInput.value.trim();
        if (!email) {
            messageEl.innerHTML = '⚠️ يرجى إدخال البريد الإلكتروني';
            messageEl.style.color = '#f59e0b';
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            messageEl.innerHTML = '⚠️ البريد الإلكتروني غير صحيح';
            messageEl.style.color = '#f59e0b';
            return;
        }
        if (!supabaseClient) {
            messageEl.innerHTML = '❌ Supabase غير متاح';
            messageEl.style.color = '#ef4444';
            return;
        }
        try {
            let { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('id, email')
                .eq('email', email)
                .maybeSingle();
            if (!userData) {
                messageEl.innerHTML = `⚠️ المستخدم <strong>${email}</strong> غير موجود. <br><br>
                    <button onclick="fixUserAndAddAdmin('${email}')" style="background:var(--primary);color:white;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">
                        <i class="fas fa-sync"></i> إصلاح المشكلة
                    </button>
                `;
                messageEl.style.color = '#f59e0b';
                return;
            }
            const { data: existingAdmin, error: checkError } = await supabaseClient
                .from('admins')
                .select('email')
                .eq('email', email)
                .maybeSingle();
            if (existingAdmin) {
                messageEl.innerHTML = '⚠️ هذا المستخدم مشرف بالفعل';
                messageEl.style.color = '#f59e0b';
                return;
            }
            const { error: insertError } = await supabaseClient
                .from('admins')
                .insert({ uid: userData.id, email: email, role: 'admin' });
            if (insertError) {
                messageEl.innerHTML = '❌ فشل الإضافة: ' + insertError.message;
                messageEl.style.color = '#ef4444';
                return;
            }
            messageEl.innerHTML = `✅ تم إضافة المشرف: ${email} بنجاح!`;
            messageEl.style.color = '#22c55e';
            emailInput.value = '';
            showToast('success', `✅ تم إضافة المشرف: ${email}`);
            loadAdminsList();
        } catch (error) {
            messageEl.innerHTML = '❌ حدث خطأ: ' + error.message;
            messageEl.style.color = '#ef4444';
        }
    };

    window.fixUserAndAddAdmin = async function(email) {
        const messageEl = document.getElementById('addAdminMessage');
        if (!supabaseClient) {
            messageEl.innerHTML = '❌ Supabase غير متاح';
            messageEl.style.color = '#ef4444';
            return;
        }
        try {
            const { data: result, error: rpcError } = await supabaseClient
                .rpc('add_user_and_admin', { p_email: email });
            if (rpcError) {
                messageEl.innerHTML = `❌ فشل: ${rpcError.message}`;
                messageEl.style.color = '#ef4444';
                return;
            }
            if (result && result.success) {
                messageEl.innerHTML = `✅ تم إضافة المستخدم <strong>${email}</strong> كمشرف بنجاح!`;
                messageEl.style.color = '#22c55e';
                showToast('success', `✅ تم إضافة المشرف: ${email}`);
                loadAdminsList();
            } else {
                messageEl.innerHTML = '❌ ' + (result?.message || 'حدث خطأ غير معروف');
                messageEl.style.color = '#ef4444';
            }
        } catch (error) {
            messageEl.innerHTML = '❌ حدث خطأ: ' + error.message;
            messageEl.style.color = '#ef4444';
        }
    };

    async function loadAdminsList() {
        const container = document.getElementById('adminsListContainer');
        if (!container) return;
        if (!supabaseClient) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;">⚠️ Supabase غير متاح</p>';
            return;
        }
        try {
            const { data: admins, error } = await supabaseClient
                .from('admins')
                .select('email, uid, created_at')
                .order('created_at', { ascending: true });
            if (error) {
                container.innerHTML = '<p style="color:var(--text-light);text-align:center;">❌ فشل تحميل المشرفين</p>';
                return;
            }
            if (!admins || admins.length === 0) {
                container.innerHTML = '<p style="color:var(--text-light);text-align:center;">لا يوجد مشرفين حتى الآن</p>';
                return;
            }
            let html = `
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                        <thead>
                            <tr style="background:var(--primary-gradient);color:white;">
                                <th style="padding:0.5rem;text-align:right;">#</th>
                                <th style="padding:0.5rem;text-align:right;">البريد الإلكتروني</th>
                                <th style="padding:0.5rem;text-align:right;">تاريخ الإضافة</th>
                                <th style="padding:0.5rem;text-align:center;">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            admins.forEach((admin, index) => {
                const isCurrentUser = admin.email === currentUser?.email;
                const createdAt = admin.created_at ? new Date(admin.created_at).toLocaleDateString('ar') : 'غير معروف';
                html += `
                    <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:0.4rem 0.5rem;">${index + 1}</td>
                        <td style="padding:0.4rem 0.5rem;">${admin.email} ${isCurrentUser ? '👑 (أنت)' : ''}</td>
                        <td style="padding:0.4rem 0.5rem;color:var(--text-light);font-size:0.75rem;">${createdAt}</td>
                        <td style="padding:0.4rem 0.5rem;text-align:center;">
                            ${!isCurrentUser ? `<button onclick="deleteAdmin('${admin.email}')" class="btn-delete-admin">🗑️ حذف</button>` : '<span style="color:var(--text-light);font-size:0.7rem;">لا يمكن حذف نفسك</span>'}
                        </td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;">❌ فشل تحميل المشرفين</p>';
        }
    }

    window.deleteAdmin = async function(email) {
        if (!confirm(`⚠️ هل أنت متأكد من حذف المشرف: ${email}؟`)) return;
        if (!supabaseClient) {
            showToast('error', '❌ Supabase غير متاح');
            return;
        }
        try {
            const { error } = await supabaseClient
                .from('admins')
                .delete()
                .eq('email', email);
            if (error) {
                showToast('error', '❌ فشل حذف المشرف: ' + error.message);
                return;
            }
            showToast('success', `✅ تم حذف المشرف: ${email}`);
            loadAdminsList();
        } catch (error) {
            showToast('error', '❌ حدث خطأ: ' + error.message);
        }
    };

    // ============================================================
    // PUBLISH
    // ============================================================
    publishBtn?.addEventListener('click', async function() {
        if (pendingChanges === 0) {
            showToast('info', '📌 لا توجد تغييرات لنشرها');
            return;
        }
        if (!supabaseClient) {
            showToast('error', '❌ Supabase غير متاح');
            return;
        }
        const isAdmin = await isUserAdmin(currentUser?.email);
        if (!isAdmin) {
            showToast('error', '❌ يجب تسجيل الدخول كمشرف');
            return;
        }
        const result = await saveSupabaseAcademyData();
        if (!result.success) {
            showToast('error', '❌ فشل النشر: ' + (result.error?.message || 'خطأ غير معروف'));
            return;
        }
        pendingChanges = 0;
        updatePendingChanges();
        showToast('success', '✅ تم نشر التغييرات بنجاح');
        const msg = document.getElementById('publishMessage');
        if (msg) { msg.textContent = '✅ تم نشر التغييرات بنجاح';
            msg.style.color = '#22c55e'; }
        setTimeout(() => { if (msg) msg.textContent = ''; }, 5000);
    });

    // ============================================================
    // TAB EVENTS
    // ============================================================
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + this.dataset.tab).classList.add('active');

            if (this.dataset.tab === 'manage-codes') {
                updateAllAdminSelects();
                updateCodesManagement();
            }
            if (this.dataset.tab === 'delete') {
                updateAllAdminSelects();
            }
            if (this.dataset.tab === 'edit-lecture') {
                updateAllAdminSelects();
            }
            if (this.dataset.tab === 'users') {
                renderUsersTable();
            }
            if (this.dataset.tab === 'add-admin') {
                loadAdminsList();
            }
            if (this.dataset.tab === 'edit-teacher') {
                updateAllAdminSelects();
            }
            if (this.dataset.tab === 'banner') {
                updateBannerPreview();
            }
            if (this.dataset.tab === 'notifications') {
                loadNotifications();
            }
            if (this.dataset.tab === 'add-teacher' || this.dataset.tab === 'add-semester' ||
                this.dataset.tab === 'add-lecture' || this.dataset.tab === 'add-section') {
                updateAllAdminSelects();
            }
        });
    });

    // ============================================================
    // BANNER MANAGEMENT - حفظ في localStorage و Supabase
    // ============================================================
    function updateBannerPreview() {
        var savedImage = localStorage.getItem('bannerImage');
        var img = document.getElementById('adminBannerImage');
        var placeholder = document.getElementById('adminBannerPlaceholder');
        var mainImg = document.getElementById('mainBannerImage');
        var mainPlaceholder = document.getElementById('mainBannerPlaceholder');

        if (savedImage) {
            if (img) {
                img.src = savedImage;
                img.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (mainImg) {
                mainImg.src = savedImage;
                mainImg.style.display = 'block';
            }
            if (mainPlaceholder) mainPlaceholder.style.display = 'none';
        } else {
            if (img) img.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
            if (mainImg) mainImg.style.display = 'none';
            if (mainPlaceholder) mainPlaceholder.style.display = 'flex';
        }
    }

    window.updateBannerImage = function() {
        var urlInput = document.getElementById('bannerImageInput');
        var message = document.getElementById('bannerMessage');
        var url = urlInput.value.trim();
        
        if (!url) {
            message.innerHTML = '⚠️ يرجى إدخال رابط الصورة';
            message.style.color = '#f59e0b';
            return;
        }
        
        try { 
            new URL(url); 
        } catch (e) {
            message.innerHTML = '⚠️ الرابط غير صحيح';
            message.style.color = '#f59e0b';
            return;
        }
        
        // حفظ في localStorage
        localStorage.setItem('bannerImage', url);
        updateBannerPreview();
        message.innerHTML = '✅ تم تحديث صورة البانر بنجاح';
        message.style.color = '#22c55e';
        showToast('success', '✅ تم تحديث صورة البانر');
        urlInput.value = '';
        
        // حفظ في Supabase
        if (supabaseClient && currentUser) {
            saveBannerToSupabase(url);
        }
    };

    async function saveBannerToSupabase(url) {
        try {
            const { error } = await supabaseClient
                .from('academy_data')
                .upsert({
                    id: 'banner',
                    content: { image_url: url, updated_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
                
            if (error) {
                console.warn('⚠️ فشل حفظ البانر في Supabase:', error);
            } else {
                console.log('✅ تم حفظ البانر في Supabase');
            }
        } catch (error) {
            console.warn('⚠️ خطأ في حفظ البانر:', error);
        }
    }

    async function loadBannerFromSupabase() {
        if (!supabaseClient) return;
        try {
            const { data, error } = await supabaseClient
                .from('academy_data')
                .select('content')
                .eq('id', 'banner')
                .maybeSingle();
                
            if (error) {
                console.warn('⚠️ فشل جلب البانر:', error);
                return;
            }
            
            if (data?.content?.image_url) {
                localStorage.setItem('bannerImage', data.content.image_url);
                updateBannerPreview();
                console.log('✅ تم تحميل البانر من Supabase');
            }
        } catch (error) {
            console.warn('⚠️ خطأ في جلب البانر:', error);
        }
    }

    window.removeBannerImage = function() {
        if (!confirm('⚠️ هل أنت متأكد من حذف صورة البانر؟')) return;
        localStorage.removeItem('bannerImage');
        updateBannerPreview();
        showToast('success', '✅ تم حذف صورة البانر');
        
        // حذف من Supabase
        if (supabaseClient) {
            try {
                supabaseClient
                    .from('academy_data')
                    .delete()
                    .eq('id', 'banner')
                    .then(({ error }) => {
                        if (!error) console.log('✅ تم حذف البانر من Supabase');
                    });
            } catch (e) {}
        }
    };

    // ============================================================
    // SCROLL
    // ============================================================
    window.addEventListener('scroll', function() {
        // تم إزالة تأثير الـ navbar لأنه صار top-bar
    });

    // ============================================================
    // INIT
    // ============================================================
    const savedTheme = localStorage.getItem('devAcademicTheme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    async function init() {
        try {
            // التحقق من الجلسة
            if (supabaseClient) {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session?.user) {
                    currentUser = session.user;
                    localStorage.setItem('devAcademicUser', JSON.stringify({
                        email: currentUser.email,
                        name: currentUser.user_metadata?.full_name || '',
                        phone: currentUser.user_metadata?.phone || ''
                    }));
                    updateUI();
                    
                    // تحميل البانر من Supabase
                    await loadBannerFromSupabase();
                    
                    // تحميل البيانات وعرضها
                    await loadData();
                    renderAllData();
                    renderMyCourses();
                    renderAccount();
                    updateBadge();

                    // إخفاء التحميل وإظهار الواجهة
                    loadingScreen.style.display = 'none';
                    topBar.style.display = 'flex';
                    bottomNav.style.display = 'flex';
                    footer.style.display = 'block';

                    navigateTo('home');
                    showToast('success', '✅ مرحباً بعودتك');
                    console.log('👤 المستخدم:', currentUser.email);
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Init error:', error);
            window.location.href = 'index.html';
        }

        // الإشتراك في التحديثات
        if (supabaseClient && currentUser) {
            try {
                const channel = supabaseClient
                    .channel('public:academy_data')
                    .on('postgres_changes', { 
                        event: 'UPDATE', 
                        schema: 'public', 
                        table: 'academy_data',
                        filter: 'id=eq.main' 
                    }, (payload) => {
                        if (!payload?.new?.content) return;
                        try {
                            const remoteData = payload.new.content;
                            if (JSON.stringify(remoteData) !== JSON.stringify(data)) {
                                data = remoteData;
                                normalizeDataStructure(data);
                                saveData();
                                renderAllData();
                                renderMyCourses();
                                renderAccount();
                                updateBadge();
                                showToast('info', '🔄 تم تحديث البيانات تلقائياً');
                            }
                        } catch (err) { 
                            console.warn('Realtime parse error:', err); 
                        }
                    })
                    .subscribe();
                console.log('✅ مشترك في تحديثات Supabase');
            } catch (error) {
                console.warn('Supabase realtime error:', error);
            }
        }

        // تحديث الجداول والقوائم
        renderUsersTable();
        updateAllAdminSelects();
        loadAdminsList();
        updateBannerPreview();

        console.log('📚 ديف أكاديمي - النظام جاهز');
        console.log('📢 نظام الإشعارات مفعل');
        console.log('📱 يتم حفظ بيانات الطلاب مع رقم الهاتف');
        console.log('🖼️ البانر محفوظ في قاعدة البيانات');
    }

    // بدء التطبيق
    loadData().then(init).catch((error) => {
        console.error('Initialization failed:', error);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });

})();