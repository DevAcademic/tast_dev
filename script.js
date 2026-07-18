(function() {
    'use strict';

    // ===== حماية F12 وأدوات المطور =====
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
    let isAdminLoggedIn = false;
    let pendingChanges = 0;
    let activeTeacher = null;
    let activeTeacherIndex = null;
    let activeSectionIndex = null;
    let filteredSection = null;

    // ===== الأقسام الافتراضية =====
    const defaultSections = [
        { id: 'first-intermediate', name: 'أول متوسط', icon: '📚', teachers: [] },
        { id: 'second-intermediate', name: 'ثاني متوسط', icon: '📚', teachers: [] },
        { id: 'third-intermediate', name: 'ثالث متوسط', icon: '📚', teachers: [] },
        { id: 'fourth-scientific', name: 'رابع علمي', icon: '🔬', teachers: [] },
        { id: 'fourth-literary', name: 'رابع أدبي', icon: '📖', teachers: [] },
        { id: 'fifth-scientific', name: 'خامس علمي', icon: '🔬', teachers: [] },
        { id: 'fifth-literary', name: 'خامس أدبي', icon: '📖', teachers: [] },
        { id: 'sixth-scientific', name: 'سادس علمي', icon: '🔬', teachers: [] },
        { id: 'sixth-literary', name: 'سادس أدبي', icon: '📖', teachers: [] }
    ];

    // ===== DOM Elements =====
    const loadingScreen = document.getElementById('loadingScreen');
    const navbar = document.getElementById('navbar');
    const bottomNav = document.getElementById('bottomNav');
    const footer = document.getElementById('footer');
    const teachersContainer = document.getElementById('teachersContainer');
    const teachersContainer2 = document.getElementById('teachersContainer2');
    const sectionsGrid = document.getElementById('sectionsGrid');
    const sectionsCount = document.getElementById('sectionsCount');
    const sectionFilter = document.getElementById('sectionFilter');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const videoPlayer = document.getElementById('videoPlayer');
    const closePlayer = document.getElementById('closePlayer');
    const videoWrapper = document.getElementById('videoWrapper');
    const themeToggle = document.getElementById('themeToggle');
    const toastContainer = document.getElementById('toastContainer');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');

    // ===== Admin Elements =====
    const adminPanel = document.getElementById('adminPanel');
    const adminClose = document.getElementById('adminClose');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const publishBtn = document.getElementById('publishBtn');
    const pendingChangesSpan = document.getElementById('pendingChanges');
    const createTableBtn = document.getElementById('createTableBtn');

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

    // ===== Bottom Navigation =====
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');

    // ===== Account Page =====
    const accountName = document.getElementById('accountName');
    const accountEmail = document.getElementById('accountEmail');
    const accountAvatar = document.getElementById('accountAvatar');
    const accountRegistered = document.getElementById('accountRegistered');
    const accountCourses = document.getElementById('accountCourses');
    const accountCodes = document.getElementById('accountCodes');
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
    // 🔥 دوال تشغيل الفيديو - دعم mediadelivery و YouTube
    // ============================================================

    function extractVideoUrl(url) {
        if (!url) return '';
        if (url.includes('player.mediadelivery.net/play/')) {
            return url;
        }
        if (url.includes('player.mediadelivery.net/embed/')) {
            return url;
        }
        if (url.includes('mediadelivery.net')) {
            return url;
        }
        if (url.includes('<iframe')) {
            const match = url.match(/src=["']([^"']+)["']/);
            if (match) {
                return match[1];
            }
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
            } else {
                if (!videoUrl.includes('controls')) {
                    videoUrl = videoUrl + '&controls=true';
                }
            }

            videoUrl = videoUrl.replace(/&?muted=true/g, '');
            videoUrl = videoUrl.replace(/&?muted=false/g, '');

            videoWrapper.innerHTML = `
                <iframe src="${videoUrl}" 
                        loading="lazy" 
                        style="border:0;position:absolute;top:0;left:0;height:100%;width:100%;" 
                        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen;"
                        allowfullscreen="true"
                        webkitallowfullscreen="true"
                        mozallowfullscreen="true">
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

        if (videoUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
            videoWrapper.innerHTML = `
                <video controls autoplay 
                       style="position:absolute;top:0;left:0;height:100%;width:100%;background:#000;"
                       controlsList="nodownload"
                       playsinline>
                    <source src="${videoUrl}" type="video/mp4">
                    متصفحك لا يدعم تشغيل الفيديو
                </video>
            `;

            setTimeout(() => {
                const video = videoWrapper.querySelector('video');
                if (video) {
                    video.volume = 1.0;
                    video.muted = false;
                }
            }, 500);

            videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', `🎬 تشغيل: ${title || 'محاضرة'}`);
            return;
        }

        showToast('error', '❌ رابط الفيديو غير صحيح. استخدم رابط mediadelivery أو YouTube');
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
    // TOAST
    // ============================================================
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

    // ===== DEVICE ID =====
    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'DEV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }
    const userDeviceId = getDeviceId();

    // ===== ACCESS =====
    function hasAccessToTeacher(teacher) {
        if (!teacher || !teacher.codes) return false;
        if (!currentUser) return false;
        const hasAccess = teacher.codes.some(c => c.used && c.userEmail === currentUser.email && !c.locked);
        return hasAccess;
    }

    // ===== ADMIN VERIFICATION =====
    async function isUserAdmin(email) {
        if (!supabaseClient || !email) return false;
        try {
            const { data, error } = await supabaseClient
                .from('admins')
                .select('email')
                .eq('email', email)
                .maybeSingle();
            if (error) {
                console.warn('⚠️ فشل التحقق من صلاحيات المشرف:', error);
                return false;
            }
            return !!data;
        } catch (e) {
            console.warn('⚠️ خطأ في التحقق من المشرف:', e);
            return false;
        }
    }

    // ===== CODE VERIFICATION =====
    async function verifyCode(teacher, code) {
        if (!teacher.codes || teacher.codes.length === 0) {
            return { valid: false, message: 'لا توجد أكواد لهذا المدرس' };
        }

        if (!currentUser) {
            return { valid: false, message: '⚠️ يجب تسجيل الدخول أولاً لإدخال الكود' };
        }

        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) {
            return { valid: false, message: '❌ الكود غير صحيح' };
        }

        if (codeData.locked === true) {
            return { valid: false, message: '🔒 هذا الكود مقفل من قبل الإدارة' };
        }

        if (codeData.used) {
            if (codeData.userEmail === currentUser.email) {
                return { valid: true, message: '✅ الكود مفعل على حسابك' };
            } else {
                const usedAt = codeData.usedAt ? new Date(codeData.usedAt).toLocaleString('ar') : 'وقت غير معروف';
                return {
                    valid: false,
                    message: `❌ هذا الكود مستخدم من قبل شخص آخر\n⏱️ تم الاستخدام في: ${usedAt}`
                };
            }
        }

        codeData.used = true;
        codeData.deviceId = userDeviceId;
        codeData.userId = currentUser.id;
        codeData.userEmail = currentUser.email;
        codeData.usedAt = new Date().toISOString();
        saveData();

        const syncResult = await syncCodeWithSupabase(teacher, codeData);
        if (!syncResult.success) {
            codeData.used = false;
            codeData.userId = null;
            codeData.userEmail = null;
            codeData.usedAt = null;
            saveData();
            return { valid: false, message: '❌ فشل حفظ الكود في قاعدة البيانات' };
        }

        await addCodeToUserCodes(currentUser.id, codeData.code);
        updateUserCodesStorage();
        renderAllSectionsAndTeachers();
        renderMyCourses();
        renderAccount();
        updateBadge();

        return { valid: true, message: '✅ تم التفعيل بنجاح - تم حفظ الكود في حسابك' };
    }

    // ===== SYNC CODE WITH SUPABASE =====
    async function syncCodeWithSupabase(teacher, codeData) {
        if (!currentUser || !supabaseClient) {
            return { success: false, error: 'No authenticated user or Supabase unavailable' };
        }
        try {
            const record = {
                code: codeData.code,
                teacher_name: teacher.name,
                user_id: currentUser.id,
                user_email: currentUser.email,
                device_id: userDeviceId,
                used: true,
                locked: codeData.locked || false,
                used_at: codeData.usedAt || new Date().toISOString(),
            };

            const { error } = await supabaseClient.from('teacher_codes').upsert(record, { onConflict: 'code' });
            if (error) {
                console.warn('⚠️ فشل مزامنة الكود مع Supabase:', error.message || error);
                return { success: false, error };
            }

            const { error: updateError } = await supabaseClient.from('codes').update({
                is_used: true,
                user_id: currentUser.id,
                user_email: currentUser.email,
                device_id: userDeviceId,
                used_at: new Date().toISOString()
            }).eq('code', codeData.code);

            if (updateError) {
                console.warn('⚠️ فشل تحديث الكود في جدول codes:', updateError);
            }

            console.log('✅ تم مزامنة الكود مع Supabase:', codeData.code);
            return { success: true };
        } catch (error) {
            console.warn('⚠️ خطأ في مزامنة الكود:', error);
            return { success: false, error };
        }
    }

    // ===== ADD CODE TO USER CODES =====
    async function addCodeToUserCodes(userId, code) {
        if (!supabaseClient) return;
        try {
            const { data: codeRecord, error: codeError } = await supabaseClient
                .from('codes').select('id').eq('code', code).single();
            if (codeError) {
                console.warn('⚠️ الكود غير موجود في قاعدة البيانات:', codeError);
                return;
            }

            const { data: existing, error: checkError } = await supabaseClient
                .from('user_codes').select('id').eq('user_id', userId).eq('code_id', codeRecord.id).maybeSingle();
            if (existing) {
                console.log('✅ الكود موجود مسبقاً للمستخدم');
                return;
            }

            const { error } = await supabaseClient.from('user_codes').insert({
                user_id: userId,
                code_id: codeRecord.id,
                used_at: new Date().toISOString()
            });
            if (error) {
                console.warn('⚠️ فشل حفظ الكود في user_codes:', error);
            } else {
                console.log('✅ تم حفظ الكود في حساب المستخدم:', code);
            }
        } catch (error) {
            console.warn('⚠️ خطأ في حفظ الكود:', error);
        }
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

    function restoreUserCodesFromStorage() {
        if (!currentUser) return;
        const stored = localStorage.getItem('userCodes_' + currentUser.email);
        if (!stored) return;
        try {
            const userCodes = JSON.parse(stored);
            userCodes.forEach(savedCode => {
                data.sections.forEach(section => {
                    section.teachers.forEach(teacher => {
                        if (teacher.codes) {
                            const codeData = teacher.codes.find(c => c.code === savedCode.code);
                            if (codeData && !codeData.used) {
                                codeData.used = true;
                                codeData.userId = currentUser.id;
                                codeData.userEmail = currentUser.email;
                                codeData.deviceId = userDeviceId;
                                codeData.usedAt = savedCode.usedAt || new Date().toISOString();
                            }
                        }
                    });
                });
            });
            saveData();
        } catch (e) {
            console.warn('⚠️ فشل استعادة الأكواد من التخزين المحلي');
        }
    }

    async function loadUserCodesFromSupabase() {
        if (!currentUser || !supabaseClient) return;
        restoreUserCodesFromStorage();
        try {
            const { data: userCodes, error: codesError } = await supabaseClient
                .from('user_codes').select('code_id').eq('user_id', currentUser.id);
            if (codesError) {
                console.warn('⚠️ فشل جلب الأكواد:', codesError);
                return;
            }
            if (!userCodes || userCodes.length === 0) return;
            const codeIds = userCodes.map(uc => uc.code_id);
            const { data: codesData, error: codesDataError } = await supabaseClient
                .from('codes').select('*').in('id', codeIds);
            if (codesDataError) {
                console.warn('⚠️ فشل جلب تفاصيل الأكواد:', codesDataError);
                return;
            }

            let restoredCount = 0;
            codesData.forEach(codeRecord => {
                data.sections.forEach(section => {
                    section.teachers.forEach(teacher => {
                        if (!teacher.codes) teacher.codes = [];
                        const localCode = teacher.codes.find(c => c.code === codeRecord.code);
                        if (localCode) {
                            if (!localCode.used) {
                                localCode.used = true;
                                localCode.userId = currentUser.id;
                                localCode.userEmail = currentUser.email;
                                localCode.deviceId = codeRecord.device_id || userDeviceId;
                                localCode.usedAt = codeRecord.used_at || new Date().toISOString();
                                localCode.locked = codeRecord.is_locked || false;
                                restoredCount++;
                            }
                        }
                    });
                });
            });

            if (restoredCount > 0) {
                saveData();
                updateUserCodesStorage();
                renderAllSectionsAndTeachers();
                renderMyCourses();
                renderAccount();
                updateBadge();
                console.log('✅ تم استعادة', restoredCount, 'كود من Supabase');
                showToast('success', `✅ تم استعادة ${restoredCount} اشتراك محفوظ`);
            }
        } catch (error) {
            console.warn('⚠️ خطأ في تحميل الأكواد:', error);
        }
    }

    // ===== CODE MANAGEMENT =====
    function getCodesStatus(teacher) {
        if (!teacher.codes) return { total: 0, used: 0, available: 0, locked: 0 };
        const total = teacher.codes.length;
        const used = teacher.codes.filter(c => c.used).length;
        const locked = teacher.codes.filter(c => c.locked).length;
        return { total, used, available: total - used, locked };
    }

    // ===== DATA FUNCTIONS =====
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
            if (supabaseClient) {
                const remoteData = await getSupabaseAcademyData();
                if (remoteData && remoteData.sections && Array.isArray(remoteData.sections)) {
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
                    if (parsed && parsed.sections && Array.isArray(parsed.sections)) {
                        data = parsed;
                        normalizeDataStructure(data);
                        console.log('✅ تم تحميل البيانات من localStorage');
                        return;
                    }
                } catch (e) { console.warn('⚠️ بيانات localStorage تالفة'); }
            }
            // بيانات افتراضية مع الأقسام
            data = { sections: JSON.parse(JSON.stringify(defaultSections)) };
            normalizeDataStructure(data);
            localStorage.setItem('academyData', JSON.stringify(data));
            showToast('info', '📝 تم تحميل الأقسام الافتراضية');
        } catch (error) {
            console.warn('⚠️ استخدام البيانات الافتراضية:', error.message);
        }
    }

    function saveData() {
        try {
            localStorage.setItem('academyData', JSON.stringify(data));
            console.log('✅ تم حفظ البيانات بنجاح');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات:', error);
            showToast('error', '⚠️ فشل حفظ البيانات محلياً');
        }
    }

    async function getSupabaseAcademyData() {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient
                .from('academy_data').select('content').eq('id', 'main').maybeSingle();
            if (error) { console.warn('Supabase academy data lookup failed:', error.message || error); return null; }
            return data?.content || null;
        } catch (error) { console.warn('Supabase academy data exception:', error); return null; }
    }

    async function saveSupabaseAcademyData() {
        if (!supabaseClient) return { success: false, error: 'Supabase غير متاح' };
        try {
            const record = { id: 'main', content: data, updated_at: new Date().toISOString() };
            const { error } = await supabaseClient.from('academy_data').upsert(record, { onConflict: 'id' });
            if (error) { console.warn('Supabase academy data save failed:', error.message || error); return { success: false,
                    error }; }
            localStorage.setItem('academyData', JSON.stringify(data));
            return { success: true };
        } catch (error) { console.warn('Supabase academy data save exception:', error); return { success: false,
                error }; }
    }

    // ============================================================
    // عرض الأقسام والمدرسين
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

    function renderSections() {
        if (!sectionsGrid) return;

        if (!data.sections || data.sections.length === 0) {
            sectionsGrid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-light);">
                    <span style="font-size:3rem;display:block;margin-bottom:0.5rem;">📚</span>
                    <h3>لا توجد أقسام</h3>
                    <p>قم بإضافة أقسام من لوحة التحكم</p>
                </div>
            `;
            if (sectionsCount) sectionsCount.textContent = '0 قسم';
            return;
        }

        let html = '';
        data.sections.forEach((section, index) => {
            const teacherCount = section.teachers ? section.teachers.length : 0;
            html += `
                <div class="section-card" onclick="filterBySection('${section.id}')">
                    <span class="section-icon">${section.icon || '📚'}</span>
                    <div class="section-name">${section.name}</div>
                    <div class="section-count">${teacherCount} مدرس</div>
                </div>
            `;
        });

        sectionsGrid.innerHTML = html;
        if (sectionsCount) sectionsCount.textContent = data.sections.length + ' قسم';
    }

    function renderSectionFilter() {
        if (!sectionFilter) return;

        let html = `<button class="section-btn active" data-section="all" onclick="filterTeachers('all')">🏫 الكل</button>`;
        data.sections.forEach(section => {
            html += `<button class="section-btn" data-section="${section.id}" onclick="filterTeachers('${section.id}')">
                ${section.icon || '📚'} ${section.name}
            </button>`;
        });

        sectionFilter.innerHTML = html;
    }

    window.filterTeachers = function(sectionId) {
        filteredSection = sectionId === 'all' ? null : sectionId;

        // تحديث الأزرار
        document.querySelectorAll('.section-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionId);
        });

        renderTeachersInPage2();
    };

    window.filterBySection = function(sectionId) {
        // التنقل إلى صفحة المدرسين وتطبيق الفلتر
        navigateTo('teachers');
        setTimeout(() => {
            filterTeachers(sectionId);
        }, 300);
    };

    function renderTeachers(teachers, container) {
        if (!container) return;

        if (!teachers || teachers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align:center;padding:3rem 1rem;color:var(--text-light);">
                    <div style="font-size:4rem;margin-bottom:1rem;">👨‍🏫</div>
                    <h3 style="color:var(--text);">لا يوجد مدرسون</h3>
                    <p>قم بإضافة مدرسين من لوحة التحكم</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="row">
                <div class="row-header">
                    <h2 class="row-title"><i class="fas fa-chalkboard-teacher"></i> المدرسون</h2>
                    <span class="row-more">${teachers.length} مدرس</span>
                </div>
                <div class="teachers-grid">
        `;

        teachers.forEach((teacher, index) => {
            const hasAccess = hasAccessToTeacher(teacher);
            const imageUrl = teacher.image || '';
            const emoji = teacher.emoji || '👨‍🏫';
            const name = teacher.name || 'مدرس';
            const subject = teacher.subject || '';
            const semestersCount = Array.isArray(teacher.semesters) ? teacher.semesters.length : 0;
            const sectionName = teacher._sectionName || '';

            html += `
                <div class="teacher-card" onclick="openTeacher(${teacher._sectionIndex}, ${teacher._teacherIndex})">
                    <div class="teacher-card-image">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${name}" onerror="this.style.display='none'; this.parentElement.querySelector('.teacher-emoji').style.display='block';">` : ''}
                        <span class="teacher-emoji" style="${imageUrl ? 'display:none;' : 'display:block;'}">${emoji}</span>
                        ${hasAccess ? '<div class="teacher-badge">✅</div>' : ''}
                    </div>
                    <div class="teacher-card-info">
                        <h3>${name}</h3>
                        ${subject ? `<div class="teacher-subject">${subject}</div>` : ''}
                        <div class="teacher-stats">📚 ${semestersCount} فصول | ${sectionName}</div>
                    </div>
                    <div class="teacher-card-overlay">
                        <i class="fas fa-chevron-left"></i>
                        <span>عرض</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    }

    function renderTeachersInPage1() {
        const allTeachers = getAllTeachers();
        renderTeachers(allTeachers, teachersContainer);
    }

    function renderTeachersInPage2() {
        let teachers = getAllTeachers();
        if (filteredSection) {
            teachers = teachers.filter(t => t._sectionId === filteredSection);
        }
        renderTeachers(teachers, teachersContainer2);
    }

    function renderAllSectionsAndTeachers() {
        renderSections();
        renderSectionFilter();
        renderTeachersInPage1();
        renderTeachersInPage2();
    }

    // ===== OPEN TEACHER =====
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
            renderAllSectionsAndTeachers();
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

    // ===== MY COURSES =====
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

    // ===== ACCOUNT =====
    function renderAccount() {
        if (!currentUser) {
            accountName.textContent = 'غير مسجل';
            accountEmail.textContent = 'يرجى تسجيل الدخول';
            accountAvatar.textContent = '👤';
            accountRegistered.textContent = '--';
            accountCourses.textContent = '0';
            accountCodes.textContent = '0';
            adminPanelBtn.style.display = 'none';
            return;
        }

        const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'مستخدم';
        accountName.textContent = name;
        accountEmail.textContent = currentUser.email;
        accountAvatar.textContent = name.charAt(0).toUpperCase();

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

        isUserAdmin(currentUser.email).then(isAdmin => {
            if (isAdmin) {
                adminPanelBtn.style.display = 'flex';
                console.log('👑 مرحباً أيها المشرف! زر الإدارة ظاهر');
            } else {
                adminPanelBtn.style.display = 'none';
                console.log('👤 مستخدم عادي، زر الإدارة مخفي');
            }
        });
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

    // ===== AUTH =====
    async function signOut() {
        try {
            localStorage.removeItem('devAcademicUser');
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            currentUser = null;
            activeTeacher = null;
            activeTeacherIndex = null;
            activeSectionIndex = null;
            updateUI();
            if (adminPanel) adminPanel.classList.remove('active');
            if (semestersModal) semestersModal.classList.remove('active');
            if (lecturesModal) lecturesModal.classList.remove('active');
            if (teachersModal) teachersModal.classList.remove('active');
            if (editLectureModal) editLectureModal.classList.remove('active');
            renderMyCourses();
            renderAccount();
            updateBadge();
            renderAllSectionsAndTeachers();
            showToast('success', '✅ تم تسجيل الخروج بنجاح');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        } catch (error) {
            console.warn('SignOut exception:', error);
            showToast('error', '❌ حدث خطأ أثناء تسجيل الخروج');
        }
    }

    // ===== UPDATE UI =====
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

    // ===== NAVIGATION =====
    window.navigateTo = function(page) {
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
        const targetPage = document.getElementById('page-' + page);
        if (targetPage) targetPage.style.display = 'block';

        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-links li a[data-page="${page}"]`)?.closest('li')?.classList.add('active');

        bottomNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        const hero = document.getElementById('hero');
        if (hero) {
            hero.style.display = page === 'home' ? 'flex' : 'none';
        }

        if (page === 'my-courses') {
            renderMyCourses();
            updateBadge();
        }
        if (page === 'account') {
            renderAccount();
        }
        if (page === 'teachers' || page === 'home') {
            renderAllSectionsAndTeachers();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ===== NAVIGATION EVENTS =====
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

    // ===== USER PROFILE CLICK =====
    document.getElementById('userProfileBtn')?.addEventListener('click', function() {
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        navigateTo('account');
    });

    // ===== LOGOUT =====
    logoutAccountBtn?.addEventListener('click', signOut);

    // ===== ADMIN PANEL BUTTON =====
    adminPanelBtn?.addEventListener('click', function() {
        if (!currentUser) {
            showToast('warning', '⚠️ يرجى تسجيل الدخول أولاً');
            return;
        }
        isUserAdmin(currentUser.email).then(isAdmin => {
            if (isAdmin) {
                adminPanel.classList.add('active');
                updateAdminSelects();
                updatePendingChanges();
                loadAdminsList();
                showToast('success', '🔓 مرحباً بك في لوحة التحكم');
            } else {
                showToast('error', '❌ غير مصرح لك بالدخول إلى لوحة التحكم');
            }
        });
    });

    adminClose?.addEventListener('click', function() {
        adminPanel.classList.remove('active');
    });

    // ===== THEME =====
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('devAcademicTheme', isDarkMode ? 'dark' : 'light');
        showToast('info', isDarkMode ? '🌙 تم تفعيل الوضع المظلم' : '☀️ تم تفعيل الوضع الفاتح');
    }

    themeToggle.addEventListener('click', toggleTheme);

    // ===== SEARCH =====
    function applyFilters() {
        const term = searchInput.value.trim().toLowerCase();
        if (term === '') {
            renderAllSectionsAndTeachers();
            return;
        }

        const allTeachers = getAllTeachers();
        const filtered = allTeachers.filter(t =>
            t.name.toLowerCase().includes(term) ||
            (t.subject && t.subject.toLowerCase().includes(term)) ||
            (t.description && t.description.toLowerCase().includes(term)) ||
            (t._sectionName && t._sectionName.toLowerCase().includes(term))
        );

        renderTeachers(filtered, teachersContainer);
        renderTeachers(filtered, teachersContainer2);
    }

    searchBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') applyFilters();
    });

    // ===== MODALS =====
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

    // ===== VIDEO PLAYER EVENTS =====
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
    // دوال إدارة الأقسام والمدرسين في لوحة التحكم
    // ============================================================

    // ===== تحديث القوائم المنسدلة =====
    function updateAdminSelects() {
        // تحديث جميع القوائم التي تحتاج إلى أقسام
        const sectionSelects = [
            'teacherSection', 'semesterSection', 'lectureSection',
            'codeSection', 'editTeacherSection', 'editLectureSection',
            'deleteSection', 'deleteTeacherSection', 'deleteSemesterSection',
            'deleteLectureSection'
        ];

        sectionSelects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const currentValue = select.value;
            let options = '<option value="">اختر القسم...</option>';
            data.sections.forEach((s, i) => {
                options += `<option value="${i}">${s.icon || '📚'} ${s.name}</option>`;
            });
            select.innerHTML = options;
            if (currentValue && data.sections[parseInt(currentValue)]) {
                select.value = currentValue;
            }
        });

        // تحديث القوائم المعتمدة على المدرس
        updateTeacherSelects();
        updateCodeTeacherSelect();
        updateEditTeacherSelect();
        updateDeleteSelects();

        // تحديث القوائم المتسلسلة
        setTimeout(() => {
            updateSemesterSelects();
            updateDeleteSemesterSelects();
            updateDeleteLectureSemesters();
            updateEditLectureSemesters();
            updateEditTeacherData();
        }, 100);
    }

    function updateTeacherSelects() {
        const teacherSelects = ['semesterTeacher', 'lectureTeacher', 'editTeacherSelect', 'deleteTeacherSelect',
            'deleteSemesterTeacher', 'deleteLectureTeacher', 'editLectureTeacher'
        ];

        teacherSelects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            // نبحث عن القسم المرتبط
            let sectionIndex = -1;
            if (id === 'semesterTeacher' || id === 'semesterSection') {
                const sectionSelect = document.getElementById('semesterSection');
                sectionIndex = parseInt(sectionSelect?.value);
            } else if (id === 'lectureTeacher') {
                const sectionSelect = document.getElementById('lectureSection');
                sectionIndex = parseInt(sectionSelect?.value);
            } else if (id === 'editTeacherSelect') {
                const sectionSelect = document.getElementById('editTeacherSection');
                sectionIndex = parseInt(sectionSelect?.value);
            } else if (id === 'editLectureTeacher') {
                const sectionSelect = document.getElementById('editLectureSection');
                sectionIndex = parseInt(sectionSelect?.value);
            } else if (id === 'deleteTeacherSelect' || id === 'deleteTeacherSection') {
                const sectionSelect = document.getElementById('deleteTeacherSection');
                sectionIndex = parseInt(sectionSelect?.value);
            } else if (id === 'deleteSemesterTeacher') {
                const sectionSelect = document.getElementById('deleteSemesterSection');
                sectionIndex = parseInt(sectionSelect?.value);
            } else if (id === 'deleteLectureTeacher') {
                const sectionSelect = document.getElementById('deleteLectureSection');
                sectionIndex = parseInt(sectionSelect?.value);
            }

            const currentValue = select.value;
            let options = '<option value="">اختر المدرس...</option>';

            if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
                const section = data.sections[sectionIndex];
                section.teachers.forEach((t, i) => {
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

    function updateCodeTeacherSelect() {
        const sectionSelect = document.getElementById('codeSection');
        const teacherSelect = document.getElementById('codeTeacherSelect');
        if (!sectionSelect || !teacherSelect) return;

        const sectionIndex = parseInt(sectionSelect.value);
        const currentValue = teacherSelect.value;
        let options = '<option value="">اختر المدرس...</option>';

        if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
            data.sections[sectionIndex].teachers.forEach((t, i) => {
                options += `<option value="${i}">${t.name}</option>`;
            });
        }

        teacherSelect.innerHTML = options;
        if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
            teacherSelect.value = currentValue;
        }
    }

    function updateEditTeacherSelect() {
        const sectionSelect = document.getElementById('editTeacherSection');
        const teacherSelect = document.getElementById('editTeacherSelect');
        if (!sectionSelect || !teacherSelect) return;

        const sectionIndex = parseInt(sectionSelect.value);
        const currentValue = teacherSelect.value;
        let options = '<option value="">اختر المدرس...</option>';

        if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
            data.sections[sectionIndex].teachers.forEach((t, i) => {
                options += `<option value="${i}">${t.name}</option>`;
            });
        }

        teacherSelect.innerHTML = options;
        if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
            teacherSelect.value = currentValue;
        }
    }

    function updateDeleteSelects() {
        // تحديث deleteTeacherSelect عند تغيير القسم
        const sectionSelect = document.getElementById('deleteTeacherSection');
        const teacherSelect = document.getElementById('deleteTeacherSelect');
        if (sectionSelect && teacherSelect) {
            const sectionIndex = parseInt(sectionSelect.value);
            const currentValue = teacherSelect.value;
            let options = '<option value="">اختر المدرس...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
                data.sections[sectionIndex].teachers.forEach((t, i) => {
                    options += `<option value="${i}">${t.name}</option>`;
                });
            }
            teacherSelect.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
                teacherSelect.value = currentValue;
            }
        }

        // تحديث deleteSemesterTeacher
        const semSectionSelect = document.getElementById('deleteSemesterSection');
        const semTeacherSelect = document.getElementById('deleteSemesterTeacher');
        if (semSectionSelect && semTeacherSelect) {
            const sectionIndex = parseInt(semSectionSelect.value);
            const currentValue = semTeacherSelect.value;
            let options = '<option value="">اختر المدرس...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
                data.sections[sectionIndex].teachers.forEach((t, i) => {
                    options += `<option value="${i}">${t.name}</option>`;
                });
            }
            semTeacherSelect.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
                semTeacherSelect.value = currentValue;
            }
        }

        // تحديث deleteLectureTeacher
        const lecSectionSelect = document.getElementById('deleteLectureSection');
        const lecTeacherSelect = document.getElementById('deleteLectureTeacher');
        if (lecSectionSelect && lecTeacherSelect) {
            const sectionIndex = parseInt(lecSectionSelect.value);
            const currentValue = lecTeacherSelect.value;
            let options = '<option value="">اختر المدرس...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
                data.sections[sectionIndex].teachers.forEach((t, i) => {
                    options += `<option value="${i}">${t.name}</option>`;
                });
            }
            lecTeacherSelect.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
                lecTeacherSelect.value = currentValue;
            }
        }
    }

    function updateSemesterSelects() {
        const teacherSelect = document.getElementById('lectureTeacher');
        const semesterSelect = document.getElementById('lectureSemester');
        if (!teacherSelect || !semesterSelect) return;

        const sectionSelect = document.getElementById('lectureSection');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect.value);

        let options = '<option value="">اختر الفصل...</option>';
        if (!isNaN(sectionIndex) && sectionIndex >= 0 && !isNaN(teacherIndex) && teacherIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[teacherIndex]) {
            const teacher = data.sections[sectionIndex].teachers[teacherIndex];
            if (teacher.semesters) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
    }

    function updateDeleteSemesterSelects() {
        const teacherSelect = document.getElementById('deleteSemesterTeacher');
        const semesterSelect = document.getElementById('deleteSemesterSelect');
        if (!teacherSelect || !semesterSelect) return;

        const sectionSelect = document.getElementById('deleteSemesterSection');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect.value);

        let options = '<option value="">اختر الفصل...</option>';
        if (!isNaN(sectionIndex) && sectionIndex >= 0 && !isNaN(teacherIndex) && teacherIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[teacherIndex]) {
            const teacher = data.sections[sectionIndex].teachers[teacherIndex];
            if (teacher.semesters) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
    }

    function updateDeleteLectureSemesters() {
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const semesterSelect = document.getElementById('deleteLectureSemester');
        if (!teacherSelect || !semesterSelect) return;

        const sectionSelect = document.getElementById('deleteLectureSection');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect.value);

        let options = '<option value="">اختر الفصل...</option>';
        if (!isNaN(sectionIndex) && sectionIndex >= 0 && !isNaN(teacherIndex) && teacherIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[teacherIndex]) {
            const teacher = data.sections[sectionIndex].teachers[teacherIndex];
            if (teacher.semesters) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
        document.getElementById('deleteLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';
    }

    function updateEditLectureSemesters() {
        const teacherSelect = document.getElementById('editLectureTeacher');
        const semesterSelect = document.getElementById('editLectureSemester');
        if (!teacherSelect || !semesterSelect) return;

        const sectionSelect = document.getElementById('editLectureSection');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect.value);

        let options = '<option value="">اختر الفصل...</option>';
        if (!isNaN(sectionIndex) && sectionIndex >= 0 && !isNaN(teacherIndex) && teacherIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[teacherIndex]) {
            const teacher = data.sections[sectionIndex].teachers[teacherIndex];
            if (teacher.semesters) {
                teacher.semesters.forEach((s, i) => {
                    options += `<option value="${i}">الفصل ${s.number} - ${s.description || ''}</option>`;
                });
            }
        }
        semesterSelect.innerHTML = options;
        document.getElementById('editLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';
    }

    // ===== تحميل بيانات المدرس للتعديل =====
    function updateEditTeacherData() {
        const sectionSelect = document.getElementById('editTeacherSection');
        const teacherSelect = document.getElementById('editTeacherSelect');

        if (!sectionSelect || !teacherSelect) return;

        const sectionIndex = parseInt(sectionSelect.value);
        const teacherIndex = parseInt(teacherSelect.value);

        if (isNaN(sectionIndex) || sectionIndex < 0 || isNaN(teacherIndex) || teacherIndex < 0 ||
            !data.sections[sectionIndex]?.teachers[teacherIndex]) {
            document.getElementById('editTeacherName').value = '';
            document.getElementById('editTeacherSubject').value = '';
            document.getElementById('editTeacherDesc').value = '';
            document.getElementById('editTeacherImage').value = '';
            return;
        }

        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        document.getElementById('editTeacherName').value = teacher.name || '';
        document.getElementById('editTeacherSubject').value = teacher.subject || '';
        document.getElementById('editTeacherDesc').value = teacher.description || '';
        document.getElementById('editTeacherImage').value = teacher.image || '';
        document.getElementById('editTeacherMessage').innerHTML = '';
    }

    function updatePendingChanges() {
        if (pendingChangesSpan) pendingChangesSpan.textContent = pendingChanges;
    }

    // ============================================================
    // ===== إضافة قسم =====
    // ============================================================
    addSectionForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('sectionName').value.trim();
        const icon = document.getElementById('sectionIcon').value.trim() || '📚';

        if (!name) {
            showToast('warning', '⚠️ يرجى إدخال اسم القسم');
            return;
        }

        const newSection = {
            id: 'sec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            name: name,
            icon: icon,
            teachers: []
        };

        data.sections.push(newSection);
        saveData();
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        addSectionForm.reset();
        showToast('success', `✅ تم إضافة القسم "${name}" بنجاح`);
    });

    // ============================================================
    // ===== إضافة مدرس =====
    // ============================================================
    addTeacherForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const sectionSelect = document.getElementById('teacherSection');
        const sectionIndex = parseInt(sectionSelect?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '⚠️ يرجى اختيار القسم');
            return;
        }

        const name = document.getElementById('teacherName').value.trim();
        const emoji = document.getElementById('teacherEmoji').value.trim() || '🧑‍🏫';
        const subject = document.getElementById('teacherSubject').value.trim();
        const description = document.getElementById('teacherDesc').value.trim();
        const image = document.getElementById('teacherImage').value.trim();

        if (!name) {
            showToast('warning', '⚠️ يرجى إدخال اسم المدرس');
            return;
        }

        const newTeacher = {
            name,
            emoji,
            subject: subject || 'مدرس',
            description: description || '',
            image: image || '',
            codes: [],
            semesters: []
        };

        data.sections[sectionIndex].teachers.push(newTeacher);
        saveData();
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        addTeacherForm.reset();
        showToast('success', `✅ تم إضافة المدرس "${name}" بنجاح`);
    });

    // ============================================================
    // ===== إضافة فصل =====
    // ============================================================
    addSemesterForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const sectionSelect = document.getElementById('semesterSection');
        const teacherSelect = document.getElementById('semesterTeacher');
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const number = parseInt(document.getElementById('semesterNumber').value);
        const description = document.getElementById('semesterDesc').value.trim();

        if (isNaN(sectionIndex) || sectionIndex < 0 || isNaN(teacherIndex) || teacherIndex < 0 || !number) {
            showToast('warning', '⚠️ يرجى اختيار القسم والمدرس وإدخال رقم الفصل');
            return;
        }

        const newSemester = {
            number: number,
            description: description || `الفصل ${number}`,
            lectures: []
        };

        data.sections[sectionIndex].teachers[teacherIndex].semesters.push(newSemester);
        saveData();
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        addSemesterForm.reset();
        showToast('success', `✅ تم إضافة الفصل ${number} بنجاح`);
    });

    // ============================================================
    // ===== إضافة محاضرة =====
    // ============================================================
    addLectureForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const sectionSelect = document.getElementById('lectureSection');
        const teacherSelect = document.getElementById('lectureTeacher');
        const semesterSelect = document.getElementById('lectureSemester');

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        const number = parseInt(document.getElementById('lectureNumber').value);
        const title = document.getElementById('lectureTitle').value.trim();
        const youtubeUrl = document.getElementById('lectureUrl').value.trim();
        const isFree = document.getElementById('lectureFree').value === 'true';

        if (isNaN(sectionIndex) || sectionIndex < 0 || isNaN(teacherIndex) || teacherIndex < 0 ||
            isNaN(semesterIndex) || semesterIndex < 0 || !number || !title || !youtubeUrl) {
            showToast('warning', '⚠️ يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        const isValidUrl = youtubeUrl.includes('mediadelivery') ||
            youtubeUrl.includes('youtube') ||
            youtubeUrl.includes('youtu.be') ||
            youtubeUrl.includes('player.') ||
            youtubeUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i);

        if (!isValidUrl) {
            showToast('warning', '⚠️ رابط الفيديو غير صحيح. استخدم رابط mediadelivery أو YouTube');
            return;
        }

        const newLecture = { number, title, youtubeUrl, isFree };
        data.sections[sectionIndex].teachers[teacherIndex].semesters[semesterIndex].lectures.push(newLecture);
        saveData();
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();
        addLectureForm.reset();
        showToast('success', `✅ تم إضافة المحاضرة "${title}" بنجاح`);
    });

    // ============================================================
    // ===== إدارة الأكواد =====
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
            usedAt: null
        });

        saveData();
        pendingChanges++;
        updatePendingChanges();
        updateCodesManagement();
        if (codeInput) codeInput.value = '';
        codeMessage.innerHTML = `✅ تم إضافة الكود: ${code}`;
        codeMessage.style.color = '#22c55e';
        showToast('success', `✅ تم إضافة الكود: ${code}`);
        updateAdminSelects();
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
                usedAt: null
            });
            newCodes.push(newCode);
        }

        saveData();
        pendingChanges++;
        updatePendingChanges();
        updateCodesManagement();
        showToast('success', `✅ تم إنشاء ${newCodes.length} أكواد جديدة`);
        updateAdminSelects();
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
                    <thead><tr><th>#</th><th>الكود</th><th>الحالة</th><th>تاريخ الاستخدام</th><th>الإجراءات</th></tr></thead>
                    <tbody>
        `;

        if (teacher.codes && teacher.codes.length > 0) {
            teacher.codes.forEach((c, index) => {
                const isUsed = c.used;
                const isLocked = c.locked || false;
                const isMyCode = c.userEmail === currentUser?.email;
                let statusText = '',
                    statusColor = '#22c55e',
                    usedAtDisplay = '—';

                if (isLocked) { statusText = '🔒 مقفل';
                    statusColor = '#f59e0b'; } else if (isUsed) {
                    statusText = isMyCode ? '✅ حسابك' : '❌ مستخدم';
                    statusColor = isMyCode ? '#22c55e' : '#ef4444';
                    usedAtDisplay = c.usedAt ? new Date(c.usedAt).toLocaleString('ar') : 'غير معروف';
                } else { statusText = '🟢 متاح';
                    statusColor = '#22c55e'; }

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code style="font-weight:700;color:${statusColor};">${c.code}</code></td>
                        <td><span style="color:${statusColor};">${statusText}</span></td>
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
            html += `<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:1rem 0;">لا توجد أكواد</td></tr>`;
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }

    window.toggleCodeLock = function(sectionIndex, teacherIndex, code) {
        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) { showToast('error', '❌ المدرس غير موجود'); return; }

        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) { showToast('error', '❌ الكود غير موجود'); return; }

        codeData.locked = !codeData.locked;
        saveData();
        pendingChanges++;
        updatePendingChanges();
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
        pendingChanges++;
        updatePendingChanges();
        updateCodesManagement();
        showToast('success', `✅ تم حذف الكود: ${code}`);
    };

    // ============================================================
    // ===== EDIT TEACHER =====
    // ============================================================
    document.getElementById('editTeacherSection')?.addEventListener('change', function() {
        updateEditTeacherSelect();
        updateEditTeacherData();
    });

    document.getElementById('editTeacherSelect')?.addEventListener('change', updateEditTeacherData);

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
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();

        messageEl.innerHTML = `✅ تم تعديل بيانات المدرس "${newName}" بنجاح!`;
        messageEl.style.color = '#22c55e';
        showToast('success', `✅ تم تعديل بيانات المدرس "${newName}"`);
    });

    // ============================================================
    // ===== DELETE FUNCTIONS =====
    // ============================================================

    // حذف قسم
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
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();

        const msg = document.getElementById('deleteSectionMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف القسم "${section.name}" بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف القسم "${section.name}"`);
    };

    // حذف مدرس
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
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();

        const msg = document.getElementById('deleteTeacherMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف المدرس "${teacher.name}" بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف المدرس "${teacher.name}"`);
    };

    // حذف فصل
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
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();

        const msg = document.getElementById('deleteSemesterMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف الفصل ${semester.number} بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف الفصل ${semester.number}`);
        updateDeleteSemesterSelects();
    };

    // حذف محاضرة
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
        renderAllSectionsAndTeachers();
        updateAdminSelects();
        pendingChanges++;
        updatePendingChanges();

        const msg = document.getElementById('deleteLectureMessage');
        if (msg) { msg.innerHTML = `✅ تم حذف المحاضرة "${lecture.title}" بنجاح`;
            msg.style.color = '#22c55e'; }
        showToast('success', `✅ تم حذف المحاضرة "${lecture.title}"`);
        updateDeleteLectureSemesters();
    };

    // ============================================================
    // ===== EDIT LECTURE =====
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
            editLectureMessage.innerHTML = '⚠️ رابط الفيديو غير صحيح. استخدم رابط mediadelivery أو YouTube';
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
        renderAllSectionsAndTeachers();
        pendingChanges++;
        updatePendingChanges();

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
    // ===== ADMIN MANAGEMENT =====
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
                messageEl.innerHTML = `
                    ⚠️ المستخدم <strong>${email}</strong> غير موجود في جدول المستخدمين العام.
                    <br><br>
                    <button onclick="fixUserAndAddAdmin('${email}')" style="background:var(--primary);color:white;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">
                        <i class="fas fa-sync"></i> إصلاح المشكلة وإضافة المشرف
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
                messageEl.innerHTML = '❌ فشل إضافة المشرف: ' + insertError.message;
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
            console.error('Error adding admin:', error);
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
                messageEl.innerHTML = `
                    ❌ فشل إضافة المستخدم: ${rpcError.message}
                    <br><br>
                    <button onclick="copyRpcFunction()" style="background:var(--primary);color:white;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">
                        <i class="fas fa-copy"></i> نسخ كود الدالة
                    </button>
                `;
                messageEl.style.color = '#ef4444';
                return;
            }

            if (result && result.success) {
                messageEl.innerHTML = `✅ تم إصلاح المشكلة وإضافة المستخدم <strong>${email}</strong> كمشرف بنجاح!`;
                messageEl.style.color = '#22c55e';
                showToast('success', `✅ تم إصلاح المشكلة وإضافة المشرف: ${email}`);
                loadAdminsList();
            } else {
                messageEl.innerHTML = '❌ ' + (result?.message || 'حدث خطأ غير معروف');
                messageEl.style.color = '#ef4444';
            }

        } catch (error) {
            messageEl.innerHTML = '❌ حدث خطأ: ' + error.message;
            messageEl.style.color = '#ef4444';
            console.error('Error fixing user:', error);
        }
    };

    window.copyRpcFunction = function() {
        const sql = `
create or replace function add_user_and_admin(p_email text)
returns jsonb language plpgsql security definer as $$
declare
    v_user_id uuid;
    v_result jsonb;
begin
    select id into v_user_id from public.users where email = p_email;
    if v_user_id is null then
        v_user_id := gen_random_uuid();
        insert into public.users (id, email, full_name, registered_at)
        values (v_user_id, p_email, split_part(p_email, '@', 1), now());
    end if;
    insert into public.admins (uid, email, role)
    values (v_user_id, p_email, 'admin')
    on conflict (uid) do nothing;
    v_result := jsonb_build_object(
        'success', true,
        'message', 'تم إضافة المستخدم والمشرف بنجاح',
        'user_id', v_user_id::text,
        'email', p_email
    );
    return v_result;
exception when others then
    return jsonb_build_object(
        'success', false,
        'message', 'حدث خطأ: ' || sqlerrm
    );
end;
$$;
grant execute on function add_user_and_admin(text) to authenticated;
        `;

        navigator.clipboard.writeText(sql).then(() => {
            showToast('success', '✅ تم نسخ كود الدالة RPC');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = sql;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('success', '✅ تم نسخ كود الدالة RPC');
        });
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
            console.error('Error loading admins:', error);
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
            console.error('Error deleting admin:', error);
        }
    };

    // ============================================================
    // ===== PUBLISH =====
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
        if (!(isAdminLoggedIn || isAdmin)) {
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

    createTableBtn?.addEventListener('click', async function() {
        const sql =
            `create table if not exists academy_data (\n  id text primary key,\n  content jsonb not null,\n  inserted_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);`;
        try {
            await navigator.clipboard.writeText(sql);
            showToast('info', '✅ تم نسخ SQL إلى الحافظة');
        } catch (err) {
            showToast('error', '❌ فشل نسخ SQL');
        }
    });

    // ============================================================
    // ===== USERS TABLE =====
    // ============================================================
    function renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const usersMap = new Map();

        data.sections.forEach(section => {
            section.teachers.forEach(teacher => {
                if (teacher.codes) {
                    teacher.codes.forEach(c => {
                        if (c.used && c.userEmail) {
                            if (!usersMap.has(c.userEmail)) {
                                usersMap.set(c.userEmail, {
                                    email: c.userEmail,
                                    userId: c.userId || 'غير معروف',
                                    courses: [],
                                    registeredAt: c.usedAt || new Date().toISOString()
                                });
                            }
                            if (!usersMap.get(c.userEmail).courses.includes(teacher.name)) {
                                usersMap.get(c.userEmail).courses.push(teacher.name);
                            }
                        }
                    });
                }
            });
        });

        if (usersMap.size === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">لا يوجد مستخدمين مسجلين</td></tr>';
            return;
        }

        let html = '';
        let index = 1;
        usersMap.forEach((user, email) => {
            const isAdmin = email === 'zzccvc99@gmail.com' || email === 'sajadsarmd200@gmail.com' || email === 'wisaamhs90@gmail.com';
            html += `
                <tr>
                    <td>${index++}</td>
                    <td>${email}</td>
                    <td>${user.courses.join('، ')}</td>
                    <td>${new Date(user.registeredAt).toLocaleDateString('ar')}</td>
                    <td><span class="badge ${isAdmin ? 'admin' : 'user'}">${isAdmin ? 'مدير' : 'مستخدم'}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // ============================================================
    // ===== TAB EVENTS =====
    // ============================================================
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
                updateAdminSelects();
            }
            if (this.dataset.tab === 'edit-lecture') {
                updateEditLectureSemesters();
            }
            if (this.dataset.tab === 'users') {
                renderUsersTable();
            }
            if (this.dataset.tab === 'add-admin') {
                loadAdminsList();
            }
            if (this.dataset.tab === 'edit-teacher') {
                updateEditTeacherSelect();
                updateEditTeacherData();
            }
            if (this.dataset.tab === 'add-teacher' || this.dataset.tab === 'add-semester' ||
                this.dataset.tab === 'add-lecture' || this.dataset.tab === 'add-section') {
                updateAdminSelects();
            }
        });
    });

    // ============================================================
    // ===== EVENT LISTENERS FOR DEPENDENT SELECTS =====
    // ============================================================

    // تحديث قائمة المدرسين عند تغيير القسم
    document.getElementById('teacherSection')?.addEventListener('change', function() {
        updateAdminSelects();
    });

    document.getElementById('semesterSection')?.addEventListener('change', function() {
        updateAdminSelects();
    });

    document.getElementById('lectureSection')?.addEventListener('change', function() {
        updateAdminSelects();
    });

    document.getElementById('codeSection')?.addEventListener('change', function() {
        updateCodeTeacherSelect();
        updateCodesManagement();
    });

    document.getElementById('codeTeacherSelect')?.addEventListener('change', function() {
        updateCodesManagement();
    });

    document.getElementById('editTeacherSection')?.addEventListener('change', function() {
        updateEditTeacherSelect();
        updateEditTeacherData();
    });

    document.getElementById('editLectureSection')?.addEventListener('change', function() {
        updateAdminSelects();
    });

    document.getElementById('editLectureTeacher')?.addEventListener('change', function() {
        updateEditLectureSemesters();
    });

    document.getElementById('editLectureSemester')?.addEventListener('change', function() {
        const sectionSelect = document.getElementById('editLectureSection');
        const teacherSelect = document.getElementById('editLectureTeacher');
        const semesterSelect = document.getElementById('editLectureSemester');

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        const lectureSelect = document.getElementById('editLectureSelect');

        let options = '<option value="">اختر المحاضرة...</option>';
        if (!isNaN(sectionIndex) && sectionIndex >= 0 && !isNaN(teacherIndex) && teacherIndex >= 0 &&
            !isNaN(semesterIndex) && semesterIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures) {
            const lectures = data.sections[sectionIndex].teachers[teacherIndex].semesters[semesterIndex].lectures;
            lectures.forEach((l, i) => {
                options += `<option value="${i}">#${l.number} - ${l.title}</option>`;
            });
        }
        if (lectureSelect) lectureSelect.innerHTML = options;
    });

    document.getElementById('deleteTeacherSection')?.addEventListener('change', function() {
        updateAdminSelects();
    });

    document.getElementById('deleteSemesterSection')?.addEventListener('change', function() {
        updateAdminSelects();
    });

    document.getElementById('deleteSemesterTeacher')?.addEventListener('change', function() {
        updateDeleteSemesterSelects();
    });

    document.getElementById('deleteLectureSection')?.addEventListener('change', function() {
        updateAdminSelects();
    });

    document.getElementById('deleteLectureTeacher')?.addEventListener('change', function() {
        updateDeleteLectureSemesters();
    });

    document.getElementById('deleteLectureSemester')?.addEventListener('change', function() {
        const sectionSelect = document.getElementById('deleteLectureSection');
        const teacherSelect = document.getElementById('deleteLectureTeacher');
        const semesterSelect = document.getElementById('deleteLectureSemester');

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        const lectureSelect = document.getElementById('deleteLectureSelect');

        let options = '<option value="">اختر المحاضرة...</option>';
        if (!isNaN(sectionIndex) && sectionIndex >= 0 && !isNaN(teacherIndex) && teacherIndex >= 0 &&
            !isNaN(semesterIndex) && semesterIndex >= 0 &&
            data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures) {
            const lectures = data.sections[sectionIndex].teachers[teacherIndex].semesters[semesterIndex].lectures;
            lectures.forEach((l, i) => {
                options += `<option value="${i}">#${l.number} - ${l.title}</option>`;
            });
        }
        if (lectureSelect) lectureSelect.innerHTML = options;
    });

    // ============================================================
    // ===== NAVBAR SCROLL =====
    // ============================================================
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });

    // ============================================================
    // ===== INIT =====
    // ============================================================
    const savedTheme = localStorage.getItem('devAcademicTheme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    async function init() {
        if (supabaseClient) {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session?.user) {
                    currentUser = session.user;
                    localStorage.setItem('devAcademicUser', JSON.stringify({
                        email: currentUser.email,
                        name: currentUser.user_metadata?.full_name || ''
                    }));
                    updateUI();
                    await loadUserCodesFromSupabase();
                    renderAllSectionsAndTeachers();
                    renderMyCourses();
                    renderAccount();
                    updateBadge();

                    loadingScreen.style.display = 'none';
                    navbar.style.display = 'flex';
                    bottomNav.style.display = 'flex';
                    footer.style.display = 'block';

                    navigateTo('home');
                    showToast('success', '✅ مرحباً بعودتك');
                    console.log('👤 المستخدم:', currentUser.email);
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.warn('Session check error:', error);
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }

        if (supabaseClient && currentUser) {
            try {
                const channel = supabaseClient
                    .channel('public:academy_data')
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'academy_data',
                        filter: 'id=eq.main' }, (payload) => {
                        if (!payload?.new?.content) return;
                        try {
                            const remoteData = payload.new.content;
                            if (JSON.stringify(remoteData) !== JSON.stringify(data)) {
                                data = remoteData;
                                normalizeDataStructure(data);
                                saveData();
                                renderAllSectionsAndTeachers();
                                renderMyCourses();
                                renderAccount();
                                updateBadge();
                                showToast('info', '🔄 تم تحديث البيانات تلقائياً');
                            }
                        } catch (err) { console.warn('Realtime parse error:', err); }
                    })
                    .subscribe();
                console.log('✅ مشترك في تحديثات Supabase');
            } catch (error) {
                console.warn('Supabase realtime subscription failed:', error);
            }
        }

        renderUsersTable();
        updateAdminSelects();
        loadAdminsList();
        console.log('📚 ديف أكاديمي - النظام جاهز مع الأقسام');
        console.log('🔒 جميع الميزات محمية وآمنة');
        console.log('🎥 دعم منصة mediadelivery للتشغيل');
        console.log('👑 قسم إدارة المشرفين مفعل مع دالة RPC');
    }

    loadData().then(init).catch((error) => {
        console.error('Initialization failed:', error);
        window.location.href = 'index.html';
    });

})();