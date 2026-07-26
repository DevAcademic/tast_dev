(function() {
    'use strict';

    // =====    =====
    let isRedirecting = false;

    // =====    =====
    function safeGetElement(id) {
        const el = document.getElementById(id);
        if (!el) console.warn(`  : #${id}`);
        return el;
    }

    function safeSetDisplay(id, value) {
        const el = document.getElementById(id);
        if (el) { el.style.display = value; return true; }
        console.warn(`   display : #${id}`);
        return false;
    }

    function safeSetStyle(id, property, value) {
        const el = document.getElementById(id);
        if (el) { el.style[property] = value; return true; }
        console.warn(`   style : #${id}`);
        return false;
    }

    // =====  F12   =====
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
            (e.ctrlKey && (e.key === 'S' || e.key === 's'))) {
            e.preventDefault();
            showToast('warning', '    ');
            return false;
        }
    });

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showToast('warning', '    ');
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
    let currentFilter = 'all';

    // =====   =====
    const defaultSections = [
        { id: 'first-intermediate', name: ' ', teachers: [] },
        { id: 'second-intermediate', name: ' ', teachers: [] },
        { id: 'third-intermediate', name: ' ', teachers: [] },
        { id: 'fourth-scientific', name: ' ', teachers: [] },
        { id: 'fourth-literary', name: ' ', teachers: [] },
        { id: 'fifth-scientific', name: ' ', teachers: [] },
        { id: 'fifth-literary', name: ' ', teachers: [] },
        { id: 'sixth-scientific', name: ' ', teachers: [] },
        { id: 'sixth-literary', name: ' ', teachers: [] }
    ];

    // =====    () =====
    let contactMessages = [];
    let chatMessages = [];
    let chatRecipient = '';
    let chatRecipientImage = '';
    let chatRecipientEmoji = '';
    let chatTheme = 'light';
    let chatAttachments = [];
    let currentChatTeacher = null;

    let teacherAdmins = [];
    let notifications = [];
    let notificationsEnabled = true;

    // =====    ( TikTok) =====
    let chatConversations = {};

    // ===== DOM Elements   =====
    const loadingScreen = safeGetElement('loadingScreen');
    const navbar = safeGetElement('navbar');
    const bottomNav = safeGetElement('bottomNav');
    const footer = safeGetElement('footer');
    const teachersContainer = safeGetElement('teachersContainer');
    const teachersGridContainer = safeGetElement('teachersGridContainer');
    const teachersGridContainer2 = safeGetElement('teachersGridContainer2');
    const sectionFilter = safeGetElement('sectionFilter');
    const sectionFilter2 = safeGetElement('sectionFilter2');
    const teachersCount = safeGetElement('teachersCount');
    const teachersCount2 = safeGetElement('teachersCount2');
    const searchInput = safeGetElement('searchInput');
    const searchBtn = safeGetElement('searchBtn');
    const videoPlayer = safeGetElement('videoPlayer');
    const closePlayer = safeGetElement('closePlayer');
    const videoWrapper = safeGetElement('videoWrapper');
    const themeToggle = safeGetElement('themeToggle');
    const toastContainer = safeGetElement('toastContainer');
    const userNameDisplay = safeGetElement('userNameDisplay');
    const userAvatar = safeGetElement('userAvatar');

    const adminPanel = safeGetElement('adminPanel');
    const adminClose = safeGetElement('adminClose');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const publishBtn = safeGetElement('publishBtn');
    const pendingChangesSpan = safeGetElement('pendingChanges');
    const createTableBtn = safeGetElement('createTableBtn');

    const addSectionForm = safeGetElement('addSectionForm');
    const addTeacherForm = safeGetElement('addTeacherForm');
    const addSemesterForm = safeGetElement('addSemesterForm');
    const addLectureForm = safeGetElement('addLectureForm');
    const editTeacherForm = safeGetElement('editTeacherForm');

    const teachersModal = safeGetElement('teachersModal');
    const closeTeachersModal = safeGetElement('closeTeachersModal');
    const teachersList = safeGetElement('teachersList');
    const semestersModal = safeGetElement('semestersModal');
    const closeSemestersModal = safeGetElement('closeSemestersModal');
    const semestersList = safeGetElement('semestersList');
    const modalTeacherTitle = safeGetElement('modalTeacherTitle');
    const lecturesModal = safeGetElement('lecturesModal');
    const closeLecturesModal = safeGetElement('closeLecturesModal');
    const lecturesList = safeGetElement('lecturesList');
    const modalSemesterTitle = safeGetElement('modalSemesterTitle');

    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');

    const accountName = safeGetElement('accountName');
    const accountEmail = safeGetElement('accountEmail');
    const accountAvatar = safeGetElement('accountAvatar');
    const accountRegistered = safeGetElement('accountRegistered');
    const accountCourses = safeGetElement('accountCourses');
    const accountCodes = safeGetElement('accountCodes');
    const accountMessages = safeGetElement('accountMessages');
    const logoutAccountBtn = safeGetElement('logoutAccountBtn');
    const adminPanelBtn = safeGetElement('adminPanelBtn');
    const coursesBadge = safeGetElement('coursesBadge');
    const contactBadge = safeGetElement('contactBadge');

    const editLectureModal = safeGetElement('editLectureModal');
    const closeEditLecture = safeGetElement('closeEditLecture');
    const cancelEditLecture = safeGetElement('cancelEditLecture');
    const editLectureForm = safeGetElement('editLectureForm');
    const editLectureTitle = safeGetElement('editLectureTitle');
    const editLectureUrl = safeGetElement('editLectureUrl');
    const editLectureIsFree = safeGetElement('editLectureIsFree');
    const editLectureMessage = safeGetElement('editLectureMessage');

    let editTarget = { sectionIndex: -1, teacherIndex: -1, semesterIndex: -1, lectureIndex: -1 };

    const ADMIN_EMAILS = ['sajadsarmd200@gmail.com', 'zzccvc99@gmail.com'];

    // ============================================================
    // =====     () =====
    // ============================================================

    function isValidImageUrl(url) {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        
        //     
        if (url.startsWith('/storage/') || url.startsWith('file://') || url.startsWith('content://')) {
            return false;
        }
        
        //     data:image ( )
        if (url.startsWith('data:image/')) {
            return true;
        }
        
        //     http  https
        if (url.startsWith('http://') || url.startsWith('https://')) {
            //       
            if (url.includes('Not Found') || url.includes('404') || url.includes('error') || url.includes('null')) {
                return false;
            }
            return true;
        }
        
        //     
        return false;
    }

    function getSafeImageUrl(url) {
        if (!url) return null;
        if (typeof url !== 'string') return null;
        
        //       null
        if (!isValidImageUrl(url)) {
            return null;
        }
        
        //          
        const cleanUrl = url.trim();
        return cleanUrl;
    }

    //    
    function getDefaultAvatar(name) {
        if (!name) return '';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0EA5E9&color=fff&size=128&bold=true`;
    }

    // ============================================================
    //    
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
            showToast('error', '    ');
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

            if (videoWrapper) {
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
            }

            if (videoPlayer) videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', ` : ${title || ''}`);
            return;
        }

        const videoId = extractYouTubeId(videoUrl);
        if (videoId) {
            const embedUrl = getYouTubeEmbedUrl(videoId);
            if (videoWrapper) {
                videoWrapper.innerHTML = `
                    <iframe src="${embedUrl}" 
                            style="border:0;position:absolute;top:0;left:0;height:100%;width:100%;" 
                            allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen"
                            allowfullscreen>
                    </iframe>
                `;
            }

            if (videoPlayer) videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', ` : ${title || ''}`);
            return;
        }

        if (videoUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
            if (videoWrapper) {
                videoWrapper.innerHTML = `
                    <video controls autoplay 
                           style="position:absolute;top:0;left:0;height:100%;width:100%;background:#000;"
                           controlsList="nodownload"
                           playsinline>
                        <source src="${videoUrl}" type="video/mp4">
                            
                    </video>
                `;
            }

            setTimeout(() => {
                if (videoWrapper) {
                    const video = videoWrapper.querySelector('video');
                    if (video) {
                        video.volume = 1.0;
                        video.muted = false;
                    }
                }
            }, 500);

            if (videoPlayer) videoPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
            showToast('info', ` : ${title || ''}`);
            return;
        }

        showToast('error', '    .   mediadelivery  YouTube');
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
        if (!toastContainer) {
            console.warn(' Toast container  ');
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '', error: '', warning: '', info: '' };
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
        if (!teacher) return false;
        if (!currentUser) return false;
        
        //        
        const isTeacherAdmin = isTeacherAdminForTeacher(currentUser.email, teacher.name);
        if (isTeacherAdmin) return true;
        
        //   
        if (!teacher.codes) return false;
        const hasAccess = teacher.codes.some(c => c.used && c.userEmail === currentUser.email && !c.locked);
        return hasAccess;
    }

    // ===== ADMIN VERIFICATION =====
    async function isUserAdmin(email) {
        if (!supabaseClient || !email) {
            return ADMIN_EMAILS.includes(email);
        }

        try {
            const { data, error } = await supabaseClient
                .from('admins')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                return ADMIN_EMAILS.includes(email);
            }

            return !!data;
        } catch (e) {
            return ADMIN_EMAILS.includes(email);
        }
    }

    // ===== CODE VERIFICATION =====
    async function verifyCode(teacher, code) {
        if (!teacher.codes || teacher.codes.length === 0) {
            return { valid: false, message: '    ' };
        }

        if (!currentUser) {
            return { valid: false, message: '      ' };
        }

        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) {
            return { valid: false, message: '   ' };
        }

        if (codeData.locked === true) {
            return { valid: false, message: '      ' };
        }

        if (codeData.used) {
            if (codeData.userEmail === currentUser.email) {
                return { valid: true, message: '    ' };
            } else {
                const usedAt = codeData.usedAt ? new Date(codeData.usedAt).toLocaleString('ar') : '  ';
                return {
                    valid: false,
                    message: `       \n   : ${usedAt}`
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
            console.warn('     Supabase    ');
            savePendingSync(codeData, teacher);
        }

        await addCodeToUserCodes(currentUser.id, codeData.code);
        updateUserCodesStorage();
        renderAllData();
        renderMyCourses();
        renderAccount();
        updateBadge();

        return { valid: true, message: '    -     ' };
    }

    // =====       =====
    function savePendingSync(codeData, teacher) {
        try {
            let pending = JSON.parse(localStorage.getItem('pendingCodeSync') || '[]');
            pending.push({
                code: codeData.code,
                teacherName: teacher.name,
                userEmail: currentUser.email,
                userId: currentUser.id,
                deviceId: userDeviceId,
                usedAt: codeData.usedAt,
                timestamp: Date.now()
            });
            localStorage.setItem('pendingCodeSync', JSON.stringify(pending));
        } catch (e) {
            console.warn('      ');
        }
    }

    // =====     =====
    async function syncPendingCodes() {
        try {
            const pending = JSON.parse(localStorage.getItem('pendingCodeSync') || '[]');
            if (pending.length === 0) return;
            
            let synced = [];
            for (const item of pending) {
                let foundTeacher = null;
                data.sections.forEach(section => {
                    section.teachers.forEach(teacher => {
                        if (teacher.name === item.teacherName && teacher.codes) {
                            const codeData = teacher.codes.find(c => c.code === item.code);
                            if (codeData) {
                                foundTeacher = teacher;
                            }
                        }
                    });
                });
                
                if (foundTeacher) {
                    const result = await syncCodeWithSupabase(foundTeacher, {
                        code: item.code,
                        used: true,
                        userId: item.userId,
                        userEmail: item.userEmail,
                        deviceId: item.deviceId,
                        usedAt: item.usedAt
                    });
                    if (result.success) {
                        synced.push(item.code);
                    }
                }
            }
            
            if (synced.length > 0) {
                const remaining = pending.filter(item => !synced.includes(item.code));
                localStorage.setItem('pendingCodeSync', JSON.stringify(remaining));
                console.log('  ', synced.length, '  Supabase');
            }
        } catch (e) {
            console.warn('    ');
        }
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
                console.warn('      codes:', updateError);
            }

            return { success: true };
        } catch (error) {
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
                return;
            }

            const { data: existing, error: checkError } = await supabaseClient
                .from('user_codes').select('id').eq('user_id', userId).eq('code_id', codeRecord.id).maybeSingle();
            if (existing) {
                return;
            }

            const { error } = await supabaseClient.from('user_codes').insert({
                user_id: userId,
                code_id: codeRecord.id,
                used_at: new Date().toISOString()
            });
            if (error) {
                console.warn('     user_codes:', error);
            }
        } catch (error) {
            console.warn('    :', error);
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
            console.warn('      ');
        }
    }

    async function loadUserCodesFromSupabase() {
        if (!currentUser || !supabaseClient) return;
        restoreUserCodesFromStorage();
        try {
            const { data: userCodes, error: codesError } = await supabaseClient
                .from('user_codes').select('code_id').eq('user_id', currentUser.id);
            if (codesError) {
                return;
            }
            if (!userCodes || userCodes.length === 0) return;
            const codeIds = userCodes.map(uc => uc.code_id);
            const { data: codesData, error: codesDataError } = await supabaseClient
                .from('codes').select('*').in('id', codeIds);
            if (codesDataError) {
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
                renderAllData();
                renderMyCourses();
                renderAccount();
                updateBadge();
                console.log('  ', restoredCount, '  Supabase');
            }
        } catch (error) {
            console.warn('    :', error);
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

    // ============================================================
    // =====    () =====
    // ============================================================

    function loadContactMessages() {
        try {
            const saved = localStorage.getItem('contactMessages');
            if (saved) {
                contactMessages = JSON.parse(saved);
            }
        } catch (e) {
            contactMessages = [];
        }
    }

    function saveContactMessages() {
        try {
            localStorage.setItem('contactMessages', JSON.stringify(contactMessages));
        } catch (e) {
            console.warn('  ');
        }
    }

    function loadTeacherAdmins() {
        try {
            const saved = localStorage.getItem('teacherAdmins');
            if (saved) {
                teacherAdmins = JSON.parse(saved);
            } else {
                teacherAdmins = [];
            }
        } catch (e) {
            teacherAdmins = [];
        }
    }

    function saveTeacherAdmins() {
        try {
            localStorage.setItem('teacherAdmins', JSON.stringify(teacherAdmins));
        } catch (e) {
            console.warn('   ');
        }
    }

    function loadNotifications() {
        try {
            const saved = localStorage.getItem('notifications');
            if (saved) {
                notifications = JSON.parse(saved);
            } else {
                notifications = [];
            }
        } catch (e) {
            notifications = [];
        }
        const notifEnabled = localStorage.getItem('notificationsEnabled');
        if (notifEnabled !== null) {
            notificationsEnabled = notifEnabled === 'true';
        }
        updateNotificationToggleUI();
    }

    function saveNotifications() {
        try {
            localStorage.setItem('notifications', JSON.stringify(notifications));
        } catch (e) {
            console.warn('  ');
        }
    }

    function saveNotificationSettings() {
        try {
            localStorage.setItem('notificationsEnabled', String(notificationsEnabled));
        } catch (e) {
            console.warn('   ');
        }
    }

    function addNotification(title, description, type = 'info') {
        if (!notificationsEnabled) {
            return;
        }
        const notif = {
            id: Date.now(),
            title: title,
            description: description,
            type: type,
            read: false,
            createdAt: new Date().toISOString()
        };
        notifications.unshift(notif);
        if (notifications.length > 50) {
            notifications = notifications.slice(0, 50);
        }
        saveNotifications();
        renderNotifications();
        updateNotificationBadge();

        if (type === 'message') {
            showToast('info', ' ' + title + ': ' + description);
        } else if (type === 'lecture') {
            showToast('success', ' ' + title + ': ' + description);
        } else {
            showToast('info', ' ' + title);
        }
    }

    function renderNotifications() {
        const container = safeGetElement('notifList');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<div class="notif-empty">  </div>';
            return;
        }

        let html = '';
        notifications.forEach(notif => {
            const time = new Date(notif.createdAt).toLocaleString('ar');
            const isRead = notif.read ? '' : 'style="background:var(--bg-hover);"';
            const icon = notif.type === 'message' ? '' : notif.type === 'lecture' ? '' : '';
            html += `
                <div class="notif-item" ${isRead} onclick="markNotificationRead(${notif.id})">
                    <div class="notif-title">${icon} ${notif.title}</div>
                    <div class="notif-desc">${notif.description}</div>
                    <div class="notif-time">${time}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    window.markNotificationRead = function(id) {
        const notif = notifications.find(n => n.id === id);
        if (notif) {
            notif.read = true;
            saveNotifications();
            renderNotifications();
            updateNotificationBadge();
        }
    };

    function updateNotificationBadge() {
        const unread = notifications.filter(n => !n.read).length;
        const badge = safeGetElement('notifCount');
        if (badge) {
            if (unread > 0 && notificationsEnabled) {
                badge.style.display = 'inline';
                badge.textContent = unread;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    window.toggleNotificationSettings = function() {
        notificationsEnabled = !notificationsEnabled;
        saveNotificationSettings();
        updateNotificationToggleUI();
        if (notificationsEnabled) {
            showToast('success', '   ');
            updateNotificationBadge();
        } else {
            showToast('warning', '   ');
            const badge = safeGetElement('notifCount');
            if (badge) badge.style.display = 'none';
        }
    };

    function updateNotificationToggleUI() {
        const btn = safeGetElement('notifToggleBtn');
        const text = safeGetElement('notifToggleText');
        if (!btn || !text) return;
        if (notificationsEnabled) {
            btn.classList.add('active');
            text.textContent = '';
            btn.style.borderColor = '#22c55e';
            btn.style.color = '#22c55e';
        } else {
            btn.classList.remove('active');
            text.textContent = '';
            btn.style.borderColor = '#ef4444';
            btn.style.color = '#ef4444';
        }
        updateNotificationBadge();
    }

    window.toggleNotifications = function() {
        const dropdown = safeGetElement('notificationDropdown');
        if (!dropdown) return;
        dropdown.classList.toggle('active');

        if (dropdown.classList.contains('active')) {
            renderNotifications();
            if (notificationsEnabled) {
                notifications.forEach(n => n.read = true);
                saveNotifications();
                updateNotificationBadge();
            }
        }
    };

    // ============================================================
    // =====    ( TikTok) =====
    // ============================================================

    function loadConversations() {
        try {
            const saved = localStorage.getItem('chatConversations');
            if (saved) {
                chatConversations = JSON.parse(saved);
            } else {
                chatConversations = {};
            }
        } catch (e) {
            chatConversations = {};
        }
        cleanOldMessages();
    }

    function saveConversations() {
        try {
            localStorage.setItem('chatConversations', JSON.stringify(chatConversations));
        } catch (e) {
            console.warn('  ');
        }
    }

    function cleanOldMessages() {
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        let cleaned = false;
        
        Object.keys(chatConversations).forEach(chatId => {
            const conv = chatConversations[chatId];
            if (conv.messages && conv.messages.length > 0) {
                const filtered = conv.messages.filter(msg => {
                    const msgTime = new Date(msg.timestamp).getTime();
                    return msgTime > sevenDaysAgo;
                });
                if (filtered.length !== conv.messages.length) {
                    conv.messages = filtered;
                    cleaned = true;
                }
            }
        });
        
        if (cleaned) {
            saveConversations();
        }
    }

    function getUserFullName(user) {
        if (!user) return '';
        if (user.user_metadata?.full_name) {
            return user.user_metadata.full_name;
        }
        if (user.user_metadata?.name) {
            return user.user_metadata.name;
        }
        if (user.email) {
            return user.email.split('@')[0];
        }
        return '';
    }

    function getUserImage(user) {
        if (!user) return '';
        if (user.user_metadata?.avatar_url) {
            return user.user_metadata.avatar_url;
        }
        if (user.user_metadata?.picture) {
            return user.user_metadata.picture;
        }
        return '';
    }

    function sendMessage(recipientId, recipientName, recipientImage, message) {
        if (!currentUser) {
            showToast('warning', '    ');
            return;
        }
        
        if (!message || message.trim() === '') {
            showToast('warning', '   ');
            return;
        }
        
        const userId = currentUser.id || currentUser.email;
        const userName = getUserFullName(currentUser);
        const userImage = getUserImage(currentUser);
        
        const participants = [userId, recipientId].sort();
        const chatId = participants.join('_');
        
        if (!chatConversations[chatId]) {
            chatConversations[chatId] = {
                participants: [userId, recipientId],
                messages: [],
                lastUpdated: new Date().toISOString()
            };
        }
        
        const msgData = {
            id: Date.now() + Math.random().toString(36).substr(2, 4),
            senderId: userId,
            senderName: userName,
            senderImage: userImage,
            recipientId: recipientId,
            recipientName: recipientName || '',
            recipientImage: recipientImage || '',
            message: message.trim(),
            timestamp: new Date().toISOString(),
            read: false
        };
        
        chatConversations[chatId].messages.push(msgData);
        chatConversations[chatId].lastUpdated = new Date().toISOString();
        
        saveConversations();
        
        addNotification(
            `   ${userName}`,
            message.trim().substring(0, 50) + (message.trim().length > 50 ? '...' : ''),
            'message'
        );
        
        renderChatList();
        renderPopupMessages(chatId);
        updateChatBadge();
        
        showToast('success', '   ');
        cleanOldMessages();
    }

    function getUserConversations() {
        if (!currentUser) return [];
        const userId = currentUser.id || currentUser.email;
        const conversations = [];
        
        Object.keys(chatConversations).forEach(chatId => {
            const conv = chatConversations[chatId];
            if (conv.participants && conv.participants.includes(userId)) {
                const otherId = conv.participants.find(id => id !== userId);
                
                let otherName = '';
                let otherImage = '';
                let otherEmail = '';
                
                const messages = conv.messages || [];
                if (messages.length > 0) {
                    const lastOtherMsg = messages.filter(m => m.senderId === otherId).pop();
                    if (lastOtherMsg) {
                        otherName = lastOtherMsg.senderName || '';
                        otherImage = lastOtherMsg.senderImage || '';
                        otherEmail = lastOtherMsg.senderId || '';
                    } else {
                        const lastSentMsg = messages.filter(m => m.senderId === userId).pop();
                        if (lastSentMsg) {
                            otherName = lastSentMsg.recipientName || '';
                            otherImage = lastSentMsg.recipientImage || '';
                            otherEmail = lastSentMsg.recipientId || '';
                        }
                    }
                }
                
                const unreadCount = messages.filter(m => 
                    m.recipientId === userId && !m.read
                ).length;
                
                const lastMsg = messages[messages.length - 1];
                
                conversations.push({
                    chatId: chatId,
                    otherId: otherId,
                    otherName: otherName,
                    otherEmail: otherEmail,
                    otherImage: otherImage,
                    lastMessage: lastMsg?.message || '  ',
                    lastTime: lastMsg?.timestamp || conv.lastUpdated || new Date().toISOString(),
                    unreadCount: unreadCount,
                    messages: messages
                });
            }
        });
        
        conversations.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
        return conversations;
    }

    function renderChatList() {
        const container = safeGetElement('contactChatsList');
        if (!container) return;
        
        const conversations = getUserConversations();
        
        if (conversations.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:2rem 1rem;color:var(--text-light);">
                    <i class="fas fa-comments" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>
                    <p style="font-size:1rem;font-weight:600;">  </p>
                    <p style="font-size:0.75rem;">    </p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="contact-chats-list">';
        conversations.forEach(conv => {
            const time = new Date(conv.lastTime).toLocaleString('ar', { 
                hour: '2-digit', 
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
            });
            
            const unreadBadge = conv.unreadCount > 0 
                ? `<span class="chat-unread">${conv.unreadCount}</span>` 
                : '';
            
            const avatarContent = conv.otherImage 
                ? `<img src="${conv.otherImage}" alt="${conv.otherName}" onerror="this.style.display='none'; this.parentElement.textContent='${conv.otherName.charAt(0).toUpperCase()}';">` 
                : conv.otherName.charAt(0).toUpperCase();
            
            const lastMsg = conv.messages && conv.messages.length > 0 
                ? conv.messages[conv.messages.length - 1] 
                : null;
            const lastMsgText = lastMsg 
                ? (lastMsg.senderId === (currentUser.id || currentUser.email) 
                    ? `: ${lastMsg.message}` 
                    : `${lastMsg.senderName}: ${lastMsg.message}`)
                : '  ';
            
            html += `
                <div class="contact-chat-item" onclick="openChatPopup('${conv.chatId}', '${conv.otherName.replace(/'/g, "\\'")}', '${conv.otherImage || ''}', '${conv.otherId || conv.otherEmail || ''}')">
                    <div class="chat-avatar">
                        ${avatarContent}
                    </div>
                    <div class="chat-info">
                        <div class="chat-name">${conv.otherName}</div>
                        <div class="chat-last-msg">${lastMsgText}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.1rem;">
                        <div class="chat-time">${time}</div>
                        ${unreadBadge}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    let currentPopupChatId = null;

    window.openChatPopup = function(chatId, otherName, otherImage, otherId) {
        currentPopupChatId = chatId;
        
        const popup = safeGetElement('chatPopup');
        if (!popup) return;
        
        const nameEl = safeGetElement('popupName');
        if (nameEl) nameEl.textContent = otherName;
        
        const avatarEl = safeGetElement('popupAvatar');
        if (avatarEl) {
            if (otherImage && isValidImageUrl(otherImage)) {
                avatarEl.innerHTML = `<img src="${otherImage}" alt="${otherName}" onerror="this.style.display='none'; this.parentElement.textContent='${otherName.charAt(0).toUpperCase()}';">`;
            } else {
                avatarEl.textContent = otherName.charAt(0).toUpperCase();
            }
        }
        
        popup.dataset.otherId = otherId;
        popup.dataset.otherName = otherName;
        popup.dataset.otherImage = otherImage;
        
        renderPopupMessages(chatId);
        
        popup.classList.add('active');
        const input = safeGetElement('popupInput');
        if (input) {
            setTimeout(() => input.focus(), 300);
        }
        
        markMessagesAsRead(chatId);
    };

    window.closeChatPopup = function() {
        const popup = safeGetElement('chatPopup');
        if (popup) popup.classList.remove('active');
        currentPopupChatId = null;
    };

    function renderPopupMessages(chatId) {
        const container = safeGetElement('popupMessages');
        if (!container) return;
        
        const conv = chatConversations[chatId];
        if (!conv || !conv.messages || conv.messages.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;color:var(--text-light);font-size:0.8rem;padding:1.5rem 0;">
                    <i class="fas fa-comment" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>
                        !
                </div>
            `;
            return;
        }
        
        const userId = currentUser?.id || currentUser?.email;
        let html = '';
        
        const sortedMessages = [...conv.messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        sortedMessages.forEach(msg => {
            const isSent = msg.senderId === userId;
            const time = new Date(msg.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
            
            const senderDisplay = !isSent ? `<strong>${msg.senderName}</strong><br>` : '';
            
            html += `
                <div class="msg-bubble ${isSent ? 'sent' : 'received'}">
                    ${senderDisplay}
                    ${msg.message}
                    <span class="msg-time">${time}</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    function markMessagesAsRead(chatId) {
        const conv = chatConversations[chatId];
        if (!conv || !conv.messages) return;
        
        const userId = currentUser?.id || currentUser?.email;
        let changed = false;
        
        conv.messages.forEach(msg => {
            if (msg.recipientId === userId && !msg.read) {
                msg.read = true;
                changed = true;
            }
        });
        
        if (changed) {
            saveConversations();
            renderChatList();
            updateChatBadge();
        }
    }

    function updateChatBadge() {
        const userId = currentUser?.id || currentUser?.email;
        if (!userId) return;
        
        let totalUnread = 0;
        Object.keys(chatConversations).forEach(chatId => {
            const conv = chatConversations[chatId];
            if (conv.messages) {
                const unread = conv.messages.filter(m => m.recipientId === userId && !m.read).length;
                totalUnread += unread;
            }
        });
        
        const badge = safeGetElement('chatBadge');
        if (badge) {
            if (totalUnread > 0) {
                badge.style.display = 'inline';
                badge.textContent = totalUnread;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    window.sendPopupMessage = function() {
        const input = safeGetElement('popupInput');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) {
            showToast('warning', '   ');
            return;
        }
        
        const popup = safeGetElement('chatPopup');
        if (!popup) return;
        
        const otherId = popup.dataset.otherId;
        const otherName = popup.dataset.otherName || '';
        const otherImage = popup.dataset.otherImage || '';
        
        if (!otherId) {
            showToast('error', '    ');
            return;
        }
        
        sendMessage(otherId, otherName, otherImage, message);
        input.value = '';
    };

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.id === 'popupInput') {
            e.preventDefault();
            window.sendPopupMessage();
        }
    });

    // ============================================================
    // =====     =====
    // ============================================================

    function canUserContact() {
        if (!currentUser) return false;
        const hasCourses = getMyCourses().length > 0;
        const isTeacherAdmin = isAnyTeacherAdmin(currentUser.email);
        return hasCourses || isTeacherAdmin;
    }

    function isTeacherAdminForTeacher(email, teacherName) {
        if (!email || !teacherName) return false;
        return teacherAdmins.some(admin =>
            admin.email === email && admin.teacherName === teacherName
        );
    }

    function isAnyTeacherAdmin(email) {
        if (!email) return false;
        return teacherAdmins.some(admin => admin.email === email);
    }

    function getMyManagedTeachers(email) {
        if (!email) return [];
        return teacherAdmins.filter(admin => admin.email === email);
    }

    window.addTeacherAdmin = function() {
        const sectionSelect = safeGetElement('teacherAdminSection');
        const teacherSelect = safeGetElement('teacherAdminTeacher');
        const emailInput = safeGetElement('teacherAdminEmail');
        const messageEl = safeGetElement('teacherAdminMessage');

        if (!sectionSelect || !teacherSelect || !emailInput || !messageEl) return;

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const email = emailInput?.value.trim();

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (!email) {
            messageEl.innerHTML = '    ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            messageEl.innerHTML = '    ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#ef4444';
            return;
        }

        if (teacherAdmins.some(t => t.sectionIndex === sectionIndex && t.teacherIndex === teacherIndex)) {
            messageEl.innerHTML = '     ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (teacherAdmins.some(t => t.email === email && t.teacherName === teacher.name)) {
            messageEl.innerHTML = '       ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        const adminEntry = {
            sectionIndex: sectionIndex,
            teacherIndex: teacherIndex,
            teacherName: teacher.name,
            sectionName: data.sections[sectionIndex].name,
            email: email,
            addedAt: new Date().toISOString()
        };

        teacherAdmins.push(adminEntry);
        saveTeacherAdmins();
        renderTeacherAdminsList();
        updateAllAdminSelects();

        if (!teacher.codes) teacher.codes = [];
        const adminCode = 'ADMIN_' + email.split('@')[0].toUpperCase() + '_' + Date.now().toString(36).toUpperCase();
        teacher.codes.push({
            code: adminCode,
            used: true,
            locked: false,
            deviceId: userDeviceId,
            userId: currentUser?.id || 'admin',
            userEmail: email,
            usedAt: new Date().toISOString(),
            isAdminCode: true
        });
        saveData();

        messageEl.innerHTML = `   ${teacher.name}    ${email}`;
        messageEl.style.color = '#22c55e';
        emailInput.value = '';
        showToast('success', `   ${teacher.name}  `);

        renderAllData();
        renderMyCourses();
        renderAccount();
        updateBadge();
        renderTeacherAdminsList();
    };

    function renderTeacherAdminsList() {
        const container = safeGetElement('teacherAdminsList');
        if (!container) return;

        if (teacherAdmins.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;font-size:0.8rem;">   </p>';
            return;
        }

        let html = '';
        teacherAdmins.forEach((admin, index) => {
            html += `
                <div style="background:var(--bg);padding:0.5rem 0.8rem;border-radius:8px;margin-bottom:0.4rem;border-right:3px solid var(--primary);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.3rem;">
                    <div>
                        <span style="font-weight:700;">${admin.teacherName}</span>
                        <span style="font-size:0.7rem;color:var(--text-light);margin-right:0.5rem;">${admin.sectionName}</span>
                        <span style="font-size:0.65rem;color:var(--primary);display:block;"> ${admin.email}</span>
                    </div>
                    <button onclick="removeTeacherAdmin(${index})" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.6rem;"> </button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    window.removeTeacherAdmin = function(index) {
        if (!confirm('       ')) return;
        
        const admin = teacherAdmins[index];
        if (admin) {
            const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
            if (teacher && teacher.codes) {
                teacher.codes = teacher.codes.filter(c => !c.isAdminCode || c.userEmail !== admin.email);
                saveData();
            }
        }
        
        teacherAdmins.splice(index, 1);
        saveTeacherAdmins();
        renderTeacherAdminsList();
        renderAllData();
        renderMyCourses();
        renderAccount();
        updateBadge();
        showToast('success', '   ');
    };

    // ============================================================
    // =====    () =====
    // ============================================================

    function loadChatMessages(teacherName) {
        if (!currentUser) return [];
        const key = 'chat_' + currentUser.email + '_' + teacherName;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                chatMessages = JSON.parse(saved);
            } else {
                chatMessages = [];
            }
        } catch (e) {
            chatMessages = [];
        }
        return chatMessages;
    }

    function saveChatMessages(teacherName) {
        if (!currentUser) return;
        const key = 'chat_' + currentUser.email + '_' + teacherName;
        try {
            localStorage.setItem(key, JSON.stringify(chatMessages));
        } catch (e) {
            console.warn('   ');
        }
    }

    window.openChat = function(teacherName, teacherEmoji, teacherSubject, teacherImage) {
        if (!canUserContact()) {
            showToast('warning', '     ');
            return;
        }

        const myCourses = getMyCourses();
        const isSubscribed = myCourses.some(c => c.teacherName === teacherName);
        const isTeacherAdmin = isTeacherAdminForTeacher(currentUser?.email, teacherName);

        if (!isSubscribed && !isTeacherAdmin) {
            showToast('warning', '       ');
            return;
        }

        chatRecipient = teacherName;
        chatRecipientImage = getSafeImageUrl(teacherImage) || '';
        chatRecipientEmoji = teacherEmoji || '';

        loadChatMessages(teacherName);

        const chatPageName = safeGetElement('chatPageName');
        if (chatPageName) chatPageName.textContent = teacherName;
        
        const avatarEl = safeGetElement('chatPageAvatar');
        if (avatarEl) {
            if (chatRecipientImage && isValidImageUrl(chatRecipientImage)) {
                avatarEl.innerHTML = `<img src="${chatRecipientImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'; this.parentElement.textContent='${chatRecipientEmoji}';">`;
            } else {
                avatarEl.textContent = chatRecipientEmoji;
            }
        }

        const chatPageStatus = safeGetElement('chatPageStatus');
        if (chatPageStatus) chatPageStatus.textContent = ' ';
        
        renderChatPageMessages();

        const chatPage = safeGetElement('chatPage');
        if (chatPage) {
            chatPage.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        setTimeout(() => {
            const input = safeGetElement('chatPageInput');
            if (input) input.focus();
        }, 300);

        chatAttachments = [];
        const attachmentsList = safeGetElement('chatPageAttachmentsList');
        if (attachmentsList) attachmentsList.innerHTML = '';
    };

    window.closeChatPage = function() {
        const chatPage = safeGetElement('chatPage');
        if (chatPage) chatPage.classList.remove('active');
        document.body.style.overflow = 'auto';
        if (chatRecipient) {
            saveChatMessages(chatRecipient);
        }
    };

    function renderChatPageMessages() {
        const container = safeGetElement('chatPageMessages');
        if (!container) return;

        if (!chatMessages || chatMessages.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;color:var(--text-light);font-size:0.8rem;padding:2rem 0;">
                    <i class="fas fa-comment" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>
                        !
                </div>
            `;
            return;
        }

        let html = '';
        chatMessages.forEach((msg) => {
            const isSent = msg.sender === currentUser?.email;
            const time = new Date(msg.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });

            html += `
                <div class="chat-msg ${isSent ? 'sent' : 'received'}">
                    ${!isSent ? `<strong>${msg.senderName || msg.sender}</strong><br>` : ''}
                    <div>${msg.message}</div>
                    ${msg.attachments && msg.attachments.length > 0 ? msg.attachments.map(att => `
                        <div class="msg-attachment" onclick="previewAttachment('${att.url}', '${att.type}')">
                            <i class="fas ${att.type === 'image' ? 'fa-image' : att.type === 'video' ? 'fa-video' : 'fa-file'}"></i>
                            ${att.name}
                            ${att.type === 'image' ? `<br><img src="${att.url}" />` : ''}
                            ${att.type === 'video' ? `<br><video src="${att.url}" controls style="max-width:100%;max-height:150px;border-radius:6px;"></video>` : ''}
                        </div>
                    `).join('') : ''}
                    <span class="msg-time">${time}</span>
                </div>
            `;
        });

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    window.chatPageAttach = function(type) {
        const input = document.createElement('input');
        input.type = 'file';
        if (type === 'image') input.accept = 'image/*';
        else if (type === 'video') input.accept = 'video/*';
        else input.accept = '*/*';

        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                const url = event.target.result;
                chatAttachments.push({
                    name: file.name,
                    type: type,
                    url: url,
                    size: file.size
                });
                updateChatPageAttachmentsUI();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    function updateChatPageAttachmentsUI() {
        const container = safeGetElement('chatPageAttachmentsList');
        if (!container) return;

        if (chatAttachments.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        chatAttachments.forEach((att, index) => {
            const icon = att.type === 'image' ? 'fa-image' : att.type === 'video' ? 'fa-video' : 'fa-file';
            html += `
                <span class="chat-attach-item">
                    <i class="fas ${icon}"></i>
                    ${att.name.length > 15 ? att.name.substring(0, 12) + '...' : att.name}
                    <span class="remove-attach" onclick="removeChatPageAttachment(${index})"></span>
                </span>
            `;
        });
        container.innerHTML = html;
    }

    window.removeChatPageAttachment = function(index) {
        chatAttachments.splice(index, 1);
        updateChatPageAttachmentsUI();
    };

    window.sendChatPageMessage = function() {
        const input = safeGetElement('chatPageInput');
        if (!input) return;
        const message = input.value.trim();

        if (!message && chatAttachments.length === 0) {
            showToast('warning', '      ');
            return;
        }

        if (!chatRecipient) {
            showToast('error', '    ');
            return;
        }

        const msgData = {
            id: Date.now(),
            sender: currentUser?.email || '',
            senderName: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '',
            recipient: chatRecipient,
            message: message || ' ',
            attachments: chatAttachments.length > 0 ? [...chatAttachments] : [],
            timestamp: new Date().toISOString(),
            read: false
        };

        chatMessages.push(msgData);
        saveChatMessages(chatRecipient);

        contactMessages.push({
            id: Date.now() + 1,
            recipient: chatRecipient,
            recipientImage: chatRecipientImage,
            recipientEmoji: chatRecipientEmoji,
            sender: currentUser?.email || '',
            senderName: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '',
            subject: '  ',
            message: message || ' ',
            attachments: chatAttachments.map(a => a.name),
            sentAt: new Date().toISOString(),
            read: false,
            isChat: true,
            chatAttachments: [...chatAttachments]
        });
        saveContactMessages();

        addNotification(
            '  ',
            `${msgData.senderName}   : ${message || ' '}`,
            'message'
        );

        input.value = '';
        chatAttachments = [];
        updateChatPageAttachmentsUI();

        renderChatPageMessages();
        updateContactBadge();
        renderMyMessages();
        
        const recipientId = chatRecipient;
        sendMessage(recipientId, chatRecipient, chatRecipientImage, message || ' ');
    };

    window.toggleChatPageTheme = function() {
        const page = safeGetElement('chatPage');
        if (!page) return;
        chatTheme = chatTheme === 'light' ? 'dark' : 'light';

        if (chatTheme === 'dark') {
            page.classList.add('chat-theme-dark');
            const icon = safeGetElement('chatPageThemeIcon');
            if (icon) icon.className = 'fas fa-sun';
        } else {
            page.classList.remove('chat-theme-dark');
            const icon = safeGetElement('chatPageThemeIcon');
            if (icon) icon.className = 'fas fa-moon';
        }
    };

    window.previewAttachment = function(url, type) {
        if (type === 'image') {
            window.open(url, '_blank');
        } else if (type === 'video') {
            playVideo(url, ' ');
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = '';
            a.click();
        }
    };

    // ============================================================
    // =====    =====
    // ============================================================

    function renderContactTeachers() {
        const container = safeGetElement('contactTeachersGrid');
        const countSpan = safeGetElement('contactTeachersCount');
        if (!container) return;

        const hasSubscription = canUserContact();
        let contactTeachers = [];

        if (hasSubscription) {
            const myCourses = getMyCourses();
            const allTeachers = getAllTeachers();

            myCourses.forEach(course => {
                const teacher = allTeachers.find(t =>
                    t.name === course.teacherName &&
                    t._sectionName === course.sectionName
                );
                if (teacher && !contactTeachers.some(t => t.name === teacher.name && t._sectionName === teacher._sectionName)) {
                    contactTeachers.push(teacher);
                }
            });
            
            const managedTeachers = getMyManagedTeachers(currentUser?.email);
            managedTeachers.forEach(admin => {
                const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
                if (teacher && !contactTeachers.some(t => t.name === teacher.name && t._sectionName === admin.sectionName)) {
                    contactTeachers.push({
                        ...teacher,
                        _sectionIndex: admin.sectionIndex,
                        _teacherIndex: admin.teacherIndex,
                        _sectionName: admin.sectionName,
                        _sectionId: data.sections[admin.sectionIndex]?.id
                    });
                }
            });
        }

        if (countSpan) countSpan.textContent = contactTeachers.length;

        if (!hasSubscription || contactTeachers.length === 0) {
            container.innerHTML = `
                <div class="empty-teachers" style="text-align:center;padding:3rem 1rem;background:var(--bg-card);border-radius:16px;border:2px dashed var(--border);">
                    <span class="empty-icon" style="font-size:4rem;display:block;margin-bottom:0.5rem;"></span>
                    <h3 style="font-size:1.2rem;color:var(--text);"> </h3>
                    <p style="color:var(--text-light);font-size:0.9rem;max-width:400px;margin:0 auto;">
                        ${!currentUser ? '    ' : '         '}
                    </p>
                    <button onclick="navigateTo('teachers')" style="margin-top:1rem;padding:0.5rem 1.5rem;background:var(--primary-gradient);color:white;border:none;border-radius:30px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-book"></i>  
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="contact-teachers-grid">';
        contactTeachers.forEach(teacher => {
            const name = teacher.name || '';
            const emoji = teacher.emoji || '';
            const subject = teacher.subject || '';
            const image = getSafeImageUrl(teacher.image);
            const validImage = image && isValidImageUrl(image);
            const sectionName = teacher._sectionName || '';

            html += `
                <div class="contact-teacher-card" onclick="openChat('${name.replace(/'/g, "\\'")}', '${emoji}', '${subject.replace(/'/g, "\\'")}', '${image || ''}')">
                    <div class="contact-avatar">
                        ${validImage ? `<img src="${image}" alt="${name}" onerror="this.style.display='none'; this.parentElement.textContent='${emoji}';">` : emoji}
                    </div>
                    <div class="contact-name">${name}</div>
                    ${subject ? `<div class="contact-subject">${subject}</div>` : ''}
                    <div class="contact-section-name">${sectionName}</div>
                    <button class="contact-btn" onclick="event.stopPropagation();openChat('${name.replace(/'/g, "\\'")}', '${emoji}', '${subject.replace(/'/g, "\\'")}', '${image || ''}')">
                        <i class="fas fa-comment"></i> 
                    </button>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // ============================================================
    // =====   =====
    // ============================================================

    function getTeacherInbox(teacherName) {
        if (!teacherName) {
            const userFullName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '';
            return contactMessages.filter(m => m.recipient === userFullName || m.recipient === currentUser?.email);
        }
        return contactMessages.filter(m => m.recipient === teacherName);
    }

    function renderTeacherInbox() {
        const container = safeGetElement('teacherInboxMessages');
        const section = safeGetElement('teacherInboxSection');
        const countSpan = safeGetElement('teacherInboxCount');

        if (!container) return;

        const teacherName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '';
        const isTeacherUser = isAnyTeacherAdmin(currentUser?.email) || getTeacherInbox(teacherName).length > 0;

        if (!isTeacherUser) {
            if (section) section.style.display = 'none';
            return;
        }

        if (section) section.style.display = 'block';

        const inboxMessages = getTeacherInbox(teacherName);

        if (countSpan) countSpan.textContent = inboxMessages.length;

        if (inboxMessages.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);font-size:0.8rem;text-align:center;">    </p>';
            return;
        }

        let html = '';
        inboxMessages.slice().reverse().forEach(msg => {
            const isRead = msg.read || false;
            const senderName = msg.senderName || msg.sender || '';
            html += `
                <div class="teacher-inbox-item">
                    <div class="inbox-header">
                        <span class="inbox-sender"><i class="fas fa-user"></i> ${senderName}</span>
                        <span>${new Date(msg.sentAt).toLocaleString('ar')}</span>
                    </div>
                    <div class="inbox-subject">${msg.subject}</div>
                    <div class="inbox-message">${msg.message}</div>
                    ${msg.attachments && msg.attachments.length ? `<div class="inbox-attachments"><i class="fas fa-paperclip"></i> ${msg.attachments.length} </div>` : ''}
                    <div class="inbox-status ${isRead ? 'read' : 'unread'}">
                        ${isRead ? ' ' : ' '}
                    </div>
                    <div class="inbox-actions">
                        ${!isRead ? `<button class="btn-mark-read" onclick="markInboxMessageRead(${msg.id})">  </button>` : ''}
                        <button class="btn-delete-inbox" onclick="deleteInboxMessage(${msg.id})"> </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    window.markInboxMessageRead = function(id) {
        const msg = contactMessages.find(m => m.id === id);
        if (msg) {
            msg.read = true;
            saveContactMessages();
            renderTeacherInbox();
            renderAllMessages();
            updateContactBadge();
            showToast('success', '    ');
        }
    };

    window.deleteInboxMessage = function(id) {
        if (!confirm('       ')) return;
        contactMessages = contactMessages.filter(m => m.id !== id);
        saveContactMessages();
        renderTeacherInbox();
        renderAllMessages();
        updateContactBadge();
        showToast('success', '   ');
    };

    function renderMyMessages() {
        const container = safeGetElement('myMessagesList');
        if (!container) return;

        if (!currentUser) {
            container.innerHTML = '<p style="color:var(--text-light);font-size:0.8rem;text-align:center;">  </p>';
            return;
        }

        const myMessages = contactMessages.filter(m => m.sender === currentUser.email);

        if (myMessages.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);font-size:0.8rem;text-align:center;">   </p>';
            return;
        }

        let html = '';
        myMessages.slice().reverse().forEach(msg => {
            const isRead = msg.read || false;
            html += `
                <div class="message-item">
                    <div class="msg-header">
                        <span><i class="fas fa-user"></i> ${msg.recipient}</span>
                        <span>${new Date(msg.sentAt).toLocaleString('ar')}</span>
                    </div>
                    <div class="msg-subject">${msg.subject}</div>
                    <div class="msg-body">${msg.message}</div>
                    ${msg.attachments && msg.attachments.length ? `<div class="msg-attachments"><i class="fas fa-paperclip"></i> ${msg.attachments.length} </div>` : ''}
                    <div class="msg-status ${isRead ? 'read' : 'unread'}">
                        ${isRead ? ' ' : '  '}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        const msgCountEl = safeGetElement('accountMessages');
        if (msgCountEl) msgCountEl.textContent = myMessages.length;
    }

    function renderAllMessages() {
        const container = safeGetElement('allMessagesContainer');
        if (!container) return;

        if (contactMessages.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:0.5rem 0;font-size:.8rem;">  </p>';
            return;
        }

        let html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
        contactMessages.slice().reverse().forEach(msg => {
            const isRead = msg.read || false;
            html += `
                <div style="background:var(--bg);border-radius:8px;padding:0.6rem 0.8rem;border-right:3px solid ${isRead ? '#22c55e' : '#f59e0b'};">
                    <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-light);flex-wrap:wrap;">
                        <span><i class="fas fa-user"></i> <strong>:</strong> ${msg.senderName} (${msg.sender})</span>
                        <span><i class="fas fa-user-tie"></i> <strong>:</strong> ${msg.recipient}</span>
                        <span>${new Date(msg.sentAt).toLocaleString('ar')}</span>
                    </div>
                    <div style="font-weight:600;font-size:0.85rem;">${msg.subject}</div>
                    <div style="font-size:0.75rem;color:var(--text-light);">${msg.message}</div>
                    ${msg.attachments && msg.attachments.length ? `<div style="font-size:0.6rem;color:var(--primary);"><i class="fas fa-paperclip"></i> ${msg.attachments.length} </div>` : ''}
                    <div style="font-size:0.6rem;color:${isRead ? '#22c55e' : '#f59e0b'};">
                        ${isRead ? ' ' : '  '}
                        <button onclick="markMessageAsRead(${msg.id})" style="background:var(--primary);color:white;border:none;border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;font-size:0.55rem;margin-right:0.5rem;">
                            ${isRead ? ' ' : '  '}
                        </button>
                        <button onclick="deleteMessage(${msg.id})" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;font-size:0.55rem;">
                            
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    window.markMessageAsRead = function(id) {
        const msg = contactMessages.find(m => m.id === id);
        if (msg) {
            msg.read = true;
            saveContactMessages();
            renderAllMessages();
            renderMyMessages();
            renderTeacherMessages(chatRecipient);
            updateContactBadge();
            showToast('success', '    ');
        }
    };

    window.deleteMessage = function(id) {
        if (!confirm('       ')) return;
        contactMessages = contactMessages.filter(m => m.id !== id);
        saveContactMessages();
        renderAllMessages();
        renderMyMessages();
        renderTeacherMessages(chatRecipient);
        updateContactBadge();
        showToast('success', '   ');
    };

    function updateContactBadge() {
        const unread = contactMessages.filter(m => !m.read).length;
        const badge = safeGetElement('contactBadge');
        if (badge) {
            if (unread > 0) {
                badge.style.display = 'inline';
                badge.textContent = unread;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    function checkContactMessages() {
        updateContactBadge();
    }

    // ============================================================
    // =====    =====
    // ============================================================

    function getManagedTeacher() {
        const userEmail = currentUser?.email;
        if (!userEmail) return null;
        const managed = getMyManagedTeachers(userEmail);
        if (managed.length === 0) return null;
        const admin = managed[0];
        return {
            sectionIndex: admin.sectionIndex,
            teacherIndex: admin.teacherIndex,
            teacher: data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex]
        };
    }

    window.openTeacherAdmin = function() {
        const userEmail = currentUser?.email;
        if (!userEmail) {
            showToast('warning', '    ');
            return;
        }

        const managedTeachers = getMyManagedTeachers(userEmail);
        if (managedTeachers.length === 0) {
            showToast('warning', '       ');
            return;
        }

        const teacherAdminName = safeGetElement('teacherAdminName');
        const teacherAdminModal = safeGetElement('teacherAdminModal');

        if (managedTeachers.length === 1) {
            const admin = managedTeachers[0];
            const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
            if (teacher && teacherAdminName) {
                teacherAdminName.textContent = ` ${teacher.name} (${admin.sectionName})`;
                if (teacherAdminModal) {
                    teacherAdminModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                updateTeacherSemesterSelect(admin.sectionIndex, admin.teacherIndex);
                renderTeacherCodes(admin.sectionIndex, admin.teacherIndex);
                renderTeacherLectures(admin.sectionIndex, admin.teacherIndex);
                return;
            }
        }

        let html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
        managedTeachers.forEach(admin => {
            const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
            if (teacher) {
                html += `
                    <button onclick="openTeacherAdminDirect(${admin.sectionIndex}, ${admin.teacherIndex})" 
                        style="padding:0.6rem;background:var(--bg-card);border:2px solid var(--border);border-radius:8px;cursor:pointer;text-align:right;transition:all 0.3s;">
                        <div style="font-weight:700;">${teacher.name}</div>
                        <div style="font-size:0.7rem;color:var(--text-light);">${admin.sectionName}</div>
                    </button>
                `;
            }
        });
        html += '</div>';

        if (teacherAdminName) {
            teacherAdminName.innerHTML = html;
            teacherAdminName.style.textAlign = 'right';
        }
        if (teacherAdminModal) {
            teacherAdminModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    window.openTeacherAdminDirect = function(sectionIndex, teacherIndex) {
        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '   ');
            return;
        }
        const section = data.sections[sectionIndex];
        const teacherAdminName = safeGetElement('teacherAdminName');
        if (teacherAdminName) {
            teacherAdminName.innerHTML = ` ${teacher.name} (${section.name})`;
            teacherAdminName.style.textAlign = 'center';
        }
        const teacherAdminModal = safeGetElement('teacherAdminModal');
        if (teacherAdminModal) {
            teacherAdminModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        updateTeacherSemesterSelect(sectionIndex, teacherIndex);
        renderTeacherCodes(sectionIndex, teacherIndex);
        renderTeacherLectures(sectionIndex, teacherIndex);
    };

    function updateTeacherSemesterSelect(sectionIndex, teacherIndex) {
        const select = safeGetElement('teacherLectureSemester');
        if (!select) return;

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) {
            select.innerHTML = '<option value=""> ...</option>';
            return;
        }

        const currentValue = select.value;
        let options = '<option value=""> ...</option>';

        if (teacher.semesters) {
            teacher.semesters.forEach((s, i) => {
                options += `<option value="${i}"> ${s.number} - ${s.description || ''}</option>`;
            });
        }

        select.innerHTML = options;
        select.dataset.sectionIndex = sectionIndex;
        select.dataset.teacherIndex = teacherIndex;
        if (currentValue && teacher.semesters[parseInt(currentValue)]) {
            select.value = currentValue;
        }
    }

    function renderTeacherCodes(sectionIndex, teacherIndex) {
        const container = safeGetElement('teacherCodesContainer');
        if (!container) return;

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher || !teacher.codes || teacher.codes.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;font-size:0.8rem;">  </p>';
            return;
        }

        let html = '<div style="display:flex;flex-direction:column;gap:0.3rem;">';
        teacher.codes.forEach((c, index) => {
            const status = c.used ? ' ' : ' ';
            const statusColor = c.used ? '#22c55e' : '#22c55e';
            const userEmail = c.userEmail || '';
            const isAdminCode = c.isAdminCode || false;
            html += `
                <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:0.3rem 0.6rem;border-radius:6px;flex-wrap:wrap;gap:0.2rem;border:1px solid var(--border);">
                    <span style="font-family:monospace;font-weight:700;font-size:0.85rem;color:var(--primary);">${c.code}</span>
                    <span style="font-size:0.7rem;color:${statusColor};">${status} ${isAdminCode ? '' : ''}</span>
                    ${c.used ? `<span style="font-size:0.6rem;color:var(--text-light);">${userEmail}</span>` : ''}
                    ${!c.used && !isAdminCode ? `<button onclick="teacherDeleteCode(${sectionIndex}, ${teacherIndex}, ${index})" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.05rem 0.4rem;cursor:pointer;font-size:0.6rem;"></button>` : ''}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function renderTeacherLectures(sectionIndex, teacherIndex) {
        const container = safeGetElement('teacherLecturesList');
        if (!container) return;

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher || !teacher.semesters || teacher.semesters.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;font-size:0.8rem;">  </p>';
            return;
        }

        let html = '';
        teacher.semesters.forEach((semester, sIndex) => {
            if (semester.lectures && semester.lectures.length > 0) {
                semester.lectures.forEach((lecture, lIndex) => {
                    const isFree = lecture.isFree ? ' ' : ' ';
                    html += `
                        <div style="background:var(--bg);padding:0.5rem 0.8rem;border-radius:8px;margin-bottom:0.4rem;border-right:3px solid var(--primary);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.3rem;">
                            <div>
                                <span style="font-weight:700;font-size:0.85rem;">  ${semester.number}</span>
                                <span style="font-weight:600;font-size:0.85rem;margin-right:0.5rem;">#${lecture.number}</span>
                                <span style="font-size:0.85rem;">${lecture.title}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:0.3rem;flex-wrap:wrap;">
                                <span style="font-size:0.65rem;background:${isFree.includes('') ? '#22c55e' : '#f59e0b'};color:white;padding:0.1rem 0.4rem;border-radius:4px;">${isFree}</span>
                                <button onclick="openEditLecture(${sectionIndex}, ${teacherIndex}, ${sIndex}, ${lIndex})" style="background:var(--primary);color:white;border:none;border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;font-size:0.6rem;"></button>
                                <button onclick="deleteTeacherLecture(${sectionIndex}, ${teacherIndex}, ${sIndex}, ${lIndex})" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;font-size:0.6rem;"></button>
                            </div>
                        </div>
                    `;
                });
            }
        });

        if (!html) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;font-size:0.8rem;">  </p>';
            return;
        }

        container.innerHTML = html;
    }

    document.getElementById('teacherAddSemesterForm')?.addEventListener('submit', function(e) {
        e.preventDefault();

        const userEmail = currentUser?.email;
        if (!userEmail) {
            showToast('error', '   ');
            return;
        }

        const managedTeachers = getMyManagedTeachers(userEmail);
        if (managedTeachers.length === 0) {
            showToast('error', '   ');
            return;
        }

        const admin = managedTeachers[0];
        const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
        if (!teacher) {
            showToast('error', '   ');
            return;
        }

        const numberInput = safeGetElement('teacherSemesterNumber');
        const descInput = safeGetElement('teacherSemesterDesc');
        
        if (!numberInput || !descInput) return;
        
        const number = parseInt(numberInput.value);
        const description = descInput.value.trim();

        if (!number || number < 1) {
            showToast('warning', '     ');
            return;
        }

        if (teacher.semesters && teacher.semesters.some(s => s.number === number)) {
            showToast('warning', '   ' + number + '  ');
            return;
        }

        if (!teacher.semesters) teacher.semesters = [];

        teacher.semesters.push({
            number: number,
            description: description || ` ${number}`,
            lectures: []
        });

        saveData();
        renderAllData();
        renderAccount();
        renderTeacherLectures(admin.sectionIndex, admin.teacherIndex);
        updateTeacherSemesterSelect(admin.sectionIndex, admin.teacherIndex);

        if (currentUser) {
            addNotification(
                '  ',
                `   ${number}  ${teacher.name}`,
                'lecture'
            );
        }

        this.reset();
        showToast('success', `    ${number} `);
    });

    document.getElementById('teacherAddLectureForm')?.addEventListener('submit', function(e) {
        e.preventDefault();

        const userEmail = currentUser?.email;
        if (!userEmail) {
            showToast('error', '   ');
            return;
        }

        const managedTeachers = getMyManagedTeachers(userEmail);
        if (managedTeachers.length === 0) {
            showToast('error', '   ');
            return;
        }

        const admin = managedTeachers[0];
        const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
        if (!teacher) {
            showToast('error', '   ');
            return;
        }

        const semesterSelect = safeGetElement('teacherLectureSemester');
        const numberInput = safeGetElement('teacherLectureNumber');
        const titleInput = safeGetElement('teacherLectureTitle');
        const urlInput = safeGetElement('teacherLectureUrl');
        const freeSelect = safeGetElement('teacherLectureFree');

        if (!semesterSelect || !numberInput || !titleInput || !urlInput || !freeSelect) return;

        const semesterIndex = parseInt(semesterSelect.value);
        const number = parseInt(numberInput.value);
        const title = titleInput.value.trim();
        const youtubeUrl = urlInput.value.trim();
        const isFree = freeSelect.value === 'true';

        if (isNaN(semesterIndex) || semesterIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        if (!number || number < 1) {
            showToast('warning', '     ');
            return;
        }

        if (!title) {
            showToast('warning', '    ');
            return;
        }

        if (!youtubeUrl) {
            showToast('warning', '    ');
            return;
        }

        const isValidUrl = youtubeUrl.includes('mediadelivery') ||
            youtubeUrl.includes('youtube') ||
            youtubeUrl.includes('youtu.be') ||
            youtubeUrl.includes('player.') ||
            youtubeUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i);

        if (!isValidUrl) {
            showToast('warning', '    ');
            return;
        }

        if (!teacher.semesters[semesterIndex].lectures) {
            teacher.semesters[semesterIndex].lectures = [];
        }

        if (teacher.semesters[semesterIndex].lectures.some(l => l.number === number)) {
            showToast('warning', '   ' + number + '     ');
            return;
        }

        teacher.semesters[semesterIndex].lectures.push({
            number: number,
            title: title,
            youtubeUrl: youtubeUrl,
            isFree: isFree
        });

        saveData();
        renderAllData();
        renderAccount();
        renderTeacherLectures(admin.sectionIndex, admin.teacherIndex);

        if (currentUser) {
            addNotification(
                '  ',
                `   "${title}"  ${teacher.name}`,
                'lecture'
            );
        }

        this.reset();
        updateTeacherSemesterSelect(admin.sectionIndex, admin.teacherIndex);
        showToast('success', `    "${title}" `);
    });

    window.deleteTeacherLecture = function(sectionIndex, teacherIndex, semesterIndex, lectureIndex) {
        if (!confirm('       ')) return;

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) {
            showToast('error', '   ');
            return;
        }

        const lecture = teacher.semesters[semesterIndex]?.lectures[lectureIndex];
        if (!lecture) {
            showToast('error', '   ');
            return;
        }

        teacher.semesters[semesterIndex].lectures.splice(lectureIndex, 1);
        saveData();
        renderAllData();
        renderAccount();
        renderTeacherLectures(sectionIndex, teacherIndex);
        showToast('success', '   ');
    };

    window.teacherDeleteCode = function(sectionIndex, teacherIndex, codeIndex) {
        if (!confirm('       ')) return;

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) return;

        if (teacher.codes[codeIndex].used) {
            showToast('warning', '     ');
            return;
        }

        if (teacher.codes[codeIndex].isAdminCode) {
            showToast('warning', '     ');
            return;
        }

        teacher.codes.splice(codeIndex, 1);
        saveData();
        renderTeacherCodes(sectionIndex, teacherIndex);
        renderAccount();
        showToast('success', '   ');
    };

    window.teacherAddCode = function() {
        const userEmail = currentUser?.email;
        if (!userEmail) {
            showToast('error', '   ');
            return;
        }

        const managedTeachers = getMyManagedTeachers(userEmail);
        if (managedTeachers.length === 0) {
            showToast('error', '   ');
            return;
        }

        const admin = managedTeachers[0];
        const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
        if (!teacher) {
            showToast('error', '   ');
            return;
        }

        const codeInput = safeGetElement('teacherManualCode');
        if (!codeInput) return;
        
        const code = codeInput.value.trim().toUpperCase();

        if (!code) {
            showToast('warning', '   ');
            return;
        }

        if (code.length < 4) {
            showToast('warning', '   ');
            return;
        }

        if (!teacher.codes) teacher.codes = [];

        if (teacher.codes.some(c => c.code === code)) {
            showToast('warning', '    ');
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
        renderTeacherCodes(admin.sectionIndex, admin.teacherIndex);
        renderAccount();
        codeInput.value = '';
        showToast('success', `   : ${code}`);
    };

    window.teacherGenerateCodes = function(count = 5) {
        const userEmail = currentUser?.email;
        if (!userEmail) {
            showToast('error', '   ');
            return;
        }

        const managedTeachers = getMyManagedTeachers(userEmail);
        if (managedTeachers.length === 0) {
            showToast('error', '   ');
            return;
        }

        const admin = managedTeachers[0];
        const teacher = data.sections[admin.sectionIndex]?.teachers[admin.teacherIndex];
        if (!teacher) {
            showToast('error', '   ');
            return;
        }

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
        renderTeacherCodes(admin.sectionIndex, admin.teacherIndex);
        renderAccount();
        showToast('success', `   ${newCodes.length}  `);
    };

    window.openTeacherStudents = function() {
        const teacher = getManagedTeacher();
        if (!teacher) {
            showToast('warning', '      ');
            return;
        }

        const nameEl = safeGetElement('teacherStudentsName');
        if (nameEl) nameEl.textContent = ` ${teacher.teacher.name}`;
        
        const modal = safeGetElement('teacherStudentsModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        renderTeacherStudents(teacher.sectionIndex, teacher.teacherIndex);
    };

    function renderTeacherStudents(sectionIndex, teacherIndex) {
        const container = safeGetElement('teacherStudentsList');
        if (!container) return;

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher || !teacher.codes) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;font-size:0.8rem;">   </p>';
            return;
        }

        const students = [];
        teacher.codes.forEach(c => {
            if (c.used && c.userEmail && !c.isAdminCode) {
                if (!students.some(s => s.email === c.userEmail)) {
                    students.push({
                        email: c.userEmail,
                        code: c.code,
                        usedAt: c.usedAt
                    });
                }
            }
        });

        if (students.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;font-size:0.8rem;">   </p>';
            return;
        }

        let html = '';
        students.forEach((s, index) => {
            html += `
                <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:0.5rem 0.8rem;border-radius:6px;margin-bottom:0.3rem;border-right:3px solid var(--primary);flex-wrap:wrap;gap:0.3rem;">
                    <span style="font-weight:600;font-size:0.9rem;">${index + 1}. ${s.email}</span>
                    <span style="font-size:0.7rem;color:var(--text-light);">: <code style="font-family:monospace;background:var(--bg-card);padding:0.05rem 0.3rem;border-radius:4px;">${s.code}</code></span>
                    <span style="font-size:0.65rem;color:var(--text-light);">${s.usedAt ? new Date(s.usedAt).toLocaleString('ar') : ''}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    window.openTeacherMessages = function() {
        const teacher = getManagedTeacher();
        if (!teacher) {
            showToast('warning', '      ');
            return;
        }

        const nameEl = safeGetElement('teacherMessagesName');
        if (nameEl) nameEl.textContent = ` ${teacher.teacher.name}`;
        
        const modal = safeGetElement('teacherMessagesModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        renderTeacherMessages(teacher.teacher.name);
    };

    function renderTeacherMessages(teacherName) {
        const container = safeGetElement('teacherMessagesList');
        if (!container) return;

        const messages = contactMessages.filter(m => m.recipient === teacherName || m.recipient === currentUser?.email);

        if (messages.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;font-size:0.8rem;">    </p>';
            return;
        }

        let html = '';
        messages.slice().reverse().forEach(msg => {
            const isRead = msg.read || false;
            const senderName = msg.senderName || msg.sender || '';
            html += `
                <div style="background:var(--bg);padding:0.6rem 0.8rem;border-radius:8px;margin-bottom:0.4rem;border-right:3px solid ${isRead ? '#22c55e' : '#f59e0b'};">
                    <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-light);flex-wrap:wrap;">
                        <span><i class="fas fa-user"></i> ${senderName}</span>
                        <span>${new Date(msg.sentAt).toLocaleString('ar')}</span>
                    </div>
                    <div style="font-weight:600;font-size:0.85rem;">${msg.subject}</div>
                    <div style="font-size:0.75rem;color:var(--text-light);">${msg.message}</div>
                    ${msg.attachments && msg.attachments.length ? `<div style="font-size:0.6rem;color:var(--primary);"><i class="fas fa-paperclip"></i> ${msg.attachments.length} </div>` : ''}
                    <div style="font-size:0.6rem;color:${isRead ? '#22c55e' : '#f59e0b'};margin-top:0.2rem;">
                        ${isRead ? ' ' : ' '}
                        ${!isRead ? `<button onclick="markInboxMessageRead(${msg.id})" style="background:var(--primary);color:white;border:none;border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;font-size:0.55rem;margin-right:0.3rem;">  </button>` : ''}
                        <button onclick="deleteInboxMessage(${msg.id})" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;font-size:0.55rem;"></button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    window.openTeacherCodes = function() {
        const teacher = getManagedTeacher();
        if (!teacher) {
            showToast('warning', '      ');
            return;
        }

        const modal = safeGetElement('teacherAdminModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        const nameEl = safeGetElement('teacherAdminName');
        if (nameEl) nameEl.textContent = ` ${teacher.teacher.name}`;

        document.querySelectorAll('#teacherAdminModal .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('#teacherAdminModal .tab-btn[data-tab="teacher-codes"]')?.classList.add('active');
        document.querySelectorAll('#teacherAdminModal .tab-content').forEach(t => t.classList.remove('active'));
        const codesTab = safeGetElement('tab-teacher-codes');
        if (codesTab) codesTab.classList.add('active');

        renderTeacherCodes(teacher.sectionIndex, teacher.teacherIndex);
    };

    // ============================================================
    // DATA FUNCTIONS
    // ============================================================

    function normalizeDataStructure(courseData) {
        if (!courseData || typeof courseData !== 'object') {
            courseData = { sections: [] };
        }
        if (!courseData.sections || !Array.isArray(courseData.sections)) {
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
                    if (!('isAdminCode' in c)) c.isAdminCode = false;
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

    // =====    Supabase  =====
    async function loadData() {
        try {
            if (!supabaseClient) {
                console.error(' Supabase  ');
                showToast('error', '    ');
                data = { sections: [] };
                normalizeDataStructure(data);
                renderAllData();
                return;
            }

            const remoteData = await getSupabaseAcademyData();
            
            if (remoteData && remoteData.sections && Array.isArray(remoteData.sections) && remoteData.sections.length > 0) {
                data = remoteData;
                normalizeDataStructure(data);
                localStorage.setItem('academyData', JSON.stringify(data));
                console.log('     Supabase ');
                showToast('success', `   ${data.sections.length}    `);
            } else {
                console.log('     Supabase    ...');
                data = { sections: [] };
                normalizeDataStructure(data);
                localStorage.removeItem('academyData');
                showToast('info', '          ');
                
                if (teachersGridContainer) {
                    teachersGridContainer.innerHTML = `
                        <div class="empty-teachers" style="text-align:center;padding:3rem 1rem;">
                            <span class="empty-icon" style="font-size:4rem;display:block;margin-bottom:1rem;"></span>
                            <h3 style="font-size:1.2rem;color:var(--text);">  </h3>
                            <p style="color:var(--text-light);font-size:0.9rem;max-width:400px;margin:0 auto;">
                                          
                            </p>
                            <button onclick="navigateTo('account')" style="margin-top:1rem;padding:0.5rem 1.5rem;background:var(--primary-gradient);color:white;border:none;border-radius:30px;font-weight:600;cursor:pointer;">
                                <i class="fas fa-cog"></i>    
                            </button>
                        </div>
                    `;
                }
            }
            
            renderAllData();
            renderMyCourses();
            renderAccount();
            renderContactTeachers();
            renderTeacherInbox();
            updateBadge();
            updateContactBadge();
            updateAllAdminSelects();
            
            await syncPendingCodes();
            
        } catch (error) {
            console.error('    :', error);
            showToast('error', '     ');
            data = { sections: [] };
            normalizeDataStructure(data);
            localStorage.removeItem('academyData');
            renderAllData();
        }
    }

    // =====    Supabase =====
    async function getSupabaseAcademyData() {
        if (!supabaseClient) return null;
        
        try {
            const { data, error } = await supabaseClient
                .from('academy_data')
                .select('content')
                .eq('id', 'main')
                .maybeSingle();
            
            if (error) {
                console.warn('      Supabase:', error.message || error);
                return null;
            }
            
            if (!data || !data.content) {
                console.log('      Supabase');
                return null;
            }
            
            const content = data.content;
            if (!content.sections || !Array.isArray(content.sections)) {
                console.warn('      Supabase');
                return null;
            }
            
            return content;
            
        } catch (error) {
            console.warn('     Supabase:', error);
            return null;
        }
    }

    // =====    Supabase =====
    async function saveSupabaseAcademyData() {
        if (!supabaseClient) {
            return { success: false, error: 'Supabase  ' };
        }
        
        try {
            if (!data || !data.sections || !Array.isArray(data.sections)) {
                return { success: false, error: '   ' };
            }
            
            const cleanData = JSON.parse(JSON.stringify(data));
            normalizeDataStructure(cleanData);
            
            const record = { 
                id: 'main', 
                content: cleanData, 
                updated_at: new Date().toISOString() 
            };
            
            const { error } = await supabaseClient
                .from('academy_data')
                .upsert(record, { onConflict: 'id' });
            
            if (error) {
                console.error('      Supabase:', error);
                return { success: false, error: error };
            }
            
            localStorage.setItem('academyData', JSON.stringify(cleanData));
            console.log('     Supabase ');
            return { success: true };
            
        } catch (error) {
            console.error('     Supabase:', error);
            return { success: false, error: error };
        }
    }

    function saveData() {
        try {
            localStorage.setItem('academyData', JSON.stringify(data));
            console.log('    ');
        } catch (error) {
            console.error('    :', error);
            showToast('error', '    ');
        }
    }

    // ============================================================
    //    
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
        if (currentFilter === 'all') {
            return getAllTeachers();
        }
        return getTeachersBySection(currentFilter);
    }

    function buildFilterButtons(container, countContainer) {
        if (!container) return;

        let html = `<button class="filter-btn active" data-section="all" onclick="setFilter('all')">
            <span class="btn-icon"></span> 
            <span class="btn-count">${getAllTeachers().length}</span>
        </button>`;

        data.sections.forEach(section => {
            const teacherCount = section.teachers ? section.teachers.length : 0;
            const isActive = currentFilter === section.id;
            html += `<button class="filter-btn ${isActive ? 'active' : ''}" data-section="${section.id}" onclick="setFilter('${section.id}')">
                <span class="btn-icon"></span> ${section.name}
                <span class="btn-count">${teacherCount}</span>
            </button>`;
        });

        container.innerHTML = html;

        if (countContainer) {
            const filtered = getFilteredTeachers();
            countContainer.textContent = filtered.length;
        }
    }

    window.setFilter = function(sectionId) {
        currentFilter = sectionId;
        renderAllData();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionId);
        });
    };

    function renderTeachers(teachers, container) {
        if (!container) return;

        if (!teachers || teachers.length === 0) {
            container.innerHTML = `
                <div class="empty-teachers">
                    <span class="empty-icon"></span>
                    <h3>  </h3>
                    <p>${currentFilter === 'all' ? '     ' : '     '}</p>
                </div>
            `;
            return;
        }

        let html = `<div class="teachers-grid">`;

        teachers.forEach((teacher) => {
            const hasAccess = hasAccessToTeacher(teacher);
            const canContact = canUserContact() && hasAccess;
            const imageUrl = getSafeImageUrl(teacher.image);
            const validImage = imageUrl && isValidImageUrl(imageUrl);
            const emoji = teacher.emoji || '';
            const name = teacher.name || '';
            const subject = teacher.subject || '';
            const semestersCount = Array.isArray(teacher.semesters) ? teacher.semesters.length : 0;
            const sectionName = teacher._sectionName || '';

            html += `
                <div class="teacher-card" onclick="openTeacher(${teacher._sectionIndex}, ${teacher._teacherIndex})">
                    <div class="teacher-section-badge">${sectionName}</div>
                    <div class="teacher-card-image">
                        ${validImage ? `<img src="${imageUrl}" alt="${name}" onerror="this.style.display='none'; this.parentElement.querySelector('.teacher-emoji').style.display='block';">` : ''}
                        <span class="teacher-emoji" style="${validImage ? 'display:none;' : 'display:block;'}">${emoji}</span>
                        ${hasAccess ? '<div class="teacher-badge"></div>' : ''}
                    </div>
                    <div class="teacher-card-info">
                        <h3>${name}</h3>
                        ${subject ? `<div class="teacher-subject">${subject}</div>` : ''}
                        <div class="teacher-stats"> ${semestersCount} </div>
                    </div>
                    <div class="teacher-card-overlay">
                        <i class="fas fa-chevron-left"></i>
                        <span></span>
                    </div>
                    ${canContact ? `
                        <button class="btn-contact" onclick="event.stopPropagation();openChat('${name.replace(/'/g, "\\'")}', '${emoji}', '${subject.replace(/'/g, "\\'")}', '${imageUrl || ''}')">
                            <i class="fas fa-comment"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    function renderAllData() {
        const filteredTeachers = getFilteredTeachers();

        if (teachersCount) teachersCount.textContent = filteredTeachers.length;
        if (teachersCount2) teachersCount2.textContent = filteredTeachers.length;

        renderTeachers(filteredTeachers, teachersGridContainer);
        renderTeachers(filteredTeachers, teachersGridContainer2);

        buildFilterButtons(sectionFilter, teachersCount);
        buildFilterButtons(sectionFilter2, teachersCount2);
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
        if (modalTeacherTitle) modalTeacherTitle.textContent = ` ${teacher.name} (${section.name})`;

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
                        <div class="semester-number">  ${semester.number}</div>
                        <div class="semester-desc">${semester.description || ''} (${semester.lectures.length} )</div>
                    </div>
                    <div class="semester-status">
                        ${isLocked ? ' ' : (hasAccess ? ' ' : ' ')}
                        <i class="fas fa-chevron-left"></i>
                    </div>
                </div>
            `;
        });

        const isActivated = hasAccessToTeacher(teacher);
        html += `
            <div class="codes-info">
                <div class="access-status ${isActivated ? 'active' : 'inactive'}">
                    ${isActivated ? '   -   ' : '    -   '}
                </div>
                ${!isActivated ? `
                    <div class="code-box-mini" style="margin-top:0.8rem;background:var(--bg);padding:0.8rem;border-radius:var(--radius-sm);">
                        <p style="font-size:0.85rem;margin-bottom:0.3rem;">      </p>
                        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                            <input type="password" id="codeInputTeacher" placeholder=" ..." maxlength="20" style="flex:1;min-width:120px;padding:0.5rem 0.8rem;border:2px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text);font-size:0.9rem;outline:none;text-align:center;letter-spacing:2px;font-weight:700;font-family:monospace;" />
                            <button onclick="activateCodeFromTeacher()" style="padding:0.5rem 1.2rem;background:var(--primary-gradient);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;"></button>
                        </div>
                        <div id="codeMessageTeacher" style="margin-top:0.3rem;font-size:0.85rem;"></div>
                    </div>
                ` : ''}
            </div>
        `;

        if (semestersList) semestersList.innerHTML = html;
        if (semestersModal) {
            semestersModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    window.activateCodeFromTeacher = async function() {
        const codeInput = safeGetElement('codeInputTeacher');
        const codeMessage = safeGetElement('codeMessageTeacher');
        
        if (!codeInput || !codeMessage) return;
        
        const code = codeInput.value.trim().toUpperCase();

        if (!code) {
            codeMessage.innerHTML = '   ';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        if (!activeTeacher) {
            codeMessage.innerHTML = '    ';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        if (!currentUser) {
            codeMessage.innerHTML = '    ';
            codeMessage.style.color = '#ef4444';
            showToast('error', '    ');
            return;
        }

        const result = await verifyCode(activeTeacher, code);
        codeMessage.innerHTML = result.message;
        codeMessage.style.color = result.valid ? '#22c55e' : '#ef4444';

        if (result.valid) {
            showToast('success', '   !');
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
            showToast('error', ' ' + result.message);
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
        if (modalSemesterTitle) modalSemesterTitle.textContent = `  ${semester.number} - ${teacher.name}`;

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
                        ${isFree ? '<span class="free-badge"> </span>' : ''}
                        ${isMediaDelivery ? '<span style="font-size:0.6rem;color:var(--primary);margin-left:0.3rem;"></span>' : ''}
                        ${canWatch ? `<i class="fas ${videoIcon}" style="color:var(--primary);"></i>` : '<i class="fas fa-lock" style="color:#ef4444;"></i>'}
                    </div>
                </div>
            `;
        });

        if (lecturesList) lecturesList.innerHTML = html;
        if (lecturesModal) {
            lecturesModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // ===== MY COURSES =====
    function getMyCourses() {
        if (!currentUser) return [];
        const courses = [];

        data.sections.forEach(section => {
            section.teachers.forEach((teacher, teacherIndex) => {
                const hasAccess = teacher.codes ? teacher.codes.some(c => 
                    (c.used && c.userEmail === currentUser.email && !c.locked) || 
                    (c.isAdminCode && c.userEmail === currentUser.email)
                ) : false;
                
                const isTeacherAdmin = isTeacherAdminForTeacher(currentUser.email, teacher.name);
                
                if (hasAccess || isTeacherAdmin) {
                    courses.push({
                        teacherName: teacher.name,
                        teacherEmoji: teacher.emoji || '',
                        teacherImage: getSafeImageUrl(teacher.image) || '',
                        sectionName: section.name,
                        sectionIndex: data.sections.indexOf(section),
                        teacherIndex: teacherIndex,
                        codes: teacher.codes ? teacher.codes.filter(c => 
                            (c.used && c.userEmail === currentUser.email) || 
                            (c.isAdminCode && c.userEmail === currentUser.email)
                        ) : [],
                        isAdmin: isTeacherAdmin
                    });
                }
            });
        });

        return courses;
    }

    function renderMyCourses() {
        const container = safeGetElement('myCoursesContainer');
        const countSpan = safeGetElement('myCoursesCount');
        if (!container) return;

        const courses = getMyCourses();
        if (countSpan) countSpan.textContent = courses.length + ' ';

        if (courses.length === 0) {
            container.innerHTML = `
                <div class="empty-courses">
                    <span class="empty-icon"></span>
                    <h3>     </h3>
                    <p>      </p>
                    <button class="btn-primary" onclick="navigateTo('teachers')">
                        <i class="fas fa-search"></i>  
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="my-courses-grid">';
        courses.forEach(course => {
            const isAdmin = course.isAdmin || false;
            const imageUrl = getSafeImageUrl(course.teacherImage);
            const validImage = imageUrl && isValidImageUrl(imageUrl);
            html += `
                <div class="course-card-mini" onclick="openTeacher(${course.sectionIndex}, ${course.teacherIndex})">
                    <div class="course-avatar">
                        ${validImage ? `<img src="${imageUrl}" alt="${course.teacherName}" onerror="this.style.display='none'; this.parentElement.textContent='${course.teacherEmoji}';">` : course.teacherEmoji}
                    </div>
                    <div class="course-name">${course.teacherName}</div>
                    <div class="course-meta">${course.sectionName} | ${course.codes.length} </div>
                    <div class="course-badge" style="${isAdmin ? 'background:linear-gradient(135deg,#8B5CF6,#A78BFA);' : ''}">
                        ${isAdmin ? ' ' : ' '}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // ===== ACCOUNT =====
    function renderAccount() {
        if (!currentUser) {
            if (accountName) accountName.textContent = ' ';
            if (accountEmail) accountEmail.textContent = '  ';
            if (accountAvatar) accountAvatar.textContent = '';
            if (accountRegistered) accountRegistered.textContent = '--';
            if (accountCourses) accountCourses.textContent = '0';
            if (accountCodes) accountCodes.textContent = '0';
            if (accountMessages) accountMessages.textContent = '0';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none';

            const teacherDashboard = safeGetElement('teacherDashboard');
            if (teacherDashboard) teacherDashboard.style.display = 'none';
            return;
        }

        const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '';
        if (accountName) accountName.textContent = name;
        if (accountEmail) accountEmail.textContent = currentUser.email;
        if (accountAvatar) accountAvatar.textContent = name.charAt(0).toUpperCase();

        const registered = currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString('ar') : ' ';
        if (accountRegistered) accountRegistered.textContent = ' : ' + registered;

        const courses = getMyCourses();
        if (accountCourses) accountCourses.textContent = courses.length;

        let codesCount = 0;
        data.sections.forEach(section => {
            section.teachers.forEach(teacher => {
                if (teacher.codes) {
                    codesCount += teacher.codes.filter(c => 
                        (c.used && c.userEmail === currentUser.email) || 
                        (c.isAdminCode && c.userEmail === currentUser.email)
                    ).length;
                }
            });
        });
        if (accountCodes) accountCodes.textContent = codesCount;

        const userMessages = contactMessages.filter(m => m.sender === currentUser.email);
        if (accountMessages) accountMessages.textContent = userMessages.length;

        const userEmail = currentUser.email;

        if (ADMIN_EMAILS.includes(userEmail)) {
            if (adminPanelBtn) adminPanelBtn.style.display = 'flex';
        } else {
            isUserAdmin(userEmail).then(isAdmin => {
                if (adminPanelBtn) adminPanelBtn.style.display = isAdmin ? 'flex' : 'none';
            }).catch(() => {
                if (adminPanelBtn) adminPanelBtn.style.display = 'none';
            });
        }

        const isTeacherAdmin = isAnyTeacherAdmin(userEmail);
        const teacherDashboard = safeGetElement('teacherDashboard');
        if (teacherDashboard) {
            teacherDashboard.style.display = isTeacherAdmin ? 'block' : 'none';
        }

        renderTeacherInbox();
    }

    function updateBadge() {
        const courses = getMyCourses();
        if (coursesBadge) {
            if (courses.length > 0) {
                coursesBadge.style.display = 'inline';
                coursesBadge.textContent = courses.length;
            } else {
                coursesBadge.style.display = 'none';
            }
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
            const chatPage = safeGetElement('chatPage');
            if (chatPage) chatPage.classList.remove('active');
            const chatPopup = safeGetElement('chatPopup');
            if (chatPopup) chatPopup.classList.remove('active');
            const teacherAdminModal = safeGetElement('teacherAdminModal');
            if (teacherAdminModal) teacherAdminModal.classList.remove('active');
            const teacherStudentsModal = safeGetElement('teacherStudentsModal');
            if (teacherStudentsModal) teacherStudentsModal.classList.remove('active');
            const teacherMessagesModal = safeGetElement('teacherMessagesModal');
            if (teacherMessagesModal) teacherMessagesModal.classList.remove('active');
            renderMyCourses();
            renderAccount();
            updateBadge();
            renderAllData();
            showToast('success', '    ');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        } catch (error) {
            console.warn('SignOut exception:', error);
            showToast('error', '     ');
        }
    }

    function updateUI() {
        if (currentUser) {
            const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '';
            if (userNameDisplay) userNameDisplay.textContent = name;
            if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
        } else {
            if (userNameDisplay) userNameDisplay.textContent = ' ';
            if (userAvatar) userAvatar.textContent = '';
        }
    }

    // ===== NAVIGATION =====
    window.navigateTo = function(page) {
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
        const targetPage = safeGetElement('page-' + page);
        if (targetPage) targetPage.style.display = 'block';

        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-links li a[data-page="${page}"]`)?.closest('li')?.classList.add('active');

        bottomNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        const hero = safeGetElement('hero');
        if (hero) {
            hero.style.display = page === 'home' ? 'flex' : 'none';
        }

        if (page === 'my-courses') {
            renderMyCourses();
            updateBadge();
        }
        if (page === 'account') {
            renderAccount();
            renderMyMessages();
        }
        if (page === 'teachers' || page === 'home') {
            renderAllData();
        }
        if (page === 'contact') {
            renderContactTeachers();
            checkContactMessages();
            renderChatList();
            updateChatBadge();
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

    const userProfileBtn = safeGetElement('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', function() {
            if (!currentUser) {
                window.location.href = 'index.html';
                return;
            }
            navigateTo('account');
        });
    }

    if (logoutAccountBtn) logoutAccountBtn.addEventListener('click', signOut);

    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', function() {
            if (!currentUser) {
                showToast('warning', '    ');
                return;
            }

            if (ADMIN_EMAILS.includes(currentUser.email)) {
                if (adminPanel) adminPanel.classList.add('active');
                updateAllAdminSelects();
                updatePendingChanges();
                loadAdminsList();
                renderAllMessages();
                renderTeacherAdminsList();
                showToast('success', '     ');
                return;
            }

            isUserAdmin(currentUser.email).then(isAdmin => {
                if (isAdmin) {
                    if (adminPanel) adminPanel.classList.add('active');
                    updateAllAdminSelects();
                    updatePendingChanges();
                    loadAdminsList();
                    renderAllMessages();
                    renderTeacherAdminsList();
                    showToast('success', '     ');
                } else {
                    showToast('error', '       ');
                }
            });
        });
    }

    if (adminClose) {
        adminClose.addEventListener('click', function() {
            if (adminPanel) adminPanel.classList.remove('active');
        });
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        if (themeToggle) themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('devAcademicTheme', isDarkMode ? 'dark' : 'light');
        showToast('info', isDarkMode ? '    ' : '    ');
    }

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    function applyFilters() {
        if (!searchInput) return;
        const term = searchInput.value.trim().toLowerCase();
        if (term === '') {
            renderAllData();
            return;
        }

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

    if (searchBtn) searchBtn.addEventListener('click', applyFilters);
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') applyFilters();
        });
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    if (closeTeachersModal) closeTeachersModal.addEventListener('click', () => closeModal(teachersModal));
    if (closeSemestersModal) closeSemestersModal.addEventListener('click', () => closeModal(semestersModal));
    if (closeLecturesModal) closeLecturesModal.addEventListener('click', () => closeModal(lecturesModal));

    if (teachersModal) {
        teachersModal.addEventListener('click', function(e) {
            if (e.target === this) closeModal(this);
        });
    }
    if (semestersModal) {
        semestersModal.addEventListener('click', function(e) {
            if (e.target === this) closeModal(this);
        });
    }
    if (lecturesModal) {
        lecturesModal.addEventListener('click', function(e) {
            if (e.target === this) closeModal(this);
        });
    }

    if (closePlayer) closePlayer.addEventListener('click', closeVideoPlayer);
    if (videoPlayer) {
        videoPlayer.addEventListener('click', function(e) {
            if (e.target === this) closeVideoPlayer();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (videoPlayer && videoPlayer.classList.contains('active')) closeVideoPlayer();
            if (teachersModal && teachersModal.classList.contains('active')) closeModal(teachersModal);
            if (semestersModal && semestersModal.classList.contains('active')) closeModal(semestersModal);
            if (lecturesModal && lecturesModal.classList.contains('active')) closeModal(lecturesModal);
            if (editLectureModal && editLectureModal.classList.contains('active')) closeEditLectureModal();
            if (adminPanel && adminPanel.classList.contains('active')) adminPanel.classList.remove('active');
            const chatPage = safeGetElement('chatPage');
            if (chatPage && chatPage.classList.contains('active')) {
                chatPage.classList.remove('active');
                document.body.style.overflow = 'auto';
                if (chatRecipient) saveChatMessages(chatRecipient);
            }
            const chatPopup = safeGetElement('chatPopup');
            if (chatPopup && chatPopup.classList.contains('active')) {
                chatPopup.classList.remove('active');
            }
            const teacherAdminModal = safeGetElement('teacherAdminModal');
            if (teacherAdminModal && teacherAdminModal.classList.contains('active')) {
                teacherAdminModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
            const teacherStudentsModal = safeGetElement('teacherStudentsModal');
            if (teacherStudentsModal && teacherStudentsModal.classList.contains('active')) {
                teacherStudentsModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
            const teacherMessagesModal = safeGetElement('teacherMessagesModal');
            if (teacherMessagesModal && teacherMessagesModal.classList.contains('active')) {
                teacherMessagesModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }
    });

    // ============================================================
    //       
    // ============================================================

    function updateAllAdminSelects() {
        updateBasicSelects();
        updateTeacherSelects();
        updateSemesterSelects();
        updateLectureSelects();
        updateDeleteSelects();
        updateEditSelects();
        updateCodeSelects();
        updateCodesManagement();
        updateTeacherAdminSelects();
    }

    function updateBasicSelects() {
        const selectIds = [
            'teacherSection', 'semesterSection', 'lectureSection',
            'codeSection', 'editTeacherSection', 'editLectureSection',
            'deleteSection', 'deleteTeacherSection', 'deleteSemesterSection',
            'deleteLectureSection', 'teacherAdminSection'
        ];

        selectIds.forEach(id => {
            const select = safeGetElement(id);
            if (!select) return;
            const currentValue = select.value;
            let options = '<option value=""> ...</option>';
            data.sections.forEach((s, i) => {
                options += `<option value="${i}">${s.name}</option>`;
            });
            select.innerHTML = options;
            if (currentValue && data.sections[parseInt(currentValue)]) {
                select.value = currentValue;
            }
        });
    }

    function updateTeacherAdminSelects() {
        const sectionSelect = safeGetElement('teacherAdminSection');
        const teacherSelect = safeGetElement('teacherAdminTeacher');
        if (!sectionSelect || !teacherSelect) return;

        const sectionIndex = parseInt(sectionSelect.value);
        const currentValue = teacherSelect.value;
        let options = '<option value=""> ...</option>';

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

    function updateTeacherSelects() {
        const teacherSelects = [
            { selectId: 'semesterTeacher', sectionId: 'semesterSection' },
            { selectId: 'lectureTeacher', sectionId: 'lectureSection' },
            { selectId: 'editTeacherSelect', sectionId: 'editTeacherSection' },
            { selectId: 'editLectureTeacher', sectionId: 'editLectureSection' },
            { selectId: 'deleteTeacherSelect', sectionId: 'deleteTeacherSection' },
            { selectId: 'deleteSemesterTeacher', sectionId: 'deleteSemesterSection' },
            { selectId: 'deleteLectureTeacher', sectionId: 'deleteLectureSection' }
        ];

        teacherSelects.forEach(({ selectId, sectionId }) => {
            const select = safeGetElement(selectId);
            const sectionSelect = safeGetElement(sectionId);
            if (!select || !sectionSelect) return;

            const sectionIndex = parseInt(sectionSelect.value);
            const currentValue = select.value;
            let options = '<option value=""> ...</option>';

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
            const select = safeGetElement(selectId);
            const teacherSelect = safeGetElement(teacherId);
            const sectionSelect = safeGetElement(sectionId);
            if (!select || !teacherSelect || !sectionSelect) return;

            const sectionIndex = parseInt(sectionSelect.value);
            const teacherIndex = parseInt(teacherSelect.value);
            const currentValue = select.value;

            let options = '<option value=""> ...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 &&
                !isNaN(teacherIndex) && teacherIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[teacherIndex]) {
                const teacher = data.sections[sectionIndex].teachers[teacherIndex];
                if (teacher.semesters) {
                    teacher.semesters.forEach((s, i) => {
                        options += `<option value="${i}"> ${s.number} - ${s.description || ''}</option>`;
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
            const select = safeGetElement(selectId);
            const semesterSelect = safeGetElement(semesterId);
            const sectionSelect = safeGetElement(sectionId);
            const teacherSelect = safeGetElement(teacherId);
            if (!select || !semesterSelect || !sectionSelect || !teacherSelect) return;

            const sectionIndex = parseInt(sectionSelect.value);
            const teacherIndex = parseInt(teacherSelect.value);
            const semesterIndex = parseInt(semesterSelect.value);
            const currentValue = select.value;

            let options = '<option value=""> ...</option>';
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

    function updateDeleteSelects() {
        const deleteTeacherSelect = safeGetElement('deleteTeacherSelect');
        const deleteTeacherSection = safeGetElement('deleteTeacherSection');
        if (deleteTeacherSelect && deleteTeacherSection) {
            const sectionIndex = parseInt(deleteTeacherSection.value);
            const currentValue = deleteTeacherSelect.value;
            let options = '<option value=""> ...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
                data.sections[sectionIndex].teachers.forEach((t, i) => {
                    options += `<option value="${i}">${t.name}</option>`;
                });
            }
            deleteTeacherSelect.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
                deleteTeacherSelect.value = currentValue;
            }
        }
    }

    function updateEditSelects() {
        const editTeacherSelect = safeGetElement('editTeacherSelect');
        const editTeacherSection = safeGetElement('editTeacherSection');
        if (editTeacherSelect && editTeacherSection) {
            const sectionIndex = parseInt(editTeacherSection.value);
            const currentValue = editTeacherSelect.value;
            let options = '<option value=""> ...</option>';
            if (!isNaN(sectionIndex) && sectionIndex >= 0 && data.sections[sectionIndex]) {
                data.sections[sectionIndex].teachers.forEach((t, i) => {
                    options += `<option value="${i}">${t.name}</option>`;
                });
            }
            editTeacherSelect.innerHTML = options;
            if (currentValue && !isNaN(sectionIndex) && sectionIndex >= 0 &&
                data.sections[sectionIndex]?.teachers[parseInt(currentValue)]) {
                editTeacherSelect.value = currentValue;
            }
            updateEditTeacherData();
        }
    }

    function updateCodeSelects() {
        const sectionSelect = safeGetElement('codeSection');
        const teacherSelect = safeGetElement('codeTeacherSelect');
        if (!sectionSelect || !teacherSelect) return;

        const sectionIndex = parseInt(sectionSelect.value);
        const currentValue = teacherSelect.value;
        let options = '<option value=""> ...</option>';

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

    function updateEditTeacherData() {
        const sectionSelect = safeGetElement('editTeacherSection');
        const teacherSelect = safeGetElement('editTeacherSelect');

        if (!sectionSelect || !teacherSelect) return;

        const sectionIndex = parseInt(sectionSelect.value);
        const teacherIndex = parseInt(teacherSelect.value);

        const nameInput = safeGetElement('editTeacherName');
        const subjectInput = safeGetElement('editTeacherSubject');
        const descInput = safeGetElement('editTeacherDesc');
        const imageInput = safeGetElement('editTeacherImage');
        const messageEl = safeGetElement('editTeacherMessage');

        if (isNaN(sectionIndex) || sectionIndex < 0 || isNaN(teacherIndex) || teacherIndex < 0 ||
            !data.sections[sectionIndex]?.teachers[teacherIndex]) {
            if (nameInput) nameInput.value = '';
            if (subjectInput) subjectInput.value = '';
            if (descInput) descInput.value = '';
            if (imageInput) imageInput.value = '';
            return;
        }

        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        if (nameInput) nameInput.value = teacher.name || '';
        if (subjectInput) subjectInput.value = teacher.subject || '';
        if (descInput) descInput.value = teacher.description || '';
        if (imageInput) imageInput.value = getSafeImageUrl(teacher.image) || '';
        if (messageEl) messageEl.innerHTML = '';
    }

    function updatePendingChanges() {
        if (pendingChangesSpan) pendingChangesSpan.textContent = pendingChanges;
    }

    function addChange() {
        pendingChanges++;
        updatePendingChanges();
    }

    // ============================================================
    // =====   =====
    // ============================================================
    if (addSectionForm) {
        addSectionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nameInput = safeGetElement('sectionName');
            if (!nameInput) return;
            const name = nameInput.value.trim();

            if (!name) {
                showToast('warning', '    ');
                return;
            }

            const newSection = {
                id: 'sec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                name: name,
                teachers: []
            };

            data.sections.push(newSection);
            saveData();
            renderAllData();
            updateAllAdminSelects();
            addChange();
            addSectionForm.reset();
            showToast('success', `    "${name}" `);
            if (adminPanel) adminPanel.classList.add('active');
        });
    }

    // ============================================================
    // =====   =====
    // ============================================================
    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const sectionSelect = safeGetElement('teacherSection');
            if (!sectionSelect) return;
            const sectionIndex = parseInt(sectionSelect?.value);

            if (isNaN(sectionIndex) || sectionIndex < 0) {
                showToast('warning', '   ');
                return;
            }

            const nameInput = safeGetElement('teacherName');
            const emojiInput = safeGetElement('teacherEmoji');
            const subjectInput = safeGetElement('teacherSubject');
            const descInput = safeGetElement('teacherDesc');
            const imageInput = safeGetElement('teacherImage');

            if (!nameInput) return;

            const name = nameInput.value.trim();
            const emoji = emojiInput?.value.trim() || '';
            const subject = subjectInput?.value.trim();
            const description = descInput?.value.trim();
            const image = imageInput?.value.trim();

            if (!name) {
                showToast('warning', '    ');
                return;
            }

            const newTeacher = {
                name,
                emoji,
                subject: subject || '',
                description: description || '',
                image: getSafeImageUrl(image) || '',
                codes: [],
                semesters: []
            };

            data.sections[sectionIndex].teachers.push(newTeacher);
            saveData();
            renderAllData();
            updateAllAdminSelects();
            addChange();
            addTeacherForm.reset();
            showToast('success', `    "${name}" `);
            if (adminPanel) adminPanel.classList.add('active');
        });
    }

    // ============================================================
    // =====   =====
    // ============================================================
    if (addSemesterForm) {
        addSemesterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const sectionSelect = safeGetElement('semesterSection');
            const teacherSelect = safeGetElement('semesterTeacher');
            const numberInput = safeGetElement('semesterNumber');
            const descInput = safeGetElement('semesterDesc');

            if (!sectionSelect || !teacherSelect || !numberInput) return;

            const sectionIndex = parseInt(sectionSelect?.value);
            const teacherIndex = parseInt(teacherSelect?.value);
            const number = parseInt(numberInput.value);
            const description = descInput?.value.trim();

            if (isNaN(sectionIndex) || sectionIndex < 0 || isNaN(teacherIndex) || teacherIndex < 0 || !number) {
                showToast('warning', '       ');
                return;
            }

            const newSemester = {
                number: number,
                description: description || ` ${number}`,
                lectures: []
            };

            data.sections[sectionIndex].teachers[teacherIndex].semesters.push(newSemester);
            saveData();
            renderAllData();
            updateAllAdminSelects();
            addChange();
            addSemesterForm.reset();
            showToast('success', `    ${number} `);
            if (adminPanel) adminPanel.classList.add('active');
        });
    }

    // ============================================================
    // =====   =====
    // ============================================================
    if (addLectureForm) {
        addLectureForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const sectionSelect = safeGetElement('lectureSection');
            const teacherSelect = safeGetElement('lectureTeacher');
            const semesterSelect = safeGetElement('lectureSemester');
            const numberInput = safeGetElement('lectureNumber');
            const titleInput = safeGetElement('lectureTitle');
            const urlInput = safeGetElement('lectureUrl');
            const freeSelect = safeGetElement('lectureFree');

            if (!sectionSelect || !teacherSelect || !semesterSelect || !numberInput || !titleInput || !urlInput || !freeSelect) return;

            const sectionIndex = parseInt(sectionSelect?.value);
            const teacherIndex = parseInt(teacherSelect?.value);
            const semesterIndex = parseInt(semesterSelect?.value);
            const number = parseInt(numberInput.value);
            const title = titleInput.value.trim();
            const youtubeUrl = urlInput.value.trim();
            const isFree = freeSelect.value === 'true';

            if (isNaN(sectionIndex) || sectionIndex < 0 || isNaN(teacherIndex) || teacherIndex < 0 ||
                isNaN(semesterIndex) || semesterIndex < 0 || !number || !title || !youtubeUrl) {
                showToast('warning', '     ');
                return;
            }

            const isValidUrl = youtubeUrl.includes('mediadelivery') ||
                youtubeUrl.includes('youtube') ||
                youtubeUrl.includes('youtu.be') ||
                youtubeUrl.includes('player.') ||
                youtubeUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i);

            if (!isValidUrl) {
                showToast('warning', '    .   mediadelivery  YouTube');
                return;
            }

            const newLecture = { number, title, youtubeUrl, isFree };
            data.sections[sectionIndex].teachers[teacherIndex].semesters[semesterIndex].lectures.push(newLecture);
            saveData();
            renderAllData();
            updateAllAdminSelects();
            addChange();
            addLectureForm.reset();
            showToast('success', `    "${title}" `);
            if (adminPanel) adminPanel.classList.add('active');
        });
    }

    // ============================================================
    // =====   =====
    // ============================================================
    window.addManualCode = function() {
        const sectionSelect = safeGetElement('codeSection');
        const teacherSelect = safeGetElement('codeTeacherSelect');
        const codeInput = safeGetElement('manualCodeInput');
        const codeMessage = safeGetElement('manualCodeMessage');

        if (!sectionSelect || !teacherSelect || !codeInput) return;

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const code = codeInput?.value.trim().toUpperCase();

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            if (codeMessage) {
                codeMessage.innerHTML = '    ';
                codeMessage.style.color = '#f59e0b';
            }
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            if (codeMessage) {
                codeMessage.innerHTML = '    ';
                codeMessage.style.color = '#f59e0b';
            }
            return;
        }

        if (!code) {
            if (codeMessage) {
                codeMessage.innerHTML = '   ';
                codeMessage.style.color = '#f59e0b';
            }
            return;
        }

        if (code.length < 4) {
            if (codeMessage) {
                codeMessage.innerHTML = '   ';
                codeMessage.style.color = '#f59e0b';
            }
            return;
        }

        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        if (!teacher) {
            if (codeMessage) {
                codeMessage.innerHTML = '   ';
                codeMessage.style.color = '#ef4444';
            }
            return;
        }

        if (!teacher.codes) teacher.codes = [];
        const exists = teacher.codes.some(c => c.code === code);
        if (exists) {
            if (codeMessage) {
                codeMessage.innerHTML = '    ';
                codeMessage.style.color = '#f59e0b';
            }
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
        addChange();
        updateCodesManagement();
        if (codeInput) codeInput.value = '';
        if (codeMessage) {
            codeMessage.innerHTML = `   : ${code}`;
            codeMessage.style.color = '#22c55e';
        }
        showToast('success', `   : ${code}`);
        updateAllAdminSelects();
    };

    window.generateCodes = function(count = 5) {
        const sectionSelect = safeGetElement('codeSection');
        const teacherSelect = safeGetElement('codeTeacherSelect');
        if (!sectionSelect || !teacherSelect) return;
        
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '    ');
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '    ');
            return;
        }

        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        if (!teacher) { showToast('error', '   '); return; }

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
        addChange();
        updateCodesManagement();
        showToast('success', `   ${newCodes.length}  `);
        updateAllAdminSelects();
    };

    function updateCodesManagement() {
        const sectionSelect = safeGetElement('codeSection');
        const teacherSelect = safeGetElement('codeTeacherSelect');
        const container = safeGetElement('codesListContainer');

        if (!container) return;

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem 0;">  </p>';
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem 0;">  </p>';
            return;
        }

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem 0;">  </p>';
            return;
        }

        const status = getCodesStatus(teacher);
        let html = `
            <div class="codes-stats">
                <span> : ${status.total}</span>
                <span> : ${status.used}</span>
                <span> : ${status.available}</span>
                <span> : ${status.locked}</span>
            </div>
            <div class="codes-table-wrapper">
                <table class="codes-table">
                    <thead><tr><th>#</th><th></th><th></th><th> </th><th></th></tr></thead>
                    <tbody>
        `;

        if (teacher.codes && teacher.codes.length > 0) {
            teacher.codes.forEach((c, index) => {
                const isUsed = c.used;
                const isLocked = c.locked || false;
                const isMyCode = c.userEmail === currentUser?.email;
                const isAdminCode = c.isAdminCode || false;
                let statusText = '', statusColor = '#22c55e', usedAtDisplay = '';

                if (isAdminCode) { 
                    statusText = ' '; 
                    statusColor = '#8B5CF6';
                    usedAtDisplay = c.usedAt ? new Date(c.usedAt).toLocaleString('ar') : '';
                } else if (isLocked) { 
                    statusText = ' ';
                    statusColor = '#f59e0b';
                } else if (isUsed) {
                    statusText = isMyCode ? ' ' : ' ';
                    statusColor = isMyCode ? '#22c55e' : '#ef4444';
                    usedAtDisplay = c.usedAt ? new Date(c.usedAt).toLocaleString('ar') : ' ';
                } else { 
                    statusText = ' ';
                    statusColor = '#22c55e';
                }

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code style="font-weight:700;color:${statusColor};">${c.code}</code></td>
                        <td><span style="color:${statusColor};">${statusText}</span></td>
                        <td style="font-size:0.7rem;color:var(--text-light);">${usedAtDisplay}</td>
                        <td>
                            ${!isAdminCode ? `
                                <button onclick="toggleCodeLock('${sectionIndex}', '${teacherIndex}', '${c.code}')" style="background:${isLocked ? '#22c55e' : '#f59e0b'};color:white;border:none;border-radius:4px;padding:0.15rem 0.5rem;cursor:pointer;font-size:0.7rem;">
                                    ${isLocked ? ' ' : ' '}
                                </button>
                                ${!isUsed && !isLocked ? `<button onclick="deleteCodeAction('${sectionIndex}', '${teacherIndex}', '${c.code}')" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.15rem 0.5rem;cursor:pointer;font-size:0.7rem;"></button>` : ''}
                            ` : '<span style="font-size:0.6rem;color:var(--text-light);">  </span>'}
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:1rem 0;">  </td></tr>`;
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }

    window.toggleCodeLock = function(sectionIndex, teacherIndex, code) {
        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) { showToast('error', '   '); return; }

        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) { showToast('error', '   '); return; }

        if (codeData.isAdminCode) {
            showToast('warning', '     ');
            return;
        }

        codeData.locked = !codeData.locked;
        saveData();
        addChange();
        updateCodesManagement();
        showToast('success', `  ${codeData.locked ? '' : ''}  ${code}`);
    };

    window.deleteCodeAction = function(sectionIndex, teacherIndex, code) {
        if (!confirm(`      : ${code}`)) return;

        const teacher = data.sections[sectionIndex]?.teachers[teacherIndex];
        if (!teacher) { showToast('error', '   '); return; }

        const index = teacher.codes.findIndex(c => c.code === code);
        if (index === -1) { showToast('error', '   '); return; }

        if (teacher.codes[index].used) {
            showToast('warning', '     ');
            return;
        }

        if (teacher.codes[index].isAdminCode) {
            showToast('warning', '     ');
            return;
        }

        teacher.codes.splice(index, 1);
        saveData();
        addChange();
        updateCodesManagement();
        showToast('success', `   : ${code}`);
    };

    // ============================================================
    // ===== EDIT TEACHER =====
    // ============================================================
    const editTeacherSection = safeGetElement('editTeacherSection');
    if (editTeacherSection) {
        editTeacherSection.addEventListener('change', function() {
            updateAllAdminSelects();
        });
    }

    const editTeacherSelect = safeGetElement('editTeacherSelect');
    if (editTeacherSelect) {
        editTeacherSelect.addEventListener('change', function() {
            updateEditTeacherData();
        });
    }

    if (editTeacherForm) {
        editTeacherForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const sectionSelect = safeGetElement('editTeacherSection');
            const teacherSelect = safeGetElement('editTeacherSelect');
            const messageEl = safeGetElement('editTeacherMessage');

            if (!sectionSelect || !teacherSelect || !messageEl) return;

            const sectionIndex = parseInt(sectionSelect?.value);
            const teacherIndex = parseInt(teacherSelect?.value);

            if (isNaN(sectionIndex) || sectionIndex < 0) {
                messageEl.innerHTML = '   ';
                messageEl.style.color = '#f59e0b';
                return;
            }

            if (isNaN(teacherIndex) || teacherIndex < 0) {
                messageEl.innerHTML = '   ';
                messageEl.style.color = '#f59e0b';
                return;
            }

            const teacher = data.sections[sectionIndex].teachers[teacherIndex];
            if (!teacher) {
                messageEl.innerHTML = '   ';
                messageEl.style.color = '#ef4444';
                return;
            }

            const nameInput = safeGetElement('editTeacherName');
            const subjectInput = safeGetElement('editTeacherSubject');
            const descInput = safeGetElement('editTeacherDesc');
            const imageInput = safeGetElement('editTeacherImage');

            if (!nameInput) return;

            const newName = nameInput.value.trim();
            const newSubject = subjectInput?.value.trim();
            const newDesc = descInput?.value.trim();
            const newImage = imageInput?.value.trim();

            if (!newName) {
                messageEl.innerHTML = '    ';
                messageEl.style.color = '#f59e0b';
                return;
            }

            teacher.name = newName;
            teacher.subject = newSubject || '';
            teacher.description = newDesc || '';
            teacher.image = getSafeImageUrl(newImage) || '';

            saveData();
            renderAllData();
            updateAllAdminSelects();
            addChange();

            messageEl.innerHTML = `     "${newName}" !`;
            messageEl.style.color = '#22c55e';
            showToast('success', `     "${newName}"`);
        });
    }

    // ============================================================
    // ===== DELETE FUNCTIONS =====
    // ============================================================

    window.deleteSelectedSection = function() {
        const select = safeGetElement('deleteSection');
        if (!select) return;
        const sectionIndex = parseInt(select?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        const section = data.sections[sectionIndex];
        if (!section) { showToast('error', '   '); return; }

        if (!confirm(`       "${section.name}"  `)) return;

        data.sections.splice(sectionIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();

        const msg = safeGetElement('deleteSectionMessage');
        if (msg) { msg.innerHTML = `    "${section.name}" `;
            msg.style.color = '#22c55e'; }
        showToast('success', `    "${section.name}"`);
    };

    window.deleteSelectedTeacherFromTab = function() {
        const sectionSelect = safeGetElement('deleteTeacherSection');
        const teacherSelect = safeGetElement('deleteTeacherSelect');
        if (!sectionSelect || !teacherSelect) return;
        
        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        const teacher = data.sections[sectionIndex].teachers[teacherIndex];
        if (!teacher) { showToast('error', '   '); return; }

        if (!confirm(`       "${teacher.name}"`)) return;

        data.sections[sectionIndex].teachers.splice(teacherIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();

        const msg = safeGetElement('deleteTeacherMessage');
        if (msg) { msg.innerHTML = `    "${teacher.name}" `;
            msg.style.color = '#22c55e'; }
        showToast('success', `    "${teacher.name}"`);
    };

    window.deleteSelectedSemesterFromTab = function() {
        const sectionSelect = safeGetElement('deleteSemesterSection');
        const teacherSelect = safeGetElement('deleteSemesterTeacher');
        const semesterSelect = safeGetElement('deleteSemesterSelect');

        if (!sectionSelect || !teacherSelect || !semesterSelect) return;

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        const semester = data.sections[sectionIndex].teachers[teacherIndex]?.semesters[semesterIndex];
        if (!semester) { showToast('error', '   '); return; }

        if (!confirm(`       ${semester.number}`)) return;

        data.sections[sectionIndex].teachers[teacherIndex].semesters.splice(semesterIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();

        const msg = safeGetElement('deleteSemesterMessage');
        if (msg) { msg.innerHTML = `    ${semester.number} `;
            msg.style.color = '#22c55e'; }
        showToast('success', `    ${semester.number}`);
        updateAllAdminSelects();
    };

    window.deleteSelectedLectureFromTab = function() {
        const sectionSelect = safeGetElement('deleteLectureSection');
        const teacherSelect = safeGetElement('deleteLectureTeacher');
        const semesterSelect = safeGetElement('deleteLectureSemester');
        const lectureSelect = safeGetElement('deleteLectureSelect');

        if (!sectionSelect || !teacherSelect || !semesterSelect || !lectureSelect) return;

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        const lectureIndex = parseInt(lectureSelect?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        if (isNaN(lectureIndex) || lectureIndex < 0) {
            showToast('warning', '   ');
            return;
        }

        const lecture = data.sections[sectionIndex].teachers[teacherIndex]?.semesters[semesterIndex]?.lectures[lectureIndex];
        if (!lecture) { showToast('error', '   '); return; }

        if (!confirm(`       "${lecture.title}"`)) return;

        data.sections[sectionIndex].teachers[teacherIndex].semesters[semesterIndex].lectures.splice(lectureIndex, 1);
        saveData();
        renderAllData();
        updateAllAdminSelects();
        addChange();

        const msg = safeGetElement('deleteLectureMessage');
        if (msg) { msg.innerHTML = `    "${lecture.title}" `;
            msg.style.color = '#22c55e'; }
        showToast('success', `    "${lecture.title}"`);
        updateAllAdminSelects();
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
        if (editLectureTitle) editLectureTitle.value = lecture.title || '';
        if (editLectureUrl) editLectureUrl.value = lecture.youtubeUrl || '';
        if (editLectureIsFree) editLectureIsFree.value = lecture.isFree ? 'true' : 'false';

        const titleEl = document.querySelector('#editLectureModal h2');
        if (titleEl) titleEl.textContent = `   #${lecture.number}`;
        
        const infoSpan = safeGetElement('editLectureInfo');
        if (infoSpan) infoSpan.textContent = ` ${section.name} |  ${teacher.name} |   ${semester.number}`;
        
        if (editLectureMessage) editLectureMessage.innerHTML = '';
        if (editLectureModal) {
            editLectureModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    window.openEditLectureFromAdmin = function() {
        const sectionSelect = safeGetElement('editLectureSection');
        const teacherSelect = safeGetElement('editLectureTeacher');
        const semesterSelect = safeGetElement('editLectureSemester');
        const lectureSelect = safeGetElement('editLectureSelect');
        const messageEl = safeGetElement('editLectureAdminMessage');

        if (!sectionSelect || !teacherSelect || !semesterSelect || !lectureSelect || !messageEl) return;

        const sectionIndex = parseInt(sectionSelect?.value);
        const teacherIndex = parseInt(teacherSelect?.value);
        const semesterIndex = parseInt(semesterSelect?.value);
        const lectureIndex = parseInt(lectureSelect?.value);

        if (isNaN(sectionIndex) || sectionIndex < 0) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (isNaN(teacherIndex) || teacherIndex < 0) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (isNaN(semesterIndex) || semesterIndex < 0) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (isNaN(lectureIndex) || lectureIndex < 0) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        const lecture = data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures[lectureIndex];
        if (!lecture) {
            messageEl.innerHTML = '   ';
            messageEl.style.color = '#ef4444';
            return;
        }

        messageEl.innerHTML = '';
        openEditLecture(sectionIndex, teacherIndex, semesterIndex, lectureIndex);
    };

    if (editLectureForm) {
        editLectureForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const { sectionIndex, teacherIndex, semesterIndex, lectureIndex } = editTarget;

            if (sectionIndex === -1 || teacherIndex === -1 || semesterIndex === -1 || lectureIndex === -1) {
                if (editLectureMessage) {
                    editLectureMessage.innerHTML = '      ';
                    editLectureMessage.style.color = '#f59e0b';
                }
                return;
            }

            if (!editLectureTitle || !editLectureUrl || !editLectureIsFree || !editLectureMessage) return;

            const newTitle = editLectureTitle.value.trim();
            const newUrl = editLectureUrl.value.trim();
            const newIsFree = editLectureIsFree.value === 'true';

            if (!newTitle) {
                editLectureMessage.innerHTML = '    ';
                editLectureMessage.style.color = '#f59e0b';
                return;
            }

            if (!newUrl) {
                editLectureMessage.innerHTML = '    ';
                editLectureMessage.style.color = '#f59e0b';
                return;
            }

            const isValidUrl = newUrl.includes('mediadelivery') ||
                newUrl.includes('youtube') ||
                newUrl.includes('youtu.be') ||
                newUrl.includes('player.') ||
                newUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i);

            if (!isValidUrl) {
                editLectureMessage.innerHTML = '    .   mediadelivery  YouTube';
                editLectureMessage.style.color = '#f59e0b';
                return;
            }

            const lecture = data.sections[sectionIndex]?.teachers[teacherIndex]?.semesters[semesterIndex]?.lectures[lectureIndex];
            if (!lecture) {
                editLectureMessage.innerHTML = '   ';
                editLectureMessage.style.color = '#ef4444';
                return;
            }

            lecture.title = newTitle;
            lecture.youtubeUrl = newUrl;
            lecture.isFree = newIsFree;

            saveData();
            renderAllData();
            addChange();

            editLectureMessage.innerHTML = '    !';
            editLectureMessage.style.color = '#22c55e';
            showToast('success', `    "${newTitle}" `);

            setTimeout(() => { closeEditLectureModal(); }, 1200);
        });
    }

    function closeEditLectureModal() {
        if (editLectureModal) editLectureModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        editTarget = { sectionIndex: -1, teacherIndex: -1, semesterIndex: -1, lectureIndex: -1 };
        if (editLectureMessage) editLectureMessage.innerHTML = '';
    }

    if (closeEditLecture) closeEditLecture.addEventListener('click', closeEditLectureModal);
    if (cancelEditLecture) cancelEditLecture.addEventListener('click', closeEditLectureModal);
    if (editLectureModal) {
        editLectureModal.addEventListener('click', function(e) {
            if (e.target === this) closeEditLectureModal();
        });
    }

    // ============================================================
    // ===== ADMIN MANAGEMENT =====
    // ============================================================

    window.addNewAdmin = async function() {
        const emailInput = safeGetElement('adminEmailInput');
        const messageEl = safeGetElement('addAdminMessage');
        
        if (!emailInput || !messageEl) return;
        
        const email = emailInput.value.trim();

        if (!email) {
            messageEl.innerHTML = '    ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            messageEl.innerHTML = '    ';
            messageEl.style.color = '#f59e0b';
            return;
        }

        if (!supabaseClient) {
            messageEl.innerHTML = ' Supabase  ';
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
                      <strong>${email}</strong>      .
                    <br><br>
                    <button onclick="fixUserAndAddAdmin('${email}')" style="background:var(--primary);color:white;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">
                        <i class="fas fa-sync"></i>    
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
                messageEl.innerHTML = '    ';
                messageEl.style.color = '#f59e0b';
                return;
            }

            const { error: insertError } = await supabaseClient
                .from('admins')
                .insert({ uid: userData.id, email: email, role: 'admin' });

            if (insertError) {
                messageEl.innerHTML = '   : ' + insertError.message;
                messageEl.style.color = '#ef4444';
                return;
            }

            messageEl.innerHTML = `   : ${email} !`;
            messageEl.style.color = '#22c55e';
            emailInput.value = '';
            showToast('success', `   : ${email}`);
            loadAdminsList();

        } catch (error) {
            messageEl.innerHTML = '  : ' + error.message;
            messageEl.style.color = '#ef4444';
            console.error('Error adding admin:', error);
        }
    };

    window.fixUserAndAddAdmin = async function(email) {
        const messageEl = safeGetElement('addAdminMessage');
        if (!messageEl) return;

        if (!supabaseClient) {
            messageEl.innerHTML = ' Supabase  ';
            messageEl.style.color = '#ef4444';
            return;
        }

        try {
            const { data: result, error: rpcError } = await supabaseClient
                .rpc('add_user_and_admin', { p_email: email });

            if (rpcError) {
                messageEl.innerHTML = `
                       : ${rpcError.message}
                    <br><br>
                    <button onclick="copyRpcFunction()" style="background:var(--primary);color:white;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">
                        <i class="fas fa-copy"></i>   
                    </button>
                `;
                messageEl.style.color = '#ef4444';
                return;
            }

            if (result && result.success) {
                messageEl.innerHTML = `      <strong>${email}</strong>  !`;
                messageEl.style.color = '#22c55e';
                showToast('success', `     : ${email}`);
                loadAdminsList();
            } else {
                messageEl.innerHTML = ' ' + (result?.message || '   ');
                messageEl.style.color = '#ef4444';
            }

        } catch (error) {
            messageEl.innerHTML = '  : ' + error.message;
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
        'message', '    ',
        'user_id', v_user_id::text,
        'email', p_email
    );
    return v_result;
exception when others then
    return jsonb_build_object(
        'success', false,
        'message', ' : ' || sqlerrm
    );
end;
$$;
grant execute on function add_user_and_admin(text) to authenticated;
        `;

        navigator.clipboard.writeText(sql).then(() => {
            showToast('success', '     RPC');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = sql;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('success', '     RPC');
        });
    };

    async function loadAdminsList() {
        const container = safeGetElement('adminsListContainer');
        if (!container) return;

        if (!supabaseClient) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;"> Supabase  </p>';
            return;
        }

        try {
            const { data: admins, error } = await supabaseClient
                .from('admins')
                .select('email, uid, created_at')
                .order('created_at', { ascending: true });

            if (error) {
                container.innerHTML = '<p style="color:var(--text-light);text-align:center;">   </p>';
                return;
            }

            if (!admins || admins.length === 0) {
                container.innerHTML = '<p style="color:var(--text-light);text-align:center;">    </p>';
                return;
            }

            let html = `
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                        <thead>
                            <tr style="background:var(--primary-gradient);color:white;">
                                <th style="padding:0.5rem;text-align:right;">#</th>
                                <th style="padding:0.5rem;text-align:right;"> </th>
                                <th style="padding:0.5rem;text-align:right;"> </th>
                                <th style="padding:0.5rem;text-align:center;"></th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            admins.forEach((admin, index) => {
                const isCurrentUser = admin.email === currentUser?.email;
                const createdAt = admin.created_at ? new Date(admin.created_at).toLocaleDateString('ar') : ' ';

                html += `
                    <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:0.4rem 0.5rem;">${index + 1}</td>
                        <td style="padding:0.4rem 0.5rem;">${admin.email} ${isCurrentUser ? ' ()' : ''}</td>
                        <td style="padding:0.4rem 0.5rem;color:var(--text-light);font-size:0.75rem;">${createdAt}</td>
                        <td style="padding:0.4rem 0.5rem;text-align:center;">
                            ${!isCurrentUser ? `<button onclick="deleteAdmin('${admin.email}')" class="btn-delete-admin"> </button>` : '<span style="color:var(--text-light);font-size:0.7rem;">   </span>'}
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            container.innerHTML = html;

        } catch (error) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;">   </p>';
            console.error('Error loading admins:', error);
        }
    }

    window.deleteAdmin = async function(email) {
        if (!confirm(`      : ${email}`)) return;

        if (!supabaseClient) {
            showToast('error', ' Supabase  ');
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('admins')
                .delete()
                .eq('email', email);

            if (error) {
                showToast('error', '   : ' + error.message);
                return;
            }

            showToast('success', `   : ${email}`);
            loadAdminsList();

        } catch (error) {
            showToast('error', '  : ' + error.message);
            console.error('Error deleting admin:', error);
        }
    };

    // ============================================================
    // ===== PUBLISH =====
    // ============================================================
    if (publishBtn) {
        publishBtn.addEventListener('click', async function() {
            if (pendingChanges === 0) {
                showToast('info', '    ');
                return;
            }

            if (!supabaseClient) {
                showToast('error', ' Supabase  ');
                return;
            }

            if (!ADMIN_EMAILS.includes(currentUser?.email)) {
                const isAdmin = await isUserAdmin(currentUser?.email);
                if (!isAdmin) {
                    showToast('error', '    ');
                    return;
                }
            }

            const result = await saveSupabaseAcademyData();
            if (!result.success) {
                showToast('error', '  : ' + (result.error?.message || '  '));
                return;
            }

            pendingChanges = 0;
            updatePendingChanges();
            showToast('success', '    ');

            const msg = safeGetElement('publishMessage');
            if (msg) { msg.textContent = '    ';
                msg.style.color = '#22c55e'; }
            setTimeout(() => { if (msg) msg.textContent = ''; }, 5000);
        });
    }

    if (createTableBtn) {
        createTableBtn.addEventListener('click', async function() {
            const sql =
                `create table if not exists academy_data (\n  id text primary key,\n  content jsonb not null,\n  inserted_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);`;
            try {
                await navigator.clipboard.writeText(sql);
                showToast('info', '   SQL  ');
            } catch (err) {
                showToast('error', '   SQL');
            }
        });
    }

    // ============================================================
    // ===== USERS TABLE =====
    // ============================================================
    function renderUsersTable() {
        const tbody = safeGetElement('usersTableBody');
        if (!tbody) return;

        const usersMap = new Map();

        data.sections.forEach(section => {
            section.teachers.forEach(teacher => {
                if (teacher.codes) {
                    teacher.codes.forEach(c => {
                        if (c.used && c.userEmail && !c.isAdminCode) {
                            if (!usersMap.has(c.userEmail)) {
                                usersMap.set(c.userEmail, {
                                    email: c.userEmail,
                                    userId: c.userId || ' ',
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
                '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">   </td></tr>';
            return;
        }

        let html = '';
        let index = 1;
        usersMap.forEach((user, email) => {
            const isAdmin = ADMIN_EMAILS.includes(email);
            html += `
                <tr>
                    <td>${index++}</td>
                    <td>${email}</td>
                    <td>${user.courses.join(' ')}</td>
                    <td>${new Date(user.registeredAt).toLocaleDateString('ar')}</td>
                    <td><span class="badge ${isAdmin ? 'admin' : 'user'}">${isAdmin ? '' : ''}</span></td>
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
            const tabContent = safeGetElement('tab-' + this.dataset.tab);
            if (tabContent) tabContent.classList.add('active');

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
            if (this.dataset.tab === 'teacher-admins') {
                updateAllAdminSelects();
                renderTeacherAdminsList();
            }
            if (this.dataset.tab === 'publish') {}
            if (this.dataset.tab === 'add-teacher' || this.dataset.tab === 'add-semester' ||
                this.dataset.tab === 'add-lecture' || this.dataset.tab === 'add-section') {
                updateAllAdminSelects();
            }
        });
    });

    // ============================================================
    // ===== EVENT LISTENERS FOR DEPENDENT SELECTS =====
    // ============================================================

    const selectListeners = [
        'teacherSection', 'semesterSection', 'lectureSection',
        'codeSection', 'editTeacherSection', 'editLectureSection',
        'deleteTeacherSection', 'deleteSemesterSection', 'deleteLectureSection',
        'semesterTeacher', 'lectureTeacher', 'codeTeacherSelect',
        'editTeacherSelect', 'editLectureTeacher', 'deleteSemesterTeacher',
        'deleteLectureTeacher', 'lectureSemester', 'editLectureSemester',
        'deleteSemesterSelect', 'deleteLectureSemester', 'teacherAdminSection'
    ];

    selectListeners.forEach(id => {
        const el = safeGetElement(id);
        if (el) {
            el.addEventListener('change', function() {
                updateAllAdminSelects();
            });
        }
    });

    // ============================================================
    // ===== NAVBAR SCROLL =====
    // ============================================================
    window.addEventListener('scroll', function() {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // ============================================================
    // ===== THEME =====
    // ============================================================
    const savedTheme = localStorage.getItem('devAcademicTheme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // ============================================================
    // ===== INIT -    =====
    // ============================================================
    async function init() {
        console.log('    ...');

        if (!supabaseClient) {
            console.error(' Supabase  ');
            showToast('error', '    ');
            if (loadingScreen) loadingScreen.style.display = 'none';
            return;
        }

        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            
            if (sessionError) {
                console.error('    :', sessionError);
                throw sessionError;
            }

            if (session?.user) {
                currentUser = session.user;
                localStorage.setItem('devAcademicUser', JSON.stringify({
                    email: currentUser.email,
                    name: currentUser.user_metadata?.full_name || ''
                }));
                
                updateUI();
                
                await loadUserCodesFromSupabase();
                loadContactMessages();
                loadTeacherAdmins();
                loadNotifications();
                loadConversations();
                
                await syncPendingCodes();
                
                renderAllData();
                renderMyCourses();
                renderAccount();
                renderMyMessages();
                renderContactTeachers();
                renderAllMessages();
                renderTeacherInbox();
                renderTeacherAdminsList();
                renderNotifications();
                renderChatList();
                updateBadge();
                updateContactBadge();
                updateNotificationBadge();
                updateNotificationToggleUI();
                updateChatBadge();

                if (loadingScreen) loadingScreen.style.display = 'none';
                if (navbar) navbar.style.display = 'flex';
                if (bottomNav) bottomNav.style.display = 'flex';
                if (footer) footer.style.display = 'block';

                navigateTo('home');
                showToast('success', '  ');
                console.log(' :', currentUser.email);
                console.log('  :', ADMIN_EMAILS);
                console.log('  :', teacherAdmins.length);
                
            } else {
                if (!isRedirecting) {
                    isRedirecting = true;
                    console.log('          ...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 500);
                }
            }
            
        } catch (error) {
            console.error('   :', error);
            showToast('error', '     ');
            
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (navbar) navbar.style.display = 'flex';
            if (bottomNav) bottomNav.style.display = 'flex';
        }
    }

    // ============================================================
    // =====   =====
    // ============================================================
    loadData().then(init).catch((error) => {
        console.error('Initialization failed:', error);
        if (!isRedirecting) {
            isRedirecting = true;
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
    });

})();