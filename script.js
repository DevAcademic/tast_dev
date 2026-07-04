(function() {
    'use strict';

    // =============================================
    // بيانات تسجيل الدخول للإدارة
    // =============================================
    const ADMIN_EMAIL = 'zzccvc99@gmail.com';
    const ADMIN_PASSWORD = 'vcxz4321cczzvv';

    // =============================================
    // Supabase Config
    // =============================================
    const SUPABASE_URL = 'https://mgcljgrkxhyjjmxqjkti.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_TE4fMQARKZb0XcjhAnEJhA_ws6AUxoi';
    
    let supabaseClient = null;
    let currentUser = null;

    // تهيئة Supabase
    if (typeof supabase !== 'undefined') {
        if (!window._supabaseClient) {
            window._supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        supabaseClient = window._supabaseClient;
    }

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
    const userStatusElement = document.getElementById('userStatus');

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

    // ===== EDIT LECTURE MODAL =====
    const editLectureModal = document.getElementById('editLectureModal');
    const closeEditLecture = document.getElementById('closeEditLecture');
    const cancelEditLecture = document.getElementById('cancelEditLecture');
    const editLectureForm = document.getElementById('editLectureForm');
    const editLectureTitle = document.getElementById('editLectureTitle');
    const editLectureUrl = document.getElementById('editLectureUrl');
    const editLectureIsFree = document.getElementById('editLectureIsFree');
    const editLectureMessage = document.getElementById('editLectureMessage');

    let editTarget = {
        deptIndex: -1,
        teacherIndex: -1,
        semesterIndex: -1,
        lectureIndex: -1
    };

    // =============================================
    // DEVICE ID
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
    // نظام الأكواد - حفظ تلقائي في السحابة وقفل الكود
    // =============================================

    function hasAccessToTeacher(teacher) {
        if (!teacher || !teacher.codes) return false;
        const savedAccess = localStorage.getItem('teacherAccess_' + teacher.name);
        if (savedAccess === 'true') return true;
        const hasAccess = teacher.codes.some(c => c.used && c.deviceId === userDeviceId && !c.locked);
        if (hasAccess) {
            localStorage.setItem('teacherAccess_' + teacher.name, 'true');
        }
        return hasAccess;
    }

    // ===== التحقق من الكود وتفعيله مع حفظ في السحابة =====
    async function verifyCode(teacher, code) {
        if (!teacher.codes || teacher.codes.length === 0) {
            return { valid: false, message: 'لا توجد أكواد لهذا المدرس' };
        }

        // التحقق من تسجيل الدخول
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

        // التحقق إذا كان الكود مستخدم من قبل
        if (codeData.used) {
            if (codeData.userId === currentUser.id) {
                return { valid: true, message: '✅ الكود مفعل على حسابك' };
            } else {
                const userEmail = codeData.userEmail || 'مستخدم آخر';
                return { valid: false, message: `❌ هذا الكود مستخدم من قبل ${userEmail}` };
            }
        }

        // ===== تفعيل الكود وحفظه في السحابة =====
        const userId = currentUser.id;
        const userEmail = currentUser.email || '';

        // تحديث البيانات المحلية
        codeData.used = true;
        codeData.deviceId = userDeviceId;
        codeData.userId = userId;
        codeData.userEmail = userEmail;
        codeData.usedAt = new Date().toISOString();
        codeData.locked = true; // قفل الكود تلقائياً بعد الاستخدام

        localStorage.setItem('teacherAccess_' + teacher.name, 'true');
        saveData();

        // ===== حفظ في Supabase =====
        try {
            // 1. البحث أو إنشاء الكود في جدول codes
            let { data: codeRecord, error: findError } = await supabaseClient
                .from('codes')
                .select('id')
                .eq('code', code)
                .maybeSingle();

            let codeId = codeRecord?.id;

            if (!codeId) {
                const { data: newCode, error: insertError } = await supabaseClient
                    .from('codes')
                    .insert({
                        code: code,
                        teacher_id: teacher.id || null,
                        is_used: true,
                        is_locked: true,
                        user_id: userId,
                        user_email: userEmail,
                        device_id: userDeviceId,
                        used_at: new Date().toISOString()
                    })
                    .select('id')
                    .single();

                if (insertError) throw insertError;
                codeId = newCode?.id;
            } else {
                const { error: updateError } = await supabaseClient
                    .from('codes')
                    .update({
                        is_used: true,
                        is_locked: true,
                        user_id: userId,
                        user_email: userEmail,
                        device_id: userDeviceId,
                        used_at: new Date().toISOString()
                    })
                    .eq('code', code);

                if (updateError) throw updateError;
            }

            // 2. حفظ في user_codes
            if (codeId) {
                await supabaseClient
                    .from('user_codes')
                    .insert({
                        user_id: userId,
                        code_id: codeId,
                        used_at: new Date().toISOString()
                    })
                    .onConflict('user_id, code_id')
                    .ignore();
            }

            // 3. حفظ في teacher_codes
            const department = data.departments.find(dept => dept.teachers && dept.teachers.includes(teacher));
            await supabaseClient
                .from('teacher_codes')
                .upsert({
                    code: code,
                    teacher_name: teacher.name,
                    teacher_department: department ? department.name : null,
                    user_id: userId,
                    user_email: userEmail,
                    device_id: userDeviceId,
                    used: true,
                    locked: true,
                    used_at: new Date().toISOString()
                }, { onConflict: 'code' });

            console.log('✅ تم حفظ الكود في السحابة:', code);

        } catch (error) {
            console.error('❌ خطأ في حفظ الكود:', error);
            // نستمر حتى لو فشل الحفظ في Supabase
        }

        return { valid: true, message: '✅ تم التفعيل - تم حفظ الكود في حسابك وقفله' };
    }

    // ===== تحميل الأكواد من السحابة =====
    async function loadUserCodesFromSupabase() {
        if (!currentUser || !supabaseClient) return;

        try {
            const { data: userCodes, error: ucError } = await supabaseClient
                .from('user_codes')
                .select('code_id, used_at')
                .eq('user_id', currentUser.id);

            if (ucError) {
                console.warn('⚠️ فشل جلب user_codes:', ucError);
                return;
            }

            if (!userCodes || userCodes.length === 0) return;

            const codeIds = userCodes.map(uc => uc.code_id);
            const { data: codesData, error: codesError } = await supabaseClient
                .from('codes')
                .select('*')
                .in('id', codeIds);

            if (codesError) {
                console.warn('⚠️ فشل جلب تفاصيل الأكواد:', codesError);
                return;
            }

            // تحديث البيانات المحلية
            codesData.forEach(codeRecord => {
                data.departments.forEach(dept => {
                    dept.teachers.forEach(teacher => {
                        if (!teacher.codes) teacher.codes = [];
                        const localCode = teacher.codes.find(c => c.code === codeRecord.code);
                        if (localCode) {
                            localCode.used = true;
                            localCode.locked = true;
                            localCode.userId = codeRecord.user_id;
                            localCode.userEmail = codeRecord.user_email;
                            localCode.deviceId = codeRecord.device_id;
                            localCode.usedAt = codeRecord.used_at;
                        }
                    });
                });
            });

            console.log('✅ تم تحميل الأكواد من السحابة');
        } catch (error) {
            console.warn('⚠️ خطأ في تحميل الأكواد:', error);
        }
    }

    // ===== تفعيل الكود من الواجهة =====
    window.activateCodeFromTeacher = async function() {
        const codeInput = document.getElementById('codeInputTeacher');
        const codeMessage = document.getElementById('codeMessageTeacher');
        const code = codeInput?.value.trim().toUpperCase();

        if (!code) {
            if (codeMessage) {
                codeMessage.innerHTML = '⚠️ يرجى إدخال الكود';
                codeMessage.style.color = '#f59e0b';
            }
            return;
        }

        if (!activeTeacher) {
            if (codeMessage) {
                codeMessage.innerHTML = '⚠️ يرجى اختيار مدرس أولاً';
                codeMessage.style.color = '#f59e0b';
            }
            return;
        }

        if (!currentUser) {
            if (codeMessage) {
                codeMessage.innerHTML = '⚠️ يجب تسجيل الدخول أولاً';
                codeMessage.style.color = '#ef4444';
            }
            showToast('error', '⚠️ يجب تسجيل الدخول أولاً');
            return;
        }

        const result = await verifyCode(activeTeacher, code);
        if (codeMessage) {
            codeMessage.innerHTML = result.message;
            codeMessage.style.color = result.valid ? '#22c55e' : '#ef4444';
        }

        if (result.valid) {
            showToast('success', '✅ تم التفعيل - حفظ الكود في حسابك وقفله');
            await loadUserCodesFromSupabase();
            setTimeout(() => {
                const deptIndex = data.departments.findIndex(d => d.teachers && d.teachers.includes(activeTeacher));
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
        const semesters = Array.isArray(teacher.semesters) ? teacher.semesters : [];

        let html = '';
        semesters.forEach((semester, idx) => {
            const lectures = Array.isArray(semester.lectures) ? semester.lectures : [];
            const hasFreeLecture = lectures.some(l => l.isFree === true);
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
                        <p>🔑 أدخل كود التفعيل (سيتم قفله تلقائياً بعد الاستخدام)</p>
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

    // =============================================
    // بقية الدوال (openLectures, playVideo, etc.)
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
        const lectures = Array.isArray(semester.lectures) ? semester.lectures : [];
        lectures.forEach((lecture) => {
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

    window.playVideo = function(url, title) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
            playerFrame.src = getYouTubeEmbedUrl(videoId);
            playerTitle.textContent = `🎬 ${title || 'تشغيل المحاضرة'}`;
            videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', `🎬 تشغيل: ${title || 'محاضرة'}`);
        } else {
            showToast('error', '❌ رابط YouTube غير صحيح');
        }
    };

    // =============================================
    // OPEN DEPARTMENT
    // =============================================
    window.openDepartment = function(index) {
        const department = data.departments[index];
        if (!department) return;

        modalDepartmentTitle.textContent = `📚 ${department.name}`;

        let html = '';
        const teachers = Array.isArray(department.teachers) ? department.teachers : [];
        if (teachers.length > 0) {
            teachers.forEach((teacher, idx) => {
                const totalLectures = Array.isArray(teacher.semesters) ? teacher.semesters.reduce((acc, s) => acc + (Array.isArray(s.lectures) ? s.lectures.length : 0), 0) : 0;
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
    // RENDER DEPARTMENTS
    // =============================================
    function renderDepartments(departments) {
        if (!departments || departments.length === 0) {
            departmentsRows.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h2>لا توجد أقسام</h2>
                    <p>يرجى إضافة بيانات</p>
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
            const teacherCount = Array.isArray(department.teachers) ? department.teachers.length : 0;
            const totalLectures = (Array.isArray(department.teachers) ? department.teachers : []).reduce((acc, t) => {
                return acc + (Array.isArray(t.semesters) ? t.semesters.reduce((acc2, s) => acc2 + (Array.isArray(s.lectures) ? s.lectures.length : 0), 0) : 0);
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
    // LOAD DATA
    // =============================================
    function normalizeDataStructure(courseData) {
        if (!courseData || !Array.isArray(courseData.departments)) {
            courseData.departments = [];
        }

        courseData.departments.forEach(dept => {
            if (!Array.isArray(dept.teachers)) {
                dept.teachers = [];
            }
            dept.teachers.forEach(teacher => {
                if (!Array.isArray(teacher.codes)) {
                    teacher.codes = [];
                }
                if (!Array.isArray(teacher.semesters)) {
                    teacher.semesters = [];
                }
                teacher.codes.forEach(c => {
                    if (c.used === undefined) c.used = false;
                    if (c.locked === undefined) c.locked = false;
                    if (!('deviceId' in c)) c.deviceId = null;
                    if (!('usedAt' in c)) c.usedAt = null;
                    if (!('userId' in c)) c.userId = null;
                    if (!('userEmail' in c)) c.userEmail = null;
                });
                teacher.semesters.forEach(semester => {
                    if (!Array.isArray(semester.lectures)) {
                        semester.lectures = [];
                    }
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
            if (supabaseClient) {
                const remoteData = await getSupabaseAcademyData();
                if (remoteData && remoteData.departments && Array.isArray(remoteData.departments)) {
                    data = remoteData;
                    normalizeDataStructure(data);
                    localStorage.setItem('academyData', JSON.stringify(data));
                    console.log('✅ تم تحميل البيانات من Supabase');
                    return;
                }
            }

            const savedData = localStorage.getItem('academyData');
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    if (parsed && parsed.departments && Array.isArray(parsed.departments)) {
                        data = parsed;
                        normalizeDataStructure(data);
                        console.log('✅ تم تحميل البيانات من localStorage');
                        return;
                    }
                } catch (e) {
                    console.warn('⚠️ بيانات localStorage تالفة');
                }
            }

            const response = await fetch('data.json?t=' + Date.now());
            if (!response.ok) throw new Error('data.json not found');

            const jsonData = await response.json();
            if (jsonData && jsonData.departments && Array.isArray(jsonData.departments)) {
                data = jsonData;
                normalizeDataStructure(data);
                localStorage.setItem('academyData', JSON.stringify(data));
                console.log('✅ تم تحميل البيانات من data.json');
                return;
            }

            throw new Error('Invalid data format');

        } catch (error) {
            console.warn('⚠️ استخدام البيانات الافتراضية:', error.message);

            data = {
                departments: [
                    {
                        name: 'الرياضيات',
                        emoji: '📐',
                        description: 'قسم الرياضيات',
                        teachers: [
                            {
                                name: 'أ.حيدر طابور',
                                emoji: '🧑‍🏫',
                                subject: 'الرياضيات',
                                description: '',
                                image: 'https://i.ibb.co/rG85h2d9/Screenshot-20260630-221127.jpg',
                                codes: [
                                    { code: 'XXX-TTT', used: false, locked: false, deviceId: null, userId: null, userEmail: null, usedAt: null },
                                    { code: 'XXX-KA0NNAC2', used: false, locked: false, deviceId: null, userId: null, userEmail: null, usedAt: null },
                                    { code: 'XXX-UN9H0YY0', used: false, locked: false, deviceId: null, userId: null, userEmail: null, usedAt: null },
                                    { code: 'XXX-TMXU12F2', used: false, locked: false, deviceId: null, userId: null, userEmail: null, usedAt: null },
                                    { code: 'XXX-8AV8PRPY', used: false, locked: false, deviceId: null, userId: null, userEmail: null, usedAt: null }
                                ],
                                semesters: [
                                    {
                                        number: 1,
                                        description: 'الفصل 1',
                                        lectures: [
                                            { number: 1, title: 'اساسيات', youtubeUrl: 'https://youtu.be/sNMZ74fI-_0?si=ZJkoSZxl4ByqvKzJ', isFree: true },
                                            { number: 2, title: 'اساسيات 2', youtubeUrl: 'https://youtu.be/c_S46HtY7j8?si=Z8fBSYU1Op0p9rRm', isFree: false }
                                        ]
                                    },
                                    {
                                        number: 2,
                                        description: 'الفصل 2',
                                        lectures: []
                                    }
                                ]
                            }
                        ]
                    },
                    { name: 'اللغة العربية', emoji: '📖', description: 'قسم اللغة العربية', teachers: [] },
                    { name: 'الفيزياء', emoji: '⚛️', description: 'قسم الفيزياء', teachers: [] },
                    { name: 'الأحياء', emoji: '🧬', description: 'قسم الأحياء', teachers: [] },
                    { name: 'اللغة الإنجليزية', emoji: '🇬🇧', description: 'قسم اللغة الإنجليزية', teachers: [] },
                    { name: 'التاريخ', emoji: '🏛️', description: 'قسم التاريخ', teachers: [] },
                    { name: 'التربية الإسلامية', emoji: '🕌', description: 'قسم التربية الإسلامية', teachers: [] }
                ]
            };
            normalizeDataStructure(data);
            localStorage.setItem('academyData', JSON.stringify(data));
            showToast('info', '📝 يتم عرض بيانات افتراضية');
        }
    }

    // =============================================
    // SAVE DATA
    // =============================================
    function saveData() {
        try {
            localStorage.setItem('academyData', JSON.stringify(data));
            console.log('✅ تم حفظ البيانات محلياً');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات:', error);
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
                console.warn('Supabase academy data lookup failed:', error.message);
                return null;
            }
            return data?.content || null;
        } catch (error) {
            console.warn('Supabase academy data exception:', error);
            return null;
        }
    }

    async function saveSupabaseAcademyData() {
        if (!supabaseClient) {
            return { success: false, error: 'Supabase غير متاح' };
        }

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
                console.warn('Supabase academy data save failed:', error.message);
                return { success: false, error };
            }

            localStorage.setItem('academyData', JSON.stringify(data));
            return { success: true };
        } catch (error) {
            console.warn('Supabase academy data save exception:', error);
            return { success: false, error };
        }
    }

    // =============================================
    // ADMIN LOGIN
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
            showToast('success', '✅ تم تسجيل الدخول للإدارة');
            adminPanel.classList.add('active');
            updateAdminSelects();
            updatePendingChanges();
            currentUser = {
                id: 'admin_' + Date.now(),
                email: email,
                user_metadata: { full_name: 'المشرف' }
            };
            localStorage.setItem('devAcademicUser', JSON.stringify({ email: email, name: 'المشرف' }));
        } else {
            adminLoginMessage.textContent = '❌ البريد أو كلمة المرور غير صحيحة';
            adminLoginMessage.style.color = '#ef4444';
        }
    });

    // =============================================
    // ADMIN PANEL
    // =============================================
    adminClose.addEventListener('click', function() {
        adminPanel.classList.remove('active');
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + this.dataset.tab).classList.add('active');
            if (this.dataset.tab === 'manage-codes') {
                updateCodesManagement();
            }
            if (this.dataset.tab === 'delete') {
                updateDeleteSelects();
            }
            if (this.dataset.tab === 'edit-lecture') {
                updateEditLectureSelects();
            }
        });
    });

    // =============================================
    // updateAdminSelects
    // =============================================
    function updateAdminSelects() {
        const deptSelect = document.getElementById('teacherDepartment');
        let options = '<option value="">اختر القسم...</option>';
        data.departments.forEach((d, i) => {
            options += `<option value="${i}">${d.emoji || '📚'} ${d.name}</option>`;
        });
        deptSelect.innerHTML = options;

        updateTeacherSelects();
        updateCodeTeacherSelect();
        updateDeleteSelects();
        updateEditLectureSelects();
    }

    function updateEditLectureSelects() {
        const teacherSelect = document.getElementById('editLectureTeacher');
        let options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach((dept, di) => {
            dept.teachers.forEach((t, ti) => {
                options += `<option value="${ti}" data-dept="${di}">${t.name}</option>`;
            });
        });
        teacherSelect.innerHTML = options;

        document.getElementById('editLectureSemester').innerHTML = '<option value="">اختر المدرس أولاً</option>';
        document.getElementById('editLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';
    }

    function updateEditLectureSemesters() {
        const teacherSelect = document.getElementById('editLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('editLectureSemester');

        let options = '<option value="">اختر الفصل...</option>';
        if (deptIndex !== -1 && !isNaN(teacherIndex) && teacherIndex !== '' && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher && teacher.semesters) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
        document.getElementById('editLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';
    }

    function updateEditLectureLectures() {
        const teacherSelect = document.getElementById('editLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('editLectureSemester');
        const semesterIndex = parseInt(semesterSelect.value);
        const lectureSelect = document.getElementById('editLectureSelect');

        let options = '<option value="">اختر المحاضرة...</option>';
        if (deptIndex !== -1 && !isNaN(teacherIndex) && teacherIndex !== '' && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher && teacher.semesters && !isNaN(semesterIndex) && semesterIndex !== '' && semesterIndex !== -1) {
                const semester = teacher.semesters[semesterIndex];
                if (semester && semester.lectures) {
                    semester.lectures.forEach((l, i) => {
                        options += `<option value="${i}">#${l.number} - ${l.title}</option>`;
                    });
                }
            }
        }
        lectureSelect.innerHTML = options;
    }

    window.openEditLectureFromAdmin = function() {
        const teacherSelect = document.getElementById('editLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterIndex = parseInt(document.getElementById('editLectureSemester').value);
        const lectureIndex = parseInt(document.getElementById('editLectureSelect').value);
        const messageEl = document.getElementById('editLectureAdminMessage');

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
            messageEl.innerHTML = '⚠️ يرجى اختيار المدرس';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex === '' || semesterIndex === -1) {
            messageEl.innerHTML = '⚠️ يرجى اختيار الفصل';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (isNaN(lectureIndex) || lectureIndex === '' || lectureIndex === -1) {
            messageEl.innerHTML = '⚠️ يرجى اختيار المحاضرة';
            messageEl.style.color = '#f59e0b';
            return;
        }

        const teacher = data.departments[deptIndex]?.teachers[teacherIndex];
        if (!teacher) {
            messageEl.innerHTML = '❌ المدرس غير موجود';
            messageEl.style.color = '#ef4444';
            return;
        }

        const semester = teacher.semesters[semesterIndex];
        if (!semester) {
            messageEl.innerHTML = '❌ الفصل غير موجود';
            messageEl.style.color = '#ef4444';
            return;
        }

        const lecture = semester.lectures[lectureIndex];
        if (!lecture) {
            messageEl.innerHTML = '❌ المحاضرة غير موجودة';
            messageEl.style.color = '#ef4444';
            return;
        }

        messageEl.innerHTML = '';
        openEditLecture(deptIndex, teacherIndex, semesterIndex, lectureIndex);
    };

    function updateDeleteSelects() {
        const deleteTeacherSelect = document.getElementById('deleteTeacherSelect');
        let options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach((dept, di) => {
            dept.teachers.forEach((t, ti) => {
                options += `<option value="${ti}" data-dept="${di}">${t.name}</option>`;
            });
        });
        deleteTeacherSelect.innerHTML = options;

        const deleteSemesterTeacher = document.getElementById('deleteSemesterTeacher');
        options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach((dept, di) => {
            dept.teachers.forEach((t, ti) => {
                options += `<option value="${ti}" data-dept="${di}">${t.name}</option>`;
            });
        });
        deleteSemesterTeacher.innerHTML = options;
        updateDeleteSemesterSelects();

        const deleteLectureTeacher = document.getElementById('deleteLectureTeacher');
        options = '<option value="">اختر المدرس...</option>';
        data.departments.forEach((dept, di) => {
            dept.teachers.forEach((t, ti) => {
                options += `<option value="${ti}" data-dept="${di}">${t.name}</option>`;
            });
        });
        deleteLectureTeacher.innerHTML = options;
        updateDeleteLectureSemesters();
    }

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
        if (deptIndex !== -1 && !isNaN(teacherIndex) && teacherIndex !== '' && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher && teacher.semesters) {
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

    function updateCodesManagement() {
        const select = document.getElementById('codeTeacherSelect');
        const container = document.getElementById('codesListContainer');
        const selectedOption = select.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(select.value);

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
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
                <span>🔒 المقفلة: ${status.locked}</span>
            </div>
            <table class="codes-table">
                <tr>
                    <th>#</th>
                    <th>الكود</th>
                    <th>الحالة</th>
                    <th>المستخدم</th>
                    <th>الجهاز</th>
                    <th>قفل/فتح</th>
                    <th>حذف</th>
                </tr>
        `;

        if (teacher.codes && teacher.codes.length > 0) {
            teacher.codes.forEach((c, index) => {
                const isUsed = c.used;
                const isLocked = c.locked || false;
                const isMyDevice = c.deviceId === userDeviceId;
                let statusText = '';
                let statusColor = '';
                let userDisplay = '—';

                if (isLocked) {
                    statusText = '🔒 مقفل';
                    statusColor = '#f59e0b';
                } else if (isUsed) {
                    statusText = isMyDevice ? '✅ جهازك' : '❌ مستخدم';
                    statusColor = isMyDevice ? '#22c55e' : '#ef4444';
                    if (c.userEmail) {
                        userDisplay = c.userEmail;
                    } else if (c.userId) {
                        userDisplay = c.userId.substring(0, 10) + '...';
                    }
                } else {
                    statusText = '🟢 متاح';
                    statusColor = '#22c55e';
                }

                const deviceText = c.deviceId ? c.deviceId.substring(0, 15) + '...' : '—';
                const lockIcon = isLocked ? '🔓 فتح' : '🔒 قفل';
                const lockStyle = isLocked ? 'background:#22c55e;' : 'background:#f59e0b;';

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code style="font-weight:700;color:${statusColor};">${c.code}</code></td>
                        <td>${statusText}</td>
                        <td style="font-size:0.8rem;color:var(--text-light);">${userDisplay}</td>
                        <td style="font-size:0.8rem;color:var(--text-light);">${deviceText}</td>
                        <td>
                            <button onclick="toggleCodeLockAction(${deptIndex}, ${teacherIndex}, '${c.code}')" 
                                    style="${lockStyle}color:white;border:none;border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;font-size:0.75rem;">
                                ${lockIcon}
                            </button>
                        </td>
                        <td>
                            ${!isUsed && !isLocked ? `<button onclick="deleteThisCode(${deptIndex}, ${teacherIndex}, '${c.code}')" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;">🗑️</button>` : '—'}
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:1rem 0;">لا توجد أكواد</td></tr>`;
        }

        html += `</table>`;
        container.innerHTML = html;
    }

    window.generateCodes = function(count = 5) {
        const select = document.getElementById('codeTeacherSelect');
        const selectedOption = select.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(select.value);

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
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
    // دوال الأكواد المساعدة
    // =============================================
    function addNewCodes(teacher, count = 5) {
        if (!teacher.codes) teacher.codes = [];
        const newCodes = [];
        for (let i = 0; i < count; i++) {
            const newCode = generateCode(teacher.name);
            teacher.codes.push({
                code: newCode,
                used: false,
                locked: false,
                deviceId: null,
                userId: null,
                userEmail: null,
                usedAt: null
            });
            newCodes.push(newCode);
        }
        saveData();
        pendingChanges++;
        updatePendingChanges();
        return newCodes;
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
        if (!teacher.codes) return { total: 0, used: 0, available: 0, locked: 0 };
        const total = teacher.codes.length;
        const used = teacher.codes.filter(c => c.used).length;
        const locked = teacher.codes.filter(c => c.locked).length;
        return { total, used, available: total - used, locked };
    }

    window.toggleCodeLockAction = function(deptIndex, teacherIndex, code) {
        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '❌ المدرس غير موجود');
            return;
        }

        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) {
            showToast('error', '❌ الكود غير موجود');
            return;
        }

        const newLockState = !codeData.locked;
        const action = newLockState ? 'قفل' : 'فتح';

        codeData.locked = newLockState;
        if (codeData.locked && codeData.used) {
            codeData.used = false;
            codeData.deviceId = null;
            codeData.userId = null;
            codeData.userEmail = null;
            codeData.usedAt = null;
        }
        saveData();

        showToast('success', `✅ تم ${action} الكود ${code} بنجاح`);
        updateCodesManagement();
        updateAdminSelects();
    };

    // =============================================
    // دوال الحذف
    // =============================================
    window.deleteSelectedTeacherFromTab = function() {
        const select = document.getElementById('deleteTeacherSelect');
        const selectedOption = select.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(select.value);

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
            showToast('warning', '⚠️ يرجى اختيار مدرس أولاً');
            return;
        }

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '❌ المدرس غير موجود');
            return;
        }

        if (!confirm(`⚠️ هل أنت متأكد من حذف المدرس "${teacher.name}"؟`)) {
            return;
        }

        data.departments[deptIndex].teachers.splice(teacherIndex, 1);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        showToast('success', `✅ تم حذف المدرس "${teacher.name}" بنجاح`);
    };

    window.deleteSelectedSemesterFromTab = function() {
        const teacherSelect = document.getElementById('deleteSemesterTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterIndex = parseInt(document.getElementById('deleteSemesterSelect').value);

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
            showToast('warning', '⚠️ يرجى اختيار المدرس');
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex === '' || semesterIndex === -1) {
            showToast('warning', '⚠️ يرجى اختيار الفصل');
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

        if (!confirm(`⚠️ هل أنت متأكد من حذف الفصل ${semester.number}؟`)) {
            return;
        }

        teacher.semesters.splice(semesterIndex, 1);
        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        showToast('success', `✅ تم حذف الفصل ${semester.number} بنجاح`);
        updateDeleteSemesterSelects();
    };

    window.deleteSelectedLectureFromTab = function() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterIndex = parseInt(document.getElementById('deleteLectureSemester').value);
        const lectureIndex = parseInt(document.getElementById('deleteLectureSelect').value);

        if (deptIndex === -1 || isNaN(teacherIndex) || teacherIndex === '') {
            showToast('warning', '⚠️ يرجى اختيار المدرس');
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex === '' || semesterIndex === -1) {
            showToast('warning', '⚠️ يرجى اختيار الفصل');
            return;
        }

        if (isNaN(lectureIndex) || lectureIndex === '' || lectureIndex === -1) {
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
        showToast('success', `✅ تم حذف المحاضرة "${lecture.title}" بنجاح`);
        updateDeleteLectureSemesters();
    };

    function updateDeleteSemesterSelects() {
        const teacherSelect = document.getElementById('deleteSemesterTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('deleteSemesterSelect');

        let options = '<option value="">اختر الفصل...</option>';
        if (deptIndex !== -1 && !isNaN(teacherIndex) && teacherIndex !== '' && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher && teacher.semesters) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
    }

    function updateDeleteLectureSemesters() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('deleteLectureSemester');

        let options = '<option value="">اختر الفصل...</option>';
        if (deptIndex !== -1 && !isNaN(teacherIndex) && teacherIndex !== '' && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher && teacher.semesters) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
        document.getElementById('deleteLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';
    }

    function updateDeleteLectureLectures() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const selectedOption = teacherSelect.selectedOptions[0];
        const deptIndex = selectedOption ? parseInt(selectedOption.dataset.dept) : -1;
        const teacherIndex = parseInt(teacherSelect.value);
        const semesterSelect = document.getElementById('deleteLectureSemester');
        const semesterIndex = parseInt(semesterSelect.value);
        const lectureSelect = document.getElementById('deleteLectureSelect');

        let options = '<option value="">اختر المحاضرة...</option>';
        if (deptIndex !== -1 && !isNaN(teacherIndex) && teacherIndex !== '' && data.departments[deptIndex]) {
            const teacher = data.departments[deptIndex].teachers[teacherIndex];
            if (teacher && teacher.semesters && !isNaN(semesterIndex) && semesterIndex !== '' && semesterIndex !== -1) {
                const semester = teacher.semesters[semesterIndex];
                if (semester && semester.lectures) {
                    semester.lectures.forEach((l, i) => {
                        options += `<option value="${i}">#${l.number} - ${l.title}</option>`;
                    });
                }
            }
        }
        lectureSelect.innerHTML = options;
    }

    document.getElementById('deleteSemesterTeacher')?.addEventListener('change', updateDeleteSemesterSelects);
    document.getElementById('deleteLectureTeacher')?.addEventListener('change', updateDeleteLectureSemesters);
    document.getElementById('deleteLectureSemester')?.addEventListener('change', updateDeleteLectureLectures);

    // =============================================
    // EDIT LECTURE
    // =============================================
    function openEditLecture(deptIndex, teacherIndex, semesterIndex, lectureIndex) {
        const dept = data.departments[deptIndex];
        if (!dept) return;
        const teacher = dept.teachers[teacherIndex];
        if (!teacher) return;
        const semester = teacher.semesters[semesterIndex];
        if (!semester) return;
        const lecture = semester.lectures[lectureIndex];
        if (!lecture) return;

        const editLectureTitle = document.getElementById('editLectureTitle');
        const editLectureUrl = document.getElementById('editLectureUrl');
        const editLectureFree = document.getElementById('editLectureFree');
        const editLectureInfo = document.getElementById('editLectureInfo');

        if (editLectureTitle) editLectureTitle.value = lecture.title || '';
        if (editLectureUrl) editLectureUrl.value = lecture.youtubeUrl || '';
        if (editLectureFree) editLectureFree.value = lecture.isFree ? 'true' : 'false';
        if (editLectureInfo) editLectureInfo.textContent = `👨‍🏫 ${teacher.name} | 📖 الفصل ${semester.number}`;

        const editDeptIndex = document.getElementById('editDeptIndex');
        const editTeacherIdx = document.getElementById('editTeacherIdx');
        const editSemesterIdx = document.getElementById('editSemesterIdx');
        const editLectureIdx = document.getElementById('editLectureIdx');

        if (editDeptIndex) editDeptIndex.value = deptIndex;
        if (editTeacherIdx) editTeacherIdx.value = teacherIndex;
        if (editSemesterIdx) editSemesterIdx.value = semesterIndex;
        if (editLectureIdx) editLectureIdx.value = lectureIndex;

        const editLectureModal = document.getElementById('editLectureModal');
        if (editLectureModal) {
            editLectureModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    window.saveEditedLecture = function() {
        const deptIndex = parseInt(document.getElementById('editDeptIndex')?.value);
        const teacherIndex = parseInt(document.getElementById('editTeacherIdx')?.value);
        const semesterIndex = parseInt(document.getElementById('editSemesterIdx')?.value);
        const lectureIndex = parseInt(document.getElementById('editLectureIdx')?.value);
        const title = document.getElementById('editLectureTitle')?.value.trim();
        const url = document.getElementById('editLectureUrl')?.value.trim();
        const isFree = document.getElementById('editLectureFree')?.value === 'true';

        if (!title || !url) {
            showToast('warning', '⚠️ يرجى ملء جميع الحقول');
            return;
        }

        if (!extractYouTubeId(url)) {
            showToast('warning', '⚠️ رابط YouTube غير صحيح');
            return;
        }

        const dept = data.departments[deptIndex];
        if (!dept) return;
        const teacher = dept.teachers[teacherIndex];
        if (!teacher) return;
        const semester = teacher.semesters[semesterIndex];
        if (!semester) return;
        const lecture = semester.lectures[lectureIndex];
        if (!lecture) return;

        lecture.title = title;
        lecture.youtubeUrl = url;
        lecture.isFree = isFree;

        saveData();
        renderDepartments(data.departments);
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();

        const editLectureModal = document.getElementById('editLectureModal');
        if (editLectureModal) {
            editLectureModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        showToast('success', '✅ تم تعديل المحاضرة بنجاح');
    };

    document.getElementById('closeEditLecture')?.addEventListener('click', function() {
        const editLectureModal = document.getElementById('editLectureModal');
        if (editLectureModal) {
            editLectureModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });

    document.getElementById('editLectureForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        window.saveEditedLecture();
    });

    // =============================================
    // PUBLISH CHANGES
    // =============================================
    function updatePendingChanges() {
        pendingChangesSpan.textContent = pendingChanges;
    }

    publishBtn.addEventListener('click', async function() {
        if (pendingChanges === 0) {
            showToast('info', '📌 لا توجد تغييرات لنشرها');
            return;
        }

        if (!supabaseClient) {
            showToast('error', '❌ Supabase غير متاح');
            return;
        }

        const publishResult = await saveSupabaseAcademyData();
        if (!publishResult.success) {
            showToast('error', '❌ فشل نشر التحديثات');
            return;
        }

        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'academy-data-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const message = document.getElementById('publishMessage');
        message.textContent = `✅ تم نشر ${pendingChanges} تغييراً بنجاح`;
        message.style.color = '#22c55e';

        pendingChanges = 0;
        updatePendingChanges();
        showToast('success', '✅ تم نشر التحديثات بنجاح');

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
        showToast('info', isDarkMode ? '🌙 الوضع المظلم' : '☀️ الوضع الفاتح');
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
            if (editLectureModal.classList.contains('active')) {
                document.getElementById('editLectureModal').classList.remove('active');
                document.body.style.overflow = 'auto';
            }
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
    // INIT Supabase Auth
    // =============================================
    async function initSupabaseAuth() {
        if (!userStatusElement) return;

        const storedUser = localStorage.getItem('devAcademicUser');
        let fallbackUser = null;
        if (storedUser) {
            try {
                fallbackUser = JSON.parse(storedUser);
            } catch (e) {
                fallbackUser = null;
            }
        }

        if (!supabaseClient) {
            if (fallbackUser) {
                currentUser = {
                    id: 'user_' + Date.now(),
                    email: fallbackUser.email,
                    user_metadata: { full_name: fallbackUser.name }
                };
                userStatusElement.textContent = `👤 ${fallbackUser.name || fallbackUser.email}`;
                return;
            }
            userStatusElement.textContent = '⚠️ Supabase غير متاح';
            return;
        }

        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) {
                console.warn('Supabase session check failed:', error.message);
                if (fallbackUser) {
                    currentUser = {
                        id: 'user_' + Date.now(),
                        email: fallbackUser.email,
                        user_metadata: { full_name: fallbackUser.name }
                    };
                    userStatusElement.textContent = `👤 ${fallbackUser.name || fallbackUser.email}`;
                    return;
                }
                userStatusElement.textContent = '⚠️ خطأ في Supabase';
                return;
            }

            if (session?.user) {
                currentUser = session.user;
                userStatusElement.textContent = `👤 ${currentUser.user_metadata?.full_name || currentUser.email}`;
                localStorage.setItem('devAcademicUser', JSON.stringify({
                    email: currentUser.email,
                    name: currentUser.user_metadata?.full_name || ''
                }));
                await loadUserCodesFromSupabase();
                return;
            }

            if (fallbackUser) {
                currentUser = {
                    id: 'user_' + Date.now(),
                    email: fallbackUser.email,
                    user_metadata: { full_name: fallbackUser.name }
                };
                userStatusElement.textContent = `👤 ${fallbackUser.name || fallbackUser.email}`;
                return;
            }

            userStatusElement.textContent = '👤 غير مسجل';
        } catch (error) {
            console.warn('Supabase auth init exception:', error);
            if (fallbackUser) {
                currentUser = {
                    id: 'user_' + Date.now(),
                    email: fallbackUser.email,
                    user_metadata: { full_name: fallbackUser.name }
                };
                userStatusElement.textContent = `👤 ${fallbackUser.name || fallbackUser.email}`;
                return;
            }
            userStatusElement.textContent = '⚠️ خطأ في Supabase';
        }
    }

    async function signOutSupabase() {
        try {
            localStorage.removeItem('devAcademicUser');
            if (!supabaseClient) {
                window.location.href = 'index.html';
                return;
            }
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.warn('Supabase signOut failed:', error.message);
                showToast('error', '❌ فشل تسجيل الخروج');
                return;
            }
            showToast('success', '✅ تم تسجيل الخروج');
            window.location.href = 'index.html';
        } catch (error) {
            console.warn('Supabase signOut exception:', error);
            showToast('error', '❌ حدث خطأ');
            window.location.href = 'index.html';
        }
    }

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
    loadData().then(async () => {
        await initSupabaseAuth();
        if (supabaseClient) {
            // اشتراك التحديثات المباشرة
            const channel = supabaseClient
                .channel('public:academy_data')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'academy_data', filter: 'id=eq.main' }, (payload) => {
                    if (!payload?.new?.content) return;
                    try {
                        const remoteData = payload.new.content;
                        if (JSON.stringify(remoteData) !== JSON.stringify(data)) {
                            data = remoteData;
                            normalizeDataStructure(data);
                            saveData();
                            renderDepartments(data.departments);
                            updateAdminSelects();
                            showToast('info', '🔄 تم تحديث البيانات');
                        }
                    } catch (err) {
                        console.warn('Realtime parse error:', err);
                    }
                })
                .subscribe();

            console.log('✅ اشتراك Supabase academy data updates');
        }
        renderDepartments(data.departments);
        updateAdminSelects();
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', signOutSupabase);
        }
        console.log('📚 ديف أكاديمي - النظام جاهز');
        console.log('📱 معرف الجهاز:', userDeviceId);
        console.log('👤 المستخدم:', currentUser?.email || 'غير مسجل');
        console.log('🔗 Supabase:', supabaseClient ? '✅ متصل' : '❌ غير متصل');
    }).catch((error) => {
        console.error('Initialization failed:', error);
        if (userStatusElement) {
            userStatusElement.textContent = '⚠️ فشل التحميل';
        }
        renderDepartments(data.departments);
        updateAdminSelects();
    });

})();