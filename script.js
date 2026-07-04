(function() {
    'use strict';

    // =============================================
    // بيانات تسجيل الدخول
    // =============================================
    const ADMIN_EMAIL = 'zzccvc99@gmail.com';
    const ADMIN_PASSWORD = 'vcxz4321cczzvv';

    // =============================================
    // Supabase config
    // =============================================
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
    const createTableBtn = document.getElementById('createTableBtn');

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
    // DEVICE ID (للتعرف الإضافي فقط)
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
    // منع F12
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
    // نظام الأكواد والصلاحيات - ربط بحساب المستخدم (الإيميل)
    // =============================================

    function hasAccessToTeacher(teacher) {
        if (!teacher || !teacher.codes) return false;
        
        // التحقق من أن المستخدم مسجل دخول
        if (!currentUser) return false;
        
        // التحقق من وجود كود مفعل لهذا المدرس بحساب المستخدم الحالي
        const hasAccess = teacher.codes.some(c => 
            c.used && 
            c.userEmail === currentUser.email && 
            !c.locked
        );
        
        return hasAccess;
    }

    // ===== التحقق من صحة الكود (مستعمل أو لا) =====
    function isCodeUsed(teacher, code) {
        if (!teacher || !teacher.codes) return false;
        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) return false;
        return codeData.used === true;
    }

    function getCodeUser(teacher, code) {
        if (!teacher || !teacher.codes) return null;
        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData || !codeData.used) return null;
        return {
            email: codeData.userEmail || 'غير معروف',
            usedAt: codeData.usedAt || 'غير معروف'
        };
    }

    // ===== التحقق من الكود وحفظه بحساب المستخدم (الإيميل) =====
    async function verifyCode(teacher, code) {
        if (!teacher.codes || teacher.codes.length === 0) {
            return { valid: false, message: 'لا توجد أكواد لهذا المدرس' };
        }

        // التحقق من أن المستخدم مسجل دخول
        if (!currentUser) {
            return { valid: false, message: '⚠️ يجب تسجيل الدخول أولاً لإدخال الكود' };
        }

        const codeData = teacher.codes.find(c => c.code === code);

        if (!codeData) {
            return { valid: false, message: '❌ الكود غير صحيح' };
        }

        // التحقق من أن الكود غير مقفل
        if (codeData.locked === true) {
            return { valid: false, message: '🔒 هذا الكود مقفل من قبل الإدارة' };
        }

        // ===== التحقق من أن الكود مستخدم من قبل =====
        if (codeData.used) {
            // إذا كان المستخدم الحالي هو من استخدم الكود (بنفس الإيميل)
            if (codeData.userEmail === currentUser.email) {
                return { valid: true, message: '✅ الكود مفعل على حسابك' };
            } else {
                // عرض الإيميل الذي استخدم الكود
                const userEmail = codeData.userEmail || 'مستخدم آخر';
                const usedAt = codeData.usedAt ? new Date(codeData.usedAt).toLocaleString('ar') : 'وقت غير معروف';
                return { 
                    valid: false, 
                    message: `❌ هذا الكود مستخدم من قبل البريد: ${userEmail}\n⏱️ في: ${usedAt}`
                };
            }
        }

        // ===== تفعيل الكود وحفظه بحساب المستخدم الحالي (بالإيميل) =====
        codeData.used = true;
        codeData.deviceId = userDeviceId;
        codeData.userId = currentUser.id;
        codeData.userEmail = currentUser.email;
        codeData.usedAt = new Date().toISOString();

        // حفظ الوصول المحلي
        saveData();

        // ===== حفظ الكود في Supabase بحساب المستخدم =====
        await syncCodeWithSupabase(teacher, codeData);

        // ===== إضافة الكود إلى قائمة المستخدم =====
        await addCodeToUserCodes(currentUser.id, codeData.code);

        return { valid: true, message: '✅ تم التفعيل بنجاح - تم حفظ الكود في حسابك' };
    }

    // ===== إضافة الكود إلى جدول user_codes =====
    async function addCodeToUserCodes(userId, code) {
        if (!supabaseClient) return;

        try {
            // التحقق من وجود الكود في جدول codes
            const { data: codeRecord, error: codeError } = await supabaseClient
                .from('codes')
                .select('id')
                .eq('code', code)
                .single();

            if (codeError) {
                console.warn('⚠️ الكود غير موجود في قاعدة البيانات:', codeError);
                return;
            }

            // التحقق من أن الكود لم يضاف من قبل لهذا المستخدم
            const { data: existing, error: checkError } = await supabaseClient
                .from('user_codes')
                .select('id')
                .eq('user_id', userId)
                .eq('code_id', codeRecord.id)
                .maybeSingle();

            if (existing) {
                console.log('✅ الكود موجود مسبقاً للمستخدم');
                return;
            }

            // إضافة الكود إلى user_codes
            const { error } = await supabaseClient
                .from('user_codes')
                .insert({
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

    // ===== مزامنة الكود مع Supabase =====
    async function syncCodeWithSupabase(teacher, codeData) {
        if (!currentUser || !supabaseClient) {
            return { success: false, error: 'No authenticated user or Supabase unavailable' };
        }

        // البحث عن القسم الذي يتبع له المدرس
        const department = data.departments.find(dept => dept.teachers.includes(teacher));
        const teacherDepartment = department ? department.name : null;

        try {
            // حفظ الكود في جدول teacher_codes
            const record = {
                code: codeData.code,
                teacher_name: teacher.name,
                teacher_department: teacherDepartment,
                user_id: currentUser.id,
                user_email: currentUser.email,
                device_id: userDeviceId,
                used: true,
                locked: codeData.locked || false,
                used_at: codeData.usedAt || new Date().toISOString(),
            };

            const { error } = await supabaseClient
                .from('teacher_codes')
                .upsert(record, { onConflict: 'code' });

            if (error) {
                console.warn('⚠️ فشل مزامنة الكود مع Supabase:', error.message || error);
                return { success: false, error };
            }

            // تحديث الكود في جدول codes
            const { error: updateError } = await supabaseClient
                .from('codes')
                .update({
                    is_used: true,
                    user_id: currentUser.id,
                    user_email: currentUser.email,
                    device_id: userDeviceId,
                    used_at: new Date().toISOString()
                })
                .eq('code', codeData.code);

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

    // ===== تحميل الأكواد المخصصة للمستخدم من Supabase =====
    async function loadUserCodesFromSupabase() {
        if (!currentUser || !supabaseClient) return;

        try {
            // جلب الأكواد من جدول user_codes
            const { data: userCodes, error: codesError } = await supabaseClient
                .from('user_codes')
                .select('code_id')
                .eq('user_id', currentUser.id);

            if (codesError) {
                console.warn('⚠️ فشل جلب الأكواد:', codesError);
                return;
            }

            if (!userCodes || userCodes.length === 0) return;

            // جلب تفاصيل الأكواد
            const codeIds = userCodes.map(uc => uc.code_id);
            const { data: codesData, error: codesDataError } = await supabaseClient
                .from('codes')
                .select('*')
                .in('id', codeIds);

            if (codesDataError) {
                console.warn('⚠️ فشل جلب تفاصيل الأكواد:', codesDataError);
                return;
            }

            // تحديث البيانات المحلية - ربط الأكواد بالمستخدم الحالي
            codesData.forEach(codeRecord => {
                data.departments.forEach(dept => {
                    dept.teachers.forEach(teacher => {
                        if (!teacher.codes) teacher.codes = [];
                        const localCode = teacher.codes.find(c => c.code === codeRecord.code);
                        if (localCode) {
                            localCode.used = true;
                            localCode.userId = currentUser.id;
                            localCode.userEmail = currentUser.email;
                            localCode.deviceId = codeRecord.device_id || userDeviceId;
                            localCode.usedAt = codeRecord.used_at;
                            localCode.locked = codeRecord.is_locked || false;
                        }
                    });
                });
            });

            console.log('✅ تم تحميل الأكواد المخصصة للمستخدم');
        } catch (error) {
            console.warn('⚠️ خطأ في تحميل الأكواد:', error);
        }
    }

    // =============================================
    // دوال إدارة الأكواد (قفل/فتح)
    // =============================================

    function toggleCodeLock(teacher, code) {
        if (!teacher.codes) return false;
        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) return false;
        
        codeData.locked = !codeData.locked;
        if (codeData.locked && codeData.used) {
            codeData.used = false;
            codeData.deviceId = null;
            codeData.usedAt = null;
            codeData.userId = null;
            codeData.userEmail = null;
        }
        saveData();
        return true;
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
        if (!teacher.codes) return { total: 0, used: 0, available: 0, locked: 0 };
        const total = teacher.codes.length;
        const used = teacher.codes.filter(c => c.used).length;
        const locked = teacher.codes.filter(c => c.locked).length;
        return { total, used, available: total - used, locked };
    }

    // ===== دالة التحقق من الكود (مستعمل أو لا) مع عرض تفاصيل المستخدم =====
    window.checkCodeStatus = function() {
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
            codeMessage.innerHTML = '⚠️ يرجى إدخال الكود للتحقق';
            codeMessage.style.color = '#f59e0b';
            return;
        }

        const teacher = data.departments[deptIndex].teachers[teacherIndex];
        if (!teacher) {
            codeMessage.innerHTML = '❌ المدرس غير موجود';
            codeMessage.style.color = '#ef4444';
            return;
        }

        const codeData = teacher.codes.find(c => c.code === code);
        if (!codeData) {
            codeMessage.innerHTML = '❌ الكود غير موجود لهذا المدرس';
            codeMessage.style.color = '#ef4444';
            return;
        }

        if (codeData.used) {
            const userEmail = codeData.userEmail || 'غير معروف';
            const usedAt = codeData.usedAt ? new Date(codeData.usedAt).toLocaleString('ar') : 'وقت غير معروف';
            const isCurrentUser = currentUser && codeData.userEmail === currentUser.email;
            
            codeMessage.innerHTML = `
                🔍 <strong>حالة الكود:</strong> مستخدم ✅<br>
                📧 <strong>مستخدم من قبل:</strong> ${userEmail} ${isCurrentUser ? '(أنت)' : ''}<br>
                ⏱️ <strong>تاريخ الاستخدام:</strong> ${usedAt}
            `;
            codeMessage.style.color = isCurrentUser ? '#22c55e' : '#f59e0b';
            codeMessage.style.direction = 'rtl';
        } else {
            const isLocked = codeData.locked || false;
            codeMessage.innerHTML = `
                🔍 <strong>حالة الكود:</strong> ${isLocked ? '🔒 مقفل' : '🟢 متاح'}<br>
                📊 <strong>يمكن استخدامه:</strong> ${isLocked ? 'لا' : 'نعم'}
            `;
            codeMessage.style.color = isLocked ? '#f59e0b' : '#22c55e';
            codeMessage.style.direction = 'rtl';
        }
    };

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
        
        if (toggleCodeLock(teacher, code)) {
            showToast('success', `✅ تم ${action} الكود ${code} بنجاح`);
            updateCodesManagement();
            updateAdminSelects();
        }
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
        
        document.getElementById('deleteTeacherMessage').innerHTML = `✅ تم حذف المدرس "${teacher.name}" بنجاح`;
        document.getElementById('deleteTeacherMessage').style.color = '#22c55e';
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
        
        document.getElementById('deleteSemesterMessage').innerHTML = `✅ تم حذف الفصل ${semester.number} بنجاح`;
        document.getElementById('deleteSemesterMessage').style.color = '#22c55e';
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

        document.getElementById('deleteLectureMessage').innerHTML = `✅ تم حذف المحاضرة "${lecture.title}" بنجاح`;
        document.getElementById('deleteLectureMessage').style.color = '#22c55e';
        showToast('success', `✅ تم حذف المحاضرة "${lecture.title}" بنجاح`);
        
        updateDeleteLectureSemesters();
        document.getElementById('deleteLectureSelect').innerHTML = '<option value="">اختر الفصل أولاً</option>';
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

    // =============================================
    // دوال تحديث القوائم المنسدلة
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

    // فتح نافذة تعديل المحاضرة من لوحة الإدارة
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

    // ===== أحداث التغيير على القوائم المنسدلة =====
    document.getElementById('lectureTeacher').addEventListener('change', updateSemesterSelects);
    document.getElementById('codeTeacherSelect').addEventListener('change', updateCodesManagement);
    document.getElementById('deleteSemesterTeacher').addEventListener('change', updateDeleteSemesterSelects);
    document.getElementById('deleteLectureTeacher').addEventListener('change', updateDeleteLectureSemesters);
    document.getElementById('deleteLectureSemester').addEventListener('change', updateDeleteLectureLectures);
    document.getElementById('editLectureTeacher').addEventListener('change', updateEditLectureSemesters);
    document.getElementById('editLectureSemester').addEventListener('change', updateEditLectureLectures);

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
            <div style="margin:0.5rem 0;display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button onclick="checkCodeStatus()" class="btn-submit" style="background:var(--info);flex:1;padding:0.4rem;font-size:0.8rem;">
                    🔍 التحقق من كود
                </button>
            </div>
            <div class="codes-table-wrapper">
                <table class="codes-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>الكود</th>
                            <th>الحالة</th>
                            <th>المستخدم (الإيميل)</th>
                            <th>تاريخ الاستخدام</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (teacher.codes && teacher.codes.length > 0) {
            teacher.codes.forEach((c, index) => {
                const isUsed = c.used;
                const isLocked = c.locked || false;
                const isMyCode = c.userEmail === currentUser?.email;
                let statusText = '';
                let statusColor = '';
                let userDisplay = '—';
                let usedAtDisplay = '—';
                
                if (isLocked) {
                    statusText = '🔒 مقفل';
                    statusColor = '#f59e0b';
                } else if (isUsed) {
                    statusText = isMyCode ? '✅ حسابك' : '❌ مستخدم';
                    statusColor = isMyCode ? '#22c55e' : '#ef4444';
                    userDisplay = c.userEmail || 'غير معروف';
                    usedAtDisplay = c.usedAt ? new Date(c.usedAt).toLocaleString('ar') : 'غير معروف';
                } else {
                    statusText = '🟢 متاح';
                    statusColor = '#22c55e';
                }
                
                const lockIcon = isLocked ? '🔓 فتح' : '🔒 قفل';
                const lockStyle = isLocked ? 'background:#22c55e;' : 'background:#f59e0b;';
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code style="font-weight:700;color:${statusColor};">${c.code}</code></td>
                        <td><span class="code-status ${isUsed ? 'used' : 'available'} ${isLocked ? 'locked' : ''}">${statusText}</span></td>
                        <td style="font-size:0.75rem;color:var(--text-light);word-break:break-all;">${userDisplay}</td>
                        <td style="font-size:0.7rem;color:var(--text-light);">${usedAtDisplay}</td>
                        <td>
                            <div class="code-actions" style="gap:0.3rem;">
                                <button onclick="toggleCodeLockAction(${deptIndex}, ${teacherIndex}, '${c.code}')" 
                                        class="btn-toggle-lock" style="${lockStyle}color:white;border:none;border-radius:4px;padding:0.15rem 0.5rem;cursor:pointer;font-size:0.7rem;">
                                    ${lockIcon}
                                </button>
                                ${!isUsed && !isLocked ? `<button onclick="deleteThisCode(${deptIndex}, ${teacherIndex}, '${c.code}')" class="btn-delete-code" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:0.15rem 0.5rem;cursor:pointer;font-size:0.7rem;">🗑️</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:1rem 0;">لا توجد أكواد</td></tr>`;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;
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
                        description: 'قسم الرياضيات - دراسة الأعداد والعمليات والهندسة',
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
                    { name: 'اللغة العربية', emoji: '📖', description: 'قسم اللغة العربية - دراسة النحو والصرف والأدب', teachers: [] },
                    { name: 'الفيزياء', emoji: '⚛️', description: 'قسم الفيزياء - دراسة المادة والطاقة والحركة', teachers: [] },
                    { name: 'الأحياء', emoji: '🧬', description: 'قسم الأحياء - دراسة الكائنات الحية والجينات', teachers: [] },
                    { name: 'اللغة الإنجليزية', emoji: '🇬🇧', description: 'قسم اللغة الإنجليزية - دراسة القواعد والمفردات', teachers: [] },
                    { name: 'التربية الإسلامية', emoji: '🕌', description: 'قسم التربية الإسلامية - دراسة القرآن اسلامية', teachers: [] }
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
                .from('academy_data')
                .select('content')
                .eq('id', 'main')
                .maybeSingle();

            if (error) {
                console.warn('Supabase academy data lookup failed:', error.message || error);
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
                console.warn('Supabase academy data save failed:', error.message || error);
                return { success: false, error };
            }

            localStorage.setItem('academyData', JSON.stringify(data));
            return { success: true };
        } catch (error) {
            console.warn('Supabase academy data save exception:', error);
            return { success: false, error };
        }
    }

    async function subscribeAcademyDataUpdates() {
        if (!supabaseClient) return;

        try {
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
                            showToast('info', '🔄 تم تحديث البيانات تلقائياً من السحابة');
                        }
                    } catch (err) {
                        console.warn('Realtime parse error:', err);
                    }
                })
                .subscribe();

            console.log('✅ subscribed to Supabase academy data updates', channel);
        } catch (error) {
            console.warn('Supabase realtime subscription failed:', error);
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
                        <p>🔑 أدخل كود التفعيل لفتح جميع المحاضرات</p>
                        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                            <input type="password" id="codeInputTeacher" placeholder="أدخل الكود..." maxlength="20" style="flex:1;min-width:120px;padding:0.5rem 0.8rem;border:2px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text);font-size:0.9rem;outline:none;text-align:center;letter-spacing:2px;font-weight:700;font-family:monospace;" />
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
        
        // التحقق من أن المستخدم مسجل دخول
        if (!currentUser) {
            codeMessage.innerHTML = '⚠️ يجب تسجيل الدخول أولاً لإدخال الكود';
            codeMessage.style.color = '#ef4444';
            showToast('error', '⚠️ يجب تسجيل الدخول أولاً لإدخال الكود');
            return;
        }
        
        const result = await verifyCode(activeTeacher, code);
        codeMessage.innerHTML = result.message;
        codeMessage.style.color = result.valid ? '#22c55e' : '#ef4444';
        
        if (result.valid) {
            showToast('success', '✅ تم التفعيل بنجاح! تم حفظ الكود في حسابك');
            // تحديث الواجهة
            loadUserCodesFromSupabase();
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
    // EDIT LECTURE (دالة داخلية تستخدم من الإدارة)
    // =============================================
    function openEditLecture(deptIndex, teacherIndex, semesterIndex, lectureIndex) {
        const department = data.departments[deptIndex];
        if (!department) return;
        const teacher = department.teachers[teacherIndex];
        if (!teacher) return;
        const semester = teacher.semesters[semesterIndex];
        if (!semester) return;
        const lecture = semester.lectures[lectureIndex];
        if (!lecture) return;

        editTarget = { deptIndex, teacherIndex, semesterIndex, lectureIndex };
        
        editLectureTitle.value = lecture.title || '';
        editLectureUrl.value = lecture.youtubeUrl || '';
        editLectureIsFree.value = lecture.isFree ? 'true' : 'false';
        
        document.querySelector('#editLectureModal h2').textContent = `✏️ تعديل المحاضرة #${lecture.number}`;
        
        const infoSpan = document.getElementById('editLectureInfo');
        infoSpan.textContent = `👨‍🏫 ${teacher.name} | 📖 الفصل ${semester.number}`;
        
        editLectureMessage.innerHTML = '';
        editLectureModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    editLectureForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const { deptIndex, teacherIndex, semesterIndex, lectureIndex } = editTarget;
        
        if (deptIndex === -1 || teacherIndex === -1 || semesterIndex === -1 || lectureIndex === -1) {
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
            editLectureMessage.innerHTML = '⚠️ يرجى إدخال رابط YouTube';
            editLectureMessage.style.color = '#f59e0b';
            return;
        }
        
        if (!extractYouTubeId(newUrl)) {
            editLectureMessage.innerHTML = '⚠️ رابط YouTube غير صحيح';
            editLectureMessage.style.color = '#f59e0b';
            return;
        }
        
        const lecture = data.departments[deptIndex].teachers[teacherIndex].semesters[semesterIndex].lectures[lectureIndex];
        if (!lecture) {
            editLectureMessage.innerHTML = '❌ المحاضرة غير موجودة';
            editLectureMessage.style.color = '#ef4444';
            return;
        }
        
        lecture.title = newTitle;
        lecture.youtubeUrl = newUrl;
        lecture.isFree = newIsFree;
        
        saveData();
        renderDepartments(data.departments);
        pendingChanges++;
        updatePendingChanges();
        
        editLectureMessage.innerHTML = '✅ تم تعديل المحاضرة بنجاح!';
        editLectureMessage.style.color = '#22c55e';
        showToast('success', `✅ تم تعديل المحاضرة "${newTitle}" بنجاح`);
        
        setTimeout(() => {
            closeEditLectureModal();
        }, 1200);
    });

    function closeEditLectureModal() {
        editLectureModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        editTarget = { deptIndex: -1, teacherIndex: -1, semesterIndex: -1, lectureIndex: -1 };
        editLectureMessage.innerHTML = '';
    }

    closeEditLecture.addEventListener('click', closeEditLectureModal);
    cancelEditLecture.addEventListener('click', closeEditLectureModal);
    editLectureModal.addEventListener('click', function(e) {
        if (e.target === this) closeEditLectureModal();
    });

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
            showToast('success', '✅ تم تسجيل الدخول بنجاح');
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

        if (isNaN(deptIndex) || isNaN(teacherIndex) || teacherIndex === '' || !number) {
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

        if (isNaN(deptIndex) || isNaN(teacherIndex) || teacherIndex === '' || isNaN(semesterIndex) || semesterIndex === '' || !number || !title || !youtubeUrl) {
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

    publishBtn.addEventListener('click', async function() {
        if (pendingChanges === 0) {
            showToast('info', '📌 لا توجد تغييرات لنشرها');
            return;
        }

        if (!supabaseClient) {
            showToast('error', '❌ Supabase غير متاح. لا يمكن نشر التغييرات الآن');
            return;
        }

        // تحقق من الجلسة
        try {
            const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) console.warn('Session check error:', sessionError);
            console.log('Publish diagnostic - currentUser:', currentUser, 'session:', sessionData?.session || null);
            if (!sessionData?.session?.user) {
                showToast('error', '❌ لا توجد جلسة مستخدم صالحة. يرجى تسجيل الدخول ثم المحاولة.');
                return;
            }
        } catch (diagErr) {
            console.warn('Session diagnostic failed:', diagErr);
        }

        // تأكد أن المستخدم مسجل وأنه مشرف
        if (!(isAdminLoggedIn || ((currentUser || {}).email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
            showToast('error', '❌ يجب تسجيل الدخول كمشرف لنشر التحديثات');
            return;
        }

        const publishResult = await saveSupabaseAcademyData();
        if (!publishResult.success) {
            console.error('Publish failed:', publishResult.error);
            const detail = publishResult.error?.message || (typeof publishResult.error === 'string' ? publishResult.error : JSON.stringify(publishResult.error));
            showToast('error', `❌ فشل نشر التحديثات على السحابة: ${detail}`);
            const pubMsgEl = document.getElementById('publishMessage');
            if (pubMsgEl) {
                if (/find the table|does not exist|relation .* does not exist|find the table 'public.academy_data'/i.test(detail)) {
                    pubMsgEl.innerHTML = `❌ جدول <strong>academy_data</strong> غير موجود في مشروع Supabase. افتح لوحة Supabase → SQL Editor ثم شغّل الأمر التالي:<br><pre style="text-align:left;background:#111;color:#fff;padding:8px;border-radius:6px;">create table if not exists academy_data (\n  id text primary key,\n  content jsonb not null,\n  inserted_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);</pre>`;
                } else {
                    pubMsgEl.textContent = '❌ فشل النشر: ' + detail;
                }
            }
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
        message.textContent = `✅ تم نشر ${pendingChanges} تغييراً بنجاح لجميع المستخدمين`; 
        message.style.color = '#22c55e';
        
        pendingChanges = 0;
        updatePendingChanges();
        showToast('success', '✅ تم نشر التحديث لجميع المستخدمين وتم تنزيل نسخة احتياطية');
        
        setTimeout(() => {
            message.textContent = '';
        }, 5000);
    });

    // زر نسخ SQL لإنشاء جدول academy_data في Supabase
    if (createTableBtn) {
        createTableBtn.addEventListener('click', async function() {
            const sql = `create table if not exists academy_data (\n  id text primary key,\n  content jsonb not null,\n  inserted_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);`;
            try {
                await navigator.clipboard.writeText(sql);
                showToast('info', '✅ تم نسخ أمر إنشاء الجدول إلى الحافظة. افتح Supabase SQL Editor والصق وشغّل.');
                const pubMsgEl = document.getElementById('publishMessage');
                if (pubMsgEl) pubMsgEl.innerHTML = 'انسخ SQL إلى SQL Editor في Supabase ثم اضغط Run.';
            } catch (err) {
                console.warn('Clipboard failed:', err);
                showToast('error', '❌ فشل نسخ SQL تلقائياً. انسخ النص يدوياً من الوثيقة.');
                const pubMsgEl = document.getElementById('publishMessage');
                if (pubMsgEl) pubMsgEl.innerHTML = '<pre style="text-align:left;background:#111;color:#fff;padding:8px;border-radius:6px;">create table if not exists academy_data (\n  id text primary key,\n  content jsonb not null,\n  inserted_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);</pre>';
            }
        });
    }

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
            if (editLectureModal.classList.contains('active')) closeEditLectureModal();
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
                console.warn('Supabase session check failed:', error.message || error);
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
                // تحميل الأكواد المخصصة للمستخدم
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
                console.warn('Supabase signOut failed:', error.message || error);
                showToast('error', '❌ فشل تسجيل الخروج');
                return;
            }
            showToast('success', '✅ تم تسجيل الخروج');
            window.location.href = 'index.html';
        } catch (error) {
            console.warn('Supabase signOut exception:', error);
            showToast('error', '❌ حدث خطأ أثناء تسجيل الخروج');
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
            await subscribeAcademyDataUpdates();
        }
        renderDepartments(data.departments);
        updateAdminSelects();
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', signOutSupabase);
        }
        console.log('📚 ديف أكاديمي - النظام جاهز');
        console.log('📱 معرف الجهاز:', userDeviceId);
    }).catch((error) => {
        console.error('Initialization failed:', error);
        if (userStatusElement) {
            userStatusElement.textContent = '⚠️ فشل التحميل';
        }
        renderDepartments(data.departments);
        updateAdminSelects();
    });

})();